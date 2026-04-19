/* =========================================================
   00. FILE INDEX
   01. MODULE STATE
   02. QUERY CONSTANTS
   03. QUERY HELPERS
   04. KNOWLEDGE MATCH HELPERS
   05. ROUTING HELPERS
   06. DELEGATION HELPERS
   07. RESPONSE RESOLUTION
   08. EVENT BINDING
   09. MODULE BOOT
   ========================================================= */

/* =========================================================
   01. MODULE STATE
   ========================================================= */

const HOME_STAGE_QUERY_ENGINE_STATE = {
  isBound: false,
  isBusy: false,
  activeQueryId: 0,
};

/* =========================================================
   02. QUERY CONSTANTS
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
  /careers/i,
  /jobs/i,
  /research/i,
  /knowledge/i,
  /updates/i,
  /about/i,
];

/* =========================================================
   03. QUERY HELPERS
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

function dispatchHomeStageResponse(response) {
  document.dispatchEvent(
    new CustomEvent('neuroartan:home-stage-voice-response', {
      detail: { response },
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

function dispatchHomeStageDelegation(eventName, detail) {
  document.dispatchEvent(new CustomEvent(eventName, { detail }));
}

/* =========================================================
   04. KNOWLEDGE MATCH HELPERS
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
   05. ROUTING HELPERS
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
   06. DELEGATION HELPERS
   ========================================================= */

function delegateHomeStageWebQuery(query, queryId) {
  dispatchHomeStageDelegation('neuroartan:home-stage-web-search-requested', {
    query,
    queryId,
    source: 'homepage-voice',
  });

  return 'This query is correctly classified for live web retrieval, but the live web-search adapter has not been connected to the homepage engine yet.';
}

function delegateHomeStageSiteKnowledgeQuery(query, queryId) {
  dispatchHomeStageDelegation('neuroartan:home-stage-site-knowledge-requested', {
    query,
    queryId,
    source: 'homepage-voice',
  });

  return 'This query is correctly classified for website knowledge retrieval, but the site knowledge index and retrieval adapter have not been connected yet.';
}

function delegateHomeStagePlatformQuery(query, queryId) {
  dispatchHomeStageDelegation('neuroartan:home-stage-platform-search-requested', {
    query,
    queryId,
    source: 'homepage-voice',
  });

  return 'This query should route into the broader platform knowledge system, but that retrieval layer has not been connected to the homepage engine yet.';
}

/* =========================================================
   07. RESPONSE RESOLUTION
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
      response: classification.response,
      query: classification.query,
      id: classification.id,
    };
  }

  if (classification.route === 'web') {
    return {
      route: 'web',
      response: delegateHomeStageWebQuery(classification.query, queryId),
      query: classification.query,
      id: null,
    };
  }

  if (classification.route === 'site-knowledge') {
    return {
      route: 'site-knowledge',
      response: delegateHomeStageSiteKnowledgeQuery(classification.query, queryId),
      query: classification.query,
      id: null,
    };
  }

  return {
    route: 'platform-search',
    response: delegateHomeStagePlatformQuery(classification.query, queryId),
    query: classification.query,
    id: null,
  };
}

function handleHomeStageQuerySubmitted(event) {
  const query = normalizeHomeStageQuery(event?.detail?.query ?? '');

  if (!query || HOME_STAGE_QUERY_ENGINE_STATE.isBusy) {
    return;
  }

  HOME_STAGE_QUERY_ENGINE_STATE.isBusy = true;
  HOME_STAGE_QUERY_ENGINE_STATE.activeQueryId += 1;
  const queryId = HOME_STAGE_QUERY_ENGINE_STATE.activeQueryId;

  dispatchHomeStageMode('thinking');

  window.setTimeout(() => {
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
    });

    dispatchHomeStageMode('responding');
    dispatchHomeStageResponse(result.response);
    HOME_STAGE_QUERY_ENGINE_STATE.isBusy = false;
  }, 420);
}

/* =========================================================
   08. EVENT BINDING
   ========================================================= */

function bindHomeStageQueryEngineEvents() {
  document.addEventListener(
    'neuroartan:home-stage-voice-query-submitted',
    handleHomeStageQuerySubmitted
  );
}

/* =========================================================
   09. MODULE BOOT
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