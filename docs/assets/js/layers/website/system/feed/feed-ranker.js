/* =============================================================================
   00) FILE INDEX
   01) MODULE IDENTITY
   02) VALUE HELPERS
   03) RANKING SIGNALS
   04) PUBLIC API
============================================================================= */

/* =============================================================================
   01) MODULE IDENTITY
============================================================================= */
/* /website/docs/assets/js/layers/website/system/feed/feed-ranker.js */

/* =============================================================================
   02) VALUE HELPERS
============================================================================= */
function normalizeString(value = '') {
  return String(value ?? '').trim();
}

function normalizeNumber(value = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function getCreatedAtTime(post = {}) {
  const value = normalizeString(post.createdAt || post.created_at || '');
  const time = value ? new Date(value).getTime() : 0;
  return Number.isFinite(time) ? time : 0;
}

/* =============================================================================
   03) RANKING SIGNALS
============================================================================= */
function scoreRecency(post = {}, now = Date.now()) {
  const createdAt = getCreatedAtTime(post);
  if (!createdAt) return 0;

  const ageHours = Math.max(0, (now - createdAt) / 36e5);
  return 1 / (1 + (ageHours / 36));
}

function scoreSocialGraph(post = {}, context = {}) {
  const followedIds = context.followedProfileIds instanceof Set
    ? context.followedProfileIds
    : new Set(context.followedProfileIds || []);

  if (post.ownedByCurrentUser) return 0.12;
  return followedIds.has(normalizeString(post.profileId)) ? 0.42 : 0;
}

function scoreCompleteness(post = {}) {
  let score = 0;
  if (normalizeString(post.content)) score += 0.12;
  if (normalizeString(post.imageUrl)) score += 0.08;
  if (normalizeString(post.avatar)) score += 0.04;
  if (normalizeString(post.username)) score += 0.04;
  if (post.verified === true) score += 0.08;
  return score;
}

function scoreEngagement(post = {}) {
  return Math.min(0.28, (
    normalizeNumber(post.likeCount || post.likes_count)
    + normalizeNumber(post.replyCount || post.replies_count) * 1.4
    + normalizeNumber(post.repostCount || post.reposts_count) * 1.8
  ) / 100);
}

function getRankScore(post = {}, context = {}) {
  return (
    scoreRecency(post, context.now)
    + scoreSocialGraph(post, context)
    + scoreCompleteness(post)
    + scoreEngagement(post)
  );
}

/* =============================================================================
   04) PUBLIC API
============================================================================= */
export function rankFeedPosts(posts = [], context = {}) {
  const tab = normalizeString(context.tab || 'for-you').toLowerCase();
  const sort = normalizeString(context.sort || 'ranked').toLowerCase();
  const now = context.now || Date.now();

  let candidates = Array.isArray(posts) ? posts.slice() : [];

  if (tab === 'my-posts') {
    candidates = candidates.filter((post) => post.ownedByCurrentUser);
  } else if (tab === 'following') {
    const followedIds = new Set(context.followedProfileIds || []);
    candidates = candidates.filter((post) => followedIds.has(normalizeString(post.profileId)));
  } else if (tab === 'profiles') {
    candidates = candidates.filter((post) => normalizeString(post.entityType).toLowerCase() === 'profile');
  } else if (tab === 'models') {
    candidates = candidates.filter((post) => normalizeString(post.entityType).toLowerCase() === 'model');
  }

  if (sort === 'latest') {
    return candidates.sort((left, right) => getCreatedAtTime(right) - getCreatedAtTime(left));
  }

  if (sort === 'verified') {
    return candidates.sort((left, right) => Number(right.verified === true) - Number(left.verified === true)
      || getRankScore(right, { ...context, now }) - getRankScore(left, { ...context, now }));
  }

  return candidates
    .map((post) => ({
      post,
      score: getRankScore(post, { ...context, now })
    }))
    .sort((left, right) => right.score - left.score)
    .map((entry) => entry.post);
}

/* =============================================================================
   05) END OF FILE
============================================================================= */
