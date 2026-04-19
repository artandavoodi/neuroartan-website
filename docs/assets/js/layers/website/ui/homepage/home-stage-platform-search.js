/* =========================================================
   00. FILE INDEX
   01. MODULE STATE
   02. PLATFORM SEARCH CONSTANTS
   03. QUERY HELPERS
   04. PLATFORM SEARCH AVAILABILITY HELPERS
   05. RESPONSE HELPERS
   06. EVENT BINDING
   07. MODULE BOOT
   ========================================================= */

/* =========================================================
   01. MODULE STATE
   ========================================================= */

const HOME_STAGE_PLATFORM_SEARCH_STATE = {
  isBound: false,
};

/* =========================================================
   02. PLATFORM SEARCH CONSTANTS
   ========================================================= */

const HOME_STAGE_PLATFORM_SEARCH_CONFIG = Object.freeze({
  bridgeEventName: 'neuroartan:external-platform-search-bridge-requested',
});

/* =========================================================
   03. QUERY HELPERS
   ========================================================= */

function normalizeHomeStagePlatformQuery(query) {
  return typeof query === 'string' ? query.trim() : '';
}

function dispatchHomeStageMode(mode) {
  document.dispatchEvent(
    new CustomEvent('neuroartan:home-stage-voice-mode', {
      detail: { mode },
    })
  );
}

function dispatchHomeStageResponse(response) {
  document.dispatchEvent(
    new CustomEvent('neuroartan:home-stage-voice-response', {
      detail: { response },
    })
  );
}

function dispatchHomeStageRoutingResolved(detail) {
  document.dispatchEvent(
    new CustomEvent('neuroartan:home-stage-routing-resolved', {
      detail,
    })
  );
}

function dispatchExternalPlatformSearchBridge(detail) {
  document.dispatchEvent(
    new CustomEvent(HOME_STAGE_PLATFORM_SEARCH_CONFIG.bridgeEventName, {
      detail,
    })
  );
}

/* =========================================================
   04. PLATFORM SEARCH AVAILABILITY HELPERS
   ========================================================= */

function getHomeStagePlatformSearchBridge() {
  if (typeof window === 'undefined') {
    return null;
  }

  return typeof window.NeuroartanHomeStagePlatformSearchBridge === 'function'
    ? window.NeuroartanHomeStagePlatformSearchBridge
    : null;
}

async function resolveHomeStagePlatformSearch(query, queryId) {
  const bridge = getHomeStagePlatformSearchBridge();

  if (bridge) {
    try {
      const result = await bridge({
        query,
        queryId,
        source: 'homepage-voice',
      });

      if (result && typeof result.response === 'string' && result.response.trim()) {
        return {
          route: 'platform-search',
          response: result.response.trim(),
          href: typeof result.href === 'string' ? result.href : null,
          provider: typeof result.provider === 'string' ? result.provider : 'bridge',
        };
      }
    } catch {
      return {
        route: 'platform-search',
        response: 'Platform retrieval is connected but returned an execution error. The platform-search bridge should be audited before production use.',
        href: null,
        provider: 'bridge-error',
      };
    }
  }

  dispatchExternalPlatformSearchBridge({
    query,
    queryId,
    source: 'homepage-voice',
  });

  return {
    route: 'platform-search',
    response:
      'This query is correctly routed to the broader platform-search layer, but no live platform retrieval bridge is connected to the homepage engine yet.',
    href: null,
    provider: 'unbound',
  };
}

/* =========================================================
   05. RESPONSE HELPERS
   ========================================================= */

async function handleHomeStagePlatformSearchRequested(event) {
  const query = normalizeHomeStagePlatformQuery(event?.detail?.query ?? '');
  const queryId = event?.detail?.queryId ?? null;

  if (!query) {
    return;
  }

  const result = await resolveHomeStagePlatformSearch(query, queryId);

  dispatchHomeStageMode('responding');
  dispatchHomeStageResponse(result.response);
  dispatchHomeStageRoutingResolved({
    query,
    queryId,
    route: 'platform-search',
    provider: result.provider,
    href: result.href,
  });
}

/* =========================================================
   06. EVENT BINDING
   ========================================================= */

function bindHomeStagePlatformSearchEvents() {
  document.addEventListener(
    'neuroartan:home-stage-platform-search-requested',
    (event) => {
      void handleHomeStagePlatformSearchRequested(event);
    }
  );
}

/* =========================================================
   07. MODULE BOOT
   ========================================================= */

function bootHomeStagePlatformSearch() {
  if (HOME_STAGE_PLATFORM_SEARCH_STATE.isBound) {
    return;
  }

  HOME_STAGE_PLATFORM_SEARCH_STATE.isBound = true;
  bindHomeStagePlatformSearchEvents();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootHomeStagePlatformSearch, { once: true });
} else {
  bootHomeStagePlatformSearch();
}