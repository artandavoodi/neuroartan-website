/* =============================================================================
   FILE INDEX
   01) MODULE IDENTITY
   02) SELECTORS / EXCLUSIONS / STATE
   03) TYPE HELPERS
   04) COLLECTION FILTERING
   05) OBSERVER FACTORY
   06) NODE PREPARATION
   07) SCAN API
   08) INITIALIZATION
   09) DOCUMENT READY HANDOFF
============================================================================= */

/* =============================================================================
   01) MODULE IDENTITY
============================================================================= */

(() => {
  /* =============================================================================
     02) SELECTORS / EXCLUSIONS / STATE
  ============================================================================= */
  const SELECTOR = '[data-motion]';

  const EXCLUDE = [
    '.home-hero',
    '.home-headline',
    '.home-essence',
    '.home-ink-reveal',
    '.home-ink-stack',
    '.home-ink-layer',
    '.ink-line'
  ];

  const observed = new WeakSet();

  /* =============================================================================
     03) TYPE HELPERS
  ============================================================================= */
  const isElement = (value) => value instanceof Element;
  const isDocument = (value) => value instanceof Document;

  /* =============================================================================
     04) COLLECTION FILTERING
  ============================================================================= */
  const isExcluded = (el) => {
    return EXCLUDE.some((selector) => el.matches(selector) || el.closest(selector));
  };

  const collectNodes = (root = document) => {
    const scope = isElement(root) || isDocument(root) ? root : document;
    const nodes = [];

    if (isElement(scope) && scope.matches(SELECTOR) && !isExcluded(scope)) {
      nodes.push(scope);
    }

    scope.querySelectorAll(SELECTOR).forEach((el) => {
      if (!isExcluded(el)) nodes.push(el);
    });

    return nodes;
  };

  /* =============================================================================
     05) OBSERVER FACTORY
  ============================================================================= */
  const createObserver = () => {
    if (!('IntersectionObserver' in window)) return null;

    return new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const el = entry.target;

          if (entry.isIntersecting) {
            el.classList.add('motion-visible');
          } else {
            el.classList.remove('motion-visible');
          }
        });
      },
      {
        threshold: 0,
        rootMargin: '0px 0px -8% 0px'
      }
    );
  };

  const observer = createObserver();

  /* =============================================================================
     06) NODE PREPARATION
  ============================================================================= */
  const prepareNode = (el) => {
    if (observed.has(el)) return;

    el.classList.add('motion-init');

    if (el.hasAttribute('data-motion-delay')) {
      el.style.transitionDelay = el.getAttribute('data-motion-delay');
    }

    if (observer) {
      observer.observe(el);
    } else {
      el.classList.add('motion-visible');
    }

    observed.add(el);
  };

  /* =============================================================================
     07) SCAN API
  ============================================================================= */
  const scan = (root = document) => {
    collectNodes(root).forEach(prepareNode);
  };

  /* =============================================================================
     08) INITIALIZATION
  ============================================================================= */
  const initMotion = () => {
    scan(document);

    document.addEventListener('fragment:mounted', (event) => {
      const detailRoot = event?.detail?.root;
      const root = isElement(detailRoot)
        ? detailRoot
        : isElement(event?.target)
          ? event.target
          : document;
      scan(root);
    });
  };

  window.NeuroMotion = Object.freeze({ scan });

  /* =============================================================================
     09) DOCUMENT READY HANDOFF
  ============================================================================= */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMotion, { once: true });
  } else {
    initMotion();
  }
})();
