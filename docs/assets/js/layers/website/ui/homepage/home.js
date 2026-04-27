/* =============================================================================
   HOME.JS — ARTAN HOME LANDING SYSTEM (SOVEREIGN)

   Owns (in-file order):
   00) Home landing visibility release
   01) Home landing threshold entry
   02) Home run-after-enter helper (gate)
   03) Home landing logo layer disabled

   Contract:
   - Landing threshold entry is home-page only.
   - Landing threshold entry owns ONLY in-page enter flows.
   - Home-owned behaviors must live in home.js and may call `window.__artanRunAfterEnter`.
============================================================================= */

/* =============================================================================
   00) HOME LANDING VISIBILITY RELEASE
============================================================================= */

(() => {
  const INTRO_RELEASE_DELAY = 900;

  const releaseIntroVisibility = () => {
    if (!document.body || !document.body.classList.contains('home-page')) return;
    if (document.body.classList.contains('site-entered')) return;

    document.body.classList.remove('intro-loading');
    document.body.classList.add('intro-reveal');
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.setTimeout(releaseIntroVisibility, INTRO_RELEASE_DELAY);
    }, { once: true });
    return;
  }

  window.setTimeout(releaseIntroVisibility, INTRO_RELEASE_DELAY);
})();

/* =============================================================================
   01) HOME LANDING THRESHOLD ENTRY
============================================================================= */

(() => {
  const ENTER_TARGET_SELECTOR = '#site-main';
  const ENTER_TRIGGER_SELECTOR = '#enter-button';
  const ENTER_SCROLL_THRESHOLD = 24;
  const ENTER_TOUCH_THRESHOLD = 18;
  const SCROLL_DELAY = 220;
  const STAGE_HIDE_DELAY = 1480;

  let isEntering = false;
  let touchStartY = null;

  const isHomePage = () => document.body.classList.contains('home-page');
  const getTarget = () => document.querySelector(ENTER_TARGET_SELECTOR);
  const getEnterTrigger = () => document.querySelector(ENTER_TRIGGER_SELECTOR);

  const ownsInPageEnterFlow = () => {
    if (!isHomePage()) return false;

    const trigger = getEnterTrigger();
    if (!(trigger instanceof HTMLAnchorElement)) return false;

    const href = (trigger.getAttribute('href') || '').trim();
    return href === ENTER_TARGET_SELECTOR;
  };

  const shouldInterceptThresholdEntry = () => {
    if (!ownsInPageEnterFlow()) return false;
    if (document.body.classList.contains('site-entered')) return false;
    return (window.scrollY || window.pageYOffset || 0) < 40;
  };

  const runStageExit = () => {
    document.body.classList.add('home-stage-exiting');
  };

  const enterSite = () => {
    if (isEntering) return;

    const target = getTarget();
    if (!target) return;

    isEntering = true;
    document.body.classList.add('pre-home-entering');
    runStageExit();

    window.setTimeout(() => {
      document.body.classList.add('site-entered');
      document.body.classList.add('hero-lock-released');
      document.body.classList.add('hero-released');
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, SCROLL_DELAY);

    window.setTimeout(() => {
      document.body.classList.add('hero-stage-hidden');
      document.body.classList.remove('pre-home-entering');
    }, STAGE_HIDE_DELAY);

    window.setTimeout(() => {
      isEntering = false;
    }, STAGE_HIDE_DELAY);
  };

  document.addEventListener('click', (event) => {
    const trigger = event.target instanceof Element ? event.target.closest(ENTER_TRIGGER_SELECTOR) : null;
    if (!trigger) return;
    if (!ownsInPageEnterFlow()) return;

    event.preventDefault();
    enterSite();
  }, { passive: false });

  window.addEventListener('wheel', (event) => {
    if (!shouldInterceptThresholdEntry()) return;
    if (event.deltaY <= ENTER_SCROLL_THRESHOLD) return;

    event.preventDefault();
    enterSite();
  }, { passive: false });

  window.addEventListener('keydown', (event) => {
    if (!shouldInterceptThresholdEntry()) return;
    if (!['ArrowDown', 'PageDown', ' ', 'Spacebar'].includes(event.key)) return;

    event.preventDefault();
    enterSite();
  }, { passive: false });

  window.addEventListener('touchstart', (event) => {
    if (!shouldInterceptThresholdEntry()) return;
    const point = event.touches && event.touches[0];
    touchStartY = point ? point.clientY : null;
  }, { passive: true });

  window.addEventListener('touchmove', (event) => {
    if (!shouldInterceptThresholdEntry()) return;
    if (touchStartY == null) return;

    const point = event.touches && event.touches[0];
    if (!point) return;

    const deltaY = touchStartY - point.clientY;
    if (deltaY <= ENTER_TOUCH_THRESHOLD) return;

    event.preventDefault();
    touchStartY = null;
    enterSite();
  }, { passive: false });

  window.addEventListener('touchend', () => {
    touchStartY = null;
  }, { passive: true });
})();

/* =============================================================================
   02) HOME RUN AFTER ENTER (GATE HELPER)
============================================================================= */

window.__artanRunAfterEnter = window.__artanRunAfterEnter || ((bootFn) => {
  if (typeof bootFn !== 'function') return;

  const run = () => {
    try { bootFn(); } catch (_) {}
  };

  if (document.body.classList.contains('site-entered')) {
    run();
    return;
  }

  const mo = new MutationObserver(() => {
    if (document.body.classList.contains('site-entered')) {
      mo.disconnect();
      run();
    }
  });

  mo.observe(document.body, { attributes: true, attributeFilter: ['class'] });
});

/* =============================================================================
   03) HOME LANDING LOGO LAYER — DISABLED
   Legacy homepage restoration: remove the homepage typo/logo JS ownership so it cannot
   interfere with the landing sequence, essence sequence, or release timing.
============================================================================= */

/* =============================================================================
   END OF HOME.JS — HOME LANDING SYSTEM
============================================================================= */
