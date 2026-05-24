import { subscribeHomeSurfaceState } from '../../core/home-surface-state.js';
import { bindProfileMenuActions } from './profile-actions.js';

function normalizeString(value = '') {
  return String(value || '').trim();
}

function resolveProfileOverviewName(snapshot = {}) {
  return normalizeString(
    snapshot?.account?.profile?.display_name
    || snapshot?.account?.profile?.public_display_name
    || snapshot?.account?.user?.displayName
    || snapshot?.account?.profile?.email
    || snapshot?.account?.user?.email
    || ''
  );
}

function resolveProfileOverviewUsername(snapshot = {}) {
  return normalizeString(
    snapshot?.account?.profile?.username
    || snapshot?.account?.profile?.public_username
    || ''
  );
}

function resolveProfileOverviewAvatar(snapshot = {}) {
  return normalizeString(
    snapshot?.account?.profile?.photo_url
    || snapshot?.account?.profile?.avatar_url
    || snapshot?.account?.profile?.public_avatar_url
    || snapshot?.account?.user?.photoURL
    || ''
  );
}

function setText(root, selector, value) {
  const node = root?.querySelector(selector);
  if (!node) return;
  node.textContent = value;
}

function renderProfileOverview(root, snapshot = {}) {
  const signedIn = snapshot?.account?.signedIn === true;
  const profileComplete = snapshot?.account?.profileComplete === true || snapshot?.account?.profile?.profile_complete === true;
  const name = resolveProfileOverviewName(snapshot);
  const username = resolveProfileOverviewUsername(snapshot);
  const avatarUrl = resolveProfileOverviewAvatar(snapshot);
  const avatarImage = root.querySelector('[data-profile-avatar-image]');
  const avatarShell = root.querySelector('[data-profile-avatar]');

  setText(root, '[data-profile-display-name]', name || (signedIn ? 'Profile pending' : 'Sign in required'));
  setText(root, '[data-profile-username]', username ? `@${username}` : (signedIn ? '@username pending' : '@account required'));
  setText(root, '[data-profile-status]', signedIn ? (profileComplete ? 'Ready' : 'Setup required') : 'Signed out');
  setText(root, '[data-profile-route]', username ? `neuroartan.com/${username}` : 'Public route pending');
  root.querySelectorAll('[data-profile-auth-visible]').forEach((node) => {
    const mode = node.getAttribute('data-profile-auth-visible') || '';
    node.hidden = mode === 'signed-in' ? !signedIn : signedIn;
  });

  if (avatarImage instanceof HTMLImageElement) {
    if (avatarUrl) {
      avatarImage.hidden = false;
      avatarImage.src = avatarUrl;
      avatarImage.alt = name || username || 'Profile avatar';
      avatarImage.removeAttribute('aria-hidden');
    } else {
      avatarImage.hidden = true;
      avatarImage.removeAttribute('src');
      avatarImage.alt = '';
      avatarImage.setAttribute('aria-hidden', 'true');
    }
  }

  if (avatarShell instanceof HTMLElement) {
    avatarShell.dataset.profileAvatarState = avatarUrl ? 'image' : 'fallback';
  }
}

export function mountHomePlatformDestination(root) {
  if (!(root instanceof Element)) {
    return;
  }

  bindProfileMenuActions(root);

  const unsubscribe = subscribeHomeSurfaceState((snapshot) => {
    renderProfileOverview(root, snapshot);
  });

  return unsubscribe;
}

export function updateHomePlatformDestination(root, options = {}) {
  if (!(root instanceof Element)) {
    return;
  }

  renderProfileOverview(root, options.snapshot || {});
}
