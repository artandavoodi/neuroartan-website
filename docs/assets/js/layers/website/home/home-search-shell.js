/* =========================================================
   00. FILE INDEX
   01. IMPORTS
   02. MODULE STATE
   03. DOM HELPERS
   04. SEARCH DATA HELPERS
   05. SEARCH RENDER HELPERS
   06. QUERY HELPERS
   07. EVENT BINDING
   08. MODULE BOOT
   ========================================================= */

/* =========================================================
   01. IMPORTS
   ========================================================= */

import {
  activatePublicModel,
  getActiveModelState,
  subscribeActiveModelState
} from '../system/active-model.js';
import {
  createSpeechInputController,
  hasSpeechInputSupport
} from '../../../core/02-systems/speech-input.js';
import {
  getPublicModels,
  loadPublicModelRegistry
} from '../system/public-model-registry.js';

/* =========================================================
   02. MODULE STATE
   ========================================================= */

const HOME_SEARCH_SHELL_STATE = {
  isBound: false,
  isOpen: false,
  root: null,
  query: '',
  mode: 'search',
  dataReady: false,
  loadingPromise: null,
  indexedEntries: [],
  speechController: null,
};

const HOME_SEARCH_SHELL_INDEX_SOURCES = Object.freeze({
  routeIndex: '/assets/data/search/route-index.json',
  contentIndex: '/assets/data/search/content-index.json',
  entityIndex: '/assets/data/search/entity-index.json',
});

/* =========================================================
   03. DOM HELPERS
   ========================================================= */

function getHomeSearchShellNodes() {
  return {
    shell: document.querySelector('#home-search-shell'),
    input: document.querySelector('#home-search-shell-input'),
    form: document.querySelector('#home-search-shell-form'),
    close: document.querySelector('#home-search-shell-close'),
    voiceButton: document.querySelector('#home-search-shell-voice-button'),
    results: document.querySelector('#home-search-shell-results'),
    chips: Array.from(document.querySelectorAll('[data-home-search-chip]')),
  };
}

function getLiveSearchShellRoot() {
  return document.querySelector('#home-search-shell');
}

function dispatchHomeSearchEvent(name, detail = {}) {
  document.dispatchEvent(new CustomEvent(name, { detail }));
}

function fetchHomeSearchJson(path) {
  return fetch(path, {
    cache: 'no-store',
    credentials: 'same-origin'
  }).then((response) => {
    if (!response.ok) {
      throw new Error(`Failed to load ${path}: HTTP ${response.status}`);
    }

    return response.json();
  });
}

/* =========================================================
   04. SEARCH DATA HELPERS
   ========================================================= */

function normalizeHomeSearchQuery(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function escapeHomeSearchHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function normalizeHomeSearchArray(value, preferredKey = '') {
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

function uniqueHomeSearchStrings(values = []) {
  return Array.from(new Set(values.map((value) => normalizeHomeSearchQuery(value)).filter(Boolean)));
}

function getSearchScopeLabel(scope = '') {
  switch (normalizeHomeSearchQuery(scope).toLowerCase()) {
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
    case 'profiles':
      return 'Profiles';
    case 'account':
      return 'Account';
    case 'organization':
      return 'Organization';
    case 'profile':
      return 'Profile';
    default:
      return 'Platform';
  }
}

function getActiveModelLabel() {
  const activeModel = getActiveModelState().activeModel;
  return activeModel?.engine?.label || activeModel?.display_name || activeModel?.search_title || 'the active model';
}

function isVerifiedHomeSearchModel(model = {}) {
  const trust = [
    model.trust_classification,
    ...(Array.isArray(model.reliability_signals) ? model.reliability_signals : [])
  ].join(' ');

  return /verified|governed|self-authored/i.test(trust);
}

function buildIndexedEntry(entry = {}, {
  keyPrefix = 'entry',
  kind = 'route',
  scope = '',
  title = '',
  summary = '',
  href = '',
  keywords = []
} = {}) {
  const normalizedTitle = normalizeHomeSearchQuery(title || entry.title || entry.label || entry.name || '');
  const normalizedHref = normalizeHomeSearchQuery(href || entry.path || entry.href || '');
  const normalizedSummary = normalizeHomeSearchQuery(summary || entry.description || entry.summary || entry.excerpt || '');
  const normalizedScope = normalizeHomeSearchQuery(scope || entry.scope || entry.type || '');
  const normalizedKeywords = uniqueHomeSearchStrings([
    ...(Array.isArray(entry.keywords) ? entry.keywords : []),
    ...(Array.isArray(keywords) ? keywords : [])
  ]);

  if (!normalizedTitle && !normalizedHref) {
    return null;
  }

  return {
    key: `${keyPrefix}:${normalizeHomeSearchQuery(entry.id || normalizedHref || normalizedTitle)}`,
    kind,
    title: normalizedTitle,
    eyebrow: getSearchScopeLabel(normalizedScope),
    summary: normalizedSummary,
    href: normalizedHref,
    publicRoute: '',
    activateModelId: '',
    queryLabel: '',
    keywords: normalizedKeywords,
    scoreTokens: uniqueHomeSearchStrings([
      normalizedTitle,
      normalizedHref,
      normalizedSummary,
      normalizedScope,
      ...normalizedKeywords
    ]).join(' ').toLowerCase()
  };
}

function buildCuratedSurfaceEntries() {
  return [
    {
      key: 'surface:profiles',
      kind: 'surface',
      title: 'Continuity Models',
      eyebrow: 'Profiles',
      summary: 'Search searchable public continuity models, public routes, and guided training signals.',
      href: '/pages/profiles/index.html',
      publicRoute: '',
      activateModelId: '',
      queryLabel: '',
      keywords: ['profiles', 'continuity models', 'public routes', 'model search'],
      scoreTokens: 'continuity models profiles public routes model search'
    },
    {
      key: 'surface:leadership',
      kind: 'surface',
      title: 'Leadership',
      eyebrow: 'Institutional',
      summary: 'Founder-first leadership surface linked to the real public continuity route.',
      href: '/pages/company/leadership/index.html',
      publicRoute: '',
      activateModelId: '',
      queryLabel: '',
      keywords: ['leadership', 'founder', 'artan', 'company'],
      scoreTokens: 'leadership founder artan company'
    },
    {
      key: 'surface:careers',
      kind: 'surface',
      title: 'Careers',
      eyebrow: 'Institutional',
      summary: 'Governed roles, recruitment process, departments, and operating culture.',
      href: '/pages/careers/index.html',
      publicRoute: '',
      activateModelId: '',
      queryLabel: '',
      keywords: ['careers', 'jobs', 'roles', 'hiring'],
      scoreTokens: 'careers jobs roles hiring'
    },
    {
      key: 'surface:history',
      kind: 'surface',
      title: 'Continuity History',
      eyebrow: 'Platform',
      summary: 'Searchable continuity archive for product-definition and public-system milestones.',
      href: '/pages/continuity-history/index.html',
      publicRoute: '',
      activateModelId: '',
      queryLabel: '',
      keywords: ['continuity history', 'history', 'archive', 'timeline'],
      scoreTokens: 'continuity history history archive timeline'
    },
    {
      key: 'surface:sitemap',
      kind: 'surface',
      title: 'Sitemap',
      eyebrow: 'Platform',
      summary: 'Structured route map of the currently published public surfaces.',
      href: '/pages/sitemap/index.html',
      publicRoute: '',
      activateModelId: '',
      queryLabel: '',
      keywords: ['sitemap', 'route map', 'navigation'],
      scoreTokens: 'sitemap route map navigation'
    }
  ];
}

function buildModelSearchEntries() {
  return getPublicModels().map((model) => ({
    key: `model:${model.id}`,
    kind: 'model',
    title: model.display_name || model.search_title || 'Continuity Model',
    eyebrow: 'Continuity model',
    summary: normalizeHomeSearchQuery(model.description || ''),
    href: normalizeHomeSearchQuery(model.page_route || '/pages/profiles/index.html'),
    publicRoute: normalizeHomeSearchQuery(model.public_profile?.public_route_path || ''),
    activateModelId: normalizeHomeSearchQuery(model.id),
    queryLabel: normalizeHomeSearchQuery(model.engine?.label || model.display_name || model.search_title || ''),
    verified: isVerifiedHomeSearchModel(model),
    verificationLabel: isVerifiedHomeSearchModel(model) ? 'Verified' : '',
    keywords: uniqueHomeSearchStrings([
      model.username || '',
      ...(Array.isArray(model.tags) ? model.tags : []),
      ...(Array.isArray(model.identity_signals) ? model.identity_signals : [])
    ]),
    scoreTokens: uniqueHomeSearchStrings([
      model.display_name,
      model.search_title,
      model.username,
      model.description,
      ...(Array.isArray(model.tags) ? model.tags : []),
      ...(Array.isArray(model.identity_signals) ? model.identity_signals : [])
    ]).join(' ').toLowerCase()
  }));
}

function getDefaultModelSearchEntries() {
  return buildModelSearchEntries()
    .sort((left, right) => left.title.localeCompare(right.title))
    .slice(0, 12);
}

function buildHomeSearchEntries() {
  const entryMap = new Map();

  [...buildCuratedSurfaceEntries(), ...buildModelSearchEntries(), ...HOME_SEARCH_SHELL_STATE.indexedEntries].forEach((entry) => {
    if (!entry?.key) {
      return;
    }

    const dedupeKey = `${normalizeHomeSearchQuery(entry.title).toLowerCase()}::${normalizeHomeSearchQuery(entry.href).toLowerCase()}`;
    const existingEntry = entryMap.get(dedupeKey);

    if (!existingEntry) {
      entryMap.set(dedupeKey, entry);
      return;
    }

    const existingPriority = existingEntry.kind === 'model' ? 3 : existingEntry.kind === 'surface' ? 2 : 1;
    const nextPriority = entry.kind === 'model' ? 3 : entry.kind === 'surface' ? 2 : 1;

    if (nextPriority > existingPriority || (entry.summary || '').length > (existingEntry.summary || '').length) {
      entryMap.set(dedupeKey, entry);
    }
  });

  return Array.from(entryMap.values());
}

function scoreHomeSearchMatch(query, entry) {
  const normalizedQuery = normalizeHomeSearchQuery(query).toLowerCase();
  if (!normalizedQuery) {
    return 0;
  }

  const haystack = normalizeHomeSearchQuery(entry.scoreTokens || '').toLowerCase();
  if (!haystack) {
    return 0;
  }

  let score = 0;

  if (haystack === normalizedQuery) score += 12;
  if (haystack.startsWith(normalizedQuery)) score += 8;
  if (haystack.includes(normalizedQuery)) score += 4;

  normalizedQuery.split(/\s+/).filter(Boolean).forEach((token) => {
    if (haystack.includes(token)) {
      score += 2;
    }
  });

  return score;
}

async function ensureHomeSearchData() {
  if (HOME_SEARCH_SHELL_STATE.dataReady) {
    return HOME_SEARCH_SHELL_STATE.indexedEntries;
  }

  if (!HOME_SEARCH_SHELL_STATE.loadingPromise) {
    HOME_SEARCH_SHELL_STATE.loadingPromise = Promise.all([
      loadPublicModelRegistry(),
      fetchHomeSearchJson(HOME_SEARCH_SHELL_INDEX_SOURCES.routeIndex).catch(() => ({ routes: [] })),
      fetchHomeSearchJson(HOME_SEARCH_SHELL_INDEX_SOURCES.contentIndex).catch(() => ({ entries: [] })),
      fetchHomeSearchJson(HOME_SEARCH_SHELL_INDEX_SOURCES.entityIndex).catch(() => ({ entities: [] }))
    ])
      .then(([, routeIndex, contentIndex, entityIndex]) => {
        HOME_SEARCH_SHELL_STATE.indexedEntries = [
          ...normalizeHomeSearchArray(routeIndex, 'routes')
            .map((entry) => buildIndexedEntry(entry, { keyPrefix: 'route', kind: 'route' }))
            .filter(Boolean),
          ...normalizeHomeSearchArray(contentIndex, 'entries')
            .map((entry) => buildIndexedEntry(entry, { keyPrefix: 'content', kind: 'content' }))
            .filter(Boolean),
          ...normalizeHomeSearchArray(entityIndex, 'entities')
            .map((entry) => buildIndexedEntry(entry, { keyPrefix: 'entity', kind: 'entity' }))
            .filter(Boolean)
        ];
        HOME_SEARCH_SHELL_STATE.dataReady = true;
        return HOME_SEARCH_SHELL_STATE.indexedEntries;
      })
      .catch(() => {
        HOME_SEARCH_SHELL_STATE.indexedEntries = [];
        HOME_SEARCH_SHELL_STATE.dataReady = true;
        return HOME_SEARCH_SHELL_STATE.indexedEntries;
      })
      .finally(() => {
        HOME_SEARCH_SHELL_STATE.loadingPromise = null;
      });
  }

  return HOME_SEARCH_SHELL_STATE.loadingPromise;
}

/* =========================================================
   05. SEARCH RENDER HELPERS
   ========================================================= */

function renderVerificationBadge(entry = {}) {
  if (!entry?.verified) {
    return '';
  }

  return `
    <span class="home-search-shell__result-badge" aria-label="${escapeHomeSearchHtml(entry.verificationLabel || 'Verified')}">
      <img src="/assets/icons/core/identity/trust/verified.svg" alt="" aria-hidden="true">
      <span>${escapeHomeSearchHtml(entry.verificationLabel || 'Verified')}</span>
    </span>
  `;
}

function renderResultChips(keywords = []) {
  const chips = (Array.isArray(keywords) ? keywords : [])
    .slice(0, 4)
    .map((keyword) => `<span class="home-search-shell__result-tag">${escapeHomeSearchHtml(keyword)}</span>`)
    .join('');

  if (!chips) {
    return '';
  }

  return `<div class="home-search-shell__result-tags">${chips}</div>`;
}

function renderDefaultHomeModelResults() {
  const models = getDefaultModelSearchEntries();

  if (!models.length) {
    return `
      <div class="home-search-shell__empty-state" id="home-search-shell-empty-state">
        <p class="home-search-shell__empty-title">No public models available</p>
        <p class="home-search-shell__empty-text">The model registry is loading or currently unavailable.</p>
      </div>
    `;
  }

  return `
    <div class="home-search-shell__result-list">
      ${models.map((entry) => `
        <article class="home-search-shell__result-card">
          <div class="home-search-shell__result-meta">
            <span class="home-search-shell__result-route">${escapeHomeSearchHtml(entry.eyebrow)}</span>
            ${entry.queryLabel ? `<span class="home-search-shell__result-query">${escapeHomeSearchHtml(entry.queryLabel)}</span>` : ''}
          </div>
          <div class="home-search-shell__result-title-row">
            <h3 class="home-search-shell__result-title">${escapeHomeSearchHtml(entry.title)}</h3>
            ${renderVerificationBadge(entry)}
          </div>
          <p class="home-search-shell__result-body">${escapeHomeSearchHtml(entry.summary || 'Available Neuroartan continuity model.')}</p>
          ${renderResultChips(entry.keywords)}
          <div class="home-search-shell__result-actions">
            ${entry.href ? `<a class="home-search-shell__result-link" href="${escapeHomeSearchHtml(entry.href)}">Open model</a>` : ''}
            ${entry.publicRoute ? `<a class="home-search-shell__result-link" href="${escapeHomeSearchHtml(entry.publicRoute)}">Open public route</a>` : ''}
            ${entry.activateModelId ? `<button class="home-search-shell__result-action" data-home-search-result-action="activate-model" data-home-search-model-id="${escapeHomeSearchHtml(entry.activateModelId)}" type="button">${entry.activateModelId === getActiveModelState().activeModelId ? 'Active on Homepage' : 'Activate on Homepage'}</button>` : ''}
          </div>
        </article>
      `).join('')}
    </div>
  `;
}

function renderDefaultHomeSearchResults() {
  const activeModel = getActiveModelState().activeModel;
  const activeModelLabel = getActiveModelLabel();
  const activeModelDescription = normalizeHomeSearchQuery(
    activeModel?.description || 'Search public models, select the active interaction engine, or move directly into a published public surface.'
  );
  const quickLinks = buildHomeSearchEntries().filter((entry) => entry.kind === 'surface').slice(0, 4);

  return `
    <div class="home-search-shell__result-list">
      <article class="home-search-shell__result-card">
        <div class="home-search-shell__result-meta">
          <span class="home-search-shell__result-route">Active interaction engine</span>
          <span class="home-search-shell__result-query">${escapeHomeSearchHtml(activeModelLabel)}</span>
        </div>
        <h3 class="home-search-shell__result-title">${escapeHomeSearchHtml(activeModel?.display_name || activeModelLabel)}</h3>
        <p class="home-search-shell__result-body">${escapeHomeSearchHtml(activeModelDescription)}</p>
        ${renderResultChips([
          activeModel?.model_maturity || '',
          activeModel?.availability || '',
          activeModel?.engine?.preferred_route?.replaceAll('-', ' ') || ''
        ])}
        <div class="home-search-shell__result-actions">
          <a class="home-search-shell__result-link" href="${escapeHomeSearchHtml(activeModel?.page_route || '/pages/profiles/index.html')}">Open model</a>
          ${activeModel?.public_profile?.public_route_path ? `<a class="home-search-shell__result-link" href="${escapeHomeSearchHtml(activeModel.public_profile.public_route_path)}">Open public route</a>` : ''}
          <button class="home-search-shell__result-action" data-home-search-result-action="ask-home" type="button">Ask ${escapeHomeSearchHtml(activeModelLabel)}</button>
        </div>
      </article>

      ${quickLinks.map((entry) => `
        <article class="home-search-shell__result-card">
          <div class="home-search-shell__result-meta">
            <span class="home-search-shell__result-route">${escapeHomeSearchHtml(entry.eyebrow)}</span>
          </div>
          <h3 class="home-search-shell__result-title">${escapeHomeSearchHtml(entry.title)}</h3>
          <p class="home-search-shell__result-body">${escapeHomeSearchHtml(entry.summary)}</p>
          <div class="home-search-shell__result-actions">
            <a class="home-search-shell__result-link" href="${escapeHomeSearchHtml(entry.href)}">Open surface</a>
          </div>
        </article>
      `).join('')}
    </div>
  `;
}

function renderQueryHomeSearchResults(query) {
  const matches = buildHomeSearchEntries()
    .map((entry) => ({
      ...entry,
      score: scoreHomeSearchMatch(query, entry)
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score || left.title.localeCompare(right.title))
    .slice(0, 8);

  if (!matches.length) {
    return `
      <div class="home-search-shell__empty-state" id="home-search-shell-empty-state">
        <p class="home-search-shell__empty-title">No direct surface matched this query</p>
        <p class="home-search-shell__empty-text">
          Search public models, published routes, institutional sections, and platform surfaces. If you want interpretation rather than navigation, ask ${escapeHomeSearchHtml(getActiveModelLabel())} directly.
        </p>
        <div class="home-search-shell__result-actions">
          <button class="home-search-shell__result-action" data-home-search-result-action="ask-home" type="button">Ask ${escapeHomeSearchHtml(getActiveModelLabel())}</button>
        </div>
      </div>
    `;
  }

  return `
    <div class="home-search-shell__result-list">
      ${matches.map((entry) => `
        <article class="home-search-shell__result-card">
          <div class="home-search-shell__result-meta">
            <span class="home-search-shell__result-route">${escapeHomeSearchHtml(entry.eyebrow)}</span>
            ${entry.kind === 'model' && entry.queryLabel ? `<span class="home-search-shell__result-query">${escapeHomeSearchHtml(entry.queryLabel)}</span>` : ''}
          </div>
          <div class="home-search-shell__result-title-row">
            <h3 class="home-search-shell__result-title">${escapeHomeSearchHtml(entry.title)}</h3>
            ${renderVerificationBadge(entry)}
          </div>
          <p class="home-search-shell__result-body">${escapeHomeSearchHtml(entry.summary || 'Published Neuroartan surface.')}</p>
          ${renderResultChips(entry.keywords)}
          <div class="home-search-shell__result-actions">
            ${entry.href ? `<a class="home-search-shell__result-link" href="${escapeHomeSearchHtml(entry.href)}">${entry.kind === 'model' ? 'Open model' : 'Open surface'}</a>` : ''}
            ${entry.publicRoute ? `<a class="home-search-shell__result-link" href="${escapeHomeSearchHtml(entry.publicRoute)}">Open public route</a>` : ''}
            ${entry.activateModelId ? `<button class="home-search-shell__result-action" data-home-search-result-action="activate-model" data-home-search-model-id="${escapeHomeSearchHtml(entry.activateModelId)}" type="button">${entry.activateModelId === getActiveModelState().activeModelId ? 'Active on Homepage' : 'Activate on Homepage'}</button>` : ''}
          </div>
        </article>
      `).join('')}
      <div class="home-search-shell__result-footer">
        <button class="home-search-shell__result-action" data-home-search-result-action="ask-home" type="button">Ask ${escapeHomeSearchHtml(getActiveModelLabel())}</button>
      </div>
    </div>
  `;
}

function renderHomeSearchShell() {
  const nodes = getHomeSearchShellNodes();
  if (!nodes.results) {
    return;
  }

  const query = normalizeHomeSearchQuery(HOME_SEARCH_SHELL_STATE.query || nodes.input?.value || '');
  HOME_SEARCH_SHELL_STATE.query = query;

  if (!query) {
    nodes.results.innerHTML = HOME_SEARCH_SHELL_STATE.mode === 'models'
      ? renderDefaultHomeModelResults()
      : renderDefaultHomeSearchResults();
    return;
  }

  if (!HOME_SEARCH_SHELL_STATE.dataReady && HOME_SEARCH_SHELL_STATE.loadingPromise) {
    nodes.results.innerHTML = `
      <div class="home-search-shell__empty-state" id="home-search-shell-empty-state">
        <p class="home-search-shell__empty-title">Loading search surfaces</p>
        <p class="home-search-shell__empty-text">
          The homepage is loading public models, published routes, and institutional sections.
        </p>
      </div>
    `;
    return;
  }

  nodes.results.innerHTML = renderQueryHomeSearchResults(query);
}

/* =========================================================
   06. QUERY HELPERS
   ========================================================= */

function setHomeSearchValue(value) {
  const nodes = getHomeSearchShellNodes();
  if (!nodes.input) return;

  const query = normalizeHomeSearchQuery(value);
  nodes.input.value = query;
  HOME_SEARCH_SHELL_STATE.query = query;
}

function syncHomeSearchVoiceState(isListening) {
  const voiceButton = getHomeSearchShellNodes().voiceButton;
  if (!(voiceButton instanceof HTMLButtonElement)) {
    return;
  }

  voiceButton.setAttribute('aria-pressed', isListening ? 'true' : 'false');
  voiceButton.setAttribute('aria-label', isListening ? 'Stop voice search' : 'Start voice search');
}

function ensureHomeSearchSpeechController() {
  if (HOME_SEARCH_SHELL_STATE.speechController) {
    return HOME_SEARCH_SHELL_STATE.speechController;
  }

  HOME_SEARCH_SHELL_STATE.speechController = createSpeechInputController({
    onStart: () => {
      syncHomeSearchVoiceState(true);
    },
    onResult: ({ transcript }) => {
      setHomeSearchValue(transcript);
      renderHomeSearchShell();
    },
    onEnd: () => {
      syncHomeSearchVoiceState(false);
    },
    onError: () => {
      syncHomeSearchVoiceState(false);
    },
  });

  return HOME_SEARCH_SHELL_STATE.speechController;
}

function submitHomeSearchQuery(query, source = 'home-search-shell') {
  const normalizedQuery = normalizeHomeSearchQuery(query);
  if (!normalizedQuery) {
    return;
  }

  dispatchHomeSearchEvent('neuroartan:home-stage-voice-query-submitted', {
    query: normalizedQuery,
    source,
    mode: 'search_or_knowledge',
  });
}

function handleHomeSearchChipSelection(chipValue) {
  const query = normalizeHomeSearchQuery(chipValue);
  if (!query) return;

  setHomeSearchValue(query);
  renderHomeSearchShell();
}

function openHomeSearchShell(options = {}) {
  const nodes = getHomeSearchShellNodes();
  if (!nodes.shell) {
    return;
  }

  HOME_SEARCH_SHELL_STATE.isOpen = true;
  HOME_SEARCH_SHELL_STATE.mode = options.mode === 'models' || options.focus === 'models' ? 'models' : 'search';

  dispatchHomeSearchEvent('neuroartan:cookie-consent-close-requested', {
    source: 'home-search-shell',
  });

  nodes.shell.hidden = false;
  document.documentElement.classList.add('home-search-shell-open');
  document.body.classList.add('home-search-shell-open');

  window.requestAnimationFrame(() => {
    if (HOME_SEARCH_SHELL_STATE.mode === 'models') {
      setHomeSearchValue('');
      renderHomeSearchShell();
      return;
    }

    nodes.input?.focus();
    nodes.input?.select();
  });

  void ensureHomeSearchData().then(() => {
    renderHomeSearchShell();
  });
}

function closeHomeSearchShell() {
  const nodes = getHomeSearchShellNodes();
  if (!nodes.shell) {
    return;
  }

  HOME_SEARCH_SHELL_STATE.isOpen = false;
  HOME_SEARCH_SHELL_STATE.mode = 'search';
  nodes.shell.hidden = true;
  document.documentElement.classList.remove('home-search-shell-open');
  document.body.classList.remove('home-search-shell-open');
  dispatchHomeSearchEvent('neuroartan:home-topbar-reset-triggers');
}

/* =========================================================
   07. EVENT BINDING
   ========================================================= */

function bindHomeSearchShell() {
  void ensureHomeSearchData().then(() => {
    renderHomeSearchShell();
  });

  subscribeActiveModelState(() => {
    renderHomeSearchShell();
  });

  document.addEventListener('neuroartan:home-search-shell-open-requested', (event) => {
    openHomeSearchShell(event?.detail || {});
  });

  document.addEventListener('neuroartan:home-model-selector-open-requested', () => {
    openHomeSearchShell({ mode: 'models', focus: 'models' });
  });

  document.addEventListener('neuroartan:home-search-shell-close-requested', () => {
    closeHomeSearchShell();
  });

  document.addEventListener('click', (event) => {
    const root = getLiveSearchShellRoot();
    if (!root) return;

    const target = event.target.closest(
      '#home-search-shell-close, ' +
      '#home-search-shell-voice-button, ' +
      '#home-search-shell [data-home-search-close="true"], ' +
      '#home-search-shell [data-home-search-chip], ' +
      '#home-search-shell [data-home-search-result-action], ' +
      '#home-search-shell a[href]'
    );

    if (!target || !root.contains(target)) {
      return;
    }

    if (target.matches('#home-search-shell-close, [data-home-search-close="true"]')) {
      closeHomeSearchShell();
      return;
    }

    if (target.matches('#home-search-shell-voice-button')) {
      event.preventDefault();

      const speechController = ensureHomeSearchSpeechController();
      if (!speechController.supported) {
        getHomeSearchShellNodes().input?.focus();
        return;
      }

      if (speechController.isListening()) {
        speechController.stop();
        return;
      }

      speechController.start({
        lang: document.documentElement.lang || 'en',
      });
      return;
    }

    if (target.matches('a[href]')) {
      closeHomeSearchShell();
      return;
    }

    if (target.matches('[data-home-search-result-action="ask-home"]')) {
      closeHomeSearchShell();
      submitHomeSearchQuery(HOME_SEARCH_SHELL_STATE.query, 'home-search-shell');
      return;
    }

    if (target.matches('[data-home-search-result-action="activate-model"]')) {
      const modelId = normalizeHomeSearchQuery(target.getAttribute('data-home-search-model-id') || '');
      if (!modelId) {
        return;
      }

      void activatePublicModel(modelId, { source: 'home-search-shell' }).then(() => {
        renderHomeSearchShell();
        closeHomeSearchShell();
      });
      return;
    }

    if (target.matches('[data-home-search-chip]')) {
      handleHomeSearchChipSelection(target.getAttribute('data-home-search-chip') || '');
    }
  });

  document.addEventListener('input', (event) => {
    const root = getLiveSearchShellRoot();
    if (!root) return;

    const input = event.target.closest('#home-search-shell-input');
    if (!(input instanceof HTMLInputElement) || !root.contains(input)) {
      return;
    }

    HOME_SEARCH_SHELL_STATE.query = normalizeHomeSearchQuery(input.value);
    renderHomeSearchShell();
  });

  document.addEventListener('submit', (event) => {
    const root = getLiveSearchShellRoot();
    if (!root) return;

    const form = event.target.closest('#home-search-shell-form');
    if (!form || !root.contains(form)) {
      return;
    }

    event.preventDefault();

    const query = normalizeHomeSearchQuery(getHomeSearchShellNodes().input?.value || '');
    if (!query) {
      renderHomeSearchShell();
      return;
    }

    HOME_SEARCH_SHELL_STATE.query = query;
    closeHomeSearchShell();
    submitHomeSearchQuery(query, 'home-search-shell');
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && HOME_SEARCH_SHELL_STATE.isOpen) {
      closeHomeSearchShell();
    }
  });
}

/* =========================================================
   08. MODULE BOOT
   ========================================================= */

function bootHomeSearchShell() {
  const root = getLiveSearchShellRoot();
  if (!root) {
    return;
  }

  HOME_SEARCH_SHELL_STATE.root = root;
  syncHomeSearchVoiceState(false);

  const voiceButton = getHomeSearchShellNodes().voiceButton;
  if (voiceButton instanceof HTMLButtonElement && !hasSpeechInputSupport()) {
    voiceButton.hidden = true;
  }

  if (HOME_SEARCH_SHELL_STATE.isBound) {
    renderHomeSearchShell();
    return;
  }

  HOME_SEARCH_SHELL_STATE.isBound = true;
  bindHomeSearchShell();
}

document.addEventListener('fragment:mounted', (event) => {
  if (event?.detail?.name !== 'home-search-shell') return;
  bootHomeSearchShell();
});

document.addEventListener('neuroartan:runtime-ready', () => {
  bootHomeSearchShell();
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootHomeSearchShell, { once: true });
} else {
  bootHomeSearchShell();
}