/* =============================================================================
   PROFILE RIGHT TOOLBAR
============================================================================= */

import {
  getProfileNavigationState,
  subscribeProfileNavigation
} from '../navigation/profile-navigation.js';

const PROFILE_RIGHT_TOOLBAR_RAIL_STORAGE_KEY = 'neuroartan.profile.rightToolbar.rail';
const PROFILE_RIGHT_TOOLBAR_RAIL_COOKIE_KEY = 'neuroartan_profile_right_toolbar_rail';

const ACTION_ICONS = Object.freeze({
  create: '/registry/icons/public/assets/core/actions/create/plus.svg',
  filter: '/registry/icons/public/assets/core/actions/filter/filter.svg',
  changelog: '/registry/icons/public/assets/layers/website/settings/changelog/changelog.svg',
  posts: '/registry/icons/public/assets/layers/website/profile/actions/posts.svg',
  thoughts: '/registry/icons/public/assets/layers/website/profile/actions/thoughts.svg',
  model: '/registry/icons/public/assets/core/cognition/model/model.svg',
  organization: '/registry/icons/public/assets/layers/website/profile/actions/organizations.svg',
  dashboard: '/registry/icons/public/assets/core/navigation/dashboard/dashboard.svg',
  metrics: '/registry/icons/public/assets/layers/website/profile/actions/profile-dashboard-metrics-panel.svg',
  graph: '/registry/icons/public/assets/layers/website/profile/actions/profile-dashboard-panel.svg',
  route: '/registry/icons/public/assets/core/navigation/route/route.svg',
  visibility: '/registry/icons/public/assets/core/identity/access/visibility-on.svg',
  verification: '/registry/icons/public/assets/core/identity/trust/verified.svg',
  identity: '/registry/icons/public/assets/layers/website/profile/actions/identity-account-state-route-readiness.svg'
});

const ACTIONS = Object.freeze({
  createPost: {
    id: 'create-post',
    label: 'Create post',
    icon: ACTION_ICONS.create
  },
  createThought: {
    id: 'create-thought',
    label: 'Create thought',
    icon: ACTION_ICONS.create
  },
  createModel: {
    id: 'create-model',
    label: 'Create model',
    icon: ACTION_ICONS.model
  },
  filterPosts: {
    id: 'filter-posts',
    label: 'Filter posts',
    icon: ACTION_ICONS.filter
  },
  filterThoughts: {
    id: 'filter-thoughts',
    label: 'Filter thoughts',
    icon: ACTION_ICONS.filter
  },
  filterModels: {
    id: 'filter-models',
    label: 'Filter models',
    icon: ACTION_ICONS.filter
  },
  filterDashboard: {
    id: 'filter-dashboard',
    label: 'Filter dashboard',
    icon: ACTION_ICONS.filter
  },
  settingsChangelog: {
    id: 'settings-changelog',
    label: 'Settings changelog',
    icon: ACTION_ICONS.changelog
  },
  routeSettings: {
    id: 'route-settings',
    label: 'Public route settings',
    icon: ACTION_ICONS.route
  },
  visibilitySettings: {
    id: 'visibility-settings',
    label: 'Visibility settings',
    icon: ACTION_ICONS.visibility
  },
  verificationSettings: {
    id: 'verification-settings',
    label: 'Verification settings',
    icon: ACTION_ICONS.verification
  },
  identitySettings: {
    id: 'identity-settings',
    label: 'Personal info',
    icon: ACTION_ICONS.identity
  },
  dashboardSummary: {
    id: 'dashboard-summary',
    label: 'Dashboard summary',
    icon: ACTION_ICONS.dashboard
  },
  dashboardMetrics: {
    id: 'dashboard-metrics',
    label: 'Dashboard metrics',
    icon: ACTION_ICONS.metrics
  },
  dashboardGraph: {
    id: 'dashboard-graph',
    label: 'Dashboard graph',
    icon: ACTION_ICONS.graph
  },
  organizationSettings: {
    id: 'organization-settings',
    label: 'Organization settings',
    icon: ACTION_ICONS.organization
  }
});

const CONTEXT_ACTIONS = Object.freeze({
  home: ['createPost', 'filterPosts'],
  overview: ['createPost', 'filterPosts'],
  posts: ['createPost', 'filterPosts'],
  thoughts: ['createThought', 'filterThoughts'],
  models: ['createModel', 'filterModels'],
  organizations: ['organizationSettings'],
  dashboard: ['filterDashboard'],
  settings: ['identitySettings', 'settingsChangelog']
});

function toolbarRoots(){
  return Array.from(document.querySelectorAll('[data-profile-right-toolbar]'));
}

function resolveActionKeys(state = getProfileNavigationState()){
  return CONTEXT_ACTIONS[state.section] || CONTEXT_ACTIONS.home;
}

function renderToolbarActions(root, state = getProfileNavigationState()){
  const nav = root.querySelector('[data-profile-right-toolbar-actions]');
  if (!(nav instanceof HTMLElement)) return;

  const actionKeys = resolveActionKeys(state);
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
    case 'create-model':
      window.location.href = '/pages/models/create/index.html';
      return;
    case 'filter-posts':
      document.dispatchEvent(new CustomEvent('profile:filter-open-request', {
        detail: { context: 'posts', source: 'profile-right-toolbar' }
      }));
      return;
    case 'filter-thoughts':
      document.dispatchEvent(new CustomEvent('profile:filter-open-request', {
        detail: { context: 'thoughts', source: 'profile-right-toolbar' }
      }));
      return;
    case 'filter-models':
      document.dispatchEvent(new CustomEvent('profile:filter-open-request', {
        detail: { context: 'models', source: 'profile-right-toolbar' }
      }));
      return;
    case 'filter-dashboard':
      document.dispatchEvent(new CustomEvent('profile:filter-open-request', {
        detail: { context: 'dashboard', source: 'profile-right-toolbar' }
      }));
      return;
    case 'settings-changelog':
      document.dispatchEvent(new CustomEvent('profile:filter-open-request', {
        detail: { context: 'settingsChangelog', source: 'profile-right-toolbar' }
      }));
      return;
    case 'route-settings':
      document.dispatchEvent(new CustomEvent('profile:navigate-request', {
        detail: { section: 'settings', settingsPane: 'route' }
      }));
      return;
    case 'visibility-settings':
      document.dispatchEvent(new CustomEvent('profile:navigate-request', {
        detail: { section: 'settings', settingsPane: 'visibility' }
      }));
      return;
    case 'verification-settings':
      document.dispatchEvent(new CustomEvent('profile:navigate-request', {
        detail: { section: 'settings', settingsPane: 'verification' }
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
      storedState
        || (root.getAttribute('data-profile-right-toolbar-rail') === 'collapsed'
          ? 'collapsed'
          : 'expanded')
    );
  });
}

export function initProfileRightToolbar(){
  bindRightToolbar();
  bootRightToolbar();
}

subscribeProfileNavigation((state) => {
  toolbarRoots().forEach((root) => renderToolbarActions(root, state));
});

document.addEventListener('fragment:mounted', (event) => {
  if(event?.detail?.name !== 'profile-private-right-toolbar') return;
  initProfileRightToolbar();
});

initProfileRightToolbar();
