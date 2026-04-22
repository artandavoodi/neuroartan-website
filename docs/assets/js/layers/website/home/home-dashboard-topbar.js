import { subscribeHomeSurfaceState } from './home-surface-state.js';

/* =========================================================
   00. FILE INDEX
   01. MODULE STATE
   02. DOM HELPERS
   03. PROFILE HELPERS
   04. TRIGGER HELPERS
   05. EVENT BINDING
   06. MODULE BOOT
   ========================================================= */

/* =========================================================
   01. MODULE STATE
   ========================================================= */

const HOME_DASHBOARD_TOPBAR_STATE = {
  isBound: false,
  root: null,
  snapshot: null,
};

/* =========================================================
   02. DOM HELPERS
   ========================================================= */

function getHomeDashboardTopbarNodes() {
  return {
    root: document.querySelector('#home-dashboard-topbar'),
    sidebarTrigger: document.querySelector('#home-dashboard-sidebar-trigger'),
    searchTrigger: document.querySelector('#home-dashboard-search-trigger'),
    profileTrigger: document.querySelector('#home-dashboard-profile-trigger'),
    profileLabel: document.querySelector('[data-home-topbar-profile-label]'),
    profileAvatarShell: document.querySelector('[data-home-topbar-profile-avatar-shell]'),
    profileAvatarImage: document.querySelector('[data-home-topbar-profile-avatar]'),
    profileAvatarFallback: document.querySelector('[data-home-topbar-profile-avatar-fallback]'),
    profileIcon: document.querySelector('[data-home-topbar-profile-icon]'),
    sidebarPanel: document.querySelector('#home-sidebar'),
    searchPanel: document.querySelector('#home-search-shell'),
    profilePanel: document.querySelector('#home-panel-right'),
    profileMount: document.querySelector('#home-panel-right-mount'),
    searchMount: document.querySelector('#home-search-shell-mount'),
  };
}

/* =========================================================
   03. PROFILE HELPERS
   ========================================================= */

function resolveHomeTopbarProfileLabel(snapshot) {
  const displayName = snapshot?.account?.profile?.display_name || snapshot?.account?.user?.displayName || '';
  const username = snapshot?.account?.profile?.username || '';

  if (displayName) {
    return displayName;
  }

  if (username) {
    return `@${username}`;
  }

  return 'Profile';
}

function resolveHomeTopbarProfileFallback(snapshot) {
  const label = resolveHomeTopbarProfileLabel(snapshot).replace(/^@/, '');
  return (label.charAt(0) || 'N').toUpperCase();
}

function renderHomeDashboardTopbar(snapshot) {
  HOME_DASHBOARD_TOPBAR_STATE.snapshot = snapshot;

  const nodes = getHomeDashboardTopbarNodes();
  const signedIn = !!snapshot?.account?.signedIn;
  const photo = snapshot?.account?.profile?.photo_url || snapshot?.account?.user?.photoURL || '';

  if (nodes.profileLabel) {
    nodes.profileLabel.textContent = signedIn ? resolveHomeTopbarProfileLabel(snapshot) : 'Profile';
  }

  if (nodes.profileTrigger) {
    const label = signedIn ? `Open profile panel for ${resolveHomeTopbarProfileLabel(snapshot)}` : 'Open profile panel';
    nodes.profileTrigger.setAttribute('aria-label', label);
  }

  if (nodes.profileAvatarShell) {
    nodes.profileAvatarShell.hidden = !signedIn;
  }

  if (nodes.profileAvatarImage) {
    if (signedIn && photo) {
      nodes.profileAvatarImage.hidden = false;
      nodes.profileAvatarImage.src = photo;
      nodes.profileAvatarImage.alt = resolveHomeTopbarProfileLabel(snapshot);
    } else {
      nodes.profileAvatarImage.hidden = true;
      nodes.profileAvatarImage.removeAttribute('src');
      nodes.profileAvatarImage.alt = '';
    }
  }

  if (nodes.profileAvatarFallback) {
    nodes.profileAvatarFallback.hidden = !signedIn || !!photo;
    nodes.profileAvatarFallback.textContent = resolveHomeTopbarProfileFallback(snapshot);
  }

  if (nodes.profileIcon) {
    nodes.profileIcon.hidden = signedIn;
  }
}

/* =========================================================
   04. TRIGGER HELPERS
   ========================================================= */

function setTriggerExpanded(trigger, expanded) {
  if (!trigger) return;
  trigger.setAttribute('aria-expanded', expanded ? 'true' : 'false');
}

function dispatchHomeTopbarEvent(name, detail = {}) {
  document.dispatchEvent(new CustomEvent(name, { detail }));
}

function getLiveTopbarRoot() {
  return document.querySelector('#home-dashboard-topbar');
}

function isTopbarTargetOpen(panel) {
  return Boolean(panel && !panel.hidden);
}

function toggleHomeSidebar(nodes) {
  if (isTopbarTargetOpen(nodes.sidebarPanel)) {
    dispatchHomeTopbarEvent('neuroartan:home-sidebar-close-requested', {
      source: 'home-dashboard-topbar',
    });
    setTriggerExpanded(nodes.sidebarTrigger, false);
    return;
  }

  setTriggerExpanded(nodes.sidebarTrigger, true);
  dispatchHomeTopbarEvent('neuroartan:home-sidebar-open-requested', {
    source: 'home-dashboard-topbar',
  });
}

function openHomeSearchShell(nodes) {
  if (isTopbarTargetOpen(nodes.searchPanel)) {
    dispatchHomeTopbarEvent('neuroartan:home-search-shell-close-requested', {
      source: 'home-dashboard-topbar',
    });
    setTriggerExpanded(nodes.searchTrigger, false);
    return;
  }

  setTriggerExpanded(nodes.searchTrigger, true);
  dispatchHomeTopbarEvent('neuroartan:home-search-shell-open-requested', {
    source: 'home-dashboard-topbar',
    mountAvailable: Boolean(nodes.searchMount),
  });
}

function openHomeProfilePanel(nodes) {
  if (isTopbarTargetOpen(nodes.profilePanel)) {
    dispatchHomeTopbarEvent('neuroartan:home-panel-right-close-requested', {
      source: 'home-dashboard-topbar',
    });
    setTriggerExpanded(nodes.profileTrigger, false);
    return;
  }

  dispatchHomeTopbarEvent('neuroartan:home-settings-panel-close-requested', {
    source: 'home-dashboard-topbar',
  });
  setTriggerExpanded(nodes.profileTrigger, true);
  dispatchHomeTopbarEvent('neuroartan:home-panel-right-open-requested', {
    source: 'home-dashboard-topbar',
    mountAvailable: Boolean(nodes.profileMount),
  });
}

/* =========================================================
   05. EVENT BINDING
   ========================================================= */

function bindHomeDashboardTopbar() {
  subscribeHomeSurfaceState(renderHomeDashboardTopbar);

  document.addEventListener('click', (event) => {
    const root = getLiveTopbarRoot();
    if (!root) return;

    const trigger = event.target.closest(
      '#home-dashboard-sidebar-trigger, ' +
      '#home-dashboard-search-trigger, ' +
      '#home-dashboard-profile-trigger'
    );

    if (!trigger || !root.contains(trigger)) {
      return;
    }

    const nodes = getHomeDashboardTopbarNodes();

    if (trigger.matches('#home-dashboard-sidebar-trigger')) {
      toggleHomeSidebar(nodes);
      return;
    }

    if (trigger.matches('#home-dashboard-search-trigger')) {
      openHomeSearchShell(nodes);
      return;
    }

    if (trigger.matches('#home-dashboard-profile-trigger')) {
      openHomeProfilePanel(nodes);
    }
  });

  document.addEventListener('neuroartan:home-topbar-reset-triggers', () => {
    const liveNodes = getHomeDashboardTopbarNodes();
    setTriggerExpanded(liveNodes.sidebarTrigger, false);
    setTriggerExpanded(liveNodes.searchTrigger, false);
    setTriggerExpanded(liveNodes.profileTrigger, false);
  });
}

/* =========================================================
   06. MODULE BOOT
   ========================================================= */

function bootHomeDashboardTopbar() {
  const root = getLiveTopbarRoot();
  if (!root) {
    return;
  }

  HOME_DASHBOARD_TOPBAR_STATE.root = root;

  if (HOME_DASHBOARD_TOPBAR_STATE.isBound) {
    renderHomeDashboardTopbar(HOME_DASHBOARD_TOPBAR_STATE.snapshot || {});
    return;
  }

  HOME_DASHBOARD_TOPBAR_STATE.isBound = true;
  bindHomeDashboardTopbar();
}

document.addEventListener('fragment:mounted', (event) => {
  if (event?.detail?.name !== 'home-dashboard-topbar') return;
  bootHomeDashboardTopbar();
});

document.addEventListener('neuroartan:runtime-ready', () => {
  bootHomeDashboardTopbar();
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootHomeDashboardTopbar, { once: true });
} else {
  bootHomeDashboardTopbar();
}
