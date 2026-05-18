/*
 * =============================================================================
 * Neuroartan Website — Account Phone Verification Sheet
 * -----------------------------------------------------------------------------
 * Purpose:
 * - Own OTP popup interaction after SMS dispatch.
 * - Receive the composed E.164 phone number from the phone entry drawer.
 * - Dispatch verification requests back into the account runtime owner.
 * =============================================================================
 */

(() => {
  'use strict';

  const STATE = {
    phone: '',
    displayPhone: ''
  };

  function getSheet() {
    return document.querySelector('[data-account-phone-verification-sheet]');
  }

  function getCodeInput() {
    return document.querySelector('[data-account-phone-verification-code]');
  }

  function getStatusNode() {
    return document.querySelector('[data-account-phone-verification-status]');
  }

  function getNoteNode() {
    return document.querySelector('[data-account-phone-verification-note]');
  }

  function getForm() {
    return document.querySelector('[data-account-phone-verification-form="true"]');
  }

  function setStatus(state = 'idle', message = '') {
    const node = getStatusNode();
    if (!(node instanceof HTMLElement)) return;

    node.hidden = !message;
    node.dataset.state = state;
    node.textContent = message || '';
  }

  function clearStatus() {
    setStatus('idle', '');
  }

  function normalizeCode(value = '') {
    return String(value || '').replace(/\D+/g, '').slice(0, 8);
  }

  function syncCodeInput() {
    const input = getCodeInput();
    if (!(input instanceof HTMLInputElement)) return;
    input.value = normalizeCode(input.value);
  }

  function openSheet(detail = {}) {
    STATE.phone = String(detail.phone || '').trim();
    STATE.displayPhone = String(detail.displayPhone || detail.phone || '').trim();

    const note = getNoteNode();
    if (note instanceof HTMLElement) {
      note.textContent = STATE.displayPhone
        ? `We sent a verification code to ${STATE.displayPhone}.`
        : 'We sent a verification code to your phone number.';
    }

    clearStatus();

    const input = getCodeInput();
    if (input instanceof HTMLInputElement) {
      input.value = '';
    }

    document.dispatchEvent(new CustomEvent('account-drawer:open-request', {
      detail: {
        source: 'account-phone-verification-sheet',
        state: 'guest',
        surface: 'phone-verification'
      }
    }));

    requestAnimationFrame(() => {
      getCodeInput()?.focus?.();
    });
  }

  function closeToPhoneEntry() {
    clearStatus();

    document.dispatchEvent(new CustomEvent('account-drawer:open-request', {
      detail: {
        source: 'account-phone-verification-sheet',
        state: 'guest',
        surface: 'phone-auth'
      }
    }));
  }

  function requestPhoneVerificationSubmit() {
    const code = normalizeCode(getCodeInput()?.value || '');

    if (!STATE.phone) {
      setStatus('error', 'Phone verification session is missing. Return and request a new code.');
      return;
    }

    if (!code) {
      setStatus('error', 'Enter the verification code.');
      return;
    }

    document.dispatchEvent(new CustomEvent('account:phone-auth-submit-request', {
      detail: {
        source: 'account-phone-verification-sheet',
        phone: STATE.phone,
        displayPhone: STATE.displayPhone,
        code
      }
    }));
  }

  document.addEventListener('account:phone-verification-open-request', (event) => {
    openSheet(event.detail || {});
  });

  document.addEventListener('account:phone-verification-status', (event) => {
    const detail = event.detail || {};
    setStatus(detail.state || 'idle', detail.message || '');
  });

  document.addEventListener('input', (event) => {
    if (event.target === getCodeInput()) {
      syncCodeInput();
    }
  });

  document.addEventListener('click', (event) => {
    const backControl = event.target.closest?.('[data-account-phone-verification-back]');
    if (backControl) {
      event.preventDefault();
      closeToPhoneEntry();
    }
  });

  document.addEventListener('submit', (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    if (!form.matches('[data-account-phone-verification-form="true"]')) return;

    event.preventDefault();
    event.stopPropagation();
    requestPhoneVerificationSubmit();
  });
})();
