/* =============================================================================
   HERO.JS — ARTAN HOME HERO SYSTEM (SOVEREIGN)

   Owns (in-file order):
   00) Pre-home threshold entry
   01) Run-after-enter helper (gate)
   02) Hero logo stick + scale (post-enter)
   03) Scroll gradient states
   04) Headline scroll focus (legacy fallback)
   05) Pinned headline sequence (active)

   Contract:
   - No hard-hide of logo (no opacity:0 or visibility:hidden).
   - Boots ONLY after `body.site-entered`.
   - Downstream sections in home.js may call `window.__artanRunAfterEnter`.
============================================================================= */

/* =============================================================================
   00) PRE-HOME THRESHOLD ENTRY
============================================================================= */

(() => {
  const ENTER_TARGET_SELECTOR = '#site-main';
  const ENTER_TRIGGER_SELECTOR = '#enter-button';
  const ENTER_SCROLL_THRESHOLD = 24;
  const ENTER_TOUCH_THRESHOLD = 18;

  let isEntering = false;
  let touchStartY = null;

  const getTarget = () => document.querySelector(ENTER_TARGET_SELECTOR);

  const shouldInterceptThresholdEntry = () => {
    if (document.body.classList.contains('site-entered')) return false;
    return (window.scrollY || window.pageYOffset || 0) < 40;
  };

  const enterSite = () => {
    if (isEntering) return;

    const target = getTarget();
    if (!target) return;

    isEntering = true;

    document.body.classList.add('site-entered');
    document.body.classList.add('hero-lock-released');
    document.body.classList.add('hero-released');
    window.setTimeout(() => {
      document.body.classList.add('hero-stage-hidden');
    }, 1200);

    target.scrollIntoView({ behavior: 'smooth', block: 'start' });

    window.setTimeout(() => {
      isEntering = false;
    }, 1200);
  };

  document.addEventListener('click', (event) => {
    const trigger = event.target instanceof Element ? event.target.closest(ENTER_TRIGGER_SELECTOR) : null;
    if (!trigger) return;

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
   01) HOME — RUN AFTER ENTER (GATE HELPER)
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
   02) HOME HERO — LOGO STICK + SCALE (STABLE)
============================================================================= */

(() => {
  const hero = document.querySelector('#home-hero');

  // Tuning knobs (adjust freely)
  const STUCK_TOP_DESKTOP = 86; // px
  const STUCK_TOP_MOBILE = 72;  // px
  const STUCK_LEFT = 18;        // px
  const STUCK_SCALE = 0.50;

  const logoLayer = document.querySelector('.home-hero-logo-layer');
  if (!hero || !logoLayer) return;

  let enabled = false;
  let stuck = false;
  let raf = false;
  let thresholdY = 0;

  const restore = {
    style: logoLayer.getAttribute('style') || '',
    aria: logoLayer.getAttribute('aria-hidden'),
  };

  const computeThreshold = () => {
    const rect = hero.getBoundingClientRect();
    const pageY = window.scrollY || window.pageYOffset || 0;
    const heroTop = rect.top + pageY;
    return Math.max(0, heroTop + 24);
  };

  const applyStuck = () => {
    logoLayer.style.position = 'fixed';

    const stuckTop = window.matchMedia('(max-width: 640px)').matches
      ? STUCK_TOP_MOBILE
      : STUCK_TOP_DESKTOP;

    logoLayer.style.top = `${stuckTop}px`;
    logoLayer.style.left = `${STUCK_LEFT}px`;
    logoLayer.style.right = 'auto';
    logoLayer.style.bottom = 'auto';
    logoLayer.style.zIndex = '400000';
    logoLayer.style.pointerEvents = 'auto';

    logoLayer.style.willChange = 'transform';
    logoLayer.style.transformOrigin = 'top left';
    logoLayer.style.transform = `scale(${STUCK_SCALE})`;

    logoLayer.style.transition =
      'transform 900ms cubic-bezier(0.22, 1, 0.36, 1), opacity 500ms cubic-bezier(0.22, 1, 0.36, 1)';

    document.body.classList.add('home-hero-logo-stuck');
    stuck = true;
  };

  const removeStuck = () => {
    if (restore.style) logoLayer.setAttribute('style', restore.style);
    else logoLayer.removeAttribute('style');

    if (restore.aria === null) logoLayer.removeAttribute('aria-hidden');
    else logoLayer.setAttribute('aria-hidden', restore.aria);

    logoLayer.style.willChange = '';

    document.body.classList.remove('home-hero-logo-stuck');
    stuck = false;
  };

  const overlaysActive = () => {
    const menuOverlay = document.querySelector('#menu-overlay');

    const menuOpenByBody =
      document.body.classList.contains('menu-open') ||
      document.body.classList.contains('menu-active') ||
      document.body.classList.contains('menu-visible');

    const menuOpenByOverlay = !!(
      menuOverlay &&
      (
        menuOverlay.classList.contains('active') ||
        menuOverlay.classList.contains('is-open') ||
        menuOverlay.getAttribute('aria-hidden') === 'false' ||
        menuOverlay.style.visibility === 'visible' ||
        menuOverlay.style.opacity === '1'
      )
    );

    if (menuOpenByBody || menuOpenByOverlay) return true;

    const countryOverlay = document.querySelector('.country-overlay');
    const countryOpen = !!(
      countryOverlay &&
      (
        countryOverlay.classList.contains('visible') ||
        countryOverlay.classList.contains('active') ||
        countryOverlay.getAttribute('aria-hidden') === 'false'
      )
    );

    return countryOpen;
  };

  const setLogoSuppressed = (suppress) => {
    logoLayer.style.transition =
      (logoLayer.style.transition ? logoLayer.style.transition + ', ' : '') +
      'opacity 500ms cubic-bezier(0.22, 1, 0.36, 1)';

    if (suppress) {
      logoLayer.style.opacity = '0.14';
      logoLayer.style.visibility = 'visible';
      logoLayer.style.pointerEvents = 'none';
      logoLayer.removeAttribute('aria-hidden');
    } else {
      logoLayer.style.opacity = '';
      logoLayer.style.visibility = '';
      logoLayer.style.pointerEvents = '';
      logoLayer.removeAttribute('aria-hidden');
    }
  };

  const update = () => {
    setLogoSuppressed(overlaysActive());

    const y = window.scrollY || window.pageYOffset || 0;
    const shouldStick = y > thresholdY;

    if (shouldStick && !stuck) applyStuck();
    if (!shouldStick && stuck) removeStuck();
  };

  const onScroll = () => {
    if (raf) return;
    raf = true;
    requestAnimationFrame(() => {
      raf = false;
      update();
    });
  };

  const observeOverlayState = () => {
    const targets = [document.body];

    const menuOverlay = document.querySelector('#menu-overlay');
    if (menuOverlay) targets.push(menuOverlay);

    const countryOverlay = document.querySelector('.country-overlay');
    if (countryOverlay) targets.push(countryOverlay);

    const mo = new MutationObserver(() => update());

    targets.forEach((t) => {
      mo.observe(t, { attributes: true, attributeFilter: ['class','style','aria-hidden'] });
    });

    document.addEventListener('click', () => requestAnimationFrame(update), true);
  };

  const enable = () => {
    if (enabled) return;
    enabled = true;

    thresholdY = computeThreshold();
    update();

    observeOverlayState();

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', () => {
      thresholdY = computeThreshold();
      update();
    }, { passive: true });
  };

  const boot = () => {
    if (document.body.classList.contains('site-entered')) {
      enable();
      return;
    }

    const mo = new MutationObserver(() => {
      if (document.body.classList.contains('site-entered')) {
        mo.disconnect();
        enable();
      }
    });

    mo.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();

/* =============================================================================
   03) HOME — SCROLL GRADIENT STATES
============================================================================= */

(() => {
  const boot = () => {
    let raf = false;

    const updateScrollState = () => {
      const y = window.scrollY || window.pageYOffset || 0;
      const h = document.documentElement.scrollHeight - window.innerHeight;
      const p = h > 0 ? y / h : 0;

      document.body.classList.remove('scroll-top', 'scroll-mid', 'scroll-deep');

      if (p < 0.25) document.body.classList.add('scroll-top');
      else if (p < 0.65) document.body.classList.add('scroll-mid');
      else document.body.classList.add('scroll-deep');
    };

    const onScroll = () => {
      if (raf) return;
      raf = true;
      requestAnimationFrame(() => {
        raf = false;
        updateScrollState();
      });
    };

    const init = () => {
      updateScrollState();
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', updateScrollState, { passive: true });
    };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
  };

  window.__artanRunAfterEnter(boot);
})();

/* =============================================================================
   04) HOME HERO — HEADLINE SCROLL FOCUS (LEGACY FALLBACK)
============================================================================= */

(() => {
  const boot = () => {
    if (document.body.classList.contains('hero-lock-enabled')) return;

    const hero = document.querySelector('#home-hero');
    const headlines = document.querySelectorAll('.home-hero-headline');
    if (!hero || !headlines.length) return;

    const total = headlines.length;
    let raf = false;

    const update = () => {
      const y = window.scrollY || window.pageYOffset || 0;
      const rect = hero.getBoundingClientRect();
      const heroTop = rect.top + y;
      const heroHeight = rect.height;

      const start = heroTop + heroHeight * 0.25;
      const end = heroTop + heroHeight * 0.95;

      document.body.classList.remove('hl-1','hl-2','hl-3','hl-4','hl-hide');

      if (y < start) { document.body.classList.add('hl-1'); return; }
      if (y > end) { document.body.classList.add('hl-hide'); return; }

      const progress = (y - start) / (end - start);
      const index = Math.min(total - 1, Math.floor(progress * total));
      document.body.classList.add(`hl-${index + 1}`);
    };

    const onScroll = () => {
      if (raf) return;
      raf = true;
      requestAnimationFrame(() => { raf = false; update(); });
    };

    const init = () => {
      update();
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', update, { passive: true });
    };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
  };

  window.__artanRunAfterEnter(boot);
})();

/* =============================================================================
   05) HOME HERO — PINNED HEADLINE SEQUENCE (ACTIVE)
============================================================================= */

(() => {
  const boot = () => {
    document.body.classList.add('hero-lock-enabled');

    const hero = document.querySelector('#home-hero');
    const headlines = document.querySelectorAll('.home-hero-headline');
    const wrap = document.querySelector('.home-hero-headlines');
    if (!hero || !headlines.length || !wrap) return;

    const heroBg = hero.querySelector('.home-hero-bg, .home-hero-media, .home-hero-video, video, picture, img');
    const heroMatte = hero.querySelector('.home-hero-matte');

    const matteRestore = {
      parent: heroMatte ? heroMatte.parentNode : null,
      next: heroMatte ? heroMatte.nextSibling : null,
    };

    const STEPS = headlines.length;

    let raf = false;
    let active = false;

    const ensureSpacer = () => {
      let spacer = document.querySelector('#hero-scroll-spacer');
      if (!spacer) {
        spacer = document.createElement('div');
        spacer.id = 'hero-scroll-spacer';
        spacer.setAttribute('aria-hidden', 'true');
        hero.insertAdjacentElement('afterend', spacer);
      }
      return spacer;
    };

    const spacer = ensureSpacer();

    const ensureBackdrop = () => {
      let bd = document.querySelector('#hero-pin-backdrop');
      if (!bd) {
        bd = document.createElement('div');
        bd.id = 'hero-pin-backdrop';
        bd.setAttribute('aria-hidden', 'true');
        bd.style.position = 'fixed';
        bd.style.inset = '0';
        bd.style.pointerEvents = 'none';
        bd.style.opacity = '1';
        bd.style.display = 'none';
        bd.style.zIndex = '2';
        document.body.appendChild(bd);
      }
      return bd;
    };

    const backdrop = ensureBackdrop();

    const setBackdropOpacity = (o) => { backdrop.style.opacity = String(o); };

    const showBackdrop = () => {
      backdrop.style.backgroundColor = getComputedStyle(document.body).backgroundColor;
      backdrop.style.display = 'block';
      setBackdropOpacity(0);
    };

    const hideBackdrop = () => {
      backdrop.style.display = 'none';
      setBackdropOpacity(0);
    };

    const restore = {
      wrapStyle: wrap.getAttribute('style') || '',
      bgStyle: heroBg ? (heroBg.getAttribute('style') || '') : '',
      matteStyle: heroMatte ? (heroMatte.getAttribute('style') || '') : '',
    };

    const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

    const clearStepClasses = () => {
      for (let i = 1; i <= 8; i++) document.body.classList.remove(`hl-${i}`);
    };

    const setStep = (idx0) => {
      clearStepClasses();
      const i = clamp(idx0, 0, STEPS - 1);
      document.body.classList.add(`hl-${i + 1}`);
    };

    const setRunwayHeight = () => {
      const h = Math.round(window.innerHeight * 3.2);
      spacer.style.height = `${h}px`;
      spacer.style.width = '1px';
    };

    const setPinned = (on) => {
      if (on) {
        showBackdrop();

        if (heroBg) {
          heroBg.style.setProperty('position', 'fixed', 'important');
          heroBg.style.setProperty('inset', '0', 'important');
          heroBg.style.setProperty('width', '100%', 'important');
          heroBg.style.setProperty('height', '100%', 'important');
          heroBg.style.setProperty('transform', 'none', 'important');
          heroBg.style.setProperty('z-index', '0', 'important');
          heroBg.style.setProperty('pointer-events', 'none', 'important');
        }

        if (heroMatte) {
          if (heroMatte.parentNode !== document.body) {
            matteRestore.parent = heroMatte.parentNode;
            matteRestore.next = heroMatte.nextSibling;
            document.body.appendChild(heroMatte);
          }

          heroMatte.style.setProperty('position', 'fixed', 'important');
          heroMatte.style.setProperty('inset', '0', 'important');
          heroMatte.style.setProperty('width', '100%', 'important');
          heroMatte.style.setProperty('height', '100%', 'important');
          heroMatte.style.setProperty('transform', 'none', 'important');
          heroMatte.style.setProperty('z-index', '1', 'important');
          heroMatte.style.setProperty('pointer-events', 'none', 'important');
        }

        wrap.style.setProperty('position', 'fixed', 'important');
        wrap.style.left = '0';
        wrap.style.top = '58%';
        wrap.style.transform = 'translateY(-50%)';
        wrap.style.width = '100%';
        wrap.style.zIndex = '3';

        document.body.classList.remove('hero-lock-released');
      } else {
        hideBackdrop();

        if (heroBg) {
          if (restore.bgStyle) heroBg.setAttribute('style', restore.bgStyle);
          else heroBg.removeAttribute('style');
        }

        if (heroMatte) {
          if (restore.matteStyle) heroMatte.setAttribute('style', restore.matteStyle);
          else heroMatte.removeAttribute('style');

          if (matteRestore.parent && heroMatte.parentNode !== matteRestore.parent) {
            if (matteRestore.next) matteRestore.parent.insertBefore(heroMatte, matteRestore.next);
            else matteRestore.parent.appendChild(heroMatte);
          }
        }

        if (restore.wrapStyle) wrap.setAttribute('style', restore.wrapStyle);
        else wrap.removeAttribute('style');
      }
    };

    const getRanges = () => {
      const rect = hero.getBoundingClientRect();
      const pageY = window.scrollY || window.pageYOffset || 0;
      const heroTop = rect.top + pageY;

      const start = Math.max(0, heroTop - 1);
      const length = spacer.getBoundingClientRect().height || Math.round(window.innerHeight * 3.2);
      const end = start + length;

      return { start, end, length, heroTop };
    };

    const resetIfAboveHero = (y, heroTop) => {
      if (y < heroTop - 40) {
        active = false;
        document.body.classList.remove('hero-lock-released');
        clearStepClasses();
        setPinned(false);
        hideBackdrop();
        return true;
      }
      return false;
    };

    const update = () => {
      const y = window.scrollY || window.pageYOffset || 0;
      const { start, end, length, heroTop } = getRanges();

      if (resetIfAboveHero(y, heroTop)) return;

      if (y >= end) {
        if (active) { active = false; setPinned(false); hideBackdrop(); }
        document.body.classList.add('hero-lock-released');
        setStep(STEPS - 1);
        setBackdropOpacity(1);
        return;
      }

      if (y < start) {
        document.body.classList.remove('hero-lock-released');
        setPinned(false);
        setStep(0);
        active = false;
        setBackdropOpacity(0);
        return;
      }

      if (!active) { active = true; setPinned(true); }

      const p = clamp((y - start) / length, 0, 0.999999);
      const idx = Math.floor(p * STEPS);
      setStep(idx);

      const fadeStart = 0.20;
      const fadeEnd = 0.95;
      const o = clamp((p - fadeStart) / (fadeEnd - fadeStart), 0, 1);
      setBackdropOpacity(o);
    };

    const onScroll = () => {
      if (raf) return;
      raf = true;
      requestAnimationFrame(() => { raf = false; update(); });
    };

    const init = () => {
      setRunwayHeight();
      update();
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', () => { setRunwayHeight(); update(); }, { passive: true });
    };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
  };

  window.__artanRunAfterEnter(boot);
})();