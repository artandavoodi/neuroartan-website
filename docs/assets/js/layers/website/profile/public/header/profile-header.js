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
  const toggle = root.querySelector('[data-profile-follow-menu-toggle]');

  if (menu instanceof HTMLElement) {
    menu.hidden = !open;
  }

  if (toggle instanceof HTMLElement) {
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
}

function applyBadgeTone(badge, tone) {
  if (!(badge instanceof HTMLElement)) return;

  badge.classList.remove('ui-badge--success', 'ui-badge--warning', 'ui-badge--danger', 'ui-badge--info');

  if (tone) {
    badge.classList.add(`ui-badge--${tone}`);
  }
}

function resolvePublicBadgeTone(state) {
  switch (state.routeOutcome) {
    case 'found_renderable':
      return 'success';
    case 'invalid_username':
    case 'restricted_username':
    case 'not_found':
    case 'error':
      return 'danger';
    case 'reserved_but_hidden':
    case 'reserved_but_not_ready':
    case 'reserved_but_disabled':
    case 'loading':
      return 'warning';
    default:
      return '';
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

/* =============================================================================
   03) PUBLIC PROFILE HEADER RENDER
   ============================================================================= */

function renderPublicHeader(state = getProfileRuntimeState()) {
  getProfileHeaderRoots().forEach((root) => {
    root.dataset.profileViewerState = 'public';
    root.dataset.profileStateKey = state.stateKey;

    const badge = root.querySelector('[data-profile-header-state-badge]');
    if (badge) {
      badge.textContent = state.stateBadgeLabel;
      applyBadgeTone(badge, resolvePublicBadgeTone(state));
    }

    setText(root, '[data-profile-header-state-line]', state.stateLine);
    setText(root, '[data-profile-display-name]', state.displayName);
    setText(root, '[data-profile-username]', state.username.normalized ? `@${state.username.normalized}` : '@username');
    setText(root, '[data-profile-route-display]', state.publicRouteDisplay || 'neuroartan.com/username');
    setText(root, '[data-profile-summary]', state.summary);
    setText(root, '[data-profile-primary-action-label]', state.primaryActionLabel);
    setText(root, '[data-profile-verified-label]', state.verificationLabel);
    setText(root, '[data-profile-creator-line]', state.creatorLine);
    setText(root, '[data-profile-joined-year]', state.joinedYearLabel);
    setText(root, '[data-profile-interaction-mode]', state.interactionModeLabel);
    setText(root, '[data-profile-availability-state]', state.availabilityLabel);
    setText(root, '[data-profile-legacy-state]', state.legacyStateLabel);
    setText(root, '[data-profile-trust-value]', state.trustValue);
    setText(root, '[data-profile-trust-copy]', state.trustCopy);
    setText(root, '[data-profile-availability-value]', state.availabilityValue);
    setText(root, '[data-profile-availability-copy]', state.availabilityCopy);
    setText(root, '[data-profile-route-metric-value]', state.routeOutcomeValue);
    setText(root, '[data-profile-route-metric-copy]', state.visibilityCopy || state.routeOutcomeCopy);

    setHidden(root, '[data-profile-verified-block]', !state.verificationVisible);
    setHidden(root, '[data-profile-creator-line]', !state.creatorLine);

    renderAvatar(root, state);

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
    button.dataset.profileAction = graph.viewerFollowing ? 'unfollow-profile' : 'follow-profile';

    if (label) {
      label.textContent = graph.viewerFollowing ? 'Following' : 'Follow';
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
    button.textContent = 'Subscribe';
    return;
  }

  try {
    const subscription = await getProfileSubscriptionState(profileId);
    root.dataset.profileSubscriptionBackend = subscription.tableAvailable ? 'ready' : 'pending';
    button.disabled = !subscription.tableAvailable;
    button.setAttribute('aria-disabled', subscription.tableAvailable ? 'false' : 'true');
    button.dataset.profileAction = subscription.viewerSubscribed ? 'unsubscribe-profile' : 'subscribe-profile';
    button.textContent = subscription.viewerSubscribed ? 'Subscribed' : 'Subscribe';
  } catch (error) {
    console.error('[profile-public-header] Subscribe control render failed.', error);
    root.dataset.profileSubscriptionBackend = 'error';
    button.disabled = true;
    button.setAttribute('aria-disabled', 'true');
    button.textContent = 'Subscribe unavailable';
  }
}

/* =============================================================================
   04) PUBLIC PROFILE HEADER INIT
   ============================================================================= */

function initPublicProfileHeader() {
  subscribeProfileRuntime(renderPublicHeader);

  document.addEventListener('click', (event) => {
    const toggle = event.target instanceof Element
      ? event.target.closest('[data-profile-follow-menu-toggle]')
      : null;

    if (toggle) {
      const root = toggle.closest('[data-profile-header][data-profile-surface="public"]');
      if (!root) return;

      event.preventDefault();
      const menu = root.querySelector('[data-profile-follow-menu]');
      setFollowMenuOpen(root, menu?.hidden !== false);
      return;
    }

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
