/* =========================================================
   00. FILE INDEX
   01. MODULE STATE
   02. SITE KNOWLEDGE SOURCES
   03. QUERY HELPERS
   04. DATA LOADER HELPERS
   05. MATCH HELPERS
   06. RESPONSE HELPERS
   07. EVENT BINDING
   08. MODULE BOOT
   ========================================================= */

import { formatActiveModelResponse } from '../../system/active-model.js';

/* =========================================================
   01. MODULE STATE
   ========================================================= */

const HOME_STAGE_SITE_KNOWLEDGE_STATE = {
  isBound: false,
  dataLoaded: false,
  loadingPromise: null,
  contentIndex: [],
  entityIndex: [],
  routeIndex: [],
};

/* =========================================================
   02. SITE KNOWLEDGE SOURCES
   ========================================================= */

const HOME_STAGE_SITE_KNOWLEDGE_SOURCES = Object.freeze({
  contentIndex: '/assets/data/search/content-index.json',
  entityIndex: '/assets/data/search/entity-index.json',
  routeIndex: '/assets/data/search/route-index.json',
});

/* =========================================================
   03. QUERY HELPERS
   ========================================================= */

function normalizeHomeStageSiteKnowledgeQuery(query) {
  return typeof query === 'string' ? query.trim() : '';
}

function tokenizeHomeStageSiteKnowledgeQuery(query) {
  return normalizeHomeStageSiteKnowledgeQuery(query)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/gi, ' ')
    .split(/\s+/)
    .filter(Boolean);
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

/* =========================================================
   04. DATA LOADER HELPERS
   ========================================================= */

async function fetchHomeStageKnowledgeJson(path) {
  const response = await fetch(path, { credentials: 'same-origin' });

  if (!response.ok) {
    throw new Error(`Failed to load ${path} (${response.status})`);
  }

  return response.json();
}

function normalizeHomeStageKnowledgeArray(value, preferredKey = '') {
  if (Array.isArray(value)) {
    return value;
  }

  if (value && typeof value === 'object') {
    if (preferredKey && Array.isArray(value[preferredKey])) {
      return value[preferredKey];
    }

    if (Array.isArray(value.entries)) return value.entries;
    if (Array.isArray(value.entities)) return value.entities;
    if (Array.isArray(value.routes)) return value.routes;
  }

  return [];
}

async function loadHomeStageSiteKnowledgeData() {
  if (HOME_STAGE_SITE_KNOWLEDGE_STATE.dataLoaded) {
    return;
  }

  if (HOME_STAGE_SITE_KNOWLEDGE_STATE.loadingPromise) {
    await HOME_STAGE_SITE_KNOWLEDGE_STATE.loadingPromise;
    return;
  }

  HOME_STAGE_SITE_KNOWLEDGE_STATE.loadingPromise = Promise.all([
    fetchHomeStageKnowledgeJson(HOME_STAGE_SITE_KNOWLEDGE_SOURCES.contentIndex),
    fetchHomeStageKnowledgeJson(HOME_STAGE_SITE_KNOWLEDGE_SOURCES.entityIndex),
    fetchHomeStageKnowledgeJson(HOME_STAGE_SITE_KNOWLEDGE_SOURCES.routeIndex),
  ])
    .then(([contentIndex, entityIndex, routeIndex]) => {
      HOME_STAGE_SITE_KNOWLEDGE_STATE.contentIndex = normalizeHomeStageKnowledgeArray(contentIndex, 'entries');
      HOME_STAGE_SITE_KNOWLEDGE_STATE.entityIndex = normalizeHomeStageKnowledgeArray(entityIndex, 'entities');
      HOME_STAGE_SITE_KNOWLEDGE_STATE.routeIndex = normalizeHomeStageKnowledgeArray(routeIndex, 'routes');
      HOME_STAGE_SITE_KNOWLEDGE_STATE.dataLoaded = true;
    })
    .catch(() => {
      HOME_STAGE_SITE_KNOWLEDGE_STATE.contentIndex = [];
      HOME_STAGE_SITE_KNOWLEDGE_STATE.entityIndex = [];
      HOME_STAGE_SITE_KNOWLEDGE_STATE.routeIndex = [];
      HOME_STAGE_SITE_KNOWLEDGE_STATE.dataLoaded = false;
    })
    .finally(() => {
      HOME_STAGE_SITE_KNOWLEDGE_STATE.loadingPromise = null;
    });

  await HOME_STAGE_SITE_KNOWLEDGE_STATE.loadingPromise;
}

/* =========================================================
   05. MATCH HELPERS
   ========================================================= */

function getHomeStageCandidateText(entry) {
  if (!entry || typeof entry !== 'object') {
    return '';
  }

  return [
    entry.title,
    entry.name,
    entry.label,
    entry.slug,
    entry.description,
    entry.summary,
    entry.excerpt,
    entry.path,
    entry.href,
    entry.scope,
    entry.type,
    Array.isArray(entry.tags) ? entry.tags.join(' ') : '',
    Array.isArray(entry.keywords) ? entry.keywords.join(' ') : '',
    Array.isArray(entry.entities) ? entry.entities.join(' ') : '',
  ]
    .filter((value) => typeof value === 'string' && value.trim())
    .join(' ')
    .toLowerCase();
}

function scoreHomeStageCandidate(tokens, entry) {
  const haystack = getHomeStageCandidateText(entry);

  if (!haystack) {
    return 0;
  }

  let score = 0;

  for (const token of tokens) {
    if (!token) {
      continue;
    }

    if (haystack.includes(token)) {
      score += 1;
    }
  }

  return score;
}

function buildHomeStageKnowledgePool() {
  return [
    ...HOME_STAGE_SITE_KNOWLEDGE_STATE.contentIndex,
    ...HOME_STAGE_SITE_KNOWLEDGE_STATE.entityIndex,
    ...HOME_STAGE_SITE_KNOWLEDGE_STATE.routeIndex,
  ];
}

function resolveHomeStageSiteKnowledgeMatch(query) {
  const tokens = tokenizeHomeStageSiteKnowledgeQuery(query);
  const pool = buildHomeStageKnowledgePool();

  if (!tokens.length || !pool.length) {
    return null;
  }

  let bestEntry = null;
  let bestScore = 0;

  for (const entry of pool) {
    const score = scoreHomeStageCandidate(tokens, entry);

    if (score > bestScore) {
      bestScore = score;
      bestEntry = entry;
    }
  }

  if (!bestEntry || bestScore === 0) {
    return null;
  }

  return {
    entry: bestEntry,
    score: bestScore,
  };
}

/* =========================================================
   06. RESPONSE HELPERS
   ========================================================= */

function getHomeStageEntryTitle(entry) {
  return entry?.title || entry?.name || entry?.label || 'this area';
}

function getHomeStageEntryHref(entry) {
  return entry?.href || entry?.path || null;
}

function getHomeStageEntryDescription(entry) {
  return (
    entry?.description ||
    entry?.summary ||
    entry?.excerpt ||
    `${getHomeStageEntryTitle(entry)} is part of the structured Neuroartan website knowledge surface.`
  );
}

function buildHomeStageSiteKnowledgeResponse(match) {
  if (!match?.entry) {
    return 'I could not match that request to the current website knowledge index yet. The retrieval engine is now connected to the real site data files, but this query did not resolve to a confident result.';
  }

  const title = getHomeStageEntryTitle(match.entry);
  const description = getHomeStageEntryDescription(match.entry);
  const href = getHomeStageEntryHref(match.entry);

  return `${description} You can continue through ${title}${href ? ` at ${href}.` : '.'}`;
}

async function handleHomeStageSiteKnowledgeRequested(event) {
  const query = normalizeHomeStageSiteKnowledgeQuery(event?.detail?.query ?? '');
  const queryId = event?.detail?.queryId ?? null;

  if (!query) {
    return;
  }

  await loadHomeStageSiteKnowledgeData();

  const match = resolveHomeStageSiteKnowledgeMatch(query);
  const response = buildHomeStageSiteKnowledgeResponse(match);

  dispatchHomeStageMode('responding');
  dispatchHomeStageResponse(formatActiveModelResponse('site-knowledge', response));
  dispatchHomeStageRoutingResolved({
    query,
    queryId,
    route: 'site-knowledge',
    id: match?.entry?.id ?? match?.entry?.slug ?? null,
    href: getHomeStageEntryHref(match?.entry),
    score: match?.score ?? 0,
  });
}

/* =========================================================
   07. EVENT BINDING
   ========================================================= */

function bindHomeStageSiteKnowledgeEvents() {
  document.addEventListener(
    'neuroartan:home-stage-site-knowledge-requested',
    (event) => {
      void handleHomeStageSiteKnowledgeRequested(event);
    }
  );
}

/* =========================================================
   08. MODULE BOOT
   ========================================================= */

function bootHomeStageSiteKnowledge() {
  if (HOME_STAGE_SITE_KNOWLEDGE_STATE.isBound) {
    return;
  }

  HOME_STAGE_SITE_KNOWLEDGE_STATE.isBound = true;
  bindHomeStageSiteKnowledgeEvents();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootHomeStageSiteKnowledge, { once: true });
} else {
  bootHomeStageSiteKnowledge();
}
