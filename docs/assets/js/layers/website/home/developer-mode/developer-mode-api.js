/* =============================================================================
   00) FILE INDEX
   01) MODULE IDENTITY
   02) REGISTRY LOADING
   03) BACKEND REQUESTS
   04) END OF FILE
============================================================================= */

/* =============================================================================
   01) MODULE IDENTITY
============================================================================= */
/* /website/docs/assets/js/layers/website/home/developer-mode/developer-mode-api.js */

/* =============================================================================
   02) REGISTRY LOADING
============================================================================= */
const RUNTIME_INTERFACE_REGISTRY_PATH = '/assets/data/website/development-cockpit/developer-runtime-interface-registry.json';

let runtimeInterfaceRegistryPromise = null;

function normalizeString(value = '') {
  return String(value || '').trim();
}

async function fetchJson(path) {
  const response = await fetch(path, {
    cache:'no-store',
    credentials:'same-origin'
  });

  if (!response.ok) {
    throw new Error(`DEVELOPER_MODE_JSON_FAILED:${path}:${response.status}`);
  }

  return response.json();
}

export async function getDeveloperRuntimeInterfaceRegistry() {
  if (!runtimeInterfaceRegistryPromise) {
    runtimeInterfaceRegistryPromise = fetchJson(RUNTIME_INTERFACE_REGISTRY_PATH);
  }

  return runtimeInterfaceRegistryPromise;
}

async function getDeveloperRuntimeInterface(interfaceId) {
  const registry = await getDeveloperRuntimeInterfaceRegistry();
  const interfaces = Array.isArray(registry.interfaces) ? registry.interfaces : [];
  return interfaces.find((entry) => entry.id === interfaceId) || null;
}

function shouldRequestDeveloperBackend(registry, runtimeInterface) {
  const runtimeState = registry?.defaultRuntimeState || {};
  const frontendStatus = normalizeString(runtimeInterface?.frontendStatus || '').toLowerCase();

  return runtimeState.backendRuntimeImplemented === true
    && !frontendStatus.includes('stubbed')
    && !frontendStatus.includes('locked')
    && !frontendStatus.includes('backend_required');
}

/* =============================================================================
   03) BACKEND REQUESTS
============================================================================= */
function buildRequestUrl(route, method, payload = {}) {
  const url = new URL(route, window.location.origin);

  if (method === 'GET') {
    Object.entries(payload || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    });
  }

  return url;
}

export async function requestHomeDeveloperAction(interfaceId, payload = {}) {
  const registry = await getDeveloperRuntimeInterfaceRegistry();
  const interfaces = Array.isArray(registry.interfaces) ? registry.interfaces : [];
  const runtimeInterface = interfaces.find((entry) => entry.id === interfaceId) || null;
  if (!runtimeInterface?.route) {
    return {
      ok:false,
      status:'developer_runtime_interface_missing',
      interfaceId,
      reason:'The requested Developer Mode backend route is not registered.'
    };
  }

  if (!shouldRequestDeveloperBackend(registry, runtimeInterface)) {
    return {
      ok:false,
      status:'developer_backend_locked',
      interfaceId,
      route:runtimeInterface.route,
      method:normalizeString(runtimeInterface.method || 'GET').toUpperCase(),
      reason:'Developer Mode backend runtime is not implemented for this deployment.'
    };
  }

  const method = normalizeString(runtimeInterface.method || 'GET').toUpperCase();
  const url = buildRequestUrl(runtimeInterface.route, method, payload);
  try {
    const response = await fetch(url, {
      method,
      credentials:'same-origin',
      headers:method === 'GET' ? {} : { 'content-type':'application/json' },
      body:method === 'GET' ? undefined : JSON.stringify(payload)
    });
    const text = await response.text();
    const data = text ? JSON.parse(text) : {};
    return {
      interfaceId,
      route:runtimeInterface.route,
      method,
      ok:response.ok,
      httpStatus:response.status,
      ...data
    };
  } catch (error) {
    return {
      interfaceId,
      route:runtimeInterface.route,
      method,
      ok:false,
      status:'developer_backend_unavailable',
      reason:error?.message || 'Developer Mode backend is unavailable.'
    };
  }
}

export async function loadHomeDeveloperJson(path) {
  return fetchJson(path);
}

/* =============================================================================
   04) END OF FILE
============================================================================= */
