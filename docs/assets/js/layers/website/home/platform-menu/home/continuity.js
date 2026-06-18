import {
  clampHomeOverviewNumber,
  readHomeOverviewSnapshot,
} from './home-overview-snapshot.js';

const HOME_CONTINUITY_RETRY_TIMERS = new WeakMap();

function getHomeConfig() {
  try {
    const parsed = JSON.parse(localStorage.getItem('neuroartan-home-config') || '{}');
    return {
      ...parsed,
      visibility: {
        continuity: true,
        ...(parsed.visibility || {}),
      },
    };
  } catch (error) {
    console.error('[home-continuity] Failed to parse Home config.', error);
    return { visibility: { continuity: true } };
  }
}

function formatSince(value = '') {
  const time = Date.parse(value || '');
  if (!time) return 'Not started';
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(time));
}

function renderContinuityMetric(label, value, progress = 0, tone = 'memory') {
  return `
    <article class="home-continuity-overview__metric" data-home-continuity-tone="${tone}" style="--home-continuity-progress:${clampHomeOverviewNumber(progress, 0, 1)}">
      <span class="home-continuity-overview__metric-value">${value}</span>
      <span class="home-continuity-overview__metric-label">${label}</span>
    </article>
  `;
}

function renderContinuity(scope, snapshot = {}) {
  const content = scope.querySelector('[data-home-continuity-content]');
  if (!(content instanceof HTMLElement)) return;

  const continuityProgress = clampHomeOverviewNumber(snapshot.continuityProgress || 0, 0, 1);
  const memoryProgress = clampHomeOverviewNumber(snapshot.memoryItemCount / 24, 0, 1);
  const relationProgress = clampHomeOverviewNumber(snapshot.memoryEdgeCount / 48, 0, 1);
  const queueProgress = clampHomeOverviewNumber(snapshot.memoryQueueCount / 16, 0, 1);
  const longevity = snapshot.memoryPreferences?.indefiniteContinuityEnabled
    ? 'Indefinite'
    : `${Number(snapshot.memoryPreferences?.longevityYears || 25)} years`;

  content.innerHTML = `
    <div class="home-continuity-overview__summary">
      <div class="home-continuity-overview__dial" style="--home-continuity-dial-progress:${continuityProgress}" aria-label="Continuity ${Math.round(continuityProgress * 100)} percent">
        <span class="home-continuity-overview__dial-value">${Math.round(continuityProgress * 100)}%</span>
      </div>
      <div class="home-continuity-overview__stack">
        ${renderContinuityMetric('Since', formatSince(snapshot.model?.created_at), 1, 'identity')}
        ${renderContinuityMetric('Longevity', longevity, snapshot.memoryPreferences?.indefiniteContinuityEnabled ? 1 : 0.62, 'memory')}
        ${renderContinuityMetric('Memory', Number(snapshot.memoryItemCount || 0).toLocaleString(), memoryProgress, 'source')}
        ${renderContinuityMetric('Relations', Number(snapshot.memoryEdgeCount || 0).toLocaleString(), relationProgress, 'personality')}
        ${renderContinuityMetric('Review queue', Number(snapshot.memoryQueueCount || 0).toLocaleString(), queueProgress, 'voice')}
      </div>
    </div>
  `;
}

function scheduleRetry(scope) {
  const existing = HOME_CONTINUITY_RETRY_TIMERS.get(scope);
  if (existing) window.clearTimeout(existing);
  const timer = window.setTimeout(() => {
    HOME_CONTINUITY_RETRY_TIMERS.delete(scope);
    void updateContinuityDisplay(scope);
  }, 900);
  HOME_CONTINUITY_RETRY_TIMERS.set(scope, timer);
}

function clearRetry(scope) {
  const timer = HOME_CONTINUITY_RETRY_TIMERS.get(scope);
  if (timer) window.clearTimeout(timer);
  HOME_CONTINUITY_RETRY_TIMERS.delete(scope);
}

async function updateContinuityDisplay(scope) {
  const config = getHomeConfig();
  const content = scope.querySelector('[data-home-continuity-content]');
  const loading = scope.querySelector('[data-home-continuity-loading]');
  const empty = scope.querySelector('[data-home-module-empty-state]');

  if (config.visibility?.continuity === false) {
    scope.hidden = true;
    return;
  }

  scope.hidden = false;
  if (content instanceof HTMLElement) content.hidden = true;
  if (empty instanceof HTMLElement) empty.hidden = true;
  if (loading instanceof HTMLElement) loading.hidden = false;
  scope.setAttribute('aria-busy', 'true');

  let keepLoading = false;
  try {
    const snapshot = await readHomeOverviewSnapshot();
    if (snapshot.resolving) {
      keepLoading = true;
      scheduleRetry(scope);
      return;
    }

    clearRetry(scope);
    const hasContinuity = Boolean(snapshot.model?.id);
    if (!hasContinuity) {
      if (empty instanceof HTMLElement) empty.hidden = false;
      return;
    }

    renderContinuity(scope, snapshot);
    if (content instanceof HTMLElement) content.hidden = false;
  } finally {
    if (!keepLoading) {
      if (loading instanceof HTMLElement) loading.hidden = true;
      scope.setAttribute('aria-busy', 'false');
    }
  }
}

function listenForChanges(scope) {
  const controller = new AbortController();
  const rerender = () => void updateContinuityDisplay(scope);
  document.addEventListener('neuroartan:home:visibility:changed', (event) => {
    if (event.detail?.moduleId === 'continuity') rerender();
  }, { signal: controller.signal });
  document.addEventListener('neuroartan:home:initialized', rerender, { signal: controller.signal });
  document.addEventListener('neuroartan:supabase-ready', rerender, { signal: controller.signal });
  document.addEventListener('model:projection-updated', rerender, { signal: controller.signal });
  return () => controller.abort();
}

export function mountHomeContinuity(root) {
  const scope = root?.querySelector?.('[data-home-overview-module="continuity"]')
    || (root?.matches?.('[data-home-overview-module="continuity"]') ? root : null);

  if (!(scope instanceof Element)) return null;

  void updateContinuityDisplay(scope);
  const cleanup = listenForChanges(scope);
  const interval = window.setInterval(() => void updateContinuityDisplay(scope), 45000);

  return () => {
    clearRetry(scope);
    cleanup?.();
    window.clearInterval(interval);
  };
}
