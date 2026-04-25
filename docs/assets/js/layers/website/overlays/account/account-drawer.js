/* =============================================================================
00) FILE INDEX
01) MODULE IDENTITY
02) STATE
03) QUERY HELPERS
04) VIEW HELPERS
05) INNER VIEW REGISTRY HELPERS
06) TIMER HELPERS
07) OPEN / CLOSE STATE
08) TRIGGER MATCHING
09) GLOBAL CLICK BINDING
10) GLOBAL REQUEST BINDING
11) ESCAPE BINDING
12) ENTRY-LAYER ROUTING HELPERS
12A) INNER ROUTE REQUEST HELPERS
13) EVENT REBINDING
14) BOOTSTRAP
15) END OF FILE
============================================================================= */

(() => {
  'use strict';
  /* =============================================================================
     01) MODULE IDENTITY
  ============================================================================= */
  const MODULE_ID = 'account-drawer';
  const MODULE_PATH = '/website/docs/assets/js/layers/website/overlays/account/account-drawer.js';

  /* =============================================================================
     02) STATE
  ============================================================================= */
  const OPEN_CLASS = 'account-drawer-open';
  const CLOSING_CLASS = 'account-drawer-closing';
  const FALLBACK_CLOSE_DURATION_MS = 320;
  const ENTRY_ACTION_SIGN_IN = 'sign-in';
  const ENTRY_ACTION_SIGN_UP = 'sign-up';
  const ENTRY_ACTION_FORGOT_PASSWORD = 'forgot-password';
  const ENTRY_ACTION_EMAIL = 'email-auth';
  const ENTRY_ACTION_PHONE = 'phone-auth';
  const ENTRY_ACTION_ENTRY = 'entry';

  let closeTimer = null;
  let bootBound = false;
  let mountEventsBound = false;

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

  function getAuthEntryCard() {
    const authState = getAuthState();
    return authState ? q('.account-drawer-entry-card', authState) : null;
  }

  function getAuthPrimaryActions() {
    const authState = getAuthState();
    return authState ? q('.account-drawer-actions', authState) : null;
  }

  function getAuthIdentityOptions() {
    const authState = getAuthState();
    return authState ? q('.account-drawer-identity-options', authState) : null;
  }

  function getProviderAppleSubmitButtons() {
    return qa('[data-account-provider-apple-submit="true"]');
  }

  function getProviderGoogleSubmitButtons() {
    return qa('[data-account-provider-google-submit="true"]');
  }

  function getAuthSupport() {
    const authState = getAuthState();
    return authState ? q('.account-drawer-support', authState) : null;
  }

  function getAuthLegalNote() {
    const authState = getAuthState();
    return authState ? q('.account-drawer-legal-note', authState) : null;
  }

  function getProfileState() {
    const drawer = getDrawer();
    return drawer ? q('[data-profile-state]', drawer) : null;
  }

  function getViewMount() {
    const drawer = getDrawer();
    return drawer ? q('[data-account-view-mount="true"]', drawer) : null;
  }

  function getInnerViews() {
    const mount = getViewMount();
    return mount ? qa('[data-account-view]', mount) : [];
  }

  /* =============================================================================
     04) VIEW HELPERS
  ============================================================================= */
  function applyAuthView(surface = 'entry') {
    const drawer = getDrawer();
    const authState = getAuthState();
    const profileState = getProfileState();
    const viewMount = getViewMount();
    const entryCard = getAuthEntryCard();
    const primaryActions = getAuthPrimaryActions();
    const identityOptions = getAuthIdentityOptions();
    const support = getAuthSupport();
    const legalNote = getAuthLegalNote();

    if (!drawer) return;

    drawer.dataset.accountDrawerView = 'auth';
    drawer.dataset.accountDrawerSurface = surface;

    if (authState) {
      authState.hidden = false;
      authState.dataset.authState = 'guest';
      authState.dataset.authSurface = surface;
    }

    if (entryCard) {
      entryCard.hidden = false;
    }

    if (primaryActions) {
      primaryActions.hidden = false;
    }

    if (identityOptions) {
      identityOptions.hidden = false;
    }

    if (support) {
      support.hidden = false;
    }

    if (legalNote) {
      legalNote.hidden = false;
    }

    if (viewMount) {
      viewMount.hidden = true;
    }

    getInnerViews().forEach((view) => {
      view.hidden = true;
      view.classList.remove('is-open');
      view.setAttribute('aria-hidden', 'true');
    });

    if (profileState) {
      profileState.hidden = true;
      profileState.dataset.profileState = 'empty';
    }
  }

  function applyProfileView() {
    const drawer = getDrawer();
    const authState = getAuthState();
    const profileState = getProfileState();
    const viewMount = getViewMount();
    const entryCard = getAuthEntryCard();
    const primaryActions = getAuthPrimaryActions();
    const identityOptions = getAuthIdentityOptions();
    const support = getAuthSupport();
    const legalNote = getAuthLegalNote();

    if (!drawer) return;

    drawer.dataset.accountDrawerView = 'profile';
    drawer.dataset.accountDrawerSurface = 'profile';

    if (authState) {
      authState.hidden = true;
    }

    if (entryCard) {
      entryCard.hidden = true;
    }

    if (primaryActions) {
      primaryActions.hidden = true;
    }

    if (identityOptions) {
      identityOptions.hidden = true;
    }

    if (support) {
      support.hidden = true;
    }

    if (legalNote) {
      legalNote.hidden = true;
    }

    if (viewMount) {
      viewMount.hidden = true;
    }

    getInnerViews().forEach((view) => {
      view.hidden = true;
      view.classList.remove('is-open');
      view.setAttribute('aria-hidden', 'true');
    });

    if (profileState) {
      profileState.hidden = false;
      profileState.dataset.profileState = 'ready';
    }
  }

  /* =============================================================================
     05) INNER VIEW REGISTRY HELPERS
  ============================================================================= */
  function normalizeViewAction(action) {
    switch (action) {
      case 'email':
        return ENTRY_ACTION_EMAIL;
      case 'phone':
        return ENTRY_ACTION_PHONE;
      case 'forgot-password':
        return ENTRY_ACTION_FORGOT_PASSWORD;
      case 'profile-setup':
        return 'profile-setup';
      default:
        return action || ENTRY_ACTION_ENTRY;
    }
  }

  function getInnerViewByAction(action) {
    const normalizedAction = normalizeViewAction(action);
    return getInnerViews().find((view) => view.dataset.accountView === normalizedAction) || null;
  }

  function hasMountedInnerView(action) {
    return !!getInnerViewByAction(action);
  }

  function applyInnerView(action) {
    const drawer = getDrawer();
    const authState = getAuthState();
    const profileState = getProfileState();
    const viewMount = getViewMount();
    const entryCard = getAuthEntryCard();
    const primaryActions = getAuthPrimaryActions();
    const identityOptions = getAuthIdentityOptions();
    const support = getAuthSupport();
    const legalNote = getAuthLegalNote();
    const normalizedAction = normalizeViewAction(action);
    const targetView = getInnerViewByAction(normalizedAction);

    if (!drawer) return;

    if (normalizedAction === ENTRY_ACTION_ENTRY) {
      applyAuthView('entry');
      return;
    }

    if (!targetView) {
      return;
    }

    drawer.dataset.accountDrawerView = 'auth';
    drawer.dataset.accountDrawerSurface = normalizedAction;

    if (authState) {
      authState.hidden = false;
      authState.dataset.authSurface = normalizedAction;
    }

    if (entryCard) {
      entryCard.hidden = true;
    }

    if (primaryActions) {
      primaryActions.hidden = true;
    }

    if (identityOptions) {
      identityOptions.hidden = true;
    }

    if (support) {
      support.hidden = true;
    }

    if (legalNote) {
      legalNote.hidden = true;
    }

    if (profileState) {
      profileState.hidden = true;
      profileState.dataset.profileState = 'empty';
    }

    if (viewMount) {
      viewMount.hidden = false;
    }

    getInnerViews().forEach((view) => {
      const isTarget = view === targetView;
      view.hidden = !isTarget;
      view.classList.toggle('is-open', isTarget);
      view.setAttribute('aria-hidden', isTarget ? 'false' : 'true');
    });
  }

  /* =============================================================================
     06) TIMER HELPERS
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

  /* =============================================================================
     07) OPEN / CLOSE STATE
  ============================================================================= */
  function openDrawer(detail = {}) {
    const drawer = getDrawer();
    if (!drawer) return;

    clearCloseTimer();

    if (detail.state === 'profile') {
      applyProfileView();
    } else if (detail.surface && detail.surface !== 'entry' && detail.surface !== 'settings') {
      applyInnerView(detail.surface);
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
    }, getCloseDurationMs());
  }

  /* =============================================================================
     08) TRIGGER MATCHING
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

  function requestAccountEntry(detail = {}) {
    document.dispatchEvent(new CustomEvent('account:entry-request', {
      detail: {
        source: detail.source || MODULE_ID,
        surface: detail.surface || 'entry'
      }
    }));
  }

  /* =============================================================================
     09) GLOBAL CLICK BINDING
  ============================================================================= */
  function bindGlobalClicks() {
    if (document.documentElement.dataset.accountDrawerClicksBound === 'true') return;
    document.documentElement.dataset.accountDrawerClicksBound = 'true';

    document.addEventListener('click', (event) => {
      const trigger = matchesAccountTrigger(event.target);
      if (trigger) {
        event.preventDefault();
        event.stopPropagation();
        requestAccountEntry({
          source: 'direct-trigger',
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

      const directAppleTrigger = event.target instanceof Element
        ? event.target.closest('[data-account-provider-apple-submit="true"]')
        : null;

      if (directAppleTrigger) {
        event.preventDefault();
        event.stopPropagation();
        document.dispatchEvent(new CustomEvent('account:provider-submit', {
          detail: {
            source: MODULE_ID,
            provider: 'apple'
          }
        }));
        return;
      }

      const directGoogleTrigger = event.target instanceof Element
        ? event.target.closest('[data-account-provider-google-submit="true"]')
        : null;

      if (directGoogleTrigger) {
        event.preventDefault();
        event.stopPropagation();
        document.dispatchEvent(new CustomEvent('account:provider-submit', {
          detail: {
            source: MODULE_ID,
            provider: 'google'
          }
        }));
        return;
      }

      const signInAction = event.target instanceof Element
        ? event.target.closest('.account-drawer-action, [data-account-sign-in-open="true"]')
        : null;

      if (signInAction) {
        event.preventDefault();
        event.stopPropagation();
        requestNextAccountLayer(ENTRY_ACTION_SIGN_IN);
        return;
      }

      const routedAction = event.target instanceof Element
        ? event.target.closest('[data-account-route]')
        : null;

      if (routedAction) {
        const route = normalizeViewAction(routedAction.getAttribute('data-account-route'));
        if (route) {
          event.preventDefault();
          event.stopPropagation();
          requestNextAccountLayer(route);
          return;
        }
      }

      const identityAction = event.target instanceof Element
        ? event.target.closest('.account-drawer-identity-option')
        : null;

      if (identityAction) {
        event.preventDefault();
        event.stopPropagation();

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
     10) GLOBAL REQUEST BINDING
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

    const handleLayerRoute = (event) => {
      if (!(event instanceof CustomEvent)) return;
      const action = normalizeViewAction(event.detail?.action);
      if (!action) return;

      openDrawer({
        source: event.detail?.source || MODULE_ID,
        state: 'guest',
        surface: action
      });
    };

    document.addEventListener('account-layer:route-request', handleLayerRoute);
    document.addEventListener('account-layer:view-request', handleLayerRoute);
  }

  /* =============================================================================
     11) ESCAPE BINDING
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
     12) ENTRY-LAYER ROUTING HELPERS
  ============================================================================= */
  function requestNextAccountLayer(action) {
    const normalizedAction = normalizeViewAction(action);
    if (!normalizedAction) return;
    requestInnerView(normalizedAction);
  }

  /* =============================================================================
     12A) INNER ROUTE REQUEST HELPERS
  ============================================================================= */
  function requestInnerView(action) {
    const normalizedAction = normalizeViewAction(action);
    if (!normalizedAction) return;

    document.dispatchEvent(new CustomEvent('account-layer:view-request', {
      detail: {
        source: MODULE_ID,
        action: normalizedAction
      }
    }));
  }

  /* =============================================================================
     13) EVENT REBINDING
  ============================================================================= */
  function bindMountEvents() {
    if (mountEventsBound) return;
    mountEventsBound = true;

    document.addEventListener('account-drawer:mounted', () => {
      initAccountDrawer();
    });

    window.addEventListener('fragment:mounted', () => {
      if (!getDrawer()) return;

      initAccountDrawer({ preserveView: true });
    });
  }

  /* =============================================================================
     14) BOOTSTRAP
  ============================================================================= */
  function initAccountDrawer(options = {}) {
    const drawer = getDrawer();
    if (!drawer) return;

    if (!drawer.hasAttribute('aria-hidden')) {
      drawer.setAttribute('aria-hidden', 'true');
    }

    drawer.dataset.moduleId = MODULE_ID;
    drawer.dataset.modulePath = MODULE_PATH;

    const backdrop = getBackdrop();
    if (backdrop) {
      backdrop.dataset.accountDrawerClose = 'true';
    }

    const viewMount = getViewMount();
    if (viewMount) {
      viewMount.hidden = true;
    }

    getInnerViews().forEach((view) => {
      view.hidden = true;
      view.classList.remove('is-open');
      view.setAttribute('aria-hidden', 'true');
    });

    getCloseControls().forEach((control) => {
      control.dataset.accountDrawerClose = 'true';
    });

    if (options.preserveView && drawer.dataset.accountDrawerView) return;

    applyAuthView('entry');
  }

  function boot() {
    if (bootBound) return;

    bootBound = true;

    bindGlobalClicks();
    bindGlobalRequests();
    bindEscape();
    bindMountEvents();
    initAccountDrawer();
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
