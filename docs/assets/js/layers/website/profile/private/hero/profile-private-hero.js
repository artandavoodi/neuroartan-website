/* =============================================================================
   01) MODULE IDENTITY
   02) IMPORTS
   03) DOM HELPERS
   04) HERO STATE RENDERING
   05) HERO ACTIONS
   06) HERO STICKY STATE
   07) INITIALIZATION
============================================================================= */

/* =============================================================================
   01) MODULE IDENTITY
============================================================================= */
const MODULE_ID = 'profile-private-hero';

const PROFILE_CONTEXT_TAB_GROUPS = {
  overview: {
    label: 'Profile sections',
    tabs: [
      { key: 'posts', label: 'Posts', section: 'posts' },
      { key: 'thoughts', label: 'Thoughts', section: 'thoughts' },
      { key: 'models', label: 'Models', section: 'models' },
      { key: 'organizations', label: 'Organizations', section: 'organizations' }
    ]
  },
  content: {
    label: 'Profile sections',
    tabs: [
      { key: 'posts', label: 'Posts', section: 'posts' },
      { key: 'thoughts', label: 'Thoughts', section: 'thoughts' },
      { key: 'models', label: 'Models', section: 'models' },
      { key: 'organizations', label: 'Organizations', section: 'organizations' }
    ]
  },
  dashboard: {
    label: 'Dashboard sections',
    tabs: [
      { key: 'overview', label: 'Overview', section: 'dashboard', dashboardPane: 'overview' },
      { key: 'summary', label: 'Summary', section: 'dashboard', dashboardPane: 'summary' },
      { key: 'metrics', label: 'Metrics', section: 'dashboard', dashboardPane: 'metrics' },
      { key: 'graph', label: 'Graph', section: 'dashboard', dashboardPane: 'graph' }
    ]
  },
  editProfile: {
    label: 'Edit Profile',
    tabs: [
      { key: 'identity', label: 'Personal Info', section: 'settings', settingsPane: 'identity' },
      { key: 'route', label: 'Public Route', section: 'settings', settingsPane: 'route' },
      { key: 'privacy', label: 'Privacy & Visibility', section: 'settings', settingsPane: 'privacy' }
    ]
  },
  settings: {
    label: 'Settings',
    tabs: [
      { key: 'password', label: 'Password', section: 'settings', settingsPane: 'password' },
      { key: 'verification', label: 'Verification', section: 'settings', settingsPane: 'verification' }
    ]
  }
};

const PROFILE_CONTEXT_TAB_ICONS = Object.freeze({
  overview: '/registry/icons/public/assets/layers/website/profile/actions/profile-overview.svg',
  posts: '/registry/icons/public/assets/layers/website/profile/actions/posts.svg',
  thoughts: '/registry/icons/public/assets/layers/website/profile/actions/thoughts.svg',
  models: '/registry/icons/public/assets/layers/website/profile/actions/models.svg',
  organizations: '/registry/icons/public/assets/layers/website/profile/actions/organizations.svg',
  summary: '/registry/icons/public/assets/layers/website/profile/actions/profile-overview-panel.svg',
  metrics: '/registry/icons/public/assets/layers/website/profile/actions/profile-dashboard-metrics-panel.svg',
  graph: '/registry/icons/public/assets/layers/website/profile/actions/profile-dashboard-panel.svg',
  identity: '/registry/icons/public/assets/layers/website/profile/actions/identity-account-state-route-readiness.svg',
  route: '/registry/icons/public/assets/core/navigation/route/route.svg',
  privacy: '/registry/icons/public/assets/core/identity/access/visibility-on.svg',
  password: '/registry/icons/public/assets/core/identity/password/password.svg',
  verification: '/registry/icons/public/assets/core/identity/trust/verified.svg'
});

/* =============================================================================
   02) IMPORTS
============================================================================= */
import {
  getProfileRuntimeState,
  requestProfileAction,
  subscribeProfileRuntime
} from '../shell/profile-runtime.js';
import {
  getProfileNavigationState,
  subscribeProfileNavigation
} from '../navigation/profile-navigation.js';
import {
  getProfileSocialGraphState
} from '../../../system/profile/profile-social-graph.js';

/* =============================================================================
   03) DOM HELPERS
============================================================================= */
function getHeroRoot() {
  return document.querySelector('[data-profile-private-hero]');
}

function setText(root, selector, value) {
  const node = root?.querySelector(selector);
  if (!node) return;
  node.textContent = value || '';
}

function setImage(root, selector, src, alt = '') {
  const image = root?.querySelector(selector);
  if (!(image instanceof HTMLImageElement)) return;

  if (src) {
    image.hidden = false;
    image.src = src;
    image.alt = alt;
    return;
  }

  image.hidden = true;
  image.removeAttribute('src');
  image.alt = '';
}

function getTabGroupKey(navigationState = getProfileNavigationState()) {
  switch (navigationState.section) {
    case 'posts':
    case 'thoughts':
    case 'models':
    case 'organizations':
      return 'content';
    case 'settings':
      if (
        navigationState.settingsPane === 'identity'
        || navigationState.settingsPane === 'route'
        || navigationState.settingsPane === 'privacy'
      ) {
        return 'editProfile';
      }
      return 'settings';
    case 'dashboard':
      return 'dashboard';
    case 'home':
      return 'overview';
    case 'overview':
    default:
      return 'overview';
  }
}

function getActiveTabKey(navigationState = getProfileNavigationState()) {
  switch (navigationState.section) {
    case 'posts':
    case 'thoughts':
    case 'models':
    case 'organizations':
      return navigationState.section;
    case 'settings':
      return navigationState.settingsPane || 'identity';
    case 'dashboard':
      return navigationState.dashboardPane || 'overview';
    case 'home':
      return 'posts';
    case 'overview':
      return 'posts';
    default:
      return 'posts';
  }
}

function getCurrentTabGroup(navigationState = getProfileNavigationState()) {
  return PROFILE_CONTEXT_TAB_GROUPS[getTabGroupKey(navigationState)] || PROFILE_CONTEXT_TAB_GROUPS.overview;
}

function readRootLengthToken(name, fallback = 0) {
  const rawValue = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const parsedValue = Number.parseFloat(rawValue);
  return Number.isFinite(parsedValue) ? parsedValue : fallback;
}

function syncProfileMobileSidebarTop(root = getHeroRoot()) {
  if (!(root instanceof HTMLElement)) return;

  const tabsRoot = root.querySelector('[data-profile-hero-tabs]');
  if (!(tabsRoot instanceof HTMLElement)) return;

  const tabsRect = tabsRoot.getBoundingClientRect();
  const clearance = readRootLengthToken('--spacing-sm', 8);
  const nextTop = Math.max(0, tabsRect.bottom + clearance);

  document.documentElement.style.setProperty('--profile-mobile-sidebar-toggle-top', `${nextTop}px`);
}

/* =============================================================================
   04) HERO STATE RENDERING
============================================================================= */
function renderProfilePrivateHero(state = getProfileRuntimeState()) {
  const root = getHeroRoot();
  if (!root) return;

  const profile = state.profile || {};
  const username = String(profile.username || '').trim();
  const displayName = String(profile.display_name || profile.displayName || '').trim();
  const profileComplete = profile.profile_complete === true || state.profileComplete === true;

  setImage(root, '[data-profile-avatar-image]', state.avatarDisplayUrl || state.avatarUrl || '', `${displayName || 'Profile'} avatar`);
  const placeholderIcon = root.querySelector('[data-profile-avatar-placeholder-icon]');
  if (placeholderIcon instanceof HTMLElement) {
    placeholderIcon.hidden = state.avatarHasImage === true;
  }

  const cover = root.querySelector('[data-profile-cover]');
  if (cover instanceof HTMLElement) {
    const selectedCoverUrl = state.coverUrl || '';
    const coverUrl = state.coverDisplayUrl || selectedCoverUrl || '';
    if (coverUrl) {
      cover.style.backgroundImage = `url("${coverUrl}")`;
      cover.dataset.profileCoverImage = selectedCoverUrl ? 'true' : 'default';
    } else {
      cover.style.removeProperty('background-image');
      cover.dataset.profileCoverImage = 'false';
    }
  }
  setText(root, '[data-profile-display-name]', displayName || '');
  setText(root, '[data-profile-username]', username ? `@${username}` : '');
  const verifiedBlock = root.querySelector('[data-profile-verified-block]');
  if (verifiedBlock instanceof HTMLElement) {
    verifiedBlock.hidden = state.verification?.badgeVisible !== true;
  }
  const bio = String(
    state.bio
    || profile.bio
    || profile.public_bio
    || profile.public_summary
    || ''
  ).trim();
  const bioNode = root.querySelector('[data-profile-bio]');
  if (bioNode instanceof HTMLElement) {
    bioNode.textContent = bio;
    bioNode.hidden = !bio;
  }
  setText(root, '[data-profile-location]', String(profile.location || profile.public_location || '').trim() || 'Not set');
  setText(root, '[data-profile-role]', String(profile.role || profile.public_identity_label || '').trim() || 'Not set');
  setText(
    root,
    '[data-profile-hero-description]',
    profileComplete
      ? 'Your private profile foundation is active. Public identity, organizations, models, and workspace layers can be activated from controlled modules.'
      : 'Complete your private identity layer before activating public profile, organizations, models, or workspace access.'
  );
  setText(root, '[data-profile-followers-count]', String(Number(profile.followers_count || profile.follower_count || 0) || 0));
  setText(root, '[data-profile-following-count]', String(Number(profile.following_count || 0) || 0));

  void renderProfilePrivateHeroSocialGraph(profile);

  renderProfilePrivateHeroTabs(getProfileNavigationState());
}

async function renderProfilePrivateHeroSocialGraph(profile = {}) {
  const root = getHeroRoot();
  const profileId = String(profile?.id || '').trim();
  if (!root || !profileId) return;

  try {
    const graph = await getProfileSocialGraphState(profileId);
    setText(root, '[data-profile-followers-count]', String(graph.followersCount || 0));
    setText(root, '[data-profile-following-count]', String(graph.followingCount || 0));
    root.dataset.profileSocialGraphBackend = graph.tableAvailable ? 'ready' : 'pending';
  } catch (error) {
    console.error('[profile-private-hero] Social graph render failed.', error);
    root.dataset.profileSocialGraphBackend = 'error';
  }
}

function renderProfilePrivateHeroTabs(navigationState = getProfileNavigationState()) {
  const root = getHeroRoot();
  if (!root) return;

  const homeSections = new Set(['home', 'posts', 'thoughts', 'models', 'organizations']);
  const isHomeSection = homeSections.has(navigationState.section);
  const surface = root.querySelector('.profile-private-hero__surface');
  if (surface instanceof HTMLElement) {
    surface.dataset.profileHeroVisible = isHomeSection ? 'true' : 'false';
  }

  const tabsRoot = root.querySelector('[data-profile-hero-tabs]');
  if (!(tabsRoot instanceof HTMLElement)) return;

  const group = getCurrentTabGroup(navigationState);
  const activeTab = getActiveTabKey(navigationState);
  const nextSignature = `${getTabGroupKey(navigationState)}:${activeTab}`;

  tabsRoot.setAttribute('aria-label', group.label);
  if (tabsRoot.dataset.profileHeroTabsSignature !== nextSignature) {
    tabsRoot.dataset.profileHeroTabsSignature = nextSignature;
    tabsRoot.replaceChildren();

    group.tabs.forEach((tabConfig) => {
      const button = document.createElement('button');
      button.className = 'profile-private-hero__tab';
      button.type = 'button';
      button.dataset.profileTab = tabConfig.key;
      button.dataset.profileTabSection = tabConfig.section;
      if (tabConfig.settingsPane) button.dataset.profileTabSettingsPane = tabConfig.settingsPane;
      if (tabConfig.dashboardPane) button.dataset.profileTabDashboardPane = tabConfig.dashboardPane;
      const iconPath = PROFILE_CONTEXT_TAB_ICONS[tabConfig.key] || '';
      if (iconPath) {
        const iconWrap = document.createElement('span');
        iconWrap.className = 'profile-private-hero__tab-icon-wrap';
        iconWrap.setAttribute('aria-hidden', 'true');

        const icon = document.createElement('img');
        icon.className = tabConfig.key === 'verification'
          ? 'profile-private-hero__tab-icon'
          : 'profile-private-hero__tab-icon ui-icon-theme-aware';
        icon.src = iconPath;
        icon.alt = '';
        icon.setAttribute('aria-hidden', 'true');
        iconWrap.appendChild(icon);
        button.appendChild(iconWrap);
      }
      const label = document.createElement('span');
      label.className = 'profile-private-hero__tab-label';
      label.textContent = tabConfig.label;
      button.appendChild(label);
      tabsRoot.appendChild(button);
    });
  }

  tabsRoot.querySelectorAll('[data-profile-tab]').forEach((tab) => {
    const key = tab.getAttribute('data-profile-tab') || '';
    const active = key === activeTab;
    tab.setAttribute('aria-current', active ? 'page' : 'false');
    tab.dataset.profileTabActive = active ? 'true' : 'false';
  });

  syncProfileMobileSidebarTop(root);
}

/* =============================================================================
   05) HERO ACTIONS
============================================================================= */
function bindProfilePrivateHeroActions() {
  const root = getHeroRoot();
  if (!root || root.dataset.profilePrivateHeroBound === 'true') return;

  root.dataset.profilePrivateHeroBound = 'true';
  root.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-profile-action]');
    const tab = event.target.closest('[data-profile-tab]');
    const infoToggle = event.target.closest('[data-profile-hero-info-toggle]');

    if (infoToggle) {
      event.preventDefault();
      const popover = root.querySelector('[data-profile-hero-info-popover]');
      const isOpen = infoToggle.getAttribute('aria-expanded') === 'true';
      infoToggle.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
      if (popover instanceof HTMLElement) {
        popover.hidden = isOpen;
      }
      return;
    }

    if (tab) {
      event.preventDefault();
      document.dispatchEvent(new CustomEvent('profile:navigate-request', {
        detail: {
          section: tab.getAttribute('data-profile-tab-section') || 'overview',
          settingsPane: tab.getAttribute('data-profile-tab-settings-pane') || undefined,
          dashboardPane: tab.getAttribute('data-profile-tab-dashboard-pane') || undefined
        }
      }));
      return;
    }

    if (!trigger) return;

    event.preventDefault();
    event.stopPropagation();
    requestProfileAction(trigger.dataset.profileAction || '', {
      source: MODULE_ID,
      mediaKind: trigger.dataset.profileAction === 'edit-cover' ? 'cover' : 'avatar'
    });
  });

  document.addEventListener('click', (event) => {
    if (!root.contains(event.target)) {
      closeProfileHeroInfo(root);
      return;
    }

    if (event.target.closest('[data-profile-hero-info-toggle]')) return;
    if (event.target.closest('[data-profile-hero-info-popover]')) return;
    closeProfileHeroInfo(root);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    closeProfileHeroInfo(root);
  });
}

function closeProfileHeroInfo(root = getHeroRoot()) {
  if (!root) return;
  const toggle = root.querySelector('[data-profile-hero-info-toggle]');
  const popover = root.querySelector('[data-profile-hero-info-popover]');
  toggle?.setAttribute('aria-expanded', 'false');
  if (popover instanceof HTMLElement) {
    popover.hidden = true;
  }
}

/* =============================================================================
   07) INITIALIZATION
============================================================================= */
function initProfilePrivateHero() {
  bindProfilePrivateHeroActions();
  renderProfilePrivateHero();
  subscribeProfileRuntime(renderProfilePrivateHero);
  subscribeProfileNavigation(renderProfilePrivateHeroTabs);

  document.addEventListener('fragment:mounted', (event) => {
    if (event?.detail?.name !== 'profile-private-hero') return;
    bindProfilePrivateHeroActions();
    renderProfilePrivateHero();
    syncProfileMobileSidebarTop();
  });

  document.addEventListener('profile:sidebar-rail-change', () => {
    window.requestAnimationFrame(() => syncProfileMobileSidebarTop());
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initProfilePrivateHero, { once:true });
} else {
  initProfilePrivateHero();
}
