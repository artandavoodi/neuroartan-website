const WORKSPACE_DASHBOARD_DETAIL_STORAGE_KEY = 'neuroartan.home.workspace.dashboard.detail';

const WORKSPACE_DASHBOARD_DETAILS = new Set([
  'social-overview',
  'social-summary',
  'social-metrics',
  'social-graph',
  'model-state',
  'model-checks',
  'model-blockers',
  'model-history',
  'model-monetization',
]);

function normalizeWorkspaceDashboardDetail(detail = '') {
  const normalized = typeof detail === 'string' ? detail.trim() : '';
  return WORKSPACE_DASHBOARD_DETAILS.has(normalized) ? normalized : '';
}

function readStoredDetail() {
  try {
    return normalizeWorkspaceDashboardDetail(
      window.localStorage.getItem(WORKSPACE_DASHBOARD_DETAIL_STORAGE_KEY) || ''
    );
  } catch {
    return '';
  }
}

function writeStoredDetail(detail = '') {
  try {
    const normalized = normalizeWorkspaceDashboardDetail(detail);
    if (normalized) {
      window.localStorage.setItem(WORKSPACE_DASHBOARD_DETAIL_STORAGE_KEY, normalized);
    } else {
      window.localStorage.removeItem(WORKSPACE_DASHBOARD_DETAIL_STORAGE_KEY);
    }
  } catch {}
}

function setShellDetailBack(active) {
  document.dispatchEvent(new CustomEvent('home:platform-shell-detail-state-changed', {
    detail: {
      active: active === true,
      label: 'Back to Dashboard',
    },
  }));
}

function setActiveDetail(root, detail = '', options = {}) {
  const normalized = normalizeWorkspaceDashboardDetail(detail);
  root.querySelectorAll('[data-workspace-dashboard-view]').forEach((view) => {
    const viewName = view.getAttribute('data-workspace-dashboard-view') || '';
    view.hidden = normalized ? viewName !== normalized : viewName !== 'overview';
  });
  root.dataset.workspaceDashboardActiveDetail = normalized;
  setShellDetailBack(Boolean(normalized));
  if (options.persist !== false) {
    writeStoredDetail(normalized);
  }
}

function bindWorkspaceDashboardRoutes(root) {
  if (!(root instanceof HTMLElement) || root.dataset.workspaceDashboardBound === 'true') return;
  root.dataset.workspaceDashboardBound = 'true';

  root.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-workspace-dashboard-detail]');
    if (!(trigger instanceof HTMLButtonElement)) return;

    setActiveDetail(root, trigger.getAttribute('data-workspace-dashboard-detail') || '');
  });
}

export function mountHomePlatformDestination(root) {
  setActiveDetail(root, readStoredDetail(), { persist: false });
  bindWorkspaceDashboardRoutes(root);

  return () => setShellDetailBack(false);
}

export function handleHomePlatformBack(root) {
  setActiveDetail(root, '');
  return true;
}
