/* =============================================================================
   00) FILE INDEX
   01) MODULE IMPORTS
   02) MODULE STATE
   03) CONSTANTS
   04) SUPABASE HELPERS
   05) FIREBASE HELPERS
   06) STATE STORE
   07) VALUE HELPERS
   08) ERROR HELPERS
   09) SAVE EXECUTION
   09A) PUBLIC SAVE API
   10) EVENT BINDING
   11) INITIALIZATION
   12) END OF FILE
============================================================================= */

/* =============================================================================
   01) MODULE IMPORTS
============================================================================= */
import {
  buildProfilePayload,
  evaluateEligibility,
  getProfileByUid,
  getSupabaseClient as getProfileIdentitySupabaseClient,
  getSupabaseProfileByAuthUserId as getSupabaseIdentityProfileByAuthUserId,
  getSupabaseProfileByUsername,
  getSupabaseUsernameReservation,
  loadProfileIdentityPolicy,
  normalizeEmail,
  normalizeString,
  normalizeUsername,
  reserveSupabaseUsernameProfile,
  reserveUsernameProfile
} from './account-profile-identity.js';

/* =============================================================================
   02) MODULE STATE
============================================================================= */
const RUNTIME = (window.__NEUROARTAN_PROFILE_SAVE__ ||= {
  initialized: false,
  state: null,
  subscribers: new Set()
});

/* =============================================================================
   03) CONSTANTS
============================================================================= */
const PROFILE_COLLECTION = 'profiles';
const USERNAME_RESERVATION_COLLECTION = 'username_reservations';
const SUPABASE_PROFILE_SELECT_FIELDS = '*';
const SAVE_SCOPES = Object.freeze(['identity', 'route', 'visibility']);

/* =============================================================================
   04) SUPABASE HELPERS
============================================================================= */
/*
 * Transitional rule:
 * Supabase-backed profile persistence below is now the approved canonical
 * direction, but username-reservation governance is still in migration. This
 * file must therefore preserve collision safety and avoid silently treating the
 * profile row alone as the complete public-route ownership system.
 */
function getSupabaseClient() {
  return getProfileIdentitySupabaseClient();
}

function hasSupabaseClient() {
  return !!getSupabaseClient();
}

function isSupabaseRelationMissingError(error) {
  const code = normalizeString(error?.code || '').toUpperCase();
  const message = normalizeString(error?.message || '').toLowerCase();

  return code === '42P01' || message.includes('does not exist');
}

async function getSupabaseProfileByAuthUserId(supabase, authUserId) {
  return getSupabaseIdentityProfileByAuthUserId({
    supabase,
    authUserId
  });
}

async function ensureSupabaseUsernameAvailability(values, existingProfile, user, supabase) {
  const normalizedUsername = normalizeUsername(values.username || existingProfile?.username || '');
  if (!normalizedUsername) return normalizedUsername;

  const currentAuthUserId = normalizeString(user?.id || user?.uid || '');
  const currentProfileId = normalizeString(existingProfile?.id || '');

  const conflictingProfile = await getSupabaseProfileByUsername({
    supabase,
    username: normalizedUsername
  });

  if (conflictingProfile) {
    const conflictingAuthUserId = normalizeString(conflictingProfile.auth_user_id || '');
    const conflictingProfileId = normalizeString(conflictingProfile.id || '');

    if (conflictingAuthUserId && currentAuthUserId && conflictingAuthUserId !== currentAuthUserId) {
      const error = new Error('USERNAME_TAKEN');
      error.code = 'USERNAME_TAKEN';
      throw error;
    }

    if (conflictingProfileId && currentProfileId && conflictingProfileId !== currentProfileId) {
      const error = new Error('USERNAME_TAKEN');
      error.code = 'USERNAME_TAKEN';
      throw error;
    }
  }

  try {
    const reservation = await getSupabaseUsernameReservation({
      supabase,
      username: normalizedUsername
    });

    if (!reservation) return normalizedUsername;

    const reservationAuthUserId = normalizeString(reservation.auth_user_id || reservation.owner_auth_user_id || '');
    const reservationProfileId = normalizeString(reservation.profile_id || reservation.owner_profile_id || '');

    if (reservationAuthUserId && currentAuthUserId && reservationAuthUserId !== currentAuthUserId) {
      const error = new Error('USERNAME_TAKEN');
      error.code = 'USERNAME_TAKEN';
      throw error;
    }

    if (reservationProfileId && currentProfileId && reservationProfileId !== currentProfileId) {
      const error = new Error('USERNAME_TAKEN');
      error.code = 'USERNAME_TAKEN';
      throw error;
    }
  } catch (error) {
    if (!isSupabaseRelationMissingError(error)) {
      throw error;
    }
  }

  return normalizedUsername;
}

/* =============================================================================
   05) FIREBASE HELPERS
============================================================================= */
function hasFirebaseAuth() {
  return !!(window.firebase && typeof window.firebase.auth === 'function');
}

function hasFirestore() {
  return !!(window.firebase && typeof window.firebase.firestore === 'function');
}

function getFirebaseAuth() {
  if (!hasFirebaseAuth()) return null;

  try {
    return window.firebase.auth();
  } catch (_) {
    return null;
  }
}

function getFirestore() {
  if (!hasFirestore()) return null;

  try {
    return window.firebase.firestore();
  } catch (_) {
    return null;
  }
}

async function waitForFirebaseReady(timeoutMs = 15000) {
  if (hasFirebaseAuth() && hasFirestore()) return true;

  return new Promise((resolve) => {
    let settled = false;

    const finish = (value) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      document.removeEventListener('neuroartan:firebase-ready', handleReady);
      resolve(value);
    };

    const handleReady = () => {
      finish(hasFirebaseAuth() && hasFirestore());
    };

    const timeoutId = window.setTimeout(() => {
      finish(false);
    }, timeoutMs);

    document.addEventListener('neuroartan:firebase-ready', handleReady);
  });
}

/* =============================================================================
   06) STATE STORE
============================================================================= */
function createScopeState() {
  return {
    status: 'idle',
    code: '',
    message: ''
  };
}

function createDefaultState() {
  return {
    identity: createScopeState(),
    route: createScopeState(),
    visibility: createScopeState()
  };
}

function notifySubscribers() {
  RUNTIME.subscribers.forEach((subscriber) => {
    try {
      subscriber(getPrivateProfileSaveState());
    } catch (error) {
      console.error('[profile-save] Subscriber update failed.', error);
    }
  });
}

function setScopeState(scope, patch = {}) {
  const currentState = getPrivateProfileSaveState();
  RUNTIME.state = {
    ...currentState,
    [scope]: {
      ...currentState[scope],
      ...patch
    }
  };

  document.dispatchEvent(new CustomEvent('profile:private-save-state-changed', {
    detail: getPrivateProfileSaveState()
  }));

  notifySubscribers();
}

export function getPrivateProfileSaveState() {
  return RUNTIME.state || createDefaultState();
}

export function subscribePrivateProfileSaveState(subscriber) {
  if (typeof subscriber !== 'function') {
    return () => {};
  }

  RUNTIME.subscribers.add(subscriber);
  subscriber(getPrivateProfileSaveState());

  return () => {
    RUNTIME.subscribers.delete(subscriber);
  };
}

/* =============================================================================
   07) VALUE HELPERS
============================================================================= */
function getExistingProfileSeed(existingProfile = null, user = null) {
  const userDisplayName = normalizeString(
    user?.user_metadata?.full_name
    || user?.user_metadata?.name
    || user?.displayName
    || ''
  );

  return {
    email: normalizeEmail(existingProfile?.email || user?.email || user?.user_metadata?.email || ''),
    first_name: normalizeString(existingProfile?.first_name || ''),
    last_name: normalizeString(existingProfile?.last_name || ''),
    display_name: normalizeString(existingProfile?.display_name || userDisplayName),
    date_of_birth: normalizeString(existingProfile?.date_of_birth || existingProfile?.birth_date || ''),
    gender: normalizeString(existingProfile?.gender || ''),
    username: normalizeString(existingProfile?.username || existingProfile?.username_normalized || existingProfile?.username_lower || ''),
    public_display_name: normalizeString(existingProfile?.public_display_name || existingProfile?.display_name || userDisplayName),
    public_identity_label: normalizeString(existingProfile?.public_identity_label || ''),
    public_summary: normalizeString(existingProfile?.public_summary || ''),
    public_primary_link: normalizeString(existingProfile?.public_primary_link || ''),
    public_profile_enabled: existingProfile?.public_profile_enabled === true,
    public_profile_discoverable: existingProfile?.public_profile_discoverable === true
  };
}

function readCheckboxValue(formData, name) {
  return formData.get(name) === 'on';
}

function buildScopedValues(scope, form, existingProfile = null, user = null) {
  const seed = getExistingProfileSeed(existingProfile, user);
  const formData = new FormData(form);

  switch (scope) {
    case 'identity':
      return {
        ...seed,
        first_name: normalizeString(formData.get('first_name') || ''),
        last_name: normalizeString(formData.get('last_name') || ''),
        display_name: normalizeString(formData.get('display_name') || ''),
        date_of_birth: normalizeString(formData.get('date_of_birth') || ''),
        gender: normalizeString(formData.get('gender') || '')
      };
    case 'route':
      return {
        ...seed,
        username: normalizeString(formData.get('username') || seed.username || ''),
        public_display_name: normalizeString(formData.get('public_display_name') || ''),
        public_identity_label: normalizeString(formData.get('public_identity_label') || ''),
        public_summary: normalizeString(formData.get('public_summary') || ''),
        public_primary_link: normalizeString(formData.get('public_primary_link') || '')
      };
    case 'visibility':
      return {
        ...seed,
        public_profile_enabled: readCheckboxValue(formData, 'public_profile_enabled'),
        public_profile_discoverable: readCheckboxValue(formData, 'public_profile_discoverable')
      };
    default:
      return seed;
  }
}

/* =============================================================================
   08) ERROR HELPERS
============================================================================= */
function resolveProfileSaveErrorCode(error) {
  const code = normalizeString(error?.code || '');
  const message = normalizeString(error?.message || '').toLowerCase();

  if (code) return code;
  if (message.includes('api_key_http_referrer_blocked')) return 'API_KEY_HTTP_REFERRER_BLOCKED';
  if (message.includes('http referrer')) return 'API_KEY_HTTP_REFERRER_BLOCKED';
  if (message.includes('cloud firestore api has not been used')) return 'FIRESTORE_API_DISABLED';
  if (message.includes('client is offline')) return 'PROFILE_STORE_UNAVAILABLE';
  if (message.includes('could not reach cloud firestore backend')) return 'PROFILE_STORE_UNAVAILABLE';
  if (message.includes('row-level security')) return 'PROFILE_SAVE_BLOCKED';
  if (message.includes('jwt')) return 'AUTH_REQUIRED';
  if (message.includes('duplicate key')) return 'USERNAME_TAKEN';
  if (message.includes('unique constraint')) return 'USERNAME_TAKEN';
  return 'PROFILE_SAVE_FAILED';
}

function messageForProfileSaveError(code) {
  switch (code) {
    case 'FIREBASE_NOT_READY':
    case 'PROFILE_STORE_UNAVAILABLE':
      return 'Profile storage is not available right now.';
    case 'PROFILE_SAVE_BLOCKED':
      return 'Profile save is blocked by backend access policy right now.';
    case 'API_KEY_HTTP_REFERRER_BLOCKED':
      return 'Profile runtime is blocked by Firebase referrer restrictions for this origin.';
    case 'FIRESTORE_API_DISABLED':
      return 'Profile runtime is blocked because the Firestore API is not enabled for the active Firebase project.';
    case 'USERNAME_CHANGE_LOCKED':
      return 'Username changes are locked once a canonical handle has been claimed.';
    case 'USERNAME_TAKEN':
      return 'That username is already reserved by another profile.';
    case 'USERNAME_REQUIRED':
      return 'Choose a username before enabling the public route.';
    case 'INVALID_DATE_OF_BIRTH':
      return 'Enter a valid date of birth.';
    case 'USER_INELIGIBLE':
      return 'The supplied date of birth does not meet the current eligibility requirement.';
    case 'AUTH_REQUIRED':
      return 'Sign in before editing the private profile surface.';
    default:
      return 'Profile settings could not be saved right now.';
  }
}

/* =============================================================================
   09) SAVE EXECUTION
============================================================================= */
export async function persistProfileWithSupabase(scope, values, existingProfile, user, policy, supabase = getSupabaseClient()) {
  const normalizedUsername = await ensureSupabaseUsernameAvailability(values, existingProfile, user, supabase);

  if (scope === 'visibility' && values.public_profile_enabled && !normalizedUsername) {
    const error = new Error('USERNAME_REQUIRED');
    error.code = 'USERNAME_REQUIRED';
    throw error;
  }

  if (values.date_of_birth) {
    const eligibility = evaluateEligibility(values.date_of_birth, policy);
    if (!eligibility.eligible) {
      const error = new Error(eligibility.reason || 'INVALID_DATE_OF_BIRTH');
      error.code = eligibility.reason || 'INVALID_DATE_OF_BIRTH';
      throw error;
    }

    values.eligibility_age_years = eligibility.ageYears;
    values.minimum_eligible_age_years = eligibility.minimumAge;
  }

  if (normalizedUsername) {
    return reserveSupabaseUsernameProfile({
      supabase,
      user,
      values: {
        ...values,
        username: normalizedUsername
      },
      existingProfile,
      policy
    });
  }

  const payload = buildProfilePayload({
    user,
    values: {
      ...values,
      username: normalizedUsername || values.username || ''
    },
    existingProfile,
    policy
  });

  const currentProfile = existingProfile || await getSupabaseProfileByAuthUserId(supabase, user.id || user.uid);
  const existingRecordId = currentProfile?.id || null;

  const supabasePayload = {
    auth_user_id: user.id || user.uid,
    public_username: payload.public_username || payload.username || normalizedUsername || '',
    username: payload.username || normalizedUsername || currentProfile?.username || '',
    // --- username additions
    username_status: payload.username_status || 'reserved',
    username_route_ready: payload.username_route_ready === true,
    username_reserved_at: payload.username_reserved_at || null,
    display_name: payload.display_name || '',
    avatar_url: payload.avatar_url || user.user_metadata?.avatar_url || user.user_metadata?.picture || '',
    bio: payload.public_summary || currentProfile?.bio || '',
    visibility_state: payload.public_profile_enabled ? 'public' : 'private',
    profile_status: payload.profile_status || currentProfile?.profile_status || 'active',
    public_profile_enabled: payload.public_profile_enabled === true,
    public_profile_discoverable: payload.public_profile_discoverable === true,
    public_profile_visibility: payload.public_profile_visibility || (payload.public_profile_enabled ? 'public' : 'private'),
    public_route_path: payload.public_route_path || '',
    public_route_url: payload.public_route_url || '',
    public_route_canonical_url: payload.public_route_canonical_url || '',
    public_route_status: payload.public_route_status || '',
    public_route_ready: payload.public_route_ready === true,
    public_display_name: payload.public_display_name || '',
    public_identity_label: payload.public_identity_label || '',
    public_avatar_url: payload.public_avatar_url || payload.avatar_url || user.user_metadata?.avatar_url || user.user_metadata?.picture || '',
    public_summary: payload.public_summary || '',
    public_primary_link: payload.public_primary_link || '',
    public_bio: payload.public_bio || payload.public_summary || '',
    public_tagline: payload.public_tagline || '',
    public_links: payload.public_links || [],
    public_modules: payload.public_modules || [],
    public_feature_flags: payload.public_feature_flags || [],
    photo_url: payload.photo_url || payload.avatar_url || user.user_metadata?.avatar_url || user.user_metadata?.picture || '',
    email: payload.email || normalizeEmail(user.email || ''),
    first_name: payload.first_name || '',
    last_name: payload.last_name || '',
    date_of_birth: payload.date_of_birth || payload.birth_date || null,
    birth_date: payload.birth_date || payload.date_of_birth || null,
    gender: payload.gender || '',
    profile_exists: true,
    profile_complete: payload.profile_complete === true,
    profile_completion_status: payload.profile_completion_status || '',
    profile_completion_percent: Number.isFinite(payload.profile_completion_percent) ? payload.profile_completion_percent : null,
    missing_required_fields: Array.isArray(payload.missing_required_fields) ? payload.missing_required_fields : [],
    profile_visibility_status: payload.profile_visibility_status || '',
    eligibility_status: payload.eligibility_status || '',
    eligibility_age_years: Number.isFinite(payload.eligibility_age_years) ? payload.eligibility_age_years : null,
    minimum_eligible_age_years: Number.isFinite(payload.minimum_eligible_age_years) ? payload.minimum_eligible_age_years : null,
    eligibility_policy_status: payload.eligibility_policy_status || '',
    eligibility_checked_at: payload.eligibility_checked_at || null,
    created_at: currentProfile?.created_at || null,
    updated_at: new Date().toISOString()
  };

  if (existingRecordId) {
    const { data, error } = await supabase
      .from(PROFILE_COLLECTION)
      .update(supabasePayload)
      .eq('id', existingRecordId)
      .select(SUPABASE_PROFILE_SELECT_FIELDS)
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  const insertPayload = {
    ...supabasePayload,
    created_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from(PROFILE_COLLECTION)
    .insert(insertPayload)
    .select(SUPABASE_PROFILE_SELECT_FIELDS)
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function persistProfileWithFirebase(scope, values, existingProfile, user, policy, firestore) {
  const normalizedUsername = normalizeUsername(values.username || existingProfile?.username || '');

  if (scope === 'visibility' && values.public_profile_enabled && !normalizedUsername) {
    const error = new Error('USERNAME_REQUIRED');
    error.code = 'USERNAME_REQUIRED';
    throw error;
  }

  if (values.date_of_birth) {
    const eligibility = evaluateEligibility(values.date_of_birth, policy);
    if (!eligibility.eligible) {
      const error = new Error(eligibility.reason || 'INVALID_DATE_OF_BIRTH');
      error.code = eligibility.reason || 'INVALID_DATE_OF_BIRTH';
      throw error;
    }

    values.eligibility_age_years = eligibility.ageYears;
    values.minimum_eligible_age_years = eligibility.minimumAge;
  }

  if (normalizedUsername) {
    return reserveUsernameProfile({
      firestore,
      user,
      values: {
        ...values,
        username: normalizedUsername
      },
      policy,
      profileCollection: PROFILE_COLLECTION,
      reservationCollection: USERNAME_RESERVATION_COLLECTION
    });
  }

  const payload = buildProfilePayload({
    user,
    values,
    existingProfile,
    policy
  });

  await firestore.collection(PROFILE_COLLECTION).doc(user.uid).set(payload, { merge: true });
  return payload;
}

async function handleSaveRequest(form) {
  const scope = normalizeString(form?.dataset?.profileSaveScope || '');
  if (!SAVE_SCOPES.includes(scope)) return;

  setScopeState(scope, {
    status: 'saving',
    code: '',
    message: 'Saving changes…'
  });

  try {
    const supabase = getSupabaseClient();

    if (supabase) {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        throw sessionError;
      }

      const user = sessionData?.session?.user || null;
      if (!user?.id) {
        const error = new Error('AUTH_REQUIRED');
        error.code = 'AUTH_REQUIRED';
        throw error;
      }

      const policy = await loadProfileIdentityPolicy();
      const existingProfile = await getSupabaseProfileByAuthUserId(supabase, user.id || user.uid);
      const values = buildScopedValues(scope, form, existingProfile, user);

      await persistProfileWithSupabase(scope, values, existingProfile, user, policy, supabase);
    } else {
      const ready = await waitForFirebaseReady();
      if (!ready) {
        const error = new Error('FIREBASE_NOT_READY');
        error.code = 'FIREBASE_NOT_READY';
        throw error;
      }

      const auth = getFirebaseAuth();
      const firestore = getFirestore();
      const user = auth?.currentUser || null;

      if (!auth || !firestore || !user?.uid) {
        const error = new Error('AUTH_REQUIRED');
        error.code = 'AUTH_REQUIRED';
        throw error;
      }

      const policy = await loadProfileIdentityPolicy();
      const existingProfile = await getProfileByUid({
        firestore,
        uid: user.uid,
        profileCollection: PROFILE_COLLECTION
      });
      const values = buildScopedValues(scope, form, existingProfile, user);

      await persistProfileWithFirebase(scope, values, existingProfile, user, policy, firestore);
    }

    setScopeState(scope, {
      status: 'success',
      code: '',
      message: 'Profile settings saved.'
    });

    document.dispatchEvent(new CustomEvent('account:profile-refresh-request', {
      detail: {
        source: 'profile-save',
        scope
      }
    }));
  } catch (error) {
    const code = resolveProfileSaveErrorCode(error);
    setScopeState(scope, {
      status: 'error',
      code,
      message: messageForProfileSaveError(code)
    });
    console.error('[profile-save] Save failed.', error);
  }
}

/* =============================================================================
   09A) PUBLIC SAVE API
============================================================================= */
export async function savePrivateProfileScope({
  scope = 'identity',
  values = {},
  existingProfile = null,
  user = null,
  policy = null,
  supabase = getSupabaseClient(),
  firestore = null
} = {}) {
  const normalizedScope = normalizeString(scope || 'identity') || 'identity';

  if (!SAVE_SCOPES.includes(normalizedScope)) {
    const error = new Error('INVALID_PROFILE_SAVE_SCOPE');
    error.code = 'INVALID_PROFILE_SAVE_SCOPE';
    throw error;
  }

  if (!user?.id && !user?.uid) {
    const error = new Error('AUTH_REQUIRED');
    error.code = 'AUTH_REQUIRED';
    throw error;
  }

  const resolvedPolicy = policy || await loadProfileIdentityPolicy();

  if (supabase) {
    return persistProfileWithSupabase(normalizedScope, values, existingProfile, user, resolvedPolicy, supabase);
  }

  if (firestore) {
    return persistProfileWithFirebase(normalizedScope, values, existingProfile, user, resolvedPolicy, firestore);
  }

  const error = new Error('PROFILE_STORE_UNAVAILABLE');
  error.code = 'PROFILE_STORE_UNAVAILABLE';
  throw error;
}

export async function createPrivateBaselineProfile({
  values = {},
  existingProfile = null,
  user = null,
  policy = null,
  supabase = getSupabaseClient(),
  firestore = null
} = {}) {
  return savePrivateProfileScope({
    scope:'route',
    values:{
      public_profile_enabled:false,
      public_profile_discoverable:false,
      ...values
    },
    existingProfile,
    user,
    policy,
    supabase,
    firestore
  });
}

/* =============================================================================
   10) EVENT BINDING
============================================================================= */
function bindFormSaves() {
  document.addEventListener('submit', (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    if (!form.hasAttribute('data-profile-save-form')) return;

    event.preventDefault();
    void handleSaveRequest(form);
  });
}

/* =============================================================================
   11) INITIALIZATION
============================================================================= */
function initProfileSave() {
  if (RUNTIME.initialized) return;
  RUNTIME.initialized = true;

  RUNTIME.state = createDefaultState();
  bindFormSaves();
}

initProfileSave();

/* =============================================================================
   12) END OF FILE
============================================================================= */
