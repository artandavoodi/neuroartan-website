/* =============================================================================
   00) FILE INDEX
   01) MODULE IDENTITY
   02) IMPORTS
   03) CONSTANTS
   04) BACKEND HELPERS
   05) POST READ HELPERS
   06) POST WRITE HELPERS
   07) END OF FILE
============================================================================= */

/* =============================================================================
   01) MODULE IDENTITY
============================================================================= */
/* /website/docs/assets/js/layers/website/system/profile/profile-post-store.js */

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
const PROFILE_POSTS_TABLE = 'profile_posts';

const PROFILE_POST_SELECT_FIELDS = [
  'id',
  'profile_id',
  'owner_auth_user_id',
  'title',
  'body',
  'visibility_state',
  'post_state',
  'created_at',
  'updated_at',
].join(', ');

/* =============================================================================
   04) BACKEND HELPERS
============================================================================= */
export function getProfilePostStoreBackendState() {
  return {
    supabaseConfigured: Boolean(getSupabaseClient()),
    profilePostsTable: PROFILE_POSTS_TABLE,
    migrationStatus: 'supabase_canonical_profile_posts',
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

function mapProfilePost(row = {}, currentUserId = '') {
  if (!row || typeof row !== 'object') return null;

  const userId = getUserId(currentUserId);
  const rowUserId = getUserId(row.owner_auth_user_id);

  return {
    id: normalizeString(row.id || ''),
    profileId: normalizeString(row.profile_id || ''),
    ownerAuthUserId: rowUserId,
    ownedByCurrentUser: rowUserId === userId,
    title: normalizeString(row.title || ''),
    body: normalizeString(row.body || ''),
    visibility: normalizeString(row.visibility_state || 'private'),
    postState: normalizeString(row.post_state || 'draft'),
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
  };
}

/* =============================================================================
   05) POST READ HELPERS
============================================================================= */
export async function listProfilePosts() {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error('PROFILE_POSTS_BACKEND_UNAVAILABLE');
  }

  const user = await getCurrentSupabaseUser();
  if (!user) {
    throw new Error('AUTH_REQUIRED');
  }

  const { data, error } = await supabase
    .from(PROFILE_POSTS_TABLE)
    .select(PROFILE_POST_SELECT_FIELDS)
    .eq('owner_auth_user_id', getUserId(user))
    .order('created_at', { ascending: false });

  if (error) {
    if (isSupabaseRelationMissingError(error)) {
      throw new Error('PROFILE_POSTS_TABLE_MISSING');
    }
    throw error;
  }

  return (data || []).map((row) => mapProfilePost(row, user));
}

export async function getProfilePostById(postId) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error('PROFILE_POSTS_BACKEND_UNAVAILABLE');
  }

  const user = await getCurrentSupabaseUser();
  if (!user) {
    throw new Error('AUTH_REQUIRED');
  }

  const { data, error } = await supabase
    .from(PROFILE_POSTS_TABLE)
    .select(PROFILE_POST_SELECT_FIELDS)
    .eq('id', normalizeString(postId))
    .single();

  if (error) {
    if (isSupabaseRelationMissingError(error)) {
      throw new Error('PROFILE_POSTS_TABLE_MISSING');
    }
    if (error.code === 'PGRST116') {
      throw new Error('PROFILE_POST_NOT_FOUND');
    }
    throw error;
  }

  const post = mapProfilePost(data, user);
  if (!post) {
    throw new Error('PROFILE_POST_NOT_FOUND');
  }

  if (!post.ownedByCurrentUser) {
    throw new Error('PROFILE_POST_ACCESS_DENIED');
  }

  return post;
}

/* =============================================================================
   06) POST WRITE HELPERS
============================================================================= */
export async function createProfilePost(payload = {}) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error('PROFILE_POSTS_BACKEND_UNAVAILABLE');
  }

  const user = await getCurrentSupabaseUser();
  if (!user) {
    throw new Error('AUTH_REQUIRED');
  }

  const profileId = payload.profileId || null;

  const { data, error } = await supabase
    .from(PROFILE_POSTS_TABLE)
    .insert({
      profile_id: profileId,
      owner_auth_user_id: getUserId(user),
      title: normalizeString(payload.title || ''),
      body: normalizeString(payload.body || ''),
      visibility_state: normalizeString(payload.visibility || 'private'),
      post_state: normalizeString(payload.postState || 'draft'),
    })
    .select(PROFILE_POST_SELECT_FIELDS)
    .single();

  if (error) {
    if (isSupabaseRelationMissingError(error)) {
      throw new Error('PROFILE_POSTS_TABLE_MISSING');
    }
    throw error;
  }

  return mapProfilePost(data, user);
}

export async function updateProfilePost(postId, payload = {}) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error('PROFILE_POSTS_BACKEND_UNAVAILABLE');
  }

  const user = await getCurrentSupabaseUser();
  if (!user) {
    throw new Error('AUTH_REQUIRED');
  }

  const updateData = {};
  if (payload.title !== undefined) {
    updateData.title = normalizeString(payload.title);
  }
  if (payload.body !== undefined) {
    updateData.body = normalizeString(payload.body);
  }
  if (payload.visibility !== undefined) {
    updateData.visibility_state = normalizeString(payload.visibility);
  }
  if (payload.postState !== undefined) {
    updateData.post_state = normalizeString(payload.postState);
  }
  if (payload.profileId !== undefined) {
    updateData.profile_id = payload.profileId;
  }
  updateData.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from(PROFILE_POSTS_TABLE)
    .update(updateData)
    .eq('id', normalizeString(postId))
    .eq('owner_auth_user_id', getUserId(user))
    .select(PROFILE_POST_SELECT_FIELDS)
    .single();

  if (error) {
    if (isSupabaseRelationMissingError(error)) {
      throw new Error('PROFILE_POSTS_TABLE_MISSING');
    }
    if (error.code === 'PGRST116') {
      throw new Error('PROFILE_POST_NOT_FOUND');
    }
    throw error;
  }

  return mapProfilePost(data, user);
}

export async function deleteProfilePost(postId) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error('PROFILE_POSTS_BACKEND_UNAVAILABLE');
  }

  const user = await getCurrentSupabaseUser();
  if (!user) {
    throw new Error('AUTH_REQUIRED');
  }

  const { error } = await supabase
    .from(PROFILE_POSTS_TABLE)
    .delete()
    .eq('id', normalizeString(postId))
    .eq('owner_auth_user_id', getUserId(user));

  if (error) {
    if (isSupabaseRelationMissingError(error)) {
      throw new Error('PROFILE_POSTS_TABLE_MISSING');
    }
    throw error;
  }

  return true;
}

/* =============================================================================
   07) END OF FILE
============================================================================= */
