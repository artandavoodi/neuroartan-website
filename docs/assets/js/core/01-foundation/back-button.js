/* =============================================================================
   00) FILE INDEX
   01) MODULE IDENTITY
   02) SELECTORS
   03) BACK BUTTON NORMALIZATION
   04) MODULE BOOT
   05) PUBLIC API EXPORTS
============================================================================= */

/* =============================================================================
   01) MODULE IDENTITY
============================================================================= */
const MODULE_ID = 'global-back-button';
const MODULE_PATH = '/assets/js/core/01-foundation/back-button.js';

/* =============================================================================
   02) SELECTORS
============================================================================= */
const BACK_BUTTON_SELECTORS = [
  '.global-back-button',
  '[data-core-back-button="true"]'
].join(',');

/* =============================================================================
   03) BACK BUTTON NORMALIZATION
============================================================================= */
function getBackButtons(root = document) {
  if (!root?.querySelectorAll) return [];
  return Array.from(root.querySelectorAll(BACK_BUTTON_SELECTORS));
}

function isBackButtonPrimitive(node) {
  return node instanceof Element && node.matches(BACK_BUTTON_SELECTORS);
}

function normalizeBackButtonPrimitive(node) {
  if (!(node instanceof HTMLElement)) return;
  if (!isBackButtonPrimitive(node)) return;
  if (node.dataset.backButtonPrimitiveBound === 'true') return;

  if (node.tagName === 'BUTTON' && !node.getAttribute('type')) {
    node.setAttribute('type', 'button');
  }

  if (!node.hasAttribute('data-core-back-button')) {
    node.setAttribute('data-core-back-button', 'true');
  }

  node.classList.add('global-back-button');
  node.dataset.backButtonPrimitiveBound = 'true';
}

function initBackButtonPrimitive(root = document) {
  const targets = root instanceof Element && isBackButtonPrimitive(root)
    ? [root]
    : getBackButtons(root);

  targets.forEach(normalizeBackButtonPrimitive);
}

/* =============================================================================
   04) MODULE BOOT
============================================================================= */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => initBackButtonPrimitive(document), { once: true });
} else {
  initBackButtonPrimitive(document);
}

window.addEventListener('fragment:mounted', (event) => {
  const root = event instanceof CustomEvent && event.detail?.root instanceof Element
    ? event.detail.root
    : document;

  initBackButtonPrimitive(root);
});

/* =============================================================================
   05) PUBLIC API EXPORTS
============================================================================= */
window.NeuroartanBackButtons = Object.freeze({
  MODULE_ID,
  MODULE_PATH,
  BACK_BUTTON_SELECTORS,
  getBackButtons,
  isBackButtonPrimitive,
  initBackButtonPrimitive
});
