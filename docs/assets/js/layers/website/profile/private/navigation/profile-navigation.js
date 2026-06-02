/* =============================================================================
   01) MODULE STATE
   ============================================================================= */

import {
  constrainModelNavigationForViewer
} from '../../../model/navigation/model-tab-registry.js';
import {
  getProfileRuntimeState,
  subscribeProfileRuntime
} from '../shell/profile-runtime.js';

const RUNTIME = (window.__NEUROARTAN_PROFILE_NAVIGATION__ ||= {
  initialized: false,
  state: null,
  subscribers: new Set()
});

/* =============================================================================
   02) CONSTANTS
   ============================================================================= */

const MODEL_SECTIONS = new Set(['model', 'model-foundation', 'model-training', 'model-personalization', 'model-sources', 'model-memory', 'model-voice', 'model-readiness', 'model-runtime', 'model-discovery', 'model-settings']);
const VALID_SECTIONS = new Set(['home', 'feed', 'notifications', 'messaging', 'profile', 'overview', 'posts', 'thoughts', 'dashboard', 'models', 'organizations', 'settings', ...MODEL_SECTIONS]);
const VALID_SETTINGS_PANES = new Set(['identity', 'route', 'privacy', 'password', 'verification']);
const VALID_DASHBOARD_PANES = new Set(['overview', 'summary', 'metrics', 'graph']);
const VALID_MODEL_PANES = new Set(['overview', 'identity', 'consent', 'sources', 'route', 'protocol', 'datasets', 'knowledge-base', 'provenance', 'evaluation', 'behavior', 'language', 'emotion', 'response', 'memory', 'creativity', 'reflection', 'authorized', 'documents', 'thoughts', 'voice', 'private', 'continuity', 'retrieval', 'boundaries', 'samples', 'profile', 'activation', 'state', 'checks', 'blockers', 'history', 'directory', 'trending', 'expertise', 'monetization', 'eligibility', 'reputation', 'provider', 'routing', 'deployment', 'preferences', 'changelog', 'access', 'visibility']);

function isPrivateProfileSurface() {
  return document.body?.dataset.profilePage === 'private';
}

function normalizeSection(value) {
  const normalized = String(value || '').trim().toLowerCase();

  switch (normalized) {
    case 'home':
      return 'home';
    case 'feed':
      return 'feed';
    case 'model':
    case 'model-foundation':
    case 'foundation':
      return 'model-foundation';
    case 'model-training':
    case 'training':
      return 'model-training';
    case 'model-personalization':
    case 'personalization':
      return 'model-personalization';
    case 'model-sources':
    case 'sources':
      return 'model-sources';
    case 'model-memory':
    case 'memory':
      return 'model-memory';
    case 'model-voice':
    case 'voice':
      return 'model-voice';
    case 'model-readiness':
    case 'readiness':
      return 'model-readiness';
    case 'model-runtime':
    case 'runtime':
      return 'model-runtime';
    case 'model-discovery':
    case 'discovery':
      return 'model-discovery';
    case 'model-settings':
    case 'model-setting':
      return 'model-settings';
    case 'notifications':
      return 'notifications';
    case 'messaging':
      return 'messaging';
    case 'profile':
    case 'overview':
      return 'profile';
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

function normalizeModelPane(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'source') return 'sources';
  return VALID_MODEL_PANES.has(normalized) ? normalized : 'overview';
}

function normalizeModelPaneForSection(section, value) {
  const normalizedPane = normalizeModelPane(value);
  if (section === 'model-discovery' && normalizedPane === 'overview') return 'directory';
  return normalizedPane;
}

/* =============================================================================
   02A) ROUTE RESOLUTION
   ============================================================================= */

function buildNavigationState(section = 'overview', settingsPane = 'identity', dashboardPane = 'overview', modelPane = 'overview') {
  return {
    section: normalizeSection(section),
    settingsPane: normalizeSettingsPane(settingsPane),
    dashboardPane: normalizeDashboardPane(dashboardPane),
    modelPane: normalizeModelPane(modelPane)
  };
}

function buildHashRoute(state = createDefaultState()) {
  if (MODEL_SECTIONS.has(state.section)) {
    const modelArea = state.section === 'model' ? 'foundation' : state.section.replace(/^model-/, '');
    return `#model/${modelArea}/${state.modelPane || 'overview'}`;
  }

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
  const pathname = String(window.location.pathname || '').toLowerCase();
  const section = pathname.includes('/dashboard') ? 'dashboard' : pathname.includes('/settings') ? 'settings' : pathname.includes('/feed') ? 'home' : pathname.includes('/model') ? 'model-discovery' : 'profile';

  return buildNavigationState(
    section,
    section === 'settings' ? 'password' : 'identity',
    'overview',
    section === 'model-discovery' ? 'directory' : 'overview'
  );
}

function getRouteContext() {
  const pathname = String(window.location.pathname || '').toLowerCase();
  if (pathname.includes('/dashboard')) return 'dashboard';
  if (pathname.includes('/settings')) return 'settings';
  if (pathname.includes('/feed')) return 'home';
  if (pathname.includes('/model')) return 'model';
  return 'profile';
}

function constrainStateToRoute(state) {
  const routeContext = getRouteContext();
  const homeSections = new Set(['home', 'feed', 'notifications', 'messaging']);
  const profileSections = new Set(['profile', 'posts', 'thoughts', 'models', 'organizations']);

  if (routeContext === 'home' && !homeSections.has(state.section)) {
    return createDefaultState();
  }

  if (routeContext === 'dashboard' && state.section !== 'dashboard') {
    return createDefaultState();
  }

  if (routeContext === 'settings' && state.section !== 'settings') {
    return createDefaultState();
  }

  if (routeContext === 'model' && !MODEL_SECTIONS.has(state.section)) {
    return createDefaultState();
  }

  if (routeContext === 'profile') {
    if (homeSections.has(state.section) || state.section === 'dashboard' || MODEL_SECTIONS.has(state.section)) {
      return createDefaultState();
    }

    if (state.section === 'settings' && !['identity', 'route', 'privacy'].includes(state.settingsPane)) {
      return createDefaultState();
    }

    if (!profileSections.has(state.section) && state.section !== 'settings') {
      return createDefaultState();
    }
  }

  return state;
}

function constrainStateToViewer(state, runtimeState = getProfileRuntimeState()) {
  if (getRouteContext() !== 'model' || !MODEL_SECTIONS.has(state.section)) {
    return state;
  }

  if (runtimeState.authResolved !== true) {
    return state;
  }

  const constrainedModelState = constrainModelNavigationForViewer(
    state.section,
    state.modelPane,
    runtimeState.viewerState === 'authenticated'
  );

  if (
    constrainedModelState.section === state.section
    && constrainedModelState.modelPane === state.modelPane
  ) {
    return state;
  }

  return buildNavigationState(
    constrainedModelState.section,
    state.settingsPane,
    state.dashboardPane,
    constrainedModelState.modelPane
  );
}

function parseHash() {
  const rawHash = String(window.location.hash || '').replace(/^#/, '').trim();
  if (!rawHash) return createDefaultState();

  if (rawHash.startsWith('settings/')) {
    const [, pane = 'identity'] = rawHash.split('/');
    return constrainStateToRoute(buildNavigationState(
      'settings',
      pane,
      createDefaultState().dashboardPane,
      createDefaultState().modelPane
    ));
  }

  if (rawHash.startsWith('dashboard/')) {
    const [, pane = 'overview'] = rawHash.split('/');
    return constrainStateToRoute(buildNavigationState(
      'dashboard',
      createDefaultState().settingsPane,
      pane,
      createDefaultState().modelPane
    ));
  }

  if (rawHash.startsWith('model/')) {
    const [, area = 'foundation', pane = 'overview'] = rawHash.split('/');
    const section = normalizeSection(`model-${area}`);
    return constrainStateToRoute(buildNavigationState(
      section,
      createDefaultState().settingsPane,
      createDefaultState().dashboardPane,
      normalizeModelPaneForSection(section, pane)
    ));
  }

  const section = normalizeSection(rawHash);
  return constrainStateToRoute(buildNavigationState(
    section,
    section === 'settings' ? 'identity' : createDefaultState().settingsPane,
    section === 'dashboard' ? 'overview' : createDefaultState().dashboardPane,
    MODEL_SECTIONS.has(section) ? 'overview' : createDefaultState().modelPane
  ));
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
  const modelPane = MODEL_SECTIONS.has(section)
    ? normalizeModelPaneForSection(section, nextState?.modelPane || RUNTIME.state?.modelPane || 'overview')
    : normalizeModelPane(RUNTIME.state?.modelPane || nextState?.modelPane || 'overview');

  RUNTIME.state = constrainStateToViewer(buildNavigationState(
    section,
    settingsPane,
    dashboardPane,
    modelPane
  ));

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
    setState(parseHash());
  });

  document.addEventListener('profile:navigate-request', (event) => {
    if (!isPrivateProfileSurface()) return;

    const detail = event instanceof CustomEvent ? event.detail || {} : {};
    setState({
      section: detail.section,
      settingsPane: detail.settingsPane,
      dashboardPane: detail.dashboardPane,
      modelPane: detail.modelPane
    });
  });

  subscribeProfileRuntime((runtimeState) => {
    if (!isPrivateProfileSurface() || getRouteContext() !== 'model') return;

    setState(parseHash(), {
      writeHash: runtimeState.authResolved === true
    });
  });
}

initProfileNavigation();
