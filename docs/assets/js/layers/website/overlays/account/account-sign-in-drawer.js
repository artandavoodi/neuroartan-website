/* =============================================================================
   00) FILE INDEX
   01) MODULE IDENTITY
   02) STATE
   03) BACKEND QUERY HELPERS
   04) DRAWER QUERY HELPERS
   05) HIDDEN CONTEXT FIELD HELPERS
   06) OPEN / CLOSE HELPERS
   06A) INNER ROUTE REQUEST HELPERS
   07) STATE VISIBILITY
   08) PROVIDER REQUEST HELPERS
   09) PUBLIC OPEN REQUESTS
   10) PUBLIC CLOSE REQUESTS
   11) GLOBAL CLICK BINDING
   12) ROUTE REQUEST BINDING
   12A) INNER ROUTE CONTROLS
   13) ESCAPE BINDING
   14) EVENT REBINDING
   15) BOOTSTRAP
   16) END OF FILE
============================================================================= */

/* =============================================================================
   01) MODULE IDENTITY
============================================================================= */
(() => {
  'use strict';
  const MODULE_ID = 'account-sign-in-drawer';
  const MODULE_PATH = '/website/docs/assets/js/layers/website/overlays/account/account-sign-in-drawer.js';

  /* =============================================================================
     02) STATE
  ============================================================================= */
  const OPEN_CLASS = 'account-sign-in-drawer-open';
  const CLOSING_CLASS = 'account-sign-in-drawer-closing';
  const FALLBACK_CLOSE_DURATION_MS = 320;
  const ROUTE_ACTION_SIGN_IN = 'sign-in';
  const ROUTE_ACTION_ENTRY = 'entry';
  const ROUTE_ACTION_FORGOT_PASSWORD = 'forgot-password';

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
     04) DRAWER QUERY HELPERS
  ============================================================================= */
  function getDrawer() {
    return document.querySelector('[data-account-sign-in-drawer="true"]');
  }

  function getBackdrop() {
    return document.querySelector('.account-sign-in-drawer-backdrop');
  }

  function getStateSections() {
    return Array.from(document.querySelectorAll('.account-sign-in-drawer-state'));
  }

  function getBody() {
    return document.querySelector('.account-sign-in-drawer-body');
  }

  function getForm() {
    return document.querySelector('[data-account-sign-in-form="true"]');
  }

  /* =============================================================================
     05) HIDDEN CONTEXT FIELD HELPERS
  ============================================================================= */

  function getHiddenMethodInput() {
    return document.querySelector('#account-sign-in-method');
  }

  function getHiddenAuthProviderInput() {
    return document.querySelector('#account-sign-in-auth-provider');
  }

  function syncHiddenContextFields(detail = {}) {
    const hiddenMethodInput = getHiddenMethodInput();
    const hiddenAuthProviderInput = getHiddenAuthProviderInput();
    const method = String(detail.method || 'email').trim() || 'email';
    const authProvider = String(detail.auth_provider || detail.provider || method || 'email').trim() || 'email';

    if (hiddenMethodInput) {
      hiddenMethodInput.value = method;
    }

    if (hiddenAuthProviderInput) {
      hiddenAuthProviderInput.value = authProvider;
    }
  }

  /* =============================================================================
     06) OPEN / CLOSE HELPERS
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

  function markOpenState(isOpen) {
    const drawer = getDrawer();
    if (!drawer) return;

    drawer.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
    document.body.classList.toggle(OPEN_CLASS, isOpen);
  }

  function openDrawer(source = 'direct-open') {
    const drawer = getDrawer();
    const body = getBody();
    if (!drawer || !body) return;

    syncHiddenContextFields({ method: 'email', auth_provider: 'email' });
    clearCloseTimer();
    document.body.classList.remove(CLOSING_CLASS);
    markOpenState(true);
    body.scrollTop = 0;

    document.dispatchEvent(new CustomEvent('account-sign-in-drawer:opened', {
      detail: {
        source,
        module: MODULE_ID
      }
    }));
  }

  function closeDrawer(reason = 'direct-close') {
    const drawer = getDrawer();
    if (!drawer) return;

    clearCloseTimer();
    document.body.classList.remove(OPEN_CLASS);
    document.body.classList.add(CLOSING_CLASS);
    drawer.setAttribute('aria-hidden', 'true');

    closeTimer = window.setTimeout(() => {
      document.body.classList.remove(CLOSING_CLASS);
      closeTimer = null;
    }, getCloseDurationMs());

    document.dispatchEvent(new CustomEvent('account-sign-in-drawer:closed', {
      detail: {
        reason,
        module: MODULE_ID
      }
    }));
  }

  /* =============================================================================
     06A) INNER ROUTE REQUEST HELPERS
  ============================================================================= */
  function requestInnerView(action) {
    if (!action) return;

    document.dispatchEvent(new CustomEvent('account-layer:view-request', {
      detail: {
        source: MODULE_ID,
        action
      }
    }));
  }

  /* =============================================================================
     07) STATE VISIBILITY
  ============================================================================= */
  function normalizeStateVisibility() {
    getStateSections().forEach((section) => {
      section.hidden = false;
    });
  }

  /* =============================================================================
     08) PROVIDER REQUEST HELPERS
  ============================================================================= */
  function requestGoogleProviderLogin() {
    syncHiddenContextFields({ method: 'google', auth_provider: 'google' });
    const supabase = getSupabaseClient();

    if (supabase) {
      const redirectTo = window.location.href;
      supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo
        }
      }).catch((error) => {
        console.error('[Neuroartan][Account Sign-In Drawer] Google sign-in failed.', error);
      });
      return;
    }

    document.dispatchEvent(new CustomEvent('account:provider-submit', {
      detail: {
        source: MODULE_ID,
        provider: 'google'
      }
    }));
  }

  /* =============================================================================
     09) PUBLIC OPEN REQUESTS
  ============================================================================= */
  function bindOpenRequests() {
    if (document.documentElement.dataset.accountSignInDrawerOpenBound === 'true') return;
    document.documentElement.dataset.accountSignInDrawerOpenBound = 'true';

    document.addEventListener('account-sign-in-drawer:open-request', (event) => {
      const source = event instanceof CustomEvent && event.detail?.source
        ? event.detail.source
        : 'external-open-request';

      normalizeStateVisibility();
      openDrawer(source);
    });
  }

  /* =============================================================================
     10) PUBLIC CLOSE REQUESTS
  ============================================================================= */
  function bindCloseRequests() {
    if (document.documentElement.dataset.accountSignInDrawerCloseBound === 'true') return;
    document.documentElement.dataset.accountSignInDrawerCloseBound = 'true';

    document.addEventListener('account-sign-in-drawer:close-request', (event) => {
      const reason = event instanceof CustomEvent && event.detail?.reason
        ? event.detail.reason
        : 'external-close-request';

      closeDrawer(reason);
    });
  }

  /* =============================================================================
     11) GLOBAL CLICK BINDING
  ============================================================================= */
  function bindGlobalClicks() {
    if (document.documentElement.dataset.accountSignInDrawerClicksBound === 'true') return;
    document.documentElement.dataset.accountSignInDrawerClicksBound = 'true';

    document.addEventListener('click', (event) => {
      const backdrop = getBackdrop();
      if (backdrop && event.target === backdrop) {
        event.preventDefault();
        closeDrawer('backdrop');
        return;
      }

      const closeControl = event.target instanceof Element
        ? event.target.closest('[data-account-sign-in-drawer-close="true"]')
        : null;

      if (closeControl) {
        event.preventDefault();
        closeDrawer('close-control');
        return;
      }

      const submitControl = event.target instanceof Element
        ? event.target.closest('[data-account-sign-in-submit="true"]')
        : null;

      if (submitControl) {
        event.preventDefault();
        document.dispatchEvent(new CustomEvent('account-sign-in:submit-request', {
          detail: {
            source: MODULE_ID,
            form: getForm(),
            method: getHiddenMethodInput()?.value?.trim() || 'email',
            auth_provider: getHiddenAuthProviderInput()?.value?.trim() || 'email'
          }
        }));
        return;
      }

      const appleControl = event.target instanceof Element
        ? event.target.closest('[data-account-sign-in-apple="true"]')
        : null;

      if (appleControl) {
        event.preventDefault();
        event.stopPropagation();
        syncHiddenContextFields({ method: 'apple', auth_provider: 'apple' });
        document.dispatchEvent(new CustomEvent('account:provider-submit', {
          detail: {
            source: MODULE_ID,
            provider: 'apple'
          }
        }));
        return;
      }

      const googleControl = event.target instanceof Element
        ? event.target.closest('[data-account-sign-in-google="true"]')
        : null;

      if (googleControl) {
        event.preventDefault();
        event.stopPropagation();
        requestGoogleProviderLogin();
        return;
      }

      const forgotPasswordControl = event.target instanceof Element
        ? event.target.closest('[data-account-sign-in-forgot-password="true"]')
        : null;

      if (forgotPasswordControl) {
        event.preventDefault();
        event.stopPropagation();
        requestInnerView(ROUTE_ACTION_FORGOT_PASSWORD);
        return;
      }

      const backControl = event.target instanceof Element
        ? event.target.closest('[data-account-sign-in-back="true"]')
        : null;

      if (backControl) {
        event.preventDefault();
        event.stopPropagation();
        requestInnerView(ROUTE_ACTION_ENTRY);
        return;
      }
    });
  }

  /* =============================================================================
     12) ROUTE REQUEST BINDING
  ============================================================================= */
  function bindRouteRequests() {
    if (document.documentElement.dataset.accountSignInDrawerRouteBound === 'true') return;
    document.documentElement.dataset.accountSignInDrawerRouteBound = 'true';

    const handleSignInViewRequest = (event, sourceLabel) => {
      if (!(event instanceof CustomEvent)) return;
      const action = event.detail?.action;
      if (action !== ROUTE_ACTION_SIGN_IN) return;

      syncHiddenContextFields(event.detail || {});
      normalizeStateVisibility();
      openDrawer(sourceLabel);
    };

    document.addEventListener('account-layer:route-request', (event) => {
      handleSignInViewRequest(event, 'route-sign-in');
    });

    document.addEventListener('account-layer:view-request', (event) => {
      handleSignInViewRequest(event, 'view-sign-in');
    });
  }

  /* =============================================================================
     12A) INNER ROUTE CONTROLS
  ============================================================================= */
  function bindInnerRouteControls() {
    if (document.documentElement.dataset.accountSignInDrawerInnerRouteBound === 'true') return;
    document.documentElement.dataset.accountSignInDrawerInnerRouteBound = 'true';

    document.addEventListener('click', (event) => {
      const drawer = getDrawer();
      if (!drawer || !drawer.classList.contains('is-open')) return;

      const target = event.target;
      if (!(target instanceof Element)) return;

      const signUpControl = target.closest('[data-account-route="sign-up"]');
      const emailControl = target.closest('[data-account-route="email-auth"]');
      const phoneControl = target.closest('[data-account-route="phone-auth"]');

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
      }
    });
  }

  /* =============================================================================
     13) ESCAPE BINDING
  ============================================================================= */
  function bindEscape() {
    if (document.documentElement.dataset.accountSignInDrawerEscapeBound === 'true') return;
    document.documentElement.dataset.accountSignInDrawerEscapeBound = 'true';

    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      if (!document.body.classList.contains(OPEN_CLASS)) return;
      closeDrawer('escape');
    });
  }

  /* =============================================================================
     14) EVENT REBINDING
  ============================================================================= */
  function bindMountEvents() {
    if (mountEventsBound) return;
    mountEventsBound = true;

    document.addEventListener('fragment:mounted', (event) => {
      const name = event?.detail?.name || '';
      if (name !== 'account-sign-in-drawer') return;

      document.documentElement.dataset.accountSignInDrawerInitialized = 'false';
      init();
    });
  }

  /* =============================================================================
     15) BOOTSTRAP
  ============================================================================= */
  function init() {
    if (document.documentElement.dataset.accountSignInDrawerInitialized === 'true' && getDrawer()) return;
    document.documentElement.dataset.accountSignInDrawerInitialized = 'true';

    normalizeStateVisibility();
    syncHiddenContextFields({ method: 'email', auth_provider: 'email' });

    const drawer = getDrawer();
    if (drawer) {
      if (!drawer.hasAttribute('aria-hidden')) {
        drawer.setAttribute('aria-hidden', 'true');
      }
      drawer.dataset.moduleId = MODULE_ID;
      drawer.dataset.modulePath = MODULE_PATH;
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
     16) END OF FILE
  ============================================================================= */
})();
