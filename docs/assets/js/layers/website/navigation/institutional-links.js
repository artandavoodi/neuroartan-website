/* =============================================================================
   00) FILE INDEX
   01) MODULE IDENTITY
   02) SELECTORS / STATE
   03) TYPE HELPERS
   04) MOTION RESCAN BRIDGE
   05) INSTITUTIONAL LINKS INITIALIZER
   06) IMMEDIATE INITIALIZATION
   07) MUTATION OBSERVER FALLBACK
============================================================================= */

/* =============================================================================
   01) MODULE IDENTITY
============================================================================= */

(() => {
  /* =============================================================================
     02) SELECTORS / STATE
  ============================================================================= */
  const ROOT_SELECTOR = '.institutional-links';
  let initialized = false;

  /* =============================================================================
     03) TYPE HELPERS
  ============================================================================= */
  const isElement = (value) => value instanceof Element;

  /* =============================================================================
     04) MOTION RESCAN BRIDGE
  ============================================================================= */
  const rescanInstitutionalLinksMotion = (root) => {
    if (!isElement(root)) return;

    if (window.NeuroMotion && typeof window.NeuroMotion.scan === 'function') {
      window.NeuroMotion.scan(root);
      return;
    }

    document.dispatchEvent(new CustomEvent('fragment:mounted', {
      detail: { root },
      bubbles: true
    }));
  };

  /* =============================================================================
     05) INSTITUTIONAL LINKS INITIALIZER
  ============================================================================= */
  const initInstitutionalLinks = () => {
    const root = document.querySelector(ROOT_SELECTOR);
    if (!root) return false;

    rescanInstitutionalLinksMotion(root);
    initialized = true;
    return true;
  };

  /* =============================================================================
     06) IMMEDIATE INITIALIZATION
  ============================================================================= */
  initInstitutionalLinks();

  document.addEventListener('fragment:mounted', (event) => {
    const name = event?.detail?.name;
    if (name !== 'institutional-links') return;
    initInstitutionalLinks();
  });

  /* =============================================================================
     07) MUTATION OBSERVER FALLBACK
  ============================================================================= */
  const mo = new MutationObserver(() => {
    if (!initialized && initInstitutionalLinks()) {
      mo.disconnect();
    }
  });

  mo.observe(document.documentElement, {
    childList: true,
    subtree: true
  });
})();