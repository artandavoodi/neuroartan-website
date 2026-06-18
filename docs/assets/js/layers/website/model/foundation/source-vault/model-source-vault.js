const DEFAULT_ALLOWED_FORMATS = Object.freeze(['.md', '.txt', '.json', '.csv', '.pdf', '.docx']);
const READABLE_FORMAT_LABELS = Object.freeze({
  '.md': 'Markdown',
  '.txt': 'Text',
  '.json': 'JSON',
  '.csv': 'CSV',
  '.pdf': 'PDF',
  '.docx': 'Word',
});
const READABLE_FORMATS = Object.freeze(Object.keys(READABLE_FORMAT_LABELS));
const SOURCE_CONTENT_TEXT_FORMATS = Object.freeze(['.md', '.txt', '.json', '.csv']);
const DEFAULT_EXCLUDED_FORMATS = Object.freeze(['.exe', '.app', '.dmg', '.pkg', '.sh', '.bat', '.cmd', '.bin']);
const NEUROARTAN_PERMISSION_STATE_KEY = 'neuroartan.permissions.state';
const NEUROARTAN_CONNECTOR_STATE_KEY = 'neuroartan.connector-states';
const NEUROARTAN_SOURCE_VAULT_DRAFT_KEY = 'neuroartan.model.source-vault.draft.v1';
const SOURCE_VAULT_FREE_PLAN_LIMITS = Object.freeze({
  acceptedFiles: 250,
  acceptedBytes: 5 * 1024 * 1024,
  contentCharacters: 1000000,
});

const SOURCE_TYPE_LABELS = Object.freeze({
  local_folder: 'Local folder',
  selected_files: 'Selected files',
  cloud_drive: 'Cloud drive',
  repository_reference: 'Repositories',
  workspace_apps: 'Workspace apps',
  social_sources: 'Social sources',
  google_workspace: 'Google Workspace',
});


const SOURCE_TYPE_CONNECTORS = Object.freeze({
  cloud_drive: ['google-drive', 'dropbox', 'onedrive', 'icloud-drive'],
  repository_reference: ['github', 'gitlab'],
  workspace_apps: ['notion', 'slack'],
  social_sources: ['x'],
  google_workspace: ['gmail', 'calendar', 'contacts'],
});

const CONNECTOR_IMPORT_CONTROL_OPTIONS = Object.freeze({
  default: [
    { value: 0, label: 'All available items' },
    { value: 100, label: '100 items' },
    { value: 500, label: '500 items' },
    { value: 1000, label: '1,000 items' },
  ],
  x: [
    { value: 0, label: 'All available posts' },
    { value: 100, label: '100 posts' },
    { value: 500, label: '500 posts' },
    { value: 1000, label: '1,000 posts' },
    { value: 2500, label: '2,500 posts' },
    { value: 5000, label: '5,000 posts' },
  ],
});

const CONNECTOR_REPOSITORY_SELECTION_SERVICES = Object.freeze(['github', 'gitlab']);

const CONNECTOR_TERMINOLOGY = Object.freeze({
  default: {
    accountLabel: 'Connected account',
    importControlLabel: 'Import limit',
    allAvailableLabel: 'All available items',
    unitSingular: 'item',
    unitPlural: 'items',
    selectionLabel: 'Source selection',
  },
  x: {
    accountLabel: 'Connected profile',
    importControlLabel: 'Post import limit',
    allAvailableLabel: 'All available posts',
    unitSingular: 'post',
    unitPlural: 'posts',
    selectionLabel: 'Post source',
  },
  github: {
    accountLabel: 'Connected account',
    importControlLabel: 'Repository selection',
    allAvailableLabel: 'All repositories',
    unitSingular: 'repository',
    unitPlural: 'repositories',
    selectionLabel: 'Repository source',
    selectionMode: 'repository-list',
  },
});

const FILE_MANAGER_SORT_LABELS = Object.freeze({
  'name-ascending': 'Name A–Z',
  'name-descending': 'Name Z–A',
  'size-descending': 'Largest first',
  'size-ascending': 'Smallest first',
});

const SOURCE_VAULT_DRAFT_STATUS = Object.freeze({
  active: 'active',
  confirmed: 'confirmed',
});

const CONNECTOR_LABELS = Object.freeze({
  github: 'GitHub',
  gitlab: 'GitLab',
  'google-drive': 'Google Drive',
  dropbox: 'Dropbox',
  onedrive: 'OneDrive',
  'icloud-drive': 'iCloud Drive',
  notion: 'Notion',
  slack: 'Slack',
  x: 'X',
  gmail: 'Gmail',
  calendar: 'Calendar',
  contacts: 'Contacts',
});
const CONNECTOR_ICONS = Object.freeze({
  github: '/registry/icons/public/assets/system/social/github.svg',
  x: '/registry/icons/public/assets/system/social/x.svg',
});

function createConnectorLogo(service = '', label = '') {
  const normalizedService = normalizeString(service);
  const iconPath = CONNECTOR_ICONS[normalizedService];
  const logo = document.createElement('span');
  logo.className = 'model-source-vault__connector-logo';
  logo.setAttribute('aria-label', label || CONNECTOR_LABELS[normalizedService] || normalizedService);

  if (!iconPath) {
    logo.textContent = label || CONNECTOR_LABELS[normalizedService] || normalizedService;
    return logo;
  }

  const image = document.createElement('img');
  image.className = 'ui-icon-theme-aware';
  image.src = iconPath;
  image.alt = '';
  image.width = 18;
  image.height = 18;
  image.setAttribute('aria-hidden', 'true');

  logo.append(image);
  return logo;
}

function getConnectorTerminology(service = '') {
  const normalizedService = normalizeString(service);
  return CONNECTOR_TERMINOLOGY[normalizedService] || CONNECTOR_TERMINOLOGY.default;
}

function getConnectorImportControlOptions(service = '') {
  const normalizedService = normalizeString(service);
  return CONNECTOR_IMPORT_CONTROL_OPTIONS[normalizedService] || CONNECTOR_IMPORT_CONTROL_OPTIONS.default;
}

function usesRepositorySelection(service = '') {
  return CONNECTOR_REPOSITORY_SELECTION_SERVICES.includes(normalizeString(service));
}

function readConnectorState() {
  try {
    return JSON.parse(window.localStorage?.getItem(NEUROARTAN_CONNECTOR_STATE_KEY) || '{}') || {};
  } catch (error) {
    return {};
  }
}

function writeConnectorState(state = {}) {
  safeWriteJsonStorage(NEUROARTAN_CONNECTOR_STATE_KEY, state);
}

function normalizeBackendConnectorState(record = {}) {
  const service = normalizeString(record.connector_service);
  if (!service) return null;
  const connectionState = normalizeString(record.connection_state || 'not-connected') || 'not-connected';
  const metadata = record.metadata && typeof record.metadata === 'object' ? record.metadata : {};
  return {
    service,
    label: normalizeString(record.connector_label) || CONNECTOR_LABELS[service] || service,
    category: normalizeString(record.connector_category),
    runtime: normalizeString(record.runtime) || 'oauth-required',
    connectionState,
    connected: connectionState === 'connected',
    sourceVaultReady: record.source_vault_ready === true,
    metadata,
    updatedAt: normalizeString(record.updated_at),
  };
}

function getConnectorAuthClient() {
  if (window.NeuroartanAuth?.getClient) return window.NeuroartanAuth.getClient();
  if (window.NeuroartanAuth?.client) return window.NeuroartanAuth.client;
  return null;
}

async function hydrateSourceVaultConnectorStateFromBackend(root = mountedRoot) {
  const supabase = getConnectorAuthClient();
  if (!supabase?.from) return false;

  const { data, error } = await supabase
    .from('privacy_connector_state')
    .select('connector_service, connector_label, connector_category, runtime, connection_state, source_vault_ready, metadata, updated_at')
    .in('connector_service', Object.keys(CONNECTOR_LABELS));

  if (error || !Array.isArray(data)) return false;

  const nextState = { ...readConnectorState() };
  data.forEach((record) => {
    const normalized = normalizeBackendConnectorState(record);
    if (normalized?.service) nextState[normalized.service] = normalized;
  });
  writeConnectorState(nextState);

  if (root instanceof HTMLElement) {
    renderConnectorOptions(root, getSelectedSourceType(root));
    syncSourceVaultActions(root);
    const sourceType = getSelectedSourceType(root);
    if (SOURCE_TYPE_CONNECTORS[sourceType] && getSelectableConnectorRecords(sourceType).length) {
      setStatus(root, '');
    }
  }
  return true;
}

function getConnectorConnectionState(service = '') {
  const record = readConnectorState()?.[service] || {};
  return record.connectionState || (record.connected === true ? 'connected' : 'not-connected');
}

function getAvailableConnectorLabels(sourceType = '') {
  const connectorKeys = SOURCE_TYPE_CONNECTORS[sourceType] || [];
  return connectorKeys
    .filter((service) => getConnectorConnectionState(service) === 'connected')
    .map((service) => CONNECTOR_LABELS[service] || service);
}

function getAuthorizationRequiredConnectorLabels(sourceType = '') {
  const connectorKeys = SOURCE_TYPE_CONNECTORS[sourceType] || [];
  return connectorKeys
    .filter((service) => getConnectorConnectionState(service) === 'authorization-required')
    .map((service) => CONNECTOR_LABELS[service] || service);
}

function getConnectorRecords(sourceType = '') {
  const connectorState = readConnectorState();
  return (SOURCE_TYPE_CONNECTORS[sourceType] || []).map((service) => {
    const state = connectorState?.[service] && typeof connectorState[service] === 'object'
      ? connectorState[service]
      : {};
    return {
      service,
      label: state.label || CONNECTOR_LABELS[service] || service,
      connectionState: getConnectorConnectionState(service),
      sourceVaultReady: state.sourceVaultReady === true,
      metadata: state.metadata && typeof state.metadata === 'object' ? state.metadata : {},
    };
  });
}

function getSelectableConnectorRecords(sourceType = '') {
  return getConnectorRecords(sourceType).filter((record) => record.connectionState === 'connected');
}

function getSelectedConnectorRecords(root, sourceType = '') {
  const connectorState = readConnectorState();
  return Array.from(root?.querySelectorAll?.(`[data-model-source-vault-connector-option="${sourceType}"]:checked`) || [])
    .filter((control) => control instanceof HTMLInputElement)
    .map((control) => {
      const state = connectorState?.[control.value] && typeof connectorState[control.value] === 'object'
        ? connectorState[control.value]
        : {};
      return {
        service: control.value,
        label: state.label || CONNECTOR_LABELS[control.value] || control.value,
        connectionState: getConnectorConnectionState(control.value),
        sourceVaultReady: state.sourceVaultReady === true,
        metadata: state.metadata && typeof state.metadata === 'object' ? state.metadata : {},
      };
    });
}

function getConnectorImportLimit(root = mountedRoot, service = '') {
  if (!(root instanceof HTMLElement)) return 0;
  const normalizedService = normalizeString(service);
  if (usesRepositorySelection(normalizedService)) return 0;
  const control = root.querySelector(`[data-model-source-vault-connector-import-limit="${normalizedService}"]`);
  const rawValue = control instanceof HTMLSelectElement ? control.value : '0';
  const parsed = Number.parseInt(String(rawValue || '0'), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function getConnectorImportLimitLabel(limit = 0, service = '') {
  const terminology = getConnectorTerminology(service);
  const normalizedLimit = Number(limit) || 0;
  const unit = normalizedLimit === 1 ? terminology.unitSingular : terminology.unitPlural;
  return normalizedLimit > 0 ? `${normalizedLimit.toLocaleString()} ${unit}` : terminology.allAvailableLabel;
}

function getConnectorImportStatusLabel(record = {}) {
  const metadata = record.metadata && typeof record.metadata === 'object' ? record.metadata : {};
  const importedCount = Number.isFinite(Number(metadata.imported_count)) ? Number(metadata.imported_count) : null;
  const receivedCount = Number.isFinite(Number(metadata.received_count)) ? Number(metadata.received_count) : importedCount;
  const existingCount = Number.isFinite(Number(metadata.existing_count)) ? Number(metadata.existing_count) : 0;
  const parts = [];
  if (receivedCount !== null) parts.push(`${receivedCount.toLocaleString()} received`);
  if (importedCount !== null) parts.push(`${importedCount.toLocaleString()} imported`);
  if (existingCount > 0) parts.push(`${existingCount.toLocaleString()} existing`);
  return parts.length ? `${record.label || record.service}: ${parts.join(', ')}` : '';
}

function setConnectorImportLimitLabel(root = mountedRoot, service = '', limit = 0) {
  if (!(root instanceof HTMLElement)) return;
  const normalizedService = normalizeString(service);
  const labelElement = root.querySelector(`[data-model-source-vault-connector-import-limit-label="${normalizedService}"]`);
  if (labelElement instanceof HTMLElement) {
    labelElement.textContent = getConnectorImportLimitLabel(limit, normalizedService);
  }
}

function getSelectedConnectorImportControls(root = mountedRoot, sourceType = '') {
  return getSelectedConnectorRecords(root, sourceType).map((record) => {
    if (usesRepositorySelection(record.service)) {
      return {
        ...record,
        importLimit: 0,
        importLimitLabel: getConnectorTerminology(record.service).allAvailableLabel,
        importUnit: getConnectorTerminology(record.service).unitPlural,
        selectionMode: 'repository-list',
        selectedRepositories: getSelectedConnectorRepositories(root, record.service),
      };
    }
    const importLimit = getConnectorImportLimit(root, record.service);
    return {
      ...record,
      importLimit,
      importLimitLabel: getConnectorImportLimitLabel(importLimit, record.service),
      importUnit: getConnectorTerminology(record.service).unitPlural,
    };
  });
}

function syncConnectorImportLimitVisibility(root = mountedRoot, sourceType = getSelectedSourceType(root)) {
  if (!(root instanceof HTMLElement)) return;
  root.querySelectorAll(`[data-model-source-vault-connector-import-limit-field="${sourceType}"]`).forEach((fieldElement) => {
    if (!(fieldElement instanceof HTMLElement)) return;
    const service = normalizeString(fieldElement.dataset.modelSourceVaultConnectorImportLimitService || '');
    const control = root.querySelector(`[data-model-source-vault-connector-option="${sourceType}"][value="${service}"]`);
    fieldElement.hidden = !(control instanceof HTMLInputElement && control.checked);
  });
}

function getConnectorRepositoryCacheKey(service = '') {
  return normalizeString(service);
}

function getSelectedConnectorRepositories(root = mountedRoot, service = '') {
  if (!(root instanceof HTMLElement)) return [];
  const normalizedService = normalizeString(service);
  return Array.from(root.querySelectorAll(`[data-model-source-vault-repository-option="${normalizedService}"]:checked`))
    .filter((control) => control instanceof HTMLInputElement)
    .map((control) => safeReadJsonStorage(control.dataset.modelSourceVaultRepositoryPayloadKey || '', null))
    .filter((record) => record && typeof record === 'object');
}

function renderRepositorySelectionRows(root = mountedRoot, service = '', container = null, repositories = []) {
  if (!(root instanceof HTMLElement) || !(container instanceof HTMLElement)) return;
  const normalizedService = normalizeString(service);
  container.replaceChildren();

  if (!repositories.length) {
    const empty = document.createElement('span');
    empty.className = 'model-source-vault__field-status';
    empty.textContent = 'No repositories available for this connected account.';
    container.append(empty);
    return;
  }

  const list = document.createElement('div');
  list.className = 'model-source-vault__repository-list';

  repositories.forEach((repository) => {
    const payloadKey = `neuroartan.model.source-vault.repository.${normalizedService}.${repository.id || repository.fullName || repository.name}`;
    safeWriteJsonStorage(payloadKey, repository);

    const option = document.createElement('label');
    option.className = 'model-source-vault__repository-option';

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.dataset.modelSourceVaultRepositoryOption = normalizedService;
    input.dataset.modelSourceVaultRepositoryPayloadKey = payloadKey;
    input.value = String(repository.fullName || repository.name || repository.id || '');

    const copy = document.createElement('span');
    copy.className = 'model-source-vault__repository-copy';

    const title = document.createElement('span');
    title.className = 'model-source-vault__repository-title';
    title.textContent = repository.fullName || repository.name || 'Repository';

    const meta = document.createElement('span');
    meta.className = 'model-source-vault__repository-meta';
    const visibility = repository.private ? 'Private' : 'Public';
    const language = repository.language ? ` · ${repository.language}` : '';
    const permission = repository.permissions?.push ? 'write access' : 'read access';
    meta.textContent = `${visibility}${language} · ${permission}`;

    copy.append(title, meta);
    option.append(input, copy);
    list.append(option);
  });

  list.addEventListener('change', () => {
    clearAnalysisUI(root);
    syncSourceVaultActions(root);
    saveSourceVaultDraft(root);
  });

  container.append(list);
}

async function renderConnectorRepositorySelection(root = mountedRoot, sourceType = getSelectedSourceType(root), record = {}, container = null) {
  if (!(root instanceof HTMLElement) || !(container instanceof HTMLElement)) return;
  const service = normalizeString(record.service);
  if (!usesRepositorySelection(service)) return;

  const cacheKey = getConnectorRepositoryCacheKey(service);
  const cached = connectorRepositoryCache.get(cacheKey);
  if (Array.isArray(cached)) {
    renderRepositorySelectionRows(root, service, container, cached);
    return;
  }

  container.textContent = 'Loading repositories…';

  const supabase = getConnectorAuthClient();
  if (!supabase?.functions?.invoke) {
    container.textContent = 'Repository discovery requires an active authenticated session.';
    return;
  }

  const { data, error } = await supabase.functions.invoke('connectors-github-repositories', {
    body: { connectorService: service },
  });

  if (error || data?.ok !== true || !Array.isArray(data.repositories)) {
    container.textContent = 'Repository discovery failed. Refresh the GitHub connector and try again.';
    return;
  }

  connectorRepositoryCache.set(cacheKey, data.repositories);
  renderRepositorySelectionRows(root, service, container, data.repositories);
  syncSourceVaultActions(root);
}

function getConnectorCategoryLabel(sourceType = '') {
  return SOURCE_TYPE_LABELS[sourceType] || 'source';
}

function getConnectorCategoryProviderLabels(sourceType = '') {
  return (SOURCE_TYPE_CONNECTORS[sourceType] || []).map((service) => CONNECTOR_LABELS[service] || service);
}

function requestSettingsConnectors() {
  document.dispatchEvent(new CustomEvent('home:platform-shell-open-request', {
    detail: {
      destination: 'settings',
      subdestination: 'connectors',
    },
  }));
}

let mountedRoot = null;
let latestAnalysis = null;
let selectedFileKeys = new Set();
let connectorRepositoryCache = new Map();
let fileManagerSortMode = 'name-ascending';
let restoredDraftPendingFileReconnect = false;
let sourceVaultLifecyclePersistenceBound = false;
let sourceVaultDatabaseResultBound = false;
let sourceVaultState = createSourceVaultState();

function createSourceVaultState(overrides = {}) {
  const fileManager = overrides.fileManager && typeof overrides.fileManager === 'object'
    ? overrides.fileManager
    : {};

  return {
    version: 1,
    status: SOURCE_VAULT_DRAFT_STATUS.active,
    updatedAt: null,
    sourceType: 'local_folder',
    sourcePackages: [],
    activePackageId: null,
    activeWorkspaceOpen: false,
    sourceSelection: null,
    selectedConnectorValues: [],
    connectorImportControls: [],
    selectedFormats: [],
    latestAnalysis: null,
    selectedFileKeys: [],
    fileManager: {
      open: false,
      searchTerm: '',
      sortMode: 'name-ascending',
      scrollTop: 0,
      selectedFileKeys: [],
      ...fileManager,
    },
    reconnectRequired: false,
    draftSaved: false,
    confirmed: false,
    restarted: false,
    ...overrides,
    fileManager: {
      open: fileManager.open === true,
      searchTerm: typeof fileManager.searchTerm === 'string' ? fileManager.searchTerm : '',
      sortMode: FILE_MANAGER_SORT_LABELS[fileManager.sortMode] ? fileManager.sortMode : 'name-ascending',
      scrollTop: Number(fileManager.scrollTop || 0),
      selectedFileKeys: Array.isArray(fileManager.selectedFileKeys) ? fileManager.selectedFileKeys : [],
    },
  };
}

function normalizeString(value = '') {
  return String(value ?? '').trim();
}

function safeReadJsonStorage(key, fallback = null) {
  try {
    const raw = window.localStorage?.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    return fallback;
  }
}

function safeWriteJsonStorage(key, value) {
  try {
    window.localStorage?.setItem(key, JSON.stringify(value));
  } catch (error) {
    /* localStorage may be unavailable in restricted contexts. */
  }
}

function safeRemoveStorage(key) {
  try {
    window.localStorage?.removeItem(key);
  } catch (error) {
    /* localStorage may be unavailable in restricted contexts. */
  }
}

function getEventElement(event) {
  return event?.target instanceof Element ? event.target : null;
}

function parseFormats(value = '') {
  return normalizeString(value)
    .split(',')
    .map((format) => normalizeString(format).toLowerCase())
    .filter(Boolean)
    .map((format) => (format.startsWith('.') ? format : `.${format}`));
}

function getFileExtension(fileName = '') {
  const normalized = normalizeString(fileName).toLowerCase();
  const index = normalized.lastIndexOf('.');
  return index >= 0 ? normalized.slice(index) : '';
}

function formatBytes(bytes = 0) {
  const value = Number(bytes) || 0;
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function createSourceVaultPlanLimitStatus(values = {}) {
  const acceptedCount = Number(values.acceptedCount || values.acceptedFiles || 0);
  const totalAcceptedBytes = Number(values.totalAcceptedBytes || values.acceptedBytes || 0);
  const contentCharacters = Number(values.contentCharacters || 0);
  const violations = [];

  if (acceptedCount > SOURCE_VAULT_FREE_PLAN_LIMITS.acceptedFiles) {
    violations.push(`${acceptedCount} files exceeds ${SOURCE_VAULT_FREE_PLAN_LIMITS.acceptedFiles} files`);
  }
  if (totalAcceptedBytes > SOURCE_VAULT_FREE_PLAN_LIMITS.acceptedBytes) {
    violations.push(`${formatBytes(totalAcceptedBytes)} exceeds ${formatBytes(SOURCE_VAULT_FREE_PLAN_LIMITS.acceptedBytes)}`);
  }
  if (contentCharacters > SOURCE_VAULT_FREE_PLAN_LIMITS.contentCharacters) {
    violations.push(`${contentCharacters.toLocaleString()} extracted characters exceeds ${SOURCE_VAULT_FREE_PLAN_LIMITS.contentCharacters.toLocaleString()}`);
  }

  return {
    exceeded: violations.length > 0,
    violations,
    acceptedCount,
    totalAcceptedBytes,
    contentCharacters,
    limits: SOURCE_VAULT_FREE_PLAN_LIMITS,
  };
}

function getSourceVaultPlanLimitMessage(status = null) {
  if (!status?.exceeded) return '';
  return `Source Vault intake is above the current safe free-plan limit: ${status.violations.join('; ')}. Reduce the selection or split it into smaller governed packages.`;
}

function isSourceVaultPlanLimited(record = null) {
  return record?.planLimitStatus?.exceeded === true;
}

function getFileRecordKey(file = {}) {
  return `${file.relativePath || file.name || ''}::${file.size || 0}`;
}

function createSourceVaultPackageId(sourceType = 'source') {
  const randomValue = Math.random().toString(36).slice(2, 10);
  return `${normalizeString(sourceType) || 'source'}-${Date.now()}-${randomValue}`;
}

function getFileManagerOverlay(root = mountedRoot) {
  return root?.querySelector?.('[data-model-source-vault-file-manager-overlay]')
    || document.querySelector('[data-model-source-vault-file-manager-overlay]');
}

function getFileManagerList(root = mountedRoot) {
  const overlay = getFileManagerOverlay(root);
  return overlay?.querySelector?.('[data-model-source-vault-file-manager-list]') || null;
}

function getFileManagerSearch(root = mountedRoot) {
  const overlay = getFileManagerOverlay(root);
  return overlay?.querySelector?.('[data-model-source-vault-file-search]') || null;
}

function mountFileManagerOverlay(root = mountedRoot) {
  const overlay = getFileManagerOverlay(root);
  if (!(overlay instanceof HTMLElement)) return null;
  if (overlay.parentElement !== document.body) document.body.appendChild(overlay);
  return overlay;
}

function setFileManagerWorkspaceOpen(open) {
  document.documentElement.classList.toggle('model-source-calibration-workspace-open', open);
  document.body.classList.toggle('model-source-calibration-workspace-open', open);
}

function bindFileManagerOverlayEvents(root = mountedRoot) {
  const overlay = getFileManagerOverlay(root);
  if (!(overlay instanceof HTMLElement) || overlay.dataset.modelSourceVaultOverlayBound === 'true') return;

  overlay.dataset.modelSourceVaultOverlayBound = 'true';
  overlay.addEventListener('change', handleChange);
  overlay.addEventListener('click', handleClick);
  overlay.addEventListener('input', handleInput);
  getFileManagerList(root)?.addEventListener?.('scroll', persistSourceVaultDraftOnPageLifecycle, { passive: true });
}

function getFileManagerSearchTerm(root = mountedRoot) {
  const search = getFileManagerSearch(root);
  return search instanceof HTMLInputElement ? normalizeString(search.value).toLowerCase() : '';
}

function getFileManagerScrollPosition(root = mountedRoot) {
  const list = getFileManagerList(root);
  return list instanceof HTMLElement ? list.scrollTop : 0;
}

function setFileManagerSearchTerm(root = mountedRoot, value = '') {
  const search = getFileManagerSearch(root);
  if (search instanceof HTMLInputElement) search.value = value;
}

function restoreFileManagerScrollPosition(root = mountedRoot, value = 0) {
  const list = getFileManagerList(root);
  if (!(list instanceof HTMLElement)) return;
  window.requestAnimationFrame(() => {
    list.scrollTop = Number(value) || 0;
  });
}

function isFileVisibleForSearch(file = {}, searchTerm = '') {
  if (!searchTerm) return true;
  return normalizeString(file.relativePath || file.name || '').toLowerCase().includes(searchTerm);
}

function getSortedFileManagerFiles(files = []) {
  const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
  return [...files].sort((first, second) => {
    if (fileManagerSortMode === 'name-descending') {
      return collator.compare(second.relativePath || second.name || '', first.relativePath || first.name || '');
    }
    if (fileManagerSortMode === 'size-ascending') {
      return (Number(first.size) || 0) - (Number(second.size) || 0);
    }
    if (fileManagerSortMode === 'size-descending') {
      return (Number(second.size) || 0) - (Number(first.size) || 0);
    }
    return collator.compare(first.relativePath || first.name || '', second.relativePath || second.name || '');
  });
}

function setFileManagerSortMode(mode = 'name-ascending', root = mountedRoot) {
  fileManagerSortMode = normalizeString(mode) || 'name-ascending';
  syncFileManagerSortLabel(root);
  renderFileManager(root, latestAnalysis);
  saveSourceVaultDraft(root);
}

function syncFileManagerSortLabel(root = mountedRoot) {
  const overlay = getFileManagerOverlay(root);
  const select = overlay?.querySelector?.('[data-model-source-vault-file-sort]');
  const labelElement = overlay?.querySelector?.('[data-model-source-vault-file-sort-label]');
  const normalizedSortMode = FILE_MANAGER_SORT_LABELS[fileManagerSortMode] ? fileManagerSortMode : 'name-ascending';
  fileManagerSortMode = normalizedSortMode;
  if (select instanceof HTMLSelectElement) select.value = normalizedSortMode;
  if (labelElement instanceof HTMLElement) labelElement.textContent = FILE_MANAGER_SORT_LABELS[normalizedSortMode];
}

function getSerializableAnalysis(analysis = latestAnalysis) {
  if (!analysis) return null;
  const {
    selectedFiles,
    sourceContent,
    contentFiles,
    acceptedFiles,
    excludedFiles,
    allAcceptedFiles,
    ...serializableAnalysis
  } = analysis;
  return {
    ...serializableAnalysis,
    sourceContent: '',
    acceptedFiles: Array.isArray(acceptedFiles) ? acceptedFiles.slice(0, 100) : [],
    excludedFiles: Array.isArray(excludedFiles) ? excludedFiles.slice(0, 100) : [],
    allAcceptedFiles: Array.isArray(allAcceptedFiles) ? allAcceptedFiles.slice(0, 100) : [],
    contentFiles: Array.isArray(contentFiles) ? contentFiles.map(stripSourceVaultContentFileBody) : [],
  };
}

function stripSourceVaultContentFileBody(file = {}) {
  if (!file || typeof file !== 'object') return file;
  const {
    content,
    ...metadata
  } = file;
  return {
    ...metadata,
    contentLength: Number(file.contentLength ?? normalizeString(content).length ?? 0),
  };
}

function stripSourceVaultPackageContent(packageRecord = {}) {
  if (!packageRecord || typeof packageRecord !== 'object') return packageRecord;
  return {
    ...packageRecord,
    sourceContent: '',
    acceptedFiles: Array.isArray(packageRecord.acceptedFiles) ? packageRecord.acceptedFiles.slice(0, 100) : [],
    excludedFiles: Array.isArray(packageRecord.excludedFiles) ? packageRecord.excludedFiles.slice(0, 100) : [],
    contentFiles: Array.isArray(packageRecord.contentFiles)
      ? packageRecord.contentFiles.map(stripSourceVaultContentFileBody)
      : [],
  };
}

function normalizeSourceVaultPackage(packageRecord = null) {
  if (!packageRecord || typeof packageRecord !== 'object') return null;
  const sourceType = normalizeString(packageRecord.sourceType || 'local_folder') || 'local_folder';
  const acceptedFiles = Array.isArray(packageRecord.acceptedFiles) ? packageRecord.acceptedFiles : [];
  const excludedFiles = Array.isArray(packageRecord.excludedFiles) ? packageRecord.excludedFiles : [];
  const selectedConnectors = Array.isArray(packageRecord.selectedConnectors) ? packageRecord.selectedConnectors : [];
  const connectorImportControls = Array.isArray(packageRecord.connectorImportControls) ? packageRecord.connectorImportControls : [];
  const selectedFileKeysValue = Array.isArray(packageRecord.selectedFileKeys) ? packageRecord.selectedFileKeys : [];
  const contentFiles = Array.isArray(packageRecord.contentFiles) ? packageRecord.contentFiles : [];
  const id = normalizeString(packageRecord.id) || createSourceVaultPackageId(sourceType);
  const updatedAt = normalizeString(packageRecord.updatedAt) || new Date().toISOString();

  return {
    id,
    sourceType,
    sourceTypeLabel: normalizeString(packageRecord.sourceTypeLabel) || SOURCE_TYPE_LABELS[sourceType] || sourceType,
    sourceLabel: normalizeString(packageRecord.sourceLabel) || normalizeString(packageRecord.label) || SOURCE_TYPE_LABELS[sourceType] || sourceType,
    provider: normalizeString(packageRecord.provider),
    sourceReference: normalizeString(packageRecord.sourceReference),
    selectedFormats: Array.isArray(packageRecord.selectedFormats) ? packageRecord.selectedFormats : [],
    detectedFormatCounts: packageRecord.detectedFormatCounts && typeof packageRecord.detectedFormatCounts === 'object'
      ? packageRecord.detectedFormatCounts
      : {},
    acceptedFiles,
    excludedFiles,
    selectedFileKeys: selectedFileKeysValue,
    selectedConnectors,
    connectorImportControls,
    sourceContent: normalizeString(packageRecord.sourceContent),
    contentFiles,
    contentFileCount: Number(packageRecord.contentFileCount ?? contentFiles.length ?? 0),
    acceptedCount: Number(packageRecord.acceptedCount ?? acceptedFiles.length ?? selectedConnectors.length ?? 0),
    excludedCount: Number(packageRecord.excludedCount ?? excludedFiles.length ?? 0),
    totalAcceptedBytes: Number(packageRecord.totalAcceptedBytes || acceptedFiles.reduce((sum, file) => sum + (Number(file.size) || 0), 0)),
    contentCharacterCount: Number(packageRecord.contentCharacterCount || contentFiles.reduce((sum, file) => sum + (Number(file.contentLength) || normalizeString(file.content).length), 0)),
    planLimitStatus: packageRecord.planLimitStatus && typeof packageRecord.planLimitStatus === 'object' ? packageRecord.planLimitStatus : null,
    reconnectRequired: packageRecord.reconnectRequired === true,
    createdAt: normalizeString(packageRecord.createdAt) || updatedAt,
    updatedAt,
  };
}

function getNormalizedSourceVaultPackages(packages = sourceVaultState.sourcePackages) {
  if (!Array.isArray(packages)) return [];
  return packages.map(normalizeSourceVaultPackage).filter(Boolean);
}

function createSourceVaultPackageFromAnalysis(root = mountedRoot, analysis = latestAnalysis) {
  if (!(root instanceof HTMLElement) || !analysis) return null;
  const selection = getSourceSelectionMetadata(root) || sourceVaultState.sourceSelection || {};
  const sourceType = analysis.sourceType || getSelectedSourceType(root);
  const selectedConnectors = Array.isArray(analysis.selectedConnectors) ? analysis.selectedConnectors : [];
  const connectorImportControls = Array.isArray(analysis.connectorImportControls) ? analysis.connectorImportControls : [];
  const existingId = sourceVaultState.activePackageId || null;
  return normalizeSourceVaultPackage({
    id: existingId || createSourceVaultPackageId(sourceType),
    sourceType,
    sourceTypeLabel: analysis.sourceTypeLabel || SOURCE_TYPE_LABELS[sourceType] || sourceType,
    sourceLabel: selection.label || analysis.sourceTypeLabel || SOURCE_TYPE_LABELS[sourceType] || sourceType,
    provider: selectedConnectors.map((record) => record.label || record.service).join(', '),
    sourceReference: analysis.sourceReference,
    selectedFormats: analysis.allowedFormats || [],
    detectedFormatCounts: analysis.detectedFormatCounts || {},
    acceptedFiles: analysis.acceptedFiles || [],
    excludedFiles: analysis.excludedFiles || [],
    sourceContent: analysis.sourceContent || '',
    contentFiles: analysis.contentFiles || [],
    contentFileCount: analysis.contentFileCount || 0,
    contentCharacterCount: Number(analysis.contentCharacterCount || 0),
    planLimitStatus: analysis.planLimitStatus || null,
    selectedFileKeys: Array.from(selectedFileKeys),
    selectedConnectors,
    connectorImportControls,
    acceptedCount: analysis.acceptedCount,
    excludedCount: analysis.excludedCount,
    totalAcceptedBytes: analysis.totalAcceptedBytes,
    reconnectRequired: restoredDraftPendingFileReconnect === true,
    createdAt: analysis.createdAt,
    updatedAt: new Date().toISOString(),
  });
}

function upsertSourceVaultPackage(root = mountedRoot, analysis = latestAnalysis) {
  const packageRecord = createSourceVaultPackageFromAnalysis(root, analysis);
  if (!packageRecord) return null;
  const packages = getNormalizedSourceVaultPackages();
  const statePackageRecord = stripSourceVaultPackageContent(packageRecord);
  const existingIndex = packages.findIndex((record) => record.id === statePackageRecord.id);
  if (existingIndex >= 0) packages[existingIndex] = statePackageRecord;
  else packages.push(statePackageRecord);
  sourceVaultState = createSourceVaultState({
    ...sourceVaultState,
    sourcePackages: packages,
    activePackageId: packageRecord.id,
  });
  renderSourceVaultPackages(root);
  syncSourceVaultActions(root);
  return packageRecord;
}

function getSelectedFileByRecordKey(root = mountedRoot) {
  const selectedFiles = getSelectedFiles(root);
  return selectedFiles.reduce((map, file) => {
    map.set(getFileRecordKey({
      name: file.name,
      relativePath: file.webkitRelativePath || file.name,
      size: file.size || 0,
    }), file);
    return map;
  }, new Map());
}

function isSourceContentTextFormat(extension = '') {
  return SOURCE_CONTENT_TEXT_FORMATS.includes(normalizeString(extension).toLowerCase());
}

async function createSourceVaultContentSnapshot(root = mountedRoot, analysis = latestAnalysis) {
  if (!(root instanceof HTMLElement) || !analysis) return analysis;
  if (SOURCE_TYPE_CONNECTORS[analysis.sourceType]) return analysis;

  const preflightStatus = createSourceVaultPlanLimitStatus(analysis);
  if (preflightStatus.exceeded) {
    return {
      ...analysis,
      planLimitStatus: preflightStatus,
    };
  }

  const fileByKey = getSelectedFileByRecordKey(root);
  const acceptedFiles = Array.isArray(analysis.acceptedFiles) ? analysis.acceptedFiles : [];
  const contentFiles = [];
  let contentCharacterCount = 0;

  for (const record of acceptedFiles) {
    if (contentFiles.length > 0 && contentFiles.length % 250 === 0) {
      setStatus(root, `Reading source content ${contentFiles.length} / ${acceptedFiles.length}...`);
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    }

    const extension = normalizeString(record.extension || getFileExtension(record.name)).toLowerCase();
    const file = fileByKey.get(getFileRecordKey(record));
    const baseRecord = {
      name: normalizeString(record.name),
      relativePath: normalizeString(record.relativePath || record.name),
      extension,
      size: Number(record.size || 0),
      sizeLabel: normalizeString(record.sizeLabel || formatBytes(record.size || 0)),
    };

    if (!file) {
      contentFiles.push({
        ...baseRecord,
        content: '',
        contentLength: 0,
        contentStatus: 'reconnect_required',
      });
      continue;
    }

    if (!isSourceContentTextFormat(extension)) {
      contentFiles.push({
        ...baseRecord,
        content: '',
        contentLength: 0,
        contentStatus: 'parser_required',
      });
      continue;
    }

    try {
      const content = await file.text();
      contentCharacterCount += content.length;
      contentFiles.push({
        ...baseRecord,
        content,
        contentLength: content.length,
        contentStatus: 'extracted',
      });
      const contentStatus = createSourceVaultPlanLimitStatus({
        ...analysis,
        contentCharacters: contentCharacterCount,
      });
      if (contentStatus.exceeded) {
        return {
          ...analysis,
          contentFiles,
          contentFileCount: contentFiles.length,
          contentCharacterCount,
          sourceContent: '',
          planLimitStatus: contentStatus,
        };
      }
    } catch (error) {
      contentFiles.push({
        ...baseRecord,
        content: '',
        contentLength: 0,
        contentStatus: 'read_failed',
      });
    }
  }

  return {
    ...analysis,
    contentFiles,
    contentFileCount: contentFiles.length,
    contentCharacterCount,
    planLimitStatus: createSourceVaultPlanLimitStatus({
      ...analysis,
      contentCharacters: contentCharacterCount,
    }),
    sourceContent: '',
  };
}

function getSourceSelectionMetadata(root = mountedRoot) {
  if (!(root instanceof HTMLElement)) return null;

  const sourceType = getSelectedSourceType(root);
  const input = getActiveFileInput(root);
  const files = input instanceof HTMLInputElement ? Array.from(input.files || []) : [];
  const connectors = getSelectedConnectorRecords(root, sourceType);

  const existingSelection = sourceVaultState.sourceSelection;
  if (!files.length && !connectors.length) {
    if (existingSelection?.sourceType === sourceType) {
      return existingSelection;
    }

    if (latestAnalysis?.sourceType === sourceType) {
      return {
        sourceType,
        sourceTypeLabel: SOURCE_TYPE_LABELS[sourceType] || sourceType,
        label: latestAnalysis.sourceTypeLabel || SOURCE_TYPE_LABELS[sourceType] || sourceType,
        fileCount: (latestAnalysis.allAcceptedFiles || latestAnalysis.acceptedFiles || []).length + (latestAnalysis.excludedFiles || []).length,
        connectorCount: 0,
        connectors: [],
        files: [],
        reconnectRequired: true,
        updatedAt: latestAnalysis.createdAt || new Date().toISOString(),
      };
    }

    return null;
  }

  return {
    sourceType,
    sourceTypeLabel: SOURCE_TYPE_LABELS[sourceType] || sourceType,
    label: input instanceof HTMLInputElement ? getInputSelectionLabel(input, SOURCE_TYPE_LABELS[sourceType] || sourceType) : SOURCE_TYPE_LABELS[sourceType] || sourceType,
    fileCount: files.length,
    connectorCount: connectors.length,
    connectors,
    files: files.slice(0, 200).map((file) => ({
      name: file.name,
      relativePath: file.webkitRelativePath || file.name,
      extension: getFileExtension(file.name),
      size: file.size || 0,
      sizeLabel: formatBytes(file.size || 0),
    })),
    reconnectRequired: files.length > 0,
    updatedAt: new Date().toISOString(),
  };
}

function getSourceVaultDraft(root = mountedRoot) {
  if (!(root instanceof HTMLElement)) return null;
  const sourceType = getSelectedSourceType(root);
  const selectedKeys = Array.from(selectedFileKeys);
  const fileManagerOpen = getFileManagerOverlay(root) instanceof HTMLElement
    ? !getFileManagerOverlay(root).hidden
    : sourceVaultState.fileManager?.open === true;
  return {
    version: 1,
    status: SOURCE_VAULT_DRAFT_STATUS.active,
    updatedAt: new Date().toISOString(),
    sourceType,
    sourcePackages: getNormalizedSourceVaultPackages(),
    activePackageId: sourceVaultState.activePackageId || null,
    activeWorkspaceOpen: fileManagerOpen,
    sourceSelection: getSourceSelectionMetadata(root),
    selectedConnectorValues: Array.from(root.querySelectorAll(`[data-model-source-vault-connector-option]:checked`))
      .filter((control) => control instanceof HTMLInputElement)
      .map((control) => ({ sourceType: control.dataset.modelSourceVaultConnectorOption || '', value: control.value })),
    connectorImportControls: Array.from(root.querySelectorAll('[data-model-source-vault-connector-import-limit]'))
      .filter((control) => control instanceof HTMLSelectElement)
      .map((control) => ({ service: control.dataset.modelSourceVaultConnectorImportLimit || '', importLimit: Number.parseInt(control.value || '0', 10) || 0 })),
    selectedFormats: getSelectedReadableFormats(root),
    latestAnalysis: getSerializableAnalysis(latestAnalysis),
    selectedFileKeys: selectedKeys,
    fileManagerSortMode,
    fileManagerSearchTerm: getFileManagerSearchTerm(root),
    fileManagerOpen,
    fileManagerScrollTop: getFileManagerScrollPosition(root),
    fileManager: {
      open: fileManagerOpen,
      searchTerm: getFileManagerSearchTerm(root),
      sortMode: fileManagerSortMode,
      scrollTop: getFileManagerScrollPosition(root),
      selectedFileKeys: selectedKeys,
    },
    reconnectRequired: restoredDraftPendingFileReconnect,
    draftSaved: true,
    confirmed: false,
    restarted: false,
  };
}

function isSourceVaultAnalysisDraft(draft = null) {
  return draft?.version === 1 && draft?.status === SOURCE_VAULT_DRAFT_STATUS.active && !!draft?.latestAnalysis;
}

function isMeaningfulSourceVaultDraft(draft = null) {
  if (!draft || draft.version !== 1 || draft.status !== SOURCE_VAULT_DRAFT_STATUS.active) return false;
  if (draft.latestAnalysis) return true;
  if (Array.isArray(draft.sourcePackages) && draft.sourcePackages.length) return true;
  if (draft.sourceType && draft.sourceType !== 'local_folder') return true;
  if (draft.sourceSelection?.fileCount || draft.sourceSelection?.connectorCount) return true;
  if (Array.isArray(draft.selectedConnectorValues) && draft.selectedConnectorValues.length) return true;
  if (Array.isArray(draft.selectedFormats) && draft.selectedFormats.length) return true;
  if (draft.fileManager?.open === true) return true;
  if (draft.fileManager?.searchTerm) return true;
  if (draft.fileManager?.sortMode && draft.fileManager.sortMode !== 'name-ascending') return true;
  if (Number(draft.fileManager?.scrollTop || 0) > 0) return true;
  if (Array.isArray(draft.selectedFileKeys) && draft.selectedFileKeys.length) return true;
  return false;
}

function normalizeSourceVaultDraft(rawDraft = null) {
  if (!rawDraft || rawDraft.version !== 1) return null;
  const fileManager = rawDraft.fileManager && typeof rawDraft.fileManager === 'object'
    ? rawDraft.fileManager
    : {};
  const normalized = createSourceVaultState({
    ...rawDraft,
    status: rawDraft.status || SOURCE_VAULT_DRAFT_STATUS.active,
    sourcePackages: getNormalizedSourceVaultPackages(rawDraft.sourcePackages),
    activePackageId: rawDraft.activePackageId || null,
    activeWorkspaceOpen: rawDraft.activeWorkspaceOpen === true || rawDraft.fileManagerOpen === true || fileManager.open === true,
    sourceSelection: rawDraft.sourceSelection && typeof rawDraft.sourceSelection === 'object' ? rawDraft.sourceSelection : null,
    selectedConnectorValues: Array.isArray(rawDraft.selectedConnectorValues) ? rawDraft.selectedConnectorValues : [],
    connectorImportControls: Array.isArray(rawDraft.connectorImportControls) ? rawDraft.connectorImportControls : [],
    selectedFormats: Array.isArray(rawDraft.selectedFormats) ? rawDraft.selectedFormats : [],
    selectedFileKeys: Array.isArray(rawDraft.selectedFileKeys) ? rawDraft.selectedFileKeys : [],
    fileManagerSortMode: FILE_MANAGER_SORT_LABELS[rawDraft.fileManagerSortMode || fileManager.sortMode] ? (rawDraft.fileManagerSortMode || fileManager.sortMode) : 'name-ascending',
    fileManagerSearchTerm: typeof (rawDraft.fileManagerSearchTerm || fileManager.searchTerm) === 'string' ? (rawDraft.fileManagerSearchTerm || fileManager.searchTerm) : '',
    fileManagerOpen: rawDraft.fileManagerOpen === true || fileManager.open === true,
    fileManagerScrollTop: Number(rawDraft.fileManagerScrollTop || fileManager.scrollTop || 0),
    fileManager: {
      open: rawDraft.fileManagerOpen === true || fileManager.open === true,
      searchTerm: typeof (rawDraft.fileManagerSearchTerm || fileManager.searchTerm) === 'string' ? (rawDraft.fileManagerSearchTerm || fileManager.searchTerm) : '',
      sortMode: FILE_MANAGER_SORT_LABELS[rawDraft.fileManagerSortMode || fileManager.sortMode] ? (rawDraft.fileManagerSortMode || fileManager.sortMode) : 'name-ascending',
      scrollTop: Number(rawDraft.fileManagerScrollTop || fileManager.scrollTop || 0),
      selectedFileKeys: Array.isArray(fileManager.selectedFileKeys) ? fileManager.selectedFileKeys : Array.isArray(rawDraft.selectedFileKeys) ? rawDraft.selectedFileKeys : [],
    },
    reconnectRequired: rawDraft.reconnectRequired === true,
    draftSaved: rawDraft.draftSaved !== false,
    confirmed: rawDraft.confirmed === true,
    restarted: rawDraft.restarted === true,
  });

  return isMeaningfulSourceVaultDraft(normalized) ? normalized : null;
}

function shouldPreserveExistingSourceVaultDraft(nextDraft = null) {
  if (isSourceVaultAnalysisDraft(nextDraft)) return false;
  const existingDraft = normalizeSourceVaultDraft(safeReadJsonStorage(NEUROARTAN_SOURCE_VAULT_DRAFT_KEY, null));
  return isSourceVaultAnalysisDraft(existingDraft);
}

function getExistingSourceVaultDraft() {
  const normalizedDraft = normalizeSourceVaultDraft(safeReadJsonStorage(NEUROARTAN_SOURCE_VAULT_DRAFT_KEY, null));
  return normalizedDraft;
}

function getExistingSourceVaultAnalysisDraft() {
  const normalizedDraft = getExistingSourceVaultDraft();
  return isSourceVaultAnalysisDraft(normalizedDraft) ? normalizedDraft : null;
}

function mergeSourceVaultDraft(nextDraft = null) {
  if (!nextDraft) return null;
  const existingAnalysisDraft = getExistingSourceVaultAnalysisDraft();
  if (!existingAnalysisDraft) return nextDraft;
  const nextDraftClearedActiveSelection = Array.isArray(nextDraft.sourcePackages)
    && nextDraft.sourcePackages.length > 0
    && !nextDraft.latestAnalysis
    && !nextDraft.sourceSelection
    && !nextDraft.activePackageId;
  return {
    ...existingAnalysisDraft,
    ...nextDraft,
    updatedAt: new Date().toISOString(),
    sourceType: nextDraft.sourceType || existingAnalysisDraft.sourceType,
    sourceSelection: nextDraft.sourceSelection || existingAnalysisDraft.sourceSelection || null,
    sourcePackages: nextDraft.sourcePackages?.length ? nextDraft.sourcePackages : existingAnalysisDraft.sourcePackages || [],
    activePackageId: nextDraft.activePackageId || existingAnalysisDraft.activePackageId || null,
    activeWorkspaceOpen: nextDraft.activeWorkspaceOpen === true,
    selectedConnectorValues: nextDraft.selectedConnectorValues || existingAnalysisDraft.selectedConnectorValues || [],
    connectorImportControls: nextDraft.connectorImportControls || existingAnalysisDraft.connectorImportControls || [],
    selectedFormats: nextDraftClearedActiveSelection ? [] : nextDraft.selectedFormats?.length ? nextDraft.selectedFormats : existingAnalysisDraft.selectedFormats || [],
    selectedFileKeys: nextDraftClearedActiveSelection ? [] : nextDraft.selectedFileKeys?.length ? nextDraft.selectedFileKeys : existingAnalysisDraft.selectedFileKeys || [],
    latestAnalysis: nextDraftClearedActiveSelection ? null : nextDraft.latestAnalysis || existingAnalysisDraft.latestAnalysis || null,
    fileManagerSortMode: nextDraft.fileManagerSortMode || existingAnalysisDraft.fileManagerSortMode || 'name-ascending',
    fileManagerSearchTerm: typeof nextDraft.fileManagerSearchTerm === 'string' ? nextDraft.fileManagerSearchTerm : existingAnalysisDraft.fileManagerSearchTerm || '',
    fileManagerOpen: nextDraft.fileManagerOpen === true,
    fileManagerScrollTop: Number(nextDraft.fileManagerScrollTop || existingAnalysisDraft.fileManagerScrollTop || 0),
    fileManager: {
      ...(existingAnalysisDraft.fileManager || {}),
      ...(nextDraft.fileManager || {}),
      open: nextDraft.fileManagerOpen === true || nextDraft.fileManager?.open === true,
      searchTerm: nextDraftClearedActiveSelection ? '' : typeof nextDraft.fileManager?.searchTerm === 'string' ? nextDraft.fileManager.searchTerm : existingAnalysisDraft.fileManager?.searchTerm || '',
      sortMode: nextDraftClearedActiveSelection ? 'name-ascending' : FILE_MANAGER_SORT_LABELS[nextDraft.fileManager?.sortMode] ? nextDraft.fileManager.sortMode : existingAnalysisDraft.fileManager?.sortMode || 'name-ascending',
      scrollTop: nextDraftClearedActiveSelection ? 0 : Number(nextDraft.fileManager?.scrollTop || existingAnalysisDraft.fileManager?.scrollTop || 0),
      selectedFileKeys: nextDraftClearedActiveSelection ? [] : nextDraft.fileManager?.selectedFileKeys?.length ? nextDraft.fileManager.selectedFileKeys : existingAnalysisDraft.fileManager?.selectedFileKeys || [],
    },
    reconnectRequired: nextDraft.reconnectRequired === true,
  };
}

function saveSourceVaultDraft(root = mountedRoot) {
  const draft = mergeSourceVaultDraft(getSourceVaultDraft(root));
  if (!draft || !isMeaningfulSourceVaultDraft(draft) || shouldPreserveExistingSourceVaultDraft(draft)) return;
  const normalizedDraft = normalizeSourceVaultDraft(draft);
  if (!normalizedDraft) return;
  sourceVaultState = createSourceVaultState(normalizedDraft);
  safeWriteJsonStorage(NEUROARTAN_SOURCE_VAULT_DRAFT_KEY, sourceVaultState);
}

function clearSourceVaultDraft() {
  sourceVaultState = createSourceVaultState({
    status: SOURCE_VAULT_DRAFT_STATUS.active,
    restarted: true,
  });
  safeRemoveStorage(NEUROARTAN_SOURCE_VAULT_DRAFT_KEY);
}

function persistSourceVaultDraftOnPageLifecycle() {
  if (mountedRoot instanceof HTMLElement) saveSourceVaultDraft(mountedRoot);
}

function bindSourceVaultDraftLifecyclePersistence() {
  if (sourceVaultLifecyclePersistenceBound) return;
  sourceVaultLifecyclePersistenceBound = true;
  window.addEventListener('pagehide', persistSourceVaultDraftOnPageLifecycle);
  window.addEventListener('beforeunload', persistSourceVaultDraftOnPageLifecycle);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') persistSourceVaultDraftOnPageLifecycle();
  });
}

function bindSourceVaultDatabaseResult() {
  if (sourceVaultDatabaseResultBound) return;
  sourceVaultDatabaseResultBound = true;
  document.addEventListener('model-source-vault:database-save-result', (event) => {
    if (!(mountedRoot instanceof HTMLElement)) return;
    const detail = event instanceof CustomEvent ? event.detail || {} : {};
    const message = normalizeString(detail.message);
    if (message) setStatus(mountedRoot, message);
  });
}

function selectAllFileManagerFiles(root = mountedRoot) {
  const allAcceptedFiles = latestAnalysis?.allAcceptedFiles || latestAnalysis?.acceptedFiles || [];
  selectedFileKeys = new Set(allAcceptedFiles.map((file) => getFileRecordKey(file)));
  recomputeLatestAnalysisFromFileSelection(root);
  renderFileManager(root, latestAnalysis);
}

function clearAllFileManagerFiles(root = mountedRoot) {
  selectedFileKeys = new Set();
  recomputeLatestAnalysisFromFileSelection(root);
  renderFileManager(root, latestAnalysis);
}

function restoreSourceVaultDraft(root = mountedRoot) {
  if (!(root instanceof HTMLElement)) return false;
  const draft = getExistingSourceVaultDraft();
  if (!draft) return false;
  sourceVaultState = createSourceVaultState(draft);
  safeWriteJsonStorage(NEUROARTAN_SOURCE_VAULT_DRAFT_KEY, draft);

  const sourceTypeControl = field(root, 'sourceType');
  if (sourceTypeControl instanceof HTMLSelectElement && SOURCE_TYPE_LABELS[draft.sourceType]) {
    sourceTypeControl.value = draft.sourceType;
  }

  syncSourceTypeUI(root);
  renderActiveConnectorOptions(root);

  (draft.selectedConnectorValues || []).forEach((record) => {
    const control = root.querySelector(`[data-model-source-vault-connector-option="${record.sourceType}"][value="${record.value}"]`);
    if (control instanceof HTMLInputElement) control.checked = true;
  });

  syncConnectorImportLimitVisibility(root, getSelectedSourceType(root));

  (draft.connectorImportControls || []).forEach((record) => {
    const control = root.querySelector(`[data-model-source-vault-connector-import-limit="${record.service}"]`);
    if (control instanceof HTMLSelectElement) {
      control.value = String(record.importLimit || 0);
      setConnectorImportLimitLabel(root, record.service, record.importLimit || 0);
    }
  });

  if (isSourceVaultAnalysisDraft(draft)) {
    latestAnalysis = draft.latestAnalysis;
    restoredDraftPendingFileReconnect = true;
    selectedFileKeys = new Set(draft.fileManager?.selectedFileKeys || draft.selectedFileKeys || []);
    fileManagerSortMode = normalizeString(draft.fileManager?.sortMode || draft.fileManagerSortMode || 'name-ascending') || 'name-ascending';
    renderDetectedReadableFormats(root, latestAnalysis.detectedFormatCounts || {}, draft.selectedFormats || latestAnalysis.allowedFormats || []);
    renderAnalysis(root, latestAnalysis);
    setFileManagerSearchTerm(root, draft.fileManager?.searchTerm || draft.fileManagerSearchTerm || '');
    renderFileManager(root, latestAnalysis);
    if (draft.fileManager?.open || draft.fileManagerOpen) openFileManager(root);
    restoreFileManagerScrollPosition(root, draft.fileManager?.scrollTop || draft.fileManagerScrollTop || 0);
    const selection = draft.sourceSelection;
    if (selection?.sourceType === 'local_folder') {
      setSelectionLabel(root, 'localFolderFiles', selection.label || 'Reconnect folder');
    }
    if (selection?.sourceType === 'selected_files') {
      setSelectionLabel(root, 'selectedFiles', selection.label || 'Reconnect files');
    }
    renderSourceVaultPackages(root);
    syncSourceVaultActions(root);
    setStatus(root, 'Draft restored. Reconnect the original files or folder before final confirmation.');
    return true;
  }

  const selection = draft.sourceSelection;
  if (selection?.sourceType === 'local_folder') {
    setSelectionLabel(root, 'localFolderFiles', selection.label || 'Reconnect folder');
  }
  if (selection?.sourceType === 'selected_files') {
    setSelectionLabel(root, 'selectedFiles', selection.label || 'Reconnect files');
  }
  renderSourceVaultPackages(root);
  syncSourceVaultActions(root);
  setStatus(root, selection?.reconnectRequired
    ? 'Draft restored. Reconnect the original files or folder before analysis.'
    : 'Draft restored. Continue Source Vault intake.');
  return true;
}

function field(root, name) {
  return root?.querySelector(`[data-model-source-vault-field="${name}"]`) || null;
}

function label(root, name) {
  return root?.querySelector(`[data-model-source-vault-label="${name}"]`) || null;
}


function setText(root, selector, value) {
  const element = root?.querySelector(selector);
  if (element instanceof HTMLElement) element.textContent = value;
}

function setSelectionLabel(root, fieldName, value) {
  const element = root?.querySelector(`[data-model-source-vault-selection-label="${fieldName}"]`);
  if (!(element instanceof HTMLElement)) return;
  element.textContent = value;
  element.hidden = false;
}

function getInputSelectionLabel(input, fallback = 'No selection') {
  if (!(input instanceof HTMLInputElement)) return fallback;
  const files = Array.from(input.files || []);
  if (!files.length) return fallback;

  if (input.dataset.modelSourceVaultField === 'localFolderFiles') {
    const firstPath = files[0]?.webkitRelativePath || files[0]?.name || '';
    const folderName = firstPath.includes('/') ? firstPath.split('/')[0] : 'Selected folder';
    return `${folderName} · ${files.length} files`;
  }

  return files.length === 1 ? files[0].name : `${files.length} files selected`;
}

function updateSelectionLabels(root = mountedRoot) {
  if (!(root instanceof HTMLElement)) return;
  const localFolderInput = field(root, 'localFolderFiles');
  const selectedFilesInput = field(root, 'selectedFiles');
  setSelectionLabel(root, 'localFolderFiles', getInputSelectionLabel(localFolderInput, 'No folder selected'));
  setSelectionLabel(root, 'selectedFiles', getInputSelectionLabel(selectedFilesInput, 'No files selected'));
}

function renderConnectorOptions(root = mountedRoot, sourceType = getSelectedSourceType(root)) {
  if (!(root instanceof HTMLElement)) return;
  const list = root.querySelector(`[data-model-source-vault-connector-list="${sourceType}"]`);
  if (!(list instanceof HTMLElement)) return;

  const selectedServices = new Set(
    Array.from(root.querySelectorAll(`[data-model-source-vault-connector-option="${sourceType}"]:checked`))
      .filter((control) => control instanceof HTMLInputElement)
      .map((control) => control.value)
  );
  (sourceVaultState.selectedConnectorValues || [])
    .filter((record) => record.sourceType === sourceType && record.value)
    .forEach((record) => selectedServices.add(record.value));

  const records = getConnectorRecords(sourceType);
  const connectedRecords = records.filter((record) => record.connectionState === 'connected');
  const authorizationRequiredRecords = records.filter((record) => record.connectionState === 'authorization-required');
  const categoryLabel = getConnectorCategoryLabel(sourceType);
  const providerLabels = getConnectorCategoryProviderLabels(sourceType);

  list.replaceChildren();

  connectedRecords.forEach((record) => {
    const labelElement = document.createElement('label');
    labelElement.className = 'model-source-vault__connector-option';

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.value = record.service;
    input.dataset.modelSourceVaultConnectorOption = sourceType;
    input.checked = selectedServices.has(record.service);

    const text = createConnectorLogo(record.service, record.metadata?.provider_account_handle || record.label);

    labelElement.append(input, text);
    list.append(labelElement);

    if (usesRepositorySelection(record.service)) {
      const repositoryStatus = document.createElement('div');
      repositoryStatus.className = 'model-management__field model-source-vault__connector-repository-field';
      repositoryStatus.dataset.modelSourceVaultConnectorImportLimitField = sourceType;
      repositoryStatus.dataset.modelSourceVaultConnectorImportLimitService = record.service;
      repositoryStatus.hidden = !input.checked;

      const repositoryLabel = document.createElement('span');
      repositoryLabel.className = 'model-management__label model-source-vault__connector-limit-copy';
      repositoryLabel.textContent = getConnectorTerminology(record.service).importControlLabel;

      const repositoryCopy = document.createElement('span');
      repositoryCopy.className = 'model-management__control model-source-vault__connector-repository-copy';
      repositoryCopy.textContent = 'Loading repositories…';

      repositoryStatus.append(repositoryLabel, repositoryCopy);
      list.append(repositoryStatus);
      if (input.checked) void renderConnectorRepositorySelection(root, sourceType, record, repositoryCopy);

      input.addEventListener('change', () => {
        syncConnectorImportLimitVisibility(root, sourceType);
        if (input.checked) void renderConnectorRepositorySelection(root, sourceType, record, repositoryCopy);
        clearAnalysisUI(root);
        syncSourceVaultActions(root);
      });
      return;
    }

    const limitLabel = document.createElement('label');
    limitLabel.className = 'model-management__field model-source-vault__connector-limit-field';
    limitLabel.dataset.modelSourceVaultConnectorImportLimitField = sourceType;
    limitLabel.dataset.modelSourceVaultConnectorImportLimitService = record.service;
    limitLabel.hidden = !input.checked;

    const limitCopy = document.createElement('span');
    limitCopy.className = 'model-management__label model-source-vault__connector-limit-copy';
    limitCopy.textContent = getConnectorTerminology(record.service).importControlLabel;

    const inlineDropdown = document.createElement('span');
    inlineDropdown.className = 'ui-inline-dropdown model-source-vault__connector-limit-dropdown';

    const limitValue = document.createElement('span');
    limitValue.className = 'ui-inline-dropdown__value model-source-vault__connector-limit-value';
    limitValue.dataset.modelSourceVaultConnectorImportLimitLabel = record.service;

    const iconWrapper = document.createElement('span');
    iconWrapper.className = 'ui-inline-dropdown__icon-wrapper model-source-vault__connector-limit-icon-wrapper';

    const icon = document.createElement('img');
    icon.className = 'ui-inline-dropdown__icon ui-icon-theme-aware';
    icon.src = '/registry/icons/public/assets/core/navigation/chevron/chevron-down.svg';
    icon.alt = '';

    const limitSelect = document.createElement('select');
    limitSelect.className = 'ui-dropdown ui-dropdown--icon-only model-source-vault__connector-limit-select';
    limitSelect.dataset.modelSourceVaultConnectorImportLimit = record.service;
    limitSelect.setAttribute('aria-label', `${record.label} ${getConnectorTerminology(record.service).importControlLabel}`);

    getConnectorImportControlOptions(record.service).forEach((optionRecord) => {
      const option = document.createElement('option');
      option.value = String(optionRecord.value);
      option.textContent = optionRecord.label;
      limitSelect.append(option);
    });

    const restoredControl = sourceVaultState.connectorImportControls.find((control) => control.service === record.service);
    if (restoredControl) limitSelect.value = String(restoredControl.importLimit || 0);
    limitValue.textContent = getConnectorImportLimitLabel(Number.parseInt(limitSelect.value || '0', 10) || 0, record.service);

    iconWrapper.append(icon, limitSelect);
    inlineDropdown.append(limitValue, iconWrapper);
    const limitControl = document.createElement('span');
    limitControl.className = 'model-management__control model-source-vault__connector-limit-control';

    limitControl.append(inlineDropdown);
    limitLabel.append(limitCopy, limitControl);
    list.append(limitLabel);

    input.addEventListener('change', () => {
      syncConnectorImportLimitVisibility(root, sourceType);
    });
  });

  syncConnectorImportLimitVisibility(root, sourceType);

  if (connectedRecords.length) return;

  const message = document.createElement('p');
  message.className = 'model-source-vault__field-status';

  if (authorizationRequiredRecords.length) {
    message.textContent = `${authorizationRequiredRecords.map((record) => record.label).join(', ')} requires authorization before ${categoryLabel} intake. `;
  } else {
    message.textContent = `Connect ${providerLabels.join(', ')} before ${categoryLabel} intake. `;
  }

  const action = document.createElement('button');
  action.className = 'model-source-vault__connector-action';
  action.type = 'button';
  action.dataset.modelSourceVaultOpenConnectors = 'true';
  action.textContent = 'Connectors';

  message.append(action);
  list.append(message);
}

function renderActiveConnectorOptions(root = mountedRoot) {
  renderConnectorOptions(root, getSelectedSourceType(root));
}

function readPermissionState() {
  try {
    return JSON.parse(window.localStorage?.getItem(NEUROARTAN_PERMISSION_STATE_KEY) || '{}') || {};
  } catch (error) {
    return {};
  }
}

function isPermissionEnabled(key) {
  const state = readPermissionState()?.[key]?.state || '';
  return state === 'enabled' || state === 'granted';
}

function setFieldVisibility(root, name, visible) {
  const control = field(root, name);
  const container = control?.closest?.('.model-management__field');
  if (container instanceof HTMLElement) container.hidden = !visible;
}

function getSelectedSourceType(root) {
  const sourceTypeControl = field(root, 'sourceType');
  return sourceTypeControl instanceof HTMLSelectElement
    ? normalizeString(sourceTypeControl.value || 'local_folder')
    : 'local_folder';
}

function getActiveFileInput(root) {
  const sourceType = getSelectedSourceType(root);
  if (sourceType === 'local_folder') return field(root, 'localFolderFiles');
  if (sourceType === 'selected_files') return field(root, 'selectedFiles');
  return null;
}

function getSelectedFiles(root) {
  const input = getActiveFileInput(root);
  if (!(input instanceof HTMLInputElement)) return [];
  return Array.from(input.files || []);
}

function getSelectedReadableFormats(root) {
  const selectedFormats = Array.from(root?.querySelectorAll?.('[data-model-source-vault-format]:checked') || [])
    .filter((control) => control instanceof HTMLInputElement)
    .map((control) => normalizeString(control.dataset.modelSourceVaultFormat || '').toLowerCase())
    .filter(Boolean);

  return selectedFormats;
}

function getReadableFormatSummary(formats = []) {
  return formats.map((format) => READABLE_FORMAT_LABELS[format] || format).join(', ');
}

function hasSelectedSourceForAnalysis(root = mountedRoot) {
  if (!(root instanceof HTMLElement)) return false;
  const sourceType = getSelectedSourceType(root);
  if (sourceType === 'local_folder' || sourceType === 'selected_files') {
    return getSelectedFiles(root).length > 0;
  }
  if (SOURCE_TYPE_CONNECTORS[sourceType]) {
    const selectedConnectors = getSelectedConnectorRecords(root, sourceType);
    const repositoryConnectors = selectedConnectors.filter((record) => usesRepositorySelection(record.service));
    if (repositoryConnectors.length) {
      return repositoryConnectors.some((record) => getSelectedConnectorRepositories(root, record.service).length > 0);
    }
    return selectedConnectors.length > 0;
  }
  return false;
}

function syncSourceVaultActions(root = mountedRoot) {
  if (!(root instanceof HTMLElement)) return;
  const analyze = root.querySelector('[data-model-source-vault-analyze]');
  const saveDraft = root.querySelector('[data-model-source-vault-save-current-draft]');
  const addPackage = root.querySelector('[data-model-source-vault-add-package]');
  const confirm = root.querySelector('[data-model-source-vault-confirm]');
  const fileManager = root.querySelector('[data-model-source-vault-file-manager]');
  const packages = getNormalizedSourceVaultPackages();
  const hasAnalysis = !!latestAnalysis;
  const hasAcceptedAnalysis = Number(latestAnalysis?.acceptedCount || 0) > 0;
  const hasPackages = packages.length > 0;
  const analysisLimited = isSourceVaultPlanLimited(latestAnalysis);
  const packagesLimited = packages.some(isSourceVaultPlanLimited);

  if (analyze instanceof HTMLElement) analyze.hidden = !hasSelectedSourceForAnalysis(root);
  if (saveDraft instanceof HTMLElement) saveDraft.hidden = !hasActiveSourceVaultDraft(root);
  if (addPackage instanceof HTMLElement) {
    addPackage.hidden = !hasAcceptedAnalysis || analysisLimited;
    if (addPackage instanceof HTMLButtonElement) addPackage.disabled = analysisLimited;
  }
  if (confirm instanceof HTMLElement) {
    confirm.hidden = !(hasAcceptedAnalysis || hasPackages) || analysisLimited || packagesLimited;
    if (confirm instanceof HTMLButtonElement) confirm.disabled = analysisLimited || packagesLimited;
  }
  if (!hasAnalysis && fileManager instanceof HTMLElement) fileManager.hidden = true;
}

function renderSourceVaultPackages(root = mountedRoot) {
  if (!(root instanceof HTMLElement)) return;
  const panel = root.querySelector('[data-model-source-vault-packages]');
  const list = root.querySelector('[data-model-source-vault-package-list]');
  const count = root.querySelector('[data-model-source-vault-package-count]');
  const packages = getNormalizedSourceVaultPackages();

  if (!(panel instanceof HTMLElement) || !(list instanceof HTMLElement)) return;

  panel.hidden = true;
  list.replaceChildren();
  if (count instanceof HTMLElement) count.textContent = `${packages.length} saved`;

  packages.forEach((packageRecord) => {
    const item = document.createElement('article');
    item.className = 'model-source-vault__package';

    const copy = document.createElement('div');
    copy.className = 'model-source-vault__package-copy';

    const title = document.createElement('p');
    title.className = 'model-source-vault__package-title';
    title.textContent = packageRecord.sourceLabel || packageRecord.sourceTypeLabel;

    const meta = document.createElement('p');
    meta.className = 'model-source-vault__package-meta';
    const itemLabel = packageRecord.acceptedCount === 1 ? '1 accepted item' : `${packageRecord.acceptedCount} accepted items`;
    const statusLabel = packageRecord.reconnectRequired ? 'Reconnect required' : 'Ready';
    meta.textContent = `${packageRecord.sourceTypeLabel} · ${itemLabel} · ${formatBytes(packageRecord.totalAcceptedBytes)} · ${statusLabel}`;

    const remove = document.createElement('button');
    remove.className = 'model-source-vault__package-remove';
    remove.type = 'button';
    remove.dataset.modelSourceVaultRemovePackage = packageRecord.id;
    remove.textContent = 'Remove';

    copy.append(title, meta);
    item.append(copy, remove);
    list.append(item);
  });
}

function dispatchSourceVaultPackageSaved(root = mountedRoot, packageRecord = null) {
  if (!(root instanceof HTMLElement) || !packageRecord) return;
  root.dispatchEvent(new CustomEvent('model-source-vault:package-saved', {
    bubbles: true,
    detail: {
      sourcePackages: [packageRecord],
      createdAt: packageRecord.updatedAt || new Date().toISOString(),
    },
  }));
}

function resetActiveSourceVaultSelection(root = mountedRoot) {
  if (!(root instanceof HTMLElement)) return;
  ['localFolderFiles', 'selectedFiles'].forEach((name) => {
    const control = field(root, name);
    if (control instanceof HTMLInputElement) control.value = '';
  });
  sourceVaultState = createSourceVaultState({
    ...sourceVaultState,
    activePackageId: null,
    sourceSelection: null,
    selectedConnectorValues: [],
    selectedFormats: [],
    latestAnalysis: null,
    selectedFileKeys: [],
    reconnectRequired: false,
  });
  restoredDraftPendingFileReconnect = false;
  clearAnalysisUI(root);
  syncSourceTypeUI(root);
  updateSelectionLabels(root);
  renderSourceVaultPackages(root);
  syncSourceVaultActions(root);
}

function clearAnalysisUI(root = mountedRoot) {
  if (!(root instanceof HTMLElement)) return;

  const formatsSection = root.querySelector('[data-model-source-vault-formats]');
  const formatList = root.querySelector('[data-model-source-vault-format-list]');
  const summary = root.querySelector('[data-model-source-vault-summary]');
  const report = root.querySelector('[data-model-source-vault-report]');
  const confirm = root.querySelector('[data-model-source-vault-confirm]');
  const fileManager = root.querySelector('[data-model-source-vault-file-manager]');
  const fileManagerOverlay = getFileManagerOverlay(root);
  const fileManagerList = getFileManagerList(root);

  if (formatsSection instanceof HTMLElement) formatsSection.hidden = true;
  if (formatList instanceof HTMLElement) formatList.replaceChildren();
  if (summary instanceof HTMLElement) summary.hidden = true;
  if (report instanceof HTMLElement) {
    report.hidden = true;
    report.replaceChildren();
  }
  if (confirm instanceof HTMLElement) confirm.hidden = true;
  if (fileManager instanceof HTMLElement) fileManager.hidden = true;
  if (fileManagerOverlay instanceof HTMLElement) {
    fileManagerOverlay.hidden = true;
    fileManagerOverlay.setAttribute('aria-hidden', 'true');
  }
  setFileManagerWorkspaceOpen(false);
  if (fileManagerList instanceof HTMLElement) fileManagerList.replaceChildren();
  selectedFileKeys = new Set();
  fileManagerSortMode = 'name-ascending';
  syncFileManagerSortLabel(root);
  latestAnalysis = null;
  syncSourceVaultActions(root);
}
function recomputeLatestAnalysisFromFileSelection(root = mountedRoot) {
  if (!latestAnalysis) return;

  const allAcceptedFiles = latestAnalysis.allAcceptedFiles || latestAnalysis.acceptedFiles || [];
  const acceptedFiles = allAcceptedFiles.filter((file) => selectedFileKeys.has(getFileRecordKey(file)));

  latestAnalysis = {
    ...latestAnalysis,
    allAcceptedFiles,
    acceptedFiles,
    acceptedCount: acceptedFiles.length,
    excludedCount: (latestAnalysis.baseExcludedCount || 0) + (allAcceptedFiles.length - acceptedFiles.length),
    totalAcceptedBytes: acceptedFiles.reduce((sum, file) => sum + file.size, 0),
  };
  latestAnalysis.planLimitStatus = createSourceVaultPlanLimitStatus(latestAnalysis);

  const confirm = root?.querySelector?.('[data-model-source-vault-confirm]');
  const fileManager = root?.querySelector?.('[data-model-source-vault-file-manager]');

  setText(root, '[data-model-source-vault-summary-accepted]', String(latestAnalysis.acceptedCount));
  setText(root, '[data-model-source-vault-summary-excluded]', String(latestAnalysis.excludedCount));
  setText(root, '[data-model-source-vault-summary-size]', formatBytes(latestAnalysis.totalAcceptedBytes));

  if (confirm instanceof HTMLElement) confirm.hidden = latestAnalysis.acceptedCount < 1 || isSourceVaultPlanLimited(latestAnalysis);
  if (confirm instanceof HTMLButtonElement) confirm.disabled = isSourceVaultPlanLimited(latestAnalysis);
  if (fileManager instanceof HTMLElement) fileManager.hidden = allAcceptedFiles.length < 1;
  syncFileManagerSummary(root, latestAnalysis);
  if (isSourceVaultPlanLimited(latestAnalysis)) {
    setStatus(root, getSourceVaultPlanLimitMessage(latestAnalysis.planLimitStatus));
  } else {
    setStatus(root, '');
  }
  syncSourceVaultActions(root);
  saveSourceVaultDraft(root);
}

function getFileManagerSummaryText(analysis = latestAnalysis) {
  const allAcceptedFiles = analysis?.allAcceptedFiles || analysis?.acceptedFiles || [];
  const totalCount = allAcceptedFiles.length;
  const selectedCount = analysis?.acceptedCount || 0;
  const excludedCount = analysis?.excludedCount || 0;
  const sizeLabel = formatBytes(analysis?.totalAcceptedBytes || 0);

  if (!totalCount) return 'No readable files are available for intake.';
  return `${selectedCount} of ${totalCount} readable files selected · ${excludedCount} excluded · ${sizeLabel}`;
}

function syncFileManagerSummary(root = mountedRoot, analysis = latestAnalysis) {
  const overlay = getFileManagerOverlay(root);
  const summary = overlay?.querySelector?.('[data-model-source-vault-file-manager-summary]');
  if (summary instanceof HTMLElement) summary.textContent = getFileManagerSummaryText(analysis);
}

function renderFileManager(root = mountedRoot, analysis = latestAnalysis) {
  if (!(root instanceof HTMLElement) || !analysis) return;

  const list = getFileManagerList(root);
  if (!(list instanceof HTMLElement)) return;

  const allAcceptedFiles = analysis.allAcceptedFiles || analysis.acceptedFiles || [];
  const searchTerm = getFileManagerSearchTerm(root);
  const visibleFiles = getSortedFileManagerFiles(allAcceptedFiles.filter((file) => isFileVisibleForSearch(file, searchTerm)));
  syncFileManagerSummary(root, analysis);
  syncFileManagerSortLabel(root);
  list.replaceChildren();

  if (!allAcceptedFiles.length || !visibleFiles.length) {
    const empty = document.createElement('p');
    empty.className = 'model-source-vault__field-status';
    empty.textContent = allAcceptedFiles.length ? 'No matching files.' : 'No readable files available.';
    list.append(empty);
    return;
  }

  visibleFiles.forEach((file) => {
    const key = getFileRecordKey(file);
    const row = document.createElement('label');
    row.className = 'model-source-vault__file-row';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.dataset.modelSourceVaultFileKey = key;
    checkbox.checked = selectedFileKeys.has(key);

    const name = document.createElement('span');
    name.className = 'model-source-vault__file-name';
    name.textContent = file.relativePath || file.name;

    const size = document.createElement('span');
    size.className = 'model-source-vault__file-size';
    size.textContent = file.sizeLabel;

    row.append(checkbox, name, size);
    list.append(row);
  });
}

function openFileManager(root = mountedRoot) {
  const overlay = mountFileManagerOverlay(root);
  if (!(overlay instanceof HTMLElement)) return;

  removeSourceVaultDraftDecision();
  bindFileManagerOverlayEvents(root);
  renderFileManager(root, latestAnalysis);
  overlay.hidden = false;
  overlay.setAttribute('aria-hidden', 'false');
  setFileManagerWorkspaceOpen(true);
  saveSourceVaultDraft(root);
}

function getActiveSourceVaultDraft(root = mountedRoot) {
  const currentDraft = normalizeSourceVaultDraft(getSourceVaultDraft(root));
  return currentDraft || getExistingSourceVaultDraft();
}

function hasActiveSourceVaultDraft(root = mountedRoot) {
  return isMeaningfulSourceVaultDraft(getActiveSourceVaultDraft(root));
}

function removeSourceVaultDraftDecision() {
  document.querySelector('[data-model-source-vault-draft-decision]')?.remove();
}

function renderSourceVaultDraftDecision(root = mountedRoot) {
  removeSourceVaultDraftDecision();

  const layer = document.createElement('section');
  layer.className = 'ui-confirm-layer profile-filter-overlay__confirm-layer';
  layer.dataset.modelSourceVaultDraftDecision = '';
  layer.setAttribute('role', 'dialog');
  layer.setAttribute('aria-modal', 'true');
  layer.setAttribute('aria-label', 'Save Source Vault draft');

  layer.innerHTML = `
    <article class="ui-confirm-card profile-filter-overlay__confirm-card">
      <strong>Save Source Vault draft</strong>
      <p>Save this source intake privately or restart from the beginning?</p>
      <div class="profile-filter-overlay__options">
        <button class="profile-filter-overlay__chip" type="button" data-model-source-vault-restart-draft>Restart</button>
        <button class="profile-filter-overlay__chip" type="button" data-model-source-vault-save-draft>Save draft</button>
        <button class="profile-filter-overlay__chip" type="button" data-model-source-vault-cancel-draft-decision>Cancel</button>
      </div>
    </article>
  `;

  document.body.append(layer);
  layer.addEventListener('click', handleClick);
  layer.querySelector('[data-model-source-vault-save-draft]')?.focus?.();
}

function closeFileManager(root = mountedRoot, options = {}) {
  if (options.force !== true && hasActiveSourceVaultDraft(root)) {
    renderSourceVaultDraftDecision(root);
    return;
  }

  removeSourceVaultDraftDecision();
  const overlay = getFileManagerOverlay(root);
  if (overlay instanceof HTMLElement) {
    overlay.hidden = true;
    overlay.setAttribute('aria-hidden', 'true');
  }
  setFileManagerWorkspaceOpen(false);
  saveSourceVaultDraft(root);
}

function detectReadableFormatCounts(files = []) {
  return files.reduce((counts, file) => {
    const extension = getFileExtension(file?.name || '');
    if (!READABLE_FORMATS.includes(extension)) return counts;
    counts[extension] = (counts[extension] || 0) + 1;
    return counts;
  }, {});
}

function renderDetectedReadableFormats(root = mountedRoot, formatCounts = {}, selectedFormats = []) {
  if (!(root instanceof HTMLElement)) return [];

  const formatsSection = root.querySelector('[data-model-source-vault-formats]');
  const formatList = root.querySelector('[data-model-source-vault-format-list]');
  const detectedFormats = READABLE_FORMATS.filter((format) => Number(formatCounts[format] || 0) > 0);
  const selectedSet = new Set(selectedFormats.length ? selectedFormats : detectedFormats);

  if (!(formatsSection instanceof HTMLElement) || !(formatList instanceof HTMLElement)) return detectedFormats;

  formatList.replaceChildren();

  detectedFormats.forEach((format) => {
    const option = document.createElement('label');
    option.className = 'model-source-vault__format-option';

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.dataset.modelSourceVaultFormat = format;
    input.checked = selectedSet.has(format);

    const labelText = document.createElement('span');
    labelText.textContent = `${READABLE_FORMAT_LABELS[format] || format} · ${formatCounts[format]} file${formatCounts[format] === 1 ? '' : 's'}`;

    option.append(input, labelText);
    formatList.append(option);
  });

  formatsSection.hidden = detectedFormats.length < 1;

  return detectedFormats;
}

function readVaultConfig(root) {
  const sourceTypeControl = field(root, 'sourceType');

  const sourceType = sourceTypeControl instanceof HTMLSelectElement
    ? normalizeString(sourceTypeControl.value || 'local_folder')
    : 'local_folder';

  const normalizedSourceType = sourceTypeControl instanceof HTMLSelectElement ? normalizeString(sourceTypeControl.value || 'local_folder') : 'local_folder';
  const sourceConnectors = getSelectedConnectorRecords(root, normalizedSourceType);
  const connectorImportControls = getSelectedConnectorImportControls(root, normalizedSourceType);

  return {
    sourceType,
    sourceTypeLabel: SOURCE_TYPE_LABELS[sourceType] || sourceType,
    sourceReference: sourceConnectors.map((record) => record.service).join(','),
    sourceConnectors,
    connectorImportControls,
    allowedFormats: getSelectedReadableFormats(root),
    selectedFiles: getSelectedFiles(root),
  };
}

function syncSourceTypeUI(root = mountedRoot) {
  if (!(root instanceof HTMLElement)) return;

  const sourceType = getSelectedSourceType(root);
  const sourceTypeLabel = SOURCE_TYPE_LABELS[sourceType] || sourceType;
  const labelElement = label(root, 'sourceType');
  if (labelElement instanceof HTMLElement) {
    labelElement.textContent = sourceTypeLabel;
  }
  const localFolderInput = field(root, 'localFolderFiles');
  const selectedFilesInput = field(root, 'selectedFiles');

  root.querySelectorAll('[data-model-source-vault-field-group]').forEach((group) => {
    if (!(group instanceof HTMLElement)) return;
    const groupName = group.dataset.modelSourceVaultFieldGroup || '';
    group.hidden = groupName !== sourceType && groupName !== 'formats';
  });

  setFieldVisibility(root, 'allowedFormats', sourceType === 'local_folder' || sourceType === 'selected_files');

  if (localFolderInput instanceof HTMLInputElement) {
    localFolderInput.setAttribute('webkitdirectory', '');
    localFolderInput.setAttribute('directory', '');
    localFolderInput.multiple = true;
    localFolderInput.accept = '';
  }

  if (selectedFilesInput instanceof HTMLInputElement) {
    selectedFilesInput.removeAttribute('webkitdirectory');
    selectedFilesInput.removeAttribute('directory');
    selectedFilesInput.multiple = true;
    selectedFilesInput.accept = '.md,.txt,.json,.csv,.pdf';
  }

  if (sourceType === 'local_folder' && !isPermissionEnabled('localFolder')) {
    setStatus(root, '');
    syncSourceVaultActions(root);
    return;
  }

  if (sourceType === 'selected_files' && !isPermissionEnabled('selectedFiles')) {
    setStatus(root, '');
    syncSourceVaultActions(root);
    return;
  }

  if (sourceType === 'repository_reference' && !SOURCE_TYPE_CONNECTORS[sourceType] && !isPermissionEnabled('repositoryReference')) {
    setStatus(root, '');
    syncSourceVaultActions(root);
    return;
  }

  if (SOURCE_TYPE_CONNECTORS[sourceType]) {
    renderConnectorOptions(root, sourceType);
    void hydrateSourceVaultConnectorStateFromBackend(root);
    const selectable = getSelectableConnectorRecords(sourceType);
    const authorizationRequired = getAuthorizationRequiredConnectorLabels(sourceType);
    if (selectable.length) {
      setStatus(root, '');
      syncSourceVaultActions(root);
      return;
    }
    if (authorizationRequired.length) {
      setStatus(root, `${authorizationRequired.join(', ')} requires authorization in Settings → Connectors before direct source intake.`);
      syncSourceVaultActions(root);
      return;
    }
    setStatus(root, `Connect a ${sourceTypeLabel} provider in Settings → Connectors before source intake.`);
    syncSourceVaultActions(root);
    return;
  }

  updateSelectionLabels(root);
  setStatus(root, '');
  syncSourceVaultActions(root);
}

function analyzeSourceVault(root = mountedRoot) {
  if (!(root instanceof HTMLElement)) return null;

  const config = readVaultConfig(root);
  syncSourceTypeUI(root);
  const files = config.selectedFiles;

  if (SOURCE_TYPE_CONNECTORS[config.sourceType]) {
    const selectedFormats = getSelectedReadableFormats(root);
    latestAnalysis = {
      ...config,
      allowedFormats: selectedFormats,
      acceptedFiles: [],
      excludedFiles: [],
      acceptedCount: config.sourceConnectors.length,
      excludedCount: 0,
      totalAcceptedBytes: 0,
      requiresConnectorListing: true,
      availableConnectors: getAvailableConnectorLabels(config.sourceType),
      authorizationRequiredConnectors: getAuthorizationRequiredConnectorLabels(config.sourceType),
      selectedConnectors: config.sourceConnectors,
      connectorImportControls: config.connectorImportControls,
      createdAt: new Date().toISOString(),
    };
    renderAnalysis(root, latestAnalysis);
    saveSourceVaultDraft(root);
    return latestAnalysis;
  }

  const previousSelectedFormats = getSelectedReadableFormats(root);
  const formatCounts = detectReadableFormatCounts(files);
  const detectedReadableFormats = renderDetectedReadableFormats(root, formatCounts, previousSelectedFormats);
  const selectedFormats = getSelectedReadableFormats(root);
  const allowed = selectedFormats.length ? selectedFormats : detectedReadableFormats;
  const acceptedFiles = [];
  const excludedFiles = [];

  files.forEach((file) => {
    const extension = getFileExtension(file.name);
    const record = {
      name: file.name,
      relativePath: file.webkitRelativePath || file.name,
      extension,
      size: file.size || 0,
      sizeLabel: formatBytes(file.size || 0),
    };

    const isReadable = READABLE_FORMATS.includes(extension);
    const isAccepted = isReadable && allowed.includes(extension) && !DEFAULT_EXCLUDED_FORMATS.includes(extension);

    if (isAccepted) acceptedFiles.push(record);
    else excludedFiles.push(record);
  });

  latestAnalysis = {
    ...config,
    allowedFormats: allowed,
    detectedReadableFormats,
    detectedFormatCounts: formatCounts,
    acceptedFiles,
    excludedFiles,
    allAcceptedFiles: acceptedFiles,
    baseExcludedCount: excludedFiles.length,
    acceptedCount: acceptedFiles.length,
    excludedCount: excludedFiles.length,
    totalAcceptedBytes: acceptedFiles.reduce((sum, file) => sum + file.size, 0),
    createdAt: new Date().toISOString(),
  };
  latestAnalysis.planLimitStatus = createSourceVaultPlanLimitStatus(latestAnalysis);

  selectedFileKeys = new Set(acceptedFiles.map((file) => getFileRecordKey(file)));
  renderAnalysis(root, latestAnalysis);
  saveSourceVaultDraft(root);
  return latestAnalysis;
}

async function prepareLatestAnalysisForSourceVaultSave(root = mountedRoot) {
  if (!(root instanceof HTMLElement)) return null;
  if (!latestAnalysis) analyzeSourceVault(root);
  if (!latestAnalysis?.acceptedCount) return latestAnalysis;
  latestAnalysis.planLimitStatus = createSourceVaultPlanLimitStatus(latestAnalysis);
  if (latestAnalysis.planLimitStatus.exceeded) {
    setStatus(root, getSourceVaultPlanLimitMessage(latestAnalysis.planLimitStatus));
    renderAnalysis(root, latestAnalysis);
    return latestAnalysis;
  }
  if (Array.isArray(latestAnalysis.contentFiles) && latestAnalysis.contentFiles.length) return latestAnalysis;
  setStatus(root, 'Reading source content...');
  latestAnalysis = await createSourceVaultContentSnapshot(root, latestAnalysis);
  renderAnalysis(root, latestAnalysis);
  return latestAnalysis;
}

async function addCurrentSourceVaultPackage(root = mountedRoot) {
  if (!(root instanceof HTMLElement)) return null;
  const analysis = await prepareLatestAnalysisForSourceVaultSave(root);
  if (!analysis?.acceptedCount) {
    setStatus(root, 'Analyze a source with accepted items before saving it to Database.');
    syncSourceVaultActions(root);
    return null;
  }
  if (isSourceVaultPlanLimited(analysis)) {
    setStatus(root, getSourceVaultPlanLimitMessage(analysis.planLimitStatus));
    syncSourceVaultActions(root);
    return null;
  }

  const packageRecord = upsertSourceVaultPackage(root, analysis);
  if (!packageRecord) return null;
  dispatchSourceVaultPackageSaved(root, packageRecord);
  resetActiveSourceVaultSelection(root);
  saveSourceVaultDraft(root);
  setStatus(root, 'Saving source to Database...');
  return packageRecord;
}

function removeSourceVaultPackage(root = mountedRoot, packageId = '') {
  if (!(root instanceof HTMLElement) || !packageId) return;
  const packages = getNormalizedSourceVaultPackages().filter((packageRecord) => packageRecord.id !== packageId);
  sourceVaultState = createSourceVaultState({
    ...sourceVaultState,
    sourcePackages: packages,
    activePackageId: sourceVaultState.activePackageId === packageId ? null : sourceVaultState.activePackageId,
  });
  renderSourceVaultPackages(root);
  syncSourceVaultActions(root);
  saveSourceVaultDraft(root);
  setStatus(root, packages.length ? 'Source package removed.' : 'Source package removed. Choose a source to continue.');
}

function getSourceVaultConfirmationPackages(root = mountedRoot) {
  const packages = getNormalizedSourceVaultPackages();
  const currentPackage = latestAnalysis?.acceptedCount ? createSourceVaultPackageFromAnalysis(root, latestAnalysis) : null;
  if (!currentPackage) return packages;
  const existingIndex = packages.findIndex((packageRecord) => packageRecord.id === currentPackage.id);
  if (existingIndex >= 0) {
    packages[existingIndex] = currentPackage;
    return packages;
  }
  return [...packages, currentPackage];
}

function renderAnalysis(root = mountedRoot, analysis = latestAnalysis) {
  if (!(root instanceof HTMLElement) || !analysis) return;

  const summary = root.querySelector('[data-model-source-vault-summary]');
  const report = root.querySelector('[data-model-source-vault-report]');
  const confirm = root.querySelector('[data-model-source-vault-confirm]');
  const fileManager = root.querySelector('[data-model-source-vault-file-manager]');

  setText(root, '[data-model-source-vault-summary-accepted]', String(analysis.acceptedCount));
  setText(root, '[data-model-source-vault-summary-excluded]', String(analysis.excludedCount));
  setText(root, '[data-model-source-vault-summary-size]', formatBytes(analysis.totalAcceptedBytes));

  if (summary instanceof HTMLElement) summary.hidden = false;
  const planLimited = isSourceVaultPlanLimited(analysis);
  if (confirm instanceof HTMLElement) confirm.hidden = analysis.acceptedCount < 1 || planLimited;
  if (confirm instanceof HTMLButtonElement) confirm.disabled = planLimited;
  if (fileManager instanceof HTMLElement) fileManager.hidden = (analysis.allAcceptedFiles || analysis.acceptedFiles || []).length < 1;
  renderFileManager(root, analysis);
  syncSourceVaultActions(root);

  if (analysis.requiresConnectorListing) {
    if (analysis.selectedConnectors?.length) {
      const importSummary = (analysis.connectorImportControls || [])
        .map((record) => `${record.label}: ${record.importLimitLabel}`)
        .join(' · ');
      const sourceSummary = (analysis.selectedConnectors || [])
        .map(getConnectorImportStatusLabel)
        .filter(Boolean)
        .join(' · ');
      setStatus(root, `${analysis.selectedConnectors.map((record) => record.label).join(', ')} selected. ${sourceSummary || importSummary || 'All available'} will be prepared for source-vault intake.`);
      return;
    }
    if (analysis.authorizationRequiredConnectors?.length) {
      setStatus(root, `${analysis.authorizationRequiredConnectors.join(', ')} requires authorization before source analysis.`);
      return;
    }
    setStatus(root, 'No connected provider is available for this source type. Connect a provider first.');
    return;
  }

  if (planLimited) {
    setStatus(root, getSourceVaultPlanLimitMessage(analysis.planLimitStatus));
    return;
  }

  setStatus(root, analysis.acceptedCount
    ? ''
    : 'No accepted readable files found. Adjust readable content selections or choose supported files.');
}

function setStatus(root = mountedRoot, message = '') {
  const status = root?.querySelector?.('[data-model-source-vault-status]');
  if (!(status instanceof HTMLElement)) return;
  status.textContent = message;
  status.hidden = !normalizeString(message);
}

async function confirmSourceVaultIntake(root = mountedRoot) {
  if (!latestAnalysis && !getNormalizedSourceVaultPackages().length) analyzeSourceVault(root);
  if (latestAnalysis?.acceptedCount) await prepareLatestAnalysisForSourceVaultSave(root);
  const packages = getSourceVaultConfirmationPackages(root);
  const acceptedFiles = packages.flatMap((packageRecord) => packageRecord.acceptedFiles || []);
  const excludedFiles = packages.flatMap((packageRecord) => packageRecord.excludedFiles || []);
  const selectedConnectors = packages.flatMap((packageRecord) => packageRecord.selectedConnectors || []);
  const connectorImportControls = packages.flatMap((packageRecord) => packageRecord.connectorImportControls || []);
  const reconnectRequired = restoredDraftPendingFileReconnect || packages.some((packageRecord) => packageRecord.reconnectRequired);
  const planLimitedPackage = packages.find(isSourceVaultPlanLimited);

  if (!packages.length || !acceptedFiles.length && !selectedConnectors.length) {
    setStatus(root, 'Analyze a source vault with accepted files or connected sources before confirming intake.');
    return null;
  }

  if (reconnectRequired) {
    setStatus(root, 'Reconnect the original files or folder before final confirmation.');
    return null;
  }

  if (planLimitedPackage) {
    setStatus(root, getSourceVaultPlanLimitMessage(planLimitedPackage.planLimitStatus));
    syncSourceVaultActions(root);
    return null;
  }

  const detail = {
    sourceType: packages.length === 1 ? packages[0].sourceType : 'combined_sources',
    sourceReference: packages.map((packageRecord) => packageRecord.sourceReference).filter(Boolean).join(','),
    sourcePackages: packages,
    selectedConnectors,
    availableConnectors: latestAnalysis?.availableConnectors || [],
    authorizationRequiredConnectors: latestAnalysis?.authorizationRequiredConnectors || [],
    allowedFormats: Array.from(new Set(packages.flatMap((packageRecord) => packageRecord.selectedFormats || []))),
    acceptedFiles,
    excludedFiles,
    acceptedCount: acceptedFiles.length + selectedConnectors.length,
    excludedCount: excludedFiles.length,
    totalAcceptedBytes: packages.reduce((sum, packageRecord) => sum + (Number(packageRecord.totalAcceptedBytes) || 0), 0),
    createdAt: packages[0]?.createdAt || latestAnalysis?.createdAt || new Date().toISOString(),
  };

  root?.dispatchEvent(new CustomEvent('model-source-vault:confirmed', {
    bubbles: true,
    detail,
  }));

  clearSourceVaultDraft();
  latestAnalysis = null;
  restoredDraftPendingFileReconnect = false;
  clearAnalysisUI(root);
  renderSourceVaultPackages(root);
  syncSourceVaultActions(root);
  setStatus(root, 'Source Vault intake confirmed. The approved source package is ready for consent and training routing.');
  return detail;
}

function handleInput(event) {
  const root = mountedRoot;
  if (!(root instanceof HTMLElement)) return;
  const target = getEventElement(event);
  if (!target) return;

  if (target.closest('[data-model-source-vault-file-search]')) {
    renderFileManager(root, latestAnalysis);
    saveSourceVaultDraft(root);
  }
}

function handleChange(event) {
  const root = mountedRoot;
  if (!(root instanceof HTMLElement)) return;
  const target = getEventElement(event);
  if (!target) return;

  const fileToggle = target.closest('[data-model-source-vault-file-key]');
  if (fileToggle instanceof HTMLInputElement) {
    const key = fileToggle.dataset.modelSourceVaultFileKey || '';
    if (fileToggle.checked) selectedFileKeys.add(key);
    else selectedFileKeys.delete(key);
    recomputeLatestAnalysisFromFileSelection(root);
    renderFileManager(root, latestAnalysis);
    saveSourceVaultDraft(root);
    return;
  }

  if (target.closest('[data-model-source-vault-file-search]')) {
    renderFileManager(root, latestAnalysis);
    saveSourceVaultDraft(root);
    return;
  }

  const sortControl = target.closest('[data-model-source-vault-file-sort]');
  if (sortControl instanceof HTMLSelectElement) {
    setFileManagerSortMode(sortControl.value, root);
    return;
  }

  if (target.closest('[data-model-source-vault-field="sourceType"]')) {
    latestAnalysis = null;
    clearAnalysisUI(root);
    syncSourceTypeUI(root);
    updateSelectionLabels(root);
    renderSourceVaultPackages(root);
    saveSourceVaultDraft(root);
    return;
  }

  if (target.closest('[data-model-source-vault-format]')) {
    analyzeSourceVault(root);
    saveSourceVaultDraft(root);
    return;
  }

  if (target.closest('[data-model-source-vault-connector-option]')) {
    latestAnalysis = null;
    clearAnalysisUI(root);
    setStatus(root, 'Connected source selected. Choose the import limit, then run Analyze Source Vault to prepare intake.');
    syncSourceVaultActions(root);
    saveSourceVaultDraft(root);
    return;
  }

  if (target.closest('[data-model-source-vault-connector-import-limit]')) {
    const control = target.closest('[data-model-source-vault-connector-import-limit]');
    if (control instanceof HTMLSelectElement) {
      setConnectorImportLimitLabel(root, control.dataset.modelSourceVaultConnectorImportLimit || '', Number.parseInt(control.value || '0', 10) || 0);
    }
    latestAnalysis = null;
    clearAnalysisUI(root);
    setStatus(root, 'Connector import limit updated. Run Analyze Source Vault to prepare intake.');
    syncSourceVaultActions(root);
    saveSourceVaultDraft(root);
    return;
  }

  if (
    target.closest('[data-model-source-vault-field="selectedFiles"]')
    || target.closest('[data-model-source-vault-field="localFolderFiles"]')
  ) {
    latestAnalysis = null;
    updateSelectionLabels(root);
    clearAnalysisUI(root);
    updateSelectionLabels(root);
    setStatus(root, 'Source selected. Run Analyze Source Vault to detect readable content.');
    restoredDraftPendingFileReconnect = false;
    syncSourceVaultActions(root);
    saveSourceVaultDraft(root);
  }
}

function handleClick(event) {
  const root = mountedRoot;
  if (!(root instanceof HTMLElement)) return;
  const target = getEventElement(event);
  if (!target) return;

  if (target.closest('[data-model-source-vault-open-connectors]')) {
    requestSettingsConnectors();
    return;
  }

  if (target.closest('[data-model-source-vault-save-draft]')) {
    closeFileManager(root, { force: true });
    saveSourceVaultDraft(root);
    setStatus(root, 'Source Vault draft saved.');
    return;
  }

  if (target.closest('[data-model-source-vault-restart-draft]')) {
    closeFileManager(root, { force: true });
    clearSourceVaultDraft();
    clearAnalysisUI(root);
    syncSourceTypeUI(root);
    updateSelectionLabels(root);
    renderSourceVaultPackages(root);
    setStatus(root, 'Source Vault intake restarted.');
    return;
  }

  if (target.closest('[data-model-source-vault-cancel-draft-decision]')) {
    removeSourceVaultDraftDecision();
    return;
  }

  const picker = target.closest('[data-model-source-vault-picker]');
  if (picker instanceof HTMLElement) {
    const targetField = picker.dataset.modelSourceVaultPicker || '';
    const input = field(root, targetField);
    if (input instanceof HTMLInputElement) input.click();
    return;
  }

  if (target.closest('[data-model-source-vault-analyze]')) {
    analyzeSourceVault(root);
    saveSourceVaultDraft(root);
    return;
  }

  if (target.closest('[data-model-source-vault-save-current-draft]')) {
    saveSourceVaultDraft(root);
    setStatus(root, 'Source Vault draft saved.');
    return;
  }

  if (target.closest('[data-model-source-vault-add-package]')) {
    void addCurrentSourceVaultPackage(root);
    return;
  }

  const removePackage = target.closest('[data-model-source-vault-remove-package]');
  if (removePackage instanceof HTMLElement) {
    removeSourceVaultPackage(root, removePackage.dataset.modelSourceVaultRemovePackage || '');
    return;
  }

  if (target.closest('[data-model-source-vault-file-manager]')) {
    openFileManager(root);
    saveSourceVaultDraft(root);
    return;
  }

  if (target.closest('[data-model-source-vault-file-manager-close]')) {
    closeFileManager(root);
    return;
  }

  const fileSearchTrigger = target.closest('[data-model-source-vault-file-search-trigger]');
  if (fileSearchTrigger instanceof HTMLElement) {
    const shell = fileSearchTrigger.closest('.model-source-vault__file-search');
    const search = shell?.querySelector?.('[data-model-source-vault-file-search]');
    if (shell instanceof HTMLElement) shell.dataset.searchOpen = 'true';
    if (search instanceof HTMLInputElement) window.setTimeout(() => search.focus(), 0);
    return;
  }

  const fileSearchClose = target.closest('[data-model-source-vault-file-search-close]');
  if (fileSearchClose instanceof HTMLElement) {
    const shell = fileSearchClose.closest('.model-source-vault__file-search');
    const search = shell?.querySelector?.('[data-model-source-vault-file-search]');
    if (shell instanceof HTMLElement) shell.dataset.searchClosing = 'true';
    if (search instanceof HTMLInputElement) {
      search.value = '';
      search.blur();
    }
    if (shell instanceof HTMLElement) delete shell.dataset.searchOpen;
    fileSearchClose.blur();
    window.setTimeout(() => {
      if (shell instanceof HTMLElement) delete shell.dataset.searchClosing;
      renderFileManager(root, latestAnalysis);
      saveSourceVaultDraft(root);
    }, 160);
    return;
  }

  if (target.closest('[data-model-source-vault-file-select-all]')) {
    selectAllFileManagerFiles(root);
    saveSourceVaultDraft(root);
    return;
  }

  if (target.closest('[data-model-source-vault-file-clear-all]')) {
    clearAllFileManagerFiles(root);
    saveSourceVaultDraft(root);
    return;
  }

  if (target.closest('[data-model-source-vault-confirm]')) {
    void confirmSourceVaultIntake(root);
  }
}

function handleFileManagerSearchPointerDown(event) {
  const root = mountedRoot;
  if (!(root instanceof HTMLElement)) return;
  const target = getEventElement(event);
  const fileSearchTrigger = target?.closest?.('[data-model-source-vault-file-search-trigger]');
  if (!(fileSearchTrigger instanceof HTMLElement)) return;

  const shell = fileSearchTrigger.closest('.model-source-vault__file-search');
  const search = shell?.querySelector?.('[data-model-source-vault-file-search]');
  if (!(shell instanceof HTMLElement) || !(search instanceof HTMLInputElement)) return;

  event.preventDefault();
  shell.dataset.searchOpen = 'true';
  requestAnimationFrame(() => search.focus());
}

export function mountModelSourceVault(root = document) {
  mountedRoot = root?.querySelector?.('[data-model-source-vault]') || root;
  void hydrateSourceVaultConnectorStateFromBackend(mountedRoot);
  if (!(mountedRoot instanceof HTMLElement)) return null;

  mountFileManagerOverlay(mountedRoot);
  bindFileManagerOverlayEvents(mountedRoot);
  bindSourceVaultDraftLifecyclePersistence();
  bindSourceVaultDatabaseResult();

  mountedRoot.addEventListener('change', handleChange);
  mountedRoot.addEventListener('pointerdown', handleFileManagerSearchPointerDown, true);
  mountedRoot.addEventListener('click', handleClick);

  const draftRestored = restoreSourceVaultDraft(mountedRoot);
  if (!draftRestored) {
    clearAnalysisUI(mountedRoot);
    syncSourceTypeUI(mountedRoot);
    updateSelectionLabels(mountedRoot);
    renderActiveConnectorOptions(mountedRoot);
    renderSourceVaultPackages(mountedRoot);
    syncSourceVaultActions(mountedRoot);
  }
  return mountedRoot;
}

export function getModelSourceVaultAnalysis() {
  return latestAnalysis;
}
