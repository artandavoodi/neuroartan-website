/* =============================================================================
   00) FILE INDEX
   01) MODULE IDENTITY
   02) FOOTER REVEAL CONTROLLER
   03) IMMEDIATE INITIALIZATION
   04) MUTATION OBSERVER FALLBACK
============================================================================= */

/* =============================================================================
   01) MODULE IDENTITY
============================================================================= */

(() => {
  /* =============================================================================
     02) FOOTER REVEAL CONTROLLER
  ============================================================================= */
  const initFooterReveal = () => {
    const footer = document.querySelector('.site-footer');
    if (!footer) return false;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            footer.classList.add('footer-visible');
          } else {
            footer.classList.remove('footer-visible');
          }
        });
      },
      { threshold: 0.15 }
    );

    observer.observe(footer);
    return true;
  };

  /* =============================================================================
     03) IMMEDIATE INITIALIZATION
  ============================================================================= */
  // Try immediately
  if (initFooterReveal()) return;

  /* =============================================================================
     04) MUTATION OBSERVER FALLBACK
  ============================================================================= */
  // If footer fragment not yet mounted, observe DOM
  const mo = new MutationObserver(() => {
    if (initFooterReveal()) {
      mo.disconnect();
    }
  });

  mo.observe(document.body, { childList: true, subtree: true });
})();