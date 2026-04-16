/* =============================================================================
   00) FILE INDEX
   01) MODULE IDENTITY
   02) MODULE REGISTRATION
   03) HOVER PRIMITIVE REGISTRATION
   04) TEXT HOVER INITIALIZATION
   05) SHARED READINESS HELPERS
   06) INITIALIZATION
   07) END OF FILE
============================================================================= */

/* =============================================================================
   01) MODULE IDENTITY
============================================================================= */
/* /website/docs/assets/js/core/01-foundation/hover.js */

/* =============================================================================
   02) MODULE REGISTRATION
============================================================================= */
const MODULE_ID = 'core-hover';
const MODULE_PATH = '/website/docs/assets/js/core/01-foundation/hover.js';
const FLAG_HOVER_READY = 'coreHoverReady';

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

/* =============================================================================
   03) HOVER PRIMITIVE REGISTRATION
============================================================================= */
const HOVER_SELECTORS = [
  'a',
  'button',
  "[role='button']",
  '.country-option',
  '#country-selector',
  '#language-toggle',
  '#language-dropdown button',
  '.language-dropdown button',
  '.language-dropdown a',
  '.language-option',
  '.lang-option',
  '[data-i18n][tabindex]',
  '.menu-list a',
  '.menu-list button'
].join(',');

function shouldSkipHover(el) {
  if (!el) return true;
  if (el.dataset.letterified) return true;
  if (el.children && el.children.length > 0) return true;
  if (el.dataset.noLetterHover === 'true') return true;

  return Boolean(
    el.closest(
      '#institutional-menu, .institutional-menu, .institutional-menu-panels, .institutional-menu-nav, .institutional-menu-utility'
    )
  );
}

/* =============================================================================
   04) TEXT HOVER INITIALIZATION
============================================================================= */
export function initHoverPrimitive(root = document) {
  if (!root?.querySelectorAll) return;

  const elements = root.querySelectorAll(HOVER_SELECTORS);

  elements.forEach((el) => {
    if (shouldSkipHover(el)) return;

    const raw = el.textContent || '';
    const text = raw.trim();
    if (!text) return;

    el.dataset.letterified = 'true';
    el.style.transition = 'color 220ms ease, opacity 220ms ease';
    el.style.transformOrigin = 'center center';

    el.addEventListener(
      'mouseenter',
      () => {
        el.style.opacity = '1';
      },
      { passive: true }
    );

    el.addEventListener(
      'mouseleave',
      () => {
        el.style.opacity = '1';
      },
      { passive: true }
    );
  });

  if (!getRuntimeFlag(FLAG_HOVER_READY)) {
    setRuntimeFlag(FLAG_HOVER_READY, true);
    emitRuntimeEvent('neuroartan:hover-primitive-ready', {
      source: MODULE_ID,
      modulePath: MODULE_PATH
    });
  }
}

/* =============================================================================
   05) SHARED READINESS HELPERS
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
   06) INITIALIZATION
============================================================================= */
window.__artanRunWhenReady(() => {
  initHoverPrimitive(document);
});

/* =============================================================================
   07) END OF FILE
============================================================================= */
