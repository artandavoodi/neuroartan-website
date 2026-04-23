/* =============================================================================
   00) FILE INDEX
   01) MODULE IMPORTS
   02) CONSTANTS
   03) STATE
   04) HELPERS
   05) DISCOVERY HELPERS
   06) RENDER HELPERS
   07) EVENTS
   08) INITIALIZATION
   09) END OF FILE
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
  getPublicModels,
  loadPublicModelRegistry
} from '../system/public-model-registry.js';

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
  isBound: false
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
  return allowed.has(requested) ? requested : normalizeString(FEED_PAGE_STATE.config?.sort_options?.[0]?.id || 'latest').toLowerCase();
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
  try {
    return window.firebase?.auth?.()?.currentUser || null;
  } catch (_) {
    return null;
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
   06) RENDER HELPERS
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

function renderFeedPage() {
  if (!FEED_PAGE_STATE.root || !FEED_PAGE_STATE.config) {
    return;
  }

  const posts = getFeedPosts();
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
                ${currentUser ? 'Publishing Runtime Pending' : 'Sign In to Publish'}
              </button>
            </div>
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
              ${posts.length ? posts.map((post) => `
                <article class="feed-post">
                  <p class="feed-post__eyebrow">${escapeHtml(post.entity || 'Entity')}</p>
                  <h2 class="feed-post__title">${escapeHtml(post.title || 'Feed post')}</h2>
                  <p class="feed-post__copy">${escapeHtml(post.body || '')}</p>
                </article>
              `).join('') : `
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
   07) EVENTS
============================================================================= */
function bindFeedEvents() {
  if (FEED_PAGE_STATE.isBound) {
    return;
  }

  FEED_PAGE_STATE.isBound = true;

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
   08) INITIALIZATION
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
    loadPublicModelRegistry()
  ]);

  FEED_PAGE_STATE.config = config;
  bindFeedEvents();
  renderFeedPage();
}

void initFeedPage();

/* =============================================================================
   09) END OF FILE
============================================================================= */
