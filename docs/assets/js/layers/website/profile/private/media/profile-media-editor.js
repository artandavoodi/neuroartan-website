/* =============================================================================
   01) MODULE IMPORTS
============================================================================= */
import {
  getProfileRuntimeState,
  subscribeProfileRuntime
} from '../shell/profile-runtime.js';
import * as profileSave from '../../../system/profile/profile-save.js';

const saveProfileScope =
  profileSave.savePublicProfileScope ||
  profileSave.saveProfileScope ||
  profileSave.savePrivateProfileScope;

/* =============================================================================
   02) MODULE STATE
============================================================================= */
const RUNTIME = (window.__NEUROARTAN_PROFILE_MEDIA_EDITOR__ ||= {
  initialized:false,
  open:false,
  kind:'avatar',
  file:null,
  previewUrl:'',
  zoom:1
});

const CROP_OUTPUT = Object.freeze({
  avatar:{
    width:1024,
    height:1024
  },
  cover:{
    width:1600,
    height:900
  }
});

function createLoadingReason(action = 'save') {
  return `profile-media:${action}:${Date.now()}`;
}

function startLoading(reason) {
  document.dispatchEvent(new CustomEvent('neuroartan:loading-start', {
    detail:{
      reason,
      critical:true,
      source:'profile-media-editor'
    }
  }));
}

function stopLoading(reason) {
  document.dispatchEvent(new CustomEvent('neuroartan:loading-stop', {
    detail:{
      reason,
      source:'profile-media-editor'
    }
  }));
}

/* =============================================================================
   03) DOM HELPERS
============================================================================= */
function getEditorRoot() {
  return document.querySelector('[data-profile-media-editor]');
}

function setStatus(root, message = '', state = 'idle') {
  const node = root?.querySelector('[data-profile-media-editor-status]');
  if (!(node instanceof HTMLElement)) return;
  node.textContent = message;
  node.dataset.profileMediaEditorState = state;
}

function getCurrentImageUrl(kind = RUNTIME.kind) {
  const state = getProfileRuntimeState();
  if (kind === 'cover') {
    return state.coverDisplayUrl || state.coverUrl || state.defaultCoverUrl || '';
  }
  return state.avatarDisplayUrl || state.avatarUrl || state.defaultAvatarUrl || '';
}

function revokePreviewUrl() {
  if (!RUNTIME.previewUrl) return;
  URL.revokeObjectURL(RUNTIME.previewUrl);
  RUNTIME.previewUrl = '';
}

function getResetMediaValues(kind = RUNTIME.kind, profile = {}) {
  if (kind === 'cover') {
    const currentFlags = Array.isArray(profile.public_feature_flags)
      ? profile.public_feature_flags
      : [];
    const fallbackCoverUrl = getProfileRuntimeState().defaultCoverUrl || '';
    return {
      cover_url:fallbackCoverUrl,
      cover_storage_path:'',
      profile_image_storage_bucket:'',
      public_feature_flags:currentFlags.filter((entry) => {
        const key = String(entry?.key || entry?.name || '').trim();
        return key !== 'profile_cover_url' && key !== 'profile_cover_storage_path';
      }).concat(fallbackCoverUrl
        ? [{ key:'profile_cover_url', value:fallbackCoverUrl, scope:'profile_media' }]
        : [])
    };
  }

  const fallbackAvatarUrl = getProfileRuntimeState().defaultAvatarUrl || '';
  return {
    avatar_url:fallbackAvatarUrl,
    photo_url:fallbackAvatarUrl,
    public_avatar_url:fallbackAvatarUrl,
    avatar_storage_path:'',
    profile_image_storage_bucket:''
  };
}

/* =============================================================================
   04) EDITOR STATE
============================================================================= */
function renderEditor() {
  const root = getEditorRoot();
  if (!(root instanceof HTMLElement)) return;

  root.hidden = !RUNTIME.open;
  root.dataset.profileMediaEditorOpen = RUNTIME.open ? 'true' : 'false';
  root.setAttribute('aria-hidden', RUNTIME.open ? 'false' : 'true');

  const stage = root.querySelector('[data-profile-media-editor-stage]');
  if (stage instanceof HTMLElement) {
    stage.dataset.profileMediaEditorStage = RUNTIME.kind;
  }

  const kindLabel = root.querySelector('[data-profile-media-editor-kind]');
  if (kindLabel instanceof HTMLElement) {
    kindLabel.textContent = RUNTIME.kind === 'cover' ? 'Header image' : 'Profile image';
  }

  const title = root.querySelector('#profile-media-editor-title');
  if (title instanceof HTMLElement) {
    title.textContent = RUNTIME.kind === 'cover' ? 'Edit Header Image' : 'Edit Profile Image';
  }

  const image = root.querySelector('[data-profile-media-editor-image]');
  if (image instanceof HTMLImageElement) {
    image.src = RUNTIME.previewUrl || getCurrentImageUrl(RUNTIME.kind);
    image.alt = RUNTIME.kind === 'cover' ? 'Header image preview' : 'Profile image preview';
    image.style.setProperty('--profile-media-editor-image-zoom', String(RUNTIME.zoom));
  }

  const zoom = root.querySelector('[data-profile-media-editor-zoom]');
  if (zoom instanceof HTMLInputElement) {
    zoom.value = String(RUNTIME.zoom);
  }
}

function openEditor(kind = 'avatar') {
  revokePreviewUrl();
  RUNTIME.open = true;
  RUNTIME.kind = kind === 'cover' ? 'cover' : 'avatar';
  RUNTIME.file = null;
  RUNTIME.zoom = 1;
  renderEditor();
  setStatus(getEditorRoot(), 'Choose an image, adjust the preview, then save.', 'idle');
}

function closeEditor() {
  revokePreviewUrl();
  RUNTIME.open = false;
  RUNTIME.file = null;
  RUNTIME.zoom = 1;
  renderEditor();
}

function handleFileSelection(file) {
  const root = getEditorRoot();
  if (!(file instanceof File) || !file.type.startsWith('image/')) {
    RUNTIME.file = null;
    setStatus(root, 'Choose a valid image file.', 'error');
    renderEditor();
    return;
  }

  revokePreviewUrl();
  RUNTIME.file = file;
  RUNTIME.previewUrl = URL.createObjectURL(file);
  setStatus(root, 'Image ready for saving.', 'ready');
  renderEditor();
}

function createCroppedBlob(canvas, type = 'image/jpeg', quality = 0.92) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
        return;
      }
      reject(new Error('PROFILE_MEDIA_CROP_FAILED'));
    }, type, quality);
  });
}

function loadImageElement(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const src = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(src);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(src);
      reject(new Error('PROFILE_MEDIA_IMAGE_LOAD_FAILED'));
    };

    image.src = src;
  });
}

async function createCroppedFile(file, kind = RUNTIME.kind, zoom = RUNTIME.zoom) {
  const image = await loadImageElement(file);
  const output = CROP_OUTPUT[kind] || CROP_OUTPUT.avatar;
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (!context) {
    const error = new Error('PROFILE_MEDIA_CANVAS_UNAVAILABLE');
    error.code = 'PROFILE_MEDIA_CANVAS_UNAVAILABLE';
    throw error;
  }

  canvas.width = output.width;
  canvas.height = output.height;

  const sourceRatio = image.naturalWidth / image.naturalHeight;
  const targetRatio = output.width / output.height;
  let sourceWidth = image.naturalWidth;
  let sourceHeight = image.naturalHeight;

  if (sourceRatio > targetRatio) {
    sourceWidth = image.naturalHeight * targetRatio;
  } else {
    sourceHeight = image.naturalWidth / targetRatio;
  }

  const safeZoom = Math.max(1, Number.isFinite(zoom) ? zoom : 1);
  const cropWidth = sourceWidth / safeZoom;
  const cropHeight = sourceHeight / safeZoom;
  const cropX = (image.naturalWidth - cropWidth) / 2;
  const cropY = (image.naturalHeight - cropHeight) / 2;

  context.drawImage(
    image,
    cropX,
    cropY,
    cropWidth,
    cropHeight,
    0,
    0,
    output.width,
    output.height
  );

  const blob = await createCroppedBlob(canvas);
  const extension = kind === 'cover' ? 'cover.jpeg' : 'avatar.jpeg';
  return new File([blob], `profile-${extension}`, {
    type:'image/jpeg',
    lastModified:Date.now()
  });
}

/* =============================================================================
   05) SAVE FLOW
============================================================================= */
async function saveEditorImage() {
  const root = getEditorRoot();
  const state = getProfileRuntimeState();

  if (!RUNTIME.file) {
    setStatus(root, 'Choose an image before saving.', 'error');
    return;
  }

  if (state.viewerState !== 'authenticated' || !state.user) {
    setStatus(root, 'Sign in before editing profile images.', 'error');
    return;
  }

  const loadingReason = createLoadingReason('save');
  setStatus(root, 'Saving image...', 'saving');
  startLoading(loadingReason);

  try {
    const croppedFile = await createCroppedFile(RUNTIME.file, RUNTIME.kind, RUNTIME.zoom);

    await saveProfileScope({
      scope:'media',
      values:RUNTIME.kind === 'cover'
        ? { cover_file:croppedFile }
        : { avatar_file:croppedFile },
      existingProfile:state.profile,
      user:state.user
    });

    setStatus(root, 'Image saved.', 'success');
    document.dispatchEvent(new CustomEvent('account:profile-refresh-request', {
      detail:{
        source:'profile-media-editor',
        scope:'media',
        kind:RUNTIME.kind
      }
    }));
    closeEditor();
  } catch (error) {
    console.error('[profile-media-editor] Save failed.', error);
    setStatus(root, 'Image could not be saved. Check profile media storage.', 'error');
  } finally {
    stopLoading(loadingReason);
  }
}

async function resetEditorImage() {
  const root = getEditorRoot();
  const state = getProfileRuntimeState();

  if (state.viewerState !== 'authenticated' || !state.user) {
    setStatus(root, 'Sign in before resetting profile images.', 'error');
    return;
  }

  const loadingReason = createLoadingReason('reset');
  setStatus(root, 'Resetting image...', 'saving');
  startLoading(loadingReason);

  try {
    await saveProfileScope({
      scope:'media',
      values:getResetMediaValues(RUNTIME.kind, state.profile || {}),
      existingProfile:state.profile,
      user:state.user
    });

    setStatus(root, 'Image reset.', 'success');
    document.dispatchEvent(new CustomEvent('account:profile-refresh-request', {
      detail:{
        source:'profile-media-editor',
        scope:'media',
        kind:RUNTIME.kind
      }
    }));
    closeEditor();
  } catch (error) {
    console.error('[profile-media-editor] Reset failed.', error);
    setStatus(root, 'Image could not be reset. Check profile media storage.', 'error');
  } finally {
    stopLoading(loadingReason);
  }
}

/* =============================================================================
   06) EVENT BINDING
============================================================================= */
function bindProfileMediaEditor() {
  if (RUNTIME.initialized) return;
  RUNTIME.initialized = true;

  document.addEventListener('profile:media-editor-open-request', (event) => {
    const detail = event instanceof CustomEvent ? event.detail || {} : {};
    openEditor(detail.kind || 'avatar');
  });

  document.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;

    if (target.closest('[data-profile-media-editor-close="true"]')) {
      event.preventDefault();
      closeEditor();
      return;
    }

    if (target.closest('[data-profile-media-editor-save]')) {
      event.preventDefault();
      void saveEditorImage();
      return;
    }

    if (target.closest('[data-profile-media-editor-reset]')) {
      event.preventDefault();
      void resetEditorImage();
    }
  });

  document.addEventListener('change', (event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || !input.matches('[data-profile-media-editor-file]')) return;
    handleFileSelection(input.files?.[0] || null);
  });

  document.addEventListener('input', (event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || !input.matches('[data-profile-media-editor-zoom]')) return;
    const value = Number.parseFloat(input.value || '1');
    RUNTIME.zoom = Number.isFinite(value) ? value : 1;
    renderEditor();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || !RUNTIME.open) return;
    closeEditor();
  });
}

/* =============================================================================
   07) INITIALIZATION
============================================================================= */
function initProfileMediaEditor() {
  bindProfileMediaEditor();
  subscribeProfileRuntime(() => {
    if (RUNTIME.open) renderEditor();
  });
  renderEditor();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initProfileMediaEditor, { once:true });
} else {
  initProfileMediaEditor();
}
