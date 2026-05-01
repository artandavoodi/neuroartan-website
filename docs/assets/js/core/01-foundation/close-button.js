/* =============================================================================
   00) FILE INDEX
   01) MODULE IDENTITY
   02) MODULE REGISTRATION
   03) CLOSE BUTTON SELECTORS
   04) CLOSE BUTTON NORMALIZATION
   05) PUBLIC API EXPORTS
   06) END OF FILE
============================================================================= */

/* =============================================================================
   01) MODULE IDENTITY
============================================================================= */
/* /website/docs/assets/js/core/01-foundation/close-button.js */

/* =============================================================================
   02) MODULE REGISTRATION
============================================================================= */
const MODULE_ID = 'core-close-button';
const MODULE_PATH = '/website/docs/assets/js/core/01-foundation/close-button.js';

/* =============================================================================
   03) CLOSE BUTTON SELECTORS
============================================================================= */
const CLOSE_BUTTON_SELECTORS = [
  '.global-close-button',
  '.account-drawer-close',
  '.account-sign-in-drawer-close',
  '.account-sign-up-drawer-close',
  '.account-email-auth-drawer-close',
  '.account-phone-auth-drawer-close',
  '.country-overlay-close',
  '.cookie-consent-close',
  '.home-navigation-drawer__close',
  '.home-workspace-panel__close',
  '.home-profile-control-panel__close',
  '.home-settings-panel__close',
  '.home-search-shell__close',
  '.home-platform-shell__close',
  '.home-interaction-settings-panel__close',
  '[data-core-close-button="true"]',
  '[data-cookie-consent-close="true"]',
  '[data-account-drawer-close="true"]',
  '[data-home-navigation-drawer-close]',
  '[data-home-workspace-panel-close]',
  '[data-home-profile-control-panel-close]',
  '[data-home-settings-close]',
  '[data-home-search-close="true"]',
  '[data-home-platform-shell-close]',
  '[data-home-interaction-settings-close="true"]',
  '[data-country-overlay-close="true"]'
].join(',');

/* =============================================================================
   04) CLOSE BUTTON NORMALIZATION
============================================================================= */
function getCloseButtons(root = document) {
  if (!root?.querySelectorAll) return [];
  return Array.from(root.querySelectorAll(CLOSE_BUTTON_SELECTORS));
}

/* Create a close button line element with appropriate modifier class */
function createCloseButtonLine(modifierClass) {
  const line = document.createElement('span');
  line.className = `global-close-button__line ${modifierClass}`;
  line.setAttribute('aria-hidden', 'true');
  return line;
}

function isCloseButtonPrimitive(node) {
  if (!(node instanceof Element)) return false;
  if (node.matches('.global-back-button, [data-core-back-button="true"]')) return false;
  return node.matches(CLOSE_BUTTON_SELECTORS);
}

function normalizeCloseButtonPrimitive(node) {
  if (!(node instanceof HTMLElement)) return;
  if (!isCloseButtonPrimitive(node)) return;

  if (node.dataset.closeButtonPrimitiveBound === 'true') return;

  if (node.tagName === 'BUTTON' && !node.getAttribute('type')) {
    node.setAttribute('type', 'button');
  }

  if (!node.hasAttribute('data-core-close-button')) {
    node.setAttribute('data-core-close-button', 'true');
  }

  node.classList.add('global-close-button');

  const hasGlobalLineSystem = node.querySelector('.global-close-button__line');

  if (!hasGlobalLineSystem) {
    node.replaceChildren(
      createCloseButtonLine('global-close-button__line--first'),
      createCloseButtonLine('global-close-button__line--second')
    );
  }

  node.dataset.closeButtonPrimitiveBound = 'true';
}

function initCloseButtonPrimitive(root = document) {
  const targets = root instanceof Element && isCloseButtonPrimitive(root)
    ? [root]
    : getCloseButtons(root);

  targets.forEach(normalizeCloseButtonPrimitive);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => initCloseButtonPrimitive(document), { once: true });
} else {
  initCloseButtonPrimitive(document);
}

window.addEventListener('fragment:mounted', (event) => {
  const root = event instanceof CustomEvent && event.detail?.root instanceof Element
    ? event.detail.root
    : document;

  initCloseButtonPrimitive(root);
});
/* =============================================================================
   05) PUBLIC API EXPORTS
============================================================================= */
window.NeuroartanCloseButtons = Object.freeze({
  MODULE_ID,
  MODULE_PATH,
  CLOSE_BUTTON_SELECTORS,
  getCloseButtons,
  isCloseButtonPrimitive,
  createCloseButtonLine,
  normalizeCloseButtonPrimitive,
  initCloseButtonPrimitive
});

/* =============================================================================
   06) END OF FILE
============================================================================= */