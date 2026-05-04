/* =============================================================================
   NEUROARTAN · HOME STAGE · DEVELOPER OPERATIONS · REPOSITORIES TAB
   -----------------------------------------------------------------------------
   Purpose: Owns Repositories tab metadata, DOM selectors, and tab-local render
   helpers for the Developer Operations Panel.
============================================================================= */

/* =============================================================================
   00) FILE INDEX
   -----------------------------------------------------------------------------
   01) TAB DEFINITION
   02) DOM SELECTORS
   03) ELEMENT ACCESSORS
   04) REPOSITORY OPTION RENDERING
   05) REPOSITORY OUTPUT RENDERING
   06) REPOSITORY RUNTIME ACTIONS
   07) REPOSITORY EVENT HANDLING
   08) PUBLIC API
   09) END OF FILE
============================================================================= */

/* =============================================================================
   01) TAB DEFINITION
============================================================================= */
const DEVELOPER_OPERATIONS_REPOSITORIES_TAB = {
  id:'repositories',
  label:'Repositories',
  type:'repository'
};

/* =============================================================================
   02) DOM SELECTORS
============================================================================= */
const DEVELOPER_OPERATIONS_REPOSITORIES_SELECTORS = {
  panel:'[data-home-stage-developer-operations-tab-panel="repositories"]',
  repositorySelect:'[data-home-developer-repository]',
  githubConnect:'[data-home-developer-github-connect]',
  repositoriesDiscover:'[data-home-developer-repositories-discover]',
  output:'[data-home-developer-output="repositories"]'
};

/* =============================================================================
   03) ELEMENT ACCESSORS
============================================================================= */
function getRepositoryTabRoot(root = document) {
  return root.querySelector(DEVELOPER_OPERATIONS_REPOSITORIES_SELECTORS.panel);
}

function getRepositoryTabElements(root = document) {
  const panel = getRepositoryTabRoot(root);

  return {
    panel,
    repositorySelect:panel?.querySelector(DEVELOPER_OPERATIONS_REPOSITORIES_SELECTORS.repositorySelect) || null,
    githubConnect:panel?.querySelector(DEVELOPER_OPERATIONS_REPOSITORIES_SELECTORS.githubConnect) || null,
    repositoriesDiscover:panel?.querySelector(DEVELOPER_OPERATIONS_REPOSITORIES_SELECTORS.repositoriesDiscover) || null,
    output:panel?.querySelector(DEVELOPER_OPERATIONS_REPOSITORIES_SELECTORS.output) || null
  };
}

/* =============================================================================
   04) REPOSITORY OPTION RENDERING
============================================================================= */
function getRepositoryName(repository) {
  if (typeof repository === 'string') return repository;
  return repository?.fullName || repository?.name || repository?.id || '';
}

function renderRepositoryOptions(select, repositories = [], activeRepository = '') {
  if (!(select instanceof HTMLSelectElement)) return;

  const activeValue = getRepositoryName(activeRepository);
  select.innerHTML = '';

  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = 'Select repository';
  select.appendChild(placeholder);

  repositories.forEach((repository) => {
    const repositoryName = getRepositoryName(repository);
    if (!repositoryName) return;

    const option = document.createElement('option');
    option.value = repositoryName;
    option.textContent = repositoryName;
    option.selected = repositoryName === activeValue;
    select.appendChild(option);
  });

  select.value = activeValue || '';
}

/* =============================================================================
   05) REPOSITORY OUTPUT RENDERING
============================================================================= */
function renderRepositoryOutput(output, value = 'Repository state not loaded.') {
  if (!(output instanceof HTMLElement)) return;

  if (typeof value === 'string') {
    output.textContent = value;
    return;
  }

  output.textContent = JSON.stringify(value, null, 2);
}

/* =============================================================================
   06) REPOSITORY RUNTIME ACTIONS
============================================================================= */
function getRepositoryRuntimeContext(context = {}) {
  return {
    getState:typeof context.getState === 'function' ? context.getState : null,
    setState:typeof context.setState === 'function' ? context.setState : null,
    requestAction:typeof context.requestAction === 'function' ? context.requestAction : null,
    render:typeof context.render === 'function' ? context.render : null,
    writeOutput:typeof context.writeOutput === 'function' ? context.writeOutput : null,
    redirect:typeof context.redirect === 'function' ? context.redirect : null,
    root:context.root || document
  };
}

function getRuntimeDeveloperState(runtime) {
  const state = runtime.getState ? runtime.getState() : {};
  return state?.developerState || {};
}

async function connectRepositoryGithub(context = {}) {
  const runtime = getRepositoryRuntimeContext(context);

  if (runtime.redirect) {
    runtime.redirect('/api/developer-mode/github/login');
    return;
  }

  window.location.href = '/api/developer-mode/github/login';
}

async function discoverRepositories(context = {}) {
  const runtime = getRepositoryRuntimeContext(context);
  if (!runtime.requestAction) return null;

  const response = await runtime.requestAction('github-repository-discovery', {
    source:'homepage-developer-mode'
  });

  if (runtime.setState) {
    runtime.setState({
      developerState:response.developerState || getRuntimeDeveloperState(runtime)
    });
  }

  if (runtime.render) runtime.render(runtime.root);

  if (runtime.writeOutput) {
    runtime.writeOutput(runtime.root, 'repositories', response.ok
      ? `Repositories loaded: ${response.repositories?.length || 0}`
      : `Repository discovery blocked: ${response.reason || response.status}`);
  }

  return response;
}

async function selectRepository(context = {}, repository = '') {
  const runtime = getRepositoryRuntimeContext(context);
  if (!runtime.requestAction || !repository) return null;

  const response = await runtime.requestAction('developer-state-update', {
    activeRepository:repository
  });

  if (runtime.setState) {
    runtime.setState({
      developerState:response.developerState || getRuntimeDeveloperState(runtime)
    });
  }

  if (runtime.render) runtime.render(runtime.root);

  if (runtime.writeOutput) {
    runtime.writeOutput(runtime.root, 'repositories', `Active repository: ${response.developerState?.activeRepository || repository}`);
  }

  return response;
}

/* =============================================================================
   07) REPOSITORY EVENT HANDLING
============================================================================= */
function getRepositoryEventAction(event) {
  const target = event?.target instanceof Element ? event.target : null;
  if (!target) return null;

  if (target.closest(DEVELOPER_OPERATIONS_REPOSITORIES_SELECTORS.githubConnect)) return 'github-connect';
  if (target.closest(DEVELOPER_OPERATIONS_REPOSITORIES_SELECTORS.repositoriesDiscover)) return 'repositories-discover';
  if (target.closest(DEVELOPER_OPERATIONS_REPOSITORIES_SELECTORS.repositorySelect)) return 'repository-select';

  return null;
}

function handleRepositoryEvent(event, handlers = {}) {
  const action = getRepositoryEventAction(event);
  if (!action) return false;

  if (action === 'github-connect' && typeof handlers.onGithubConnect === 'function') {
    handlers.onGithubConnect(event);
    return true;
  }

  if (action === 'repositories-discover' && typeof handlers.onRepositoriesDiscover === 'function') {
    handlers.onRepositoriesDiscover(event);
    return true;
  }

  if (action === 'repository-select' && event.type === 'change' && typeof handlers.onRepositorySelect === 'function') {
    handlers.onRepositorySelect(event);
    return true;
  }

  return false;
}

async function executeRepositoryEvent(event, context = {}) {
  const action = getRepositoryEventAction(event);
  if (!action) return false;

  event.preventDefault();

  if (action === 'github-connect') {
    await connectRepositoryGithub(context);
    return true;
  }

  if (action === 'repositories-discover') {
    await discoverRepositories(context);
    return true;
  }

  if (action === 'repository-select' && event.type === 'change') {
    const target = event.target instanceof HTMLSelectElement ? event.target : null;
    await selectRepository(context, target?.value || '');
    return true;
  }

  return false;
}

/* =============================================================================
   08) PUBLIC API
============================================================================= */
export function getDeveloperOperationsRepositoriesTab() {
  return DEVELOPER_OPERATIONS_REPOSITORIES_TAB;
}

export function getDeveloperOperationsRepositoriesSelectors() {
  return DEVELOPER_OPERATIONS_REPOSITORIES_SELECTORS;
}

export function getDeveloperOperationsRepositoriesElements(root = document) {
  return getRepositoryTabElements(root);
}

export function handleDeveloperOperationsRepositoriesEvent(event, handlers = {}) {
  return handleRepositoryEvent(event, handlers);
}

export function executeDeveloperOperationsRepositoriesEvent(event, context = {}) {
  return executeRepositoryEvent(event, context);
}

export function renderDeveloperOperationsRepositoriesTab(root = document, state = {}) {
  const elements = getRepositoryTabElements(root);
  const repositories = Array.isArray(state.repositories) ? state.repositories : [];

  renderRepositoryOptions(elements.repositorySelect, repositories, state.activeRepository);
  renderRepositoryOutput(elements.output, state.output || state.repositoryOutput || 'Repository state not loaded.');

  return elements;
}

/* =============================================================================
   09) END OF FILE
============================================================================= */
