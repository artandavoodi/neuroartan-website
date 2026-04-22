/* =============================================================================
   00) FILE INDEX
   01) MODULE IMPORTS
   02) CONSTANTS
   03) STATE
   04) HELPERS
   05) RENDER HELPERS
   06) EVENTS
   07) INITIALIZATION
   08) END OF FILE
============================================================================= */

/* =============================================================================
   01) MODULE IMPORTS
============================================================================= */
import {
  escapeHtml,
  fetchJson,
  normalizeString,
  readQueryParam,
  setQueryParam
} from './catalog-runtime.js';
import {
  getPublicModels,
  loadPublicModelRegistry
} from '../system/public-model-registry.js';

/* =============================================================================
   02) CONSTANTS
============================================================================= */
const ROUTE_INDEX_URL = '/assets/data/search/route-index.json';
const CONTENT_INDEX_URL = '/assets/data/search/content-index.json';

/* =============================================================================
   03) STATE
============================================================================= */
const SITEMAP_PAGE_STATE = {
  routes: [],
  content: [],
  root: null,
  isBound: false
};

/* =============================================================================
   04) HELPERS
============================================================================= */
function isSitemapPage() {
  return document.body.classList.contains('sitemap-page');
}

function getSitemapRoot() {
  return document.querySelector('[data-sitemap-page-root]');
}

function getSitemapQuery() {
  return readQueryParam('q');
}

function getScopeLabel(scope) {
  switch (normalizeString(scope)) {
    case 'root':
      return 'Root';
    case 'institutional':
      return 'Institutional';
    case 'product':
      return 'Product';
    case 'research':
      return 'Research';
    case 'business':
      return 'Business';
    case 'support':
      return 'Support';
    case 'legal':
      return 'Legal';
    case 'account':
      return 'Account';
    default:
      return 'Platform';
  }
}

function buildRoutePool() {
  const contentByPath = new Map(
    SITEMAP_PAGE_STATE.content.map((entry) => [entry.path, entry])
  );

  const routes = SITEMAP_PAGE_STATE.routes.map((route) => ({
    id: route.id,
    title: route.title,
    path: route.path,
    scope: route.scope,
    keywords: Array.isArray(contentByPath.get(route.path)?.keywords)
      ? contentByPath.get(route.path).keywords
      : []
  }));

  const publicModels = getPublicModels()
    .filter((model) => model.directory_visibility !== false)
    .map((model) => ({
      id: model.id,
      title: model.display_name || model.search_title || 'Continuity Model',
      path: model.page_route || '/pages/profiles/index.html',
      scope: 'profiles',
      keywords: [
        ...(Array.isArray(model.tags) ? model.tags : []),
        ...(Array.isArray(model.identity_signals) ? model.identity_signals : [])
      ]
    }));

  return [...routes, ...publicModels];
}

function getFilteredSitemapGroups(query) {
  const normalizedQuery = normalizeString(query).toLowerCase();
  const pool = buildRoutePool();
  const groups = new Map();

  pool.forEach((entry) => {
    const haystack = [
      entry.title,
      entry.path,
      ...(Array.isArray(entry.keywords) ? entry.keywords : [])
    ].join(' ').toLowerCase();

    if (normalizedQuery && !haystack.includes(normalizedQuery)) {
      return;
    }

    const scope = entry.scope || 'platform';
    if (!groups.has(scope)) {
      groups.set(scope, []);
    }

    groups.get(scope).push(entry);
  });

  return Array.from(groups.entries())
    .map(([scope, entries]) => ({
      scope,
      label: getScopeLabel(scope),
      entries: entries.sort((left, right) => left.title.localeCompare(right.title))
    }))
    .sort((left, right) => left.label.localeCompare(right.label));
}

/* =============================================================================
   05) RENDER HELPERS
============================================================================= */
function renderSitemapPage() {
  if (!SITEMAP_PAGE_STATE.root) {
    return;
  }

  const query = getSitemapQuery();
  const groups = getFilteredSitemapGroups(query);

  SITEMAP_PAGE_STATE.root.innerHTML = `
    <section class="catalog-page-hero">
      <p class="catalog-page-eyebrow">Sitemap</p>
      <h1 class="catalog-page-title">Public Route Map</h1>
      <p class="catalog-page-description">Structured map of the currently published Neuroartan routes, grouped by institutional scope and continuity-model discovery surfaces.</p>
    </section>

    <section class="catalog-section">
      <div class="catalog-toolbar">
        <label class="catalog-search" for="sitemap-search-input">
          <span class="catalog-search__label">Search the sitemap</span>
          <span class="catalog-search__input-row">
            <input
              class="catalog-search__input"
              id="sitemap-search-input"
              type="search"
              name="q"
              placeholder="Search titles, paths, or keywords"
              value="${escapeHtml(query)}"
              autocomplete="off">
          </span>
        </label>
      </div>
    </section>

    <section class="catalog-section">
      ${groups.length ? groups.map((group) => `
        <div class="catalog-sitemap-group">
          <h2 class="catalog-sitemap-group__title">${escapeHtml(group.label)}</h2>
          <div class="catalog-list">
            ${group.entries.map((entry) => `
              <div class="catalog-sitemap-item">
                <a class="catalog-inline-link" href="${escapeHtml(entry.path)}">${escapeHtml(entry.title)}</a>
                <p class="catalog-sitemap-item__path">${escapeHtml(entry.path)}</p>
              </div>
            `).join('')}
          </div>
        </div>
      `).join('') : `
        <div class="catalog-empty-state">
          <h2 class="catalog-empty-state__title">No routes matched this search</h2>
          <p class="catalog-empty-state__copy">Adjust the query to search the currently published public route map.</p>
        </div>
      `}
    </section>
  `;
}

/* =============================================================================
   06) EVENTS
============================================================================= */
function bindSitemapEvents() {
  if (SITEMAP_PAGE_STATE.isBound) {
    return;
  }

  SITEMAP_PAGE_STATE.isBound = true;

  document.addEventListener('input', (event) => {
    if (!SITEMAP_PAGE_STATE.root) return;

    const input = event.target.closest('#sitemap-search-input');
    if (!(input instanceof HTMLInputElement) || !SITEMAP_PAGE_STATE.root.contains(input)) {
      return;
    }

    setQueryParam('q', input.value);
    renderSitemapPage();
  });

  window.addEventListener('popstate', renderSitemapPage);
}

/* =============================================================================
   07) INITIALIZATION
============================================================================= */
async function initSitemapPage() {
  if (!isSitemapPage()) {
    return;
  }

  SITEMAP_PAGE_STATE.root = getSitemapRoot();
  if (!SITEMAP_PAGE_STATE.root) {
    return;
  }

  const [routeIndex, contentIndex] = await Promise.all([
    fetchJson(ROUTE_INDEX_URL),
    fetchJson(CONTENT_INDEX_URL),
    loadPublicModelRegistry()
  ]);

  SITEMAP_PAGE_STATE.routes = Array.isArray(routeIndex?.routes) ? routeIndex.routes : [];
  SITEMAP_PAGE_STATE.content = Array.isArray(contentIndex?.entries) ? contentIndex.entries : [];
  bindSitemapEvents();
  renderSitemapPage();
}

void initSitemapPage();

/* =============================================================================
   08) END OF FILE
============================================================================= */
