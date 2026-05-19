/* =============================================================================
   01) MODULE IMPORTS
   02) PUBLIC PROFILE HEADER HELPERS
   03) PUBLIC PROFILE HEADER RENDER
   04) PUBLIC PROFILE HEADER INIT
   ============================================================================= */

/* =============================================================================
   01) MODULE IMPORTS
   ============================================================================= */

import { getProfileRuntimeState, subscribeProfileRuntime } from '../../private/shell/profile-runtime.js';

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
  });
}

/* =============================================================================
   04) PUBLIC PROFILE HEADER INIT
   ============================================================================= */

function initPublicProfileHeader() {
  subscribeProfileRuntime(renderPublicHeader);

  document.addEventListener('fragment:mounted', (event) => {
    if (event?.detail?.name !== 'profile-public-header') return;
    renderPublicHeader();
  });

  renderPublicHeader();
}

initPublicProfileHeader();
