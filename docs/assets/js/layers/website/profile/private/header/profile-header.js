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

function getDefaultAvatarFallback() {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><rect width="256" height="256" rx="128" fill="#e5e7eb"/><circle cx="128" cy="102" r="42" fill="#9ca3af"/><path d="M52 214c17-32 46-50 76-50s59 18 76 50" fill="#9ca3af"/></svg>'
  )}`;
}

function getDefaultHeaderFallback() {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 480"><rect width="1600" height="480" fill="#d1d5db"/><rect y="316" width="1600" height="164" fill="#cbd5e1"/><circle cx="1320" cy="136" r="72" fill="#9ca3af"/><rect x="120" y="96" width="520" height="32" rx="16" fill="#9ca3af"/><rect x="120" y="148" width="360" height="20" rx="10" fill="#a3a3a3"/></svg>'
  )}`;
}

function setProfileImageSource(image, primarySrc, fallbackSrc, altText) {
  if (!(image instanceof HTMLImageElement)) return;

  const resolvedSrc = primarySrc || fallbackSrc;

  if (image.dataset.profileFallbackBound !== 'true') {
    image.addEventListener('error', () => {
      if (image.dataset.profileUsingFallback === 'true') return;
      image.dataset.profileUsingFallback = 'true';
      image.src = fallbackSrc;
    });
    image.dataset.profileFallbackBound = 'true';
  }

  image.hidden = false;
  image.alt = altText;
  image.dataset.profileUsingFallback = primarySrc ? 'false' : 'true';
  image.src = resolvedSrc;
}

function setProfileBackgroundSource(node, primarySrc, fallbackSrc) {
  if (!(node instanceof HTMLElement)) return;

  const resolvedSrc = primarySrc || fallbackSrc;
  node.hidden = false;
  node.style.backgroundImage = `url("${resolvedSrc}")`;
  node.style.backgroundSize = 'cover';
  node.style.backgroundPosition = 'center';
  node.style.backgroundRepeat = 'no-repeat';
}

function renderAvatar(root, state) {
  const image = root.querySelector('[data-profile-avatar-image]');
  const placeholder = root.querySelector('[data-profile-avatar-placeholder]');
  const avatarUrl = state.avatarDisplayUrl || state.avatarUrl || '';

  if (image instanceof HTMLImageElement) {
    setProfileImageSource(image, avatarUrl, getDefaultAvatarFallback(), `${state.displayName} avatar`);
  }

  if (placeholder instanceof HTMLElement) {
    placeholder.hidden = true;
  }
}

function renderHeaderImage(root, state) {
  const mediaUrl = state.coverDisplayUrl || state.coverUrl || state.headerImageUrl || state.bannerUrl || '';
  const targets = Array.from(
    root.querySelectorAll(
      '[data-profile-header-image], [data-profile-cover-image], [data-profile-banner-image], [data-profile-cover], [data-profile-header-visual]'
    )
  );

  targets.forEach((node) => {
    if (node instanceof HTMLImageElement) {
      setProfileImageSource(node, mediaUrl, getDefaultHeaderFallback(), `${state.displayName} header image`);
      return;
    }

    if (!(node instanceof HTMLElement)) return;

    setProfileBackgroundSource(node, mediaUrl, getDefaultHeaderFallback());
  });
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
  setText(root, '[data-profile-username]', state.username.normalized ? `@${state.username.normalized}` : '@username');
  setText(root, '[data-profile-route-display]', state.publicRouteDisplay);
  setText(root, '[data-profile-summary]', state.summary);
  setText(root, '[data-profile-completion-percent]', `${state.completion.percent}%`);
  setText(
    root,
    '[data-profile-completion-copy]',
    state.completion.complete
      ? 'Profile surface ready'
      : `Missing ${state.completion.missingFields.length} required field${state.completion.missingFields.length === 1 ? '' : 's'}`
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
