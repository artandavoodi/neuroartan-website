import { subscribeHomeSurfaceState } from './home-surface-state.js';
/* =============================================================================
00) FILE INDEX
01) MODULE STATE
02) CONSTANTS
03) DOM HELPERS
04) CONTENT SOURCE HELPERS
05) RENDER HELPERS
06) RAIL MODE HELPERS
07) SHELL STATE HELPERS
08) OPEN / CLOSE HELPERS
09) EVENT BINDING
10) BOOT
11) END OF FILE
============================================================================= */

/* =============================================================================
01) MODULE STATE
============================================================================= */
const HOME_PLATFORM_SHELL_STATE = {
  isBound: false,
  activeDestination: 'home',
  snapshot: null,
  railMode: 'expanded',
};

/* =============================================================================
02) CONSTANTS
============================================================================= */
const HOME_PLATFORM_DESTINATIONS = new Set([
  'home',
  'continuity',
  'workspace',
  'profile',
  'settings',
  'cookie-settings',
]);

const HOME_PLATFORM_COPY = {
  home: {
    title: 'Home',
    copy: 'Unified platform shell ready. Select a destination from the left rail to continue through one stable navigation and content surface.',
  },
  continuity: {
    title: 'Continuity',
    copy: 'Continuity surfaces, history, and active route traces belong here in one stable shell destination.',
  },
  workspace: {
    title: 'Workspace',
    copy: 'Current interaction state, workspace actions, and operating context belong here in one stable shell destination.',
  },
  profile: {
    title: 'Profile',
    copy: 'Identity, subscription, verification, and account-control surfaces belong here in one stable shell destination.',
  },
  settings: {
    title: 'Settings',
    copy: 'Theme, language, privacy, and identity controls belong here in one stable shell destination.',
  },
};

const HOME_PLATFORM_RAIL_STORAGE_KEY = 'neuroartan.home.platformShell.railMode';

const HOME_PLATFORM_SOURCE_SELECTORS = {
  workspace: {
    root: [
      '#home-workspace-panel .home-workspace-panel__inner',
      '#home-workspace-panel .home-workspace-panel__dialog',
      '#home-workspace-panel',
    ],
    interactionState: [
      '#home-workspace-panel [data-home-workspace-section="interaction-state"]',
      '#home-workspace-panel .home-workspace-panel__section--interaction-state',
    ],
    continuityActions: [
      '#home-workspace-panel [data-home-workspace-section="continuity-actions"]',
      '#home-workspace-panel .home-workspace-panel__section--continuity-actions',
    ],
    publicSurfaces: [
      '#home-workspace-panel [data-home-workspace-section="public-surfaces"]',
      '#home-workspace-panel .home-workspace-panel__section--public-surfaces',
    ],
  },
  profile: {
    root: [
      '#home-profile-control-panel .home-profile-control-panel__inner',
      '#home-profile-control-panel .home-profile-control-panel__dialog',
      '#home-profile-control-panel',
    ],
  },
  settings: {
    root: [
      '#home-settings-panel .home-settings-panel__inner',
      '#home-settings-panel .home-settings-panel__dialog',
      '#home-settings-panel',
    ],
  },
};

/* =============================================================================
03) DOM HELPERS
============================================================================= */
function getHomePlatformShellRoot() {
  return document.querySelector('#home-platform-shell');
}

function getHomePlatformShellContent() {
  return document.querySelector('#home-platform-shell-content');
}

function getHomePlatformShellMenuTrigger() {
  return document.querySelector('#home-dashboard-menu-trigger');
}

function getHomePlatformShellCloseTrigger() {
  return document.querySelector('#home-platform-shell-close');
}

function getHomePlatformShellRailToggleTrigger() {
  return document.querySelector('#home-platform-shell-rail-toggle');
}

function getHomePlatformShellNavItems() {
  return Array.from(document.querySelectorAll('[data-home-platform-destination]'));
}

function getHomePlatformShellChromeRoots() {
  return [
    document.querySelector('#home-navigation-drawer'),
    document.querySelector('#home-workspace-panel'),
    document.querySelector('#home-profile-control-panel'),
    document.querySelector('#home-settings-panel'),
    document.querySelector('#home-search-shell'),
  ].filter(Boolean);
}

function hideRoot(node) {
  if (!node) return;
  node.hidden = true;
  node.setAttribute('aria-hidden', 'true');
}

function requestMicrophoneInteraction() {
  const microphone = document.querySelector('#stage-microphone-button');
  if (!(microphone instanceof HTMLButtonElement)) {
    return;
  }

  microphone.click();
}

function hasSignedInAccount() {
  return !!HOME_PLATFORM_SHELL_STATE.snapshot?.account?.signedIn;
}

/* =============================================================================
04) CONTENT SOURCE HELPERS
============================================================================= */
function getFirstMatchingNode(selectors) {
  for (const selector of selectors) {
    const match = document.querySelector(selector);
    if (match) return match;
  }
  return null;
}

function getWorkspaceSourceNode() {
  return getFirstMatchingNode(HOME_PLATFORM_SOURCE_SELECTORS.workspace.root);
}

function getProfileSourceNode() {
  return getFirstMatchingNode(HOME_PLATFORM_SOURCE_SELECTORS.profile.root);
}

function getSettingsSourceNode() {
  return getFirstMatchingNode(HOME_PLATFORM_SOURCE_SELECTORS.settings.root);
}


function cloneContentNode(node) {
  if (!node) return null;
  return node.cloneNode(true);
}

function cloneNodeBySelectors(selectors = []) {
  return cloneContentNode(getFirstMatchingNode(selectors));
}

function buildCompositeContent(nodes = []) {
  const validNodes = nodes.filter(Boolean);
  if (!validNodes.length) {
    return null;
  }

  const wrapper = document.createElement('div');
  wrapper.className = 'home-platform-shell__content-stack';
  validNodes.forEach((node) => {
    wrapper.append(node);
  });
  return wrapper;
}

function sanitizeClonedContent(node) {
  if (!node) return null;

  node.querySelectorAll('[id]').forEach((element) => {
    element.removeAttribute('id');
  });

  node.querySelectorAll('[data-home-workspace-panel-close], [data-home-profile-control-panel-close], [data-home-settings-close]').forEach((element) => {
    element.remove();
  });

  return node;
}

function buildDefaultState(destination) {
  const copy = HOME_PLATFORM_COPY[destination] || HOME_PLATFORM_COPY.home;
  const wrapper = document.createElement('div');
  wrapper.className = 'home-platform-shell__content-state';
  wrapper.setAttribute('data-home-platform-content', destination);

  const title = document.createElement('h2');
  title.className = 'home-platform-shell__content-title';
  title.textContent = copy.title;

  const paragraph = document.createElement('p');
  paragraph.className = 'home-platform-shell__content-copy';
  paragraph.textContent = copy.copy;

  wrapper.append(title, paragraph);
  return wrapper;
}

function buildDestinationContent(destination) {
  if (destination === 'profile') {
    return sanitizeClonedContent(cloneContentNode(getProfileSourceNode())) || buildDefaultState(destination);
  }

  if (destination === 'settings') {
    return sanitizeClonedContent(cloneContentNode(getSettingsSourceNode())) || buildDefaultState(destination);
  }

  if (destination === 'continuity') {
    const continuityActions = cloneNodeBySelectors(HOME_PLATFORM_SOURCE_SELECTORS.workspace.continuityActions);
    const publicSurfaces = cloneNodeBySelectors(HOME_PLATFORM_SOURCE_SELECTORS.workspace.publicSurfaces);

    return sanitizeClonedContent(
      buildCompositeContent([
        continuityActions,
        publicSurfaces,
      ]) || cloneContentNode(getWorkspaceSourceNode())
    ) || buildDefaultState(destination);
  }

  if (destination === 'workspace') {
    const interactionState = cloneNodeBySelectors(HOME_PLATFORM_SOURCE_SELECTORS.workspace.interactionState);
    const continuityActions = cloneNodeBySelectors(HOME_PLATFORM_SOURCE_SELECTORS.workspace.continuityActions);

    return sanitizeClonedContent(
      buildCompositeContent([
        interactionState,
        continuityActions,
      ]) || cloneContentNode(getWorkspaceSourceNode())
    ) || buildDefaultState(destination);
  }

  return buildDefaultState(destination);
}

function normalizeShellActionLabel(label) {
  return typeof label === 'string' ? label.trim().toLowerCase() : '';
}

function handleWorkspaceShellAction(action) {
  const normalized = normalizeShellActionLabel(action);

  if (normalized === 'voice') {
    closeHomePlatformShell();
    requestMicrophoneInteraction();
    return;
  }

  if (normalized === 'history') {
    window.location.href = '/pages/continuity-history/index.html';
    return;
  }

  if (normalized === 'knowledge') {
    window.location.href = '/pages/knowledge-research/index.html';
  }
}

function handleProfileShellAction(action) {
  const normalized = normalizeShellActionLabel(action);

  if (normalized === 'account-identity' || normalized === 'verification' || normalized === 'linked-accounts') {
    if (hasSignedInAccount()) {
      window.location.href = '/profile.html';
      return;
    }

    document.dispatchEvent(new CustomEvent('account:entry-request', {
      detail: {
        source: 'home-platform-shell',
      },
    }));
    closeHomePlatformShell();
    return;
  }

  if (normalized === 'subscription-plan') {
    window.location.href = '/pages/pricing/index.html';
    return;
  }

  if (normalized === 'my-models') {
    window.location.href = '/pages/models/index.html';
    return;
  }

  if (normalized === 'dashboard') {
    window.location.href = '/pages/dashboard/index.html';
    return;
  }

  if (normalized === 'settings') {
    setHomePlatformDestination('settings');
    return;
  }

  if (normalized === 'sign-out') {
    document.dispatchEvent(new CustomEvent('account:sign-out-request', {
      detail: {
        source: 'home-platform-shell',
      },
    }));
    closeHomePlatformShell();
  }
}

/* =============================================================================
05) RENDER HELPERS
============================================================================= */
function renderHomePlatformShellContent(destination) {
  const contentRoot = getHomePlatformShellContent();
  if (!contentRoot) return;
  contentRoot.setAttribute('data-home-platform-content', destination);
  const shellRoot = getHomePlatformShellRoot();
  if (shellRoot) {
    shellRoot.setAttribute('data-home-platform-destination', destination);
  }
  contentRoot.innerHTML = '';
  contentRoot.append(buildDestinationContent(destination));
}

function syncHomePlatformShellNav(destination) {
  getHomePlatformShellNavItems().forEach((item) => {
    const isActive = item.getAttribute('data-home-platform-destination') === destination;
    item.classList.toggle('is-active', isActive);
    if (item.tagName === 'BUTTON') {
      item.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    }
  });
}

/* =============================================================================
06) RAIL MODE HELPERS
============================================================================= */
function normalizeHomePlatformRailMode(value) {
  return value === 'collapsed' ? 'collapsed' : 'expanded';
}

function loadHomePlatformRailMode() {
  try {
    return normalizeHomePlatformRailMode(window.localStorage.getItem(HOME_PLATFORM_RAIL_STORAGE_KEY));
  } catch (_error) {
    return 'expanded';
  }
}

function saveHomePlatformRailMode(mode) {
  try {
    window.localStorage.setItem(HOME_PLATFORM_RAIL_STORAGE_KEY, normalizeHomePlatformRailMode(mode));
  } catch (_error) {
    /* Intentionally empty: rail mode persistence is best-effort only. */
  }
}

function syncHomePlatformRailMode(mode = HOME_PLATFORM_SHELL_STATE.railMode) {
  const normalized = normalizeHomePlatformRailMode(mode);
  HOME_PLATFORM_SHELL_STATE.railMode = normalized;

  const root = getHomePlatformShellRoot();
  if (root) {
    root.setAttribute('data-home-platform-rail', normalized);
  }

  const toggle = getHomePlatformShellRailToggleTrigger();
  if (toggle) {
    const isExpanded = normalized === 'expanded';
    toggle.setAttribute('aria-pressed', isExpanded ? 'true' : 'false');
    toggle.setAttribute('aria-label', isExpanded ? 'Collapse navigation rail' : 'Expand navigation rail');
  }
}

function setHomePlatformRailMode(mode) {
  const normalized = normalizeHomePlatformRailMode(mode);
  syncHomePlatformRailMode(normalized);
  saveHomePlatformRailMode(normalized);

  document.dispatchEvent(new CustomEvent('home:platform-shell-rail-mode-changed', {
    detail: {
      railMode: normalized,
    },
  }));
}

function toggleHomePlatformRailMode() {
  const nextMode = HOME_PLATFORM_SHELL_STATE.railMode === 'collapsed' ? 'expanded' : 'collapsed';
  setHomePlatformRailMode(nextMode);
}

/* =============================================================================
07) SHELL STATE HELPERS
============================================================================= */
function setHomePlatformDestination(destination) {
  if (!HOME_PLATFORM_DESTINATIONS.has(destination)) {
    return;
  }

  if (destination === 'cookie-settings') {
    document.dispatchEvent(new CustomEvent('neuroartan:cookie-consent-open-requested', {
      detail: {
        source: 'home-platform-shell',
      },
    }));
    closeHomePlatformShell();
    return;
  }

  HOME_PLATFORM_SHELL_STATE.activeDestination = destination;
  syncHomePlatformShellNav(destination);
  renderHomePlatformShellContent(destination);

  document.dispatchEvent(new CustomEvent('home:platform-shell-destination-changed', {
    detail: {
      destination,
    },
  }));
}

/* =============================================================================
08) OPEN / CLOSE HELPERS
============================================================================= */
function closeConflictingHomeChrome() {
  getHomePlatformShellChromeRoots().forEach(hideRoot);
}

function openHomePlatformShell(destination = HOME_PLATFORM_SHELL_STATE.activeDestination) {
  const root = getHomePlatformShellRoot();
  if (!root) return;

  closeConflictingHomeChrome();
  root.hidden = false;
  root.setAttribute('aria-hidden', 'false');
  document.body.classList.add('home-platform-shell-open');
  syncHomePlatformRailMode(HOME_PLATFORM_SHELL_STATE.railMode);
  setHomePlatformDestination(destination);

  document.dispatchEvent(new CustomEvent('home:platform-shell-opened', {
    detail: {
      destination: HOME_PLATFORM_SHELL_STATE.activeDestination,
    },
  }));
}

function closeHomePlatformShell() {
  const root = getHomePlatformShellRoot();
  if (!root) return;

  root.hidden = true;
  root.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('home-platform-shell-open');
  root.removeAttribute('data-home-platform-destination');
  syncHomePlatformRailMode(HOME_PLATFORM_SHELL_STATE.railMode);
  document.dispatchEvent(new CustomEvent('neuroartan:home-topbar-reset-triggers'));
  document.dispatchEvent(new CustomEvent('home:platform-shell-closed'));
}

function toggleHomePlatformShell(destination = 'home') {
  const root = getHomePlatformShellRoot();
  if (!root) return;

  if (root.hidden) {
    openHomePlatformShell(destination);
    return;
  }

  if (destination !== HOME_PLATFORM_SHELL_STATE.activeDestination) {
    setHomePlatformDestination(destination);
    return;
  }

  closeHomePlatformShell();
}

/* =============================================================================
09) EVENT BINDING
============================================================================= */
function bindHomePlatformShellEvents() {
  if (HOME_PLATFORM_SHELL_STATE.isBound) return;
  HOME_PLATFORM_SHELL_STATE.isBound = true;

  document.addEventListener('click', (event) => {
    const menuTrigger = event.target.closest('#home-dashboard-menu-trigger');
    if (menuTrigger) {
      event.preventDefault();
      event.stopPropagation();
      toggleHomePlatformShell('home');
      return;
    }

    const closeTrigger = event.target.closest('[data-home-platform-shell-close]');
    if (closeTrigger) {
      event.preventDefault();
      closeHomePlatformShell();
      return;
    }

    const railToggleTrigger = event.target.closest('[data-home-platform-shell-rail-toggle]');
    if (railToggleTrigger) {
      event.preventDefault();
      toggleHomePlatformRailMode();
      return;
    }

    const navTrigger = event.target.closest('[data-home-platform-destination]');
    if (navTrigger) {
      const destination = navTrigger.getAttribute('data-home-platform-destination') || 'home';
      event.preventDefault();
      setHomePlatformDestination(destination);
      return;
    }

    const shellActionTrigger = event.target.closest(
      '#home-platform-shell .home-workspace-panel__item, ' +
      '#home-platform-shell .home-profile-control-panel__item'
    );

    if (shellActionTrigger) {
      if (shellActionTrigger.matches('.home-workspace-panel__item')) {
        const action = shellActionTrigger.getAttribute('data-home-workspace-action') || '';
        event.preventDefault();
        handleWorkspaceShellAction(action);
        return;
      }

      if (shellActionTrigger.matches('.home-profile-control-panel__item')) {
        const action = shellActionTrigger.getAttribute('data-home-profile-action') || shellActionTrigger.textContent || '';
        event.preventDefault();
        handleProfileShellAction(action);
        return;
      }
    }
  }, true);

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    const root = getHomePlatformShellRoot();
    if (!root || root.hidden) return;
    closeHomePlatformShell();
  });

  document.addEventListener('home:platform-shell-open-request', (event) => {
    openHomePlatformShell(event?.detail?.destination || 'home');
  });

  document.addEventListener('home:platform-shell-close-request', () => {
    closeHomePlatformShell();
  });

  subscribeHomeSurfaceState((snapshot) => {
    HOME_PLATFORM_SHELL_STATE.snapshot = snapshot;
  });
}

/* =============================================================================
10) BOOT
============================================================================= */
function bootHomePlatformShell() {
  if (!getHomePlatformShellRoot()) return;
  bindHomePlatformShellEvents();
  HOME_PLATFORM_SHELL_STATE.railMode = loadHomePlatformRailMode();
  syncHomePlatformRailMode(HOME_PLATFORM_SHELL_STATE.railMode);
  syncHomePlatformShellNav(HOME_PLATFORM_SHELL_STATE.activeDestination);
  renderHomePlatformShellContent(HOME_PLATFORM_SHELL_STATE.activeDestination);
}

document.addEventListener('fragment:mounted', (event) => {
  if (event?.detail?.name !== 'home-platform-shell') return;
  bootHomePlatformShell();
});

document.addEventListener('neuroartan:runtime-ready', () => {
  bootHomePlatformShell();
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootHomePlatformShell, { once: true });
} else {
  bootHomePlatformShell();
}

/* =============================================================================
11) END OF FILE
============================================================================= */