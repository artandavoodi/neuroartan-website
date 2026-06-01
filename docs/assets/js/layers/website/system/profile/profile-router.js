/* =============================================================================
   00) FILE INDEX
   01) MODULE IMPORTS
   02) MODULE STATE
   03) BACKEND HELPERS
   04) DEFAULT ROUTE STATE
   05) ROUTE HELPERS
   06) ROUTE STORE
   07) INITIALIZATION
   08) END OF FILE
============================================================================= */

/* =============================================================================
   01) MODULE IMPORTS
============================================================================= */
import {
  buildPublicProfileDisplay,
  buildPublicProfilePath,
  buildPublicProfileUrl,
  getProfileIdentityBackendState,
  getProfileIdentityPolicy,
  getPublicRouteConfig,
  getSupabaseProfileByUsername,
  loadProfileIdentityPolicy,
  normalizeString,
  normalizeUsername,
  validateUsernameLocally
} from '../account/identity/account-profile-identity.js';
import {
  getPublicModelRegistryBackendState
} from '../model/public-model-registry.js';

/* =============================================================================
   02) MODULE STATE
============================================================================= */
const SUPABASE_PROFILES_TABLE = 'profiles';

const RUNTIME = (window.__NEUROARTAN_PROFILE_ROUTER__ ||= {
  initialized: false,
  route: null,
  backendState: null,
  subscribers: new Set()
});

/* =============================================================================
   03) BACKEND HELPERS
============================================================================= */
function getSupabaseClient() {
  if (typeof window === 'undefined') return null;
  return window.neuroartanSupabase || null;
}

function hasSupabaseClient() {
  return !!getSupabaseClient();
}

function getProfileRouterBackendState() {
  return {
    supabaseConfigured: hasSupabaseClient(),
    profilesTable: SUPABASE_PROFILES_TABLE,
    profileIdentityBackendState: getProfileIdentityBackendState(),
    publicModelRegistryBackendState: getPublicModelRegistryBackendState(),
    migrationStatus: 'supabase_canonical_public_route_resolution'
  };
}

async function hasCanonicalSupabasePublicRoute(username) {
  const supabase = getSupabaseClient();
  const normalizedUsername = normalizeUsername(username);

  if (!supabase || !normalizedUsername) {
    return false;
  }

  const profile = await getSupabaseProfileByUsername({
    supabase,
    username: normalizedUsername
  });

  if (!profile) {
    return false;
  }

  const publicEnabled = profile.public_profile_enabled === true;
  const publicVisibility = normalizeString(profile.public_profile_visibility || '').toLowerCase();
  const routeStatus = normalizeString(profile.public_route_status || '').toLowerCase();

  return publicEnabled
    && !['hidden', 'private', 'owner_only', 'internal'].includes(publicVisibility)
    && ['ready', 'renderable', 'active'].includes(routeStatus || 'ready');
}

/* =============================================================================
   04) DEFAULT ROUTE STATE
============================================================================= */
function createDefaultRouteState() {
  return {
    pathname: normalizeString(window.location.pathname || '/') || '/',
    routeCandidate: '',
    normalizedUsername: '',
    publicRoutePath: '',
    publicRouteUrl: '',
    publicRouteDisplay: '',
    backendState: RUNTIME.backendState || getProfileRouterBackendState(),
    handleAsPublicRoute: false,
    protectedCollision: false,
    outcome: 'not_candidate',
    reason: ''
  };
}

/* =============================================================================
   05) ROUTE HELPERS
============================================================================= */
/*
 * Transitional rule:
 * Public-route resolution below must preserve policy-restricted usernames as
 * restricted unless canonical backend truth explicitly authorizes them.
 */
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
  const looksLikeStaticAsset = routeCandidateLower.startsWith('_');

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
   06) ROUTE STORE
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
    backendState: RUNTIME.backendState || getProfileRouterBackendState(),
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
  RUNTIME.backendState = getProfileRouterBackendState();
  const resolvedRoute = resolvePublicRoute(pathname, policy);

  if (resolvedRoute.handleAsPublicRoute && resolvedRoute.outcome === 'restricted_username') {
    try {
      const canonicalSupabaseRoute = await hasCanonicalSupabasePublicRoute(
        resolvedRoute.normalizedUsername || resolvedRoute.routeCandidate
      );

      if (canonicalSupabaseRoute) {
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
   07) INITIALIZATION
============================================================================= */
function initProfileRouter() {
  if (RUNTIME.initialized) return;
  RUNTIME.initialized = true;

  RUNTIME.backendState = getProfileRouterBackendState();
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
   08) END OF FILE
============================================================================= */
