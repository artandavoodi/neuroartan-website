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

  const requiredFields = ['username', 'first_name', 'last_name', 'display_name', 'date_of_birth'];
  const missingFields = requiredFields.filter((field) => {
    if (field === 'username') {
      return !normalizeString(profile?.username || profile?.username_lower || profile?.username_normalized || '');
    }

    if (field === 'date_of_birth') {
      return !normalizeString(profile?.date_of_birth || profile?.birth_date || '');
    }

    return !normalizeString(profile?.[field] || '');
  });

  return {
    authenticated:true,
    user,
    profile:profile || null,
    profileComplete:Boolean(profile) && (profile.profile_complete === true || missingFields.length === 0),
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
            source:MODULE_ID
          }
        }
      : { detail:{ source:MODULE_ID, reason:state.reason } }
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
