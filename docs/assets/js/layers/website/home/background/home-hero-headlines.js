/* =============================================================================
   00) FILE INDEX
   01) MODULE IDENTITY
   02) ENTER GATE
   03) HOME LANDING HEADLINE SCROLL SEQUENCE
   04) END OF FILE
============================================================================= */

/* =============================================================================
   01) MODULE IDENTITY
============================================================================= */
(() => {
  /* =============================================================================
     02) ENTER GATE
  ============================================================================= */
  window.__artanRunAfterEnter(() => {
    /* =============================================================================
       03) HOME LANDING HEADLINE SCROLL SEQUENCE
       - default: both recessed
       - range 1: first line active
       - range 2: second line active
       - range 3: both lift/fade
       - range 4: hidden
    ============================================================================= */
    const section = document.querySelector('.home-hero-headlines');
    if (!section) return;

    const STEP_CLASSES = ['hl-0', 'hl-1', 'hl-2', 'hl-3', 'hl-hide'];
    let raf = 0;

    const clearStepClasses = () => {
      STEP_CLASSES.forEach((name) => document.body.classList.remove(name));
    };

    const setStep = (name) => {
      clearStepClasses();
      document.body.classList.add(name);
    };

    const update = () => {
      const y = window.scrollY || window.pageYOffset || 0;
      const pageTop = section.getBoundingClientRect().top + y;
      const runway = Math.max(section.offsetHeight - window.innerHeight, 1);
      const progress = Math.max(0, Math.min(0.999999, (y - pageTop) / runway));

      if (y < pageTop) {
        setStep('hl-0');
        return;
      }

      if (progress < 0.22) {
        setStep('hl-1');
        return;
      }

      if (progress < 0.48) {
        setStep('hl-2');
        return;
      }

      if (progress < 0.78) {
        setStep('hl-3');
        return;
      }

      setStep('hl-hide');
    };

    const requestUpdate = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        update();
      });
    };

    setStep('hl-0');
    update();
    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate, { passive: true });
    window.addEventListener('load', requestUpdate);
    document.addEventListener('fragment:mounted', requestUpdate);
    window.addEventListener('neuroartan:language-applied', requestUpdate);
  });
})();

/* =============================================================================
   04) END OF FILE
============================================================================= */