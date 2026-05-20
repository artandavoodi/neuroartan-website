/* =============================================================================
   00) FILE INDEX
   01) MODULE IDENTITY
   02) IMPORTS
   03) CONSTANTS
   04) BACKEND HELPERS
   05) SOCIAL GRAPH READS
   06) SOCIAL GRAPH WRITES
   07) PUBLIC API
============================================================================= */

/* =============================================================================
   01) MODULE IDENTITY
============================================================================= */
/* /website/docs/assets/js/layers/website/system/profile/profile-social-graph.js */

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
const PROFILE_FOLLOWS_TABLE = 'profile_follows';
const PROFILE_SUBSCRIPTIONS_TABLE = 'profile_subscriptions';

/* =============================================================================
   04) BACKEND HELPERS
============================================================================= */
function getRelationMissingState(error) {
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

function normalizeProfileId(profileOrId = '') {
  if (typeof profileOrId === 'string') return normalizeString(profileOrId);
  return normalizeString(profileOrId?.id || profileOrId?.profile_id || '');
}

async function countRows(query) {
  const { count, error } = await query;
  if (error) throw error;
  return Number.isFinite(count) ? count : 0;
}

/* =============================================================================
   05) SOCIAL GRAPH READS
============================================================================= */
export async function getProfileSocialGraphState(profileOrId = {}) {
  const supabase = getSupabaseClient();
  const profileId = normalizeProfileId(profileOrId);

  if (!supabase || !profileId) {
    return {
      backendConfigured: Boolean(supabase),
      tableAvailable: false,
      followersCount: 0,
      followingCount: 0,
      viewerFollowing: false
    };
  }

  try {
    const { profile: viewerProfile } = await getCurrentUserAndProfile(supabase);
    const viewerProfileId = normalizeProfileId(viewerProfile);

    const followersCount = await countRows(
      supabase
        .from(PROFILE_FOLLOWS_TABLE)
        .select('id', { count: 'exact', head: true })
        .eq('following_profile_id', profileId)
    );

    const followingCount = await countRows(
      supabase
        .from(PROFILE_FOLLOWS_TABLE)
        .select('id', { count: 'exact', head: true })
        .eq('follower_profile_id', profileId)
    );

    let viewerFollowing = false;
    if (viewerProfileId && viewerProfileId !== profileId) {
      const { data, error } = await supabase
        .from(PROFILE_FOLLOWS_TABLE)
        .select('id')
        .eq('follower_profile_id', viewerProfileId)
        .eq('following_profile_id', profileId)
        .maybeSingle();

      if (error) throw error;
      viewerFollowing = Boolean(data?.id);
    }

    return {
      backendConfigured: true,
      tableAvailable: true,
      followersCount,
      followingCount,
      viewerFollowing
    };
  } catch (error) {
    if (getRelationMissingState(error)) {
      return {
        backendConfigured: true,
        tableAvailable: false,
        followersCount: 0,
        followingCount: 0,
        viewerFollowing: false,
        errorCode: 'PROFILE_FOLLOWS_TABLE_MISSING'
      };
    }

    throw error;
  }
}

export async function getProfileSubscriptionState(profileOrId = {}) {
  const supabase = getSupabaseClient();
  const profileId = normalizeProfileId(profileOrId);

  if (!supabase || !profileId) {
    return {
      backendConfigured: Boolean(supabase),
      tableAvailable: false,
      viewerSubscribed: false
    };
  }

  try {
    const { profile: viewerProfile } = await getCurrentUserAndProfile(supabase);
    const viewerProfileId = normalizeProfileId(viewerProfile);

    let viewerSubscribed = false;
    if (viewerProfileId && viewerProfileId !== profileId) {
      const { data, error } = await supabase
        .from(PROFILE_SUBSCRIPTIONS_TABLE)
        .select('id')
        .eq('subscriber_profile_id', viewerProfileId)
        .eq('subscribed_profile_id', profileId)
        .maybeSingle();

      if (error) throw error;
      viewerSubscribed = Boolean(data?.id);
    }

    return {
      backendConfigured: true,
      tableAvailable: true,
      viewerSubscribed
    };
  } catch (error) {
    if (getRelationMissingState(error)) {
      return {
        backendConfigured: true,
        tableAvailable: false,
        viewerSubscribed: false,
        errorCode: 'PROFILE_SUBSCRIPTIONS_TABLE_MISSING'
      };
    }

    throw error;
  }
}

/* =============================================================================
   06) SOCIAL GRAPH WRITES
============================================================================= */
export async function followProfile(profileOrId = {}) {
  const supabase = getSupabaseClient();
  const targetProfileId = normalizeProfileId(profileOrId);

  if (!supabase) throw Object.assign(new Error('PROFILE_SOCIAL_BACKEND_UNAVAILABLE'), { code: 'PROFILE_SOCIAL_BACKEND_UNAVAILABLE' });
  if (!targetProfileId) throw Object.assign(new Error('PROFILE_TARGET_REQUIRED'), { code: 'PROFILE_TARGET_REQUIRED' });

  const { user, profile } = await getCurrentUserAndProfile(supabase);
  const followerProfileId = normalizeProfileId(profile);
  const followerAuthUserId = normalizeString(user?.id || user?.uid || '');

  if (!followerAuthUserId || !followerProfileId) throw Object.assign(new Error('AUTH_REQUIRED'), { code: 'AUTH_REQUIRED' });
  if (followerProfileId === targetProfileId) throw Object.assign(new Error('SELF_FOLLOW_NOT_ALLOWED'), { code: 'SELF_FOLLOW_NOT_ALLOWED' });

  const payload = {
    follower_profile_id: followerProfileId,
    following_profile_id: targetProfileId,
    follower_auth_user_id: followerAuthUserId,
    created_at: new Date().toISOString()
  };

  const { error } = await supabase
    .from(PROFILE_FOLLOWS_TABLE)
    .upsert(payload, { onConflict: 'follower_profile_id,following_profile_id' });

  if (error) throw error;

  document.dispatchEvent(new CustomEvent('profile:social-graph-changed', {
    detail: { profileId: targetProfileId, action: 'follow' }
  }));

  return getProfileSocialGraphState(targetProfileId);
}

export async function unfollowProfile(profileOrId = {}) {
  const supabase = getSupabaseClient();
  const targetProfileId = normalizeProfileId(profileOrId);

  if (!supabase) throw Object.assign(new Error('PROFILE_SOCIAL_BACKEND_UNAVAILABLE'), { code: 'PROFILE_SOCIAL_BACKEND_UNAVAILABLE' });
  if (!targetProfileId) throw Object.assign(new Error('PROFILE_TARGET_REQUIRED'), { code: 'PROFILE_TARGET_REQUIRED' });

  const { profile } = await getCurrentUserAndProfile(supabase);
  const followerProfileId = normalizeProfileId(profile);
  if (!followerProfileId) throw Object.assign(new Error('AUTH_REQUIRED'), { code: 'AUTH_REQUIRED' });

  const { error } = await supabase
    .from(PROFILE_FOLLOWS_TABLE)
    .delete()
    .eq('follower_profile_id', followerProfileId)
    .eq('following_profile_id', targetProfileId);

  if (error) throw error;

  document.dispatchEvent(new CustomEvent('profile:social-graph-changed', {
    detail: { profileId: targetProfileId, action: 'unfollow' }
  }));

  return getProfileSocialGraphState(targetProfileId);
}

export async function subscribeProfile(profileOrId = {}) {
  const supabase = getSupabaseClient();
  const targetProfileId = normalizeProfileId(profileOrId);

  if (!supabase) throw Object.assign(new Error('PROFILE_SUBSCRIPTION_BACKEND_UNAVAILABLE'), { code: 'PROFILE_SUBSCRIPTION_BACKEND_UNAVAILABLE' });
  if (!targetProfileId) throw Object.assign(new Error('PROFILE_TARGET_REQUIRED'), { code: 'PROFILE_TARGET_REQUIRED' });

  const { user, profile } = await getCurrentUserAndProfile(supabase);
  const subscriberProfileId = normalizeProfileId(profile);
  const subscriberAuthUserId = normalizeString(user?.id || user?.uid || '');

  if (!subscriberAuthUserId || !subscriberProfileId) throw Object.assign(new Error('AUTH_REQUIRED'), { code: 'AUTH_REQUIRED' });
  if (subscriberProfileId === targetProfileId) throw Object.assign(new Error('SELF_SUBSCRIPTION_NOT_ALLOWED'), { code: 'SELF_SUBSCRIPTION_NOT_ALLOWED' });

  const payload = {
    subscriber_profile_id: subscriberProfileId,
    subscribed_profile_id: targetProfileId,
    subscriber_auth_user_id: subscriberAuthUserId,
    created_at: new Date().toISOString()
  };

  const { error } = await supabase
    .from(PROFILE_SUBSCRIPTIONS_TABLE)
    .upsert(payload, { onConflict: 'subscriber_profile_id,subscribed_profile_id' });

  if (error) throw error;

  document.dispatchEvent(new CustomEvent('profile:subscription-changed', {
    detail: { profileId: targetProfileId, action: 'subscribe' }
  }));

  return getProfileSubscriptionState(targetProfileId);
}

export async function unsubscribeProfile(profileOrId = {}) {
  const supabase = getSupabaseClient();
  const targetProfileId = normalizeProfileId(profileOrId);

  if (!supabase) throw Object.assign(new Error('PROFILE_SUBSCRIPTION_BACKEND_UNAVAILABLE'), { code: 'PROFILE_SUBSCRIPTION_BACKEND_UNAVAILABLE' });
  if (!targetProfileId) throw Object.assign(new Error('PROFILE_TARGET_REQUIRED'), { code: 'PROFILE_TARGET_REQUIRED' });

  const { profile } = await getCurrentUserAndProfile(supabase);
  const subscriberProfileId = normalizeProfileId(profile);
  if (!subscriberProfileId) throw Object.assign(new Error('AUTH_REQUIRED'), { code: 'AUTH_REQUIRED' });

  const { error } = await supabase
    .from(PROFILE_SUBSCRIPTIONS_TABLE)
    .delete()
    .eq('subscriber_profile_id', subscriberProfileId)
    .eq('subscribed_profile_id', targetProfileId);

  if (error) throw error;

  document.dispatchEvent(new CustomEvent('profile:subscription-changed', {
    detail: { profileId: targetProfileId, action: 'unsubscribe' }
  }));

  return getProfileSubscriptionState(targetProfileId);
}

/* =============================================================================
   07) PUBLIC API
============================================================================= */
window.NEUROARTAN_PROFILE_SOCIAL_GRAPH = {
  getProfileSocialGraphState,
  getProfileSubscriptionState,
  followProfile,
  unfollowProfile,
  subscribeProfile,
  unsubscribeProfile
};

/* =============================================================================
   08) END OF FILE
============================================================================= */
