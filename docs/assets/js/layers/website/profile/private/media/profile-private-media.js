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
import { subscribePrivateProfileSaveState } from '../../../system/profile/profile-save.js';

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

function setImage(root, selector, src, alt = '') {
  const image = root?.querySelector(selector);
  if (!(image instanceof HTMLImageElement)) return;

  if (src) {
    image.hidden = false;
    image.src = src;
    image.alt = alt;
    return;
  }

  image.hidden = true;
  image.removeAttribute('src');
  image.alt = '';
}

/* =============================================================================
   03A) MEDIA RESOLUTION
============================================================================= */

function resolveAvatarPreviewUrl(state = {}) {
  return String(state.avatarDisplayUrl || state.avatarUrl || '').trim();
}

function resolveCoverPreviewUrl(state = {}) {
  return String(state.coverDisplayUrl || state.coverUrl || '').trim();
}

function resolveMediaStatusCopy(state = {}) {
  if (state.avatarHasImage || state.coverUrl) {
    return 'Media layer has active profile assets.';
  }

  return 'Media layer is using default profile assets.';
}

/* =============================================================================
   04) MEDIA STATE RENDERING
============================================================================= */
function renderProfilePrivateMedia(state = getProfileRuntimeState()) {
  const root = getMediaRoot();
  if (!root) return;

  const avatarUrl = resolveAvatarPreviewUrl(state);
  const coverUrl = resolveCoverPreviewUrl(state);

  setImage(root, '[data-profile-avatar-preview-image]', avatarUrl, `${state.displayName || 'Profile'} avatar`);
  setImage(root, '[data-profile-cover-preview-image]', coverUrl, `${state.displayName || 'Profile'} cover`);
  setText(root, '[data-profile-avatar-status]', state.avatarHasImage ? 'Uploaded' : 'Default image');
  setText(root, '[data-profile-cover-status]', state.coverUrl ? 'Uploaded' : 'Default image');
  const placeholder = root.querySelector('[data-profile-avatar-preview-placeholder]');
  if (placeholder instanceof HTMLElement) {
    placeholder.hidden = true;
  }
  const coverLabel = root.querySelector('[data-profile-cover-preview-label]');
  if (coverLabel instanceof HTMLElement) {
    coverLabel.hidden = Boolean(coverUrl);
  }
  setText(
    root,
    '[data-profile-media-status]',
    resolveMediaStatusCopy(state)
  );
}

/* =============================================================================
   05) MEDIA ACTIONS
============================================================================= */

function resolveFilePreviewUrl(file = null) {
  if (!file || typeof URL === 'undefined') {
    return '';
  }

  return URL.createObjectURL(file);
}

function updateSelectedFileStatus(root, fileInput) {
  const mediaType = fileInput?.dataset?.profileMediaFile || '';
  const file = fileInput?.files?.[0] || null;
  const fileName = file?.name || 'No file selected';
  const statusSelector = mediaType === 'cover'
    ? '[data-profile-cover-file-status]'
    : '[data-profile-avatar-file-status]';
  setText(root, statusSelector, fileName);

  if (!file || typeof URL === 'undefined') return;

  const previewUrl = resolveFilePreviewUrl(file);
  if (mediaType === 'cover') {
    setImage(root, '[data-profile-cover-preview-image]', previewUrl, fileName);
    const coverLabel = root.querySelector('[data-profile-cover-preview-label]');
    if (coverLabel instanceof HTMLElement) coverLabel.hidden = true;
    return;
  }

  setImage(root, '[data-profile-avatar-preview-image]', previewUrl, fileName);
  const placeholder = root.querySelector('[data-profile-avatar-preview-placeholder]');
  if (placeholder instanceof HTMLElement) placeholder.hidden = true;
}

function renderProfilePrivateMediaSaveState(state = {}) {
  const root = getMediaRoot();
  if (!root) return;

  const mediaState = state.media || {};
  setText(root, '[data-profile-media-status]', mediaState.message || 'Media controls are ready.');
}

function bindProfilePrivateMediaActions() {
  const root = getMediaRoot();
  if (!root || root.dataset.profilePrivateMediaBound === 'true') return;

  root.dataset.profilePrivateMediaBound = 'true';
  root.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-profile-media-trigger]');
    if (!trigger) return;

    const target = root.querySelector(`[data-profile-media-file="${trigger.dataset.profileMediaTrigger}"]`);
    target?.click();
  });

  root.addEventListener('change', (event) => {
    const fileInput = event.target.closest('[data-profile-media-file]');
    if (!fileInput) return;
    updateSelectedFileStatus(root, fileInput);
  });
}

/* =============================================================================
   06) INITIALIZATION
============================================================================= */
function initProfilePrivateMedia() {
  bindProfilePrivateMediaActions();
  renderProfilePrivateMedia();
  subscribeProfileRuntime(renderProfilePrivateMedia);
  subscribePrivateProfileSaveState(renderProfilePrivateMediaSaveState);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initProfilePrivateMedia, { once:true });
} else {
  initProfilePrivateMedia();
}
