/* =============================================================================
   00) FILE INDEX
   01) MODULE IDENTITY
   02) IMPORTS
   03) MODULE STATE
   04) HELPERS
   05) STORE HELPERS
   06) INITIALIZATION
   07) END OF FILE
============================================================================= */

/* =============================================================================
   01) MODULE IDENTITY
============================================================================= */
/* /website/docs/assets/js/layers/website/system/active-model.js */

/* =============================================================================
   02) IMPORTS
============================================================================= */
import {
  getDefaultPublicModelId,
  getPublicModelById,
  getSelectablePublicModels,
  loadPublicModelRegistry
} from './public-model-registry.js';

/* =============================================================================
   03) MODULE STATE
============================================================================= */
const STORAGE_KEY = 'neuroartan.active-model-id';

const ACTIVE_MODEL_RUNTIME = (window.__NEUROARTAN_ACTIVE_MODEL__ ||= {
  initialized: false,
  activeModelId: '',
  activeModel: null,
  subscribers: new Set()
});

/* =============================================================================
   04) HELPERS
============================================================================= */
function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function getStoredActiveModelId() {
  try {
    return normalizeString(window.localStorage.getItem(STORAGE_KEY) || '');
  } catch (_) {
    return '';
  }
}

function storeActiveModelId(modelId) {
  try {
    if (!modelId) {
      window.localStorage.removeItem(STORAGE_KEY);
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, modelId);
  } catch (_) {}
}

function buildSnapshot() {
  return {
    activeModelId: ACTIVE_MODEL_RUNTIME.activeModelId,
    activeModel: ACTIVE_MODEL_RUNTIME.activeModel ? { ...ACTIVE_MODEL_RUNTIME.activeModel } : null
  };
}

function getActiveEngine() {
  return ACTIVE_MODEL_RUNTIME.activeModel?.engine || null;
}

function resolveResponsePrelude(route = '', engine = getActiveEngine()) {
  const normalizedRoute = normalizeString(route).toLowerCase();
  const routePrelude = engine?.route_preludes && typeof engine.route_preludes === 'object'
    ? normalizeString(engine.route_preludes[normalizedRoute] || '')
    : '';

  return routePrelude || normalizeString(engine?.prelude || '');
}

function notifySubscribers(source = 'runtime') {
  const snapshot = buildSnapshot();

  document.dispatchEvent(new CustomEvent('neuroartan:active-model-changed', {
    detail: {
      ...snapshot,
      source
    }
  }));

  ACTIVE_MODEL_RUNTIME.subscribers.forEach((listener) => {
    try {
      listener(snapshot);
    } catch (error) {
      console.error('[active-model] Subscriber update failed.', error);
    }
  });
}

function resolveInitialActiveModelId() {
  const storedId = getStoredActiveModelId();
  if (storedId && getPublicModelById(storedId)) {
    return storedId;
  }

  const defaultId = getDefaultPublicModelId();
  if (defaultId && getPublicModelById(defaultId)) {
    return defaultId;
  }

  return getSelectablePublicModels()[0]?.id || '';
}

/* =============================================================================
   05) STORE HELPERS
============================================================================= */
export function getActiveModelState() {
  return buildSnapshot();
}

export function getActiveModelRoutingContext(route = '') {
  const activeModel = ACTIVE_MODEL_RUNTIME.activeModel;
  const engine = getActiveEngine();

  return {
    activeModelId: ACTIVE_MODEL_RUNTIME.activeModelId,
    activeModel: activeModel ? { ...activeModel } : null,
    engineLabel: normalizeString(engine?.label || activeModel?.display_name || activeModel?.search_title || ''),
    memoryNamespace: normalizeString(engine?.memory_namespace || ''),
    preferredRoute: normalizeString(engine?.preferred_route || ''),
    responsePrelude: resolveResponsePrelude(route, engine),
    responseClosing: normalizeString(engine?.closing || '')
  };
}

export function formatActiveModelResponse(route = '', response = '') {
  const baseResponse = normalizeString(response);
  if (!baseResponse) {
    return '';
  }

  const context = getActiveModelRoutingContext(route);
  if (!context.activeModel) {
    return baseResponse;
  }

  const chunks = [];

  if (context.responsePrelude) {
    chunks.push(context.responsePrelude);
  }

  chunks.push(baseResponse);

  if (context.responseClosing) {
    chunks.push(context.responseClosing);
  }

  return chunks.join(' ');
}

export function subscribeActiveModelState(listener) {
  if (typeof listener !== 'function') {
    return () => {};
  }

  ACTIVE_MODEL_RUNTIME.subscribers.add(listener);
  listener(buildSnapshot());

  return () => {
    ACTIVE_MODEL_RUNTIME.subscribers.delete(listener);
  };
}

export async function activatePublicModel(modelId, { source = 'manual' } = {}) {
  await loadPublicModelRegistry();

  const resolvedModel = getPublicModelById(modelId);
  if (!resolvedModel) {
    return getActiveModelState();
  }

  ACTIVE_MODEL_RUNTIME.activeModelId = resolvedModel.id;
  ACTIVE_MODEL_RUNTIME.activeModel = resolvedModel;
  storeActiveModelId(resolvedModel.id);
  notifySubscribers(source);

  return getActiveModelState();
}

/* =============================================================================
   06) INITIALIZATION
============================================================================= */
async function initActiveModelRuntime() {
  if (ACTIVE_MODEL_RUNTIME.initialized) {
    return;
  }

  ACTIVE_MODEL_RUNTIME.initialized = true;

  try {
    await loadPublicModelRegistry();
    const initialId = resolveInitialActiveModelId();

    if (initialId) {
      ACTIVE_MODEL_RUNTIME.activeModelId = initialId;
      ACTIVE_MODEL_RUNTIME.activeModel = getPublicModelById(initialId);
      storeActiveModelId(initialId);
    }

    notifySubscribers('boot');
  } catch (error) {
    console.error('[active-model] Initialization failed.', error);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    void initActiveModelRuntime();
  }, { once: true });
} else {
  void initActiveModelRuntime();
}

/* =============================================================================
   07) END OF FILE
============================================================================= */
