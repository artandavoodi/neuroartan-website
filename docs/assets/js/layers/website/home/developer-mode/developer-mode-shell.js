/* =============================================================================
   00) FILE INDEX
   01) MODULE IDENTITY
   02) IMPORTS
   03) CONSTANTS
   04) SHELL REGISTRATION
   05) RENDERING
   06) REVIEW ARTIFACT RENDERING
   07) ACTION METADATA RENDERING
   08) BACKEND ACTIONS
   09) EVENT BINDING
   10) DEVELOPER CONSOLE MOUNT
   11) END OF FILE
============================================================================= */

/* =============================================================================
   01) MODULE IDENTITY
============================================================================= */
/* /website/docs/assets/js/layers/website/home/developer-mode/developer-mode-shell.js */

/* =============================================================================
   02) IMPORTS
============================================================================= */
import {
  loadHomeDeveloperJson,
  requestHomeDeveloperAction
} from './developer-mode-api.js';
import {
  getHomeDeveloperModeState,
  setHomeDeveloperModeState
} from './developer-mode-state.js';
import {
  renderHomeDeveloperRouteButtons,
  setHomeDeveloperActivePanel
} from './developer-mode-navigation.js';

/* =============================================================================
   03) CONSTANTS
============================================================================= */
const HOMEPAGE_DEVELOPER_MODE_REGISTRY_PATH = '/assets/data/website/development-cockpit/homepage-developer-mode-registry.json';
const PROVIDER_REGISTRY_PATH = '/assets/data/website/development-cockpit/provider-registry.json';
const PROJECT_REGISTRY_PATH = '/assets/data/website/development-cockpit/developer-project-registry.json';

/* =============================================================================
   04) SHELL REGISTRATION
============================================================================= */
function markDeveloperShellRegistered(root) {
  root.dataset.homeDeveloperModeMounted = 'true';
}

/* =============================================================================
   05) RENDERING
============================================================================= */
function writeOutput(root, key, value) {
  const node = root.querySelector(`[data-home-developer-output="${key}"]`);
  if (node) node.textContent = String(value || '');
}

function readForm(form) {
  return Object.fromEntries(Array.from(new FormData(form).entries()).map(([key, value]) => {
    return [key, String(value || '').trim()];
  }));
}

function renderContext(root) {
  const state = getHomeDeveloperModeState();
  const developerState = state.developerState || {};
  const github = developerState.github || {};
  const activeAgent = developerState.activeAgent || {};
  const defaultProvider = developerState.developerPreferences?.defaultProvider || '';

  const values = {
    activeProject:developerState.activeWorkspace || developerState.activeProjectId || 'Not selected',
    github:github.connected ? (github.viewer?.login || 'Connected') : 'Authorization required',
    activeRepository:developerState.activeRepository || 'Not selected',
    activeBranch:developerState.activeBranch || 'Not selected',
    activeAgent:activeAgent.providerId ? `${activeAgent.providerId} / ${activeAgent.agentRole}` : 'Not active',
    provider:defaultProvider || activeAgent.providerId || 'Not configured',
    runtime:state.providerStatuses.length ? 'Provider status loaded' : 'Backend status pending',
    approval:'Required before mutation',
    fileTarget:'Not selected',
    security:'No frontend secrets; mutation gated'
  };

  Object.entries(values).forEach(([key, value]) => {
    const node = root.querySelector(`[data-home-developer-context="${key}"]`);
    if (node) node.textContent = value;
  });
}



/* =============================================================================
   07) ACTION METADATA RENDERING
============================================================================= */

function renderDeveloperMode(root) {
  const state = getHomeDeveloperModeState();
  renderHomeDeveloperRouteButtons(root.querySelector('[data-home-developer-sidebar-items]'), state.registry?.sidebarItems || []);
  renderContext(root);
  setHomeDeveloperActivePanel(root, state.activePanel);
}

async function refreshDeveloperState(root) {
  const [stateResponse, providerResponse] = await Promise.all([
    requestHomeDeveloperAction('developer-state-read', { source:'homepage-developer-mode' }),
    requestHomeDeveloperAction('provider-connection-status', { source:'homepage-developer-mode' })
  ]);

  setHomeDeveloperModeState({
    developerState:stateResponse.developerState || null,
    providerStatuses:Array.isArray(providerResponse.providers) ? providerResponse.providers : []
  });
  renderDeveloperMode(root);
  writeOutput(root, 'settings', [
    `Developer state: ${stateResponse.status}`,
    `GitHub: ${stateResponse.developerState?.github?.connected ? 'connected' : 'authorization_required'}`,
    `Persistence: ${stateResponse.developerState?.canonicalPersistence || 'server_session_pending_supabase_profile_link'}`
  ].join('\n'));
}


/* =============================================================================
   09) EVENT BINDING
============================================================================= */
function bindDeveloperModeEvents(root) {
  root.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;

    const route = target.closest('[data-home-developer-route-panel]');
    if (route) {
      event.preventDefault();
      setHomeDeveloperModeState({
        activePanel:route.dataset.homeDeveloperRoutePanel || 'repositories',
        activeMode:route.dataset.homeDeveloperRouteMode || getHomeDeveloperModeState().activeMode
      });
      renderDeveloperMode(root);
      return;
    }

    if (target.closest('[data-home-developer-github-disconnect]')) {
      event.preventDefault();
      void requestHomeDeveloperAction('github-disconnect', {}).then(() => refreshDeveloperState(root));
      return;
    }

    if (target.closest('[data-home-developer-open-control-center]')) {
      event.preventDefault();
      document.dispatchEvent(new CustomEvent('neuroartan:home-interaction-settings-open-requested', {
        detail:{
          source:'homepage-developer-mode',
          section:'developer'
        }
      }));
      return;
    }

    if (target.closest('[data-home-developer-state-refresh]')) {
      event.preventDefault();
      void refreshDeveloperState(root);
    }
  });
}

/* =============================================================================
   10) DEVELOPER CONSOLE MOUNT
============================================================================= */
export async function mountHomeDeveloperModeShell(root) {
  if (!root || root.dataset.homeDeveloperModeMounted === 'true') {
    return;
  }

  markDeveloperShellRegistered(root);
  const [registry, providers, projects] = await Promise.all([
    loadHomeDeveloperJson(HOMEPAGE_DEVELOPER_MODE_REGISTRY_PATH),
    loadHomeDeveloperJson(PROVIDER_REGISTRY_PATH),
    loadHomeDeveloperJson(PROJECT_REGISTRY_PATH)
  ]);

  setHomeDeveloperModeState({
    registry,
    providers:Array.isArray(providers.providers) ? providers.providers : [],
    projects
  });

  bindDeveloperModeEvents(root);
  await refreshDeveloperState(root);
}

/* =============================================================================
   11) END OF FILE
============================================================================= */
