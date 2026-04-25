/* =============================================================================
   00) FILE INDEX
   01) MODULE IDENTITY
   02) IMPORTS
   03) TABLE CONTRACT
   04) ERROR HELPERS
   05) RESERVATION READS
   06) RESERVATION WRITES
   07) PUBLIC API
   08) END OF FILE
============================================================================= */

/* =============================================================================
   01) MODULE IDENTITY
============================================================================= */
const MODULE_ID = 'account-username-reservation';
const MODULE_PATH = '/website/docs/assets/js/layers/website/system/account/username/account-username-reservation.js';

/* =============================================================================
   02) IMPORTS
============================================================================= */
import {
  normalizeAccountUsernameInput
} from './account-username-policy.js';

function getSupabaseClient() {
  if (typeof window === 'undefined') return null;

  return window.neuroartanSupabase || null;
}

/* =============================================================================
   03) TABLE CONTRACT
============================================================================= */
const USERNAME_RESERVATIONS_TABLE = 'username_reservations';
const USERNAME_RESERVATION_SELECT_FIELDS = 'id, auth_user_id, username, username_lower, profile_id, reservation_status, reserved_at, released_at';

/* =============================================================================
   04) ERROR HELPERS
============================================================================= */
export function isUsernameReservationTableMissing(error) {
  const code = String(error?.code || '').trim();
  const message = String(error?.message || '').toLowerCase();
  const details = String(error?.details || '').toLowerCase();

  return (
    code === '42P01'
    || code === 'PGRST205'
    || message.includes('could not find the table')
    || (message.includes('relation') && message.includes('does not exist'))
    || details.includes('could not find the table')
    || (details.includes('relation') && details.includes('does not exist'))
  );
}

export function buildReservationUnavailableResult(username = '') {
  return {
    ok:true,
    available:true,
    reservation:null,
    normalized:normalizeAccountUsernameInput(username),
    source:'reservation_table_missing',
    message:'Username reservation table is not deployed. Falling back to profile-table availability.'
  };
}

/* =============================================================================
   05) RESERVATION READS
============================================================================= */
export async function getUsernameReservation({
  supabase = getSupabaseClient(),
  username,
  selectFields = USERNAME_RESERVATION_SELECT_FIELDS,
  allowMissingTable = true
} = {}) {
  const normalized = normalizeAccountUsernameInput(username);

  if (!supabase || !normalized) return null;

  try {
    const { data, error } = await supabase
      .from(USERNAME_RESERVATIONS_TABLE)
      .select(selectFields)
      .eq('username_lower', normalized)
      .maybeSingle();

    if (error) throw error;

    return data || null;
  } catch (error) {
    if (allowMissingTable && isUsernameReservationTableMissing(error)) {
      return null;
    }

    throw error;
  }
}

export async function checkUsernameReservationAvailability({
  supabase = getSupabaseClient(),
  username,
  currentAuthUserId = '',
  allowMissingTable = true
} = {}) {
  const normalized = normalizeAccountUsernameInput(username);

  if (!normalized) {
    return {
      ok:false,
      available:false,
      reservation:null,
      normalized,
      source:'local',
      message:'Choose a username.'
    };
  }

  try {
    const reservation = await getUsernameReservation({
      supabase,
      username:normalized,
      allowMissingTable
    });

    const owner = String(reservation?.auth_user_id || '').trim();
    const currentOwner = String(currentAuthUserId || '').trim();
    const available = !reservation || !owner || owner === currentOwner;

    return {
      ok:true,
      available,
      reservation,
      normalized,
      source:'username_reservations',
      message:available ? 'Username reservation is clear.' : 'Username is already reserved.'
    };
  } catch (error) {
    if (allowMissingTable && isUsernameReservationTableMissing(error)) {
      return buildReservationUnavailableResult(normalized);
    }

    throw error;
  }
}

/* =============================================================================
   06) RESERVATION WRITES
============================================================================= */
export async function reserveUsername({
  supabase = getSupabaseClient(),
  username,
  authUserId,
  profileId = null,
  allowMissingTable = true
} = {}) {
  const normalized = normalizeAccountUsernameInput(username);
  const owner = String(authUserId || '').trim();

  if (!supabase || !normalized || !owner) {
    return {
      ok:false,
      reserved:false,
      normalized,
      source:'local',
      message:'Username reservation requires an authenticated account.'
    };
  }

  const payload = {
    username:normalized,
    username_lower:normalized,
    auth_user_id:owner,
    profile_id:profileId,
    reservation_status:'active',
    reserved_at:new Date().toISOString(),
    released_at:null
  };

  try {
    const { data, error } = await supabase
      .from(USERNAME_RESERVATIONS_TABLE)
      .upsert(payload, { onConflict:'username_lower' })
      .select(USERNAME_RESERVATION_SELECT_FIELDS)
      .maybeSingle();

    if (error) throw error;

    return {
      ok:true,
      reserved:true,
      normalized,
      reservation:data || payload,
      source:'username_reservations',
      message:'Username reserved.'
    };
  } catch (error) {
    if (allowMissingTable && isUsernameReservationTableMissing(error)) {
      return {
        ok:true,
        reserved:false,
        normalized,
        reservation:null,
        source:'reservation_table_missing',
        message:'Reservation table is not deployed. Profile persistence remains the temporary username authority.'
      };
    }

    throw error;
  }
}

/* =============================================================================
   07) PUBLIC API
============================================================================= */
export const ACCOUNT_USERNAME_RESERVATION_META = Object.freeze({
  moduleId:MODULE_ID,
  modulePath:MODULE_PATH,
  table:USERNAME_RESERVATIONS_TABLE,
  status:'scaffolded'
});

if (typeof window !== 'undefined') {
  window.NeuroartanAccountUsernameReservation = Object.freeze({
    isUsernameReservationTableMissing,
    getUsernameReservation,
    checkUsernameReservationAvailability,
    reserveUsername
  });
}

/* =============================================================================
   08) END OF FILE
============================================================================= */