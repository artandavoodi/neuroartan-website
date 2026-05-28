/* =============================================================================
   01) MODULE IMPORTS
   02) PROFILE SECTIONS HELPERS
   03) PROFILE SECTIONS RENDER
   04) PROFILE SECTIONS INIT
   ============================================================================= */

/* =============================================================================
   01) MODULE IMPORTS
   ============================================================================= */

import { getProfileRuntimeState, subscribeProfileRuntime } from '../shell/profile-runtime.js';
import { getProfileNavigationState, subscribeProfileNavigation } from '../navigation/profile-navigation.js';

/* =============================================================================
   02) PROFILE SECTIONS HELPERS
   ============================================================================= */

function getProfileSectionsRoots() {
  return Array.from(document.querySelectorAll('[data-profile-sections][data-profile-surface="private"]'));
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

function renderPrivateSections(root, state, navigationState) {
  root.dataset.profileViewerState = state.viewerState;
  root.dataset.profileStateKey = state.stateKey;

  const effectiveSection = navigationState.section === 'home' ? 'posts' : navigationState.section;

  root.querySelectorAll('[data-profile-section-panel]').forEach((panel) => {
    const panelKey = panel.getAttribute('data-profile-section-panel') || '';
    panel.hidden = panelKey !== effectiveSection;
  });

  // Update shell with current section for CSS targeting
  const shell = document.querySelector('[data-profile-shell][data-profile-surface="private"]');
  if (shell) {
    shell.dataset.profileSection = effectiveSection;
  }
}

/* =============================================================================
   03) PROFILE SECTIONS RENDER
   ============================================================================= */

function renderProfileSections(state = getProfileRuntimeState(), navigationState = getProfileNavigationState()) {
  getProfileSectionsRoots().forEach((root) => {
    const surface = root.getAttribute('data-profile-surface');

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
    const name = event?.detail?.name || '';
    if (name !== 'profile-private-sections' && name !== 'profile-private-workspace') return;
    render();
  });

  render();
}

initProfileSections();
