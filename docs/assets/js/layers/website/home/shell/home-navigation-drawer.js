import { subscribeHomeSurfaceState } from '../core/home-surface-state.js';

/* =========================================================
   00. FILE INDEX
   01. MODULE STATE
   02. DOM HELPERS
   03. NAVIGATION DRAWER ACTION HELPERS
   04. EVENT BINDING
   05. MODULE BOOT
   ========================================================= */

/* =========================================================
   01. MODULE STATE
   ========================================================= */

const HOME_NAVIGATION_DRAWER_STATE = {
  isBound: false,
  root: null,
  snapshot: null,
};

/* =========================================================
   02. DOM HELPERS
   ========================================================= */

function getHomeNavigationDrawerNodes() {
  const root = document.querySelector('#home-navigation-drawer');

  return {
    root,
    closeButton: document.querySelector('#home-navigation-drawer-close'),
    quickActionButtons: root ? Array.from(root.querySelectorAll('.home-navigation-drawer__stack-item')) : [],
    profileButton: root ? root.querySelector('[data-home-navigation-drawer-action="profile"]') : null,
  };
}

function dispatchHomeNavigationDrawerEvent(name, detail = {}) {
  document.dispatchEvent(new CustomEvent(name, { detail }));
}

function getLiveNavigationDrawerRoot() {
  return document.querySelector('#home-navigation-drawer');
}

function openHomeNavigationDrawer() {
  const nodes = getHomeNavigationDrawerNodes();

  if (!nodes.root) {
    return;
  }

  dispatchHomeNavigationDrawerEvent('home:platform-shell-close-request', {
    source: 'home-navigation-drawer',
  });
  nodes.root.hidden = false;
  document.documentElement.classList.add('home-navigation-drawer-open');
  document.body.classList.add('home-navigation-drawer-open');
}

function closeHomeNavigationDrawer() {
  const nodes = getHomeNavigationDrawerNodes();

  if (!nodes.root) {
    return;
  }

  nodes.root.hidden = true;
  document.documentElement.classList.remove('home-navigation-drawer-open');
  document.body.classList.remove('home-navigation-drawer-open');
  dispatchHomeNavigationDrawerEvent('neuroartan:home-topbar-reset-triggers');
}

/* =========================================================
   03. NAVIGATION DRAWER ACTION HELPERS
   ========================================================= */

function normalizeNavigationDrawerLabel(label) {
  return typeof label === 'string' ? label.trim().toLowerCase() : '';
}

function renderHomeNavigationDrawer(snapshot) {
  HOME_NAVIGATION_DRAWER_STATE.snapshot = snapshot;
}

function handleHomeNavigationDrawerQuickAction(action) {
  const normalized = normalizeNavigationDrawerLabel(action);

  if (normalized === 'settings') {
    dispatchHomeNavigationDrawerEvent('home:platform-shell-open-request', {
      source: 'home-navigation-drawer',
      destination: 'settings',
    });
    closeHomeNavigationDrawer();
    return;
  }

  if (normalized === 'profile') {
    dispatchHomeNavigationDrawerEvent('home:platform-shell-open-request', {
      source: 'home-navigation-drawer',
      destination: 'profile',
    });
    closeHomeNavigationDrawer();
    return;
  }

  if (normalized === 'workspace') {
    dispatchHomeNavigationDrawerEvent('home:platform-shell-open-request', {
      source: 'home-navigation-drawer',
      destination: 'workspace',
    });
    closeHomeNavigationDrawer();
    return;
  }

  if (normalized === 'continuity') {
    dispatchHomeNavigationDrawerEvent('home:platform-shell-open-request', {
      source: 'home-navigation-drawer',
      destination: 'continuity',
    });
    closeHomeNavigationDrawer();
    return;
  }

  if (normalized === 'cookie-settings') {
    dispatchHomeNavigationDrawerEvent('neuroartan:cookie-consent-open-requested', {
      source: 'home-navigation-drawer',
      surface: 'settings',
    });
    closeHomeNavigationDrawer();
  }
}

/* =========================================================
   04. EVENT BINDING
   ========================================================= */

function bindHomeNavigationDrawer() {
  subscribeHomeSurfaceState(renderHomeNavigationDrawer);

  document.addEventListener('click', (event) => {
    const root = getLiveNavigationDrawerRoot();
    if (!root) return;

    const target = event.target.closest(
      '#home-navigation-drawer-close, ' +
      '#home-navigation-drawer a.home-navigation-drawer__stack-item, ' +
      '#home-navigation-drawer button.home-navigation-drawer__stack-item'
    );

    if (!target || !root.contains(target)) {
      return;
    }

    if (target.matches('#home-navigation-drawer-close')) {
      closeHomeNavigationDrawer();
      return;
    }

    if (target.matches('a.home-navigation-drawer__stack-item[href]')) {
      closeHomeNavigationDrawer();
      return;
    }

    if (target.matches('button.home-navigation-drawer__stack-item')) {
      handleHomeNavigationDrawerQuickAction(
        target.getAttribute('data-home-navigation-drawer-action') ||
        target.textContent ||
        ''
      );
      return;
    }
  });

  document.addEventListener('neuroartan:home-navigation-drawer-open-requested', () => {
    openHomeNavigationDrawer();
  });

  document.addEventListener('neuroartan:home-navigation-drawer-close-requested', () => {
    closeHomeNavigationDrawer();
  });

  document.addEventListener('home:platform-shell-open-request', () => {
    closeHomeNavigationDrawer();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && document.body.classList.contains('home-navigation-drawer-open')) {
      closeHomeNavigationDrawer();
    }
  });
}

/* =========================================================
   05. MODULE BOOT
   ========================================================= */

function bootHomeNavigationDrawer() {
  const root = getLiveNavigationDrawerRoot();
  if (!root) {
    return;
  }

  HOME_NAVIGATION_DRAWER_STATE.root = root;

  if (HOME_NAVIGATION_DRAWER_STATE.isBound) {
    return;
  }

  HOME_NAVIGATION_DRAWER_STATE.isBound = true;
  bindHomeNavigationDrawer();
}

document.addEventListener('fragment:mounted', (event) => {
  if (event?.detail?.name !== 'home-navigation-drawer') return;
  bootHomeNavigationDrawer();
});

document.addEventListener('neuroartan:runtime-ready', () => {
  bootHomeNavigationDrawer();
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootHomeNavigationDrawer, { once: true });
} else {
  bootHomeNavigationDrawer();
}
