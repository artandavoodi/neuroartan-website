/* =============================================================================
   01) MODULE IMPORTS
   02) PROFILE FOOTER HELPERS
   03) PROFILE FOOTER RENDER
   04) PROFILE FOOTER INIT
   ============================================================================= */

/* =============================================================================
   01) MODULE IMPORTS
   ============================================================================= */

import { getProfileRuntimeState, subscribeProfileRuntime } from '../shell/profile-runtime.js';

/* =============================================================================
   02) PROFILE FOOTER HELPERS
   ============================================================================= */

function getProfileFooterRoots() {
  return Array.from(document.querySelectorAll('[data-profile-footer]'));
}

function setText(root, selector, value) {
  const node = root.querySelector(selector);
  if (!node) return;
  node.textContent = value;
}

function renderPrivateFooter(root, state) {
  root.dataset.profileViewerState = state.viewerState;
  root.dataset.profileStateKey = state.stateKey;

  setText(
    root,
    '[data-profile-footer-environment]',
    state.viewerState === 'authenticated'
      ? 'Authenticated owner environment'
      : 'Private continuity environment'
  );

  setText(
    root,
    '[data-profile-footer-route]',
    state.username.normalized
      ? `${state.publicViewAvailable ? 'Public route ready' : 'Reserved route'} · ${state.publicRouteDisplay}`
      : 'Owner route · /profile.html'
  );
}

function renderPublicFooter(root, state) {
  root.dataset.profileViewerState = 'public';
  root.dataset.profileStateKey = state.stateKey;

  setText(
    root,
    '[data-profile-footer-environment]',
    state.publicViewAvailable
      ? 'Company-domain identity surface'
      : 'Canonical public route surface'
  );

  setText(
    root,
    '[data-profile-footer-route]',
    state.publicRouteDisplay || 'neuroartan.com/username'
  );
}

/* =============================================================================
   03) PROFILE FOOTER RENDER
   ============================================================================= */

function renderProfileFooter(state = getProfileRuntimeState()) {
  getProfileFooterRoots().forEach((root) => {
    const surface = root.getAttribute('data-profile-surface');

    if (surface === 'public') {
      renderPublicFooter(root, state);
      return;
    }

    renderPrivateFooter(root, state);
  });
}

/* =============================================================================
   04) PROFILE FOOTER INIT
   ============================================================================= */

function initProfileFooter() {
  subscribeProfileRuntime(renderProfileFooter);

  document.addEventListener('fragment:mounted', (event) => {
    if (event?.detail?.name !== 'profile-private-footer' && event?.detail?.name !== 'profile-public-footer') return;
    renderProfileFooter();
  });

  renderProfileFooter();
}

initProfileFooter();
