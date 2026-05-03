/* =============================================================================
   00) FILE INDEX
   01) MODULE IDENTITY
   02) IMPORTS
   03) RENDERING
   04) BOOT
   05) END OF FILE
============================================================================= */

/* =============================================================================
   01) MODULE IDENTITY
============================================================================= */
/* /website/docs/assets/js/layers/website/home/interaction-settings/sections/developer.js */

/* =============================================================================
   02) IMPORTS
============================================================================= */
import { requestHomeDeveloperAction } from '../../developer-mode/developer-mode-api.js';

/* =============================================================================
   03) RENDERING
============================================================================= */
function setDeveloperSettingStatus(root, key, value) {
  const node = root?.querySelector(`[data-home-developer-setting-status="${key}"]`);
  if (!node) return;
  node.textContent = String(value || '');
}

async function renderDeveloperSettingsSection(root) {
  if (!root || root.dataset.homeDeveloperSettingsHydrated === 'true') {
    return;
  }

  root.dataset.homeDeveloperSettingsHydrated = 'true';
  const [stateResponse, providerResponse] = await Promise.all([
    requestHomeDeveloperAction('developer-state-read', {
      source:'control-center-developer-section'
    }),
    requestHomeDeveloperAction('provider-connection-status', {
      source:'control-center-developer-section'
    })
  ]);

  const developerState = stateResponse.developerState || {};
  const providers = Array.isArray(providerResponse.providers) ? providerResponse.providers : [];
  const cloudConfigured = providers.some((provider) => provider.mode === 'cloud' && provider.configured);
  const localAvailable = providers.some((provider) => provider.mode === 'local' && provider.configured);

  setDeveloperSettingStatus(root, 'local-runtime', localAvailable ? 'Local provider route is available or configurable' : 'Local runtime pending server configuration');
  setDeveloperSettingStatus(root, 'cloud-providers', cloudConfigured ? 'At least one cloud provider is configured server-side' : 'Cloud provider credentials are pending server-side configuration');
  setDeveloperSettingStatus(root, 'provider-registry', `${providers.length} providers registered through backend status route`);
  setDeveloperSettingStatus(root, 'developer-mode', 'Open Workspace / Developer Mode for routed repository workflows');
  setDeveloperSettingStatus(root, 'github', developerState.github?.connected ? `Connected as ${developerState.github.viewer?.login || 'GitHub user'}` : 'GitHub authorization required');
  setDeveloperSettingStatus(root, 'active-repository', developerState.activeRepository || 'Not selected');
  setDeveloperSettingStatus(root, 'active-agent', developerState.activeAgent?.providerId || 'Not active');
  setDeveloperSettingStatus(root, 'approval', developerState.developerPreferences?.mutationApprovalRequired === false ? 'Review setting requires correction' : 'Repository mutation requires approval');
}

/* =============================================================================
   04) BOOT
============================================================================= */
function bootDeveloperSettingsSection() {
  const root = document.querySelector('[data-home-interaction-settings-section="developer"]');
  if (!root) return;
  void renderDeveloperSettingsSection(root);
}

document.addEventListener('fragment:mounted', (event) => {
  if (event?.detail?.fragment === 'home-interaction-settings-developer' || event?.detail?.name === 'home-interaction-settings-developer') {
    bootDeveloperSettingsSection();
  }
});

document.addEventListener('neuroartan:runtime-ready', bootDeveloperSettingsSection);

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootDeveloperSettingsSection, { once:true });
} else {
  bootDeveloperSettingsSection();
}

/* =============================================================================
   05) END OF FILE
============================================================================= */
