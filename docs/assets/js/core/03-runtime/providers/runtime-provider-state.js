/* =============================================================================
   RUNTIME PROVIDER STATE
============================================================================= */

const STORAGE_KEY = 'neuroartan.runtime-provider-state';

const DEFAULT_STATE = {
  activeProvider: 'gemini',
  activeModel: 'gemini-2.5-flash',
  serverUrl: 'http://localhost:1234/v1',
  streaming: true,
  multimodal: true,
  memory: true
};

function removeLegacyRuntimeProviderSecrets() {
  try {
    Object.keys(window.localStorage || {})
      .filter((key) => /^neuroartan-provider-[a-z0-9_-]+-key$/i.test(key))
      .forEach((key) => window.localStorage.removeItem(key));
  } catch {
    // Browser storage can be unavailable in privacy-restricted contexts.
  }
}

function loadState() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const { apiKey: _legacyApiKey, ...safeState } = parsed || {};
      return { ...DEFAULT_STATE, ...safeState };
    }
  } catch {
  }
  return { ...DEFAULT_STATE };
}

function saveState(state) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
  }
}

let NEUROARTAN_RUNTIME_PROVIDER_STATE = loadState();
removeLegacyRuntimeProviderSecrets();

export function getRuntimeProviderState() {
  return NEUROARTAN_RUNTIME_PROVIDER_STATE;
}

export function setRuntimeProviderState(next = {}) {
  const { apiKey: _legacyApiKey, ...safeNext } = next || {};
  Object.assign(
    NEUROARTAN_RUNTIME_PROVIDER_STATE,
    safeNext
  );
  saveState(NEUROARTAN_RUNTIME_PROVIDER_STATE);
  return NEUROARTAN_RUNTIME_PROVIDER_STATE;
}


window.dispatchEvent(
  new CustomEvent('neuroartan:runtime-ready')
);
