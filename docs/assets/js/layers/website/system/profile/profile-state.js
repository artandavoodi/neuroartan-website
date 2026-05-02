/* =============================================================================
   00) FILE INDEX
   01) MODULE IMPORTS
   02) MODULE STATE
   03) BACKEND HELPERS
   04) FIREBASE CONTINUITY HELPERS
   05) STATE HELPERS
   06) STATE STORE
   07) ROUTE RESOLUTION
   08) INITIALIZATION
   09) END OF FILE
============================================================================= */

/* =============================================================================
   01) MODULE IMPORTS
============================================================================= */
import {
  buildPublicProfileModel,
  getProfileIdentityBackendState,
  getSupabaseClient as getProfileIdentitySupabaseClient,
  getSupabaseProfileByUsername,
  loadProfileIdentityPolicy,
  normalizeString,
  resolvePublicProfileByUsername
} from '../account/identity/account-profile-identity.js';
import {
  getPublicModelByUsername,
  getPublicModelRegistryBackendState,
  loadPublicModelRegistry
} from '../model/public-model-registry.js';
import {
  getPublicRouteState,
  subscribePublicRoute
} from './profile-router.js';

/* =============================================================================
   02) MODULE STATE
============================================================================= */
const SUPABASE_PROFILES_TABLE = 'profiles';

const RUNTIME = (window.__NEUROARTAN_PROFILE_STATE__ ||= {
  initialized: false,
  requestId: 0,
  state: null,
  backendState: null,
  subscribers: new Set()
});

/* =============================================================================
   03) BACKEND HELPERS
============================================================================= */
function getSupabaseClient() {
  return getProfileIdentitySupabaseClient();
}

function hasSupabaseClient() {
  return !!getSupabaseClient();
}

function getProfileStateBackendState() {
  return {
    supabaseConfigured: hasSupabaseClient(),
    profilesTable: SUPABASE_PROFILES_TABLE,
    profileIdentityBackendState: getProfileIdentityBackendState(),
    publicModelRegistryBackendState: getPublicModelRegistryBackendState(),
    migrationStatus: 'transitional_public_profile_resolution_continuity'
  };
}

async function resolveSupabasePublicProfileByUsername(route, policy) {
  const supabase = getSupabaseClient();
  const normalizedUsername = normalizeString(route.normalizedUsername || route.routeCandidate || '');

  if (!supabase || !normalizedUsername) {
    return null;
  }

  const profile = await getSupabaseProfileByUsername({
    supabase,
    username: normalizedUsername
  });

  if (!profile) {
    return {
      outcome: 'not_found',
      username: normalizedUsername,
      normalizedUsername,
      publicRoutePath: route.publicRoutePath || '',
      publicRouteUrl: route.publicRouteUrl || '',
      publicRouteDisplay: route.publicRouteDisplay || '',
      publicProfile: null,
      reason: 'PUBLIC_PROFILE_NOT_FOUND'
    };
  }

  const publicProfile = buildPublicProfileModel(profile, policy);
  const publicEnabled = profile.public_profile_enabled === true;
  const publicVisibility = normalizeString(profile.public_profile_visibility || '').toLowerCase();
  const routeStatus = normalizeString(profile.public_route_status || '').toLowerCase();
  const renderable = publicEnabled
    && !['hidden', 'private', 'owner_only', 'internal'].includes(publicVisibility)
    && ['ready', 'renderable', 'active'].includes(routeStatus || 'ready');

  return {
    outcome: renderable
      ? 'found_renderable'
      : publicEnabled
        ? 'reserved_but_not_ready'
        : 'reserved_but_disabled',
    username: normalizedUsername,
    normalizedUsername,
    publicRoutePath: route.publicRoutePath || '',
    publicRouteUrl: route.publicRouteUrl || '',
    publicRouteDisplay: route.publicRouteDisplay || '',
    publicProfile: renderable ? publicProfile : null,
    reason: renderable ? '' : 'PUBLIC_ROUTE_NOT_PUBLISHED'
  };
}

/* =============================================================================
   04) FIREBASE CONTINUITY HELPERS
============================================================================= */
function hasFirestore() {
  return !!(window.firebase && typeof window.firebase.firestore === 'function');
}

function getFirestore() {
  if (!hasFirestore()) return null;

  try {
    return window.firebase.firestore();
  } catch (_) {
    return null;
  }
}

async function waitForFirebaseReady(timeoutMs = 1200) {
  if (hasFirestore()) return true;

  return new Promise((resolve) => {
    let settled = false;

    const finish = (value) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      document.removeEventListener('neuroartan:firebase-ready', handleReady);
      resolve(value);
    };

    const handleReady = () => {
      finish(hasFirestore());
    };

    const timeoutId = window.setTimeout(() => {
      finish(false);
    }, timeoutMs);

    document.addEventListener('neuroartan:firebase-ready', handleReady);
  });
}

/* =============================================================================
   05) STATE HELPERS
============================================================================= */
/*
 * Transitional rule:
 * Public-profile resolution below must now prefer Supabase-backed canonical
 * profile truth, while Firestore and static registry fallbacks remain tolerated
 * continuity only for still-unmigrated scopes. This file must not silently
 * treat Firebase, browser-local continuity, or static projection layers as the
 * canonical owner of public profile truth.
 */
function buildBaseState(route = getPublicRouteState()) {
  return {
    route,
    loading: false,
    outcome: route.outcome || 'not_candidate',
    username: route.routeCandidate || '',
    normalizedUsername: route.normalizedUsername || '',
    publicRoutePath: route.publicRoutePath || '',
    publicRouteUrl: route.publicRouteUrl || '',
    publicRouteDisplay: route.publicRouteDisplay || '',
    backendState: RUNTIME.backendState || getProfileStateBackendState(),
    publicProfile: null,
    model: null,
    creator: null,
    reason: route.reason || '',
    error: ''
  };
}

function buildErrorState(route, reason, errorMessage = '') {
  return {
    ...buildBaseState(route),
    outcome: 'error',
    reason,
    error: normalizeString(errorMessage)
  };
}

async function buildRegistryResolutionState(route) {
  const baseState = buildBaseState(route);

  try {
    await loadPublicModelRegistry();
  } catch (_) {
    return {
      ...baseState,
      outcome: 'not_found',
      reason: 'PUBLIC_MODEL_REGISTRY_UNAVAILABLE'
    };
  }

  const model = getPublicModelByUsername(route.normalizedUsername || route.routeCandidate);
  const publicProfile = model?.public_profile && typeof model.public_profile === 'object'
    ? { ...model.public_profile }
    : null;

  if (!publicProfile) {
    return {
      ...baseState,
      outcome: 'not_found',
      reason: 'PUBLIC_MODEL_NOT_FOUND'
    };
  }

  const routeStatus = normalizeString(publicProfile.public_route_status || 'ready').toLowerCase();
  const publicEnabled = publicProfile.public_profile_enabled === true;
  const publicVisibility = normalizeString(publicProfile.public_profile_visibility || '').toLowerCase();
  const renderable = publicEnabled
    && !['hidden', 'private', 'owner_only', 'internal'].includes(publicVisibility)
    && ['ready', 'renderable', 'active'].includes(routeStatus || 'ready');

  return {
    ...baseState,
    backendState: RUNTIME.backendState || getProfileStateBackendState(),
    outcome: renderable
      ? 'found_renderable'
      : publicEnabled
        ? 'reserved_but_not_ready'
        : 'reserved_but_disabled',
    publicProfile: {
      ...publicProfile,
      public_profile_visibility: normalizeString(publicProfile.public_profile_visibility || (publicEnabled ? 'public' : 'private')).toLowerCase(),
      public_route_path: normalizeString(publicProfile.public_route_path || route.publicRoutePath),
      public_route_canonical_url: normalizeString(publicProfile.public_route_canonical_url || route.publicRouteUrl)
    },
    model: model || null,
    creator: model?.creator || null,
    reason: renderable ? '' : 'PUBLIC_ROUTE_NOT_PUBLISHED'
  };
}

/* =============================================================================
   06) STATE STORE
============================================================================= */
function notifySubscribers() {
  RUNTIME.subscribers.forEach((subscriber) => {
    try {
      subscriber(getPublicProfileState());
    } catch (error) {
      console.error('[profile-state] Subscriber update failed.', error);
    }
  });
}

function setState(nextState) {
  RUNTIME.state = nextState;

  document.dispatchEvent(new CustomEvent('profile:public-state-changed', {
    detail: getPublicProfileState()
  }));

  notifySubscribers();
}

export function getPublicProfileState() {
  return RUNTIME.state || buildBaseState();
}

export function subscribePublicProfileState(subscriber) {
  if (typeof subscriber !== 'function') {
    return () => {};
  }

  RUNTIME.subscribers.add(subscriber);
  subscriber(getPublicProfileState());

  return () => {
    RUNTIME.subscribers.delete(subscriber);
  };
}

/* =============================================================================
   07) ROUTE RESOLUTION
============================================================================= */
async function resolveStateForRoute(route) {
  const requestId = ++RUNTIME.requestId;
  const baseState = buildBaseState(route);
  RUNTIME.backendState = getProfileStateBackendState();
  let registryModel = null;
  let registryCreator = null;

  try {
    await loadPublicModelRegistry();
    registryModel = getPublicModelByUsername(route.normalizedUsername || route.routeCandidate);
    registryCreator = registryModel?.creator || null;
  } catch (_) {}

  if (!route.handleAsPublicRoute) {
    setState(baseState);
    return;
  }

  if (route.outcome !== 'candidate') {
    setState(baseState);
    return;
  }

  setState({
    ...baseState,
    loading: true,
    outcome: 'loading'
  });

  const policy = await loadProfileIdentityPolicy();

  if (requestId !== RUNTIME.requestId) return;

  try {
    const supabaseResolution = await resolveSupabasePublicProfileByUsername(route, policy);

    if (requestId !== RUNTIME.requestId) return;

    if (supabaseResolution?.outcome === 'found_renderable') {
      setState({
        ...baseState,
        ...supabaseResolution,
        loading: false,
        route,
        model: registryModel || null,
        creator: registryCreator
      });
      return;
    }

    if (
      supabaseResolution
      && supabaseResolution.outcome !== 'not_found'
      && supabaseResolution.outcome !== 'error'
    ) {
      setState({
        ...baseState,
        ...supabaseResolution,
        loading: false,
        route,
        model: null,
        creator: null
      });
      return;
    }

    const firebaseReady = await waitForFirebaseReady();

    if (requestId !== RUNTIME.requestId) return;

    if (!firebaseReady) {
      setState(await buildRegistryResolutionState(route));
      return;
    }

    const firestore = getFirestore();
    if (!firestore) {
      setState(await buildRegistryResolutionState(route));
      return;
    }

    const resolution = await resolvePublicProfileByUsername({
      firestore,
      username: route.normalizedUsername || route.routeCandidate,
      policy
    });

    if (requestId !== RUNTIME.requestId) return;

    if (resolution.outcome !== 'found_renderable') {
      const registryResolution = await buildRegistryResolutionState(route);

      if (requestId !== RUNTIME.requestId) return;

      if (registryResolution.outcome === 'found_renderable' && resolution.outcome === 'not_found') {
        setState(registryResolution);
        return;
      }
    }

    setState({
      ...baseState,
      ...resolution,
      loading: false,
      route,
      model: resolution.outcome === 'found_renderable' ? (registryModel || null) : null,
      creator: resolution.outcome === 'found_renderable' ? registryCreator : null
    });
  } catch (error) {
    if (requestId !== RUNTIME.requestId) return;

    setState(buildErrorState(
      route,
      normalizeString(error?.code || 'PUBLIC_PROFILE_RESOLUTION_FAILED'),
      error?.message || ''
    ));
  }
}

export async function refreshPublicProfileState(route = getPublicRouteState()) {
  await resolveStateForRoute(route);
  return getPublicProfileState();
}

/* =============================================================================
   08) INITIALIZATION
============================================================================= */
function initProfileState() {
  if (RUNTIME.initialized) return;
  RUNTIME.initialized = true;
  RUNTIME.backendState = getProfileStateBackendState();
  setState(buildBaseState(getPublicRouteState()));

  subscribePublicRoute((route) => {
    void resolveStateForRoute(route);
  });
}

initProfileState();

/* =============================================================================
   09) END OF FILE
============================================================================= */
