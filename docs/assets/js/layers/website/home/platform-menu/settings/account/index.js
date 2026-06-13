import { mountSettingsCategory } from '../_shared/settings-category.js';
import {
  getSupabaseClient,
  normalizeString
} from '../../../../system/account/identity/account-profile-identity.js';
import {
  evaluateAccountPassword,
  loadAccountPasswordPolicy
} from '../../../../system/account/identity/account-password-policy.js';
import {
  getProfileVerificationState,
  requestProfileVerification
} from '../../../../system/profile/profile-verification.js';
import { recordProfileChangelogEvent } from '../../../../system/profile/profile-changelog-store.js';

const ACCOUNT_DETAIL_STORAGE_KEY = 'neuroartan.home.settings.account.detail';
const PASSWORD_RECOVERY_STORAGE_KEY = 'neuroartan_password_recovery';
const ACCOUNT_DETAILS = new Set(['password']);

const ACCOUNT_PRIVACY_FIELDS = [
  'public_profile_enabled',
  'public_profile_discoverable',
  'profile_search_visible',
  'profile_models_visible',
  'profile_followers_visible',
  'profile_posts_visible',
  'profile_thoughts_visible'
];

const ACCOUNT_PRIVACY_DEFAULTS = Object.freeze({
  public_profile_enabled: false,
  public_profile_discoverable: false,
  profile_search_visible: false,
  profile_models_visible: false,
  profile_followers_visible: true,
  profile_posts_visible: true,
  profile_thoughts_visible: false
});

function setShellDetailBack(active) {
  document.dispatchEvent(new CustomEvent('home:platform-shell-detail-state-changed', {
    detail: {
      active: active === true,
      label: 'Back to Account'
    }
  }));
}

function readStoredDetail() {
  try {
    const detail = window.localStorage.getItem(ACCOUNT_DETAIL_STORAGE_KEY) || '';
    return ACCOUNT_DETAILS.has(detail) ? detail : '';
  } catch {
    return '';
  }
}

function writeStoredDetail(detail = '') {
  try {
    if (ACCOUNT_DETAILS.has(detail)) {
      window.localStorage.setItem(ACCOUNT_DETAIL_STORAGE_KEY, detail);
    } else {
      window.localStorage.removeItem(ACCOUNT_DETAIL_STORAGE_KEY);
    }
  } catch {}
}

function setStatus(root, selector, message, state = '') {
  const node = root.querySelector(selector);
  if (!(node instanceof HTMLElement)) return;
  node.textContent = message;
  node.dataset.state = state;
}

function setControlDisabled(control, disabled) {
  if (control instanceof HTMLButtonElement || control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement) {
    control.disabled = disabled === true;
  }
}

function normalizeBoolean(value, fallback = false) {
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return fallback;
}

function setPrivacyToggleState(root, key, value) {
  const enabled = value === true;
  root.querySelectorAll(`[data-account-privacy-toggle="${key}"]`).forEach((toggle) => {
    if (!(toggle instanceof HTMLButtonElement)) return;
    toggle.setAttribute('aria-checked', enabled ? 'true' : 'false');
    toggle.dataset.state = enabled ? 'on' : 'off';
  });
  root.querySelectorAll(`[data-account-privacy-toggle-input="${key}"]`).forEach((input) => {
    if (!(input instanceof HTMLInputElement)) return;
    input.value = enabled ? 'true' : 'false';
  });
}

function setAccountPrivacyControlsDisabled(root, disabled) {
  root.querySelectorAll('[data-account-privacy-toggle]').forEach((control) => {
    setControlDisabled(control, disabled);
  });
}

async function loadAccountProfile() {
  const supabase = getSupabaseClient();
  if (!supabase?.auth) throw new Error('SUPABASE_CLIENT_UNAVAILABLE');

  const user = await getCurrentAuthUser();
  if (!user?.id) throw new Error('AUTH_REQUIRED');

  const { data, error } = await supabase
    .from('profiles')
    .select(`id, ${ACCOUNT_PRIVACY_FIELDS.join(', ')}`)
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (error) throw error;
  if (!data?.id) throw new Error('PROFILE_REQUIRED');

  return data;
}

async function renderAccountPrivacyState(root) {
  const form = root.querySelector('[data-account-privacy-form]');
  if (!(form instanceof HTMLFormElement)) return;

  try {
    const profile = await loadAccountProfile();
    ACCOUNT_PRIVACY_FIELDS.forEach((key) => {
      setPrivacyToggleState(root, key, normalizeBoolean(profile[key], ACCOUNT_PRIVACY_DEFAULTS[key]));
    });
    setStatus(root, '[data-account-privacy-status]', 'Privacy and visibility settings are current.', 'ready');
  } catch (error) {
    ACCOUNT_PRIVACY_FIELDS.forEach((key) => {
      setPrivacyToggleState(root, key, ACCOUNT_PRIVACY_DEFAULTS[key]);
    });
    const code = normalizeString(error?.message || '');
    const message = code === 'PROFILE_REQUIRED'
      ? 'Create and save your profile before editing privacy settings.'
      : 'Privacy and visibility settings could not be loaded.';
    setStatus(root, '[data-account-privacy-status]', message, 'error');
    console.error('[account-settings] Privacy state failed.', error);
  }
}

async function updateAccountPrivacyField(root, key, value) {
  if (!ACCOUNT_PRIVACY_FIELDS.includes(key)) return;

  setAccountPrivacyControlsDisabled(root, true);
  setStatus(root, '[data-account-privacy-status]', 'Saving privacy and visibility settings...', 'pending');

  try {
    const supabase = getSupabaseClient();
    if (!supabase?.auth) throw new Error('SUPABASE_CLIENT_UNAVAILABLE');

    const profile = await loadAccountProfile();
    const { error } = await supabase
      .from('profiles')
      .update({ [key]: value === true })
      .eq('id', profile.id);

    if (error) throw error;

    setPrivacyToggleState(root, key, value === true);
    setStatus(root, '[data-account-privacy-status]', 'Privacy and visibility settings saved.', 'success');
    void recordProfileChangelogEvent({
      area: 'account.privacy_visibility',
      action: 'privacy_visibility_updated',
      title: 'Privacy visibility updated',
      detail: `Account privacy setting updated: ${key}.`
    });
  } catch (error) {
    setStatus(root, '[data-account-privacy-status]', 'Privacy and visibility settings could not be saved.', 'error');
    void renderAccountPrivacyState(root);
    console.error('[account-settings] Privacy update failed.', error);
  } finally {
    setAccountPrivacyControlsDisabled(root, false);
  }
}

function setActiveDetail(root, detail = '', options = {}) {
  const normalized = ACCOUNT_DETAILS.has(detail) ? detail : '';
  root.querySelectorAll('[data-account-settings-view]').forEach((view) => {
    const viewName = view.getAttribute('data-account-settings-view') || '';
    view.hidden = normalized ? viewName !== normalized : viewName !== 'overview';
  });
  root.dataset.accountSettingsDetail = normalized;
  setShellDetailBack(Boolean(normalized));
  if (options.persist !== false) {
    writeStoredDetail(normalized);
  }
  void renderVerificationState(root);
  void renderAccountPrivacyState(root);
}

async function getCurrentAuthUser() {
  const supabase = getSupabaseClient();
  if (!supabase?.auth) return null;
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data?.session?.user || null;
}

function isPasswordRecoveryActive() {
  try {
    return window.sessionStorage.getItem(PASSWORD_RECOVERY_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function clearPasswordRecoveryState() {
  try {
    window.sessionStorage.removeItem(PASSWORD_RECOVERY_STORAGE_KEY);
  } catch {}
}

async function handlePasswordSubmit(root, form) {
  const formData = new FormData(form);
  const currentPassword = normalizeString(formData.get('current_password'));
  const newPassword = normalizeString(formData.get('new_password'));
  const confirmPassword = normalizeString(formData.get('confirm_password'));
  const recoveryActive = isPasswordRecoveryActive();
  const policy = await loadAccountPasswordPolicy();
  const evaluation = evaluateAccountPassword(newPassword, policy);

  if (!recoveryActive && !currentPassword) {
    setStatus(root, '[data-account-password-status]', 'Current password is required.', 'error');
    return;
  }

  if (!evaluation.ok) {
    setStatus(root, '[data-account-password-status]', evaluation.message, 'error');
    return;
  }

  if (newPassword !== confirmPassword) {
    setStatus(root, '[data-account-password-status]', 'New password and confirmation do not match.', 'error');
    return;
  }

  setStatus(root, '[data-account-password-status]', 'Updating password...', 'pending');

  try {
    const supabase = getSupabaseClient();
    if (!supabase?.auth) throw new Error('SUPABASE_CLIENT_UNAVAILABLE');

    const user = await getCurrentAuthUser();
    const email = normalizeString(user?.email || user?.user_metadata?.email || '');
    if (!user?.id || !email) throw new Error('AUTH_REQUIRED');

    if (!recoveryActive) {
      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword
      });
      if (reauthError) throw reauthError;
    }

    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    if (updateError) throw updateError;

    clearPasswordRecoveryState();
    form.reset();
    setStatus(root, '[data-account-password-status]', 'Password updated.', 'success');
    void recordProfileChangelogEvent({
      area: 'account.security',
      action: 'password_changed',
      title: 'Password changed',
      detail: 'The account password was updated from unified account settings.'
    });
  } catch (error) {
    const message = normalizeString(error?.message || '').toLowerCase().includes('invalid login')
      ? 'Current password is not correct.'
      : 'Password could not be updated.';
    setStatus(root, '[data-account-password-status]', message, 'error');
    console.error('[account-settings] Password update failed.', error);
  }
}

async function renderVerificationState(root) {
  const submit = root.querySelector('[data-account-verification-submit]');
  try {
    const user = await getCurrentAuthUser();
    setControlDisabled(submit, !user?.id);

    const verificationState = await getProfileVerificationState();
    const latestStatus = verificationState.latestRequest?.request_status || '';
    const message = latestStatus
      ? `Latest request status: ${latestStatus}`
      : verificationState.tableAvailable
        ? 'No verification request has been submitted yet.'
        : 'Verification request storage is not configured.';

    setStatus(root, '[data-account-verification-status]', message, verificationState.tableAvailable ? 'ready' : 'error');
  } catch (error) {
    console.error('[account-settings] Verification state failed.', error);
    setStatus(root, '[data-account-verification-status]', 'Verification state could not be loaded.', 'error');
  }
}

async function handleVerificationSubmit(root, form) {
  const formData = new FormData(form);
  setStatus(root, '[data-account-verification-status]', 'Submitting verification request...', 'pending');

  try {
    await requestProfileVerification({
      request_note: formData.get('request_note') || ''
    });
    form.reset();
    setStatus(root, '[data-account-verification-status]', 'Verification request submitted for review.', 'success');
    void recordProfileChangelogEvent({
      area: 'account.verification',
      action: 'verification_requested',
      title: 'Verification requested',
      detail: 'An account verification request was submitted from unified account settings.'
    });
    await renderVerificationState(root);
  } catch (error) {
    const code = normalizeString(error?.code || error?.message || '');
    const message = code === 'PROFILE_VERIFICATION_BACKEND_UNAVAILABLE'
      ? 'Verification storage is not configured.'
      : code === 'PROFILE_REQUIRED'
        ? 'Create and save your profile before requesting verification.'
        : 'Verification request could not be submitted.';
    setStatus(root, '[data-account-verification-status]', message, 'error');
  }
}

export function mountHomePlatformDestination(root, options = {}) {
  mountSettingsCategory(root, options);
  setActiveDetail(root, readStoredDetail(), { persist: false });
  void renderAccountPrivacyState(root);

  root.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-account-settings-detail]');
    if (trigger) {
      setActiveDetail(root, trigger.getAttribute('data-account-settings-detail') || '');
      return;
    }

    const privacyToggle = event.target.closest('[data-account-privacy-toggle]');
    if (privacyToggle instanceof HTMLButtonElement) {
      const key = privacyToggle.getAttribute('data-account-privacy-toggle') || '';
      const nextValue = privacyToggle.getAttribute('aria-checked') !== 'true';
      setPrivacyToggleState(root, key, nextValue);
      void updateAccountPrivacyField(root, key, nextValue);
    }
  });

  root.addEventListener('submit', (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;

    if (form.matches('[data-account-privacy-form]')) {
      event.preventDefault();
      return;
    }

    if (form.matches('[data-account-password-form]')) {
      event.preventDefault();
      void handlePasswordSubmit(root, form);
      return;
    }

    if (form.matches('[data-account-verification-form]')) {
      event.preventDefault();
      void handleVerificationSubmit(root, form);
    }
  });

  return () => setShellDetailBack(false);
}

export function updateHomePlatformDestination(root) {
  if (root instanceof Element) {
    void renderVerificationState(root);
    void renderAccountPrivacyState(root);
  }
}

export function handleHomePlatformBack(root) {
  setActiveDetail(root, '');
  return true;
}
