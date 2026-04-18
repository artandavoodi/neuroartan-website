/* =============================================================================
   00) FILE INDEX
   01) MODULE IDENTITY
   02) STATE
   03) DRAWER QUERY HELPERS
   04) STATE VISIBILITY HELPERS
   05) OPEN / CLOSE HELPERS
   06) OPEN REQUEST BINDING
   07) CLOSE REQUEST BINDING
   08) GLOBAL CLICK BINDING
   09) ROUTE REQUEST BINDING
   09A) INNER ROUTE CONTROLS
   10) ESCAPE BINDING
   11) EVENT REBINDING
   12) BOOTSTRAP
   13) END OF FILE
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
     05A) INNER ROUTE REQUEST HELPERS
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
     06) OPEN REQUEST BINDING
  ============================================================================= */
  function bindOpenRequests() {
    if (document.documentElement.dataset.accountSignUpDrawerOpenBound === 'true') return;
    document.documentElement.dataset.accountSignUpDrawerOpenBound = 'true';

    document.addEventListener('account-sign-up-drawer:open-request', () => {
      openDrawer();
    });
  }

  /* =============================================================================
     07) CLOSE REQUEST BINDING
  ============================================================================= */
  function bindCloseRequests() {
    if (document.documentElement.dataset.accountSignUpDrawerCloseBound === 'true') return;
    document.documentElement.dataset.accountSignUpDrawerCloseBound = 'true';

    document.addEventListener('account-sign-up-drawer:close-request', () => {
      closeDrawer();
    });
  }

  /* =============================================================================
     08) GLOBAL CLICK BINDING
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
     09) ROUTE REQUEST BINDING
  ============================================================================= */
  function bindRouteRequests() {
    if (document.documentElement.dataset.accountSignUpDrawerRouteBound === 'true') return;
    document.documentElement.dataset.accountSignUpDrawerRouteBound = 'true';

    const handleSignUpRoute = (event) => {
      const route = event?.detail?.route || event?.detail?.action || '';
      if (route !== 'sign-up') return;
      openDrawer();
    };

    document.addEventListener('account-drawer:route', handleSignUpRoute);
    document.addEventListener('account-layer:route-request', handleSignUpRoute);
    document.addEventListener('account-layer:view-request', handleSignUpRoute);
  }

  /* =============================================================================
     09A) INNER ROUTE CONTROLS
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
     09B) FORM SUBMIT BINDING
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
          method: 'email',
          provider: 'email',
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
          method: 'email',
          provider: 'email',
          email
        }
      }));
    });
  }

  /* =============================================================================
     10) ESCAPE BINDING
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
     11) EVENT REBINDING
  ============================================================================= */
  function bindMountEvents() {
    if (mountEventsBound) return;
    mountEventsBound = true;

    document.addEventListener('fragment:mounted', (event) => {
      const name = event?.detail?.name || '';
      if (name !== 'account-sign-up-drawer') return;

      document.documentElement.dataset.accountSignUpDrawerInitialized = 'false';
      init();
    });
  }

  /* =============================================================================
     12) BOOTSTRAP
  ============================================================================= */
  function init() {
    if (document.documentElement.dataset.accountSignUpDrawerInitialized === 'true' && getDrawer()) return;
    document.documentElement.dataset.accountSignUpDrawerInitialized = 'true';

    normalizeStateVisibility();

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
     13) END OF FILE
  ============================================================================= */
})();
