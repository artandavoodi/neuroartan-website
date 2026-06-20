/* =============================================================================
   01) MODULE IMPORTS
   ============================================================================= */

import {
  getProfileRuntimeState,
  subscribeProfileRuntime
} from '../../private/shell/profile-runtime.js';
import {
  getProfileNavigationState,
  subscribeProfileNavigation
} from '../../private/navigation/profile-navigation.js';
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

function readHeaderModelText(model = {}, keys = []) {
  for (const key of keys) {
    const value = String(model?.[key] || '').trim();
    if (value) return value;
  }
  return '';
}

function getPublicHeaderHashTabKey() {
  const hash = String(window.location.hash || '').trim().replace(/^#/, '').toLowerCase();
  if (hash === 'model-management' || hash === 'model') return 'model';
  if (hash === 'highlights') return 'highlights';
  if (hash === 'posts') return 'posts';
  return '';
}

function getPublicHeaderActiveTabKey() {
  const hashTabKey = getPublicHeaderHashTabKey();
  if (hashTabKey) return hashTabKey;

  const navigationState = getProfileNavigationState();
  if (navigationState.section === 'model-management' || navigationState.section === 'model') return 'model';
  if (navigationState.section === 'highlights') return 'highlights';
  return 'posts';
}

function buildPublicHeaderRenderState(state = getProfileRuntimeState()) {
  const model = {
    ...(state.publicProfile || {}),
    ...(state.publicProfile?.model_public_identity || {}),
    ...(state.publicProfile?.public_model || {}),
    ...(state.publicProfile?.model || {}),
    ...(state.public_model || {}),
    ...(state.publicModel || {}),
    ...(state.model || {})
  };
  const modelHeaderActive = getPublicHeaderActiveTabKey() === 'model';

  if (!modelHeaderActive) {
    return state;
  }

  const modelDisplayName = readHeaderModelText(model, ['modelNickname', 'model_nickname', 'nickname', 'model_name', 'display_name', 'name']);
  const modelSummary = readHeaderModelText(model, ['description', 'public_description', 'public_summary', 'modelPurposeDescription', 'model_purpose_description']);
  const modelAvatarUrl = readHeaderModelText(model, ['public_avatar_url', 'model_avatar_url', 'public_model_avatar_url', 'model_image_url', 'modelAvatar', 'avatarDisplayUrl', 'avatarUrl', 'avatar_url', 'image_url']);
  const modelAvatarColor = readHeaderModelText(model, ['model_avatar_color', 'modelAvatarColor', 'avatar_color', 'avatarColor']);
  const modelCoverUrl = readHeaderModelText(model, ['public_cover_url', 'model_cover_url', 'public_model_cover_url', 'modelCover', 'coverDisplayUrl', 'coverUrl', 'cover_url', 'hero_image_url', 'header_image_url']);

  return {
    ...state,
    modelHeaderActive: true,
    displayName: modelDisplayName || state.displayName || state.profile?.public_display_name || state.profile?.display_name || '',
    summary: modelSummary || state.summary || state.profile?.public_summary || state.profile?.public_bio || '',
    avatarDisplayUrl: modelAvatarUrl,
    avatarUrl: modelAvatarUrl,
    modelAvatarColor,
    model_avatar_color: modelAvatarColor,
    avatar_color: modelAvatarColor,
    coverDisplayUrl: modelCoverUrl,
    coverUrl: modelCoverUrl
  };
}

function setFollowMenuOpen(root, open) {
  const menu = root.querySelector('[data-profile-follow-menu]');
  const toggle = root.querySelector('[data-profile-follow-menu-toggle]');
  const button = root.querySelector('[data-profile-follow-primary]');
  const followed = button instanceof HTMLButtonElement && button.dataset.profileFollowState === 'followed';
  const shouldOpen = Boolean(open && followed);

  if (menu instanceof HTMLElement) {
    menu.hidden = !shouldOpen;
  }

  if (toggle instanceof HTMLButtonElement) {
    toggle.hidden = !followed;
    toggle.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
    toggle.setAttribute('aria-haspopup', 'menu');
  }

  if (button instanceof HTMLButtonElement) {
    button.setAttribute('aria-pressed', followed ? 'true' : 'false');
  }
}

function renderAvatar(root, state) {
  const image = root.querySelector('[data-profile-avatar-image]');
  const placeholder = root.querySelector('[data-profile-avatar-placeholder]');
  const surface = root.querySelector('.profile-header__avatar-surface');
  const avatarUrl = state.avatarDisplayUrl || state.avatarUrl || '';

  if (surface instanceof HTMLElement) {
    surface.classList.toggle('model-management__avatar', state.modelHeaderActive === true);
    if (state.modelHeaderActive === true) {
      const avatarColor = String(state.modelAvatarColor || state.model_avatar_color || state.avatar_color || '').trim();
      if (avatarUrl) {
        surface.style.removeProperty('background-color');
      } else if (avatarColor) {
        surface.style.backgroundColor = avatarColor;
      } else {
        surface.style.removeProperty('background-color');
      }
    } else {
      surface.style.removeProperty('background-color');
    }
  }

  if (image instanceof HTMLImageElement) {
    if (avatarUrl) {
      image.hidden = false;
      if (image.getAttribute('src') !== avatarUrl) {
        image.src = avatarUrl;
      }
      image.alt = `${state.displayName} avatar`;
    } else {
      image.hidden = true;
      image.removeAttribute('src');
      image.alt = '';
    }
  }

  if (placeholder instanceof HTMLElement) {
    placeholder.hidden = state.modelHeaderActive === true || Boolean(state.avatarDisplayUrl || state.avatarUrl);
  }
}

function renderCover(root, state) {
  const cover = root.querySelector('[data-profile-public-cover]');
  if (!(cover instanceof HTMLElement)) return;

  const coverUrl = state.coverDisplayUrl || state.coverUrl || state.defaultCoverUrl || '';
  if (coverUrl) {
    cover.style.backgroundImage = `linear-gradient(180deg, color-mix(in srgb, var(--bg-color) 12%, transparent), color-mix(in srgb, var(--bg-color) 48%, transparent)), url("${coverUrl}")`;
    cover.dataset.profilePublicCoverState = coverUrl ? 'custom' : 'default';
    return;
  }

  cover.style.removeProperty('background-image');
  cover.dataset.profilePublicCoverState = 'empty';
}

/* =============================================================================
   03) PUBLIC PROFILE HEADER RENDER
   ============================================================================= */

function renderPublicHeader(state = getProfileRuntimeState()) {
  const renderState = buildPublicHeaderRenderState(state);
  const activeTabKey = getPublicHeaderActiveTabKey();

  getProfileHeaderRoots().forEach((root) => {
    root.dataset.profileViewerState = 'public';
    root.dataset.profileStateKey = state.stateKey;
    root.dataset.profileActiveSection = activeTabKey;

    setText(root, '[data-profile-display-name]', renderState.displayName);
    setText(root, '[data-profile-username]', state.username.normalized ? `@${state.username.normalized}` : '@username');
    setText(root, '[data-profile-summary]', renderState.summary);

    setHidden(root, '[data-profile-verified-block]', !state.verificationVisible);

    renderAvatar(root, renderState);
    renderCover(root, renderState);

    renderPublicFollowControl(root, state);
    renderPublicSubscribeControl(root, state);
  });
}

async function renderPublicFollowControl(root, state = getProfileRuntimeState()) {
  const control = root.querySelector('[data-profile-follow-control]');
  const button = root.querySelector('[data-profile-follow-primary]');
  const toggle = root.querySelector('[data-profile-follow-menu-toggle]');
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
    button.dataset.profileAction = graph.viewerFollowing ? 'profile-followed-state' : 'follow-profile';
    button.dataset.profileFollowState = graph.viewerFollowing ? 'followed' : 'unfollowed';
    button.setAttribute('aria-pressed', graph.viewerFollowing ? 'true' : 'false');
    if (toggle instanceof HTMLButtonElement) {
      toggle.hidden = !graph.viewerFollowing;
      toggle.dataset.profileAction = 'open-follow-menu';
    }
    setFollowMenuOpen(root, false);

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
  subscribeProfileNavigation(() => renderPublicHeader(getProfileRuntimeState()));
  window.addEventListener('hashchange', () => renderPublicHeader(getProfileRuntimeState()));
  window.addEventListener('popstate', () => renderPublicHeader(getProfileRuntimeState()));

  document.addEventListener('click', (event) => {
    document.querySelectorAll('[data-profile-header][data-profile-surface="public"]').forEach((root) => {
      if (event.target instanceof Node && root.contains(event.target)) return;
      setFollowMenuOpen(root, false);
    });
  });

  document.addEventListener('click', (event) => {
    const toggle = event.target instanceof Element ? event.target.closest('[data-profile-follow-menu-toggle]') : null;
    if (!(toggle instanceof HTMLButtonElement)) return;
    const root = toggle.closest('[data-profile-header][data-profile-surface="public"]');
    if (!(root instanceof HTMLElement)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    setFollowMenuOpen(root, root.querySelector('[data-profile-follow-menu]')?.hidden !== false);
  }, true);

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    document.querySelectorAll('[data-profile-header][data-profile-surface="public"]').forEach((root) => setFollowMenuOpen(root, false));
  });

  document.addEventListener('profile:social-graph-changed', () => {
    renderPublicHeader(getProfileRuntimeState());
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
    renderPublicHeader(getProfileRuntimeState());
  });

  document.addEventListener('fragment:mounted', (event) => {
    if (event?.detail?.name !== 'profile-public-header') return;
    renderPublicHeader(getProfileRuntimeState());
  });

  renderPublicHeader(getProfileRuntimeState());
}

initPublicProfileHeader();
