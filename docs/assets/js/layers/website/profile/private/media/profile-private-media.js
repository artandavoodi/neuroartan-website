/* =============================================================================
   01) MODULE IDENTITY
   02) IMPORTS
   03) DOM HELPERS
   04) MEDIA STATE RENDERING
   05) MEDIA ACTIONS
   06) INITIALIZATION
============================================================================= */

/* =============================================================================
   01) MODULE IDENTITY
============================================================================= */
const MODULE_ID = 'profile-private-media';

/* =============================================================================
   02) IMPORTS
============================================================================= */
import {
  getProfileRuntimeState,
  subscribeProfileRuntime
} from '../shell/profile-runtime.js';

/* =============================================================================
   03) DOM HELPERS
============================================================================= */
function getMediaRoot() {
  return document.querySelector('[data-profile-private-media]');
}

function setText(root, selector, value) {
  const node = root?.querySelector(selector);
  if (!node) return;
  node.textContent = value || '';
}

function getInitials(profile = {}) {
  const displayName = String(profile.display_name || profile.displayName || '').trim();
  const firstName = String(profile.first_name || profile.firstName || '').trim();
  const lastName = String(profile.last_name || profile.lastName || '').trim();
  const email = String(profile.email || '').trim();
  const source = displayName || `${firstName} ${lastName}`.trim() || email || 'Neuroartan';

  return source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

/* =============================================================================
   04) MEDIA STATE RENDERING
============================================================================= */
function renderProfilePrivateMedia(state = getProfileRuntimeState()) {
  const root = getMediaRoot();
  if (!root) return;

  const profile = state.profile || {};
  const avatarUrl = String(profile.avatar_url || profile.photo_url || '').trim();
  const coverUrl = String(profile.cover_url || '').trim();

  setText(root, '[data-profile-avatar-preview-initials]', getInitials(profile));
  setText(root, '[data-profile-avatar-status]', avatarUrl ? 'Uploaded' : 'Not uploaded');
  setText(root, '[data-profile-cover-status]', coverUrl ? 'Uploaded' : 'Not uploaded');
  setText(
    root,
    '[data-profile-media-status]',
    avatarUrl || coverUrl
      ? 'Media layer has active profile assets.'
      : 'Media controls are prepared for the next profile stage.'
  );
}

/* =============================================================================
   05) MEDIA ACTIONS
============================================================================= */
function bindProfilePrivateMediaActions() {
  const root = getMediaRoot();
  if (!root || root.dataset.profilePrivateMediaBound === 'true') return;

  root.dataset.profilePrivateMediaBound = 'true';
  root.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-profile-action]');
    if (!trigger) return;

    document.dispatchEvent(new CustomEvent('profile:action-request', {
      detail: {
        source: MODULE_ID,
        action: trigger.dataset.profileAction || ''
      }
    }));
  });
}

/* =============================================================================
   06) INITIALIZATION
============================================================================= */
function initProfilePrivateMedia() {
  bindProfilePrivateMediaActions();
  renderProfilePrivateMedia();
  subscribeProfileRuntime(renderProfilePrivateMedia);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initProfilePrivateMedia, { once:true });
} else {
  initProfilePrivateMedia();
}