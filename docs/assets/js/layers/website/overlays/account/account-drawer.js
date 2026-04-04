/* =============================================================================
   00) FILE INDEX
   01) MODULE IDENTITY
   02) STATE
   03) QUERY HELPERS
   04) VIEW HELPERS
   05) TIMER HELPERS
   06) OPEN / CLOSE STATE
   07) TRIGGER MATCHING
   08) GLOBAL CLICK BINDING
   09) GLOBAL REQUEST BINDING
   10) ESCAPE BINDING
   11) ENTRY-LAYER ROUTING HELPERS
   12) INITIALIZATION
============================================================================= */

(() => {
  /* =============================================================================
     01) MODULE IDENTITY
  ============================================================================= */
  const MODULE_ID = 'account-drawer';

  /* =============================================================================
     02) STATE
  ============================================================================= */
  const OPEN_CLASS = 'account-drawer-open';
  const CLOSING_CLASS = 'account-drawer-closing';
  const CLOSE_DURATION_MS = 460;
  const ENTRY_ACTION_SIGN_IN = 'sign-in';
  const ENTRY_ACTION_APPLE = 'apple';
  const ENTRY_ACTION_GOOGLE = 'google';
  const ENTRY_ACTION_EMAIL = 'email';
  const ENTRY_ACTION_PHONE = 'phone';
  const ENTRY_ACTION_ENTRY = 'entry';

  let closeTimer = null;

  /* =============================================================================
     03) QUERY HELPERS
  ============================================================================= */
  const q = (selector, scope = document) => scope.querySelector(selector);
  const qa = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

  function getDrawer() {
    return q('#account-drawer') || q('.account-drawer');
  }

  function getBackdrop() {
    const drawer = getDrawer();
    return drawer ? q('.account-drawer-backdrop', drawer) : null;
  }

  function getCloseControls() {
    const drawer = getDrawer();
    return drawer ? qa('[data-account-drawer-close="true"]', drawer) : [];
  }

  function getAuthState() {
    const drawer = getDrawer();
    return drawer ? q('[data-auth-state]', drawer) : null;
  }

  function getProfileState() {
    const drawer = getDrawer();
    return drawer ? q('[data-profile-state]', drawer) : null;
  }

  /* =============================================================================
     04) VIEW HELPERS
  ============================================================================= */
  function applyAuthView(surface = 'entry') {
    const drawer = getDrawer();
    const authState = getAuthState();
    const profileState = getProfileState();

    if (!drawer) return;

    drawer.dataset.accountDrawerView = 'auth';

    if (authState) {
      authState.hidden = false;
      authState.dataset.authState = 'guest';
      authState.dataset.authSurface = surface;
    }

    if (profileState) {
      profileState.hidden = true;
      profileState.dataset.profileState = 'empty';
    }
  }

  function applyProfileView() {
    const drawer = getDrawer();
    const authState = getAuthState();
    const profileState = getProfileState();

    if (!drawer) return;

    drawer.dataset.accountDrawerView = 'profile';

    if (authState) {
      authState.hidden = true;
    }

    if (profileState) {
      profileState.hidden = false;
      profileState.dataset.profileState = 'ready';
    }
  }

  /* =============================================================================
     05) TIMER HELPERS
  ============================================================================= */
  function clearCloseTimer() {
    if (!closeTimer) return;
    window.clearTimeout(closeTimer);
    closeTimer = null;
  }

  /* =============================================================================
     06) OPEN / CLOSE STATE
  ============================================================================= */
  function openDrawer(detail = {}) {
    const drawer = getDrawer();
    if (!drawer) return;

    clearCloseTimer();

    if (detail.state === 'profile') {
      applyProfileView();
    } else {
      applyAuthView(detail.surface === 'settings' ? 'settings' : 'entry');
    }

    document.body.classList.remove(CLOSING_CLASS);
    document.body.classList.add(OPEN_CLASS);
    drawer.setAttribute('aria-hidden', 'false');

    document.dispatchEvent(new CustomEvent('account-drawer:opened', {
      detail: { source: detail.source || MODULE_ID }
    }));
  }

  function closeDrawer(source = MODULE_ID) {
    const drawer = getDrawer();
    if (!drawer) return;

    if (!document.body.classList.contains(OPEN_CLASS) && !document.body.classList.contains(CLOSING_CLASS)) {
      drawer.setAttribute('aria-hidden', 'true');
      return;
    }

    clearCloseTimer();

    document.body.classList.remove(OPEN_CLASS);
    document.body.classList.add(CLOSING_CLASS);
    drawer.setAttribute('aria-hidden', 'true');

    closeTimer = window.setTimeout(() => {
      document.body.classList.remove(CLOSING_CLASS);
      document.dispatchEvent(new CustomEvent('account-drawer:closed', {
        detail: { source }
      }));
    }, CLOSE_DURATION_MS);
  }

  /* =============================================================================
     07) TRIGGER MATCHING
  ============================================================================= */
  function matchesAccountTrigger(target) {
    if (!(target instanceof Element)) return null;

    return target.closest(
      '[data-account-drawer-trigger="true"], '
      + '#account-drawer-trigger, '
      + '[data-account-trigger], '
      + '[data-panel-target="account"], '
      + '[data-nav-panel-target="account"], '
      + '[aria-controls="account-drawer"]'
    );
  }

  /* =============================================================================
     08) GLOBAL CLICK BINDING
  ============================================================================= */
  function bindGlobalClicks() {
    if (document.documentElement.dataset.accountDrawerClicksBound === 'true') return;
    document.documentElement.dataset.accountDrawerClicksBound = 'true';

    document.addEventListener('click', (event) => {
      const trigger = matchesAccountTrigger(event.target);
      if (trigger) {
        event.preventDefault();
        event.stopPropagation();
        openDrawer({
          source: 'direct-trigger',
          state: 'guest',
          surface: 'entry'
        });
        return;
      }

      const backdrop = getBackdrop();
      if (backdrop && event.target === backdrop) {
        event.preventDefault();
        closeDrawer('backdrop');
        return;
      }

      const closeControl = event.target instanceof Element
        ? event.target.closest('[data-account-drawer-close="true"]')
        : null;

      if (closeControl) {
        event.preventDefault();
        closeDrawer('close-control');
        return;
      }

      const signInAction = event.target instanceof Element
        ? event.target.closest('.account-drawer-action')
        : null;

      if (signInAction) {
        event.preventDefault();
        event.stopPropagation();
        requestNextAccountLayer(ENTRY_ACTION_SIGN_IN);
        return;
      }

      const identityAction = event.target instanceof Element
        ? event.target.closest('.account-drawer-identity-option')
        : null;

      if (identityAction) {
        event.preventDefault();
        event.stopPropagation();

        if (identityAction.classList.contains('account-drawer-identity-option--apple')) {
          requestNextAccountLayer(ENTRY_ACTION_APPLE);
          return;
        }

        if (identityAction.classList.contains('account-drawer-identity-option--google')) {
          requestNextAccountLayer(ENTRY_ACTION_GOOGLE);
          return;
        }

        if (identityAction.classList.contains('account-drawer-identity-option--email')) {
          requestNextAccountLayer(ENTRY_ACTION_EMAIL);
          return;
        }

        if (identityAction.classList.contains('account-drawer-identity-option--phone')) {
          requestNextAccountLayer(ENTRY_ACTION_PHONE);
          return;
        }
      }

      const consentLink = event.target instanceof Element
        ? event.target.closest('a[href="#cookie-consent-mount"]')
        : null;

      if (consentLink) {
        event.preventDefault();
        closeDrawer('cookie-consent-link');
        document.dispatchEvent(new CustomEvent('cookie-consent:open-request', {
          detail: {
            source: MODULE_ID,
            surface: 'settings'
          }
        }));
      }
    });
  }

  /* =============================================================================
     09) GLOBAL REQUEST BINDING
  ============================================================================= */
  function bindGlobalRequests() {
    if (document.documentElement.dataset.accountDrawerRequestsBound === 'true') return;
    document.documentElement.dataset.accountDrawerRequestsBound = 'true';

    document.addEventListener('account-drawer:open-request', (event) => {
      const detail = event && event.detail && typeof event.detail === 'object'
        ? event.detail
        : {};
      openDrawer(detail);
    });

    document.addEventListener('account-drawer:guest-entry', (event) => {
      const detail = event && event.detail && typeof event.detail === 'object'
        ? event.detail
        : {};
      openDrawer({
        source: detail.source || MODULE_ID,
        state: 'guest',
        surface: detail.surface || 'entry'
      });
    });

    document.addEventListener('account-drawer:show-profile', () => {
      openDrawer({
        source: MODULE_ID,
        state: 'profile'
      });
    });

    document.addEventListener('account-drawer:close-request', () => {
      closeDrawer('request');
    });

    document.addEventListener('account-layer:route-request', (event) => {
      if (!(event instanceof CustomEvent)) return;
      const action = event.detail?.action;
      if (action !== ENTRY_ACTION_ENTRY) return;

      openDrawer({
        source: event.detail?.source || MODULE_ID,
        state: 'guest',
        surface: 'entry'
      });
    });
  }

  /* =============================================================================
     10) ESCAPE BINDING
  ============================================================================= */
  function bindEscape() {
    if (document.documentElement.dataset.accountDrawerEscapeBound === 'true') return;
    document.documentElement.dataset.accountDrawerEscapeBound = 'true';

    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      closeDrawer('escape');
    });
  }

  /* =============================================================================
     11) ENTRY-LAYER ROUTING HELPERS
  ============================================================================= */
  function requestNextAccountLayer(action) {
    if (!action) return;

    const drawer = getDrawer();
    if (drawer) {
      clearCloseTimer();
      document.body.classList.remove(OPEN_CLASS);
      document.body.classList.remove(CLOSING_CLASS);
      drawer.setAttribute('aria-hidden', 'true');
    }

    document.dispatchEvent(new CustomEvent('account-layer:route-request', {
      detail: {
        source: MODULE_ID,
        action
      }
    }));
  }

  /* =============================================================================
     12) INITIALIZATION
  ============================================================================= */
  function initAccountDrawer() {
    const drawer = getDrawer();
    if (!drawer) return;

    if (!drawer.hasAttribute('aria-hidden')) {
      drawer.setAttribute('aria-hidden', 'true');
    }

    applyAuthView('entry');

    const backdrop = getBackdrop();
    if (backdrop) {
      backdrop.dataset.accountDrawerClose = 'true';
    }

    getCloseControls().forEach((control) => {
      control.dataset.accountDrawerClose = 'true';
    });
  }

  bindGlobalClicks();
  bindGlobalRequests();
  bindEscape();

  document.addEventListener('account-drawer:mounted', () => {
    initAccountDrawer();
  });

  document.addEventListener('fragment:mounted', (event) => {
    const name = event?.detail?.name;
    if (name === 'account-drawer') {
      initAccountDrawer();
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAccountDrawer, { once: true });
  } else {
    initAccountDrawer();
  }
})();