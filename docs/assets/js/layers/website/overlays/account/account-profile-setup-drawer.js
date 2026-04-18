/* =============================================================================
   00) FILE INDEX
   01) MODULE IDENTITY
   02) STATE
   03) QUERY HELPERS
   04) CONTEXT HELPERS
   05) CREDENTIAL VISIBILITY HELPERS
   06) USERNAME PREVIEW HELPERS
   07) OPEN REQUEST BINDING
   08) CLOSE REQUEST BINDING
   09) ROUTE REQUEST BINDING
   09A) INNER ROUTE CONTROLS
   10) INPUT BINDING
   11) ESCAPE BINDING
   12) BOOTSTRAP
   13) END OF FILE
============================================================================= */

/* =============================================================================
   01) MODULE IDENTITY
============================================================================= */
(() => {
  'use strict';

  const MODULE_ID = 'account-profile-setup-drawer';
  const MODULE_PATH = '/website/docs/assets/js/layers/website/overlays/account/account-profile-setup-drawer.js';

  /* =============================================================================
     02) STATE
  ============================================================================= */
  const ROUTE_NAME = 'profile-setup';
  const DEFAULT_ROUTE = 'entry';
  const CREDENTIAL_METHODS = new Set(['email', 'phone', 'email-auth', 'phone-auth']);
  const PROVIDER_METHODS = new Set(['apple', 'google']);

  const state = {
    method: '',
    provider: '',
    username: ''
  };

  /* =============================================================================
     03) QUERY HELPERS
  ============================================================================= */
  function q(selector, root = document) {
    return root.querySelector(selector);
  }

  function getDrawer() {
    return q('[data-account-profile-setup-drawer="true"]');
  }

  function getForm() {
    return q('[data-account-profile-setup-form="true"]', getDrawer() || document);
  }

  function getCredentialGroup() {
    return q('[data-account-profile-setup-credentials="true"]', getDrawer() || document);
  }

  function getUsernameInput() {
    return q('#account-profile-setup-username', getDrawer() || document);
  }

  function getFirstNameInput() {
    return q('#account-profile-setup-first-name', getDrawer() || document);
  }

  function getLastNameInput() {
    return q('#account-profile-setup-last-name', getDrawer() || document);
  }

  function getDisplayNameInput() {
    return q('#account-profile-setup-display-name', getDrawer() || document);
  }

  function getPasswordInput() {
    return q('#account-profile-setup-password', getDrawer() || document);
  }

  function getPasswordConfirmInput() {
    return q('#account-profile-setup-password-confirm', getDrawer() || document);
  }

  function getDateOfBirthInput() {
    return q('#account-profile-setup-date-of-birth', getDrawer() || document);
  }

  function getGenderSelect() {
    return q('#account-profile-setup-gender', getDrawer() || document);
  }

  function getUsernameStatus() {
    return q('[data-account-profile-setup-username-status]', getDrawer() || document);
  }

  function setFieldValue(field, value, options = {}) {
    if (!field) return;

    const normalizedValue = value == null ? '' : String(value);
    const shouldOverwrite = options.overwrite === true;

    if (!shouldOverwrite && String(field.value || '').trim()) {
      return;
    }

    field.value = normalizedValue;
  }

  function applyPrefill(detail = {}) {
    setFieldValue(getUsernameInput(), detail.username || '', { overwrite: false });
    setFieldValue(getFirstNameInput(), detail.first_name || '', { overwrite: false });
    setFieldValue(getLastNameInput(), detail.last_name || '', { overwrite: false });
    setFieldValue(getDisplayNameInput(), detail.display_name || '', { overwrite: false });
    setFieldValue(getPasswordInput(), detail.password || '', { overwrite: false });
    setFieldValue(getPasswordConfirmInput(), detail.password_confirm || detail.password || '', { overwrite: false });
    setFieldValue(getDateOfBirthInput(), detail.date_of_birth || '', { overwrite: false });
    setFieldValue(getGenderSelect(), detail.gender || '', { overwrite: false });
    syncUsernamePreview();
  }

  /* =============================================================================
     04) CONTEXT HELPERS
  ============================================================================= */
  function focusPrimaryField() {
    const usernameInput = getUsernameInput();
    if (!usernameInput) return;

    window.requestAnimationFrame(() => {
      usernameInput.focus();
      usernameInput.select?.();
    });
  }

  function scheduleFocusPrimaryField() {
    window.requestAnimationFrame(() => {
      focusPrimaryField();
    });
  }

  function normalizeMethod(value) {
    if (!value) return '';
    const normalized = String(value).trim().toLowerCase();

    switch (normalized) {
      case 'email-auth':
      case 'email':
        return 'email';
      case 'phone-auth':
      case 'phone':
        return 'phone';
      case 'provider-apple':
      case 'apple':
        return 'apple';
      case 'provider-google':
      case 'google':
        return 'google';
      default:
        return normalized;
    }
  }

  function applyRouteContext(detail = {}) {
    const method = normalizeMethod(detail.method || detail.provider || detail.source_method || detail.route_method || '');
    const provider = PROVIDER_METHODS.has(method) ? method : '';

    state.method = method;
    state.provider = provider;

    const drawer = getDrawer();
    if (drawer) {
      drawer.dataset.accountProfileSetupMethod = method || '';
      drawer.dataset.accountProfileSetupProvider = provider || '';
      drawer.dataset.moduleId = MODULE_ID;
      drawer.dataset.modulePath = MODULE_PATH;
    }

    syncCredentialVisibility();
  }

  /* =============================================================================
     05) CREDENTIAL VISIBILITY HELPERS
  ============================================================================= */
  function syncCredentialVisibility() {
    const credentialGroup = getCredentialGroup();
    const passwordInput = getPasswordInput();
    const passwordConfirmInput = getPasswordConfirmInput();
    if (!credentialGroup) return;

    const shouldShowCredentials = CREDENTIAL_METHODS.has(state.method);

    credentialGroup.hidden = !shouldShowCredentials;

    if (passwordInput) {
      passwordInput.required = shouldShowCredentials;
      if (!shouldShowCredentials) {
        passwordInput.value = '';
      }
    }

    if (passwordConfirmInput) {
      passwordConfirmInput.required = shouldShowCredentials;
      if (!shouldShowCredentials) {
        passwordConfirmInput.value = '';
      }
    }
  }

  /* =============================================================================
     06) USERNAME PREVIEW HELPERS
  ============================================================================= */
  function normalizeUsernamePreview(value) {
    const raw = String(value || '').trim().toLowerCase();
    const collapsed = raw
      .replace(/[^a-z0-9_-]+/g, '-')
      .replace(/-{2,}/g, '-')
      .replace(/^[-_]+|[-_]+$/g, '');

    return collapsed;
  }

  function syncUsernamePreview() {
    const input = getUsernameInput();
    const status = getUsernameStatus();
    if (!status) return;

    const normalized = normalizeUsernamePreview(input?.value || '');
    state.username = normalized;

    status.dataset.accountProfileSetupUsernameStatus = normalized ? 'draft' : 'idle';
    status.textContent = normalized
      ? `neuroartan.com/${normalized}`
      : 'neuroartan.com/username';
  }

  /* =============================================================================
     07) OPEN REQUEST BINDING
  ============================================================================= */
  function bindOpenRequests() {
    if (document.documentElement.dataset.accountProfileSetupDrawerOpenBound === 'true') return;
    document.documentElement.dataset.accountProfileSetupDrawerOpenBound = 'true';

    const handleProfileSetupOpenRequest = (event) => {
      const route = event?.detail?.route;
      const action = event?.detail?.action;
      if (route !== ROUTE_NAME && action !== ROUTE_NAME) return;

      applyRouteContext(event?.detail || {});
      syncUsernamePreview();
      scheduleFocusPrimaryField();
    };

    document.addEventListener('account:route-request', handleProfileSetupOpenRequest);
    document.addEventListener('account-layer:view-request', handleProfileSetupOpenRequest);
    document.addEventListener('account-layer:route-request', handleProfileSetupOpenRequest);

    document.addEventListener('account:profile-setup-open-request', (event) => {
      const detail = event?.detail || {};
      applyRouteContext(detail);
      applyPrefill(detail);
      syncUsernamePreview();
      scheduleFocusPrimaryField();
    });

    document.addEventListener('account:profile-setup-prefill', (event) => {
      const detail = event?.detail || {};
      applyRouteContext(detail);
      applyPrefill(detail);
      syncUsernamePreview();
    });
  }

  /* =============================================================================
     08) CLOSE REQUEST BINDING
  ============================================================================= */
  function bindCloseRequests() {
    if (document.documentElement.dataset.accountProfileSetupDrawerCloseBound === 'true') return;
    document.documentElement.dataset.accountProfileSetupDrawerCloseBound = 'true';

    document.addEventListener('account:close-all', () => {
      state.method = '';
      state.provider = '';
      state.username = '';
      syncCredentialVisibility();
      syncUsernamePreview();
    });
  }

  /* =============================================================================
     09) ROUTE REQUEST BINDING
  ============================================================================= */
  function bindRouteRequests() {
    if (document.documentElement.dataset.accountProfileSetupDrawerRouteBound === 'true') return;
    document.documentElement.dataset.accountProfileSetupDrawerRouteBound = 'true';

    document.addEventListener('click', (event) => {
      const trigger = event.target instanceof Element
        ? event.target.closest('[data-account-route="profile-setup"]')
        : null;

      if (!trigger) return;
      event.preventDefault();
      event.stopPropagation();

      const method = normalizeMethod(trigger.getAttribute('data-account-method') || trigger.getAttribute('data-account-provider') || '');
      document.dispatchEvent(new CustomEvent('account-layer:view-request', {
        detail: {
          source: MODULE_ID,
          action: ROUTE_NAME,
          method,
          provider: method
        }
      }));
    });
  }

  /* =============================================================================
     09A) INNER ROUTE CONTROLS
  ============================================================================= */
  function bindInnerRouteControls() {
    if (document.documentElement.dataset.accountProfileSetupDrawerInnerRouteBound === 'true') return;
    document.documentElement.dataset.accountProfileSetupDrawerInnerRouteBound = 'true';

    document.addEventListener('click', (event) => {
      const backControl = event.target instanceof Element
        ? event.target.closest('[data-account-profile-setup-back="true"]')
        : null;

      if (backControl) {
        event.preventDefault();
        event.stopPropagation();
        document.dispatchEvent(new CustomEvent('account-layer:view-request', {
          detail: {
            source: MODULE_ID,
            action: DEFAULT_ROUTE
          }
        }));
        return;
      }

      const skipControl = event.target instanceof Element
        ? event.target.closest('[data-account-profile-setup-skip="true"]')
        : null;

      if (skipControl) {
        event.preventDefault();
        event.stopPropagation();
        document.dispatchEvent(new CustomEvent('account:profile-setup-skip', {
          detail: {
            source: MODULE_ID,
            method: state.method,
            provider: state.provider,
            username: state.username
          }
        }));
      }
    });

    document.addEventListener('submit', (event) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) return;
      if (form !== getForm()) return;

      event.preventDefault();
      event.stopPropagation();

      document.dispatchEvent(new CustomEvent('account:profile-setup-submit', {
        detail: {
          source: MODULE_ID,
          method: state.method,
          provider: state.provider,
          username: normalizeUsernamePreview(getUsernameInput()?.value || ''),
          first_name: getFirstNameInput()?.value?.trim() || '',
          last_name: getLastNameInput()?.value?.trim() || '',
          display_name: getDisplayNameInput()?.value?.trim() || '',
          password: getPasswordInput()?.value || '',
          password_confirm: getPasswordConfirmInput()?.value || '',
          date_of_birth: getDateOfBirthInput()?.value || '',
          gender: getGenderSelect()?.value || ''
        }
      }));
    });
  }

  /* =============================================================================
     10) INPUT BINDING
  ============================================================================= */
  function bindInputs() {
    if (document.documentElement.dataset.accountProfileSetupDrawerInputsBound === 'true') return;
    document.documentElement.dataset.accountProfileSetupDrawerInputsBound = 'true';

    document.addEventListener('input', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;

      if (target.closest('#account-profile-setup-username')) {
        syncUsernamePreview();
      }
    });
  }

  /* =============================================================================
     11) ESCAPE BINDING
  ============================================================================= */
  function bindEscape() {
    if (document.documentElement.dataset.accountProfileSetupDrawerEscapeBound === 'true') return;
    document.documentElement.dataset.accountProfileSetupDrawerEscapeBound = 'true';

    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      const drawer = getDrawer();
      if (!drawer || drawer.hidden) return;
      event.preventDefault();
      document.dispatchEvent(new CustomEvent('account-layer:view-request', {
        detail: {
          source: MODULE_ID,
          action: DEFAULT_ROUTE
        }
      }));
    });
  }

  /* =============================================================================
     12) BOOTSTRAP
  ============================================================================= */
  function init() {
    if (document.documentElement.dataset.accountProfileSetupDrawerInitialized === 'true') return;
    document.documentElement.dataset.accountProfileSetupDrawerInitialized = 'true';

    const drawer = getDrawer();
    if (drawer) {
      drawer.dataset.moduleId = MODULE_ID;
      drawer.dataset.modulePath = MODULE_PATH;
      drawer.setAttribute('aria-hidden', drawer.hidden ? 'true' : 'false');
    }

    bindOpenRequests();
    bindCloseRequests();
    bindRouteRequests();
    bindInnerRouteControls();
    bindInputs();
    bindEscape();
    syncCredentialVisibility();
    syncUsernamePreview();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

  /* =============================================================================
     13) END OF FILE
  ============================================================================= */
})();
