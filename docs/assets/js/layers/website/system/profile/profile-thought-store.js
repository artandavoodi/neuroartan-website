/* =============================================================================
   00) FILE INDEX
   01) MODULE IDENTITY
   02) IMPORTS
   03) CONSTANTS
   04) BACKEND HELPERS
   05) THOUGHT READ HELPERS
   06) THOUGHT WRITE HELPERS
   07) END OF FILE
============================================================================= */

/* =============================================================================
   01) MODULE IDENTITY
============================================================================= */
/* /website/docs/assets/js/layers/website/system/profile/profile-thought-store.js */

/* =============================================================================
   02) IMPORTS
============================================================================= */
import {
  getSupabaseClient,
  getSupabaseProfileByAuthUserId,
  normalizeString,
} from '../account/identity/account-profile-identity.js';

/* =============================================================================
   03) CONSTANTS
============================================================================= */
const PROFILE_THOUGHTS_TABLE = 'profile_thoughts';

const PROFILE_THOUGHT_SELECT_FIELDS = [
  'id',
  'profile_id',
  'owner_auth_user_id',
  'text',
  'audience',
  'category',
  'created_at',
  'updated_at',
].join(', ');

/* =============================================================================
   04) BACKEND HELPERS
============================================================================= */
export function getProfileThoughtStoreBackendState() {
  return {
    supabaseConfigured: Boolean(getSupabaseClient()),
    profileThoughtsTable: PROFILE_THOUGHTS_TABLE,
    migrationStatus: 'supabase_canonical_profile_thoughts',
  };
}

function isSupabaseRelationMissingError(error) {
  const code = normalizeString(error?.code || '').toUpperCase();
  const message = normalizeString(error?.message || '').toLowerCase();
  return code === '42P01' || message.includes('does not exist');
}

async function getCurrentSupabaseUser() {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;

  return data?.session?.user || null;
}

function getUserId(user) {
  return normalizeString(user?.id || user?.uid || '');
}

function mapProfileThought(row = {}, currentUserId = '') {
  if (!row || typeof row !== 'object') return null;

  const userId = getUserId(currentUserId);
  const rowUserId = getUserId(row.owner_auth_user_id);

  return {
    id: normalizeString(row.id || ''),
    profileId: normalizeString(row.profile_id || ''),
    ownerAuthUserId: rowUserId,
    ownedByCurrentUser: rowUserId === userId,
    text: normalizeString(row.text || ''),
    audience: normalizeString(row.audience || 'private'),
    category: normalizeString(row.category || ''),
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
  };
}

/* =============================================================================
   05) THOUGHT READ HELPERS
============================================================================= */
export async function listProfileThoughts() {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return [];
  }

  const user = await getCurrentSupabaseUser();
  if (!user) {
    throw new Error('AUTH_REQUIRED');
  }

  const { data, error } = await supabase
    .from(PROFILE_THOUGHTS_TABLE)
    .select(PROFILE_THOUGHT_SELECT_FIELDS)
    .eq('owner_auth_user_id', getUserId(user))
    .order('created_at', { ascending: false });

  if (error) {
    if (isSupabaseRelationMissingError(error)) {
      throw new Error('PROFILE_THOUGHTS_TABLE_MISSING');
    }
    throw error;
  }

  return (data || []).map((row) => mapProfileThought(row, user));
}

export async function getProfileThoughtById(thoughtId) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error('PROFILE_THOUGHTS_BACKEND_UNAVAILABLE');
  }

  const user = await getCurrentSupabaseUser();
  if (!user) {
    throw new Error('AUTH_REQUIRED');
  }

  const { data, error } = await supabase
    .from(PROFILE_THOUGHTS_TABLE)
    .select(PROFILE_THOUGHT_SELECT_FIELDS)
    .eq('id', normalizeString(thoughtId))
    .single();

  if (error) {
    if (isSupabaseRelationMissingError(error)) {
      throw new Error('PROFILE_THOUGHTS_TABLE_MISSING');
    }
    if (error.code === 'PGRST116') {
      throw new Error('PROFILE_THOUGHT_NOT_FOUND');
    }
    throw error;
  }

  const thought = mapProfileThought(data, user);
  if (!thought) {
    throw new Error('PROFILE_THOUGHT_NOT_FOUND');
  }

  if (!thought.ownedByCurrentUser) {
    throw new Error('PROFILE_THOUGHT_ACCESS_DENIED');
  }

  return thought;
}

/* =============================================================================
   06) THOUGHT WRITE HELPERS
============================================================================= */
export async function createProfileThought(payload = {}) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error('PROFILE_THOUGHTS_BACKEND_UNAVAILABLE');
  }

  const user = await getCurrentSupabaseUser();
  if (!user) {
    throw new Error('AUTH_REQUIRED');
  }

  const profile = await getSupabaseProfileByAuthUserId({ authUserId: getUserId(user) });
  const profileId = profile?.id || null;

  const { data, error } = await supabase
    .from(PROFILE_THOUGHTS_TABLE)
    .insert({
      profile_id: profileId,
      owner_auth_user_id: getUserId(user),
      text: normalizeString(payload.text || ''),
      audience: normalizeString(payload.audience || 'private'),
      category: normalizeString(payload.category || ''),
    })
    .select(PROFILE_THOUGHT_SELECT_FIELDS)
    .single();

  if (error) {
    if (isSupabaseRelationMissingError(error)) {
      throw new Error('PROFILE_THOUGHTS_TABLE_MISSING');
    }
    throw error;
  }

  return mapProfileThought(data, user);
}

export async function updateProfileThought(thoughtId, payload = {}) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error('PROFILE_THOUGHTS_BACKEND_UNAVAILABLE');
  }

  const user = await getCurrentSupabaseUser();
  if (!user) {
    throw new Error('AUTH_REQUIRED');
  }

  const updateData = {};
  if (payload.text !== undefined) {
    updateData.text = normalizeString(payload.text);
  }
  if (payload.audience !== undefined) {
    updateData.audience = normalizeString(payload.audience);
  }
  if (payload.category !== undefined) {
    updateData.category = normalizeString(payload.category);
  }
  if (payload.profileId !== undefined) {
    updateData.profile_id = payload.profileId;
  }
  updateData.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from(PROFILE_THOUGHTS_TABLE)
    .update(updateData)
    .eq('id', normalizeString(thoughtId))
    .eq('owner_auth_user_id', getUserId(user))
    .select(PROFILE_THOUGHT_SELECT_FIELDS)
    .single();

  if (error) {
    if (isSupabaseRelationMissingError(error)) {
      throw new Error('PROFILE_THOUGHTS_TABLE_MISSING');
    }
    if (error.code === 'PGRST116') {
      throw new Error('PROFILE_THOUGHT_NOT_FOUND');
    }
    throw error;
  }

  return mapProfileThought(data, user);
}

export async function deleteProfileThought(thoughtId) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error('PROFILE_THOUGHTS_BACKEND_UNAVAILABLE');
  }

  const user = await getCurrentSupabaseUser();
  if (!user) {
    throw new Error('AUTH_REQUIRED');
  }

  const { error } = await supabase
    .from(PROFILE_THOUGHTS_TABLE)
    .delete()
    .eq('id', normalizeString(thoughtId))
    .eq('owner_auth_user_id', getUserId(user));

  if (error) {
    if (isSupabaseRelationMissingError(error)) {
      throw new Error('PROFILE_THOUGHTS_TABLE_MISSING');
    }
    throw error;
  }

  return true;
}

/* =============================================================================
   07) END OF FILE
============================================================================= */
