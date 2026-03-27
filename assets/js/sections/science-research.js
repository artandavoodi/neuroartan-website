// SECTION: SCIENCE RESEARCH PAGE CONTROLLER
// PURPOSE: Provide the canonical runtime scaffold for science-facing research pages.
// SCOPE: PTW-aligned page initialization, search-index awareness, and future section expansion.

(() => {
  'use strict';

  // SECTION: CONSTANTS
  const SECTION_ID = 'science_research';
  const SEARCH_ROUTE_INDEX_URL = '/assets/data/search/route-index.json';
  const SEARCH_CONTENT_INDEX_URL = '/assets/data/search/content-index.json';
  const SEARCH_ENTITY_INDEX_URL = '/assets/data/search/entity-index.json';

  // SECTION: STATE
  const state = {
    routeIndex: null,
    contentIndex: null,
    entityIndex: null,
    isReady: false
  };

  // SECTION: HELPERS
  function emit(name, detail = {}) {
    window.dispatchEvent(new CustomEvent(name, { detail }));
  }

  function getSectionRoot() {
    return document.querySelector('[data-page="science-research"]');
  }

  async function fetchJson(url) {
    const response = await fetch(url, { cache: 'no-cache' });
    if (!response.ok) {
      throw new Error(`Failed to load ${url} (${response.status})`);
    }
    return response.json();
  }

  // SECTION: INDEX LOADERS
  async function loadSearchIndexes() {
    const [routeIndex, contentIndex, entityIndex] = await Promise.all([
      fetchJson(SEARCH_ROUTE_INDEX_URL),
      fetchJson(SEARCH_CONTENT_INDEX_URL),
      fetchJson(SEARCH_ENTITY_INDEX_URL)
    ]);

    state.routeIndex = routeIndex;
    state.contentIndex = contentIndex;
    state.entityIndex = entityIndex;
  }

  // SECTION: PAGE REGISTRATION
  function registerPageState() {
    const root = getSectionRoot();
    if (!root) return;

    root.setAttribute('data-section-ready', 'true');
    root.setAttribute('data-section-id', SECTION_ID);
    root.setAttribute('data-route-index-loaded', String(Boolean(state.routeIndex)));
    root.setAttribute('data-content-index-loaded', String(Boolean(state.contentIndex)));
    root.setAttribute('data-entity-index-loaded', String(Boolean(state.entityIndex)));
  }

  // SECTION: BOOTSTRAP
  async function boot() {
    try {
      await loadSearchIndexes();
      registerPageState();
      state.isReady = true;

      emit('neuroartan:science-research:ready', {
        sectionId: SECTION_ID,
        routeCount: Array.isArray(state.routeIndex?.routes) ? state.routeIndex.routes.length : 0,
        contentCount: Array.isArray(state.contentIndex?.entries) ? state.contentIndex.entries.length : 0,
        entityCount: Array.isArray(state.entityIndex?.entities) ? state.entityIndex.entities.length : 0
      });
    } catch (error) {
      console.error('[Science Research] Initialization failed.', error);
      emit('neuroartan:science-research:error', {
        sectionId: SECTION_ID,
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }

  // SECTION: INITIALIZATION
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();