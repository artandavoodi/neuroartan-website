/* =============================================================================
   01) MODULE IMPORTS
   02) PUBLIC WORKSPACE STATE
   03) PUBLIC WORKSPACE RENDER
   04) INITIALIZATION
   ============================================================================= */

import {
  getProfileRuntimeState,
  subscribeProfileRuntime
} from '../../private/shell/profile-runtime.js';
import {
  getProfileNavigationState,
  subscribeProfileNavigation
} from '../../private/navigation/profile-navigation.js';

function publicWorkspaceRoots() {
  return Array.from(document.querySelectorAll('[data-profile-sections][data-profile-surface="public"]'));
}

function normalizeUsername(value = '') {
  return String(value || '').trim().replace(/^@/, '').toLowerCase();
}

function getPublicWorkspaceSection(navigationState = getProfileNavigationState()) {
  if (navigationState.section === 'model-management') return 'model';
  return navigationState.section === 'highlights' ? 'highlights' : 'posts';
}

function renderPublicWorkspace(
  state = getProfileRuntimeState(),
  navigationState = getProfileNavigationState()
) {
  const activeSection = getPublicWorkspaceSection(navigationState);
  const username = normalizeUsername(state.username?.normalized || state.username || '');
  const profileId = String(state.profileId || state.profile?.id || '').trim();

  publicWorkspaceRoots().forEach((root) => {
    root.dataset.profileViewerState = 'public';
    root.dataset.profileStateKey = state.stateKey || '';

    const header = root.querySelector('[data-profile-header][data-profile-surface="public"]');
    if (header instanceof HTMLElement) {
      header.hidden = activeSection !== 'posts';
    }

    root.querySelectorAll('[data-profile-section-panel]').forEach((panel) => {
      panel.hidden = panel.getAttribute('data-profile-section-panel') !== activeSection;
    });

    const posts = root.querySelector('[data-profile-public-posts]');
    if (posts instanceof HTMLElement) {
      posts.dataset.profilePublicProfileId = profileId;
      posts.dataset.profilePublicUsername = username;
      posts.dataset.profilePublicPostsReady = state.publicViewAvailable === true ? 'true' : 'false';
    }

    const model = root.querySelector('[data-profile-public-model]');
    if (model instanceof HTMLElement) {
      const development = String(state.modelReadinessLabel || state.modelAccessLabel || '').trim();
      const interaction = String(state.modelInteractionLabel || state.availabilityLabel || '').trim();
      const summary = String(state.modelPublicSummary || state.summary || '').trim();
      const developmentNode = model.querySelector('[data-profile-public-model-development]');
      const interactionNode = model.querySelector('[data-profile-public-model-interaction]');
      const summaryNode = model.querySelector('[data-profile-public-model-summary]');
      if (developmentNode) developmentNode.textContent = development || 'Not shared';
      if (interactionNode) interactionNode.textContent = interaction || 'Not available';
      if (summaryNode) {
        summaryNode.textContent = summary || 'This owner has not shared public model development details yet.';
      }
    }
  });

  const shell = document.querySelector('[data-profile-shell][data-profile-surface="public"]');
  if (shell instanceof HTMLElement) shell.dataset.profileSection = activeSection;

  document.dispatchEvent(new CustomEvent('profile:public-posts-context-changed'));
}

function initPublicProfileSections() {
  const render = () => renderPublicWorkspace();

  subscribeProfileRuntime(render);
  subscribeProfileNavigation(render);

  document.addEventListener('fragment:mounted', (event) => {
    if (![
      'profile-public-sections',
      'profile-public-workspace',
      'profile-public-posts',
      'profile-public-highlights',
      'profile-public-model'
    ].includes(event?.detail?.name || '')) return;
    render();
  });

  render();
}

initPublicProfileSections();
