/* =============================================================================
   01) MODULE IMPORTS
   02) SETTINGS HELPERS
   03) SETTINGS RENDER
   04) SETTINGS INIT
   ============================================================================= */

/* =============================================================================
   01) MODULE IMPORTS
   ============================================================================= */

import { getProfileRuntimeState, subscribeProfileRuntime } from '../shell/profile-runtime.js';
import { getProfileNavigationState, subscribeProfileNavigation } from '../navigation/profile-navigation.js';
import { getPrivateProfileSaveState, subscribePrivateProfileSaveState } from '../../../system/profile/profile-save.js';
import {
  getProfileVerificationState,
  requestProfileVerification
} from '../../../system/profile/profile-verification.js';
import {
  getSupabaseClient,
  normalizeString
} from '../../../system/account/identity/account-profile-identity.js';
import {
  evaluateAccountPassword,
  loadAccountPasswordPolicy
} from '../../../system/account/identity/account-password-policy.js';
import {
  recordProfileChangelogEvent
} from '../../../system/profile/profile-changelog-store.js';

const PASSWORD_RECOVERY_STORAGE_KEY = 'neuroartan_password_recovery';

/* =============================================================================
   02) SETTINGS HELPERS
   ============================================================================= */

function getSettingsRoots() {
  return Array.from(document.querySelectorAll('[data-profile-settings-panel]'));
}

function setText(root, selector, value) {
  const node = root.querySelector(selector);
  if (!node) return;
  node.textContent = value;
}

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

function buildOption(value, label) {
  const option = document.createElement('option');
  option.value = String(value);
  option.textContent = label;
  return option;
}

function getDateControl(root, control) {
  return root.querySelector(`[data-profile-settings-date-control="${control}"]`);
}

function getSelectedOptionLabel(select, fallback = '') {
  if (!(select instanceof HTMLSelectElement)) return fallback;
  const option = select.selectedOptions?.[0];
  return normalizeString(option?.textContent || fallback);
}

function setSelectLabel(root, name, fallback = '') {
  const select = root.querySelector(`[name="${name}"]`);
  const label = root.querySelector(`[data-profile-settings-select-label="${name}"]`);
  if (!(label instanceof HTMLElement)) return;
  label.textContent = getSelectedOptionLabel(select, fallback) || fallback;
}

function syncProfileSettingsDateLabels(root) {
  ['month', 'day', 'year'].forEach((control) => {
    const select = getDateControl(root, control);
    const label = root.querySelector(`[data-profile-settings-date-label="${control}"]`);
    if (!(label instanceof HTMLElement)) return;
    label.textContent = getSelectedOptionLabel(select, control.replace(/^./, (char) => char.toUpperCase()));
  });
}

function populateProfileSettingsDateOptions(root) {
  const monthSelect = getDateControl(root, 'month');
  const yearSelect = getDateControl(root, 'year');

  if (monthSelect instanceof HTMLSelectElement && monthSelect.options.length <= 1) {
    for (let monthIndex = 0; monthIndex < 12; monthIndex += 1) {
      monthSelect.appendChild(buildOption(monthIndex + 1, buildLocalizedMonthLabel(monthIndex)));
    }
  }

  if (yearSelect instanceof HTMLSelectElement && yearSelect.options.length <= 1) {
    const currentYear = new Date().getUTCFullYear();
    for (let year = currentYear; year >= currentYear - 110; year -= 1) {
      yearSelect.appendChild(buildOption(year, String(year)));
    }
  }
}

function syncProfileSettingsDayOptions(root) {
  const daySelect = getDateControl(root, 'day');
  const monthSelect = getDateControl(root, 'month');
  const yearSelect = getDateControl(root, 'year');
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
    daySelect.appendChild(buildOption(day, String(day).padStart(2, '0')));
  }

  if (selectedDay) {
    daySelect.value = String(Math.min(selectedDay, maxDay));
  }

  syncProfileSettingsDateLabels(root);
}

function syncProfileSettingsDateValue(root) {
  const hiddenInput = root.querySelector('[data-profile-settings-date-of-birth]');
  const month = Number.parseInt(getDateControl(root, 'month')?.value || '', 10) || 0;
  const year = Number.parseInt(getDateControl(root, 'year')?.value || '', 10) || 0;

  if (!(hiddenInput instanceof HTMLInputElement)) return;

  syncProfileSettingsDayOptions(root);
  const day = Number.parseInt(getDateControl(root, 'day')?.value || '', 10) || 0;

  hiddenInput.value = month && day && year
    ? `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    : '';
  syncProfileSettingsDateLabels(root);
}

function syncProfileSettingsDateControls(root, value = '') {
  const hiddenInput = root.querySelector('[data-profile-settings-date-of-birth]');
  const monthSelect = getDateControl(root, 'month');
  const daySelect = getDateControl(root, 'day');
  const yearSelect = getDateControl(root, 'year');

  populateProfileSettingsDateOptions(root);

  if (hiddenInput instanceof HTMLInputElement) {
    hiddenInput.value = value || '';
  }

  if (!(monthSelect instanceof HTMLSelectElement) || !(daySelect instanceof HTMLSelectElement) || !(yearSelect instanceof HTMLSelectElement)) {
    return;
  }

  const match = String(value || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    monthSelect.value = '';
    yearSelect.value = '';
    syncProfileSettingsDayOptions(root);
    daySelect.value = '';
    syncProfileSettingsDateLabels(root);
    return;
  }

  yearSelect.value = String(Number.parseInt(match[1], 10));
  monthSelect.value = String(Number.parseInt(match[2], 10));
  syncProfileSettingsDayOptions(root);
  daySelect.value = String(Number.parseInt(match[3], 10));
  syncProfileSettingsDateLabels(root);
}

function setValue(root, name, value) {
  const field = root.querySelector(`[name="${name}"]`);
  if (!field) return;

  if (name === 'date_of_birth') {
    syncProfileSettingsDateControls(root, value || '');
    return;
  }

  if (field instanceof HTMLInputElement && field.type === 'hidden' && field.matches('[data-profile-settings-toggle-input]')) {
    setProfileSettingsToggleValue(root, name, value === true);
    return;
  }

  if (field instanceof HTMLInputElement && field.type === 'checkbox') {
    field.checked = value === true;
    return;
  }

  field.value = value || '';

  if (field instanceof HTMLSelectElement) {
    setSelectLabel(root, name, field.options?.[0]?.textContent || '');
  }
}

function getProfileSettingsToggle(root, name) {
  return root.querySelector(`[data-profile-settings-toggle="${name}"]`);
}

function setProfileSettingsToggleValue(root, name, checked) {
  const input = root.querySelector(`[data-profile-settings-toggle-input="${name}"]`);
  const toggle = getProfileSettingsToggle(root, name);
  const nextChecked = checked === true;

  if (input instanceof HTMLInputElement) {
    input.value = nextChecked ? 'on' : '';
  }

  if (toggle instanceof HTMLElement) {
    toggle.setAttribute('aria-checked', nextChecked ? 'true' : 'false');
    toggle.setAttribute('data-toggle-checked', nextChecked ? 'true' : 'false');
    toggle.dataset.toggleState = nextChecked ? 'on' : 'off';
    toggle.setAttribute('data-cookie-consent-enabled', nextChecked ? 'true' : 'false');

    const track = toggle.querySelector('.na-toggle__track, [data-na-toggle-track]');
    const thumb = toggle.querySelector('.na-toggle__thumb, [data-na-toggle-thumb]');
    if (track instanceof HTMLElement) {
      track.setAttribute('data-toggle-state', nextChecked ? 'on' : 'off');
    }
    if (thumb instanceof HTMLElement) {
      thumb.setAttribute('data-toggle-state', nextChecked ? 'on' : 'off');
    }
  }
}

function syncProfileSettingsToggleInput(toggle) {
  if (!(toggle instanceof HTMLElement)) return;
  const root = toggle.closest('[data-profile-settings-panel]');
  if (!(root instanceof HTMLElement)) return;
  const name = toggle.getAttribute('data-profile-settings-toggle') || '';
  if (!name) return;
  setProfileSettingsToggleValue(root, name, toggle.getAttribute('aria-checked') === 'true');
}

function setControlDisabled(control, disabled) {
  if (!(control instanceof HTMLElement)) return;

  if (
    control instanceof HTMLInputElement
    || control instanceof HTMLButtonElement
    || control instanceof HTMLSelectElement
    || control instanceof HTMLTextAreaElement
  ) {
    control.disabled = disabled;
  }

  control.setAttribute('aria-disabled', disabled ? 'true' : 'false');
}

function setProfileSettingsToggleDisabled(root, name, disabled) {
  const input = root.querySelector(`[data-profile-settings-toggle-input="${name}"]`);
  const toggle = getProfileSettingsToggle(root, name);
  setControlDisabled(input, disabled);
  setControlDisabled(toggle, disabled);
}

function scheduleStatusMessageAutoDismiss(node) {
  if (!(node instanceof HTMLElement)) return;
  const autoDismissDuration = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--status-message-auto-dismiss-duration'), 10) || 3000;

  window.setTimeout(() => {
    node.dataset.statusMessageActive = '';
  }, autoDismissDuration);
}

function applySharedStatusMessage(node, message = '', state = 'idle') {
  if (!(node instanceof HTMLElement)) return;

  node.setAttribute('data-status-message', '');
  node.textContent = message || '';

  if (message && state !== 'idle') {
    node.dataset.statusMessageActive = 'true';
    scheduleStatusMessageAutoDismiss(node);
  } else {
    node.dataset.statusMessageActive = '';
  }
}

function renderStatus(root, scope, saveState) {
  const state = saveState?.[scope] || { status: 'idle', message: '' };
  root.querySelectorAll(`[data-profile-save-status="${scope}"]`).forEach((node) => {
    if (!(node instanceof HTMLElement)) return;
    node.dataset.profileSaveState = state.status || 'idle';
    applySharedStatusMessage(node, state.message || '', state.status || 'idle');
  });
}

function renderSaveStatuses(saveState = getPrivateProfileSaveState()) {
  getSettingsRoots().forEach((root) => {
    renderStatus(root, 'identity', saveState);
    renderStatus(root, 'route', saveState);
    renderStatus(root, 'privacy', saveState);
  });
}

function isPasswordRecoveryActive() {
  try {
    return window.sessionStorage?.getItem(PASSWORD_RECOVERY_STORAGE_KEY) === 'true';
  } catch (_) {
    return false;
  }
}

function clearPasswordRecoveryState() {
  try {
    window.sessionStorage?.removeItem(PASSWORD_RECOVERY_STORAGE_KEY);
  } catch (_) {}
}

function setPasswordStatus(root, message, state = 'idle') {
  const node = root.querySelector('[data-profile-password-status]');
  if (!(node instanceof HTMLElement)) return;
  node.dataset.profilePasswordState = state;
  applySharedStatusMessage(node, message || '', state);
}

function setVerificationStatus(root, message, state = 'idle') {
  const node = root.querySelector('[data-profile-verification-status]');
  if (!(node instanceof HTMLElement)) return;
  const messageNode = root.querySelector('[data-profile-verification-message]');
  if (messageNode instanceof HTMLElement) {
    messageNode.textContent = message || '';
  }
  if (state !== 'idle' && state !== 'ready') {
    node.hidden = false;
  } else {
    node.hidden = true;
  }
  node.dataset.profileVerificationState = state;
}

function renderPaneState(root, navigationState) {
  root.querySelectorAll('[data-profile-settings-pane-target]').forEach((button) => {
    const pane = button.getAttribute('data-profile-settings-pane-target') || '';
    const active = pane === navigationState.settingsPane;
    button.dataset.profileSettingsActive = active ? 'true' : 'false';
    button.setAttribute('aria-selected', active ? 'true' : 'false');
    button.setAttribute('aria-current', active ? 'page' : 'false');
  });

  root.querySelectorAll('[data-profile-settings-pane]').forEach((pane) => {
    const paneKey = pane.getAttribute('data-profile-settings-pane') || '';
    pane.hidden = paneKey !== navigationState.settingsPane;
  });
}

/* =============================================================================
   03) SETTINGS RENDER
   ============================================================================= */

function renderSettings(state = getProfileRuntimeState(), navigationState = getProfileNavigationState(), saveState = getPrivateProfileSaveState()) {
  getSettingsRoots().forEach((root) => {
    const authenticated = state.viewerState === 'authenticated';
    const usernameLocked = Boolean(state.username.normalized);

    renderPaneState(root, navigationState);
    populateProfileSettingsDateOptions(root);

    setValue(root, 'first_name', state.firstName);
    setValue(root, 'last_name', state.lastName);
    setValue(root, 'display_name', state.displayName);
    setValue(root, 'date_of_birth', state.birthDate);
    setValue(root, 'gender', state.gender);
    setValue(root, 'public_summary', state.bio || state.profile?.public_summary || state.profile?.public_bio || '');

    setValue(root, 'username', state.username.raw || state.username.normalized);
    setValue(root, 'public_display_name', state.profile?.public_display_name || state.displayName);
    setValue(root, 'public_identity_label', state.profile?.public_identity_label || '');
    setValue(root, 'public_primary_link', state.profile?.public_primary_link || '');
    setValue(root, 'public_profile_enabled', state.visibility.publicEnabled);
    setValue(root, 'public_profile_discoverable', state.visibility.discoverable);
    setValue(root, 'profile_search_visible', state.profile?.profile_search_visible !== false);
    setValue(root, 'profile_models_visible', state.profile?.profile_models_visible !== false);
    setValue(root, 'profile_followers_visible', state.profile?.profile_followers_visible !== false);
    setValue(root, 'profile_posts_visible', state.profile?.profile_posts_visible !== false);
    setValue(root, 'profile_thoughts_visible', state.profile?.profile_thoughts_visible !== false);

    setText(
      root,
      '[data-profile-settings-username-note]',
      usernameLocked
        ? 'This username is already reserved. Canonical policy currently locks handle changes after reservation.'
        : 'Choose a canonical username before enabling the public route.'
    );

    root.querySelectorAll('input, select, textarea, button[type="submit"], [data-profile-settings-toggle]').forEach((control) => {
      setControlDisabled(control, !authenticated);
    });

    const usernameField = root.querySelector('[name="username"]');
    if (usernameField) {
      setControlDisabled(usernameField, !authenticated || usernameLocked);
    }

    ['public_profile_enabled', 'public_profile_discoverable'].forEach((name) => {
      setProfileSettingsToggleDisabled(root, name, !authenticated || !state.username.normalized);
    });

    const currentPasswordField = root.querySelector('[name="current_password"]');
    if (currentPasswordField instanceof HTMLInputElement) {
      currentPasswordField.required = !isPasswordRecoveryActive();
      currentPasswordField.placeholder = isPasswordRecoveryActive()
        ? 'Not required for reset link'
        : '';
    }

    renderStatus(root, 'identity', saveState);
    renderStatus(root, 'route', saveState);
    renderStatus(root, 'privacy', saveState);
    setSelectLabel(root, 'gender', 'Optional');
    syncProfileSettingsDateLabels(root);

    if (navigationState.settingsPane === 'verification') {
      void renderVerificationState(root, state);
    }
  });
}

async function handlePasswordChangeSubmit(form) {
  const root = form.closest('[data-profile-settings-panel]');
  if (!(root instanceof HTMLElement)) return;

  const formData = new FormData(form);
  const currentPassword = String(formData.get('current_password') || '');
  const newPassword = String(formData.get('new_password') || '');
  const confirmPassword = String(formData.get('new_password_confirm') || '');
  const recoveryActive = isPasswordRecoveryActive();

  setPasswordStatus(root, '', 'idle');

  if (!currentPassword && !recoveryActive) {
    setPasswordStatus(root, 'Enter your current password.', 'error');
    return;
  }

  if (!newPassword) {
    setPasswordStatus(root, 'Enter a new password.', 'error');
    return;
  }

  if (newPassword !== confirmPassword) {
    setPasswordStatus(root, 'Passwords do not match.', 'error');
    return;
  }

  const policy = await loadAccountPasswordPolicy();
  const evaluation = evaluateAccountPassword(newPassword, policy);
  if (!evaluation.ok) {
    setPasswordStatus(root, evaluation.message, 'error');
    return;
  }

  setPasswordStatus(root, 'Updating password...', 'saving');

  try {
    const supabase = getSupabaseClient();
    if (!supabase?.auth) {
      throw new Error('SUPABASE_CLIENT_UNAVAILABLE');
    }

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;

    const user = sessionData?.session?.user || null;
    const email = normalizeString(user?.email || user?.user_metadata?.email || '');
    if (!user?.id || !email) {
      throw new Error('AUTH_REQUIRED');
    }

    if (!recoveryActive) {
      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword
      });

      if (reauthError) {
        throw reauthError;
      }
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (updateError) {
      throw updateError;
    }

    clearPasswordRecoveryState();
    form.reset();
    setPasswordStatus(root, 'Password updated.', 'success');
    void recordProfileChangelogEvent({
      area: 'security',
      action: 'password_changed',
      title: 'Password changed',
      detail: 'The account password was updated from profile settings.'
    });
  } catch (error) {
    const message = normalizeString(error?.message || '').toLowerCase().includes('invalid login')
      ? 'Current password is not correct.'
      : 'Password could not be updated. Verify the account session and try again.';
    setPasswordStatus(root, message, 'error');
    console.error('[profile-settings] Password update failed.', error);
  }
}

async function renderVerificationState(root, state = getProfileRuntimeState()) {
  const submit = root.querySelector('[data-profile-verification-submit]');
  if (!submit) return;

  setControlDisabled(submit, state.viewerState !== 'authenticated' || state.verification?.verified === true);

  try {
    const verificationState = await getProfileVerificationState(state.profile);
    const latestStatus = verificationState.latestRequest?.request_status || '';
    const message = state.verification?.verified === true
      ? 'This profile is verified. The public badge is controlled by the backend verification state.'
      : latestStatus
        ? `Latest request status: ${latestStatus}.`
        : verificationState.tableAvailable
          ? 'No verification request has been submitted yet.'
          : 'Verification request storage requires the Supabase profile_verification_requests table.';

    setVerificationStatus(root, message, verificationState.tableAvailable ? 'ready' : 'error');
  } catch (error) {
    console.error('[profile-settings] Verification state failed.', error);
    setVerificationStatus(root, 'Verification state could not be loaded.', 'error');
  }
}

/* =============================================================================
   04) SETTINGS INIT
   ============================================================================= */

function initProfileSettings() {
  const render = () => renderSettings();

  subscribeProfileRuntime(render);
  subscribeProfileNavigation(render);
  subscribePrivateProfileSaveState(renderSaveStatuses);

  document.addEventListener('submit', async (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || !form.matches('[data-profile-verification-form]')) return;

    event.preventDefault();
    const root = form.closest('[data-profile-settings-panel]');
    if (!(root instanceof HTMLElement)) return;

    const formData = new FormData(form);
    setVerificationStatus(root, 'Submitting verification request...', 'saving');

    try {
      await requestProfileVerification({
        request_note: formData.get('request_note') || ''
      });
      form.reset();
      setVerificationStatus(root, 'Verification request submitted for review.', 'success');
      void recordProfileChangelogEvent({
        area: 'verification',
        action: 'verification_requested',
        title: 'Verification requested',
        detail: 'A profile verification request was submitted.'
      });
    } catch (error) {
      const code = String(error?.code || error?.message || '').trim();
      const message = code === 'PROFILE_VERIFICATION_BACKEND_UNAVAILABLE'
        ? 'Verification storage is not configured. Connect Supabase first.'
        : code === 'PROFILE_REQUIRED'
          ? 'Create and save your profile before requesting verification.'
          : 'Verification request could not be submitted. Check the Supabase verification table and policies.';
      setVerificationStatus(root, message, 'error');
    }
  });

  document.addEventListener('submit', async (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || !form.matches('[data-profile-password-form]')) return;

    event.preventDefault();
    await handlePasswordChangeSubmit(form);
  });

  document.addEventListener('neuroartan:toggle-changed', (event) => {
    const toggle = event?.detail?.element;
    if (!(toggle instanceof HTMLElement) || !toggle.matches('[data-profile-settings-toggle]')) return;
    syncProfileSettingsToggleInput(toggle);
  });

  document.addEventListener('change', (event) => {
    const control = event.target;
    if (!(control instanceof HTMLSelectElement)) return;
    const root = control.closest('[data-profile-settings-panel]');
    if (!(root instanceof HTMLElement)) return;
    if (control.matches('[data-profile-settings-date-control]')) {
      syncProfileSettingsDateValue(root);
    }
    if (control.name) {
      setSelectLabel(root, control.name, control.options?.[0]?.textContent || '');
    }
  });

  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-profile-settings-info-toggle]');
    if (!(button instanceof HTMLElement)) return;
    const root = button.closest('[data-profile-settings-panel]');
    if (!(root instanceof HTMLElement)) return;
    const popover = root.querySelector('[data-profile-settings-info-popover]');
    if (!(popover instanceof HTMLElement)) return;
    const isExpanded = button.getAttribute('aria-expanded') === 'true';
    button.setAttribute('aria-expanded', (!isExpanded).toString());
    popover.hidden = isExpanded;
  });

  document.addEventListener('click', (event) => {
    const target = event.target;
    const button = target.closest('[data-profile-settings-info-toggle]');
    const popover = target.closest('[data-profile-settings-info-popover]');
    if (button || popover) return;
    document.querySelectorAll('[data-profile-settings-info-toggle][aria-expanded="true"]').forEach((expandedButton) => {
      expandedButton.setAttribute('aria-expanded', 'false');
      const root = expandedButton.closest('[data-profile-settings-panel]');
      if (!(root instanceof HTMLElement)) return;
      const expandedPopover = root.querySelector('[data-profile-settings-info-popover]');
      if (expandedPopover instanceof HTMLElement) {
        expandedPopover.hidden = true;
      }
    });
  });

  document.addEventListener('click', (event) => {
    const closeButton = event.target.closest('[data-profile-verification-overlay-close]');
    if (!(closeButton instanceof HTMLElement)) return;
    const root = closeButton.closest('[data-profile-settings-panel]');
    if (!(root instanceof HTMLElement)) return;
    const overlay = root.querySelector('[data-profile-verification-status]');
    if (overlay instanceof HTMLElement) {
      overlay.hidden = true;
    }
  });

  document.addEventListener('fragment:mounted', (event) => {
    if (event?.detail?.name !== 'profile-private-settings-panel') return;
    render();
  });

  render();
}

initProfileSettings();
