/* =============================================================================
   00) FILE INDEX
   01) MODULE IDENTITY
   02) IMPORTS
   03) RENDERING
   04) INITIALIZATION
   05) END OF FILE
============================================================================= */

/* =============================================================================
   01) MODULE IDENTITY
============================================================================= */
/* /website/docs/assets/js/layers/website/development-cockpit/provider-router.js */

/* =============================================================================
   02) IMPORTS
============================================================================= */
import {
  getCockpitModuleRoot,
  normalizeCockpitString,
  writeCockpitOutput
} from './development-cockpit-shell.js';
import { requestDeveloperRuntimeAction } from './developer-runtime-client.js';

/* =============================================================================
   03) RENDERING
============================================================================= */
function getRuntimeProviderStatus(statusResponse, providerId) {
  const providers = Array.isArray(statusResponse?.providers) ? statusResponse.providers : [];
  return providers.find((entry) => entry.id === providerId) || null;
}

function getActiveProviderId(statusResponse) {
  return statusResponse?.developerState?.activeAgent?.providerId
    || statusResponse?.developerState?.developerPreferences?.defaultProvider
    || '';
}

function renderProviderButton(provider, runtimeStatus = null, isActive = false) {
  const button = document.createElement('button');
  button.className = 'provider-router__option';
  button.type = 'button';
  button.dataset.providerId = normalizeCockpitString(provider.id);
  button.setAttribute('aria-pressed', String(isActive));

  const title = document.createElement('strong');
  title.textContent = normalizeCockpitString(provider.label);

  const status = document.createElement('span');
  status.textContent = [
    normalizeCockpitString(provider.mode),
    normalizeCockpitString(runtimeStatus?.credentialStatus || provider.status),
    normalizeCockpitString(runtimeStatus?.runtimeStatus || '')
  ].filter(Boolean).join(' · ');

  const copy = document.createElement('span');
  copy.textContent = normalizeCockpitString(provider.description);

  button.append(title, status, copy);
  return button;
}

/* =============================================================================
   04) INITIALIZATION
============================================================================= */
export function initProviderRouter(context) {
  const root = getCockpitModuleRoot(context, 'provider-router');
  const list = root?.querySelector('[data-provider-router-list]');
  if (!root || !list) return;

  const providers = Array.isArray(context.registries.providers?.providers)
    ? context.registries.providers.providers
    : [];

  async function renderProviders() {
    const statusResponse = await requestDeveloperRuntimeAction(context, 'provider-connection-status', {
      source:'provider-router'
    });
    const activeProviderId = getActiveProviderId(statusResponse) || providers[0]?.id || '';

    list.innerHTML = '';
    providers.forEach((provider) => {
      const runtimeStatus = getRuntimeProviderStatus(statusResponse, provider.id);
      const button = renderProviderButton(provider, runtimeStatus, provider.id === activeProviderId);
      button.addEventListener('click', async () => {
        list.querySelectorAll('.provider-router__option').forEach((entry) => entry.setAttribute('aria-pressed', 'false'));
        button.setAttribute('aria-pressed', 'true');
        const configuration = await requestDeveloperRuntimeAction(context, 'provider-configure', {
          provider:{
            id:provider.id,
            label:provider.label,
            mode:provider.mode,
            runtime:provider.runtime,
            selectedModel:provider.runtime
          }
        });
        const activation = await requestDeveloperRuntimeAction(context, 'agent-activate', {
          agent:{
            providerId:provider.id,
            selectedModel:provider.runtime,
            agentRole:'implementation-agent'
          }
        });
        writeCockpitOutput(root, '[data-provider-router-output]', [
          `Active provider: ${provider.label} (${provider.mode})`,
          `Configuration status: ${configuration.status}`,
          `Credential status: ${configuration.provider?.credentialStatus || runtimeStatus?.credentialStatus || 'unknown'}`,
          `Agent status: ${activation.status}`,
          `Frontend secrets allowed: ${provider.frontendSecretsAllowed ? 'yes' : 'no'}`,
          `Runtime note: ${configuration.reason || activation.runtime || 'Provider execution remains backend-gated.'}`
        ].join('\n'));
      });
      list.append(button);
    });

    const activeProvider = providers.find((provider) => provider.id === activeProviderId) || providers[0];
    if (activeProvider) {
      const activeStatus = getRuntimeProviderStatus(statusResponse, activeProvider.id);
      writeCockpitOutput(root, '[data-provider-router-output]', [
        `Active provider: ${activeProvider.label} (${activeProvider.mode})`,
        `Credential status: ${activeStatus?.credentialStatus || activeProvider.status}`,
        `Runtime status: ${activeStatus?.runtimeStatus || 'backend status pending'}`,
        `Persistence: ${statusResponse?.developerState?.canonicalPersistence || 'server_session_pending_supabase_profile_link'}`
      ].join('\n'));
    }
  }

  void renderProviders();
}

/* =============================================================================
   05) END OF FILE
============================================================================= */
