/* =============================================================================
   00) FILE INDEX
   01) MODULE IDENTITY
   02) IMPORTS
   03) CONSTANTS
   04) BACKEND HELPERS
   05) STATE READS
   06) STATE WRITES
   07) PUBLIC API
============================================================================= */

/* =============================================================================
   01) MODULE IDENTITY
============================================================================= */
/* /website/docs/assets/js/layers/website/system/feed/feed-social-store.js */

/* =============================================================================
   02) IMPORTS
============================================================================= */
import {
  getSupabaseClient,
  getSupabaseProfileByAuthUserId,
  normalizeString,
  normalizeUsername
} from '../account/identity/account-profile-identity.js';

/* =============================================================================
   03) CONSTANTS
============================================================================= */
const FEED_POST_INTERACTIONS_TABLE = 'feed_post_interactions';
const FEED_POST_COMMENTS_TABLE = 'feed_post_comments';
const FEED_POST_VIEWS_TABLE = 'feed_post_views';

const INTERACTION_ACTION_BY_UI_ACTION = Object.freeze({
  like: 'like',
  repost: 'repost',
  bookmark: 'bookmark',
  save: 'bookmark',
  share: 'share'
});

const EMPTY_POST_SOCIAL_STATE = Object.freeze({
  counts: {
    like: 0,
    repost: 0,
    bookmark: 0,
    share: 0,
    reply: 0,
    view: 0
  },
  viewer: {
    like: false,
    repost: false,
    bookmark: false,
    share: false
  },
  comments: []
});

/* =============================================================================
   04) BACKEND HELPERS
============================================================================= */
function isRelationMissing(error) {
  const code = normalizeString(error?.code).toUpperCase();
  const message = normalizeString(error?.message || error?.details).toLowerCase();
  return code === '42P01' || code === 'PGRST205' || message.includes('does not exist');
}

function uniqueIds(ids = []) {
  return Array.from(new Set(
    ids.map((id) => normalizeString(id)).filter(Boolean)
  ));
}

function createPostState() {
  return {
    counts: { ...EMPTY_POST_SOCIAL_STATE.counts },
    viewer: { ...EMPTY_POST_SOCIAL_STATE.viewer },
    comments: []
  };
}

function createStateMap(feedPostIds = []) {
  return uniqueIds(feedPostIds).reduce((state, postId) => {
    state[postId] = createPostState();
    return state;
  }, Object.create(null));
}

function normalizeInteractionAction(action = '') {
  return INTERACTION_ACTION_BY_UI_ACTION[normalizeString(action).toLowerCase()] || '';
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

function getProfileId(profile = null) {
  return normalizeString(profile?.id || profile?.profile_id || '');
}

function getAuthUserId(user = null) {
  return normalizeString(user?.id || user?.uid || '');
}

function dispatchSocialChange(feedPostId = '') {
  document.dispatchEvent(new CustomEvent('feed:social-state-changed', {
    detail: {
      feedPostId: normalizeString(feedPostId)
    }
  }));
}

/* =============================================================================
   05) STATE READS
============================================================================= */
export function getEmptyFeedPostSocialState() {
  return createPostState();
}

export async function getFeedSocialState(feedPostIds = []) {
  const supabase = getSupabaseClient();
  const ids = uniqueIds(feedPostIds);
  const state = createStateMap(ids);

  if (!supabase || !ids.length) {
    return {
      backendConfigured: Boolean(supabase),
      tableAvailable: false,
      state
    };
  }

  const { profile: viewerProfile } = await getCurrentUserAndProfile(supabase);
  const viewerProfileId = getProfileId(viewerProfile);
  let interactionsAvailable = true;
  let commentsAvailable = true;
  let viewsAvailable = true;

  try {
    const { data, error } = await supabase
      .from(FEED_POST_INTERACTIONS_TABLE)
      .select('feed_post_id, profile_id, interaction_type')
      .in('feed_post_id', ids);

    if (error) throw error;

    (Array.isArray(data) ? data : []).forEach((row) => {
      const postId = normalizeString(row.feed_post_id);
      const action = normalizeInteractionAction(row.interaction_type);
      if (!postId || !action || !state[postId]) return;

      state[postId].counts[action] = (state[postId].counts[action] || 0) + 1;
      if (viewerProfileId && normalizeString(row.profile_id) === viewerProfileId) {
        state[postId].viewer[action] = true;
      }
    });
  } catch (error) {
    if (!isRelationMissing(error)) throw error;
    interactionsAvailable = false;
  }

  try {
    const { data, error } = await supabase
      .from(FEED_POST_COMMENTS_TABLE)
      .select('id, feed_post_id, profile_id, owner_auth_user_id, author_username, author_display_name, author_avatar_url, comment_body, created_at')
      .in('feed_post_id', ids)
      .eq('comment_state', 'published')
      .order('created_at', { ascending: true });

    if (error) throw error;

    (Array.isArray(data) ? data : []).forEach((row) => {
      const postId = normalizeString(row.feed_post_id);
      if (!postId || !state[postId]) return;

      state[postId].counts.reply += 1;
      state[postId].comments.push({
        id: normalizeString(row.id),
        feedPostId: postId,
        profileId: normalizeString(row.profile_id),
        ownerAuthUserId: normalizeString(row.owner_auth_user_id),
        authorUsername: normalizeUsername(row.author_username || ''),
        authorDisplayName: normalizeString(row.author_display_name || 'Profile'),
        authorAvatarUrl: normalizeString(row.author_avatar_url || ''),
        body: normalizeString(row.comment_body || ''),
        createdAt: row.created_at || ''
      });
    });
  } catch (error) {
    if (!isRelationMissing(error)) throw error;
    commentsAvailable = false;
  }

  try {
    const { data, error } = await supabase
      .from(FEED_POST_VIEWS_TABLE)
      .select('feed_post_id')
      .in('feed_post_id', ids);

    if (error) throw error;

    (Array.isArray(data) ? data : []).forEach((row) => {
      const postId = normalizeString(row.feed_post_id);
      if (!postId || !state[postId]) return;
      state[postId].counts.view += 1;
    });
  } catch (error) {
    if (!isRelationMissing(error)) throw error;
    viewsAvailable = false;
  }

  return {
    backendConfigured: true,
    tableAvailable: interactionsAvailable && commentsAvailable,
    viewsAvailable,
    state
  };
}

export async function listFeedPostComments(feedPostId = '') {
  const postId = normalizeString(feedPostId);
  if (!postId) return [];

  const snapshot = await getFeedSocialState([postId]);
  return snapshot.state?.[postId]?.comments || [];
}

/* =============================================================================
   06) STATE WRITES
============================================================================= */
export async function toggleFeedPostInteraction(feedPostId = '', action = '') {
  const supabase = getSupabaseClient();
  const postId = normalizeString(feedPostId);
  const interactionType = normalizeInteractionAction(action);

  if (!supabase) throw Object.assign(new Error('FEED_SOCIAL_BACKEND_UNAVAILABLE'), { code: 'FEED_SOCIAL_BACKEND_UNAVAILABLE' });
  if (!postId) throw Object.assign(new Error('FEED_POST_REQUIRED'), { code: 'FEED_POST_REQUIRED' });
  if (!interactionType) throw Object.assign(new Error('FEED_SOCIAL_ACTION_REQUIRED'), { code: 'FEED_SOCIAL_ACTION_REQUIRED' });

  const { user, profile } = await getCurrentUserAndProfile(supabase);
  const profileId = getProfileId(profile);
  const ownerAuthUserId = getAuthUserId(user);

  if (!profileId || !ownerAuthUserId) {
    throw Object.assign(new Error('AUTH_REQUIRED'), { code: 'AUTH_REQUIRED' });
  }

  const { data: existing, error: readError } = await supabase
    .from(FEED_POST_INTERACTIONS_TABLE)
    .select('id')
    .eq('feed_post_id', postId)
    .eq('profile_id', profileId)
    .eq('interaction_type', interactionType)
    .maybeSingle();

  if (readError) throw readError;

  if (existing?.id) {
    const { error } = await supabase
      .from(FEED_POST_INTERACTIONS_TABLE)
      .delete()
      .eq('id', existing.id)
      .eq('owner_auth_user_id', ownerAuthUserId);

    if (error) throw error;
    dispatchSocialChange(postId);
    return getFeedSocialState([postId]);
  }

  const { error } = await supabase
    .from(FEED_POST_INTERACTIONS_TABLE)
    .insert({
      feed_post_id: postId,
      profile_id: profileId,
      owner_auth_user_id: ownerAuthUserId,
      interaction_type: interactionType
    });

  if (error) throw error;
  dispatchSocialChange(postId);
  return getFeedSocialState([postId]);
}

export async function createFeedPostComment(feedPostId = '', commentBody = '') {
  const supabase = getSupabaseClient();
  const postId = normalizeString(feedPostId);
  const body = normalizeString(commentBody);

  if (!supabase) throw Object.assign(new Error('FEED_SOCIAL_BACKEND_UNAVAILABLE'), { code: 'FEED_SOCIAL_BACKEND_UNAVAILABLE' });
  if (!postId) throw Object.assign(new Error('FEED_POST_REQUIRED'), { code: 'FEED_POST_REQUIRED' });
  if (!body) throw Object.assign(new Error('COMMENT_BODY_REQUIRED'), { code: 'COMMENT_BODY_REQUIRED' });

  const { user, profile } = await getCurrentUserAndProfile(supabase);
  const profileId = getProfileId(profile);
  const ownerAuthUserId = getAuthUserId(user);

  if (!profileId || !ownerAuthUserId) {
    throw Object.assign(new Error('AUTH_REQUIRED'), { code: 'AUTH_REQUIRED' });
  }

  const { error } = await supabase
    .from(FEED_POST_COMMENTS_TABLE)
    .insert({
      feed_post_id: postId,
      profile_id: profileId,
      owner_auth_user_id: ownerAuthUserId,
      author_username: normalizeUsername(profile?.username || profile?.username_lower || profile?.public_username || ''),
      author_display_name: normalizeString(profile?.public_display_name || profile?.display_name || 'Profile'),
      author_avatar_url: normalizeString(profile?.public_avatar_url || profile?.avatar_url || profile?.photo_url || ''),
      comment_body: body
    });

  if (error) throw error;
  dispatchSocialChange(postId);
  return getFeedSocialState([postId]);
}

export async function recordFeedPostView(feedPostId = '') {
  const supabase = getSupabaseClient();
  const postId = normalizeString(feedPostId);
  if (!supabase || !postId) return null;

  const { user, profile } = await getCurrentUserAndProfile(supabase);
  const profileId = getProfileId(profile);
  const ownerAuthUserId = getAuthUserId(user);

  try {
    const { error } = await supabase
      .from(FEED_POST_VIEWS_TABLE)
      .insert({
        feed_post_id: postId,
        profile_id: profileId || null,
        owner_auth_user_id: ownerAuthUserId || null,
        viewer_session_id: ownerAuthUserId ? null : normalizeString(window.localStorage?.getItem('neuroartan.viewer.session') || '')
      });

    if (error) throw error;
    return true;
  } catch (error) {
    if (isRelationMissing(error)) return null;
    throw error;
  }
}

/* =============================================================================
   07) PUBLIC API
============================================================================= */
window.NEUROARTAN_FEED_SOCIAL_STORE = {
  getFeedSocialState,
  getEmptyFeedPostSocialState,
  listFeedPostComments,
  toggleFeedPostInteraction,
  createFeedPostComment,
  recordFeedPostView
};

/* =============================================================================
   08) END OF FILE
============================================================================= */
