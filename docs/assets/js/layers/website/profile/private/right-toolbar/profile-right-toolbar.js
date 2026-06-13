/* =============================================================================
   PROFILE RIGHT TOOLBAR
============================================================================= */

import {
  getProfileNavigationState,
  subscribeProfileNavigation
} from '../navigation/profile-navigation.js';
import {
  getProfileRuntimeState,
  subscribeProfileRuntime
} from '../shell/profile-runtime.js';

const PROFILE_RIGHT_TOOLBAR_RAIL_STORAGE_KEY = 'neuroartan.profile.rightToolbar.rail';
const PROFILE_RIGHT_TOOLBAR_RAIL_COOKIE_KEY = 'neuroartan_profile_right_toolbar_rail';

const ACTION_ICONS = Object.freeze({
  create: '/registry/icons/public/assets/core/actions/create/plus.svg',
  filter: '/registry/icons/public/assets/core/actions/filter/filter.svg',
  feed: '/registry/icons/public/assets/core/navigation/feed/feed.svg',
  notification: '/registry/icons/public/assets/core/system/notifications/notification.svg',
  message: '/registry/icons/public/assets/core/communication/messaging/message.svg',
  changelog: '/registry/icons/public/assets/layers/website/settings/changelog/changelog.svg',
  posts: '/registry/icons/public/assets/layers/website/profile/actions/posts.svg',
  thoughts: '/registry/icons/public/assets/layers/website/profile/actions/thoughts.svg',
  model: '/registry/icons/public/assets/core/cognition/model/model.svg',
  organization: '/registry/icons/public/assets/layers/website/profile/actions/organizations.svg',
  modelTraining: '/registry/icons/public/assets/core/actions/model-training-panel/model-training-panel.svg',
  modelInteraction: '/registry/icons/public/assets/core/actions/model-next-action-panel/model-next-action-panel.svg',
  modelReadiness: '/registry/icons/public/assets/core/actions/model-evaluation-panel/model-evaluation-panel.svg',
  modelSources: '/registry/icons/public/assets/core/actions/model-memory-sources-panel/model-memory-sources-panel.svg',
  modelSourceSummary: '/registry/icons/public/assets/core/model/source-summary/source-summary.svg',
  modelPersonalitySummary: '/registry/icons/public/assets/core/model/source-summary/source-summary.svg',
  modelPersonalization: '/registry/icons/public/assets/core/system/personalization/customize.svg',
  modelVoice: '/registry/icons/public/assets/core/actions/model-voice-training-panel/model-voice-training-panel.svg',
  modelVoiceSamples: '/registry/icons/public/assets/core/files/database/database.svg',
  modelVoiceFineTune: '/registry/icons/public/assets/core/media/audio/waveform.svg',
  modelProvider: '/registry/icons/public/assets/core/actions/model-provider-panel/model-provider-panel.svg',
  modelIdentity: '/registry/icons/public/assets/core/actions/model-identity-panel/model-identity-panel.svg',
  modelKeys: '/registry/icons/public/assets/core/identity/security/key.svg',
  modelInfo: '/registry/icons/public/assets/core/actions/info/info.svg',
  modelSettings: '/registry/icons/public/assets/core/system/settings/settings.svg',
  modelDiscovery: '/registry/icons/public/assets/core/navigation/discovery/discover.svg',
  modelReputation: '/registry/icons/public/assets/core/identity/shield/shield.svg',
  modelEconomy: '/registry/icons/public/assets/core/commerce/finance/valuation.svg',
  modelLearn: '/registry/icons/public/assets/layers/website/model/actions/learn.svg',
  modelDataManager: '/registry/icons/public/assets/layers/website/model/actions/data-manager.svg',
  modelReset: '/registry/icons/public/assets/core/actions/reset/reset.svg',
  thoughtMemory: '/registry/icons/public/assets/core/actions/model-memory-sources-panel/model-memory-sources-panel.svg',
  createOrganization: '/registry/icons/public/assets/layers/website/profile/actions/create-organization.svg',
  dashboard: '/registry/icons/public/assets/core/navigation/dashboard/dashboard.svg',
  metrics: '/registry/icons/public/assets/layers/website/profile/actions/profile-dashboard-metrics-panel.svg',
  graph: '/registry/icons/public/assets/layers/website/profile/actions/profile-dashboard-panel.svg',
  route: '/registry/icons/public/assets/core/navigation/route/route.svg',
  visibility: '/registry/icons/public/assets/core/identity/access/visibility-on.svg',
  verification: '/registry/icons/public/assets/core/identity/trust/verified.svg',
  identity: '/registry/icons/public/assets/layers/website/profile/actions/identity-account-state-route-readiness.svg',
  edit: '/registry/icons/public/assets/core/actions/editing/edit.svg'
});

const ACTIONS = Object.freeze({
  createPost: {
    id: 'create-post',
    label: 'Create post',
    tooltip: 'Post',
    icon: ACTION_ICONS.create
  },
  createThought: {
    id: 'create-thought',
    label: 'Create thought',
    tooltip: 'Thought',
    icon: ACTION_ICONS.create
  },
  modelTraining: {
    id: 'model-training',
    label: 'Model training',
    tooltip: 'Training',
    icon: ACTION_ICONS.modelTraining,
    authState: 'user'
  },
  modelInteraction: {
    id: 'model-interaction',
    label: 'Model interaction',
    tooltip: 'Interaction',
    icon: ACTION_ICONS.modelInteraction,
    authState: 'user'
  },
  modelReadiness: {
    id: 'model-readiness',
    label: 'Model readiness',
    tooltip: 'Readiness',
    icon: ACTION_ICONS.modelReadiness,
    authState: 'user'
  },
  modelIdentity: {
    id: 'model-identity',
    label: 'Model foundation',
    tooltip: 'Foundation',
    icon: ACTION_ICONS.modelIdentity,
    authState: 'user'
  },
  modelEditIdentity: {
    id: 'model-edit-identity',
    label: 'Edit model identity',
    tooltip: 'Edit identity',
    icon: ACTION_ICONS.edit,
    authState: 'user'
  },
  modelKeys: {
    id: 'model-keys',
    label: 'Model keys',
    tooltip: 'Keys',
    icon: ACTION_ICONS.modelKeys,
    authState: 'user'
  },
  modelInfo: {
    id: 'model-info',
    label: 'Model info',
    tooltip: 'Info',
    icon: ACTION_ICONS.modelInfo,
    authState: 'user'
  },
  modelSources: {
    id: 'model-sources',
    label: 'Model sources',
    tooltip: 'Sources',
    icon: ACTION_ICONS.modelSources,
    authState: 'user'
  },
  modelSourceSummary: {
    id: 'model-source-summary',
    label: 'Source summary',
    tooltip: 'Summary',
    icon: ACTION_ICONS.modelSourceSummary,
    authState: 'user'
  },
  modelPersonalitySummary: {
    id: 'model-personality-summary',
    label: 'Personality summary',
    tooltip: 'Summary',
    icon: ACTION_ICONS.modelPersonalitySummary,
    authState: 'user'
  },
  modelMemory: {
    id: 'model-memory',
    label: 'Model memory',
    tooltip: 'Memory',
    icon: ACTION_ICONS.thoughtMemory,
    authState: 'user'
  },
  modelPersonalization: {
    id: 'model-personalization',
    label: 'Model personalization',
    tooltip: 'Personalization',
    icon: ACTION_ICONS.modelPersonalization,
    authState: 'user'
  },
  modelVoice: {
    id: 'model-voice',
    label: 'Voice training',
    tooltip: 'Voice',
    icon: ACTION_ICONS.modelVoice,
    authState: 'user'
  },
  modelVoiceSamples: {
    id: 'model-voice-samples',
    label: 'Voice database',
    tooltip: 'Database',
    icon: ACTION_ICONS.modelVoiceSamples,
    authState: 'user'
  },
  modelVoiceFineTune: {
    id: 'model-voice-fine-tune',
    label: 'Voice fine tune',
    tooltip: 'Fine tune',
    icon: ACTION_ICONS.modelVoiceFineTune,
    authState: 'user'
  },
  modelProvider: {
    id: 'model-provider',
    label: 'Runtime provider',
    tooltip: 'Runtime',
    icon: ACTION_ICONS.modelProvider,
    authState: 'user'
  },
  modelChangelog: {
    id: 'model-changelog',
    label: 'Model changelog',
    tooltip: 'Changelog',
    icon: ACTION_ICONS.changelog,
    authState: 'user'
  },
  modelLearn: {
    id: 'model-learn',
    label: 'Learn',
    tooltip: 'Learn',
    icon: ACTION_ICONS.modelLearn,
    authState: 'user'
  },
  modelDataManager: {
    id: 'model-data-manager',
    label: 'Data manager',
    tooltip: 'Data manager',
    icon: ACTION_ICONS.modelDataManager,
    authState: 'user'
  },
  modelSourceDatabase: {
    id: 'model-source-database',
    label: 'Database',
    tooltip: 'Database',
    icon: ACTION_ICONS.modelDataManager,
    authState: 'user'
  },
  modelReset: {
    id: 'model-reset',
    label: 'Reset',
    tooltip: 'Reset',
    icon: ACTION_ICONS.modelReset,
    authState: 'user'
  },
  modelParameterFilter: {
    id: 'model-parameter-filter',
    label: 'Filter',
    tooltip: 'Filter',
    icon: ACTION_ICONS.filter,
    authState: 'user'
  },
  modelConsent: {
    id: 'model-consent',
    label: 'Consent controls',
    tooltip: 'Consent',
    icon: ACTION_ICONS.visibility,
    authState: 'user'
  },
  modelRouting: {
    id: 'model-routing',
    label: 'Model routing',
    tooltip: 'Routing',
    icon: ACTION_ICONS.route,
    authState: 'user'
  },
  modelPreferences: {
    id: 'model-preferences',
    label: 'Model preferences',
    tooltip: 'Preferences',
    icon: ACTION_ICONS.modelSettings,
    authState: 'user'
  },
  modelDiscovery: {
    id: 'model-discovery',
    label: 'Model discovery',
    tooltip: 'Discovery',
    icon: ACTION_ICONS.modelDiscovery
  },
  modelReputation: {
    id: 'model-reputation',
    label: 'Model reputation',
    tooltip: 'Reputation',
    icon: ACTION_ICONS.modelReputation,
    authState: 'user'
  },
  modelEconomy: {
    id: 'model-economy',
    label: 'Model economy',
    tooltip: 'Economy',
    icon: ACTION_ICONS.modelEconomy,
    authState: 'user'
  },
  filterPosts: {
    id: 'filter-posts',
    label: 'Filter posts',
    tooltip: 'Filter',
    icon: ACTION_ICONS.filter
  },
  editProfile: {
    id: 'edit-profile',
    label: 'Edit profile',
    tooltip: 'Edit profile',
    icon: ACTION_ICONS.edit
  },
  filterFeed: {
    id: 'filter-feed',
    label: 'Filter feed',
    tooltip: 'Filter',
    icon: ACTION_ICONS.filter
  },
  filterNotifications: {
    id: 'filter-notifications',
    label: 'Filter notifications',
    tooltip: 'Filter',
    icon: ACTION_ICONS.filter
  },
  createMessage: {
    id: 'create-message',
    label: 'Create message',
    tooltip: 'Message',
    icon: ACTION_ICONS.message
  },
  filterThoughts: {
    id: 'filter-thoughts',
    label: 'Filter thoughts',
    tooltip: 'Filter',
    icon: ACTION_ICONS.filter
  },
  thoughtMemory: {
    id: 'thought-memory',
    label: 'Thought memory',
    tooltip: 'Memory',
    icon: ACTION_ICONS.thoughtMemory
  },
  filterModels: {
    id: 'filter-models',
    label: 'Filter models',
    tooltip: 'Filter',
    icon: ACTION_ICONS.filter
  },
  filterDashboard: {
    id: 'filter-dashboard',
    label: 'Filter dashboard',
    tooltip: 'Filter',
    icon: ACTION_ICONS.filter
  },
  settingsChangelog: {
    id: 'settings-changelog',
    label: 'Settings changelog',
    tooltip: 'Changelog',
    icon: ACTION_ICONS.changelog
  },
  routeSettings: {
    id: 'route-settings',
    label: 'Public route settings',
    tooltip: 'Public route',
    icon: ACTION_ICONS.route
  },
  identitySettings: {
    id: 'identity-settings',
    label: 'Personal info',
    tooltip: 'Personal info',
    icon: ACTION_ICONS.identity
  },
  dashboardSummary: {
    id: 'dashboard-summary',
    label: 'Dashboard summary',
    tooltip: 'Summary',
    icon: ACTION_ICONS.dashboard
  },
  dashboardMetrics: {
    id: 'dashboard-metrics',
    label: 'Dashboard metrics',
    tooltip: 'Metrics',
    icon: ACTION_ICONS.metrics
  },
  dashboardGraph: {
    id: 'dashboard-graph',
    label: 'Dashboard graph',
    tooltip: 'Graph',
    icon: ACTION_ICONS.graph
  },
  organizationSettings: {
    id: 'organization-settings',
    label: 'Organization settings',
    tooltip: 'Organization',
    icon: ACTION_ICONS.organization
  },
  createOrganization: {
    id: 'create-organization',
    label: 'Create organization',
    tooltip: 'Create organization',
    icon: ACTION_ICONS.createOrganization
  }
});

const CONTEXT_ACTIONS = Object.freeze({
  home: ['createPost', 'filterFeed'],
  feed: ['createPost', 'filterFeed'],
  notifications: ['filterNotifications'],
  messaging: ['createMessage'],
  profile: ['editProfile', 'createPost', 'filterPosts'],
  overview: ['editProfile', 'createPost', 'filterPosts'],
  posts: ['editProfile', 'createPost', 'filterPosts'],
  thoughts: ['editProfile', 'createThought', 'filterThoughts', 'thoughtMemory'],
  'model-foundation': ['modelLearn', 'modelReset', 'modelChangelog'],
  'model-training': ['modelLearn', 'modelReset', 'modelChangelog'],
  'model-personalization': ['modelPersonalization', 'modelMemory', 'modelVoice', 'modelLearn', 'modelReset', 'modelChangelog'],
  'model-sources': ['modelSources', 'filterModels', 'modelLearn', 'modelReset', 'modelChangelog'],
  'model-memory': ['modelMemory', 'modelLearn', 'modelReset', 'modelChangelog'],
  'model-voice': ['modelVoice', 'modelLearn', 'modelReset', 'modelChangelog'],
  'model-readiness': ['modelLearn', 'modelReset', 'modelChangelog'],
  'model-runtime': ['modelProvider', 'modelLearn', 'modelReset', 'modelChangelog'],
  'model-discovery': ['modelReputation', 'modelEconomy', 'filterModels', 'modelLearn', 'modelReset', 'modelChangelog'],
  'model-settings': ['modelLearn', 'modelReset', 'modelChangelog'],
  organizations: ['editProfile', 'createOrganization', 'organizationSettings'],
  dashboard: ['filterDashboard'],
  settings: ['settingsChangelog']
});

const MODEL_PANE_ACTIONS = Object.freeze({
  overview: ['modelIdentity', 'modelReadiness', 'modelLearn', 'modelReset', 'modelChangelog'],
  identity: ['modelEditIdentity', 'modelLearn', 'modelReset', 'modelChangelog'],
  consent: ['modelConsent', 'modelLearn', 'modelReset', 'modelChangelog'],
  sources: ['modelSources', 'modelLearn', 'modelReset', 'modelChangelog'],
  voice: ['modelVoice', 'modelLearn', 'modelReset', 'modelChangelog'],
  protocol: ['modelLearn', 'modelReset', 'modelChangelog'],
  datasets: ['modelDataManager', 'modelLearn', 'modelReset', 'modelChangelog'],
  'knowledge-base': ['modelDataManager', 'modelLearn', 'modelReset', 'modelChangelog'],
  logics: ['modelDataManager', 'modelLearn', 'modelReset', 'modelChangelog'],
  provenance: ['modelLearn', 'modelReset', 'modelChangelog'],
  evaluation: ['modelLearn', 'modelReset', 'modelChangelog'],
  cognition: ['modelPersonalization', 'modelLearn', 'modelReset', 'modelChangelog'],
  communication: ['modelPersonalization', 'modelLearn', 'modelReset', 'modelChangelog'],
  memory: ['modelMemory', 'modelLearn', 'modelReset', 'modelChangelog'],
  emotion: ['modelPersonalization', 'modelLearn', 'modelReset', 'modelChangelog'],
  behavior: ['modelPersonalization', 'modelLearn', 'modelReset', 'modelChangelog'],
  state: ['modelLearn', 'modelReset', 'modelChangelog'],
  checks: ['modelLearn', 'modelReset', 'modelChangelog'],
  blockers: ['modelLearn', 'modelReset', 'modelChangelog'],
  history: ['modelLearn', 'modelReset', 'modelChangelog'],
  trending: ['filterModels', 'modelLearn', 'modelReset', 'modelChangelog'],
  directory: ['filterModels', 'modelLearn', 'modelReset', 'modelChangelog'],
  expertise: ['filterModels', 'modelLearn', 'modelReset', 'modelChangelog'],
  reputation: ['filterModels', 'modelLearn', 'modelReset', 'modelChangelog'],
  monetization: ['modelLearn', 'modelReset', 'modelChangelog'],
  preferences: ['modelLearn', 'modelReset', 'modelChangelog'],
  provider: ['modelLearn', 'modelReset', 'modelChangelog'],
  routing: ['modelLearn', 'modelReset', 'modelChangelog'],
  visibility: ['modelLearn', 'modelReset', 'modelChangelog'],
  changelog: ['modelLearn', 'modelReset', 'modelChangelog']
});

const MODEL_FOUNDATION_PANE_ACTIONS = Object.freeze({
  overview: ['modelKeys', 'modelInfo', 'modelLearn', 'modelReset', 'modelChangelog'],
  identity: ['modelEditIdentity', 'modelLearn', 'modelReset', 'modelChangelog'],
  consent: ['modelLearn', 'modelReset', 'modelChangelog'],
  sources: ['modelSourceDatabase', 'modelSourceSummary', 'modelLearn', 'modelReset', 'modelChangelog'],
  memory: ['modelLearn', 'modelReset', 'modelChangelog'],
  personality: ['modelPersonalitySummary', 'modelLearn', 'modelReset', 'modelChangelog'],
  voice: ['modelVoiceSamples', 'modelVoiceFineTune', 'modelLearn', 'modelReset', 'modelChangelog']
});

const MODEL_PERSONALIZATION_PANE_ACTIONS = Object.freeze({
  cognition: ['modelParameterFilter', 'modelLearn', 'modelReset', 'modelChangelog'],
  communication: ['modelParameterFilter', 'modelLearn', 'modelReset', 'modelChangelog'],
  memory: ['modelParameterFilter', 'modelLearn', 'modelReset', 'modelChangelog'],
  emotion: ['modelParameterFilter', 'modelLearn', 'modelReset', 'modelChangelog'],
  behavior: ['modelParameterFilter', 'modelLearn', 'modelReset', 'modelChangelog']
});

function resolveModelPersonalizationPane(state = getProfileNavigationState()) {
  const pane = String(state?.modelPane || '').trim();
  if (Object.prototype.hasOwnProperty.call(MODEL_PERSONALIZATION_PANE_ACTIONS, pane)) {
    return pane;
  }

  const activeModelRoot = document.querySelector('[data-model-personalization-pane]');
  const activePane = String(activeModelRoot?.getAttribute('data-model-personalization-pane') || '').trim();
  if (Object.prototype.hasOwnProperty.call(MODEL_PERSONALIZATION_PANE_ACTIONS, activePane)) {
    return activePane;
  }

  return 'cognition';
}

function toolbarRoots(){
  return Array.from(document.querySelectorAll('[data-profile-right-toolbar]'));
}

function resolveActionKeys(state = getProfileNavigationState()){
  if (state.section === 'model-personalization') {
    return MODEL_PERSONALIZATION_PANE_ACTIONS[resolveModelPersonalizationPane(state)];
  }

  if (state.section === 'model-foundation') {
    const foundationPane = String(state.modelPane || 'overview').trim() || 'overview';
    return MODEL_FOUNDATION_PANE_ACTIONS[foundationPane] || MODEL_FOUNDATION_PANE_ACTIONS.overview;
  }

  if (String(state.section || '').startsWith('model-') && MODEL_PANE_ACTIONS[state.modelPane]) {
    return MODEL_PANE_ACTIONS[state.modelPane];
  }

  return CONTEXT_ACTIONS[state.section] || CONTEXT_ACTIONS.home;
}

function resolveSettingsChangelogArea(state = getProfileNavigationState()){
  const hashPane = String(window.location.hash || '').replace(/^#settings\/?/, '').split('/')[0];
  const settingsPane = state?.settingsPane || hashPane || 'identity';

  switch (settingsPane) {
    case 'route':
      return 'route';
    case 'privacy':
      return 'privacy';
    case 'password':
      return 'security';
    case 'verification':
      return 'verification';
    case 'identity':
    default:
      return 'identity';
  }
}


function resolveModelChangelogArea(state = getProfileNavigationState()){
  const section = String(state?.section || 'model-foundation').replace(/^model-/, '') || 'foundation';
  const pane = state?.section === 'model-personalization'
    ? resolveModelPersonalizationPane(state)
    : String(state?.modelPane || 'overview') || 'overview';
  return `model.${section}.${pane}`;
}

function resolveModelOverlayFilters(state = getProfileNavigationState()) {
  if (state.section === 'model-personalization') {
    return {
      area: 'personalization',
      pane: resolveModelPersonalizationPane(state)
    };
  }

  const section = String(state?.section || 'model-foundation').replace(/^model-/, '') || 'foundation';
  const pane = String(state?.modelPane || 'all') || 'all';
  const validAreas = new Set(['foundation', 'training', 'personalization', 'settings', 'dashboard']);

  return {
    area: validAreas.has(section) ? section : 'model',
    pane: pane || 'all'
  };
}

function resolveModelLearnFilters(state = getProfileNavigationState()) {
  const modelPane = state.section === 'model-personalization'
    ? resolveModelPersonalizationPane(state)
    : state.modelPane;

  const filters = {
    section: state.section,
    modelPane
  };

  if (state.section === 'model-personalization' && modelPane === 'communication') {
    const relationshipSelect = document.querySelector('[data-model-personalization-field="responseAudienceScope"]');
    if (relationshipSelect instanceof HTMLSelectElement) {
      filters.responseAudience = relationshipSelect.value || 'public';
    }
  }

  return filters;
}

function renderToolbarActions(root, state = getProfileNavigationState()){
  const nav = root.querySelector('[data-profile-right-toolbar-actions]');
  if (!(nav instanceof HTMLElement)) return;

  root.dataset.profileRightToolbarAuthState = 'ready';
  const actionKeys = resolveActionKeys(state).filter((key) => Boolean(ACTIONS[key]));
  nav.replaceChildren();
  root.style.setProperty('--profile-right-toolbar-action-count', String(Math.max(actionKeys.length, 1)));
  root.style.setProperty('--profile-right-toolbar-gap-count', String(Math.max(actionKeys.length - 1, 0)));

  actionKeys.forEach((key) => {
    const action = ACTIONS[key];
    if(!action) return;

    const button = document.createElement('button');
    button.className = 'profile-right-toolbar__nav-item';
    button.type = 'button';
    button.dataset.profileRightToolbarAction = action.id;
    button.dataset.profileRightToolbarTooltip = action.tooltip || action.label;
    button.setAttribute('aria-label', action.label);

    const icon = document.createElement('span');
    icon.className = 'profile-right-toolbar__nav-icon inline-stroke-icon';
    icon.setAttribute('data-inline-stroke-icon', '');
    icon.setAttribute('aria-hidden', 'true');

    const image = document.createElement('img');
    image.className = action.id === 'verification-settings'
      ? 'ui-icon-original-color'
      : 'ui-icon-theme-aware';
    image.src = action.icon;
    image.alt = '';

    icon.appendChild(image);
    button.appendChild(icon);

    const text = document.createElement('span');
    text.className = 'profile-right-toolbar__nav-text';
    text.textContent = action.label;
    button.appendChild(text);

    nav.appendChild(button);
  });

  window.dispatchEvent(new CustomEvent('fragment:mounted', {
    detail: {
      name: 'profile-right-toolbar-actions',
      root: nav,
    },
  }));
}

function storageAvailable(){
  return typeof window !== 'undefined' && 'localStorage' in window;
}

function readStoredRightToolbarRail(){
  if(storageAvailable()){
    try{
      const value = window.localStorage.getItem(PROFILE_RIGHT_TOOLBAR_RAIL_STORAGE_KEY);
      if(value === 'collapsed' || value === 'expanded') return value;
    }catch(_){
      // Fall through to cookie storage.
    }
  }

  const cookie = document.cookie
    .split(';')
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(`${PROFILE_RIGHT_TOOLBAR_RAIL_COOKIE_KEY}=`));
  const value = decodeURIComponent(cookie?.split('=').slice(1).join('=') || '');
  return value === 'collapsed' || value === 'expanded' ? value : '';
}

function writeStoredRightToolbarRail(state){
  if(state !== 'collapsed' && state !== 'expanded') return;

  if(storageAvailable()){
    try{
      window.localStorage.setItem(PROFILE_RIGHT_TOOLBAR_RAIL_STORAGE_KEY, state);
      return;
    }catch(_){
      // Fall through to cookie storage.
    }
  }

  document.cookie = `${PROFILE_RIGHT_TOOLBAR_RAIL_COOKIE_KEY}=${encodeURIComponent(state)}; path=/; max-age=31536000; SameSite=Lax`;
}

function setRightToolbarRail(root, state, options = {}){
  const normalized = state === 'collapsed' ? 'collapsed' : 'expanded';
  const toggle = root.querySelector('[data-profile-right-toolbar-rail-toggle]');
  const toggleIconHost = root.querySelector('[data-profile-right-toolbar-rail-toggle-icon-host]');
  const toggleIcon = root.querySelector('[data-profile-right-toolbar-rail-toggle-icon]');
  const layout = root.closest('.profile-workspace__layout');

  root.setAttribute('data-profile-right-toolbar-rail', normalized);
  layout?.setAttribute('data-profile-right-toolbar-rail', normalized);

  if(toggle){
    const isExpanded = normalized === 'expanded';
    toggle.setAttribute('aria-pressed', isExpanded ? 'true' : 'false');
    toggle.setAttribute(
      'aria-label',
      isExpanded ? 'Collapse profile tools' : 'Expand profile tools'
    );
  }

  const expandedIcon = (
    toggleIconHost?.getAttribute('data-profile-right-toolbar-rail-icon-expanded')
    || toggleIcon?.getAttribute('data-profile-right-toolbar-rail-icon-expanded')
    || ''
  ).trim();

  const collapsedIcon = (
    toggleIconHost?.getAttribute('data-profile-right-toolbar-rail-icon-collapsed')
    || toggleIcon?.getAttribute('data-profile-right-toolbar-rail-icon-collapsed')
    || ''
  ).trim();

  const nextIcon = normalized === 'expanded' ? expandedIcon : collapsedIcon;

  if(toggleIconHost && expandedIcon && collapsedIcon){
    toggleIconHost.setAttribute('data-profile-right-toolbar-rail-icon-expanded', expandedIcon);
    toggleIconHost.setAttribute('data-profile-right-toolbar-rail-icon-collapsed', collapsedIcon);
  }

  if(toggleIconHost && nextIcon){
    const currentIcon = (
      toggleIconHost.getAttribute('data-profile-right-toolbar-rail-current-icon') || ''
    ).trim();

    if(currentIcon !== nextIcon){
      toggleIconHost.setAttribute('data-profile-right-toolbar-rail-current-icon', nextIcon);
      toggleIconHost.innerHTML = `<img class="ui-icon-theme-aware" src="${nextIcon}" alt="" data-profile-right-toolbar-rail-toggle-icon data-profile-right-toolbar-rail-icon-expanded="${expandedIcon}" data-profile-right-toolbar-rail-icon-collapsed="${collapsedIcon}">`;

      window.dispatchEvent(new CustomEvent('fragment:mounted', {
        detail: {
          name: 'profile-right-toolbar-rail-toggle-icon',
          root: toggleIconHost,
        },
      }));
    }
  }

  if(options.persist !== false){
    writeStoredRightToolbarRail(normalized);
  }
}

function requestProfileToolAction(action){
  switch(action){
    case 'create-post':
      document.dispatchEvent(new CustomEvent('profile:post-compose-open-request', {
        detail: { source: 'profile-right-toolbar' }
      }));
      return;
    case 'create-thought':
      document.dispatchEvent(new CustomEvent('profile:thought-compose-open-request', {
        detail: { source: 'profile-right-toolbar' }
      }));
      return;
    case 'model-training':
      document.dispatchEvent(new CustomEvent('profile:navigate-request', {
        detail: { section: 'model-training', modelPane: 'protocol' }
      }));
      return;
    case 'model-readiness':
      document.dispatchEvent(new CustomEvent('profile:navigate-request', {
        detail: { section: 'model-readiness', modelPane: 'state' }
      }));
      return;
    case 'model-identity':
      document.dispatchEvent(new CustomEvent('profile:navigate-request', {
        detail: { section: 'model-foundation', modelPane: 'identity' }
      }));
      return;
    case 'model-edit-identity':
      document.dispatchEvent(new CustomEvent('model:identity-editor-open-request', {
        detail: { source: 'profile-right-toolbar' }
      }));
      return;
    case 'model-keys':
      document.dispatchEvent(new CustomEvent('model:keys-open-request', {
        detail: {
          source: 'profile-right-toolbar',
          filters: resolveModelOverlayFilters()
        }
      }));
      return;
    case 'model-info':
      document.dispatchEvent(new CustomEvent('model:info-open-request', {
        detail: {
          source: 'profile-right-toolbar',
          filters: resolveModelOverlayFilters()
        }
      }));
      return;
    case 'model-source-summary':
      document.dispatchEvent(new CustomEvent('model:source-summary-open-request', {
        detail: {
          source: 'profile-right-toolbar',
          filters: resolveModelOverlayFilters()
        }
      }));
      return;
    case 'model-personality-summary':
      document.dispatchEvent(new CustomEvent('model:personality-summary-open-request', {
        detail: {
          source: 'profile-right-toolbar',
          filters: resolveModelOverlayFilters()
        }
      }));
      return;
    case 'model-sources':
      document.dispatchEvent(new CustomEvent('profile:navigate-request', {
        detail: { section: 'model-foundation', modelPane: 'sources' }
      }));
      return;
    case 'model-memory':
      document.dispatchEvent(new CustomEvent('profile:navigate-request', {
        detail: { section: 'model-foundation', modelPane: 'memory' }
      }));
      return;
    case 'model-personalization':
      document.dispatchEvent(new CustomEvent('profile:navigate-request', {
        detail: { section: 'model-personalization', modelPane: resolveModelPersonalizationPane() }
      }));
      return;
    case 'model-voice':
      document.dispatchEvent(new CustomEvent('profile:navigate-request', {
        detail: { section: 'model-foundation', modelPane: 'voice' }
      }));
      return;
    case 'model-voice-samples':
      document.dispatchEvent(new CustomEvent('model:voice-samples-open-request', {
        detail: { source: 'profile-right-toolbar' }
      }));
      return;
    case 'model-voice-fine-tune':
      document.dispatchEvent(new CustomEvent('model:voice-fine-tune-open-request', {
        detail: { source: 'profile-right-toolbar' }
      }));
      return;
    case 'model-provider':
      document.dispatchEvent(new CustomEvent('profile:navigate-request', {
        detail: { section: 'model-settings', modelPane: 'provider' }
      }));
      return;
    case 'model-consent':
      document.dispatchEvent(new CustomEvent('profile:navigate-request', {
        detail: { section: 'model-foundation', modelPane: 'consent' }
      }));
      return;
    case 'model-routing':
      document.dispatchEvent(new CustomEvent('profile:navigate-request', {
        detail: { section: 'model-settings', modelPane: 'routing' }
      }));
      return;
    case 'model-preferences':
      document.dispatchEvent(new CustomEvent('profile:navigate-request', {
        detail: { section: 'model-settings', modelPane: 'preferences' }
      }));
      return;
    case 'model-discovery':
      document.dispatchEvent(new CustomEvent('profile:navigate-request', {
        detail: { section: 'model-discovery', modelPane: 'directory' }
      }));
      return;
    case 'model-reputation':
      document.dispatchEvent(new CustomEvent('profile:navigate-request', {
        detail: { section: 'model-discovery', modelPane: 'reputation' }
      }));
      return;
    case 'model-economy':
      document.dispatchEvent(new CustomEvent('profile:navigate-request', {
        detail: { section: 'model-discovery', modelPane: 'monetization' }
      }));
      return;
    case 'model-interaction':
    case 'thought-memory':
    case 'create-organization':
      document.dispatchEvent(new CustomEvent('profile:right-toolbar-action-request', {
        detail: { action, source: 'profile-right-toolbar' }
      }));
      return;
    case 'model-parameter-filter':
      {
        const state = getProfileNavigationState();
        document.dispatchEvent(new CustomEvent('profile:filter-open-request', {
          detail: {
            context: 'modelParameterFilter',
            source: 'profile-right-toolbar',
            filters: {
              area: 'personalization',
              pane: state.section === 'model-personalization'
                ? resolveModelPersonalizationPane(state)
                : 'all'
            }
          }
        }));
      }
      return;
    case 'model-reset':
      document.dispatchEvent(new CustomEvent('profile:filter-open-request', {
        detail: {
          context: 'modelReset',
          source: 'profile-right-toolbar',
          filters: resolveModelOverlayFilters()
        }
      }));
      return;
    case 'model-changelog':
      document.dispatchEvent(new CustomEvent('profile:filter-open-request', {
        detail: {
          context: 'modelChangelog',
          source: 'profile-right-toolbar',
          filters: resolveModelOverlayFilters()
        }
      }));
      return;
    case 'model-learn':
      {
        const state = getProfileNavigationState();
        document.dispatchEvent(new CustomEvent('profile:filter-open-request', {
          detail: {
            context: 'modelLearn',
            source: 'profile-right-toolbar',
            filters: resolveModelLearnFilters(state)
          }
        }));
      }
      return;
    case 'model-data-manager':
      document.dispatchEvent(new CustomEvent('model:data-manager-open-request', {
        detail: {
          source: 'profile-right-toolbar',
          filters: resolveModelOverlayFilters()
        }
      }));
      return;
    case 'model-source-database':
      document.dispatchEvent(new CustomEvent('model:data-manager-open-request', {
        detail: {
          source: 'profile-right-toolbar',
          filters: {
            ...resolveModelOverlayFilters(),
            pane: 'source-vault'
          }
        }
      }));
      return;
    case 'filter-posts':
      document.dispatchEvent(new CustomEvent('profile:filter-open-request', {
        detail: { context: 'posts', source: 'profile-right-toolbar' }
      }));
      return;
    case 'edit-profile':
      document.dispatchEvent(new CustomEvent('profile:navigate-request', {
        detail: { section: 'settings', settingsPane: 'identity' }
      }));
      return;
    case 'filter-feed':
      document.dispatchEvent(new CustomEvent('profile:filter-open-request', {
        detail: { context: 'feed', source: 'profile-right-toolbar' }
      }));
      return;
    case 'filter-notifications':
      document.dispatchEvent(new CustomEvent('profile:filter-open-request', {
        detail: { context: 'notifications', source: 'profile-right-toolbar' }
      }));
      return;
    case 'create-message':
      document.querySelector('[data-profile-home-message-form] input[name="message"]')?.focus();
      return;
    case 'filter-thoughts':
      document.dispatchEvent(new CustomEvent('profile:filter-open-request', {
        detail: { context: 'thoughts', source: 'profile-right-toolbar' }
      }));
      return;
    case 'filter-models':
      document.dispatchEvent(new CustomEvent('profile:navigate-request', {
        detail: { section: 'model-foundation', modelPane: 'overview' }
      }));
      return;
    case 'filter-dashboard':
      document.dispatchEvent(new CustomEvent('profile:filter-open-request', {
        detail: { context: 'dashboard', source: 'profile-right-toolbar' }
      }));
      return;
    case 'settings-changelog':
      document.dispatchEvent(new CustomEvent('profile:filter-open-request', {
        detail: {
          context: 'settingsChangelog',
          source: 'profile-right-toolbar',
          filters: {
            area: resolveSettingsChangelogArea()
          }
        }
      }));
      return;
    case 'route-settings':
      document.dispatchEvent(new CustomEvent('profile:navigate-request', {
        detail: { section: 'settings', settingsPane: 'route' }
      }));
      return;
    case 'identity-settings':
      document.dispatchEvent(new CustomEvent('profile:navigate-request', {
        detail: { section: 'settings', settingsPane: 'identity' }
      }));
      return;
    case 'dashboard-summary':
      document.dispatchEvent(new CustomEvent('profile:navigate-request', {
        detail: { section: 'dashboard', dashboardPane: 'summary' }
      }));
      return;
    case 'dashboard-metrics':
      document.dispatchEvent(new CustomEvent('profile:navigate-request', {
        detail: { section: 'dashboard', dashboardPane: 'metrics' }
      }));
      return;
    case 'dashboard-graph':
      document.dispatchEvent(new CustomEvent('profile:navigate-request', {
        detail: { section: 'dashboard', dashboardPane: 'graph' }
      }));
      return;
    case 'organization-settings':
      document.dispatchEvent(new CustomEvent('profile:navigate-request', {
        detail: { section: 'organizations' }
      }));
      return;
    default:
      document.dispatchEvent(new CustomEvent('profile:right-toolbar-action-request', {
        detail: { action, source: 'profile-right-toolbar' }
      }));
  }
}

function bindRightToolbar(){
  if(document.documentElement.dataset.profileRightToolbarBound === 'true') return;
  document.documentElement.dataset.profileRightToolbarBound = 'true';

  document.addEventListener('click', (event) => {
    const toggle = event.target.closest('[data-profile-right-toolbar-rail-toggle]');
    if(toggle){
      const root = toggle.closest('[data-profile-right-toolbar]');
      if(!root) return;

      setRightToolbarRail(
        root,
        root.getAttribute('data-profile-right-toolbar-rail') === 'collapsed'
          ? 'expanded'
          : 'collapsed'
      );
      return;
    }

    const action = event.target.closest('[data-profile-right-toolbar-action]');
    if(!action) return;

    event.preventDefault();
    const key = action.getAttribute('data-profile-right-toolbar-action') || '';
    requestProfileToolAction(key);
  });
}

function bootRightToolbar(){
  toolbarRoots().forEach((root) => {
    renderToolbarActions(root, getProfileNavigationState());
    const storedState = readStoredRightToolbarRail();
    setRightToolbarRail(
      root,
      window.matchMedia?.('(max-width: 980px)').matches === true
        ? 'expanded'
        : storedState
          || (root.getAttribute('data-profile-right-toolbar-rail') === 'collapsed'
            ? 'collapsed'
            : 'expanded'),
      {
        persist: window.matchMedia?.('(max-width: 980px)').matches !== true
      }
    );
  });
}

export function initProfileRightToolbar(){
  bindRightToolbar();
  bootRightToolbar();

  window.addEventListener('resize', () => {
    if(window.matchMedia?.('(max-width: 980px)').matches !== true) return;
    toolbarRoots().forEach((root) => setRightToolbarRail(root, 'expanded', { persist:false }));
  }, { passive:true });
}

subscribeProfileNavigation((state) => {
  toolbarRoots().forEach((root) => renderToolbarActions(root, state));
});

subscribeProfileRuntime(() => {
  toolbarRoots().forEach((root) => renderToolbarActions(root, getProfileNavigationState()));
});

document.addEventListener('fragment:mounted', (event) => {
  if(event?.detail?.name !== 'profile-private-right-toolbar') return;
  initProfileRightToolbar();
});

initProfileRightToolbar();
