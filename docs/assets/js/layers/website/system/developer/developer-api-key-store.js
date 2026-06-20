/* =============================================================================
   DEVELOPER API KEY STORE

   Raw credentials are returned by the creation RPC once and are deliberately
   never persisted by this module. All subsequent reads expose metadata only.
============================================================================= */

import { getSupabaseClient, normalizeString } from '../account/identity/account-profile-identity.js';

const DEVELOPER_API_KEYS_TABLE = 'developer_api_keys';
const DEVELOPER_API_KEY_FIELDS = [
  'id',
  'key_prefix',
  'label',
  'environment',
  'scopes',
  'rate_limit_per_minute',
  'monthly_usage_limit',
  'status',
  'last_used_at',
  'expires_at',
  'revoked_at',
  'created_at',
].join(', ');

function isMissingRelationError(error) {
  const code = normalizeString(error?.code || '').toUpperCase();
  const message = normalizeString(error?.message || '').toLowerCase();
  return code === '42P01' || code === 'PGRST205' || message.includes('does not exist');
}

async function getCurrentUserId(supabase) {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return normalizeString(data?.session?.user?.id || '');
}

function mapDeveloperApiKey(row = {}) {
  return {
    id: normalizeString(row.id || ''),
    keyPrefix: normalizeString(row.key_prefix || ''),
    label: normalizeString(row.label || 'Default key'),
    environment: normalizeString(row.environment || 'live'),
    scopes: Array.isArray(row.scopes) ? row.scopes.map((scope) => normalizeString(scope)).filter(Boolean) : [],
    rateLimitPerMinute: Number(row.rate_limit_per_minute || 0),
    monthlyUsageLimit: row.monthly_usage_limit === null || row.monthly_usage_limit === undefined
      ? null
      : Number(row.monthly_usage_limit),
    status: normalizeString(row.status || 'active'),
    lastUsedAt: normalizeString(row.last_used_at || ''),
    expiresAt: normalizeString(row.expires_at || ''),
    revokedAt: normalizeString(row.revoked_at || ''),
    createdAt: normalizeString(row.created_at || ''),
  };
}

export function getDeveloperApiKeyBackendState() {
  return {
    configured: Boolean(getSupabaseClient()),
    apiKeysTable: DEVELOPER_API_KEYS_TABLE,
    rawSecretsPersistedClientSide: false,
  };
}

export async function listDeveloperApiKeys() {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  const userId = await getCurrentUserId(supabase);
  if (!userId) return [];

  const { data, error } = await supabase
    .from(DEVELOPER_API_KEYS_TABLE)
    .select(DEVELOPER_API_KEY_FIELDS)
    .eq('owner_auth_user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    if (isMissingRelationError(error)) return [];
    throw error;
  }

  return Array.isArray(data) ? data.map(mapDeveloperApiKey) : [];
}

export async function issueDeveloperApiKey(values = {}) {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('DEVELOPER_API_BACKEND_UNAVAILABLE');

  const { data, error } = await supabase.rpc('create_developer_api_key', {
    p_label: normalizeString(values.label || 'Default key'),
    p_environment: normalizeString(values.environment || 'live'),
    p_scopes: Array.isArray(values.scopes) && values.scopes.length ? values.scopes : ['models.read'],
    p_rate_limit_per_minute: Number(values.rateLimitPerMinute || values.rate_limit_per_minute || 60),
    p_monthly_usage_limit: values.monthlyUsageLimit ?? values.monthly_usage_limit ?? null,
    p_expires_at: values.expiresAt || values.expires_at || null,
  });

  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.secret) throw new Error('DEVELOPER_API_KEY_ISSUANCE_FAILED');

  return {
    key: mapDeveloperApiKey(row),
    secret: String(row.secret),
  };
}

export async function revokeDeveloperApiKey(apiKeyId = '') {
  const supabase = getSupabaseClient();
  const id = normalizeString(apiKeyId);
  if (!supabase || !id) return false;

  const { data, error } = await supabase.rpc('revoke_developer_api_key', { p_key_id: id });
  if (error) throw error;
  return data === true;
}
