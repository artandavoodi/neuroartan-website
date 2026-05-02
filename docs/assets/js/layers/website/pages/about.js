/* =============================================================================
   00) FILE INDEX
   01) MODULE IDENTITY
   02) PAGE IDENTITY
   03) ABOUT POST-LANDING STATE
   04) ABOUT HERO HEADLINES SEQUENCE
   05) ABOUT ESSENCE SCROLL SEQUENCE
   06) END OF FILE
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

  /* =============================================================================
     04) ABOUT HERO HEADLINES SEQUENCE
     Migrated from the former Home background owner. About now owns the
     Intelligence Cognitive / Operating System scroll-highlight sequence.
  ============================================================================= */
  const headlineSection = document.querySelector('.home-hero-headlines');

  if (headlineSection) {
    const HEADLINE_CLASSES = ['hl-0', 'hl-1', 'hl-2', 'hl-3', 'hl-hide'];
    let headlineRafId = 0;
    let activeHeadlineStep = '';

    const clearHeadlineStepClasses = () => {
      HEADLINE_CLASSES.forEach((name) => body.classList.remove(name));
    };

    const setHeadlineStep = (name) => {
      if (activeHeadlineStep === name) return;
      clearHeadlineStepClasses();
      body.classList.add(name);
      activeHeadlineStep = name;
    };

    const updateHeadlineSequence = () => {
      const y = window.scrollY || window.pageYOffset || 0;
      const pageTop = headlineSection.getBoundingClientRect().top + y;
      const runway = Math.max(headlineSection.offsetHeight - window.innerHeight, 1);
      const progress = Math.max(0, Math.min(0.999999, (y - pageTop) / runway));

      if (y < pageTop) {
        setHeadlineStep('hl-0');
        return;
      }

      if (progress < 0.22) { setHeadlineStep('hl-1'); return; }
      if (progress < 0.48) { setHeadlineStep('hl-2'); return; }
      if (progress < 0.78) { setHeadlineStep('hl-3'); return; }

      setHeadlineStep('hl-hide');
    };

    const requestHeadlineUpdate = () => {
      if (headlineRafId) return;
      headlineRafId = window.requestAnimationFrame(() => {
        headlineRafId = 0;
        updateHeadlineSequence();
      });
    };

    setHeadlineStep('hl-0');
    updateHeadlineSequence();

    window.addEventListener('scroll', requestHeadlineUpdate, { passive: true });
    window.addEventListener('resize', requestHeadlineUpdate, { passive: true });
    window.addEventListener('load', requestHeadlineUpdate);
    document.addEventListener('fragment:mounted', requestHeadlineUpdate);
    window.addEventListener('neuroartan:language-applied', requestHeadlineUpdate);
  }


  /* =============================================================================
     05) ABOUT ESSENCE SCROLL SEQUENCE
     Canonical sequence migrated from the former Home Essence effect owner.
     About now owns this behavior because the Essence / Ink Reveal section lives
     on the About page. The CSS consumes body-level ess-* states.

     Canonical sequence per sentence:
     - phase A: 50% emergence
     - phase B: 100% focus with a longer readable hold
     - phase C: 50% recession
     - phase D: hidden
     - gap: clear pause before next sentence begins
  ============================================================================= */
  const essenceSection = document.querySelector('.home-essence-effect');

  if (essenceSection) {
    const STEP_CLASSES = [
      'ess-1a', 'ess-1b', 'ess-1c', 'ess-1d', 'ess-gap-1',
      'ess-2a', 'ess-2b', 'ess-2c', 'ess-2d', 'ess-gap-2',
      'ess-3a', 'ess-3b', 'ess-3c', 'ess-3d',
      'ess-hide'
    ];

    let essenceRafId = 0;
    let activeEssenceStep = '';

    const clearEssenceStepClasses = () => {
      STEP_CLASSES.forEach((name) => body.classList.remove(name));
    };

    const setEssenceStep = (name) => {
      if (activeEssenceStep === name) return;
      clearEssenceStepClasses();
      body.classList.add(name);
      activeEssenceStep = name;
    };

    const getEssenceProgress = () => {
      const y = window.scrollY || window.pageYOffset || 0;
      const pageTop = essenceSection.getBoundingClientRect().top + y;
      const runway = Math.max(essenceSection.offsetHeight - window.innerHeight, 1);
      const progress = Math.max(0, Math.min(0.999999, (y - pageTop) / runway));
      return { y, pageTop, progress };
    };

    const updateEssenceSequence = () => {
      const { y, pageTop, progress } = getEssenceProgress();

      if (y < pageTop) {
        setEssenceStep('ess-1a');
        return;
      }

      if (progress < 0.05) { setEssenceStep('ess-1a'); return; }
      if (progress < 0.17) { setEssenceStep('ess-1b'); return; }
      if (progress < 0.25) { setEssenceStep('ess-1c'); return; }
      if (progress < 0.31) { setEssenceStep('ess-1d'); return; }
      if (progress < 0.36) { setEssenceStep('ess-gap-1'); return; }

      if (progress < 0.42) { setEssenceStep('ess-2a'); return; }
      if (progress < 0.56) { setEssenceStep('ess-2b'); return; }
      if (progress < 0.64) { setEssenceStep('ess-2c'); return; }
      if (progress < 0.70) { setEssenceStep('ess-2d'); return; }
      if (progress < 0.75) { setEssenceStep('ess-gap-2'); return; }

      if (progress < 0.81) { setEssenceStep('ess-3a'); return; }
      if (progress < 0.93) { setEssenceStep('ess-3b'); return; }
      if (progress < 0.975) { setEssenceStep('ess-3c'); return; }
      if (progress < 0.992) { setEssenceStep('ess-3d'); return; }

      setEssenceStep('ess-hide');
    };

    const requestEssenceUpdate = () => {
      if (essenceRafId) return;
      essenceRafId = window.requestAnimationFrame(() => {
        essenceRafId = 0;
        updateEssenceSequence();
      });
    };

    setEssenceStep('ess-1a');
    updateEssenceSequence();

    window.addEventListener('scroll', requestEssenceUpdate, { passive: true });
    window.addEventListener('resize', requestEssenceUpdate, { passive: true });
    window.addEventListener('load', requestEssenceUpdate);
    document.addEventListener('fragment:mounted', requestEssenceUpdate);
    window.addEventListener('neuroartan:language-applied', requestEssenceUpdate);
  }
})();

/* =============================================================================
   06) END OF FILE
============================================================================= */
