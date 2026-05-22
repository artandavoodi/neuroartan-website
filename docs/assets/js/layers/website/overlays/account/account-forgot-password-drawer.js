/* =============================================================================
   00) FILE INDEX
   01) MODULE IDENTITY
   02) STATE
   03) QUERY HELPERS
   04) VIEW HELPERS
   05) TIMER HELPERS
   05A) INNER ROUTE REQUEST HELPERS
   06) OPEN REQUEST BINDING
   07) CLOSE REQUEST BINDING
   08) ROUTE REQUEST BINDING
   08A) INNER ROUTE CONTROLS
   09) ESCAPE BINDING
   10) BOOTSTRAP
   11) END OF FILE
============================================================================= */

/* =============================================================================
   01) MODULE IDENTITY
============================================================================= */
(() => {
  const MODULE_ID = 'account-forgot-password-drawer';
  const MODULE_PATH = '/website/docs/assets/js/layers/website/overlays/account/account-forgot-password-drawer.js';

  /* =============================================================================
     02) STATE
  ============================================================================= */
  const OPEN_CLASS = 'is-open';
  const ROUTE_NAME = 'forgot-password';
  const DEFAULT_ROUTE = 'sign-in';
  let closeTimer = null;

  /* =============================================================================
     03) QUERY HELPERS
  ============================================================================= */
  function q(selector, root = document) {
    return root.querySelector(selector);
  }

  function getDrawer() {
    return q('[data-account-forgot-password-drawer="true"]');
  }

  function getForm() {
    return q('[data-account-forgot-password-form="true"]', getDrawer() || document);
  }

  function getInput() {
    return q('#account-forgot-password-email', getDrawer() || document);
  }

  /* =============================================================================
     04) VIEW HELPERS
  ============================================================================= */
  function clearCloseTimer() {
    if (!closeTimer) return;
    window.clearTimeout(closeTimer);
    closeTimer = null;
  }

  function setOpenState(isOpen) {
    const drawer = getDrawer();
    if (!drawer) return;

    if (isOpen) {
      drawer.hidden = false;
      drawer.classList.add(OPEN_CLASS);
      drawer.setAttribute('aria-hidden', 'false');
      return;
    }

    drawer.classList.remove(OPEN_CLASS);
    drawer.setAttribute('aria-hidden', 'true');
    drawer.hidden = true;
  }

  function openDrawer() {
    clearCloseTimer();
    setOpenState(true);
  }

  function closeDrawer() {
    clearCloseTimer();
    setOpenState(false);
  }

  function focusPrimaryField() {
    const input = getInput();
    if (!input) return;
    window.requestAnimationFrame(() => {
      input.focus();
      input.select?.();
    });
  }

  /* =============================================================================
     05) TIMER HELPERS
  ============================================================================= */
  function scheduleFocusPrimaryField() {
    window.requestAnimationFrame(() => {
      focusPrimaryField();
    });
  }

  /* =============================================================================
     05A) INNER ROUTE REQUEST HELPERS
  ============================================================================= */
  function requestInnerRoute(route) {
    document.dispatchEvent(new CustomEvent('account:route-request', {
      detail: {
        route,
        source: MODULE_ID
      }
    }));
  }

  /* =============================================================================
     06) OPEN REQUEST BINDING
  ============================================================================= */
  function bindOpenRequests() {
    if (document.documentElement.dataset.accountForgotPasswordDrawerOpenBound === 'true') return;
    document.documentElement.dataset.accountForgotPasswordDrawerOpenBound = 'true';

    const handleForgotPasswordOpenRequest = (event) => {
      const route = event?.detail?.route;
      const action = event?.detail?.action;

      if (route !== ROUTE_NAME && action !== ROUTE_NAME) return;
      openDrawer();
      scheduleFocusPrimaryField();
    };

    document.addEventListener('account:route-request', handleForgotPasswordOpenRequest);
    document.addEventListener('account-layer:view-request', handleForgotPasswordOpenRequest);
    document.addEventListener('account-layer:route-request', handleForgotPasswordOpenRequest);
  }

  /* =============================================================================
     07) CLOSE REQUEST BINDING
  ============================================================================= */
  function bindCloseRequests() {
    if (document.documentElement.dataset.accountForgotPasswordDrawerCloseBound === 'true') return;
    document.documentElement.dataset.accountForgotPasswordDrawerCloseBound = 'true';

    document.addEventListener('account:close-all', () => {
      closeDrawer();
    });
  }

  /* =============================================================================
     08) ROUTE REQUEST BINDING
  ============================================================================= */
  function bindRouteRequests() {
    if (document.documentElement.dataset.accountForgotPasswordDrawerRouteBound === 'true') return;
    document.documentElement.dataset.accountForgotPasswordDrawerRouteBound = 'true';

    document.addEventListener('click', (event) => {
      const trigger = event.target instanceof Element
        ? event.target.closest('[data-account-forgot-password-sign-in="true"]')
        : null;

      if (!trigger) return;
      event.preventDefault();
      requestInnerRoute('sign-in');
    });
  }

  /* =============================================================================
     08A) INNER ROUTE CONTROLS
  ============================================================================= */
  function bindInnerRouteControls() {
    if (document.documentElement.dataset.accountForgotPasswordDrawerInnerRouteBound === 'true') return;
    document.documentElement.dataset.accountForgotPasswordDrawerInnerRouteBound = 'true';

    document.addEventListener('click', (event) => {
      const backControl = event.target instanceof Element
        ? event.target.closest('[data-account-forgot-password-back="true"]')
        : null;

      if (!backControl) return;
      event.preventDefault();
      requestInnerRoute(DEFAULT_ROUTE);
    });

    document.addEventListener('submit', (event) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) return;
      if (form !== getForm()) return;

      event.preventDefault();
      document.dispatchEvent(new CustomEvent('account:forgot-password-submit', {
        detail: {
          source: MODULE_ID,
          identity: getInput()?.value?.trim() || ''
        }
      }));
    });
  }

  /* =============================================================================
     09) ESCAPE BINDING
  ============================================================================= */
  function bindEscape() {
    if (document.documentElement.dataset.accountForgotPasswordDrawerEscapeBound === 'true') return;
    document.documentElement.dataset.accountForgotPasswordDrawerEscapeBound = 'true';

    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      const drawer = getDrawer();
      if (!drawer || drawer.hidden) return;
      event.preventDefault();
      requestInnerRoute(DEFAULT_ROUTE);
    });
  }


  /* =============================================================================
     10) BOOTSTRAP
  ============================================================================= */
  function init() {
    if (document.documentElement.dataset.accountForgotPasswordDrawerInitialized === 'true') return;

    document.documentElement.dataset.accountForgotPasswordDrawerInitialized = 'true';

    bindOpenRequests();
    bindCloseRequests();
    bindRouteRequests();
    bindInnerRouteControls();
    bindEscape();
  }


  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

  /* =============================================================================
     11) END OF FILE
  ============================================================================= */
})();
