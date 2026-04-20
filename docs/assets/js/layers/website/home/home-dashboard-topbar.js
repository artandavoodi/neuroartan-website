/* =========================================================
   00. FILE INDEX
   01. MODULE STATE
   02. DOM HELPERS
   03. TRIGGER HELPERS
   04. EVENT BINDING
   05. MODULE BOOT
   ========================================================= */

/* =========================================================
   01. MODULE STATE
   ========================================================= */

const HOME_DASHBOARD_TOPBAR_STATE = {
  isBound: false,
  root: null,
};

/* =========================================================
   02. DOM HELPERS
   ========================================================= */

function getHomeDashboardTopbarNodes() {
  return {
    root: document.querySelector('#home-dashboard-topbar'),
    sidebarTrigger: document.querySelector('#home-dashboard-sidebar-trigger'),
    workspaceTrigger: document.querySelector('#home-dashboard-workspace-trigger'),
    searchTrigger: document.querySelector('#home-dashboard-search-trigger'),
    settingsTrigger: document.querySelector('#home-dashboard-settings-trigger'),
    profileTrigger: document.querySelector('#home-dashboard-profile-trigger'),
    sidebarPanel: document.querySelector('#home-sidebar'),
    workspacePanel: document.querySelector('#home-panel-left'),
    searchPanel: document.querySelector('#home-search-shell'),
    settingsPanel: document.querySelector('#home-settings-panel'),
    profilePanel: document.querySelector('#home-panel-right'),
    settingsMount: document.querySelector('#home-settings-panel-mount'),
    profileMount: document.querySelector('#home-panel-right-mount'),
    searchMount: document.querySelector('#home-search-shell-mount'),
  };
}

/* =========================================================
   03. TRIGGER HELPERS
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

function toggleHomeWorkspacePanel(nodes) {
  if (isTopbarTargetOpen(nodes.workspacePanel)) {
    dispatchHomeTopbarEvent('neuroartan:home-panel-left-close-requested', {
      source: 'home-dashboard-topbar',
    });
    setTriggerExpanded(nodes.workspaceTrigger, false);
    return;
  }

  setTriggerExpanded(nodes.workspaceTrigger, true);
  dispatchHomeTopbarEvent('neuroartan:home-panel-left-open-requested', {
    source: 'home-dashboard-topbar',
    intent: 'saved-continuities',
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

function openHomeSettingsPanel(nodes) {
  if (isTopbarTargetOpen(nodes.settingsPanel)) {
    dispatchHomeTopbarEvent('neuroartan:home-settings-panel-close-requested', {
      source: 'home-dashboard-topbar',
    });
    setTriggerExpanded(nodes.settingsTrigger, false);
    return;
  }

  dispatchHomeTopbarEvent('neuroartan:home-panel-right-close-requested', {
    source: 'home-dashboard-topbar',
  });
  setTriggerExpanded(nodes.settingsTrigger, true);
  dispatchHomeTopbarEvent('neuroartan:home-settings-panel-open-requested', {
    source: 'home-dashboard-topbar',
    mountAvailable: Boolean(nodes.settingsMount),
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
   04. EVENT BINDING
   ========================================================= */

function bindHomeDashboardTopbar() {
  document.addEventListener('click', (event) => {
    const root = getLiveTopbarRoot();
    if (!root) return;

    const trigger = event.target.closest(
      '#home-dashboard-sidebar-trigger, ' +
      '#home-dashboard-workspace-trigger, ' +
      '#home-dashboard-search-trigger, ' +
      '#home-dashboard-settings-trigger, ' +
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

    if (trigger.matches('#home-dashboard-workspace-trigger')) {
      toggleHomeWorkspacePanel(nodes);
      return;
    }

    if (trigger.matches('#home-dashboard-search-trigger')) {
      openHomeSearchShell(nodes);
      return;
    }

    if (trigger.matches('#home-dashboard-settings-trigger')) {
      openHomeSettingsPanel(nodes);
      return;
    }

    if (trigger.matches('#home-dashboard-profile-trigger')) {
      openHomeProfilePanel(nodes);
    }
  });

  document.addEventListener('neuroartan:home-topbar-reset-triggers', () => {
    const liveNodes = getHomeDashboardTopbarNodes();
    setTriggerExpanded(liveNodes.sidebarTrigger, false);
    setTriggerExpanded(liveNodes.workspaceTrigger, false);
    setTriggerExpanded(liveNodes.searchTrigger, false);
    setTriggerExpanded(liveNodes.settingsTrigger, false);
    setTriggerExpanded(liveNodes.profileTrigger, false);
  });
}

/* =========================================================
   05. MODULE BOOT
   ========================================================= */

function bootHomeDashboardTopbar() {
  const root = getLiveTopbarRoot();
  if (!root) {
    return;
  }

  HOME_DASHBOARD_TOPBAR_STATE.root = root;

  if (HOME_DASHBOARD_TOPBAR_STATE.isBound) {
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
