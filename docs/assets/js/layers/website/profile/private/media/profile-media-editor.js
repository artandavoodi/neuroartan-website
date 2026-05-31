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
  target:'profile',
  kind:'avatar',
  file:null,
  previewUrl:'',
  zoom:1,
  panX:0,
  panY:0,
  filter:'original',
  dragging:false,
  dragStartX:0,
  dragStartY:0,
  dragOriginX:0,
  dragOriginY:0,
  dragPointerId:null
});

const TARGET_ADAPTERS = new Map();

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

const FILTER_PRESETS = Object.freeze({
  original:{
    label:'Original',
    css:'none'
  },
  warm:{
    label:'Warm',
    css:'saturate(1.08) sepia(0.12) contrast(1.03)'
  },
  clear:{
    label:'Clear',
    css:'saturate(1.04) contrast(1.08) brightness(1.02)'
  },
  soft:{
    label:'Soft',
    css:'saturate(0.94) contrast(0.96) brightness(1.04)'
  },
  mono:{
    label:'Mono',
    css:'grayscale(1) contrast(1.05)'
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
  const adapter = TARGET_ADAPTERS.get(RUNTIME.target);
  if (typeof adapter?.getCurrentImageUrl === 'function') {
    return String(adapter.getCurrentImageUrl({ kind, target:RUNTIME.target }) || '').trim();
  }

  const state = getProfileRuntimeState();
  if (kind === 'cover') {
    return state.coverDisplayUrl || state.coverUrl || state.defaultCoverUrl || '';
  }
  return state.avatarDisplayUrl || state.avatarUrl || state.defaultAvatarUrl || '';
}

function getActiveTargetAdapter() {
  return TARGET_ADAPTERS.get(RUNTIME.target) || TARGET_ADAPTERS.get('profile');
}

function getEditorTitle() {
  const adapter = getActiveTargetAdapter();
  if (typeof adapter?.getTitle === 'function') {
    return String(adapter.getTitle({ kind:RUNTIME.kind, target:RUNTIME.target }) || '').trim();
  }
  return RUNTIME.kind === 'cover' ? 'Edit Header Image' : 'Edit Profile Image';
}

function revokePreviewUrl() {
  if (!RUNTIME.previewUrl) return;
  URL.revokeObjectURL(RUNTIME.previewUrl);
  RUNTIME.previewUrl = '';
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getActiveFilter() {
  return FILTER_PRESETS[RUNTIME.filter] || FILTER_PRESETS.original;
}

function syncFilterLabel(root = getEditorRoot()) {
  const label = root?.querySelector('[data-profile-media-editor-filter-label]');
  if (!(label instanceof HTMLElement)) return;
  label.textContent = getActiveFilter().label || FILTER_PRESETS.original.label;
}

function resetEditorTransform() {
  RUNTIME.zoom = 1;
  RUNTIME.panX = 0;
  RUNTIME.panY = 0;
  RUNTIME.filter = 'original';
  RUNTIME.dragging = false;
  RUNTIME.dragPointerId = null;
}

function getPanLimit(zoom = RUNTIME.zoom) {
  const safeZoom = Math.max(1, Number.isFinite(zoom) ? zoom : 1);
  return ((safeZoom - 1) / (safeZoom * 2)) * 100;
}

function clampEditorPan() {
  const limit = getPanLimit();
  RUNTIME.panX = clamp(RUNTIME.panX, -limit, limit);
  RUNTIME.panY = clamp(RUNTIME.panY, -limit, limit);
}

function setEditorOpenState(open) {
  document.documentElement?.classList.toggle('profile-media-editor-open', open);
  document.body?.classList.toggle('profile-media-editor-open', open);
}

function updateRangeProgress(root = getEditorRoot()) {
  const range = root?.querySelector('[data-profile-media-editor-zoom]');
  if (!(range instanceof HTMLInputElement)) return;
  const min = Number.parseFloat(range.min || '1');
  const max = Number.parseFloat(range.max || '2.4');
  const value = Number.parseFloat(range.value || '1');
  const progress = max > min ? ((value - min) / (max - min)) * 100 : 0;
  range.style.setProperty('--profile-media-editor-range-progress', `${clamp(progress, 0, 100)}%`);
}

function getResetMediaValues(kind = RUNTIME.kind, profile = {}) {
  if (kind === 'cover') {
    const currentFlags = Array.isArray(profile.public_feature_flags)
      ? profile.public_feature_flags
      : [];
    return {
      cover_url:'',
      cover_storage_path:'',
      profile_image_storage_bucket:'',
      public_feature_flags:currentFlags.filter((entry) => {
        const key = String(entry?.key || entry?.name || '').trim();
        return key !== 'profile_cover_url' && key !== 'profile_cover_storage_path';
      })
    };
  }

  return {
    avatar_state:'empty',
    avatar_url:'',
    photo_url:'',
    public_avatar_url:'',
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
  root.dataset.profileMediaEditorKind = RUNTIME.kind;
  root.setAttribute('aria-hidden', RUNTIME.open ? 'false' : 'true');

  const stage = root.querySelector('[data-profile-media-editor-stage]');
  if (stage instanceof HTMLElement) {
    stage.dataset.profileMediaEditorStage = RUNTIME.kind;
  }

  const title = root.querySelector('#profile-media-editor-title');
  if (title instanceof HTMLElement) {
    title.textContent = getEditorTitle();
  }

  const image = root.querySelector('[data-profile-media-editor-image]');
  if (image instanceof HTMLImageElement) {
    const imageUrl = RUNTIME.previewUrl || getCurrentImageUrl(RUNTIME.kind);
    if (imageUrl) {
      image.src = imageUrl;
      image.hidden = false;
    } else {
      image.hidden = true;
      image.removeAttribute('src');
    }
    image.alt = RUNTIME.kind === 'cover' ? 'Header image preview' : 'Profile image preview';
    image.style.setProperty('--profile-media-editor-image-zoom', String(RUNTIME.zoom));
    image.style.setProperty('--profile-media-editor-image-x', `${RUNTIME.panX}%`);
    image.style.setProperty('--profile-media-editor-image-y', `${RUNTIME.panY}%`);
    image.style.setProperty('--profile-media-editor-image-filter', getActiveFilter().css);
  }

  const zoom = root.querySelector('[data-profile-media-editor-zoom]');
  if (zoom instanceof HTMLInputElement) {
    zoom.value = String(RUNTIME.zoom);
  }

  const filterSelect = root.querySelector('[data-profile-media-editor-filter-select]');
  if (filterSelect instanceof HTMLSelectElement) {
    const currentOptions = Array.from(filterSelect.options).map((option) => option.value).join('|');
    const nextOptions = Object.keys(FILTER_PRESETS).join('|');
    if (currentOptions !== nextOptions) {
      filterSelect.replaceChildren(...Object.entries(FILTER_PRESETS).map(([key, preset]) => {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = preset.label;
        return option;
      }));
    }
    filterSelect.value = FILTER_PRESETS[RUNTIME.filter] ? RUNTIME.filter : 'original';
  }

  syncFilterLabel(root);
  updateRangeProgress(root);
}

function openEditor(kind = 'avatar', target = 'profile') {
  revokePreviewUrl();
  RUNTIME.open = true;
  RUNTIME.target = TARGET_ADAPTERS.has(target) ? target : 'profile';
  RUNTIME.kind = kind === 'cover' ? 'cover' : 'avatar';
  RUNTIME.file = null;
  resetEditorTransform();
  setEditorOpenState(true);
  renderEditor();
  setStatus(getEditorRoot(), 'Choose an image, adjust the preview, then save.', 'idle');
}

function closeEditor() {
  revokePreviewUrl();
  RUNTIME.open = false;
  RUNTIME.file = null;
  resetEditorTransform();
  setEditorOpenState(false);
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
  resetEditorTransform();
  setStatus(root, 'Image ready for saving.', 'ready');
  renderEditor();
}

function recenterEditorImage() {
  RUNTIME.panX = 0;
  RUNTIME.panY = 0;
  renderEditor();
  setStatus(getEditorRoot(), 'Image centered.', 'ready');
}

function selectEditorFilter(filterKey = 'original') {
  RUNTIME.filter = FILTER_PRESETS[filterKey] ? filterKey : 'original';
  renderEditor();
}

function startEditorDrag(event, preview) {
  if (!(preview instanceof HTMLElement)) return;
  if (event.button !== 0 && event.pointerType !== 'touch') return;

  RUNTIME.dragging = true;
  RUNTIME.dragStartX = event.clientX;
  RUNTIME.dragStartY = event.clientY;
  RUNTIME.dragOriginX = RUNTIME.panX;
  RUNTIME.dragOriginY = RUNTIME.panY;
  RUNTIME.dragPointerId = event.pointerId;
  preview.setPointerCapture?.(event.pointerId);
}

function moveEditorDrag(event, preview) {
  if (!RUNTIME.dragging) return;
  if (RUNTIME.dragPointerId !== null && event.pointerId !== RUNTIME.dragPointerId) return;
  if (!(preview instanceof HTMLElement)) return;

  const rect = preview.getBoundingClientRect();
  const width = Math.max(1, rect.width);
  const height = Math.max(1, rect.height);
  const deltaX = ((event.clientX - RUNTIME.dragStartX) / width) * 100;
  const deltaY = ((event.clientY - RUNTIME.dragStartY) / height) * 100;
  const limit = getPanLimit();

  RUNTIME.panX = clamp(RUNTIME.dragOriginX + deltaX, -limit, limit);
  RUNTIME.panY = clamp(RUNTIME.dragOriginY + deltaY, -limit, limit);
  renderEditor();
}

function stopEditorDrag(event, preview) {
  if (!RUNTIME.dragging) return;
  if (RUNTIME.dragPointerId !== null && event.pointerId !== RUNTIME.dragPointerId) return;
  RUNTIME.dragging = false;
  RUNTIME.dragPointerId = null;
  if (preview instanceof HTMLElement) {
    preview.releasePointerCapture?.(event.pointerId);
  }
}

function nudgeEditorImage(key = '') {
  const step = key.includes('Arrow') ? 3 : 0;
  if (!step) return false;

  const limit = getPanLimit();
  if (key === 'ArrowLeft') RUNTIME.panX = clamp(RUNTIME.panX - step, -limit, limit);
  if (key === 'ArrowRight') RUNTIME.panX = clamp(RUNTIME.panX + step, -limit, limit);
  if (key === 'ArrowUp') RUNTIME.panY = clamp(RUNTIME.panY - step, -limit, limit);
  if (key === 'ArrowDown') RUNTIME.panY = clamp(RUNTIME.panY + step, -limit, limit);

  renderEditor();
  return true;
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

async function createCroppedFile(file, kind = RUNTIME.kind, zoom = RUNTIME.zoom, panX = RUNTIME.panX, panY = RUNTIME.panY, filter = RUNTIME.filter) {
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
  context.filter = (FILTER_PRESETS[filter] || FILTER_PRESETS.original).css;

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
  const fittedX = (image.naturalWidth - sourceWidth) / 2;
  const fittedY = (image.naturalHeight - sourceHeight) / 2;
  const maxOffsetX = (sourceWidth - cropWidth) / 2;
  const maxOffsetY = (sourceHeight - cropHeight) / 2;
  const panLimit = getPanLimit(safeZoom);
  const panRatioX = panLimit > 0 ? clamp(panX / panLimit, -1, 1) : 0;
  const panRatioY = panLimit > 0 ? clamp(panY / panLimit, -1, 1) : 0;
  const cropX = fittedX + ((sourceWidth - cropWidth) / 2) - (maxOffsetX * panRatioX);
  const cropY = fittedY + ((sourceHeight - cropHeight) / 2) - (maxOffsetY * panRatioY);

  context.drawImage(
    image,
    clamp(cropX, fittedX, fittedX + sourceWidth - cropWidth),
    clamp(cropY, fittedY, fittedY + sourceHeight - cropHeight),
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
  const adapter = getActiveTargetAdapter();

  if (!RUNTIME.file) {
    setStatus(root, 'Choose an image before saving.', 'error');
    return;
  }

  if (typeof adapter?.save !== 'function' && (state.viewerState !== 'authenticated' || !state.user)) {
    setStatus(root, 'Sign in before editing profile images.', 'error');
    return;
  }

  const loadingReason = createLoadingReason('save');
  setStatus(root, 'Saving image...', 'saving');
  startLoading(loadingReason);

  try {
    const croppedFile = await createCroppedFile(
      RUNTIME.file,
      RUNTIME.kind,
      RUNTIME.zoom,
      RUNTIME.panX,
      RUNTIME.panY,
      RUNTIME.filter
    );

    if (typeof adapter?.save === 'function') {
      await adapter.save({
        file:croppedFile,
        kind:RUNTIME.kind,
        target:RUNTIME.target
      });
    } else {
      await saveProfileScope({
        scope:'media',
        values:RUNTIME.kind === 'cover'
          ? { cover_file:croppedFile }
          : { avatar_file:croppedFile },
        existingProfile:state.profile,
        user:state.user
      });
    }

    setStatus(root, 'Image saved.', 'success');
    document.dispatchEvent(new CustomEvent('account:profile-refresh-request', {
      detail:{
        source:'profile-media-editor',
        scope:'media',
        kind:RUNTIME.kind,
        target:RUNTIME.target
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
  const adapter = getActiveTargetAdapter();

  if (typeof adapter?.reset !== 'function' && (state.viewerState !== 'authenticated' || !state.user)) {
    setStatus(root, 'Sign in before resetting profile images.', 'error');
    return;
  }

  const loadingReason = createLoadingReason('reset');
  setStatus(root, 'Resetting image...', 'saving');
  startLoading(loadingReason);

  try {
    if (typeof adapter?.reset === 'function') {
      await adapter.reset({
        kind:RUNTIME.kind,
        target:RUNTIME.target
      });
    } else {
      await saveProfileScope({
        scope:'media',
        values:getResetMediaValues(RUNTIME.kind, state.profile || {}),
        existingProfile:state.profile,
        user:state.user
      });
    }

    setStatus(root, 'Image reset.', 'success');
    document.dispatchEvent(new CustomEvent('account:profile-refresh-request', {
      detail:{
        source:'profile-media-editor',
        scope:'media',
        kind:RUNTIME.kind,
        target:RUNTIME.target
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
    openEditor(detail.kind || 'avatar', detail.target || 'profile');
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
      return;
    }

    if (target.closest('[data-profile-media-editor-recenter]')) {
      event.preventDefault();
      recenterEditorImage();
      return;
    }

  });

  document.addEventListener('change', (event) => {
    const input = event.target;
    if (input instanceof HTMLInputElement && input.matches('[data-profile-media-editor-file]')) {
      handleFileSelection(input.files?.[0] || null);
      return;
    }
    if (input instanceof HTMLSelectElement && input.matches('[data-profile-media-editor-filter-select]')) {
      selectEditorFilter(input.value || 'original');
    }
  });

  document.addEventListener('input', (event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || !input.matches('[data-profile-media-editor-zoom]')) return;
    const value = Number.parseFloat(input.value || '1');
    RUNTIME.zoom = Number.isFinite(value) ? value : 1;
    clampEditorPan();
    renderEditor();
  });

  document.addEventListener('pointerdown', (event) => {
    const preview = event.target instanceof Element
      ? event.target.closest('[data-profile-media-editor-preview]')
      : null;
    if (!(preview instanceof HTMLElement)) return;
    event.preventDefault();
    startEditorDrag(event, preview);
  });

  document.addEventListener('pointermove', (event) => {
    if (!RUNTIME.dragging) return;
    const preview = getEditorRoot()?.querySelector('[data-profile-media-editor-preview]');
    if (!(preview instanceof HTMLElement)) return;
    event.preventDefault();
    moveEditorDrag(event, preview);
  });

  document.addEventListener('pointerup', (event) => {
    const preview = getEditorRoot()?.querySelector('[data-profile-media-editor-preview]');
    if (!(preview instanceof HTMLElement)) return;
    stopEditorDrag(event, preview);
  });

  document.addEventListener('pointercancel', (event) => {
    const preview = getEditorRoot()?.querySelector('[data-profile-media-editor-preview]');
    if (!(preview instanceof HTMLElement)) return;
    stopEditorDrag(event, preview);
  });

  document.addEventListener('keydown', (event) => {
    if (!RUNTIME.open) return;
    if (event.key === 'Escape') {
      closeEditor();
      return;
    }
    if (nudgeEditorImage(event.key)) {
      event.preventDefault();
    }
  });
}

export function registerProfileMediaEditorTarget(target, adapter = {}) {
  const normalizedTarget = String(target || '').trim();
  if (!normalizedTarget || normalizedTarget === 'profile') return;
  TARGET_ADAPTERS.set(normalizedTarget, adapter && typeof adapter === 'object' ? adapter : {});
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
