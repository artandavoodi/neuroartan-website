import {
  readHomeOverviewSnapshot,
  titleizeHomeOverview,
} from './home-overview-snapshot.js';

const HOME_NOW_RETRY_TIMERS = new WeakMap();

function getHomeConfig() {
  try {
    const parsed = JSON.parse(localStorage.getItem('neuroartan-home-config') || '{}');
    return {
      ...parsed,
      visibility: {
        now: true,
        ...(parsed.visibility || {}),
      },
    };
  } catch (error) {
    console.error('[home-now] Failed to parse Home config.', error);
    return { visibility: { now: true } };
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

function formatTime(value = '') {
  const time = Date.parse(value || '');
  if (!time) return 'Now';
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(time));
}

function renderActivityItem(item = {}) {
  return `
    <article class="home-now-overview__activity">
      <span class="home-now-overview__activity-dot" data-home-now-activity-type="${escapeHtml(item.type || 'activity')}"></span>
      <span class="home-now-overview__activity-copy">
        <span class="home-now-overview__activity-label">${escapeHtml(item.label || 'Activity')}</span>
        <span class="home-now-overview__activity-meta">${escapeHtml(item.area || 'System')} · ${escapeHtml(formatTime(item.createdAt))}</span>
      </span>
    </article>
  `;
}

function renderNow(scope, snapshot = {}) {
  const content = scope.querySelector('[data-home-now-content]');
  if (!(content instanceof HTMLElement)) return;

  const activity = Array.isArray(snapshot.recentActivity) ? snapshot.recentActivity : [];
  const totalLiveSignals = snapshot.profilePostCount
    + snapshot.profileThoughtCount
    + snapshot.feedPostCount;

  content.innerHTML = `
    <div class="home-now-overview__grid">
      <article class="home-now-overview__metric" data-home-now-tone="activity">
        <span class="home-now-overview__metric-value">${Number(totalLiveSignals || 0).toLocaleString()}</span>
        <span class="home-now-overview__metric-label">Live activity</span>
      </article>
      <article class="home-now-overview__metric" data-home-now-tone="source">
        <span class="home-now-overview__metric-value">${Number(snapshot.sourceInputCount || 0).toLocaleString()}</span>
        <span class="home-now-overview__metric-label">Source inputs</span>
      </article>
      <article class="home-now-overview__metric" data-home-now-tone="memory">
        <span class="home-now-overview__metric-value">${Number(snapshot.memorySignalCount || 0).toLocaleString()}</span>
        <span class="home-now-overview__metric-label">Memory signals</span>
      </article>
    </div>
    <div class="home-now-overview__stream" aria-label="Recent live activity">
      ${activity.length
        ? activity.map(renderActivityItem).join('')
        : `<p class="home-now-overview__quiet">The workspace is ready. New changes, thoughts, posts, and source activity will appear here.</p>`}
    </div>
  `;
}

function scheduleRetry(scope) {
  const existing = HOME_NOW_RETRY_TIMERS.get(scope);
  if (existing) window.clearTimeout(existing);
  const timer = window.setTimeout(() => {
    HOME_NOW_RETRY_TIMERS.delete(scope);
    void updateNowDisplay(scope);
  }, 900);
  HOME_NOW_RETRY_TIMERS.set(scope, timer);
}

function clearRetry(scope) {
  const timer = HOME_NOW_RETRY_TIMERS.get(scope);
  if (timer) window.clearTimeout(timer);
  HOME_NOW_RETRY_TIMERS.delete(scope);
}

async function updateNowDisplay(scope) {
  const config = getHomeConfig();
  const content = scope.querySelector('[data-home-now-content]');
  const loading = scope.querySelector('[data-home-now-loading]');
  const empty = scope.querySelector('[data-home-module-empty-state]');

  if (config.visibility?.now === false) {
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
    const hasModel = Boolean(snapshot.model?.id);
    if (!hasModel) {
      if (empty instanceof HTMLElement) empty.hidden = false;
      return;
    }

    renderNow(scope, snapshot);
    if (content instanceof HTMLElement) content.hidden = false;
    scope.dataset.homeNowState = titleizeHomeOverview(snapshot.recentActivity?.[0]?.area || 'Ready');
  } finally {
    if (!keepLoading) {
      if (loading instanceof HTMLElement) loading.hidden = true;
      scope.setAttribute('aria-busy', 'false');
    }
  }
}

function listenForChanges(scope) {
  const controller = new AbortController();
  const rerender = () => void updateNowDisplay(scope);
  document.addEventListener('neuroartan:home:visibility:changed', (event) => {
    if (event.detail?.moduleId === 'now') rerender();
  }, { signal: controller.signal });
  document.addEventListener('neuroartan:home:initialized', rerender, { signal: controller.signal });
  document.addEventListener('neuroartan:supabase-ready', rerender, { signal: controller.signal });
  document.addEventListener('model:projection-updated', rerender, { signal: controller.signal });
  document.addEventListener('model:digital-brain-refresh-request', rerender, { signal: controller.signal });
  return () => controller.abort();
}

export function mountHomeNow(root) {
  const scope = root?.querySelector?.('[data-home-overview-module="now"]')
    || (root?.matches?.('[data-home-overview-module="now"]') ? root : null);

  if (!(scope instanceof Element)) return null;

  void updateNowDisplay(scope);
  const cleanup = listenForChanges(scope);
  const interval = window.setInterval(() => void updateNowDisplay(scope), 45000);

  return () => {
    clearRetry(scope);
    cleanup?.();
    window.clearInterval(interval);
  };
}
