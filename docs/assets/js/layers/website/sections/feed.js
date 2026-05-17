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

/* =============================================================================
   02) CONSTANTS
============================================================================= */
const FEED_SECTION_URL = '/assets/data/sections/feed.json';

/* =============================================================================
   03) STATE
============================================================================= */
const FEED_PAGE_STATE = {
  config: null,
  root: null,
  isBound: false,
  runtimePosts: [],
  feedAuthor: null,
  composerState: {
    status: 'idle',
    message: ''
  },
  interactions: Object.create(null),
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
  if (!FEED_PAGE_STATE.interactions[postId]) {
    FEED_PAGE_STATE.interactions[postId] = {
      reply: false,
      repost: false,
      like: false,
      save: false,
    };
  }

  return FEED_PAGE_STATE.interactions[postId];
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
    setComposerState('idle', '');
  } catch (error) {
    FEED_PAGE_STATE.feedAuthor = null;
    FEED_PAGE_STATE.runtimePosts = [];
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
  const runtimePosts = Array.isArray(FEED_PAGE_STATE.runtimePosts) ? FEED_PAGE_STATE.runtimePosts : [];

  if (activeTab === 'my-posts') {
    return runtimePosts.filter((post) => post.ownedByCurrentUser);
  }

  const configuredPosts = getFeedPosts();
  if (configuredPosts.length) {
    return [...runtimePosts, ...configuredPosts];
  }

  return [...runtimePosts, ...buildDerivedFeedPosts()];
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
  const interactionState = getFeedInteractionState(post.id);
  const activeModelId = getActiveModelState().activeModelId;
  const avatar = normalizeString(post.avatar);
  const handle = normalizeString(post.username) ? `@${normalizeString(post.username)}` : normalizeString(post.publicRoute || post.href || '');

  return `
    <article class="feed-post">
      <div class="feed-post__identity">
        <div class="feed-post__avatar" aria-hidden="true">
          ${avatar
            ? `<img class="feed-post__avatar-image" src="${escapeHtml(avatar)}" alt="">`
            : `<span class="feed-post__avatar-fallback">${escapeHtml((post.entityLabel || 'N').charAt(0).toUpperCase())}</span>`}
        </div>

        <div class="feed-post__identity-copy">
          <div class="feed-post__identity-row">
            <h2 class="feed-post__entity">${escapeHtml(post.entityLabel || 'Entity')}</h2>
            ${post.verified ? `
              <span class="feed-post__badge" aria-label="Verified entity">
                <img class="feed-post__badge-icon ui-icon-theme-aware" src="/registry/icons/public/assets/core/identity/trust/verified.svg" alt="" aria-hidden="true">
                <span>Verified</span>
              </span>
            ` : ''}
            <span class="feed-post__type">${escapeHtml(post.entityType || 'Entity')}</span>
          </div>
          <p class="feed-post__handle">${escapeHtml(handle)}</p>
        </div>
      </div>

      <p class="feed-post__copy">${escapeHtml(post.content || '')}</p>

      <div class="feed-post__metadata">
        ${(Array.isArray(post.metadata) ? post.metadata : []).map((item) => `<span class="feed-post__meta-chip">${escapeHtml(item)}</span>`).join('')}
        ${(Array.isArray(post.tags) ? post.tags : []).map((item) => `<span class="feed-post__meta-chip">${escapeHtml(item)}</span>`).join('')}
      </div>

      <div class="feed-post__actions">
        <button class="feed-post__action" type="button" data-feed-post-action="reply" data-feed-post-id="${escapeHtml(post.id)}" aria-pressed="${interactionState.reply ? 'true' : 'false'}">Reply</button>
        <button class="feed-post__action" type="button" data-feed-post-action="repost" data-feed-post-id="${escapeHtml(post.id)}" aria-pressed="${interactionState.repost ? 'true' : 'false'}">Repost</button>
        <button class="feed-post__action" type="button" data-feed-post-action="like" data-feed-post-id="${escapeHtml(post.id)}" aria-pressed="${interactionState.like ? 'true' : 'false'}">Like</button>
        <button class="feed-post__action" type="button" data-feed-post-action="save" data-feed-post-id="${escapeHtml(post.id)}" aria-pressed="${interactionState.save ? 'true' : 'false'}">Save</button>
        <a class="feed-post__action feed-post__action--link" href="${escapeHtml(post.publicRoute || post.href || '/pages/profiles/index.html')}">View</a>
        ${post.ownedByCurrentUser ? `<button class="feed-post__action" type="button" data-feed-delete-post="${escapeHtml(post.feedPostId || post.id)}">Delete</button>` : ''}
        ${post.modelId ? `<button class="feed-post__action feed-post__action--primary" type="button" data-feed-post-model="${escapeHtml(post.modelId)}">${post.modelId === activeModelId ? 'Active on Homepage' : 'Interact'}</button>` : ''}
      </div>
    </article>
  `;
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
          `${getPublicModels().length} public models available for discovery`,
          `${verifiedEntities.length} verified or governed entities surfaced`,
          `Current tab: ${(FEED_PAGE_STATE.config.tabs || []).find((tab) => tab.id === activeTab)?.label || 'For You'}`
        ])}
      </div>
    </section>

    <section class="catalog-section">
      <div class="feed-layout">
        <div class="feed-main">
          <article class="catalog-panel feed-composer">
            <h2 class="catalog-panel__title">${escapeHtml(FEED_PAGE_STATE.config.composer?.title || 'Feed Composer')}</h2>
            <p class="catalog-panel__copy">${escapeHtml(FEED_PAGE_STATE.config.composer?.description || '')}</p>
            <label class="catalog-search" for="feed-composer-input">
              <span class="catalog-search__label">Compose from a governed profile or continuity model surface</span>
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

          <div class="catalog-panel feed-stream-panel">
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

      const state = getFeedInteractionState(postId);
      state[action] = !state[action];
      renderFeedPage();
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

  window.addEventListener('popstate', renderFeedPage);
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
