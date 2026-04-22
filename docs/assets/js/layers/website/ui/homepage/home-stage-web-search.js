/* =========================================================
   00. FILE INDEX
   01. MODULE STATE
   02. WEB SEARCH CONSTANTS
   03. QUERY HELPERS
   04. WEB SEARCH AVAILABILITY HELPERS
   05. RESPONSE HELPERS
   06. EVENT BINDING
   07. MODULE BOOT
   ========================================================= */

import { formatActiveModelResponse } from '../../system/active-model.js';

/* =========================================================
   01. MODULE STATE
   ========================================================= */

const HOME_STAGE_WEB_SEARCH_STATE = {
  isBound: false,
};

/* =========================================================
   02. WEB SEARCH CONSTANTS
   ========================================================= */

const HOME_STAGE_WEB_SEARCH_CONFIG = Object.freeze({
  bridgeEventName: 'neuroartan:external-web-search-bridge-requested',
});

/* =========================================================
   03. QUERY HELPERS
   ========================================================= */

function normalizeHomeStageWebQuery(query) {
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

function dispatchExternalWebSearchBridge(detail) {
  document.dispatchEvent(
    new CustomEvent(HOME_STAGE_WEB_SEARCH_CONFIG.bridgeEventName, {
      detail,
    })
  );
}

/* =========================================================
   04. WEB SEARCH AVAILABILITY HELPERS
   ========================================================= */

function getHomeStageWebSearchBridge() {
  if (typeof window === 'undefined') {
    return null;
  }

  return typeof window.NeuroartanHomeStageWebSearchBridge === 'function'
    ? window.NeuroartanHomeStageWebSearchBridge
    : null;
}

async function resolveHomeStageWebSearch(query, queryId) {
  const bridge = getHomeStageWebSearchBridge();

  if (bridge) {
    try {
      const result = await bridge({
        query,
        queryId,
        source: 'homepage-voice',
      });

      if (result && typeof result.response === 'string' && result.response.trim()) {
        return {
          route: 'web',
          response: result.response.trim(),
          href: typeof result.href === 'string' ? result.href : null,
          provider: typeof result.provider === 'string' ? result.provider : 'bridge',
        };
      }
    } catch {
      return {
        route: 'web',
        response: 'Live web retrieval is connected but returned an execution error. The bridge should be audited before relying on production web results.',
        href: null,
        provider: 'bridge-error',
      };
    }
  }

  dispatchExternalWebSearchBridge({
    query,
    queryId,
    source: 'homepage-voice',
  });

  return {
    route: 'web',
    response:
      'This query is correctly routed to live web search, but no live browser or server-side web retrieval bridge is connected to the homepage engine yet.',
    href: null,
    provider: 'unbound',
  };
}

/* =========================================================
   05. RESPONSE HELPERS
   ========================================================= */

async function handleHomeStageWebSearchRequested(event) {
  const query = normalizeHomeStageWebQuery(event?.detail?.query ?? '');
  const queryId = event?.detail?.queryId ?? null;

  if (!query) {
    return;
  }

  const result = await resolveHomeStageWebSearch(query, queryId);

  dispatchHomeStageMode('responding');
  dispatchHomeStageResponse(formatActiveModelResponse('web', result.response));
  dispatchHomeStageRoutingResolved({
    query,
    queryId,
    route: 'web',
    provider: result.provider,
    href: result.href,
  });
}

/* =========================================================
   06. EVENT BINDING
   ========================================================= */

function bindHomeStageWebSearchEvents() {
  document.addEventListener(
    'neuroartan:home-stage-web-search-requested',
    (event) => {
      void handleHomeStageWebSearchRequested(event);
    }
  );
}

/* =========================================================
   07. MODULE BOOT
   ========================================================= */

function bootHomeStageWebSearch() {
  if (HOME_STAGE_WEB_SEARCH_STATE.isBound) {
    return;
  }

  HOME_STAGE_WEB_SEARCH_STATE.isBound = true;
  bindHomeStageWebSearchEvents();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootHomeStageWebSearch, { once: true });
} else {
  bootHomeStageWebSearch();
}
