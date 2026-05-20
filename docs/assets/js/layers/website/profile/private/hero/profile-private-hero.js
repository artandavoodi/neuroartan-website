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
      { key: 'overview', label: 'Overview', section: 'overview' },
      { key: 'posts', label: 'Posts', section: 'posts' },
      { key: 'thoughts', label: 'Thoughts', section: 'thoughts' },
      { key: 'models', label: 'Models', section: 'models' },
      { key: 'organizations', label: 'Organizations', section: 'organizations' }
    ]
  },
  content: {
    label: 'Profile sections',
    tabs: [
      { key: 'overview', label: 'Overview', section: 'overview' },
      { key: 'posts', label: 'Posts', section: 'posts' },
      { key: 'thoughts', label: 'Thoughts', section: 'thoughts' },
      { key: 'models', label: 'Models', section: 'models' },
      { key: 'organizations', label: 'Organizations', section: 'organizations' }
    ]
  },
  dashboard: {
    label: 'Dashboard sections',
    tabs: [
      { key: 'summary', label: 'Summary', section: 'dashboard', dashboardPane: 'summary' },
      { key: 'metrics', label: 'Metrics', section: 'dashboard', dashboardPane: 'metrics' },
      { key: 'graph', label: 'Graph', section: 'dashboard', dashboardPane: 'graph' }
    ]
  },
  settings: {
    label: 'Profile settings sections',
    tabs: [
      { key: 'identity', label: 'Personal Info', section: 'settings', settingsPane: 'identity' },
      { key: 'route', label: 'Public Route', section: 'settings', settingsPane: 'route' },
      { key: 'verification', label: 'Verification', section: 'settings', settingsPane: 'verification' }
    ]
  },
  privacy: {
    label: 'Privacy settings sections',
    tabs: [
      { key: 'visibility', label: 'Visibility', section: 'settings', settingsPane: 'visibility' },
      { key: 'discovery', label: 'Discovery', section: 'settings', settingsPane: 'discovery' },
      { key: 'sharing', label: 'Sharing', section: 'settings', settingsPane: 'sharing' }
    ]
  }
};

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
        navigationState.settingsPane === 'visibility'
        || navigationState.settingsPane === 'discovery'
        || navigationState.settingsPane === 'sharing'
      ) {
        return 'privacy';
      }
      return 'settings';
    case 'dashboard':
      return 'dashboard';
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
      return navigationState.dashboardPane || 'summary';
    case 'overview':
      return 'overview';
    default:
      return 'overview';
  }
}

function getCurrentTabGroup(navigationState = getProfileNavigationState()) {
  return PROFILE_CONTEXT_TAB_GROUPS[getTabGroupKey(navigationState)] || PROFILE_CONTEXT_TAB_GROUPS.overview;
}

function getHeroStickyTop(root) {
  if (!(root instanceof HTMLElement)) return 0;

  const value = Number.parseFloat(getComputedStyle(root).top || '0');
  return Number.isFinite(value) ? value : 0;
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
    const coverUrl = state.coverDisplayUrl || state.coverUrl || '';
    if (coverUrl) {
      cover.style.backgroundImage = `linear-gradient(180deg, color-mix(in srgb, var(--bg-color) 16%, transparent), color-mix(in srgb, var(--bg-color) 46%, transparent)), url("${coverUrl}")`;
      cover.dataset.profileCoverImage = state.coverUrl ? 'true' : 'default';
    } else {
      cover.style.removeProperty('background-image');
      cover.dataset.profileCoverImage = 'false';
    }
  }
  setText(root, '[data-profile-display-name]', displayName || (profileComplete ? 'Private profile' : 'Profile not completed'));
  setText(root, '[data-profile-username]', username ? `@${username}` : '@username pending');
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
      button.textContent = tabConfig.label;
      button.dataset.profileTab = tabConfig.key;
      button.dataset.profileTabSection = tabConfig.section;
      if (tabConfig.settingsPane) button.dataset.profileTabSettingsPane = tabConfig.settingsPane;
      if (tabConfig.dashboardPane) button.dataset.profileTabDashboardPane = tabConfig.dashboardPane;
      tabsRoot.appendChild(button);
    });
  }

  tabsRoot.querySelectorAll('[data-profile-tab]').forEach((tab) => {
    const key = tab.getAttribute('data-profile-tab') || '';
    const active = key === activeTab;
    tab.setAttribute('aria-current', active ? 'page' : 'false');
    tab.dataset.profileTabActive = active ? 'true' : 'false';
  });
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
   06) HERO STICKY STATE
============================================================================= */
function syncProfileHeroStickyState() {
  const root = getHeroRoot();
  if (!(root instanceof HTMLElement)) return;

  const stickyTop = getHeroStickyTop(root);
  const rect = root.getBoundingClientRect();
  const isStuck = rect.top <= stickyTop + 0.5;

  root.dataset.profileHeroStuck = isStuck ? 'true' : 'false';

}

function bindProfileHeroStickyState() {
  const root = getHeroRoot();
  if (!root || root.dataset.profileHeroStickyBound === 'true') return;

  root.dataset.profileHeroStickyBound = 'true';

  let ticking = false;

  const requestSync = () => {
    if (ticking) return;
    ticking = true;

    window.requestAnimationFrame(() => {
      ticking = false;
      syncProfileHeroStickyState();
    });
  };

  window.addEventListener('scroll', requestSync, { passive:true });
  window.addEventListener('resize', requestSync, { passive:true });
  syncProfileHeroStickyState();
}

/* =============================================================================
   07) INITIALIZATION
============================================================================= */
function initProfilePrivateHero() {
  bindProfilePrivateHeroActions();
  bindProfileHeroStickyState();
  renderProfilePrivateHero();
  subscribeProfileRuntime(renderProfilePrivateHero);
  subscribeProfileNavigation(renderProfilePrivateHeroTabs);

  document.addEventListener('fragment:mounted', (event) => {
    if (event?.detail?.name !== 'profile-private-hero') return;
    bindProfilePrivateHeroActions();
    bindProfileHeroStickyState();
    renderProfilePrivateHero();
    syncProfileHeroStickyState();
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initProfilePrivateHero, { once:true });
} else {
  initProfilePrivateHero();
}
