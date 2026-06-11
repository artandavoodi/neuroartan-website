import {
  getCurrentSupabaseUser,
  getModelStoreBackendState,
  getOwnedCanonicalModel,
  listModelPersonalityCalibrationSessions,
  listModelSourceCalibrationSessions,
} from '../../../system/model/model-store.js';
import {
  listModelKnowledgeEntries,
  listModelLogicRecords,
  listModelSourceVaultIndexEntries,
  listModelTrainingDatasetEntries,
  readLatestTrainingRecipe,
} from '../../../system/model/model-training-store.js';

const HOME_MODEL_DEFAULT_CONFIG = Object.freeze({
  showReadiness: true,
  showSourceCoverage: true,
  showTrainingState: true,
  showActivityState: true,
  showVisibilityState: true,
});

const HOME_MODEL_READ_TIMEOUT_MS = 6500;
const HOME_MODEL_READ_TIMEOUT = Object.freeze({ __homeModelReadTimeout: true });
const HOME_MODEL_RETRY_TIMERS = new WeakMap();

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

function clampNumber(value = 0, min = 0, max = 1) {
  return Math.min(max, Math.max(min, normalizeNumber(value)));
}

function titleize(value = '') {
  return normalizeString(value)
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase()) || 'Pending';
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

function getTrainingProgress(recipe = null) {
  const state = normalizeString(recipe?.readinessState || recipe?.recipeState || '').toLowerCase();
  if (['ready', 'complete', 'completed', 'trained', 'active'].includes(state)) return 1;
  if (['running', 'training', 'processing', 'queued'].includes(state)) return 0.72;
  if (['draft', 'pending', 'not_requested'].includes(state)) return 0.28;
  return recipe?.id ? 0.42 : 0.08;
}

function getVisibilityState(model = {}) {
  const visibility = normalizeString(model?.model_visibility || '').toLowerCase();
  const publication = normalizeString(model?.publication_state || '').toLowerCase();
  if (visibility === 'public' && publication === 'published') return 'visible';
  if (visibility === 'public') return 'partial';
  if (['friends', 'followers', 'family', 'subscribers'].includes(visibility)) return 'limited';
  return 'private';
}

async function safeRead(label, reader, fallback) {
  try {
    return await reader();
  } catch (error) {
    console.warn(`[home-model] ${label} unavailable.`, error);
    return fallback;
  }
}

async function withReadTimeout(promise, fallback, timeoutMs = HOME_MODEL_READ_TIMEOUT_MS) {
  if (!timeoutMs || timeoutMs < 1) return promise;

  let timeoutId = null;
  const timeout = new Promise((resolve) => {
    timeoutId = window.setTimeout(() => resolve(fallback), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timeoutId) window.clearTimeout(timeoutId);
  }
}

async function readHomeModelSnapshot() {
  const backend = getModelStoreBackendState();
  const user = await withReadTimeout(
    safeRead('Current user', () => getCurrentSupabaseUser(), null),
    HOME_MODEL_READ_TIMEOUT
  );
  if (user === HOME_MODEL_READ_TIMEOUT) {
    return { backend, resolving: true };
  }

  if (!user?.id) {
    return {
      backend,
      model: null,
      sourceInputCount: 0,
      memoryInputCount: 0,
      sourceSessionCount: 0,
      personalitySessionCount: 0,
      recipe: null,
      readiness: 0,
    };
  }

  const ownedModel = await withReadTimeout(
    safeRead('Canonical model', () => getOwnedCanonicalModel(), null),
    HOME_MODEL_READ_TIMEOUT
  );
  if (ownedModel === HOME_MODEL_READ_TIMEOUT) {
    return { backend, resolving: true };
  }

  const model = ownedModel || null;
  if (!model?.id) {
    return {
      backend,
      model: null,
      sourceInputCount: 0,
      memoryInputCount: 0,
      sourceSessionCount: 0,
      personalitySessionCount: 0,
      recipe: null,
      readiness: 0,
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
  ] = await Promise.all([
    withReadTimeout(safeRead('Source Vault records', () => listModelSourceVaultIndexEntries(), []), []),
    withReadTimeout(safeRead('Training datasets', () => listModelTrainingDatasetEntries(), []), []),
    withReadTimeout(safeRead('Knowledge entries', () => listModelKnowledgeEntries(), []), []),
    withReadTimeout(safeRead('Logic records', () => listModelLogicRecords(), []), []),
    withReadTimeout(safeRead('Source calibration sessions', () => listModelSourceCalibrationSessions(model.id), []), []),
    withReadTimeout(safeRead('Personality calibration sessions', () => listModelPersonalityCalibrationSessions(model.id), []), []),
    withReadTimeout(safeRead('Training recipe', () => readLatestTrainingRecipe(), null), null),
  ]);

  const sourceVaultCount = sourceVaultRecords.reduce((total, record) => total + getRecordAggregateCount(record), 0);
  const trainingDatasetCount = trainingDatasets.length;
  const knowledgeEntryCount = knowledgeEntries.length;
  const logicRecordCount = logicRecords.length;
  const sourceInputCount = sourceVaultCount + trainingDatasetCount;
  const memoryInputCount = knowledgeEntryCount + logicRecordCount + trainingDatasetCount;
  const snapshot = {
    backend,
    model,
    sourceVaultCount,
    trainingDatasetCount,
    knowledgeEntryCount,
    logicRecordCount,
    sourceInputCount,
    memoryInputCount,
    sourceSessionCount: sourceSessions.length,
    personalitySessionCount: personalitySessions.length,
    recipe,
  };

  return {
    ...snapshot,
    readiness: calculateModelReadiness(snapshot),
  };
}

function scheduleHomeModelRetry(scope) {
  if (!(scope instanceof Element)) return;
  const existingTimer = HOME_MODEL_RETRY_TIMERS.get(scope);
  if (existingTimer) window.clearTimeout(existingTimer);
  const timer = window.setTimeout(() => {
    HOME_MODEL_RETRY_TIMERS.delete(scope);
    void updateModelDisplay(scope);
  }, 900);
  HOME_MODEL_RETRY_TIMERS.set(scope, timer);
}

function clearHomeModelRetry(scope) {
  const timer = HOME_MODEL_RETRY_TIMERS.get(scope);
  if (timer) window.clearTimeout(timer);
  HOME_MODEL_RETRY_TIMERS.delete(scope);
}

function createActivityMetric(label, value, progress = 0, tone = 'identity', isVisible = true) {
  if (!isVisible) return '';
  const normalizedProgress = clampNumber(progress, 0, 1);
  const progressDegrees = Math.round(normalizedProgress * 360);
  return `
    <article class="home-model-overview__activity-metric" data-home-model-metric-tone="${tone}" style="--home-model-ring-progress:${progressDegrees}deg">
      <span class="home-model-overview__metric-label">${label}</span>
      <span class="home-model-overview__metric-value">${value}</span>
    </article>
  `;
}

function createActivityRing(label, progress = 0, tone = 'identity', index = 0) {
  const normalizedProgress = clampNumber(progress, 0, 1);
  const progressDegrees = Math.round(normalizedProgress * 360);
  return `
    <span
      class="home-model-overview__activity-ring home-model-overview__activity-ring--${index + 1}"
      data-home-model-metric-tone="${tone}"
      style="--home-model-ring-progress:${progressDegrees}deg"
      aria-label="${label}: ${Math.round(normalizedProgress * 100)} percent"
      role="img"
    ></span>
  `;
}

function renderSummary(scope, snapshot, settings) {
  const modelName = scope.querySelector('[data-home-model-field="modelName"]');
  const modelState = scope.querySelector('[data-home-model-field="modelState"]');
  const modelVisibility = scope.querySelector('[data-home-model-field="modelVisibility"]');
  const metrics = scope.querySelector('[data-home-model-metrics]');
  const model = snapshot.model;

  if (modelName) {
    modelName.textContent = model?.model_name || model?.display_name || 'No active model';
  }

  if (modelState) {
    modelState.hidden = Boolean(model?.id);
    modelState.textContent = model?.id
      ? ''
      : snapshot.backend?.supabaseConfigured
        ? 'No canonical model is selected.'
        : 'Model backend is unavailable.';
  }

  if (modelVisibility) {
    const visibilityState = getVisibilityState(model);
    const visibilityLabel = titleize(model?.model_visibility || 'private');
    modelVisibility.textContent = '';
    modelVisibility.setAttribute('aria-label', `Visibility: ${visibilityLabel}`);
    modelVisibility.title = visibilityLabel;
    modelVisibility.dataset.homeModelVisibilityState = visibilityState;
    modelVisibility.hidden = settings.showVisibilityState === false;
  }

  if (metrics instanceof HTMLElement) {
    const inputProgress = Math.min(1, Math.log10(Math.max(1, snapshot.sourceInputCount)) / 3);
    const trainingLabel = titleize(snapshot.recipe?.readinessState || snapshot.recipe?.recipeState || 'draft');
    const trainingProgress = getTrainingProgress(snapshot.recipe);
    const activityCount = snapshot.sourceInputCount + snapshot.memoryInputCount + snapshot.sourceSessionCount + snapshot.personalitySessionCount;
    const activityProgress = Math.min(1, Math.log10(Math.max(1, activityCount)) / 3);
    metrics.innerHTML = [
      `<div class="home-model-overview__activity-rings" aria-label="Model activity rings">
        ${createActivityRing('Readiness', snapshot.readiness / 100, 'identity', 0)}
        ${createActivityRing('Inputs', inputProgress, 'source', 1)}
        ${createActivityRing('Training', trainingProgress, 'memory', 2)}
      </div>`,
      `<div class="home-model-overview__activity-stack">
        ${createActivityMetric('Readiness', `${snapshot.readiness}%`, snapshot.readiness / 100, 'identity', settings.showReadiness)}
        ${createActivityMetric('Inputs', snapshot.sourceInputCount.toLocaleString(), inputProgress, 'source', settings.showSourceCoverage)}
        ${createActivityMetric('Training', trainingLabel, trainingProgress, 'memory', settings.showTrainingState)}
        ${createActivityMetric('Signals', activityCount.toLocaleString(), activityProgress, 'personality', settings.showActivityState)}
      </div>`,
    ].join('');
  }
}

async function updateModelDisplay(scope) {
  const config = getHomeConfig();
  const content = scope.querySelector('[data-home-model-content]');
  const empty = scope.querySelector('[data-home-module-empty-state]');
  const loading = scope.querySelector('[data-home-model-loading]');

  if (config.visibility?.model === false) {
    scope.hidden = true;
    return;
  }

  scope.hidden = false;
  const hasRenderedContent = content instanceof HTMLElement && content.dataset.homeModelResolved === 'true';
  if (!hasRenderedContent && content instanceof HTMLElement) content.hidden = true;
  if (empty instanceof HTMLElement) empty.hidden = true;
  if (loading instanceof HTMLElement) loading.hidden = hasRenderedContent;
  scope.setAttribute('aria-busy', 'true');

  let keepLoading = false;
  try {
    const snapshot = await readHomeModelSnapshot();
    if (snapshot.resolving) {
      if (content instanceof HTMLElement) content.hidden = !hasRenderedContent;
      if (empty instanceof HTMLElement) empty.hidden = true;
      if (loading instanceof HTMLElement) loading.hidden = hasRenderedContent;
      scope.setAttribute('aria-busy', 'true');
      keepLoading = true;
      scheduleHomeModelRetry(scope);
      return;
    }

    clearHomeModelRetry(scope);
    const hasModel = Boolean(snapshot.model?.id);
    if (content instanceof HTMLElement) content.hidden = !hasModel && !hasRenderedContent;
    if (empty instanceof HTMLElement) empty.hidden = hasModel || hasRenderedContent;
    if (!hasModel) return;

    renderSummary(scope, snapshot, config.model || HOME_MODEL_DEFAULT_CONFIG);
    if (content instanceof HTMLElement) {
      content.dataset.homeModelResolved = 'true';
      content.hidden = false;
    }
  } finally {
    if (!keepLoading) {
      if (loading instanceof HTMLElement) loading.hidden = true;
      scope.setAttribute('aria-busy', 'false');
    }
  }
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
    clearHomeModelRetry(scope);
    cleanupConfigChanges?.();
    window.clearInterval(updateInterval);
  };
}
