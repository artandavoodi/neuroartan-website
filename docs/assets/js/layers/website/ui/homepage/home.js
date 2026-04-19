/* =============================================================================
   HOME.JS — ARTAN HOME LANDING SYSTEM (SOVEREIGN)

   Owns (in-file order):
   00) Home landing threshold entry
   01) Home run-after-enter helper (gate)
   02) Home landing logo layer disabled

   Contract:
   - Landing threshold entry is home-page only.
   - Landing threshold entry owns ONLY in-page enter flows.
   - Home-owned behaviors must live in home.js and may call `window.__artanRunAfterEnter`.
============================================================================= */

/* =============================================================================
   00) HOME LANDING THRESHOLD ENTRY
============================================================================= */

(() => {
  const ENTER_TARGET_SELECTOR = '#site-main';
  const ENTER_TRIGGER_SELECTOR = '#enter-button';
  const ENTER_SCROLL_THRESHOLD = 24;
  const ENTER_TOUCH_THRESHOLD = 18;
  const EXIT_EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';
  const EXIT_DURATION = 920;
  const SCROLL_DELAY = 220;
  const STAGE_HIDE_DELAY = 1480;
  const OVERLAY_FADE_DELAY = 520;
  const OVERLAY_TARGET_OPACITY = '0.42';

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

  const animateOut = (element, transformValue, opacityValue = '0', blurValue = '0px') => {
    if (!(element instanceof HTMLElement)) return;

    element.style.transition = [
      `opacity ${EXIT_DURATION}ms ${EXIT_EASE}`,
      `transform ${EXIT_DURATION}ms ${EXIT_EASE}`,
      `filter ${EXIT_DURATION}ms ${EXIT_EASE}`
    ].join(', ');
    element.style.willChange = 'opacity, transform, filter';
    element.style.transform = transformValue;
    element.style.opacity = opacityValue;
    element.style.filter = `blur(${blurValue})`;
    element.style.pointerEvents = 'none';
  };

  const runStageExit = () => {
    const logo = document.querySelector('#stage .site-logo');
    const announcement = document.querySelector('#announcement');
    const essence = document.querySelector('#stage-essence, #stage .site-essence');
    const cta = document.querySelector('#stage-cta');
    const enter = document.querySelector('#stage-enter');
    const circle = document.querySelector('.stage-circle');
    const overlay = document.querySelector('.stage-video-overlay');

    animateOut(logo, 'translate3d(0, -6px, 0) scale(1.018)', '0', '0px');
    animateOut(announcement, 'translate3d(0, -5px, 0) scale(1.012)', '0', '0px');
    animateOut(essence, 'translate3d(0, -4px, 0) scale(1.012)', '0', '0px');
    animateOut(cta, 'translate3d(0, -3px, 0) scale(1.01)', '0', '0px');
    animateOut(enter, 'translate3d(0, -2px, 0) scale(1.01)', '0', '0px');

    if (circle instanceof HTMLElement) {
      circle.style.transition = [
        `opacity ${EXIT_DURATION}ms ${EXIT_EASE}`,
        `transform ${EXIT_DURATION}ms ${EXIT_EASE}`,
        `filter ${EXIT_DURATION}ms ${EXIT_EASE}`
      ].join(', ');
      circle.style.willChange = 'opacity, transform, filter';
      circle.style.transformOrigin = 'center center';
      circle.style.transform = 'translate3d(0, 0, 0) scale(1.03)';
      circle.style.opacity = '0';
      circle.style.filter = 'blur(0px)';
      circle.style.pointerEvents = 'none';
    }

    if (overlay instanceof HTMLElement) {
      overlay.style.transition = [
        `opacity ${EXIT_DURATION}ms ${EXIT_EASE}`,
        `transform ${EXIT_DURATION}ms ${EXIT_EASE}`
      ].join(', ');
      overlay.style.transform = 'scale(1.015)';
      overlay.style.opacity = '1';

      window.setTimeout(() => {
        overlay.style.opacity = OVERLAY_TARGET_OPACITY;
      }, OVERLAY_FADE_DELAY);
    }
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
   01) HOME RUN AFTER ENTER (GATE HELPER)
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
   02) HOME LANDING LOGO LAYER — DISABLED
   Legacy homepage restoration: remove the homepage typo/logo JS ownership so it cannot
   interfere with the landing sequence, essence sequence, or release timing.
============================================================================= */

/* =============================================================================
   END OF HOME.JS — HOME LANDING SYSTEM
============================================================================= */
