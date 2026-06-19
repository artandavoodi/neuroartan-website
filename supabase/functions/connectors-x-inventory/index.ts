/// <reference lib="deno.ns" />
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SECRET_KEYS') || '';
const X_CLIENT_ID = Deno.env.get('X_CLIENT_ID') || Deno.env.get('TWITTER_CLIENT_ID') || '';
const X_CLIENT_SECRET = Deno.env.get('X_CLIENT_SECRET') || Deno.env.get('TWITTER_CLIENT_SECRET') || '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

function readBearerToken(request: Request) {
  const header = request.headers.get('Authorization') || request.headers.get('authorization') || '';
  return header.replace(/^Bearer\s+/i, '').trim();
}

function requiredEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`${name}_MISSING`);
  return value;
}

function fromUtf8(value: string) {
  return new TextEncoder().encode(value);
}

function fromBase64(value: string) {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}

async function deriveEncryptionKey() {
  const secret = requiredEnv('CONNECTOR_TOKEN_ENCRYPTION_KEY');
  const digest = await crypto.subtle.digest('SHA-256', fromUtf8(secret));
  return crypto.subtle.importKey('raw', digest, 'AES-GCM', false, ['decrypt']);
}

async function decryptToken(payload: string) {
  const parsed = JSON.parse(payload) as Record<string, string | number>;
  if (parsed?.v !== 1 || parsed?.alg !== 'AES-GCM') throw new Error('UNSUPPORTED_TOKEN_PAYLOAD');

  const key = await deriveEncryptionKey();
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64(String(parsed.iv || '')) },
    key,
    fromBase64(String(parsed.data || '')),
  );

  return new TextDecoder().decode(decrypted);
}

function toBase64(value: Uint8Array) {
  return btoa(String.fromCharCode(...value));
}

function createRandomBytes(length: number) {
  const value = new Uint8Array(length);
  crypto.getRandomValues(value);
  return value;
}

async function encryptToken(value: string) {
  const secret = requiredEnv('CONNECTOR_TOKEN_ENCRYPTION_KEY');
  const digest = await crypto.subtle.digest('SHA-256', fromUtf8(secret));
  const key = await crypto.subtle.importKey('raw', digest, 'AES-GCM', false, ['encrypt']);
  const iv = createRandomBytes(12);
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    fromUtf8(value),
  );

  return JSON.stringify({
    v: 1,
    alg: 'AES-GCM',
    iv: toBase64(iv),
    data: toBase64(new Uint8Array(encrypted)),
  });
}

async function refreshXAccessToken(refreshToken: string) {
  if (!X_CLIENT_ID) throw new Error('X_CLIENT_ID_MISSING');

  const body = new URLSearchParams();
  body.set('grant_type', 'refresh_token');
  body.set('refresh_token', refreshToken);
  body.set('client_id', X_CLIENT_ID);

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/x-www-form-urlencoded',
  };

  if (X_CLIENT_SECRET) {
    headers.Authorization = `Basic ${btoa(`${X_CLIENT_ID}:${X_CLIENT_SECRET}`)}`;
  }

  const response = await fetch('https://api.twitter.com/2/oauth2/token', {
    method: 'POST',
    headers,
    body,
  });

  const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok) {
    throw new Error(`X_TOKEN_REFRESH_FAILED_${response.status}_${JSON.stringify(payload)}`);
  }

  const accessToken = String(payload.access_token || '');
  if (!accessToken) throw new Error('X_REFRESH_ACCESS_TOKEN_MISSING');

  return {
    accessToken,
    refreshToken: payload.refresh_token ? String(payload.refresh_token) : refreshToken,
    expiresIn: Number.isFinite(Number(payload.expires_in)) ? Number(payload.expires_in) : 0,
    scope: String(payload.scope || ''),
  };
}

function readNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function summarizeXInventory(xUser: Record<string, unknown>) {
  const publicMetrics = xUser.public_metrics && typeof xUser.public_metrics === 'object'
    ? xUser.public_metrics as Record<string, unknown>
    : {};

  const tweetCount = readNumber(publicMetrics.tweet_count);
  const followersCount = readNumber(publicMetrics.followers_count);
  const followingCount = readNumber(publicMetrics.following_count);
  const listedCount = readNumber(publicMetrics.listed_count);

  return {
    inventory_type: 'post',
    inventory_ready: true,
    post_count: tweetCount,
    tweet_count: tweetCount,
    followers_count: followersCount,
    following_count: followingCount,
    listed_count: listedCount,
    inventory_scanned_at: new Date().toISOString(),
  };
}

async function fetchXProfile(accessToken: string) {
  const response = await fetch('https://api.twitter.com/2/users/me?user.fields=id,name,username,created_at,description,public_metrics,verified,verified_type,profile_image_url,url', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(`X_PROFILE_REQUEST_FAILED_${response.status}_${JSON.stringify(body)}`);
  }

  const data = body?.data && typeof body.data === 'object'
    ? body.data as Record<string, unknown>
    : null;

  if (!data?.id) throw new Error('X_PROFILE_MISSING');
  return data;
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (request.method !== 'POST') return jsonResponse({ ok: false, error: 'METHOD_NOT_ALLOWED' }, 405);

  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('SUPABASE_ENV_MISSING');
    }

    const bearerToken = readBearerToken(request);
    if (!bearerToken) return jsonResponse({ ok: false, error: 'AUTHORIZATION_REQUIRED' }, 401);

    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: {
          Authorization: `Bearer ${bearerToken}`,
        },
      },
    });

    const { data: userData, error: userError } = await authClient.auth.getUser();
    if (userError || !userData?.user?.id) return jsonResponse({ ok: false, error: 'USER_NOT_AUTHENTICATED' }, 401);

    const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: tokenRecord, error: tokenError } = await serviceClient
      .from('connector_token_vault')
      .select('*')
      .eq('user_id', userData.user.id)
      .eq('connector_service', 'x')
      .is('revoked_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (tokenError) throw tokenError;
    if (!tokenRecord?.encrypted_access_token) return jsonResponse({ ok: false, error: 'X_NOT_CONNECTED' }, 404);

    let accessToken = await decryptToken(String(tokenRecord.encrypted_access_token));
    let tokenRefreshed = false;
    let xUser: Record<string, unknown>;

    try {
      xUser = await fetchXProfile(accessToken);
    } catch (profileError) {
      const message = profileError instanceof Error ? profileError.message : '';
      const shouldRefresh = message.includes('X_PROFILE_REQUEST_FAILED_401');
      if (!shouldRefresh || !tokenRecord.encrypted_refresh_token) throw profileError;

      const refreshToken = await decryptToken(String(tokenRecord.encrypted_refresh_token));
      const refreshedToken = await refreshXAccessToken(refreshToken);
      accessToken = refreshedToken.accessToken;
      tokenRefreshed = true;

      const encryptedAccessToken = await encryptToken(refreshedToken.accessToken);
      const encryptedRefreshToken = await encryptToken(refreshedToken.refreshToken);
      const expiresAt = refreshedToken.expiresIn > 0
        ? new Date(Date.now() + refreshedToken.expiresIn * 1000).toISOString()
        : tokenRecord.expires_at;

      const tokenMetadata = tokenRecord.metadata && typeof tokenRecord.metadata === 'object'
        ? tokenRecord.metadata as Record<string, unknown>
        : {};

      const { error: tokenUpdateError } = await serviceClient
        .from('connector_token_vault')
        .update({
          encrypted_access_token: encryptedAccessToken,
          encrypted_refresh_token: encryptedRefreshToken,
          expires_at: expiresAt,
          scope: refreshedToken.scope || tokenRecord.scope || '',
          metadata: {
            ...tokenMetadata,
            refreshed_at: new Date().toISOString(),
            refresh_owner: 'connectors-x-inventory',
          },
        })
        .eq('id', tokenRecord.id);

      if (tokenUpdateError) throw tokenUpdateError;
      xUser = await fetchXProfile(accessToken);
    }

    const inventory = {
      ...summarizeXInventory(xUser),
      token_refreshed: tokenRefreshed,
    };

    const existingMetadata = tokenRecord.metadata && typeof tokenRecord.metadata === 'object'
      ? tokenRecord.metadata as Record<string, unknown>
      : {};

    const providerAccountId = String(xUser.id || tokenRecord.provider_account_id || '');
    const providerAccountHandle = String(xUser.username || tokenRecord.provider_account_handle || '');

    const connectorState = {
      user_id: userData.user.id,
      profile_id: tokenRecord.profile_id,
      model_id: tokenRecord.model_id,
      connector_service: 'x',
      connector_label: 'X',
      connector_category: 'social',
      runtime: 'oauth-required',
      connection_state: 'connected',
      source_vault_ready: true,
      metadata: {
        ...existingMetadata,
        provider: 'x',
        provider_account_id: providerAccountId,
        provider_account_handle: providerAccountHandle,
        profile_name: xUser.name || '',
        profile_created_at: xUser.created_at || '',
        profile_verified: xUser.verified === true,
        profile_verified_type: xUser.verified_type || '',
        ...inventory,
      },
    };

    const { error: stateError } = await serviceClient
      .from('privacy_connector_state')
      .upsert(connectorState, { onConflict: 'user_id,connector_service' });

    if (stateError) throw stateError;

    return jsonResponse({
      ok: true,
      connectorService: 'x',
      providerAccountId,
      providerAccountHandle,
      inventory,
    });
  } catch (error) {
    console.error('[connectors-x-inventory] Failed.', error);
    return jsonResponse({
      ok: false,
      error: error instanceof Error ? error.message : 'X_INVENTORY_FAILED',
    }, 500);
  }
});