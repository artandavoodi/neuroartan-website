/* =============================================================================
   00) FILE INDEX
   01) MODULE IMPORTS
   02) CONSTANTS
   03) STATE
   04) MODEL HELPERS
   05) RENDER HELPERS
   06) EVENTS
   07) INITIALIZATION
   08) END OF FILE
============================================================================= */

/* =============================================================================
   01) MODULE IMPORTS
============================================================================= */
import {
  activatePublicModel,
  getActiveModelState,
  subscribeActiveModelState
} from '../system/active-model.js';
import {
  getPublicModelById,
  getPublicModels,
  loadPublicModelRegistry,
  searchPublicModels
} from '../system/public-model-registry.js';
import {
  escapeHtml,
  fetchJson,
  normalizeString,
  readQueryParam,
  renderChipMarkup,
  renderMetricMarkup,
  setQueryParam
} from './catalog-runtime.js';

/* =============================================================================
   02) CONSTANTS
============================================================================= */
const PROFILES_SECTION_URL = '/assets/data/sections/profiles.json';

/* =============================================================================
   03) STATE
============================================================================= */
const PROFILES_PAGE_STATE = {
  section: null,
  root: null,
  isBound: false
};

/* =============================================================================
   04) MODEL HELPERS
============================================================================= */
function isProfilesPage() {
  return document.body.classList.contains('profiles-page');
}

function getProfilesRoot() {
  return document.querySelector('[data-profiles-page-root]');
}

function getDirectoryModels(query) {
  const normalizedQuery = normalizeString(query);
  const models = getPublicModels().filter((model) => model.directory_visibility !== false);

  if (!normalizedQuery) {
    return models;
  }

  return searchPublicModels(normalizedQuery).filter((model) => model.directory_visibility !== false);
}

function getCurrentDirectoryQuery() {
  return readQueryParam('q');
}

function getCurrentModelId() {
  return readQueryParam('model');
}

function buildModelMetrics(model) {
  return [
    model.model_maturity,
    model.availability,
    model.joined_year ? `Continuity start ${model.joined_year}` : ''
  ];
}

function buildModelSignalRows(model) {
  return [
    { label: 'Training state', value: model.training_state || 'Not published' },
    { label: 'Voice state', value: model.voice_state || 'Not published' },
    { label: 'Model maturity', value: model.model_maturity || 'Not published' },
    { label: 'Source depth', value: model.source_depth || 'Not published' },
    { label: 'Availability', value: model.availability || 'Not published' },
    { label: 'Legacy state', value: model.legacy_state || 'Not published' },
    { label: 'Trust classification', value: model.trust_classification || 'Not published' },
    { label: 'Interaction entry', value: model.interaction_entry || 'Not published' }
  ];
}

function renderRows(rows = []) {
  return rows.map((row) => `
    <div class="catalog-row">
      <p class="catalog-row__label">${escapeHtml(row.label)}</p>
      <p class="catalog-row__value">${escapeHtml(row.value)}</p>
    </div>
  `).join('');
}

/* =============================================================================
   05) RENDER HELPERS
============================================================================= */
function renderProfilesDirectory(section, query) {
  const activeModelId = getActiveModelState().activeModelId;
  const models = getDirectoryModels(query);
  const hasQuery = Boolean(normalizeString(query));

  const cardsMarkup = models.map((model) => `
    <article class="catalog-card" role="listitem">
      <div class="catalog-card__body">
        <div class="catalog-card__header">
          <p class="catalog-card__eyebrow">${escapeHtml(model.model_type || 'Continuity model')}</p>
          <h2 class="catalog-card__title">${escapeHtml(model.display_name || model.search_title || 'Continuity Model')}</h2>
          <p class="catalog-card__summary">${escapeHtml(model.description || '')}</p>
        </div>

        <div class="catalog-meta">
          ${renderMetricMarkup(buildModelMetrics(model))}
        </div>

        <div class="catalog-chip-list">
          ${renderChipMarkup([
            ...(Array.isArray(model.tags) ? model.tags.slice(0, 3) : []),
            ...(Array.isArray(model.identity_signals) ? model.identity_signals.slice(0, 2) : [])
          ])}
        </div>

        <div class="catalog-action-row">
          <a class="ui-button ui-button--secondary" href="/pages/profiles/index.html?model=${encodeURIComponent(model.id)}">Open Model</a>
          <button
            class="ui-button ui-button--ghost"
            type="button"
            data-model-activate="${escapeHtml(model.id)}"
            data-model-activate-home="true"
          >
            ${model.id === activeModelId ? 'Active on Homepage' : 'Activate on Homepage'}
          </button>
        </div>
      </div>
    </article>
  `).join('');

  PROFILES_PAGE_STATE.root.innerHTML = `
    <section class="catalog-page-hero">
      <p class="catalog-page-eyebrow">${escapeHtml(section.hero?.eyebrow || section.label || 'Continuity Models')}</p>
      <h1 class="catalog-page-title">${escapeHtml(section.hero?.title || section.title || 'Continuity Models')}</h1>
      <p class="catalog-page-description">${escapeHtml(section.hero?.description || section.description || '')}</p>
      <div class="catalog-meta">
        ${renderMetricMarkup([
          `${getPublicModels().filter((model) => model.directory_visibility !== false).length} public models`,
          'Searchable public continuity routes',
          'Active model selection enabled'
        ])}
      </div>
    </section>

    <section class="catalog-section">
      <div class="catalog-toolbar">
        <label class="catalog-search" for="profiles-search-input">
          <span class="catalog-search__label">Search models</span>
          <span class="catalog-search__input-row">
            <input
              class="catalog-search__input"
              id="profiles-search-input"
              type="search"
              name="q"
              placeholder="Search by name, username, tags, or profile description"
              value="${escapeHtml(query)}"
              autocomplete="off">
          </span>
        </label>
        <p class="catalog-filter-note">
          Search across display names, usernames, descriptions, tags, and identity signals.
        </p>
      </div>

      ${cardsMarkup ? `
        <div class="catalog-grid" role="list" aria-label="Public continuity models">
          ${cardsMarkup}
        </div>
      ` : `
        <div class="catalog-empty-state">
          <h2 class="catalog-empty-state__title">No models matched this query</h2>
          <p class="catalog-empty-state__copy">
            ${hasQuery
              ? 'Adjust the search terms to browse the currently discoverable public continuity models.'
              : 'Public continuity models will appear here when their public discovery state is enabled.'}
          </p>
        </div>
      `}
    </section>
  `;
}

function renderProfilesDetail(section, model) {
  const activeModelId = getActiveModelState().activeModelId;
  const publicProfile = model.public_profile || {};
  const publicRoute = normalizeString(publicProfile.public_route_path || '');
  const guidedTraining = Array.isArray(model.training_modes) ? model.training_modes : [];
  const sourceIngestion = Array.isArray(model.source_ingestion) ? model.source_ingestion : [];
  const reliabilitySignals = Array.isArray(model.reliability_signals) ? model.reliability_signals : [];
  const permissions = model.permissions && typeof model.permissions === 'object'
    ? Object.entries(model.permissions).map(([label, value]) => ({
        label: label.charAt(0).toUpperCase() + label.slice(1),
        value
      }))
    : [];
  const engineRows = [
    { label: 'Engine label', value: model.engine?.label || 'Not published' },
    { label: 'Preferred route', value: model.engine?.preferred_route || 'Not published' },
    { label: 'Memory namespace', value: model.engine?.memory_namespace || 'Not published' },
    { label: 'Voice readiness', value: model.engine?.tts_readiness || 'Not published' }
  ];

  PROFILES_PAGE_STATE.root.innerHTML = `
    <section class="catalog-page-hero">
      <p class="catalog-page-eyebrow">${escapeHtml(section.label || 'Continuity Models')}</p>
      <h1 class="catalog-page-title">${escapeHtml(model.display_name || model.search_title || 'Continuity Model')}</h1>
      <p class="catalog-page-description">${escapeHtml(model.description || '')}</p>
      <div class="catalog-meta">
        ${renderMetricMarkup(buildModelMetrics(model))}
      </div>
      <div class="catalog-action-row">
        <a class="ui-button ui-button--ghost" href="/pages/profiles/index.html">Back to directory</a>
        <button
          class="ui-button ui-button--secondary"
          type="button"
          data-model-activate="${escapeHtml(model.id)}"
          data-model-activate-home="true"
        >
          ${model.id === activeModelId ? 'Active on Homepage' : 'Activate on Homepage'}
        </button>
        ${publicRoute ? `<a class="ui-button ui-button--ghost" href="${escapeHtml(publicRoute)}">Open Public Route</a>` : ''}
      </div>
    </section>

    <section class="catalog-section">
      <div class="catalog-detail-grid">
        <article class="catalog-panel catalog-panel--primary">
          <h2 class="catalog-panel__title">Public Signals</h2>
          <div class="catalog-rows">
            ${renderRows(buildModelSignalRows(model))}
          </div>
        </article>

        <article class="catalog-panel">
          <h2 class="catalog-panel__title">Identity Signals</h2>
          <div class="catalog-chip-list">
            ${renderChipMarkup([
              ...(Array.isArray(model.tags) ? model.tags : []),
              ...(Array.isArray(model.identity_signals) ? model.identity_signals : [])
            ])}
          </div>
        </article>

        <article class="catalog-panel">
          <h2 class="catalog-panel__title">Guided Training</h2>
          <div class="catalog-list">
            ${(guidedTraining.length ? guidedTraining : ['No public guided-training modes published yet.']).map((item) => `
              <div class="catalog-list-item">${escapeHtml(item)}</div>
            `).join('')}
          </div>
        </article>

        <article class="catalog-panel">
          <h2 class="catalog-panel__title">Source Formation</h2>
          <div class="catalog-list">
            ${(sourceIngestion.length ? sourceIngestion : ['No source-ingestion inputs published yet.']).map((item) => `
              <div class="catalog-list-item">${escapeHtml(item)}</div>
            `).join('')}
          </div>
        </article>

        <article class="catalog-panel">
          <h2 class="catalog-panel__title">Permissions</h2>
          <div class="catalog-rows">
            ${renderRows(permissions.length ? permissions : [{ label: 'Permissions', value: 'Not published' }])}
          </div>
        </article>

        <article class="catalog-panel">
          <h2 class="catalog-panel__title">Engine Routing</h2>
          <div class="catalog-rows">
            ${renderRows(engineRows)}
          </div>
        </article>

        <article class="catalog-panel catalog-panel--wide">
          <h2 class="catalog-panel__title">Reliability Signals</h2>
          <div class="catalog-list">
            ${(reliabilitySignals.length ? reliabilitySignals : ['No public reliability signals published yet.']).map((item) => `
              <div class="catalog-list-item">${escapeHtml(item)}</div>
            `).join('')}
          </div>
        </article>
      </div>
    </section>
  `;
}

function renderProfilesPage() {
  if (!PROFILES_PAGE_STATE.root || !PROFILES_PAGE_STATE.section) {
    return;
  }

  const modelId = getCurrentModelId();
  const model = modelId ? getPublicModelById(modelId) : null;
  const query = getCurrentDirectoryQuery();

  if (model) {
    renderProfilesDetail(PROFILES_PAGE_STATE.section, model);
    return;
  }

  renderProfilesDirectory(PROFILES_PAGE_STATE.section, query);
}

/* =============================================================================
   06) EVENTS
============================================================================= */
function bindProfilesPageEvents() {
  if (PROFILES_PAGE_STATE.isBound) {
    return;
  }

  PROFILES_PAGE_STATE.isBound = true;

  document.addEventListener('click', (event) => {
    if (!PROFILES_PAGE_STATE.root) return;

    const activateButton = event.target.closest('[data-model-activate]');
    if (activateButton && PROFILES_PAGE_STATE.root.contains(activateButton)) {
      const modelId = normalizeString(activateButton.getAttribute('data-model-activate') || '');
      if (!modelId) return;

      void activatePublicModel(modelId, { source: 'profiles-page' }).then(() => {
        if (activateButton.getAttribute('data-model-activate-home') === 'true') {
          window.location.href = '/';
          return;
        }

        renderProfilesPage();
      });
    }
  });

  document.addEventListener('input', (event) => {
    if (!PROFILES_PAGE_STATE.root) return;

    const input = event.target.closest('#profiles-search-input');
    if (!(input instanceof HTMLInputElement) || !PROFILES_PAGE_STATE.root.contains(input)) {
      return;
    }

    setQueryParam('q', input.value);
    renderProfilesPage();
  });

  window.addEventListener('popstate', renderProfilesPage);
  subscribeActiveModelState(() => {
    renderProfilesPage();
  });
}

/* =============================================================================
   07) INITIALIZATION
============================================================================= */
async function initProfilesPage() {
  if (!isProfilesPage()) {
    return;
  }

  PROFILES_PAGE_STATE.root = getProfilesRoot();
  if (!PROFILES_PAGE_STATE.root) {
    return;
  }

  const [section] = await Promise.all([
    fetchJson(PROFILES_SECTION_URL),
    loadPublicModelRegistry()
  ]);

  PROFILES_PAGE_STATE.section = section;
  bindProfilesPageEvents();
  renderProfilesPage();
}

void initProfilesPage();

/* =============================================================================
   08) END OF FILE
============================================================================= */
