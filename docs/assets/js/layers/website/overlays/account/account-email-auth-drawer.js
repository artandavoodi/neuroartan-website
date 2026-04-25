/* =============================================================================
   00) FILE INDEX
   01) MODULE IDENTITY
   02) STATE
   03) BACKEND QUERY HELPERS
   04) DRAWER QUERY HELPERS
   05) HIDDEN CONTEXT FIELD HELPERS
   06) STATE VISIBILITY HELPERS
   07) OPEN / CLOSE HELPERS
   07A) INNER ROUTE REQUEST HELPERS
   08) OPEN REQUEST BINDING
   09) CLOSE REQUEST BINDING
   10) ROUTE REQUEST BINDING
   10A) INNER ROUTE CONTROLS
   10B) PROVIDER REQUEST HELPERS
   10C) FORM SUBMIT BINDING
   11) ESCAPE BINDING
   12) EVENT REBINDING
   13) BOOTSTRAP
   14) END OF FILE
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
     04) DRAWER QUERY HELPERS
  ============================================================================= */
  function getDrawer() {
    return document.getElementById('account-email-auth-drawer');
  }

  function getMount() {
    return document.querySelector('[data-include="account-email-auth-drawer"]');
  }

  function getForm() {
    return document.querySelector('[data-account-email-auth-form="true"]');
  }

  function getEmailInput() {
    return document.getElementById('account-email-auth-email');
  }

  /* =============================================================================
     05) HIDDEN CONTEXT FIELD HELPERS
  ============================================================================= */
  function getHiddenMethodInput() {
    return document.querySelector('#account-email-auth-method');
  }

  function getHiddenAuthProviderInput() {
    return document.querySelector('#account-email-auth-auth-provider');
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
     06) STATE VISIBILITY HELPERS
  ============================================================================= */
  function normalizeStateVisibility() {
    const drawer = getDrawer();
    if (!drawer) return;

    const isOpen = drawer.classList.contains('is-open');
    drawer.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
  }

  /* =============================================================================
     07) OPEN / CLOSE HELPERS
  ============================================================================= */
  function openDrawer() {
    const drawer = getDrawer();
    if (!drawer) return;

    syncHiddenContextFields({ method: 'email', auth_provider: 'email' });
    window.clearTimeout(closeTimer);
    drawer.classList.add('is-open');
    drawer.setAttribute('aria-hidden', 'false');
    document.documentElement.classList.add('account-email-auth-drawer-open');
  }

  function closeDrawer() {
    const drawer = getDrawer();
    if (!drawer) return;

    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    document.documentElement.classList.remove('account-email-auth-drawer-open');
  }

  /* =============================================================================
     07A) INNER ROUTE REQUEST HELPERS
  ============================================================================= */
  function requestInnerView(action) {
    if (!action) return;

    document.dispatchEvent(new CustomEvent('account-layer:view-request', {
      detail: {
        source: 'account-email-auth-drawer',
        action
      }
    }));
  }

  function requestProfileSetupView() {
    const emailInput = getEmailInput();
    const email = emailInput?.value?.trim() || '';

    if (!email) {
      emailInput?.setCustomValidity('Enter your email address.');
      emailInput?.reportValidity();
      return;
    }

    emailInput?.setCustomValidity('');

    document.dispatchEvent(new CustomEvent('account:profile-setup-open-request', {
      detail: {
        source: 'account-email-auth-drawer',
        action: 'profile-setup',
        method: getHiddenMethodInput()?.value?.trim() || 'email',
        auth_provider: getHiddenAuthProviderInput()?.value?.trim() || 'email',
        provider: getHiddenAuthProviderInput()?.value?.trim() || 'email',
        email
      }
    }));

    document.dispatchEvent(new CustomEvent('account-drawer:open-request', {
      detail: {
        source: 'account-email-auth-drawer',
        state: 'guest',
        surface: 'profile-setup',
        method: getHiddenMethodInput()?.value?.trim() || 'email',
        auth_provider: getHiddenAuthProviderInput()?.value?.trim() || 'email',
        provider: getHiddenAuthProviderInput()?.value?.trim() || 'email',
        email
      }
    }));
  }

  /* =============================================================================
     08) OPEN REQUEST BINDING
  ============================================================================= */
  function bindOpenRequests() {
    if (document.documentElement.dataset.accountEmailAuthDrawerOpenBound === 'true') return;
    document.documentElement.dataset.accountEmailAuthDrawerOpenBound = 'true';

    document.addEventListener('account-email-auth-drawer:open-request', () => {
      openDrawer();
    });
  }

  /* =============================================================================
     09) CLOSE REQUEST BINDING
  ============================================================================= */
  function bindCloseRequests() {
    if (document.documentElement.dataset.accountEmailAuthDrawerCloseBound === 'true') return;
    document.documentElement.dataset.accountEmailAuthDrawerCloseBound = 'true';

    document.addEventListener('account-email-auth-drawer:close-request', () => {
      closeDrawer();
    });
  }


  /* =============================================================================
     10) ROUTE REQUEST BINDING
  ============================================================================= */
  function bindRouteRequests() {
    if (document.documentElement.dataset.accountEmailAuthDrawerRouteBound === 'true') return;
    document.documentElement.dataset.accountEmailAuthDrawerRouteBound = 'true';

    const handleEmailAuthRoute = (event) => {
      const route = event?.detail?.route || event?.detail?.action || '';
      if (route !== 'email-auth') return;
      syncHiddenContextFields(event?.detail || {});
      openDrawer();
    };

    document.addEventListener('account-drawer:route', handleEmailAuthRoute);
    document.addEventListener('account-layer:route-request', handleEmailAuthRoute);
    document.addEventListener('account-layer:view-request', handleEmailAuthRoute);
  }

  /* =============================================================================
     10A) INNER ROUTE CONTROLS
  ============================================================================= */
  function bindInnerRouteControls() {
    if (document.documentElement.dataset.accountEmailAuthDrawerInnerRouteBound === 'true') return;
    document.documentElement.dataset.accountEmailAuthDrawerInnerRouteBound = 'true';

    document.addEventListener('click', (event) => {
      const drawer = getDrawer();
      if (!drawer || !drawer.classList.contains('is-open')) return;

      const target = event.target;
      if (!(target instanceof Element)) return;

      const signInControl = target.closest('[data-account-sign-in-open], [data-account-route="sign-in"]');
      const entryControl = target.closest('[data-account-route="entry"]');
      const signUpControl = target.closest('[data-account-route="sign-up"]');
      const phoneControl = target.closest('[data-account-route="phone-auth"]');
      const appleControl = target.closest('[data-account-route="provider-apple"]');
      const googleControl = target.closest('[data-account-route="provider-google"]');

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

      if (phoneControl) {
        event.preventDefault();
        event.stopPropagation();
        requestInnerView('phone-auth');
        return;
      }

      if (appleControl) {
        event.preventDefault();
        event.stopPropagation();
        syncHiddenContextFields({ method: 'apple', auth_provider: 'apple' });
        requestInnerView('provider-apple');
        return;
      }

      if (googleControl) {
        event.preventDefault();
        event.stopPropagation();
        requestGoogleProviderLogin();
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
     10B) PROVIDER REQUEST HELPERS
  ============================================================================= */
  function requestGoogleProviderLogin() {
    syncHiddenContextFields({ method: 'google', auth_provider: 'google' });
    const supabase = getSupabaseClient();

    if (supabase) {
      const redirectTo = `${window.location.origin}/profile.html`;
      supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo
        }
      }).catch((error) => {
        console.error('[Neuroartan][Account Email Auth Drawer] Google sign-in failed.', error);
      });
      return;
    }

    requestInnerView('provider-google');
  }

  /* =============================================================================
     10C) FORM SUBMIT BINDING
  ============================================================================= */
  function bindFormSubmit() {
    if (document.documentElement.dataset.accountEmailAuthDrawerFormBound === 'true') return;
    document.documentElement.dataset.accountEmailAuthDrawerFormBound = 'true';

    document.addEventListener('submit', (event) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) return;
      if (form !== getForm()) return;

      event.preventDefault();
      event.stopPropagation();
      requestProfileSetupView();
    });
  }

  /* =============================================================================
     11) ESCAPE BINDING
  ============================================================================= */
  function bindEscape() {
    if (document.documentElement.dataset.accountEmailAuthDrawerEscapeBound === 'true') return;
    document.documentElement.dataset.accountEmailAuthDrawerEscapeBound = 'true';

    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      const drawer = getDrawer();
      if (!drawer || !drawer.classList.contains('is-open')) return;
      closeDrawer();
    });
  }

  /* =============================================================================
     12) EVENT REBINDING
  ============================================================================= */
  function bindMountEvents() {
    if (mountEventsBound) return;
    mountEventsBound = true;

    window.addEventListener('fragment:mounted', () => {
      if (!getDrawer()) return;

      document.documentElement.dataset.accountEmailAuthDrawerInitialized = 'false';
      init({ preserveState: true });
    });
  }

  /* =============================================================================
     13) BOOTSTRAP
  ============================================================================= */
  function init(options = {}) {
    if (document.documentElement.dataset.accountEmailAuthDrawerInitialized === 'true' && getDrawer()) return;
    document.documentElement.dataset.accountEmailAuthDrawerInitialized = 'true';

    normalizeStateVisibility();
    if (!options.preserveState) {
      syncHiddenContextFields({ method: 'email', auth_provider: 'email' });
    }

    const drawer = getDrawer();
    if (drawer) {
      if (!drawer.hasAttribute('aria-hidden')) {
        drawer.setAttribute('aria-hidden', 'true');
      }
      drawer.dataset.moduleId = 'account-email-auth-drawer';
      drawer.dataset.modulePath = '/website/docs/assets/js/layers/website/overlays/account/account-email-auth-drawer.js';
    }

    bindOpenRequests();
    bindCloseRequests();
    bindRouteRequests();
    bindInnerRouteControls();
    bindFormSubmit();
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
     14) END OF FILE
  ============================================================================= */
})();
