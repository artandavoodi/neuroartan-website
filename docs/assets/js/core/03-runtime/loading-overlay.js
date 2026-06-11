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
  const reasonTimers = new Map();
  let visible = false;
  let initialLoadBound = false;
  let introObserver = null;

  const DEFAULT_REASON_TIMEOUT_MS = 4500;
  const INITIAL_LOAD_TIMEOUT_MS = 6000;
  const INITIAL_LOAD_SETTLE_TIMEOUT_MS = 4500;
  const INITIAL_LOAD_REASON = 'initial-page-load';
  const BLOCKING_LOADING_REASONS = new Set([
    INITIAL_LOAD_REASON,
    'global-layout',
    'translation'
  ]);
  const BLOCKING_LOADING_REASON_PREFIXES = [
    'locale:'
  ];

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
  const clearReasonTimer = (reason) => {
    const normalizedReason = normalizeReason(reason);
    const timer = reasonTimers.get(normalizedReason);
    if (!timer) return;

    window.clearTimeout(timer);
    reasonTimers.delete(normalizedReason);
  };

  const clearReasonTimers = () => {
    reasonTimers.forEach((timer) => window.clearTimeout(timer));
    reasonTimers.clear();
  };

  const getReasonTimeout = (reason) => {
    if (reason === INITIAL_LOAD_REASON) {
      return INITIAL_LOAD_TIMEOUT_MS;
    }

    return DEFAULT_REASON_TIMEOUT_MS;
  };

  const armReasonTimer = (reason) => {
    const normalizedReason = normalizeReason(reason);

    clearReasonTimer(normalizedReason);
    reasonTimers.set(normalizedReason, window.setTimeout(() => {
      reasonTimers.delete(normalizedReason);

      if (!activeReasons.has(normalizedReason)) return;

      activeReasons.delete(normalizedReason);
      updateVisibility();
      document.dispatchEvent(new CustomEvent('neuroartan:loading-stale-reason-cleared', {
        detail: {
          reason: normalizedReason,
          source: 'core/03-runtime/loading-overlay.js'
        }
      }));
    }, getReasonTimeout(normalizedReason)));
  };

  /* =============================================================================
     06) OVERLAY CONTROL
  ============================================================================= */
  const hideAfterSynchronizedPaint = () => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        if (activeReasons.size === 0 && visible) {
          setVisible(false);
        }
      });
    });
  };

  const updateVisibility = () => {
    if (!overlay) return;

    const shouldShow = activeReasons.size > 0;
    const introActive = isLogoIntroActive();

    if (shouldShow) {
      if (introActive) {
        if (visible) {
          setVisible(false);
        }

        return;
      }

      if (visible) return;
      setVisible(true);
      return;
    }

    if (visible) {
      hideAfterSynchronizedPaint();
    }
  };

  const normalizeReason = (reason = 'generic') => {
    const normalized = String(reason || '').trim();
    return normalized || 'generic';
  };

  const isBlockingLoadingReason = (event, reason) => {
    const detail = event?.detail || {};

    if (detail.blocking === true || detail.critical === true) {
      return true;
    }

    if (detail.blocking === false || detail.critical === false) {
      return false;
    }

    return BLOCKING_LOADING_REASONS.has(reason) ||
      BLOCKING_LOADING_REASON_PREFIXES.some((prefix) => reason.startsWith(prefix));
  };

  const start = (reason = 'generic') => {
    const normalizedReason = normalizeReason(reason);
    activeReasons.add(normalizedReason);
    armReasonTimer(normalizedReason);
    updateVisibility();
  };

  const stop = (reason = 'generic') => {
    const normalizedReason = normalizeReason(reason);
    clearReasonTimer(normalizedReason);
    activeReasons.delete(normalizedReason);
    updateVisibility();
  };

  const clear = () => {
    activeReasons.clear();
    clearReasonTimers();

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
      const reason = normalizeReason(event?.detail?.reason || 'runtime');
      if (!isBlockingLoadingReason(event, reason)) return;
      start(reason);
    });

    document.addEventListener('neuroartan:loading-stop', (event) => {
      stop(event?.detail?.reason || 'runtime');
    });

    document.addEventListener('neuroartan:loading-clear', () => {
      clear();
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
      window.setTimeout(completeInitialLoad, INITIAL_LOAD_SETTLE_TIMEOUT_MS);
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

      visible = overlay.classList.contains('is-active');
      overlay.setAttribute('aria-hidden', visible ? 'false' : 'true');
      updateVisibility();
    });

    window.addEventListener('load', () => {
      overlay = getOverlayNode();
      updateVisibility();
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
