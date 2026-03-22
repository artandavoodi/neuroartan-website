/* =============================================================================
   MOTION SYSTEM — SOVEREIGN GLOBAL ENGINE
   - One observer
   - Explicit local opt-in via data-motion
   - Fragment-aware via standard mount event
   - Hero / essence choreography excluded
   - Footer stays on its own local controller
============================================================================= */

(() => {
  const SELECTOR = '[data-motion]';

  const EXCLUDE = [
    '.home-hero',
    '.home-headline',
    '.home-essence',
    '.home-ink-reveal',
    '.home-ink-stack',
    '.home-ink-layer',
    '.ink-line',
    '.site-footer',
    '.site-footer *'
  ];

  const observed = new WeakSet();

  const isElement = (value) => value instanceof Element;
  const isDocument = (value) => value instanceof Document;

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

  const createObserver = () => {
    if (!('IntersectionObserver' in window)) return null;

    return new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const el = entry.target;

          if (entry.isIntersecting && entry.intersectionRatio > 0.14) {
            el.classList.add('motion-visible');
          } else {
            el.classList.remove('motion-visible');
          }
        });
      },
      {
        threshold: [0, 0.14, 0.28, 0.45],
        rootMargin: '0px 0px -8% 0px'
      }
    );
  };

  const observer = createObserver();

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

  const scan = (root = document) => {
    collectNodes(root).forEach(prepareNode);
  };

  const initMotion = () => {
    scan(document);

    document.addEventListener('fragment:mounted', (event) => {
      const root = isElement(event?.target) ? event.target : document;
      scan(root);
    });
  };

  window.NeuroMotion = Object.freeze({ scan });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMotion, { once: true });
  } else {
    initMotion();
  }
})();
