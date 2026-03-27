/* =============================================================================
   00) FILE INDEX
   01) MODULE IDENTITY
   02) DOM HELPERS
   03) DRAWER QUERIES
   04) STATE FLAGS
   04A) TIMING CONSTANTS
   05) CLOSE CONTROL QUERIES
   06) OPEN STATE APPLICATION
   07) CLOSE STATE APPLICATION
   08) ESCAPE KEY BINDING
   09) CLOSE CONTROL BINDING
   10) OPEN REQUEST BINDING
   11) INITIALIZATION
============================================================================= */

/* =============================================================================
   01) MODULE IDENTITY
============================================================================= */
(() => {
  'use strict';

  /* =============================================================================
     02) DOM HELPERS
  ============================================================================= */
  function q(selector, root = document) {
    return root.querySelector(selector);
  }

  function qa(selector, root = document) {
    return Array.from(root.querySelectorAll(selector));
  }

  /* =============================================================================
     03) DRAWER QUERIES
  ============================================================================= */
  function getDrawer() {
    return q('[data-account-drawer="true"]');
  }

  function getDrawerShell() {
    const drawer = getDrawer();
    return drawer ? q('.account-drawer-shell', drawer) : null;
  }

  function clearCloseTimer() {
    if (!closeTimer) return;
    window.clearTimeout(closeTimer);
    closeTimer = null;
  }

  /* =============================================================================
     04) STATE FLAGS
  ============================================================================= */
  let isOpen = false;
  let isBound = false;

  /* =============================================================================
     04A) TIMING CONSTANTS
  ============================================================================= */
  const CLOSE_DURATION_MS = 460;
  let closeTimer = null;

  /* =============================================================================
     05) CLOSE CONTROL QUERIES
  ============================================================================= */
  function getCloseControls() {
    const drawer = getDrawer();
    return drawer ? qa('[data-account-drawer-close="true"]', drawer) : [];
  }

  /* =============================================================================
     06) OPEN STATE APPLICATION
  ============================================================================= */
  function openDrawer() {
    const drawer = getDrawer();
    if (!drawer) return;

    clearCloseTimer();
    drawer.removeAttribute('hidden');
    drawer.setAttribute('aria-hidden', 'false');
    drawer.dataset.accountDrawerState = 'open';
    document.body.classList.remove('account-drawer-closing');
    document.body.classList.add('account-drawer-open');
    isOpen = true;

    document.dispatchEvent(new CustomEvent('account-drawer:opened', {
      detail: {
        source: 'account-drawer'
      }
    }));
  }

  /* =============================================================================
     07) CLOSE STATE APPLICATION
  ============================================================================= */
  function closeDrawer() {
    const drawer = getDrawer();
    if (!drawer) return;

    clearCloseTimer();
    drawer.dataset.accountDrawerState = 'closing';
    document.body.classList.remove('account-drawer-open');
    document.body.classList.add('account-drawer-closing');
    drawer.setAttribute('aria-hidden', 'true');
    isOpen = false;

    closeTimer = window.setTimeout(() => {
      drawer.dataset.accountDrawerState = 'closed';
      drawer.setAttribute('hidden', 'hidden');
      document.body.classList.remove('account-drawer-closing');
      closeTimer = null;

      document.dispatchEvent(new CustomEvent('account-drawer:closed', {
        detail: {
          source: 'account-drawer'
        }
      }));
    }, CLOSE_DURATION_MS);
  }

  /* =============================================================================
     08) ESCAPE KEY BINDING
  ============================================================================= */
  function bindEscapeKey() {
    if (document.documentElement.dataset.accountDrawerEscapeBound === 'true') return;
    document.documentElement.dataset.accountDrawerEscapeBound = 'true';

    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      if (!isOpen) return;
      closeDrawer();
    });
  }

  /* =============================================================================
     09) CLOSE CONTROL BINDING
  ============================================================================= */
  function bindCloseControls() {
    getCloseControls().forEach((control) => {
      if (control.dataset.accountDrawerCloseBound === 'true') return;
      control.dataset.accountDrawerCloseBound = 'true';

      control.addEventListener('click', (event) => {
        event.preventDefault();
        closeDrawer();
      });
    });
  }

  /* =============================================================================
     10) OPEN REQUEST BINDING
  ============================================================================= */
  function bindOpenRequests() {
    if (document.documentElement.dataset.accountDrawerOpenRequestBound === 'true') return;
    document.documentElement.dataset.accountDrawerOpenRequestBound = 'true';

    document.addEventListener('account-drawer:open-request', () => {
      openDrawer();
    });
  }

  /* =============================================================================
     11) INITIALIZATION
  ============================================================================= */
  function initAccountDrawer() {
    const drawer = getDrawer();
    const shell = getDrawerShell();
    if (!drawer || !shell) return;
    if (isBound) return;

    drawer.setAttribute('aria-hidden', 'true');
    drawer.setAttribute('hidden', 'hidden');
    drawer.dataset.accountDrawerState = 'closed';
    isBound = true;

    bindEscapeKey();
    bindCloseControls();
    bindOpenRequests();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAccountDrawer, { once: true });
  } else {
    initAccountDrawer();
  }

  document.addEventListener('account-drawer:mounted', initAccountDrawer);
})();