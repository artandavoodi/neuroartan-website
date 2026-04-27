import { subscribeHomeSurfaceState } from '../core/home-surface-state.js';
/* =============================================================================
00) FILE INDEX
01) MODULE STATE
02) CONSTANTS
03) DOM HELPERS
04) CONFIG HELPERS
05) ASSET HELPERS
06) CONTENT HELPERS
07) RAIL MODE HELPERS
08) SHELL STATE HELPERS
09) OPEN / CLOSE HELPERS
10) EVENT BINDING
11) BOOT
12) END OF FILE
============================================================================= */

/* =============================================================================
01) MODULE STATE
============================================================================= */
const HOME_PLATFORM_SHELL_STATE = {
  isBound: false,
  activeDestination: 'home',
  activeSubdestination: '',
  snapshot: null,
  railMode: 'expanded',
  config: [],
  configPromise: null,
  fragmentCache: new Map(),
  moduleCache: new Map(),
  renderToken: 0,
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
  'messaging',
  'notifications',
  'more',
  'cookie-settings',
]);

const HOME_PLATFORM_CONFIG_URL = '/assets/data/platform/home-platform-shell.json';
const HOME_PLATFORM_RAIL_STORAGE_KEY = 'neuroartan.home.platformShell.railMode';

/* =============================================================================
03) DOM HELPERS
============================================================================= */
function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function getHomePlatformShellRoot() {
  return document.querySelector('#home-platform-shell');
}

function getHomePlatformShellContent() {
  return document.querySelector('#home-platform-shell-content');
}

function getHomePlatformShellSubnav() {
  return document.querySelector('#home-platform-shell-subnav');
}

function getHomePlatformShellSubrail() {
  return document.querySelector('#home-platform-shell .home-platform-shell__subrail');
}

function getHomePlatformShellSubrailLabel() {
  return document.querySelector('[data-home-platform-subrail-label]');
}

function getHomePlatformShellSubrailTitle() {
  return document.querySelector('[data-home-platform-subrail-title]');
}

function getHomePlatformShellContentEyebrow() {
  return document.querySelector('[data-home-platform-content-eyebrow]');
}

function getHomePlatformShellContentTitle() {
  return document.querySelector('[data-home-platform-content-title]');
}

function getHomePlatformShellContentCopy() {
  return document.querySelector('[data-home-platform-content-copy]');
}

function getHomePlatformShellRailToggleTrigger() {
  return document.querySelector('#home-platform-shell-rail-toggle');
}

function getHomePlatformShellRailToggleIcon() {
  return document.querySelector('[data-home-platform-rail-toggle-icon]');
}

function getHomePlatformShellNavItems() {
  return Array.from(document.querySelectorAll('[data-home-platform-destination]'));
}

function getHomePlatformShellIndicatorNodes() {
  return Array.from(document.querySelectorAll('[data-home-platform-nav-indicator]'));
}

function getHomePlatformShellChromeRoots() {
  return [
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

function hasCompletedProfile() {
  const account = HOME_PLATFORM_SHELL_STATE.snapshot?.account || {};
  return account.profileComplete === true || account.profile?.profile_complete === true;
}

function requestAccountEntryFromShell() {
  document.dispatchEvent(new CustomEvent('account:entry-request', {
    detail: {
      source: 'home-platform-shell',
    },
  }));
}

function requestProfileSetupFromShell() {
  document.dispatchEvent(new CustomEvent('account:profile-setup-open-request', {
    detail: {
      source: 'home-platform-shell',
      reason: 'profile-incomplete',
    },
  }));
}

function fetchHomePlatformJson(path) {
  return fetch(path, {
    cache: 'no-store',
    credentials: 'same-origin',
  }).then((response) => {
    if (!response.ok) {
      throw new Error(`Failed to load ${path}: HTTP ${response.status}`);
    }

    return response.json();
  });
}

function fetchHomePlatformText(path) {
  return fetch(path, {
    cache: 'no-store',
    credentials: 'same-origin',
  }).then((response) => {
    if (!response.ok) {
      throw new Error(`Failed to load ${path}: HTTP ${response.status}`);
    }

    return response.text();
  });
}

/* =============================================================================
04) CONFIG HELPERS
============================================================================= */
function normalizeHomePlatformSubdestinations(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      const id = normalizeString(item?.id);
      if (!id) return null;

      return {
        id,
        label: normalizeString(item?.label || id),
        detailTitle: normalizeString(item?.detail_title || item?.detailTitle || item?.label || ''),
        detailCopy: normalizeString(item?.detail_copy || item?.detailCopy || ''),
        ctaLabel: normalizeString(item?.cta_label || item?.ctaLabel || ''),
        href: normalizeString(item?.href || ''),
        action: normalizeString(item?.action || ''),
        fragment: normalizeString(item?.fragment || ''),
        stylesheet: normalizeString(item?.stylesheet || ''),
        module: normalizeString(item?.module || ''),
      };
    })
    .filter(Boolean);
}

function normalizeHomePlatformConfig(raw = {}) {
  if (!Array.isArray(raw?.destinations)) {
    return [];
  }

  return raw.destinations
    .map((item) => {
      const id = normalizeString(item?.id);
      if (!id) return null;

      return {
        id,
        eyebrow: normalizeString(item?.eyebrow || item?.label || id),
        title: normalizeString(item?.title || item?.label || id),
        description: normalizeString(item?.description || ''),
        defaultSubdestination: normalizeString(item?.default_subdestination || item?.defaultSubdestination || ''),
        subdestinations: normalizeHomePlatformSubdestinations(item?.subdestinations),
      };
    })
    .filter(Boolean);
}

function getHomePlatformDestinationConfig(destination) {
  return HOME_PLATFORM_SHELL_STATE.config.find((item) => item.id === destination) || null;
}

function getHomePlatformSubdestinationConfig(destination, subdestination) {
  const destinationConfig = getHomePlatformDestinationConfig(destination);
  if (!destinationConfig) {
    return null;
  }

  return destinationConfig.subdestinations.find((item) => item.id === subdestination) || null;
}

function resolveDefaultSubdestination(destination) {
  const destinationConfig = getHomePlatformDestinationConfig(destination);
  if (!destinationConfig) {
    return '';
  }

  if (destinationConfig.defaultSubdestination) {
    return destinationConfig.defaultSubdestination;
  }

  return destinationConfig.subdestinations[0]?.id || '';
}

async function ensureHomePlatformConfig() {
  if (HOME_PLATFORM_SHELL_STATE.config.length) {
    return HOME_PLATFORM_SHELL_STATE.config;
  }

  if (!HOME_PLATFORM_SHELL_STATE.configPromise) {
    HOME_PLATFORM_SHELL_STATE.configPromise = fetchHomePlatformJson(HOME_PLATFORM_CONFIG_URL)
      .then((json) => {
        HOME_PLATFORM_SHELL_STATE.config = normalizeHomePlatformConfig(json);
        return HOME_PLATFORM_SHELL_STATE.config;
      })
      .catch(() => {
        HOME_PLATFORM_SHELL_STATE.config = [];
        return HOME_PLATFORM_SHELL_STATE.config;
      })
      .finally(() => {
        HOME_PLATFORM_SHELL_STATE.configPromise = null;
      });
  }

  return HOME_PLATFORM_SHELL_STATE.configPromise;
}

/* =============================================================================
05) ASSET HELPERS
============================================================================= */
function ensureStylesheetOnce(href) {
  if (!href) {
    return null;
  }

  const resolvedHref = new URL(href, window.location.origin).href;
  const existing = Array.from(document.querySelectorAll('link[rel="stylesheet"]')).find((link) => {
    const currentHref = link.getAttribute('href') || '';

    try {
      return new URL(currentHref, window.location.origin).href === resolvedHref;
    } catch (_error) {
      return currentHref === href;
    }
  });

  if (existing) {
    return existing;
  }

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  link.setAttribute('data-home-platform-destination-style', href);
  document.head.appendChild(link);
  return link;
}

function loadHomePlatformFragment(path) {
  if (!path) {
    return Promise.resolve('');
  }

  if (!HOME_PLATFORM_SHELL_STATE.fragmentCache.has(path)) {
    HOME_PLATFORM_SHELL_STATE.fragmentCache.set(path, fetchHomePlatformText(path).catch(() => ''));
  }

  return HOME_PLATFORM_SHELL_STATE.fragmentCache.get(path);
}

function loadHomePlatformModule(path) {
  if (!path) {
    return Promise.resolve(null);
  }

  if (!HOME_PLATFORM_SHELL_STATE.moduleCache.has(path)) {
    HOME_PLATFORM_SHELL_STATE.moduleCache.set(path, import(path).catch(() => null));
  }

  return HOME_PLATFORM_SHELL_STATE.moduleCache.get(path);
}

/* =============================================================================
06) CONTENT HELPERS
============================================================================= */
function buildDefaultState({ title = '', copy = '', ctaLabel = '', href = '', action = '' } = {}) {
  const wrapper = document.createElement('div');
  wrapper.className = 'home-platform-shell__content-state';

  if (title) {
    const titleNode = document.createElement('h3');
    titleNode.className = 'home-platform-shell__content-state-title';
    titleNode.textContent = title;
    wrapper.append(titleNode);
  }

  if (copy) {
    const paragraph = document.createElement('p');
    paragraph.className = 'home-platform-shell__content-state-copy';
    paragraph.textContent = copy;
    wrapper.append(paragraph);
  }

  if (ctaLabel && (href || action)) {
    const actionNode = href ? document.createElement('a') : document.createElement('button');
    actionNode.className = 'home-platform-shell__content-state-action';

    if (href && actionNode instanceof HTMLAnchorElement) {
      actionNode.href = href;
      actionNode.setAttribute('data-home-platform-detail-href', href);
    } else if (actionNode instanceof HTMLButtonElement) {
      actionNode.type = 'button';
      actionNode.setAttribute('data-home-platform-detail-action', action);
    }

    actionNode.textContent = ctaLabel;
    wrapper.append(actionNode);
  }

  return wrapper;
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
    if (!hasSignedInAccount()) {
      requestAccountEntryFromShell();
      closeHomePlatformShell();
      return;
    }

    if (!hasCompletedProfile()) {
      requestProfileSetupFromShell();
      closeHomePlatformShell();
      return;
    }

    window.location.href = '/profile.html';
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
    void setHomePlatformDestination('settings');
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

function handleHomePlatformDetailAction(action) {
  const normalized = normalizeShellActionLabel(action);

  if (normalized === 'cookie-settings') {
    document.dispatchEvent(new CustomEvent('neuroartan:cookie-consent-open-requested', {
      detail: {
        source: 'home-platform-shell',
        surface: 'platform-shell',
      },
    }));
    closeHomePlatformShell();
  }
}

async function renderHomePlatformShellContent(destination, subdestination) {
  const contentRoot = getHomePlatformShellContent();
  const eyebrowNode = getHomePlatformShellContentEyebrow();
  const titleNode = getHomePlatformShellContentTitle();
  const copyNode = getHomePlatformShellContentCopy();
  const shellRoot = getHomePlatformShellRoot();
  const destinationConfig = getHomePlatformDestinationConfig(destination);
  const subdestinationConfig = getHomePlatformSubdestinationConfig(destination, subdestination);
  const renderToken = ++HOME_PLATFORM_SHELL_STATE.renderToken;

  if (!contentRoot || !destinationConfig) {
    return;
  }

  if (shellRoot) {
    shellRoot.setAttribute('data-home-platform-destination', destination);
    shellRoot.setAttribute('data-home-platform-subdestination', subdestination || '');
  }

  if (eyebrowNode) {
    eyebrowNode.textContent = destinationConfig.eyebrow || destinationConfig.title;
  }

  if (titleNode) {
    titleNode.textContent = subdestinationConfig?.detailTitle || destinationConfig.title;
  }

  if (copyNode) {
    copyNode.textContent = subdestinationConfig?.detailCopy || destinationConfig.description || '';
  }

  contentRoot.innerHTML = '';

  if (!subdestinationConfig?.fragment) {
    contentRoot.append(buildDefaultState({
      title: subdestinationConfig?.detailTitle || destinationConfig.title || 'Home',
      copy: subdestinationConfig?.detailCopy || destinationConfig.description || '',
      ctaLabel: subdestinationConfig?.ctaLabel || '',
      href: subdestinationConfig?.href || '',
      action: subdestinationConfig?.action || '',
    }));
    return;
  }

  if (subdestinationConfig.stylesheet) {
    ensureStylesheetOnce(subdestinationConfig.stylesheet);
  }

  try {
    const [fragmentHtml, moduleNamespace] = await Promise.all([
      loadHomePlatformFragment(subdestinationConfig.fragment),
      loadHomePlatformModule(subdestinationConfig.module),
    ]);

    if (renderToken !== HOME_PLATFORM_SHELL_STATE.renderToken) {
      return;
    }

    if (!fragmentHtml) {
      throw new Error('Missing destination fragment.');
    }

    contentRoot.innerHTML = fragmentHtml;

    const mountedRoot = contentRoot.querySelector('[data-home-platform-destination-root]')
      || contentRoot.firstElementChild
      || contentRoot;

    if (mountedRoot instanceof Element) {
      mountedRoot.setAttribute('data-home-platform-content', destination);
      mountedRoot.setAttribute('data-home-platform-content-id', subdestination || destination);
    }

    if (moduleNamespace?.mountHomePlatformDestination && mountedRoot instanceof Element) {
      await moduleNamespace.mountHomePlatformDestination(mountedRoot, {
        destination,
        subdestination,
        destinationConfig,
        subdestinationConfig,
        snapshot: HOME_PLATFORM_SHELL_STATE.snapshot,
        closeShell: closeHomePlatformShell,
        requestMicrophoneInteraction,
        setDestination: setHomePlatformDestination,
        setSubdestination: setHomePlatformSubdestination,
      });
    }
  } catch (_error) {
    if (renderToken !== HOME_PLATFORM_SHELL_STATE.renderToken) {
      return;
    }

    contentRoot.innerHTML = '';
    contentRoot.append(buildDefaultState({
      title: subdestinationConfig?.detailTitle || destinationConfig.title || 'Home',
      copy: subdestinationConfig?.detailCopy || destinationConfig.description || '',
      ctaLabel: subdestinationConfig?.ctaLabel || '',
      href: subdestinationConfig?.href || '',
      action: subdestinationConfig?.action || '',
    }));
  }
}

function renderHomePlatformShellSubnav(destination, subdestination) {
  const subrail = getHomePlatformShellSubrail();
  const subnavRoot = getHomePlatformShellSubnav();
  const labelNode = getHomePlatformShellSubrailLabel();
  const titleNode = getHomePlatformShellSubrailTitle();
  const destinationConfig = getHomePlatformDestinationConfig(destination);
  const items = destinationConfig?.subdestinations || [];

  if (!subrail || !subnavRoot || !destinationConfig) {
    return;
  }

  const hasSubnav = items.length > 1;
  subrail.hidden = !hasSubnav;
  subrail.setAttribute('aria-hidden', hasSubnav ? 'false' : 'true');

  if (labelNode) {
    labelNode.textContent = destinationConfig.eyebrow || destinationConfig.title;
  }

  if (titleNode) {
    titleNode.textContent = hasSubnav ? 'Section navigation' : destinationConfig.title;
  }

  subnavRoot.innerHTML = '';

  if (!hasSubnav) {
    return;
  }

  items.forEach((item) => {
    const button = document.createElement('button');
    const isActive = item.id === subdestination;
    button.type = 'button';
    button.className = 'home-platform-shell__subnav-item';
    button.textContent = item.label;
    button.setAttribute('data-home-platform-subdestination', item.id);
    button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    button.classList.toggle('is-active', isActive);
    subnavRoot.append(button);
  });
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
07) RAIL MODE HELPERS
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

  const toggleIcon = getHomePlatformShellRailToggleIcon();
  if (toggleIcon instanceof HTMLImageElement) {
    const expandedIcon = normalizeString(toggleIcon.getAttribute('data-home-platform-rail-icon-expanded'));
    const collapsedIcon = normalizeString(toggleIcon.getAttribute('data-home-platform-rail-icon-collapsed'));
    const nextIcon = normalized === 'expanded' ? expandedIcon : collapsedIcon;

    if (nextIcon) {
      toggleIcon.src = nextIcon;
    }
  }
}

function normalizeHomePlatformIndicatorState(value) {
  if (value === 'high') {
    return 'high';
  }

  if (value === 'new') {
    return 'new';
  }

  return 'idle';
}

function resolveHomePlatformIndicatorState(entry = {}) {
  const declaredState = normalizeHomePlatformIndicatorState(normalizeString(entry?.state || ''));
  if (declaredState !== 'idle') {
    return declaredState;
  }

  const unreadCount = Number(entry?.unreadCount || 0);

  if (Number.isFinite(unreadCount) && unreadCount > 9) {
    return 'high';
  }

  if (Number.isFinite(unreadCount) && unreadCount > 0) {
    return 'new';
  }

  return 'idle';
}

function syncHomePlatformCommunicationIndicators(snapshot = HOME_PLATFORM_SHELL_STATE.snapshot) {
  const communication = snapshot?.communication || {};
  const entries = {
    messaging: communication.messaging || {},
    notifications: communication.notifications || {},
  };

  getHomePlatformShellIndicatorNodes().forEach((node) => {
    const key = normalizeString(node.getAttribute('data-home-platform-nav-indicator'));
    const entry = entries[key] || {};
    const state = resolveHomePlatformIndicatorState(entry);
    const unreadCount = Number(entry?.unreadCount || 0);
    const showCount = Number.isFinite(unreadCount) && unreadCount > 0;

    node.setAttribute('data-home-platform-nav-indicator-state', state);
    node.hidden = state === 'idle';
    node.textContent = showCount ? String(Math.min(unreadCount, 99)) : 'New';
  });
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
08) SHELL STATE HELPERS
============================================================================= */
async function setHomePlatformDestination(destination, subdestination = '') {
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

  await ensureHomePlatformConfig();

  const destinationConfig = getHomePlatformDestinationConfig(destination);
  if (!destinationConfig) {
    return;
  }

  const nextSubdestination = getHomePlatformSubdestinationConfig(destination, subdestination)
    ? subdestination
    : resolveDefaultSubdestination(destination);

  HOME_PLATFORM_SHELL_STATE.activeDestination = destination;
  HOME_PLATFORM_SHELL_STATE.activeSubdestination = nextSubdestination;

  syncHomePlatformShellNav(destination);
  renderHomePlatformShellSubnav(destination, nextSubdestination);
  await renderHomePlatformShellContent(destination, nextSubdestination);

  document.dispatchEvent(new CustomEvent('home:platform-shell-destination-changed', {
    detail: {
      destination,
      subdestination: nextSubdestination,
    },
  }));
}

async function setHomePlatformSubdestination(subdestination) {
  const destination = HOME_PLATFORM_SHELL_STATE.activeDestination;
  const destinationConfig = getHomePlatformDestinationConfig(destination);
  if (!destinationConfig) {
    return;
  }

  const nextSubdestination = getHomePlatformSubdestinationConfig(destination, subdestination)
    ? subdestination
    : resolveDefaultSubdestination(destination);

  HOME_PLATFORM_SHELL_STATE.activeSubdestination = nextSubdestination;
  renderHomePlatformShellSubnav(destination, nextSubdestination);
  await renderHomePlatformShellContent(destination, nextSubdestination);
}

/* =============================================================================
09) OPEN / CLOSE HELPERS
============================================================================= */
function closeConflictingHomeChrome() {
  getHomePlatformShellChromeRoots().forEach(hideRoot);
}

function openHomePlatformShell(destination = HOME_PLATFORM_SHELL_STATE.activeDestination) {
  const root = getHomePlatformShellRoot();
  if (!root) return;

  closeConflictingHomeChrome();
  document.dispatchEvent(new CustomEvent('neuroartan:cookie-consent-close-requested', {
    detail: {
      source: 'home-platform-shell',
    },
  }));
  root.hidden = false;
  root.setAttribute('aria-hidden', 'false');
  document.body.classList.add('home-platform-shell-open');
  syncHomePlatformRailMode(HOME_PLATFORM_SHELL_STATE.railMode);

  void setHomePlatformDestination(destination).then(() => {
    document.dispatchEvent(new CustomEvent('home:platform-shell-opened', {
      detail: {
        destination: HOME_PLATFORM_SHELL_STATE.activeDestination,
        subdestination: HOME_PLATFORM_SHELL_STATE.activeSubdestination,
      },
    }));
  });
}

function closeHomePlatformShell() {
  const root = getHomePlatformShellRoot();
  if (!root) return;

  root.hidden = true;
  root.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('home-platform-shell-open');
  root.removeAttribute('data-home-platform-destination');
  root.removeAttribute('data-home-platform-subdestination');
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
    void setHomePlatformDestination(destination);
    return;
  }

  closeHomePlatformShell();
}

/* =============================================================================
10) EVENT BINDING
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

    const navTrigger = event.target.closest(
      '#home-platform-shell .home-platform-shell__nav-item[data-home-platform-destination]'
    );
    if (navTrigger) {
      const destination = navTrigger.getAttribute('data-home-platform-destination') || 'home';
      event.preventDefault();
      void setHomePlatformDestination(destination);
      return;
    }

    const subnavTrigger = event.target.closest(
      '#home-platform-shell-subnav .home-platform-shell__subnav-item[data-home-platform-subdestination]'
    );
    if (subnavTrigger) {
      const subdestination = subnavTrigger.getAttribute('data-home-platform-subdestination') || '';
      event.preventDefault();
      void setHomePlatformSubdestination(subdestination);
      return;
    }

    const detailLink = event.target.closest('[data-home-platform-detail-href]');
    if (detailLink instanceof HTMLAnchorElement) {
      closeHomePlatformShell();
      return;
    }

    const detailAction = event.target.closest('[data-home-platform-detail-action]');
    if (detailAction) {
      event.preventDefault();
      handleHomePlatformDetailAction(detailAction.getAttribute('data-home-platform-detail-action') || '');
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
    syncHomePlatformCommunicationIndicators(snapshot);

    const root = getHomePlatformShellRoot();
    if (!root || root.hidden) {
      return;
    }

    void renderHomePlatformShellContent(
      HOME_PLATFORM_SHELL_STATE.activeDestination,
      HOME_PLATFORM_SHELL_STATE.activeSubdestination
    );
  });
}

/* =============================================================================
11) BOOT
============================================================================= */
function bootHomePlatformShell() {
  if (!getHomePlatformShellRoot()) return;
  bindHomePlatformShellEvents();
  HOME_PLATFORM_SHELL_STATE.railMode = loadHomePlatformRailMode();
  syncHomePlatformRailMode(HOME_PLATFORM_SHELL_STATE.railMode);
  syncHomePlatformCommunicationIndicators(HOME_PLATFORM_SHELL_STATE.snapshot);

  void ensureHomePlatformConfig().then(() => {
    syncHomePlatformShellNav(HOME_PLATFORM_SHELL_STATE.activeDestination);
    renderHomePlatformShellSubnav(
      HOME_PLATFORM_SHELL_STATE.activeDestination,
      HOME_PLATFORM_SHELL_STATE.activeSubdestination || resolveDefaultSubdestination(HOME_PLATFORM_SHELL_STATE.activeDestination)
    );
    void renderHomePlatformShellContent(
      HOME_PLATFORM_SHELL_STATE.activeDestination,
      HOME_PLATFORM_SHELL_STATE.activeSubdestination || resolveDefaultSubdestination(HOME_PLATFORM_SHELL_STATE.activeDestination)
    );
  });
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
12) END OF FILE
============================================================================= */
