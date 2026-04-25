/* =============================================================================
   00) FILE INDEX
   01) MODULE IDENTITY
   02) MODULE REGISTRATION
   03) CURSOR PRIMITIVE REGISTRATION
   04) STYLE ASSET OWNERSHIP
   05) SELECTORS & STATE
   06) CURSOR SETTINGS
   07) NODE RECOVERY
   08) VISUAL STATE
   09) POINTER SYNC
   10) RENDER LOOP
   11) POINTER EVENTS
   12) VISIBILITY / LIFECYCLE EVENTS
   13) EVENT BINDING
   14) PUBLIC API
   15) SHARED READINESS HELPERS
   16) INITIALIZATION
   17) END OF FILE
============================================================================= */

/* =============================================================================
   01) MODULE IDENTITY
============================================================================= */
/* /website/docs/assets/js/core/01-foundation/cursor.js */

/* =============================================================================
   02) MODULE REGISTRATION
============================================================================= */
const MODULE_ID = 'core-cursor';
const MODULE_PATH = '/website/docs/assets/js/core/01-foundation/cursor.js';
const FLAG_READY = 'coreCursorReady';
const FLAG_BOUND = 'coreCursorBound';

function getRuntime() {
  return (window.__NEURO_MAIN_RUNTIME__ ||= {});
}

function getRuntimeFlag(key) {
  return !!getRuntime()[key];
}

function setRuntimeFlag(key, value) {
  getRuntime()[key] = value;
}

function emitRuntimeEvent(name, detail = {}) {
  document.dispatchEvent(new CustomEvent(name, { detail }));
}

function assetPath(path) {
  const pathname = window.location.pathname || '';
  let base = '';

  if (pathname.includes('/website/docs/')) base = '/website/docs';
  else if (pathname.endsWith('/website/docs')) base = '/website/docs';
  else if (pathname.includes('/docs/')) base = '/docs';
  else if (pathname.endsWith('/docs')) base = '/docs';

  const normalized = String(path || '').trim();
  if (!normalized) return '';
  return `${base}${normalized.startsWith('/') ? normalized : `/${normalized}`}`;
}

const CUSTOM_CURSOR_CSS_URL = assetPath('/assets/css/core/04-systems/custom-cursor.css');
const STORAGE_KEY = 'neuroartan.cursor.state';
const CURSOR_MODE_NATIVE = 'native';
const CURSOR_MODE_CUSTOM = 'custom';
const DEFAULT_CURSOR_COLOR = '#917c6f';

/* =============================================================================
   03) STYLE ASSET OWNERSHIP
============================================================================= */
function ensureStylesheetOnce(href) {
  const resolvedHref = new URL(href, window.location.origin).href;
  const existing = Array.from(document.querySelectorAll('link[rel="stylesheet"]')).find((link) => {
    const currentHref = link.getAttribute('href') || '';
    try {
      return new URL(currentHref, window.location.origin).href === resolvedHref;
    } catch (_) {
      return currentHref === href;
    }
  });

  if (existing) {
    document.head.appendChild(existing);
    return existing;
  }

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  link.dataset.cursorOwner = MODULE_ID;
  document.head.appendChild(link);
  return link;
}

/* =============================================================================
   04) CURSOR PRIMITIVE REGISTRATION
============================================================================= */
const CURSOR_SELECTOR = '.custom-cursor';
const INTERACTIVE_SELECTOR = [
  'a',
  'button',
  'input',
  'select',
  'textarea',
  'label[for]',
  'summary',
  '[role="button"]',
  '[role="link"]',
  '[tabindex]',
  '[data-cursor-interactive]',
  '[data-profile-action]',
  '[data-home-topbar-route]',
  '.country-option',
  '#country-overlay-close',
  '#country-selector',
  '#language-toggle',
  '#language-dropdown'
].join(',');

/* =============================================================================
   05) SELECTORS & STATE
============================================================================= */
let rafId = null;
const supportsFinePointer = window.matchMedia('(pointer: fine)').matches;

const state = {
  pointerX: window.innerWidth * 0.5,
  pointerY: window.innerHeight * 0.5,
  currentX: window.innerWidth * 0.5,
  currentY: window.innerHeight * 0.5,
  pointerActive: false,
  isInteractive: false,
  isHidden: false,
  initialized: false,
  enabled: supportsFinePointer,
  mode: CURSOR_MODE_CUSTOM,
  color: DEFAULT_CURSOR_COLOR
};

/* =============================================================================
   06) CURSOR SETTINGS
============================================================================= */
function normalizeCursorMode(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === CURSOR_MODE_NATIVE) return CURSOR_MODE_NATIVE;
  if (normalized === CURSOR_MODE_CUSTOM) return CURSOR_MODE_CUSTOM;
  return CURSOR_MODE_CUSTOM;
}

function normalizeCursorColor(value) {
  const normalized = String(value || '').trim();
  if (/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(normalized)) return normalized;
  return DEFAULT_CURSOR_COLOR;
}

function readStoredCursorState() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return {};
    const parsed = JSON.parse(stored);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (_) {
    return {};
  }
}

function writeStoredCursorState() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
      mode: state.mode,
      color: state.color
    }));
  } catch (_) {}
}

function syncCursorRootAttributes() {
  const html = document.documentElement;
  const active = supportsFinePointer && state.mode === CURSOR_MODE_CUSTOM;

  html.dataset.cursorMode = state.mode;
  html.dataset.cursorCustom = active ? 'true' : 'false';
  html.style.setProperty('--cursor-accent-color', state.color);

  state.enabled = active;
}

function applyStoredCursorState() {
  const storedState = readStoredCursorState();
  state.mode = normalizeCursorMode(storedState.mode);
  state.color = normalizeCursorColor(storedState.color);
  syncCursorRootAttributes();
}

/* =============================================================================
   07) NODE RECOVERY
============================================================================= */
function ensureCursorNode() {
  let node = document.querySelector(CURSOR_SELECTOR);

  if (!node) {
    node = document.createElement('div');
    node.className = 'custom-cursor';
    node.setAttribute('aria-hidden', 'true');
    document.body.appendChild(node);
  }

  return node;
}

function resolvePointerTarget(target) {
  if (!(target instanceof Element)) return null;
  return target.closest(INTERACTIVE_SELECTOR);
}

function hasFinitePointerPosition() {
  return Number.isFinite(state.pointerX) && Number.isFinite(state.pointerY);
}

function resolveInteractiveTargetAtPointer() {
  if (!hasFinitePointerPosition() || typeof document.elementsFromPoint !== 'function') {
    return null;
  }

  let targets = [];

  try {
    targets = document.elementsFromPoint(state.pointerX, state.pointerY);
  } catch (_) {
    return null;
  }

  for (const target of targets) {
    if (!(target instanceof Element)) continue;
    if (target.matches?.(CURSOR_SELECTOR)) continue;

    const interactiveTarget = resolvePointerTarget(target);
    if (interactiveTarget) {
      return interactiveTarget;
    }
  }

  return null;
}

function syncInteractiveStateFromPointerPosition() {
  if (!state.enabled || state.isHidden) {
    state.isInteractive = false;
    return;
  }

  state.isInteractive = Boolean(resolveInteractiveTargetAtPointer());
}

/* =============================================================================
   08) VISUAL STATE
============================================================================= */
function applyVisualState() {
  const customCursor = document.querySelector(CURSOR_SELECTOR);
  if (!customCursor) return;

  customCursor.style.setProperty('--cursor-accent-color', state.color);

  if (!state.enabled) {
    customCursor.style.opacity = '0';
    customCursor.style.transform = 'translate3d(-50%, -50%, 0) scale(0.8)';
    customCursor.style.pointerEvents = 'none';
    return;
  }

  if (state.isHidden) {
    customCursor.style.opacity = '0';
    customCursor.style.transform = 'translate3d(-50%, -50%, 0) scale(0.8)';
    return;
  }

  customCursor.style.opacity = '1';
  customCursor.style.transform = state.isInteractive
    ? 'translate3d(-50%, -50%, 0) scale(0.4)'
    : 'translate3d(-50%, -50%, 0) scale(1)';
}

/* =============================================================================
   09) POINTER SYNC
============================================================================= */
function syncToPointer(x, y, immediate = false) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return;

  state.pointerX = x;
  state.pointerY = y;

  if (immediate) {
    state.currentX = x;
    state.currentY = y;
  }
}

/* =============================================================================
   10) RENDER LOOP
============================================================================= */
function stopLoop() {
  if (!rafId) return;
  window.cancelAnimationFrame(rafId);
  rafId = null;
}

function renderCursor() {
  const customCursor = document.querySelector(CURSOR_SELECTOR);
  if (!customCursor) return;

  if (!state.enabled) {
    applyVisualState();
    stopLoop();
    return;
  }

  const follow = state.pointerActive ? 0.18 : 0.12;
  state.currentX += (state.pointerX - state.currentX) * follow;
  state.currentY += (state.pointerY - state.currentY) * follow;

  customCursor.style.left = `${state.currentX}px`;
  customCursor.style.top = `${state.currentY}px`;

  if (!state.isHidden) {
    syncInteractiveStateFromPointerPosition();
  }

  applyVisualState();
  rafId = window.requestAnimationFrame(renderCursor);
}

function startLoop() {
  if (rafId) return;
  rafId = window.requestAnimationFrame(renderCursor);
}

/* =============================================================================
   11) POINTER EVENTS
============================================================================= */
function handlePointerMove(event) {
  syncToPointer(event.clientX, event.clientY);
  state.pointerActive = true;
  state.isHidden = false;
  state.isInteractive = Boolean(resolvePointerTarget(event.target));
  syncInteractiveStateFromPointerPosition();
}

function handlePointerDown(event) {
  syncToPointer(event.clientX, event.clientY, true);
  state.pointerActive = true;
  state.isHidden = false;
  syncInteractiveStateFromPointerPosition();
}

function handlePointerEnter(event) {
  syncToPointer(event.clientX, event.clientY, true);
  state.pointerActive = true;
  state.isHidden = false;
  syncInteractiveStateFromPointerPosition();
}

function handlePointerLeave() {
  state.pointerActive = false;
  state.isInteractive = false;
  state.isHidden = true;
}

/* =============================================================================
   12) VISIBILITY / LIFECYCLE EVENTS
============================================================================= */
function handleVisibilityChange() {
  state.isHidden = document.hidden;
  applyVisualState();
}

function handleScroll() {
  applyVisualState();
}

function handleWindowFocus() {
  state.isHidden = false;
  applyVisualState();
}

function handleWindowBlur() {
  state.isHidden = true;
  applyVisualState();
}

function handlePointerMediaChange(event) {
  state.enabled = event.matches && state.mode === CURSOR_MODE_CUSTOM;

  if (!state.enabled) {
    state.isHidden = true;
    stopLoop();
  } else {
    state.isHidden = false;
    ensureCursorNode();
    startLoop();
  }

  syncCursorRootAttributes();
  applyVisualState();
}

/* =============================================================================
   13) EVENT BINDING
============================================================================= */
function bindEvents() {
  if (getRuntimeFlag(FLAG_BOUND)) return;

  document.addEventListener('pointermove', handlePointerMove, { passive: true });
  document.addEventListener('pointerdown', handlePointerDown, { passive: true });
  document.addEventListener('pointerenter', handlePointerEnter, { passive: true });
  document.addEventListener('visibilitychange', handleVisibilityChange);

  window.addEventListener('scroll', handleScroll, { passive: true });
  window.addEventListener('focus', handleWindowFocus, { passive: true });
  window.addEventListener('blur', handleWindowBlur, { passive: true });

  document.documentElement.addEventListener('mouseleave', handlePointerLeave, { passive: true });
  document.documentElement.addEventListener('mouseenter', handleWindowFocus, { passive: true });

  const pointerMediaQuery = window.matchMedia('(pointer: fine)');
  if (typeof pointerMediaQuery.addEventListener === 'function') {
    pointerMediaQuery.addEventListener('change', handlePointerMediaChange);
  } else if (typeof pointerMediaQuery.addListener === 'function') {
    pointerMediaQuery.addListener(handlePointerMediaChange);
  }

  setRuntimeFlag(FLAG_BOUND, true);
}

/* =============================================================================
   14) PUBLIC API
============================================================================= */
function setCursorState(nextState = {}) {
  state.mode = normalizeCursorMode(nextState.mode ?? state.mode);
  state.color = normalizeCursorColor(nextState.color ?? state.color);

  syncCursorRootAttributes();
  writeStoredCursorState();

  if (state.enabled) {
    ensureCursorNode();
    state.isHidden = false;
    startLoop();
  } else {
    state.isHidden = true;
    stopLoop();
  }

  applyVisualState();

  emitRuntimeEvent('neuroartan:cursor-changed', {
    source: MODULE_ID,
    modulePath: MODULE_PATH,
    mode: state.mode,
    color: state.color,
    enabled: state.enabled
  });
}

function resetCursorToCompanyDefault() {
  setCursorState({
    mode: CURSOR_MODE_CUSTOM,
    color: DEFAULT_CURSOR_COLOR
  });
}

function bindCursorIntentEvents() {
  document.addEventListener('neuroartan:cursor-change-requested', (event) => {
    setCursorState(event?.detail || {});
  });

  document.addEventListener('neuroartan:theme-changed', (event) => {
    if (event?.detail?.theme !== 'company') return;
    resetCursorToCompanyDefault();
  });
}

window.NeuroartanCursor = Object.freeze({
  getState: () => ({
    mode: state.mode,
    color: state.color,
    enabled: state.enabled
  }),
  setState: setCursorState,
  resetToCompanyDefault: resetCursorToCompanyDefault
});

/* =============================================================================
   15) SHARED READINESS HELPERS
============================================================================= */
window.__artanRunWhenReady = window.__artanRunWhenReady || ((bootFn) => {
  if (typeof bootFn !== 'function') return;

  const run = () => {
    try { bootFn(); } catch (_) {}
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run, { once: true });
  } else {
    run();
  }
});

/* =============================================================================
   16) INITIALIZATION
============================================================================= */
function initCursorPrimitive() {
  applyStoredCursorState();
  bindCursorIntentEvents();

  ensureStylesheetOnce(CUSTOM_CURSOR_CSS_URL);

  if (!state.enabled) {
    applyVisualState();
    return;
  }

  const customCursor = ensureCursorNode();
  if (!customCursor) return;

  customCursor.style.display = '';
  customCursor.style.opacity = '1';
  customCursor.style.willChange = 'left, top, transform, opacity';

  bindEvents();
  startLoop();
  applyVisualState();

  if (!getRuntimeFlag(FLAG_READY)) {
    setRuntimeFlag(FLAG_READY, true);
    emitRuntimeEvent('neuroartan:cursor-primitive-ready', {
      source: MODULE_ID,
      modulePath: MODULE_PATH,
      css: CUSTOM_CURSOR_CSS_URL,
      mode: state.mode,
      color: state.color,
      enabled: state.enabled
    });
  }
  state.initialized = true;
}

function bootCursorPrimitive() {
  if (state.initialized) return;
  initCursorPrimitive();
}

window.__artanRunWhenReady(bootCursorPrimitive);

/* =============================================================================
   17) END OF FILE
============================================================================= */
