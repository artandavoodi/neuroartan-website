/* =============================================================================
   00) FILE INDEX
   01) MODULE IDENTITY
   02) MODULE STATE
   03) OVERLAY RESOLUTION
   04) VISIBILITY STATE
   05) TIMER HELPERS
   06) OVERLAY CONTROL
   07) EVENT BINDING
   08) EVENT REBINDING
   09) INITIALIZATION
   10) END OF FILE
============================================================================= */

/* =============================================================================
   01) MODULE IDENTITY
   LOADING OVERLAY — GLOBAL SYSTEM CONTROLLER
   - Translation-first implementation
   - Paint-synchronized dismissal
   - Modular API for future page / fragment loading states
============================================================================= */
/* /website/docs/assets/js/core/03-runtime/loading-overlay.js */

(() => {
  'use strict';

  /* =============================================================================
     02) MODULE STATE
  ============================================================================= */
  let overlay = null;
  let bootBound = false;
  let mountEventsBound = false;
  const activeReasons = new Set();
  let showTimer = null;
  let visible = false;
  let visibleSince = 0;
  let hideTimer = null;
  let initialLoadBound = false;
  let introObserver = null;

  const SHOW_DELAY_MS = 90;
  const MIN_VISIBLE_MS = 320;
  const FINAL_PAINT_SETTLE_MS = 120;
  const INITIAL_LOAD_REASON = 'initial-page-load';
  const THEME_PAINT_REASON = 'theme-paint';

  /* =============================================================================
     03) OVERLAY RESOLUTION
  ============================================================================= */
  const getOverlayNode = () => {
    return document.getElementById('global-loading-overlay');
  };

  const isLogoIntroActive = () => {
    const body = document.body;
    if (!body || !body.classList.contains('home-page')) {
      return false;
    }

    if (document.querySelector('[data-logo-intro-overlay="true"]')) {
      return true;
    }

    return body.classList.contains('intro-loading') &&
      !body.classList.contains('site-entered') &&
      !body.classList.contains('hero-stage-hidden');
  };

  /* =============================================================================
     04) VISIBILITY STATE
  ============================================================================= */
  const setVisible = (state) => {
    if (!overlay) return;

    visible = state;
    visibleSince = state ? Date.now() : 0;
    overlay.classList.toggle('is-active', state);
    overlay.setAttribute('aria-hidden', state ? 'false' : 'true');

    document.documentElement.setAttribute('data-loading-overlay', state ? 'active' : 'idle');
    document.dispatchEvent(new CustomEvent('neuroartan:loading-state-changed', {
      detail: {
        active: state,
        reasons: Array.from(activeReasons)
      }
    }));
  };

  /* =============================================================================
     05) TIMER HELPERS
  ============================================================================= */
  const clearShowTimer = () => {
    if (!showTimer) return;
    window.clearTimeout(showTimer);
    showTimer = null;
  };

  const clearHideTimer = () => {
    if (!hideTimer) return;
    window.clearTimeout(hideTimer);
    hideTimer = null;
  };

  /* =============================================================================
     06) OVERLAY CONTROL
  ============================================================================= */
  const hideAfterSynchronizedPaint = () => {
    const elapsed = visible ? Date.now() - visibleSince : 0;
    const remainingVisibleTime = Math.max(0, MIN_VISIBLE_MS - elapsed);

    clearHideTimer();
    hideTimer = window.setTimeout(() => {
      hideTimer = null;

      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          window.setTimeout(() => {
            if (activeReasons.size === 0 && visible) {
              setVisible(false);
            }
          }, FINAL_PAINT_SETTLE_MS);
        });
      });
    }, remainingVisibleTime);
  };

  const updateVisibility = () => {
    if (!overlay) return;

    const shouldShow = activeReasons.size > 0;
    const introActive = isLogoIntroActive();

    if (shouldShow) {
      clearHideTimer();

      if (introActive) {
        clearShowTimer();

        if (visible) {
          setVisible(false);
        }

        return;
      }

      if (visible) return;
      if (showTimer) return;

      showTimer = window.setTimeout(() => {
        showTimer = null;
        if (activeReasons.size > 0 && !isLogoIntroActive()) {
          setVisible(true);
        }
      }, SHOW_DELAY_MS);
      return;
    }

    clearShowTimer();

    if (visible) {
      hideAfterSynchronizedPaint();
    }
  };

  const normalizeReason = (reason = 'generic') => {
    const normalized = String(reason || '').trim();
    return normalized || 'generic';
  };

  const start = (reason = 'generic') => {
    activeReasons.add(normalizeReason(reason));
    updateVisibility();
  };

  const stop = (reason = 'generic') => {
    activeReasons.delete(normalizeReason(reason));
    updateVisibility();
  };

  const clear = () => {
    activeReasons.clear();
    clearShowTimer();
    clearHideTimer();

    if (visible) {
      setVisible(false);
    } else {
      updateVisibility();
    }
  };

  /* =============================================================================
     07) EVENT BINDING
  ============================================================================= */
  const bindEvents = () => {
    document.addEventListener('translation:start', () => {
      start('translation');
    });

    document.addEventListener('translation:complete', () => {
      stop('translation');
    });

    document.addEventListener('translation:error', () => {
      stop('translation');
    });

    document.addEventListener('neuroartan:loading-start', (event) => {
      start(event?.detail?.reason || 'runtime');
    });

    document.addEventListener('neuroartan:loading-stop', (event) => {
      stop(event?.detail?.reason || 'runtime');
    });

    document.addEventListener('neuroartan:loading-clear', () => {
      clear();
    });

    document.addEventListener('neuroartan:theme-changed', () => {
      start(THEME_PAINT_REASON);

      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          stop(THEME_PAINT_REASON);
        });
      });
    });
  };

  const completeInitialLoad = () => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        stop(INITIAL_LOAD_REASON);
      });
    });
  };

  const bindInitialLoad = () => {
    if (initialLoadBound) return;
    initialLoadBound = true;

    if (document.readyState !== 'complete') {
      start(INITIAL_LOAD_REASON);
      window.addEventListener('load', completeInitialLoad, { once: true });
      return;
    }

    completeInitialLoad();
  };

  const bindIntroStateObserver = () => {
    if (introObserver) return;

    introObserver = new MutationObserver(() => {
      updateVisibility();
    });

    if (document.body) {
      introObserver.observe(
        document.body,
        {
          attributes: true,
          attributeFilter: ['class'],
          childList: true,
          subtree: true
        }
      );
    }
  };

  /* =============================================================================
     08) EVENT REBINDING
  ============================================================================= */
  const bindMountEvents = () => {
    if (mountEventsBound) return;
    mountEventsBound = true;

    document.addEventListener('fragment:mounted', (event) => {
      const name = event?.detail?.name || '';
      if (name !== 'loading-overlay') return;

      overlay = getOverlayNode();
      if (!overlay) return;

      clearShowTimer();
      clearHideTimer();
      visible = overlay.classList.contains('is-active');
      visibleSince = visible ? Date.now() : 0;
      overlay.setAttribute('aria-hidden', visible ? 'false' : 'true');
    });

    window.addEventListener('load', () => {
      overlay = getOverlayNode();
    }, { once: true });
  };

  /* =============================================================================
     09) INITIALIZATION
  ============================================================================= */
  const boot = () => {
    overlay = getOverlayNode();
    if (bootBound) {
      return;
    }

    bootBound = true;
    bindEvents();
    bindMountEvents();
    bindIntroStateObserver();

    const api = Object.freeze({
      start,
      stop,
      clear,
      isActive: () => activeReasons.size > 0,
      getReasons: () => Array.from(activeReasons)
    });

    window.ARTAN_LOADING_OVERLAY = api;
    window.NEUROARTAN_LOADING_OVERLAY = api;

    if (!overlay) return;

    visible = overlay.classList.contains('is-active');
    visibleSince = visible ? Date.now() : 0;
    overlay.setAttribute('aria-hidden', visible ? 'false' : 'true');

    bindInitialLoad();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();

/* =============================================================================
   10) END OF FILE
============================================================================= */
