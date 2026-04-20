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
  public_route: {
    protected_exact: [
      '404',
      '404.html',
      'about',
      'api',
      'assets',
      'collections',
      'contact',
      'content_sync',
      'cookies',
      'docs',
      'favicon.ico',
      'home',
      'icos',
      'index',
      'index.html',
      'investor',
      'jobs',
      'knowledge',
      'legal',
      'office',
      'pages',
      'press',
      'privacy',
      'profile',
      'profile.html',
      'publications',
      'research',
      'robots.txt',
      'security',
      'single',
      'single.html',
      'sitemap.xml',
      'support',
      'terms',
      'updates',
      'website'
    ],
    protected_prefixes: [
      'assets/',
      'collections/',
      'content_sync/',
      'pages/',
      'publications/'
    ]
  },
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

export const REQUIRED_PROFILE_FIELDS = Object.freeze([
  'username',
  'first_name',
  'last_name',
  'display_name',
  'date_of_birth'
]);

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
  const publicRoute = raw && typeof raw === 'object' && raw.public_route && typeof raw.public_route === 'object'
    ? raw.public_route
    : {};

  return {
    ...DEFAULT_PROFILE_IDENTITY_POLICY,
    ...(raw && typeof raw === 'object' ? raw : {}),
    public_route: {
      ...DEFAULT_PROFILE_IDENTITY_POLICY.public_route,
      ...publicRoute,
      protected_exact: Array.isArray(publicRoute.protected_exact)
        ? publicRoute.protected_exact.map((value) => normalizeString(value).toLowerCase()).filter(Boolean)
        : DEFAULT_PROFILE_IDENTITY_POLICY.public_route.protected_exact,
      protected_prefixes: Array.isArray(publicRoute.protected_prefixes)
        ? publicRoute.protected_prefixes.map((value) => normalizeString(value).toLowerCase()).filter(Boolean)
        : DEFAULT_PROFILE_IDENTITY_POLICY.public_route.protected_prefixes
    },
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

export function normalizeGenderValue(value) {
  const normalized = normalizeString(value).toLowerCase();

  switch (normalized) {
    case 'female':
    case 'woman':
      return 'woman';
    case 'male':
    case 'man':
      return 'man';
    default:
      return '';
  }
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

function resolveProfileFieldValue(field, values = {}, existingProfile = null) {
  switch (field) {
    case 'username':
      return normalizeUsername(
        values.username
        || values.username_normalized
        || values.username_lower
        || existingProfile?.username
        || existingProfile?.username_normalized
        || existingProfile?.username_lower
        || ''
      );
    case 'display_name':
      return normalizeString(
        values.display_name
        || existingProfile?.display_name
        || buildDisplayName({
          first_name: values.first_name || existingProfile?.first_name || '',
          last_name: values.last_name || existingProfile?.last_name || '',
          name: values.name || existingProfile?.name || ''
        })
      );
    case 'date_of_birth':
      return normalizeString(
        values.date_of_birth
        || values.birth_date
        || existingProfile?.date_of_birth
        || existingProfile?.birth_date
        || ''
      );
    case 'gender':
      return normalizeGenderValue(
        values.gender
        || existingProfile?.gender
        || ''
      );
    default:
      return normalizeString(values[field] || existingProfile?.[field] || '');
  }
}

export function buildProfileCompletionState(values = {}, existingProfile = null) {
  const missingFields = REQUIRED_PROFILE_FIELDS.filter((field) => {
    return !resolveProfileFieldValue(field, values, existingProfile);
  });

  const complete = missingFields.length === 0;
  const percent = Math.round(
    ((REQUIRED_PROFILE_FIELDS.length - missingFields.length) / REQUIRED_PROFILE_FIELDS.length) * 100
  );

  return {
    complete,
    missingFields,
    percent: Math.max(0, Math.min(100, percent)),
    status: complete ? 'complete' : 'incomplete'
  };
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

export function getPublicRouteConfig(policy = getProfileIdentityPolicy()) {
  const publicRoute = policy.public_route || DEFAULT_PROFILE_IDENTITY_POLICY.public_route;

  return {
    protectedExact: new Set(
      (publicRoute.protected_exact || DEFAULT_PROFILE_IDENTITY_POLICY.public_route.protected_exact)
        .map((value) => normalizeString(value).toLowerCase())
        .filter(Boolean)
    ),
    protectedPrefixes: (publicRoute.protected_prefixes || DEFAULT_PROFILE_IDENTITY_POLICY.public_route.protected_prefixes)
      .map((value) => normalizeString(value).toLowerCase())
      .filter(Boolean)
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

export async function getProfileByUid({
  firestore,
  uid,
  profileCollection = 'profiles'
} = {}) {
  const normalizedUid = normalizeString(uid);
  if (!firestore || !normalizedUid) return null;

  const snapshot = await firestore
    .collection(profileCollection)
    .doc(normalizedUid)
    .get();

  if (!snapshot.exists) return null;
  return snapshot.data() || null;
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

function normalizePublicLinks(value) {
  if (!Array.isArray(value)) return [];

  return value
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;

      const label = normalizeString(entry.label || entry.title || entry.name || '');
      const url = normalizeString(entry.url || entry.href || '');
      if (!url) return null;

      return {
        label: label || url,
        url
      };
    })
    .filter(Boolean);
}

function resolvePublicLinks(values = {}, existingProfile = null) {
  const explicitLinks = normalizePublicLinks(values.public_links);
  if (explicitLinks.length) return explicitLinks;

  return normalizePublicLinks(existingProfile?.public_links);
}

function resolvePublicVisibilityState(profile = null) {
  const publicEnabled = profile?.public_profile_enabled === true;
  const publicVisibility = normalizeString(profile?.public_profile_visibility || '');
  const routeStatus = normalizeString(profile?.public_route_status || '');

  if (!publicEnabled) {
    return 'reserved_but_disabled';
  }

  if (['hidden', 'private', 'owner_only', 'internal'].includes(publicVisibility)) {
    return 'reserved_but_hidden';
  }

  if (!['ready', 'renderable', 'active'].includes(routeStatus)) {
    return 'reserved_but_not_ready';
  }

  return 'found_renderable';
}

export function buildPublicProfileModel(profile, policy = getProfileIdentityPolicy()) {
  if (!profile || typeof profile !== 'object') return null;

  const publicUsername = normalizeUsername(
    profile.public_username
    || profile.username_normalized
    || profile.username_lower
    || profile.username
    || ''
  );

  if (!publicUsername) return null;

  const publicLinks = normalizePublicLinks(profile.public_links);
  const publicPrimaryLink = normalizeString(
    profile.public_primary_link
    || publicLinks[0]?.url
    || ''
  );
  const publicSummary = normalizeString(
    profile.public_summary
    || profile.public_bio
    || profile.public_tagline
    || ''
  );

  return {
    public_display_name: normalizeString(
      profile.public_display_name
      || profile.display_name
      || buildDisplayName(profile)
    ),
    public_username: publicUsername,
    public_avatar_url: normalizeString(
      profile.public_avatar_url
      || profile.avatar_url
      || profile.photo_url
      || ''
    ),
    public_preferred_name: normalizeString(profile.public_preferred_name || ''),
    public_identity_label: normalizeString(profile.public_identity_label || ''),
    public_route_path: normalizeString(
      profile.public_route_path
      || profile.public_profile_path
      || buildPublicProfilePath(publicUsername, policy)
    ),
    public_route_status: normalizeString(profile.public_route_status || ''),
    public_profile_enabled: profile.public_profile_enabled === true,
    public_route_canonical_url: normalizeString(
      profile.public_route_url
      || profile.public_profile_url
      || buildPublicProfileUrl(publicUsername, policy)
    ),
    public_profile_visibility: normalizeString(profile.public_profile_visibility || ''),
    public_profile_discoverable: profile.public_profile_discoverable === true,
    public_profile_state_reason: normalizeString(profile.public_profile_state_reason || ''),
    public_summary: publicSummary,
    public_bio: normalizeString(profile.public_bio || ''),
    public_tagline: normalizeString(profile.public_tagline || ''),
    public_links: publicLinks,
    public_primary_link: publicPrimaryLink,
    public_modules: Array.isArray(profile.public_modules) ? profile.public_modules : [],
    public_feature_flags: Array.isArray(profile.public_feature_flags) ? profile.public_feature_flags : []
  };
}

export async function resolvePublicProfileByUsername({
  firestore,
  username,
  policy = null,
  profileCollection = 'profiles',
  reservationCollection = 'username_reservations'
} = {}) {
  const resolvedPolicy = policy || await loadProfileIdentityPolicy();
  const candidate = normalizeString(username);
  const localValidation = validateUsernameLocally(candidate, resolvedPolicy);
  const normalizedUsername = normalizeUsername(candidate);
  const publicRoutePath = buildPublicProfilePath(normalizedUsername, resolvedPolicy);
  const publicRouteUrl = buildPublicProfileUrl(normalizedUsername, resolvedPolicy);
  const publicRouteDisplay = buildPublicProfileDisplay(normalizedUsername, resolvedPolicy);

  if (!localValidation.ok) {
    return {
      outcome: localValidation.state === 'reserved' || localValidation.state === 'restricted'
        ? 'restricted_username'
        : 'invalid_username',
      username: candidate,
      normalizedUsername,
      publicRoutePath,
      publicRouteUrl,
      publicRouteDisplay,
      publicProfile: null
    };
  }

  if (!firestore) {
    return {
      outcome: 'error',
      username: candidate,
      normalizedUsername,
      publicRoutePath,
      publicRouteUrl,
      publicRouteDisplay,
      publicProfile: null,
      reason: 'PROFILE_STORE_UNAVAILABLE'
    };
  }

  const reservation = await getUsernameReservation({
    firestore,
    username: normalizedUsername,
    reservationCollection
  });

  const reservationOwnerUid = normalizeString(reservation?.uid || '');
  if (!reservationOwnerUid) {
    return {
      outcome: 'not_found',
      username: candidate,
      normalizedUsername,
      publicRoutePath,
      publicRouteUrl,
      publicRouteDisplay,
      publicProfile: null
    };
  }

  const profile = await getProfileByUid({
    firestore,
    uid: reservationOwnerUid,
    profileCollection
  });

  if (!profile) {
    return {
      outcome: 'not_found',
      username: candidate,
      normalizedUsername,
      publicRoutePath,
      publicRouteUrl,
      publicRouteDisplay,
      publicProfile: null
    };
  }

  const publicProfile = buildPublicProfileModel(profile, resolvedPolicy);
  const visibilityOutcome = resolvePublicVisibilityState(profile);

  return {
    outcome: visibilityOutcome,
    username: candidate,
    normalizedUsername,
    publicRoutePath,
    publicRouteUrl,
    publicRouteDisplay,
    publicProfile: visibilityOutcome === 'found_renderable' ? publicProfile : null
  };
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

function uniqueStrings(values = []) {
  return Array.from(new Set(
    values
      .map((value) => normalizeString(value))
      .filter(Boolean)
  ));
}

function resolveAuthProviderLinks(user, existingProfile = null, explicitProvider = '') {
  const existingProviders = Array.isArray(existingProfile?.auth_provider_links)
    ? existingProfile.auth_provider_links
    : [];

  const providerData = Array.isArray(user?.providerData)
    ? user.providerData.map((provider) => provider?.providerId || '')
    : [];

  return uniqueStrings([
    explicitProvider,
    ...existingProviders,
    ...providerData
  ]);
}

export function buildProfilePayload({
  firebaseNamespace = typeof window !== 'undefined' ? window.firebase : null,
  user,
  values,
  existingProfile = null,
  policy = getProfileIdentityPolicy()
} = {}) {
  const timestamp = resolveServerTimestamp(firebaseNamespace);
  const normalizedUsername = normalizeUsername(
    values.username
    || existingProfile?.username
    || existingProfile?.username_normalized
    || existingProfile?.username_lower
    || ''
  );
  const authProviderPrimary = normalizeString(values.auth_provider || existingProfile?.auth_provider_primary || '');
  const authProviderLinks = resolveAuthProviderLinks(user, existingProfile, authProviderPrimary);
  const avatarUrl = normalizeString(user.photoURL || existingProfile?.avatar_url || existingProfile?.photo_url || '');
  const completionState = buildProfileCompletionState(values, existingProfile);
  const usernameRouteReady = typeof values.username_route_ready === 'boolean'
    ? values.username_route_ready
    : (existingProfile?.username_route_ready === true || Boolean(normalizedUsername));
  const requestedPublicProfileEnabled = typeof values.public_profile_enabled === 'boolean'
    ? values.public_profile_enabled
    : existingProfile?.public_profile_enabled === true;
  const publicProfileEnabled = Boolean(normalizedUsername) ? requestedPublicProfileEnabled : false;
  const requestedPublicProfileDiscoverable = typeof values.public_profile_discoverable === 'boolean'
    ? values.public_profile_discoverable
    : existingProfile?.public_profile_discoverable === true;
  const publicProfileDiscoverable = publicProfileEnabled && requestedPublicProfileDiscoverable;
  const publicRouteStatus = normalizeString(
    values.public_route_status
    || existingProfile?.public_route_status
    || (publicProfileEnabled && usernameRouteReady ? 'ready' : normalizedUsername ? 'disabled' : 'pending')
  );
  const profileVisibilityStatus = normalizeString(
    values.profile_visibility_status
    || existingProfile?.profile_visibility_status
    || (publicProfileEnabled ? 'controlled_public' : 'private')
  );
  const usernameRaw = normalizeString(
    values.username_raw
    || values.username
    || existingProfile?.username_raw
    || existingProfile?.username
    || ''
  );
  const usernameReservedAt = existingProfile?.username_reserved_at || timestamp;
  const publicLinks = resolvePublicLinks(values, existingProfile);
  const publicPrimaryLink = normalizeString(
    values.public_primary_link
    || existingProfile?.public_primary_link
    || publicLinks[0]?.url
    || ''
  );
  const usernameStatus = normalizeString(
    values.username_status
    || existingProfile?.username_status
    || (normalizedUsername ? 'reserved' : 'missing')
  );
  const explicitMissingRequiredFields = Array.isArray(values.missing_required_fields)
    ? values.missing_required_fields.map((field) => normalizeString(field)).filter(Boolean)
    : null;

  const payload = {
    profile_id: existingProfile?.profile_id || user.uid,
    auth_user_id: user.uid,
    record_version: Number(existingProfile?.record_version || 1),
    uid: user.uid,
    auth_provider_primary: authProviderPrimary,
    auth_provider_links: authProviderLinks,
    auth_email: normalizeEmail(values.email || user.email || ''),
    auth_phone: normalizeString(values.phone || existingProfile?.auth_phone || ''),
    auth_email_verified: user.emailVerified === true || existingProfile?.auth_email_verified === true,
    auth_phone_verified: existingProfile?.auth_phone_verified === true,
    email: normalizeEmail(values.email || user.email || ''),
    username: normalizedUsername,
    username_raw: usernameRaw,
    username_normalized: normalizedUsername,
    username_lower: normalizedUsername,
    username_status: usernameStatus,
    username_reserved_at: usernameReservedAt,
    username_route_ready: usernameRouteReady,
    public_display_name: normalizeString(values.public_display_name || existingProfile?.public_display_name || values.display_name),
    public_username: normalizedUsername,
    public_avatar_url: avatarUrl,
    public_identity_label: normalizeString(values.public_identity_label || existingProfile?.public_identity_label || ''),
    public_profile_path: buildPublicProfilePath(normalizedUsername, policy),
    public_profile_url: buildPublicProfileUrl(normalizedUsername, policy),
    public_route_path: buildPublicProfilePath(normalizedUsername, policy),
    public_route_url: buildPublicProfileUrl(normalizedUsername, policy),
    public_route_canonical_url: buildPublicProfileUrl(normalizedUsername, policy),
    public_route_status: publicRouteStatus,
    public_profile_enabled: publicProfileEnabled,
    public_profile_discoverable: publicProfileDiscoverable,
    public_profile_visibility: publicProfileEnabled ? 'enabled' : 'disabled',
    public_summary: normalizeString(values.public_summary || existingProfile?.public_summary || ''),
    public_bio: normalizeString(values.public_bio || existingProfile?.public_bio || ''),
    public_tagline: normalizeString(values.public_tagline || existingProfile?.public_tagline || ''),
    public_links: publicLinks,
    public_primary_link: publicPrimaryLink,
    public_modules: Array.isArray(values.public_modules)
      ? values.public_modules
      : (Array.isArray(existingProfile?.public_modules) ? existingProfile.public_modules : []),
    public_feature_flags: Array.isArray(values.public_feature_flags)
      ? values.public_feature_flags
      : (Array.isArray(existingProfile?.public_feature_flags) ? existingProfile.public_feature_flags : []),
    first_name: values.first_name,
    last_name: values.last_name,
    display_name: values.display_name,
    birth_date: values.date_of_birth,
    date_of_birth: values.date_of_birth,
    gender: normalizeGenderValue(values.gender || existingProfile?.gender || ''),
    auth_provider: authProviderPrimary,
    avatar_state: normalizeString(values.avatar_state || existingProfile?.avatar_state || (avatarUrl ? 'active' : 'empty')),
    avatar_url: avatarUrl,
    photo_url: avatarUrl,
    profile_exists: true,
    profile_completion_status: normalizeString(
      values.profile_completion_status
      || completionState.status
    ),
    profile_completion_percent: Number.isFinite(Number(values.profile_completion_percent))
      ? Number(values.profile_completion_percent)
      : completionState.percent,
    missing_required_fields: explicitMissingRequiredFields || completionState.missingFields,
    profile_visibility_status: profileVisibilityStatus,
    profile_complete: typeof values.profile_complete === 'boolean'
      ? values.profile_complete
      : completionState.complete,
    eligibility_status: 'eligible',
    eligibility_age_years: values.eligibility_age_years,
    minimum_eligible_age_years: values.minimum_eligible_age_years,
    eligibility_policy_status: normalizeString(policy.minimum_eligible_age_review_status || ''),
    eligibility_checked_at: timestamp,
    created_by_context: existingProfile?.created_by_context || 'website-account-completion',
    last_updated_by_context: 'website-account-completion',
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

  const rawUsername = normalizeString(values.username);
  const normalizedUsername = normalizeUsername(rawUsername);
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
        username_raw: values.username_raw || rawUsername,
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
