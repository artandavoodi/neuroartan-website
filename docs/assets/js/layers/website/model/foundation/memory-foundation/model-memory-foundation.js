import {
  ensureOwnedCanonicalModel,
  getOwnedCanonicalModel,
  listModelSourceConnectors,
  listModelMemoryConsolidationQueue,
  listModelMemoryEdges,
  listModelMemoryItems,
  readModelMemoryPreferences,
  saveModelMemoryPreferences,
} from '../../../system/model/model-store.js';

import {
  listModelKnowledgeEntries,
  listModelLogicRecords,
  listModelSourceVaultPackageEntries,
  listModelTrainingDatasetEntries,
  listTrainingRecipes,
} from '../../../system/model/model-training-store.js';

import {
  getProfileThoughtState,
} from '../../../profile/private/thoughts/profile-thought-store.js';

import {
  listProfilePosts,
} from '../../../system/profile/profile-post-store.js';

const MEMORY_LOCAL_PREFERENCES_KEY = 'neuroartan.model.memory.preferences.v1';

const DEFAULT_MEMORY_PREFERENCES = Object.freeze({
  contextWindowDays: 30,
  lookbackYears: 10,
  longevityYears: 25,
  reviewCadenceDays: 90,
  decayPressure: 0.35,
  salienceThreshold: 0.55,
  recallStrictness: 0.7,
  sensitiveRecallEnabled: false,
  prospectiveRecallEnabled: true,
  indefiniteContinuityEnabled: false,
  socialMemoryIntakeEnabled: true,
  externalConnectorMemoryEnabled: false,
  trainingMemoryPropagationEnabled: true,
  memoryCompressionLevel: 0.65,
});

const MEMORY_CLASSES = Object.freeze([
  {
    key: 'working',
    label: 'Working memory',
    summary: 'Active task and near-context continuity.',
    icon: '/registry/icons/public/assets/layers/website/model/foundation/memory/memory-context-window.svg',
  },
  {
    key: 'episodic',
    label: 'Episodic continuity',
    summary: 'Events, experiences, sequence, and time.',
    icon: '/registry/icons/public/assets/core/cognition/continuity/timeline.svg',
  },
  {
    key: 'semantic',
    label: 'Semantic knowledge',
    summary: 'Facts, concepts, domains, and source-backed knowledge.',
    icon: '/registry/icons/public/assets/core/cognition/memory/memory.svg',
  },
  {
    key: 'procedural',
    label: 'Procedural patterns',
    summary: 'Routines, workflows, and learned preferences.',
    icon: '/registry/icons/public/assets/layers/website/model/foundation/memory/memory-procedural-pattern.svg',
  },
  {
    key: 'salience',
    label: 'Emotional salience',
    summary: 'Affective weight and recurring value signals.',
    icon: '/registry/icons/public/assets/layers/website/model/foundation/memory/memory-salience.svg',
  },
  {
    key: 'prospective',
    label: 'Prospective memory',
    summary: 'Future commitments, open loops, and reminders.',
    icon: '/registry/icons/public/assets/core/productivity/calendar/reminder.svg',
  },
  {
    key: 'retrieval',
    label: 'Retrieval graph',
    summary: 'Relationships, recall paths, and provenance links.',
    icon: '/registry/icons/public/assets/core/cognition/graph/graph.svg',
  },
]);

const MEMORY_STREAMS = Object.freeze([
  {
    key: 'sourcePackages',
    label: 'Source vault',
    icon: '/registry/icons/public/assets/layers/website/model/tabs/source.svg',
  },
  {
    key: 'datasets',
    label: 'Datasets',
    icon: '/registry/icons/public/assets/core/files/database/database.svg',
  },
  {
    key: 'knowledgeEntries',
    label: 'Knowledge',
    icon: '/registry/icons/public/assets/core/cognition/memory/memory.svg',
  },
  {
    key: 'logicRecords',
    label: 'Logic',
    icon: '/registry/icons/public/assets/layers/website/model/foundation/memory/memory-procedural-pattern.svg',
  },
  {
    key: 'thoughts',
    label: 'Thoughts',
    icon: '/registry/icons/public/assets/layers/website/profile/actions/thoughts.svg',
  },
  {
    key: 'posts',
    label: 'Posts',
    icon: '/registry/icons/public/assets/layers/website/profile/actions/posts.svg',
  },
  {
    key: 'connectors',
    label: 'Connectors',
    icon: '/registry/icons/public/assets/layers/website/home/platform-menu/settings/platform-menue-settings-connectors.svg',
  },
  {
    key: 'trainingRecipes',
    label: 'Training recipes',
    icon: '/registry/icons/public/assets/core/cognition/intelligence/training.svg',
  },
]);

const CONTROL_FIELDS = Object.freeze([
  {
    key: 'contextWindowDays',
    label: 'Context window',
    min: 1,
    max: 365,
    step: 1,
    unit: 'days',
    icon: '/registry/icons/public/assets/layers/website/model/foundation/memory/memory-context-window.svg',
  },
  {
    key: 'lookbackYears',
    label: 'Look-back period',
    min: 1,
    max: 100,
    step: 1,
    unit: 'years',
    icon: '/registry/icons/public/assets/layers/website/model/foundation/memory/memory-lookback.svg',
  },
  {
    key: 'longevityYears',
    label: 'Longevity',
    min: 1,
    max: 100,
    step: 1,
    unit: 'years',
    icon: '/registry/icons/public/assets/layers/website/model/foundation/memory/memory-longevity.svg',
  },
  {
    key: 'reviewCadenceDays',
    label: 'Review cadence',
    min: 7,
    max: 365,
    step: 1,
    unit: 'days',
    icon: '/registry/icons/public/assets/core/actions/review-approval-pane/review-approval-pane.svg',
  },
  {
    key: 'decayPressure',
    label: 'Decay pressure',
    min: 0,
    max: 1,
    step: 0.01,
    unit: '',
    icon: '/registry/icons/public/assets/layers/website/model/foundation/memory/memory-decay.svg',
  },
  {
    key: 'salienceThreshold',
    label: 'Salience threshold',
    min: 0,
    max: 1,
    step: 0.01,
    unit: '',
    icon: '/registry/icons/public/assets/layers/website/model/foundation/memory/memory-salience.svg',
  },
  {
    key: 'recallStrictness',
    label: 'Recall strictness',
    min: 0,
    max: 1,
    step: 0.01,
    unit: '',
    icon: '/registry/icons/public/assets/core/cognition/memory/recall.svg',
  },
  {
    key: 'memoryCompressionLevel',
    label: 'Compression level',
    min: 0,
    max: 1,
    step: 0.01,
    unit: '',
    icon: '/registry/icons/public/assets/layers/website/model/foundation/memory/memory-compression.svg',
  },
]);

const CONTROL_TOGGLES = Object.freeze([
  {
    key: 'indefiniteContinuityEnabled',
    label: 'Indefinite continuity',
    icon: '/registry/icons/public/assets/layers/website/model/foundation/memory/memory-indefinite-continuity.svg',
  },
  {
    key: 'socialMemoryIntakeEnabled',
    label: 'Social memory intake',
    icon: '/registry/icons/public/assets/layers/website/model/foundation/memory/memory-social-intake.svg',
  },
  {
    key: 'externalConnectorMemoryEnabled',
    label: 'External connector intake',
    icon: '/registry/icons/public/assets/layers/website/model/foundation/memory/memory-external-connector.svg',
  },
  {
    key: 'trainingMemoryPropagationEnabled',
    label: 'Training propagation',
    icon: '/registry/icons/public/assets/layers/website/model/foundation/memory/memory-training-link.svg',
  },
  {
    key: 'sensitiveRecallEnabled',
    label: 'Sensitive recall',
    icon: '/registry/icons/public/assets/layers/website/model/foundation/memory/memory-sensitive.svg',
  },
  {
    key: 'prospectiveRecallEnabled',
    label: 'Prospective recall',
    icon: '/registry/icons/public/assets/core/productivity/calendar/reminder.svg',
  },
]);

const overlayState = {
  root: null,
  model: null,
  preferences: { ...DEFAULT_MEMORY_PREFERENCES },
  memoryItems: [],
  queueItems: [],
  edges: [],
  liveSignals: {},
};

function escapeHtml(value = '') {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function readLocalPreferences(modelId = '') {
  try {
    const payload = JSON.parse(window.localStorage?.getItem(MEMORY_LOCAL_PREFERENCES_KEY) || '{}') || {};
    return payload?.[modelId] || null;
  } catch (error) {
    return null;
  }
}

function writeLocalPreferences(modelId = '', preferences = {}) {
  if (!modelId) return;
  try {
    const payload = JSON.parse(window.localStorage?.getItem(MEMORY_LOCAL_PREFERENCES_KEY) || '{}') || {};
    payload[modelId] = preferences;
    window.localStorage?.setItem(MEMORY_LOCAL_PREFERENCES_KEY, JSON.stringify(payload));
  } catch (error) {
    // Local fallback is best-effort only.
  }
}

function normalizePreferences(preferences = {}) {
  return {
    ...DEFAULT_MEMORY_PREFERENCES,
    ...preferences,
    contextWindowDays: clampNumber(preferences.contextWindowDays, DEFAULT_MEMORY_PREFERENCES.contextWindowDays, 1, 365),
    lookbackYears: clampNumber(preferences.lookbackYears, DEFAULT_MEMORY_PREFERENCES.lookbackYears, 1, 100),
    longevityYears: clampNumber(preferences.longevityYears, DEFAULT_MEMORY_PREFERENCES.longevityYears, 1, 100),
    reviewCadenceDays: clampNumber(preferences.reviewCadenceDays, DEFAULT_MEMORY_PREFERENCES.reviewCadenceDays, 7, 365),
    decayPressure: clampNumber(preferences.decayPressure, DEFAULT_MEMORY_PREFERENCES.decayPressure, 0, 1),
    salienceThreshold: clampNumber(preferences.salienceThreshold, DEFAULT_MEMORY_PREFERENCES.salienceThreshold, 0, 1),
    recallStrictness: clampNumber(preferences.recallStrictness, DEFAULT_MEMORY_PREFERENCES.recallStrictness, 0, 1),
    sensitiveRecallEnabled: preferences.sensitiveRecallEnabled === true,
    prospectiveRecallEnabled: preferences.prospectiveRecallEnabled !== false,
    indefiniteContinuityEnabled: preferences.indefiniteContinuityEnabled === true,
    socialMemoryIntakeEnabled: preferences.socialMemoryIntakeEnabled !== false,
    externalConnectorMemoryEnabled: preferences.externalConnectorMemoryEnabled === true,
    trainingMemoryPropagationEnabled: preferences.trainingMemoryPropagationEnabled !== false,
    memoryCompressionLevel: clampNumber(preferences.memoryCompressionLevel, DEFAULT_MEMORY_PREFERENCES.memoryCompressionLevel, 0, 1),
  };
}

function clampNumber(value, fallback, min, max) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(min, Math.min(max, Math.round(numeric * 100) / 100));
}

function formatControlValue(field, value) {
  if (field.unit) return `${value} ${field.unit}`;
  return `${Math.round(Number(value || 0) * 100)}%`;
}

async function resolveModel() {
  return ensureOwnedCanonicalModel().catch(() => getOwnedCanonicalModel().catch(() => null));
}

async function readMemoryState(model = null) {
  if (!model?.id) {
    return {
      preferences: { ...DEFAULT_MEMORY_PREFERENCES },
      memoryItems: [],
      queueItems: [],
      edges: [],
      liveSignals: {},
    };
  }

  const [
    remotePreferences,
    memoryItems,
    queueItems,
    edges,
    sourcePackages,
    datasets,
    knowledgeEntries,
    logicRecords,
    thoughtState,
    profilePosts,
    sourceConnectors,
    trainingRecipes,
  ] = await Promise.all([
    readModelMemoryPreferences(model.id).catch(() => null),
    listModelMemoryItems(model.id).catch(() => []),
    listModelMemoryConsolidationQueue(model.id, { queueState: 'pending' }).catch(() => []),
    listModelMemoryEdges(model.id).catch(() => []),
    listModelSourceVaultPackageEntries().catch(() => []),
    listModelTrainingDatasetEntries().catch(() => []),
    listModelKnowledgeEntries().catch(() => []),
    listModelLogicRecords().catch(() => []),
    Promise.resolve().then(() => getProfileThoughtState()).catch(() => ({})),
    listProfilePosts().catch(() => []),
    listModelSourceConnectors(model.id).catch(() => []),
    listTrainingRecipes().catch(() => []),
  ]);

  const localPreferences = readLocalPreferences(model.id);

  return {
    preferences: normalizePreferences(remotePreferences || localPreferences || DEFAULT_MEMORY_PREFERENCES),
    memoryItems,
    queueItems,
    edges,
    liveSignals: {
      sourcePackages: Array.isArray(sourcePackages) ? sourcePackages.length : 0,
      datasets: Array.isArray(datasets) ? datasets.length : 0,
      knowledgeEntries: Array.isArray(knowledgeEntries) ? knowledgeEntries.length : 0,
      logicRecords: Array.isArray(logicRecords) ? logicRecords.length : 0,
      thoughts: Array.isArray(thoughtState?.thoughts) ? thoughtState.thoughts.length : Number(thoughtState?.totalThoughts || 0),
      posts: Array.isArray(profilePosts) ? profilePosts.length : 0,
      connectors: Array.isArray(sourceConnectors) ? sourceConnectors.length : 0,
      trainingRecipes: Array.isArray(trainingRecipes) ? trainingRecipes.length : 0,
    },
  };
}

function calculateReadiness(memoryItems = [], queueItems = [], liveSignals = {}) {
  const accepted = memoryItems.length;
  const pending = queueItems.length;
  const signalCount = Object.values(liveSignals).reduce((sum, value) => sum + (Number(value) || 0), 0);
  const score = Math.min(100, Math.round((accepted * 12) + (pending * 4) + (signalCount * 2)));
  if (score >= 75) return { label: 'Calibrated', status: 'ready', score };
  if (score >= 35) return { label: 'Forming', status: 'forming', score };
  if (signalCount > 0 || pending > 0 || accepted > 0) return { label: 'Initial', status: 'initial', score };
  return { label: 'Not started', status: 'pending', score };
}

function classCount(key, memoryItems = [], liveSignals = {}) {
  const directCount = memoryItems.filter((item) => item.memoryType === key).length;
  if (directCount) return directCount;
  if (key === 'semantic') return (liveSignals.sourcePackages || 0) + (liveSignals.knowledgeEntries || 0) + (liveSignals.datasets || 0);
  if (key === 'procedural') return liveSignals.logicRecords || 0;
  if (key === 'episodic') return (liveSignals.thoughts || 0) + (liveSignals.posts || 0);
  if (key === 'retrieval') return (liveSignals.connectors || 0) + (liveSignals.trainingRecipes || 0);
  return 0;
}

function renderDashboard(root, state) {
  const { preferences, memoryItems, queueItems, liveSignals } = state;
  const readiness = calculateReadiness(memoryItems, queueItems, liveSignals);
  const readinessDot = root.querySelector('[data-model-memory-readiness-dot]');
  if (readinessDot) readinessDot.dataset.status = readiness.status;

  setText(root, '[data-model-memory-readiness]', `${readiness.label} · ${readiness.score}%`);
  setText(root, '[data-model-memory-accepted-count]', String(memoryItems.length));
  setText(root, '[data-model-memory-queue-count]', String(queueItems.length));
  setText(root, '[data-model-memory-lookback]', `${preferences.lookbackYears} years`);
  setText(root, '[data-model-memory-longevity]', preferences.indefiniteContinuityEnabled ? 'Continuity retained' : `${preferences.longevityYears} years`);

  const classesMount = root.querySelector('[data-model-memory-classes]');
  if (classesMount) {
    classesMount.innerHTML = MEMORY_CLASSES.map((memoryClass) => {
      const count = classCount(memoryClass.key, memoryItems, liveSignals);
      return `
        <article class="model-memory-foundation__class">
          <img class="model-memory-foundation__class-icon ui-icon-theme-aware" src="${memoryClass.icon}" alt="">
          <div class="model-memory-foundation__class-copy">
            <h4 class="model-memory-foundation__class-title">${escapeHtml(memoryClass.label)}</h4>
            <p class="model-memory-foundation__class-meta">${escapeHtml(memoryClass.summary)}</p>
            <p class="model-memory-foundation__class-meta">${count} signal${count === 1 ? '' : 's'}</p>
          </div>
        </article>
      `;
    }).join('');
  }

  const streamsMount = root.querySelector('[data-model-memory-streams]');
  if (streamsMount) {
    streamsMount.innerHTML = MEMORY_STREAMS.map((stream) => {
      const count = Number(liveSignals?.[stream.key] || 0);
      return `
        <article class="model-memory-foundation__stream">
          <img class="model-memory-foundation__class-icon ui-icon-theme-aware" src="${stream.icon}" alt="">
          <span class="model-memory-foundation__stream-label">${escapeHtml(stream.label)}</span>
          <strong class="model-memory-foundation__stream-value">${count}</strong>
        </article>
      `;
    }).join('');
  }
}

function setText(root, selector, value = '') {
  root.querySelectorAll(selector).forEach((node) => {
    node.textContent = value;
  });
}

function setStatus(root, message = '') {
  setText(root, '[data-model-memory-status]', message);
}

function createCloseButton(label = 'Close') {
  return `
    <button class="global-close-button" type="button" data-model-memory-overlay-close aria-label="${escapeHtml(label)}">
      <span class="global-close-button__line global-close-button__line--first" aria-hidden="true"></span>
      <span class="global-close-button__line global-close-button__line--second" aria-hidden="true"></span>
    </button>
  `;
}

function openOverlay(type = 'controls') {
  document.querySelector('[data-model-memory-overlay]')?.remove();

  const overlay = document.createElement('section');
  overlay.className = 'model-source-calibration-workspace';
  overlay.dataset.modelMemoryOverlay = type;
  overlay.innerHTML = `
    <div class="model-source-calibration-workspace__backdrop" data-model-memory-overlay-close></div>
    <article class="model-source-calibration-workspace__surface" role="dialog" aria-modal="true" aria-label="${escapeHtml(resolveOverlayTitle(type))}">
      <header class="model-source-calibration-workspace__header">
        <span class="model-source-calibration-workspace__progress">${escapeHtml(resolveOverlayTitle(type))}</span>
        ${createCloseButton(`Close ${resolveOverlayTitle(type)}`)}
      </header>
      <div class="model-source-calibration-workspace__body">
        <section class="model-source-calibration-workspace__result">
          ${renderOverlayBody(type)}
        </section>
      </div>
    </article>
  `;

  overlay.addEventListener('click', handleOverlayClick);
  overlay.addEventListener('input', handleOverlayInput);
  overlay.addEventListener('change', handleOverlayChange);
  document.body.append(overlay);
}

function resolveOverlayTitle(type = '') {
  if (type === 'database') return 'Memory Database';
  if (type === 'queue') return 'Consolidation Queue';
  if (type === 'graph') return 'Memory Graph';
  return 'Memory Controls';
}

function renderOverlayBody(type = 'controls') {
  if (type === 'database') return renderDatabaseOverlay();
  if (type === 'queue') return renderQueueOverlay();
  if (type === 'graph') return renderGraphOverlay();
  return renderControlsOverlay();
}

function renderControlsOverlay() {
  const preferences = overlayState.preferences;
  return `
    <section class="model-memory-foundation__overlay-section">
      <div class="model-memory-foundation__overlay-grid">
        ${CONTROL_FIELDS.map((field) => `
          <label class="model-memory-foundation__control">
            <span class="model-memory-foundation__control-row">
              <span class="model-memory-foundation__control-title">
                <img class="ui-icon-theme-aware" src="${field.icon}" alt="">
                ${escapeHtml(field.label)}
              </span>
              <span class="model-memory-foundation__control-value" data-model-memory-control-value="${field.key}">
                ${escapeHtml(formatControlValue(field, preferences[field.key]))}
              </span>
            </span>
            <input class="ui-slider" type="range" min="${field.min}" max="${field.max}" step="${field.step}" value="${preferences[field.key]}" data-model-memory-control="${field.key}">
          </label>
        `).join('')}
      </div>
      <div class="model-memory-foundation__toggle-list">
        ${CONTROL_TOGGLES.map((toggle) => renderMemoryToggle(toggle, preferences[toggle.key] === true)).join('')}
      </div>
      <button class="model-management__button" type="button" data-model-memory-save-preferences>Save Memory Controls</button>
    </section>
  `;
}

function renderMemoryToggle(toggle, checked = false) {
  return `
    <div class="model-memory-foundation__toggle">
      <span class="model-memory-foundation__control-title">
        <img class="ui-icon-theme-aware" src="${toggle.icon}" alt="">
        ${escapeHtml(toggle.label)}
      </span>
      <button class="na-toggle" type="button" role="switch" aria-checked="${checked ? 'true' : 'false'}" data-toggle-checked="${checked ? 'true' : 'false'}" data-model-memory-toggle="${toggle.key}" aria-label="Toggle ${escapeHtml(toggle.label)}">
        <span class="na-toggle__track" aria-hidden="true"><span class="na-toggle__thumb"></span></span>
        <span class="na-toggle__label" hidden>${checked ? 'On' : 'Off'}</span>
      </button>
    </div>
  `;
}

function renderDatabaseOverlay() {
  if (!overlayState.memoryItems.length) {
    return '<p class="model-memory-foundation__empty">No accepted memory objects recorded yet.</p>';
  }

  return `
    <section class="model-memory-foundation__list">
      ${overlayState.memoryItems.map((item) => `
        <article class="model-memory-foundation__item">
          <h4 class="model-memory-foundation__item-title">${escapeHtml(item.memoryTitle)}</h4>
          <p class="model-memory-foundation__item-meta">${escapeHtml(item.memoryType)} · confidence ${Math.round(item.confidenceScore * 100)}% · salience ${Math.round(item.salienceScore * 100)}%</p>
          ${item.memoryBody ? `<p class="model-memory-foundation__item-meta">${escapeHtml(item.memoryBody)}</p>` : ''}
        </article>
      `).join('')}
    </section>
  `;
}

function renderQueueOverlay() {
  if (!overlayState.queueItems.length) {
    return '<p class="model-memory-foundation__empty">No memory candidates are waiting for consolidation.</p>';
  }

  return `
    <section class="model-memory-foundation__list">
      ${overlayState.queueItems.map((item) => `
        <article class="model-memory-foundation__item">
          <h4 class="model-memory-foundation__item-title">${escapeHtml(item.candidateTitle)}</h4>
          <p class="model-memory-foundation__item-meta">${escapeHtml(item.proposedMemoryType)} · confidence ${Math.round(item.proposedConfidence * 100)}% · salience ${Math.round(item.proposedSalience * 100)}%</p>
          ${item.candidateBody ? `<p class="model-memory-foundation__item-meta">${escapeHtml(item.candidateBody)}</p>` : ''}
        </article>
      `).join('')}
    </section>
  `;
}

function renderGraphOverlay() {
  return `
    <section class="model-memory-foundation__graph" aria-label="Memory graph preview">
      ${MEMORY_CLASSES.map((memoryClass) => {
        const count = classCount(memoryClass.key, overlayState.memoryItems, overlayState.liveSignals);
        return `
          <article class="model-memory-foundation__node">
            <span class="model-memory-foundation__node-dot" data-density="${resolveNodeDensity(count)}"></span>
            <h4 class="model-memory-foundation__class-title">${escapeHtml(memoryClass.label)}</h4>
            <p class="model-memory-foundation__class-meta">${count} signal${count === 1 ? '' : 's'}</p>
          </article>
        `;
      }).join('')}
    </section>
  `;
}

function resolveNodeDensity(count = 0) {
  if (count >= 12) return 'high';
  if (count >= 4) return 'medium';
  if (count > 0) return 'low';
  return 'empty';
}

function handleOverlayClick(event) {
  if (event.target.closest('[data-model-memory-overlay-close]')) {
    event.currentTarget.remove();
    return;
  }

  if (event.target.closest('[data-model-memory-save-preferences]')) {
    void savePreferences();
    return;
  }

  const toggle = event.target.closest('[data-model-memory-toggle]');
  if (toggle instanceof HTMLElement) {
    const key = toggle.getAttribute('data-model-memory-toggle');
    const nextChecked = toggle.getAttribute('aria-checked') !== 'true';
    toggle.setAttribute('aria-checked', nextChecked ? 'true' : 'false');
    toggle.setAttribute('data-toggle-checked', nextChecked ? 'true' : 'false');
    toggle.setAttribute('data-toggle-state', nextChecked ? 'on' : 'off');
    const label = toggle.querySelector('.na-toggle__label');
    if (label) label.textContent = nextChecked ? 'On' : 'Off';
    overlayState.preferences = normalizePreferences({
      ...overlayState.preferences,
      [key]: nextChecked,
    });
  }
}

function handleOverlayInput(event) {
  const input = event.target.closest('[data-model-memory-control]');
  if (!input) return;
  const key = input.getAttribute('data-model-memory-control');
  overlayState.preferences = normalizePreferences({
    ...overlayState.preferences,
    [key]: Number(input.value),
  });
  const field = CONTROL_FIELDS.find((entry) => entry.key === key);
  const valueNode = event.currentTarget.querySelector(`[data-model-memory-control-value="${key}"]`);
  if (field && valueNode) valueNode.textContent = formatControlValue(field, overlayState.preferences[key]);
}

function handleOverlayChange() {}

async function savePreferences() {
  const modelId = overlayState.model?.id || '';
  if (!modelId) return;

  writeLocalPreferences(modelId, overlayState.preferences);
  try {
    const saved = await saveModelMemoryPreferences(modelId, overlayState.preferences);
    overlayState.preferences = normalizePreferences(saved || overlayState.preferences);
    setStatus(overlayState.root, 'Memory controls saved.');
  } catch (error) {
    setStatus(overlayState.root, 'Memory controls saved locally. Apply the Memory backend migration for cloud persistence.');
  }
  if (overlayState.root) renderDashboard(overlayState.root, overlayState);
}

async function refreshMemoryFoundation(root) {
  overlayState.root = root;
  const model = await resolveModel();
  overlayState.model = model;
  const state = await readMemoryState(model);
  overlayState.preferences = state.preferences;
  overlayState.memoryItems = state.memoryItems;
  overlayState.queueItems = state.queueItems;
  overlayState.edges = state.edges;
  overlayState.liveSignals = state.liveSignals;
  renderDashboard(root, overlayState);
}

export function mountModelMemoryFoundation(root = document) {
  const mount = root?.querySelector?.('[data-model-memory-foundation]');
  if (!(mount instanceof HTMLElement) || mount.dataset.modelMemoryFoundationMounted === 'true') return;

  mount.dataset.modelMemoryFoundationMounted = 'true';
  mount.addEventListener('click', (event) => {
    const button = event.target.closest('[data-model-memory-open]');
    if (!button) return;
    openOverlay(button.getAttribute('data-model-memory-open') || 'controls');
  });

  void refreshMemoryFoundation(mount);
}

document.addEventListener('model:memory-controls-open-request', () => openOverlay('controls'));
document.addEventListener('model:memory-database-open-request', () => openOverlay('database'));
document.addEventListener('model:memory-queue-open-request', () => openOverlay('queue'));
document.addEventListener('model:memory-graph-open-request', () => openOverlay('graph'));
document.addEventListener('model:projection-updated', () => {
  if (overlayState.root) void refreshMemoryFoundation(overlayState.root);
});
