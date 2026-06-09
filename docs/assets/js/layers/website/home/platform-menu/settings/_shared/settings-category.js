import {
  getRuntimeProviderState,
  setRuntimeProviderState
} from '../../../../../../core/03-runtime/providers/runtime-provider-state.js';
import {
  buildPublicProfileDisplay,
  buildPublicProfilePath
} from '../../../../system/account/identity/account-profile-identity.js';
import {
  readUserPermissionState,
  saveUserPermissionState
} from '../../../../system/model/model-store.js';

const SETTINGS_ACTION_SELECTOR = '[data-home-platform-settings-action]';
const SETTINGS_STATUS_SELECTOR = '[data-home-platform-settings-status]';
const RUNTIME_PROVIDER_SELECTOR = '[data-home-platform-runtime-provider]';
const RUNTIME_MODEL_SELECTOR = '[data-home-platform-runtime-model]';
const RUNTIME_API_KEY_SELECTOR = '[data-home-platform-runtime-api-key]';
const RUNTIME_SERVER_URL_SELECTOR = '[data-home-platform-runtime-server-url]';
const SECTION_TOGGLE_SELECTOR = '[data-home-platform-theme-section-toggle]';
const SECTION_CONTENT_SELECTOR = '[data-home-platform-theme-section-content]';
const PLUS_ICON_PATH = '/registry/icons/public/assets/core/actions/create/plus.svg';
const MINUS_ICON_PATH = '/registry/icons/public/assets/core/actions/minus/minus.svg';
const NEUROARTAN_PERMISSION_STATE_KEY = 'neuroartan.permissions.state';
const PERMISSION_KEY_MAP = Object.freeze({
  'permission-files': 'files',
  'permission-local-folder': 'localFolder',
  'permission-selected-files': 'selectedFiles',
  'permission-icloud-folder': 'icloudFolder',
  'permission-repository-reference': 'repositoryReference',
  'permission-source-vault': 'sourceVault',
  'permission-memory': 'memory',
  'permission-voice': 'voice',
  'permission-legacy': 'legacy',
  'permission-notifications': 'notifications',
  'permission-microphone': 'microphone',
  'permission-camera': 'camera',
});

function emit(name, detail = {}) {
  document.dispatchEvent(new CustomEvent(name, { detail }));
}

function readPermissionState() {
  try {
    return JSON.parse(window.localStorage?.getItem(NEUROARTAN_PERMISSION_STATE_KEY) || '{}') || {};
  } catch (error) {
    return {};
  }
}

function writePermissionState(key, state = {}) {
  const current = readPermissionState();
  const next = {
    ...current,
    [key]: normalizePermissionRecord({
      ...(current[key] || {}),
      ...state,
      updatedAt: new Date().toISOString(),
    }),
  };

  window.localStorage?.setItem(NEUROARTAN_PERMISSION_STATE_KEY, JSON.stringify(next));
  emit('neuroartan:permissions-state-updated', { key, state: next[key], permissions: next });
  return next[key];
}

async function persistPermissionState(key, state = {}) {
  try {
    await saveUserPermissionState(key, {
      ...state,
      metadata: {
        ...(state.metadata || {}),
        localStorageKey: NEUROARTAN_PERMISSION_STATE_KEY,
      },
    });
  } catch (error) {
    console.warn('[Neuroartan][Settings] Permission Supabase persistence failed.', error);
  }
}

function writePermissionStateEverywhere(key, state = {}) {
  const record = writePermissionState(key, state);
  void persistPermissionState(key, record);
  return record;
}

async function hydratePermissionStateFromBackend(root) {
  try {
    const backendState = await readUserPermissionState();
    if (!backendState || typeof backendState !== 'object' || !Object.keys(backendState).length) return;

    const current = readPermissionState();
    const next = { ...current };

    Object.entries(backendState).forEach(([key, backendRecord]) => {
      const normalizedBackend = normalizePermissionRecord(backendRecord || {});
      const localRecord = normalizePermissionRecord(current[key] || {});
      next[key] = getPermissionUpdatedAt(localRecord) >= getPermissionUpdatedAt(normalizedBackend)
        ? localRecord
        : normalizedBackend;
    });

    window.localStorage?.setItem(NEUROARTAN_PERMISSION_STATE_KEY, JSON.stringify(next));
    window.requestAnimationFrame(() => hydratePermissionToggles(root));
  } catch (error) {
    console.warn('[Neuroartan][Settings] Permission Supabase hydration failed.', error);
  }
}

function getPermissionKey(toggleKey = '') {
  return PERMISSION_KEY_MAP[toggleKey] || String(toggleKey || '').replace(/^permission-/, '');
}

function normalizePermissionRecord(record = {}) {
  const originalState = record?.state || record?.permission_state || '';
  let state = originalState;

  if (
    originalState === 'pending_native_bridge'
    || originalState === 'pending_voice_capture_consent'
    || originalState === 'pending_legal_review'
  ) {
    state = 'enabled';
  }

  if (originalState === 'unsupported' && record?.requiresFallbackPicker === true) {
    state = 'enabled';
  }

  return {
    ...(record || {}),
    state,
  };
}

function getPermissionUpdatedAt(record = {}) {
  const value = record?.updatedAt || record?.updated_at || '';
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : 0;
}

function isPermissionEnabled(record = {}) {
  const state = normalizePermissionRecord(record).state || '';
  return state === 'enabled' || state === 'granted';
}

function writeGovernedPermissionState(root, key, state = {}) {
  const record = writePermissionStateEverywhere(key, {
    state: state.state || 'enabled',
    runtime: state.runtime || 'settings-permissions',
    source: state.source || 'settings-permissions',
    ...state,
  });

  const isEnabled = record.state === 'enabled' || record.state === 'granted';
  setStatus(root, `${key} permission ${record.state}`, isEnabled ? 'ok' : 'warning');
  return record;
}

function hydratePermissionToggles(root) {
  const permissions = readPermissionState();
  root.querySelectorAll('[data-toggle-scope="permissions"][data-toggle-key]').forEach((toggle) => {
    if (!(toggle instanceof HTMLButtonElement)) return;
    const permissionKey = getPermissionKey(toggle.dataset.toggleKey || '');
    const enabled = isPermissionEnabled(permissions[permissionKey] || {});
    toggle.setAttribute('aria-checked', enabled ? 'true' : 'false');
    toggle.classList.toggle('is-active', enabled);
    toggle.dataset.toggleState = enabled ? 'on' : 'off';
  });
}

function setStatus(root, message, tone = 'neutral') {
  const status = root.querySelector(SETTINGS_STATUS_SELECTOR);
  if (!(status instanceof HTMLElement)) return;

  status.textContent = message;
  status.dataset.statusTone = tone;
}

function getSnapshot(options = {}) {
  return options?.snapshot || window.__NEURO_MAIN_RUNTIME__?.homeSurfaceState || {};
}

function openSettingsRoute(options = {}, route = '') {
  const targetRoute = String(route || '').trim();
  if (!targetRoute || typeof options.setSubdestination !== 'function') return false;
  void options.setSubdestination(targetRoute);
  return true;
}

function bindExternalSettingsRouteRequests(root, options = {}) {
  if (document.documentElement.dataset.homeSettingsRouteRequestsBound === 'true') return;
  document.documentElement.dataset.homeSettingsRouteRequestsBound = 'true';

  const routeHandler = (event) => {
    const route = String(
      event?.detail?.destination
      || event?.detail?.category
      || event?.detail?.panel
      || ''
    ).trim();

    if (!route) return;
    openSettingsRoute(options, route);
  };

  document.addEventListener('neuroartan:settings-route-requested', routeHandler);
  document.addEventListener('neuroartan:home-settings-route-requested', routeHandler);
  document.addEventListener('neuroartan:platform-settings-route-requested', routeHandler);
}

function requestAccountEntry(source) {
  emit('account:entry-request', { source });
}

function requestCountryLanguage(source) {
  emit('neuroartan:country-overlay-open-requested', { source });
}

function requestCookieSettings(source) {
  emit('neuroartan:cookie-consent-open-requested', {
    source,
    surface: 'settings'
  });
}

function requestMicrophone(root, source) {
  const microphone = document.querySelector('#stage-microphone-button');
  if (microphone instanceof HTMLButtonElement) {
    microphone.click();
    setStatus(root, 'Voice input requested through the homepage microphone runtime', 'ok');
    return;
  }

  setStatus(root, 'No microphone control is mounted on this surface', 'warning');
  emit('neuroartan:voice-input-requested', { source });
}

async function requestBrowserPermission(root, name) {
  try {
    if (name === 'microphone' && navigator.mediaDevices?.getUserMedia) {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      writePermissionStateEverywhere('microphone', { state: 'granted', runtime: 'browser' });
      setStatus(root, 'Microphone permission is available for this browser session', 'ok');
      return;
    }

    if (name === 'camera' && navigator.mediaDevices?.getUserMedia) {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach((track) => track.stop());
      writePermissionStateEverywhere('camera', { state: 'granted', runtime: 'browser' });
      setStatus(root, 'Camera permission is available for this browser session', 'ok');
      return;
    }

    if (name === 'notifications' && 'Notification' in window) {
      if (Notification.permission === 'denied') {
        writePermissionStateEverywhere('notifications', {
          state: 'disabled',
          runtime: 'browser',
          browserPermission: 'denied',
        });
        setStatus(root, 'Notifications are blocked by browser settings. Enable them in the browser first.', 'warning');
        return;
      }

      const result = await Notification.requestPermission();
      const state = result === 'granted' ? 'granted' : 'disabled';
      writePermissionStateEverywhere('notifications', {
        state,
        runtime: 'browser',
        browserPermission: result,
      });
      setStatus(root, `Notification permission: ${result}`, result === 'granted' ? 'ok' : 'warning');
      return;
    }

    writePermissionStateEverywhere(name, { state: 'disabled', runtime: 'browser' });
    setStatus(root, `${name} permission is not exposed by this browser runtime`, 'warning');
  } catch (error) {
    writePermissionStateEverywhere(name, { state: 'blocked', runtime: 'browser', error: error?.message || 'blocked' });
    setStatus(root, `${name} permission request failed: ${error?.message || 'blocked'}`, 'error');
  }
}

async function requestFileScope(root, permissionKey = 'files') {
  try {
    if (typeof window.showDirectoryPicker === 'function') {
      const directory = await window.showDirectoryPicker({ mode: 'read' });
      writePermissionStateEverywhere(permissionKey, {
        state: 'granted',
        runtime: 'file-system-access-api',
        scopeName: directory.name,
        supportsDirectoryPicker: true,
      });
      window.__NEUROARTAN_FILE_SCOPE_HANDLE__ = directory;
      setStatus(root, `Filesystem scope selected: ${directory.name}`, 'ok');
      return directory;
    }

    writePermissionStateEverywhere(permissionKey, {
      state: 'enabled',
      runtime: 'browser-file-input-fallback',
      supportsDirectoryPicker: false,
      requiresFallbackPicker: true,
    });
    setStatus(root, 'Folder access is enabled through the browser file/folder picker fallback', 'ok');
  } catch (error) {
    const stopped = error?.name === 'AbortError' ? 'cancelled' : error?.message || 'blocked';
    writePermissionStateEverywhere(permissionKey, {
      state: stopped === 'cancelled' ? 'disabled' : 'blocked',
      runtime: 'file-system-access-api',
      error: stopped,
    });
    setStatus(root, `Filesystem scope request stopped: ${stopped}`, 'warning');
  }

  return null;
}

function downloadTextFile(filename, text) {
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function exportLocalSettings(root) {
  const payload = {
    exportedAt: new Date().toISOString(),
    theme: window.NeuroartanTheme?.getCurrentThemeState?.() || null,
    runtimeProvider: getRuntimeProviderState(),
    permissions: readPermissionState(),
    localStorage: Object.fromEntries(
      Object.keys(window.localStorage || {})
        .filter((key) => key.startsWith('neuroartan'))
        .map((key) => [key, window.localStorage.getItem(key)])
    )
  };

  downloadTextFile('neuroartan-settings-export.json', JSON.stringify(payload, null, 2));
  setStatus(root, 'Settings export created from the live browser runtime', 'ok');
}

function clearLocalPreferences(root) {
  const confirmed = window.confirm('Clear local Neuroartan website preferences from this browser?');
  if (!confirmed) return;

  Object.keys(window.localStorage || {})
    .filter((key) => key.startsWith('neuroartan'))
    .forEach((key) => window.localStorage.removeItem(key));

  setStatus(root, 'Local Neuroartan website preferences were cleared', 'ok');
}

function syncRuntimeProviderFields(root) {
  const providerInput = root.querySelector(RUNTIME_PROVIDER_SELECTOR);
  const modelInput = root.querySelector(RUNTIME_MODEL_SELECTOR);
  const apiKeyInput = root.querySelector(RUNTIME_API_KEY_SELECTOR);
  const serverUrlInput = root.querySelector(RUNTIME_SERVER_URL_SELECTOR);
  const state = getRuntimeProviderState();

  if (providerInput instanceof HTMLSelectElement) {
    providerInput.value = state.activeProvider || 'gemini';
  }

  if (modelInput instanceof HTMLSelectElement || modelInput instanceof HTMLInputElement) {
    modelInput.value = state.activeModel || '';
  }

  if (apiKeyInput instanceof HTMLInputElement) {
    apiKeyInput.value = window.localStorage.getItem(`neuroartan-provider-${state.activeProvider || 'gemini'}-key`) || '';
  }

  if (serverUrlInput instanceof HTMLInputElement) {
    serverUrlInput.value = state.serverUrl || 'http://localhost:1234/v1';
  }
}

function bindRuntimeProviderFields(root) {
  const providerInput = root.querySelector(RUNTIME_PROVIDER_SELECTOR);
  const modelInput = root.querySelector(RUNTIME_MODEL_SELECTOR);
  const apiKeyInput = root.querySelector(RUNTIME_API_KEY_SELECTOR);
  const serverUrlInput = root.querySelector(RUNTIME_SERVER_URL_SELECTOR);

  if (providerInput instanceof HTMLSelectElement && providerInput.dataset.settingsRuntimeBound !== 'true') {
    providerInput.dataset.settingsRuntimeBound = 'true';
    providerInput.addEventListener('change', () => {
      setRuntimeProviderState({ activeProvider: providerInput.value });
      syncRuntimeProviderFields(root);
      setStatus(root, `Active provider saved: ${providerInput.value}`, 'ok');
    });
  }

  if (modelInput instanceof HTMLSelectElement && modelInput.dataset.settingsRuntimeBound !== 'true') {
    modelInput.dataset.settingsRuntimeBound = 'true';
    modelInput.addEventListener('change', () => {
      setRuntimeProviderState({ activeModel: modelInput.value.trim() });
      setStatus(root, `Active model saved: ${modelInput.value.trim() || 'not set'}`, 'ok');
    });
  }

  if (apiKeyInput instanceof HTMLInputElement && apiKeyInput.dataset.settingsRuntimeBound !== 'true') {
    apiKeyInput.dataset.settingsRuntimeBound = 'true';
    apiKeyInput.addEventListener('change', () => {
      const provider = providerInput instanceof HTMLSelectElement ? providerInput.value : getRuntimeProviderState().activeProvider || 'gemini';
      window.localStorage.setItem(`neuroartan-provider-${provider}-key`, apiKeyInput.value.trim());
      setStatus(root, `${provider} credential saved in local browser storage`, 'ok');
    });
  }

  if (serverUrlInput instanceof HTMLInputElement && serverUrlInput.dataset.settingsRuntimeBound !== 'true') {
    serverUrlInput.dataset.settingsRuntimeBound = 'true';
    serverUrlInput.addEventListener('change', () => {
      setRuntimeProviderState({ serverUrl: serverUrlInput.value.trim() });
      setStatus(root, `Server URL saved: ${serverUrlInput.value.trim() || 'not set'}`, 'ok');
    });
  }
}

async function scanLocalModels(root) {
  try {
    const response = await fetch('http://localhost:1234/v1/models', {
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const payload = await response.json();
    const models = Array.isArray(payload?.data)
      ? payload.data.map((item) => item?.id).filter(Boolean)
      : [];

    if (!models.length) {
      setStatus(root, 'LM Studio responded, but no local models were returned', 'warning');
      return;
    }

    setRuntimeProviderState({ activeProvider: 'local', activeModel: models[0] });
    syncRuntimeProviderFields(root);
    setStatus(root, `LM Studio connected. ${models.length} model${models.length === 1 ? '' : 's'} found. Active: ${models[0]}`, 'ok');
  } catch (error) {
    setStatus(root, `LM Studio unavailable at http://localhost:1234/v1/models (${error?.message || 'connection failed'})`, 'warning');
  }
}

function applyMotionPreference(root, enabled) {
  window.localStorage.setItem('neuroartan-accessibility-motion', enabled ? 'enabled' : 'reduced');
  document.documentElement.dataset.motionPreference = enabled ? 'enabled' : 'reduced';
  setStatus(root, enabled ? 'Motion preference saved as enabled' : 'Reduced motion preference saved', 'ok');
}

function testVoiceOutput(root) {
  if (!('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') {
    setStatus(root, 'Speech synthesis is not available in this browser runtime', 'warning');
    return;
  }

  const utterance = new SpeechSynthesisUtterance('Neuroartan voice output is available');
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
  setStatus(root, 'Voice output test sent to the browser speech runtime', 'ok');
}

function toggleSection(toggleButton) {
  if (!(toggleButton instanceof HTMLButtonElement)) return;

  const section = toggleButton.closest('[data-home-platform-theme-section]');
  if (!(section instanceof HTMLElement)) return;

  const content = section.querySelector(SECTION_CONTENT_SELECTOR);
  if (!(content instanceof HTMLElement)) return;

  const icon = toggleButton.querySelector('.home-platform-theme__section-toggle-icon');
  const isExpanded = toggleButton.getAttribute('aria-expanded') === 'true';

  if (isExpanded) {
    toggleButton.setAttribute('aria-expanded', 'false');
    section.setAttribute('data-home-platform-theme-section-collapsed', 'true');
    if (icon instanceof HTMLImageElement) {
      icon.src = PLUS_ICON_PATH;
    }
  } else {
    toggleButton.setAttribute('aria-expanded', 'true');
    section.removeAttribute('data-home-platform-theme-section-collapsed');
    if (icon instanceof HTMLImageElement) {
      icon.src = MINUS_ICON_PATH;
    }
  }
}

function hydrateCategory(root, options = {}) {
  const snapshot = getSnapshot(options);
  const username = snapshot?.account?.profile?.username || '';
  const language = snapshot?.locale?.language || 'en';
  const country = snapshot?.locale?.countryLabel || 'United States';

  root.querySelectorAll('[data-home-settings-language-value]').forEach((node) => {
    node.textContent = language.toUpperCase();
  });

  root.querySelectorAll('[data-home-settings-country-value]').forEach((node) => {
    node.textContent = country;
  });

  root.querySelectorAll('[data-home-settings-route-value]').forEach((node) => {
    node.textContent = buildPublicProfileDisplay(username);
  });

  syncRuntimeProviderFields(root);
  window.requestAnimationFrame(() => hydratePermissionToggles(root));
  void hydratePermissionStateFromBackend(root);
}

async function handleAction(root, action, options = {}) {
  const source = `home-platform-settings-${root.dataset.settingsCategory || 'category'}`;

  if (action.startsWith('open:')) {
    openSettingsRoute(options, action.slice(5));
    return;
  }

  switch (action) {
    case 'reload-page':
      window.location.reload();
      return;
    case 'reset-rail':
      window.localStorage.removeItem('neuroartan.home.platformShell.railMode');
      setStatus(root, 'Platform rail preference reset', 'ok');
      return;
    case 'country-language':
      requestCountryLanguage(source);
      setStatus(root, 'Language and country selector requested', 'ok');
      return;
    case 'cookie-settings':
      requestCookieSettings(source);
      setStatus(root, 'Cookie and privacy settings requested', 'ok');
      return;
    case 'account-entry':
      requestAccountEntry(source);
      setStatus(root, 'Account entry requested', 'ok');
      return;
    case 'public-profile':
      window.location.href = buildPublicProfilePath(getSnapshot(options)?.account?.profile?.username || '') || '/profile.html';
      return;
    case 'sign-out':
      emit('account:sign-out-request', { source });
      setStatus(root, 'Sign-out requested from the account runtime', 'ok');
      return;
    case 'voice-input':
      requestMicrophone(root, source);
      return;
    case 'voice-output':
      testVoiceOutput(root);
      return;
    case 'permission-local-folder':
      await requestFileScope(root, 'localFolder');
      window.requestAnimationFrame(() => hydratePermissionToggles(root));
      return;
    case 'permission-selected-files':
      writeGovernedPermissionState(root, 'selectedFiles', {
        state: 'enabled',
        runtime: 'file-picker-api',
        supportsFilePicker: true,
      });
      window.requestAnimationFrame(() => hydratePermissionToggles(root));
      return;
    case 'permission-icloud-folder':
      writeGovernedPermissionState(root, 'icloudFolder', {
        state: 'enabled',
        runtime: 'apple-native-required',
        requiresNativeBridge: true,
      });
      window.requestAnimationFrame(() => hydratePermissionToggles(root));
      return;
    case 'permission-repository-reference':
      writeGovernedPermissionState(root, 'repositoryReference', {
        state: 'enabled',
        runtime: 'reference-only',
        requiresBackendConnector: true,
      });
      window.requestAnimationFrame(() => hydratePermissionToggles(root));
      return;
    case 'permission-source-vault':
      writeGovernedPermissionState(root, 'sourceVault', {
        state: 'enabled',
        runtime: 'foundation-source-vault',
      });
      window.requestAnimationFrame(() => hydratePermissionToggles(root));
      return;
    case 'permission-memory':
      writeGovernedPermissionState(root, 'memory', {
        state: 'enabled',
        runtime: 'foundation-consent-required',
        requiresConsent: true,
      });
      window.requestAnimationFrame(() => hydratePermissionToggles(root));
      return;
    case 'permission-voice':
      writeGovernedPermissionState(root, 'voice', {
        state: 'enabled',
        runtime: 'voice-governance-required',
        requiresConsent: true,
      });
      window.requestAnimationFrame(() => hydratePermissionToggles(root));
      return;
    case 'permission-legacy':
      writeGovernedPermissionState(root, 'legacy', {
        state: 'enabled',
        runtime: 'legacy-governance-required',
        requiresLegalReview: true,
      });
      window.requestAnimationFrame(() => hydratePermissionToggles(root));
      return;
    case 'permission-microphone':
      await requestBrowserPermission(root, 'microphone');
      window.requestAnimationFrame(() => hydratePermissionToggles(root));
      return;
    case 'permission-camera':
      await requestBrowserPermission(root, 'camera');
      window.requestAnimationFrame(() => hydratePermissionToggles(root));
      return;
    case 'permission-notifications':
      await requestBrowserPermission(root, 'notifications');
      window.requestAnimationFrame(() => hydratePermissionToggles(root));
      return;
    case 'permission-files':
      await requestFileScope(root, 'files');
      window.requestAnimationFrame(() => hydratePermissionToggles(root));
      return;
    case 'export-settings':
      exportLocalSettings(root);
      return;
    case 'clear-local-preferences':
      clearLocalPreferences(root);
      return;
    case 'contrast-high':
      window.NeuroartanTheme?.setThemeContrast?.('high');
      setStatus(root, 'High contrast applied through the global theme runtime', 'ok');
      return;
    case 'contrast-standard':
      window.NeuroartanTheme?.setThemeContrast?.('standard');
      setStatus(root, 'Standard contrast applied through the global theme runtime', 'ok');
      return;
    case 'motion-reduced':
      applyMotionPreference(root, false);
      return;
    case 'motion-enabled':
      applyMotionPreference(root, true);
      return;
    case 'scan-local-models':
      await scanLocalModels(root);
      return;
    case 'save-runtime':
      syncRuntimeProviderFields(root);
      setStatus(root, 'Runtime state saved in the active browser runtime', 'ok');
      return;
    default:
      emit('neuroartan:settings-action-requested', { source, action });
      setStatus(root, 'This setting has an operational event route, but no browser-local owner is mounted yet', 'warning');
  }
}

export function mountSettingsCategory(root, options = {}) {
  if (!(root instanceof HTMLElement)) return;

  hydrateCategory(root, options);
  bindRuntimeProviderFields(root);
  bindExternalSettingsRouteRequests(root, options);

  root.querySelectorAll(SETTINGS_ACTION_SELECTOR).forEach((control) => {
    if (!(control instanceof HTMLElement)) return;
    if (control.dataset.settingsActionBound === 'true') return;

    control.dataset.settingsActionBound = 'true';
    control.addEventListener('click', (event) => {
      event.preventDefault();
      void handleAction(root, control.getAttribute('data-home-platform-settings-action') || '', options);
    });
  });

  root.querySelectorAll(SECTION_TOGGLE_SELECTOR).forEach((toggleButton) => {
    if (!(toggleButton instanceof HTMLButtonElement)) return;
    if (toggleButton.dataset.sectionToggleBound === 'true') return;

    toggleButton.dataset.sectionToggleBound = 'true';
    toggleButton.addEventListener('click', (event) => {
      event.preventDefault();
      toggleSection(toggleButton);
    });
  });

  bindPermissionToggleListeners(root);
}

function bindPermissionToggleListeners(root) {
  root.addEventListener('neuroartan:toggle-changed', (event) => {
    const detail = event.detail;
    if (!detail || detail.scope !== 'permissions') return;

    const toggleKey = detail.key;
    const isChecked = detail.checked;
    const permissionKey = getPermissionKey(toggleKey);
    event.stopPropagation?.();

    if (!isChecked) {
      writeGovernedPermissionState(root, permissionKey, {
        state: 'disabled',
        runtime: 'settings-permissions',
      });
      window.requestAnimationFrame(() => hydratePermissionToggles(root));
      return;
    }

    switch (toggleKey) {
      case 'permission-files':
        void requestFileScope(root, 'files').then(() => hydratePermissionToggles(root));
        break;
      case 'permission-local-folder':
        void requestFileScope(root, 'localFolder').then(() => hydratePermissionToggles(root));
        break;
      case 'permission-selected-files':
        writeGovernedPermissionState(root, 'selectedFiles', {
          state: 'enabled',
          runtime: 'file-picker-api',
          supportsFilePicker: true,
        });
        window.requestAnimationFrame(() => hydratePermissionToggles(root));
        break;
      case 'permission-icloud-folder':
        writeGovernedPermissionState(root, 'icloudFolder', {
          state: 'enabled',
          runtime: 'apple-native-required',
          requiresNativeBridge: true,
        });
        window.requestAnimationFrame(() => hydratePermissionToggles(root));
        break;
      case 'permission-repository-reference':
        writeGovernedPermissionState(root, 'repositoryReference', {
          state: 'enabled',
          runtime: 'reference-only',
          requiresBackendConnector: true,
        });
        window.requestAnimationFrame(() => hydratePermissionToggles(root));
        break;
      case 'permission-source-vault':
        writeGovernedPermissionState(root, 'sourceVault', {
          state: 'enabled',
          runtime: 'foundation-source-vault',
        });
        window.requestAnimationFrame(() => hydratePermissionToggles(root));
        break;
      case 'permission-memory':
        writeGovernedPermissionState(root, 'memory', {
          state: 'enabled',
          runtime: 'foundation-memory',
        });
        window.requestAnimationFrame(() => hydratePermissionToggles(root));
        break;
      case 'permission-voice':
        writeGovernedPermissionState(root, 'voice', {
          state: 'enabled',
          runtime: 'voice-governance-required',
        });
        window.requestAnimationFrame(() => hydratePermissionToggles(root));
        break;
      case 'permission-legacy':
        writeGovernedPermissionState(root, 'legacy', {
          state: 'enabled',
          runtime: 'legacy-governance-required',
        });
        window.requestAnimationFrame(() => hydratePermissionToggles(root));
        break;
      case 'permission-notifications':
        void requestBrowserPermission(root, 'notifications').then(() => hydratePermissionToggles(root));
        break;
      case 'permission-microphone':
        void requestBrowserPermission(root, 'microphone').then(() => hydratePermissionToggles(root));
        break;
      case 'permission-camera':
        void requestBrowserPermission(root, 'camera').then(() => hydratePermissionToggles(root));
        break;
    }
  });
}
