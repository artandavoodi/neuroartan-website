/* =============================================================================
00) FILE INDEX
01) MODULE IDENTITY
02) STATE
03) STORAGE HELPERS
04) QUERY HELPERS
05) TIMER HELPERS
06) DISPLAY DECISION HELPERS
07) AUTO-SHOW LOGIC
08) OPEN / CLOSE STATE
09) GLOBAL CLICK BINDING
10) GLOBAL REQUEST BINDING
11) ESCAPE BINDING
12) EVENT REBINDING
13) BOOTSTRAP
14) END OF FILE
============================================================================= */

(() => {
  'use strict';
  /* =============================================================================
     01) MODULE IDENTITY
  ============================================================================= */
  const MODULE_ID = 'announcement-overlay';
  const MODULE_PATH = '/website/docs/assets/js/layers/website/overlays/announcement/announcement-overlay.js';

  /* =============================================================================
     02) STATE
  ============================================================================= */
  const OPEN_CLASS = 'announcement-overlay-open';
  const CLOSING_CLASS = 'announcement-overlay-closing';
  const FALLBACK_CLOSE_DURATION_MS = 320;
  const STORAGE_KEY = 'neuroartan.announcementOverlay';
  const AUTO_SHOW_DELAY_MS = 10000;

  let closeTimer = null;
  let autoShowTimer = null;
  let bootBound = false;
  let mountEventsBound = false;

  /* =============================================================================
     03) STORAGE HELPERS
  ============================================================================= */
  function readStoredState() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}

    try {
      const raw = window.sessionStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function writeStoredState(payload) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {}

    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {}
  }

  function isDismissedInSession() {
    const stored = readStoredState();
    return stored && stored.dismissed === true;
  }

  function markAsDismissed() {
    writeStoredState({ dismissed: true, timestamp: Date.now() });
  }

  /* =============================================================================
     04) QUERY HELPERS
  ============================================================================= */
  const q = (selector, scope = document) => scope.querySelector(selector);
  const qa = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

  function getOverlay() {
    return q('#announcement-overlay') || q('.announcement-overlay');
  }

  function getBackdrop() {
    const overlay = getOverlay();
    return overlay ? q('.announcement-overlay-backdrop', overlay) : null;
  }

  function getCloseControls() {
    const overlay = getOverlay();
    return overlay ? qa('[data-announcement-overlay-close="true"]', overlay) : [];
  }

  /* =============================================================================
     05) TIMER HELPERS
  ============================================================================= */
  function getCloseDurationMs() {
    const root = document.documentElement;
    const raw = window.getComputedStyle(root).getPropertyValue('--duration-slow').trim();

    if (!raw) return FALLBACK_CLOSE_DURATION_MS;

    if (raw.endsWith('ms')) {
      const parsed = Number.parseFloat(raw);
      return Number.isFinite(parsed) ? parsed : FALLBACK_CLOSE_DURATION_MS;
    }

    if (raw.endsWith('s')) {
      const parsed = Number.parseFloat(raw);
      return Number.isFinite(parsed) ? parsed * 1000 : FALLBACK_CLOSE_DURATION_MS;
    }

    return FALLBACK_CLOSE_DURATION_MS;
  }

  function clearCloseTimer() {
    if (!closeTimer) return;
    window.clearTimeout(closeTimer);
    closeTimer = null;
  }

  function clearAutoShowTimer() {
    if (!autoShowTimer) return;
    window.clearTimeout(autoShowTimer);
    autoShowTimer = null;
  }

  /* =============================================================================
     06) DISPLAY DECISION HELPERS
  ============================================================================= */
  function isHomepage() {
    const pathname = window.location.pathname || '';
    return pathname === '/' || pathname === '/docs/' || pathname.endsWith('/docs') || pathname === '/website/docs/' || pathname.endsWith('/website/docs');
  }

  function shouldAutoShow() {
    if (!isHomepage()) return false;
    if (isDismissedInSession()) return false;
    const overlay = getOverlay();
    if (!overlay) return false;
    return true;
  }

  /* =============================================================================
     07) AUTO-SHOW LOGIC
  ============================================================================= */
  function scheduleAutoShow() {
    clearAutoShowTimer();
    if (!shouldAutoShow()) return;

    autoShowTimer = window.setTimeout(() => {
      if (shouldAutoShow()) {
        openOverlay({ source: 'auto-show' });
      }
    }, AUTO_SHOW_DELAY_MS);
  }

  /* =============================================================================
     08) OPEN / CLOSE STATE
  ============================================================================= */
  function openOverlay(detail = {}) {
    const overlay = getOverlay();
    if (!overlay) return;

    clearCloseTimer();

    document.body.classList.remove(CLOSING_CLASS);
    document.body.classList.add(OPEN_CLASS);
    overlay.setAttribute('aria-hidden', 'false');

    document.dispatchEvent(new CustomEvent('announcement-overlay:opened', {
      detail: { source: detail.source || MODULE_ID }
    }));
  }

  function closeOverlay(source = MODULE_ID) {
    const overlay = getOverlay();
    if (!overlay) return;

    if (!document.body.classList.contains(OPEN_CLASS) && !document.body.classList.contains(CLOSING_CLASS)) {
      overlay.setAttribute('aria-hidden', 'true');
      return;
    }

    clearCloseTimer();

    document.body.classList.remove(OPEN_CLASS);
    document.body.classList.add(CLOSING_CLASS);
    overlay.setAttribute('aria-hidden', 'true');

    markAsDismissed();

    closeTimer = window.setTimeout(() => {
      document.body.classList.remove(CLOSING_CLASS);
      document.dispatchEvent(new CustomEvent('announcement-overlay:closed', {
        detail: { source }
      }));
    }, getCloseDurationMs());
  }

  /* =============================================================================
     09) GLOBAL CLICK BINDING
  ============================================================================= */
  function bindGlobalClicks() {
    if (document.documentElement.dataset.announcementOverlayClicksBound === 'true') return;
    document.documentElement.dataset.announcementOverlayClicksBound = 'true';

    document.addEventListener('click', (event) => {
      const closeControl = event.target instanceof Element
        ? event.target.closest('[data-announcement-overlay-close="true"]')
        : null;

      if (closeControl) {
        event.preventDefault();
        closeOverlay('close-control');
        return;
      }

      const backdrop = event.target instanceof Element
        ? event.target.closest('.announcement-overlay-backdrop')
        : null;

      if (backdrop) {
        event.preventDefault();
        closeOverlay('backdrop');
        return;
      }
    });
  }

  /* =============================================================================
     10) GLOBAL REQUEST BINDING
  ============================================================================= */
  function bindGlobalRequests() {
    if (document.documentElement.dataset.announcementOverlayRequestsBound === 'true') return;
    document.documentElement.dataset.announcementOverlayRequestsBound = 'true';

    document.addEventListener('announcement-overlay:open-request', (event) => {
      const detail = event && event.detail && typeof event.detail === 'object'
        ? event.detail
        : {};
      openOverlay(detail);
    });

    document.addEventListener('announcement-overlay:close-request', () => {
      closeOverlay('request');
    });
  }

  /* =============================================================================
     11) ESCAPE BINDING
  ============================================================================= */
  function bindEscape() {
    if (document.documentElement.dataset.announcementOverlayEscapeBound === 'true') return;
    document.documentElement.dataset.announcementOverlayEscapeBound = 'true';

    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      closeOverlay('escape');
    });
  }

  /* =============================================================================
     12) EVENT REBINDING
  ============================================================================= */
  function bindMountEvents() {
    if (mountEventsBound) return;
    mountEventsBound = true;

    document.addEventListener('announcement-overlay:mounted', () => {
      initAnnouncementOverlay();
    });

    window.addEventListener('fragment:mounted', (event) => {
      const name = event?.detail?.name || '';
      if (name !== 'announcement-overlay') return;
      initAnnouncementOverlay();
    });
  }

  /* =============================================================================
     13) BOOTSTRAP
  ============================================================================= */
  function initAnnouncementOverlay() {
    const overlay = getOverlay();
    if (!overlay) return;

    if (!overlay.hasAttribute('aria-hidden')) {
      overlay.setAttribute('aria-hidden', 'true');
    }

    overlay.dataset.moduleId = MODULE_ID;
    overlay.dataset.modulePath = MODULE_PATH;

    getCloseControls().forEach((control) => {
      control.dataset.announcementOverlayClose = 'true';
    });

    scheduleAutoShow();
  }

  function boot() {
    if (bootBound) return;

    bootBound = true;

    bindGlobalClicks();
    bindGlobalRequests();
    bindEscape();
    bindMountEvents();
    initAnnouncementOverlay();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }

  /* =============================================================================
     14) END OF FILE
  ============================================================================= */
})();
