import {
  readHomeOverviewSnapshot,
  titleizeHomeOverview,
} from './home-overview-snapshot.js';

const HOME_SYSTEM_STATE_RETRY_TIMERS = new WeakMap();

function getHomeConfig() {
  try {
    const parsed = JSON.parse(localStorage.getItem('neuroartan-home-config') || '{}');
    return {
      ...parsed,
      visibility: {
        'system-state': true,
        ...(parsed.visibility || {}),
      },
    };
  } catch (error) {
    console.error('[home-system-state] Failed to parse Home config.', error);
    return { visibility: { 'system-state': true } };
  }
}

function escapeHtml(value = '') {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getStateTone(state = '') {
  const normalized = String(state || '').toLowerCase();
  if (['ready', 'connected', 'active', 'stable', 'operational'].includes(normalized)) return 'ready';
  if (['forming', 'partial', 'draft', 'queued', 'processing'].includes(normalized)) return 'forming';
  return 'quiet';
}

function renderSystemItem(label, value, state = 'ready') {
  return `
    <article class="home-system-state-overview__item" data-home-system-state-tone="${getStateTone(state)}">
      <span class="home-system-state-overview__dot" aria-hidden="true"></span>
      <span class="home-system-state-overview__copy">
        <span class="home-system-state-overview__label">${escapeHtml(label)}</span>
        <span class="home-system-state-overview__value">${escapeHtml(value)}</span>
      </span>
    </article>
  `;
}

function renderSystemState(scope, snapshot = {}) {
  const content = scope.querySelector('[data-home-system-state-content]');
  if (!(content instanceof HTMLElement)) return;

  const modelState = snapshot.model?.id ? 'Operational' : 'No model';
  const sourceState = snapshot.sourceInputCount > 0 ? 'Connected' : 'Awaiting source';
  const memoryState = snapshot.memoryItemCount > 0 || snapshot.memoryQueueCount > 0 ? 'Forming' : 'Not consolidated';
  const voiceState = snapshot.voiceSampleCount > 0 ? 'Training' : 'Awaiting capture';
  const runtimeState = snapshot.backend?.supabaseConfigured ? 'Ready' : 'Local only';

  content.innerHTML = `
    <div class="home-system-state-overview__grid">
      ${renderSystemItem('Runtime', runtimeState, runtimeState)}
      ${renderSystemItem('Model', modelState, modelState)}
      ${renderSystemItem('Source', sourceState, sourceState)}
      ${renderSystemItem('Memory', memoryState, memoryState)}
      ${renderSystemItem('Voice', voiceState, voiceState)}
      ${renderSystemItem('Training', titleizeHomeOverview(snapshot.recipe?.readinessState || snapshot.recipe?.recipeState || 'Draft'), snapshot.recipe?.readinessState || snapshot.recipe?.recipeState || 'draft')}
    </div>
  `;
}

function scheduleRetry(scope) {
  const existing = HOME_SYSTEM_STATE_RETRY_TIMERS.get(scope);
  if (existing) window.clearTimeout(existing);
  const timer = window.setTimeout(() => {
    HOME_SYSTEM_STATE_RETRY_TIMERS.delete(scope);
    void updateSystemState(scope);
  }, 900);
  HOME_SYSTEM_STATE_RETRY_TIMERS.set(scope, timer);
}

function clearRetry(scope) {
  const timer = HOME_SYSTEM_STATE_RETRY_TIMERS.get(scope);
  if (timer) window.clearTimeout(timer);
  HOME_SYSTEM_STATE_RETRY_TIMERS.delete(scope);
}

async function updateSystemState(scope) {
  const config = getHomeConfig();
  const content = scope.querySelector('[data-home-system-state-content]');
  const loading = scope.querySelector('[data-home-system-state-loading]');
  const empty = scope.querySelector('[data-home-module-empty-state]');

  if (config.visibility?.['system-state'] === false) {
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
    const hasSystemState = Boolean(snapshot.user?.id || snapshot.backend?.supabaseConfigured);
    if (!hasSystemState) {
      if (empty instanceof HTMLElement) empty.hidden = false;
      return;
    }

    renderSystemState(scope, snapshot);
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
  const rerender = () => void updateSystemState(scope);
  document.addEventListener('neuroartan:home:visibility:changed', (event) => {
    if (event.detail?.moduleId === 'system-state') rerender();
  }, { signal: controller.signal });
  document.addEventListener('neuroartan:home:initialized', rerender, { signal: controller.signal });
  document.addEventListener('neuroartan:supabase-ready', rerender, { signal: controller.signal });
  document.addEventListener('model:projection-updated', rerender, { signal: controller.signal });
  return () => controller.abort();
}

export function mountHomeSystemState(root) {
  const scope = root?.querySelector?.('[data-home-overview-module="system-state"]')
    || (root?.matches?.('[data-home-overview-module="system-state"]') ? root : null);

  if (!(scope instanceof Element)) return null;

  void updateSystemState(scope);
  const cleanup = listenForChanges(scope);
  const interval = window.setInterval(() => void updateSystemState(scope), 45000);

  return () => {
    clearRetry(scope);
    cleanup?.();
    window.clearInterval(interval);
  };
}
