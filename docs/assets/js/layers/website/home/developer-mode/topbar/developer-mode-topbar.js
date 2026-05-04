/* =============================================================================
   NEUROARTAN · HOME · DEVELOPER MODE TOPBAR
   -----------------------------------------------------------------------------
   Purpose: Owns Developer Mode topbar action routing, workspace active state,
   and utility event dispatching while preserving global topbar styling.
============================================================================= */

/* =============================================================================
   00) FILE INDEX
   -----------------------------------------------------------------------------
   01) CONSTANTS
   02) ELEMENT ACCESSORS
   03) WORKSPACE STATE
   04) ACTION ROUTING
   05) EVENT BINDING
   06) MODULE BOOT
   07) END OF FILE
============================================================================= */

/* =============================================================================
   01) CONSTANTS
============================================================================= */
const DEVELOPER_MODE_TOPBAR_SELECTORS = {
  root:'.home-developer-mode-topbar',
  workspace:'[data-home-developer-workspace]',
  notifications:'[data-home-developer-notifications]',
  settings:'[data-home-developer-settings]',
  account:'[data-home-developer-account]'
};

const DEVELOPER_MODE_TOPBAR_EVENTS = {
  workspaceChanged:'neuroartan:home-developer-workspace-changed',
  notificationsRequested:'neuroartan:home-developer-notifications-requested',
  settingsRequested:'neuroartan:home-developer-settings-requested',
  accountRequested:'neuroartan:home-developer-account-requested'
};

/* =============================================================================
   02) ELEMENT ACCESSORS
============================================================================= */
function getDeveloperModeTopbarRoot(root = document) {
  return root.querySelector(DEVELOPER_MODE_TOPBAR_SELECTORS.root);
}

function getDeveloperModeWorkspaceActions(root = document) {
  const topbar = getDeveloperModeTopbarRoot(root);
  return Array.from(topbar?.querySelectorAll(DEVELOPER_MODE_TOPBAR_SELECTORS.workspace) || []);
}

/* =============================================================================
   03) WORKSPACE STATE
============================================================================= */
function setDeveloperModeActiveWorkspace(root = document, workspace = 'code') {
  getDeveloperModeWorkspaceActions(root).forEach((action) => {
    const active = action.dataset.homeDeveloperWorkspace === workspace;
    action.setAttribute('aria-pressed', String(active));
  });

  document.documentElement.dataset.homeDeveloperWorkspace = workspace;
}

function getDeveloperModeActiveWorkspace(root = document) {
  const activeAction = getDeveloperModeWorkspaceActions(root).find((action) => action.getAttribute('aria-pressed') === 'true');
  return activeAction?.dataset.homeDeveloperWorkspace || document.documentElement.dataset.homeDeveloperWorkspace || 'code';
}

/* =============================================================================
   04) ACTION ROUTING
============================================================================= */
function dispatchDeveloperModeTopbarEvent(type, detail = {}) {
  document.dispatchEvent(new CustomEvent(type, {
    bubbles:true,
    detail:{
      source:'developer-mode-topbar',
      ...detail
    }
  }));
}

function handleDeveloperModeWorkspaceAction(root = document, action) {
  const workspace = action?.dataset.homeDeveloperWorkspace || 'code';
  setDeveloperModeActiveWorkspace(root, workspace);
  dispatchDeveloperModeTopbarEvent(DEVELOPER_MODE_TOPBAR_EVENTS.workspaceChanged, { workspace });
}

function handleDeveloperModeUtilityAction(action) {
  if (action?.matches(DEVELOPER_MODE_TOPBAR_SELECTORS.notifications)) {
    dispatchDeveloperModeTopbarEvent(DEVELOPER_MODE_TOPBAR_EVENTS.notificationsRequested);
    return;
  }

  if (action?.matches(DEVELOPER_MODE_TOPBAR_SELECTORS.settings)) {
    dispatchDeveloperModeTopbarEvent(DEVELOPER_MODE_TOPBAR_EVENTS.settingsRequested);
    document.dispatchEvent(new CustomEvent('neuroartan:home-interaction-settings-open-requested', {
      detail:{
        source:'developer-mode-topbar',
        section:'developer'
      }
    }));
    return;
  }

  if (action?.matches(DEVELOPER_MODE_TOPBAR_SELECTORS.account)) {
    dispatchDeveloperModeTopbarEvent(DEVELOPER_MODE_TOPBAR_EVENTS.accountRequested);
    action.dispatchEvent(new CustomEvent('neuroartan:home-topbar-profile-requested', {
      bubbles:true,
      detail:{ source:'developer-mode-topbar' }
    }));
  }
}

/* =============================================================================
   05) EVENT BINDING
============================================================================= */
function bindDeveloperModeTopbarEvents(root = document) {
  const topbar = getDeveloperModeTopbarRoot(root);
  if (!topbar || topbar.dataset.homeDeveloperTopbarBound === 'true') return;

  topbar.dataset.homeDeveloperTopbarBound = 'true';

  topbar.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;

    const workspaceAction = target.closest(DEVELOPER_MODE_TOPBAR_SELECTORS.workspace);
    if (workspaceAction) {
      event.preventDefault();
      handleDeveloperModeWorkspaceAction(root, workspaceAction);
      return;
    }

    const utilityAction = target.closest([
      DEVELOPER_MODE_TOPBAR_SELECTORS.notifications,
      DEVELOPER_MODE_TOPBAR_SELECTORS.settings,
      DEVELOPER_MODE_TOPBAR_SELECTORS.account
    ].join(','));

    if (utilityAction) {
      event.preventDefault();
      handleDeveloperModeUtilityAction(utilityAction);
    }
  });
}

/* =============================================================================
   06) MODULE BOOT
============================================================================= */
export function initializeDeveloperModeTopbar(root = document) {
  bindDeveloperModeTopbarEvents(root);
  setDeveloperModeActiveWorkspace(root, getDeveloperModeActiveWorkspace(root));
}

document.addEventListener('DOMContentLoaded', () => {
  initializeDeveloperModeTopbar(document);
});

document.addEventListener('neuroartan:fragments-mounted', () => {
  initializeDeveloperModeTopbar(document);
});

/* =============================================================================
   07) END OF FILE
============================================================================= */
