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
const PUBLIC_MODEL_DIRECTORY_VIEW = 'public_model_directory';
const PUBLIC_PROFILE_NOT_FOUND_RETRY_DELAYS_MS = Object.freeze([0, 400, 800, 1200]);

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

function isSupabaseClientInitializationPending() {
  const supabase = window.NEUROARTAN_CONFIG?.supabase || {};
  return Boolean(supabase.url && supabase.anonKey) && !hasSupabaseClient();
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
  const publicModel = await resolveSupabasePublicModelForProfile(profile, normalizedUsername);
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
    publicProfile: renderable ? {
      ...publicProfile,
      model: publicModel,
      public_model: publicModel
    } : null,
    model: renderable ? publicModel : null,
    reason: renderable ? '' : 'PUBLIC_ROUTE_NOT_PUBLISHED'
  };
}

async function resolveSupabasePublicModelForProfile(profile = {}, username = '') {
  const supabase = getSupabaseClient();
  const profileId = normalizeString(profile.id || profile.profile_id || '');
  const normalizedUsername = normalizeString(username || profile.username || profile.username_lower || profile.username_normalized || profile.public_username || '');

  if (!supabase || (!profileId && !normalizedUsername)) {
    return null;
  }

  let query = supabase
    .from('models')
    .select('id, profile_id, model_name, description, model_visibility, publication_state, lifecycle_state, readiness_state, verification_state, routing_class, model_slug, model_image_url, model_avatar_color, creator_username, created_at, updated_at')
    .eq('model_visibility', 'public')
    .eq('publication_state', 'published')
    .limit(1);

  if (profileId) {
    query = query.eq('profile_id', profileId);
  } else {
    query = query.eq('creator_username', normalizedUsername);
  }

  const { data, error } = await query.maybeSingle();

  if (error || !data) {
    return null;
  }

  return {
    ...data,
    modelNickname: normalizeString(data.model_nickname || data.nickname || data.display_name || data.model_name || data.model_slug || ''),
    model_nickname: normalizeString(data.model_nickname || data.nickname || data.display_name || data.model_name || data.model_slug || ''),
    display_name: normalizeString(data.model_nickname || data.nickname || data.display_name || data.model_name || data.model_slug || ''),
    description: normalizeString(data.description || data.public_description || data.public_summary || data.model_purpose_description || ''),
    public_description: normalizeString(data.description || data.public_description || data.public_summary || data.model_purpose_description || ''),
    public_summary: normalizeString(data.description || data.public_description || data.public_summary || data.model_purpose_description || ''),
    public_avatar_url: normalizeString(data.public_avatar_url || data.model_image_url || data.avatar_url || ''),
    model_image_url: normalizeString(data.model_image_url || data.public_avatar_url || data.avatar_url || ''),
    model_avatar_color: normalizeString(data.model_avatar_color || ''),
    avatar_url: normalizeString(data.avatar_url || data.model_image_url || data.public_avatar_url || ''),
    modelAvatarColor: normalizeString(data.model_avatar_color || ''),
    public_cover_url: normalizeString(data.public_cover_url || data.model_cover_url || data.cover_url || ''),
    model_cover_url: normalizeString(data.model_cover_url || data.public_cover_url || data.cover_url || ''),
    cover_url: normalizeString(data.cover_url || data.model_cover_url || data.public_cover_url || '')
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
    resolved: false,
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
    resolved: true,
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
    resolved: true,
    model,
    creator
  };
}

function mergePublicModelState(primaryModel = null, fallbackModel = null) {
  const primary = primaryModel && typeof primaryModel === 'object' ? primaryModel : {};
  const fallback = fallbackModel && typeof fallbackModel === 'object' ? fallbackModel : {};

  const merged = {
    ...fallback,
    ...primary
  };

  const modelName = normalizeString(
    primary.modelNickname
    || primary.model_nickname
    || primary.model_name
    || primary.display_name
    || primary.name
    || fallback.modelNickname
    || fallback.model_nickname
    || fallback.model_name
    || fallback.display_name
    || fallback.name
    || ''
  );
  const description = normalizeString(
    primary.description
    || primary.public_description
    || primary.public_summary
    || fallback.description
    || fallback.public_description
    || fallback.public_summary
    || ''
  );
  const avatarUrl = normalizeString(
    primary.model_image_url
    || primary.public_avatar_url
    || primary.avatar_url
    || fallback.model_image_url
    || fallback.public_avatar_url
    || fallback.avatar_url
    || ''
  );
  const avatarColor = normalizeString(
    primary.model_avatar_color
    || primary.modelAvatarColor
    || primary.avatar_color
    || fallback.model_avatar_color
    || fallback.modelAvatarColor
    || fallback.avatar_color
    || ''
  );

  const coverUrl = normalizeString(
    primary.model_cover_url
    || primary.public_cover_url
    || primary.cover_url
    || fallback.model_cover_url
    || fallback.public_cover_url
    || fallback.cover_url
    || ''
  );

  if (!Object.keys(merged).length && !modelName && !description && !avatarUrl && !avatarColor && !coverUrl) {
    return null;
  }

  return {
    ...merged,
    modelNickname: modelName,
    model_nickname: modelName,
    display_name: modelName,
    description,
    public_description: description,
    public_summary: description,
    model_image_url: avatarUrl,
    public_avatar_url: avatarUrl,
    model_avatar_color: avatarColor,
    modelAvatarColor: avatarColor,
    avatar_color: avatarColor,
    avatar_url: avatarUrl,
    model_cover_url: coverUrl,
    public_cover_url: coverUrl,
    cover_url: coverUrl
  };
}

function buildResolutionState(baseState, resolution) {
  return {
    ...baseState,
    ...resolution,
    loading: false,
    resolved: true,
    model: null,
    creator: null
  };
}

async function resolveCanonicalPublicProfile(route, policy, requestId) {
  for (const delay of PUBLIC_PROFILE_NOT_FOUND_RETRY_DELAYS_MS) {
    if (delay > 0) {
      await new Promise((resolve) => window.setTimeout(resolve, delay));
    }

    if (requestId !== RUNTIME.requestId) return null;

    const resolution = await resolveSupabasePublicProfileByUsername(route, policy);
    if (resolution?.outcome !== 'not_found') return resolution;
  }

  return {
    outcome: 'not_found',
    reason: 'PUBLIC_PROFILE_NOT_FOUND'
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

  if (!route.handleAsPublicRoute) {
    setState({
      ...baseState,
      resolved: true
    });
    return;
  }

  if (
    isSupabaseClientInitializationPending()
    && ['candidate', 'restricted_username'].includes(route.outcome)
  ) {
    setState({
      ...baseState,
      loading: true,
      outcome: 'loading',
      reason: 'SUPABASE_CLIENT_PENDING'
    });
    return;
  }

  if (route.outcome !== 'candidate') {
    setState({
      ...baseState,
      resolved: hasSupabaseClient()
    });
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
    const supabaseResolution = await resolveCanonicalPublicProfile(route, policy, requestId);

    if (requestId !== RUNTIME.requestId) return;

    if (supabaseResolution?.outcome === 'found_renderable') {
      const resolvedState = buildRenderableState(
        {
          ...baseState,
          route
        },
        supabaseResolution,
        supabaseResolution.model || null
      );

      setState(resolvedState);
      void enrichResolvedProfileWithPublicModel(resolvedState, requestId);
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

async function enrichResolvedProfileWithPublicModel(resolvedState, requestId) {
  try {
    await loadPublicModelRegistry();

    if (requestId !== RUNTIME.requestId) return;

    const currentState = getPublicProfileState();
    if (
      currentState.outcome !== 'found_renderable'
      || currentState.normalizedUsername !== resolvedState.normalizedUsername
    ) {
      return;
    }

    const registryModel = getPublicModelByUsername(resolvedState.normalizedUsername);
    const model = mergePublicModelState(
      currentState.model || resolvedState.model || resolvedState.publicProfile?.model || null,
      registryModel || null
    );
    if (!model) return;

    setState({
      ...currentState,
      model,
      publicProfile: currentState.publicProfile ? {
        ...currentState.publicProfile,
        model,
        public_model: model
      } : currentState.publicProfile,
      creator: model.creator || registryModel?.creator || null
    });
  } catch (_) {
    // Model registry enrichment is optional and must never block profile routing.
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
    const currentState = getPublicProfileState();
    const routeUsername = normalizeString(route?.normalizedUsername || route?.routeCandidate || '');

    if (
      currentState.outcome === 'found_renderable'
      && currentState.resolved === true
      && currentState.normalizedUsername === routeUsername
      && route?.outcome === 'candidate'
    ) {
      return;
    }

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
