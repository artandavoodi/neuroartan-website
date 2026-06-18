import { readHomeOverviewSnapshot } from './home-overview-snapshot.js';

const HOME_MODEL_DEFAULT_CONFIG = Object.freeze({
  showReadiness: true,
  showSourceCoverage: true,
  showTrainingState: true,
  showActivityState: true,
  showVisibilityState: true,
});

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
  const modelState = scope.querySelector('[data-home-model-field="modelState"]');
  const modelVisibility = scope.querySelector('[data-home-model-field="modelVisibility"]');
  const metrics = scope.querySelector('[data-home-model-metrics]');
  const model = snapshot.model;

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
    const trainingProgress = clampNumber(snapshot.trainingProgress ?? getTrainingProgress(snapshot.recipe), 0, 1);
    const memoryCount = normalizeNumber(snapshot.memorySignalCount || snapshot.memoryInputCount || 0);
    const memoryProgress = Math.min(1, Math.log10(Math.max(1, memoryCount)) / 3);
    metrics.innerHTML = [
      `<div class="home-model-overview__activity-rings" aria-label="Model activity rings">
        ${createActivityRing('Readiness', snapshot.readiness / 100, 'identity', 0)}
        ${createActivityRing('Inputs', inputProgress, 'source', 1)}
        ${createActivityRing('Training', trainingProgress, 'memory', 2)}
      </div>`,
      `<div class="home-model-overview__activity-stack">
        ${createActivityMetric('Readiness', `${snapshot.readiness}%`, snapshot.readiness / 100, 'identity', settings.showReadiness)}
        ${createActivityMetric('Inputs', snapshot.sourceInputCount.toLocaleString(), inputProgress, 'source', settings.showSourceCoverage)}
        ${createActivityMetric('Memory', memoryCount.toLocaleString(), memoryProgress, 'personality', settings.showActivityState)}
        ${createActivityMetric('Training', trainingLabel, trainingProgress, 'memory', settings.showTrainingState)}
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
    const snapshot = await readHomeOverviewSnapshot();
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
