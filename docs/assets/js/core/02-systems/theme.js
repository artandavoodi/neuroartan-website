/* =============================================================================
   00) FILE INDEX
   01) MODULE IDENTITY
   02) MODULE REGISTRATION
   03) STORAGE KEYS / CONSTANTS
   04) THEME HELPERS
   05) DOM BINDING HELPERS
   06) EVENT REBINDING
   07) INITIALIZATION
   08) PUBLIC API EXPORTS
   09) END OF FILE
============================================================================= */

/* =============================================================================
   01) MODULE IDENTITY
============================================================================= */
/* /website/docs/assets/js/core/02-systems/theme.js */

/* =============================================================================
   02) MODULE REGISTRATION
============================================================================= */
const SYSTEM_ID = 'core-theme';
const MODULE_PATH = '/website/docs/assets/js/core/02-systems/theme.js';
const FLAG_READY = 'coreThemeReady';
const FLAG_EVENTS_BOUND = 'coreThemeEventsBound';

function getRuntime() {
  return (window.__NEURO_MAIN_RUNTIME__ ||= {});
}

function getRuntimeFlag(key) {
  return !!getRuntime()[key];
}

function setRuntimeFlag(key, value) {
  getRuntime()[key] = value;
}

function getSystemState(key, fallback = null) {
  const runtime = getRuntime();
  const systemState = (runtime.systemState ||= {});
  return key in systemState ? systemState[key] : fallback;
}

function setSystemState(key, value) {
  const runtime = getRuntime();
  const systemState = (runtime.systemState ||= {});
  systemState[key] = value;
  return value;
}

function emitRuntimeEvent(name, detail = {}) {
  document.dispatchEvent(new CustomEvent(name, { detail }));
}

function setAriaPressed(node, pressed) {
  if (!(node instanceof HTMLElement)) return;
  node.setAttribute('aria-pressed', pressed ? 'true' : 'false');
}

/* =============================================================================
   03) STORAGE KEYS / CONSTANTS
============================================================================= */
const STORAGE_KEY = 'neuroartan-theme';
const THEME_COLOR = 'color';
const THEME_DARK = 'dark';
const THEME_LIGHT = 'light';
const CLASS_COLOR = 'color-mode';
const CLASS_DARK = 'dark-mode';
const CLASS_LIGHT = 'light-mode';
const CLASS_THEME_COLOR = 'theme-color';
const CLASS_THEME_DARK = 'theme-dark';
const CLASS_THEME_LIGHT = 'theme-light';
const TOGGLE_SELECTORS = ['#theme-toggle', '.theme-toggle', '[data-theme-option]'].join(',');

/* =============================================================================
   04) THEME HELPERS
============================================================================= */
function getStoredTheme() {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value === THEME_COLOR || value === THEME_LIGHT || value === THEME_DARK ? value : null;
  } catch (_) {
    return null;
  }
}

function setStoredTheme(value) {
  try {
    window.localStorage.setItem(STORAGE_KEY, value);
  } catch (_) {}
}

function getPreferredTheme() {
  const stored = getStoredTheme();
  if (stored) return stored;
  return THEME_COLOR;
}

export function getThemeToggles(root = document) {
  if (!root?.querySelectorAll) return [];
  return Array.from(root.querySelectorAll(TOGGLE_SELECTORS));
}

export function getCurrentTheme() {
  return getSystemState('theme', getPreferredTheme());
}

export function applyTheme(theme) {
  const normalized = theme === THEME_LIGHT
    ? THEME_LIGHT
    : theme === THEME_DARK
      ? THEME_DARK
      : THEME_COLOR;
  const html = document.documentElement;
  const body = document.body;

  html.setAttribute('data-theme', normalized);
  html.classList.toggle(CLASS_COLOR, normalized === THEME_COLOR);
  html.classList.toggle(CLASS_DARK, normalized === THEME_DARK);
  html.classList.toggle(CLASS_LIGHT, normalized === THEME_LIGHT);
  html.classList.toggle(CLASS_THEME_COLOR, normalized === THEME_COLOR);
  html.classList.toggle(CLASS_THEME_DARK, normalized === THEME_DARK);
  html.classList.toggle(CLASS_THEME_LIGHT, normalized === THEME_LIGHT);

  if (body) {
    body.setAttribute('data-theme', normalized);
    body.classList.toggle(CLASS_COLOR, normalized === THEME_COLOR);
    body.classList.toggle(CLASS_DARK, normalized === THEME_DARK);
    body.classList.toggle(CLASS_LIGHT, normalized === THEME_LIGHT);
    body.classList.toggle(CLASS_THEME_COLOR, normalized === THEME_COLOR);
    body.classList.toggle(CLASS_THEME_DARK, normalized === THEME_DARK);
    body.classList.toggle(CLASS_THEME_LIGHT, normalized === THEME_LIGHT);
  }
  
  if (body?.style) {
    body.style.colorScheme = normalized === THEME_LIGHT ? THEME_LIGHT : THEME_DARK;
  }

  if (html?.style) {
    html.style.colorScheme = normalized === THEME_LIGHT ? THEME_LIGHT : THEME_DARK;
  }

  setSystemState('theme', normalized);
  setStoredTheme(normalized);

  emitRuntimeEvent('neuroartan:theme-changed', {
    source: SYSTEM_ID,
    modulePath: MODULE_PATH,
    theme: normalized
  });

  return normalized;
}

export function toggleTheme() {
  const current = getCurrentTheme();
  const next = current === THEME_COLOR
    ? THEME_DARK
    : current === THEME_DARK
      ? THEME_LIGHT
      : THEME_COLOR;
  return applyTheme(next);
}

/* =============================================================================
   05) DOM BINDING HELPERS
============================================================================= */
function syncToggleNode(node) {
  if (!(node instanceof HTMLElement)) return;
  const currentTheme = getCurrentTheme();
  const explicitTheme = node.getAttribute('data-theme-option');

  if (explicitTheme) {
    const normalizedExplicitTheme = String(explicitTheme || '').trim().toLowerCase();
    const isActive = normalizedExplicitTheme === currentTheme;
    setAriaPressed(node, isActive);
    node.setAttribute('aria-label', `Switch to ${normalizedExplicitTheme} mode`);
    return;
  }

  const isLight = currentTheme === THEME_LIGHT;
  setAriaPressed(node, isLight);
  node.setAttribute('aria-label', 'Cycle theme');
  node.dataset.themePrimitiveBound = 'true';
}

function bindToggleNode(node) {
  if (!(node instanceof HTMLElement)) return;
  if (node.dataset.themeToggleBound === 'true') {
    syncToggleNode(node);
    return;
  }

  if (node.tagName === 'BUTTON' && !node.getAttribute('type')) {
    node.setAttribute('type', 'button');
  }

  node.addEventListener('click', () => {
    const explicitTheme = node.getAttribute('data-theme-option');

    if (explicitTheme) {
      applyTheme(explicitTheme);
    } else {
      toggleTheme();
    }

    getThemeToggles(document).forEach(syncToggleNode);
  });

  node.dataset.themeToggleBound = 'true';
  syncToggleNode(node);
}

export function initThemeSystem(root = document) {
  const preferred = getCurrentTheme() || getPreferredTheme();
  applyTheme(preferred);
  getThemeToggles(root).forEach(bindToggleNode);
  getThemeToggles(document).forEach(syncToggleNode);

  if (!getRuntimeFlag(FLAG_READY)) {
    setRuntimeFlag(FLAG_READY, true);
    emitRuntimeEvent('neuroartan:theme-ready', {
      source: SYSTEM_ID,
      modulePath: MODULE_PATH,
      theme: getCurrentTheme()
    });
  }
}

/* =============================================================================
   06) EVENT REBINDING
============================================================================= */
function bindThemeEvents() {
  if (getRuntimeFlag(FLAG_EVENTS_BOUND)) return;
  setRuntimeFlag(FLAG_EVENTS_BOUND, true);

  document.addEventListener('fragment:mounted', (event) => {
    const detailRoot = event?.detail?.root;
    const root = detailRoot instanceof Element ? detailRoot : document;
    initThemeSystem(root);
  });

  document.addEventListener('neuroartan:menu-mounted', () => {
    initThemeSystem(document);
  });

  document.addEventListener('neuroartan:footer-mounted', () => {
    initThemeSystem(document);
  });
}

/* =============================================================================
   07) INITIALIZATION
============================================================================= */
function bootThemeSystem() {
  bindThemeEvents();
  initThemeSystem(document);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    bootThemeSystem();
  }, { once: true });
} else {
  bootThemeSystem();
}

function bindThemePreferenceListener() {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');
  const handleChange = () => {
    if (getStoredTheme()) return;
    applyTheme(getPreferredTheme());
    getThemeToggles(document).forEach(syncToggleNode);
  };

  if (typeof mediaQuery.addEventListener === 'function') {
    mediaQuery.addEventListener('change', handleChange);
    return;
  }

  if (typeof mediaQuery.addListener === 'function') {
    mediaQuery.addListener(handleChange);
  }
}

bindThemePreferenceListener();

/* =============================================================================
   08) PUBLIC API EXPORTS
============================================================================= */
window.NeuroartanTheme = Object.freeze({
  getCurrentTheme,
  applyTheme,
  toggleTheme,
  initThemeSystem
});

/* =============================================================================
   09) END OF FILE
============================================================================= */
