/* =============================================================================
   00) FILE INDEX
   01) MODULE IDENTITY
   02) MODULE STATE
   03) CONSTANTS
   04) ASSET PATH HELPERS
   05) POLICY HELPERS
   06) NORMALIZATION HELPERS
   07) PUBLIC IDENTITY HELPERS
   08) ELIGIBILITY HELPERS
   09) USERNAME POLICY HELPERS
   10) PROFILE IDENTITY STORE HELPERS
   11) PROFILE PAYLOAD HELPERS
   12) END OF FILE
============================================================================= */

/* =============================================================================
   01) MODULE IDENTITY
============================================================================= */
/* /website/docs/assets/js/layers/website/system/account-profile-identity.js */

/* =============================================================================
   02) MODULE STATE
============================================================================= */
let profileIdentityPolicy = null;
let profileIdentityPolicyPromise = null;

/* =============================================================================
   03) CONSTANTS
============================================================================= */
const PROFILE_IDENTITY_POLICY_URL = '/assets/data/accounts/profile-identity-policy.json';
const DEFAULT_PROFILE_IDENTITY_POLICY = Object.freeze({
  public_profile_url_pattern: 'https://neuroartan.com/{username}',
  public_profile_path_pattern: '/{username}',
  public_profile_display_pattern: 'neuroartan.com/{username}',
  minimum_eligible_age_years: 18,
  minimum_eligible_age_review_status: 'provisional_pending_legal_review',
  username: {
    min_length: 3,
    max_length: 24,
    allowed_pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$',
    reserved_exact: [
      'account',
      'admin',
      'api',
      'artan',
      'careers',
      'contact',
      'davoodi',
      'founder',
      'help',
      'investor',
      'jobs',
      'legal',
      'neuroartan',
      'office',
      'press',
      'profile',
      'security',
      'settings',
      'support',
      'system',
      'team'
    ],
    restricted_tokens: [
      'account',
      'admin',
      'api',
      'artan',
      'contact',
      'davoodi',
      'founder',
      'help',
      'investor',
      'jobs',
      'legal',
      'moderator',
      'neuroartan',
      'office',
      'official',
      'owner',
      'press',
      'profile',
      'security',
      'settings',
      'staff',
      'support',
      'system',
      'team',
      'verified'
    ]
  }
});

const WEBSITE_BASE_PATH = (() => {
  if (typeof window === 'undefined') return '';

  const pathname = window.location.pathname || '';

  if (pathname.includes('/website/docs/')) return '/website/docs';
  if (pathname.endsWith('/website/docs')) return '/website/docs';
  if (pathname.includes('/docs/')) return '/docs';
  if (pathname.endsWith('/docs')) return '/docs';

  return '';
})();

/* =============================================================================
   04) ASSET PATH HELPERS
============================================================================= */
function assetPath(path) {
  const normalized = normalizeString(path);
  if (!normalized) return '';
  return `${WEBSITE_BASE_PATH}${normalized.startsWith('/') ? normalized : `/${normalized}`}`;
}

/* =============================================================================
   05) POLICY HELPERS
============================================================================= */
export function buildProfileIdentityPolicy(raw = {}) {
  const username = raw && typeof raw === 'object' && raw.username && typeof raw.username === 'object'
    ? raw.username
    : {};

  return {
    ...DEFAULT_PROFILE_IDENTITY_POLICY,
    ...(raw && typeof raw === 'object' ? raw : {}),
    username: {
      ...DEFAULT_PROFILE_IDENTITY_POLICY.username,
      ...username,
      reserved_exact: Array.isArray(username.reserved_exact)
        ? username.reserved_exact.map((value) => normalizeUsername(value)).filter(Boolean)
        : DEFAULT_PROFILE_IDENTITY_POLICY.username.reserved_exact,
      restricted_tokens: Array.isArray(username.restricted_tokens)
        ? username.restricted_tokens.map((value) => normalizeUsername(value)).filter(Boolean)
        : DEFAULT_PROFILE_IDENTITY_POLICY.username.restricted_tokens
    }
  };
}

export async function loadProfileIdentityPolicy() {
  if (profileIdentityPolicy) {
    return profileIdentityPolicy;
  }

  if (!profileIdentityPolicyPromise) {
    profileIdentityPolicyPromise = fetch(assetPath(PROFILE_IDENTITY_POLICY_URL), {
      cache: 'no-store'
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const json = await response.json();
        profileIdentityPolicy = buildProfileIdentityPolicy(json);
        return profileIdentityPolicy;
      })
      .catch((error) => {
        console.warn('Profile identity policy fallback active:', error);
        profileIdentityPolicy = buildProfileIdentityPolicy();
        return profileIdentityPolicy;
      })
      .finally(() => {
        profileIdentityPolicyPromise = null;
      });
  }

  return profileIdentityPolicyPromise;
}

export function getProfileIdentityPolicy() {
  return profileIdentityPolicy || DEFAULT_PROFILE_IDENTITY_POLICY;
}

/* =============================================================================
   06) NORMALIZATION HELPERS
============================================================================= */
export function normalizeString(value) {
  return String(value || '').trim();
}

export function normalizeEmail(value) {
  return normalizeString(value).toLowerCase();
}

export function normalizeUsername(value) {
  const raw = normalizeString(value).toLowerCase();

  return raw
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function splitFullName(value) {
  const normalized = normalizeString(value);
  if (!normalized) {
    return {
      first_name: '',
      last_name: ''
    };
  }

  const parts = normalized.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return {
      first_name: parts[0],
      last_name: ''
    };
  }

  return {
    first_name: parts[0],
    last_name: parts.slice(1).join(' ')
  };
}

export function buildUsernameSuggestion(values = {}) {
  const explicit = normalizeUsername(values.username || '');
  if (explicit) return explicit;

  const email = normalizeEmail(values.email || '');
  const emailStem = normalizeUsername(email.split('@')[0] || '');
  if (emailStem) return emailStem;

  const displayName = normalizeUsername(values.display_name || '');
  if (displayName) return displayName;

  const combined = normalizeUsername(`${values.first_name || ''}-${values.last_name || ''}`);
  if (combined) return combined;

  return '';
}

export function buildDisplayName(values = {}) {
  return normalizeString(
    values.display_name
    || `${values.first_name || ''} ${values.last_name || ''}`.trim()
    || values.name
    || ''
  );
}

/* =============================================================================
   07) PUBLIC IDENTITY HELPERS
============================================================================= */
export function buildPublicProfileUrl(username, policy = getProfileIdentityPolicy()) {
  if (!normalizeString(username)) return '';

  return String(policy.public_profile_url_pattern || DEFAULT_PROFILE_IDENTITY_POLICY.public_profile_url_pattern)
    .replace('{username}', normalizeUsername(username));
}

export function buildPublicProfilePath(username, policy = getProfileIdentityPolicy()) {
  if (!normalizeString(username)) return '';

  return String(policy.public_profile_path_pattern || DEFAULT_PROFILE_IDENTITY_POLICY.public_profile_path_pattern)
    .replace('{username}', normalizeUsername(username));
}

export function buildPublicProfileDisplay(username, policy = getProfileIdentityPolicy()) {
  if (!normalizeString(username)) {
    return String(policy.public_profile_display_pattern || DEFAULT_PROFILE_IDENTITY_POLICY.public_profile_display_pattern)
      .replace('{username}', 'username');
  }

  return String(policy.public_profile_display_pattern || DEFAULT_PROFILE_IDENTITY_POLICY.public_profile_display_pattern)
    .replace('{username}', normalizeUsername(username));
}

/* =============================================================================
   08) ELIGIBILITY HELPERS
============================================================================= */
export function parseDateOfBirth(value) {
  const normalized = normalizeString(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return null;

  const date = new Date(`${normalized}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;

  const [year, month, day] = normalized.split('-').map((part) => Number.parseInt(part, 10));
  if (
    date.getUTCFullYear() !== year
    || date.getUTCMonth() + 1 !== month
    || date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
}

function calculateAgeYears(dateOfBirth, referenceDate = new Date()) {
  const years = referenceDate.getUTCFullYear() - dateOfBirth.getUTCFullYear();
  const referenceMonth = referenceDate.getUTCMonth();
  const referenceDay = referenceDate.getUTCDate();
  const birthMonth = dateOfBirth.getUTCMonth();
  const birthDay = dateOfBirth.getUTCDate();
  const birthdayPassed = referenceMonth > birthMonth || (referenceMonth === birthMonth && referenceDay >= birthDay);

  return birthdayPassed ? years : years - 1;
}

export function evaluateEligibility(dateOfBirthValue, policy = getProfileIdentityPolicy()) {
  const dateOfBirth = parseDateOfBirth(dateOfBirthValue);
  const minimumAge = Number.parseInt(policy.minimum_eligible_age_years, 10) || DEFAULT_PROFILE_IDENTITY_POLICY.minimum_eligible_age_years;

  if (!dateOfBirth) {
    return {
      eligible: false,
      reason: 'INVALID_DATE_OF_BIRTH',
      ageYears: null,
      minimumAge
    };
  }

  const now = new Date();
  if (dateOfBirth.getTime() > now.getTime()) {
    return {
      eligible: false,
      reason: 'INVALID_DATE_OF_BIRTH',
      ageYears: null,
      minimumAge
    };
  }

  const ageYears = calculateAgeYears(dateOfBirth, now);
  if (ageYears < minimumAge) {
    return {
      eligible: false,
      reason: 'USER_INELIGIBLE',
      ageYears,
      minimumAge
    };
  }

  return {
    eligible: true,
    reason: '',
    ageYears,
    minimumAge
  };
}

/* =============================================================================
   09) USERNAME POLICY HELPERS
============================================================================= */
export function getUsernameConfig(policy = getProfileIdentityPolicy()) {
  const username = policy.username || DEFAULT_PROFILE_IDENTITY_POLICY.username;

  return {
    minLength: Number.parseInt(username.min_length, 10) || DEFAULT_PROFILE_IDENTITY_POLICY.username.min_length,
    maxLength: Number.parseInt(username.max_length, 10) || DEFAULT_PROFILE_IDENTITY_POLICY.username.max_length,
    allowedPattern: new RegExp(username.allowed_pattern || DEFAULT_PROFILE_IDENTITY_POLICY.username.allowed_pattern),
    reservedExact: new Set((username.reserved_exact || DEFAULT_PROFILE_IDENTITY_POLICY.username.reserved_exact).map((value) => normalizeUsername(value))),
    restrictedTokens: new Set((username.restricted_tokens || DEFAULT_PROFILE_IDENTITY_POLICY.username.restricted_tokens).map((value) => normalizeUsername(value)))
  };
}

export function buildUsernameStatus(state, username, policy = getProfileIdentityPolicy()) {
  const routeDisplay = buildPublicProfileDisplay(username, policy);
  const config = getUsernameConfig(policy);

  switch (state) {
    case 'available':
      return `Available · ${routeDisplay}`;
    case 'checking':
      return `Checking · ${routeDisplay}`;
    case 'invalid-format':
      return `Use ${config.minLength}-${config.maxLength} lowercase letters, numbers, and internal hyphens.`;
    case 'reserved':
      return `Reserved · ${routeDisplay}`;
    case 'restricted':
      return `Restricted · ${routeDisplay}`;
    case 'unavailable':
      return `Unavailable · ${routeDisplay}`;
    default:
      return routeDisplay;
  }
}

export function validateUsernameLocally(username, policy = getProfileIdentityPolicy()) {
  const normalized = normalizeUsername(username);
  const config = getUsernameConfig(policy);

  if (!normalized) {
    return {
      ok: false,
      normalized,
      state: 'idle',
      code: 'USERNAME_REQUIRED',
      message: buildUsernameStatus('idle', '', policy)
    };
  }

  if (
    normalized.length < config.minLength
    || normalized.length > config.maxLength
    || !config.allowedPattern.test(normalized)
  ) {
    return {
      ok: false,
      normalized,
      state: 'invalid-format',
      code: 'USERNAME_INVALID',
      message: buildUsernameStatus('invalid-format', normalized, policy)
    };
  }

  if (config.reservedExact.has(normalized)) {
    return {
      ok: false,
      normalized,
      state: 'reserved',
      code: 'USERNAME_RESERVED',
      message: buildUsernameStatus('reserved', normalized, policy)
    };
  }

  const tokens = normalized.split('-').filter(Boolean);
  if (tokens.some((token) => config.restrictedTokens.has(token))) {
    return {
      ok: false,
      normalized,
      state: 'restricted',
      code: 'USERNAME_RESTRICTED',
      message: buildUsernameStatus('restricted', normalized, policy)
    };
  }

  return {
    ok: true,
    normalized,
    state: 'checking',
    code: '',
    message: buildUsernameStatus('checking', normalized, policy)
  };
}

export function createUsernameError(code) {
  const error = new Error(code);
  error.code = code;
  return error;
}

export function messageForUsernameError(code, policy = getProfileIdentityPolicy()) {
  const config = getUsernameConfig(policy);

  switch (code) {
    case 'USERNAME_INVALID':
      return `Use ${config.minLength}-${config.maxLength} lowercase letters, numbers, and internal hyphens.`;
    case 'USERNAME_RESERVED':
      return 'This username is reserved and cannot be claimed.';
    case 'USERNAME_RESTRICTED':
      return 'This username cannot be used.';
    case 'USERNAME_TAKEN':
      return 'That username is already taken.';
    case 'USERNAME_CHANGE_LOCKED':
      return 'Username changes are not available yet once a public handle has been claimed.';
    case 'PROFILE_STORE_UNAVAILABLE':
      return 'Username validation is not available right now.';
    default:
      return 'Username validation could not be completed.';
  }
}

/* =============================================================================
   10) PROFILE IDENTITY STORE HELPERS
============================================================================= */
export async function findProfileByUsername({
  firestore,
  username,
  profileCollection = 'profiles'
} = {}) {
  const normalizedUsername = normalizeUsername(username);
  if (!firestore || !normalizedUsername) return null;

  const snapshot = await firestore
    .collection(profileCollection)
    .where('username_lower', '==', normalizedUsername)
    .limit(1)
    .get();

  if (snapshot.empty) return null;
  return snapshot.docs[0]?.data() || null;
}

export async function getUsernameReservation({
  firestore,
  username,
  reservationCollection = 'username_reservations'
} = {}) {
  const normalizedUsername = normalizeUsername(username);
  if (!firestore || !normalizedUsername) return null;

  const snapshot = await firestore
    .collection(reservationCollection)
    .doc(normalizedUsername)
    .get();

  if (!snapshot.exists) return null;
  return snapshot.data() || null;
}

export async function getUsernameAvailability({
  firestore,
  username,
  currentUid = '',
  policy = null,
  profileCollection = 'profiles',
  reservationCollection = 'username_reservations'
} = {}) {
  const resolvedPolicy = policy || await loadProfileIdentityPolicy();
  const localValidation = validateUsernameLocally(username, resolvedPolicy);

  if (!localValidation.ok) {
    return localValidation;
  }

  if (!firestore) {
    return {
      ok: false,
      normalized: localValidation.normalized,
      state: 'unavailable',
      code: 'PROFILE_STORE_UNAVAILABLE',
      message: buildUsernameStatus('unavailable', localValidation.normalized, resolvedPolicy)
    };
  }

  const reservation = await getUsernameReservation({
    firestore,
    username: localValidation.normalized,
    reservationCollection
  });

  if (reservation && normalizeString(reservation.uid) && normalizeString(reservation.uid) !== normalizeString(currentUid)) {
    return {
      ok: false,
      normalized: localValidation.normalized,
      state: 'unavailable',
      code: 'USERNAME_TAKEN',
      message: buildUsernameStatus('unavailable', localValidation.normalized, resolvedPolicy)
    };
  }

  const profile = await findProfileByUsername({
    firestore,
    username: localValidation.normalized,
    profileCollection
  });

  if (profile && normalizeString(profile.uid) && normalizeString(profile.uid) !== normalizeString(currentUid)) {
    return {
      ok: false,
      normalized: localValidation.normalized,
      state: 'unavailable',
      code: 'USERNAME_TAKEN',
      message: buildUsernameStatus('unavailable', localValidation.normalized, resolvedPolicy)
    };
  }

  return {
    ok: true,
    normalized: localValidation.normalized,
    state: 'available',
    code: '',
    message: buildUsernameStatus('available', localValidation.normalized, resolvedPolicy)
  };
}

export async function assertUsernameAvailable(options = {}) {
  const availability = await getUsernameAvailability(options);
  if (!availability.ok) {
    throw createUsernameError(availability.code || 'USERNAME_TAKEN');
  }

  return availability;
}

/* =============================================================================
   11) PROFILE PAYLOAD HELPERS
============================================================================= */
function resolveServerTimestamp(firebaseNamespace) {
  const fieldValue = firebaseNamespace?.firestore?.FieldValue;
  return typeof fieldValue?.serverTimestamp === 'function'
    ? fieldValue.serverTimestamp()
    : new Date().toISOString();
}

export function buildProfilePayload({
  firebaseNamespace = typeof window !== 'undefined' ? window.firebase : null,
  user,
  values,
  existingProfile = null,
  policy = getProfileIdentityPolicy()
} = {}) {
  const timestamp = resolveServerTimestamp(firebaseNamespace);

  const payload = {
    uid: user.uid,
    email: normalizeEmail(values.email || user.email || ''),
    username: values.username,
    username_lower: values.username,
    public_profile_path: buildPublicProfilePath(values.username, policy),
    public_profile_url: buildPublicProfileUrl(values.username, policy),
    first_name: values.first_name,
    last_name: values.last_name,
    display_name: values.display_name,
    date_of_birth: values.date_of_birth,
    gender: values.gender || '',
    auth_provider: values.auth_provider,
    photo_url: user.photoURL || existingProfile?.photo_url || '',
    profile_complete: true,
    eligibility_status: 'eligible',
    eligibility_age_years: values.eligibility_age_years,
    minimum_eligible_age_years: values.minimum_eligible_age_years,
    eligibility_policy_status: normalizeString(policy.minimum_eligible_age_review_status || ''),
    eligibility_checked_at: timestamp,
    updated_at: timestamp
  };

  if (!existingProfile?.created_at) {
    payload.created_at = timestamp;
  }

  return payload;
}

export async function reserveUsernameProfile({
  firestore,
  firebaseNamespace = typeof window !== 'undefined' ? window.firebase : null,
  user,
  values,
  policy = null,
  profileCollection = 'profiles',
  reservationCollection = 'username_reservations'
} = {}) {
  const resolvedPolicy = policy || await loadProfileIdentityPolicy();

  if (!firestore || !user?.uid) {
    throw createUsernameError('PROFILE_STORE_UNAVAILABLE');
  }

  const normalizedUsername = normalizeUsername(values.username);
  const reservationRef = firestore.collection(reservationCollection).doc(normalizedUsername);
  const profileRef = firestore.collection(profileCollection).doc(user.uid);
  const timestamp = resolveServerTimestamp(firebaseNamespace);

  return firestore.runTransaction(async (transaction) => {
    const profileSnapshot = await transaction.get(profileRef);
    const reservationSnapshot = await transaction.get(reservationRef);
    const existingProfile = profileSnapshot.exists ? profileSnapshot.data() || null : null;
    const existingUsername = normalizeUsername(existingProfile?.username || '');
    const reservation = reservationSnapshot.exists ? reservationSnapshot.data() || null : null;
    const reservationOwnerUid = normalizeString(reservation?.uid || '');

    if (existingUsername && existingUsername !== normalizedUsername) {
      throw createUsernameError('USERNAME_CHANGE_LOCKED');
    }

    if (reservationOwnerUid && reservationOwnerUid !== user.uid) {
      throw createUsernameError('USERNAME_TAKEN');
    }

    const payload = buildProfilePayload({
      firebaseNamespace,
      user,
      values: {
        ...values,
        username: normalizedUsername
      },
      existingProfile,
      policy: resolvedPolicy
    });

    transaction.set(profileRef, payload, { merge: true });
    transaction.set(reservationRef, {
      username: normalizedUsername,
      username_lower: normalizedUsername,
      uid: user.uid,
      public_profile_path: buildPublicProfilePath(normalizedUsername, resolvedPolicy),
      public_profile_url: buildPublicProfileUrl(normalizedUsername, resolvedPolicy),
      claimed_at: reservation?.claimed_at || timestamp,
      updated_at: timestamp
    }, { merge: true });

    return payload;
  });
}

/* =============================================================================
   12) END OF FILE
============================================================================= */
