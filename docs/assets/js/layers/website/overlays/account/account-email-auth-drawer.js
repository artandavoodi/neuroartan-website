/* =============================================================================
   00) FILE INDEX
   01) MODULE IDENTITY
   02) STATE
   03) DRAWER QUERY HELPERS
   04) STATE VISIBILITY HELPERS
   05) OPEN / CLOSE HELPERS
   05A) INNER ROUTE REQUEST HELPERS
   06) OPEN REQUEST BINDING
   07) CLOSE REQUEST BINDING
   08) ROUTE REQUEST BINDING
   08A) INNER ROUTE CONTROLS
   08B) FORM SUBMIT BINDING
   09) ESCAPE BINDING
   10) EVENT REBINDING
   11) BOOTSTRAP
   12) END OF FILE
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
     03) DRAWER QUERY HELPERS
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
     04) STATE VISIBILITY HELPERS
  ============================================================================= */
  function normalizeStateVisibility() {
    const drawer = getDrawer();
    if (!drawer) return;

    const isOpen = drawer.classList.contains('is-open');
    drawer.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
  }

  /* =============================================================================
     05) OPEN / CLOSE HELPERS
  ============================================================================= */
  function openDrawer() {
    const drawer = getDrawer();
    if (!drawer) return;

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
     05A) INNER ROUTE REQUEST HELPERS
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
        method: 'email',
        provider: 'email',
        email
      }
    }));

    document.dispatchEvent(new CustomEvent('account-drawer:open-request', {
      detail: {
        source: 'account-email-auth-drawer',
        state: 'guest',
        surface: 'profile-setup',
        method: 'email',
        provider: 'email',
        email
      }
    }));
  }

  /* =============================================================================
     06) OPEN REQUEST BINDING
  ============================================================================= */
  function bindOpenRequests() {
    if (document.documentElement.dataset.accountEmailAuthDrawerOpenBound === 'true') return;
    document.documentElement.dataset.accountEmailAuthDrawerOpenBound = 'true';

    document.addEventListener('account-email-auth-drawer:open-request', () => {
      openDrawer();
    });
  }

  /* =============================================================================
     07) CLOSE REQUEST BINDING
  ============================================================================= */
  function bindCloseRequests() {
    if (document.documentElement.dataset.accountEmailAuthDrawerCloseBound === 'true') return;
    document.documentElement.dataset.accountEmailAuthDrawerCloseBound = 'true';

    document.addEventListener('account-email-auth-drawer:close-request', () => {
      closeDrawer();
    });
  }


  /* =============================================================================
     08) ROUTE REQUEST BINDING
  ============================================================================= */
  function bindRouteRequests() {
    if (document.documentElement.dataset.accountEmailAuthDrawerRouteBound === 'true') return;
    document.documentElement.dataset.accountEmailAuthDrawerRouteBound = 'true';

    const handleEmailAuthRoute = (event) => {
      const route = event?.detail?.route || event?.detail?.action || '';
      if (route !== 'email-auth') return;
      openDrawer();
    };

    document.addEventListener('account-drawer:route', handleEmailAuthRoute);
    document.addEventListener('account-layer:route-request', handleEmailAuthRoute);
    document.addEventListener('account-layer:view-request', handleEmailAuthRoute);
  }

  /* =============================================================================
     08A) INNER ROUTE CONTROLS
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
        requestInnerView('provider-apple');
        return;
      }

      if (googleControl) {
        event.preventDefault();
        event.stopPropagation();
        requestInnerView('provider-google');
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
     08B) FORM SUBMIT BINDING
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
     09) ESCAPE BINDING
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
     10) EVENT REBINDING
  ============================================================================= */
  function bindMountEvents() {
    if (mountEventsBound) return;
    mountEventsBound = true;

    document.addEventListener('fragment:mounted', (event) => {
      const name = event?.detail?.name || '';
      if (name !== 'account-email-auth-drawer') return;

      document.documentElement.dataset.accountEmailAuthDrawerInitialized = 'false';
      init();
    });
  }

  /* =============================================================================
     11) BOOTSTRAP
  ============================================================================= */
  function init() {
    if (document.documentElement.dataset.accountEmailAuthDrawerInitialized === 'true' && getDrawer()) return;
    document.documentElement.dataset.accountEmailAuthDrawerInitialized = 'true';

    normalizeStateVisibility();

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
     12) END OF FILE
  ============================================================================= */
})();
