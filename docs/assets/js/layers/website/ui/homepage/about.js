/* =============================================================================
   00) FILE INDEX
   01) MODULE IDENTITY
   02) PAGE IDENTITY
   03) ABOUT POST-LANDING STATE
   04) END OF FILE
============================================================================= */

/* =============================================================================
   01) MODULE IDENTITY
============================================================================= */
(() => {
  /* =============================================================================
     02) PAGE IDENTITY
  ============================================================================= */
  const body = document.body;
  if (!body || !body.classList.contains('about-page')) return;

  /* =============================================================================
     03) ABOUT POST-LANDING STATE
     About owns the mature post-landing homepage state so shared post-landing
     modules can boot without homepage threshold-entry ownership.
  ============================================================================= */
  body.classList.remove('intro-loading', 'intro-reveal', 'pre-home-entering');
  body.classList.add('site-entered', 'hero-lock-released', 'hero-released');
})();

/* =============================================================================
   04) END OF FILE
============================================================================= */
