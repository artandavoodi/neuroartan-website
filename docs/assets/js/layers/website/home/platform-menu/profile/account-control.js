import { bindProfileMenuActions } from './profile-actions.js';
import { subscribeHomeSurfaceState } from '../../core/home-surface-state.js';

function renderAccountControl(root, snapshot = {}) {
  const signedIn = snapshot?.account?.signedIn === true;
  root.querySelectorAll('[data-profile-auth-visible]').forEach((node) => {
    const mode = node.getAttribute('data-profile-auth-visible') || '';
    node.hidden = mode === 'signed-in' ? !signedIn : signedIn;
  });
}

export function mountHomePlatformDestination(root) {
  if (!(root instanceof Element)) {
    return;
  }

  bindProfileMenuActions(root);
  const unsubscribe = subscribeHomeSurfaceState((snapshot) => {
    renderAccountControl(root, snapshot);
  });

  return unsubscribe;
}

export function updateHomePlatformDestination(root, options = {}) {
  if (!(root instanceof Element)) {
    return;
  }

  renderAccountControl(root, options.snapshot || {});
}
