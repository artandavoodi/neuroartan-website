/* =============================================================================
   00) FILE INDEX
   01) MODULE IDENTITY
   02) STATE
   03) QUERY HELPERS
   04) HIDDEN CONTEXT FIELD HELPERS
   05) CONTEXT HELPERS
   06) CREDENTIAL VISIBILITY HELPERS
   06A) DATE OF BIRTH HELPERS
   06B) PASSWORD FEEDBACK HELPERS
   07) USERNAME PREVIEW HELPERS
   08) OPEN REQUEST BINDING
   08A) CLOSE REQUEST BINDING
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
import {
  buildAccountPasswordHint,
  evaluateAccountPassword,
  loadAccountPasswordPolicy
} from '../../system/account-password-policy.js';

(() => {
  'use strict';

  const MODULE_ID = 'account-profile-setup-drawer';
  const MODULE_PATH = '/website/docs/assets/js/layers/website/overlays/account/account-profile-setup-drawer.js';
  const USERNAME_CHANGE_EVENT = 'account:profile-setup-username-change';
  const USERNAME_STATUS_EVENT = 'account:profile-setup-username-status';
  const USERNAME_SUGGESTIONS_EVENT = 'account:profile-setup-username-suggestions';

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
    username: '',
    usernameStatus: 'idle',
    usernameIdleMessage: ''
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

  function getHiddenEmailInput() {
    return q('#account-profile-setup-email', getDrawer() || document);
  }

  function getHiddenMethodInput() {
    return q('#account-profile-setup-method', getDrawer() || document);
  }

  function getHiddenAuthProviderInput() {
    return q('#account-profile-setup-auth-provider', getDrawer() || document);
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

  function getDateOfBirthMonthSelect() {
    return q('#account-profile-setup-date-of-birth-month', getDrawer() || document);
  }

  function getDateOfBirthDaySelect() {
    return q('#account-profile-setup-date-of-birth-day', getDrawer() || document);
  }

  function getDateOfBirthYearSelect() {
    return q('#account-profile-setup-date-of-birth-year', getDrawer() || document);
  }

  function getGenderSelect() {
    return q('#account-profile-setup-gender', getDrawer() || document);
  }

  function getPasswordHint() {
    return q('[data-account-profile-setup-password-hint="true"]', getDrawer() || document);
  }

  function getPasswordStatusShell() {
    return q('[data-account-profile-setup-password-status-shell]', getDrawer() || document);
  }

  function getPasswordStatusMessage() {
    return q('[data-account-profile-setup-password-status="true"]', getDrawer() || document);
  }

  function getSubmitStatus() {
    return q('[data-account-profile-setup-submit-status]', getDrawer() || document);
  }

  function getUsernameStatus() {
    return q('[data-account-profile-setup-username-status]', getDrawer() || document);
  }

  function getUsernameSuggestions() {
    return q('[data-account-profile-setup-username-suggestions]', getDrawer() || document);
  }

  function getUsernameSuggestionList() {
    return q('[data-account-profile-setup-username-suggestion-list]', getDrawer() || document);
  }

  function setUsernameStatus(statusKey, text) {
    const status = getUsernameStatus();
    if (!status) return;

    state.usernameStatus = statusKey || (state.username ? 'draft' : 'idle');
    status.dataset.accountProfileSetupUsernameStatus = state.usernameStatus;

    if (typeof text === 'string') {
      status.textContent = text;

      if (state.usernameStatus === 'idle' && text) {
        state.usernameIdleMessage = text;
      }

      return;
    }

    if (state.usernameStatus === 'idle') {
      status.textContent = state.usernameIdleMessage || '';
      return;
    }

    status.textContent = '';
  }

  function setSubmitStatus(statusKey = 'idle', text = '') {
    const node = getSubmitStatus();
    if (!node) return;

    node.dataset.accountProfileSetupSubmitStatus = statusKey;
    node.textContent = text;
  }

  function renderUsernameSuggestions(suggestions = []) {
    const shell = getUsernameSuggestions();
    const list = getUsernameSuggestionList();
    if (!(shell instanceof HTMLElement) || !(list instanceof HTMLElement)) return;

    const normalizedSuggestions = Array.isArray(suggestions)
      ? suggestions
        .map((entry) => String(entry?.username || entry || '').trim())
        .filter(Boolean)
      : [];

    list.replaceChildren();
    shell.hidden = normalizedSuggestions.length === 0;

    normalizedSuggestions.forEach((username) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'account-profile-setup-drawer-username-suggestion';
      button.dataset.accountProfileSetupUsernameSuggestion = username;
      button.textContent = `@${username}`;
      list.appendChild(button);
    });
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
    syncHiddenContextFields(detail);
    setFieldValue(getUsernameInput(), detail.username || '', { overwrite: false });
    setFieldValue(getFirstNameInput(), detail.first_name || '', { overwrite: false });
    setFieldValue(getLastNameInput(), detail.last_name || '', { overwrite: false });
    setFieldValue(getDisplayNameInput(), detail.display_name || '', { overwrite: false });
    setFieldValue(getPasswordInput(), detail.password || '', { overwrite: false });
    setFieldValue(getPasswordConfirmInput(), detail.password_confirm || detail.password || '', { overwrite: false });
    setFieldValue(getDateOfBirthInput(), detail.date_of_birth || '', { overwrite: false });
    setFieldValue(getGenderSelect(), detail.gender || '', { overwrite: false });
    syncDateOfBirthControlsFromValue();
    void syncPasswordFeedback();
    syncUsernamePreview();
    emitUsernameChange();
  }

  /* =============================================================================
     04) HIDDEN CONTEXT FIELD HELPERS
  ============================================================================= */
  function syncHiddenContextFields(detail = {}) {
    const hiddenEmailInput = getHiddenEmailInput();
    const hiddenMethodInput = getHiddenMethodInput();
    const hiddenAuthProviderInput = getHiddenAuthProviderInput();

    const normalizedMethod = normalizeMethod(detail.method || state.method || '');
    const normalizedProvider = normalizeMethod(detail.auth_provider || detail.provider || state.provider || normalizedMethod || '');
    const normalizedEmail = String(detail.email || '').trim();

    if (hiddenEmailInput) {
      hiddenEmailInput.value = normalizedEmail;
    }

    if (hiddenMethodInput) {
      hiddenMethodInput.value = normalizedMethod || '';
    }

    if (hiddenAuthProviderInput) {
      hiddenAuthProviderInput.value = normalizedProvider || normalizedMethod || '';
    }
  }

  /* =============================================================================
     05) CONTEXT HELPERS
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
    syncHiddenContextFields(detail);

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
     06) CREDENTIAL VISIBILITY HELPERS
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

    void syncPasswordFeedback();
  }

  /* =============================================================================
     07) USERNAME PREVIEW HELPERS
  ============================================================================= */
  function normalizeUsernamePreview(value) {
    const raw = String(value || '').trim().toLowerCase();
    const collapsed = raw
      .replace(/\s+/g, '.')
      .replace(/[^a-z0-9.]+/g, '.')
      .replace(/\.{2,}/g, '.')
      .replace(/^\.+/g, '');

    return collapsed;
  }

  function emitUsernameChange() {
    document.dispatchEvent(new CustomEvent(USERNAME_CHANGE_EVENT, {
      detail: {
        source: MODULE_ID,
        username: state.username,
        raw_username: getUsernameInput()?.value || '',
        email: getHiddenEmailInput()?.value || '',
        first_name: getFirstNameInput()?.value || '',
        last_name: getLastNameInput()?.value || '',
        display_name: getDisplayNameInput()?.value || '',
        method: state.method,
        provider: state.provider
      }
    }));
  }

  function syncUsernamePreview() {
    const input = getUsernameInput();
    const rawValue = input?.value || '';
    const normalized = normalizeUsernamePreview(rawValue);
    state.username = normalized;

    if (input && normalized !== rawValue) {
      input.value = normalized;
    }

    setUsernameStatus(normalized ? 'draft' : 'idle');
  }

  function bindUsernameStatusEvents() {
    if (document.documentElement.dataset.accountProfileSetupDrawerUsernameStatusBound === 'true') return;
    document.documentElement.dataset.accountProfileSetupDrawerUsernameStatusBound = 'true';

    document.addEventListener(USERNAME_STATUS_EVENT, (event) => {
      const detail = event instanceof CustomEvent ? event.detail || {} : {};
      const normalized = normalizeUsernamePreview(detail.normalized || detail.username || '');

      if (!normalized && detail.state === 'idle' && detail.message) {
        state.usernameIdleMessage = detail.message;

        if (state.username) {
          return;
        }
      }

      if (normalized && normalized !== state.username) {
        return;
      }

      setUsernameStatus(
        detail.state || (state.username ? 'draft' : 'idle'),
        typeof detail.message === 'string' ? detail.message : undefined
      );
    });

    document.addEventListener(USERNAME_SUGGESTIONS_EVENT, (event) => {
      const detail = event instanceof CustomEvent ? event.detail || {} : {};
      const normalized = normalizeUsernamePreview(detail.normalized || detail.username || '');

      if (normalized && normalized !== state.username) {
        return;
      }

      renderUsernameSuggestions(detail.suggestions || []);
    });
  }

  /* =============================================================================
     06A) DATE OF BIRTH HELPERS
  ============================================================================= */
  function buildLocalizedMonthLabel(monthIndex) {
    try {
      return new Intl.DateTimeFormat(document.documentElement.lang || 'en', {
        month: 'long',
        timeZone: 'UTC'
      }).format(new Date(Date.UTC(2000, monthIndex, 1)));
    } catch (_) {
      return String(monthIndex + 1).padStart(2, '0');
    }
  }

  function buildOptionMarkup(value, label) {
    const option = document.createElement('option');
    option.value = String(value);
    option.textContent = label;
    return option;
  }

  function populateMonthOptions() {
    const monthSelect = getDateOfBirthMonthSelect();
    if (!(monthSelect instanceof HTMLSelectElement) || monthSelect.options.length > 1) return;

    for (let monthIndex = 0; monthIndex < 12; monthIndex += 1) {
      monthSelect.appendChild(buildOptionMarkup(monthIndex + 1, buildLocalizedMonthLabel(monthIndex)));
    }
  }

  function populateYearOptions() {
    const yearSelect = getDateOfBirthYearSelect();
    if (!(yearSelect instanceof HTMLSelectElement) || yearSelect.options.length > 1) return;

    const currentYear = new Date().getUTCFullYear();
    for (let year = currentYear; year >= currentYear - 110; year -= 1) {
      yearSelect.appendChild(buildOptionMarkup(year, String(year)));
    }
  }

  function syncDayOptions() {
    const daySelect = getDateOfBirthDaySelect();
    const monthSelect = getDateOfBirthMonthSelect();
    const yearSelect = getDateOfBirthYearSelect();
    if (!(daySelect instanceof HTMLSelectElement)) return;

    const selectedDay = Number.parseInt(daySelect.value, 10) || 0;
    const selectedMonth = Number.parseInt(monthSelect?.value || '', 10) || 0;
    const selectedYear = Number.parseInt(yearSelect?.value || '', 10) || 2000;
    const maxDay = selectedMonth
      ? new Date(Date.UTC(selectedYear, selectedMonth, 0)).getUTCDate()
      : 31;

    while (daySelect.options.length > 1) {
      daySelect.remove(1);
    }

    for (let day = 1; day <= maxDay; day += 1) {
      daySelect.appendChild(buildOptionMarkup(day, String(day).padStart(2, '0')));
    }

    if (selectedDay) {
      daySelect.value = String(Math.min(selectedDay, maxDay));
    }
  }

  function syncDateOfBirthValue() {
    const hiddenInput = getDateOfBirthInput();
    const month = Number.parseInt(getDateOfBirthMonthSelect()?.value || '', 10) || 0;
    const year = Number.parseInt(getDateOfBirthYearSelect()?.value || '', 10) || 0;

    if (!(hiddenInput instanceof HTMLInputElement)) return;

    syncDayOptions();
    const day = Number.parseInt(getDateOfBirthDaySelect()?.value || '', 10) || 0;

    if (!month || !day || !year) {
      hiddenInput.value = '';
      return;
    }

    hiddenInput.value = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  function syncDateOfBirthControlsFromValue() {
    const hiddenInput = getDateOfBirthInput();
    const monthSelect = getDateOfBirthMonthSelect();
    const daySelect = getDateOfBirthDaySelect();
    const yearSelect = getDateOfBirthYearSelect();

    populateMonthOptions();
    populateYearOptions();

    const value = hiddenInput instanceof HTMLInputElement ? String(hiddenInput.value || '').trim() : '';
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);

    if (!(monthSelect instanceof HTMLSelectElement) || !(daySelect instanceof HTMLSelectElement) || !(yearSelect instanceof HTMLSelectElement)) {
      return;
    }

    if (!match) {
      monthSelect.value = '';
      yearSelect.value = '';
      syncDayOptions();
      daySelect.value = '';
      return;
    }

    yearSelect.value = String(Number.parseInt(match[1], 10));
    monthSelect.value = String(Number.parseInt(match[2], 10));
    syncDayOptions();
    daySelect.value = String(Number.parseInt(match[3], 10));
  }

  /* =============================================================================
     06B) PASSWORD FEEDBACK HELPERS
  ============================================================================= */
  async function syncPasswordFeedback() {
    const hintNode = getPasswordHint();
    const statusShell = getPasswordStatusShell();
    const statusMessage = getPasswordStatusMessage();
    const passwordInput = getPasswordInput();
    const credentialGroup = getCredentialGroup();

    if (!(statusShell instanceof HTMLElement) || !(statusMessage instanceof HTMLElement)) {
      return;
    }

    const policy = await loadAccountPasswordPolicy();
    const evaluation = evaluateAccountPassword(passwordInput?.value || '', policy);

    if (hintNode instanceof HTMLElement) {
      hintNode.textContent = buildAccountPasswordHint(policy);
    }

    if (credentialGroup?.hidden) {
      statusShell.dataset.accountProfileSetupPasswordStatusShell = 'idle';
      statusMessage.textContent = '';
      return;
    }

    statusShell.dataset.accountProfileSetupPasswordStatusShell = evaluation.status;
    statusMessage.textContent = evaluation.message;
  }

  /* =============================================================================
     08) OPEN REQUEST BINDING
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
      emitUsernameChange();
      scheduleFocusPrimaryField();
    };

    document.addEventListener('account:route-request', handleProfileSetupOpenRequest);
    document.addEventListener('account-layer:view-request', handleProfileSetupOpenRequest);
    document.addEventListener('account-layer:route-request', handleProfileSetupOpenRequest);

    document.addEventListener('account:profile-setup-open-request', (event) => {
      const detail = event?.detail || {};
      applyRouteContext(detail);
      applyPrefill(detail);
      setSubmitStatus('idle', '');
      syncUsernamePreview();
      scheduleFocusPrimaryField();
    });

    document.addEventListener('account:profile-setup-prefill', (event) => {
      const detail = event?.detail || {};
      applyRouteContext(detail);
      applyPrefill(detail);
      syncUsernamePreview();
      emitUsernameChange();
    });
  }

  /* =============================================================================
     08A) CLOSE REQUEST BINDING
  ============================================================================= */
  function syncMountedProfileSetupDrawer() {
    const drawer = getDrawer();
    if (!drawer) return;

    drawer.dataset.moduleId = MODULE_ID;
    drawer.dataset.modulePath = MODULE_PATH;
    drawer.setAttribute('aria-hidden', drawer.hidden ? 'true' : 'false');
    syncHiddenContextFields({ method: state.method, auth_provider: state.provider, email: getHiddenEmailInput()?.value || '' });
    syncDateOfBirthControlsFromValue();
    syncCredentialVisibility();
    void syncPasswordFeedback();
    syncUsernamePreview();
  }

  function bindCloseRequests() {
    if (document.documentElement.dataset.accountProfileSetupDrawerCloseBound === 'true') return;
    document.documentElement.dataset.accountProfileSetupDrawerCloseBound = 'true';

    document.addEventListener('account:close-all', () => {
      state.method = '';
      state.provider = '';
      state.username = '';
      setSubmitStatus('idle', '');
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

      const suggestionControl = event.target instanceof Element
        ? event.target.closest('[data-account-profile-setup-username-suggestion]')
        : null;

      if (suggestionControl) {
        event.preventDefault();
        event.stopPropagation();
        const username = suggestionControl.getAttribute('data-account-profile-setup-username-suggestion') || '';
        const usernameInput = getUsernameInput();
        if (usernameInput instanceof HTMLInputElement) {
          usernameInput.value = username;
          syncUsernamePreview();
          emitUsernameChange();
          usernameInput.focus();
        }
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
          email: getHiddenEmailInput()?.value?.trim() || '',
          method: getHiddenMethodInput()?.value?.trim() || state.method,
          auth_provider: getHiddenAuthProviderInput()?.value?.trim() || state.provider,
          provider: getHiddenAuthProviderInput()?.value?.trim() || state.provider,
          username: state.username,
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
        emitUsernameChange();
        return;
      }

      if (target.closest('#account-profile-setup-password')) {
        void syncPasswordFeedback();
        return;
      }

      if (target.closest('[data-account-profile-setup-form="true"]')) {
        setSubmitStatus('idle', '');
      }
    });

    document.addEventListener('change', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;

      if (target.matches('[data-account-profile-setup-date-control]')) {
        syncDateOfBirthValue();
        setSubmitStatus('idle', '');
      }
    });
  }

  function bindSubmitStatusEvents() {
    if (document.documentElement.dataset.accountProfileSetupDrawerSubmitStatusBound === 'true') return;
    document.documentElement.dataset.accountProfileSetupDrawerSubmitStatusBound = 'true';

    document.addEventListener('account:profile-setup-submit-status', (event) => {
      const detail = event instanceof CustomEvent ? event.detail || {} : {};
      setSubmitStatus(detail.state || 'idle', String(detail.message || ''));
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

    syncMountedProfileSetupDrawer();

    bindOpenRequests();
    bindCloseRequests();
    bindRouteRequests();
    bindInnerRouteControls();
    bindInputs();
    bindUsernameStatusEvents();
    bindSubmitStatusEvents();
    bindEscape();
    syncMountedProfileSetupDrawer();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

  window.addEventListener('fragment:mounted', () => {
    if (!getDrawer()) return;

    syncMountedProfileSetupDrawer();
  });

  /* =============================================================================
     13) END OF FILE
  ============================================================================= */
})();
