/* =============================================================================
   00) FILE INDEX
   01) MODULE IDENTITY
   02) IMPORTS
   03) INITIALIZATION
   04) END OF FILE
============================================================================= */

/* =============================================================================
   01) MODULE IDENTITY
============================================================================= */
/* /website/docs/assets/js/layers/website/development-cockpit/project-environment-panel.js */

/* =============================================================================
   02) IMPORTS
============================================================================= */
import {
  fillCockpitSelect,
  getCockpitModuleRoot,
  readCockpitForm,
  writeCockpitOutput
} from './development-cockpit-shell.js';
import { requestDeveloperRuntimeAction } from './developer-runtime-client.js';

/* =============================================================================
   03) INITIALIZATION
============================================================================= */
export function initProjectEnvironmentPanel(context) {
  const root = getCockpitModuleRoot(context, 'project-environment-panel');
  const form = root?.querySelector('[data-project-environment-form]');
  if (!root || !form) return;

  const repositories = Array.isArray(context.registries.repositoryScopes?.repositories)
    ? context.registries.repositoryScopes.repositories
    : [];
  const providers = Array.isArray(context.registries.providers?.providers)
    ? context.registries.providers.providers
    : [];
  const modes = Array.isArray(context.registries.developerProjects?.environmentModes)
    ? context.registries.developerProjects.environmentModes
    : [];

  fillCockpitSelect(root.querySelector('[data-project-environment-repository]'), repositories);
  fillCockpitSelect(root.querySelector('[data-project-environment-provider]'), providers);
  fillCockpitSelect(root.querySelector('[data-project-environment-mode]'), modes);

  void requestDeveloperRuntimeAction(context, 'developer-state-read', {
    source:'project-environment-panel'
  }).then((response) => {
    const state = response?.developerState || {};
    const repositorySelect = root.querySelector('[data-project-environment-repository]');
    const providerSelect = root.querySelector('[data-project-environment-provider]');
    const modeSelect = root.querySelector('[data-project-environment-mode]');
    if (repositorySelect instanceof HTMLSelectElement && state.activeRepository) {
      repositorySelect.value = state.activeRepository;
    }
    if (providerSelect instanceof HTMLSelectElement && state.developerPreferences?.defaultProvider) {
      providerSelect.value = state.developerPreferences.defaultProvider;
    }
    if (modeSelect instanceof HTMLSelectElement && state.developerPreferences?.defaultEnvironmentMode) {
      modeSelect.value = state.developerPreferences.defaultEnvironmentMode;
    }
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const values = readCockpitForm(form);
    const response = await requestDeveloperRuntimeAction(context, 'developer-project-create', {
      project: values
    });
    writeCockpitOutput(root, '[data-project-environment-output]', [
      `Project: ${values.projectName}`,
      `Workspace: ${values.workspaceName}`,
      `Repository: ${values.repository}`,
      `Provider: ${values.provider}`,
      `Environment: ${values.environmentMode}`,
      `Canonical persistence: ${response.status}`,
      `State persistence: ${response.developerState?.canonicalPersistence || 'server_session_pending_supabase_profile_link'}`
    ].join('\n'));
  });
}

/* =============================================================================
   04) END OF FILE
============================================================================= */
