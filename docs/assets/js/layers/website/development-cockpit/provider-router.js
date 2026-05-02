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
function renderProviderButton(provider) {
  const button = document.createElement('button');
  button.className = 'provider-router__option';
  button.type = 'button';
  button.dataset.providerId = normalizeCockpitString(provider.id);

  const title = document.createElement('strong');
  title.textContent = normalizeCockpitString(provider.label);

  const status = document.createElement('span');
  status.textContent = `${normalizeCockpitString(provider.mode)} · ${normalizeCockpitString(provider.status)}`;

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

  list.innerHTML = '';
  providers.forEach((provider, index) => {
    const button = renderProviderButton(provider);
    if (index === 0) {
      button.setAttribute('aria-pressed', 'true');
      writeCockpitOutput(root, '[data-provider-router-output]', `Active provider: ${provider.label} (${provider.mode})`);
    }
    button.addEventListener('click', async () => {
      list.querySelectorAll('.provider-router__option').forEach((entry) => entry.setAttribute('aria-pressed', 'false'));
      button.setAttribute('aria-pressed', 'true');
      const response = await requestDeveloperRuntimeAction(context, 'provider-connection-status', {
        provider: provider.id
      });
      writeCockpitOutput(root, '[data-provider-router-output]', [
        `Active provider: ${provider.label} (${provider.mode})`,
        `Connection status: ${response.status}`,
        `Frontend secrets allowed: ${provider.frontendSecretsAllowed ? 'yes' : 'no'}`,
        `Reason: ${response.reason}`
      ].join('\n'));
    });
    list.append(button);
  });
}

/* =============================================================================
   05) END OF FILE
============================================================================= */
