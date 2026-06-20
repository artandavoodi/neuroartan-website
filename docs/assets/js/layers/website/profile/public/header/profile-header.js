/* =============================================================================
   01) MODULE IMPORTS
   02) PUBLIC PROFILE HEADER HELPERS
   03) PUBLIC PROFILE HEADER RENDER
   04) PUBLIC PROFILE HEADER INIT
   ============================================================================= */

/* =============================================================================
   01) MODULE IMPORTS
   ============================================================================= */

import {
  getProfileRuntimeState,
  subscribeProfileRuntime
} from '../../private/shell/profile-runtime.js';
import {
  getProfileSubscriptionState,
  getProfileSocialGraphState
} from '../../../system/profile/profile-social-graph.js';

/* =============================================================================
   02) PUBLIC PROFILE HEADER HELPERS
   ============================================================================= */

function getProfileHeaderRoots() {
  return Array.from(document.querySelectorAll('[data-profile-header][data-profile-surface="public"]'));
}

function setText(root, selector, value) {
  const node = root.querySelector(selector);
  if (!node) return;
  node.textContent = value || '';
}

function setHidden(root, selector, hidden) {
  const node = root.querySelector(selector);
  if (!(node instanceof HTMLElement)) return;
  node.hidden = hidden;
}

function setControlDisabled(control, disabled) {
  if (!(control instanceof HTMLElement)) return;

  if (control instanceof HTMLButtonElement) {
    control.disabled = disabled;
  }

  control.setAttribute('aria-disabled', disabled ? 'true' : 'false');
}

function setFollowMenuOpen(root, open) {
  const menu = root.querySelector('[data-profile-follow-menu]');
  const toggle = null;

  if (menu instanceof HTMLElement) {
    menu.hidden = !open;
  }

  if (toggle instanceof HTMLElement) {
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
}

function renderAvatar(root, state) {
  const image = root.querySelector('[data-profile-avatar-image]');
  const placeholder = root.querySelector('[data-profile-avatar-placeholder]');

  if (image instanceof HTMLImageElement) {
    const avatarUrl = state.avatarDisplayUrl || state.avatarUrl || '';
    if (avatarUrl) {
      image.hidden = false;
      image.src = avatarUrl;
      image.alt = `${state.displayName} avatar`;
    } else {
      image.hidden = true;
      image.removeAttribute('src');
      image.alt = '';
    }
  }

  if (placeholder instanceof HTMLElement) {
    placeholder.hidden = true;
  }
}

function renderCover(root, state) {
  const cover = root.querySelector('[data-profile-public-cover]');
  if (!(cover instanceof HTMLElement)) return;

  const coverUrl = state.coverDisplayUrl || state.coverUrl || state.defaultCoverUrl || '';
  if (coverUrl) {
    cover.style.backgroundImage = `linear-gradient(180deg, color-mix(in srgb, var(--bg-color) 12%, transparent), color-mix(in srgb, var(--bg-color) 48%, transparent)), url("${coverUrl}")`;
    cover.dataset.profilePublicCoverState = state.coverUrl ? 'custom' : 'default';
    return;
  }

  cover.style.removeProperty('background-image');
  cover.dataset.profilePublicCoverState = 'empty';
}

/* =============================================================================
   03) PUBLIC PROFILE HEADER RENDER
   ============================================================================= */

function renderPublicHeader(state = getProfileRuntimeState()) {
  getProfileHeaderRoots().forEach((root) => {
    root.dataset.profileViewerState = 'public';
    root.dataset.profileStateKey = state.stateKey;

    setText(root, '[data-profile-display-name]', state.displayName);
    setText(root, '[data-profile-username]', state.username.normalized ? `@${state.username.normalized}` : '@username');
    setText(root, '[data-profile-summary]', state.summary);

    setHidden(root, '[data-profile-verified-block]', !state.verificationVisible);

    renderAvatar(root, state);
    renderCover(root, state);

    const copyAction = root.querySelector('[data-profile-action="copy-link"]');
    setControlDisabled(copyAction, !state.publicRouteUrl);

    renderPublicFollowControl(root, state);
    renderPublicSubscribeControl(root, state);
  });
}

async function renderPublicFollowControl(root, state = getProfileRuntimeState()) {
  const control = root.querySelector('[data-profile-follow-control]');
  const button = root.querySelector('[data-profile-follow-primary]');
  const label = root.querySelector('[data-profile-follow-label]');
  const profileId = String(state.profileId || '').trim();
  const available = state.routeOutcome === 'found_renderable' && Boolean(profileId);

  if (!(control instanceof HTMLElement) || !(button instanceof HTMLButtonElement)) return;

  control.hidden = !available;
  button.disabled = !available;
  button.setAttribute('aria-disabled', available ? 'false' : 'true');

  if (!available) {
    setFollowMenuOpen(root, false);
    return;
  }

  try {
    const graph = await getProfileSocialGraphState(profileId);
    root.dataset.profileSocialGraphBackend = graph.tableAvailable ? 'ready' : 'pending';
    setText(root, '[data-profile-followers-count]', String(graph.followersCount || 0));
    setText(root, '[data-profile-following-count]', String(graph.followingCount || 0));
    button.dataset.profileAction = graph.viewerFollowing ? 'unfollow-profile' : 'follow-profile';
    button.dataset.profileFollowState = graph.viewerFollowing ? 'followed' : 'unfollowed';
    button.setAttribute('aria-pressed', graph.viewerFollowing ? 'true' : 'false');
    setFollowMenuOpen(root, false);

    const menuToggle = null;
    if (menuToggle instanceof HTMLButtonElement) {
      menuToggle.hidden = true;
      menuToggle.setAttribute('aria-expanded', 'false');
    }

    if (label) {
      label.textContent = graph.viewerFollowing ? 'Followed' : 'Follow';
    }
  } catch (error) {
    console.error('[profile-public-header] Follow control render failed.', error);
    root.dataset.profileSocialGraphBackend = 'error';
    button.disabled = true;
    button.setAttribute('aria-disabled', 'true');

    if (label) {
      label.textContent = 'Follow unavailable';
    }
  }
}

async function renderPublicSubscribeControl(root, state = getProfileRuntimeState()) {
  const button = root.querySelector('[data-profile-subscribe-action]');
  const profileId = String(state.profileId || '').trim();
  const available = state.routeOutcome === 'found_renderable' && Boolean(profileId);

  if (!(button instanceof HTMLButtonElement)) return;

  button.disabled = !available;
  button.setAttribute('aria-disabled', available ? 'false' : 'true');

  if (!available) {
    button.textContent = '';
    return;
  }

  try {
    const graph = await getProfileSocialGraphState(profileId);

    if (!graph.viewerFollowing) {
      button.hidden = true;
      button.disabled = true;
      button.removeAttribute('data-profile-action');
      button.removeAttribute('data-profile-subscribe-state');
      button.setAttribute('aria-disabled', 'true');
      button.setAttribute('aria-pressed', 'false');
      button.textContent = '';
      return;
    }

    const subscription = await getProfileSubscriptionState(profileId);
    root.dataset.profileSubscriptionBackend = subscription.tableAvailable ? 'ready' : 'pending';
    button.hidden = false;
    button.disabled = !subscription.tableAvailable;
    button.setAttribute('aria-disabled', subscription.tableAvailable ? 'false' : 'true');
    button.setAttribute('aria-pressed', subscription.viewerSubscribed ? 'true' : 'false');
    button.dataset.profileAction = subscription.viewerSubscribed ? 'unsubscribe-profile' : 'subscribe-profile';
    button.dataset.profileSubscribeState = subscription.viewerSubscribed ? 'subscribed' : 'unsubscribed';
    button.innerHTML = '<span class="profile-header__subscribe-icon" aria-hidden="true">✦</span><span class="sr-only">Subscribe</span>';
  } catch (error) {
    console.error('[profile-public-header] Subscribe control render failed.', error);
    root.dataset.profileSubscriptionBackend = 'error';
    button.disabled = true;
    button.setAttribute('aria-disabled', 'true');
    button.textContent = '';
  }
}

/* =============================================================================
   04) PUBLIC PROFILE HEADER INIT
   ============================================================================= */

function initPublicProfileHeader() {
  subscribeProfileRuntime(renderPublicHeader);

  document.addEventListener('click', (event) => {
    document.querySelectorAll('[data-profile-header][data-profile-surface="public"]').forEach((root) => {
      if (event.target instanceof Node && root.contains(event.target)) return;
      setFollowMenuOpen(root, false);
    });
  });

  document.addEventListener('profile:social-graph-changed', () => {
    renderPublicHeader();
  });

  document.addEventListener('profile:action-request', (event) => {
    const action = event instanceof CustomEvent ? event.detail?.action : '';
    if (action !== 'view-profile-models') return;

    const state = getProfileRuntimeState();
    window.location.href = state.username?.normalized
      ? `/pages/models/index.html?profile=${encodeURIComponent(state.username.normalized)}`
      : '/pages/models/index.html';
  });

  document.addEventListener('profile:subscription-changed', () => {
    renderPublicHeader();
  });

  document.addEventListener('fragment:mounted', (event) => {
    if (event?.detail?.name !== 'profile-public-header') return;
    renderPublicHeader();
  });

  renderPublicHeader();
}

initPublicProfileHeader();
