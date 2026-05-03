/* =============================================================================
   00) FILE INDEX
   01) MODULE IDENTITY
   02) IMPORTS
   03) VOICE HELPERS
   04) INITIALIZATION
   05) END OF FILE
============================================================================= */

/* =============================================================================
   01) MODULE IDENTITY
============================================================================= */
/* /website/docs/assets/js/layers/website/development-cockpit/developer-command-composer.js */

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
   03) VOICE HELPERS
============================================================================= */
function getSpeechRecognitionConstructor() {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

function bindVoiceControl(root) {
  const button = root.querySelector('[data-developer-command-voice]');
  const input = root.querySelector('[data-developer-command-input]');
  const Recognition = getSpeechRecognitionConstructor();

  if (!(button instanceof HTMLButtonElement) || !(input instanceof HTMLTextAreaElement)) {
    return;
  }

  if (!Recognition) {
    button.textContent = 'Voice unavailable';
    button.disabled = true;
    return;
  }

  button.addEventListener('click', () => {
    const recognition = new Recognition();
    recognition.lang = document.documentElement.lang || 'en';
    recognition.interimResults = true;
    recognition.continuous = false;
    root.dataset.voiceState = 'listening';
    button.textContent = 'Listening';

    recognition.addEventListener('result', (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript || '')
        .join(' ')
        .trim();
      if (transcript) {
        input.value = transcript;
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });

    recognition.addEventListener('end', () => {
      root.dataset.voiceState = 'idle';
      button.textContent = 'Start voice dictation';
    });

    recognition.start();
  });
}

/* =============================================================================
   04) INITIALIZATION
============================================================================= */
export function initDeveloperCommandComposer(context) {
  const root = getCockpitModuleRoot(context, 'developer-command-composer');
  const form = root?.querySelector('[data-developer-command-form]');
  if (!root || !form) return;

  const providers = Array.isArray(context.registries.providers?.providers)
    ? context.registries.providers.providers
    : [];
  const repositories = Array.isArray(context.registries.repositoryScopes?.repositories)
    ? context.registries.repositoryScopes.repositories
    : [];

  fillCockpitSelect(root.querySelector('[data-developer-command-provider]'), providers);
  fillCockpitSelect(root.querySelector('[data-developer-command-repository]'), repositories);
  bindVoiceControl(root);

  void requestDeveloperRuntimeAction(context, 'developer-state-read', {
    source:'developer-command-composer'
  }).then((response) => {
    const state = response?.developerState || {};
    const repositorySelect = root.querySelector('[data-developer-command-repository]');
    const providerSelect = root.querySelector('[data-developer-command-provider]');
    if (repositorySelect instanceof HTMLSelectElement && state.activeRepository) {
      repositorySelect.value = state.activeRepository;
    }
    if (providerSelect instanceof HTMLSelectElement && (state.activeAgent?.providerId || state.developerPreferences?.defaultProvider)) {
      providerSelect.value = state.activeAgent?.providerId || state.developerPreferences.defaultProvider;
    }
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const values = readCockpitForm(form);
    const response = await requestDeveloperRuntimeAction(context, 'agent-session-create', values);
    writeCockpitOutput(root, '[data-developer-command-output]', [
      `Command: ${values.command}`,
      `Repository: ${values.repository}`,
      `Provider: ${values.provider}`,
      `Agent role: ${values.agentRole}`,
      `Runtime status: ${response.status}`,
      `State persistence: ${response.developerState?.canonicalPersistence || 'server_session_pending_supabase_profile_link'}`
    ].join('\n'));
  });
}

/* =============================================================================
   05) END OF FILE
============================================================================= */
