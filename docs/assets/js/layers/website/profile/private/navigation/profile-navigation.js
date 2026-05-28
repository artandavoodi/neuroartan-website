/* =============================================================================
   01) MODULE STATE
   ============================================================================= */

const RUNTIME = (window.__NEUROARTAN_PROFILE_NAVIGATION__ ||= {
  initialized: false,
  state: null,
  subscribers: new Set()
});

/* =============================================================================
   02) CONSTANTS
   ============================================================================= */

const VALID_SECTIONS = new Set(['home', 'overview', 'posts', 'thoughts', 'dashboard', 'models', 'organizations', 'settings']);
const VALID_SETTINGS_PANES = new Set(['identity', 'route', 'privacy', 'password', 'verification']);
const VALID_DASHBOARD_PANES = new Set(['overview', 'summary', 'metrics', 'graph']);

function isPrivateProfileSurface() {
  return document.body?.dataset.profilePage === 'private';
}

function normalizeSection(value) {
  const normalized = String(value || '').trim().toLowerCase();

  switch (normalized) {
    case 'home':
      return 'home';
    case 'posts':
      return 'posts';
    case 'thoughts':
    case 'thought-bank':
      return 'thoughts';
    case 'edit-profile':
      return 'settings';
    default:
      return VALID_SECTIONS.has(normalized) ? normalized : 'home';
  }
}

function normalizeSettingsPane(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return VALID_SETTINGS_PANES.has(normalized) ? normalized : 'identity';
}

function normalizeDashboardPane(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return VALID_DASHBOARD_PANES.has(normalized) ? normalized : 'overview';
}

/* =============================================================================
   02A) ROUTE RESOLUTION
   ============================================================================= */

function buildNavigationState(section = 'overview', settingsPane = 'identity', dashboardPane = 'overview') {
  return {
    section: normalizeSection(section),
    settingsPane: normalizeSettingsPane(settingsPane),
    dashboardPane: normalizeDashboardPane(dashboardPane)
  };
}

function buildHashRoute(state = createDefaultState()) {
  if (state.section === 'settings') {
    return `#settings/${state.settingsPane}`;
  }

  if (state.section === 'dashboard') {
    return `#dashboard/${state.dashboardPane}`;
  }

  return `#${state.section}`;
}

/* =============================================================================
   03) HASH HELPERS
   ============================================================================= */

function createDefaultState() {
  return buildNavigationState(
    'home',
    'identity',
    'overview'
  );
}

function parseHash() {
  const rawHash = String(window.location.hash || '').replace(/^#/, '').trim();
  if (!rawHash) return createDefaultState();

  if (rawHash.startsWith('settings/')) {
    const [, pane = 'identity'] = rawHash.split('/');
    return buildNavigationState(
      'settings',
      pane,
      createDefaultState().dashboardPane
    );
  }

  if (rawHash.startsWith('dashboard/')) {
    const [, pane = 'overview'] = rawHash.split('/');
    return buildNavigationState(
      'dashboard',
      createDefaultState().settingsPane,
      pane
    );
  }

  const section = normalizeSection(rawHash);
  return buildNavigationState(
    section,
    section === 'settings' ? 'identity' : createDefaultState().settingsPane,
    section === 'dashboard' ? 'overview' : createDefaultState().dashboardPane
  );
}

function writeHash(state) {
  if (!isPrivateProfileSurface()) return;

  const hash = buildHashRoute(state);

  const nextUrl = `${window.location.pathname}${window.location.search}${hash}`;
  window.history.replaceState({}, '', nextUrl);
}

/* =============================================================================
   04) STORE HELPERS
   ============================================================================= */

function notifySubscribers() {
  RUNTIME.subscribers.forEach((subscriber) => {
    try {
      subscriber(getProfileNavigationState());
    } catch (error) {
      console.error('[profile-navigation] Subscriber update failed.', error);
    }
  });
}

function setState(nextState, options = {}) {
  const section = normalizeSection(nextState?.section || RUNTIME.state?.section || 'home');
  const settingsPane = section === 'settings'
    ? normalizeSettingsPane(nextState?.settingsPane || RUNTIME.state?.settingsPane || 'identity')
    : normalizeSettingsPane(RUNTIME.state?.settingsPane || nextState?.settingsPane || 'identity');
  const dashboardPane = section === 'dashboard'
    ? normalizeDashboardPane(nextState?.dashboardPane || RUNTIME.state?.dashboardPane || 'overview')
    : normalizeDashboardPane(RUNTIME.state?.dashboardPane || nextState?.dashboardPane || 'overview');

  RUNTIME.state = buildNavigationState(
    section,
    settingsPane,
    dashboardPane
  );

  if (options.writeHash !== false) {
    writeHash(RUNTIME.state);
  }

  document.dispatchEvent(new CustomEvent('profile:navigation-changed', {
    detail: getProfileNavigationState()
  }));

  notifySubscribers();
}

export function getProfileNavigationState() {
  return RUNTIME.state || createDefaultState();
}

export function subscribeProfileNavigation(subscriber) {
  if (typeof subscriber !== 'function') {
    return () => {};
  }

  RUNTIME.subscribers.add(subscriber);
  subscriber(getProfileNavigationState());

  return () => {
    RUNTIME.subscribers.delete(subscriber);
  };
}

export function requestProfileNavigation(nextState = {}) {
  setState(nextState);
}

/* =============================================================================
   05) INITIALIZATION
   ============================================================================= */

function initProfileNavigation() {
  if (RUNTIME.initialized) return;
  RUNTIME.initialized = true;

  setState(parseHash(), { writeHash: false });

  window.addEventListener('hashchange', () => {
    if (!isPrivateProfileSurface()) return;
    setState(parseHash(), { writeHash: false });
  });

  document.addEventListener('profile:navigate-request', (event) => {
    if (!isPrivateProfileSurface()) return;

    const detail = event instanceof CustomEvent ? event.detail || {} : {};
    setState({
      section: detail.section,
      settingsPane: detail.settingsPane,
      dashboardPane: detail.dashboardPane
    });
  });
}

initProfileNavigation();
