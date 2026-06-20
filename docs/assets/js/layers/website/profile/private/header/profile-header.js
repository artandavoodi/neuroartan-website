/* =============================================================================
   01) MODULE IMPORTS
   02) PROFILE HEADER HELPERS
   03) PROFILE HEADER RENDER
   04) PROFILE HEADER INIT
   ============================================================================= */

/* =============================================================================
   01) MODULE IMPORTS
   ============================================================================= */

import { getProfileRuntimeState, subscribeProfileRuntime } from '../shell/profile-runtime.js';

/* =============================================================================
   02) PROFILE HEADER HELPERS
   ============================================================================= */

function getProfileHeaderRoots() {
  return Array.from(document.querySelectorAll('[data-profile-header][data-profile-surface="private"]'));
}

function setText(root, selector, value) {
  const node = root.querySelector(selector);
  if (!node) return;
  node.textContent = value;
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

function applyBadgeTone(badge, tone) {
  if (!(badge instanceof HTMLElement)) return;

  badge.classList.remove('ui-badge--success', 'ui-badge--warning', 'ui-badge--danger', 'ui-badge--info');

  if (tone) {
    badge.classList.add(`ui-badge--${tone}`);
  }
}

function capitalizeWords(value) {
  return String(value || '')
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatUsernameCopy(state) {
  if (!state.username.normalized) {
    return 'Username not yet reserved';
  }

  if (state.username.status === 'reserved') {
    return `@${state.username.normalized} is reserved`;
  }

  return capitalizeWords(state.username.status || 'pending');
}

function formatVisibilityCopy(state) {
  if (state.publicViewAvailable) {
    return 'Public route is renderable on the company domain';
  }

  if (state.username.normalized) {
    return 'Username is held privately until public visibility is enabled';
  }

  return 'Public route not yet enabled';
}

function setProfileImageSource(image, primarySrc, altText) {
  if (!(image instanceof HTMLImageElement)) return;

  if (!primarySrc) {
    image.hidden = true;
    image.removeAttribute('src');
    image.alt = '';
    delete image.dataset.profileUsingFallback;
    delete image.dataset.profileFallbackBound;
    return;
  }

  if (image.dataset.profileErrorBound !== 'true') {
    image.addEventListener('error', () => {
      image.hidden = true;
      image.removeAttribute('src');
      image.alt = '';
    });
    image.dataset.profileErrorBound = 'true';
  }

  image.hidden = false;
  image.alt = altText;
  image.src = primarySrc;
}

function setProfileBackgroundSource(node, primarySrc) {
  if (!(node instanceof HTMLElement)) return;

  if (!primarySrc) {
    node.hidden = true;
    node.style.removeProperty('background-image');
    node.style.removeProperty('background-size');
    node.style.removeProperty('background-position');
    node.style.removeProperty('background-repeat');
    return;
  }

  node.hidden = false;
  node.style.backgroundImage = `url("${primarySrc}")`;
  node.style.backgroundSize = 'cover';
  node.style.backgroundPosition = 'center';
  node.style.backgroundRepeat = 'no-repeat';
}

function renderAvatar(root, state) {
  const image = root.querySelector('[data-profile-avatar-image]');
  const placeholder = root.querySelector('[data-profile-avatar-placeholder]');
  const avatarUrl = resolveAvatarUrl(state);

  if (image instanceof HTMLImageElement) {
    setProfileImageSource(image, avatarUrl, `${state.displayName} avatar`);
  }

  if (placeholder instanceof HTMLElement) {
    placeholder.hidden = true;
  }
}

function renderHeaderImage(root, state) {
  const mediaUrl = resolveHeaderMediaUrl(state);
  const targets = Array.from(
    root.querySelectorAll(
      '[data-profile-header-image], [data-profile-cover-image], [data-profile-banner-image], [data-profile-cover], [data-profile-header-visual]'
    )
  );

  targets.forEach((node) => {
    if (node instanceof HTMLImageElement) {
      setProfileImageSource(node, mediaUrl, `${state.displayName} header image`);
      return;
    }

    if (!(node instanceof HTMLElement)) return;

    setProfileBackgroundSource(node, mediaUrl);
  });
}

/* =============================================================================
   02A) MEDIA RESOLUTION
   ============================================================================= */

function resolveAvatarUrl(state = {}) {
  return state.avatarDisplayUrl || state.avatarUrl || '';
}

function resolveHeaderMediaUrl(state = {}) {
  return (
    state.coverDisplayUrl
    || state.coverUrl
    || state.headerImageUrl
    || state.bannerUrl
    || ''
  );
}

function resolveCompletionCopy(state) {
  if (state.completion.complete) {
    return 'Profile surface ready';
  }

  return `Missing ${state.completion.missingFields.length} required field${state.completion.missingFields.length === 1 ? '' : 's'}`;
}

function renderPrivateHeader(root, state) {
  root.dataset.profileViewerState = state.viewerState;
  root.dataset.profileStateKey = state.stateKey;

  const badge = root.querySelector('[data-profile-header-state-badge]');
  if (badge) {
    badge.textContent = state.stateBadgeLabel;
    applyBadgeTone(
      badge,
      state.viewerState !== 'authenticated'
        ? ''
        : state.completion.complete
          ? 'success'
          : 'warning'
    );
  }

  setText(root, '[data-profile-header-state-line]', state.stateLine);
  setText(root, '[data-profile-display-name]', state.displayName);
  setText(root, '[data-profile-username]', state.username.normalized ? `@${state.username.normalized}` : '');
  setText(root, '[data-profile-route-display]', state.publicRouteDisplay);
  setText(root, '[data-profile-summary]', state.summary);
  setText(root, '[data-profile-completion-percent]', `${state.completion.percent}%`);
  setText(
    root,
    '[data-profile-completion-copy]',
    resolveCompletionCopy(state)
  );
  setText(root, '[data-profile-username-state]', capitalizeWords(state.username.status || 'missing'));
  setText(root, '[data-profile-username-copy]', formatUsernameCopy(state));
  setText(root, '[data-profile-visibility-state]', capitalizeWords(state.visibility.profileVisibility || 'private'));
  setText(root, '[data-profile-visibility-copy]', formatVisibilityCopy(state));

  renderHeaderImage(root, state);
  renderAvatar(root, state);

  const avatarAction = root.querySelector('[data-profile-action="change-avatar"]');
  setControlDisabled(avatarAction, state.viewerState !== 'authenticated');

  const primaryAction = root.querySelector('[data-profile-primary-action]');
  if (primaryAction instanceof HTMLElement) {
    primaryAction.setAttribute('data-profile-action', state.primaryAction);
    setControlDisabled(primaryAction, false);
  }

  setText(root, '[data-profile-primary-action-label]', state.primaryActionLabel);

  const secondaryAction = root.querySelector('[data-profile-secondary-action]');
  if (secondaryAction instanceof HTMLElement) {
    secondaryAction.hidden = state.viewerState !== 'authenticated';
    secondaryAction.setAttribute('data-profile-action', state.secondaryAction);
  }

  setText(root, '[data-profile-secondary-action-label]', state.secondaryActionLabel);

  const publicAction = root.querySelector('[data-profile-public-action]');
  setText(root, '[data-profile-public-action-label]', state.publicActionLabel);
  setControlDisabled(publicAction, !state.publicViewAvailable);
}

/* =============================================================================
   03) PROFILE HEADER RENDER
   ============================================================================= */

function renderProfileHeader(state = getProfileRuntimeState()) {
  getProfileHeaderRoots().forEach((root) => {
    const surface = root.getAttribute('data-profile-surface');

    if (surface !== 'private') {
      return;
    }

    renderPrivateHeader(root, state);
  });
}

/* =============================================================================
   04) PROFILE HEADER INIT
   ============================================================================= */

function initProfileHeader() {
  subscribeProfileRuntime(renderProfileHeader);

  document.addEventListener('fragment:mounted', (event) => {
    if (event?.detail?.name !== 'profile-private-header') return;
    renderProfileHeader();
  });

  renderProfileHeader();
}

initProfileHeader();
