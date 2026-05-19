/* =============================================================================
   00) FILE INDEX
   01) MODULE IDENTITY
   02) IMPORTS
   03) CONSTANTS
   04) BACKEND HELPERS
   05) VERIFICATION READS
   06) VERIFICATION WRITES
   07) PUBLIC API
============================================================================= */

/* =============================================================================
   01) MODULE IDENTITY
============================================================================= */
/* /website/docs/assets/js/layers/website/system/profile/profile-verification.js */

/* =============================================================================
   02) IMPORTS
============================================================================= */
import {
  getSupabaseClient,
  getSupabaseProfileByAuthUserId,
  normalizeString
} from '../account/identity/account-profile-identity.js';

/* =============================================================================
   03) CONSTANTS
============================================================================= */
const PROFILE_VERIFICATION_REQUESTS_TABLE = 'profile_verification_requests';
const REQUEST_SELECT_FIELDS = 'id, profile_id, auth_user_id, request_status, verification_type, request_note, created_at, updated_at, reviewed_at';

/* =============================================================================
   04) BACKEND HELPERS
============================================================================= */
function isRelationMissing(error) {
  const code = normalizeString(error?.code).toUpperCase();
  const message = normalizeString(error?.message || error?.details).toLowerCase();
  return code === '42P01' || code === 'PGRST205' || message.includes('does not exist');
}

async function getCurrentUserAndProfile(supabase = getSupabaseClient()) {
  if (!supabase) return { user: null, profile: null };

  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;

  const user = data?.session?.user || null;
  const authUserId = normalizeString(user?.id || user?.uid || '');
  const profile = authUserId
    ? await getSupabaseProfileByAuthUserId({ supabase, authUserId })
    : null;

  return { user, profile };
}

function normalizeProfileVerification(profile = {}) {
  const verified = profile?.verification_status === 'verified'
    || profile?.public_verification_status === 'verified'
    || profile?.profile_verified === true;

  return {
    verified,
    status: verified
      ? 'verified'
      : normalizeString(profile?.verification_status || profile?.public_verification_status || 'unverified'),
    verifiedAt: normalizeString(profile?.verified_at || profile?.profile_verified_at || ''),
    badgeVisible: verified
  };
}

/* =============================================================================
   05) VERIFICATION READS
============================================================================= */
export async function getProfileVerificationState(profileOverride = null) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return {
      backendConfigured: false,
      tableAvailable: false,
      verification: normalizeProfileVerification(profileOverride || {}),
      latestRequest: null
    };
  }

  const { user, profile } = await getCurrentUserAndProfile(supabase);
  const activeProfile = profileOverride || profile || {};
  const profileId = normalizeString(activeProfile?.id || '');
  const authUserId = normalizeString(user?.id || user?.uid || activeProfile?.auth_user_id || '');

  if (!profileId && !authUserId) {
    return {
      backendConfigured: true,
      tableAvailable: true,
      verification: normalizeProfileVerification(activeProfile),
      latestRequest: null
    };
  }

  try {
    let query = supabase
      .from(PROFILE_VERIFICATION_REQUESTS_TABLE)
      .select(REQUEST_SELECT_FIELDS)
      .order('created_at', { ascending: false })
      .limit(1);

    query = profileId
      ? query.eq('profile_id', profileId)
      : query.eq('auth_user_id', authUserId);

    const { data, error } = await query.maybeSingle();
    if (error) throw error;

    return {
      backendConfigured: true,
      tableAvailable: true,
      verification: normalizeProfileVerification(activeProfile),
      latestRequest: data || null
    };
  } catch (error) {
    if (isRelationMissing(error)) {
      return {
        backendConfigured: true,
        tableAvailable: false,
        verification: normalizeProfileVerification(activeProfile),
        latestRequest: null,
        errorCode: 'PROFILE_VERIFICATION_REQUESTS_TABLE_MISSING'
      };
    }

    throw error;
  }
}

/* =============================================================================
   06) VERIFICATION WRITES
============================================================================= */
export async function requestProfileVerification(values = {}) {
  const supabase = getSupabaseClient();
  if (!supabase) throw Object.assign(new Error('PROFILE_VERIFICATION_BACKEND_UNAVAILABLE'), { code: 'PROFILE_VERIFICATION_BACKEND_UNAVAILABLE' });

  const { user, profile } = await getCurrentUserAndProfile(supabase);
  const profileId = normalizeString(profile?.id || '');
  const authUserId = normalizeString(user?.id || user?.uid || '');

  if (!authUserId || !profileId) throw Object.assign(new Error('PROFILE_REQUIRED'), { code: 'PROFILE_REQUIRED' });

  const payload = {
    profile_id: profileId,
    auth_user_id: authUserId,
    request_status: 'submitted',
    verification_type: normalizeString(values.verification_type || values.type || 'profile_identity'),
    request_note: normalizeString(values.request_note || values.note || ''),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from(PROFILE_VERIFICATION_REQUESTS_TABLE)
    .insert(payload)
    .select(REQUEST_SELECT_FIELDS)
    .single();

  if (error) throw error;

  document.dispatchEvent(new CustomEvent('neuroartan:notification-create-request', {
    detail: {
      id: `profile-verification-${data.id || profileId}`,
      title: 'Verification request submitted',
      body: 'Your profile verification request is stored for review.',
      source: 'profile',
      priority: 'normal',
      href: '/profile.html#settings/verification'
    }
  }));

  document.dispatchEvent(new CustomEvent('profile:verification-changed', {
    detail: { profileId, request: data }
  }));

  return data;
}

/* =============================================================================
   07) PUBLIC API
============================================================================= */
window.NEUROARTAN_PROFILE_VERIFICATION = {
  getProfileVerificationState,
  requestProfileVerification
};

/* =============================================================================
   08) END OF FILE
============================================================================= */
