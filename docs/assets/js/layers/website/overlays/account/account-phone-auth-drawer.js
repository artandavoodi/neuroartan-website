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
  let dialTypeaheadBuffer = '';
  let dialTypeaheadTimer = null;

  const DIAL_TYPEAHEAD_RESET_MS = 900;

  /* =============================================================================
     03) DRAWER QUERY HELPERS
  ============================================================================= */
  function getDrawer() {
    return document.getElementById('account-phone-auth-drawer');
  }

  function getMount() {
    return document.querySelector('[data-include="account-phone-auth-drawer"]');
  }

  function getForm() {
    return document.querySelector('[data-account-phone-auth-form="true"]');
  }

  function getDialCodeInput() {
    return document.querySelector('[data-account-phone-auth-dial-code]');
  }

  function getDialCodeValue() {
    return document.querySelector('[data-account-phone-auth-dial-value]');
  }

  function getDialCodePicker() {
    return document.querySelector('[data-account-phone-auth-dial-picker]');
  }

  function getDialCodeTrigger() {
    return document.querySelector('[data-account-phone-auth-dial-trigger]');
  }

  function getDialCodePanel() {
    return document.querySelector('[data-account-phone-auth-dial-panel]');
  }

  function getDialCodeList() {
    return document.querySelector('[data-account-phone-auth-dial-list]');
  }

  function getLocalNumberInput() {
    return document.querySelector('[data-account-phone-auth-local-number]');
  }

  function getDialCodeOptions() {
    const list = getDialCodeList();
    if (!(list instanceof HTMLElement)) return [];

    return Array.from(list.querySelectorAll('[data-account-phone-auth-dial-option]'))
      .filter((option) => option instanceof HTMLButtonElement);
  }

  function getPreferredRegion() {
    const storedRegion = String(
      window.localStorage?.getItem('neuroartan_country_code')
      || window.localStorage?.getItem('artan_country_code')
      || ''
    ).trim();

    if (/^[A-Za-z]{2}$/.test(storedRegion)) {
      return storedRegion.toUpperCase();
    }

    const languageCandidates = [
      navigator.language,
      ...(Array.isArray(navigator.languages) ? navigator.languages : [])
    ].filter(Boolean);

    for (const candidate of languageCandidates) {
      const region = String(candidate || '').split(/[-_]/).find((value, index) => (
        index > 0 && /^[A-Za-z]{2}$/.test(value)
      ));

      if (region) return region.toUpperCase();
    }

    return 'US';
  }

  function normalizeDigits(value = '') {
    return String(value || '').replace(/\D+/g, '');
  }

  function composeE164Phone(dialCode = '', localNumber = '') {
    const dialDigits = normalizeDigits(dialCode);
    const localDigits = normalizeDigits(localNumber).replace(/^0+/, '');

    if (!dialDigits || !localDigits) return '';
    return `+${dialDigits}${localDigits}`;
  }

  function sanitizeLocalPhoneInput(input) {
    if (!(input instanceof HTMLInputElement)) return;

    const sanitized = normalizeDigits(input.value);
    if (input.value !== sanitized) {
      input.value = sanitized;
    }
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
    closeDialCodePicker();
    drawer.classList.add('is-open');
    drawer.hidden = false;
    drawer.setAttribute('aria-hidden', 'false');
    document.documentElement.classList.add('account-phone-auth-drawer-open');
  }

  function closeDrawer() {
    const drawer = getDrawer();
    if (!drawer) return;

    closeDialCodePicker();
    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    document.documentElement.classList.remove('account-phone-auth-drawer-open');
  }

  /* =============================================================================
     05A) INNER ROUTE REQUEST HELPERS
  ============================================================================= */
  function requestInnerView(action) {
    if (!action) return;

    document.dispatchEvent(new CustomEvent('account-layer:view-request', {
      detail: {
        source: 'account-phone-auth-drawer',
        action
      }
    }));
  }

  function closeDialCodePicker() {
    const panel = getDialCodePanel();
    const trigger = getDialCodeTrigger();

    if (dialTypeaheadTimer) {
      window.clearTimeout(dialTypeaheadTimer);
      dialTypeaheadTimer = null;
    }

    dialTypeaheadBuffer = '';

    if (panel instanceof HTMLElement) {
      panel.hidden = true;
    }

    if (trigger instanceof HTMLButtonElement) {
      trigger.setAttribute('aria-expanded', 'false');
    }
  }

  function openDialCodePicker() {
    const panel = getDialCodePanel();
    const trigger = getDialCodeTrigger();

    if (panel instanceof HTMLElement) {
      panel.hidden = false;
    }

    if (trigger instanceof HTMLButtonElement) {
      trigger.setAttribute('aria-expanded', 'true');
    }
  }

  function getDialOptionSearchText(option) {
    if (!(option instanceof HTMLButtonElement)) return '';

    return [
      option.dataset.region,
      option.dataset.dialCode,
      option.textContent
    ].filter(Boolean).join(' ').toLowerCase();
  }

  function focusDialCodeOption(option) {
    const list = getDialCodeList();
    if (!(option instanceof HTMLButtonElement) || !(list instanceof HTMLElement)) return;

    option.focus({ preventScroll: true });
    list.scrollTop = Math.max(0, option.offsetTop - list.offsetTop);
  }

  function findDialCodeOption(query) {
    const normalized = String(query || '').trim().toLowerCase();
    if (!normalized) return null;

    const options = getDialCodeOptions();
    return options.find((option) => {
      const region = String(option.dataset.region || '').toLowerCase();
      const dialCode = String(option.dataset.dialCode || '').toLowerCase();
      const label = String(option.textContent || '').toLowerCase();

      return region.startsWith(normalized)
        || dialCode.startsWith(normalized)
        || label.startsWith(normalized);
    }) || options.find((option) => getDialOptionSearchText(option).includes(normalized)) || null;
  }

  function handleDialCodeTypeahead(event) {
    const panel = getDialCodePanel();
    if (!(panel instanceof HTMLElement) || panel.hidden) return false;
    if (event.metaKey || event.ctrlKey || event.altKey) return false;
    if (event.key.length !== 1) return false;

    dialTypeaheadBuffer += event.key.toLowerCase();

    if (dialTypeaheadTimer) {
      window.clearTimeout(dialTypeaheadTimer);
    }

    dialTypeaheadTimer = window.setTimeout(() => {
      dialTypeaheadBuffer = '';
      dialTypeaheadTimer = null;
    }, DIAL_TYPEAHEAD_RESET_MS);

    const match = findDialCodeOption(dialTypeaheadBuffer);
    if (match instanceof HTMLButtonElement) {
      focusDialCodeOption(match);
      event.preventDefault();
      return true;
    }

    return false;
  }

  function focusRelativeDialCodeOption(direction) {
    const panel = getDialCodePanel();
    if (!(panel instanceof HTMLElement) || panel.hidden) return false;

    const options = getDialCodeOptions();
    if (!options.length) return false;

    const active = document.activeElement;
    const currentIndex = options.findIndex((option) => option === active);
    const nextIndex = Math.min(
      options.length - 1,
      Math.max(0, currentIndex + direction)
    );

    focusDialCodeOption(options[nextIndex >= 0 ? nextIndex : 0]);
    return true;
  }

  function toggleDialCodePicker() {
    const panel = getDialCodePanel();
    if (!(panel instanceof HTMLElement)) return;

    if (panel.hidden) {
      openDialCodePicker();
      return;
    }

    closeDialCodePicker();
  }

  async function hydrateDialingCodeSelect() {
    const list = getDialCodeList();
    if (!(list instanceof HTMLElement)) return;
    if (list.dataset.registryHydrated === 'true') return;

    const response = await fetch('/assets/data/account/phone/dialing-codes.json', {
      credentials: 'same-origin'
    });

    if (!response.ok) {
      throw new Error(`Unable to load phone dialing codes (${response.status}).`);
    }

    const payload = await response.json();
    const entries = Array.isArray(payload?.entries) ? payload.entries : [];
    const fragment = document.createDocumentFragment();

    entries.forEach((entry) => {
      const dialCode = String(entry?.dial_code || '').trim();
      const region = String(entry?.region || '').trim();
      if (!dialCode || !region) return;

      const option = document.createElement('button');
      option.type = 'button';
      option.className = 'account-phone-auth-drawer-dial-option';
      option.dataset.accountPhoneAuthDialOption = 'true';
      option.dataset.dialCode = dialCode;
      option.dataset.region = region;
      option.setAttribute('role', 'option');
      option.setAttribute('aria-selected', 'false');
      option.textContent = `${dialCode} · ${region}`;
      fragment.appendChild(option);
    });

    list.appendChild(fragment);
    list.dataset.registryHydrated = 'true';

    const preferredRegion = getPreferredRegion();
    const preferredOption = list.querySelector(`[data-region="${preferredRegion}"]`)
      || list.querySelector('[data-region="US"]')
      || list.querySelector('[data-account-phone-auth-dial-option]');

    if (preferredOption instanceof HTMLButtonElement) {
      commitDialCodeSelection(preferredOption);
    }
  }

  function commitDialCodeSelection(option) {
    if (!(option instanceof HTMLButtonElement)) return;

    const dialCode = option.dataset.dialCode || '';
    const region = option.dataset.region || '';
    const input = getDialCodeInput();
    const valueNode = getDialCodeValue();

    if (!dialCode || !region) return;

    if (input instanceof HTMLInputElement) {
      input.value = dialCode;
      input.setCustomValidity('');
    }

    if (valueNode instanceof HTMLElement) {
      valueNode.textContent = `${dialCode} · ${region}`;
    }

    getDialCodeList()
      ?.querySelectorAll('[data-account-phone-auth-dial-option]')
      .forEach((candidate) => {
        candidate.setAttribute('aria-selected', candidate === option ? 'true' : 'false');
      });

    closeDialCodePicker();
  }

  function bindDialCodePickerControls() {
    if (document.documentElement.dataset.accountPhoneAuthDialPickerBound === 'true') return;
    document.documentElement.dataset.accountPhoneAuthDialPickerBound = 'true';

    document.addEventListener('click', (event) => {
      const trigger = event.target.closest?.('[data-account-phone-auth-dial-trigger]');
      if (trigger) {
        event.preventDefault();
        toggleDialCodePicker();
        return;
      }

      const option = event.target.closest?.('[data-account-phone-auth-dial-option]');
      if (option) {
        event.preventDefault();
        commitDialCodeSelection(option);
        return;
      }

      const picker = getDialCodePicker();
      if (picker instanceof HTMLElement && !picker.contains(event.target)) {
        closeDialCodePicker();
      }
    });

    document.addEventListener('keydown', (event) => {
      const panel = getDialCodePanel();
      if (!(panel instanceof HTMLElement) || panel.hidden) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        closeDialCodePicker();
        getDialCodeTrigger()?.focus?.();
        return;
      }

      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        focusRelativeDialCodeOption(event.key === 'ArrowDown' ? 1 : -1);
        return;
      }

      if (event.key === 'Enter') {
        const active = document.activeElement;
        if (active instanceof HTMLButtonElement && active.matches('[data-account-phone-auth-dial-option]')) {
          event.preventDefault();
          commitDialCodeSelection(active);
        }
        return;
      }

      handleDialCodeTypeahead(event);
    });
  }

  function requestPhoneAuthSubmit() {
    const dialCodeInput = getDialCodeInput();
    const localNumberInput = getLocalNumberInput();
    const dialCode = dialCodeInput?.value?.trim() || '';
    const localNumber = localNumberInput?.value?.trim() || '';
    const phone = composeE164Phone(dialCode, localNumber);

    if (!dialCode) {
      dialCodeInput?.setCustomValidity('Select a country calling code.');
      getDialCodeTrigger()?.focus?.();
      return;
    }

    dialCodeInput?.setCustomValidity('');

    if (!localNumber) {
      localNumberInput?.setCustomValidity('Enter your phone number.');
      localNumberInput?.reportValidity();
      return;
    }

    localNumberInput?.setCustomValidity('');

    if (!phone) {
      localNumberInput?.setCustomValidity('Enter a valid phone number.');
      localNumberInput?.reportValidity();
      return;
    }

    document.dispatchEvent(new CustomEvent('account:phone-auth-submit-request', {
      detail: {
        source: 'account-phone-auth-drawer',
        phone,
        displayPhone: `${dialCode} ${localNumber}`.trim(),
        code: ''
      }
    }));
  }

  /* =============================================================================
     06) OPEN REQUEST BINDING
  ============================================================================= */
  function bindOpenRequests() {
    if (document.documentElement.dataset.accountPhoneAuthDrawerOpenBound === 'true') return;
    document.documentElement.dataset.accountPhoneAuthDrawerOpenBound = 'true';

    document.addEventListener('account-phone-auth-drawer:open-request', () => {
      openDrawer();
    });
  }

  /* =============================================================================
     07) CLOSE REQUEST BINDING
  ============================================================================= */
  function bindCloseRequests() {
    if (document.documentElement.dataset.accountPhoneAuthDrawerCloseBound === 'true') return;
    document.documentElement.dataset.accountPhoneAuthDrawerCloseBound = 'true';

    document.addEventListener('account-phone-auth-drawer:close-request', () => {
      closeDrawer();
    });
  }

  /* =============================================================================
     08) ROUTE REQUEST BINDING
  ============================================================================= */
  function bindRouteRequests() {
    if (document.documentElement.dataset.accountPhoneAuthDrawerRouteBound === 'true') return;
    document.documentElement.dataset.accountPhoneAuthDrawerRouteBound = 'true';

    const handlePhoneAuthRoute = (event) => {
      const route = event?.detail?.route || event?.detail?.action || '';
      if (route !== 'phone-auth') return;
      openDrawer();
    };

    document.addEventListener('account-drawer:route', handlePhoneAuthRoute);
    document.addEventListener('account-layer:route-request', handlePhoneAuthRoute);
    document.addEventListener('account-layer:view-request', handlePhoneAuthRoute);
  }

  /* =============================================================================
     08A) INNER ROUTE CONTROLS
  ============================================================================= */
  function bindInnerRouteControls() {
    if (document.documentElement.dataset.accountPhoneAuthDrawerInnerRouteBound === 'true') return;
    document.documentElement.dataset.accountPhoneAuthDrawerInnerRouteBound = 'true';

    document.addEventListener('click', (event) => {
      const drawer = getDrawer();
      if (!drawer || !drawer.classList.contains('is-open')) return;

      const target = event.target;
      if (!(target instanceof Element)) return;

      const signInControl = target.closest('[data-account-sign-in-open], [data-account-route="sign-in"]');
      const entryControl = target.closest('[data-account-route="entry"]');
      const signUpControl = target.closest('[data-account-route="sign-up"]');
      const emailControl = target.closest('[data-account-route="email-auth"]');
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

      if (emailControl) {
        event.preventDefault();
        event.stopPropagation();
        requestInnerView('email-auth');
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
    if (document.documentElement.dataset.accountPhoneAuthDrawerFormBound === 'true') return;
    document.documentElement.dataset.accountPhoneAuthDrawerFormBound = 'true';

    document.addEventListener('input', (event) => {
      const input = event.target;
      if (input !== getLocalNumberInput()) return;
      sanitizeLocalPhoneInput(input);
    });

    document.addEventListener('submit', (event) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) return;
      if (form !== getForm()) return;

      event.preventDefault();
      event.stopPropagation();
      sanitizeLocalPhoneInput(getLocalNumberInput());
      requestPhoneAuthSubmit();
    });
  }

  /* =============================================================================
     09) ESCAPE BINDING
  ============================================================================= */
  function bindEscape() {
    if (document.documentElement.dataset.accountPhoneAuthDrawerEscapeBound === 'true') return;
    document.documentElement.dataset.accountPhoneAuthDrawerEscapeBound = 'true';

    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      const panel = getDialCodePanel();
      if (panel instanceof HTMLElement && !panel.hidden) return;

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
      if (name !== 'account-phone-auth-drawer') return;

      document.documentElement.dataset.accountPhoneAuthDrawerInitialized = 'false';
      init();
    });
  }

  /* =============================================================================
     11) BOOTSTRAP
  ============================================================================= */
  function init() {
    if (document.documentElement.dataset.accountPhoneAuthDrawerInitialized === 'true' && getDrawer()) return;
    document.documentElement.dataset.accountPhoneAuthDrawerInitialized = 'true';

    normalizeStateVisibility();
    bindDialCodePickerControls();
    void hydrateDialingCodeSelect();

    const drawer = getDrawer();
    if (drawer) {
      if (!drawer.hasAttribute('aria-hidden')) {
        drawer.setAttribute('aria-hidden', 'true');
      }
      drawer.dataset.moduleId = 'account-phone-auth-drawer';
      drawer.dataset.modulePath = '/website/docs/assets/js/layers/website/overlays/account/account-phone-auth-drawer.js';
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
