import {
  buildPublicProfileDisplay,
  buildPublicProfilePath,
} from '../system/account-profile-identity.js';
import { subscribeHomeSurfaceState } from './home-surface-state.js';

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
    items: Array.from(document.querySelectorAll('#home-settings-panel .home-settings-panel__item')),
    languageValue: document.querySelector('[data-home-settings-language-value]'),
    countryValue: document.querySelector('[data-home-settings-country-value]'),
    routeValue: document.querySelector('[data-home-settings-route-value]'),
    themeSummary: document.querySelector('[data-home-settings-theme-summary]'),
  };
}

function dispatchHomeSettingsPanelEvent(name, detail = {}) {
  document.dispatchEvent(new CustomEvent(name, { detail }));
}

function getLiveSettingsPanelRoot() {
  return document.querySelector('#home-settings-panel');
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

function resolveThemeSummary(theme) {
  switch (String(theme || '').toLowerCase()) {
    case 'dark':
      return 'Dark mode removes the cinematic background and preserves the homepage interaction surface in a quiet black state.';
    case 'light':
      return 'Light mode removes the cinematic background and preserves the homepage interaction surface in a quiet white state.';
    default:
      return 'Color mode keeps the cinematic background and the full homepage interaction surface active.';
  }
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

  if (nodes.themeSummary) {
    nodes.themeSummary.textContent = resolveThemeSummary(snapshot?.theme);
  }

  if (nodes.languageValue) {
    nodes.languageValue.textContent = resolveLanguageLabel(snapshot?.locale?.language);
  }

  if (nodes.countryValue) {
    nodes.countryValue.textContent = snapshot?.locale?.countryLabel || 'United States';
  }

  if (nodes.routeValue) {
    nodes.routeValue.textContent = buildPublicProfileDisplay(username);
  }
}

/* =========================================================
   04. ACTION HELPERS
   ========================================================= */

function normalizeHomeSettingsLabel(label) {
  return typeof label === 'string' ? label.trim().toLowerCase() : '';
}

function handleHomeSettingsPanelAction(action) {
  const normalized = normalizeHomeSettingsLabel(action);

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

  if (normalized === 'profile') {
    if (HOME_SETTINGS_PANEL_STATE.snapshot?.account?.signedIn) {
      window.location.href = '/profile.html';
      return;
    }

    dispatchHomeSettingsPanelEvent('account:entry-request', {
      source: 'home-settings-panel',
    });
    closeHomeSettingsPanel();
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
  });
}

/* =========================================================
   05. EVENT BINDING
   ========================================================= */

function bindHomeSettingsPanel() {
  subscribeHomeSurfaceState(renderHomeSettingsPanel);

  document.addEventListener('click', (event) => {
    const root = getLiveSettingsPanelRoot();
    if (!root) return;

    const target = event.target.closest(
      '#home-settings-panel-close, ' +
      '#home-settings-panel .home-settings-panel__item'
    );

    if (!target || !root.contains(target)) {
      return;
    }

    if (target.matches('#home-settings-panel-close')) {
      closeHomeSettingsPanel();
      return;
    }

    if (target.matches('.home-settings-panel__item')) {
      handleHomeSettingsPanelAction(
        target.getAttribute('data-home-settings-action')
        || target.textContent
        || ''
      );
    }
  });

  document.addEventListener('neuroartan:home-settings-panel-open-requested', () => {
    openHomeSettingsPanel();
  });

  document.addEventListener('neuroartan:home-settings-panel-close-requested', () => {
    closeHomeSettingsPanel();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && HOME_SETTINGS_PANEL_STATE.isOpen) {
      closeHomeSettingsPanel();
    }
  });
}

/* =========================================================
   06. MODULE BOOT
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
