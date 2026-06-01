/* =============================================================================
   00) FILE INDEX
   01) MODULE IDENTITY
   02) ICON TARGETS
   03) ICON NORMALIZATION
   04) GLOBAL INTERACTION LOCK
   05) INITIALIZATION
   06) END OF FILE
============================================================================= */

/* =============================================================================
   01) MODULE IDENTITY
============================================================================= */
/* /website/docs/assets/js/core/01-foundation/icon-interaction.js */

/* =============================================================================
   02) ICON TARGETS
============================================================================= */
const ICON_IMAGE_SELECTOR = [
  'img[src^="/registry/icons/"]',
  'img[src*="/registry/icons/"]',
  'img.ui-icon-theme-aware',
  'img.ui-icon-theme-aware-muted',
  'img.ui-icon-theme-aware-accent',
  '.ui-icon-theme-aware img',
  '.ui-icon-theme-aware-muted img',
  '.ui-icon-theme-aware-accent img',
  '.ui-icon-button img',
  '[data-ui-icon] img',
].join(',');

const ICON_INTERACTION_SELECTOR = [
  ICON_IMAGE_SELECTOR,
  'svg.ui-icon-theme-aware',
  'svg.ui-icon-theme-aware-muted',
  'svg.ui-icon-theme-aware-accent',
  '[data-ui-icon] svg',
].join(',');

/* =============================================================================
   03) ICON NORMALIZATION
============================================================================= */
function normalizeIconImage(image) {
  if (!(image instanceof HTMLImageElement)) return;
  image.draggable = false;
  image.setAttribute('draggable', 'false');
}

export function scanIconInteractionTargets(root = document) {
  if (!root) return;

  if (root instanceof HTMLImageElement && root.matches(ICON_IMAGE_SELECTOR)) {
    normalizeIconImage(root);
  }

  root.querySelectorAll?.(ICON_IMAGE_SELECTOR).forEach(normalizeIconImage);
}

function isIconInteractionTarget(target) {
  return target instanceof Element && target.closest(ICON_INTERACTION_SELECTOR);
}

/* =============================================================================
   04) GLOBAL INTERACTION LOCK
============================================================================= */
function bindIconInteractionLock() {
  if (document.documentElement.dataset.iconInteractionLockBound === 'true') return;
  document.documentElement.dataset.iconInteractionLockBound = 'true';

  document.addEventListener('dragstart', (event) => {
    if (isIconInteractionTarget(event.target)) event.preventDefault();
  }, true);

  document.addEventListener('contextmenu', (event) => {
    if (isIconInteractionTarget(event.target)) event.preventDefault();
  }, true);

  new MutationObserver((records) => {
    records.forEach((record) => {
      record.addedNodes.forEach((node) => scanIconInteractionTargets(node));
    });
  }).observe(document.documentElement, {
    childList:true,
    subtree:true,
  });
}

/* =============================================================================
   05) INITIALIZATION
============================================================================= */
function initIconInteractionLock() {
  scanIconInteractionTargets();
  bindIconInteractionLock();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initIconInteractionLock, { once:true });
} else {
  initIconInteractionLock();
}

window.addEventListener('fragment:mounted', (event) => {
  scanIconInteractionTargets(event.detail?.root || document);
});

/* =============================================================================
   06) END OF FILE
============================================================================= */
