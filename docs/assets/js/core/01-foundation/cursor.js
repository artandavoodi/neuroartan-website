/* =============================================================================
   00) FILE INDEX
   01) MODULE IDENTITY
   02) MODULE REGISTRATION
   03) CURSOR PRIMITIVE REGISTRATION
   04) STYLE ASSET OWNERSHIP
   05) SELECTORS & STATE
   06) NODE RECOVERY
   07) VISUAL STATE
   08) POINTER SYNC
   09) RENDER LOOP
   10) POINTER EVENTS
   11) VISIBILITY / LIFECYCLE EVENTS
   12) EVENT BINDING
   13) SHARED READINESS HELPERS
   14) INITIALIZATION
   15) END OF FILE
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

  if (existing) return existing;

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
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
  '[role="button"]',
  'input',
  'select',
  'textarea',
  'label[for]',
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
  enabled: supportsFinePointer
};

/* =============================================================================
   06) NODE RECOVERY
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

function resolveInteractiveTargetAtPointer() {
  if (typeof document.elementsFromPoint !== 'function') {
    return null;
  }

  const targets = document.elementsFromPoint(state.pointerX, state.pointerY);

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
   07) VISUAL STATE
============================================================================= */
function applyVisualState() {
  const customCursor = document.querySelector(CURSOR_SELECTOR);
  if (!customCursor) return;

  if (!state.enabled) {
    customCursor.style.opacity = '0';
    customCursor.style.transform = 'translate3d(-50%, -50%, 0) scale(0.8)';
    return;
  }

  if (state.isHidden) {
    customCursor.style.opacity = '0';
    customCursor.style.transform = 'translate3d(-50%, -50%, 0) scale(0.8)';
    return;
  }

  customCursor.style.opacity = state.isInteractive ? '0.35' : '1';
  customCursor.style.transform = state.isInteractive
    ? 'translate3d(-50%, -50%, 0) scale(0.4)'
    : 'translate3d(-50%, -50%, 0) scale(1)';
}

/* =============================================================================
   08) POINTER SYNC
============================================================================= */
function syncToPointer(x, y, immediate = false) {
  state.pointerX = x;
  state.pointerY = y;

  if (immediate) {
    state.currentX = x;
    state.currentY = y;
  }
}

/* =============================================================================
   09) RENDER LOOP
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
    rafId = window.requestAnimationFrame(renderCursor);
    return;
  }

  const follow = state.pointerActive ? 0.18 : 0.12;
  state.currentX += (state.pointerX - state.currentX) * follow;
  state.currentY += (state.pointerY - state.currentY) * follow;

  customCursor.style.left = `${state.currentX}px`;
  customCursor.style.top = `${state.currentY}px`;

  applyVisualState();
  rafId = window.requestAnimationFrame(renderCursor);
}

function startLoop() {
  if (rafId) return;
  rafId = window.requestAnimationFrame(renderCursor);
}

/* =============================================================================
   10) POINTER EVENTS
============================================================================= */
function handlePointerMove(event) {
  syncToPointer(event.clientX, event.clientY);
  state.pointerActive = true;
  state.isHidden = false;
  state.isInteractive = Boolean(resolvePointerTarget(event.target));
}

function handlePointerDown(event) {
  syncToPointer(event.clientX, event.clientY, true);
  state.pointerActive = true;
  state.isHidden = false;
}

function handlePointerEnter(event) {
  syncToPointer(event.clientX, event.clientY, true);
  state.pointerActive = true;
  state.isHidden = false;
}

function handlePointerLeave() {
  state.pointerActive = false;
  state.isInteractive = false;
  state.isHidden = true;
}

function handlePointerOver(event) {
  state.isInteractive = Boolean(resolvePointerTarget(event.target));
  applyVisualState();
}

function handlePointerOut(event) {
  const nextTarget = event.relatedTarget;
  state.isInteractive = Boolean(resolvePointerTarget(nextTarget));
  applyVisualState();
}

/* =============================================================================
   11) VISIBILITY / LIFECYCLE EVENTS
============================================================================= */
function handleVisibilityChange() {
  state.isHidden = document.hidden;
  applyVisualState();
}

function handleScroll() {
  syncInteractiveStateFromPointerPosition();
  applyVisualState();
}

function handleWindowFocus() {
  state.isHidden = false;
  syncInteractiveStateFromPointerPosition();
  applyVisualState();
}

function handleWindowBlur() {
  state.isHidden = true;
  applyVisualState();
}

function handlePointerMediaChange(event) {
  state.enabled = event.matches;

  if (!state.enabled) {
    state.isHidden = true;
  } else {
    state.isHidden = false;
    ensureCursorNode();
    startLoop();
  }

  applyVisualState();
}

/* =============================================================================
   12) EVENT BINDING
============================================================================= */
function bindEvents() {
  if (getRuntimeFlag(FLAG_BOUND)) return;

  document.addEventListener('pointermove', handlePointerMove, { passive: true });
  document.addEventListener('pointerdown', handlePointerDown, { passive: true });
  document.addEventListener('pointerenter', handlePointerEnter, { passive: true });
  document.addEventListener('pointerover', handlePointerOver, { passive: true });
  document.addEventListener('pointerout', handlePointerOut, { passive: true });
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
   13) SHARED READINESS HELPERS
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
   14) INITIALIZATION
============================================================================= */
function initCursorPrimitive() {
  ensureStylesheetOnce(CUSTOM_CURSOR_CSS_URL);

  if (!state.enabled) return;

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
      css: CUSTOM_CURSOR_CSS_URL
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
   15) END OF FILE
============================================================================= */
