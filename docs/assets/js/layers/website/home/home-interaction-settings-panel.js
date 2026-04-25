/* =========================================================
   00. FILE INDEX
   01. MODULE STATE
   02. DOM HELPERS
   03. STORAGE HELPERS
   04. STATE APPLICATION
   05. PANEL VISIBILITY
   06. SETTING ACTIONS
   07. EVENT BINDING
   08. MODULE BOOT
   ========================================================= */

/* =========================================================
   01. MODULE STATE
   ========================================================= */

const HOME_INTERACTION_SETTINGS_STORAGE_KEY = 'neuroartan.home.interaction.settings';

const HOME_INTERACTION_SETTINGS_DEFAULTS = Object.freeze({
  responseMode: 'text',
  interactionStyle: 'composer',
  stageEffects: 'subtle',
  stageText: 'minimal',
});

const HOME_INTERACTION_SETTINGS_STATE = {
  isBound: false,
  isOpen: false,
  values: { ...HOME_INTERACTION_SETTINGS_DEFAULTS },
};

/* =========================================================
   02. DOM HELPERS
   ========================================================= */

function getHomeInteractionSettingsNodes() {
  return {
    panel: document.querySelector('#home-interaction-settings-panel'),
    closeButton: document.querySelector('[data-home-interaction-settings-close="true"]'),
    toggleButton: document.querySelector('[data-home-interaction-settings="true"]'),
    options: Array.from(document.querySelectorAll('[data-home-interaction-setting]')),
  };
}

function normalizeHomeInteractionSettingsValue(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function dispatchHomeInteractionSettingsEvent(name, detail = {}) {
  document.dispatchEvent(new CustomEvent(name, { detail }));
}

/* =========================================================
   03. STORAGE HELPERS
   ========================================================= */

function readHomeInteractionSettings() {
  try {
    const rawValue = window.localStorage.getItem(HOME_INTERACTION_SETTINGS_STORAGE_KEY);

    if (!rawValue) {
      return { ...HOME_INTERACTION_SETTINGS_DEFAULTS };
    }

    const parsedValue = JSON.parse(rawValue);

    return {
      responseMode: normalizeHomeInteractionSettingsValue(parsedValue.responseMode) || HOME_INTERACTION_SETTINGS_DEFAULTS.responseMode,
      interactionStyle: normalizeHomeInteractionSettingsValue(parsedValue.interactionStyle) || HOME_INTERACTION_SETTINGS_DEFAULTS.interactionStyle,
      stageEffects: normalizeHomeInteractionSettingsValue(parsedValue.stageEffects) || HOME_INTERACTION_SETTINGS_DEFAULTS.stageEffects,
      stageText: normalizeHomeInteractionSettingsValue(parsedValue.stageText) || HOME_INTERACTION_SETTINGS_DEFAULTS.stageText,
    };
  } catch {
    return { ...HOME_INTERACTION_SETTINGS_DEFAULTS };
  }
}

function writeHomeInteractionSettings() {
  try {
    window.localStorage.setItem(
      HOME_INTERACTION_SETTINGS_STORAGE_KEY,
      JSON.stringify(HOME_INTERACTION_SETTINGS_STATE.values)
    );
  } catch {
    /* Storage may be unavailable in restricted browsing contexts. */
  }
}

/* =========================================================
   04. STATE APPLICATION
   ========================================================= */

function applyHomeInteractionSettingsAttributes() {
  const root = document.documentElement;
  const values = HOME_INTERACTION_SETTINGS_STATE.values;

  root.dataset.homeInteractionResponseMode = values.responseMode;
  root.dataset.homeInteractionStyle = values.interactionStyle;
  root.dataset.homeInteractionStageEffects = values.stageEffects;
  root.dataset.homeInteractionStageText = values.stageText;
}

function syncHomeInteractionSettingsPanel() {
  const nodes = getHomeInteractionSettingsNodes();
  const values = HOME_INTERACTION_SETTINGS_STATE.values;

  if (nodes.panel) {
    nodes.panel.dataset.homeInteractionSettingsState = HOME_INTERACTION_SETTINGS_STATE.isOpen ? 'open' : 'closed';
    nodes.panel.hidden = !HOME_INTERACTION_SETTINGS_STATE.isOpen;
  }

  if (nodes.toggleButton instanceof HTMLButtonElement) {
    nodes.toggleButton.setAttribute('aria-expanded', HOME_INTERACTION_SETTINGS_STATE.isOpen ? 'true' : 'false');
  }

  nodes.options.forEach((option) => {
    const setting = normalizeHomeInteractionSettingsValue(option.getAttribute('data-home-interaction-setting'));
    const value = normalizeHomeInteractionSettingsValue(option.getAttribute('data-home-interaction-setting-value'));

    if (!setting || !value) {
      return;
    }

    const activeValue = values[settingToStateKey(setting)];
    option.setAttribute('aria-pressed', activeValue === value ? 'true' : 'false');
  });

  applyHomeInteractionSettingsAttributes();
}

function settingToStateKey(setting) {
  switch (setting) {
    case 'response-mode':
      return 'responseMode';
    case 'interaction-style':
      return 'interactionStyle';
    case 'stage-effects':
      return 'stageEffects';
    case 'stage-text':
      return 'stageText';
    default:
      return '';
  }
}

/* =========================================================
   05. PANEL VISIBILITY
   ========================================================= */

function openHomeInteractionSettingsPanel() {
  HOME_INTERACTION_SETTINGS_STATE.isOpen = true;
  syncHomeInteractionSettingsPanel();
}

function closeHomeInteractionSettingsPanel() {
  HOME_INTERACTION_SETTINGS_STATE.isOpen = false;
  syncHomeInteractionSettingsPanel();
}

function toggleHomeInteractionSettingsPanel(forceOpen) {
  if (typeof forceOpen === 'boolean') {
    HOME_INTERACTION_SETTINGS_STATE.isOpen = forceOpen;
  } else {
    HOME_INTERACTION_SETTINGS_STATE.isOpen = !HOME_INTERACTION_SETTINGS_STATE.isOpen;
  }

  syncHomeInteractionSettingsPanel();
}

/* =========================================================
   06. SETTING ACTIONS
   ========================================================= */

function updateHomeInteractionSetting(setting, value) {
  const key = settingToStateKey(setting);

  if (!key || !value) {
    return;
  }

  HOME_INTERACTION_SETTINGS_STATE.values[key] = value;
  writeHomeInteractionSettings();
  syncHomeInteractionSettingsPanel();

  dispatchHomeInteractionSettingsEvent('neuroartan:home-interaction-settings-changed', {
    setting,
    value,
    values: { ...HOME_INTERACTION_SETTINGS_STATE.values },
  });
}

/* =========================================================
   07. EVENT BINDING
   ========================================================= */

function bindHomeInteractionSettingsPanel() {
  if (HOME_INTERACTION_SETTINGS_STATE.isBound) {
    syncHomeInteractionSettingsPanel();
    return;
  }

  HOME_INTERACTION_SETTINGS_STATE.isBound = true;

  document.addEventListener('neuroartan:home-interaction-settings-toggle-requested', (event) => {
    toggleHomeInteractionSettingsPanel(Boolean(event?.detail?.open));
  });

  document.addEventListener('click', (event) => {
    const nodes = getHomeInteractionSettingsNodes();
    const target = event.target instanceof Element
      ? event.target.closest('[data-home-interaction-settings-close="true"], [data-home-interaction-setting]')
      : null;

    if (!target || !nodes.panel || !nodes.panel.contains(target)) {
      return;
    }

    if (target.matches('[data-home-interaction-settings-close="true"]')) {
      event.preventDefault();
      closeHomeInteractionSettingsPanel();
      return;
    }

    if (target.matches('[data-home-interaction-setting]')) {
      event.preventDefault();
      updateHomeInteractionSetting(
        normalizeHomeInteractionSettingsValue(target.getAttribute('data-home-interaction-setting')),
        normalizeHomeInteractionSettingsValue(target.getAttribute('data-home-interaction-setting-value'))
      );
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && HOME_INTERACTION_SETTINGS_STATE.isOpen) {
      closeHomeInteractionSettingsPanel();
    }
  });
}

/* =========================================================
   08. MODULE BOOT
   ========================================================= */

function bootHomeInteractionSettingsPanel() {
  HOME_INTERACTION_SETTINGS_STATE.values = readHomeInteractionSettings();
  bindHomeInteractionSettingsPanel();
  syncHomeInteractionSettingsPanel();
}

document.addEventListener('fragment:mounted', (event) => {
  if (event?.detail?.name !== 'home-interaction-settings-panel') {
    return;
  }

  bootHomeInteractionSettingsPanel();
});

document.addEventListener('neuroartan:runtime-ready', bootHomeInteractionSettingsPanel);

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootHomeInteractionSettingsPanel, { once: true });
} else {
  bootHomeInteractionSettingsPanel();
}