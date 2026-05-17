/* =============================================================================
   00) FILE INDEX
   01) MODULE IMPORTS
   02) CONSTANTS
   03) STATE
   04) HELPERS
   05) FILTER HELPERS
   06) RENDER HELPERS
   07) EVENTS
   08) INITIALIZATION
   09) END OF FILE
============================================================================= */

/* =============================================================================
   01) MODULE IMPORTS
============================================================================= */
import {
  escapeHtml,
  fetchJson,
  normalizeString,
  readQueryParam,
  renderChipMarkup,
  renderMetricMarkup,
  setQueryParam
} from './catalog-runtime.js';
import {
  activatePublicModel,
  getActiveModelState,
  subscribeActiveModelState
} from '../system/model/active-model.js';
import {
  getPublicModels,
  loadPublicModelRegistry
} from '../system/model/public-model-registry.js';

/* =============================================================================
   02) CONSTANTS
============================================================================= */
const MODELS_SECTION_URL = '/assets/data/sections/models.json';

/* =============================================================================
   03) STATE
============================================================================= */
const MODELS_PAGE_STATE = {
  config: null,
  root: null,
  isBound: false,
  activeModelId: ''
};

/* =============================================================================
   04) HELPERS
============================================================================= */
function isModelsPage() {
  return document.body.classList.contains('models-page');
}

function getModelsRoot() {
  return document.querySelector('[data-models-page-root]');
}

function getModelsQuery() {
  return readQueryParam('q');
}

function getModelsPrimaryFilter() {
  const requested = normalizeString(readQueryParam('filter')).toLowerCase();
  const allowed = new Set(
    (MODELS_PAGE_STATE.config?.filters?.primary || []).map((item) => normalizeString(item?.id).toLowerCase())
  );
  const fallback = normalizeString(MODELS_PAGE_STATE.config?.default_primary_filter || 'all').toLowerCase();
  return allowed.has(requested) ? requested : fallback;
}

function getModelsSort() {
  const requested = normalizeString(readQueryParam('sort')).toLowerCase();
  const allowed = new Set(
    (MODELS_PAGE_STATE.config?.sort_options || []).map((item) => normalizeString(item?.id).toLowerCase())
  );
  const fallback = normalizeString(MODELS_PAGE_STATE.config?.default_sort || 'trust').toLowerCase();
  return allowed.has(requested) ? requested : fallback;
}

function getDirectoryModels() {
  return getPublicModels().filter((model) => model?.directory_visibility !== false);
}

function isVerifiedModel(model = {}) {
  const trust = [
    model.trust_classification,
    ...(Array.isArray(model.reliability_signals) ? model.reliability_signals : [])
  ].join(' ');

  return /verified|governed|self-authored/i.test(trust);
}

function resolveModelState(model = {}) {
  const legacyState = normalizeString(model.legacy_state).toLowerCase();
  if (legacyState.includes('legacy')) {
    return 'Legacy';
  }

  const visibility = normalizeString(model?.public_profile?.public_profile_visibility).toLowerCase();
  if (visibility === 'private') {
    return 'Private';
  }

  if (visibility === 'public') {
    return 'Public';
  }

  const permissions = [
    model?.permissions?.search,
    model?.permissions?.view
  ].join(' ').toLowerCase();

  if (permissions.includes('private')) {
    return 'Private';
  }

  return 'Public';
}

function resolveCreatorLabel(model = {}) {
  if (normalizeString(model?.creator?.display_name)) {
    return model.creator.display_name;
  }

  if (model.model_type === 'human-profile') {
    return model?.public_profile?.public_display_name || model.display_name || model.search_title || 'Profile owner';
  }

  if (model.model_type === 'institution-model') {
    return 'Neuroartan';
  }

  if (model.model_type === 'system-model') {
    return 'Neuroartan Product';
  }

  return model.display_name || model.search_title || 'Neuroartan';
}

function resolveInteractionMode(model = {}) {
  return model?.permissions?.interaction || model.interaction_entry || 'Text';
}

function resolveModelTypeLabel(model = {}) {
  switch (normalizeString(model.model_type).toLowerCase()) {
    case 'human-profile':
      return 'Human profile';
    case 'institution-model':
      return 'Institution model';
    case 'system-model':
      return 'System model';
    default:
      return 'Continuity model';
  }
}

function resolveTrustLabel(model = {}) {
  return normalizeString(model.trust_classification || model.model_maturity || model.training_state || 'Governed surface');
}

function resolveVerificationLabel(model = {}) {
  return isVerifiedModel(model) ? 'Verified' : 'Review pending';
}

function resolveAvatarMarkup(model = {}) {
  const image = normalizeString(model?.public_profile?.public_avatar_url || '');
  const label = model.display_name || model.search_title || 'Model';

  if (image) {
    return `<img class="models-directory-card__avatar-image" src="${escapeHtml(image)}" alt="${escapeHtml(label)}">`;
  }

  return `<span class="models-directory-card__avatar-fallback">${escapeHtml((label.charAt(0) || 'N').toUpperCase())}</span>`;
}

function matchesQuery(model = {}, query = '') {
  const normalizedQuery = normalizeString(query).toLowerCase();
  if (!normalizedQuery) {
    return true;
  }

  const haystack = [
    model.display_name,
    model.search_title,
    model.username,
    model.description,
    model.training_state,
    model.trust_classification,
    ...(Array.isArray(model.tags) ? model.tags : []),
    ...(Array.isArray(model.identity_signals) ? model.identity_signals : [])
  ].join(' ').toLowerCase();

  return haystack.includes(normalizedQuery);
}

/* =============================================================================
   05) FILTER HELPERS
============================================================================= */
function matchesPrimaryFilter(model, filterId) {
  const normalized = normalizeString(filterId).toLowerCase();
  const featuredIds = new Set(MODELS_PAGE_STATE.config?.featured_model_ids || []);
  const state = resolveModelState(model);

  if (normalized === 'verified') {
    return isVerifiedModel(model);
  }

  if (normalized === 'public') {
    return state === 'Public';
  }

  if (normalized === 'private') {
    return state === 'Private';
  }

  if (normalized === 'legacy') {
    return state === 'Legacy';
  }

  if (normalized === 'featured') {
    return featuredIds.has(model.id);
  }

  return true;
}

function sortModels(models = [], sortId = '') {
  const normalized = normalizeString(sortId).toLowerCase();
  const sorted = [...models];

  if (normalized === 'name') {
    sorted.sort((left, right) => {
      return String(left.display_name || left.search_title || '').localeCompare(
        String(right.display_name || right.search_title || '')
      );
    });
    return sorted;
  }

  if (normalized === 'joined') {
    sorted.sort((left, right) => {
      return String(right.joined_year || '').localeCompare(String(left.joined_year || ''));
    });
    return sorted;
  }

  sorted.sort((left, right) => {
    const leftScore = Number(isVerifiedModel(left)) + Number(MODELS_PAGE_STATE.activeModelId === left.id);
    const rightScore = Number(isVerifiedModel(right)) + Number(MODELS_PAGE_STATE.activeModelId === right.id);
    return rightScore - leftScore;
  });
  return sorted;
}

function getFilteredModels() {
  const query = getModelsQuery();
  const filterId = getModelsPrimaryFilter();
  const sortId = getModelsSort();

  return sortModels(
    getDirectoryModels().filter((model) => matchesQuery(model, query) && matchesPrimaryFilter(model, filterId)),
    sortId
  );
}

/* =============================================================================
   06) RENDER HELPERS
============================================================================= */
function renderPrimaryFilters() {
  const activeFilter = getModelsPrimaryFilter();
  const filters = MODELS_PAGE_STATE.config?.filters?.primary || [];

  return filters.map((filter) => `
    <button
      class="models-directory-filter-chip"
      type="button"
      data-models-primary-filter="${escapeHtml(filter.id)}"
      aria-pressed="${filter.id === activeFilter ? 'true' : 'false'}">
      ${escapeHtml(filter.label)}
    </button>
  `).join('');
}

function renderSecondaryFilterGroups() {
  const groups = MODELS_PAGE_STATE.config?.filters?.secondary || [];

  return groups.map((group) => `
    <div class="models-directory-filter-group">
      <p class="models-directory-filter-group__label">${escapeHtml(group.label)}</p>
      <div class="catalog-chip-list">
        ${renderChipMarkup(group.options || [])}
      </div>
    </div>
  `).join('');
}

function renderModelCard(model = {}) {
  const stateLabel = resolveModelState(model);
  const creatorLabel = resolveCreatorLabel(model);
  const interactionMode = resolveInteractionMode(model);
  const modelTypeLabel = resolveModelTypeLabel(model);
  const trustLabel = resolveTrustLabel(model);
  const verificationLabel = resolveVerificationLabel(model);
  const verificationMarkup = isVerifiedModel(model)
    ? `
      <span class="models-directory-card__verification" aria-label="${escapeHtml(verificationLabel)} model">
        <img
          class="models-directory-card__verification-icon ui-icon-theme-aware"
          src="/registry/icons/public/assets/core/identity/trust/verified.svg"
          alt=""
          aria-hidden="true">
        <span>${escapeHtml(verificationLabel)}</span>
      </span>
    `
    : '';
  const active = MODELS_PAGE_STATE.activeModelId === model.id;

  return `
    <article class="catalog-card models-directory-card" role="listitem" data-active="${active ? 'true' : 'false'}" data-model-card-id="${escapeHtml(model.id)}">
      <div class="catalog-card__body">
        <div class="models-directory-card__identity">
          <div class="models-directory-card__avatar" aria-hidden="true">
            ${resolveAvatarMarkup(model)}
          </div>
          <div class="models-directory-card__identity-copy">
            <div class="models-directory-card__title-row">
              <h2 class="catalog-card__title">${escapeHtml(model.display_name || model.search_title || 'Continuity Model')}</h2>
              ${verificationMarkup}
            </div>
            <p class="models-directory-card__handle">@${escapeHtml(model.username || 'model')}</p>
          </div>
        </div>

        <p class="catalog-card__summary">${escapeHtml(model.description || '')}</p>

        <div class="catalog-chip-list">
          <span class="catalog-chip">${escapeHtml(`Creator: ${creatorLabel}`)}</span>
          <span class="catalog-chip">${escapeHtml(interactionMode)}</span>
          <span class="catalog-chip">${escapeHtml(stateLabel)}</span>
          <span class="catalog-chip">${escapeHtml(trustLabel)}</span>
        </div>

        <div class="models-directory-card__meta">
          <p class="models-directory-card__meta-row"><strong>Type</strong><span>${escapeHtml(modelTypeLabel)}</span></p>
          <p class="models-directory-card__meta-row"><strong>Training</strong><span>${escapeHtml(model.training_state || model.model_maturity || 'Pending')}</span></p>
          <p class="models-directory-card__meta-row"><strong>Joined</strong><span>${escapeHtml(model.joined_year || 'Pending')}</span></p>
          <p class="models-directory-card__meta-row"><strong>Availability</strong><span>${escapeHtml(model.availability || 'Pending')}</span></p>
          <p class="models-directory-card__meta-row"><strong>Interaction</strong><span>${escapeHtml(model.interaction_entry || interactionMode)}</span></p>
        </div>

        <div class="models-directory-card__actions">
          <a class="models-directory-card__action models-directory-card__action--secondary" href="${escapeHtml(model.page_route || '/pages/profiles/index.html')}">View</a>
          <button class="models-directory-card__action models-directory-card__action--primary" type="button" data-model-activate="${escapeHtml(model.id)}">Interact</button>
        </div>
      </div>
    </article>
  `;
}

function renderModelsDirectory() {
  if (!MODELS_PAGE_STATE.root || !MODELS_PAGE_STATE.config) {
    return;
  }

  const models = getFilteredModels();
  const verifiedCount = getDirectoryModels().filter(isVerifiedModel).length;
  const activeModel = getActiveModelState().activeModel;
  const activeEngine = activeModel?.engine?.label || activeModel?.display_name || 'Neuroartan';
  const query = getModelsQuery();
  const sortId = getModelsSort();

  MODELS_PAGE_STATE.root.innerHTML = `
    <section class="catalog-page-hero">
      <p class="catalog-page-eyebrow">${escapeHtml(MODELS_PAGE_STATE.config.label || 'Models')}</p>
      <h1 class="catalog-page-title">${escapeHtml(MODELS_PAGE_STATE.config.title || 'Models')}</h1>
      <p class="catalog-page-description">${escapeHtml(MODELS_PAGE_STATE.config.description || '')}</p>
      <div class="catalog-meta">
        ${renderMetricMarkup([
          `${getDirectoryModels().length} searchable public models`,
          `${verifiedCount} verified or governed surfaces`,
          `Active engine: ${activeEngine}`
        ])}
      </div>
    </section>

    <section class="catalog-section">
      <div class="models-directory-toolbar">
        <div class="models-directory-toolbar__top">
          <label class="catalog-search models-directory-search" for="models-search-input">
            <span class="catalog-search__label">Search models by name, username, description, tags, or trust posture</span>
            <span class="catalog-search__input-row">
              <input
                class="catalog-search__input"
                id="models-search-input"
                type="search"
                name="q"
                value="${escapeHtml(query)}"
                placeholder="Search continuity models"
                autocomplete="off">
            </span>
          </label>

          <label class="models-directory-sort" for="models-sort-select">
            <span class="models-directory-sort__label">Sort</span>
            <select class="models-directory-sort__select" id="models-sort-select" name="sort">
              ${(MODELS_PAGE_STATE.config.sort_options || []).map((option) => `
                <option value="${escapeHtml(option.id)}"${option.id === sortId ? ' selected' : ''}>${escapeHtml(option.label)}</option>
              `).join('')}
            </select>
          </label>
        </div>

        <div class="models-directory-filter-row" role="group" aria-label="Primary model filters">
          ${renderPrimaryFilters()}
        </div>

        <div class="models-directory-filter-groups" aria-label="Secondary model filters">
          ${renderSecondaryFilterGroups()}
        </div>
      </div>
    </section>

    <section class="catalog-section">
      ${models.length ? `
        <div class="catalog-grid" role="list" aria-label="Model directory results">
          ${models.map((model) => renderModelCard(model)).join('')}
        </div>
      ` : `
        <div class="catalog-empty-state">
          <h2 class="catalog-empty-state__title">No continuity models matched this search</h2>
          <p class="catalog-empty-state__copy">Adjust the current search or filter to explore the public continuity model ecosystem.</p>
        </div>
      `}
    </section>
  `;
}

/* =============================================================================
   07) EVENTS
============================================================================= */
function bindModelsEvents() {
  if (MODELS_PAGE_STATE.isBound) {
    return;
  }

  MODELS_PAGE_STATE.isBound = true;

  document.addEventListener('input', (event) => {
    if (!MODELS_PAGE_STATE.root) return;
    const input = event.target.closest('#models-search-input');
    if (!(input instanceof HTMLInputElement) || !MODELS_PAGE_STATE.root.contains(input)) {
      return;
    }

    setQueryParam('q', input.value);
    renderModelsDirectory();
  });

  document.addEventListener('change', (event) => {
    if (!MODELS_PAGE_STATE.root) return;
    const select = event.target.closest('#models-sort-select');
    if (!(select instanceof HTMLSelectElement) || !MODELS_PAGE_STATE.root.contains(select)) {
      return;
    }

    setQueryParam('sort', select.value);
    renderModelsDirectory();
  });

  document.addEventListener('click', async (event) => {
    if (!MODELS_PAGE_STATE.root) return;

    const filterButton = event.target.closest('[data-models-primary-filter]');
    if (filterButton instanceof HTMLButtonElement && MODELS_PAGE_STATE.root.contains(filterButton)) {
      setQueryParam('filter', filterButton.getAttribute('data-models-primary-filter') || 'all');
      renderModelsDirectory();
      return;
    }

    const activateButton = event.target.closest('[data-model-activate]');
    if (activateButton instanceof HTMLButtonElement && MODELS_PAGE_STATE.root.contains(activateButton)) {
      const modelId = normalizeString(activateButton.getAttribute('data-model-activate'));
      if (!modelId) return;

      activateButton.disabled = true;
      await activatePublicModel(modelId, { source: 'models-directory' });
      window.location.href = '/';
    }
  });

  window.addEventListener('popstate', renderModelsDirectory);

  subscribeActiveModelState((snapshot) => {
    MODELS_PAGE_STATE.activeModelId = normalizeString(snapshot?.activeModelId || '');
    if (MODELS_PAGE_STATE.root) {
      renderModelsDirectory();
    }
  });
}

/* =============================================================================
   08) INITIALIZATION
============================================================================= */
async function initModelsPage() {
  if (!isModelsPage()) {
    return;
  }

  MODELS_PAGE_STATE.root = getModelsRoot();
  if (!MODELS_PAGE_STATE.root) {
    return;
  }

  const [config] = await Promise.all([
    fetchJson(MODELS_SECTION_URL),
    loadPublicModelRegistry()
  ]);

  MODELS_PAGE_STATE.config = config;
  MODELS_PAGE_STATE.activeModelId = normalizeString(getActiveModelState().activeModelId || '');
  bindModelsEvents();
  renderModelsDirectory();
}

void initModelsPage();

/* =============================================================================
   09) END OF FILE
============================================================================= */
