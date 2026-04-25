/* =============================================================================
   00) FILE INDEX
   01) MODULE IDENTITY
   02) POLICY PATHS
   03) NORMALIZATION HELPERS
   04) POLICY LOADERS
   05) RESERVED REGISTRY HELPERS
   06) USERNAME POLICY VALIDATION
   07) PUBLIC API
   08) END OF FILE
============================================================================= */

/* =============================================================================
   01) MODULE IDENTITY
============================================================================= */
const MODULE_ID = 'account-username-policy';
const MODULE_PATH = '/website/docs/assets/js/layers/website/system/account/username/account-username-policy.js';

/* =============================================================================
   02) POLICY PATHS
============================================================================= */
const USERNAME_POLICY_PATH = '/assets/data/account/username/username-policy.json';
const RESERVED_USERNAMES_PATH = '/assets/data/account/username/reserved-usernames.json';

let usernamePolicyCache = null;
let reservedUsernamesCache = null;

/* =============================================================================
   03) NORMALIZATION HELPERS
============================================================================= */
export function normalizeAccountUsernameInput(value = '') {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '.')
    .replace(/[^a-z0-9.]+/g, '.')
    .replace(/\.{2,}/g, '.')
    .replace(/^\.+|\.+$/g, '');
}

export function normalizeUsernamePolicyString(value = '') {
  return String(value || '').trim().toLowerCase();
}

/* =============================================================================
   04) POLICY LOADERS
============================================================================= */
async function loadJsonPolicy(path) {
  const response = await fetch(path, { cache:'no-store' });

  if (!response.ok) {
    const error = new Error('USERNAME_POLICY_LOAD_FAILED');
    error.code = 'USERNAME_POLICY_LOAD_FAILED';
    error.path = path;
    error.status = response.status;
    throw error;
  }

  return response.json();
}

export async function loadAccountUsernamePolicy({ force = false } = {}) {
  if (!force && usernamePolicyCache) return usernamePolicyCache;

  usernamePolicyCache = await loadJsonPolicy(USERNAME_POLICY_PATH);
  return usernamePolicyCache;
}

export async function loadReservedUsernamesRegistry({ force = false } = {}) {
  if (!force && reservedUsernamesCache) return reservedUsernamesCache;

  reservedUsernamesCache = await loadJsonPolicy(RESERVED_USERNAMES_PATH);
  return reservedUsernamesCache;
}

/* =============================================================================
   05) RESERVED REGISTRY HELPERS
============================================================================= */
export function flattenReservedUsernameRegistry(registry = {}) {
  const categories = registry?.categories || {};
  const entries = [];

  Object.entries(categories).forEach(([category, config]) => {
    const values = Array.isArray(config?.values) ? config.values : [];

    values.forEach((value) => {
      const normalized = normalizeUsernamePolicyString(value);
      if (!normalized) return;

      entries.push({
        value:normalized,
        category,
        enforcement:config?.enforcement || 'blocked',
        adminOverride:config?.admin_override === true
      });
    });
  });

  return entries;
}

export function findReservedUsernameMatch(username, registry = {}) {
  const normalized = normalizeAccountUsernameInput(username);
  if (!normalized) return null;

  const entries = flattenReservedUsernameRegistry(registry);

  return entries.find((entry) => (
    normalized === entry.value
    || normalized.startsWith(`${entry.value}.`)
  )) || null;
}

/* =============================================================================
   06) USERNAME POLICY VALIDATION
============================================================================= */
export async function validateAccountUsernamePolicy(username, options = {}) {
  const policy = options.policy || await loadAccountUsernamePolicy();
  const registry = options.registry || await loadReservedUsernamesRegistry();
  const normalized = normalizeAccountUsernameInput(username);
  const minLength = Number(policy?.length?.min || 3);
  const maxLength = Number(policy?.length?.max || 32);
  const allowedPattern = new RegExp(policy?.normalization?.allowed_pattern || '^[a-z0-9][a-z0-9.]*[a-z0-9]$');

  if (!normalized) {
    return {
      ok:false,
      normalized,
      state:'empty',
      code:'USERNAME_EMPTY',
      message:'Choose a username.'
    };
  }

  if (normalized.length < minLength) {
    return {
      ok:false,
      normalized,
      state:'invalid',
      code:'USERNAME_TOO_SHORT',
      message:`Use at least ${minLength} characters.`
    };
  }

  if (normalized.length > maxLength) {
    return {
      ok:false,
      normalized,
      state:'invalid',
      code:'USERNAME_TOO_LONG',
      message:`Use ${maxLength} characters or fewer.`
    };
  }

  if (!allowedPattern.test(normalized)) {
    return {
      ok:false,
      normalized,
      state:'invalid',
      code:'USERNAME_INVALID_FORMAT',
      message:'Use lowercase letters, numbers, and internal dots. Start and end with a letter or number.'
    };
  }

  const reservedMatch = findReservedUsernameMatch(normalized, registry);
  if (reservedMatch) {
    return {
      ok:false,
      normalized,
      state:'reserved',
      code:'USERNAME_RESERVED',
      category:reservedMatch.category,
      enforcement:reservedMatch.enforcement,
      adminOverride:reservedMatch.adminOverride,
      message:'This username is reserved.'
    };
  }

  return {
    ok:true,
    normalized,
    state:'policy_valid',
    code:'',
    message:'Username format is valid.'
  };
}

/* =============================================================================
   07) PUBLIC API
============================================================================= */
export const ACCOUNT_USERNAME_POLICY_META = Object.freeze({
  moduleId:MODULE_ID,
  modulePath:MODULE_PATH,
  policyPath:USERNAME_POLICY_PATH,
  reservedRegistryPath:RESERVED_USERNAMES_PATH
});

if (typeof window !== 'undefined') {
  window.NeuroartanAccountUsernamePolicy = Object.freeze({
    normalizeAccountUsernameInput,
    loadAccountUsernamePolicy,
    loadReservedUsernamesRegistry,
    validateAccountUsernamePolicy,
    findReservedUsernameMatch
  });
}

/* =============================================================================
   08) END OF FILE
============================================================================= */