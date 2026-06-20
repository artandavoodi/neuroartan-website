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

const PUBLIC_SCROLL_STATE = new WeakMap();

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

function getPublicScrollState(root) {
  const mount = root.querySelector('.profile-workspace__content-mount');
  const content = root.querySelector('.profile-workspace__content');
  if (!(mount instanceof HTMLElement)) return null;

  let state = PUBLIC_SCROLL_STATE.get(root);
  if (state) return state;

  state = {
    mount,
    content: content instanceof HTMLElement ? content : null,
    positions: new Map(),
    pendingSection: '',
    restoreTimer: 0
  };

  const releaseScrollRestore = () => {
    const section = root.dataset.profileActiveSection || 'posts';
    if (state.pendingSection === section) state.pendingSection = '';
  };

  mount.addEventListener('wheel', releaseScrollRestore, { passive:true });
  mount.addEventListener('touchmove', releaseScrollRestore, { passive:true });

  mount.addEventListener('scroll', () => {
    const section = root.dataset.profileActiveSection || 'posts';
    if (state.pendingSection === section) return;
    state.positions.set(section, mount.scrollTop);
  }, { passive:true });

  if (state.content && typeof ResizeObserver !== 'undefined') {
    state.resizeObserver = new ResizeObserver(() => {
      const activeSection = root.dataset.profileActiveSection || 'posts';
      if (state.pendingSection !== activeSection) return;
      schedulePublicScrollRestore(state, activeSection);
    });
    state.resizeObserver.observe(state.content);
    state.content.addEventListener('load', () => {
      const activeSection = root.dataset.profileActiveSection || 'posts';
      if (state.pendingSection !== activeSection) return;
      schedulePublicScrollRestore(state, activeSection);
    }, true);
  }

  PUBLIC_SCROLL_STATE.set(root, state);
  return state;
}

function applyPublicScrollRestore(state, section, attempt = 0) {
  const targetPosition = state.positions.get(section) || 0;
  const maxScroll = Math.max(0, state.mount.scrollHeight - state.mount.clientHeight);
  state.mount.scrollTop = Math.min(targetPosition, maxScroll);

  if (maxScroll >= targetPosition || attempt >= 45) return;
  requestAnimationFrame(() => applyPublicScrollRestore(state, section, attempt + 1));
}

function schedulePublicScrollRestore(state, section) {
  window.clearTimeout(state.restoreTimer);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => applyPublicScrollRestore(state, section));
  });
  state.restoreTimer = window.setTimeout(() => {
    if (state.pendingSection !== section) return;
    applyPublicScrollRestore(state, section);
  }, 180);
}

function restorePublicScrollPosition(root, activeSection) {
  const state = getPublicScrollState(root);
  if (!state) return;

  const previousSection = root.dataset.profileActiveSection || '';
  if (previousSection && previousSection !== activeSection && state.pendingSection !== previousSection) {
    state.positions.set(previousSection, state.mount.scrollTop);
  }

  root.dataset.profileActiveSection = activeSection;
  state.pendingSection = activeSection;
  schedulePublicScrollRestore(state, activeSection);
}

function renderPublicModelHeader(model, state) {
  const modelName = String(model?.model_name || model?.display_name || 'Personal model').trim();
  const modelSlug = normalizeUsername(model?.model_slug || model?.slug || '');
  const modelDescription = String(model?.description || state.modelPublicSummary || '').trim();
  const modelImage = String(model?.public_avatar_url || model?.model_image_url || '').trim();
  const modelCover = String(model?.public_cover_url || model?.model_cover_url || '').trim();
  const development = String(state.modelReadinessLabel || state.modelAccessLabel || '').trim() || 'Not shared';
  const interaction = String(state.modelInteractionLabel || state.availabilityLabel || '').trim() || 'Not available';

  document.querySelectorAll('[data-profile-public-model]').forEach((root) => {
    const name = root.querySelector('[data-profile-public-model-name]');
    const slug = root.querySelector('[data-profile-public-model-slug]');
    const description = root.querySelector('[data-profile-public-model-description]');
    const avatar = root.querySelector('[data-profile-public-model-avatar]');
    const cover = root.querySelector('[data-profile-public-model-cover]');

    if (name) name.textContent = modelName;
    if (slug) slug.textContent = modelSlug ? `@${modelSlug}` : 'Model';
    if (description) {
      description.textContent = modelDescription || 'This owner has not shared public model development details yet.';
    }
    if (avatar instanceof HTMLImageElement) {
      avatar.src = modelImage || '/registry/icons/public/assets/core/cognition/model/model.svg';
      avatar.alt = modelImage ? `${modelName} avatar` : '';
    }
    if (cover instanceof HTMLElement) {
      if (modelCover) {
        cover.style.backgroundImage = `url("${modelCover}")`;
        cover.dataset.profilePublicModelCoverState = 'custom';
      } else {
        cover.style.removeProperty('background-image');
        cover.dataset.profilePublicModelCoverState = 'empty';
      }
    }

    root.querySelectorAll('[data-profile-public-model-development], [data-profile-public-model-development-detail]').forEach((node) => {
      node.textContent = development;
    });
    root.querySelectorAll('[data-profile-public-model-interaction], [data-profile-public-model-interaction-detail]').forEach((node) => {
      node.textContent = interaction;
    });
  });
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
    restorePublicScrollPosition(root, activeSection);

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

    renderPublicModelHeader(state.model || {}, state);
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
