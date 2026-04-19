/* =============================================================================
   01) MODULE IMPORTS
   02) PROFILE SECTIONS HELPERS
   03) PROFILE SECTIONS RENDER
   04) PROFILE SECTIONS INIT
   ============================================================================= */

/* =============================================================================
   01) MODULE IMPORTS
   ============================================================================= */

import { getProfileRuntimeState, subscribeProfileRuntime } from './profile-runtime.js';
import { getProfileNavigationState, subscribeProfileNavigation } from './profile-navigation.js';

/* =============================================================================
   02) PROFILE SECTIONS HELPERS
   ============================================================================= */

function getProfileSectionsRoots() {
  return Array.from(document.querySelectorAll('[data-profile-sections]'));
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

function renderPublicLinks(root, state) {
  const container = root.querySelector('[data-profile-public-links-list]');
  const emptyCopy = root.querySelector('[data-profile-public-links-empty]');

  if (!(container instanceof HTMLElement)) return;

  clearNode(container);

  if (!state.publicLinksAvailable) {
    if (emptyCopy instanceof HTMLElement) {
      emptyCopy.hidden = false;
    }
    return;
  }

  if (emptyCopy instanceof HTMLElement) {
    emptyCopy.hidden = true;
  }

  state.publicLinks.forEach((link) => {
    const anchor = document.createElement('a');
    anchor.className = 'ui-button ui-button--ghost profile-panel__link-chip';
    anchor.href = link.url;
    anchor.textContent = link.label;

    if (/^https?:\/\//i.test(link.url)) {
      anchor.target = '_blank';
      anchor.rel = 'noreferrer';
    }

    container.appendChild(anchor);
  });
}

function renderPrivateSections(root, state, navigationState) {
  root.dataset.profileViewerState = state.viewerState;
  root.dataset.profileStateKey = state.stateKey;

  root.querySelectorAll('[data-profile-section-panel]').forEach((panel) => {
    const panelKey = panel.getAttribute('data-profile-section-panel') || '';
    panel.hidden = panelKey !== navigationState.section;
  });
}

function renderPublicSections(root, state) {
  root.dataset.profileViewerState = 'public';
  root.dataset.profileStateKey = state.stateKey;

  setText(root, '[data-profile-overview-copy]', state.summary);
  setText(root, '[data-profile-overview-badge]', state.stateBadgeLabel);
  renderBadges(root, '[data-profile-route-badge-list]', state.routeBadges);

  setText(root, '[data-profile-identity-display-name]', state.displayName);
  setText(root, '[data-profile-identity-username]', state.username.normalized ? `@${state.username.normalized}` : '@username');
  setText(root, '[data-profile-route-path]', state.publicRouteDisplay || 'neuroartan.com/username');
  setText(root, '[data-profile-identity-label]', state.identityLabel);

  renderPublicLinks(root, state);

  setText(root, '[data-profile-public-route-outcome]', state.routeOutcomeValue);
  setText(root, '[data-profile-public-visibility]', state.visibilityState);
  setText(root, '[data-profile-public-discoverable]', state.publicProfileDiscoverable ? 'Yes' : 'No');
  setText(root, '[data-profile-public-route-url]', state.publicRouteUrl || 'https://neuroartan.com/username');

  setText(root, '[data-profile-continuity-badge]', state.continuityState);
  setText(root, '[data-profile-continuity-copy]', state.continuityCopy);
  renderBadges(root, '[data-profile-continuity-badges]', state.continuityBadges);
}

/* =============================================================================
   03) PROFILE SECTIONS RENDER
   ============================================================================= */

function renderProfileSections(state = getProfileRuntimeState(), navigationState = getProfileNavigationState()) {
  getProfileSectionsRoots().forEach((root) => {
    const surface = root.getAttribute('data-profile-surface');

    if (surface === 'public') {
      renderPublicSections(root, state);
      return;
    }

    renderPrivateSections(root, state, navigationState);
  });
}

/* =============================================================================
   04) PROFILE SECTIONS INIT
   ============================================================================= */

function initProfileSections() {
  const render = () => renderProfileSections();

  subscribeProfileRuntime(render);
  subscribeProfileNavigation(render);

  document.addEventListener('fragment:mounted', (event) => {
    if (event?.detail?.name !== 'profile-private-sections' && event?.detail?.name !== 'profile-public-sections') return;
    render();
  });

  render();
}

initProfileSections();
