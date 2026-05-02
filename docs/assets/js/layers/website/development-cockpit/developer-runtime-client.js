/* =============================================================================
   00) FILE INDEX
   01) MODULE IDENTITY
   02) CONSTANTS
   03) REGISTRY HELPERS
   04) BACKEND REQUESTS
   05) LOCKED RUNTIME RESPONSES
   06) END OF FILE
============================================================================= */

/* =============================================================================
   01) MODULE IDENTITY
============================================================================= */
/* /website/docs/assets/js/layers/website/development-cockpit/developer-runtime-client.js */

/* =============================================================================
   02) CONSTANTS
============================================================================= */
export const DEVELOPER_RUNTIME_LOCK_REASON = 'BACKEND_RUNTIME_NOT_IMPLEMENTED';

/* =============================================================================
   03) REGISTRY HELPERS
============================================================================= */
export function getDeveloperRuntimeInterfaces(context) {
  return Array.isArray(context?.registries?.runtimeInterfaces?.interfaces)
    ? context.registries.runtimeInterfaces.interfaces
    : [];
}

export function getDeveloperRuntimeInterface(context, interfaceId) {
  const normalizedId = String(interfaceId || '').trim();
  return getDeveloperRuntimeInterfaces(context).find((entry) => entry.id === normalizedId) || null;
}

/* =============================================================================
   04) BACKEND REQUESTS
============================================================================= */
function buildRuntimeRoute(route, method, payload = {}) {
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

async function requestDeveloperBackend(runtimeInterface, payload = {}) {
  if (!runtimeInterface?.route || typeof fetch !== 'function') {
    return null;
  }

  const method = String(runtimeInterface.method || 'GET').toUpperCase();
  const url = buildRuntimeRoute(runtimeInterface.route, method, payload);
  const response = await fetch(url, {
    method,
    credentials:'same-origin',
    headers:method === 'GET' ? {} : { 'content-type':'application/json' },
    body:method === 'GET' ? undefined : JSON.stringify(payload)
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : {};

  return {
    ok:response.ok,
    httpStatus:response.status,
    ...data
  };
}

/* =============================================================================
   05) LOCKED RUNTIME RESPONSES
============================================================================= */
export function buildLockedRuntimeResponse(context, interfaceId, payload = {}) {
  const runtimeInterface = getDeveloperRuntimeInterface(context, interfaceId);
  return {
    ok: false,
    status: 'locked_backend_required',
    reason: DEVELOPER_RUNTIME_LOCK_REASON,
    interfaceId,
    label: runtimeInterface?.label || interfaceId,
    route: runtimeInterface?.route || '',
    method: runtimeInterface?.method || '',
    requiresApproval: runtimeInterface?.requiresApproval === true,
    mutation: runtimeInterface?.mutation === true,
    payload
  };
}

export async function requestDeveloperRuntimeAction(context, interfaceId, payload = {}) {
  const runtimeInterface = getDeveloperRuntimeInterface(context, interfaceId);

  try {
    const backendResponse = await requestDeveloperBackend(runtimeInterface, payload);
    if (backendResponse) {
      return {
        interfaceId,
        label:runtimeInterface?.label || interfaceId,
        route:runtimeInterface?.route || '',
        method:runtimeInterface?.method || '',
        requiresApproval:runtimeInterface?.requiresApproval === true,
        mutation:runtimeInterface?.mutation === true,
        payload,
        ...backendResponse
      };
    }
  } catch (error) {
    return {
      ...buildLockedRuntimeResponse(context, interfaceId, payload),
      status:'backend_unavailable',
      reason:error?.message || DEVELOPER_RUNTIME_LOCK_REASON
    };
  }

  return buildLockedRuntimeResponse(context, interfaceId, payload);
}

/* =============================================================================
   06) END OF FILE
============================================================================= */
