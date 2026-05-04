/* =============================================================================
   NEUROARTAN · HOME STAGE · DEVELOPER OPERATIONS · WORKSPACES TAB
   -----------------------------------------------------------------------------
   Purpose: Owns Workspaces tab metadata, DOM selectors, project rendering, and
   project creation runtime actions for the Developer Operations Panel.
============================================================================= */

/* =============================================================================
   00) FILE INDEX
   -----------------------------------------------------------------------------
   01) TAB DEFINITION
   02) DOM SELECTORS
   03) ELEMENT ACCESSORS
   04) PROJECT OUTPUT RENDERING
   05) WORKSPACE RUNTIME ACTIONS
   06) WORKSPACE EVENT HANDLING
   07) PUBLIC API
   08) END OF FILE
============================================================================= */

/* =============================================================================
   01) TAB DEFINITION
============================================================================= */
const DEVELOPER_OPERATIONS_WORKSPACES_TAB = {
  id:'workspaces',
  label:'Workspaces',
  type:'workspace'
};

/* =============================================================================
   02) DOM SELECTORS
============================================================================= */
const DEVELOPER_OPERATIONS_WORKSPACES_SELECTORS = {
  panel:'[data-home-stage-developer-operations-tab-panel="workspaces"]',
  projectForm:'[data-home-developer-project-form]',
  projectName:'[data-home-developer-project-name]',
  output:'[data-home-developer-output="projects"]'
};

/* =============================================================================
   03) ELEMENT ACCESSORS
============================================================================= */
function getWorkspaceTabRoot(root = document) {
  return root.querySelector(DEVELOPER_OPERATIONS_WORKSPACES_SELECTORS.panel);
}

function getWorkspaceTabElements(root = document) {
  const panel = getWorkspaceTabRoot(root);

  return {
    panel,
    projectForm:panel?.querySelector(DEVELOPER_OPERATIONS_WORKSPACES_SELECTORS.projectForm) || null,
    projectName:panel?.querySelector(DEVELOPER_OPERATIONS_WORKSPACES_SELECTORS.projectName) || null,
    output:panel?.querySelector(DEVELOPER_OPERATIONS_WORKSPACES_SELECTORS.output) || null
  };
}

/* =============================================================================
   04) PROJECT OUTPUT RENDERING
============================================================================= */
function renderProjectOutput(output, value = 'No project created.') {
  if (!(output instanceof HTMLElement)) return;

  if (typeof value === 'string') {
    output.textContent = value;
    return;
  }

  output.textContent = JSON.stringify(value, null, 2);
}

/* =============================================================================
   05) WORKSPACE RUNTIME ACTIONS
============================================================================= */
function getWorkspaceRuntimeContext(context = {}) {
  return {
    getState:typeof context.getState === 'function' ? context.getState : null,
    setState:typeof context.setState === 'function' ? context.setState : null,
    requestAction:typeof context.requestAction === 'function' ? context.requestAction : null,
    render:typeof context.render === 'function' ? context.render : null,
    writeOutput:typeof context.writeOutput === 'function' ? context.writeOutput : null,
    root:context.root || document
  };
}

function getRuntimeDeveloperState(runtime) {
  const state = runtime.getState ? runtime.getState() : {};
  return state?.developerState || {};
}

async function createWorkspaceProject(context = {}, form = null) {
  const runtime = getWorkspaceRuntimeContext(context);
  if (!runtime.requestAction || !(form instanceof HTMLFormElement)) return null;

  const formData = new FormData(form);
  const name = String(formData.get('projectName') || form.querySelector(DEVELOPER_OPERATIONS_WORKSPACES_SELECTORS.projectName)?.value || '').trim();

  const response = await runtime.requestAction('project-create', {
    name,
    source:'homepage-developer-mode'
  });

  if (runtime.setState) {
    runtime.setState({
      developerState:response.developerState || getRuntimeDeveloperState(runtime)
    });
  }

  if (runtime.render) runtime.render(runtime.root);

  if (runtime.writeOutput) {
    runtime.writeOutput(runtime.root, 'projects', response.ok
      ? `Project created: ${response.developerState?.activeProject || name || 'project'}`
      : `Project creation blocked: ${response.reason || response.status}`);
  }

  return response;
}

/* =============================================================================
   06) WORKSPACE EVENT HANDLING
============================================================================= */
function getWorkspaceEventAction(event) {
  const target = event?.target instanceof Element ? event.target : null;
  if (!target) return null;

  if (target.closest(DEVELOPER_OPERATIONS_WORKSPACES_SELECTORS.projectForm)) return 'project-create';

  return null;
}

async function executeWorkspaceEvent(event, context = {}) {
  const action = getWorkspaceEventAction(event);
  if (!action || event.type !== 'submit') return false;

  event.preventDefault();

  const form = event.target instanceof HTMLFormElement
    ? event.target
    : event.target?.closest?.(DEVELOPER_OPERATIONS_WORKSPACES_SELECTORS.projectForm) || null;

  if (action === 'project-create') {
    await createWorkspaceProject(context, form);
    return true;
  }

  return false;
}

/* =============================================================================
   07) PUBLIC API
============================================================================= */
export function getDeveloperOperationsWorkspacesTab() {
  return DEVELOPER_OPERATIONS_WORKSPACES_TAB;
}

export function getDeveloperOperationsWorkspacesSelectors() {
  return DEVELOPER_OPERATIONS_WORKSPACES_SELECTORS;
}

export function getDeveloperOperationsWorkspacesElements(root = document) {
  return getWorkspaceTabElements(root);
}

export function executeDeveloperOperationsWorkspacesEvent(event, context = {}) {
  return executeWorkspaceEvent(event, context);
}

export function renderDeveloperOperationsWorkspacesTab(root = document, state = {}) {
  const elements = getWorkspaceTabElements(root);
  renderProjectOutput(elements.output, state.output || state.projectOutput || 'No project created.');
  return elements;
}

/* =============================================================================
   08) END OF FILE
============================================================================= */