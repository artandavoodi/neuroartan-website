/* =============================================================================
   00) FILE INDEX
   01) MODULE IMPORTS
   02) MODULE STATE
   03) DEFAULT ROUTE STATE
   04) ROUTE HELPERS
   05) ROUTE STORE
   06) INITIALIZATION
   07) END OF FILE
============================================================================= */

/* =============================================================================
   01) MODULE IMPORTS
============================================================================= */
import {
  buildPublicProfileDisplay,
  buildPublicProfilePath,
  buildPublicProfileUrl,
  getProfileIdentityPolicy,
  getPublicRouteConfig,
  loadProfileIdentityPolicy,
  normalizeString,
  normalizeUsername,
  validateUsernameLocally
} from './account-profile-identity.js';
import {
  getPublicModelByUsername,
  loadPublicModelRegistry
} from './public-model-registry.js';

/* =============================================================================
   02) MODULE STATE
============================================================================= */
const RUNTIME = (window.__NEUROARTAN_PROFILE_ROUTER__ ||= {
  initialized: false,
  route: null,
  subscribers: new Set()
});

/* =============================================================================
   03) DEFAULT ROUTE STATE
============================================================================= */
function createDefaultRouteState() {
  return {
    pathname: normalizeString(window.location.pathname || '/') || '/',
    routeCandidate: '',
    normalizedUsername: '',
    publicRoutePath: '',
    publicRouteUrl: '',
    publicRouteDisplay: '',
    handleAsPublicRoute: false,
    protectedCollision: false,
    outcome: 'not_candidate',
    reason: ''
  };
}

/* =============================================================================
   04) ROUTE HELPERS
============================================================================= */
function decodePathSegment(segment) {
  try {
    return decodeURIComponent(segment || '');
  } catch (_) {
    return normalizeString(segment);
  }
}

function splitPathSegments(pathname) {
  return normalizeString(pathname || '/')
    .split('?')[0]
    .split('#')[0]
    .replace(/^\/+|\/+$/g, '')
    .split('/')
    .filter(Boolean);
}

function buildRouteStateForCandidate(candidate, policy) {
  const localValidation = validateUsernameLocally(candidate, policy);
  const normalizedUsername = normalizeUsername(candidate);
  const publicRoutePath = buildPublicProfilePath(normalizedUsername, policy);
  const publicRouteUrl = buildPublicProfileUrl(normalizedUsername, policy);
  const publicRouteDisplay = buildPublicProfileDisplay(normalizedUsername || candidate, policy);

  if (!localValidation.ok) {
    return {
      routeCandidate: candidate,
      normalizedUsername,
      publicRoutePath,
      publicRouteUrl,
      publicRouteDisplay,
      handleAsPublicRoute: true,
      protectedCollision: false,
      outcome: localValidation.state === 'reserved' || localValidation.state === 'restricted'
        ? 'restricted_username'
        : 'invalid_username',
      reason: localValidation.code || ''
    };
  }

  return {
    routeCandidate: candidate,
    normalizedUsername,
    publicRoutePath,
    publicRouteUrl,
    publicRouteDisplay,
    handleAsPublicRoute: true,
    protectedCollision: false,
    outcome: 'candidate',
    reason: ''
  };
}

function resolvePublicRoute(pathname, policy) {
  const routeConfig = getPublicRouteConfig(policy);
  const segments = splitPathSegments(pathname);
  const baseState = createDefaultRouteState();

  if (!segments.length) {
    return baseState;
  }

  if (segments.length > 1) {
    const joined = segments.join('/').toLowerCase();
    return {
      ...baseState,
      protectedCollision: routeConfig.protectedPrefixes.some((prefix) => joined.startsWith(prefix)),
      outcome: 'not_candidate'
    };
  }

  const routeCandidate = decodePathSegment(segments[0]);
  const routeCandidateLower = normalizeString(routeCandidate).toLowerCase();
  const isProtectedExact = routeConfig.protectedExact.has(routeCandidateLower);
  const looksLikeStaticAsset = routeCandidateLower.includes('.') || routeCandidateLower.startsWith('_');

  if (isProtectedExact || looksLikeStaticAsset) {
    return {
      ...baseState,
      routeCandidate,
      protectedCollision: true,
      outcome: 'not_candidate',
      reason: isProtectedExact ? 'PROTECTED_NAMESPACE' : 'STATIC_ASSET_PATH'
    };
  }

  return {
    ...baseState,
    ...buildRouteStateForCandidate(routeCandidate, policy)
  };
}

/* =============================================================================
   05) ROUTE STORE
============================================================================= */
function notifySubscribers() {
  RUNTIME.subscribers.forEach((subscriber) => {
    try {
      subscriber(getPublicRouteState());
    } catch (error) {
      console.error('[profile-router] Subscriber update failed.', error);
    }
  });
}

function setRoute(nextRoute) {
  RUNTIME.route = {
    ...createDefaultRouteState(),
    ...nextRoute
  };

  document.dispatchEvent(new CustomEvent('profile:public-route-changed', {
    detail: getPublicRouteState()
  }));

  notifySubscribers();
}

export function getPublicRouteState() {
  return RUNTIME.route || createDefaultRouteState();
}

export function subscribePublicRoute(subscriber) {
  if (typeof subscriber !== 'function') {
    return () => {};
  }

  RUNTIME.subscribers.add(subscriber);
  subscriber(getPublicRouteState());

  return () => {
    RUNTIME.subscribers.delete(subscriber);
  };
}

export async function refreshPublicRoute(pathname = window.location.pathname) {
  const policy = await loadProfileIdentityPolicy();
  const resolvedRoute = resolvePublicRoute(pathname, policy);

  if (resolvedRoute.handleAsPublicRoute && resolvedRoute.outcome === 'restricted_username') {
    try {
      await loadPublicModelRegistry();
      const canonicalModel = getPublicModelByUsername(resolvedRoute.normalizedUsername || resolvedRoute.routeCandidate);

      if (canonicalModel?.public_profile?.public_route_path) {
        setRoute({
          ...resolvedRoute,
          outcome: 'candidate',
          reason: '',
          protectedCollision: false
        });
        return getPublicRouteState();
      }
    } catch (_) {}
  }

  setRoute(resolvedRoute);
  return getPublicRouteState();
}

/* =============================================================================
   06) INITIALIZATION
============================================================================= */
function initProfileRouter() {
  if (RUNTIME.initialized) return;
  RUNTIME.initialized = true;

  setRoute(resolvePublicRoute(window.location.pathname, getProfileIdentityPolicy()));
  void refreshPublicRoute();

  window.addEventListener('popstate', () => {
    void refreshPublicRoute();
  });

  document.addEventListener('profile:public-route-refresh-request', () => {
    void refreshPublicRoute();
  });
}

initProfileRouter();

/* =============================================================================
   07) END OF FILE
============================================================================= */
