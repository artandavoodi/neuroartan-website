/* =============================================================================
   00) FILE INDEX
   01) MODULE IDENTITY
   02) IMPORTS
   03) MODULE STATE
   04) BACKEND HELPERS
   05) HELPERS
   06) DATA LOADERS
   07) MODEL HELPERS
   08) SEARCH HELPERS
   09) END OF FILE
============================================================================= */

/* =============================================================================
   01) MODULE IDENTITY
============================================================================= */
/* /website/docs/assets/js/layers/website/system/public-model-registry.js */

/* =============================================================================
   02) IMPORTS
============================================================================= */
import { normalizeString, normalizeUsername } from '../account/identity/account-profile-identity.js';
import {
  getModelStoreBackendState,
  listPublishedModels
} from './model-store.js';

/* =============================================================================
   03) MODULE STATE
============================================================================= */
const PUBLIC_MODEL_REGISTRY_URL = '/assets/data/profiles/public-models.json';

const PUBLIC_MODEL_REGISTRY_STATE = {
  registry: null,
  promise: null
};

export function invalidatePublicModelRegistry() {
  PUBLIC_MODEL_REGISTRY_STATE.registry = null;
  PUBLIC_MODEL_REGISTRY_STATE.promise = null;
}

if (typeof window !== 'undefined') {
  window.addEventListener('neuroartan:model-public-registry-invalidated', invalidatePublicModelRegistry);
}

/* =============================================================================
   04) BACKEND HELPERS
============================================================================= */
function getSupabaseClient() {
  if (typeof window === 'undefined') return null;
  return window.neuroartanSupabase || null;
}

export function hasPublicModelBackend() {
  return !!getSupabaseClient();
}

export function getPublicModelRegistryBackendState() {
  return {
    supabaseConfigured: hasPublicModelBackend(),
    modelStore: getModelStoreBackendState(),
    migrationStatus: 'supabase_canonical_publication_projection'
  };
}

/* =============================================================================
   05) HELPERS
============================================================================= */
function assetPath(path) {
  const pathname = window.location.pathname || '';
  const base = pathname.includes('/website/docs/')
    ? '/website/docs'
    : pathname.endsWith('/website/docs')
      ? '/website/docs'
      : pathname.includes('/docs/')
        ? '/docs'
        : pathname.endsWith('/docs')
          ? '/docs'
          : '';

  const normalized = normalizeString(path);
  if (!normalized) return '';
  return `${base}${normalized.startsWith('/') ? normalized : `/${normalized}`}`;
}

async function fetchJson(url) {
  const response = await fetch(assetPath(url), { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Failed to load ${url}: HTTP ${response.status}`);
  }
  return response.json();
}

function uniqueStrings(values = []) {
  return Array.from(new Set(values.map((value) => normalizeString(value)).filter(Boolean)));
}

function dedupeResolvedModels(models = []) {
  const byKey = new Map();

  models.forEach((model) => {
    if (!model || typeof model !== 'object') return;

    const idKey = normalizeString(model.id || '');
    const routeKey = normalizeString(model.public_route_path || model.public_profile?.public_route_path || model.page_route || '');
    const usernameKey = normalizeUsername(model.username || model.public_profile?.public_username || '');
    const key = routeKey || usernameKey || idKey;

    if (!key) return;

    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, model);
      return;
    }

    const existingSource = normalizeString(existing.source || 'static');
    const incomingSource = normalizeString(model.source || 'static');
    const existingVisibility = normalizeString(existing.public_profile?.public_profile_visibility || existing.model_visibility || '');
    const incomingVisibility = normalizeString(model.public_profile?.public_profile_visibility || model.model_visibility || '');

    if (existingSource !== 'supabase' && incomingSource === 'supabase') {
      byKey.set(key, model);
      return;
    }

    if (existingSource === incomingSource) {
      if (existingVisibility !== 'public' && incomingVisibility === 'public') {
        byKey.set(key, model);
      }
    }
  });

  return Array.from(byKey.values());
}

function buildResolvedModelFromBackend(model) {
  const displayName = normalizeString(
    model.public_display_name
    || model.display_name
    || model.model_name
    || model.creator_display_name
    || ''
  );
  const username = normalizeUsername(model.creator_username || model.model_slug || '');
  const avatarUrl = normalizeString(model.public_avatar_url || model.model_image_url || '');

  return {
    id: normalizeString(model.id),
    source: 'supabase',
    display_name: displayName,
    search_title: displayName,
    username,
    description: normalizeString(model.description || ''),
    page_route: model.model_slug ? `/pages/models/index.html?model=${encodeURIComponent(model.model_slug)}` : '/pages/models/index.html',
    selectable: true,
    status: normalizeString(model.lifecycle_state || 'draft'),
    readiness_state: normalizeString(model.readiness_state || 'uninitialized'),
    publication_state: normalizeString(model.publication_state || 'unpublished'),
    verification_state: normalizeString(model.verification_state || 'unverified'),
    trust_label: normalizeString(model.verification_state || 'unverified'),
    public_route_enabled: model.model_visibility === 'public' && model.publication_state === 'published',
    public_route_discoverable: model.model_visibility === 'public',
    creator: {
      display_name: normalizeString(model.creator_display_name || ''),
      username,
      title: 'Model owner',
      image: avatarUrl
    },
    public_profile: {
      public_username: username,
      public_display_name: displayName,
      public_avatar_url: avatarUrl,
      public_identity_label: normalizeString(model.routing_class || 'Continuity model'),
      public_profile_enabled: model.model_visibility === 'public',
      public_profile_discoverable: model.model_visibility === 'public',
      public_profile_visibility: model.model_visibility || 'private',
      public_route_path: model.model_slug ? `/models/${model.model_slug}` : '',
      public_route_canonical_url: model.model_slug ? `https://neuroartan.com/models/${model.model_slug}` : '',
      public_route_status: model.publication_state || 'unpublished',
      public_summary: normalizeString(model.description || ''),
      public_links: []
    },
    search_blob: uniqueStrings([
      displayName,
      username,
      model.description,
      model.model_visibility,
      model.readiness_state,
      model.publication_state,
      model.verification_state,
      model.training_state
    ]).join(' ').toLowerCase()
  };
}

function scoreMatch(query, candidate) {
  const normalizedQuery = normalizeString(query).toLowerCase();
  if (!normalizedQuery) return 0;

  const haystack = normalizeString(candidate).toLowerCase();
  if (!haystack) return 0;

  let score = 0;

  if (haystack === normalizedQuery) score += 12;
  if (haystack.startsWith(normalizedQuery)) score += 8;
  if (haystack.includes(normalizedQuery)) score += 5;

  normalizedQuery.split(/\s+/).filter(Boolean).forEach((token) => {
    if (haystack.includes(token)) {
      score += 2;
    }
  });

  return score;
}

/* =============================================================================
   06) DATA LOADERS
============================================================================= */
/*
 * Transitional rule:
 * The static JSON registry owns public-directory metadata only. Model results
 * are projected exclusively from backend-native published model records.
 */
export async function loadPublicModelRegistry() {
  if (PUBLIC_MODEL_REGISTRY_STATE.registry) {
    return PUBLIC_MODEL_REGISTRY_STATE.registry;
  }

  if (!PUBLIC_MODEL_REGISTRY_STATE.promise) {
    PUBLIC_MODEL_REGISTRY_STATE.promise = Promise.all([
      fetchJson(PUBLIC_MODEL_REGISTRY_URL),
      listPublishedModels().catch((error) => {
        console.warn('[public-model-registry] Supabase model projection unavailable.', error);
        return [];
      })
    ])
      .then(([registry, backendModels]) => {
        PUBLIC_MODEL_REGISTRY_STATE.backendState = getPublicModelRegistryBackendState();
        const canonicalModels = Array.isArray(backendModels)
          ? backendModels.map(buildResolvedModelFromBackend).filter(Boolean)
          : [];

        PUBLIC_MODEL_REGISTRY_STATE.registry = {
          ...registry,
          backend_state: getPublicModelRegistryBackendState(),
          models: dedupeResolvedModels(canonicalModels)
        };

        return PUBLIC_MODEL_REGISTRY_STATE.registry;
      })
      .finally(() => {
        PUBLIC_MODEL_REGISTRY_STATE.promise = null;
      });
  }

  return PUBLIC_MODEL_REGISTRY_STATE.promise;
}

export function getPublicModelRegistry() {
  return PUBLIC_MODEL_REGISTRY_STATE.registry || {
    id: 'public-models',
    title: 'Public continuity models',
    description: '',
    backend_state: getPublicModelRegistryBackendState(),
    models: []
  };
}

/* =============================================================================
   07) MODEL HELPERS
============================================================================= */
export function getPublicModels() {
  return [...(getPublicModelRegistry().models || [])];
}

export function getDefaultPublicModelId() {
  return normalizeString(getPublicModelRegistry().default_model_id || '');
}

export function getPublicModelById(modelId) {
  const normalizedId = normalizeString(modelId);
  if (!normalizedId) return null;

  return getPublicModels().find((model) => model.id === normalizedId) || null;
}

export function getPublicModelByUsername(username) {
  const normalized = normalizeUsername(username);
  if (!normalized) return null;

  return getPublicModels().find((model) => model.username === normalized) || null;
}

export function getSelectablePublicModels() {
  return getPublicModels().filter((model) => model.selectable !== false);
}

/* =============================================================================
   08) SEARCH HELPERS
============================================================================= */
export function searchPublicModels(query) {
  const normalizedQuery = normalizeString(query);
  if (!normalizedQuery) return [];

  return getPublicModels()
    .map((model) => ({
      model,
      score:
        scoreMatch(normalizedQuery, model.display_name)
        + scoreMatch(normalizedQuery, model.username)
        + scoreMatch(normalizedQuery, model.search_blob)
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score || left.model.display_name.localeCompare(right.model.display_name))
    .map((entry) => entry.model);
}

/* =============================================================================
   09) END OF FILE
============================================================================= */

/* =============================================================================
   FSC-T-0007) PUBLIC MODEL REGISTRY BOUNDARY
============================================================================= */

export const PUBLIC_MODEL_ECONOMY_BOUNDARY = Object.freeze({
  mayExpose: [
    "publicModelId",
    "displayName",
    "verificationState",
    "publicLifecycleState",
    "marketplaceStateWhereApproved"
  ],
  mustNeverExpose: [
    "privateModelId",
    "privateSerialIdentity",
    "providerRoute",
    "apiRoute",
    "tokenAuthority",
    "sourceAuthorizationEvidence"
  ],
  marketplaceState: "blockedUntilReview"
});
