/* =============================================================================
   00) FILE INDEX
   01) MODULE IDENTITY
   02) TOGGLE SELECTORS
   03) TOGGLE STORAGE
   04) TOGGLE HELPERS
   05) HOMEPAGE TOGGLE ATTRIBUTE BRIDGE
   06) TOGGLE STATE SYNC
   07) TOGGLE INTERACTION BINDING
   08) TOGGLE INITIALIZATION
   09) DYNAMIC TOGGLE OBSERVER
   10) PUBLIC API EXPORTS
   11) AUTO-BOOTSTRAP
   12) END OF FILE
============================================================================= */

/* =============================================================================
   01) MODULE IDENTITY
============================================================================= */
/* /website/docs/assets/js/core/01-foundation/toggle.js */

/* =============================================================================
   02) TOGGLE SELECTORS
============================================================================= */
const TOGGLE_ROOT_SELECTOR = [
  '[data-na-toggle]',
  '.na-toggle',
  '.ui-toggle'
].join(',');

const TOGGLE_TRACK_SELECTOR = [
  '[data-na-toggle-track]',
  '.na-toggle__track',
  '.ui-toggle__track'
].join(',');

const TOGGLE_THUMB_SELECTOR = [
  '[data-na-toggle-thumb]',
  '.na-toggle__thumb',
  '.ui-toggle__thumb'
].join(',');

const TOGGLE_STORAGE_KEY = 'neuroartan.toggle.state';

let toggleObserver = null;

const HOMEPAGE_THEME_TOGGLE_ATTRIBUTE_MAP = Object.freeze({
  'breathing-circle': 'homepageThemeBreathingCircle',
  'cinematic-background': 'homepageThemeCinematicBackground',
  'hero-shader': 'homepageThemeHeroShader',
  'matte-atmosphere': 'homepageThemeMatteAtmosphere'
});

/* =============================================================================
   03) TOGGLE STORAGE
============================================================================= */
function getToggleStorageId(toggle) {
  if (!isToggleRoot(toggle)) return '';

  const scope = String(toggle.getAttribute('data-toggle-scope') || '').trim();
  const key = String(toggle.getAttribute('data-toggle-key') || '').trim();

  if (!scope || !key) return '';
  return `${scope}:${key}`;
}

function readStoredToggleState() {
  try {
    const raw = window.localStorage.getItem(TOGGLE_STORAGE_KEY);
    if (!raw) return {};

    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (_) {
    return {};
  }
}

function writeStoredToggleState(storageId, checked) {
  if (!storageId) return;

  try {
    const state = readStoredToggleState();
    state[storageId] = Boolean(checked);
    window.localStorage.setItem(TOGGLE_STORAGE_KEY, JSON.stringify(state));
  } catch (_) {}
}

function getStoredToggleValue(toggle) {
  const storageId = getToggleStorageId(toggle);
  if (!storageId) return null;

  const state = readStoredToggleState();
  if (!(storageId in state)) return null;

  return Boolean(state[storageId]);
}

/* =============================================================================
   04) TOGGLE HELPERS
============================================================================= */
function getNormalizedToggles(root = document) {
  if (!root?.querySelectorAll) return [];
  return Array.from(root.querySelectorAll(TOGGLE_ROOT_SELECTOR));
}

function isToggleRoot(node) {
  return node instanceof HTMLElement && node.matches(TOGGLE_ROOT_SELECTOR);
}

function getToggleTrack(toggle) {
  if (!isToggleRoot(toggle)) return null;
  return toggle.querySelector(TOGGLE_TRACK_SELECTOR);
}

function getToggleThumb(toggle) {
  if (!isToggleRoot(toggle)) return null;
  return toggle.querySelector(TOGGLE_THUMB_SELECTOR);
}

function readToggleChecked(toggle) {
  if (!isToggleRoot(toggle)) return false;

  const ariaChecked = toggle.getAttribute('aria-checked');
  if (ariaChecked === 'true') return true;
  if (ariaChecked === 'false') return false;

  const dataEnabled = toggle.getAttribute('data-cookie-consent-enabled');
  if (dataEnabled === 'true') return true;
  if (dataEnabled === 'false') return false;

  const dataChecked = toggle.getAttribute('data-toggle-checked');
  if (dataChecked === 'true') return true;
  if (dataChecked === 'false') return false;

  return false;
}

function isToggleDisabled(toggle) {
  if (!isToggleRoot(toggle)) return true;
  return toggle.hasAttribute('disabled') || toggle.getAttribute('aria-disabled') === 'true';
}

function normalizeToggle(toggle) {
  if (!isToggleRoot(toggle)) return;

  if (!toggle.hasAttribute('role')) {
    toggle.setAttribute('role', 'switch');
  }

  if (!toggle.hasAttribute('type') && toggle.tagName.toLowerCase() === 'button') {
    toggle.setAttribute('type', 'button');
  }

  if (!toggle.dataset.toggleInitialized) {
    toggle.dataset.toggleInitialized = 'true';
  }

  const storedValue = getStoredToggleValue(toggle);
  syncToggleState(toggle, storedValue === null ? readToggleChecked(toggle) : storedValue, {
    emit: true,
    persist: false,
    source: storedValue === null ? 'init' : 'storage-restore'
  });
}

/* =============================================================================
   05) HOMEPAGE TOGGLE ATTRIBUTE BRIDGE
============================================================================= */
function syncHomepageThemeToggleAttribute(toggle, checked) {
  if (!isToggleRoot(toggle)) return;
  if (toggle.getAttribute('data-toggle-scope') !== 'homepage-theme') return;

  const key = toggle.getAttribute('data-toggle-key') || '';
  const attributeName = HOMEPAGE_THEME_TOGGLE_ATTRIBUTE_MAP[key];
  if (!attributeName) return;

  const attributeValue = checked ? 'true' : 'false';
  const kebabAttribute = `data-${attributeName.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`)}`;

  document.documentElement.dataset[attributeName] = attributeValue;
  document.body?.setAttribute(kebabAttribute, attributeValue);
}

function syncHomepageThemeToggleAttributesFromStorage() {
  const storedState = readStoredToggleState();

  Object.entries(HOMEPAGE_THEME_TOGGLE_ATTRIBUTE_MAP).forEach(([key, attributeName]) => {
    const storageId = `homepage-theme:${key}`;
    if (!(storageId in storedState)) return;

    const checked = Boolean(storedState[storageId]);
    const attributeValue = checked ? 'true' : 'false';
    const kebabAttribute = `data-${attributeName.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`)}`;

    document.documentElement.dataset[attributeName] = attributeValue;
    document.body?.setAttribute(kebabAttribute, attributeValue);
  });
}

/* =============================================================================
   06) TOGGLE STATE SYNC
============================================================================= */
function syncToggleState(toggle, checked, options = {}) {
  if (!isToggleRoot(toggle)) return;

  const nextChecked = Boolean(checked);
  const emit = options.emit !== false;
  const persist = options.persist !== false;
  const storageId = getToggleStorageId(toggle);
  const detail = {
    checked: nextChecked,
    key: toggle.getAttribute('data-toggle-key') || '',
    scope: toggle.getAttribute('data-toggle-scope') || '',
    storageId,
    source: options.source || 'core-toggle',
    element: toggle
  };

  toggle.setAttribute('aria-checked', nextChecked ? 'true' : 'false');
  toggle.setAttribute('data-toggle-checked', nextChecked ? 'true' : 'false');
  toggle.dataset.toggleState = nextChecked ? 'on' : 'off';
  toggle.setAttribute('data-cookie-consent-enabled', nextChecked ? 'true' : 'false');

  const track = getToggleTrack(toggle);
  const thumb = getToggleThumb(toggle);

  if (track instanceof HTMLElement) {
    track.setAttribute('data-toggle-state', nextChecked ? 'on' : 'off');
  }

  if (thumb instanceof HTMLElement) {
    thumb.setAttribute('data-toggle-state', nextChecked ? 'on' : 'off');
  }

  if (persist) {
    writeStoredToggleState(storageId, nextChecked);
  }

  syncHomepageThemeToggleAttribute(toggle, nextChecked);

  if (emit) {
    toggle.dispatchEvent(new CustomEvent('neuroartan:toggle-changed', {
      bubbles: true,
      detail
    }));

    document.dispatchEvent(new CustomEvent('neuroartan:toggle-changed', {
      detail
    }));
  }
}

function toggleToggleState(toggle, options = {}) {
  if (!isToggleRoot(toggle)) return;
  if (isToggleDisabled(toggle)) return;
  syncToggleState(toggle, !readToggleChecked(toggle), options);
}

/* =============================================================================
   07) TOGGLE INTERACTION BINDING
============================================================================= */
function bindToggleInteraction(root = document) {
  if (!root?.addEventListener) return;
  if (root.__neuroToggleBound === true) return;

  root.addEventListener('click', (event) => {
    const toggle = event.target instanceof Element
      ? event.target.closest(TOGGLE_ROOT_SELECTOR)
      : null;

    if (!isToggleRoot(toggle)) return;
    event.preventDefault();
    toggleToggleState(toggle, { source: 'click' });
  });

  root.addEventListener('keydown', (event) => {
    const toggle = event.target instanceof Element
      ? event.target.closest(TOGGLE_ROOT_SELECTOR)
      : null;

    if (!isToggleRoot(toggle)) return;

    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      toggleToggleState(toggle, { source: 'keydown' });
    }
  });

  root.__neuroToggleBound = true;
}

/* =============================================================================
   08) TOGGLE INITIALIZATION
============================================================================= */
function initTogglePrimitive(root = document) {
  syncHomepageThemeToggleAttributesFromStorage();
  getNormalizedToggles(root).forEach(normalizeToggle);
  bindToggleInteraction(document);
  bindDynamicToggleObserver();
}

/* =============================================================================
   09) DYNAMIC TOGGLE OBSERVER
============================================================================= */
function normalizeNodeToggles(node) {
  if (!(node instanceof Element)) return;

  if (isToggleRoot(node)) {
    normalizeToggle(node);
  }

  node.querySelectorAll?.(TOGGLE_ROOT_SELECTOR)?.forEach(normalizeToggle);
}

function bindDynamicToggleObserver() {
  if (toggleObserver instanceof MutationObserver) return;

  toggleObserver = new MutationObserver((records) => {
    records.forEach((record) => {
      record.addedNodes.forEach(normalizeNodeToggles);
    });
  });

  toggleObserver.observe(document.documentElement, {
    childList: true,
    subtree: true
  });
}

/* =============================================================================
   10) PUBLIC API EXPORTS
============================================================================= */
window.NeuroartanToggle = Object.freeze({
  TOGGLE_ROOT_SELECTOR,
  TOGGLE_TRACK_SELECTOR,
  TOGGLE_THUMB_SELECTOR,
  TOGGLE_STORAGE_KEY,
  getToggleStorageId,
  readStoredToggleState,
  writeStoredToggleState,
  getStoredToggleValue,
  syncHomepageThemeToggleAttribute,
  syncHomepageThemeToggleAttributesFromStorage,
  getNormalizedToggles,
  isToggleRoot,
  getToggleTrack,
  getToggleThumb,
  readToggleChecked,
  isToggleDisabled,
  normalizeToggle,
  syncToggleState,
  toggleToggleState,
  bindToggleInteraction,
  initTogglePrimitive,
  normalizeNodeToggles,
  bindDynamicToggleObserver
});

/* =============================================================================
   11) AUTO-BOOTSTRAP
============================================================================= */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => initTogglePrimitive(document), { once: true });
} else {
  initTogglePrimitive(document);
}

/* =============================================================================
   12) END OF FILE
============================================================================= */