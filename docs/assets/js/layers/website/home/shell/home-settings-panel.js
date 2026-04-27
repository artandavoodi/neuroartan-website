import {
  buildPublicProfileDisplay,
  buildPublicProfilePath,
} from '../../system/account-profile-identity.js';
import { subscribeHomeSurfaceState } from '../core/home-surface-state.js';

/* =========================================================
   00. FILE INDEX
   01. MODULE STATE
   02. DOM HELPERS
   03. THEME HELPERS
   04. PANEL STATE HELPERS
   05. ACTION HELPERS
   06. EVENT BINDING
   07. MODULE BOOT
   ========================================================= */

/* =========================================================
   01. MODULE STATE
   ========================================================= */

const HOME_SETTINGS_PANEL_STATE = {
  isBound: false,
  isOpen: false,
  root: null,
  snapshot: null,
};

/* =========================================================
   02. DOM HELPERS
   ========================================================= */

function getHomeSettingsPanelNodes() {
  return {
    panel: document.querySelector('#home-settings-panel'),
    closeButton: document.querySelector('#home-settings-panel-close'),
    items: Array.from(document.querySelectorAll('.home-settings-panel__item')),
    languageValues: Array.from(document.querySelectorAll('[data-home-settings-language-value]')),
    countryValues: Array.from(document.querySelectorAll('[data-home-settings-country-value]')),
    routeValues: Array.from(document.querySelectorAll('[data-home-settings-route-value]')),
  };
}

function dispatchHomeSettingsPanelEvent(name, detail = {}) {
  document.dispatchEvent(new CustomEvent(name, { detail }));
}

function getLiveSettingsPanelRoot() {
  return document.querySelector('#home-settings-panel');
}

function getHomeSettingsInteractiveRoot(target) {
  if (!(target instanceof Element)) {
    return null;
  }

  return target.closest(
    '#home-settings-panel, ' +
    '#home-platform-shell [data-home-platform-content="settings"], ' +
    '#home-platform-shell .home-settings-panel, ' +
    '#home-platform-shell .home-settings-panel__dialog, ' +
    '#home-platform-shell .home-settings-panel__inner'
  );
}

function setTextContent(nodes, value) {
  nodes.forEach((node) => {
    if (node) {
      node.textContent = value;
    }
  });
}

function setPressedState(nodes, activeValue) {
  nodes.forEach((node) => {
    if (!(node instanceof HTMLElement)) {
      return;
    }

    const optionValue = String(node.getAttribute('data-theme-option') || '').trim().toLowerCase();
    const isActive = optionValue === String(activeValue || '').trim().toLowerCase();
    node.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  });
}

/* =========================================================
   03. THEME HELPERS
   ========================================================= */

function normalizeHomeSettingsTheme(theme) {
  const normalized = String(theme || '').trim().toLowerCase();

  if (normalized === 'color') return 'custom';
  if (normalized === 'system' || normalized === 'custom' || normalized === 'dark' || normalized === 'light') {
    return normalized;
  }

  return 'system';
}

function resolveHomeSettingsThemeDetail(theme) {
  const normalized = normalizeHomeSettingsTheme(theme);
  const themeApi = window.NeuroartanTheme;

  if (themeApi && typeof themeApi.getThemeStateDetail === 'function') {
    return themeApi.getThemeStateDetail({
      theme: normalized,
      effective: document.documentElement?.getAttribute('data-theme-effective') || 'dark',
      contrast: document.documentElement?.getAttribute('data-theme-contrast') || 'standard',
      palette: document.documentElement?.getAttribute('data-theme-palette') || 'neuroartan',
      tokens: {},
    });
  }

  return {
    theme: normalized,
    themeLabel: normalized === 'system' ? 'System' : normalized === 'custom' ? 'Custom' : normalized === 'dark' ? 'Dark' : 'Light',
    themeSummary: '',
    effectiveTheme: document.documentElement?.getAttribute('data-theme-effective') || 'dark',
    contrast: document.documentElement?.getAttribute('data-theme-contrast') || 'standard',
    palette: document.documentElement?.getAttribute('data-theme-palette') || 'neuroartan',
    tokens: {},
    cinematicAllowed: normalized === 'custom',
    monoSolidRequired: normalized === 'dark' || normalized === 'light',
  };
}

/* =========================================================
   04. PANEL STATE HELPERS
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

function resolveLanguageLabel(language) {
  const code = String(language || 'en').trim().toLowerCase() || 'en';

  try {
    return new Intl.DisplayNames([code], { type: 'language' }).of(code) || code.toUpperCase();
  } catch (_) {
    return code.toUpperCase();
  }
}

function renderHomeSettingsPanel(snapshot) {
  HOME_SETTINGS_PANEL_STATE.snapshot = snapshot;

  const nodes = getHomeSettingsPanelNodes();
  const username = snapshot?.account?.profile?.username || '';

  const themeDetail = resolveHomeSettingsThemeDetail(snapshot?.theme || window.NeuroartanTheme?.getCurrentTheme?.() || 'system');

  setTextContent(nodes.languageValues, resolveLanguageLabel(snapshot?.locale?.language));
  setTextContent(nodes.countryValues, snapshot?.locale?.countryLabel || 'United States');
  setTextContent(nodes.routeValues, buildPublicProfileDisplay(username));
  const activeTheme = themeDetail.theme;

  setPressedState(Array.from(document.querySelectorAll('.home-settings-panel__theme-option')), activeTheme);

  if (nodes.panel instanceof HTMLElement) {
    nodes.panel.dataset.activeTheme = activeTheme;
    nodes.panel.dataset.activeThemeLabel = themeDetail.themeLabel;
    nodes.panel.dataset.cinematicAllowed = themeDetail.cinematicAllowed ? 'true' : 'false';
    nodes.panel.dataset.monoSolidRequired = themeDetail.monoSolidRequired ? 'true' : 'false';
  }
}

/* =========================================================
   05. ACTION HELPERS
   ========================================================= */

function normalizeHomeSettingsLabel(label) {
  return typeof label === 'string' ? label.trim().toLowerCase() : '';
}

function handleHomeSettingsThemeAction(themeValue, context = 'source-panel') {
  const normalized = normalizeHomeSettingsTheme(themeValue);
  const themeDetail = resolveHomeSettingsThemeDetail(normalized);

  if (window.NeuroartanTheme && typeof window.NeuroartanTheme.applyTheme === 'function') {
    window.NeuroartanTheme.applyTheme(normalized);
  }

  dispatchHomeSettingsPanelEvent('neuroartan:theme-change-requested', {
    theme: normalized,
    themeLabel: themeDetail.themeLabel,
    source: 'home-settings-panel',
    context,
  });

  dispatchHomeSettingsPanelEvent('neuroartan:home-theme-settings-intent', {
    theme: normalized,
    themeLabel: themeDetail.themeLabel,
    cinematicAllowed: themeDetail.cinematicAllowed,
    monoSolidRequired: themeDetail.monoSolidRequired,
    source: 'home-settings-panel',
    context,
  });
}

function handleHomeSettingsPanelAction(action, context = 'source-panel') {
  const normalized = normalizeHomeSettingsLabel(action);

  if (normalized === 'language' || normalized === 'country') {
    dispatchHomeSettingsPanelEvent('neuroartan:country-overlay-open-requested', {
      source: 'home-settings-panel',
      context,
    });
    return;
  }

  if (normalized === 'privacy') {
    dispatchHomeSettingsPanelEvent('neuroartan:cookie-consent-open-requested', {
      source: 'home-settings-panel',
      surface: 'settings',
      context,
    });
    return;
  }

  if (normalized === 'profile') {
    if (HOME_SETTINGS_PANEL_STATE.snapshot?.account?.signedIn) {
      window.location.href = '/profile.html';
      return;
    }

    dispatchHomeSettingsPanelEvent('account:entry-request', {
      source: 'home-settings-panel',
      context,
    });

    if (context === 'source-panel') {
      closeHomeSettingsPanel();
    }
    return;
  }

  if (normalized === 'public-route') {
    const username = HOME_SETTINGS_PANEL_STATE.snapshot?.account?.profile?.username || '';
    const route = buildPublicProfilePath(username) || '/profile.html';
    window.location.href = route;
    return;
  }

  dispatchHomeSettingsPanelEvent('neuroartan:home-settings-panel-item-selected', {
    label: action?.trim() || '',
    context,
  });
}

/* =========================================================
   06. EVENT BINDING
   ========================================================= */

function bindHomeSettingsPanel() {
  subscribeHomeSurfaceState(renderHomeSettingsPanel);

  document.addEventListener('click', (event) => {
    const sourceRoot = getLiveSettingsPanelRoot();
    const interactiveRoot = getHomeSettingsInteractiveRoot(event.target);

    if (!sourceRoot && !interactiveRoot) {
      return;
    }

    const target = event.target.closest(
      '#home-settings-panel-close, ' +
      '[data-home-settings-close], ' +
      '.home-settings-panel__item, ' +
      '.home-settings-panel__theme-option'
    );

    if (!target) {
      return;
    }

    const context = interactiveRoot && interactiveRoot.id !== 'home-settings-panel'
      ? 'platform-shell'
      : 'source-panel';

    if (target.matches('#home-settings-panel-close')) {
      closeHomeSettingsPanel();
      return;
    }

    if (target.matches('[data-home-settings-close]')) {
      dispatchHomeSettingsPanelEvent('home:platform-shell-close-request', {
        source: 'home-settings-panel',
      });
      return;
    }

    if (target.matches('.home-settings-panel__theme-option')) {
      handleHomeSettingsThemeAction(
        target.getAttribute('data-theme-option') || '',
        context
      );
      return;
    }

    if (target.matches('.home-settings-panel__item')) {
      handleHomeSettingsPanelAction(
        target.getAttribute('data-home-settings-action') ||
        target.textContent ||
        '',
        context
      );
    }
  });

  document.addEventListener('neuroartan:home-settings-panel-open-requested', () => {
    renderHomeSettingsPanel(HOME_SETTINGS_PANEL_STATE.snapshot || {});
    openHomeSettingsPanel();
  });

  document.addEventListener('neuroartan:home-settings-panel-close-requested', () => {
    closeHomeSettingsPanel();
  });

  document.addEventListener('neuroartan:theme-changed', (event) => {
    const currentSnapshot = HOME_SETTINGS_PANEL_STATE.snapshot || {};
    renderHomeSettingsPanel({
      ...currentSnapshot,
      theme: event?.detail?.theme || window.NeuroartanTheme?.getCurrentTheme?.() || 'system',
    });
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && HOME_SETTINGS_PANEL_STATE.isOpen) {
      closeHomeSettingsPanel();
    }
  });
}

/* =========================================================
   07. MODULE BOOT
   ========================================================= */

function bootHomeSettingsPanel() {
  const root = getLiveSettingsPanelRoot();
  if (!root) {
    return;
  }

  HOME_SETTINGS_PANEL_STATE.root = root;

  if (HOME_SETTINGS_PANEL_STATE.isBound) {
    renderHomeSettingsPanel(HOME_SETTINGS_PANEL_STATE.snapshot || {});
    return;
  }

  HOME_SETTINGS_PANEL_STATE.isBound = true;
  bindHomeSettingsPanel();
}

document.addEventListener('fragment:mounted', (event) => {
  if (event?.detail?.name !== 'home-settings-panel') return;
  bootHomeSettingsPanel();
});

document.addEventListener('neuroartan:runtime-ready', () => {
  bootHomeSettingsPanel();
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootHomeSettingsPanel, { once: true });
} else {
  bootHomeSettingsPanel();
}
