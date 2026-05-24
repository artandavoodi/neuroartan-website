/* =============================================================================
   00) FILE INDEX
   01) MODULE IMPORTS
   02) DOM HELPERS
   03) SUPABASE SESSION HELPERS
   04) RESET FLOW
   05) INITIALIZATION
   06) END OF FILE
============================================================================= */

/* =============================================================================
   01) MODULE IMPORTS
============================================================================= */
import {
  getSupabaseClient,
  normalizeString
} from '../../../system/account/identity/account-profile-identity.js';
import {
  buildAccountPasswordHint,
  evaluateAccountPassword,
  loadAccountPasswordPolicy
} from '../../../system/account/identity/account-password-policy.js';

/* =============================================================================
   02) DOM HELPERS
============================================================================= */
const MODULE_ID = 'password-reset-page';
const RECOVERY_STORAGE_KEY = 'neuroartan_password_recovery';

function getRoot() {
  return document.querySelector('[data-password-reset-page]');
}

function getForm() {
  return document.querySelector('[data-password-reset-form]');
}

function getStatus() {
  return document.querySelector('[data-password-reset-status]');
}

function getPasswordInput() {
  const form = getForm();
  return form?.elements?.password instanceof HTMLInputElement
    ? form.elements.password
    : null;
}

function getPasswordPolicyShell() {
  return document.querySelector('[data-password-reset-policy-shell]');
}

function getPasswordPolicyMessage() {
  return document.querySelector('[data-password-reset-policy-message]');
}

function setStatus(message, state = 'idle') {
  const node = getStatus();
  if (!(node instanceof HTMLElement)) return;
  node.textContent = message || '';
  node.dataset.passwordResetStatus = state;
}

function setBusy(form, busy) {
  if (!(form instanceof HTMLFormElement)) return;
  form.querySelectorAll('input, button').forEach((control) => {
    if (
      control instanceof HTMLInputElement
      || control instanceof HTMLButtonElement
    ) {
      control.disabled = busy;
    }
  });
}

async function syncPasswordPolicyFeedback() {
  const input = getPasswordInput();
  const shell = getPasswordPolicyShell();
  const message = getPasswordPolicyMessage();

  if (!(shell instanceof HTMLElement) || !(message instanceof HTMLElement)) return;

  const policy = await loadAccountPasswordPolicy();
  const value = input?.value || '';
  const evaluation = evaluateAccountPassword(value, policy);

  shell.dataset.passwordResetPolicyShell = evaluation.status;
  shell.dataset.accountProfileSetupPasswordStatusShell = evaluation.status;
  message.textContent = value ? evaluation.message : buildAccountPasswordHint(policy);
}

function clearHashTokens() {
  if (!window.location.hash) return;
  window.history.replaceState({}, '', `${window.location.pathname}${window.location.search}`);
}

function getRecoveryHashTokens() {
  const hash = window.location.hash.startsWith('#')
    ? window.location.hash.slice(1)
    : window.location.hash;
  const params = new URLSearchParams(hash);
  const accessToken = normalizeString(params.get('access_token') || '');
  const refreshToken = normalizeString(params.get('refresh_token') || '');

  if (!accessToken || !refreshToken) return null;

  return {
    accessToken,
    refreshToken
  };
}

function getRecoveryCode() {
  const params = new URLSearchParams(window.location.search);
  return normalizeString(params.get('code') || '');
}

function clearRecoveryUrlTokens() {
  const params = new URLSearchParams(window.location.search);
  params.delete('code');
  params.delete('type');
  const nextSearch = params.toString();
  window.history.replaceState({}, '', `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ''}`);
}

/* =============================================================================
   03) SUPABASE SESSION HELPERS
============================================================================= */
function waitForSupabaseReady() {
  const existing = getSupabaseClient();
  if (existing) return Promise.resolve(existing);

  return new Promise((resolve) => {
    window.addEventListener('neuroartan:supabase-ready', () => {
      resolve(getSupabaseClient());
    }, { once: true });

    window.setTimeout(() => {
      resolve(getSupabaseClient());
    }, 4000);
  });
}

async function resolveRecoverySession() {
  const supabase = await waitForSupabaseReady();
  if (!supabase?.auth) return null;

  const recoveryCode = getRecoveryCode();
  if (recoveryCode) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(recoveryCode);
    if (error) throw error;

    const session = data?.session || null;
    if (session?.user) {
      try {
        window.sessionStorage?.setItem(RECOVERY_STORAGE_KEY, 'true');
      } catch (_) {}
      clearRecoveryUrlTokens();
      return session;
    }
  }

  const recoveryHashTokens = getRecoveryHashTokens();
  if (recoveryHashTokens) {
    const { data, error } = await supabase.auth.setSession({
      access_token: recoveryHashTokens.accessToken,
      refresh_token: recoveryHashTokens.refreshToken
    });
    if (error) throw error;

    const session = data?.session || null;
    if (session?.user) {
      try {
        window.sessionStorage?.setItem(RECOVERY_STORAGE_KEY, 'true');
      } catch (_) {}
      clearHashTokens();
      return session;
    }
  }

  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;

  const session = data?.session || null;
  if (session?.user) {
    try {
      window.sessionStorage?.setItem(RECOVERY_STORAGE_KEY, 'true');
    } catch (_) {}
    return session;
  }

  return null;
}

/* =============================================================================
   04) RESET FLOW
============================================================================= */
async function handlePasswordResetSubmit(event) {
  const form = event.target;
  if (!(form instanceof HTMLFormElement) || !form.matches('[data-password-reset-form]')) return;

  event.preventDefault();

  const formData = new FormData(form);
  const password = String(formData.get('password') || '');
  const passwordConfirm = String(formData.get('password_confirm') || '');

  if (!password) {
    setStatus('Enter a new password.', 'error');
    return;
  }

  if (password !== passwordConfirm) {
    setStatus('Passwords do not match.', 'error');
    return;
  }

  setBusy(form, true);
  setStatus('Updating password...', 'saving');

  try {
    const policy = await loadAccountPasswordPolicy();
    const evaluation = evaluateAccountPassword(password, policy);
    if (!evaluation.ok) {
      setStatus(evaluation.message, 'error');
      return;
    }

    const session = await resolveRecoverySession();
    if (!session?.user) {
      setStatus('Reset link is not active. Request a new password reset email.', 'error');
      return;
    }

    const supabase = getSupabaseClient();
    const { error } = await supabase.auth.updateUser({
      password
    });

    if (error) throw error;

    try {
      window.sessionStorage?.removeItem(RECOVERY_STORAGE_KEY);
    } catch (_) {}

    form.reset();
    clearRecoveryUrlTokens();
    setStatus('Password updated. You can now sign in with the new password.', 'success');
  } catch (error) {
    const message = normalizeString(error?.message || '').toLowerCase().includes('expired')
      ? 'Reset link expired. Request a new password reset email.'
      : 'Password could not be updated. Request a new reset link and try again.';
    setStatus(message, 'error');
    console.error(`[${MODULE_ID}] Password reset failed.`, error);
  } finally {
    setBusy(form, false);
  }
}

/* =============================================================================
   05) INITIALIZATION
============================================================================= */
function bindPasswordFeedback() {
  const form = getForm();
  if (!(form instanceof HTMLFormElement)) return;

  form.addEventListener('input', (event) => {
    const target = event.target;
    if (target instanceof HTMLInputElement && target.name === 'password') {
      void syncPasswordPolicyFeedback();
    }
  });

  void syncPasswordPolicyFeedback();
}

async function boot() {
  if (!getRoot()) return;

  document.addEventListener('submit', handlePasswordResetSubmit);
  bindPasswordFeedback();

  try {
    const session = await resolveRecoverySession();
    setStatus(
      session?.user
        ? 'Enter a new password for your account.'
        : 'Open this page from the password reset email link.',
      session?.user ? 'ready' : 'idle'
    );
  } catch (error) {
    setStatus('Reset link could not be verified. Request a new password reset email.', 'error');
    console.error(`[${MODULE_ID}] Recovery session failed.`, error);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  void boot();
}

/* =============================================================================
   06) END OF FILE
============================================================================= */
