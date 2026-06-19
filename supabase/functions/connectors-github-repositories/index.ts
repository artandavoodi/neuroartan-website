/// <reference lib="deno.ns" />
import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(payload: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/json',
    },
  });
}

function requiredEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`${name}_MISSING`);
  return value;
}

function readServiceRoleKey() {
  const legacy = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (legacy) return legacy;

  const secretKeys = Deno.env.get('SUPABASE_SECRET_KEYS');
  if (!secretKeys) throw new Error('SUPABASE_SERVICE_ROLE_KEY_MISSING');

  const parsed = JSON.parse(secretKeys);
  const value = parsed.default || Object.values(parsed)[0];
  if (typeof value !== 'string') throw new Error('SUPABASE_SERVICE_ROLE_KEY_MISSING');
  return value;
}

function fromBase64(value = '') {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}

function fromUtf8(value: string) {
  return new TextEncoder().encode(value);
}

function toUtf8(value: ArrayBuffer) {
  return new TextDecoder().decode(value);
}

async function importDecryptionKey() {
  const secret = requiredEnv('CONNECTOR_TOKEN_ENCRYPTION_KEY');
  const digest = await crypto.subtle.digest('SHA-256', fromUtf8(secret));
  return crypto.subtle.importKey('raw', digest, 'AES-GCM', false, ['decrypt']);
}

async function decryptToken(payload: string) {
  const parsed = JSON.parse(payload);
  if (parsed?.v !== 1 || parsed?.alg !== 'AES-GCM') throw new Error('UNSUPPORTED_TOKEN_PAYLOAD');

  const key = await importDecryptionKey();
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64(parsed.iv) },
    key,
    fromBase64(parsed.data),
  );

  return toUtf8(decrypted);
}

function normalizeRepository(record: Record<string, unknown>) {
  const owner = record.owner && typeof record.owner === 'object' ? record.owner as Record<string, unknown> : {};
  const permissions = record.permissions && typeof record.permissions === 'object' ? record.permissions as Record<string, unknown> : {};

  return {
    id: record.id,
    nodeId: record.node_id,
    name: record.name,
    fullName: record.full_name,
    owner: owner.login || '',
    private: record.private === true,
    fork: record.fork === true,
    archived: record.archived === true,
    disabled: record.disabled === true,
    defaultBranch: record.default_branch || '',
    htmlUrl: record.html_url || '',
    description: record.description || '',
    language: record.language || '',
    pushedAt: record.pushed_at || null,
    updatedAt: record.updated_at || null,
    permissions: {
      admin: permissions.admin === true,
      maintain: permissions.maintain === true,
      push: permissions.push === true,
      triage: permissions.triage === true,
      pull: permissions.pull === true,
    },
  };
}

function summarizeRepositoryInventory(repositories: Record<string, unknown>[]) {
  const privateCount = repositories.filter((repository) => repository.private === true).length;
  const publicCount = repositories.length - privateCount;
  const forkCount = repositories.filter((repository) => repository.fork === true).length;
  const archivedCount = repositories.filter((repository) => repository.archived === true).length;
  const writableCount = repositories.filter((repository) => {
    const permissions = repository.permissions && typeof repository.permissions === 'object'
      ? repository.permissions as Record<string, unknown>
      : {};
    return permissions.admin === true || permissions.maintain === true || permissions.push === true;
  }).length;
  const readableCount = repositories.filter((repository) => {
    const permissions = repository.permissions && typeof repository.permissions === 'object'
      ? repository.permissions as Record<string, unknown>
      : {};
    return permissions.pull === true || permissions.triage === true || permissions.push === true || permissions.maintain === true || permissions.admin === true;
  }).length;

  return {
    repository_count: repositories.length,
    public_repository_count: publicCount,
    private_repository_count: privateCount,
    fork_repository_count: forkCount,
    archived_repository_count: archivedCount,
    readable_repository_count: readableCount,
    writable_repository_count: writableCount,
    repository_inventory_scanned_at: new Date().toISOString(),
  };
}

async function fetchAllGitHubRepositories(accessToken: string) {
  const repositories: Record<string, unknown>[] = [];
  let page = 1;

  while (page <= 10) {
    const url = new URL('https://api.github.com/user/repos');
    url.searchParams.set('visibility', 'all');
    url.searchParams.set('affiliation', 'owner,collaborator,organization_member');
    url.searchParams.set('sort', 'updated');
    url.searchParams.set('direction', 'desc');
    url.searchParams.set('per_page', '100');
    url.searchParams.set('page', String(page));

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'Neuroartan-Connector-OAuth',
      },
    });

    const payload = await response.json().catch(() => []);
    if (!response.ok) {
      throw Object.assign(new Error('GITHUB_REPOSITORY_DISCOVERY_FAILED'), {
        status: response.status,
        payload,
      });
    }

    if (!Array.isArray(payload) || !payload.length) break;
    repositories.push(...payload.map((record) => normalizeRepository(record)));
    if (payload.length < 100) break;
    page += 1;
  }

  return repositories;
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (request.method !== 'POST') {
    return jsonResponse({ ok: false, error: 'METHOD_NOT_ALLOWED' }, 405);
  }

  try {
    const authHeader = request.headers.get('Authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      return jsonResponse({ ok: false, error: 'MISSING_AUTHORIZATION_HEADER' }, 401);
    }

    const supabaseUrl = requiredEnv('SUPABASE_URL');
    const anonKey = requiredEnv('SUPABASE_ANON_KEY');
    const serviceRoleKey = readServiceRoleKey();

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData?.user?.id) {
      return jsonResponse({ ok: false, error: 'INVALID_USER_SESSION' }, 401);
    }

    const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const { data: tokenRecord, error: tokenError } = await serviceClient
      .from('connector_token_vault')
      .select('id, profile_id, model_id, connector_service, provider_account_id, provider_account_handle, encrypted_access_token, revoked_at, metadata, updated_at')
      .eq('user_id', userData.user.id)
      .eq('connector_service', 'github')
      .is('revoked_at', null)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (tokenError) throw tokenError;
    if (!tokenRecord?.encrypted_access_token) {
      return jsonResponse({ ok: false, error: 'GITHUB_NOT_CONNECTED' }, 404);
    }

    const accessToken = await decryptToken(String(tokenRecord.encrypted_access_token));
    const repositories = await fetchAllGitHubRepositories(accessToken);

    const repositoryInventory = summarizeRepositoryInventory(repositories);
    const existingMetadata = tokenRecord.metadata && typeof tokenRecord.metadata === 'object'
      ? tokenRecord.metadata as Record<string, unknown>
      : {};

    const connectorState = {
      user_id: userData.user.id,
      profile_id: tokenRecord.profile_id,
      model_id: tokenRecord.model_id,
      connector_service: 'github',
      connector_label: 'GitHub',
      connector_category: 'repository',
      runtime: 'oauth-required',
      connection_state: 'connected',
      source_vault_ready: true,
      metadata: {
        ...existingMetadata,
        provider: 'github',
        provider_account_id: tokenRecord.provider_account_id,
        provider_account_handle: tokenRecord.provider_account_handle,
        inventory_type: 'repository',
        inventory_ready: true,
        ...repositoryInventory,
      },
    };

    const { error: connectorStateError } = await serviceClient
      .from('privacy_connector_state')
      .upsert(connectorState, { onConflict: 'user_id,connector_service' });

    if (connectorStateError) throw connectorStateError;

    return jsonResponse({
      ok: true,
      connectorService: 'github',
      providerAccountId: tokenRecord.provider_account_id,
      providerAccountHandle: tokenRecord.provider_account_handle,
      repositoryCount: repositoryInventory.repository_count,
      repositoryInventory,
      repositories,
    });
  } catch (error) {
    console.error('connectors-github-repositories failed', error);
    return jsonResponse({
      ok: false,
      error: error instanceof Error ? error.message : 'UNKNOWN_ERROR',
    }, 500);
  }
});