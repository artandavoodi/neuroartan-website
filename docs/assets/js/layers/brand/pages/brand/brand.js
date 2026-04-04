/* =============================================================================
   00) FILE INDEX
   01) MODULE IDENTITY
   02) RUNTIME STATE
   03) PAGE ROOT RESOLUTION
   04) PAGE INITIALIZATION
   05) DOMCONTENTLOADED LIFECYCLE
============================================================================= */

/* =============================================================================
   01) MODULE IDENTITY
   - Brand development landing-page runtime.
   - This file controls only the sovereign Brand page experience.
   - Shared foundation remains consumed from the canonical website source layer.
============================================================================= */

/* =============================================================================
   02) RUNTIME STATE
============================================================================= */
const BRAND_PAGE_RUNTIME = (window.__BRAND_PAGE_RUNTIME__ ||= {
  brandIndexBound: false
});

/* =============================================================================
   03) PAGE ROOT RESOLUTION
============================================================================= */
function getBrandIndexPageRoot(root = document) {
  if (root instanceof Element && root.matches('[data-brand-page="brand-index"]')) return root;
  return document.querySelector('[data-brand-page="brand-index"]');
}

/* =============================================================================
   04) PAGE INITIALIZATION
============================================================================= */
function initBrandIndexPage(root = document) {
  const page = getBrandIndexPageRoot(root);
  if (!page) return;
  if (page.dataset.brandPageReady === 'true') return;

  page.dataset.brandPageReady = 'true';

  const cards = page.querySelectorAll('.brand-resource-card');
  cards.forEach((card, index) => {
    if (card.dataset.brandCardIndex) return;
    card.dataset.brandCardIndex = String(index + 1);
  });

  if (window.NeuroMotion && typeof window.NeuroMotion.scan === 'function') {
    window.NeuroMotion.scan(page);
  }
}

/* =============================================================================
   05) DOMCONTENTLOADED LIFECYCLE
============================================================================= */
document.addEventListener('DOMContentLoaded', () => {
  if (BRAND_PAGE_RUNTIME.brandIndexBound) return;
  BRAND_PAGE_RUNTIME.brandIndexBound = true;

  initBrandIndexPage(document);

  document.addEventListener('fragment:mounted', (event) => {
    const root = event?.target instanceof Element ? event.target : document;
    initBrandIndexPage(root);
  });
});
