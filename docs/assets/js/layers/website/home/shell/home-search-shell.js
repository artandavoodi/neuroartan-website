/* =========================================================
   00. FILE INDEX
   01. IMPORTS
   02. MODULE STATE
   03. DOM HELPERS
   04. SEARCH DATA HELPERS
   05. SEARCH RENDER HELPERS
   06. QUERY HELPERS
   07. EVENT BINDING
   08. MODULE BOOT
   ========================================================= */

/* =========================================================
   01. IMPORTS
   ========================================================= */

import {
  activatePublicModel,
  getActiveModelState,
  subscribeActiveModelState
} from '../../system/model/active-model.js';
import {
  createSpeechInputController,
  hasSpeechInputSupport
} from '../../../../core/02-systems/speech-input.js';
import {
  getPublicModels,
  loadPublicModelRegistry
} from '../../system/model/public-model-registry.js';
import {
  buildPublicProfilePath,
  getSupabaseClient,
  getSupabaseProfileByAuthUserId,
  normalizeUsername
} from '../../system/account/identity/account-profile-identity.js';
import {
  resolveApprovedProfileVerification
} from '../../system/profile/profile-verification.js';

/* =========================================================
   02. MODULE STATE
   ========================================================= */

const HOME_SEARCH_SHELL_STATE = {
  isBound: false,
  isOpen: false,
  root: null,
  query: '',
  mode: 'search',
  scope: 'all',
  presentation: 'default',
  filtersOpen: false,
  filters: {
    type: 'all',
    year: 'all',
    modelTrust: 'all',
    modelState: 'all',
    modelScope: 'all',
    modelExpertise: 'all',
    modelYear: 'all',
  },
  dataReady: false,
  loadingPromise: null,
  indexedEntries: [],
  speechController: null,
};

const HOME_SEARCH_DEFAULT_FILTERS = Object.freeze({
  type: 'all',
  year: 'all',
  modelTrust: 'all',
  modelState: 'all',
  modelScope: 'all',
  modelExpertise: 'all',
  modelYear: 'all',
});

const HOME_SEARCH_SHELL_SCOPES = Object.freeze([
  { id: 'all', label: 'All' },
  { id: 'profiles', label: 'Profiles' },
  { id: 'models', label: 'Models' },
  { id: 'content', label: 'Content' },
  { id: 'company', label: 'Company' },
]);

const HOME_SEARCH_VISIBLE_SCOPE_IDS = Object.freeze([
  'all',
  'profiles',
  'models',
  'content',
]);

function getVisibleHomeSearchScopes() {
  return HOME_SEARCH_SHELL_SCOPES.filter((scope) => HOME_SEARCH_VISIBLE_SCOPE_IDS.includes(scope.id));
}

function normalizeHomeSearchScope(value = 'all') {
  const normalized = normalizeHomeSearchQuery(value).toLowerCase();
  return HOME_SEARCH_SHELL_SCOPES.some((scope) => scope.id === normalized) ? normalized : 'all';
}

function getHomeSearchScopeLabel(scope = 'all') {
  return HOME_SEARCH_SHELL_SCOPES.find((entry) => entry.id === normalizeHomeSearchScope(scope))?.label || 'All';
}

function resolveHomeSearchEntryScope(entry = {}) {
  const source = normalizeHomeSearchQuery([
    entry.kind,
    entry.type,
    entry.eyebrow,
    entry.title,
    entry.summary,
    entry.href,
    entry.scope,
    entry.routeScope,
    entry.searchScope,
  ].filter(Boolean).join(' ')).toLowerCase();

  if (source.includes('model')) {
    return 'models';
  }

  if (entry.kind === 'profile') {
    return 'profiles';
  }

  if (
    source.includes('company') ||
    source.includes('about') ||
    source.includes('career') ||
    source.includes('platform') ||
    source.includes('contact') ||
    source.includes('institutional') ||
    source.includes('route')
  ) {
    return 'company';
  }

  return 'content';
}

function filterHomeSearchEntriesByScope(entries = [], scope = 'all') {
  const normalizedScope = normalizeHomeSearchScope(scope);
  if (normalizedScope === 'all') {
    return entries;
  }

  return entries.filter((entry) => resolveHomeSearchEntryScope(entry) === normalizedScope);
}

function normalizeHomeSearchFilterValue(value = '', fallback = 'all') {
  const normalized = normalizeHomeSearchQuery(value).toLowerCase();
  return normalized || fallback;
}

function resolveHomeSearchYear(value = '') {
  const normalized = normalizeHomeSearchQuery(String(value || ''));
  const match = normalized.match(/\b(20\d{2}|19\d{2})\b/);
  return match ? match[1] : '';
}

function resolveHomeSearchFilterType(entry = {}) {
  const explicitType = normalizeHomeSearchFilterValue(entry.filterType || '');
  if (explicitType !== 'all') {
    return explicitType;
  }

  if (entry.kind === 'profile') {
    return 'profile';
  }

  if (entry.kind === 'model') {
    return 'model';
  }

  return 'page';
}

function resolveHomeSearchFilterAction(entry = {}) {
  if (normalizeHomeSearchQuery(entry.activateModelId)) {
    return 'interact';
  }

  if (normalizeHomeSearchQuery(entry.publicRoute)) {
    return 'profile';
  }

  if (normalizeHomeSearchQuery(entry.href)) {
    return 'open';
  }

  return 'open';
}

function matchesHomeSearchFilters(entry = {}) {
  const filters = HOME_SEARCH_SHELL_STATE.filters || {};
  const typeFilter = normalizeHomeSearchFilterValue(filters.type);
  const yearFilter = normalizeHomeSearchFilterValue(filters.year);

  if (typeFilter !== 'all' && resolveHomeSearchFilterType(entry) !== typeFilter) {
    return false;
  }

  if (yearFilter !== 'all' && resolveHomeSearchYear(entry.year) !== yearFilter) {
    return false;
  }

  // Model-specific filters (only apply when type is 'model')
  if (typeFilter === 'model' || typeFilter === 'all') {
    const modelTrustFilter = normalizeHomeSearchFilterValue(filters.modelTrust);
    const modelStateFilter = normalizeHomeSearchFilterValue(filters.modelState);
    const modelScopeFilter = normalizeHomeSearchFilterValue(filters.modelScope);
    const modelExpertiseFilter = normalizeHomeSearchFilterValue(filters.modelExpertise);
    const modelYearFilter = normalizeHomeSearchFilterValue(filters.modelYear);

    // Only apply model filters if entry is a model
    if (resolveHomeSearchFilterType(entry) === 'model') {
      if (modelTrustFilter !== 'all') {
        if (modelTrustFilter === 'verified' && !entry.verified) {
          return false;
        }
        if (modelTrustFilter === 'not-verified' && entry.verified) {
          return false;
        }
      }

      if (modelStateFilter !== 'all' && entry.modelState !== modelStateFilter) {
        return false;
      }

      if (modelScopeFilter !== 'all' && entry.modelScope !== modelScopeFilter) {
        return false;
      }

      if (modelExpertiseFilter !== 'all' && entry.modelExpertise !== modelExpertiseFilter) {
        return false;
      }

      if (modelYearFilter !== 'all' && resolveHomeSearchYear(entry.year) !== modelYearFilter) {
        return false;
      }
    }
  }

  return true;
}

function applyHomeSearchFilters(entries = []) {
  return entries.filter((entry) => matchesHomeSearchFilters(entry));
}

function syncHomeSearchScopeChrome() {
  const root = getLiveSearchShellRoot();
  if (!root) return;

  const scope = normalizeHomeSearchScope(HOME_SEARCH_SHELL_STATE.scope);
  const modelDirectoryPresentation = HOME_SEARCH_SHELL_STATE.presentation === 'model-directory';
  const input = root.querySelector('#home-search-shell-input');
  const tabs = root.querySelectorAll('[data-home-search-scope]');
  const filterPanel = root.querySelector('[data-home-search-filter-panel]');

  if (input instanceof HTMLInputElement) {
    input.placeholder = scope === 'all'
      ? 'Explore'
      : `Explore ${getHomeSearchScopeLabel(scope)}`;
  }

  tabs.forEach((tab) => {
    const tabScope = normalizeHomeSearchScope(tab.getAttribute('data-home-search-scope') || 'all');
    const active = tabScope === scope;
    tab.hidden = modelDirectoryPresentation && tabScope !== 'models';
    tab.classList.toggle('home-search-shell__scope-tab--active', active);
    tab.setAttribute('aria-pressed', active ? 'true' : 'false');
  });

  // Update filter panel data-filter-type based on scope
  if (filterPanel instanceof HTMLElement) {
    const filterType = scope === 'models' ? 'model' : 'all';
    filterPanel.setAttribute('data-filter-type', filterType);
  }

  syncHomeSearchClearButton();
  syncHomeSearchFilterChrome();
}

function syncHomeSearchClearButton() {
  const root = getLiveSearchShellRoot();
  if (!root) return;

  const clearButton = root.querySelector('[data-home-search-clear]');
  if (!(clearButton instanceof HTMLButtonElement)) return;

  clearButton.hidden = !normalizeHomeSearchQuery(HOME_SEARCH_SHELL_STATE.query);
}

function syncHomeSearchFilterChrome() {
  const root = getLiveSearchShellRoot();
  if (!root) return;

  const filterButton = root.querySelector('[data-home-search-filter]');
  const filterPanel = root.querySelector('[data-home-search-filter-panel]');
  const filterChips = root.querySelectorAll('[data-home-search-filter-option]');

  if (filterButton instanceof HTMLButtonElement) {
    filterButton.setAttribute('aria-pressed', HOME_SEARCH_SHELL_STATE.filtersOpen ? 'true' : 'false');
  }

  if (filterPanel instanceof HTMLElement) {
    filterPanel.hidden = !HOME_SEARCH_SHELL_STATE.filtersOpen;
    // Set data-filter-type based on scope (models) or type filter
    const scope = normalizeHomeSearchScope(HOME_SEARCH_SHELL_STATE.scope);
    const typeFilter = normalizeHomeSearchFilterValue(HOME_SEARCH_SHELL_STATE.filters?.type) || 'all';
    const filterType = scope === 'models' ? 'model' : typeFilter;
    filterPanel.setAttribute('data-filter-type', filterType);
  }

  filterChips.forEach((chip) => {
    const key = normalizeHomeSearchFilterValue(chip.getAttribute('data-home-search-filter-option') || '');
    const value = normalizeHomeSearchFilterValue(chip.getAttribute('data-home-search-filter-value') || '');
    const active = normalizeHomeSearchFilterValue(HOME_SEARCH_SHELL_STATE.filters?.[key]) === value;
    chip.classList.toggle('home-search-shell__filter-chip--active', active);
    chip.setAttribute('aria-pressed', active ? 'true' : 'false');
  });

  const filterSelects = root.querySelectorAll('[data-home-search-filter-option]');
  filterSelects.forEach((select) => {
    if (select.tagName === 'SELECT') {
      const key = normalizeHomeSearchFilterValue(select.getAttribute('data-home-search-filter-option') || '');
      const currentValue = normalizeHomeSearchFilterValue(HOME_SEARCH_SHELL_STATE.filters?.[key]) || 'all';
      select.value = currentValue;
    }
  });
}

function resetHomeSearchFilters() {
  HOME_SEARCH_SHELL_STATE.filters = { ...HOME_SEARCH_DEFAULT_FILTERS };
  renderHomeSearchShell();
}

function syncHomeSearchRailAskAction(isVisible = false) {
  const root = getLiveSearchShellRoot();
  if (!root) return;

  const askButton = root.querySelector('[data-home-search-rail-ask]');
  if (!(askButton instanceof HTMLButtonElement)) return;

  askButton.hidden = !isVisible;
  if (!isVisible) return;

  const activeModelLabel = getActiveModelLabel();
  askButton.textContent = `Ask ${activeModelLabel}`;
}

function handleHomeSearchScopeSelection(scope = 'all') {
  HOME_SEARCH_SHELL_STATE.scope = normalizeHomeSearchScope(scope);
  renderHomeSearchShell();
  getHomeSearchShellNodes().input?.focus();
}

const HOME_SEARCH_SHELL_INDEX_SOURCES = Object.freeze({
  routeIndex: '/assets/data/search/route-index.json',
  contentIndex: '/assets/data/search/content-index.json',
});

const HOME_SEARCH_PROFILE_SELECT_FIELDS = [
  'id',
  'auth_user_id',
  'username',
  'username_lower',
  'username_normalized',
  'public_username',
  'display_name',
  'public_display_name',
  'first_name',
  'last_name',
  'email',
  'bio',
  'public_bio',
  'public_summary',
  'avatar_url',
  'photo_url',
  'public_avatar_url',
  'public_profile_enabled',
  'public_profile_discoverable',
  'public_route_status',
  'profile_search_visible',
  'profile_verified',
  'verification_state',
  'verification_status',
  'public_verification_status',
  'verified_at',
  'profile_verified_at',
  'created_at',
  'updated_at'
].join(', ');

const HOME_SEARCH_PROFILE_FALLBACK_SELECT_FIELDS = HOME_SEARCH_PROFILE_SELECT_FIELDS
  .split(',')
  .map((field) => field.trim())
  .filter((field) => field !== 'profile_search_visible' && field !== 'bio')
  .join(', ');

const HOME_SEARCH_PROFILE_MINIMAL_SELECT_FIELDS = [
  'id',
  'auth_user_id',
  'username',
  'username_lower',
  'display_name',
  'email',
  'avatar_url',
  'created_at',
  'updated_at'
].join(', ');

function isHomeSearchSupabaseMissingColumn(error) {
  const code = normalizeHomeSearchQuery(error?.code || '').toUpperCase();
  const message = normalizeHomeSearchQuery(error?.message || '').toLowerCase();
  const details = normalizeHomeSearchQuery(error?.details || '').toLowerCase();

  return (
    code === '42703'
    || message.includes('column')
    || message.includes('could not find')
    || details.includes('column')
    || details.includes('could not find')
  );
}

/* =========================================================
   03. DOM HELPERS
   ========================================================= */

function getHomeSearchShellNodes() {
  return {
    shell: document.querySelector('#home-search-shell'),
    input: document.querySelector('#home-search-shell-input'),
    form: document.querySelector('#home-search-shell-form'),
    close: document.querySelector('#home-search-shell-close'),
    voiceButton: document.querySelector('#home-search-shell-voice-button'),
    clearButton: document.querySelector('[data-home-search-clear]'),
    filterButton: document.querySelector('[data-home-search-filter]'),
    filterPanel: document.querySelector('[data-home-search-filter-panel]'),
    results: document.querySelector('#home-search-shell-results'),
    chips: Array.from(document.querySelectorAll('[data-home-search-scope]')),
  };
}

function getLiveSearchShellRoot() {
  return document.querySelector('#home-search-shell');
}

async function ensureHomeSearchShellRoot() {
  const existingRoot = getLiveSearchShellRoot();
  if (existingRoot) return existingRoot;

  let mount = document.querySelector('[data-home-search-shell-mount], #home-search-shell-mount');
  if (!(mount instanceof HTMLElement)) {
    mount = document.createElement('div');
    mount.id = 'home-search-shell-mount';
    mount.setAttribute('data-home-search-shell-mount', '');
    document.body.appendChild(mount);
  }

  try {
    const response = await fetch('/assets/fragments/layers/website/home/shell/home-search-shell.html', {
      cache: 'no-store',
      credentials: 'same-origin'
    });

    if (!response.ok) {
      throw new Error(`Failed to load home search shell fragment: HTTP ${response.status}`);
    }

    mount.innerHTML = await response.text();
    document.dispatchEvent(new CustomEvent('fragment:mounted', {
      detail: { name:'home-search-shell', root:mount }
    }));
    return getLiveSearchShellRoot();
  } catch (error) {
    console.error('[home-search-shell] Failed to mount universal search shell.', error);
    return null;
  }
}

function dispatchHomeSearchEvent(name, detail = {}) {
  document.dispatchEvent(new CustomEvent(name, { detail }));
}

function fetchHomeSearchJson(path) {
  return fetch(path, {
    cache: 'no-store',
    credentials: 'same-origin'
  }).then((response) => {
    if (!response.ok) {
      throw new Error(`Failed to load ${path}: HTTP ${response.status}`);
    }

    return response.json();
  });
}

function isHomeSearchSupabaseRelationMissing(error) {
  const code = normalizeHomeSearchQuery(error?.code || '').toUpperCase();
  const message = normalizeHomeSearchQuery(error?.message || '').toLowerCase();
  return code === '42P01' || message.includes('does not exist');
}

async function fetchCurrentHomeSearchProfile(supabase) {
  if (!supabase) return null;

  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    const authUserId = normalizeHomeSearchQuery(data?.session?.user?.id || '');
    if (!authUserId) return null;
    return getSupabaseProfileByAuthUserId({
      supabase,
      authUserId
    });
  } catch (error) {
    console.error('[home-search-shell] Current profile search lookup failed.', error);
    return null;
  }
}

function mapSupabaseProfileSearchEntry(profile = {}, currentAuthUserId = '') {
  if (!profile || typeof profile !== 'object') return null;

  const username = normalizeUsername(
    profile.username
    || profile.username_normalized
    || profile.username_lower
    || profile.public_username
    || ''
  );
  const ownProfile = currentAuthUserId && normalizeHomeSearchQuery(profile.auth_user_id || '') === currentAuthUserId;
  const publicEnabled = profile.public_profile_enabled === true;
  const discoverable = profile.public_profile_discoverable === true;
  const searchVisible = profile.profile_search_visible !== false;

  if (!username || (!ownProfile && !(publicEnabled && discoverable && searchVisible))) {
    return null;
  }

  const displayName = normalizeHomeSearchQuery(
    profile.public_display_name
    || profile.display_name
    || [profile.first_name, profile.last_name].filter(Boolean).join(' ')
    || username
    || 'Profile'
  );
  const summary = normalizeHomeSearchQuery(profile.public_summary || profile.public_bio || profile.bio || '');
  const verification = resolveApprovedProfileVerification(profile);

  return buildIndexedEntry({
    id: profile.id || profile.auth_user_id || username,
    title: displayName,
    username,
    summary,
    public_avatar_url: profile.public_avatar_url || profile.avatar_url || profile.photo_url || '',
    verified: verification.verified,
    created_at: profile.created_at,
    updated_at: profile.updated_at,
    keywords: [
      profile.email,
      profile.first_name,
      profile.last_name,
      profile.public_identity_label,
      username,
      `@${username}`,
      buildPublicProfilePath(username)
    ].filter(Boolean)
  }, {
    keyPrefix:'supabase-profile',
    kind:'profile',
    scope:'profiles'
  });
}

async function fetchSupabaseProfileSearchEntries() {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  try {
    const { data:sessionData } = await supabase.auth.getSession();
    const currentAuthUserId = normalizeHomeSearchQuery(sessionData?.session?.user?.id || '');
    let queryResult = await supabase
      .from('profiles')
      .select('*')
      .order('updated_at', { ascending:false })
      .limit(100);

    if (queryResult.error && isHomeSearchSupabaseMissingColumn(queryResult.error)) {
      queryResult = await supabase
        .from('profiles')
        .select(HOME_SEARCH_PROFILE_FALLBACK_SELECT_FIELDS)
        .order('updated_at', { ascending:false })
        .limit(100);
    }

    if (queryResult.error && isHomeSearchSupabaseMissingColumn(queryResult.error)) {
      queryResult = await supabase
        .from('profiles')
        .select(HOME_SEARCH_PROFILE_MINIMAL_SELECT_FIELDS)
        .order('updated_at', { ascending:false })
        .limit(100);
    }

    if (queryResult.error) {
      if (isHomeSearchSupabaseRelationMissing(queryResult.error)) return [];
      throw queryResult.error;
    }

    const rows = Array.isArray(queryResult.data) ? queryResult.data : [];
    const currentProfile = currentAuthUserId
      ? await fetchCurrentHomeSearchProfile(supabase)
      : null;
    const mergedRows = currentProfile
      ? [currentProfile, ...rows.filter((row) => normalizeHomeSearchQuery(row.id || '') !== normalizeHomeSearchQuery(currentProfile.id || ''))]
      : rows;

    return mergedRows
      .map((profile) => mapSupabaseProfileSearchEntry(profile, currentAuthUserId))
      .filter(Boolean);
  } catch (error) {
    console.error('[home-search-shell] Supabase profile indexing failed.', error);
    return [];
  }
}

/* =========================================================
   04. SEARCH DATA HELPERS
   ========================================================= */

function normalizeHomeSearchQuery(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function escapeHomeSearchHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function normalizeHomeSearchArray(value, preferredKey = '') {
  if (Array.isArray(value)) {
    return value;
  }

  if (value && typeof value === 'object') {
    if (preferredKey && Array.isArray(value[preferredKey])) {
      return value[preferredKey];
    }

    if (Array.isArray(value.entries)) return value.entries;
    if (Array.isArray(value.entities)) return value.entities;
    if (Array.isArray(value.routes)) return value.routes;
  }

  return [];
}

function uniqueHomeSearchStrings(values = []) {
  return Array.from(new Set(values.map((value) => normalizeHomeSearchQuery(value)).filter(Boolean)));
}

function getSearchScopeLabel(scope = '') {
  switch (normalizeHomeSearchQuery(scope).toLowerCase()) {
    case 'root':
      return 'Root';
    case 'institutional':
      return 'Institutional';
    case 'product':
      return 'Product';
    case 'research':
      return 'Research';
    case 'business':
      return 'Business';
    case 'support':
      return 'Support';
    case 'legal':
      return 'Legal';
    case 'profiles':
      return 'Profiles';
    case 'account':
      return 'Account';
    case 'organization':
      return 'Organization';
    case 'profile':
      return 'Profile';
    default:
      return 'Platform';
  }
}

function getActiveModelLabel() {
  const activeModel = getActiveModelState().activeModel;
  return activeModel?.engine?.label || activeModel?.display_name || activeModel?.search_title || 'the active model';
}

function buildModelProfileModelTabRoute(publicRoute = '') {
  const route = normalizeHomeSearchQuery(publicRoute);
  if (!route) return '';
  const [baseRoute] = route.split('#');
  return `${baseRoute || route}#model-management`;
}

function isVerifiedHomeSearchModel(model = {}) {
  const state = normalizeHomeSearchQuery(model.verification_state || model.trust_label || '').toLowerCase();
  return state === 'verified' || state === 'approved';
}

function buildIndexedEntry(entry = {}, {
  keyPrefix = 'entry',
  kind = 'route',
  scope = '',
  title = '',
  summary = '',
  href = '',
  keywords = []
} = {}) {
  const normalizedTitle = normalizeHomeSearchQuery(title || entry.title || entry.label || entry.name || '');
  const normalizedUsername = normalizeHomeSearchQuery(entry.username || entry.handle || entry.slug || '');
  const canonicalProfileHref = kind === 'profile' && normalizedUsername
    ? buildPublicProfilePath(normalizedUsername)
    : '';
  const normalizedHref = normalizeHomeSearchQuery(href || entry.path || entry.href || canonicalProfileHref || '');
  const normalizedSummary = normalizeHomeSearchQuery(summary || entry.description || entry.summary || entry.excerpt || '');
  const normalizedScope = normalizeHomeSearchQuery(scope || entry.scope || entry.type || '');
  const normalizedYear = resolveHomeSearchYear(entry.year || entry.joined_year || entry.joinedYear || entry.date || entry.created_at || entry.updated_at || '');
  const verified = Boolean(entry.verified || /verified|governed|self-authored/i.test([
    entry.trust,
    entry.trust_classification,
    entry.status,
    ...(Array.isArray(entry.reliability_signals) ? entry.reliability_signals : [])
  ].join(' ')));
  const normalizedKeywords = uniqueHomeSearchStrings([
    ...(Array.isArray(entry.keywords) ? entry.keywords : []),
    ...(Array.isArray(keywords) ? keywords : [])
  ]);

  if (!normalizedTitle && !normalizedHref) {
    return null;
  }

  return {
    key: `${keyPrefix}:${normalizeHomeSearchQuery(entry.id || normalizedHref || normalizedTitle)}`,
    kind,
    title: normalizedTitle,
    eyebrow: getSearchScopeLabel(normalizedScope),
    summary: normalizedSummary,
    href: normalizedHref,
    publicRoute: kind === 'profile' ? canonicalProfileHref : '',
    activateModelId: '',
    queryLabel: '',
    filterType: kind === 'profile' ? 'profile' : 'page',
    year: normalizedYear,
    verified,
    verificationLabel: verified ? 'Verified' : '',
    avatarUrl: normalizeHomeSearchQuery(entry.photo_url || entry.public_avatar_url || entry.avatar_url || ''),
    username: normalizedUsername,
    keywords: normalizedKeywords,
    scoreTokens: uniqueHomeSearchStrings([
      normalizedTitle,
      normalizedUsername,
      normalizedUsername ? `@${normalizedUsername}` : '',
      normalizedHref,
      normalizedSummary,
      normalizedScope,
      normalizedYear,
      ...normalizedKeywords
    ]).join(' ').toLowerCase()
  };
}

function buildCuratedSurfaceEntries() {
  return [
    {
      key: 'surface:leadership',
      kind: 'surface',
      title: 'Leadership',
      eyebrow: 'Institutional',
      summary: 'Founder-first leadership surface linked to the real public continuity route.',
      href: '/pages/company/leadership/index.html',
      publicRoute: '',
      activateModelId: '',
      queryLabel: '',
      filterType: 'page',
      year: '',
      verified: false,
      keywords: ['leadership', 'founder', 'artan', 'company'],
      scoreTokens: 'leadership founder artan company'
    },
    {
      key: 'surface:careers',
      kind: 'surface',
      title: 'Careers',
      eyebrow: 'Institutional',
      summary: 'Governed roles, recruitment process, departments, and operating culture.',
      href: '/pages/careers/index.html',
      publicRoute: '',
      activateModelId: '',
      queryLabel: '',
      filterType: 'page',
      year: '',
      verified: false,
      keywords: ['careers', 'jobs', 'roles', 'hiring'],
      scoreTokens: 'careers jobs roles hiring'
    },
    {
      key: 'surface:history',
      kind: 'surface',
      title: 'Continuity History',
      eyebrow: 'Platform',
      summary: 'Searchable continuity archive for product-definition and public-system milestones.',
      href: '/pages/continuity-history/index.html',
      publicRoute: '',
      activateModelId: '',
      queryLabel: '',
      filterType: 'page',
      year: '',
      verified: false,
      keywords: ['continuity history', 'history', 'archive', 'timeline'],
      scoreTokens: 'continuity history history archive timeline'
    },
    {
      key: 'surface:sitemap',
      kind: 'surface',
      title: 'Sitemap',
      eyebrow: 'Platform',
      summary: 'Structured route map of the currently published public surfaces.',
      href: '/pages/sitemap/index.html',
      publicRoute: '',
      activateModelId: '',
      queryLabel: '',
      filterType: 'page',
      year: '',
      verified: false,
      keywords: ['sitemap', 'route map', 'navigation'],
      scoreTokens: 'sitemap route map navigation'
    }
  ];
}

function buildModelSearchEntries() {
  return getPublicModels().map((model) => ({
    key: `model:${model.id}`,
    kind: 'model',
    title: model.display_name || model.search_title || 'Continuity Model',
    eyebrow: '',
    summary: normalizeHomeSearchQuery(model.description || ''),
    href: normalizeHomeSearchQuery(model.page_route || '/pages/profiles/index.html'),
    publicRoute: normalizeHomeSearchQuery(model.public_profile?.public_route_path || ''),
    activateModelId: normalizeHomeSearchQuery(model.id),
    queryLabel: normalizeHomeSearchQuery(model.engine?.label || model.display_name || model.search_title || ''),
    filterType: 'model',
    year: resolveHomeSearchYear(model.joined_year || ''),
    avatarUrl: normalizeHomeSearchQuery(model.public_profile?.public_avatar_url || ''),
    verified: isVerifiedHomeSearchModel(model),
    verificationLabel: isVerifiedHomeSearchModel(model) ? 'Verified' : '',
    keywords: uniqueHomeSearchStrings([
      model.username || '',
      ...(Array.isArray(model.tags) ? model.tags : []),
      ...(Array.isArray(model.identity_signals) ? model.identity_signals : [])
    ]),
    scoreTokens: uniqueHomeSearchStrings([
      model.display_name,
      model.search_title,
      model.username,
      model.description,
      ...(Array.isArray(model.tags) ? model.tags : []),
      ...(Array.isArray(model.identity_signals) ? model.identity_signals : [])
    ]).join(' ').toLowerCase()
  }));
}

function getDefaultModelSearchEntries() {
  return buildModelSearchEntries()
    .sort((left, right) => left.title.localeCompare(right.title))
    .slice(0, 12);
}

function buildHomeSearchEntries() {
  const entryMap = new Map();

  [...buildCuratedSurfaceEntries(), ...buildModelSearchEntries(), ...HOME_SEARCH_SHELL_STATE.indexedEntries].forEach((entry) => {
    if (!entry?.key) {
      return;
    }

    const dedupeKey = `${normalizeHomeSearchQuery(entry.title).toLowerCase()}::${normalizeHomeSearchQuery(entry.href).toLowerCase()}`;
    const existingEntry = entryMap.get(dedupeKey);

    if (!existingEntry) {
      entryMap.set(dedupeKey, entry);
      return;
    }

    const existingPriority = existingEntry.kind === 'model' ? 3 : existingEntry.kind === 'surface' ? 2 : 1;
    const nextPriority = entry.kind === 'model' ? 3 : entry.kind === 'surface' ? 2 : 1;

    if (nextPriority > existingPriority || (entry.summary || '').length > (existingEntry.summary || '').length) {
      entryMap.set(dedupeKey, entry);
    }
  });

  return Array.from(entryMap.values());
}

function scoreHomeSearchMatch(query, entry) {
  const normalizedQuery = normalizeHomeSearchQuery(query).toLowerCase();
  if (!normalizedQuery) {
    return 0;
  }

  const haystack = normalizeHomeSearchQuery(entry.scoreTokens || '').toLowerCase();
  if (!haystack) {
    return 0;
  }

  let score = 0;

  if (haystack === normalizedQuery) score += 12;
  if (haystack.startsWith(normalizedQuery)) score += 8;
  if (haystack.includes(normalizedQuery)) score += 4;

  normalizedQuery.split(/\s+/).filter(Boolean).forEach((token) => {
    if (haystack.includes(token)) {
      score += 2;
    }
  });

  return score;
}

async function ensureHomeSearchData() {
  if (HOME_SEARCH_SHELL_STATE.dataReady) {
    return HOME_SEARCH_SHELL_STATE.indexedEntries;
  }

  if (!HOME_SEARCH_SHELL_STATE.loadingPromise) {
    HOME_SEARCH_SHELL_STATE.loadingPromise = Promise.all([
      loadPublicModelRegistry(),
      fetchHomeSearchJson(HOME_SEARCH_SHELL_INDEX_SOURCES.routeIndex).catch(() => ({ routes: [] })),
      fetchHomeSearchJson(HOME_SEARCH_SHELL_INDEX_SOURCES.contentIndex).catch(() => ({ entries: [] })),
      fetchSupabaseProfileSearchEntries()
    ])
      .then(([, routeIndex, contentIndex, supabaseProfiles]) => {
        HOME_SEARCH_SHELL_STATE.indexedEntries = [
          ...normalizeHomeSearchArray(routeIndex, 'routes')
            .map((entry) => buildIndexedEntry(entry, { keyPrefix: 'route', kind: 'route' }))
            .filter(Boolean),
          ...normalizeHomeSearchArray(contentIndex, 'entries')
            .map((entry) => buildIndexedEntry(entry, { keyPrefix: 'content', kind: 'content' }))
            .filter(Boolean),
          ...(Array.isArray(supabaseProfiles) ? supabaseProfiles : [])
        ];
        HOME_SEARCH_SHELL_STATE.dataReady = true;
        return HOME_SEARCH_SHELL_STATE.indexedEntries;
      })
      .catch(() => {
        HOME_SEARCH_SHELL_STATE.indexedEntries = [];
        HOME_SEARCH_SHELL_STATE.dataReady = true;
        return HOME_SEARCH_SHELL_STATE.indexedEntries;
      })
      .finally(() => {
        HOME_SEARCH_SHELL_STATE.loadingPromise = null;
      });
  }

  return HOME_SEARCH_SHELL_STATE.loadingPromise;
}

document.addEventListener('account:profile-state-changed', () => {
  HOME_SEARCH_SHELL_STATE.dataReady = false;
  HOME_SEARCH_SHELL_STATE.indexedEntries = [];
});

document.addEventListener('account:profile-refresh-request', () => {
  HOME_SEARCH_SHELL_STATE.dataReady = false;
  HOME_SEARCH_SHELL_STATE.indexedEntries = [];
});

window.addEventListener('neuroartan:model-public-registry-invalidated', () => {
  HOME_SEARCH_SHELL_STATE.dataReady = false;
  HOME_SEARCH_SHELL_STATE.indexedEntries = [];
  if (HOME_SEARCH_SHELL_STATE.isOpen) {
    void ensureHomeSearchData().then(() => renderHomeSearchShell());
  }
});

/* =========================================================
   05. SEARCH RENDER HELPERS
   ========================================================= */

function renderHomeSearchResultAvatar(entry = {}) {
  if (!['profile', 'model'].includes(entry.kind)) {
    return '';
  }

  const avatarMarkup = entry.avatarUrl
    ? `<img class="home-search-shell__result-avatar-image" src="${escapeHomeSearchHtml(entry.avatarUrl)}" alt="">`
    : entry.kind === 'model'
      ? '<span class="home-search-shell__result-avatar-fallback home-search-shell__result-avatar-fallback--model"></span>'
      : '<img class="home-search-shell__result-avatar-fallback ui-icon-theme-aware" src="/registry/icons/public/assets/core/identity/profile/profile.svg" alt="">';

  return `
    <span class="home-search-shell__result-avatar${entry.kind === 'model' ? ' home-search-shell__result-avatar--model' : ''}" aria-hidden="true">
      ${avatarMarkup}
    </span>
  `;
}

function renderVerificationBadge(entry = {}) {
  if (!entry?.verified) {
    return '';
  }

  return `
    <span class="catalog-verified-badge home-search-shell__result-badge" aria-label="${escapeHomeSearchHtml(entry.verificationLabel || 'Verified')}">
      <img src="/registry/icons/public/assets/core/identity/trust/verified.svg" alt="" aria-hidden="true">
    </span>
  `;
}

function renderResultChips(keywords = []) {
  const chips = (Array.isArray(keywords) ? keywords : [])
    .slice(0, 4)
    .map((keyword) => `<span class="home-search-shell__result-tag">${escapeHomeSearchHtml(keyword)}</span>`)
    .join('');

  if (!chips) {
    return '';
  }

  return `<div class="home-search-shell__result-tags">${chips}</div>`;
}

function renderDefaultHomeModelResults() {
  const models = applyHomeSearchFilters(getDefaultModelSearchEntries());

  if (!models.length) {
    return `
      <div class="home-search-shell__empty-state" id="home-search-shell-empty-state">
        <p class="home-search-shell__empty-title">No public models available</p>
        <p class="home-search-shell__empty-text">The model registry is loading or currently unavailable.</p>
      </div>
    `;
  }

  return `
    <div class="home-search-shell__result-list">
      ${models.map((entry) => `
        <article class="home-search-shell__result-card">
          <div class="home-search-shell__model-result-layout">
            <div class="home-search-shell__model-result-content">
              <div class="home-search-shell__result-title-row">
                ${renderHomeSearchResultAvatar(entry)}
                ${entry.href ? `<h3 class="home-search-shell__result-title"><a class="home-search-shell__result-title-link" href="${escapeHomeSearchHtml(entry.href)}">${escapeHomeSearchHtml(entry.title)}</a></h3>` : `<h3 class="home-search-shell__result-title">${escapeHomeSearchHtml(entry.title)}</h3>`}
                ${renderVerificationBadge(entry)}
              </div>
            </div>
            <div class="home-search-shell__result-actions home-search-shell__result-actions--model">
              ${entry.activateModelId ? `<button class="home-search-shell__result-icon-action" data-home-search-result-action="activate-model" data-home-search-model-id="${escapeHomeSearchHtml(entry.activateModelId)}" data-home-search-tooltip="Interact on Stage" type="button" aria-label="Interact on Stage">
                <img class="ui-icon-theme-aware" src="/registry/icons/public/assets/core/actions/interact/interact.svg" alt="">
              </button>` : ''}
              ${entry.publicRoute ? `<a class="home-search-shell__result-icon-action" href="${escapeHomeSearchHtml(buildModelProfileModelTabRoute(entry.publicRoute))}" data-home-search-tooltip="View model profile" aria-label="View model profile">
                <img class="ui-icon-theme-aware" src="/registry/icons/public/assets/core/actions/open/open.svg" alt="">
              </a>` : ''}
            </div>
          </div>
        </article>
      `).join('')}
    </div>
  `;
}

function renderDefaultHomeSearchResults() {
  const activeModel = getActiveModelState().activeModel;
  const activeModelLabel = getActiveModelLabel();
  const activeModelDescription = normalizeHomeSearchQuery(
    activeModel?.description || 'Search public models, select the active interaction engine, or move directly into a published public surface.'
  );
  const defaultSurfaceKeys = new Set([
    'surface:leadership',
    'surface:careers'
  ]);
  const quickLinks = applyHomeSearchFilters(filterHomeSearchEntriesByScope(buildHomeSearchEntries(), HOME_SEARCH_SHELL_STATE.scope))
    .filter((entry) => defaultSurfaceKeys.has(entry.key));

  return `
    <div class="home-search-shell__result-list">
      <article class="home-search-shell__result-card">
        <div class="home-search-shell__model-result-layout">
          <div class="home-search-shell__model-result-content">
            <h3 class="home-search-shell__result-title">${escapeHomeSearchHtml(activeModel?.display_name || activeModelLabel)}</h3>
            <p class="home-search-shell__result-body">${escapeHomeSearchHtml(activeModelDescription)}</p>
          </div>
          <div class="home-search-shell__result-actions home-search-shell__result-actions--model">
            ${activeModel?.public_profile?.public_route_path ? `<a class="home-search-shell__result-icon-action" href="${escapeHomeSearchHtml(buildModelProfileModelTabRoute(activeModel.public_profile.public_route_path))}" data-home-search-tooltip="View model profile" aria-label="View model profile">
              <img class="ui-icon-theme-aware" src="/registry/icons/public/assets/core/actions/open/open.svg" alt="">
            </a>` : ''}
          </div>
        </div>
      </article>

      ${quickLinks.map((entry) => `
        <article class="home-search-shell__result-card">
          ${entry.href ? `<h3 class="home-search-shell__result-title"><a class="home-search-shell__result-title-link" href="${escapeHomeSearchHtml(entry.href)}">${escapeHomeSearchHtml(entry.title)}</a></h3>` : `<h3 class="home-search-shell__result-title">${escapeHomeSearchHtml(entry.title)}</h3>`}
        </article>
      `).join('')}
    </div>
  `;
}

function renderQueryHomeSearchResults(query) {
  const modelDirectoryPresentation = HOME_SEARCH_SHELL_STATE.presentation === 'model-directory';
  const sourceEntries = modelDirectoryPresentation ? buildModelSearchEntries() : buildHomeSearchEntries();
  const matches = applyHomeSearchFilters(filterHomeSearchEntriesByScope(sourceEntries, HOME_SEARCH_SHELL_STATE.scope))
    .map((entry) => ({
      ...entry,
      score: scoreHomeSearchMatch(query, entry)
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score || left.title.localeCompare(right.title))
    .slice(0, 8);

  if (!matches.length) {
    return `
      <div class="home-search-shell__empty-state" id="home-search-shell-empty-state">
        <p class="home-search-shell__empty-title">No results found</p>
        <p class="home-search-shell__empty-text">
          Search models, profiles, and content across the platform.
        </p>
      </div>
    `;
  }

  return `
    <div class="home-search-shell__result-list">
      ${matches.map((entry) => `
        <article class="home-search-shell__result-card">
          ${entry.kind === 'model' ? `
            <div class="home-search-shell__model-result-layout">
              <div class="home-search-shell__model-result-content">
                <div class="home-search-shell__identity-result">
                  ${renderHomeSearchResultAvatar(entry)}
                  <div class="home-search-shell__identity-result-copy">
                    <div class="home-search-shell__result-title-row">
                      ${entry.href ? `<h3 class="home-search-shell__result-title"><a class="home-search-shell__result-title-link" href="${escapeHomeSearchHtml(entry.href)}">${escapeHomeSearchHtml(entry.title)}</a></h3>` : `<h3 class="home-search-shell__result-title">${escapeHomeSearchHtml(entry.title)}</h3>`}
                      ${renderVerificationBadge(entry)}
                    </div>
                  </div>
                </div>
              </div>
              <div class="home-search-shell__result-actions home-search-shell__result-actions--model">
                ${entry.activateModelId ? `<button class="home-search-shell__result-icon-action" data-home-search-result-action="activate-model" data-home-search-model-id="${escapeHomeSearchHtml(entry.activateModelId)}" data-home-search-tooltip="Interact on Stage" type="button" aria-label="Interact on Stage">
                  <img class="ui-icon-theme-aware" src="/registry/icons/public/assets/core/actions/interact/interact.svg" alt="">
                </button>` : ''}
                ${entry.publicRoute ? `<a class="home-search-shell__result-icon-action" href="${escapeHomeSearchHtml(buildModelProfileModelTabRoute(entry.publicRoute))}" data-home-search-tooltip="View model profile" aria-label="View model profile">
                  <img class="ui-icon-theme-aware" src="/registry/icons/public/assets/core/actions/open/open.svg" alt="">
                </a>` : ''}
              </div>
            </div>
          ` : entry.kind === 'profile' ? `
            <div class="home-search-shell__identity-result">
              ${renderHomeSearchResultAvatar(entry)}
              <div class="home-search-shell__identity-result-copy">
                <div class="home-search-shell__result-title-row">
                  ${entry.href ? `<h3 class="home-search-shell__result-title"><a class="home-search-shell__result-title-link" href="${escapeHomeSearchHtml(entry.href)}">${escapeHomeSearchHtml(entry.title)}</a></h3>` : `<h3 class="home-search-shell__result-title">${escapeHomeSearchHtml(entry.title)}</h3>`}
                  ${renderVerificationBadge(entry)}
                </div>
                ${entry.kind === 'profile' && entry.username ? `<p class="home-search-shell__identity-result-handle">@${escapeHomeSearchHtml(entry.username.replace(/^@/, ''))}</p>` : ''}
              </div>
            </div>
          ` : `
            <div class="home-search-shell__result-title-row">
              ${renderHomeSearchResultAvatar(entry)}
              ${entry.href ? `<h3 class="home-search-shell__result-title"><a class="home-search-shell__result-title-link" href="${escapeHomeSearchHtml(entry.href)}">${escapeHomeSearchHtml(entry.title)}</a></h3>` : `<h3 class="home-search-shell__result-title">${escapeHomeSearchHtml(entry.title)}</h3>`}
              ${renderVerificationBadge(entry)}
            </div>
            <div class="home-search-shell__result-actions">
              ${entry.kind === 'model' && entry.href ? `<a class="home-search-shell__result-link" href="${escapeHomeSearchHtml(entry.href)}">Open model</a>` : ''}
              ${entry.publicRoute ? `<a class="home-search-shell__result-link" href="${escapeHomeSearchHtml(entry.publicRoute)}">Open public route</a>` : ''}
              ${entry.activateModelId ? `<button class="home-search-shell__result-action" data-home-search-result-action="activate-model" data-home-search-model-id="${escapeHomeSearchHtml(entry.activateModelId)}" type="button">${entry.activateModelId === getActiveModelState().activeModelId ? 'Active on Homepage' : 'Activate on Homepage'}</button>` : ''}
            </div>
          `}
        </article>
      `).join('')}
    </div>
  `;
}

function renderHomeSearchShell() {
  syncHomeSearchScopeChrome();
  const nodes = getHomeSearchShellNodes();
  if (!nodes.results) {
    return;
  }

  const query = normalizeHomeSearchQuery(HOME_SEARCH_SHELL_STATE.query || nodes.input?.value || '');
  HOME_SEARCH_SHELL_STATE.query = query;

  if (!query) {
    syncHomeSearchRailAskAction(false);
    nodes.results.innerHTML = HOME_SEARCH_SHELL_STATE.mode === 'models'
      ? renderDefaultHomeModelResults()
      : renderDefaultHomeSearchResults();
    return;
  }

  if (!HOME_SEARCH_SHELL_STATE.dataReady && HOME_SEARCH_SHELL_STATE.loadingPromise) {
    syncHomeSearchRailAskAction(false);
    nodes.results.innerHTML = `
      <div class="home-search-shell__loading-state ui-loading-inline" id="home-search-shell-loading-state" role="status" aria-live="polite" aria-label="Loading search results">
        <span class="ui-loading-inline__spinner" aria-hidden="true"></span>
      </div>
    `;
    return;
  }

  syncHomeSearchRailAskAction(true);
  nodes.results.innerHTML = renderQueryHomeSearchResults(query);
}

/* =========================================================
   06. QUERY HELPERS
   ========================================================= */

function setHomeSearchValue(value) {
  const nodes = getHomeSearchShellNodes();
  if (!nodes.input) return;

  const query = normalizeHomeSearchQuery(value);
  nodes.input.value = query;
  HOME_SEARCH_SHELL_STATE.query = query;
  syncHomeSearchClearButton();
}

function syncHomeSearchVoiceState(isListening) {
  const voiceButton = getHomeSearchShellNodes().voiceButton;
  if (!(voiceButton instanceof HTMLButtonElement)) {
    return;
  }

  voiceButton.setAttribute('aria-pressed', isListening ? 'true' : 'false');
  voiceButton.setAttribute('aria-label', isListening ? 'Stop voice search' : 'Start voice search');
}

function ensureHomeSearchSpeechController() {
  if (HOME_SEARCH_SHELL_STATE.speechController) {
    return HOME_SEARCH_SHELL_STATE.speechController;
  }

  HOME_SEARCH_SHELL_STATE.speechController = createSpeechInputController({
    onStart: () => {
      syncHomeSearchVoiceState(true);
    },
    onResult: ({ transcript }) => {
      setHomeSearchValue(transcript);
      renderHomeSearchShell();
    },
    onEnd: () => {
      syncHomeSearchVoiceState(false);
    },
    onError: () => {
      syncHomeSearchVoiceState(false);
    },
  });

  return HOME_SEARCH_SHELL_STATE.speechController;
}

function submitHomeSearchQuery(query, source = 'home-search-shell') {
  const normalizedQuery = normalizeHomeSearchQuery(query);
  if (!normalizedQuery) {
    return;
  }

  dispatchHomeSearchEvent('neuroartan:home-stage-voice-query-submitted', {
    query: normalizedQuery,
    source,
    mode: 'search_or_knowledge',
  });
}

function openHomeSearchShell(options = {}) {
  const nodes = getHomeSearchShellNodes();
  if (!nodes.shell) {
    return;
  }

  HOME_SEARCH_SHELL_STATE.isOpen = true;
  HOME_SEARCH_SHELL_STATE.scope = normalizeHomeSearchScope(options.scope || 'all');
  HOME_SEARCH_SHELL_STATE.mode = options.mode === 'models' || options.focus === 'models' ? 'models' : 'search';
  HOME_SEARCH_SHELL_STATE.presentation = options.source === 'model-directory' ? 'model-directory' : 'default';

  dispatchHomeSearchEvent('neuroartan:cookie-consent-close-requested', {
    source: 'home-search-shell',
  });

  nodes.shell.hidden = false;
  document.documentElement.classList.add('home-search-shell-open');
  document.body.classList.add('home-search-shell-open');

  window.requestAnimationFrame(() => {
    if (HOME_SEARCH_SHELL_STATE.mode === 'models') {
      setHomeSearchValue('');
      renderHomeSearchShell();
      return;
    }

    nodes.input?.focus();
    nodes.input?.select();
  });

  void ensureHomeSearchData().then(() => {
    renderHomeSearchShell();
  });
}

function closeHomeSearchShell() {
  const nodes = getHomeSearchShellNodes();
  if (!nodes.shell) {
    return;
  }

  HOME_SEARCH_SHELL_STATE.isOpen = false;
  HOME_SEARCH_SHELL_STATE.mode = 'search';
  HOME_SEARCH_SHELL_STATE.presentation = 'default';
  HOME_SEARCH_SHELL_STATE.filtersOpen = false;
  nodes.shell.hidden = true;
  document.documentElement.classList.remove('home-search-shell-open');
  document.body.classList.remove('home-search-shell-open');
  dispatchHomeSearchEvent('neuroartan:home-topbar-reset-triggers');
}

/* =========================================================
   07. EVENT BINDING
   ========================================================= */

function bindHomeSearchShell() {
  void ensureHomeSearchData().then(() => {
    renderHomeSearchShell();
  });

  subscribeActiveModelState(() => {
    renderHomeSearchShell();
  });

  document.addEventListener('neuroartan:home-model-selector-open-requested', (event) => {
    openHomeSearchShell({ mode: 'models', focus: 'models', scope: 'models', ...(event?.detail || {}) });
  });

  document.addEventListener('neuroartan:home-search-shell-close-requested', () => {
    closeHomeSearchShell();
  });

  document.addEventListener('change', (event) => {
    const root = getLiveSearchShellRoot();
    if (!root) return;

    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (!root.contains(target)) return;

    if (target.matches('select[data-home-search-filter-option]')) {
      const key = normalizeHomeSearchFilterValue(target.getAttribute('data-home-search-filter-option') || '');
      const value = normalizeHomeSearchFilterValue(target.value || '');

      if (Object.prototype.hasOwnProperty.call(HOME_SEARCH_SHELL_STATE.filters, key)) {
        HOME_SEARCH_SHELL_STATE.filters[key] = value;
        renderHomeSearchShell();
      }
    }
  });

  document.addEventListener('click', (event) => {
    const root = getLiveSearchShellRoot();
    if (!root) return;

    const target = event.target.closest(
      '#home-search-shell-close, ' +
      '#home-search-shell-voice-button, ' +
      '#home-search-shell [data-home-search-clear], ' +
      '#home-search-shell [data-home-search-filter], ' +
      '#home-search-shell [data-home-search-filter-close], ' +
      '#home-search-shell [data-home-search-filter-reset], ' +
      '#home-search-shell button[data-home-search-filter-option], ' +
      '#home-search-shell [data-home-search-close="true"], ' +
      '#home-search-shell [data-home-search-scope], ' +
      '#home-search-shell [data-home-search-result-action], ' +
      '#home-search-shell a[href]'
    );

    if (!target || !root.contains(target)) {
      return;
    }

    if (target.matches('#home-search-shell-close, [data-home-search-close="true"]')) {
      closeHomeSearchShell();
      return;
    }

    if (target.matches('[data-home-search-clear]')) {
      event.preventDefault();
      setHomeSearchValue('');
      renderHomeSearchShell();
      getHomeSearchShellNodes().input?.focus();
      return;
    }

    if (target.matches('[data-home-search-filter]')) {
      event.preventDefault();
      HOME_SEARCH_SHELL_STATE.filtersOpen = !HOME_SEARCH_SHELL_STATE.filtersOpen;
      syncHomeSearchFilterChrome();
      return;
    }

    if (target.matches('[data-home-search-filter-close]')) {
      event.preventDefault();
      HOME_SEARCH_SHELL_STATE.filtersOpen = false;
      syncHomeSearchFilterChrome();
      getHomeSearchShellNodes().input?.focus();
      return;
    }

    if (target.matches('[data-home-search-filter-reset]')) {
      event.preventDefault();
      resetHomeSearchFilters();
      getHomeSearchShellNodes().input?.focus();
      return;
    }

    if (target.matches('button[data-home-search-filter-option]')) {
      event.preventDefault();
      const key = normalizeHomeSearchFilterValue(target.getAttribute('data-home-search-filter-option') || '');
      const value = normalizeHomeSearchFilterValue(target.getAttribute('data-home-search-filter-value') || '');

      if (Object.prototype.hasOwnProperty.call(HOME_SEARCH_SHELL_STATE.filters, key)) {
        HOME_SEARCH_SHELL_STATE.filters[key] = value;
        // If type filter changed, update filter panel data-filter-type
        if (key === 'type') {
          const root = getLiveSearchShellRoot();
          if (root) {
            const filterPanel = root.querySelector('[data-home-search-filter-panel]');
            if (filterPanel instanceof HTMLElement) {
              filterPanel.setAttribute('data-filter-type', value);
            }
          }
        }
        renderHomeSearchShell();
      }
      return;
    }

    if (target.matches('#home-search-shell-voice-button')) {
      event.preventDefault();

      const speechController = ensureHomeSearchSpeechController();
      if (!speechController.supported) {
        getHomeSearchShellNodes().input?.focus();
        return;
      }

      if (speechController.isListening()) {
        speechController.stop();
        return;
      }

      speechController.start({
        lang: document.documentElement.lang || 'en',
      });
      return;
    }

    if (target.matches('a[href]')) {
      closeHomeSearchShell();
      return;
    }

    if (target.matches('[data-home-search-result-action="ask-home"]')) {
      closeHomeSearchShell();
      submitHomeSearchQuery(HOME_SEARCH_SHELL_STATE.query, 'home-search-shell');
      return;
    }

    if (target.matches('[data-home-search-result-action="activate-model"]')) {
      const modelId = normalizeHomeSearchQuery(target.getAttribute('data-home-search-model-id') || '');
      if (!modelId) {
        return;
      }

      event.preventDefault();
      void activatePublicModel(modelId, { source: 'home-search-shell' }).then(() => {
        closeHomeSearchShell();
        if (window.location.pathname !== '/' && !window.location.pathname.endsWith('/index.html')) {
          window.location.assign('/');
          return;
        }
        window.location.hash = '';
        window.dispatchEvent(new CustomEvent('neuroartan:home-stage-focus-requested', {
          detail:{ source:'home-search-shell', modelId }
        }));
      });
      return;
    }

    if (target.matches('[data-home-search-scope]')) {
      handleHomeSearchScopeSelection(target.getAttribute('data-home-search-scope') || '');
    }
  });

  document.addEventListener('input', (event) => {
    const root = getLiveSearchShellRoot();
    if (!root) return;

    const input = event.target.closest('#home-search-shell-input');
    if (!(input instanceof HTMLInputElement) || !root.contains(input)) {
      return;
    }

    HOME_SEARCH_SHELL_STATE.query = normalizeHomeSearchQuery(input.value);
    syncHomeSearchClearButton();
    renderHomeSearchShell();
  });

  document.addEventListener('submit', (event) => {
    const root = getLiveSearchShellRoot();
    if (!root) return;

    const form = event.target.closest('#home-search-shell-form');
    if (!form || !root.contains(form)) {
      return;
    }

    event.preventDefault();

    const query = normalizeHomeSearchQuery(getHomeSearchShellNodes().input?.value || '');
    if (!query) {
      renderHomeSearchShell();
      return;
    }

    HOME_SEARCH_SHELL_STATE.query = query;
    closeHomeSearchShell();
    submitHomeSearchQuery(query, 'home-search-shell');
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && HOME_SEARCH_SHELL_STATE.isOpen) {
      if (HOME_SEARCH_SHELL_STATE.filtersOpen) {
        HOME_SEARCH_SHELL_STATE.filtersOpen = false;
        syncHomeSearchFilterChrome();
        return;
      }

      closeHomeSearchShell();
    }
  });
}

async function openHomeSearchShellWhenReady(detail = {}) {
  const root = await ensureHomeSearchShellRoot();
  if (!root) return false;
  bootHomeSearchShell();
  openHomeSearchShell(detail);
  return true;
}

function handleHomeSearchShellOpenRequest(event = null) {
  const detail = event instanceof CustomEvent ? event.detail || {} : {};
  void openHomeSearchShellWhenReady(detail);
}

document.addEventListener('neuroartan:home-search-shell-open-requested', handleHomeSearchShellOpenRequest);
window.addEventListener('neuroartan:home-search-shell-open-requested', handleHomeSearchShellOpenRequest);

/* =========================================================
   08. MODULE BOOT
   ========================================================= */

function bootHomeSearchShell() {
  const root = getLiveSearchShellRoot();
  if (!root) {
    return;
  }

  HOME_SEARCH_SHELL_STATE.root = root;
  syncHomeSearchVoiceState(false);

  const voiceButton = getHomeSearchShellNodes().voiceButton;
  if (voiceButton instanceof HTMLButtonElement && !hasSpeechInputSupport()) {
    voiceButton.hidden = true;
  }

  if (HOME_SEARCH_SHELL_STATE.isBound) {
    renderHomeSearchShell();
    return;
  }

  HOME_SEARCH_SHELL_STATE.isBound = true;
  bindHomeSearchShell();
}

document.addEventListener('fragment:mounted', (event) => {
  if (event?.detail?.name !== 'home-search-shell') return;
  bootHomeSearchShell();
});

document.addEventListener('neuroartan:runtime-ready', () => {
  bootHomeSearchShell();
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootHomeSearchShell, { once: true });
} else {
  bootHomeSearchShell();
}
