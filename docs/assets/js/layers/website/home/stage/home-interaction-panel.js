/* =========================================================
   00. FILE INDEX
   01. IMPORTS
   02. MODULE STATE
   03. DOM HELPERS
   04. VALUE HELPERS
   05. EVENT HELPERS
   06. DATA HELPERS
   07. COMPOSER RENDERING
   08. DEVELOPER ACTIONS
   09. MODEL CONTROL
   10. SUBMISSION CONTROL
   11. EVENT BINDING
   12. MODULE BOOT
   ========================================================= */

/* =========================================================
   01. IMPORTS
   ========================================================= */

import {
  getActiveModelState,
  subscribeActiveModelState,
} from '../../system/model/active-model.js';
import {
  requestDeveloperRuntimeAction
} from '../../development-cockpit/developer-runtime-client.js';

/* =========================================================
   02. MODULE STATE
   ========================================================= */

const HOME_INTERACTION_PANEL_STATE = {
  isBound: false,
  files: [],
  developerActions: [],
  developerActionsLoaded: false,
  developerRepositories: [],
  developerEnvironmentModes: [],
  developerRuntimeInterfaces: {},
  developerState: null,
  developerWorkbenchLoaded: false,
};

const HOME_DEVELOPER_ACTION_REGISTRY_PATH = '/assets/data/website/development-cockpit/developer-home-action-registry.json';
const HOME_DEVELOPER_REPOSITORY_REGISTRY_PATH = '/assets/data/website/development-cockpit/repository-scope-registry.json';
const HOME_DEVELOPER_PROJECT_REGISTRY_PATH = '/assets/data/website/development-cockpit/developer-project-registry.json';
const HOME_DEVELOPER_RUNTIME_INTERFACE_REGISTRY_PATH = '/assets/data/website/development-cockpit/developer-runtime-interface-registry.json';

/* =========================================================
   03. DOM HELPERS
   ========================================================= */

function getHomeInteractionPanelNodes() {
  return {
    root: document.querySelector('#home-interaction-panel'),
    form: document.querySelector('#home-interaction-panel-form'),
    input: document.querySelector('#home-interaction-panel-input'),
    fileInput: document.querySelector('#home-interaction-panel-file-input'),
    files: document.querySelector('[data-home-interaction-files]'),
    activeModel: document.querySelector('[data-home-interaction-active-model]'),
    developerActions: document.querySelector('[data-home-developer-actions]'),
    developerRepository: document.querySelector('[data-home-developer-repository]'),
    developerEnvironment: document.querySelector('[data-home-developer-environment]'),
    developerWorkspaceName: document.querySelector('[data-home-developer-workspace-name]'),
    developerGithubConnect: document.querySelector('[data-home-developer-github-connect]'),
    developerRepositoriesDiscover: document.querySelector('[data-home-developer-repositories-discover]'),
    developerWorkspaceCreate: document.querySelector('[data-home-developer-workspace-create]'),
    developerStatus: document.querySelector('[data-home-developer-status]'),
  };
}

/* =========================================================
   04. VALUE HELPERS
   ========================================================= */

function escapeHomeInteractionHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function normalizeHomeInteractionQuery(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function getHomeInteractionSubmitIntent() {
  const submit = document.querySelector('#home-interaction-panel-submit');

  if (!(submit instanceof HTMLButtonElement)) {
    return 'submit';
  }

  return submit.dataset.homeInteractionSubmitIntent || 'submit';
}

function hasHomeInteractionTypedInput(input) {
  return input instanceof HTMLTextAreaElement && input.value.trim().length > 0;
}

/* =========================================================
   05. EVENT HELPERS
   ========================================================= */

function dispatchHomeInteractionEvent(name, detail = {}) {
  document.dispatchEvent(new CustomEvent(name, { detail }));
}

function resetHomeInteractionPanel() {
  const nodes = getHomeInteractionPanelNodes();

  if (nodes.input instanceof HTMLTextAreaElement) {
    nodes.input.value = '';
    nodes.input.style.height = 'auto';
    nodes.input.dispatchEvent(new Event('input', { bubbles: true }));
    nodes.input.focus();
  }

  if (nodes.fileInput instanceof HTMLInputElement) {
    nodes.fileInput.value = '';
  }

  HOME_INTERACTION_PANEL_STATE.files = [];
  renderHomeInteractionFiles();
  syncHomeInteractionComposerHeight();

  dispatchHomeInteractionEvent('neuroartan:home-stage-reset-requested', {
    source: 'home-interaction-panel-reset',
  });
}

/* =========================================================
   06. DATA HELPERS
   ========================================================= */

async function loadHomeDeveloperActions() {
  if (HOME_INTERACTION_PANEL_STATE.developerActionsLoaded) {
    return HOME_INTERACTION_PANEL_STATE.developerActions;
  }

  try {
    const response = await fetch(HOME_DEVELOPER_ACTION_REGISTRY_PATH, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Developer action registry failed: ${response.status}`);
    }

    const registry = await response.json();
    HOME_INTERACTION_PANEL_STATE.developerActions = Array.isArray(registry.actions)
      ? registry.actions
      : [];
  } catch (error) {
    console.warn('[home-interaction-panel] Developer action registry unavailable.', error);
    HOME_INTERACTION_PANEL_STATE.developerActions = [];
  } finally {
    HOME_INTERACTION_PANEL_STATE.developerActionsLoaded = true;
  }

  return HOME_INTERACTION_PANEL_STATE.developerActions;
}

async function fetchHomeInteractionJson(path) {
  const response = await fetch(path, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Home interaction registry failed: ${path}`);
  }
  return response.json();
}

async function loadHomeDeveloperWorkbenchData() {
  if (HOME_INTERACTION_PANEL_STATE.developerWorkbenchLoaded) {
    return;
  }

  try {
    const [
      repositoryRegistry,
      projectRegistry,
      runtimeInterfaceRegistry
    ] = await Promise.all([
      fetchHomeInteractionJson(HOME_DEVELOPER_REPOSITORY_REGISTRY_PATH),
      fetchHomeInteractionJson(HOME_DEVELOPER_PROJECT_REGISTRY_PATH),
      fetchHomeInteractionJson(HOME_DEVELOPER_RUNTIME_INTERFACE_REGISTRY_PATH)
    ]);

    HOME_INTERACTION_PANEL_STATE.developerRepositories = Array.isArray(repositoryRegistry.repositories)
      ? repositoryRegistry.repositories
      : [];
    HOME_INTERACTION_PANEL_STATE.developerEnvironmentModes = Array.isArray(projectRegistry.environmentModes)
      ? projectRegistry.environmentModes
      : [];
    HOME_INTERACTION_PANEL_STATE.developerRuntimeInterfaces = runtimeInterfaceRegistry || {};
  } catch (error) {
    console.warn('[home-interaction-panel] Developer workbench data unavailable.', error);
    HOME_INTERACTION_PANEL_STATE.developerRepositories = [];
    HOME_INTERACTION_PANEL_STATE.developerEnvironmentModes = [];
    HOME_INTERACTION_PANEL_STATE.developerRuntimeInterfaces = {};
  } finally {
    HOME_INTERACTION_PANEL_STATE.developerWorkbenchLoaded = true;
  }
}

function buildHomeDeveloperRuntimeContext() {
  return {
    registries: {
      runtimeInterfaces: HOME_INTERACTION_PANEL_STATE.developerRuntimeInterfaces
    }
  };
}

/* =========================================================
   07. COMPOSER RENDERING
   ========================================================= */

function syncHomeInteractionComposerHeight() {
  const { input } = getHomeInteractionPanelNodes();
  if (!(input instanceof HTMLTextAreaElement)) {
    return;
  }

  input.style.height = 'auto';
  input.style.height = `${Math.max(input.scrollHeight, 70)}px`;
}

function renderHomeInteractionFiles() {
  const nodes = getHomeInteractionPanelNodes();
  if (!nodes.files) {
    return;
  }

  nodes.files.innerHTML = HOME_INTERACTION_PANEL_STATE.files.length
    ? HOME_INTERACTION_PANEL_STATE.files
        .map((file) => `<span class="home-interaction-panel__file-chip">${escapeHomeInteractionHtml(file.name)}</span>`)
        .join('')
    : '';
}

function renderHomeInteractionActiveModel() {
  const nodes = getHomeInteractionPanelNodes();
  const activeModelState = getActiveModelState();
  const activeModel = activeModelState.activeModel;
  const modelLabel = activeModel?.display_name || activeModel?.search_title || 'Neuroartan Institution';

  if (nodes.activeModel) {
    nodes.activeModel.textContent = modelLabel;
  }

  if (nodes.input instanceof HTMLTextAreaElement) {
    nodes.input.placeholder = 'Ask anything.';
  }
}

function fillHomeDeveloperSelect(select, entries = []) {
  if (!(select instanceof HTMLSelectElement)) {
    return;
  }

  select.replaceChildren();
  entries.forEach((entry) => {
    const option = document.createElement('option');
    option.value = entry.id || entry.fullName || entry.label || '';
    option.textContent = entry.label || entry.fullName || entry.id || '';
    select.append(option);
  });
}

/* =========================================================
   08. DEVELOPER ACTIONS
   ========================================================= */

function createHomeDeveloperActionButton(action) {
  const button = document.createElement('button');
  button.className = 'home-interaction-panel__developer-action';
  button.type = 'button';
  button.dataset.homeDeveloperAction = action.id || '';
  button.textContent = action.label || 'Developer action';

  if (action.description) {
    button.setAttribute('aria-label', action.description);
  }

  return button;
}

async function renderHomeDeveloperActions() {
  const nodes = getHomeInteractionPanelNodes();
  if (!nodes.developerActions) {
    return;
  }

  const actions = await loadHomeDeveloperActions();
  nodes.developerActions.replaceChildren();

  actions.forEach((action) => {
    nodes.developerActions.append(createHomeDeveloperActionButton(action));
  });
}

async function renderHomeDeveloperWorkbench() {
  const nodes = getHomeInteractionPanelNodes();
  if (!nodes.developerRepository && !nodes.developerEnvironment) {
    return;
  }

  await loadHomeDeveloperWorkbenchData();
  const context = buildHomeDeveloperRuntimeContext();
  const stateResponse = await requestDeveloperRuntimeAction(context, 'developer-state-read', {
    source:'homepage-developer-workbench'
  });
  HOME_INTERACTION_PANEL_STATE.developerState = stateResponse?.developerState || null;
  const stateRepositories = Array.isArray(stateResponse?.developerState?.repositories)
    ? stateResponse.developerState.repositories
    : [];
  const repositories = stateRepositories.length ? stateRepositories : HOME_INTERACTION_PANEL_STATE.developerRepositories;

  fillHomeDeveloperSelect(nodes.developerRepository, repositories);
  fillHomeDeveloperSelect(nodes.developerEnvironment, HOME_INTERACTION_PANEL_STATE.developerEnvironmentModes);

  if (nodes.developerRepository instanceof HTMLSelectElement && stateResponse?.developerState?.activeRepository) {
    nodes.developerRepository.value = stateResponse.developerState.activeRepository;
  }

  if (nodes.developerEnvironment instanceof HTMLSelectElement && stateResponse?.developerState?.developerPreferences?.defaultEnvironmentMode) {
    nodes.developerEnvironment.value = stateResponse.developerState.developerPreferences.defaultEnvironmentMode;
  }

  if (nodes.developerStatus) {
    nodes.developerStatus.textContent = stateResponse?.developerState?.github?.connected
      ? `Developer Mode connected as ${stateResponse.developerState.github.viewer?.login || 'GitHub user'}. Active repository: ${stateResponse.developerState.activeRepository || 'not selected'}.`
      : 'Developer Mode is ready. Connect GitHub to discover repositories through the server runtime.';
  }
}

function getHomeDeveloperAction(actionId) {
  return HOME_INTERACTION_PANEL_STATE.developerActions.find((action) => action.id === actionId) || null;
}

function seedHomeInteractionDeveloperPrompt(prompt) {
  const nodes = getHomeInteractionPanelNodes();
  if (!(nodes.input instanceof HTMLTextAreaElement)) {
    return;
  }

  nodes.input.value = prompt;
  nodes.input.dispatchEvent(new Event('input', { bubbles: true }));
  nodes.input.focus();
  syncHomeInteractionComposerHeight();

  dispatchHomeInteractionEvent('neuroartan:home-stage-voice-mode', {
    mode: 'idle',
    source: 'home-developer-action',
  });
}

function runHomeDeveloperAction(actionId) {
  const action = getHomeDeveloperAction(actionId);
  if (!action) {
    return;
  }

  if (action.kind === 'link' && action.href) {
    window.location.href = action.href;
    return;
  }

  if (action.kind === 'platform-route') {
    dispatchHomeInteractionEvent('home:platform-shell-open-request', {
      source: 'home-developer-action',
      destination: action.destination || 'workspace',
      subdestination: action.subdestination || 'developer-mode',
    });
    return;
  }

  if (action.kind === 'prompt' && action.prompt) {
    seedHomeInteractionDeveloperPrompt(action.prompt);
  }
}

async function createHomeDeveloperWorkspace() {
  const nodes = getHomeInteractionPanelNodes();
  const repository = nodes.developerRepository?.value || '';
  const environmentMode = nodes.developerEnvironment?.value || '';
  const workspaceName = normalizeHomeInteractionQuery(nodes.developerWorkspaceName?.value || '');
  const context = {
    registries: {
      runtimeInterfaces: HOME_INTERACTION_PANEL_STATE.developerRuntimeInterfaces
    }
  };

  if (!workspaceName) {
    nodes.developerWorkspaceName?.focus();
    if (nodes.developerStatus) {
      nodes.developerStatus.textContent = 'Name the workspace before creating the development context.';
    }
    return;
  }

  const response = await requestDeveloperRuntimeAction(context, 'developer-project-create', {
    project:{
      projectName:workspaceName,
      workspaceName,
      repository,
      environmentMode,
      provider:'openai-codex-cloud'
    }
  });

  if (nodes.developerStatus) {
    nodes.developerStatus.textContent = response.ok
      ? `Workspace created: ${workspaceName}. Repository: ${repository}.`
      : `Workspace requires backend runtime: ${response.reason || response.status}.`;
  }

  seedHomeInteractionDeveloperPrompt(`Use Developer Mode for ${repository}. Workspace: ${workspaceName}. Review the code, identify issues, propose fixes, and define verification steps before any repository mutation.`);
}

function connectHomeDeveloperGitHub() {
  window.location.href = '/api/developer-mode/github/login';
}

async function discoverHomeDeveloperRepositories() {
  const nodes = getHomeInteractionPanelNodes();
  const context = {
    registries: {
      runtimeInterfaces: HOME_INTERACTION_PANEL_STATE.developerRuntimeInterfaces
    }
  };

  await loadHomeDeveloperWorkbenchData();
  const response = await requestDeveloperRuntimeAction(context, 'github-repository-discovery', {
    source:'homepage-developer-workbench'
  });

  if (Array.isArray(response.repositories) && response.repositories.length > 0) {
    HOME_INTERACTION_PANEL_STATE.developerRepositories = response.repositories.map((repository) => ({
      id:repository.fullName || repository.id,
      label:repository.fullName || repository.label,
      fullName:repository.fullName,
      githubConnectionStatus:repository.githubConnectionStatus,
      writePermissionStatus:repository.writePermissionStatus
    }));
    fillHomeDeveloperSelect(nodes.developerRepository, HOME_INTERACTION_PANEL_STATE.developerRepositories);
  }

  if (nodes.developerStatus) {
    nodes.developerStatus.textContent = response.ok
      ? `Repository discovery complete. ${response.repositories?.length || 0} repositories available.`
      : `Connect GitHub through the Developer Mode server: ${response.reason || response.status}.`;
  }
}

async function persistHomeDeveloperRepositorySelection() {
  const nodes = getHomeInteractionPanelNodes();
  if (!(nodes.developerRepository instanceof HTMLSelectElement)) {
    return;
  }

  const context = buildHomeDeveloperRuntimeContext();
  const response = await requestDeveloperRuntimeAction(context, 'developer-state-update', {
    activeRepository:nodes.developerRepository.value
  });

  if (nodes.developerStatus) {
    nodes.developerStatus.textContent = response.ok
      ? `Active repository saved: ${response.developerState?.activeRepository || nodes.developerRepository.value}.`
      : `Repository selection could not be saved: ${response.reason || response.status}.`;
  }
}

/* =========================================================
   09. MODEL CONTROL
   ========================================================= */

function openHomeInteractionModelSelector() {
  dispatchHomeInteractionEvent('home:platform-shell-close-request', {
    source: 'home-interaction-panel',
  });
  dispatchHomeInteractionEvent('neuroartan:home-search-shell-open-requested', {
    source: 'home-interaction-panel',
    mode: 'models',
    focus: 'models',
  });

  dispatchHomeInteractionEvent('neuroartan:home-model-selector-open-requested', {
    source: 'home-interaction-panel',
  });
}

/* =========================================================
   10. SUBMISSION CONTROL
   ========================================================= */

function submitHomeInteractionQuery() {
  const nodes = getHomeInteractionPanelNodes();
  const query = normalizeHomeInteractionQuery(nodes.input?.value || '');

  if (!query) {
    nodes.input?.focus();
    return;
  }

  dispatchHomeInteractionEvent('neuroartan:home-stage-voice-mode', {
    mode: 'thinking',
  });

  dispatchHomeInteractionEvent('neuroartan:home-stage-voice-query-submitted', {
    query,
    source: 'text',
    mode: 'search_or_knowledge',
    stagedFiles: HOME_INTERACTION_PANEL_STATE.files.map((file) => file.name),
  });

  if (nodes.fileInput instanceof HTMLInputElement) {
    nodes.fileInput.value = '';
  }

  HOME_INTERACTION_PANEL_STATE.files = [];
  renderHomeInteractionFiles();
  if (nodes.input instanceof HTMLTextAreaElement) {
    nodes.input.focus();
  }
  syncHomeInteractionComposerHeight();
}

/* =========================================================
   11. EVENT BINDING
   ========================================================= */

function bindHomeInteractionPanel() {
  subscribeActiveModelState(() => {
    renderHomeInteractionActiveModel();
  });

  document.addEventListener('click', (event) => {
    const root = document.querySelector('#home-interaction-panel');
    if (!root) {
      return;
    }

    const target = event.target.closest('[data-home-developer-github-connect], [data-home-developer-repositories-discover], [data-home-developer-workspace-create], [data-home-developer-action], [data-home-interaction-open-search], [data-home-interaction-attach], [data-home-interaction-settings-open="true"]');
    if (!target || !root.contains(target)) {
      return;
    }

    if (target.matches('[data-home-developer-github-connect]')) {
      event.preventDefault();
      connectHomeDeveloperGitHub();
      return;
    }

    if (target.matches('[data-home-developer-repositories-discover]')) {
      event.preventDefault();
      void discoverHomeDeveloperRepositories();
      return;
    }

    if (target.matches('[data-home-developer-workspace-create]')) {
      event.preventDefault();
      void createHomeDeveloperWorkspace();
      return;
    }

    if (target.matches('[data-home-developer-action]')) {
      event.preventDefault();
      runHomeDeveloperAction(target.dataset.homeDeveloperAction || '');
      return;
    }

    if (target.matches('[data-home-interaction-open-search]')) {
      event.preventDefault();
      openHomeInteractionModelSelector();
      return;
    }

    if (target.matches('[data-home-interaction-attach]')) {
      event.preventDefault();
      getHomeInteractionPanelNodes().fileInput?.click();
      return;
    }

    if (target.matches('[data-home-interaction-settings-open="true"]')) {
      event.preventDefault();
      target.setAttribute('aria-expanded', 'true');
      dispatchHomeInteractionEvent('neuroartan:home-interaction-settings-open-requested', {
        source: 'home-interaction-panel',
        section: target.dataset.homeInteractionSettingsSection || 'overview',
      });
    }
  });

  document.addEventListener('change', (event) => {
    const developerRepository = event.target.closest('[data-home-developer-repository]');
    if (developerRepository instanceof HTMLSelectElement) {
      void persistHomeDeveloperRepositorySelection();
      return;
    }

    const fileInput = event.target.closest('#home-interaction-panel-file-input');
    if (!(fileInput instanceof HTMLInputElement)) {
      return;
    }

    HOME_INTERACTION_PANEL_STATE.files = Array.from(fileInput.files || []);
    renderHomeInteractionFiles();
  });

  document.addEventListener('input', (event) => {
    const input = event.target.closest('#home-interaction-panel-input');
    if (!(input instanceof HTMLTextAreaElement)) {
      return;
    }

    syncHomeInteractionComposerHeight();
  });

  document.addEventListener('keydown', (event) => {
    const input = event.target.closest('#home-interaction-panel-input');
    if (!(input instanceof HTMLTextAreaElement)) {
      return;
    }

    if (event.key !== 'Enter' || event.shiftKey) {
      return;
    }

    event.preventDefault();

    const submitIntent = getHomeInteractionSubmitIntent();

    if (submitIntent === 'reset' && !hasHomeInteractionTypedInput(input)) {
      resetHomeInteractionPanel();
      return;
    }

    submitHomeInteractionQuery();
  });

  document.addEventListener('submit', (event) => {
    const form = event.target.closest('#home-interaction-panel-form');
    if (!form) {
      return;
    }

    event.preventDefault();

    const submitIntent = getHomeInteractionSubmitIntent();
    const nodes = getHomeInteractionPanelNodes();

    if (submitIntent === 'reset' && !hasHomeInteractionTypedInput(nodes.input)) {
      resetHomeInteractionPanel();
      return;
    }

    submitHomeInteractionQuery();
  });
}

/* =========================================================
   12. MODULE BOOT
   ========================================================= */

function bootHomeInteractionPanel() {
  const nodes = getHomeInteractionPanelNodes();
  if (!nodes.root) {
    return;
  }

  renderHomeInteractionActiveModel();
  renderHomeInteractionFiles();
  renderHomeDeveloperActions();
  renderHomeDeveloperWorkbench();
  syncHomeInteractionComposerHeight();

  if (HOME_INTERACTION_PANEL_STATE.isBound) {
    return;
  }

  HOME_INTERACTION_PANEL_STATE.isBound = true;
  bindHomeInteractionPanel();
}

document.addEventListener('fragment:mounted', (event) => {
  if (event?.detail?.name !== 'home-interaction-panel') return;
  bootHomeInteractionPanel();
});

document.addEventListener('neuroartan:runtime-ready', () => {
  bootHomeInteractionPanel();
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootHomeInteractionPanel, { once: true });
} else {
  bootHomeInteractionPanel();
}
