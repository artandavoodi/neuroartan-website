/* =============================================================================
   NEUROARTAN · HOME STAGE · DEVELOPER OPERATIONS PANEL
   -----------------------------------------------------------------------------
   Purpose: Developer-only secondary operations panel controller. The canonical
   command input remains owned by the homepage interactive panel.
============================================================================= */

/* =============================================================================
   00) FILE INDEX
   -----------------------------------------------------------------------------
   01) IMPORTS
   02) MODULE STATE
   03) DOM HELPERS
   04) RENDERING
   05) SUMMARY
   06) EVENT BINDING
   07) MODULE BOOT
   08) END OF FILE
============================================================================= */

/* =============================================================================
   01) IMPORTS
============================================================================= */
import { getHomeDeveloperModeState } from '../../developer-mode/developer-mode-state.js';
import { getFilteredDeveloperOperationsIndex } from './index/developer-operations-index.js';

const HOME_STAGE_DEVELOPER_OPERATIONS_VIEW_ICONS = {
  full:'/assets/icons/core/actions/unclassified/collapse.svg',
  mini:'/assets/icons/core/actions/unclassified/expand.svg'
};

/* =============================================================================
   02) MODULE STATE
============================================================================= */
const HOME_STAGE_DEVELOPER_OPERATIONS_STATE = {
  activeTab:'tasks',
  query:'',
  view:'mini'
};

/* =============================================================================
   03) DOM HELPERS
============================================================================= */
function isDeveloperModeActive() {
  return document.documentElement?.dataset?.homeDeveloperMode === 'active';
}

function getPanel() {
  return document.querySelector('[data-home-stage-developer-operations-panel]');
}

function getPanelMiniMount() {
  return document.querySelector('#home-stage-developer-operations-panel-mount');
}

function getPanelPortalMount() {
  return document.querySelector('[data-home-stage-developer-console-portal]');
}

function placeDeveloperOperationsPanel(panel) {
  const miniMount = getPanelMiniMount();
  const portalMount = getPanelPortalMount();
  const target = HOME_STAGE_DEVELOPER_OPERATIONS_STATE.view === 'full' ? portalMount : miniMount;

  if (!panel || !target || panel.parentElement === target) return;

  target.append(panel);
}

function getActiveTabTemplate(panel) {
  return panel.querySelector(`[data-home-stage-developer-operations-tab-template="${HOME_STAGE_DEVELOPER_OPERATIONS_STATE.activeTab}"]`);
}

function getConsoleViewToggle(panel) {
  return panel.querySelector('[data-home-stage-developer-operations-view-toggle]');
}

function getConsoleViewToggleLabel(panel) {
  return panel.querySelector('[data-home-stage-developer-operations-view-toggle-label]');
}

function getConsoleViewToggleIcon(panel) {
  return panel.querySelector('[data-home-stage-developer-operations-view-toggle] img');
}

function setDeveloperConsoleView(view) {
  HOME_STAGE_DEVELOPER_OPERATIONS_STATE.view = view === 'full' ? 'full' : 'mini';
  document.documentElement.dataset.homeDeveloperConsoleView = HOME_STAGE_DEVELOPER_OPERATIONS_STATE.view;
}

/* =============================================================================
   04) RENDERING
============================================================================= */
function renderDeveloperOperationsConsoleView(panel) {
  const toggle = getConsoleViewToggle(panel);
  const label = getConsoleViewToggleLabel(panel);
  const icon = getConsoleViewToggleIcon(panel);
  const full = HOME_STAGE_DEVELOPER_OPERATIONS_STATE.view === 'full';

  document.documentElement.dataset.homeDeveloperConsoleView = HOME_STAGE_DEVELOPER_OPERATIONS_STATE.view;

  if (toggle) {
    toggle.setAttribute('aria-pressed', String(full));
    toggle.setAttribute('aria-label', full ? 'Collapse developer console' : 'Expand developer console');
  }

  if (label) label.textContent = full ? 'Mini View' : 'Full View';

  if (icon instanceof HTMLImageElement) {
    icon.src = full ? HOME_STAGE_DEVELOPER_OPERATIONS_VIEW_ICONS.full : HOME_STAGE_DEVELOPER_OPERATIONS_VIEW_ICONS.mini;
  }
}

function renderDeveloperOperationsTabPanel(panel) {
  const mount = panel.querySelector('[data-home-stage-developer-operations-tab-content]');
  if (!mount) return;

  const template = getActiveTabTemplate(panel);
  mount.replaceChildren();

  if (!(template instanceof HTMLTemplateElement)) return;

  mount.append(template.content.cloneNode(true));
}

function renderDeveloperOperationsResults(panel) {
  const results = panel.querySelector('[data-home-stage-developer-operations-results]');
  if (!results) return;

  const items = getFilteredDeveloperOperationsIndex({
    activeTab:HOME_STAGE_DEVELOPER_OPERATIONS_STATE.activeTab,
    query:HOME_STAGE_DEVELOPER_OPERATIONS_STATE.query
  });
  results.replaceChildren();

  if (!items.length) {
    const empty = document.createElement('p');
    empty.className = 'home-stage-developer-operations-panel__empty';
    empty.textContent = 'No developer operations match the current view.';
    results.append(empty);
    return;
  }

  items.forEach((item) => {
    const node = document.createElement('article');
    const title = document.createElement('strong');
    const meta = document.createElement('span');
    const summary = document.createElement('span');

    node.className = 'home-stage-developer-operations-panel__result';
    node.dataset.homeStageDeveloperOperationsResult = item.type;

    title.className = 'home-stage-developer-operations-panel__result-title';
    meta.className = 'home-stage-developer-operations-panel__result-meta';
    summary.className = 'home-stage-developer-operations-panel__result-summary';

    title.textContent = item.title;
    meta.textContent = item.meta || 'metadata pending';
    summary.textContent = item.summary;

    node.append(title, meta, summary);
    results.append(node);
  });
}

function renderDeveloperOperationsTabs(panel) {
  panel.querySelectorAll('[data-home-stage-developer-operations-tab]').forEach((tab) => {
    tab.setAttribute('aria-pressed', String(tab.dataset.homeStageDeveloperOperationsTab === HOME_STAGE_DEVELOPER_OPERATIONS_STATE.activeTab));
  });
}

function renderDeveloperOperationsPanel() {
  const panel = getPanel();
  if (!panel) return;
  placeDeveloperOperationsPanel(panel);

  const active = isDeveloperModeActive();
  panel.setAttribute('aria-hidden', String(!active));

  if (!active) return;

  renderDeveloperOperationsConsoleView(panel);
  renderDeveloperOperationsTabs(panel);
  renderDeveloperOperationsTabPanel(panel);
  renderDeveloperOperationsResults(panel);
  renderDeveloperOperationsSummary(panel);
}

/* =============================================================================
   05) SUMMARY
============================================================================= */
function renderDeveloperOperationsSummary(panel) {
  const state = getHomeDeveloperModeState();
  const developerState = state.developerState || {};

  const values = {
    project:`Project: ${developerState.activeWorkspace || developerState.activeProjectId || 'not selected'}`,
    repository:`Repository: ${developerState.activeRepository || 'not selected'}`,
    branch:`Branch: ${developerState.activeBranch || 'not selected'}`,
    environment:`Environment: ${developerState.activeEnvironment || developerState.environment || 'not selected'}`
  };

  Object.entries(values).forEach(([key, value]) => {
    const node = panel.querySelector(`[data-home-stage-developer-summary="${key}"]`);
    if (node) node.textContent = value;
  });
}

/* =============================================================================
   06) EVENT BINDING
============================================================================= */
function bindDeveloperOperationsPanelEvents() {
  document.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const tab = target?.closest('[data-home-stage-developer-operations-tab]');
    const viewToggle = target?.closest('[data-home-stage-developer-operations-view-toggle]');

    if (viewToggle) {
      const nextView = HOME_STAGE_DEVELOPER_OPERATIONS_STATE.view === 'full' ? 'mini' : 'full';
      setDeveloperConsoleView(nextView);
      renderDeveloperOperationsPanel();
      return;
    }

    if (!tab) return;

    HOME_STAGE_DEVELOPER_OPERATIONS_STATE.activeTab = tab.dataset.homeStageDeveloperOperationsTab || 'tasks';
    renderDeveloperOperationsPanel();
  });

  document.addEventListener('input', (event) => {
    const target = event.target instanceof HTMLInputElement ? event.target : null;
    if (!target?.matches('[data-home-stage-developer-operations-search-input]')) return;

    HOME_STAGE_DEVELOPER_OPERATIONS_STATE.query = target.value;
    renderDeveloperOperationsPanel();
  });

  document.addEventListener('home-developer-mode:activated', renderDeveloperOperationsPanel);
  document.addEventListener('home-developer-mode:deactivated', renderDeveloperOperationsPanel);
  document.addEventListener('neuroartan:home-stage-developer-command-artifact-created', renderDeveloperOperationsPanel);
}

/* =============================================================================
   07) MODULE BOOT
============================================================================= */
function bootDeveloperOperationsPanel() {
  bindDeveloperOperationsPanelEvents();
  renderDeveloperOperationsPanel();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootDeveloperOperationsPanel, { once:true });
} else {
  bootDeveloperOperationsPanel();
}

/* =============================================================================
   08) END OF FILE
============================================================================= */