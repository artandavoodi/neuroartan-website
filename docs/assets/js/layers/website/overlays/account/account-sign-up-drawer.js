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
   10) GLOBAL CLICK BINDING
   11) ROUTE REQUEST BINDING
   11A) INNER ROUTE CONTROLS
   11B) PROVIDER REQUEST HELPERS
   11C) FORM SUBMIT BINDING
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
     04) DRAWER QUERY HELPERS
  ============================================================================= */
  function getDrawer() {
    return document.getElementById('account-sign-up-drawer');
  }

  function getMount() {
    return document.querySelector('[data-include="account-sign-up-drawer"]');
  }

  function getForm() {
    return document.querySelector('[data-account-sign-up-form="true"]');
  }

  function getNameInput() {
    return document.getElementById('account-sign-up-name');
  }

  function getEmailInput() {
    return document.getElementById('account-sign-up-email');
  }

  function getPasswordInput() {
    return document.getElementById('account-sign-up-password');
  }

  /* =============================================================================
     05) HIDDEN CONTEXT FIELD HELPERS
  ============================================================================= */
  function getHiddenMethodInput() {
    return document.querySelector('#account-sign-up-method');
  }

  function getHiddenAuthProviderInput() {
    return document.querySelector('#account-sign-up-auth-provider');
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
    document.documentElement.classList.add('account-sign-up-drawer-open');
  }

  function closeDrawer() {
    const drawer = getDrawer();
    if (!drawer) return;

    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    document.documentElement.classList.remove('account-sign-up-drawer-open');
  }

  /* =============================================================================
     07A) INNER ROUTE REQUEST HELPERS
  ============================================================================= */
  function requestInnerView(action) {
    if (!action) return;

    document.dispatchEvent(new CustomEvent('account-layer:view-request', {
      detail: {
        source: 'account-sign-up-drawer',
        action
      }
    }));
  }

  /* =============================================================================
     08) OPEN REQUEST BINDING
  ============================================================================= */
  function bindOpenRequests() {
    if (document.documentElement.dataset.accountSignUpDrawerOpenBound === 'true') return;
    document.documentElement.dataset.accountSignUpDrawerOpenBound = 'true';

    document.addEventListener('account-sign-up-drawer:open-request', () => {
      openDrawer();
    });
  }

  /* =============================================================================
     09) CLOSE REQUEST BINDING
  ============================================================================= */
  function bindCloseRequests() {
    if (document.documentElement.dataset.accountSignUpDrawerCloseBound === 'true') return;
    document.documentElement.dataset.accountSignUpDrawerCloseBound = 'true';

    document.addEventListener('account-sign-up-drawer:close-request', () => {
      closeDrawer();
    });
  }

  /* =============================================================================
     10) GLOBAL CLICK BINDING
  ============================================================================= */
  function bindGlobalClicks() {
    if (document.documentElement.dataset.accountSignUpDrawerGlobalClickBound === 'true') return;
    document.documentElement.dataset.accountSignUpDrawerGlobalClickBound = 'true';

    document.addEventListener('click', (event) => {
      const drawer = getDrawer();
      if (!drawer || !drawer.classList.contains('is-open')) return;

      const target = event.target;
      if (!(target instanceof Element)) return;
      if (drawer.contains(target)) return;
      if (target.closest('[data-account-sign-up-open]')) return;
      if (target.closest('[data-account-sign-in-open]')) return;
      if (target.closest('[data-account-route]')) return;

      closeDrawer();
    });
  }

  /* =============================================================================
     11) ROUTE REQUEST BINDING
  ============================================================================= */
  function bindRouteRequests() {
    if (document.documentElement.dataset.accountSignUpDrawerRouteBound === 'true') return;
    document.documentElement.dataset.accountSignUpDrawerRouteBound = 'true';

    const handleSignUpRoute = (event) => {
      const route = event?.detail?.route || event?.detail?.action || '';
      if (route !== 'sign-up') return;
      syncHiddenContextFields(event?.detail || {});
      openDrawer();
    };

    document.addEventListener('account-drawer:route', handleSignUpRoute);
    document.addEventListener('account-layer:route-request', handleSignUpRoute);
    document.addEventListener('account-layer:view-request', handleSignUpRoute);
  }

  /* =============================================================================
     11A) INNER ROUTE CONTROLS
  ============================================================================= */
  function bindInnerRouteControls() {
    if (document.documentElement.dataset.accountSignUpDrawerInnerRouteBound === 'true') return;
    document.documentElement.dataset.accountSignUpDrawerInnerRouteBound = 'true';

    document.addEventListener('click', (event) => {
      const drawer = getDrawer();
      if (!drawer || !drawer.classList.contains('is-open')) return;

      const target = event.target;
      if (!(target instanceof Element)) return;

      const signInControl = target.closest('[data-account-sign-in-open], [data-account-route="sign-in"]');
      const entryControl = target.closest('[data-account-route="entry"]');
      const emailControl = target.closest('[data-account-route="email-auth"]');
      const phoneControl = target.closest('[data-account-route="phone-auth"]');
      const appleControl = target.closest('[data-account-route="provider-apple"]');
      const googleControl = target.closest('[data-account-route="provider-google"]');

      if (signInControl) {
        event.preventDefault();
        event.stopPropagation();
        requestInnerView('sign-in');
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
     11B) PROVIDER REQUEST HELPERS
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
        console.error('[Neuroartan][Account Sign-Up Drawer] Google sign-in failed.', error);
      });
      return;
    }

    requestInnerView('provider-google');
  }

  /* =============================================================================
     11C) FORM SUBMIT BINDING
  ============================================================================= */
  function bindFormSubmit() {
    if (document.documentElement.dataset.accountSignUpDrawerFormBound === 'true') return;
    document.documentElement.dataset.accountSignUpDrawerFormBound = 'true';

    document.addEventListener('submit', (event) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) return;
      if (form !== getForm()) return;

      event.preventDefault();
      event.stopPropagation();

      const nameInput = getNameInput();
      const emailInput = getEmailInput();
      const passwordInput = getPasswordInput();
      const name = nameInput?.value?.trim() || '';
      const email = emailInput?.value?.trim() || '';
      const password = passwordInput?.value || '';

      if (!name) {
        nameInput?.setCustomValidity('Enter your name.');
        nameInput?.reportValidity();
        return;
      }

      if (!email) {
        emailInput?.setCustomValidity('Enter your email address.');
        emailInput?.reportValidity();
        return;
      }

      if (!password) {
        passwordInput?.setCustomValidity('Create a password.');
        passwordInput?.reportValidity();
        return;
      }

      nameInput?.setCustomValidity('');
      emailInput?.setCustomValidity('');
      passwordInput?.setCustomValidity('');

      document.dispatchEvent(new CustomEvent('account:profile-setup-open-request', {
        detail: {
          source: 'account-sign-up-drawer',
          action: 'profile-setup',
          method: getHiddenMethodInput()?.value?.trim() || 'email',
          auth_provider: getHiddenAuthProviderInput()?.value?.trim() || 'email',
          provider: getHiddenAuthProviderInput()?.value?.trim() || 'email',
          name,
          display_name: name,
          email,
          password,
          password_confirm: password
        }
      }));

      document.dispatchEvent(new CustomEvent('account-drawer:open-request', {
        detail: {
          source: 'account-sign-up-drawer',
          state: 'guest',
          surface: 'profile-setup',
          method: getHiddenMethodInput()?.value?.trim() || 'email',
          auth_provider: getHiddenAuthProviderInput()?.value?.trim() || 'email',
          provider: getHiddenAuthProviderInput()?.value?.trim() || 'email',
          email
        }
      }));
    });
  }

  /* =============================================================================
     12) ESCAPE BINDING
  ============================================================================= */
  function bindEscape() {
    if (document.documentElement.dataset.accountSignUpDrawerEscapeBound === 'true') return;
    document.documentElement.dataset.accountSignUpDrawerEscapeBound = 'true';

    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      const drawer = getDrawer();
      if (!drawer || !drawer.classList.contains('is-open')) return;
      closeDrawer();
    });
  }

  /* =============================================================================
     13) EVENT REBINDING
  ============================================================================= */
  function bindMountEvents() {
    if (mountEventsBound) return;
    mountEventsBound = true;

    window.addEventListener('fragment:mounted', () => {
      if (!getDrawer()) return;

      document.documentElement.dataset.accountSignUpDrawerInitialized = 'false';
      init({ preserveState: true });
    });
  }

  /* =============================================================================
     14) BOOTSTRAP
  ============================================================================= */
  function init(options = {}) {
    if (document.documentElement.dataset.accountSignUpDrawerInitialized === 'true' && getDrawer()) return;
    document.documentElement.dataset.accountSignUpDrawerInitialized = 'true';

    normalizeStateVisibility();
    if (!options.preserveState) {
      syncHiddenContextFields({ method: 'email', auth_provider: 'email' });
    }

    const drawer = getDrawer();
    if (drawer) {
      if (!drawer.hasAttribute('aria-hidden')) {
        drawer.setAttribute('aria-hidden', 'true');
      }
      drawer.dataset.moduleId = 'account-sign-up-drawer';
      drawer.dataset.modulePath = '/website/docs/assets/js/layers/website/overlays/account/account-sign-up-drawer.js';
    }

    bindOpenRequests();
    bindCloseRequests();
    bindGlobalClicks();
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
     15) END OF FILE
  ============================================================================= */
})();
