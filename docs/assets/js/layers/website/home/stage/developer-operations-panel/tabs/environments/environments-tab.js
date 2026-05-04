/* =============================================================================
   NEUROARTAN · HOME STAGE · DEVELOPER OPERATIONS · ENVIRONMENTS TAB
   -----------------------------------------------------------------------------
   Purpose: Owns Environments tab metadata, provider rendering, provider
   activation, and runtime scan actions for the Developer Operations Panel.
============================================================================= */

/* =============================================================================
   00) FILE INDEX
   -----------------------------------------------------------------------------
   01) TAB DEFINITION
   02) DOM SELECTORS
   03) ELEMENT ACCESSORS
   04) PROVIDER RENDERING
   05) ENVIRONMENT OUTPUT RENDERING
   06) ENVIRONMENT RUNTIME ACTIONS
   07) ENVIRONMENT EVENT HANDLING
   08) PUBLIC API
   09) END OF FILE
============================================================================= */

/* =============================================================================
   01) TAB DEFINITION
============================================================================= */
const DEVELOPER_OPERATIONS_ENVIRONMENTS_TAB = {
  id:'environments',
  label:'Environments',
  type:'environment'
};

/* =============================================================================
   02) DOM SELECTORS
============================================================================= */
const DEVELOPER_OPERATIONS_ENVIRONMENTS_SELECTORS = {
  panel:'[data-home-stage-developer-operations-tab-panel="environments"]',
  providerList:'[data-home-developer-provider-list]',
  provider:'[data-home-developer-provider]',
  runtimeScan:'[data-home-developer-runtime-scan]',
  providerOutput:'[data-home-developer-output="providers"]',
  runtimeOutput:'[data-home-developer-output="runtime"]'
};

/* =============================================================================
   03) ELEMENT ACCESSORS
============================================================================= */
function getEnvironmentTabRoot(root = document) {
  return root.querySelector(DEVELOPER_OPERATIONS_ENVIRONMENTS_SELECTORS.panel);
}

function getEnvironmentTabElements(root = document) {
  const panel = getEnvironmentTabRoot(root);

  return {
    panel,
    providerList:panel?.querySelector(DEVELOPER_OPERATIONS_ENVIRONMENTS_SELECTORS.providerList) || null,
    runtimeScan:panel?.querySelector(DEVELOPER_OPERATIONS_ENVIRONMENTS_SELECTORS.runtimeScan) || null,
    providerOutput:panel?.querySelector(DEVELOPER_OPERATIONS_ENVIRONMENTS_SELECTORS.providerOutput) || null,
    runtimeOutput:panel?.querySelector(DEVELOPER_OPERATIONS_ENVIRONMENTS_SELECTORS.runtimeOutput) || null
  };
}

/* =============================================================================
   04) PROVIDER RENDERING
============================================================================= */
function getProviderId(provider) {
  if (typeof provider === 'string') return provider;
  return provider?.id || provider?.name || provider?.label || '';
}

function getProviderLabel(provider) {
  if (typeof provider === 'string') return provider;
  return provider?.label || provider?.name || provider?.id || 'Provider';
}

function getProviderStatus(provider) {
  if (typeof provider === 'string') return 'Available';
  return provider?.status || provider?.mode || provider?.state || 'Available';
}

function renderProviderList(list, providers = [], activeProvider = '') {
  if (!(list instanceof HTMLElement)) return;

  list.replaceChildren();

  providers.forEach((provider) => {
    const providerId = getProviderId(provider);
    if (!providerId) return;

    const button = document.createElement('button');
    const title = document.createElement('strong');
    const copy = document.createElement('span');

    button.className = 'home-stage-developer-operations-panel__list-item';
    button.type = 'button';
    button.dataset.homeDeveloperProvider = providerId;
    button.setAttribute('aria-pressed', String(providerId === activeProvider));

    title.textContent = getProviderLabel(provider);
    copy.textContent = getProviderStatus(provider);

    button.append(title, copy);
    list.append(button);
  });

  if (!providers.length) {
    const empty = document.createElement('p');
    empty.className = 'home-stage-developer-operations-panel__empty';
    empty.textContent = 'No provider configured.';
    list.append(empty);
  }
}

/* =============================================================================
   05) ENVIRONMENT OUTPUT RENDERING
============================================================================= */
function renderEnvironmentOutput(output, value = '') {
  if (!(output instanceof HTMLElement)) return;

  if (typeof value === 'string') {
    output.textContent = value;
    return;
  }

  output.textContent = JSON.stringify(value, null, 2);
}

/* =============================================================================
   06) ENVIRONMENT RUNTIME ACTIONS
============================================================================= */
function getEnvironmentRuntimeContext(context = {}) {
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

function getActiveRuntimeRepository(runtime) {
  const developerState = getRuntimeDeveloperState(runtime);
  return developerState.activeRepository || developerState.repository || '';
}

async function activateEnvironmentProvider(context = {}, providerId = '') {
  const runtime = getEnvironmentRuntimeContext(context);
  if (!runtime.requestAction || !providerId) return null;

  const response = await runtime.requestAction('developer-state-update', {
    activeProvider:providerId
  });

  if (runtime.setState) {
    runtime.setState({
      developerState:response.developerState || getRuntimeDeveloperState(runtime)
    });
  }

  if (runtime.render) runtime.render(runtime.root);

  if (runtime.writeOutput) {
    runtime.writeOutput(runtime.root, 'providers', `Active provider: ${response.developerState?.activeProvider || providerId}`);
  }

  return response;
}

async function runEnvironmentScan(context = {}) {
  const runtime = getEnvironmentRuntimeContext(context);
  if (!runtime.requestAction) return null;

  const repository = getActiveRuntimeRepository(runtime);
  const response = await runtime.requestAction('runtime-scan', {
    repository,
    source:'homepage-developer-mode'
  });

  if (runtime.setState) {
    runtime.setState({
      developerState:response.developerState || getRuntimeDeveloperState(runtime)
    });
  }

  if (runtime.render) runtime.render(runtime.root);

  if (runtime.writeOutput) {
    runtime.writeOutput(runtime.root, 'runtime', response.ok
      ? JSON.stringify(response.scan || response, null, 2)
      : `Runtime scan blocked: ${response.reason || response.status}`);
  }

  return response;
}

/* =============================================================================
   07) ENVIRONMENT EVENT HANDLING
============================================================================= */
function getEnvironmentEventAction(event) {
  const target = event?.target instanceof Element ? event.target : null;
  if (!target) return null;

  const provider = target.closest(DEVELOPER_OPERATIONS_ENVIRONMENTS_SELECTORS.provider);
  if (provider) return { action:'provider-activate', providerId:provider.dataset.homeDeveloperProvider || '' };

  if (target.closest(DEVELOPER_OPERATIONS_ENVIRONMENTS_SELECTORS.runtimeScan)) return { action:'runtime-scan' };

  return null;
}

async function executeEnvironmentEvent(event, context = {}) {
  const eventAction = getEnvironmentEventAction(event);
  if (!eventAction || event.type !== 'click') return false;

  event.preventDefault();

  if (eventAction.action === 'provider-activate') {
    await activateEnvironmentProvider(context, eventAction.providerId);
    return true;
  }

  if (eventAction.action === 'runtime-scan') {
    await runEnvironmentScan(context);
    return true;
  }

  return false;
}

/* =============================================================================
   08) PUBLIC API
============================================================================= */
export function getDeveloperOperationsEnvironmentsTab() {
  return DEVELOPER_OPERATIONS_ENVIRONMENTS_TAB;
}

export function getDeveloperOperationsEnvironmentsSelectors() {
  return DEVELOPER_OPERATIONS_ENVIRONMENTS_SELECTORS;
}

export function getDeveloperOperationsEnvironmentsElements(root = document) {
  return getEnvironmentTabElements(root);
}

export function executeDeveloperOperationsEnvironmentsEvent(event, context = {}) {
  return executeEnvironmentEvent(event, context);
}

export function renderDeveloperOperationsEnvironmentsTab(root = document, state = {}) {
  const elements = getEnvironmentTabElements(root);
  const providers = Array.isArray(state.providers) ? state.providers : [];

  renderProviderList(elements.providerList, providers, state.activeProvider || '');
  renderEnvironmentOutput(elements.providerOutput, state.providerOutput || 'No provider configured.');
  renderEnvironmentOutput(elements.runtimeOutput, state.runtimeOutput || 'Runtime state pending.');

  return elements;
}

/* =============================================================================
   09) END OF FILE
============================================================================= */
