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
  getSupabaseClient as getProfileIdentitySupabaseClient,
  getSupabaseProfileByAuthUserId as getSupabaseIdentityProfileByAuthUserId,
  getSupabaseProfileByUsername,
  getSupabaseUsernameReservation,
  loadProfileIdentityPolicy,
  normalizeEmail,
  normalizeString,
  normalizeUsername,
  reserveSupabaseUsernameProfile,
} from '../account/identity/account-profile-identity.js';
import { uploadProfileImage } from './profile-image-storage.js';

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
const SAVE_SCOPES = Object.freeze(['identity', 'route', 'visibility', 'media']);

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

function getMissingSupabaseColumnName(error) {
  const message = normalizeString(error?.message || '');
  const match = message.match(/'([^']+)' column of 'profiles'/i);
  return match?.[1] || '';
}

function pruneMissingSupabaseColumn(payload, error) {
  const column = getMissingSupabaseColumnName(error);
  if (!column || !Object.prototype.hasOwnProperty.call(payload, column)) {
    return {
      pruned:false,
      payload
    };
  }
  const nextPayload = { ...payload };
  delete nextPayload[column];
  console.warn(`[profile-save] Removed unsupported Supabase profile column: ${column}`);
  return {
    pruned:true,
    payload:nextPayload
  };
}

async function executeSupabaseProfileMutation({ supabase, existingRecordId, payload }) {
  let activePayload = { ...payload };
  for (let attempt = 0; attempt < 24; attempt += 1) {
    const query = existingRecordId
      ? supabase
        .from(PROFILE_COLLECTION)
        .update(activePayload)
        .eq('id', existingRecordId)
        .select(SUPABASE_PROFILE_SELECT_FIELDS)
        .single()
      : supabase
        .from(PROFILE_COLLECTION)
        .insert(activePayload)
        .select(SUPABASE_PROFILE_SELECT_FIELDS)
        .single();
    const { data, error } = await query;
    if (!error) return data;
    const pruned = pruneMissingSupabaseColumn(activePayload, error);
    if (!pruned.pruned) {
      throw error;
    }
    activePayload = pruned.payload;
  }
  const error = new Error('PROFILE_SCHEMA_PRUNE_LIMIT_REACHED');
  error.code = 'PROFILE_SCHEMA_PRUNE_LIMIT_REACHED';
  throw error;
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
    visibility: createScopeState(),
    media: createScopeState()
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

  const publicFeatureFlags = Array.isArray(existingProfile?.public_feature_flags)
    ? existingProfile.public_feature_flags
    : [];
  const coverFlag = publicFeatureFlags.find((entry) => {
    if (!entry || typeof entry !== 'object') return false;
    return normalizeString(entry.key || entry.name || '') === 'profile_cover_url';
  });

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
    public_profile_discoverable: existingProfile?.public_profile_discoverable === true,
    profile_search_visible: existingProfile?.profile_search_visible !== false,
    profile_models_visible: existingProfile?.profile_models_visible !== false,
    profile_followers_visible: existingProfile?.profile_followers_visible !== false,
    profile_posts_visible: existingProfile?.profile_posts_visible !== false,
    profile_thoughts_visible: existingProfile?.profile_thoughts_visible !== false,
    avatar_url: normalizeString(existingProfile?.avatar_url || existingProfile?.photo_url || user?.user_metadata?.avatar_url || user?.user_metadata?.picture || ''),
    cover_url: normalizeString(coverFlag?.value || coverFlag?.url || ''),
    public_feature_flags: publicFeatureFlags
  };
}

function upsertProfileMediaFlag(flags = [], key = '', value = '') {
  const normalizedKey = normalizeString(key);
  if (!normalizedKey) return Array.isArray(flags) ? flags.slice() : [];

  const nextFlags = (Array.isArray(flags) ? flags : [])
    .filter((entry) => {
      if (!entry || typeof entry !== 'object') return true;
      return normalizeString(entry.key || entry.name || '') !== normalizedKey;
    });

  const normalizedValue = normalizeString(value);
  if (normalizedValue) {
    nextFlags.push({
      key: normalizedKey,
      value: normalizedValue,
      scope: 'profile_media'
    });
  }

  return nextFlags;
}

function readCheckboxValue(formData, name) {
  return formData.get(name) === 'on';
}

function readOptionalCheckboxValue(formData, name, fallback = false) {
  return formData.has(name) ? formData.get(name) === 'on' : fallback === true;
}

function readUploadableFile(source, name) {
  const file = source?.get?.(name) || source?.[name] || null;
  return typeof File !== 'undefined' && file instanceof File && file.size > 0 ? file : null;
}

function getFormDataSnapshot(form) {
  if (typeof FormData !== 'undefined' && form instanceof FormData) {
    return form;
  }

  if (form instanceof HTMLFormElement) {
    return new FormData(form);
  }

  return new FormData();
}

function buildScopedValues(scope, form, existingProfile = null, user = null) {
  const seed = getExistingProfileSeed(existingProfile, user);
  const formData = getFormDataSnapshot(form);

  switch (scope) {
    case 'identity':
      return {
        ...seed,
        first_name: normalizeString(formData.get('first_name') || ''),
        last_name: normalizeString(formData.get('last_name') || ''),
        display_name: normalizeString(formData.get('display_name') || ''),
        date_of_birth: normalizeString(formData.get('date_of_birth') || ''),
        gender: normalizeString(formData.get('gender') || ''),
        public_summary: normalizeString(formData.get('public_summary') || seed.public_summary || ''),
        public_bio: normalizeString(formData.get('public_summary') || seed.public_summary || seed.public_bio || '')
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
        public_profile_enabled: readOptionalCheckboxValue(formData, 'public_profile_enabled', seed.public_profile_enabled),
        public_profile_discoverable: readOptionalCheckboxValue(formData, 'public_profile_discoverable', seed.public_profile_discoverable),
        profile_search_visible: readOptionalCheckboxValue(formData, 'profile_search_visible', seed.profile_search_visible),
        profile_models_visible: readOptionalCheckboxValue(formData, 'profile_models_visible', seed.profile_models_visible),
        profile_followers_visible: readOptionalCheckboxValue(formData, 'profile_followers_visible', seed.profile_followers_visible),
        profile_posts_visible: readOptionalCheckboxValue(formData, 'profile_posts_visible', seed.profile_posts_visible),
        profile_thoughts_visible: readOptionalCheckboxValue(formData, 'profile_thoughts_visible', seed.profile_thoughts_visible)
      };
    case 'media': {
      const avatarUrl = normalizeString(formData.get('avatar_url') || seed.avatar_url || '');
      const coverUrl = normalizeString(formData.get('cover_url') || seed.cover_url || '');

      return {
        ...seed,
        avatar_url: avatarUrl,
        photo_url: avatarUrl,
        public_avatar_url: avatarUrl,
        public_feature_flags: upsertProfileMediaFlag(seed.public_feature_flags, 'profile_cover_url', coverUrl)
      };
    }
    default:
      return seed;
  }
}

async function resolveMediaUploadValues({
  scope = '',
  values = {},
  form = null,
  user = null,
  supabase = getSupabaseClient()
} = {}) {
  if (scope !== 'media') return values;

  const formData = typeof FormData !== 'undefined' && form instanceof FormData
    ? form
    : form instanceof HTMLFormElement
      ? new FormData(form)
      : null;
  const avatarFile = readUploadableFile(formData, 'avatar_file') || readUploadableFile(values, 'avatar_file');
  const coverFile = readUploadableFile(formData, 'cover_file') || readUploadableFile(values, 'cover_file');

  if (!avatarFile && !coverFile) {
    return values;
  }

  if (!supabase) {
    const error = new Error('PROFILE_IMAGE_STORAGE_UNAVAILABLE');
    error.code = 'PROFILE_IMAGE_STORAGE_UNAVAILABLE';
    throw error;
  }

  const nextValues = { ...values };

  if (avatarFile) {
    const upload = await uploadProfileImage({
      file: avatarFile,
      user,
      kind: 'avatar',
      supabase
    });

    nextValues.avatar_url = upload.publicUrl;
    nextValues.photo_url = upload.publicUrl;
    nextValues.public_avatar_url = upload.publicUrl;
    nextValues.avatar_storage_path = upload.storagePath;
    nextValues.profile_image_storage_bucket = upload.bucket;
  }

  if (coverFile) {
    const upload = await uploadProfileImage({
      file: coverFile,
      user,
      kind: 'cover',
      supabase
    });

    nextValues.cover_url = upload.publicUrl;
    nextValues.cover_storage_path = upload.storagePath;
    nextValues.public_feature_flags = upsertProfileMediaFlag(
      upsertProfileMediaFlag(nextValues.public_feature_flags, 'profile_cover_url', upload.publicUrl),
      'profile_cover_storage_path',
      upload.storagePath
    );
  }

  return nextValues;
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
  if (message.includes('client is offline')) return 'PROFILE_STORE_UNAVAILABLE';
  if (message.includes('row-level security')) return 'PROFILE_SAVE_BLOCKED';
  if (message.includes('jwt')) return 'AUTH_REQUIRED';
  if (message.includes('duplicate key')) return 'USERNAME_TAKEN';
  if (message.includes('unique constraint')) return 'USERNAME_TAKEN';
  return 'PROFILE_SAVE_FAILED';
}

function messageForProfileSaveError(code) {
  switch (code) {
    case 'PROFILE_STORE_UNAVAILABLE':
      return 'Profile storage is not available right now.';
    case 'PROFILE_SAVE_BLOCKED':
      return 'Profile save is blocked by backend access policy right now.';
    case 'API_KEY_HTTP_REFERRER_BLOCKED':
      return 'Authentication is blocked for this local origin. Verify the approved redirect and origin configuration.';
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
    case 'PROFILE_IMAGE_STORAGE_UNAVAILABLE':
      return 'Profile image storage is not configured for this environment.';
    case 'PROFILE_IMAGE_UPLOAD_FAILED':
      return 'Profile image upload failed. Review the storage bucket and access policy.';
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
    profile_search_visible: values.profile_search_visible !== false,
    profile_models_visible: values.profile_models_visible !== false,
    profile_followers_visible: values.profile_followers_visible !== false,
    profile_posts_visible: values.profile_posts_visible !== false,
    profile_thoughts_visible: values.profile_thoughts_visible !== false,
    public_profile_visibility: payload.public_profile_visibility || (payload.public_profile_enabled ? 'public' : 'private'),
    public_route_path: payload.public_route_path || '',
    public_route_url: payload.public_route_url || '',
    public_route_canonical_url: payload.public_route_canonical_url || '',
    public_route_status: payload.public_route_status || '',
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
    avatar_storage_path: values.avatar_storage_path || payload.avatar_storage_path || currentProfile?.avatar_storage_path || '',
    cover_storage_path: values.cover_storage_path || payload.cover_storage_path || currentProfile?.cover_storage_path || '',
    profile_image_storage_bucket: values.profile_image_storage_bucket || payload.profile_image_storage_bucket || currentProfile?.profile_image_storage_bucket || '',
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

  const mutationPayload = existingRecordId
    ? supabasePayload
    : {
        ...supabasePayload,
        created_at: new Date().toISOString()
      };

  return executeSupabaseProfileMutation({
    supabase,
    existingRecordId,
    payload:mutationPayload
  });
}

async function handleSaveRequest(form) {
  const scope = normalizeString(form?.dataset?.profileSaveScope || '');
  if (!SAVE_SCOPES.includes(scope)) return;

  const submittedFormData = getFormDataSnapshot(form);

  setScopeState(scope, {
    status: 'saving',
    code: '',
    message: 'Saving changes…'
  });

  try {
    const supabase = getSupabaseClient();

    if (!supabase) {
      const error = new Error('PROFILE_STORE_UNAVAILABLE');
      error.code = 'PROFILE_STORE_UNAVAILABLE';
      throw error;
    }

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
    const values = await resolveMediaUploadValues({
      scope,
      values: buildScopedValues(scope, submittedFormData, existingProfile, user),
      form:submittedFormData,
      existingProfile,
      user,
      supabase
    });

    await persistProfileWithSupabase(scope, values, existingProfile, user, policy, supabase);

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
  supabase = getSupabaseClient()
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
  const scopedValues = normalizedScope === 'media'
    ? {
        ...getExistingProfileSeed(existingProfile, user),
        ...values
      }
    : values;
  const resolvedValues = await resolveMediaUploadValues({
    scope: normalizedScope,
    values: scopedValues,
    user,
    supabase
  });

  if (supabase) {
    return persistProfileWithSupabase(normalizedScope, resolvedValues, existingProfile, user, resolvedPolicy, supabase);
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
  supabase = getSupabaseClient()
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
    supabase
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
