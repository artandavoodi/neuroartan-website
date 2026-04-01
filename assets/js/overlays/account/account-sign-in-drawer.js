/* =============================================================================
   00) FILE INDEX
   01) MODULE IDENTITY
   02) STATE
   03) DRAWER QUERY HELPERS
   04) OPEN / CLOSE HELPERS
   05) STATE VISIBILITY
   06) PUBLIC OPEN REQUESTS
   07) PUBLIC CLOSE REQUESTS
   08) GLOBAL CLICK BINDING
   09) ROUTE REQUEST BINDING
   10) ESCAPE BINDING
   11) INITIALIZATION
============================================================================= */

/* =============================================================================
   01) MODULE IDENTITY
============================================================================= */
(() => {
  const MODULE_ID = 'account-sign-in-drawer';

  /* =============================================================================
     02) STATE
  ============================================================================= */
  const OPEN_CLASS = 'account-sign-in-drawer-open';
  const CLOSING_CLASS = 'account-sign-in-drawer-closing';
  const CLOSE_DURATION_MS = 460;
  const ROUTE_ACTION_SIGN_IN = 'sign-in';
  const ROUTE_ACTION_ENTRY = 'entry';
  const ROUTE_ACTION_APPLE = 'apple';
  const ROUTE_ACTION_GOOGLE = 'google';

  let closeTimer = null;

  /* =============================================================================
     03) DRAWER QUERY HELPERS
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
     04) OPEN / CLOSE HELPERS
  ============================================================================= */
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
    }, CLOSE_DURATION_MS);

    document.dispatchEvent(new CustomEvent('account-sign-in-drawer:closed', {
      detail: {
        reason,
        module: MODULE_ID
      }
    }));
  }

  /* =============================================================================
     05) STATE VISIBILITY
  ============================================================================= */
  function normalizeStateVisibility() {
    getStateSections().forEach((section) => {
      section.hidden = false;
    });
  }

  /* =============================================================================
     06) PUBLIC OPEN REQUESTS
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
     07) PUBLIC CLOSE REQUESTS
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
     08) GLOBAL CLICK BINDING
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
            form: getForm()
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

        document.dispatchEvent(new CustomEvent('account-layer:route-request', {
          detail: {
            source: MODULE_ID,
            action: ROUTE_ACTION_APPLE
          }
        }));

        const drawer = getDrawer();
        if (drawer) {
          clearCloseTimer();
          document.body.classList.remove(OPEN_CLASS);
          document.body.classList.remove(CLOSING_CLASS);
          drawer.setAttribute('aria-hidden', 'true');
        }
        return;
      }

      const googleControl = event.target instanceof Element
        ? event.target.closest('[data-account-sign-in-google="true"]')
        : null;

      if (googleControl) {
        event.preventDefault();
        event.stopPropagation();

        document.dispatchEvent(new CustomEvent('account-layer:route-request', {
          detail: {
            source: MODULE_ID,
            action: ROUTE_ACTION_GOOGLE
          }
        }));

        const drawer = getDrawer();
        if (drawer) {
          clearCloseTimer();
          document.body.classList.remove(OPEN_CLASS);
          document.body.classList.remove(CLOSING_CLASS);
          drawer.setAttribute('aria-hidden', 'true');
        }
        return;
      }

      const forgotPasswordControl = event.target instanceof Element
        ? event.target.closest('[data-account-sign-in-forgot-password="true"]')
        : null;

      if (forgotPasswordControl) {
        event.preventDefault();
        document.dispatchEvent(new CustomEvent('account-sign-in:forgot-password-request', {
          detail: {
            source: MODULE_ID
          }
        }));
        return;
      }

      const backControl = event.target instanceof Element
        ? event.target.closest('[data-account-sign-in-back="true"]')
        : null;

      if (backControl) {
        event.preventDefault();
        event.stopPropagation();

        document.dispatchEvent(new CustomEvent('account-layer:route-request', {
          detail: {
            source: MODULE_ID,
            action: ROUTE_ACTION_ENTRY
          }
        }));

        const drawer = getDrawer();
        if (drawer) {
          clearCloseTimer();
          document.body.classList.remove(OPEN_CLASS);
          document.body.classList.remove(CLOSING_CLASS);
          drawer.setAttribute('aria-hidden', 'true');
        }
        return;
      }
    });
  }

  /* =============================================================================
     09) ROUTE REQUEST BINDING
  ============================================================================= */
  function bindRouteRequests() {
    if (document.documentElement.dataset.accountSignInDrawerRouteBound === 'true') return;
    document.documentElement.dataset.accountSignInDrawerRouteBound = 'true';

    document.addEventListener('account-layer:route-request', (event) => {
      if (!(event instanceof CustomEvent)) return;
      const action = event.detail?.action;
      if (action !== ROUTE_ACTION_SIGN_IN) return;

      normalizeStateVisibility();
      openDrawer('route-sign-in');
    });
  }

  /* =============================================================================
     10) ESCAPE BINDING
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
     11) INITIALIZATION
  ============================================================================= */
  function init() {
    if (document.documentElement.dataset.accountSignInDrawerInitialized === 'true') return;
    document.documentElement.dataset.accountSignInDrawerInitialized = 'true';

    normalizeStateVisibility();
    bindOpenRequests();
    bindCloseRequests();
    bindGlobalClicks();
    bindRouteRequests();
    bindEscape();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();