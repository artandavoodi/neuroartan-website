/* =========================================================
   00. FILE INDEX
   01. MODULE STATE
   02. DOM HELPERS
   03. PANEL STATE HELPERS
   04. ACTION HELPERS
   05. EVENT BINDING
   06. MODULE BOOT
   ========================================================= */

/* =========================================================
   01. MODULE STATE
   ========================================================= */

const HOME_SETTINGS_PANEL_STATE = {
  isBound: false,
  isOpen: false,
};

/* =========================================================
   02. DOM HELPERS
   ========================================================= */

function getHomeSettingsPanelNodes() {
  return {
    panel: document.querySelector('#home-settings-panel'),
    closeButton: document.querySelector('#home-settings-panel-close'),
    items: Array.from(document.querySelectorAll('#home-settings-panel .home-settings-panel__item')),
  };
}

function dispatchHomeSettingsPanelEvent(name, detail = {}) {
  document.dispatchEvent(new CustomEvent(name, { detail }));
}

/* =========================================================
   03. PANEL STATE HELPERS
   ========================================================= */

function openHomeSettingsPanel() {
  const nodes = getHomeSettingsPanelNodes();

  if (!nodes.panel) {
    return;
  }

  HOME_SETTINGS_PANEL_STATE.isOpen = true;
  nodes.panel.hidden = false;
  document.documentElement.classList.add('home-settings-panel-open');
  document.body.classList.add('home-settings-panel-open');
}

function closeHomeSettingsPanel() {
  const nodes = getHomeSettingsPanelNodes();

  if (!nodes.panel) {
    return;
  }

  HOME_SETTINGS_PANEL_STATE.isOpen = false;
  nodes.panel.hidden = true;
  document.documentElement.classList.remove('home-settings-panel-open');
  document.body.classList.remove('home-settings-panel-open');
  dispatchHomeSettingsPanelEvent('neuroartan:home-topbar-reset-triggers');
}

/* =========================================================
   04. ACTION HELPERS
   ========================================================= */

function normalizeHomeSettingsLabel(label) {
  return typeof label === 'string' ? label.trim().toLowerCase() : '';
}

function handleHomeSettingsPanelAction(label) {
  const normalized = normalizeHomeSettingsLabel(label);

  if (normalized === 'language' || normalized === 'country') {
    dispatchHomeSettingsPanelEvent('neuroartan:country-overlay-open-requested', {
      source: 'home-settings-panel',
    });
    return;
  }

  if (normalized === 'privacy') {
    dispatchHomeSettingsPanelEvent('neuroartan:cookie-consent-open-requested', {
      source: 'home-settings-panel',
      surface: 'settings',
    });
    return;
  }

  dispatchHomeSettingsPanelEvent('neuroartan:home-settings-panel-item-selected', {
    label: label?.trim() || '',
  });
}

/* =========================================================
   05. EVENT BINDING
   ========================================================= */

function bindHomeSettingsPanel() {
  const nodes = getHomeSettingsPanelNodes();

  if (!nodes.panel) {
    return;
  }

  nodes.closeButton?.addEventListener('click', () => {
    closeHomeSettingsPanel();
  });

  document.addEventListener('neuroartan:home-settings-panel-open-requested', () => {
    openHomeSettingsPanel();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && HOME_SETTINGS_PANEL_STATE.isOpen) {
      closeHomeSettingsPanel();
    }
  });

  nodes.items.forEach((button) => {
    button.addEventListener('click', () => {
      handleHomeSettingsPanelAction(button.textContent || '');
    });
  });
}

/* =========================================================
   06. MODULE BOOT
   ========================================================= */

function bootHomeSettingsPanel() {
  if (HOME_SETTINGS_PANEL_STATE.isBound) {
    return;
  }

  HOME_SETTINGS_PANEL_STATE.isBound = true;
  bindHomeSettingsPanel();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootHomeSettingsPanel, { once: true });
} else {
  bootHomeSettingsPanel();
}