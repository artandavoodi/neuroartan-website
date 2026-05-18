/*
 * =============================================================================
 * Neuroartan Website — Account Phone Dial Code Sheet
 * -----------------------------------------------------------------------------
 * Purpose:
 * - Own country calling code selection.
 * - Render the canonical dialing-code registry in a stable account sheet.
 * - Return selected dial code to the phone entry drawer.
 * =============================================================================
 */

(() => {
  'use strict';

  const DIALING_CODE_REGISTRY_URL = '/assets/data/account/phone/dialing-codes.json';

  let registryPromise = null;

  function getList() {
    return document.querySelector('[data-account-phone-dial-code-list]');
  }

  function loadRegistry() {
    if (!registryPromise) {
      registryPromise = fetch(DIALING_CODE_REGISTRY_URL, {
        credentials: 'same-origin'
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error(`Unable to load phone dialing codes (${response.status}).`);
          }

          return response.json();
        })
        .then((payload) => Array.isArray(payload?.entries) ? payload.entries : [])
        .catch((error) => {
          registryPromise = null;
          throw error;
        });
    }

    return registryPromise;
  }

  async function hydrateList() {
    const list = getList();
    if (!(list instanceof HTMLElement)) return;
    if (list.dataset.registryHydrated === 'true') return;

    const entries = await loadRegistry();
    const fragment = document.createDocumentFragment();

    entries.forEach((entry) => {
      const dialCode = String(entry?.dial_code || '').trim();
      const region = String(entry?.region || '').trim();
      if (!dialCode || !region) return;

      const option = document.createElement('button');
      option.type = 'button';
      option.className = 'account-phone-dial-code-sheet-option';
      option.dataset.accountPhoneDialCodeOption = 'true';
      option.dataset.dialCode = dialCode;
      option.dataset.region = region;
      option.setAttribute('role', 'option');
      option.setAttribute('aria-selected', 'false');

      const code = document.createElement('span');
      code.className = 'account-phone-dial-code-sheet-option-code';
      code.textContent = dialCode;

      const label = document.createElement('span');
      label.className = 'account-phone-dial-code-sheet-option-region';
      label.textContent = region;

      option.append(code, label);
      fragment.appendChild(option);
    });

    list.appendChild(fragment);
    list.dataset.registryHydrated = 'true';
  }

  function openSheet() {
    document.dispatchEvent(new CustomEvent('account-drawer:open-request', {
      detail: {
        source: 'account-phone-dial-code-sheet',
        state: 'guest',
        surface: 'phone-dial-code'
      }
    }));

    void hydrateList();
  }

  function returnToPhoneEntry() {
    document.dispatchEvent(new CustomEvent('account-drawer:open-request', {
      detail: {
        source: 'account-phone-dial-code-sheet',
        state: 'guest',
        surface: 'phone-auth'
      }
    }));
  }

  function commitSelection(option) {
    if (!(option instanceof HTMLButtonElement)) return;

    const dialCode = option.dataset.dialCode || '';
    const region = option.dataset.region || '';
    if (!dialCode || !region) return;

    document.dispatchEvent(new CustomEvent('account:phone-dial-code-selected', {
      detail: {
        source: 'account-phone-dial-code-sheet',
        dialCode,
        region
      }
    }));

    returnToPhoneEntry();
  }

  document.addEventListener('account:phone-dial-code-sheet-open-request', () => {
    openSheet();
  });

  document.addEventListener('click', (event) => {
    const backControl = event.target.closest?.('[data-account-phone-dial-code-back]');
    if (backControl) {
      event.preventDefault();
      returnToPhoneEntry();
      return;
    }

    const option = event.target.closest?.('[data-account-phone-dial-code-option]');
    if (option) {
      event.preventDefault();
      commitSelection(option);
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;

    const sheet = document.querySelector('[data-account-phone-dial-code-sheet]');
    if (!(sheet instanceof HTMLElement) || sheet.hidden) return;

    returnToPhoneEntry();
  });
})();
