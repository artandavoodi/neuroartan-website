/* =============================================================================
   00) FILE INDEX
   01) MODULE IDENTITY
   02) IMPORTS
   03) SESSION PROFILE RESOLUTION
   04) PUBLIC PROFILE STATE RE-EXPORTS
   05) GLOBAL COMPATIBILITY API
   06) END OF FILE
============================================================================= */

/* =============================================================================
   01) MODULE IDENTITY
============================================================================= */
const MODULE_ID = 'account-profile-state';
const MODULE_PATH = '/website/docs/assets/js/layers/website/system/account/profile/account-profile-state.js';

/* =============================================================================
   02) IMPORTS
============================================================================= */
import {
  getSupabaseClient,
  getSupabaseProfileByAuthUserId,
  normalizeString
} from '../identity/account-profile-identity.js';

export {
  getPublicProfileState,
  refreshPublicProfileState,
  subscribePublicProfileState
} from '../../profile/profile-state.js';

/* =============================================================================
   03) SESSION PROFILE RESOLUTION
============================================================================= */
const REQUIRED_PROFILE_FIELDS = Object.freeze(['username', 'first_name', 'last_name', 'display_name', 'date_of_birth']);

function getProfileMissingFields(profile = null) {
  if (!profile) return REQUIRED_PROFILE_FIELDS.slice();

  return REQUIRED_PROFILE_FIELDS.filter((field) => {
    if (field === 'username') {
      return !normalizeString(profile?.username || profile?.username_lower || profile?.username_normalized || '');
    }

    if (field === 'date_of_birth') {
      return !normalizeString(profile?.date_of_birth || profile?.birth_date || '');
    }

    return !normalizeString(profile?.[field] || '');
  });
}

function isResolvedProfileComplete(profile = null) {
  if (!profile) return false;

  const completionStatus = normalizeString(profile.profile_completion_status || '');
  return profile.profile_complete === true
    || completionStatus === 'complete'
    || getProfileMissingFields(profile).length === 0;
}

export async function resolveAccountProfileState({
  supabase = getSupabaseClient()
} = {}) {
  if (!supabase?.auth || typeof supabase.auth.getSession !== 'function') {
    return {
      authenticated:false,
      user:null,
      profile:null,
      profileComplete:false,
      backend:'unavailable',
      reason:'SUPABASE_CLIENT_UNAVAILABLE'
    };
  }

  const { data, error } = await supabase.auth.getSession();
  if (error) {
    return {
      authenticated:false,
      user:null,
      profile:null,
      profileComplete:false,
      backend:'supabase',
      reason:error.code || error.message || 'SUPABASE_SESSION_ERROR'
    };
  }

  const user = data?.session?.user || null;
  const authUserId = normalizeString(user?.id || '');
  if (!authUserId) {
    return {
      authenticated:false,
      user:null,
      profile:null,
      profileComplete:false,
      backend:'supabase',
      reason:'AUTH_REQUIRED'
    };
  }

  const profile = await getSupabaseProfileByAuthUserId({
    supabase,
    authUserId
  });

  const missingFields = getProfileMissingFields(profile);

  return {
    authenticated:true,
    user,
    profile:profile || null,
    profileComplete:isResolvedProfileComplete(profile),
    backend:'supabase',
    reason:profile ? '' : 'PROFILE_RECORD_MISSING',
    missingFields
  };
}

export async function refreshAccountProfileState(options = {}) {
  const state = await resolveAccountProfileState(options);

  document.dispatchEvent(new CustomEvent(
    state.authenticated ? 'account:profile-state-changed' : 'account:profile-signed-out',
    state.authenticated
      ? {
          detail:{
            user:state.user,
            profile:state.profile,
            profileComplete:state.profileComplete,
            authResolved:true,
            source:MODULE_ID
          }
        }
      : { detail:{ source:MODULE_ID, reason:state.reason, authResolved:true } }
  ));

  return state;
}

/* =============================================================================
   04) PUBLIC PROFILE STATE RE-EXPORTS
============================================================================= */
/* Re-exports above intentionally preserve the existing public profile owner. */

/* =============================================================================
   05) GLOBAL COMPATIBILITY API
============================================================================= */
if (typeof window !== 'undefined') {
  window.NeuroartanAccountProfileState = Object.freeze({
    MODULE_ID,
    MODULE_PATH,
    resolveAccountProfileState,
    refreshAccountProfileState
  });
}

/* =============================================================================
   06) END OF FILE
============================================================================= */
