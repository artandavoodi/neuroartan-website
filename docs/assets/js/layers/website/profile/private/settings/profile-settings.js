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
import { getPrivateProfileSaveState, subscribePrivateProfileSaveState } from '../../../system/profile-save.js';

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

function setValue(root, name, value) {
  const field = root.querySelector(`[name="${name}"]`);
  if (!field) return;

  if (field instanceof HTMLInputElement && field.type === 'checkbox') {
    field.checked = value === true;
    return;
  }

  field.value = value || '';
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

function renderStatus(root, scope, saveState) {
  const node = root.querySelector(`[data-profile-save-status="${scope}"]`);
  if (!(node instanceof HTMLElement)) return;

  const state = saveState?.[scope] || { status: 'idle', message: '' };
  node.dataset.profileSaveState = state.status || 'idle';
  node.textContent = state.message || '';
}

function renderAvatar(root, state) {
  const image = root.querySelector('[data-profile-settings-avatar-image]');
  const placeholder = root.querySelector('[data-profile-settings-avatar-placeholder]');

  if (image instanceof HTMLImageElement) {
    if (state.avatarHasImage && state.avatarUrl) {
      image.hidden = false;
      image.src = state.avatarUrl;
      image.alt = `${state.displayName} avatar`;
    } else {
      image.hidden = true;
      image.removeAttribute('src');
      image.alt = '';
    }
  }

  if (placeholder instanceof HTMLElement) {
    placeholder.hidden = state.avatarHasImage;
    placeholder.textContent = state.avatarInitials;
  }
}

function renderPaneState(root, navigationState) {
  root.querySelectorAll('[data-profile-settings-pane-target]').forEach((button) => {
    const pane = button.getAttribute('data-profile-settings-pane-target') || '';
    button.dataset.profileSettingsActive = pane === navigationState.settingsPane ? 'true' : 'false';
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

    setText(
      root,
      '[data-profile-settings-copy]',
      authenticated
        ? 'Edit the owner-facing profile record, govern the public route, and prepare the profile surface for continuity and public presence.'
        : 'Authenticate to edit identity, route, visibility, and media settings from the private profile surface.'
    );

    setValue(root, 'first_name', state.firstName);
    setValue(root, 'last_name', state.lastName);
    setValue(root, 'display_name', state.displayName);
    setValue(root, 'date_of_birth', state.birthDate);
    setValue(root, 'gender', state.gender);

    setValue(root, 'username', state.username.raw || state.username.normalized);
    setValue(root, 'public_display_name', state.profile?.public_display_name || state.displayName);
    setValue(root, 'public_identity_label', state.profile?.public_identity_label || '');
    setValue(root, 'public_summary', state.profile?.public_summary || '');
    setValue(root, 'public_primary_link', state.profile?.public_primary_link || '');
    setValue(root, 'public_profile_enabled', state.visibility.publicEnabled);
    setValue(root, 'public_profile_discoverable', state.visibility.discoverable);

    setText(
      root,
      '[data-profile-settings-username-note]',
      usernameLocked
        ? 'This username is already reserved. Canonical policy currently locks handle changes after reservation.'
        : 'Choose a canonical username before enabling the public route.'
    );

    setText(root, '[data-profile-settings-avatar-state]', state.avatarHasImage ? 'Canonical avatar active' : 'Avatar pending');
    setText(
      root,
      '[data-profile-settings-avatar-note]',
      state.avatarHasImage
        ? 'Current avatar source is active. Use the managed image flow to replace it.'
        : 'No canonical avatar image is connected yet. Use the managed image flow to establish one.'
    );
    renderAvatar(root, state);

    root.querySelectorAll('input, select, textarea, button[type="submit"]').forEach((control) => {
      setControlDisabled(control, !authenticated);
    });

    const usernameField = root.querySelector('[name="username"]');
    if (usernameField) {
      setControlDisabled(usernameField, !authenticated || usernameLocked);
    }

    const visibilityControls = root.querySelectorAll('[name="public_profile_enabled"], [name="public_profile_discoverable"]');
    visibilityControls.forEach((control) => {
      setControlDisabled(control, !authenticated || !state.username.normalized);
    });

    renderStatus(root, 'identity', saveState);
    renderStatus(root, 'route', saveState);
    renderStatus(root, 'visibility', saveState);
  });
}

/* =============================================================================
   04) SETTINGS INIT
   ============================================================================= */

function initProfileSettings() {
  const render = () => renderSettings();

  subscribeProfileRuntime(render);
  subscribeProfileNavigation(render);
  subscribePrivateProfileSaveState(render);

  document.addEventListener('click', (event) => {
    const trigger = event.target instanceof Element
      ? event.target.closest('[data-profile-settings-pane-target]')
      : null;

    if (!trigger) return;

    const pane = trigger.getAttribute('data-profile-settings-pane-target') || 'identity';

    document.dispatchEvent(new CustomEvent('profile:navigate-request', {
      detail: {
        section: 'settings',
        settingsPane: pane
      }
    }));
  });

  document.addEventListener('fragment:mounted', (event) => {
    if (event?.detail?.name !== 'profile-private-settings-panel') return;
    render();
  });

  render();
}

initProfileSettings();
