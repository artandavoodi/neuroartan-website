import { mountSettingsCategory } from '../_shared/settings-category.js';
import {
  getSupabaseClient,
} from '../../../../system/account/identity/account-profile-identity.js';
import {
  readUserConnectorState,
  saveUserConnectorState
} from '../../../../system/model/model-store.js';

const CONNECTOR_STORAGE_KEY = 'neuroartan.connector-states';

const CONNECTOR_CATALOG = Object.freeze({
  github: {
    label: 'GitHub',
    category: 'repository',
    runtime: 'oauth-required',
    sourceVaultReady: true,
  },
  gitlab: {
    label: 'GitLab',
    category: 'repository',
    runtime: 'oauth-required',
    sourceVaultReady: true,
  },
  'google-drive': {
    label: 'Google Drive',
    category: 'cloud-drive',
    runtime: 'oauth-required',
    sourceVaultReady: true,
  },
  dropbox: {
    label: 'Dropbox',
    category: 'cloud-drive',
    runtime: 'oauth-required',
    sourceVaultReady: true,
  },
  onedrive: {
    label: 'OneDrive',
    category: 'cloud-drive',
    runtime: 'oauth-required',
    sourceVaultReady: true,
  },
  'icloud-drive': {
    label: 'iCloud Drive',
    category: 'cloud-drive',
    runtime: 'native-apple-bridge-required',
    sourceVaultReady: true,
  },
  'local-device': {
    label: 'Local Device',
    category: 'device',
    runtime: 'browser-file-picker',
    sourceVaultReady: true,
  },
  'android-device': {
    label: 'Android Device',
    category: 'device',
    runtime: 'mobile-document-picker-required',
    sourceVaultReady: true,
  },
  'windows-device': {
    label: 'Windows Device',
    category: 'device',
    runtime: 'browser-file-picker',
    sourceVaultReady: true,
  },
  x: {
    label: 'X',
    category: 'social',
    runtime: 'oauth-required',
    sourceVaultReady: false,
  },
  slack: {
    label: 'Slack',
    category: 'workspace',
    runtime: 'oauth-required',
    sourceVaultReady: false,
  },
  notion: {
    label: 'Notion',
    category: 'workspace',
    runtime: 'oauth-required',
    sourceVaultReady: true,
  },
  gmail: {
    label: 'Gmail',
    category: 'google-workspace',
    runtime: 'oauth-required',
    sourceVaultReady: false,
  },
  calendar: {
    label: 'Calendar',
    category: 'google-workspace',
    runtime: 'oauth-required',
    sourceVaultReady: false,
  },
  contacts: {
    label: 'Contacts',
    category: 'google-workspace',
    runtime: 'oauth-required',
    sourceVaultReady: false,
  },
});

function normalizeConnectorState(service, state = {}) {
  const catalog = CONNECTOR_CATALOG[service] || {};
  const legacyConnected = typeof state === 'boolean' ? state : state.connected === true;
  const requestedState = state.connectionState || (legacyConnected ? 'authorization-required' : 'not-connected');
  const connectionState = requestedState;

  return {
    service,
    label: state.label || catalog.label || service,
    category: state.category || catalog.category || 'general',
    runtime: state.runtime || catalog.runtime || 'not-configured',
    sourceVaultReady: Boolean(state.sourceVaultReady ?? catalog.sourceVaultReady),
    connectionState,
    connected: connectionState === 'connected',
    updatedAt: state.updatedAt || '',
  };
}

function getConnectorStates() {
  try {
    const stored = localStorage.getItem(CONNECTOR_STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : {};
    return Object.entries(parsed).reduce((states, [service, state]) => {
      states[service] = normalizeConnectorState(service, state);
      return states;
    }, {});
  } catch (error) {
    return {};
  }
}

function writeConnectorStates(states = {}) {
  localStorage.setItem(CONNECTOR_STORAGE_KEY, JSON.stringify(states));
  document.dispatchEvent(new CustomEvent('neuroartan:connector-states-updated', {
    detail: { states },
  }));
}

async function persistConnectorState(service, state = {}) {
  try {
    await saveUserConnectorState(service, {
      ...state,
      metadata: {
        ...(state.metadata || {}),
        localStorageKey: CONNECTOR_STORAGE_KEY,
      },
    });
  } catch (error) {
    console.warn('[Neuroartan][Settings] Connector Supabase persistence failed.', error);
  }
}

function writeConnectorStateEverywhere(service, state = {}) {
  const states = getConnectorStates();
  states[service] = normalizeConnectorState(service, {
    ...state,
    updatedAt: new Date().toISOString(),
  });
  writeConnectorStates(states);
  void persistConnectorState(service, states[service]);
  return states[service];
}

function getConnectorUpdatedAt(state = {}) {
  const time = Number.isFinite(Date.parse(state?.updatedAt || state?.updated_at || '')) ? Date.parse(state?.updatedAt || state?.updated_at || '') : 0;
  return time;
}

async function hydrateConnectorStateFromBackend(root) {
  try {
    const backendState = await readUserConnectorState();
    if (!backendState || typeof backendState !== 'object' || !Object.keys(backendState).length) return;

    const current = getConnectorStates();
    const next = { ...current };

    Object.entries(backendState).forEach(([service, backendRecord]) => {
      const normalizedBackend = normalizeConnectorState(service, backendRecord || {});
      const localRecord = normalizeConnectorState(service, current[service] || {});
      next[service] = getConnectorUpdatedAt(localRecord) >= getConnectorUpdatedAt(normalizedBackend)
        ? localRecord
        : normalizedBackend;
    });

    writeConnectorStates(next);
    loadConnectorStates(root);
  } catch (error) {
    console.warn('[Neuroartan][Settings] Connector Supabase hydration failed.', error);
  }
}

function setConnectorState(service, connectionState) {
  const current = normalizeConnectorState(service, getConnectorStates()[service]);
  return writeConnectorStateEverywhere(service, {
    ...current,
    connectionState,
  });
}

function getConnectorStatusLabel(state = {}) {
  if (state.connectionState === 'connected') return 'Connected';
  if (state.connectionState === 'authorizing') return 'Authorizing';
  if (state.connectionState === 'authorization-required') return 'Authorization required';
  if (state.connectionState === 'setup-required') return 'Setup required';
  if (state.connectionState === 'revoked') return 'Revoked';
  if (state.connectionState === 'expired') return 'Expired';
  if (state.connectionState === 'error') return 'Error';
  if (state.runtime === 'native-apple-bridge-required') return 'Native bridge required';
  if (state.runtime === 'mobile-document-picker-required') return 'Mobile picker required';
  if (state.runtime === 'browser-file-picker') return 'Available';
  return 'Not connected';
}

async function startXConnectorAuthorization(root, service) {
  const currentState = normalizeConnectorState(service, getConnectorStates()[service]);
  const authorizingState = writeConnectorStateEverywhere(service, {
    ...currentState,
    connectionState: 'authorizing',
  });
  updateConnectorStatus(root, service, authorizingState);

  try {
    const supabase = getSupabaseClient();
    if (!supabase?.functions) throw new Error('SUPABASE_FUNCTIONS_UNAVAILABLE');

    const { data, error } = await supabase.functions.invoke('connectors-x-start', {
      method: 'POST',
      body: {},
    });

    if (error) throw error;
    if (!data?.authorizationUrl) throw new Error('X_AUTHORIZATION_URL_MISSING');

    window.location.assign(data.authorizationUrl);
  } catch (error) {
    console.warn('[Neuroartan][Settings] X connector authorization failed.', error);
    const failedState = writeConnectorStateEverywhere(service, {
      ...currentState,
      connectionState: 'error',
      metadata: {
        ...(currentState.metadata || {}),
        error: error?.message || 'X connector authorization failed.',
      },
    });
    updateConnectorStatus(root, service, failedState);
  }
}

function updateConnectorStatus(root, service, state = {}) {
  const connectorItem = root.querySelector(`[data-home-platform-connector-service="${service}"]`);
  if (!connectorItem) return;

  const normalizedState = normalizeConnectorState(service, state);
  const statusElement = connectorItem.querySelector('.home-platform-theme__connector-status');

  if (statusElement) {
    statusElement.textContent = getConnectorStatusLabel(normalizedState);
    statusElement.dataset.homePlatformConnectorStatus = normalizedState.connectionState === 'authorization-required' || normalizedState.connectionState === 'setup-required'
      ? 'not-connected'
      : normalizedState.connectionState;
  }

  connectorItem.dataset.connectorRuntime = normalizedState.runtime;
  connectorItem.dataset.connectorCategory = normalizedState.category;
  connectorItem.dataset.connectorSourceVaultReady = normalizedState.sourceVaultReady ? 'true' : 'false';

  connectorItem.removeAttribute('data-connector-connected');
  connectorItem.dataset.connectorConnectionState = normalizedState.connectionState;
}

function seedConnectorCatalog(root) {
  const states = getConnectorStates();
  let changed = false;

  Object.keys(CONNECTOR_CATALOG).forEach((service) => {
    if (states[service]) return;
    states[service] = normalizeConnectorState(service, {
      connectionState: 'not-connected',
      updatedAt: new Date().toISOString(),
    });
    changed = true;
    void persistConnectorState(service, states[service]);
  });

  if (changed) writeConnectorStates(states);
  if (root) loadConnectorStates(root);
}

function loadConnectorStates(root) {
  const storedStates = getConnectorStates();

  root.querySelectorAll('[data-home-platform-connector-service]').forEach((item) => {
    const service = item.dataset.homePlatformConnectorService;
    const state = normalizeConnectorState(service, storedStates[service]);
    updateConnectorStatus(root, service, state);
  });
}

function bindConnectorClicks(root) {
  const connectorItems = root.querySelectorAll('[data-home-platform-connector-service]');
  connectorItems.forEach((item) => {
    if (item.dataset.connectorBound === 'true') return;

    item.dataset.connectorBound = 'true';
    item.addEventListener('click', () => {
      const service = item.dataset.homePlatformConnectorService;
      const currentState = normalizeConnectorState(service, getConnectorStates()[service]);
      if (service === 'x') {
        void startXConnectorAuthorization(root, service);
        return;
      }

      const nextState = currentState.connectionState === 'authorization-required'
        ? 'not-connected'
        : 'authorization-required';
      const savedState = setConnectorState(service, nextState);
      updateConnectorStatus(root, service, savedState);
    });
  });
}

export function getHomePlatformConnectorStates() {
  return getConnectorStates();
}

export function mountHomePlatformDestination(root, options = {}) {
  mountSettingsCategory(root, options);

  seedConnectorCatalog(root);
  loadConnectorStates(root);
  void hydrateConnectorStateFromBackend(root).then(() => seedConnectorCatalog(root));
  bindConnectorClicks(root);
}
