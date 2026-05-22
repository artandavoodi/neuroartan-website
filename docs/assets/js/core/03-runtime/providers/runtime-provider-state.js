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

function loadState() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_STATE, ...parsed };
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

export function getRuntimeProviderState() {
  return NEUROARTAN_RUNTIME_PROVIDER_STATE;
}

export function setRuntimeProviderState(next = {}) {
  Object.assign(
    NEUROARTAN_RUNTIME_PROVIDER_STATE,
    next
  );
  saveState(NEUROARTAN_RUNTIME_PROVIDER_STATE);
  return NEUROARTAN_RUNTIME_PROVIDER_STATE;
}


window.dispatchEvent(
  new CustomEvent('neuroartan:runtime-ready')
);
