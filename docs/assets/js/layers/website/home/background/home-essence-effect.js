/* =============================================================================
   00) FILE INDEX
   01) MODULE IDENTITY
   02) ENTER GATE
   03) ABOUT ESSENCE SCROLL SEQUENCE
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
       03) ABOUT ESSENCE SCROLL SEQUENCE
       Canonical sequence per sentence:
       - phase A: 50% emergence
       - phase B: 100% focus with a longer readable hold
       - phase C: 50% recession
       - phase D: hidden
       - gap: clear pause before next sentence begins
    ============================================================================= */
    const section = document.querySelector('.home-essence-effect');
    if (!section) return;

    const STEP_CLASSES = [
      'ess-1a', 'ess-1b', 'ess-1c', 'ess-1d', 'ess-gap-1',
      'ess-2a', 'ess-2b', 'ess-2c', 'ess-2d', 'ess-gap-2',
      'ess-3a', 'ess-3b', 'ess-3c', 'ess-3d',
      'ess-hide'
    ];

    let raf = 0;
    let activeStep = '';

    const clearStepClasses = () => {
      STEP_CLASSES.forEach((name) => document.body.classList.remove(name));
    };

    const setStep = (name) => {
      if (activeStep === name) return;
      clearStepClasses();
      document.body.classList.add(name);
      activeStep = name;
    };

    const getProgress = () => {
      const y = window.scrollY || window.pageYOffset || 0;
      const pageTop = section.getBoundingClientRect().top + y;
      const runway = Math.max(section.offsetHeight - window.innerHeight, 1);
      const progress = Math.max(0, Math.min(0.999999, (y - pageTop) / runway));
      return { y, pageTop, progress };
    };

    const update = () => {
      const { y, pageTop, progress } = getProgress();

      if (y < pageTop) {
        setStep('ess-1a');
        return;
      }

      if (progress < 0.05) { setStep('ess-1a'); return; }
      if (progress < 0.17) { setStep('ess-1b'); return; }
      if (progress < 0.25) { setStep('ess-1c'); return; }
      if (progress < 0.31) { setStep('ess-1d'); return; }
      if (progress < 0.36) { setStep('ess-gap-1'); return; }

      if (progress < 0.42) { setStep('ess-2a'); return; }
      if (progress < 0.56) { setStep('ess-2b'); return; }
      if (progress < 0.64) { setStep('ess-2c'); return; }
      if (progress < 0.70) { setStep('ess-2d'); return; }
      if (progress < 0.75) { setStep('ess-gap-2'); return; }

      if (progress < 0.81) { setStep('ess-3a'); return; }
      if (progress < 0.93) { setStep('ess-3b'); return; }
      if (progress < 0.975) { setStep('ess-3c'); return; }
      if (progress < 0.992) { setStep('ess-3d'); return; }

      setStep('ess-hide');
    };

    const requestUpdate = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        update();
      });
    };

    setStep('ess-1a');
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