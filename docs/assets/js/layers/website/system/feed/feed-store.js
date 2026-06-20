/* =============================================================================
   00) FILE INDEX
   01) MODULE IDENTITY
   02) IMPORTS
   03) CONSTANTS
   04) BACKEND HELPERS
   05) AUTHOR HELPERS
   06) POST READ HELPERS
   07) POST WRITE HELPERS
   08) END OF FILE
============================================================================= */

/* =============================================================================
   01) MODULE IDENTITY
============================================================================= */
/* /website/docs/assets/js/layers/website/system/feed-store.js */

/* =============================================================================
   02) IMPORTS
============================================================================= */
import {
  getSupabaseClient,
  getSupabaseProfileByAuthUserId,
  normalizeString,
  normalizeUsername,
} from '../account/identity/account-profile-identity.js';

/* =============================================================================
   03) CONSTANTS
============================================================================= */
const FEED_POSTS_TABLE = 'feed_posts';
const PROFILES_TABLE = 'profiles';

const FEED_POST_SELECT_FIELDS = [
  'id',
  'profile_id',
  'owner_auth_user_id',
  'author_username',
  'author_display_name',
  'author_avatar_url',
  'author_profile_verified',
  'author_verification_status',
  'author_public_verification_status',
  'post_body',
  'post_image_url',
  'post_image_storage_path',
  'post_media_type',
  'post_state',
  'visibility_state',
  'source_surface',
  'created_at',
  'updated_at',
].join(', ');

const FEED_POST_FALLBACK_SELECT_FIELDS = FEED_POST_SELECT_FIELDS
  .split(',')
  .map((field) => field.trim())
  .filter((field) => ![
    'post_image_url',
    'post_image_storage_path',
    'post_media_type'
  ].includes(field))
  .join(', ');

/* =============================================================================
   04) BACKEND HELPERS
============================================================================= */
export function getFeedStoreBackendState() {
  return {
    supabaseConfigured: Boolean(getSupabaseClient()),
    feedPostsTable: FEED_POSTS_TABLE,
    migrationStatus: 'supabase_canonical_feed_posts',
  };
}

function isSupabaseRelationMissingError(error) {
  const code = normalizeString(error?.code || '').toUpperCase();
  const message = normalizeString(error?.message || '').toLowerCase();
  return code === '42P01' || message.includes('does not exist');
}

function isFeedMediaColumnMissingError(error) {
  const message = normalizeString(error?.message || '').toLowerCase();
  return message.includes('post_image_url')
    || message.includes('post_image_storage_path')
    || message.includes('post_media_type');
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

function mapFeedPost(row = {}, currentUserId = '', canonicalProfile = null) {
  if (!row || typeof row !== 'object') return null;
  return buildRenderableFeedPost(row, currentUserId, canonicalProfile);
}

/* =============================================================================
   04A) PAYLOAD NORMALIZATION
============================================================================= */

function buildRenderableFeedPost(row = {}, currentUserId = '', canonicalProfile = null) {
  const ownerAuthUserId = normalizeString(row.owner_auth_user_id || '');
  const profile = canonicalProfile && typeof canonicalProfile === 'object'
    ? canonicalProfile
    : {};
  const displayName = normalizeString(
    profile.public_display_name
    || profile.display_name
    || row.author_display_name
    || row.author_username
    || 'Neuroartan profile'
  );
  const username = normalizeUsername(
    profile.username
    || profile.username_lower
    || profile.username_normalized
    || profile.public_username
    || row.author_username
    || ''
  );
  const avatar = normalizeString(
    profile.public_avatar_url
    || profile.avatar_url
    || profile.photo_url
    || row.author_avatar_url
    || ''
  );

  return {
    id: normalizeString(row.id),
    feedPostId: normalizeString(row.id),
    profileId: normalizeString(row.profile_id || ''),
    ownerAuthUserId,
    ownedByCurrentUser: Boolean(currentUserId && ownerAuthUserId === currentUserId),
    entityType: 'Profile',
    entityLabel: displayName,
    username,
    avatar,
    imageUrl: normalizeString(row.post_image_url || ''),
    image: normalizeString(row.post_image_url || ''),
    postImageUrl: normalizeString(row.post_image_url || ''),
    mediaUrl: normalizeString(row.post_image_url || ''),
    imageStoragePath: normalizeString(row.post_image_storage_path || ''),
    postImageStoragePath: normalizeString(row.post_image_storage_path || ''),
    mediaType: normalizeString(row.post_media_type || ''),
    verified: profile.profile_verified === true || row.author_profile_verified === true || normalizeString(profile.verification_status || profile.public_verification_status || row.author_verification_status || row.author_public_verification_status).toLowerCase() === 'verified',
    profile_verified: profile.profile_verified === true || row.author_profile_verified === true,
    verification_status: normalizeString(profile.verification_status || row.author_verification_status || ''),
    public_verification_status: normalizeString(profile.public_verification_status || row.author_public_verification_status || ''),
    author_profile_verified: row.author_profile_verified === true,
    author_verification_status: normalizeString(row.author_verification_status || ''),
    author_public_verification_status: normalizeString(row.author_public_verification_status || ''),
    verified_at: normalizeString(profile.verified_at || profile.profile_verified_at || ''),
    content: normalizeString(row.post_body || ''),
    metadata: [
      'Profile post',
      row.created_at ? new Date(row.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '',
    ].filter(Boolean),
    tags: [],
    href: username ? `/${username}` : '/profile.html',
    publicRoute: username ? `/${username}` : '/profile.html',
    source: 'supabase-feed-post',
    createdAt: row.created_at || '',
  };
}

async function getCanonicalFeedAuthorProfiles(supabase, rows = []) {
  const profileIds = [...new Set(
    rows.map((row) => normalizeString(row?.profile_id || '')).filter(Boolean)
  )];
  if (!supabase || !profileIds.length) return new Map();

  const { data, error } = await supabase
    .from(PROFILES_TABLE)
    .select('*')
    .in('id', profileIds);

  if (error) {
    console.warn('[feed-store] Canonical profile author projection unavailable.', error);
    return new Map();
  }

  return new Map(
    (Array.isArray(data) ? data : [])
      .map((profile) => [normalizeString(profile.id || ''), profile])
      .filter(([profileId]) => profileId)
  );
}

function buildFeedInsertPayload(profile = {}, user = {}, values = {}) {
  const postBody = normalizeString(values.post_body || values.body || '');
  const postImageUrl = normalizeString(values.post_image_url || values.image_url || '');
  const postImageStoragePath = normalizeString(values.post_image_storage_path || values.image_storage_path || '');
  const postMediaType = normalizeString(values.post_media_type || values.media_type || '');

  const payload = {
    profile_id: profile.id,
    owner_auth_user_id: normalizeString(user.id || user.uid || ''),
    author_username: normalizeUsername(profile.username || profile.username_lower || profile.public_username || ''),
    author_display_name: normalizeString(profile.public_display_name || profile.display_name || user.user_metadata?.name || 'Neuroartan profile'),
    author_avatar_url: normalizeString(profile.public_avatar_url || profile.avatar_url || profile.photo_url || user.user_metadata?.avatar_url || user.user_metadata?.picture || ''),
    author_profile_verified: profile.profile_verified === true,
    author_verification_status: normalizeString(profile.verification_status || ''),
    author_public_verification_status: normalizeString(profile.public_verification_status || ''),
    post_body: postBody,
    post_state: 'published',
    visibility_state: 'public',
    source_surface: normalizeString(values.source_surface || 'feed'),
  };

  if (postImageUrl) {
    payload.post_image_url = postImageUrl;
    payload.post_image_storage_path = postImageStoragePath;
    payload.post_media_type = postMediaType || 'image';
  }

  return payload;
}

/* =============================================================================
   05) AUTHOR HELPERS
============================================================================= */
export async function getCurrentFeedAuthor() {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return {
      user: null,
      profile: null,
      backendState: getFeedStoreBackendState(),
    };
  }

  const user = await getCurrentSupabaseUser();
  const userId = getUserId(user);
  if (!userId) {
    return {
      user: null,
      profile: null,
      backendState: getFeedStoreBackendState(),
    };
  }

  const profile = await getSupabaseProfileByAuthUserId({
    supabase,
    authUserId: userId,
  });

  return {
    user,
    profile,
    backendState: getFeedStoreBackendState(),
  };
}

/* =============================================================================
   06) POST READ HELPERS
============================================================================= */
export async function getFeedPostById(feedPostId) {
  const supabase = getSupabaseClient();
  const normalizedId = normalizeString(feedPostId);
  if (!supabase || !normalizedId) return null;

  const user = await getCurrentSupabaseUser();
  const currentUserId = getUserId(user);

  let queryResult = await supabase
    .from(FEED_POSTS_TABLE)
    .select(FEED_POST_SELECT_FIELDS)
    .eq('id', normalizedId)
    .maybeSingle();

  if (queryResult.error && isFeedMediaColumnMissingError(queryResult.error)) {
    queryResult = await supabase
      .from(FEED_POSTS_TABLE)
      .select(FEED_POST_FALLBACK_SELECT_FIELDS)
      .eq('id', normalizedId)
      .maybeSingle();
  }

  const { data, error } = queryResult;

  if (error) {
    if (isSupabaseRelationMissingError(error)) return null;
    throw error;
  }

  if (!data) return null;
  const profileById = await getCanonicalFeedAuthorProfiles(supabase, [data]);
  return mapFeedPost(data, currentUserId, profileById.get(normalizeString(data.profile_id || '')));
}

export async function listFeedPosts() {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  const user = await getCurrentSupabaseUser();
  const currentUserId = getUserId(user);

  let queryResult = await supabase
    .from(FEED_POSTS_TABLE)
    .select(FEED_POST_SELECT_FIELDS)
    .eq('post_state', 'published')
    .order('created_at', { ascending: false })
    .limit(50);

  if (queryResult.error && isFeedMediaColumnMissingError(queryResult.error)) {
    queryResult = await supabase
      .from(FEED_POSTS_TABLE)
      .select(FEED_POST_FALLBACK_SELECT_FIELDS)
      .eq('post_state', 'published')
      .order('created_at', { ascending: false })
      .limit(50);
  }

  const { data, error } = queryResult;

  if (error) {
    if (isSupabaseRelationMissingError(error)) return [];
    throw error;
  }

  if (!Array.isArray(data)) return [];
  const profileById = await getCanonicalFeedAuthorProfiles(supabase, data);
  return data
    .map((row) => mapFeedPost(row, currentUserId, profileById.get(normalizeString(row.profile_id || ''))))
    .filter(Boolean);
}

/**
 * Private home surfaces must never reuse the public feed query. This helper is
 * deliberately owner-scoped even though public feed rows are readable by all
 * authenticated visitors.
 */
export async function listOwnedFeedPosts() {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  const user = await getCurrentSupabaseUser();
  const currentUserId = getUserId(user);
  if (!currentUserId) return [];

  let queryResult = await supabase
    .from(FEED_POSTS_TABLE)
    .select(FEED_POST_SELECT_FIELDS)
    .eq('owner_auth_user_id', currentUserId)
    .eq('post_state', 'published')
    .order('created_at', { ascending: false })
    .limit(50);

  if (queryResult.error && isFeedMediaColumnMissingError(queryResult.error)) {
    queryResult = await supabase
      .from(FEED_POSTS_TABLE)
      .select(FEED_POST_FALLBACK_SELECT_FIELDS)
      .eq('owner_auth_user_id', currentUserId)
      .eq('post_state', 'published')
      .order('created_at', { ascending: false })
      .limit(50);
  }

  const { data, error } = queryResult;
  if (error) {
    if (isSupabaseRelationMissingError(error)) return [];
    throw error;
  }

  if (!Array.isArray(data)) return [];
  const profileById = await getCanonicalFeedAuthorProfiles(supabase, data);
  return data
    .map((row) => mapFeedPost(row, currentUserId, profileById.get(normalizeString(row.profile_id || ''))))
    .filter(Boolean);
}

/* =============================================================================
   07) POST WRITE HELPERS
============================================================================= */
export async function createFeedPost(values = {}) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    const error = new Error('FEED_BACKEND_UNAVAILABLE');
    error.code = 'FEED_BACKEND_UNAVAILABLE';
    throw error;
  }

  const { user, profile } = await getCurrentFeedAuthor();
  const ownerAuthUserId = getUserId(user);
  if (!ownerAuthUserId) {
    const error = new Error('AUTH_REQUIRED');
    error.code = 'AUTH_REQUIRED';
    throw error;
  }

  if (!profile?.id) {
    const error = new Error('PROFILE_REQUIRED');
    error.code = 'PROFILE_REQUIRED';
    throw error;
  }

  const postBody = normalizeString(values.post_body || values.body || '');
  if (!postBody) {
    const error = new Error('POST_BODY_REQUIRED');
    error.code = 'POST_BODY_REQUIRED';
    throw error;
  }

  const payload = buildFeedInsertPayload(
    profile,
    user,
    values
  );

  const postImageUrl = normalizeString(payload.post_image_url || '');

  const { data, error } = await supabase
    .from(FEED_POSTS_TABLE)
    .insert(payload)
    .select(postImageUrl ? FEED_POST_SELECT_FIELDS : FEED_POST_FALLBACK_SELECT_FIELDS)
    .single();

  if (error) {
    if (postImageUrl && isFeedMediaColumnMissingError(error)) {
      const mediaError = new Error('FEED_POST_MEDIA_COLUMNS_REQUIRED');
      mediaError.code = 'FEED_POST_MEDIA_COLUMNS_REQUIRED';
      mediaError.cause = error;
      throw mediaError;
    }
    throw error;
  }

  return mapFeedPost(data, ownerAuthUserId);
}

export async function deleteFeedPost(feedPostId) {
  const supabase = getSupabaseClient();
  const normalizedId = normalizeString(feedPostId);
  if (!supabase || !normalizedId) return false;

  const user = await getCurrentSupabaseUser();
  const currentUserId = getUserId(user);
  if (!currentUserId) {
    const error = new Error('AUTH_REQUIRED');
    error.code = 'AUTH_REQUIRED';
    throw error;
  }

  const existingPost = await getFeedPostById(normalizedId);
  if (!existingPost) {
    return false;
  }

  if (!existingPost.ownedByCurrentUser) {
    const error = new Error('POST_DELETE_FORBIDDEN');
    error.code = 'POST_DELETE_FORBIDDEN';
    throw error;
  }

  const { error } = await supabase
    .from(FEED_POSTS_TABLE)
    .delete()
    .eq('id', normalizedId)
    .eq('owner_auth_user_id', currentUserId);

  if (error) throw error;
  return true;
}

export async function updateFeedPost(feedPostId, values = {}) {
  const supabase = getSupabaseClient();
  const normalizedId = normalizeString(feedPostId);
  if (!supabase || !normalizedId) {
    const error = new Error('FEED_BACKEND_UNAVAILABLE');
    error.code = 'FEED_BACKEND_UNAVAILABLE';
    throw error;
  }

  const user = await getCurrentSupabaseUser();
  const currentUserId = getUserId(user);
  if (!currentUserId) {
    const error = new Error('AUTH_REQUIRED');
    error.code = 'AUTH_REQUIRED';
    throw error;
  }

  const existingPost = await getFeedPostById(normalizedId);
  if (!existingPost) {
    const error = new Error('POST_NOT_FOUND');
    error.code = 'POST_NOT_FOUND';
    throw error;
  }

  if (!existingPost.ownedByCurrentUser) {
    const error = new Error('POST_UPDATE_FORBIDDEN');
    error.code = 'POST_UPDATE_FORBIDDEN';
    throw error;
  }

  const postBody = normalizeString(values.post_body || values.body || '');
  if (!postBody) {
    const error = new Error('POST_BODY_REQUIRED');
    error.code = 'POST_BODY_REQUIRED';
    throw error;
  }

  const payload = {
    post_body: postBody,
    updated_at: new Date().toISOString()
  };

  const postImageUrl = normalizeString(values.post_image_url || values.image_url || '');
  if (postImageUrl) {
    payload.post_image_url = postImageUrl;
    payload.post_image_storage_path = normalizeString(values.post_image_storage_path || values.image_storage_path || '');
    payload.post_media_type = normalizeString(values.post_media_type || values.media_type || '');
  }

  let queryResult = await supabase
    .from(FEED_POSTS_TABLE)
    .update(payload)
    .eq('id', normalizedId)
    .eq('owner_auth_user_id', currentUserId)
    .select(postImageUrl ? FEED_POST_SELECT_FIELDS : FEED_POST_FALLBACK_SELECT_FIELDS)
    .single();

  if (queryResult.error && postImageUrl && isFeedMediaColumnMissingError(queryResult.error)) {
    const mediaError = new Error('FEED_POST_MEDIA_COLUMNS_REQUIRED');
    mediaError.code = 'FEED_POST_MEDIA_COLUMNS_REQUIRED';
    mediaError.cause = queryResult.error;
    throw mediaError;
  }

  if (queryResult.error) throw queryResult.error;
  return mapFeedPost(queryResult.data, currentUserId);
}

/* =============================================================================
   08) END OF FILE
============================================================================= */
