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
};

/* =========================================================
   02. DOM HELPERS
   ========================================================= */

function getHomeDashboardTopbarNodes() {
  return {
    root: document.querySelector('#home-dashboard-topbar'),
    searchTrigger: document.querySelector('#home-dashboard-search-trigger'),
    languageTrigger: document.querySelector('#home-dashboard-language-trigger'),
    settingsTrigger: document.querySelector('#home-dashboard-settings-trigger'),
    profileTrigger: document.querySelector('#home-dashboard-profile-trigger'),
    countryOverlayMount: document.querySelector('#country-overlay-mount'),
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

function openHomeSearchShell(nodes) {
  setTriggerExpanded(nodes.searchTrigger, true);
  dispatchHomeTopbarEvent('neuroartan:home-search-shell-open-requested', {
    source: 'home-dashboard-topbar',
    mountAvailable: Boolean(nodes.searchMount),
  });
}

function openHomeSettingsPanel(nodes) {
  setTriggerExpanded(nodes.settingsTrigger, true);
  dispatchHomeTopbarEvent('neuroartan:home-settings-panel-open-requested', {
    source: 'home-dashboard-topbar',
    mountAvailable: Boolean(nodes.settingsMount),
  });
}

function openHomeProfilePanel(nodes) {
  setTriggerExpanded(nodes.profileTrigger, true);
  dispatchHomeTopbarEvent('neuroartan:home-panel-right-open-requested', {
    source: 'home-dashboard-topbar',
    mountAvailable: Boolean(nodes.profileMount),
  });
}

function openLanguageOverlay(nodes) {
  setTriggerExpanded(nodes.languageTrigger, true);
  dispatchHomeTopbarEvent('neuroartan:country-overlay-open-requested', {
    source: 'home-dashboard-topbar',
    mountAvailable: Boolean(nodes.countryOverlayMount),
  });
}

/* =========================================================
   04. EVENT BINDING
   ========================================================= */

function bindHomeDashboardTopbar() {
  const nodes = getHomeDashboardTopbarNodes();

  if (!nodes.root) {
    return;
  }

  nodes.searchTrigger?.addEventListener('click', () => {
    openHomeSearchShell(nodes);
  });

  nodes.languageTrigger?.addEventListener('click', () => {
    openLanguageOverlay(nodes);
  });

  nodes.settingsTrigger?.addEventListener('click', () => {
    openHomeSettingsPanel(nodes);
  });

  nodes.profileTrigger?.addEventListener('click', () => {
    openHomeProfilePanel(nodes);
  });

  document.addEventListener('neuroartan:home-topbar-reset-triggers', () => {
    setTriggerExpanded(nodes.searchTrigger, false);
    setTriggerExpanded(nodes.languageTrigger, false);
    setTriggerExpanded(nodes.settingsTrigger, false);
    setTriggerExpanded(nodes.profileTrigger, false);
  });
}

/* =========================================================
   05. MODULE BOOT
   ========================================================= */

function bootHomeDashboardTopbar() {
  if (HOME_DASHBOARD_TOPBAR_STATE.isBound) {
    return;
  }

  HOME_DASHBOARD_TOPBAR_STATE.isBound = true;
  bindHomeDashboardTopbar();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootHomeDashboardTopbar, { once: true });
} else {
  bootHomeDashboardTopbar();
}
