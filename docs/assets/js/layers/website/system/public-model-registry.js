/* =============================================================================
   00) FILE INDEX
   01) MODULE IDENTITY
   02) IMPORTS
   03) MODULE STATE
   04) HELPERS
   05) DATA LOADERS
   06) MODEL HELPERS
   07) SEARCH HELPERS
   08) END OF FILE
============================================================================= */

/* =============================================================================
   01) MODULE IDENTITY
============================================================================= */
/* /website/docs/assets/js/layers/website/system/public-model-registry.js */

/* =============================================================================
   02) IMPORTS
============================================================================= */
import { normalizeString, normalizeUsername } from './account-profile-identity.js';

/* =============================================================================
   03) MODULE STATE
============================================================================= */
const PUBLIC_MODEL_REGISTRY_URL = '/assets/data/profiles/public-models.json';
const FOUNDER_DATA_URL = '/assets/data/company/founder.json';

const PUBLIC_MODEL_REGISTRY_STATE = {
  registry: null,
  founder: null,
  promise: null
};

/* =============================================================================
   04) HELPERS
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

function buildPublicProfileFromModel(model, founder) {
  if (model?.public_profile && typeof model.public_profile === 'object') {
    return {
      ...model.public_profile
    };
  }

  const displayName = normalizeString(model.display_name || founder?.display_name || founder?.public_name || model.search_title || '');
  const username = normalizeUsername(model.username || founder?.username || '');

  if (!username) {
    return null;
  }

  return {
    public_username: username,
    public_display_name: displayName,
    public_avatar_url: normalizeString(founder?.image || ''),
    public_identity_label: normalizeString(model.identity_label || 'Public continuity model'),
    public_profile_enabled: model.public_route_enabled === true,
    public_profile_discoverable: model.public_route_discoverable === true,
    public_profile_visibility: model.public_route_enabled === true ? 'public' : 'limited',
    public_route_path: `/${username}`,
    public_route_canonical_url: `https://neuroartan.com/${username}`,
    public_route_status: model.public_route_enabled === true ? 'ready' : 'pending',
    public_summary: normalizeString(model.description || ''),
    public_links: []
  };
}

function buildResolvedModel(model, founder) {
  const displayName = normalizeString(
    model.display_name
    || founder?.display_name
    || founder?.public_name
    || model.search_title
  );
  const username = normalizeUsername(model.username || founder?.username || model.public_profile?.public_username || '');
  const publicProfile = buildPublicProfileFromModel(model, founder);
  const publicRoutePath = normalizeString(publicProfile?.public_route_path || model.page_route || '');

  return {
    ...model,
    display_name: displayName,
    username,
    public_profile: publicProfile,
    public_route_path: publicRoutePath,
    search_blob: uniqueStrings([
      displayName,
      model.search_title,
      model.description,
      ...(Array.isArray(model.tags) ? model.tags : []),
      ...(Array.isArray(model.identity_signals) ? model.identity_signals : []),
      founder?.public_name,
      founder?.title,
      founder?.summary
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
   05) DATA LOADERS
============================================================================= */
export async function loadPublicModelRegistry() {
  if (PUBLIC_MODEL_REGISTRY_STATE.registry) {
    return PUBLIC_MODEL_REGISTRY_STATE.registry;
  }

  if (!PUBLIC_MODEL_REGISTRY_STATE.promise) {
    PUBLIC_MODEL_REGISTRY_STATE.promise = Promise.all([
      fetchJson(PUBLIC_MODEL_REGISTRY_URL),
      fetchJson(FOUNDER_DATA_URL).catch(() => null)
    ])
      .then(([registry, founder]) => {
        PUBLIC_MODEL_REGISTRY_STATE.founder = founder;
        PUBLIC_MODEL_REGISTRY_STATE.registry = {
          ...registry,
          models: Array.isArray(registry?.models)
            ? registry.models.map((model) => {
              const resolvedFounder = model.identity_ref && founder?.id === model.identity_ref ? founder : null;
              return buildResolvedModel(model, resolvedFounder);
            })
            : []
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
    models: []
  };
}

/* =============================================================================
   06) MODEL HELPERS
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
   07) SEARCH HELPERS
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
   08) END OF FILE
============================================================================= */
