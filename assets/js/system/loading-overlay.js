/* =============================================================================
   LOADING OVERLAY — GLOBAL SYSTEM CONTROLLER
   - Translation-first implementation
   - Paint-synchronized dismissal
   - Modular API for future page / fragment loading states
============================================================================= */

(() => {
  const overlay = document.getElementById('global-loading-overlay');
  if (!overlay) return;

  let activeReasons = new Set();
  let showTimer = null;
  let visible = false;
  let visibleSince = 0;
  let hideTimer = null;

  const SHOW_DELAY_MS = 90;
  const MIN_VISIBLE_MS = 320;
  const FINAL_PAINT_SETTLE_MS = 120;

  const setVisible = (state) => {
    visible = state;
    visibleSince = state ? Date.now() : 0;
    overlay.classList.toggle('is-active', state);
    overlay.setAttribute('aria-hidden', state ? 'false' : 'true');
  };

  const clearHideTimer = () => {
    if (!hideTimer) return;
    window.clearTimeout(hideTimer);
    hideTimer = null;
  };

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
    const shouldShow = activeReasons.size > 0;

    if (shouldShow) {
      clearHideTimer();

      if (visible) return;
      if (showTimer) return;

      showTimer = window.setTimeout(() => {
        showTimer = null;
        if (activeReasons.size > 0) {
          setVisible(true);
        }
      }, SHOW_DELAY_MS);
      return;
    }

    if (showTimer) {
      window.clearTimeout(showTimer);
      showTimer = null;
    }

    if (visible) {
      hideAfterSynchronizedPaint();
    }
  };

  const start = (reason = 'generic') => {
    activeReasons.add(reason);
    updateVisibility();
  };

  const stop = (reason = 'generic') => {
    activeReasons.delete(reason);
    updateVisibility();
  };

  const clear = () => {
    activeReasons.clear();

    if (showTimer) {
      window.clearTimeout(showTimer);
      showTimer = null;
    }

    clearHideTimer();
    if (visible) {
      setVisible(false);
    } else {
      updateVisibility();
    }
  };

  document.addEventListener('translation:start', () => {
    start('translation');
  });

  document.addEventListener('translation:complete', () => {
    stop('translation');
  });

  document.addEventListener('translation:error', () => {
    stop('translation');
  });

  window.ARTAN_LOADING_OVERLAY = Object.freeze({
    start,
    stop,
    clear,
    isActive: () => activeReasons.size > 0
  });
})();