/* =========================================================
   00. FILE INDEX
   01. IMPORTS
   02. MODULE STATE
   03. QUERY CONSTANTS
   04. QUERY HELPERS
   05. KNOWLEDGE MATCH HELPERS
   06. ROUTING HELPERS
   07. DELEGATION HELPERS
   08. RESPONSE RESOLUTION
   09. EVENT BINDING
   10. MODULE BOOT
   ========================================================= */

/* =========================================================
   01. IMPORTS
   ========================================================= */

import {
  formatActiveModelResponse,
  getActiveModelRoutingContext
} from '../../system/active-model.js';

/* =========================================================
   02. MODULE STATE
   ========================================================= */

const HOME_STAGE_QUERY_ENGINE_STATE = {
  isBound: false,
  isBusy: false,
  activeQueryId: 0,
};

/* =========================================================
   03. QUERY CONSTANTS
   ========================================================= */

const HOME_STAGE_QUERY_KNOWLEDGE = [
  {
    id: 'what-is-neuroartan',
    patterns: [
      /what\s+is\s+neuroartan/i,
      /who\s+is\s+neuroartan/i,
      /tell\s+me\s+about\s+neuroartan/i,
    ],
    response:
      'Neuroartan is building a governed cognitive system for voice-first reflection, continuity, and structured intelligence.',
  },
  {
    id: 'what-is-icos',
    patterns: [
      /what\s+is\s+icos/i,
      /tell\s+me\s+about\s+icos/i,
      /how\s+does\s+icos\s+work/i,
    ],
    response:
      'ICOS is the profile-based continuity layer of the Neuroartan direction, where voice, cognition, reflection, and long-term pattern continuity become structurally meaningful.',
  },
  {
    id: 'what-can-i-do-here',
    patterns: [
      /what\s+can\s+i\s+do\s+here/i,
      /what\s+does\s+this\s+do/i,
      /how\s+does\s+this\s+work/i,
    ],
    response:
      'This homepage is becoming your first interaction surface: speak, ask, reflect, and the system will guide you into the platform, the product, and later deeper cognitive interaction.',
  },
  {
    id: 'platform',
    patterns: [/platform/i, /product/i, /system/i],
    response:
      'The platform direction is a modular, voice-oriented cognitive system built around profile continuity, guided reflection, and structured interaction rather than static chatbot behavior.',
  },
];

const HOME_STAGE_QUERY_WEB_HINT_PATTERNS = [
  /today/i,
  /latest/i,
  /recent/i,
  /news/i,
  /current/i,
  /price/i,
  /weather/i,
  /stock/i,
  /president/i,
  /who won/i,
  /score/i,
  /search the web/i,
  /look up/i,
  /google/i,
];

const HOME_STAGE_QUERY_SITE_HINT_PATTERNS = [
  /website/i,
  /platform/i,
  /product/i,
  /neuroartan/i,
  /icos/i,
  /profile/i,
  /profiles/i,
  /model/i,
  /models/i,
  /continuity/i,
  /history/i,
  /leadership/i,
  /sitemap/i,
  /careers/i,
  /jobs/i,
  /research/i,
  /knowledge/i,
  /updates/i,
  /about/i,
];

/* =========================================================
   04. QUERY HELPERS
   ========================================================= */

function normalizeHomeStageQuery(query) {
  return typeof query === 'string' ? query.trim() : '';
}

function dispatchHomeStageMode(mode) {
  document.dispatchEvent(
    new CustomEvent('neuroartan:home-stage-voice-mode', {
      detail: { mode },
    })
  );
}

function dispatchHomeStageTranscript(transcript) {
  document.dispatchEvent(
    new CustomEvent('neuroartan:home-stage-voice-transcript', {
      detail: { transcript },
    })
  );
}

function dispatchHomeStageResponse(response, queryId = null) {
  document.dispatchEvent(
    new CustomEvent('neuroartan:home-stage-voice-response', {
      detail: { response, queryId },
    })
  );
}

function dispatchHomeStageRouting(result) {
  document.dispatchEvent(
    new CustomEvent('neuroartan:home-stage-query-routing', {
      detail: result,
    })
  );
}

function resolveHomeStageDelegatedResponse(route, query) {
  const normalizedQuery = normalizeHomeStageQuery(query);

  switch (route) {
    case 'web':
      return formatActiveModelResponse(
        'web',
        `I can route this as a current-information request: “${normalizedQuery}”. Live web retrieval should be handled by the governed web-search layer when connected.`
      );
    case 'site-knowledge':
      return formatActiveModelResponse(
        'site-knowledge',
        `I can search the Neuroartan website and platform surface for: “${normalizedQuery}”. The next implementation step is to connect this route to the governed site-knowledge index.`
      );
    case 'platform-search':
    default:
      return formatActiveModelResponse(
        'platform-search',
        `I received your request: “${normalizedQuery}”. The homepage interaction layer is now routing this into the active model pathway.`
      );
  }
}

function dispatchHomeStageDelegation(eventName, detail) {
  document.dispatchEvent(new CustomEvent(eventName, { detail }));
}

/* =========================================================
   05. KNOWLEDGE MATCH HELPERS
   ========================================================= */

function resolveHomeStageKnowledgeMatch(query) {
  for (const entry of HOME_STAGE_QUERY_KNOWLEDGE) {
    if (entry.patterns.some((pattern) => pattern.test(query))) {
      return {
        route: 'knowledge',
        id: entry.id,
        response: entry.response,
      };
    }
  }

  return null;
}

function resolveHomeStageNeedsWeb(query) {
  return HOME_STAGE_QUERY_WEB_HINT_PATTERNS.some((pattern) => pattern.test(query));
}

function resolveHomeStageNeedsSiteKnowledge(query) {
  return HOME_STAGE_QUERY_SITE_HINT_PATTERNS.some((pattern) => pattern.test(query));
}

/* =========================================================
   06. ROUTING HELPERS
   ========================================================= */

function classifyHomeStageQuery(query) {
  const normalizedQuery = normalizeHomeStageQuery(query);

  if (!normalizedQuery) {
    return {
      route: 'empty',
      query: '',
    };
  }

  const knowledgeMatch = resolveHomeStageKnowledgeMatch(normalizedQuery);
  if (knowledgeMatch) {
    return {
      route: 'knowledge',
      query: normalizedQuery,
      id: knowledgeMatch.id,
      response: knowledgeMatch.response,
    };
  }

  if (resolveHomeStageNeedsWeb(normalizedQuery)) {
    return {
      route: 'web',
      query: normalizedQuery,
    };
  }

  if (resolveHomeStageNeedsSiteKnowledge(normalizedQuery)) {
    return {
      route: 'site-knowledge',
      query: normalizedQuery,
    };
  }

  return {
    route: 'platform-search',
    query: normalizedQuery,
  };
}

/* =========================================================
   07. DELEGATION HELPERS
   ========================================================= */

function delegateHomeStageWebQuery(query, queryId) {
  dispatchHomeStageDelegation('neuroartan:home-stage-web-search-requested', {
    query,
    queryId,
    source: 'homepage-voice',
  });

  return '';
}

function delegateHomeStageSiteKnowledgeQuery(query, queryId) {
  dispatchHomeStageDelegation('neuroartan:home-stage-site-knowledge-requested', {
    query,
    queryId,
    source: 'homepage-voice',
  });

  return '';
}

function delegateHomeStagePlatformQuery(query, queryId) {
  dispatchHomeStageDelegation('neuroartan:home-stage-platform-search-requested', {
    query,
    queryId,
    source: 'homepage-voice',
  });

  return '';
}

/* =========================================================
   08. RESPONSE RESOLUTION
   ========================================================= */

function resolveHomeStageQuery(query, queryId) {
  const classification = classifyHomeStageQuery(query);

  if (classification.route === 'empty') {
    return {
      route: 'empty',
      response: '',
      query: '',
      id: null,
    };
  }

  if (classification.route === 'knowledge') {
    return {
      route: 'knowledge',
      response: formatActiveModelResponse('knowledge', classification.response),
      query: classification.query,
      id: classification.id,
    };
  }

  if (classification.route === 'web') {
    return {
      route: 'web',
      response: delegateHomeStageWebQuery(classification.query, queryId) || resolveHomeStageDelegatedResponse('web', classification.query),
      query: classification.query,
      id: null,
    };
  }

  if (classification.route === 'site-knowledge') {
    return {
      route: 'site-knowledge',
      response: delegateHomeStageSiteKnowledgeQuery(classification.query, queryId) || resolveHomeStageDelegatedResponse('site-knowledge', classification.query),
      query: classification.query,
      id: null,
    };
  }

  return {
    route: 'platform-search',
    response: delegateHomeStagePlatformQuery(classification.query, queryId) || resolveHomeStageDelegatedResponse('platform-search', classification.query),
    query: classification.query,
    id: null,
  };
}

function handleHomeStageQuerySubmitted(event) {
  const query = normalizeHomeStageQuery(event?.detail?.query ?? '');
  const source = normalizeHomeStageQuery(event?.detail?.source ?? 'homepage-interaction');

  if (!query || HOME_STAGE_QUERY_ENGINE_STATE.isBusy) {
    return;
  }

  HOME_STAGE_QUERY_ENGINE_STATE.isBusy = true;
  HOME_STAGE_QUERY_ENGINE_STATE.activeQueryId += 1;
  const queryId = HOME_STAGE_QUERY_ENGINE_STATE.activeQueryId;

  dispatchHomeStageMode('thinking');
  dispatchHomeStageTranscript(query);
  dispatchHomeStageResponse('', queryId);

  window.setTimeout(() => {
    if (queryId !== HOME_STAGE_QUERY_ENGINE_STATE.activeQueryId) {
      return;
    }

    const result = resolveHomeStageQuery(query, queryId);

    if (result.route === 'empty') {
      dispatchHomeStageMode('idle');
      HOME_STAGE_QUERY_ENGINE_STATE.isBusy = false;
      return;
    }

    dispatchHomeStageRouting({
      query: result.query,
      queryId,
      route: result.route,
      id: result.id || null,
      source,
      ...getActiveModelRoutingContext(result.route),
    });

    dispatchHomeStageMode('responding');
    dispatchHomeStageResponse(result.response || '', queryId);
    HOME_STAGE_QUERY_ENGINE_STATE.isBusy = false;
  }, 420);
}

/* =========================================================
   09. EVENT BINDING
   ========================================================= */

function bindHomeStageQueryEngineEvents() {
  document.addEventListener(
    'neuroartan:home-stage-voice-query-submitted',
    handleHomeStageQuerySubmitted
  );

  document.addEventListener('neuroartan:home-stage-reset-requested', () => {
    HOME_STAGE_QUERY_ENGINE_STATE.isBusy = false;
    HOME_STAGE_QUERY_ENGINE_STATE.activeQueryId += 1;
    dispatchHomeStageMode('idle');
    dispatchHomeStageTranscript('');
    dispatchHomeStageResponse('', HOME_STAGE_QUERY_ENGINE_STATE.activeQueryId);
  });
}

/* =========================================================
   10. MODULE BOOT
   ========================================================= */

function bootHomeStageQueryEngine() {
  if (HOME_STAGE_QUERY_ENGINE_STATE.isBound) {
    return;
  }

  HOME_STAGE_QUERY_ENGINE_STATE.isBound = true;
  bindHomeStageQueryEngineEvents();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootHomeStageQueryEngine, { once: true });
} else {
  bootHomeStageQueryEngine();
}
