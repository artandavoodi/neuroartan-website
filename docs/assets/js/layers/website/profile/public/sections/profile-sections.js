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

function getPublicWorkspaceHashSection() {
  const hash = String(window.location.hash || '').trim().replace(/^#/, '').toLowerCase();
  if (hash === 'model-management' || hash === 'model') return 'model';
  if (hash === 'highlights') return 'highlights';
  if (hash === 'posts') return 'posts';
  return '';
}

function getPublicWorkspaceSection(navigationState = getProfileNavigationState()) {
  const hashSection = getPublicWorkspaceHashSection();
  if (hashSection) return hashSection;
  if (navigationState.section === 'model-management' || navigationState.section === 'model') return 'model';
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

function formatPublicModelLabel(value = '', fallback = 'Not available') {
  const normalized = String(value || '').trim().replace(/[_-]+/g, ' ');
  if (!normalized) return fallback;
  return normalized.replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatPublicModelDate(value = '') {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return 'Not available';
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    year: 'numeric'
  }).format(new Date(timestamp));
}

function formatPublicModelVerification(value = '') {
  const normalized = String(value || '').trim().toLowerCase();
  const allowedStates = new Set([
    'verified',
    'unverified',
    'not_verified',
    'pending',
    'under_review',
    'review_required'
  ]);
  return allowedStates.has(normalized)
    ? formatPublicModelLabel(normalized)
    : 'Unverified';
}

function renderPublicModelHeader(model, state) {
  const modelName = String(model?.model_name || model?.display_name || 'Personal model').trim();
  const modelSlug = normalizeUsername(model?.model_slug || model?.slug || '');
  const modelDescription = String(model?.description || state.modelPublicSummary || '').trim();
  const modelType = formatPublicModelLabel(model?.model_type || model?.routing_class || 'personal');
  const readiness = formatPublicModelLabel(model?.readiness_state || state.modelReadinessLabel || 'not shared');
  const verification = formatPublicModelVerification(model?.verification_state || state.verification?.status || 'unverified');
  const created = formatPublicModelDate(model?.created_at || '');

  document.querySelectorAll('[data-profile-public-model]').forEach((root) => {
    const name = root.querySelector('[data-profile-public-model-name]');
    const slug = root.querySelector('[data-profile-public-model-slug]');
    const description = root.querySelector('[data-profile-public-model-description]');

    if (name) name.textContent = modelName;
    if (slug) slug.textContent = modelSlug ? `@${modelSlug}` : 'Model';
    if (description) {
      description.textContent = modelDescription || 'This owner has not shared public model development details yet.';
    }

    root.querySelectorAll('[data-profile-public-model-type]').forEach((node) => {
      node.textContent = modelType;
    });
    root.querySelectorAll('[data-profile-public-model-created]').forEach((node) => {
      node.textContent = created;
    });
    root.querySelectorAll('[data-profile-public-model-readiness]').forEach((node) => {
      node.textContent = readiness;
    });
    root.querySelectorAll('[data-profile-public-model-verification]').forEach((node) => {
      node.textContent = verification;
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
      header.hidden = false;
      header.dataset.profileActiveSection = activeSection;
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
  window.addEventListener('hashchange', render);
  window.addEventListener('popstate', render);

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
