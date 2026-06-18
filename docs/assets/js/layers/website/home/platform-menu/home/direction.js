import { readHomeOverviewSnapshot } from './home-overview-snapshot.js';

const HOME_DIRECTION_RETRY_TIMERS = new WeakMap();

function getHomeConfig() {
  try {
    const parsed = JSON.parse(localStorage.getItem('neuroartan-home-config') || '{}');
    return {
      ...parsed,
      visibility: {
        direction: true,
        ...(parsed.visibility || {}),
      },
    };
  } catch (error) {
    console.error('[home-direction] Failed to parse Home config.', error);
    return { visibility: { direction: true } };
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

function renderDirectionItem(item = {}, index = 0) {
  return `
    <a class="home-direction-overview__item" href="${escapeHtml(item.href || '#')}" data-home-direction-priority="${index + 1}">
      <span class="home-direction-overview__priority">${index + 1}</span>
      <span class="home-direction-overview__copy">
        <span class="home-direction-overview__label">${escapeHtml(item.label || 'Review model')}</span>
        <span class="home-direction-overview__detail">${escapeHtml(item.detail || '')}</span>
      </span>
    </a>
  `;
}

function renderDirection(scope, snapshot = {}) {
  const content = scope.querySelector('[data-home-direction-content]');
  if (!(content instanceof HTMLElement)) return;

  const items = Array.isArray(snapshot.directionItems) ? snapshot.directionItems : [];
  content.innerHTML = `
    <div class="home-direction-overview__list">
      ${items.map(renderDirectionItem).join('')}
    </div>
  `;
}

function scheduleRetry(scope) {
  const existing = HOME_DIRECTION_RETRY_TIMERS.get(scope);
  if (existing) window.clearTimeout(existing);
  const timer = window.setTimeout(() => {
    HOME_DIRECTION_RETRY_TIMERS.delete(scope);
    void updateDirectionDisplay(scope);
  }, 900);
  HOME_DIRECTION_RETRY_TIMERS.set(scope, timer);
}

function clearRetry(scope) {
  const timer = HOME_DIRECTION_RETRY_TIMERS.get(scope);
  if (timer) window.clearTimeout(timer);
  HOME_DIRECTION_RETRY_TIMERS.delete(scope);
}

async function updateDirectionDisplay(scope) {
  const config = getHomeConfig();
  const content = scope.querySelector('[data-home-direction-content]');
  const loading = scope.querySelector('[data-home-direction-loading]');
  const empty = scope.querySelector('[data-home-module-empty-state]');

  if (config.visibility?.direction === false) {
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
    const hasDirection = Array.isArray(snapshot.directionItems) && snapshot.directionItems.length > 0;
    if (!hasDirection) {
      if (empty instanceof HTMLElement) empty.hidden = false;
      return;
    }

    renderDirection(scope, snapshot);
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
  const rerender = () => void updateDirectionDisplay(scope);
  document.addEventListener('neuroartan:home:visibility:changed', (event) => {
    if (event.detail?.moduleId === 'direction') rerender();
  }, { signal: controller.signal });
  document.addEventListener('neuroartan:home:initialized', rerender, { signal: controller.signal });
  document.addEventListener('neuroartan:supabase-ready', rerender, { signal: controller.signal });
  document.addEventListener('model:projection-updated', rerender, { signal: controller.signal });
  return () => controller.abort();
}

export function mountHomeDirection(root) {
  const scope = root?.querySelector?.('[data-home-overview-module="direction"]')
    || (root?.matches?.('[data-home-overview-module="direction"]') ? root : null);

  if (!(scope instanceof Element)) return null;

  void updateDirectionDisplay(scope);
  const cleanup = listenForChanges(scope);
  const interval = window.setInterval(() => void updateDirectionDisplay(scope), 45000);

  return () => {
    clearRetry(scope);
    cleanup?.();
    window.clearInterval(interval);
  };
}
