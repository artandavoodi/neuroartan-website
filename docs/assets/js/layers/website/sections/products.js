/* =============================================================================
   00) FILE INDEX
   01) MODULE IDENTITY
   02) CONSTANTS
   03) STATE
   04) HELPERS
   05) INDEX LOADERS
   06) PAGE REGISTRATION
   07) BOOTSTRAP
   08) INITIALIZATION
============================================================================= */

/* =============================================================================
   01) MODULE IDENTITY
============================================================================= */
(() => {
  'use strict';

  /* =============================================================================
     02) CONSTANTS
  ============================================================================= */
  const SECTION_ID = 'products';
  const SEARCH_ROUTE_INDEX_URL = '/assets/data/search/route-index.json';
  const SEARCH_CONTENT_INDEX_URL = '/assets/data/search/content-index.json';
  const SEARCH_ENTITY_INDEX_URL = '/assets/data/search/entity-index.json';

  /* =============================================================================
     03) STATE
  ============================================================================= */
  const state = {
    routeIndex: null,
    contentIndex: null,
    entityIndex: null,
    isReady: false
  };

  /* =============================================================================
     04) HELPERS
  ============================================================================= */
  function emit(name, detail = {}) {
    window.dispatchEvent(new CustomEvent(name, { detail }));
  }

  function getSectionRoot() {
    return document.querySelector('[data-page="products"]');
  }

  async function fetchJson(url) {
    const response = await fetch(url, { cache: 'no-cache' });
    if (!response.ok) {
      throw new Error(`Failed to load ${url}: HTTP ${response.status}`);
    }
    return response.json();
  }

  /* =============================================================================
     05) INDEX LOADERS
  ============================================================================= */
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

  /* =============================================================================
     06) PAGE REGISTRATION
  ============================================================================= */
  function registerPageState() {
    const root = getSectionRoot();
    if (!root) return;

    root.setAttribute('data-section-id', SECTION_ID);
    root.setAttribute('data-route-index-loaded', String(Boolean(state.routeIndex)));
    root.setAttribute('data-content-index-loaded', String(Boolean(state.contentIndex)));
    root.setAttribute('data-entity-index-loaded', String(Boolean(state.entityIndex)));
  }

  /* =============================================================================
     07) BOOTSTRAP
  ============================================================================= */
  async function boot() {
    try {
      await loadSearchIndexes();
      registerPageState();
      state.isReady = true;
      emit('neuroartan:section:ready', { section: SECTION_ID });
    } catch (error) {
      console.error('[products] bootstrap failed', error);
      emit('neuroartan:section:error', {
        section: SECTION_ID,
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /* =============================================================================
     08) INITIALIZATION
  ============================================================================= */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();