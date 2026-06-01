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
  normalizeString
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
    migrationStatus: 'supabase_canonical_public_profile_resolution'
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
/* =============================================================================
   05) STATE HELPERS
============================================================================= */
/*
 * Public-profile resolution is owned exclusively by the live canonical profile
 * backend. The public model registry may enrich a resolved profile, but it must
 * never create or revive a profile route.
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

function buildRenderableState(baseState, resolution, model = null, creator = null) {
  return {
    ...baseState,
    ...resolution,
    loading: false,
    model,
    creator
  };
}

function buildResolutionState(baseState, resolution) {
  return {
    ...baseState,
    ...resolution,
    loading: false,
    model: null,
    creator: null
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
      setState(buildRenderableState(
        {
          ...baseState,
          route
        },
        supabaseResolution,
        registryModel || null,
        registryCreator
      ));
      return;
    }

    if (
      supabaseResolution
      && supabaseResolution.outcome !== 'not_found'
      && supabaseResolution.outcome !== 'error'
    ) {
      setState(buildResolutionState(
        {
          ...baseState,
          route
        },
        supabaseResolution
      ));
      return;
    }

    setState(buildResolutionState(
      {
        ...baseState,
        route
      },
      supabaseResolution || {
        outcome: 'not_found',
        reason: 'PUBLIC_PROFILE_NOT_FOUND'
      }
    ));
    return;
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

/* =============================================================================
   FSC-T-0007) PROFILE-TO-MODEL BIRTH STATE
============================================================================= */

export const PROFILE_MODEL_BIRTH_STATE = Object.freeze({
  profileCreatesCanonicalPersonalModel: true,
  canonicalPersonalModel: "freeByDefault",
  modelBirthIdentity: "required",
  ownerAuthority: "required",
  dignityBoundary: "required",
  publicPrivateIdentityBoundary: "required",
  paidMultiModelPersonalExpansionBlocked: true,
  deviceIntegrityReviewBoundary: "reviewBlocked",
  impersonationPreventionBoundary: "required",
  modelIdentityAntiAbuseBoundary: "required",
  restrictionReviewAppealBoundary: "required"
});
