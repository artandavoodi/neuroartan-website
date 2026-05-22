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

function clearHashTokens() {
  if (!window.location.hash) return;
  window.history.replaceState({}, '', `${window.location.pathname}${window.location.search}`);
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
    clearHashTokens();
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
async function boot() {
  if (!getRoot()) return;

  document.addEventListener('submit', handlePasswordResetSubmit);

  try {
    const session = await resolveRecoverySession();
    clearHashTokens();
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
