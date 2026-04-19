/* =============================================================================
   00) FILE INDEX
   01) MODULE STATE
   02) CONSTANTS
   03) ASSET PATH HELPERS
   04) POLICY HELPERS
   05) PASSWORD EVALUATION HELPERS
   06) END OF FILE
============================================================================= */

/* =============================================================================
   01) MODULE STATE
============================================================================= */
let accountPasswordPolicy = null;
let accountPasswordPolicyPromise = null;

/* =============================================================================
   02) CONSTANTS
============================================================================= */
const ACCOUNT_PASSWORD_POLICY_URL = '/assets/data/accounts/account-password-policy.json';
const DEFAULT_ACCOUNT_PASSWORD_POLICY = Object.freeze({
  min_length: 8,
  require_lowercase: true,
  require_uppercase: true,
  require_number: true,
  require_special_character: true,
  special_character_pattern: '[^A-Za-z0-9]'
});

/* =============================================================================
   03) ASSET PATH HELPERS
============================================================================= */
function normalizeString(value) {
  return String(value || '').trim();
}

function assetPath(path) {
  const normalized = normalizeString(path);
  if (!normalized) return '';

  if (window.NeuroartanFragmentAuthorities?.assetPath) {
    return window.NeuroartanFragmentAuthorities.assetPath(normalized);
  }

  return normalized.startsWith('/') ? normalized : `/${normalized}`;
}

/* =============================================================================
   04) POLICY HELPERS
============================================================================= */
function buildAccountPasswordPolicy(raw = {}) {
  return {
    ...DEFAULT_ACCOUNT_PASSWORD_POLICY,
    ...(raw && typeof raw === 'object' ? raw : {})
  };
}

export async function loadAccountPasswordPolicy() {
  if (accountPasswordPolicy) {
    return accountPasswordPolicy;
  }

  if (!accountPasswordPolicyPromise) {
    accountPasswordPolicyPromise = fetch(assetPath(ACCOUNT_PASSWORD_POLICY_URL), {
      cache: 'no-store'
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const json = await response.json();
        accountPasswordPolicy = buildAccountPasswordPolicy(json);
        return accountPasswordPolicy;
      })
      .catch((error) => {
        console.warn('Account password policy fallback active:', error);
        accountPasswordPolicy = buildAccountPasswordPolicy();
        return accountPasswordPolicy;
      })
      .finally(() => {
        accountPasswordPolicyPromise = null;
      });
  }

  return accountPasswordPolicyPromise;
}

export function getAccountPasswordPolicy() {
  return accountPasswordPolicy || DEFAULT_ACCOUNT_PASSWORD_POLICY;
}

/* =============================================================================
   05) PASSWORD EVALUATION HELPERS
============================================================================= */
export function buildAccountPasswordHint(policy = getAccountPasswordPolicy()) {
  const minLength = Number.parseInt(policy.min_length, 10) || DEFAULT_ACCOUNT_PASSWORD_POLICY.min_length;
  return `Use at least ${minLength} characters with uppercase and lowercase letters, a number, and a special character.`;
}

function createCriteria(password, policy = getAccountPasswordPolicy()) {
  const value = String(password || '');
  const specialCharacterPattern = new RegExp(
    normalizeString(policy.special_character_pattern) || DEFAULT_ACCOUNT_PASSWORD_POLICY.special_character_pattern
  );
  const minLength = Number.parseInt(policy.min_length, 10) || DEFAULT_ACCOUNT_PASSWORD_POLICY.min_length;

  return [
    {
      key: 'length',
      required: true,
      ok: value.length >= minLength,
      label: `At least ${minLength} characters`
    },
    {
      key: 'lowercase',
      required: policy.require_lowercase !== false,
      ok: /[a-z]/.test(value),
      label: 'One lowercase letter'
    },
    {
      key: 'uppercase',
      required: policy.require_uppercase !== false,
      ok: /[A-Z]/.test(value),
      label: 'One uppercase letter'
    },
    {
      key: 'number',
      required: policy.require_number !== false,
      ok: /[0-9]/.test(value),
      label: 'One number'
    },
    {
      key: 'special',
      required: policy.require_special_character !== false,
      ok: specialCharacterPattern.test(value),
      label: 'One special character'
    }
  ];
}

export function evaluateAccountPassword(password, policy = getAccountPasswordPolicy()) {
  const criteria = createCriteria(password, policy);
  const requiredCriteria = criteria.filter((criterion) => criterion.required);
  const satisfiedRequiredCriteria = requiredCriteria.filter((criterion) => criterion.ok);
  const ok = requiredCriteria.every((criterion) => criterion.ok);

  if (!normalizeString(password)) {
    return {
      ok: false,
      status: 'idle',
      message: buildAccountPasswordHint(policy),
      criteria
    };
  }

  if (ok) {
    return {
      ok: true,
      status: 'strong',
      message: 'Password strength is ready.',
      criteria
    };
  }

  const progress = requiredCriteria.length
    ? satisfiedRequiredCriteria.length / requiredCriteria.length
    : 0;

  const firstMissing = requiredCriteria.find((criterion) => !criterion.ok);

  return {
    ok: false,
    status: progress >= 0.6 ? 'medium' : 'weak',
    message: firstMissing
      ? `${firstMissing.label} is still required.`
      : buildAccountPasswordHint(policy),
    criteria
  };
}

/* =============================================================================
   06) END OF FILE
============================================================================= */
