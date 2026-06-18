// @ts-nocheck
/// <reference path="../types.d.ts" />
import { createClient } from 'npm:@supabase/supabase-js@2';

const PROVIDERS = {
  github: {
    label: 'GitHub',
    category: 'repository',
    clientId: 'GITHUB_CLIENT_ID',
    clientSecret: 'GITHUB_CLIENT_SECRET',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    profileUrl: 'https://api.github.com/user',
    tokenAuth: 'body',
    profileMethod: 'GET',
    profileId: 'id',
    profileHandle: 'login',
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'Neuroartan-Connector-OAuth',
    },
  },
  gitlab: {
    label: 'GitLab',
    category: 'repository',
    clientId: 'GITLAB_CLIENT_ID',
    clientSecret: 'GITLAB_CLIENT_SECRET',
    tokenUrl: 'https://gitlab.com/oauth/token',
    profileUrl: 'https://gitlab.com/api/v4/user',
    tokenAuth: 'body',
    profileMethod: 'GET',
    profileId: 'id',
    profileHandle: 'username',
  },
  'google-drive': {
    label: 'Google Drive',
    category: 'cloud-drive',
    clientId: 'GOOGLE_CLIENT_ID',
    clientSecret: 'GOOGLE_CLIENT_SECRET',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    profileUrl: 'https://openidconnect.googleapis.com/v1/userinfo',
    tokenAuth: 'body',
    profileMethod: 'GET',
    profileId: 'sub',
    profileHandle: 'email',
  },
  gmail: {
    label: 'Gmail',
    category: 'google-workspace',
    clientId: 'GOOGLE_CLIENT_ID',
    clientSecret: 'GOOGLE_CLIENT_SECRET',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    profileUrl: 'https://openidconnect.googleapis.com/v1/userinfo',
    tokenAuth: 'body',
    profileMethod: 'GET',
    profileId: 'sub',
    profileHandle: 'email',
  },
  calendar: {
    label: 'Calendar',
    category: 'google-workspace',
    clientId: 'GOOGLE_CLIENT_ID',
    clientSecret: 'GOOGLE_CLIENT_SECRET',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    profileUrl: 'https://openidconnect.googleapis.com/v1/userinfo',
    tokenAuth: 'body',
    profileMethod: 'GET',
    profileId: 'sub',
    profileHandle: 'email',
  },
  contacts: {
    label: 'Contacts',
    category: 'google-workspace',
    clientId: 'GOOGLE_CLIENT_ID',
    clientSecret: 'GOOGLE_CLIENT_SECRET',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    profileUrl: 'https://openidconnect.googleapis.com/v1/userinfo',
    tokenAuth: 'body',
    profileMethod: 'GET',
    profileId: 'sub',
    profileHandle: 'email',
  },
  dropbox: {
    label: 'Dropbox',
    category: 'cloud-drive',
    clientId: 'DROPBOX_CLIENT_ID',
    clientSecret: 'DROPBOX_CLIENT_SECRET',
    tokenUrl: 'https://api.dropboxapi.com/oauth2/token',
    profileUrl: 'https://api.dropboxapi.com/2/users/get_current_account',
    tokenAuth: 'basic',
    profileMethod: 'POST',
    profileId: 'account_id',
    profileHandle: 'email',
  },
  onedrive: {
    label: 'OneDrive',
    category: 'cloud-drive',
    clientId: 'MICROSOFT_CLIENT_ID',
    clientSecret: 'MICROSOFT_CLIENT_SECRET',
    tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    profileUrl: 'https://graph.microsoft.com/v1.0/me',
    tokenAuth: 'body',
    profileMethod: 'GET',
    profileId: 'id',
    profileHandle: 'userPrincipalName',
  },
  slack: {
    label: 'Slack',
    category: 'workspace',
    clientId: 'SLACK_CLIENT_ID',
    clientSecret: 'SLACK_CLIENT_SECRET',
    tokenUrl: 'https://slack.com/api/oauth.v2.access',
    profileUrl: 'https://slack.com/api/auth.test',
    tokenAuth: 'body',
    profileMethod: 'GET',
    profileId: 'user_id',
    profileHandle: 'user',
  },
  notion: {
    label: 'Notion',
    category: 'workspace',
    clientId: 'NOTION_CLIENT_ID',
    clientSecret: 'NOTION_CLIENT_SECRET',
    tokenUrl: 'https://api.notion.com/v1/oauth/token',
    profileUrl: '',
    tokenAuth: 'basic-json',
    profileMethod: 'NONE',
    profileId: 'owner.user.id',
    profileHandle: 'workspace_name',
  },
};

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

function siteUrl() {
  return Deno.env.get('NEUROARTAN_SITE_URL') || 'http://localhost:8891';
}

function redirect(status: string, service = '') {
  const url = new URL(siteUrl());
  if (service) url.searchParams.set('connector', service);
  url.searchParams.set('connectorStatus', status);
  url.hash = 'home-platform-settings-connectors';
  return Response.redirect(url.toString(), 302);
}

function toBase64(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes));
}

function fromUtf8(value: string) {
  return new TextEncoder().encode(value);
}

async function importEncryptionKey() {
  const secret = requiredEnv('CONNECTOR_TOKEN_ENCRYPTION_KEY');
  const digest = await crypto.subtle.digest('SHA-256', fromUtf8(secret));
  return crypto.subtle.importKey('raw', digest, 'AES-GCM', false, ['encrypt']);
}

async function encryptToken(value: string) {
  const key = await importEncryptionKey();
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, fromUtf8(value));
  return JSON.stringify({
    v: 1,
    alg: 'AES-GCM',
    iv: toBase64(iv),
    data: toBase64(new Uint8Array(encrypted)),
  });
}

function readNestedValue(payload: Record<string, unknown>, path = '') {
  return path.split('.').reduce((current, key) => {
    if (!current || typeof current !== 'object') return '';
    return current[key];
  }, payload);
}

async function fetchJson(url: string, options: RequestInit = {}) {
  const response = await fetch(url, options);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.ok === false) {
    throw Object.assign(new Error('UPSTREAM_REQUEST_FAILED'), {
      status: response.status,
      payload,
    });
  }
  return payload;
}

async function exchangeCodeForToken(provider: Record<string, unknown>, session: Record<string, unknown>, code: string) {
  const clientId = requiredEnv(String(provider.clientId));
  const clientSecret = requiredEnv(String(provider.clientSecret));
  const redirectUri = String(session.redirect_uri || '');
  const headers: Record<string, string> = {};
  let body: URLSearchParams | string;

  if (provider.tokenAuth === 'basic-json') {
    headers.Authorization = `Basic ${btoa(`${clientId}:${clientSecret}`)}`;
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    });
  } else {
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    });
    if (provider.tokenAuth === 'basic') {
      headers.Authorization = `Basic ${btoa(`${clientId}:${clientSecret}`)}`;
    } else {
      params.set('client_id', clientId);
      params.set('client_secret', clientSecret);
    }
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
    body = params;
  }

  headers.Accept = 'application/json';
  Object.assign(headers, provider.headers || {});
  return fetchJson(String(provider.tokenUrl), {
    method: 'POST',
    headers,
    body,
  });
}

async function readProviderProfile(provider: Record<string, unknown>, accessToken: string, tokenPayload: Record<string, unknown>) {
  if (!provider.profileUrl) return tokenPayload;
  return fetchJson(String(provider.profileUrl), {
    method: String(provider.profileMethod || 'GET'),
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
      ...(provider.headers || {}),
    },
  });
}

Deno.serve(async (req: Request) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code') || '';
    const state = url.searchParams.get('state') || '';
    const upstreamError = url.searchParams.get('error') || '';
    if (upstreamError) return redirect('error');
    if (!code || !state) return redirect('error');

    const supabase = createClient(requiredEnv('SUPABASE_URL'), readServiceRoleKey(), {
      auth: { persistSession: false },
    });

    const { data: session, error: sessionError } = await supabase
      .from('connector_oauth_sessions')
      .select('*')
      .eq('oauth_state', state)
      .maybeSingle();

    if (sessionError || !session) return redirect('error');
    if (session.session_status !== 'pending') return redirect('error', String(session.connector_service || ''));
    if (Date.parse(session.expires_at) < Date.now()) {
      await supabase
        .from('connector_oauth_sessions')
        .update({ session_status: 'expired', error_message: 'OAUTH_SESSION_EXPIRED' })
        .eq('id', session.id);
      return redirect('expired', String(session.connector_service || ''));
    }

    const service = String(session.connector_service || '').toLowerCase();
    const provider = PROVIDERS[service];
    if (!provider) return redirect('error', service);

    const tokenPayload = await exchangeCodeForToken(provider, session, code);
    const accessToken = String(tokenPayload.access_token || '');
    if (!accessToken) throw new Error('ACCESS_TOKEN_MISSING');

    const refreshToken = tokenPayload.refresh_token ? String(tokenPayload.refresh_token) : '';
    const profile = await readProviderProfile(provider, accessToken, tokenPayload);
    const providerAccountId = String(readNestedValue(profile, String(provider.profileId)) || '');
    const providerAccountHandle = String(readNestedValue(profile, String(provider.profileHandle)) || providerAccountId || '');
    const expiresIn = Number.parseInt(String(tokenPayload.expires_in || '0'), 10);
    const expiresAt = Number.isFinite(expiresIn) && expiresIn > 0
      ? new Date(Date.now() + expiresIn * 1000).toISOString()
      : null;

    const encryptedAccessToken = await encryptToken(accessToken);
    const encryptedRefreshToken = refreshToken ? await encryptToken(refreshToken) : null;

    await supabase
      .from('connector_token_vault')
      .update({ revoked_at: new Date().toISOString() })
      .eq('user_id', session.user_id)
      .eq('connector_service', service)
      .is('revoked_at', null);

    await supabase
      .from('connector_token_vault')
      .insert({
        user_id: session.user_id,
        profile_id: session.profile_id,
        model_id: session.model_id,
        connector_service: service,
        provider_account_id: providerAccountId,
        provider_account_handle: providerAccountHandle,
        encrypted_access_token: encryptedAccessToken,
        encrypted_refresh_token: encryptedRefreshToken,
        token_type: tokenPayload.token_type || 'bearer',
        scope: tokenPayload.scope || (session.requested_scopes || []).join(' '),
        expires_at: expiresAt,
        metadata: {
          provider_label: provider.label,
          provider_category: provider.category,
          profile,
        },
      });

    await supabase
      .from('privacy_connector_state')
      .upsert({
        user_id: session.user_id,
        profile_id: session.profile_id,
        model_id: session.model_id,
        connector_service: service,
        connector_label: provider.label,
        connector_category: provider.category,
        runtime: 'oauth-required',
        connection_state: 'connected',
        source_vault_ready: true,
        metadata: {
          provider_account_id: providerAccountId,
          provider_account_handle: providerAccountHandle,
          connected_at: new Date().toISOString(),
          scopes: session.requested_scopes || [],
          token_expires_at: expiresAt,
        },
      }, { onConflict: 'user_id,connector_service' });

    await supabase
      .from('connector_oauth_sessions')
      .update({
        session_status: 'completed',
        completed_at: new Date().toISOString(),
        error_message: null,
      })
      .eq('id', session.id);

    return redirect('connected', service);
  } catch (error) {
    console.error('[connectors-oauth-callback]', error);
    return redirect('error');
  }
});
