/* =============================================================================
   01) MODULE IDENTITY
   02) IMPORTS
   03) STATE
   04) POLICY AND STORAGE
   05) RENDERING
   06) ACTIONS
   07) INITIALIZATION
============================================================================= */

/* =============================================================================
   01) MODULE IDENTITY
============================================================================= */
const MODULE_ID = 'profile-posts';
const VISIBILITY_STORAGE_KEY = 'neuroartan-profile-post-visibility';

/* =============================================================================
   02) IMPORTS
============================================================================= */
import {
  getProfileRuntimeState,
  subscribeProfileRuntime
} from '../shell/profile-runtime.js';
import {
  getProfileFilterState,
  subscribeProfileFilters
} from '../filter/profile-filter-overlay.js';
import {
  createSpeechInputController,
  hasSpeechInputSupport
} from '../../../../../core/02-systems/speech-input.js';
import { normalizeString } from '../../../system/account/identity/account-profile-identity.js';
import {
  createFeedPost,
  deleteFeedPost,
  listFeedPosts,
  updateFeedPost
} from '../../../system/feed/feed-store.js';
import {
  createProfilePost,
  deleteProfilePost as deletePrivateProfilePost,
  listProfilePosts,
  updateProfilePost
} from '../../../system/profile/profile-post-store.js';
import { uploadProfileImage } from '../../../system/profile/profile-image-storage.js';

/* =============================================================================
   03) STATE
============================================================================= */
const DEFAULT_POLICY = Object.freeze({
  visibility: [
    { key: 'private', label: 'Only me', summary: 'Owner-only storage requires the private profile_posts table.' },
    { key: 'public', label: 'Everyone', summary: 'Publish to your public profile and feed.' }
  ],
  limits: {
    titleMaxLength: 120,
    bodyMaxLength: 500
  }
});

const STORE = (window.__NEUROARTAN_PROFILE_POSTS__ ||= {
  initialized: false,
  policy: null,
  loading: true,
  posts: [],
  renderSequence: 0,
  selectedMediaFile: null,
  selectedMediaKind: '',
  editingPostId: '',
  speechController: null,
  moreOverlayPostId: ''
});

/* =============================================================================
   04) POLICY AND STORAGE
============================================================================= */
function assetPath(path) {
  if (window.NeuroartanFragmentAuthorities?.assetPath) {
    return window.NeuroartanFragmentAuthorities.assetPath(path);
  }

  const normalized = normalizeString(path);
  return normalized.startsWith('/') ? normalized.slice(1) : normalized;
}

async function loadPolicy() {
  if (STORE.policy) return STORE.policy;

  try {
    const response = await fetch(assetPath('/assets/data/profile/private-posts-policy.json'), {
      credentials: 'same-origin'
    });
    if (!response.ok) throw new Error(`Posts policy request failed (${response.status}).`);
    const payload = await response.json();
    STORE.policy = {
      visibility: Array.isArray(payload?.visibility) && payload.visibility.length
        ? payload.visibility
        : DEFAULT_POLICY.visibility,
      limits: {
        ...DEFAULT_POLICY.limits,
        ...(payload?.limits || {})
      }
    };
  } catch (error) {
    console.error('[profile-posts] Failed to load posts policy.', error);
    STORE.policy = DEFAULT_POLICY;
  }

  return STORE.policy;
}

async function syncStoreWithRuntime() {
  const feedPosts = await listFeedPosts();
  const privatePosts = await listProfilePosts().catch(() => []);
  const allPosts = [
    ...feedPosts
      .filter((post) => post.ownedByCurrentUser)
      .map((post) => ({
        id: post.id,
        title: 'Profile post',
        body: post.content,
        visibility: 'public',
        createdAt: post.createdAt,
        source: post.source,
        mediaUrl: post.mediaUrl || post.imageUrl || '',
        mediaType: post.mediaType || ''
      })),
    ...privatePosts
      .map((post) => ({
        id: post.id,
        title: post.title || 'Untitled post',
        body: post.body,
        visibility: post.visibility || 'private',
        createdAt: post.createdAt,
        source: 'profile',
        mediaUrl: '',
        mediaType: ''
      }))
  ];
  STORE.posts = allPosts;
}

/* =============================================================================
   05) RENDERING
============================================================================= */
function getRoot() {
  return document.querySelector('[data-profile-posts]');
}

function getStoredVisibility() {
  try {
    return window.localStorage.getItem(VISIBILITY_STORAGE_KEY) || 'public';
  } catch (_) {
    return 'public';
  }
}

function setStoredVisibility(visibility) {
  try {
    window.localStorage.setItem(VISIBILITY_STORAGE_KEY, visibility);
  } catch (_) {}
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Just now';

  try {
    return new Intl.DateTimeFormat(document.documentElement.lang || 'en', {
      month: 'short',
      day: 'numeric'
    }).format(date);
  } catch (_) {
    return date.toISOString();
  }
}

function updateVisibilityTrigger(root, visibility) {
  const trigger = root.querySelector('[data-profile-post-visibility-trigger]');
  const icon = trigger?.querySelector('.profile-posts__visibility-icon');
  const label = trigger?.querySelector('.profile-posts__visibility-label');
  
  if (!trigger || !icon || !label) return;
  
  const iconSrc = visibility === 'public'
    ? '/registry/icons/public/assets/core/actions/visibility/public-route.svg'
    : '/registry/icons/public/assets/core/actions/visibility/private-draft.svg';
  const labelText = visibility === 'public' ? 'Everyone' : 'Only me';
  
  icon.src = iconSrc;
  label.textContent = labelText;
}

function getPostBodyLimit(policy = STORE.policy || DEFAULT_POLICY) {
  const limit = Number(policy?.limits?.bodyMaxLength || DEFAULT_POLICY.limits.bodyMaxLength);
  return Number.isFinite(limit) && limit > 0 ? limit : DEFAULT_POLICY.limits.bodyMaxLength;
}

function syncPostCounter(root, policy = STORE.policy || DEFAULT_POLICY) {
  const textarea = root.querySelector('textarea[name="body"]');
  const counter = root.querySelector('[data-profile-post-character-count]');
  if (!(textarea instanceof HTMLTextAreaElement) || !(counter instanceof HTMLElement)) return;

  const limit = getPostBodyLimit(policy);
  const count = textarea.value.length;
  textarea.maxLength = limit;

  const progressCircle = counter.querySelector('.profile-posts__counter-circle-progress');
  if (!(progressCircle instanceof SVGCircleElement)) return;

  const percentage = Math.min((count / limit) * 100, 100);
  const offset = 100 - percentage;
  progressCircle.style.strokeDashoffset = `${offset}`;

  if (count > limit) {
    counter.dataset.profilePostCharacterState = 'over';
  } else if (count >= limit * 0.8) {
    counter.dataset.profilePostCharacterState = 'warning';
  } else {
    counter.dataset.profilePostCharacterState = 'ready';
  }
}

function syncSubmitLabel(root) {
  const submitButton = root.querySelector('[data-profile-post-submit]');
  if (!(submitButton instanceof HTMLButtonElement)) return;
  // Button is now icon-only, no text label needed
}

function mediaKindFromFile(file) {
  const type = normalizeString(file?.type || '').toLowerCase();
  if (type.startsWith('video/')) return 'video';
  if (type.startsWith('audio/')) return 'audio';
  return 'image';
}

function getMediaAccept(kind = '') {
  switch (kind) {
    case 'video':
      return 'video/*';
    case 'audio':
      return 'audio/*';
    case 'image':
      return 'image/*';
    case 'gif':
      return 'image/gif';
    default:
      return 'image/*,video/*,audio/*';
  }
}

function syncVoiceButton(root) {
  const voiceButton = root.querySelector('[data-profile-post-voice-trigger]');
  if (!(voiceButton instanceof HTMLButtonElement)) return;

  if (!hasSpeechInputSupport()) {
    voiceButton.hidden = true;
    return;
  }

  voiceButton.hidden = false;
  voiceButton.setAttribute('aria-pressed', STORE.speechController?.isListening?.() ? 'true' : 'false');
}

function ensurePostSpeechController(root) {
  if (STORE.speechController) return STORE.speechController;

  STORE.speechController = createSpeechInputController({
    onStart: () => syncVoiceButton(root),
    onResult: ({ transcript, isFinal }) => {
      const textarea = root.querySelector('textarea[name="body"]');
      if (!(textarea instanceof HTMLTextAreaElement)) return;

      if (!isFinal) return;

      const prefix = textarea.value.trim();
      textarea.value = [prefix, normalizeString(transcript)].filter(Boolean).join(prefix ? ' ' : '');
      syncPostCounter(root);
    },
    onEnd: () => syncVoiceButton(root),
    onError: () => syncVoiceButton(root)
  });

  return STORE.speechController;
}

function renderPostList(root) {
  const list = root.querySelector('[data-profile-post-list]');
  const empty = root.querySelector('[data-profile-post-empty]');
  const loading = root.querySelector('[data-profile-post-loading]');
  const count = root.querySelector('[data-profile-post-count]');
  if (!(list instanceof HTMLElement)) return;

  list.innerHTML = '';
  if (loading instanceof HTMLElement) loading.hidden = !STORE.loading;

  const filters = getProfileFilterState('posts').filters;
  const posts = STORE.posts
    .filter((post) => {
      if (filters.visibility !== 'all' && post.visibility !== filters.visibility) return false;

      const mediaType = normalizeString(post.mediaType || '').toLowerCase();
      const mediaFilter = normalizeString(filters.media || 'all').toLowerCase();
      if (mediaFilter === 'text' && post.mediaUrl) return false;
      if (mediaFilter !== 'all' && mediaFilter !== 'text' && mediaType !== mediaFilter) return false;

      if (filters.year !== 'all') {
        const year = new Date(post.createdAt).getFullYear();
        if (String(year) !== String(filters.year)) return false;
      }

      return true;
    })
    .slice()
    .sort((left, right) => {
      const direction = filters.sort === 'oldest' ? 1 : -1;
      return String(left.createdAt).localeCompare(String(right.createdAt)) * direction;
    });
  if (count) {
    count.textContent = `${posts.length} post${posts.length === 1 ? '' : 's'}`;
  }

  if (empty instanceof HTMLElement) {
    empty.hidden = STORE.loading || posts.length > 0;
  }

  if (STORE.loading) return;

  posts.forEach((post) => {
    const item = document.createElement('article');
    item.className = 'profile-posts__item';
    item.innerHTML = `
      <div class="profile-posts__item-content-wrapper">
        <div class="profile-posts__item-header">
          <span class="ui-badge ui-badge--outline"></span>
          <span class="profile-posts__item-meta"></span>
          <button class="profile-posts__item-more" type="button" data-profile-post-more="${post.id}" aria-label="More options">
            <img class="ui-icon-theme-aware" src="/registry/icons/public/assets/core/actions/more/more.svg" alt="" aria-hidden="true">
          </button>
          <div class="profile-posts__more-dropdown ui-card ui-surface--glass" data-profile-post-more-dropdown hidden aria-label="Post options">
            <button class="profile-posts__more-dropdown-item" type="button" data-profile-post-more-dropdown-edit>
              <img class="ui-icon-theme-aware" src="/registry/icons/public/assets/core/actions/editing/edit.svg" alt="" aria-hidden="true">
              <span>Edit</span>
            </button>
            <button class="profile-posts__more-dropdown-item profile-posts__more-dropdown-item--danger" type="button" data-profile-post-more-dropdown-delete>
              <img class="profile-posts__more-dropdown-item-icon" src="/registry/icons/public/assets/core/actions/delete/delete.svg" alt="" aria-hidden="true">
              <span>Delete</span>
            </button>
          </div>
        </div>
        <p class="profile-posts__item-body"></p>
        ${post.mediaUrl && post.mediaType === 'video' ? '<video class="profile-posts__item-media" controls></video>' : ''}
        ${post.mediaUrl && post.mediaType === 'audio' ? '<audio class="profile-posts__item-media" controls></audio>' : ''}
        ${post.mediaUrl && post.mediaType !== 'video' && post.mediaType !== 'audio' ? '<div class="profile-posts__item-image-wrapper" data-profile-post-media-state="loading"><img class="profile-posts__item-image" alt="Post image"></div>' : ''}
      </div>
    `;
    const badge = item.querySelector('.ui-badge');
    if (badge instanceof HTMLElement) {
      const iconSrc = post.visibility === 'public'
        ? '/registry/icons/public/assets/core/actions/visibility/public-route.svg'
        : '/registry/icons/public/assets/core/actions/visibility/private-draft.svg';
      badge.innerHTML = `<img class="ui-icon-theme-aware" src="${iconSrc}" alt="${post.visibility === 'public' ? 'Public route' : 'Private draft'}" width="16" height="16">`;
    }
    item.querySelector('.profile-posts__item-body').textContent = post.body || '';
    const media = item.querySelector('.profile-posts__item-media');
    if (media instanceof HTMLMediaElement) {
      media.src = post.mediaUrl;
      media.addEventListener('error', () => {
        media.hidden = true;
      }, { once: true });
    }
    const image = item.querySelector('.profile-posts__item-image');
    if (image instanceof HTMLImageElement) {
      const imageWrapper = image.closest('.profile-posts__item-image-wrapper');
      const setMediaState = (state) => {
        if (imageWrapper instanceof HTMLElement) {
          imageWrapper.dataset.profilePostMediaState = state;
        }
      };
      image.loading = 'lazy';
      image.decoding = 'async';
      image.src = post.mediaUrl;

      if (image.complete && image.naturalWidth > 0) {
        setMediaState('loaded');
      } else if (image.complete) {
        setMediaState('error');
      } else {
        image.addEventListener('load', () => setMediaState('loaded'), { once: true });
      }

      image.addEventListener('error', () => {
        setMediaState('error');
      }, { once: true });
    }
    item.querySelector('.profile-posts__item-meta').textContent = formatDate(post.createdAt);
    list.appendChild(item);
  });
}

async function renderPosts() {
  const root = getRoot();
  if (!root) return;

  const renderSequence = STORE.renderSequence + 1;
  STORE.renderSequence = renderSequence;
  const state = getProfileRuntimeState();
  STORE.loading = true;
  renderPostList(root);

  if (state.authResolved !== true) {
    return;
  }

  const policy = await loadPolicy();
  try {
    await syncStoreWithRuntime(state);
  } catch (error) {
    console.error('[profile-posts] Failed to load profile feed posts.', error);
    STORE.posts = [];
  }

  if (STORE.renderSequence !== renderSequence) {
    return;
  }

  STORE.loading = false;

  root.dataset.profileViewerState = state.viewerState;
  syncPostCounter(root, policy);
  syncVoiceButton(root);
  renderPostList(root);
}

/* =============================================================================
   06) ACTIONS
============================================================================= */
function setStatus(root, message, state = 'idle') {
  const node = root.querySelector('[data-profile-post-status]');
  if (!(node instanceof HTMLElement)) return;
  node.textContent = message || '';
  node.dataset.profilePostStatus = state;
}

function getPostPanel(root) {
  return root?.closest?.('[data-profile-section-panel]');
}

function preparePostPanelForOverlay(root) {
  const panel = getPostPanel(root);
  if (!(panel instanceof HTMLElement)) return;
  if (!panel.dataset.profilePostOverlayPreviousHidden) {
    panel.dataset.profilePostOverlayPreviousHidden = panel.hidden ? 'true' : 'false';
  }
  if (panel.hidden) {
    panel.hidden = false;
  }
}

function restorePostPanelAfterOverlay(root) {
  const panel = getPostPanel(root);
  if (!(panel instanceof HTMLElement)) return;
  if (panel.dataset.profilePostOverlayPreviousHidden === 'true') {
    panel.hidden = true;
  }
  delete panel.dataset.profilePostOverlayPreviousHidden;
}

function setPostOverlayOpen(root, open) {
  const overlay = root.querySelector('[data-profile-post-overlay]');
  if (!(overlay instanceof HTMLElement)) return;
  if (open) {
    preparePostPanelForOverlay(root);
  }
  overlay.hidden = !open;
  document.body?.classList.toggle('profile-posts-overlay-open', open);
  document.documentElement?.classList.toggle('profile-posts-overlay-open', open);
  if (!open) {
    restorePostPanelAfterOverlay(root);
  }
}

function setMoreDropdownOpen(button, open, postId = '') {
  const header = button?.closest('.profile-posts__item-header');
  const dropdown = header?.querySelector('[data-profile-post-more-dropdown]');
  if (!(dropdown instanceof HTMLElement) || !(button instanceof HTMLElement)) return;
  dropdown.hidden = !open;
  STORE.moreOverlayPostId = postId;
  
  if (open) {
    const buttonRect = button.getBoundingClientRect();
    const headerRect = header.getBoundingClientRect();
    dropdown.style.top = `${buttonRect.bottom - headerRect.top}px`;
    dropdown.style.right = '0';
  }
}

function openPostComposer(root) {
  STORE.editingPostId = '';
  const form = root.querySelector('[data-profile-post-form]');
  if (form instanceof HTMLFormElement) form.reset();
  resetPostMedia(root);
  const visibilityInput = root.querySelector('[data-profile-post-visibility]');
  if (visibilityInput instanceof HTMLInputElement) {
    const storedVisibility = getStoredVisibility();
    visibilityInput.value = storedVisibility;
    updateVisibilityTrigger(root, storedVisibility);
  }
  syncPostCounter(root);
  syncSubmitLabel(root);
  setPostOverlayOpen(root, true);
  root.querySelector('[data-profile-post-form] textarea')?.focus();
}

function resetPostMedia(root) {
  STORE.selectedMediaFile = null;
  STORE.selectedMediaKind = '';
  const input = root.querySelector('[data-profile-post-media-input]');
  if (input instanceof HTMLInputElement) input.value = '';
  const preview = root.querySelector('[data-profile-post-media-preview]');
  const image = root.querySelector('[data-profile-post-media-preview-image]');
  const video = root.querySelector('[data-profile-post-media-preview-video]');
  const audio = root.querySelector('[data-profile-post-media-preview-audio]');
  const name = root.querySelector('[data-profile-post-media-name]');
  if (image instanceof HTMLImageElement) {
    image.removeAttribute('src');
    image.hidden = true;
  }
  if (video instanceof HTMLVideoElement) {
    video.removeAttribute('src');
    video.hidden = true;
  }
  if (audio instanceof HTMLAudioElement) {
    audio.removeAttribute('src');
    audio.hidden = true;
  }
  if (name instanceof HTMLElement) {
    name.textContent = '';
  }
  if (preview instanceof HTMLElement) {
    preview.hidden = true;
  }
}

function previewPostMedia(root, file) {
  if (!(file instanceof File)) {
    resetPostMedia(root);
    return;
  }

  STORE.selectedMediaFile = file;
  STORE.selectedMediaKind = mediaKindFromFile(file);
  const preview = root.querySelector('[data-profile-post-media-preview]');
  const image = root.querySelector('[data-profile-post-media-preview-image]');
  const video = root.querySelector('[data-profile-post-media-preview-video]');
  const audio = root.querySelector('[data-profile-post-media-preview-audio]');
  const name = root.querySelector('[data-profile-post-media-name]');
  const objectUrl = URL.createObjectURL(file);
  if (image instanceof HTMLImageElement) {
    image.src = objectUrl;
    image.hidden = STORE.selectedMediaKind !== 'image';
  }
  if (video instanceof HTMLVideoElement) {
    video.src = objectUrl;
    video.hidden = STORE.selectedMediaKind !== 'video';
  }
  if (audio instanceof HTMLAudioElement) {
    audio.src = objectUrl;
    audio.hidden = STORE.selectedMediaKind !== 'audio';
  }
  if (name instanceof HTMLElement) {
    name.textContent = file.name || 'Media selected';
  }
  if (preview instanceof HTMLElement) {
    preview.hidden = false;
  }
}

function bindPostForm() {
  const root = getRoot();
  if (!root || root.dataset.profilePostsBound === 'true') return;
  root.dataset.profilePostsBound = 'true';

  root.addEventListener('submit', async (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || !form.matches('[data-profile-post-form]')) return;

    event.preventDefault();
    const state = getProfileRuntimeState();
    if (state.viewerState !== 'authenticated') {
      setStatus(root, 'Sign in to create posts', 'error');
      return;
    }

    const formData = new FormData(form);
    const body = normalizeString(formData.get('body') || '');
    const visibility = normalizeString(formData.get('visibility') || 'private') || 'private';
    const policy = await loadPolicy();
    const limit = getPostBodyLimit(policy);
    const editingPostId = normalizeString(STORE.editingPostId || '');

    if (!body) {
      setStatus(root, 'Write a post before publishing', 'error');
      return;
    }

    if (body.length > limit) {
      setStatus(root, `Posts can be up to ${limit} characters`, 'error');
      return;
    }

    try {
      if (visibility === 'public') {
        let imageUpload = null;
        if (STORE.selectedMediaFile instanceof File) {
          imageUpload = await uploadProfileImage({
            file: STORE.selectedMediaFile,
            user: state.profile,
            kind: 'post',
            bucket: 'profile-images',
            targetBucket: 'profile-images',
            storageBucket: 'profile-images'
          });
        }

        const payload = {
          post_body: body,
          source_surface: 'profile',
          post_image_url: imageUpload?.publicUrl || '',
          post_image_storage_path: imageUpload?.storagePath || '',
          post_media_type: STORE.selectedMediaKind || ''
        };

        if (editingPostId) {
          await updateFeedPost(editingPostId, payload);
        } else {
          await createFeedPost(payload);
        }
      } else {
        const payload = {
          body: body,
          visibility: visibility,
          postState: 'draft',
          profileId: state.profile?.id || null
        };

        if (editingPostId) {
          await updateProfilePost(editingPostId, { ...payload, profileId: state.profile?.id || null });
        } else {
          await createProfilePost(payload);
        }
      }

      form.reset();
      STORE.editingPostId = '';
      resetPostMedia(root);
      syncPostCounter(root, policy);
      syncSubmitLabel(root);
      await renderPosts();
      document.dispatchEvent(new CustomEvent('profile:feed-refresh-request', {
        detail: { source: 'profile-posts', visibility }
      }));
      setPostOverlayOpen(root, false);
      setStatus(root, editingPostId ? 'Post updated' : (visibility === 'public' ? 'Post published to your public profile and feed' : 'Private draft saved'), 'success');

      if (!editingPostId && visibility === 'public') {
        document.dispatchEvent(new CustomEvent('neuroartan:notification-create-request', {
          detail: {
            id: `profile-post-published-${Date.now()}`,
            title: 'Profile post published',
            body: 'Your post is now connected to the public feed',
            source: 'profile',
            priority: 'normal',
            href: '/feed/'
          }
        }));
      }
    } catch (error) {
      const code = normalizeString(error?.code || error?.message || '');
      const message = code === 'FEED_BACKEND_UNAVAILABLE'
        ? 'Feed storage is not configured'
        : code === 'PROFILE_POSTS_BACKEND_UNAVAILABLE'
          ? 'Private post storage is not configured'
        : code === 'PROFILE_POSTS_TABLE_MISSING'
          ? 'Private post storage table is missing'
        : code === 'PROFILE_REQUIRED'
          ? 'Create and save your profile before publishing posts'
        : code === 'AUTH_REQUIRED'
            ? 'Sign in before publishing posts'
            : code === 'FEED_POST_MEDIA_COLUMNS_REQUIRED'
              ? 'Image posts require media columns on feed_posts'
              : 'Unable to save this post';
      setStatus(root, message, 'error');
    }
  });

  root.addEventListener('click', (event) => {
    const closeTrigger = event.target.closest('[data-profile-post-overlay-close]');
    const visibilityDropdownTrigger = event.target.closest('[data-profile-post-visibility-trigger]');
    const visibilityTrigger = event.target.closest('[data-profile-post-visibility-option]');
    const mediaTrigger = event.target.closest('[data-profile-post-media-trigger]');
    const voiceTrigger = event.target.closest('[data-profile-post-voice-trigger]');
    const mediaRemove = event.target.closest('[data-profile-post-media-remove]');
    const moreTrigger = event.target.closest('[data-profile-post-more]');
    const moreDropdownEdit = event.target.closest('[data-profile-post-more-dropdown-edit]');
    const moreDropdownDelete = event.target.closest('[data-profile-post-more-dropdown-delete]');

    const visibilityDropdown = root.querySelector('[data-profile-post-visibility-dropdown]');
    const visibilityDropdownTriggerElement = root.querySelector('[data-profile-post-visibility-trigger]');
    
    if (visibilityDropdown && visibilityDropdownTriggerElement && 
        !visibilityDropdownTrigger && !visibilityTrigger &&
        !event.target.closest('.profile-posts__visibility')) {
      visibilityDropdown.setAttribute('hidden', '');
      visibilityDropdownTriggerElement.setAttribute('aria-expanded', 'false');
    }

    if (visibilityDropdownTrigger) {
      event.preventDefault();
      const dropdown = root.querySelector('[data-profile-post-visibility-dropdown]');
      if (dropdown instanceof HTMLElement) {
        const isHidden = dropdown.hasAttribute('hidden');
        if (isHidden) {
          dropdown.removeAttribute('hidden');
          visibilityDropdownTrigger.setAttribute('aria-expanded', 'true');
        } else {
          dropdown.setAttribute('hidden', '');
          visibilityDropdownTrigger.setAttribute('aria-expanded', 'false');
        }
      }
      return;
    }

    if (visibilityTrigger) {
      event.preventDefault();
      const value = normalizeString(visibilityTrigger.getAttribute('data-profile-post-visibility-option') || 'public');
      const input = root.querySelector('[data-profile-post-visibility]');
      const dropdown = root.querySelector('[data-profile-post-visibility-dropdown]');
      const dropdownTrigger = root.querySelector('[data-profile-post-visibility-trigger]');
      
      if (input instanceof HTMLInputElement) {
        input.value = value;
      }
      
      setStoredVisibility(value);
      updateVisibilityTrigger(root, value);
      
      if (dropdown instanceof HTMLElement) {
        dropdown.setAttribute('hidden', '');
      }
      
      if (dropdownTrigger instanceof HTMLElement) {
        dropdownTrigger.setAttribute('aria-expanded', 'false');
      }
      
      root.querySelectorAll('[data-profile-post-visibility-option]').forEach((button) => {
        const isSelected = button === visibilityTrigger;
        button.setAttribute('aria-selected', isSelected ? 'true' : 'false');
        button.classList.toggle('profile-posts__visibility-option--active', isSelected);
      });
      return;
    }

    if (mediaTrigger) {
      event.preventDefault();
      const input = root.querySelector('[data-profile-post-media-input]');
      if (input instanceof HTMLInputElement) {
        const kind = mediaTrigger.getAttribute('data-profile-post-media-kind');
        if (kind) {
          input.accept = getMediaAccept(kind);
        } else {
          input.accept = 'image/*,video/*,audio/*';
        }
        input.click();
      }
      return;
    }

    if (voiceTrigger) {
      event.preventDefault();
      const controller = ensurePostSpeechController(root);
      if (!controller.supported) {
        setStatus(root, 'Voice dictation requires browser speech recognition support', 'error');
        return;
      }
      if (controller.isListening()) {
        controller.stop();
        return;
      }
      controller.start({ lang: document.documentElement.lang || 'en' });
      return;
    }

    if (mediaRemove) {
      event.preventDefault();
      resetPostMedia(root);
      return;
    }

    if (closeTrigger) {
      event.preventDefault();
      STORE.editingPostId = '';
      syncSubmitLabel(root);
      setPostOverlayOpen(root, false);
    }

    if (moreTrigger) {
      event.preventDefault();
      const postId = normalizeString(moreTrigger.getAttribute('data-profile-post-more') || '');
      const header = moreTrigger.closest('.profile-posts__item-header');
      const dropdown = header?.querySelector('[data-profile-post-more-dropdown]');
      const isOpen = !(dropdown instanceof HTMLElement) || !dropdown.hidden;
      setMoreDropdownOpen(moreTrigger, !isOpen, postId);
      return;
    }

    if (moreDropdownEdit) {
      event.preventDefault();
      const postId = normalizeString(STORE.moreOverlayPostId || '');
      if (postId) {
        const activeDropdown = root.querySelector('[data-profile-post-more-dropdown]:not([hidden])');
        const activeButton = activeDropdown?.previousElementSibling;
        setMoreDropdownOpen(activeButton, false);
        const post = STORE.posts.find((entry) => entry.id === postId);
        if (post) {
          STORE.editingPostId = postId;
          const form = root.querySelector('[data-profile-post-form]');
          if (form instanceof HTMLFormElement) {
            form.reset();
            const textarea = form.querySelector('textarea[name="body"]');
            if (textarea instanceof HTMLTextAreaElement) {
              textarea.value = post.body || '';
            }
            const visibilityInput = form.querySelector('[data-profile-post-visibility]');
            if (visibilityInput instanceof HTMLInputElement) {
              visibilityInput.value = post.visibility || 'private';
              updateVisibilityTrigger(root, visibilityInput.value);
            }
            syncSubmitLabel(root);
            setPostOverlayOpen(root, true);
            textarea?.focus();
            setStatus(root, 'Editing post', 'idle');
          }
        }
      }
      return;
    }

    if (moreDropdownDelete) {
      event.preventDefault();
      const postId = normalizeString(STORE.moreOverlayPostId || '');
      if (postId) {
        const activeDropdown = root.querySelector('[data-profile-post-more-dropdown]:not([hidden])');
        const activeButton = activeDropdown?.previousElementSibling;
        setMoreDropdownOpen(activeButton, false);
        const post = STORE.posts.find((entry) => entry.id === postId);
        if (post) {
          const deleteFunction = post.visibility === 'private' ? deletePrivateProfilePost : deleteFeedPost;
          void deleteFunction(postId)
            .then(async () => {
              await renderPosts();
              document.dispatchEvent(new CustomEvent('profile:feed-refresh-request', {
                detail: { source: 'profile-posts-delete' }
              }));
              setStatus(root, 'Post deleted', 'success');
            })
            .catch((error) => {
              console.error('[profile-posts] Delete failed.', error);
              setStatus(root, 'Unable to delete this post', 'error');
            });
        }
      }
      return;
    }

  });

  document.addEventListener('click', (event) => {
    const activeDropdown = root.querySelector('[data-profile-post-more-dropdown]:not([hidden])');
    if (activeDropdown instanceof HTMLElement && !event.target.closest('[data-profile-post-more]') && !event.target.closest('[data-profile-post-more-dropdown]')) {
      const activeButton = activeDropdown.previousElementSibling;
      setMoreDropdownOpen(activeButton, false);
    }
  });

  root.addEventListener('change', (event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || !input.matches('[data-profile-post-media-input]')) return;
    previewPostMedia(root, input.files?.[0] || null);
  });

  root.addEventListener('input', (event) => {
    const textarea = event.target;
    if (!(textarea instanceof HTMLTextAreaElement) || !textarea.matches('textarea[name="body"]')) return;
    syncPostCounter(root);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    setPostOverlayOpen(root, false);
    const activeDropdown = root.querySelector('[data-profile-post-more-dropdown]:not([hidden])');
    const activeButton = activeDropdown?.previousElementSibling;
    setMoreDropdownOpen(activeButton, false);
  });

  document.addEventListener('profile:post-compose-open-request', () => {
    openPostComposer(root);
  });
}

/* =============================================================================
   07) INITIALIZATION
============================================================================= */
function initProfilePosts() {
  if (STORE.initialized) return;
  STORE.initialized = true;

  bindPostForm();
  void renderPosts();
  subscribeProfileRuntime(() => {
    void renderPosts();
  });
  subscribeProfileFilters((state) => {
    if (state.context !== 'posts') return;
    const root = getRoot();
    if (root) renderPostList(root);
  });

  document.addEventListener('fragment:mounted', (event) => {
    if (event?.detail?.name !== 'profile-private-posts') return;
    bindPostForm();
    void renderPosts();
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initProfilePosts, { once: true });
} else {
  initProfilePosts();
}
