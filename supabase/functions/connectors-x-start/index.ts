import { createClient } from 'npm:@supabase/supabase-js@2';

const X_AUTHORIZATION_URL = 'https://x.com/i/oauth2/authorize';
const X_SCOPES = ['tweet.read', 'users.read', 'offline.access'];

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

async function createCodeChallenge(verifier: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return base64Url(new Uint8Array(digest));
}

function getBearerToken(req: Request) {
  const header = req.headers.get('authorization') || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || '';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'METHOD_NOT_ALLOWED' }, 405);
  }

  try {
    const token = getBearerToken(req);
    if (!token) return jsonResponse({ error: 'AUTH_REQUIRED' }, 401);

    const supabaseUrl = requiredEnv('SUPABASE_URL');
    const clientId = requiredEnv('X_CLIENT_ID');
    const redirectUri = requiredEnv('X_REDIRECT_URI');
    const serviceRoleKey = readServiceRoleKey();
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authData?.user?.id) {
      return jsonResponse({ error: 'AUTH_INVALID' }, 401);
    }

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
    const codeVerifier = randomUrlToken(64);
    const codeChallenge = await createCodeChallenge(codeVerifier);

    const { error: sessionError } = await supabase
      .from('connector_oauth_sessions')
      .insert({
        user_id: userId,
        profile_id: profileId,
        model_id: modelId,
        connector_service: 'x',
        oauth_state: state,
        code_verifier: codeVerifier,
        redirect_uri: redirectUri,
        requested_scopes: X_SCOPES,
      });

    if (sessionError) throw sessionError;

    await supabase
      .from('privacy_connector_state')
      .upsert({
        user_id: userId,
        profile_id: profileId,
        model_id: modelId,
        connector_service: 'x',
        connector_label: 'X',
        connector_category: 'social',
        runtime: 'oauth-required',
        connection_state: 'authorizing',
        source_vault_ready: false,
        metadata: {
          scopes: X_SCOPES,
          started_at: new Date().toISOString(),
        },
      }, { onConflict: 'user_id,connector_service' });

    const authorizationUrl = new URL(X_AUTHORIZATION_URL);
    authorizationUrl.searchParams.set('response_type', 'code');
    authorizationUrl.searchParams.set('client_id', clientId);
    authorizationUrl.searchParams.set('redirect_uri', redirectUri);
    authorizationUrl.searchParams.set('scope', X_SCOPES.join(' '));
    authorizationUrl.searchParams.set('state', state);
    authorizationUrl.searchParams.set('code_challenge', codeChallenge);
    authorizationUrl.searchParams.set('code_challenge_method', 'S256');

    return jsonResponse({ authorizationUrl: authorizationUrl.toString() });
  } catch (error) {
    console.error('[connectors-x-start]', error);
    return jsonResponse({ error: 'X_CONNECTOR_START_FAILED' }, 500);
  }
});
