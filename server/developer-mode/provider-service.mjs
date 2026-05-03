/* =============================================================================
   00) FILE INDEX
   01) MODULE IDENTITY
   02) IMPORTS
   03) PROVIDER STATUS HELPERS
   04) FRONTEND SECRET GUARDS
   05) PROVIDER CONFIGURATION
   06) END OF FILE
============================================================================= */

/* =============================================================================
   01) MODULE IDENTITY
============================================================================= */
/* /website/server/developer-mode/provider-service.mjs */

/* =============================================================================
   02) IMPORTS
============================================================================= */
/* =============================================================================
   03) PROVIDER STATUS HELPERS
============================================================================= */
const PROVIDER_STATUS_DEFINITIONS = [
  {
    id:'openai-codex-cloud',
    label:'Codex Cloud',
    mode:'cloud',
    runtime:'codex',
    envKey:'OPENAI_API_KEY',
    configuredWhen:'server_side_openai_key_present'
  },
  {
    id:'huggingface-inference',
    label:'Hugging Face Inference',
    mode:'cloud',
    runtime:'huggingface',
    envKey:'HUGGINGFACE_API_TOKEN',
    configuredWhen:'server_side_huggingface_token_present'
  },
  {
    id:'gemini-coding-provider',
    label:'Gemini Coding Provider',
    mode:'cloud',
    runtime:'gemini',
    envKey:'GEMINI_API_KEY',
    configuredWhen:'server_side_gemini_key_present'
  },
  {
    id:'gemma-ollama-local',
    label:'Gemma / Ollama Local',
    mode:'local',
    runtime:'ollama',
    envKey:'OLLAMA_BASE_URL',
    configuredWhen:'local_runtime_url_present'
  },
  {
    id:'local-codex',
    label:'Local Codex',
    mode:'local',
    runtime:'codex-local',
    envKey:'',
    configuredWhen:'local_runtime_available_on_workstation'
  },
  {
    id:'manual-review',
    label:'Manual Review',
    mode:'manual',
    runtime:'human',
    envKey:'',
    configuredWhen:'no_credential_required'
  }
];

function isProviderConfigured(definition) {
  if (!definition.envKey) {
    return true;
  }

  return Boolean(process.env[definition.envKey]);
}

export function getProviderStatuses() {
  return PROVIDER_STATUS_DEFINITIONS.map((definition) => {
    const configured = isProviderConfigured(definition);
    return {
      id:definition.id,
      label:definition.label,
      mode:definition.mode,
      runtime:definition.runtime,
      configured,
      credentialStatus:configured ? 'configured_server_side_or_not_required' : 'credential_required_server_side',
      runtimeStatus:configured ? 'available_for_configuration' : 'pending_server_credential_or_runtime',
      configuredWhen:definition.configuredWhen,
      frontendSecretsAllowed:false
    };
  });
}

export function getProviderStatus(providerId) {
  const normalizedId = String(providerId || '').trim();
  return getProviderStatuses().find((provider) => provider.id === normalizedId) || null;
}

/* =============================================================================
   04) FRONTEND SECRET GUARDS
============================================================================= */
function hasSecretField(value) {
  if (!value || typeof value !== 'object') {
    return false;
  }

  return Object.entries(value).some(([key, entry]) => {
    if (/api[_-]?key|apikey|token|secret|password|private[_-]?key|access[_-]?token/i.test(key)) {
      return true;
    }

    return hasSecretField(entry);
  });
}

export function assertNoFrontendSecrets(payload = {}) {
  if (!hasSecretField(payload)) {
    return null;
  }

  return {
    ok:false,
    status:'frontend_secret_rejected',
    reason:'Provider credentials must be configured through server-side environment variables or a future secure vault, not browser payloads.'
  };
}

/* =============================================================================
   05) PROVIDER CONFIGURATION
============================================================================= */
export function buildProviderConfiguration(payload = {}) {
  const providerId = String(payload.providerId || payload.provider_id || payload.provider || payload.id || '').trim();
  const status = getProviderStatus(providerId);

  return {
    id:providerId,
    label:String(payload.label || status?.label || providerId).trim(),
    mode:String(payload.mode || status?.mode || '').trim(),
    runtime:String(payload.runtime || status?.runtime || '').trim(),
    selectedModel:String(payload.selectedModel || payload.selected_model || payload.model || '').trim(),
    credentialStatus:status?.credentialStatus || 'unknown_provider',
    runtimeStatus:status?.runtimeStatus || 'unknown_provider',
    configuredAt:new Date().toISOString()
  };
}

/* =============================================================================
   06) END OF FILE
============================================================================= */
