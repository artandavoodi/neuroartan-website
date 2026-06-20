/* =============================================================================
   00) FILE INDEX
   01) MODULE IMPORTS
   02) CONSTANTS
   03) STATE
   04) HELPERS
   05) DISCOVERY HELPERS
   06) STREAM HELPERS
   07) RENDER HELPERS
   08) EVENTS
   09) INITIALIZATION
   10) END OF FILE
============================================================================= */

/* =============================================================================
   01) MODULE IMPORTS
============================================================================= */
import {
  escapeHtml,
  fetchJson,
  normalizeString,
  readQueryParam,
  renderMetricMarkup,
  setQueryParam
} from './catalog-runtime.js';
import {
  activatePublicModel,
  getActiveModelState,
  subscribeActiveModelState
} from '../system/model/active-model.js';
import {
  getPublicModels,
  loadPublicModelRegistry
} from '../system/model/public-model-registry.js';
import {
  createFeedPost,
  deleteFeedPost,
  getCurrentFeedAuthor,
  listFeedPosts
} from '../system/feed/feed-store.js';
import {
  createFeedPostComment,
  getEmptyFeedPostSocialState,
  getFeedSocialState,
  recordFeedPostView,
  toggleFeedPostInteraction
} from '../system/feed/feed-social-store.js';
import { rankFeedPosts } from '../system/feed/feed-ranker.js';
import { listFollowedProfileIds } from '../system/profile/profile-social-graph.js';

/* =============================================================================
   02) CONSTANTS
============================================================================= */
const FEED_SECTION_URL = '/assets/data/sections/feed.json';
const FEED_POST_ACTION_ICONS = Object.freeze({
  reply: '/registry/icons/public/assets/core/actions/reply/reply.svg',
  repost: '/registry/icons/public/assets/core/actions/repost/repost.svg',
  like: '/registry/icons/public/assets/core/actions/like/like.svg',
  share: '/registry/icons/public/assets/core/actions/share/share.svg',
  save: '/registry/icons/public/assets/core/actions/bookmark/bookmark.svg'
});

/* =============================================================================
   03) STATE
============================================================================= */
const FEED_PAGE_STATE = {
  config: null,
  root: null,
  isBound: false,
  runtimePosts: [],
  feedSocialState: Object.create(null),
  followedProfileIds: [],
  feedAuthor: null,
  composerState: {
    status: 'idle',
    message: ''
  },
  interactions: Object.create(null),
  openCommentPostId: '',
  viewObserver: null,
  viewedPostIds: new Set(),
};

/* =============================================================================
   04) HELPERS
============================================================================= */
function isFeedPage() {
  return document.body.classList.contains('feed-page');
}

function getFeedRoot() {
  return document.querySelector('[data-feed-page-root]');
}

function getFeedTab() {
  const requested = normalizeString(readQueryParam('tab')).toLowerCase();
  const allowed = new Set((FEED_PAGE_STATE.config?.tabs || []).map((tab) => normalizeString(tab.id).toLowerCase()));
  const fallback = normalizeString(FEED_PAGE_STATE.config?.default_tab || 'for-you').toLowerCase();
  return allowed.has(requested) ? requested : fallback;
}

function getFeedSort() {
  const requested = normalizeString(readQueryParam('sort')).toLowerCase();
  const allowed = new Set((FEED_PAGE_STATE.config?.sort_options || []).map((option) => normalizeString(option.id).toLowerCase()));
  return allowed.has(requested)
    ? requested
    : normalizeString(FEED_PAGE_STATE.config?.sort_options?.[0]?.id || 'latest').toLowerCase();
}

function getFeedPosts() {
  return Array.isArray(FEED_PAGE_STATE.config?.posts) ? FEED_PAGE_STATE.config.posts : [];
}

function isVerifiedEntity(model = {}) {
  const trust = [
    model.trust_classification,
    ...(Array.isArray(model.reliability_signals) ? model.reliability_signals : [])
  ].join(' ');

  return /verified|governed|self-authored/i.test(trust);
}

function isVerifiedFeedPost(post = {}) {
  const directStatus = [
    post.verified,
    post.profile_verified,
    post.author_profile_verified,
    post.public_profile?.profile_verified,
    post.author?.profile_verified,
    post.profile?.profile_verified
  ].some(Boolean);

  const verificationStatus = [
    post.verification_status,
    post.public_verification_status,
    post.author_verification_status,
    post.author_public_verification_status,
    post.public_profile?.verification_status,
    post.public_profile?.public_verification_status,
    post.author?.verification_status,
    post.author?.public_verification_status,
    post.profile?.verification_status,
    post.profile?.public_verification_status
  ].map((value) => normalizeString(value).toLowerCase());

  if (directStatus || verificationStatus.includes('verified')) return true;

  const postUsername = normalizeString(post.username).toLowerCase();
  const postRoute = normalizeString(post.publicRoute || post.href).toLowerCase();
  const postProfileId = normalizeString(post.profile_id || post.author_profile_id || post.profileId || post.authorProfileId).toLowerCase();
  const postAuthUserId = normalizeString(post.auth_user_id || post.author_auth_user_id || post.authUserId || post.authorAuthUserId).toLowerCase();
  const postLabel = normalizeString(post.entityLabel || post.display_name || post.author_display_name).toLowerCase();

  return getPublicModels().some((model) => {
    const profile = model.public_profile || {};
    const modelVerified = [
      model.verified,
      model.profile_verified,
      model.public_profile?.profile_verified,
      profile.profile_verified
    ].some(Boolean);
    const modelStatus = [
      model.verification_status,
      model.public_verification_status,
      profile.verification_status,
      profile.public_verification_status
    ].map((value) => normalizeString(value).toLowerCase());
    const verified = modelVerified || modelStatus.includes('verified');
    if (!verified) return false;

    const modelUsername = normalizeString(profile.public_username || profile.username || model.username).toLowerCase();
    const modelRoute = normalizeString(profile.public_route_path || model.page_route || model.href).toLowerCase();
    const modelProfileId = normalizeString(profile.id || profile.profile_id || model.profile_id || model.public_profile_id).toLowerCase();
    const modelAuthUserId = normalizeString(profile.auth_user_id || model.auth_user_id).toLowerCase();
    const modelLabel = normalizeString(profile.public_display_name || profile.display_name || model.display_name || model.search_title).toLowerCase();

    return Boolean(
      (postUsername && modelUsername && postUsername === modelUsername) ||
      (postRoute && modelRoute && postRoute === modelRoute) ||
      (postProfileId && modelProfileId && postProfileId === modelProfileId) ||
      (postAuthUserId && modelAuthUserId && postAuthUserId === modelAuthUserId) ||
      (postLabel && modelLabel && postLabel === modelLabel)
    );
  });
}

function getCurrentUser() {
  return FEED_PAGE_STATE.feedAuthor?.user || null;
}

function resolveFeedEntityType(model = {}) {
  switch (normalizeString(model.model_type).toLowerCase()) {
    case 'human-profile':
      return 'Profile';
    case 'institution-model':
      return 'Institution';
    case 'system-model':
      return 'Model';
    default:
      return 'Entity';
  }
}

function resolveFeedAvatar(model = {}) {
  return normalizeString(model?.public_profile?.public_avatar_url || '');
}

function getFeedInteractionState(postId = '') {
  return FEED_PAGE_STATE.feedSocialState[postId] || getEmptyFeedPostSocialState();
}

function setComposerState(status = 'idle', message = '') {
  FEED_PAGE_STATE.composerState = {
    status: normalizeString(status || 'idle') || 'idle',
    message: normalizeString(message || '')
  };
}

async function loadFeedRuntime() {
  try {
    const [feedAuthor, runtimePosts] = await Promise.all([
      getCurrentFeedAuthor(),
      listFeedPosts()
    ]);

    FEED_PAGE_STATE.feedAuthor = feedAuthor;
    FEED_PAGE_STATE.runtimePosts = Array.isArray(runtimePosts) ? runtimePosts : [];
    FEED_PAGE_STATE.followedProfileIds = await listFollowedProfileIds();
    const social = await getFeedSocialState(FEED_PAGE_STATE.runtimePosts.map((post) => post.id));
    FEED_PAGE_STATE.feedSocialState = social.state || Object.create(null);
    setComposerState('idle', '');
  } catch (error) {
    FEED_PAGE_STATE.feedAuthor = null;
    FEED_PAGE_STATE.runtimePosts = [];
    FEED_PAGE_STATE.feedSocialState = Object.create(null);
    FEED_PAGE_STATE.followedProfileIds = [];
    setComposerState('error', 'Feed publishing is not available right now.');
    console.error('[feed] Runtime load failed.', error);
  }
}

/* =============================================================================
   05) DISCOVERY HELPERS
============================================================================= */
function getSuggestedModels() {
  return getPublicModels().filter((model) => model?.directory_visibility !== false).slice(0, 3);
}

function getSuggestedProfiles() {
  return getPublicModels()
    .filter((model) => normalizeString(model?.public_profile?.public_route_path))
    .slice(0, 3);
}

function getVerifiedEntities() {
  return getPublicModels().filter(isVerifiedEntity).slice(0, 3);
}

function getFeaturedModels() {
  const featuredIds = new Set(FEED_PAGE_STATE.config?.featured_model_ids || []);
  return getPublicModels().filter((model) => featuredIds.has(model.id)).slice(0, 3);
}

function getTrendingThoughts() {
  const counts = new Map();

  getPublicModels().forEach((model) => {
    (Array.isArray(model.tags) ? model.tags : []).forEach((tag) => {
      const normalized = normalizeString(tag);
      if (!normalized) return;
      counts.set(normalized, (counts.get(normalized) || 0) + 1);
    });
  });

  return Array.from(counts.entries())
    .sort((left, right) => right[1] - left[1])
    .slice(0, 5)
    .map(([label]) => label);
}

/* =============================================================================
   06) STREAM HELPERS
============================================================================= */
function buildDerivedFeedPosts() {
  const featuredIds = new Set(FEED_PAGE_STATE.config?.featured_model_ids || []);
  const activeTab = getFeedTab();
  const sort = getFeedSort();

  let posts = getPublicModels()
    .filter((model) => model?.directory_visibility !== false)
    .map((model) => ({
      id: model.id,
      modelId: model.id,
      entityType: resolveFeedEntityType(model),
      entityLabel: model.display_name || model.search_title || 'Entity',
      username: normalizeString(model?.public_profile?.public_username || model.username),
      avatar: resolveFeedAvatar(model),
      verified: isVerifiedEntity(model),
      content: model?.public_profile?.public_summary || model.description || '',
      metadata: [
        model.training_state || model.model_maturity || '',
        model.availability || '',
        model.joined_year ? `Joined ${model.joined_year}` : ''
      ].filter(Boolean),
      tags: (Array.isArray(model.tags) ? model.tags : []).slice(0, 3),
      href: model.page_route || '/pages/profiles/index.html',
      publicRoute: model?.public_profile?.public_route_path || '',
      featured: featuredIds.has(model.id),
    }));

  if (activeTab === 'models') {
    posts = posts.filter((post) => post.entityType !== 'Profile');
  } else if (activeTab === 'profiles') {
    posts = posts.filter((post) => post.entityType === 'Profile');
  } else if (activeTab === 'following' || activeTab === 'my-posts') {
    posts = [];
  } else if (activeTab === 'for-you') {
    posts = posts.sort((left, right) => Number(right.featured) - Number(left.featured));
  }

  if (sort === 'verified') {
    posts = posts.sort((left, right) => Number(right.verified) - Number(left.verified));
  } else if (sort === 'models') {
    posts = posts.sort((left, right) => left.entityType.localeCompare(right.entityType));
  }

  return posts.slice(0, 8);
}

function getRenderableFeedPosts() {
  const activeTab = getFeedTab();
  const sort = getFeedSort();
  const runtimePosts = Array.isArray(FEED_PAGE_STATE.runtimePosts) ? FEED_PAGE_STATE.runtimePosts : [];

  return rankFeedPosts(runtimePosts, {
    tab:activeTab,
    sort,
    followedProfileIds:FEED_PAGE_STATE.followedProfileIds
  });
}

/* =============================================================================
   07) RENDER HELPERS
============================================================================= */
function renderFeedTabs() {
  const activeTab = getFeedTab();
  return (FEED_PAGE_STATE.config?.tabs || []).map((tab) => `
    <button
      class="feed-tab"
      type="button"
      data-feed-tab="${escapeHtml(tab.id)}"
      aria-pressed="${tab.id === activeTab ? 'true' : 'false'}">
      ${escapeHtml(tab.label)}
    </button>
  `).join('');
}

function renderDiscoverySection(title, values, formatter) {
  return `
    <article class="catalog-panel feed-discovery-panel">
      <h2 class="catalog-panel__title">${escapeHtml(title)}</h2>
      <div class="catalog-list">
        ${values.length ? values.map((value) => formatter(value)).join('') : '<div class="catalog-list-item">No public items published yet.</div>'}
      </div>
    </article>
  `;
}

function renderFeedPost(post = {}) {
  const socialState = getFeedInteractionState(post.id);
  const interactionState = socialState.viewer || {};
  const counts = socialState.counts || {};
  const activeModelId = getActiveModelState().activeModelId;
  const avatar = normalizeString(post.avatar);
  const publicProfileRoute = normalizeString(post.publicRoute || post.href || '/pages/profiles/index.html');
  const handle = normalizeString(post.username) ? `@${normalizeString(post.username)}` : normalizeString(post.publicRoute || post.href || '');
  const verified = isVerifiedFeedPost(post);
  const renderAction = (action, label, pressed = false) => {
    const icon = FEED_POST_ACTION_ICONS[action] || '';
    const countKey = action === 'save' ? 'bookmark' : action === 'reply' ? 'reply' : action;
    const count = Number(counts[countKey] || 0);
    return `
      <button class="feed-post__action" type="button" data-feed-post-action="${escapeHtml(action)}" data-feed-post-id="${escapeHtml(post.id)}" aria-pressed="${pressed ? 'true' : 'false'}">
        ${icon ? `<img class="feed-post__action-icon ui-icon-theme-aware" src="${icon}" alt="" aria-hidden="true">` : ''}
        <span>${escapeHtml(count > 0 ? `${label} ${count}` : label)}</span>
      </button>
    `;
  };

  return `
    <article class="feed-post" data-feed-post-view-id="${escapeHtml(post.id)}">
      <div class="feed-post__identity">
        <a class="feed-post__avatar" href="${escapeHtml(publicProfileRoute)}" aria-label="View ${escapeHtml(post.entityLabel || 'profile')} profile">
          ${avatar
            ? `<img class="feed-post__avatar-image" src="${escapeHtml(avatar)}" alt="">`
            : `<span class="feed-post__avatar-fallback">${escapeHtml((post.entityLabel || 'N').charAt(0).toUpperCase())}</span>`}
        </a>

        <div class="feed-post__identity-copy">
          <div class="feed-post__identity-row">
            <h2 class="feed-post__entity"><a class="feed-post__profile-link" href="${escapeHtml(publicProfileRoute)}">${escapeHtml(post.entityLabel || 'Entity')}</a></h2>
            ${verified ? `
              <span class="feed-post__badge" aria-label="Verified entity">
                <img class="feed-post__badge-icon" src="/registry/icons/public/assets/core/identity/trust/verified.svg" alt="" aria-hidden="true">
              </span>
            ` : ''}
            <span class="feed-post__type">${escapeHtml(post.entityType || 'Entity')}</span>
          </div>
          <p class="feed-post__handle">${escapeHtml(handle)}</p>
        </div>
      </div>

      <p class="feed-post__copy">${escapeHtml(post.content || '')}</p>

      ${post.imageUrl ? `
        <div class="feed-post__media-frame" data-feed-media-state="loading">
          <span class="feed-post__media-loader" aria-hidden="true"></span>
          <img class="feed-post__image" src="${escapeHtml(post.imageUrl)}" alt="" loading="lazy" decoding="async">
        </div>
      ` : ''}

      <div class="feed-post__metadata">
        ${(Array.isArray(post.metadata) ? post.metadata : []).map((item) => `<span class="feed-post__meta-chip">${escapeHtml(item)}</span>`).join('')}
        ${(Array.isArray(post.tags) ? post.tags : []).map((item) => `<span class="feed-post__meta-chip">${escapeHtml(item)}</span>`).join('')}
      </div>

      <div class="feed-post__actions">
        ${renderAction('reply', 'Reply', interactionState.reply)}
        ${renderAction('repost', 'Repost', interactionState.repost)}
        ${renderAction('like', 'Like', interactionState.like)}
        ${renderAction('share', 'Share', interactionState.share)}
        ${renderAction('save', 'Bookmark', interactionState.bookmark)}
        <a class="feed-post__action feed-post__action--link" href="${escapeHtml(post.publicRoute || post.href || '/pages/profiles/index.html')}">View</a>
        ${post.ownedByCurrentUser ? `<button class="feed-post__action" type="button" data-feed-delete-post="${escapeHtml(post.feedPostId || post.id)}">Delete</button>` : ''}
        ${post.modelId ? `<button class="feed-post__action feed-post__action--primary" type="button" data-feed-post-model="${escapeHtml(post.modelId)}">${post.modelId === activeModelId ? 'Active on Homepage' : 'Interact'}</button>` : ''}
      </div>
      <form class="feed-post__comment-form" data-feed-post-comment-form data-feed-post-id="${escapeHtml(post.id)}" ${FEED_PAGE_STATE.openCommentPostId === post.id ? '' : 'hidden'}>
        <input class="feed-post__comment-input" name="comment" type="text" placeholder="Write a reply" autocomplete="off">
        <button class="feed-post__comment-submit" type="submit">Reply</button>
      </form>
      ${FEED_PAGE_STATE.openCommentPostId === post.id && socialState.comments?.length ? `
        <div class="feed-post__comments">
          ${socialState.comments.slice(-4).map((comment) => `
            <article class="feed-post__comment">
              <strong>${escapeHtml(comment.authorDisplayName || 'Profile')}</strong>
              <span>${escapeHtml(comment.body || '')}</span>
            </article>
          `).join('')}
        </div>
      ` : ''}
    </article>
  `;
}

function hydrateFeedMedia(root = FEED_PAGE_STATE.root) {
  if (!(root instanceof HTMLElement)) return;

  root.querySelectorAll('.feed-post__media-frame').forEach((frame) => {
    const image = frame.querySelector('.feed-post__image');
    if (!(frame instanceof HTMLElement) || !(image instanceof HTMLImageElement)) return;

    const setState = (state) => {
      frame.dataset.feedMediaState = state;
    };

    if (image.complete && image.naturalWidth > 0) {
      setState('loaded');
      return;
    }
    if (image.complete) {
      setState('error');
      return;
    }

    image.addEventListener('load', () => setState('loaded'), { once: true });
    image.addEventListener('error', () => setState('error'), { once: true });
  });
}

function observeFeedPostViews(root = FEED_PAGE_STATE.root) {
  if (!(root instanceof HTMLElement)) return;

  const postNodes = Array.from(root.querySelectorAll('[data-feed-post-view-id]'))
    .filter((node) => node instanceof HTMLElement);

  if (!('IntersectionObserver' in window)) {
    postNodes.forEach((node) => {
      const postId = normalizeString(node.getAttribute('data-feed-post-view-id'));
      if (!postId || FEED_PAGE_STATE.viewedPostIds.has(postId)) return;
      FEED_PAGE_STATE.viewedPostIds.add(postId);
      void recordFeedPostView(postId).catch(() => {});
    });
    return;
  }

  if (FEED_PAGE_STATE.viewObserver) {
    FEED_PAGE_STATE.viewObserver.disconnect();
  }

  FEED_PAGE_STATE.viewObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting || !(entry.target instanceof HTMLElement)) return;

      const postId = normalizeString(entry.target.getAttribute('data-feed-post-view-id'));
      observer.unobserve(entry.target);
      if (!postId || FEED_PAGE_STATE.viewedPostIds.has(postId)) return;

      FEED_PAGE_STATE.viewedPostIds.add(postId);
      void recordFeedPostView(postId).catch(() => {});
    });
  }, {
    threshold: 0.5
  });

  postNodes.forEach((node) => {
    const postId = normalizeString(node.getAttribute('data-feed-post-view-id'));
    if (!postId || FEED_PAGE_STATE.viewedPostIds.has(postId)) return;
    FEED_PAGE_STATE.viewObserver.observe(node);
  });
}

function renderFeedPage() {
  if (!FEED_PAGE_STATE.root || !FEED_PAGE_STATE.config) {
    return;
  }

  const posts = getRenderableFeedPosts();
  const currentUser = getCurrentUser();
  const sort = getFeedSort();
  const activeTab = getFeedTab();
  const suggestedModels = getSuggestedModels();
  const suggestedProfiles = getSuggestedProfiles();
  const verifiedEntities = getVerifiedEntities();
  const featuredModels = getFeaturedModels();
  const trendingThoughts = getTrendingThoughts();

  FEED_PAGE_STATE.root.innerHTML = `
    <section class="catalog-page-hero">
      <p class="catalog-page-eyebrow">${escapeHtml(FEED_PAGE_STATE.config.label || 'Feed')}</p>
      <h1 class="catalog-page-title">${escapeHtml(FEED_PAGE_STATE.config.title || 'Feed')}</h1>
      <p class="catalog-page-description">${escapeHtml(FEED_PAGE_STATE.config.description || '')}</p>
      <div class="catalog-meta">
        ${renderMetricMarkup([
          `${FEED_PAGE_STATE.runtimePosts.length} profile posts loaded`,
          `${FEED_PAGE_STATE.followedProfileIds.length} followed profiles in graph`,
          `Current tab: ${(FEED_PAGE_STATE.config.tabs || []).find((tab) => tab.id === activeTab)?.label || 'For You'}`
        ])}
      </div>
    </section>

    <section class="catalog-section">
      <div class="feed-layout">
        <div class="feed-main">
          <article class="catalog-panel feed-composer">
            <h2 class="catalog-panel__title">${escapeHtml(FEED_PAGE_STATE.config.composer?.title || 'Post')}</h2>
            <label class="catalog-search" for="feed-composer-input">
              <span class="catalog-search__label">Publish from your profile</span>
              <span class="catalog-search__input-row">
                <textarea class="feed-composer__input" id="feed-composer-input" placeholder="${escapeHtml(FEED_PAGE_STATE.config.composer?.placeholder || '')}" ${currentUser ? '' : 'readonly'}></textarea>
              </span>
            </label>
            <div class="catalog-action-row">
              <button class="feed-composer__action" type="button" data-feed-compose-action="${currentUser ? 'publish' : 'entry'}">
                ${currentUser ? 'Publish' : 'Sign In to Publish'}
              </button>
            </div>
            ${FEED_PAGE_STATE.composerState.message ? `<p class="catalog-panel__copy" data-feed-composer-status="${escapeHtml(FEED_PAGE_STATE.composerState.status)}">${escapeHtml(FEED_PAGE_STATE.composerState.message)}</p>` : ''}
          </article>

          <div class="catalog-panel feed-stream-panel" data-feed-ranking="candidate-rank-filter">
            <div class="feed-stream-panel__header">
              <div class="feed-tab-row" role="group" aria-label="Feed tabs">
                ${renderFeedTabs()}
              </div>

              <label class="feed-sort" for="feed-sort-select">
                <span class="feed-sort__label">Sort</span>
                <select class="feed-sort__select" id="feed-sort-select" name="sort">
                  ${(FEED_PAGE_STATE.config.sort_options || []).map((option) => `
                    <option value="${escapeHtml(option.id)}"${option.id === sort ? ' selected' : ''}>${escapeHtml(option.label)}</option>
                  `).join('')}
                </select>
              </label>
            </div>

            <div class="feed-stream">
              ${posts.length ? posts.map((post) => renderFeedPost(post)).join('') : `
                <div class="catalog-empty-state">
                  <h2 class="catalog-empty-state__title">${escapeHtml(FEED_PAGE_STATE.config.empty_state?.title || 'No public posts yet')}</h2>
                  <p class="catalog-empty-state__copy">${escapeHtml(FEED_PAGE_STATE.config.empty_state?.copy || '')}</p>
                </div>
              `}
            </div>
          </div>
        </div>

        <aside class="feed-discovery" aria-label="Secondary discovery layer">
          ${renderDiscoverySection('Suggested Models', suggestedModels, (model) => `
            <div class="catalog-list-item">
              <strong>${escapeHtml(model.display_name || model.search_title || 'Model')}</strong><br>
              ${escapeHtml(model.description || '')}
            </div>
          `)}

          ${renderDiscoverySection('Suggested Profiles', suggestedProfiles, (model) => `
            <div class="catalog-list-item">
              <strong>${escapeHtml(model.public_profile?.public_display_name || model.display_name || 'Profile')}</strong><br>
              ${escapeHtml(model.public_profile?.public_route_path || model.page_route || '/pages/profiles/index.html')}
            </div>
          `)}

          ${renderDiscoverySection('Trending Thoughts', trendingThoughts, (tag) => `
            <div class="catalog-list-item">${escapeHtml(tag)}</div>
          `)}

          ${renderDiscoverySection('Verified Entities', verifiedEntities, (model) => `
            <div class="catalog-list-item">
              <strong>${escapeHtml(model.display_name || model.search_title || 'Entity')}</strong><br>
              ${escapeHtml(model.trust_classification || 'Governed public entity')}
            </div>
          `)}

          ${renderDiscoverySection('Featured Continuity Models', featuredModels, (model) => `
            <div class="catalog-list-item">
              <strong>${escapeHtml(model.display_name || model.search_title || 'Model')}</strong><br>
              ${escapeHtml(model.training_state || model.model_maturity || '')}
            </div>
          `)}
        </aside>
      </div>
    </section>
  `;

  hydrateFeedMedia(FEED_PAGE_STATE.root);
  observeFeedPostViews(FEED_PAGE_STATE.root);
}

/* =============================================================================
   08) EVENTS
============================================================================= */
function bindFeedEvents() {
  if (FEED_PAGE_STATE.isBound) {
    return;
  }

  FEED_PAGE_STATE.isBound = true;

  subscribeActiveModelState(() => {
    renderFeedPage();
  });

  document.addEventListener('click', (event) => {
    if (!FEED_PAGE_STATE.root) return;

    const tabButton = event.target.closest('[data-feed-tab]');
    if (tabButton instanceof HTMLButtonElement && FEED_PAGE_STATE.root.contains(tabButton)) {
      setQueryParam('tab', tabButton.getAttribute('data-feed-tab') || FEED_PAGE_STATE.config?.default_tab || 'for-you');
      renderFeedPage();
      return;
    }

    const composeAction = event.target.closest('[data-feed-compose-action]');
    if (composeAction instanceof HTMLButtonElement && FEED_PAGE_STATE.root.contains(composeAction)) {
      const action = normalizeString(composeAction.getAttribute('data-feed-compose-action')).toLowerCase();

      if (action === 'entry') {
        document.dispatchEvent(new CustomEvent('account:entry-request', {
          detail: {
            source: 'feed-page'
          }
        }));
      }

      if (action === 'publish') {
        const input = FEED_PAGE_STATE.root.querySelector('#feed-composer-input');
        const postBody = input instanceof HTMLTextAreaElement ? normalizeString(input.value) : '';

        if (!postBody) {
          setComposerState('error', 'Write a post before publishing.');
          renderFeedPage();
          return;
        }

        setComposerState('saving', 'Publishing post...');
        renderFeedPage();

        void createFeedPost({
          post_body: postBody,
          source_surface: 'feed'
        }).then(async () => {
          if (input instanceof HTMLTextAreaElement) {
            input.value = '';
          }
          await loadFeedRuntime();
          setComposerState('success', 'Post published.');
          renderFeedPage();
        }).catch((error) => {
          const code = normalizeString(error?.code || error?.message || '');
          setComposerState('error', code === 'PROFILE_REQUIRED'
            ? 'Complete your profile before publishing.'
            : 'Post could not be published right now.');
          console.error('[feed] Post publish failed.', error);
          renderFeedPage();
        });
      }

      return;
    }

    const deleteAction = event.target.closest('[data-feed-delete-post]');
    if (deleteAction instanceof HTMLButtonElement && FEED_PAGE_STATE.root.contains(deleteAction)) {
      const postId = normalizeString(deleteAction.getAttribute('data-feed-delete-post'));
      if (!postId) return;

      void deleteFeedPost(postId).then(async () => {
        await loadFeedRuntime();
        setComposerState('success', 'Post deleted.');
        renderFeedPage();
      }).catch((error) => {
        setComposerState('error', 'Post could not be deleted right now.');
        console.error('[feed] Post delete failed.', error);
        renderFeedPage();
      });
      return;
    }

    const postAction = event.target.closest('[data-feed-post-action]');
    if (postAction instanceof HTMLButtonElement && FEED_PAGE_STATE.root.contains(postAction)) {
      const postId = normalizeString(postAction.getAttribute('data-feed-post-id'));
      const action = normalizeString(postAction.getAttribute('data-feed-post-action')).toLowerCase();

      if (!postId || !action) {
        return;
      }

      if (action === 'reply') {
        FEED_PAGE_STATE.openCommentPostId = FEED_PAGE_STATE.openCommentPostId === postId ? '' : postId;
        renderFeedPage();
        return;
      }

      postAction.disabled = true;
      void toggleFeedPostInteraction(postId, action).then((snapshot) => {
        FEED_PAGE_STATE.feedSocialState = {
          ...FEED_PAGE_STATE.feedSocialState,
          ...(snapshot.state || {})
        };
        renderFeedPage();
      }).catch((error) => {
        console.error('[feed] Social action failed.', error);
      }).finally(() => {
        postAction.disabled = false;
      });
      return;
    }

    const interactAction = event.target.closest('[data-feed-post-model]');
    if (interactAction instanceof HTMLButtonElement && FEED_PAGE_STATE.root.contains(interactAction)) {
      const modelId = normalizeString(interactAction.getAttribute('data-feed-post-model'));
      if (!modelId) {
        return;
      }

      void activatePublicModel(modelId, { source: 'feed-page' }).then(() => {
        renderFeedPage();
      });
    }
  });

  document.addEventListener('change', (event) => {
    if (!FEED_PAGE_STATE.root) return;
    const select = event.target.closest('#feed-sort-select');
    if (!(select instanceof HTMLSelectElement) || !FEED_PAGE_STATE.root.contains(select)) {
      return;
    }

    setQueryParam('sort', select.value);
    renderFeedPage();
  });

  document.addEventListener('submit', (event) => {
    if (!FEED_PAGE_STATE.root) return;
    const form = event.target.closest('[data-feed-post-comment-form]');
    if (!(form instanceof HTMLFormElement) || !FEED_PAGE_STATE.root.contains(form)) return;

    event.preventDefault();
    const postId = normalizeString(form.getAttribute('data-feed-post-id'));
    const input = form.querySelector('input[name="comment"]');
    const body = input instanceof HTMLInputElement ? normalizeString(input.value) : '';
    if (!postId || !body) return;

    void createFeedPostComment(postId, body).then((snapshot) => {
      FEED_PAGE_STATE.feedSocialState = {
        ...FEED_PAGE_STATE.feedSocialState,
        ...(snapshot.state || {})
      };
      form.reset();
      renderFeedPage();
    }).catch((error) => {
      console.error('[feed] Comment save failed.', error);
    });
  });

  window.addEventListener('popstate', renderFeedPage);
  document.addEventListener('feed:social-state-changed', () => {
    void getFeedSocialState(FEED_PAGE_STATE.runtimePosts.map((post) => post.id)).then((snapshot) => {
      FEED_PAGE_STATE.feedSocialState = snapshot.state || Object.create(null);
      renderFeedPage();
    });
  });
}

/* =============================================================================
   09) INITIALIZATION
============================================================================= */
async function initFeedPage() {
  if (!isFeedPage()) {
    return;
  }

  FEED_PAGE_STATE.root = getFeedRoot();
  if (!FEED_PAGE_STATE.root) {
    return;
  }

  const [config] = await Promise.all([
    fetchJson(FEED_SECTION_URL),
    loadPublicModelRegistry(),
    loadFeedRuntime()
  ]);

  FEED_PAGE_STATE.config = config;
  bindFeedEvents();
  renderFeedPage();
}

void initFeedPage();

/* =============================================================================
   10) END OF FILE
============================================================================= */
