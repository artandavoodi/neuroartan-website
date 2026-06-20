/* =============================================================================
   00) FILE INDEX
   01) MODULE IDENTITY
   02) STATE
   03) BACKEND QUERY HELPERS
   04) SHEET QUERY HELPERS
   05) STATE VISIBILITY HELPERS
   06) OPEN / CLOSE HELPERS
   06A) INNER ROUTE REQUEST HELPERS
   07) PROVIDER REQUEST HELPERS
   08) OPEN REQUEST BINDING
   09) CLOSE REQUEST BINDING
   10) GLOBAL CLICK BINDING
   11) ROUTE REQUEST BINDING
   11A) INNER ROUTE CONTROLS
   12) ESCAPE BINDING
   13) EVENT REBINDING
   14) BOOTSTRAP
   15) END OF FILE
============================================================================= */

/* =============================================================================
   01) MODULE IDENTITY
============================================================================= */
(() => {
  'use strict';

  /* =============================================================================
     02) STATE
  ============================================================================= */
  let closeTimer = null;
  let bootBound = false;
  let mountEventsBound = false;

  /* =============================================================================
     03) BACKEND QUERY HELPERS
  ============================================================================= */
  function getSupabaseClient() {
    if (typeof window === 'undefined') return null;
    return window.neuroartanSupabase || null;
  }

  /* =============================================================================
     04) SHEET QUERY HELPERS
  ============================================================================= */
  function getSheet() {
    return document.getElementById('account-provider-google-sheet');
  }

  function getMount() {
    return document.querySelector('[data-include="account-provider-google-sheet"]');
  }

  /* =============================================================================
     05) STATE VISIBILITY HELPERS
  ============================================================================= */
  function normalizeStateVisibility() {
    const sheet = getSheet();
    if (!sheet) return;

    const isOpen = sheet.classList.contains('is-open');
    sheet.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
  }

  /* =============================================================================
     06) OPEN / CLOSE HELPERS
  ============================================================================= */
  function openSheet() {
    const sheet = getSheet();
    if (!sheet) return;

    window.clearTimeout(closeTimer);
    sheet.classList.add('is-open');
    sheet.setAttribute('aria-hidden', 'false');
    document.documentElement.classList.add('account-provider-google-sheet-open');
  }

  function closeSheet() {
    const sheet = getSheet();
    if (!sheet) return;

    sheet.classList.remove('is-open');
    sheet.setAttribute('aria-hidden', 'true');
    document.documentElement.classList.remove('account-provider-google-sheet-open');
  }

  /* =============================================================================
     06A) INNER ROUTE REQUEST HELPERS
  ============================================================================= */
  function requestInnerView(action) {
    if (!action) return;

    document.dispatchEvent(new CustomEvent('account-layer:view-request', {
      detail: {
        source: 'account-provider-google-sheet',
        action
      }
    }));
  }

  /* =============================================================================
     07) PROVIDER REQUEST HELPERS
  ============================================================================= */
  function requestGoogleProviderLogin() {
    const supabase = getSupabaseClient();

    if (supabase) {
      const redirectTo = window.location.href;
      supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo
        }
      }).catch((error) => {
        console.error('[Neuroartan][Account Provider Google Sheet] Google sign-in failed.', error);
      });
      return;
    }

    requestInnerView('sign-in');
  }

  /* =============================================================================
     08) OPEN REQUEST BINDING
  ============================================================================= */
  function bindOpenRequests() {
    if (document.documentElement.dataset.accountProviderGoogleSheetOpenBound === 'true') return;
    document.documentElement.dataset.accountProviderGoogleSheetOpenBound = 'true';

    document.addEventListener('account-provider-google-sheet:open-request', () => {
      openSheet();
    });
  }

  /* =============================================================================
     09) CLOSE REQUEST BINDING
  ============================================================================= */
  function bindCloseRequests() {
    if (document.documentElement.dataset.accountProviderGoogleSheetCloseBound === 'true') return;
    document.documentElement.dataset.accountProviderGoogleSheetCloseBound = 'true';

    document.addEventListener('account-provider-google-sheet:close-request', () => {
      closeSheet();
    });
  }

  /* =============================================================================
     10) GLOBAL CLICK BINDING
  ============================================================================= */
  function bindGlobalClicks() {
    if (document.documentElement.dataset.accountProviderGoogleSheetGlobalClickBound === 'true') return;
    document.documentElement.dataset.accountProviderGoogleSheetGlobalClickBound = 'true';

    document.addEventListener('click', (event) => {
      const sheet = getSheet();
      if (!sheet || !sheet.classList.contains('is-open')) return;

      const target = event.target;
      if (!(target instanceof Element)) return;
      if (sheet.contains(target)) return;
      if (target.closest('[data-account-provider-google-open]')) return;
      if (target.closest('[data-account-sign-in-open]')) return;
      if (target.closest('[data-account-route]')) return;

      closeSheet();
    });
  }

  /* =============================================================================
     11) ROUTE REQUEST BINDING
  ============================================================================= */
  function bindRouteRequests() {
    if (document.documentElement.dataset.accountProviderGoogleSheetRouteBound === 'true') return;
    document.documentElement.dataset.accountProviderGoogleSheetRouteBound = 'true';

    const handleGoogleRoute = (event) => {
      const route = event?.detail?.route || event?.detail?.action || '';
      if (route !== 'provider-google') return;
      openSheet();
    };

    document.addEventListener('account-drawer:route', handleGoogleRoute);
    document.addEventListener('account-layer:route-request', handleGoogleRoute);
    document.addEventListener('account-layer:view-request', handleGoogleRoute);
  }

  /* =============================================================================
     11A) INNER ROUTE CONTROLS
  ============================================================================= */
  function bindInnerRouteControls() {
    if (document.documentElement.dataset.accountProviderGoogleSheetInnerRouteBound === 'true') return;
    document.documentElement.dataset.accountProviderGoogleSheetInnerRouteBound = 'true';

    document.addEventListener('click', (event) => {
      const sheet = getSheet();
      if (!sheet || !sheet.classList.contains('is-open')) return;

      const target = event.target;
      if (!(target instanceof Element)) return;

      const signInControl = target.closest('[data-account-sign-in-open], [data-account-route="sign-in"]');
      const entryControl = target.closest('[data-account-route="entry"]');
      const signUpControl = target.closest('[data-account-route="sign-up"]');
      const emailControl = target.closest('[data-account-route="email-auth"]');
      const phoneControl = target.closest('[data-account-route="phone-auth"]');
      const continueControl = target.closest('[data-account-provider-google-continue="true"]');

      if (continueControl) {
        event.preventDefault();
        event.stopPropagation();
        requestGoogleProviderLogin();
        return;
      }

      if (signInControl) {
        event.preventDefault();
        event.stopPropagation();
        requestInnerView('sign-in');
        return;
      }

      if (signUpControl) {
        event.preventDefault();
        event.stopPropagation();
        requestInnerView('sign-up');
        return;
      }

      if (emailControl) {
        event.preventDefault();
        event.stopPropagation();
        requestInnerView('email-auth');
        return;
      }

      if (phoneControl) {
        event.preventDefault();
        event.stopPropagation();
        requestInnerView('phone-auth');
        return;
      }

      if (entryControl) {
        event.preventDefault();
        event.stopPropagation();
        requestInnerView('entry');
      }
    });
  }

  /* =============================================================================
     12) ESCAPE BINDING
  ============================================================================= */
  function bindEscape() {
    if (document.documentElement.dataset.accountProviderGoogleSheetEscapeBound === 'true') return;
    document.documentElement.dataset.accountProviderGoogleSheetEscapeBound = 'true';

    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      const sheet = getSheet();
      if (!sheet || !sheet.classList.contains('is-open')) return;
      closeSheet();
    });
  }

  /* =============================================================================
     13) EVENT REBINDING
  ============================================================================= */
  function bindMountEvents() {
    if (mountEventsBound) return;
    mountEventsBound = true;

    document.addEventListener('fragment:mounted', (event) => {
      const name = event?.detail?.name || '';
      if (name !== 'account-provider-google-sheet') return;

      document.documentElement.dataset.accountProviderGoogleSheetInitialized = 'false';
      init();
    });
  }

  /* =============================================================================
     14) BOOTSTRAP
  ============================================================================= */
  function init() {
    if (document.documentElement.dataset.accountProviderGoogleSheetInitialized === 'true' && getSheet()) return;
    document.documentElement.dataset.accountProviderGoogleSheetInitialized = 'true';

    normalizeStateVisibility();

    const sheet = getSheet();
    if (sheet) {
      if (!sheet.hasAttribute('aria-hidden')) {
        sheet.setAttribute('aria-hidden', 'true');
      }
      sheet.dataset.moduleId = 'account-provider-google-sheet';
      sheet.dataset.modulePath = '/website/docs/assets/js/layers/website/overlays/account/account-provider-google-sheet.js';
    }

    bindOpenRequests();
    bindCloseRequests();
    bindGlobalClicks();
    bindRouteRequests();
    bindInnerRouteControls();
    bindEscape();
  }

  function boot() {
    if (bootBound) return;

    bootBound = true;
    bindMountEvents();
    init();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }

  /* =============================================================================
     15) END OF FILE
  ============================================================================= */
})();
