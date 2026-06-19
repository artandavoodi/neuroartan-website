/* =============================================================================
   01) MODULE IMPORTS
   02) PUBLIC PROFILE SECTIONS HELPERS
   03) PUBLIC PROFILE SECTIONS RENDER
   04) PUBLIC PROFILE SECTIONS INIT
   ============================================================================= */

/* =============================================================================
   01) MODULE IMPORTS
   ============================================================================= */

import { getProfileRuntimeState, subscribeProfileRuntime } from '../../private/shell/profile-runtime.js';
import {
  getProfileSocialGraphState,
  getProfileSubscriptionState
} from '../../../system/profile/profile-social-graph.js';

/* =============================================================================
   02) PUBLIC PROFILE SECTIONS HELPERS
   ============================================================================= */

function getProfileSectionsRoots() {
  return Array.from(document.querySelectorAll('[data-profile-sections][data-profile-surface="public"]'));
}

function setText(root, selector, value) {
  const node = root.querySelector(selector);
  if (!node) return;
  node.textContent = value || '';
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

  const values = Array.isArray(labels) && labels.length ? labels : ['Public route pending'];
  values.forEach((label) => {
    const badge = document.createElement('span');
    badge.className = 'ui-badge ui-badge--outline';
    badge.textContent = label;
    container.appendChild(badge);
  });
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

function resolveSubscriptionLabel(subscriptionState = {}) {
  if (!subscriptionState.tableAvailable) return 'Unavailable';
  return subscriptionState.viewerSubscribed ? 'Subscribed' : 'Available';
}

async function renderPublicSocialState(state = getProfileRuntimeState()) {
  const profileId = state.profileId || '';
  if (!profileId) return;

  try {
    const [graphState, subscriptionState] = await Promise.all([
      getProfileSocialGraphState(profileId),
      getProfileSubscriptionState(profileId)
    ]);

    getProfileSectionsRoots().forEach((root) => {
      if (root.dataset.profileStateKey !== state.stateKey) return;

      setText(root, '[data-profile-followers-count]', String(graphState.followersCount || 0));
      setText(root, '[data-profile-following-count]', String(graphState.followingCount || 0));
      setText(root, '[data-profile-subscription-state]', resolveSubscriptionLabel(subscriptionState));
    });
  } catch (error) {
    console.warn('[Neuroartan][Public Profile Sections] Social graph hydration failed.', error);
  }
}

/* =============================================================================
   03) PUBLIC PROFILE SECTIONS RENDER
   ============================================================================= */

function renderPublicSections(state = getProfileRuntimeState()) {
  getProfileSectionsRoots().forEach((root) => {
    root.dataset.profileViewerState = 'public';
    root.dataset.profileStateKey = state.stateKey;

    setText(root, '[data-profile-overview-copy]', state.summary);
    setText(root, '[data-profile-overview-badge]', state.stateBadgeLabel);
    renderBadges(root, '[data-profile-route-badge-list]', state.routeBadges);

    setText(root, '[data-profile-model-access]', state.modelAccessLabel);
    setText(root, '[data-profile-model-interaction]', state.modelInteractionLabel);
    setText(root, '[data-profile-model-readiness]', state.modelReadinessLabel);

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
  });

  void renderPublicSocialState(state);
}

/* =============================================================================
   04) PUBLIC PROFILE SECTIONS INIT
   ============================================================================= */

function initPublicProfileSections() {
  subscribeProfileRuntime(renderPublicSections);

  document.addEventListener('fragment:mounted', (event) => {
    if (event?.detail?.name !== 'profile-public-sections') return;
    renderPublicSections();
  });

  document.addEventListener('profile:social-graph-changed', () => {
    void renderPublicSocialState();
  });

  document.addEventListener('profile:subscription-changed', () => {
    void renderPublicSocialState();
  });

  renderPublicSections();
}

initPublicProfileSections();
