import {
  getModelStoreBackendState,
  getOwnedCanonicalModel,
  listModelPersonalityCalibrationSessions,
  listModelSourceCalibrationSessions,
  readModelDigitalBrainPreferences,
} from '../../../system/model/model-store.js';
import { getActiveModelState } from '../../../system/model/active-model.js';
import {
  listModelKnowledgeEntries,
  listModelLogicRecords,
  listModelSourceVaultIndexEntries,
  listModelTrainingDatasetEntries,
  readLatestTrainingRecipe,
} from '../../../system/model/model-training-store.js';

const HOME_MODEL_DEFAULT_CONFIG = Object.freeze({
  showBrainScan: true,
  showReadiness: true,
  showSourceCoverage: true,
  showTrainingState: true,
  showVisibilityState: true,
});

const HOME_MODEL_LAYERS = Object.freeze([
  { id: 'identity', label: 'Identity' },
  { id: 'source', label: 'Source' },
  { id: 'memory', label: 'Memory' },
  { id: 'personality', label: 'Personality' },
  { id: 'voice', label: 'Voice' },
]);

function getHomeConfig() {
  const stored = localStorage.getItem('neuroartan-home-config');
  if (!stored) {
    return {
      visibility: { model: true },
      model: { ...HOME_MODEL_DEFAULT_CONFIG },
    };
  }

  try {
    const parsed = JSON.parse(stored);
    return {
      ...parsed,
      visibility: {
        model: true,
        ...(parsed.visibility || {}),
      },
      model: {
        ...HOME_MODEL_DEFAULT_CONFIG,
        ...(parsed.model || {}),
      },
    };
  } catch (error) {
    console.error('[home-model] Failed to parse Home config.', error);
    return {
      visibility: { model: true },
      model: { ...HOME_MODEL_DEFAULT_CONFIG },
    };
  }
}

function normalizeString(value = '') {
  return String(value || '').trim();
}

function normalizeNumber(value = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function titleize(value = '') {
  return normalizeString(value)
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase()) || 'Pending';
}

function normalizeActiveModelFallback(activeModel = {}) {
  const id = normalizeString(activeModel?.id || activeModel?.model_id || '');
  if (!id) return null;

  return {
    id,
    model_name: normalizeString(
      activeModel.model_name
      || activeModel.display_name
      || activeModel.search_title
      || activeModel.public_profile?.public_display_name
      || 'Active model'
    ),
    display_name: normalizeString(activeModel.display_name || activeModel.search_title || ''),
    model_status: normalizeString(activeModel.model_status || activeModel.status || 'active'),
    model_visibility: normalizeString(
      activeModel.model_visibility
      || activeModel.public_profile?.public_profile_visibility
      || 'public'
    ),
    publication_state: normalizeString(
      activeModel.publication_state
      || activeModel.public_profile?.public_route_status
      || 'published'
    ),
    readiness_state: normalizeString(activeModel.readiness_state || ''),
    model_image_url: normalizeString(activeModel.model_image_url || activeModel.public_profile?.public_avatar_url || ''),
  };
}

function getRecordAggregateCount(record = {}) {
  const metadata = record?.source_metadata && typeof record.source_metadata === 'object'
    ? record.source_metadata
    : {};
  return Math.max(
    1,
    normalizeNumber(metadata.source_vault_file_count)
      || normalizeNumber(metadata.file_count)
      || normalizeNumber(metadata.content_file_count)
      || normalizeNumber(record.aggregate_count)
      || 1
  );
}

function calculateModelReadiness(snapshot = {}) {
  const checks = [
    Boolean(snapshot.model?.id),
    snapshot.sourceInputCount > 0 || snapshot.sourceSessionCount > 0,
    snapshot.memoryInputCount > 0,
    snapshot.personalitySessionCount > 0,
    Boolean(snapshot.recipe?.id),
  ];
  const complete = checks.filter(Boolean).length;
  return Math.round((complete / checks.length) * 100);
}

function getLayerStrength(layerId, snapshot = {}) {
  switch (layerId) {
    case 'identity':
      return snapshot.model?.id ? 1 : 0.12;
    case 'source':
      return Math.min(1, (snapshot.sourceInputCount + snapshot.sourceSessionCount) / 12);
    case 'memory':
      return Math.min(1, snapshot.memoryInputCount / 12);
    case 'personality':
      return Math.min(1, snapshot.personalitySessionCount / 3);
    case 'voice':
      return snapshot.model?.model_image_url ? 0.75 : 0.22;
    default:
      return 0.2;
  }
}

function getLayerState(strength = 0) {
  if (strength >= 0.82) return 'stable';
  if (strength >= 0.42) return 'forming';
  if (strength > 0.12) return 'initial';
  return 'pending';
}

async function safeRead(label, reader, fallback) {
  try {
    return await reader();
  } catch (error) {
    console.warn(`[home-model] ${label} unavailable.`, error);
    return fallback;
  }
}

async function readHomeModelSnapshot() {
  const backend = getModelStoreBackendState();
  const ownedModel = await safeRead('Canonical model', () => getOwnedCanonicalModel(), null);
  const activeState = getActiveModelState();
  const model = ownedModel || normalizeActiveModelFallback(activeState.activeModel);
  if (!model?.id) {
    return {
      backend,
      model: null,
      sourceInputCount: 0,
      memoryInputCount: 0,
      sourceSessionCount: 0,
      personalitySessionCount: 0,
      recipe: null,
      digitalBrainPreferences: null,
      readiness: 0,
    };
  }

  if (!ownedModel?.id) {
    const snapshot = {
      backend: activeState.backendState || backend,
      model,
      sourceInputCount: 0,
      memoryInputCount: 0,
      sourceSessionCount: 0,
      personalitySessionCount: 0,
      recipe: null,
      digitalBrainPreferences: null,
    };

    return {
      ...snapshot,
      readiness: calculateModelReadiness(snapshot),
    };
  }

  const [
    sourceVaultRecords,
    trainingDatasets,
    knowledgeEntries,
    logicRecords,
    sourceSessions,
    personalitySessions,
    recipe,
    digitalBrainPreferences,
  ] = await Promise.all([
    safeRead('Source Vault records', () => listModelSourceVaultIndexEntries(), []),
    safeRead('Training datasets', () => listModelTrainingDatasetEntries(), []),
    safeRead('Knowledge entries', () => listModelKnowledgeEntries(), []),
    safeRead('Logic records', () => listModelLogicRecords(), []),
    safeRead('Source calibration sessions', () => listModelSourceCalibrationSessions(model.id), []),
    safeRead('Personality calibration sessions', () => listModelPersonalityCalibrationSessions(model.id), []),
    safeRead('Training recipe', () => readLatestTrainingRecipe(), null),
    safeRead('Digital Brain preferences', () => readModelDigitalBrainPreferences(model.id), null),
  ]);

  const sourceInputCount = sourceVaultRecords.reduce((total, record) => total + getRecordAggregateCount(record), 0)
    + trainingDatasets.length;
  const memoryInputCount = knowledgeEntries.length + logicRecords.length + trainingDatasets.length;
  const snapshot = {
    backend,
    model,
    sourceInputCount,
    memoryInputCount,
    sourceSessionCount: sourceSessions.length,
    personalitySessionCount: personalitySessions.length,
    recipe,
    digitalBrainPreferences,
  };

  return {
    ...snapshot,
    readiness: calculateModelReadiness(snapshot),
  };
}

function renderScan(scope, snapshot, settings) {
  const scan = scope.querySelector('[data-home-model-scan]');
  if (!(scan instanceof HTMLElement)) return;

  scan.hidden = settings.showBrainScan === false;
  if (scan.hidden) return;

  const layers = HOME_MODEL_LAYERS.map((layer) => {
    const strength = getLayerStrength(layer.id, snapshot);
    const state = getLayerState(strength);
    return {
      ...layer,
      strength,
      state,
    };
  });

  const connections = layers.slice(1).map((layer) => `
    <span class="home-model-scan__connection home-model-scan__connection--${layer.id}" aria-hidden="true"></span>
  `).join('');

  const nodes = layers.map((layer) => `
    <button
      class="home-model-scan__node home-model-scan__node--${layer.id}"
      type="button"
      data-home-model-scan-node="${layer.id}"
      data-home-model-scan-state="${layer.state}"
      style="--home-model-node-strength:${Math.max(0.16, layer.strength).toFixed(2)}"
      aria-label="${layer.label}: ${titleize(layer.state)}"
    >
      <span class="home-model-scan__node-label">${layer.label}</span>
    </button>
  `).join('');

  scan.innerHTML = `
    <div class="home-model-scan__brain" data-home-model-scan-mode="${snapshot.digitalBrainPreferences?.displayMode || 'connectome'}">
      <span class="home-model-scan__region home-model-scan__region--frontal" aria-hidden="true"></span>
      <span class="home-model-scan__region home-model-scan__region--temporal" aria-hidden="true"></span>
      <span class="home-model-scan__region home-model-scan__region--parietal" aria-hidden="true"></span>
      <span class="home-model-scan__region home-model-scan__region--cerebellum" aria-hidden="true"></span>
      ${connections}
      ${nodes}
    </div>
  `;
}

function createMetric(label, value, isVisible = true) {
  if (!isVisible) return '';
  return `
    <article class="home-model-overview__metric">
      <span class="home-model-overview__metric-value">${value}</span>
      <span class="home-model-overview__metric-label">${label}</span>
    </article>
  `;
}

function renderSummary(scope, snapshot, settings) {
  const modelName = scope.querySelector('[data-home-model-field="modelName"]');
  const modelState = scope.querySelector('[data-home-model-field="modelState"]');
  const metrics = scope.querySelector('[data-home-model-metrics]');
  const model = snapshot.model;

  if (modelName) {
    modelName.textContent = model?.model_name || model?.display_name || 'No active model';
  }

  if (modelState) {
    const publication = titleize(model?.publication_state || '');
    const status = titleize(model?.model_status || '');
    modelState.textContent = model?.id
      ? `${status} · ${publication}`
      : snapshot.backend?.supabaseConfigured
        ? 'No canonical model is selected.'
        : 'Model backend is unavailable.';
  }

  if (metrics instanceof HTMLElement) {
    metrics.innerHTML = [
      createMetric('Readiness', `${snapshot.readiness}%`, settings.showReadiness),
      createMetric('Inputs', snapshot.sourceInputCount.toLocaleString(), settings.showSourceCoverage),
      createMetric('Training', titleize(snapshot.recipe?.readinessState || snapshot.recipe?.recipeState || 'draft'), settings.showTrainingState),
      createMetric('Visibility', titleize(model?.model_visibility || 'private'), settings.showVisibilityState),
    ].join('');
  }
}

async function updateModelDisplay(scope) {
  const config = getHomeConfig();
  const content = scope.querySelector('[data-home-model-content]');
  const empty = scope.querySelector('[data-home-module-empty-state]');

  if (config.visibility?.model === false) {
    scope.hidden = true;
    return;
  }

  scope.hidden = false;

  const snapshot = await readHomeModelSnapshot();
  const hasModel = Boolean(snapshot.model?.id);
  if (content instanceof HTMLElement) content.hidden = !hasModel;
  if (empty instanceof HTMLElement) empty.hidden = hasModel;
  if (!hasModel) return;

  renderScan(scope, snapshot, config.model || HOME_MODEL_DEFAULT_CONFIG);
  renderSummary(scope, snapshot, config.model || HOME_MODEL_DEFAULT_CONFIG);
}

function listenForConfigChanges(scope) {
  const controller = new AbortController();
  const rerender = () => {
    void updateModelDisplay(scope);
  };

  document.addEventListener('neuroartan:home:visibility:changed', (event) => {
    if (event.detail?.moduleId === 'model') rerender();
  }, { signal: controller.signal });
  document.addEventListener('neuroartan:home:model:changed', rerender, { signal: controller.signal });
  document.addEventListener('neuroartan:home:initialized', rerender, { signal: controller.signal });
  document.addEventListener('neuroartan:active-model-changed', rerender, { signal: controller.signal });
  document.addEventListener('neuroartan:supabase-ready', rerender, { signal: controller.signal });
  document.addEventListener('model:digital-brain-refresh-request', rerender, { signal: controller.signal });
  document.addEventListener('model:projection-updated', rerender, { signal: controller.signal });

  return () => controller.abort();
}

export function mountHomeModel(root) {
  const scope = root?.querySelector?.('[data-home-overview-module="model"]')
    || (root?.matches?.('[data-home-overview-module="model"]') ? root : null);

  if (!(scope instanceof Element)) return null;

  void updateModelDisplay(scope);
  const cleanupConfigChanges = listenForConfigChanges(scope);
  const updateInterval = window.setInterval(() => {
    void updateModelDisplay(scope);
  }, 45000);

  return () => {
    cleanupConfigChanges?.();
    window.clearInterval(updateInterval);
  };
}
