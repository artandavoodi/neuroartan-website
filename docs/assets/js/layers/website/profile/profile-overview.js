/* =============================================================================
   01) MODULE IMPORTS
   02) OVERVIEW HELPERS
   03) OVERVIEW RENDER
   04) OVERVIEW INIT
   ============================================================================= */

/* =============================================================================
   01) MODULE IMPORTS
   ============================================================================= */

import { getProfileRuntimeState, subscribeProfileRuntime } from './profile-runtime.js';

/* =============================================================================
   02) OVERVIEW HELPERS
   ============================================================================= */

function getOverviewRoots() {
  return Array.from(document.querySelectorAll('[data-profile-overview-panel]'));
}

function setText(root, selector, value) {
  const node = root.querySelector(selector);
  if (!node) return;
  node.textContent = value;
}

function setControlDisabled(control, disabled) {
  if (!(control instanceof HTMLElement)) return;
  if (control instanceof HTMLButtonElement) {
    control.disabled = disabled;
  }
  control.setAttribute('aria-disabled', disabled ? 'true' : 'false');
}

function clearNode(node) {
  while (node.firstChild) {
    node.removeChild(node.firstChild);
  }
}

function renderBadges(root, selector, labels) {
  const container = root.querySelector(selector);
  if (!(container instanceof HTMLElement)) return;

  clearNode(container);

  const values = Array.isArray(labels) && labels.length ? labels : ['No missing required fields'];
  values.forEach((label) => {
    const badge = document.createElement('span');
    badge.className = 'ui-badge ui-badge--outline';
    badge.textContent = label;
    container.appendChild(badge);
  });
}

function capitalizeWords(value) {
  return String(value || '')
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

/* =============================================================================
   03) OVERVIEW RENDER
   ============================================================================= */

function renderOverview(state = getProfileRuntimeState()) {
  getOverviewRoots().forEach((root) => {
    root.dataset.profileViewerState = state.viewerState;
    root.dataset.profileStateKey = state.stateKey;

    setText(root, '[data-profile-overview-copy]', state.summary);
    setText(root, '[data-profile-overview-badge]', state.stateBadgeLabel);
    renderBadges(root, '[data-profile-missing-fields-list]', state.missingFieldLabels);

    setText(root, '[data-profile-account-email]', state.email || 'Not connected');
    setText(root, '[data-profile-account-provider]', state.providerLabel);
    setText(root, '[data-profile-account-email-verified]', state.emailVerified ? 'Verified' : 'Pending');
    setText(root, '[data-profile-account-record-state]', state.profileRecordState);

    setText(root, '[data-profile-identity-first-name]', state.firstName || 'Pending');
    setText(root, '[data-profile-identity-last-name]', state.lastName || 'Pending');
    setText(root, '[data-profile-identity-display-name]', state.displayName || 'Pending');
    setText(root, '[data-profile-identity-birth-date]', state.birthDate ? state.formattedBirthDate : 'Pending');
    setText(root, '[data-profile-identity-gender]', capitalizeWords(state.gender || '') || 'Pending');

    setText(root, '[data-profile-username-raw]', state.username.raw || 'Pending');
    setText(root, '[data-profile-username-normalized]', state.username.normalized || 'Not assigned');
    setText(root, '[data-profile-username-status]', capitalizeWords(state.username.status || 'missing'));
    setText(root, '[data-profile-route-path]', state.publicRouteDisplay);
    setText(root, '[data-profile-route-status]', capitalizeWords(state.visibility.routeStatus || 'pending'));

    setText(root, '[data-profile-visibility-status]', capitalizeWords(state.visibility.profileVisibility || 'private'));
    setText(root, '[data-profile-public-enabled]', state.visibility.publicEnabled ? 'Enabled' : 'Disabled');
    setText(root, '[data-profile-public-discoverable]', state.visibility.discoverable ? 'Yes' : 'No');
    setText(
      root,
      '[data-profile-public-route-mode]',
      state.publicViewAvailable
        ? 'Renderable company-domain route'
        : state.username.normalized
          ? 'Reserved route awaiting public activation'
          : 'Private owner environment'
    );

    setText(root, '[data-profile-avatar-state]', capitalizeWords(state.avatarState || 'empty'));
    setText(
      root,
      '[data-profile-avatar-source]',
      state.avatarHasImage
        ? `${state.providerLabel} identity image`
        : 'Profile image not yet connected'
    );

    setText(root, '[data-profile-continuity-badge]', state.completion.complete ? 'Ready' : 'Scaffolded');
    setText(
      root,
      '[data-profile-continuity-copy]',
      state.completion.complete
        ? 'This private profile surface is ready to become the continuity anchor for future ICOS and cross-layer identity modules.'
        : 'Once identity completion and username governance are stable, this surface becomes the continuity anchor for future Neuroartan layers.'
    );

    root.querySelectorAll('[data-profile-action]').forEach((control) => {
      setControlDisabled(control, state.viewerState !== 'authenticated');
    });
  });
}

/* =============================================================================
   04) OVERVIEW INIT
   ============================================================================= */

function initProfileOverview() {
  subscribeProfileRuntime(renderOverview);

  document.addEventListener('fragment:mounted', (event) => {
    if (event?.detail?.name !== 'profile-private-overview-panel') return;
    renderOverview();
  });

  renderOverview();
}

initProfileOverview();
