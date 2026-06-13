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
export const VERIFICATION_REQUEST_COOLDOWN_MS = 72 * 60 * 60 * 1000;
const REQUEST_SELECT_FIELDS = 'id, profile_id, auth_user_id, request_status, verification_type, request_note, created_at, updated_at, reviewed_at, next_request_available_at';
const APPROVED_VERIFICATION_STATUSES = new Set(['approved', 'verified']);
const ACTIVE_REQUEST_STATUSES = new Set(['submitted', 'under_review']);

/* =============================================================================
   04) BACKEND HELPERS
============================================================================= */
function isRelationMissing(error) {
  const code = normalizeString(error?.code).toUpperCase();
  const message = normalizeString(error?.message || error?.details).toLowerCase();
  return code === '42P01' || code === 'PGRST205' || message.includes('does not exist');
}

function isCooldownViolation(error) {
  const code = normalizeString(error?.code).toUpperCase();
  const message = normalizeString(error?.message || error?.details).toUpperCase();
  return code === 'P0001' && message.includes('PROFILE_VERIFICATION_COOLDOWN_ACTIVE');
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

function isApprovedVerificationStatus(value = '') {
  return APPROVED_VERIFICATION_STATUSES.has(normalizeString(value).toLowerCase());
}

function parseTimestamp(value = '') {
  const time = Date.parse(normalizeString(value));
  return Number.isFinite(time) ? time : 0;
}

function resolveNextRequestAvailableAt(request = null) {
  const explicitTime = parseTimestamp(request?.next_request_available_at || '');
  if (explicitTime > 0) return new Date(explicitTime).toISOString();

  const createdTime = parseTimestamp(request?.created_at || request?.updated_at || '');
  if (createdTime <= 0) return '';

  return new Date(createdTime + VERIFICATION_REQUEST_COOLDOWN_MS).toISOString();
}

function resolveVerificationRequestGate(request = null, now = Date.now()) {
  if (!request) {
    return {
      canRequest: true,
      locked: false,
      nextRequestAvailableAt: '',
      lockReason: ''
    };
  }

  const status = normalizeString(request?.request_status || '').toLowerCase();
  const nextRequestAvailableAt = resolveNextRequestAvailableAt(request);
  const nextRequestTime = parseTimestamp(nextRequestAvailableAt);
  const activeLocked = ACTIVE_REQUEST_STATUSES.has(status);
  const cooldownLocked = nextRequestTime > now;

  return {
    canRequest: !(activeLocked || cooldownLocked),
    locked: activeLocked || cooldownLocked,
    nextRequestAvailableAt,
    lockReason: activeLocked ? 'active_review' : cooldownLocked ? 'cooldown' : ''
  };
}

export function resolveApprovedProfileVerification(profile = {}) {
  const explicitStatuses = [
    profile?.verification_status,
    profile?.public_verification_status,
    profile?.verification_state,
    profile?.profile_verification_state
  ].map((status) => normalizeString(status).toLowerCase()).filter(Boolean);
  const approvedStatus = explicitStatuses.find((status) => isApprovedVerificationStatus(status));
  const explicitStatus = approvedStatus || explicitStatuses[0] || '';
  const verifiedAt = normalizeString(
    profile?.verified_at
    || profile?.profile_verified_at
    || profile?.verification_approved_at
    || profile?.verification_reviewed_at
    || ''
  );
  const approvedEvidence = profile?.profile_verified === true || Boolean(verifiedAt);
  const verified = Boolean(approvedStatus) && approvedEvidence;

  return {
    verified,
    status: verified ? 'verified' : (explicitStatus || 'unverified'),
    verifiedAt: verified ? verifiedAt : '',
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
      verification: resolveApprovedProfileVerification(profileOverride || {}),
      latestRequest: null,
      requestGate: resolveVerificationRequestGate(null)
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
      verification: resolveApprovedProfileVerification(activeProfile),
      latestRequest: null,
      requestGate: resolveVerificationRequestGate(null)
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
      verification: resolveApprovedProfileVerification(activeProfile),
      latestRequest: data || null,
      requestGate: resolveVerificationRequestGate(data || null)
    };
  } catch (error) {
    if (isRelationMissing(error)) {
      return {
        backendConfigured: true,
        tableAvailable: false,
        verification: resolveApprovedProfileVerification(activeProfile),
        latestRequest: null,
        errorCode: 'PROFILE_VERIFICATION_REQUESTS_TABLE_MISSING',
        requestGate: resolveVerificationRequestGate(null)
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

  const verificationState = await getProfileVerificationState(profile);
  if (verificationState?.requestGate?.locked) {
    throw Object.assign(new Error('PROFILE_VERIFICATION_COOLDOWN_ACTIVE'), {
      code: 'PROFILE_VERIFICATION_COOLDOWN_ACTIVE',
      nextRequestAvailableAt: verificationState.requestGate.nextRequestAvailableAt || '',
      lockReason: verificationState.requestGate.lockReason || 'cooldown'
    });
  }

  const payload = {
    profile_id: profileId,
    auth_user_id: authUserId,
    request_status: 'submitted',
    verification_type: normalizeString(values.verification_type || values.type || 'profile_identity'),
    request_note: normalizeString(values.request_note || values.note || ''),
    next_request_available_at: new Date(Date.now() + VERIFICATION_REQUEST_COOLDOWN_MS).toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from(PROFILE_VERIFICATION_REQUESTS_TABLE)
    .insert(payload)
    .select(REQUEST_SELECT_FIELDS)
    .single();

  if (error) {
    if (isCooldownViolation(error)) {
      const verificationState = await getProfileVerificationState(profile);
      throw Object.assign(new Error('PROFILE_VERIFICATION_COOLDOWN_ACTIVE'), {
        code: 'PROFILE_VERIFICATION_COOLDOWN_ACTIVE',
        nextRequestAvailableAt: verificationState?.requestGate?.nextRequestAvailableAt || '',
        lockReason: verificationState?.requestGate?.lockReason || 'cooldown'
      });
    }
    throw error;
  }

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
  requestProfileVerification,
  resolveVerificationRequestGate,
  VERIFICATION_REQUEST_COOLDOWN_MS
};

/* =============================================================================
   08) END OF FILE
============================================================================= */

/* =============================================================================
   FSC-T-0007) MODEL IDENTITY VERIFICATION BOUNDARY
============================================================================= */

export const PROFILE_MODEL_VERIFICATION_BOUNDARY = Object.freeze({
  verifiesProfileIdentity: true,
  preparesModelIdentity: true,
  doesNotApproveMonetization: true,
  doesNotApproveMarketplace: true,
  doesNotApproveHiring: true
});
