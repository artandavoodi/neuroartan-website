// @ts-nocheck
/// <reference path="../types.d.ts" />
import { createClient } from 'npm:@supabase/supabase-js@2';

const PROVIDERS = {
  github: {
    label: 'GitHub',
    category: 'repository',
    clientId: 'GITHUB_CLIENT_ID',
    redirectUri: 'GITHUB_REDIRECT_URI',
    authorizationUrl: 'https://github.com/login/oauth/authorize',
    scopes: ['read:user', 'user:email', 'public_repo'],
  },
  gitlab: {
    label: 'GitLab',
    category: 'repository',
    clientId: 'GITLAB_CLIENT_ID',
    redirectUri: 'GITLAB_REDIRECT_URI',
    authorizationUrl: 'https://gitlab.com/oauth/authorize',
    scopes: ['read_user', 'read_repository'],
  },
  'google-drive': {
    label: 'Google Drive',
    category: 'cloud-drive',
    clientId: 'GOOGLE_CLIENT_ID',
    redirectUri: 'GOOGLE_REDIRECT_URI',
    authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    scopes: ['openid', 'email', 'profile', 'https://www.googleapis.com/auth/drive.readonly'],
    extraParams: { access_type: 'offline', prompt: 'consent' },
  },
  gmail: {
    label: 'Gmail',
    category: 'google-workspace',
    clientId: 'GOOGLE_CLIENT_ID',
    redirectUri: 'GOOGLE_REDIRECT_URI',
    authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    scopes: ['openid', 'email', 'profile', 'https://www.googleapis.com/auth/gmail.readonly'],
    extraParams: { access_type: 'offline', prompt: 'consent' },
  },
  calendar: {
    label: 'Calendar',
    category: 'google-workspace',
    clientId: 'GOOGLE_CLIENT_ID',
    redirectUri: 'GOOGLE_REDIRECT_URI',
    authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    scopes: ['openid', 'email', 'profile', 'https://www.googleapis.com/auth/calendar.readonly'],
    extraParams: { access_type: 'offline', prompt: 'consent' },
  },
  contacts: {
    label: 'Contacts',
    category: 'google-workspace',
    clientId: 'GOOGLE_CLIENT_ID',
    redirectUri: 'GOOGLE_REDIRECT_URI',
    authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    scopes: ['openid', 'email', 'profile', 'https://www.googleapis.com/auth/contacts.readonly'],
    extraParams: { access_type: 'offline', prompt: 'consent' },
  },
  dropbox: {
    label: 'Dropbox',
    category: 'cloud-drive',
    clientId: 'DROPBOX_CLIENT_ID',
    redirectUri: 'DROPBOX_REDIRECT_URI',
    authorizationUrl: 'https://www.dropbox.com/oauth2/authorize',
    scopes: ['account_info.read', 'files.metadata.read', 'files.content.read'],
    extraParams: { token_access_type: 'offline' },
  },
  onedrive: {
    label: 'OneDrive',
    category: 'cloud-drive',
    clientId: 'MICROSOFT_CLIENT_ID',
    redirectUri: 'MICROSOFT_REDIRECT_URI',
    authorizationUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    scopes: ['offline_access', 'User.Read', 'Files.Read'],
  },
  slack: {
    label: 'Slack',
    category: 'workspace',
    clientId: 'SLACK_CLIENT_ID',
    redirectUri: 'SLACK_REDIRECT_URI',
    authorizationUrl: 'https://slack.com/oauth/v2/authorize',
    scopes: ['users:read', 'channels:history', 'groups:history', 'im:history', 'mpim:history'],
  },
  notion: {
    label: 'Notion',
    category: 'workspace',
    clientId: 'NOTION_CLIENT_ID',
    redirectUri: 'NOTION_REDIRECT_URI',
    authorizationUrl: 'https://api.notion.com/v1/oauth/authorize',
    scopes: [],
    extraParams: { owner: 'user' },
  },
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

function requiredEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`${name}_MISSING`);
  return value;
}

function optionalEnv(name: string) {
  return Deno.env.get(name) || '';
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

function base64Url(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
}

function randomUrlToken(byteLength = 32) {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return base64Url(bytes);
}

function getBearerToken(req: Request) {
  const header = req.headers.get('authorization') || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || '';
}

async function readRequestJson(req: Request) {
  try {
    return await req.json();
  } catch (_) {
    return {};
  }
}

function normalizeService(value = '') {
  return String(value || '').trim().toLowerCase();
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'METHOD_NOT_ALLOWED' }, 405);

  try {
    const token = getBearerToken(req);
    if (!token) return jsonResponse({ error: 'AUTH_REQUIRED' }, 401);

    const payload = await readRequestJson(req) as Record<string, unknown>;
    const service = normalizeService(String(payload.service || ''));
    const provider = PROVIDERS[service];
    if (!provider) return jsonResponse({ error: 'CONNECTOR_PROVIDER_UNSUPPORTED', service }, 400);

    const supabaseUrl = requiredEnv('SUPABASE_URL');
    const serviceRoleKey = readServiceRoleKey();
    const clientId = requiredEnv(provider.clientId);
    const redirectUri = requiredEnv(provider.redirectUri);
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authData?.user?.id) return jsonResponse({ error: 'AUTH_INVALID' }, 401);

    const userId = authData.user.id;
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('auth_user_id', userId)
      .maybeSingle();

    const { data: model } = await supabase
      .from('models')
      .select('id, profile_id')
      .eq('owner_auth_user_id', userId)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    const profileId = model?.profile_id || profile?.id || null;
    const modelId = model?.id || null;
    const state = randomUrlToken(32);

    await supabase
      .from('connector_oauth_sessions')
      .update({
        session_status: 'expired',
        error_message: 'REPLACED_BY_NEW_AUTHORIZATION_ATTEMPT',
      })
      .eq('user_id', userId)
      .eq('connector_service', service)
      .in('session_status', ['pending', 'failed']);

    const { error: sessionError } = await supabase
      .from('connector_oauth_sessions')
      .insert({
        user_id: userId,
        profile_id: profileId,
        model_id: modelId,
        connector_service: service,
        oauth_state: state,
        code_verifier: randomUrlToken(48),
        redirect_uri: redirectUri,
        requested_scopes: provider.scopes,
        metadata: {
          provider_label: provider.label,
          provider_category: provider.category,
          provider_client_id_secret: provider.clientId,
          provider_redirect_uri_secret: provider.redirectUri,
        },
      });
    if (sessionError) throw sessionError;

    await supabase
      .from('privacy_connector_state')
      .upsert({
        user_id: userId,
        profile_id: profileId,
        model_id: modelId,
        connector_service: service,
        connector_label: provider.label,
        connector_category: provider.category,
        runtime: 'oauth-required',
        connection_state: 'authorizing',
        source_vault_ready: false,
        metadata: {
          scopes: provider.scopes,
          started_at: new Date().toISOString(),
        },
      }, { onConflict: 'user_id,connector_service' });

    const authorizationUrl = new URL(provider.authorizationUrl);
    authorizationUrl.searchParams.set('response_type', 'code');
    authorizationUrl.searchParams.set('client_id', clientId);
    authorizationUrl.searchParams.set('redirect_uri', redirectUri);
    authorizationUrl.searchParams.set('state', state);
    if (provider.scopes?.length) authorizationUrl.searchParams.set('scope', provider.scopes.join(service === 'github' ? ' ' : ' '));
    Object.entries(provider.extraParams || {}).forEach(([key, value]) => authorizationUrl.searchParams.set(key, String(value)));
    const audience = optionalEnv(`${service.replaceAll('-', '_').toUpperCase()}_AUDIENCE`);
    if (audience) authorizationUrl.searchParams.set('audience', audience);

    return jsonResponse({
      authorizationUrl: authorizationUrl.toString(),
      service,
      label: provider.label,
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'CONNECTOR_OAUTH_START_FAILED';
    console.error('[connectors-oauth-start]', error);
    return jsonResponse({ error: 'CONNECTOR_OAUTH_START_FAILED', detail }, 500);
  }
});
