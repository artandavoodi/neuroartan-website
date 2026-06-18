import { mountSettingsCategory } from '../_shared/settings-category.js';
import {
  getSupabaseClient,
} from '../../../../system/account/identity/account-profile-identity.js';
import {
  readUserConnectorState,
  saveUserConnectorState
} from '../../../../system/model/model-store.js';

const CONNECTOR_STORAGE_KEY = 'neuroartan.connector-states';

let connectorShellApi = null;

function setConnectorDetailBackState(active = false, label = '') {
  const detailState = {
    active: active === true,
    label,
  };

  if (connectorShellApi?.setHomePlatformDetailBackState) {
    connectorShellApi.setHomePlatformDetailBackState(detailState.active, detailState.label);
    return;
  }

  if (connectorShellApi?.setDetailBackState) {
    connectorShellApi.setDetailBackState(detailState.active, detailState.label);
    return;
  }

  document.dispatchEvent(new CustomEvent('home:platform-shell-detail-state-changed', {
    detail: detailState,
  }));
}

function getConnectorViews(root) {
  return {
    overview: root.querySelector('[data-connector-settings-view="overview"]'),
    management: root.querySelector('[data-connector-settings-view="management"]'),
  };
}

function setConnectorActiveView(root, viewName = 'overview') {
  const normalizedView = viewName === 'management' ? 'management' : 'overview';
  root.querySelectorAll('[data-connector-settings-view]').forEach((view) => {
    view.hidden = view.getAttribute('data-connector-settings-view') !== normalizedView;
  });

  if (normalizedView === 'management') {
    root.dataset.connectorSettingsDetail = 'management';
    setConnectorDetailBackState(true, 'Back to connectors');
    return;
  }

  delete root.dataset.connectorSettingsDetail;
  setConnectorDetailBackState(false);
}

function normalizeConnectorService(service) {
  return String(service || '').trim().toLowerCase();
}

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
  const normalizedService = normalizeConnectorService(service);
  const catalog = CONNECTOR_CATALOG[normalizedService] || {};
  const legacyConnected = typeof state === 'boolean' ? state : state.connected === true;
  const requestedState = state.connectionState
    || state.connection_state
    || (legacyConnected ? 'connected' : 'not-connected');
  const connectionState = requestedState;
  const sourceVaultReady = state.sourceVaultReady
    ?? state.source_vault_ready
    ?? catalog.sourceVaultReady;

  return {
    service: normalizedService,
    label: state.label || state.connector_label || catalog.label || normalizedService,
    category: state.category || state.connector_category || catalog.category || 'general',
    runtime: state.runtime || catalog.runtime || 'not-configured',
    sourceVaultReady: Boolean(sourceVaultReady),
    connectionState,
    connected: connectionState === 'connected',
    metadata: state.metadata && typeof state.metadata === 'object' ? state.metadata : {},
    updatedAt: state.updatedAt || state.updated_at || '',
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

function writeConnectorStateEverywhere(service, state = {}, options = {}) {
  const normalizedService = normalizeConnectorService(service);
  const states = getConnectorStates();
  states[normalizedService] = normalizeConnectorState(normalizedService, {
    ...state,
    updatedAt: new Date().toISOString(),
  });
  writeConnectorStates(states);
  if (options.persist !== false) {
    void persistConnectorState(normalizedService, states[normalizedService]);
  }
  return states[normalizedService];
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
      next[service] = normalizedBackend;
    });

    writeConnectorStates(next);
    loadConnectorStates(root);
  } catch (error) {
    console.warn('[Neuroartan][Settings] Connector Supabase hydration failed.', error);
  }
}

function setConnectorState(service, connectionState) {
  const normalizedService = normalizeConnectorService(service);
  const current = normalizeConnectorState(normalizedService, getConnectorStates()[normalizedService]);
  return writeConnectorStateEverywhere(normalizedService, {
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

function getConnectorImportLimit(root, service) {
  const normalizedService = normalizeConnectorService(service);
  const scopedControl = root.querySelector(`[data-home-platform-connector-import-limit][data-connector-service="${normalizedService}"]`)
    || root.querySelector('[data-home-platform-connector-import-limit]');
  const rawValue = scopedControl?.value || scopedControl?.dataset?.value || '0';
  const parsed = Number.parseInt(String(rawValue || '0'), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function getConnectorImportLimitLabel(limit = 0) {
  return limit > 0 ? `${limit} posts` : 'All available posts';
}

function formatConnectorDate(value = '') {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return '';
  return new Date(timestamp).toLocaleString();
}

function setConnectorStatusTitle(statusTitle, normalizedState) {
  if (!statusTitle) return;

  statusTitle.textContent = '';

  const label = document.createElement('span');
  label.textContent = normalizedState.connected
    ? `${normalizedState.label} is connected`
    : `${normalizedState.label} is not connected`;

  statusTitle.append(label);

  if (!normalizedState.connected) return;

  const dot = document.createElement('span');
  dot.className = 'home-platform-theme__connector-management-status-dot';
  dot.setAttribute('aria-hidden', 'true');
  statusTitle.append(dot);
}

// Helper to get the best available Supabase client for connectors.
async function getConnectorSupabaseClient() {
  if (window.NeuroartanAuth?.getClient) {
    const client = window.NeuroartanAuth.getClient();
    if (client?.from && client?.functions && client?.auth) return client;
  }

  if (window.NeuroartanAuth?.client?.from && window.NeuroartanAuth?.client?.functions && window.NeuroartanAuth?.client?.auth) {
    return window.NeuroartanAuth.client;
  }

  const accountClient = getSupabaseClient();
  if (accountClient?.from && accountClient?.functions && accountClient?.auth) return accountClient;

  if (window.NeuroartanSupabase?.client?.from && window.NeuroartanSupabase?.client?.functions && window.NeuroartanSupabase?.client?.auth) {
    return window.NeuroartanSupabase.client;
  }

  if (window.supabaseClient?.from && window.supabaseClient?.functions && window.supabaseClient?.auth) {
    return window.supabaseClient;
  }

  if (window.supabase?.from && window.supabase?.functions && window.supabase?.auth) {
    return window.supabase;
  }

  return null;
}

// Returns a Supabase session or null if not available or not authenticated.
async function requireConnectorSession() {
  const authSession = await window.NeuroartanAuth?.getSession?.();
  if (authSession?.access_token) return authSession;

  const client = await getConnectorSupabaseClient();
  const sessionResult = await client?.auth?.getSession?.();
  const session = sessionResult?.data?.session || null;
  if (session?.access_token) return session;

  return null;
}

function closeConnectorManagementDestination(root) {
  setConnectorActiveView(root, 'overview');
}

function openConnectorManagementDestination(root, service, state = {}) {
  const normalizedService = normalizeConnectorService(service);
  const normalizedState = normalizeConnectorState(normalizedService, state);
  const { management } = getConnectorViews(root);
  if (!management) return;

  const providerHandle = normalizedState.metadata?.provider_account_handle || normalizedState.metadata?.providerAccountHandle || '';
  const connectedAt = normalizedState.metadata?.connected_at || normalizedState.metadata?.connectedAt || '';
  const importedCount = Number.isFinite(Number(normalizedState.metadata?.imported_count))
    ? Number(normalizedState.metadata.imported_count)
    : 0;
  const receivedCount = Number.isFinite(Number(normalizedState.metadata?.received_count))
    ? Number(normalizedState.metadata.received_count)
    : importedCount;
  const existingCount = Number.isFinite(Number(normalizedState.metadata?.existing_count))
    ? Number(normalizedState.metadata.existing_count)
    : 0;
  const requestedPostLimit = Number.isFinite(Number(normalizedState.metadata?.requested_post_limit))
    ? Number(normalizedState.metadata.requested_post_limit)
    : 0;

  root.dataset.connectorSettingsDetail = normalizedService;
  management.dataset.connectorService = normalizedService;
  management.dataset.connectorConnectionState = normalizedState.connectionState;
  management.dataset.connectorSourceVaultReady = normalizedState.sourceVaultReady ? 'true' : 'false';

  const statusTitle = management.querySelector('[data-home-platform-connector-management-status-title]');
  const statusCopy = management.querySelector('[data-home-platform-connector-management-status-copy]');
  const account = management.querySelector('[data-home-platform-connector-management-account]');
  const source = management.querySelector('[data-home-platform-connector-management-source]');

  setConnectorStatusTitle(statusTitle, normalizedState);

  if (statusCopy) {
    statusCopy.textContent = normalizedState.connected
      ? 'Authorization is active. This connector can be refreshed or disconnected from this management view.'
      : 'Authorization is not active. Return to connectors and authorize this source before use.';
  }

  if (account) {
    account.textContent = providerHandle ? `@${providerHandle}` : 'No connected account handle available.';
  }

  if (source) {
    const connectedLabel = formatConnectorDate(connectedAt);
    source.textContent = '';

    const summary = document.createElement('span');
    summary.textContent = normalizedState.sourceVaultReady
      ? `Ready. Received: ${receivedCount}. Imported: ${importedCount}. Existing: ${existingCount}. Limit: ${getConnectorImportLimitLabel(requestedPostLimit)}.`
      : 'Not ready.';
    source.append(summary);

    if (connectedLabel) {
      const detail = document.createElement('span');
      detail.className = 'home-platform-theme__connector-management-source-detail';
      detail.textContent = `Connected at ${connectedLabel}.`;
      source.append(detail);
    }
  }

  setConnectorActiveView(root, 'management');
  management.querySelector('[data-home-platform-connector-management-action="refresh"]')?.focus({ preventScroll: true });
}


export function handleHomePlatformBack(root) {
  if (root.querySelector('[data-connector-settings-view="management"]')?.hidden !== false) return false;
  closeConnectorManagementDestination(root);
  return true;
}

async function startXConnectorAuthorization(root, service) {
  const normalizedService = normalizeConnectorService(service);
  const currentState = normalizeConnectorState(normalizedService, getConnectorStates()[normalizedService]);
  const session = await requireConnectorSession();
  const requestedImportLimit = getConnectorImportLimit(root, normalizedService);

  if (!session?.access_token) {
    const loginRequiredState = writeConnectorStateEverywhere(normalizedService, {
      ...currentState,
      connected: false,
      connectionState: 'authorization-required',
      sourceVaultReady: false,
      metadata: {
        ...(currentState.metadata || {}),
        last_error: 'SUPABASE_SESSION_REQUIRED',
        required_action: 'sign_in_with_active_site_auth_session',
        failed_at: new Date().toISOString(),
      },
    }, { persist: false });
    updateConnectorStatus(root, normalizedService, loginRequiredState);
    return;
  }

  const authorizingState = writeConnectorStateEverywhere(normalizedService, {
    ...currentState,
    connectionState: 'authorizing',
    metadata: {
      ...(currentState.metadata || {}),
      requested_import_limit: requestedImportLimit,
      import_limit_label: getConnectorImportLimitLabel(requestedImportLimit),
    },
  });
  updateConnectorStatus(root, normalizedService, authorizingState);

  try {
    const supabase = await getConnectorSupabaseClient();
    if (!supabase?.functions?.invoke) throw new Error('SUPABASE_CLIENT_UNAVAILABLE');

    const { data, error } = await supabase.functions.invoke('connectors-x-start', {
      body: {
        requested_import_limit: requestedImportLimit,
      },
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (error) throw error;
    if (!data?.authorizationUrl) throw new Error('X_AUTHORIZATION_URL_MISSING');

    window.location.assign(data.authorizationUrl);
  } catch (error) {
    console.warn('[Neuroartan][Settings] X connector authorization failed.', error);
    const failedState = writeConnectorStateEverywhere(normalizedService, {
      ...currentState,
      connectionState: 'error',
      metadata: {
        ...(currentState.metadata || {}),
        error: error?.message || 'X connector authorization failed.',
      },
    });
    updateConnectorStatus(root, normalizedService, failedState);
  }
}

async function startOAuthConnectorAuthorization(root, service) {
  const normalizedService = normalizeConnectorService(service);
  if (normalizedService === 'x') {
    await startXConnectorAuthorization(root, normalizedService);
    return;
  }

  const currentState = normalizeConnectorState(normalizedService, getConnectorStates()[normalizedService]);
  const session = await requireConnectorSession();

  if (!session?.access_token) {
    const loginRequiredState = writeConnectorStateEverywhere(normalizedService, {
      ...currentState,
      connected: false,
      connectionState: 'authorization-required',
      sourceVaultReady: false,
      metadata: {
        ...(currentState.metadata || {}),
        last_error: 'SUPABASE_SESSION_REQUIRED',
        required_action: 'sign_in_with_active_site_auth_session',
        failed_at: new Date().toISOString(),
      },
    }, { persist: false });
    updateConnectorStatus(root, normalizedService, loginRequiredState);
    return;
  }

  const authorizingState = writeConnectorStateEverywhere(normalizedService, {
    ...currentState,
    connectionState: 'authorizing',
    metadata: {
      ...(currentState.metadata || {}),
      started_at: new Date().toISOString(),
    },
  });
  updateConnectorStatus(root, normalizedService, authorizingState);

  try {
    const supabase = await getConnectorSupabaseClient();
    if (!supabase?.functions?.invoke) throw new Error('SUPABASE_CLIENT_UNAVAILABLE');

    const { data, error } = await supabase.functions.invoke('connectors-oauth-start', {
      body: {
        service: normalizedService,
      },
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (error) throw error;
    if (!data?.authorizationUrl) throw new Error('CONNECTOR_AUTHORIZATION_URL_MISSING');

    window.location.assign(data.authorizationUrl);
  } catch (error) {
    console.warn('[Neuroartan][Settings] Connector authorization failed.', error);
    const failedState = writeConnectorStateEverywhere(normalizedService, {
      ...currentState,
      connectionState: 'error',
      metadata: {
        ...(currentState.metadata || {}),
        error: error?.message || 'Connector authorization failed.',
      },
    });
    updateConnectorStatus(root, normalizedService, failedState);
  }
}

function updateConnectorStatus(root, service, state = {}) {
  const normalizedService = normalizeConnectorService(service);
  const connectorItem = Array.from(root.querySelectorAll('[data-home-platform-connector-service]'))
    .find((item) => normalizeConnectorService(item.dataset.homePlatformConnectorService) === normalizedService);
  if (!connectorItem) return;

  const normalizedState = normalizeConnectorState(normalizedService, state);
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

  if (normalizedState.connected) {
    connectorItem.dataset.connectorConnected = 'true';
  } else {
    connectorItem.removeAttribute('data-connector-connected');
  }

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
    const service = normalizeConnectorService(item.dataset.homePlatformConnectorService);
    const state = normalizeConnectorState(service, storedStates[service]);
    updateConnectorStatus(root, service, state);
  });
}

function bindConnectorClicks(root) {
  if (root.dataset.connectorClickDelegateBound === 'true') return;
  root.dataset.connectorClickDelegateBound = 'true';

  root.addEventListener('click', async (event) => {
    const action = event.target?.closest?.('[data-home-platform-connector-management-action]');
    if (!action || !root.contains(action)) return;

    const actionName = action.getAttribute('data-home-platform-connector-management-action') || '';
    const service = normalizeConnectorService(root.querySelector('[data-connector-settings-view="management"]')?.dataset.connectorService || 'x');

    if (actionName === 'close') {
      closeConnectorManagementDestination(root);
      return;
    }

    if (actionName === 'refresh') {
      await hydrateConnectorStateFromBackend(root);
      const refreshedState = normalizeConnectorState(service, getConnectorStates()[service]);
      updateConnectorStatus(root, service, refreshedState);
      openConnectorManagementDestination(root, service, refreshedState);
      return;
    }

    if (actionName === 'disconnect') {
      const currentState = normalizeConnectorState(service, getConnectorStates()[service]);
      const disconnectedState = writeConnectorStateEverywhere(service, {
        ...currentState,
        connectionState: 'not-connected',
        sourceVaultReady: false,
        metadata: {
          ...(currentState.metadata || {}),
          disconnectedAt: new Date().toISOString(),
        },
      });
      updateConnectorStatus(root, service, disconnectedState);
      openConnectorManagementDestination(root, service, disconnectedState);
    }
  });

  root.addEventListener('click', (event) => {
    const item = event.target?.closest?.('[data-home-platform-connector-service]');
    if (!item || !root.contains(item)) return;

    const service = normalizeConnectorService(item.dataset.homePlatformConnectorService);
    const currentState = normalizeConnectorState(service, getConnectorStates()[service]);

    if (currentState.connected) {
      openConnectorManagementDestination(root, service, currentState);
      return;
    }

    if (currentState.runtime === 'oauth-required') {
      void startOAuthConnectorAuthorization(root, service);
      return;
    }

    const nextState = currentState.connectionState === 'authorization-required'
      ? 'not-connected'
      : 'authorization-required';
    const savedState = setConnectorState(service, nextState);
    updateConnectorStatus(root, service, savedState);
  });
}

export function getHomePlatformConnectorStates() {
  return getConnectorStates();
}

export function mountHomePlatformDestination(root, options = {}) {
  connectorShellApi = options;
  mountSettingsCategory(root, options);

  seedConnectorCatalog(root);
  loadConnectorStates(root);
  void hydrateConnectorStateFromBackend(root).then(() => seedConnectorCatalog(root));

  if (document.documentElement.dataset.connectorHydrationBound !== 'true') {
    document.documentElement.dataset.connectorHydrationBound = 'true';
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        document.querySelectorAll('[data-home-platform-destination-root]').forEach((destinationRoot) => {
          void hydrateConnectorStateFromBackend(destinationRoot);
        });
      }
    });
    window.addEventListener('focus', () => {
      document.querySelectorAll('[data-home-platform-destination-root]').forEach((destinationRoot) => {
        void hydrateConnectorStateFromBackend(destinationRoot);
      });
    });
  }

  bindConnectorClicks(root);
}
