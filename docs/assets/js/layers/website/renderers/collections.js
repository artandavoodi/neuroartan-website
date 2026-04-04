/* =============================================================================
   COLLECTIONS MODULE — SOVEREIGN / MOTION SYSTEM INTEGRATED
   - Independent from home.js
   - Uses global motion-init / motion-visible classes
   - Bidirectional reveal
============================================================================= */

(() => {
  const initCollections = () => {
    const headers = document.querySelectorAll('.featured-header');
    const cards = document.querySelectorAll('.featured-card');

    if (!headers.length && !cards.length) return;

    /* -------------------------------------------------------------------------
       01) ATTACH MOTION BASE + STAGGER
    ------------------------------------------------------------------------- */

    headers.forEach((h) => {
      h.classList.add('motion-init');
      h.dataset.motion = 'lift';
    });

    cards.forEach((card, i) => {
      card.classList.add('motion-init');
      card.dataset.motion = 'lift';
      card.style.transitionDelay = `${Math.min(i * 120, 720)}ms`;
    });

    const nodes = document.querySelectorAll('.featured-header.motion-init, .featured-card.motion-init');
    if (!nodes.length) return;

    /* -------------------------------------------------------------------------
       02) INTERSECTION OBSERVER (BIDIRECTIONAL)
    ------------------------------------------------------------------------- */

    if (!('IntersectionObserver' in window)) {
      nodes.forEach((n) => n.classList.add('motion-visible'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.18) {
            entry.target.classList.add('motion-visible');
          } else {
            entry.target.classList.remove('motion-visible');
          }
        });
      },
      { threshold: [0, 0.18, 0.35] }
    );

    nodes.forEach((n) => observer.observe(n));
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCollections);
  } else {
    initCollections();
  }
})();