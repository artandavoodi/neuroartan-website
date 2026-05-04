/* =============================================================================
   NEUROARTAN · HOME STAGE · DEVELOPER OPERATIONS · CODE REVIEW TAB
   -----------------------------------------------------------------------------
   Purpose: Owns Code Review tab metadata, review artifact rendering, and locked
   review action execution for the Developer Operations Panel.
============================================================================= */

/* =============================================================================
   00) FILE INDEX
   -----------------------------------------------------------------------------
   01) TAB DEFINITION
   02) DOM SELECTORS
   03) ELEMENT ACCESSORS
   04) REVIEW ARTIFACT RENDERING
   05) REVIEW OUTPUT RENDERING
   06) CODE REVIEW RUNTIME ACTIONS
   07) CODE REVIEW EVENT HANDLING
   08) PUBLIC API
   09) END OF FILE
============================================================================= */

/* =============================================================================
   01) TAB DEFINITION
============================================================================= */
const DEVELOPER_OPERATIONS_CODE_REVIEW_TAB = {
  id:'code-review',
  label:'Code Review',
  type:'review'
};

/* =============================================================================
   02) DOM SELECTORS
============================================================================= */
const DEVELOPER_OPERATIONS_CODE_REVIEW_SELECTORS = {
  panel:'[data-home-stage-developer-operations-tab-panel="code-review"]',
  lockedAction:'[data-home-developer-locked-action]',
  reviewArtifacts:'[data-home-developer-review-artifacts]',
  output:'[data-home-developer-output="review"]'
};

/* =============================================================================
   03) ELEMENT ACCESSORS
============================================================================= */
function getCodeReviewTabRoot(root = document) {
  return root.querySelector(DEVELOPER_OPERATIONS_CODE_REVIEW_SELECTORS.panel);
}

function getCodeReviewTabElements(root = document) {
  const panel = getCodeReviewTabRoot(root);

  return {
    panel,
    reviewArtifacts:panel?.querySelector(DEVELOPER_OPERATIONS_CODE_REVIEW_SELECTORS.reviewArtifacts) || null,
    output:panel?.querySelector(DEVELOPER_OPERATIONS_CODE_REVIEW_SELECTORS.output) || null
  };
}

/* =============================================================================
   04) REVIEW ARTIFACT RENDERING
============================================================================= */
function getArtifactTitle(artifact) {
  if (typeof artifact === 'string') return artifact;
  return artifact?.title || artifact?.name || artifact?.id || 'Review artifact';
}

function getArtifactSummary(artifact) {
  if (typeof artifact === 'string') return 'Generated review artifact';
  return artifact?.summary || artifact?.status || artifact?.type || 'Generated review artifact';
}

function renderReviewArtifacts(list, artifacts = []) {
  if (!(list instanceof HTMLElement)) return;

  list.replaceChildren();

  artifacts.forEach((artifact) => {
    const item = document.createElement('article');
    const title = document.createElement('strong');
    const copy = document.createElement('span');

    item.className = 'home-stage-developer-operations-panel__list-item';
    title.textContent = getArtifactTitle(artifact);
    copy.textContent = getArtifactSummary(artifact);

    item.append(title, copy);
    list.append(item);
  });

  if (!artifacts.length) {
    const empty = document.createElement('p');
    empty.className = 'home-stage-developer-operations-panel__empty';
    empty.textContent = 'No review artifacts yet.';
    list.append(empty);
  }
}

/* =============================================================================
   05) REVIEW OUTPUT RENDERING
============================================================================= */
function renderReviewOutput(output, value = 'No review artifact selected.') {
  if (!(output instanceof HTMLElement)) return;

  if (typeof value === 'string') {
    output.textContent = value;
    return;
  }

  output.textContent = JSON.stringify(value, null, 2);
}

/* =============================================================================
   06) CODE REVIEW RUNTIME ACTIONS
============================================================================= */
function getCodeReviewRuntimeContext(context = {}) {
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

function getActiveReviewRepository(runtime) {
  const developerState = getRuntimeDeveloperState(runtime);
  return developerState.activeRepository || developerState.repository || '';
}

async function runLockedCodeReviewAction(context = {}, interfaceId = '') {
  const runtime = getCodeReviewRuntimeContext(context);
  if (!runtime.requestAction || !interfaceId) return null;

  const repository = getActiveReviewRepository(runtime);
  const response = await runtime.requestAction('developer-locked-action', {
    interfaceId,
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
    runtime.writeOutput(runtime.root, 'review', response.ok
      ? JSON.stringify(response.artifact || response, null, 2)
      : `Review action blocked: ${response.reason || response.status}`);
  }

  return response;
}

/* =============================================================================
   07) CODE REVIEW EVENT HANDLING
============================================================================= */
function getCodeReviewEventAction(event) {
  const target = event?.target instanceof Element ? event.target : null;
  if (!target) return null;

  const lockedAction = target.closest(DEVELOPER_OPERATIONS_CODE_REVIEW_SELECTORS.lockedAction);
  if (lockedAction) {
    return {
      action:'locked-review-action',
      interfaceId:lockedAction.dataset.homeDeveloperLockedAction || ''
    };
  }

  return null;
}

async function executeCodeReviewEvent(event, context = {}) {
  const eventAction = getCodeReviewEventAction(event);
  if (!eventAction || event.type !== 'click') return false;

  event.preventDefault();

  if (eventAction.action === 'locked-review-action') {
    await runLockedCodeReviewAction(context, eventAction.interfaceId);
    return true;
  }

  return false;
}

/* =============================================================================
   08) PUBLIC API
============================================================================= */
export function getDeveloperOperationsCodeReviewTab() {
  return DEVELOPER_OPERATIONS_CODE_REVIEW_TAB;
}

export function getDeveloperOperationsCodeReviewSelectors() {
  return DEVELOPER_OPERATIONS_CODE_REVIEW_SELECTORS;
}

export function getDeveloperOperationsCodeReviewElements(root = document) {
  return getCodeReviewTabElements(root);
}

export function executeDeveloperOperationsCodeReviewEvent(event, context = {}) {
  return executeCodeReviewEvent(event, context);
}

export function renderDeveloperOperationsCodeReviewTab(root = document, state = {}) {
  const elements = getCodeReviewTabElements(root);
  const artifacts = Array.isArray(state.reviewArtifacts) ? state.reviewArtifacts : [];

  renderReviewArtifacts(elements.reviewArtifacts, artifacts);
  renderReviewOutput(elements.output, state.reviewOutput || 'No review artifact selected.');

  return elements;
}

/* =============================================================================
   09) END OF FILE
============================================================================= */