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
    bodyMaxLength: 280
  }
});

const STORE = (window.__NEUROARTAN_PROFILE_POSTS__ ||= {
  initialized: false,
  policy: null,
  posts: [],
  selectedMediaFile: null,
  selectedMediaKind: '',
  editingPostId: '',
  speechController: null
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

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Just now';

  try {
    return new Intl.DateTimeFormat(document.documentElement.lang || 'en', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(date);
  } catch (_) {
    return date.toISOString();
  }
}

function renderVisibilityOptions(root, policy) {
  const input = root.querySelector('[data-profile-post-visibility]');
  const optionsRoot = root.querySelector('[data-profile-post-visibility-options]');
  if (!(input instanceof HTMLInputElement) || !(optionsRoot instanceof HTMLElement)) return;

  optionsRoot.innerHTML = '';
  policy.visibility.forEach((entry) => {
    const key = normalizeString(entry.key || 'private');
    const button = document.createElement('button');
    button.className = 'profile-posts__visibility-option';
    button.type = 'button';
    button.dataset.profilePostVisibilityOption = key;
    button.setAttribute('aria-pressed', input.value === key ? 'true' : 'false');
    button.innerHTML = `
      <span class="profile-posts__visibility-label"></span>
      <span class="profile-posts__visibility-summary"></span>
    `;
    button.querySelector('.profile-posts__visibility-label').textContent = normalizeString(entry.label || key || 'Private');
    button.querySelector('.profile-posts__visibility-summary').textContent = normalizeString(entry.summary || '');
    optionsRoot.appendChild(button);
  });
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
  counter.textContent = `${count} / ${limit}`;
  counter.dataset.profilePostCharacterState = count > limit ? 'over' : 'ready';
}

function syncSubmitLabel(root) {
  const submitButton = root.querySelector('[data-profile-post-submit]');
  if (!(submitButton instanceof HTMLButtonElement)) return;
  submitButton.textContent = STORE.editingPostId ? 'Save' : 'Post';
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
    onResult: ({ transcript }) => {
      const textarea = root.querySelector('textarea[name="body"]');
      if (!(textarea instanceof HTMLTextAreaElement)) return;

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
  const count = root.querySelector('[data-profile-post-count]');
  if (!(list instanceof HTMLElement)) return;

  list.innerHTML = '';

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
    empty.hidden = posts.length > 0;
  }

  posts.forEach((post) => {
    const item = document.createElement('article');
    item.className = 'profile-posts__item';
    item.innerHTML = `
      <div class="profile-posts__item-header">
        <h4 class="profile-posts__item-title"></h4>
        <span class="ui-badge ui-badge--outline"></span>
      </div>
      <p class="profile-posts__item-body"></p>
      ${post.mediaUrl && post.mediaType === 'video' ? '<video class="profile-posts__item-media" controls></video>' : ''}
      ${post.mediaUrl && post.mediaType === 'audio' ? '<audio class="profile-posts__item-media" controls></audio>' : ''}
      ${post.mediaUrl && post.mediaType !== 'video' && post.mediaType !== 'audio' ? '<img class="profile-posts__item-image" alt="Post image">' : ''}
      <p class="profile-posts__item-meta"></p>
      <div class="profile-posts__item-actions">
        <button class="profile-posts__item-action" type="button" data-profile-post-edit="${post.id}">
          <img class="ui-icon-theme-aware" src="/registry/icons/public/assets/core/actions/editing/edit.svg" alt="" aria-hidden="true">
          <span>Edit</span>
        </button>
        <button class="profile-posts__item-action profile-posts__item-action--danger" type="button" data-profile-post-delete="${post.id}">
          <img class="ui-icon-theme-aware" src="/registry/icons/public/assets/core/actions/delete/delete.svg" alt="" aria-hidden="true">
          <span>Delete</span>
        </button>
      </div>
    `;
    item.querySelector('.profile-posts__item-title').textContent = post.title || 'Untitled post';
    item.querySelector('.ui-badge').textContent = post.visibility === 'public' ? 'Public route' : 'Private draft';
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
      image.loading = 'lazy';
      image.decoding = 'async';
      image.src = post.mediaUrl;

      image.addEventListener('error', () => {
        image.hidden = true;
      }, { once: true });
    }
    item.querySelector('.profile-posts__item-meta').textContent = formatDate(post.createdAt);
    list.appendChild(item);
  });
}

async function renderPosts() {
  const root = getRoot();
  if (!root) return;

  const state = getProfileRuntimeState();
  const policy = await loadPolicy();
  try {
    await syncStoreWithRuntime(state);
  } catch (error) {
    console.error('[profile-posts] Failed to load profile feed posts.', error);
    STORE.posts = [];
  }

  root.dataset.profileViewerState = state.viewerState;
  renderVisibilityOptions(root, policy);
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

function setPostOverlayOpen(root, open) {
  const overlay = root.querySelector('[data-profile-post-overlay]');
  if (!(overlay instanceof HTMLElement)) return;
  overlay.hidden = !open;
  document.body?.classList.toggle('profile-posts-overlay-open', open);
}

function openPostComposer(root) {
  STORE.editingPostId = '';
  const form = root.querySelector('[data-profile-post-form]');
  if (form instanceof HTMLFormElement) form.reset();
  resetPostMedia(root);
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
      setStatus(root, 'Sign in to create posts.', 'error');
      return;
    }

    const formData = new FormData(form);
    const body = normalizeString(formData.get('body') || '');
    const visibility = normalizeString(formData.get('visibility') || 'private') || 'private';
    const policy = await loadPolicy();
    const limit = getPostBodyLimit(policy);
    const editingPostId = normalizeString(STORE.editingPostId || '');

    if (!body) {
      setStatus(root, 'Write a post before publishing.', 'error');
      return;
    }

    if (body.length > limit) {
      setStatus(root, `Posts can be up to ${limit} characters. Shorten this post before publishing.`, 'error');
      return;
    }

    setStatus(root, editingPostId ? 'Saving post update...' : (visibility === 'public' ? 'Publishing post to the public feed...' : 'Saving private draft...'), 'saving');

    try {
      if (visibility === 'public') {
        let imageUpload = null;
        if (STORE.selectedMediaFile instanceof File) {
          setStatus(root, 'Uploading media to profile storage...', 'saving');
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
      setPostOverlayOpen(root, false);
      setStatus(root, editingPostId ? 'Post updated.' : (visibility === 'public' ? 'Post published to your public profile and feed.' : 'Private draft saved.'), 'success');

      if (!editingPostId && visibility === 'public') {
        document.dispatchEvent(new CustomEvent('neuroartan:notification-create-request', {
          detail: {
            id: `profile-post-published-${Date.now()}`,
            title: 'Profile post published',
            body: 'Your post is now connected to the public feed.',
            source: 'profile',
            priority: 'normal',
            href: '/feed/'
          }
        }));
      }
    } catch (error) {
      const code = normalizeString(error?.code || error?.message || '');
      const message = code === 'FEED_BACKEND_UNAVAILABLE'
        ? 'Feed storage is not configured. Connect the Supabase feed_posts table before publishing.'
        : code === 'PROFILE_POSTS_BACKEND_UNAVAILABLE'
          ? 'Private post storage is not configured. Connect the Supabase profile_posts table before saving drafts.'
        : code === 'PROFILE_POSTS_TABLE_MISSING'
          ? 'Private post storage table is missing. Create the profile_posts table in Supabase before saving drafts.'
        : code === 'PROFILE_REQUIRED'
          ? 'Create and save your profile before publishing posts.'
        : code === 'AUTH_REQUIRED'
            ? 'Sign in before publishing posts.'
            : code === 'FEED_POST_MEDIA_COLUMNS_REQUIRED'
              ? 'Image posts require media columns on feed_posts. Add them in Supabase before publishing image posts.'
              : 'Unable to save this post. Check Supabase configuration and policies.';
      setStatus(root, message, 'error');
    }
  });

  root.addEventListener('click', (event) => {
    const openTrigger = event.target.closest('[data-profile-post-overlay-open]');
    const closeTrigger = event.target.closest('[data-profile-post-overlay-close]');
    const visibilityTrigger = event.target.closest('[data-profile-post-visibility-option]');
    const mediaTrigger = event.target.closest('[data-profile-post-media-trigger]');
    const voiceTrigger = event.target.closest('[data-profile-post-voice-trigger]');
    const mediaRemove = event.target.closest('[data-profile-post-media-remove]');
    const deleteTrigger = event.target.closest('[data-profile-post-delete]');
    const editTrigger = event.target.closest('[data-profile-post-edit]');

    if (visibilityTrigger) {
      event.preventDefault();
      const value = normalizeString(visibilityTrigger.getAttribute('data-profile-post-visibility-option') || 'public');
      const input = root.querySelector('[data-profile-post-visibility]');
      if (input instanceof HTMLInputElement) {
        input.value = value;
      }
      root.querySelectorAll('[data-profile-post-visibility-option]').forEach((button) => {
        button.setAttribute('aria-pressed', button === visibilityTrigger ? 'true' : 'false');
      });
      return;
    }

    if (mediaTrigger) {
      event.preventDefault();
      const input = root.querySelector('[data-profile-post-media-input]');
      if (input instanceof HTMLInputElement) {
        input.accept = getMediaAccept(mediaTrigger.getAttribute('data-profile-post-media-kind') || '');
        input.click();
      }
      return;
    }

    if (voiceTrigger) {
      event.preventDefault();
      const controller = ensurePostSpeechController(root);
      if (!controller.supported) {
        setStatus(root, 'Voice dictation requires browser speech recognition support.', 'error');
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

    if (editTrigger) {
      event.preventDefault();
      const postId = normalizeString(editTrigger.getAttribute('data-profile-post-edit') || '');
      const post = STORE.posts.find((entry) => entry.id === postId);
      if (!post) return;
      const textarea = root.querySelector('textarea[name="body"]');
      if (textarea instanceof HTMLTextAreaElement) {
        textarea.value = post.body || '';
        syncPostCounter(root);
      }
      STORE.editingPostId = postId;
      resetPostMedia(root);
      syncSubmitLabel(root);
      setPostOverlayOpen(root, true);
      textarea?.focus();
      setStatus(root, 'Editing post.', 'idle');
      return;
    }

    if (deleteTrigger) {
      event.preventDefault();
      const postId = normalizeString(deleteTrigger.getAttribute('data-profile-post-delete') || '');
      if (!postId) return;
      const post = STORE.posts.find((entry) => entry.id === postId);
      if (!post) return;
      setStatus(root, 'Deleting post...', 'saving');
      const deleteFunction = post.visibility === 'private' ? deletePrivateProfilePost : deleteFeedPost;
      void deleteFunction(postId)
        .then(async () => {
          await renderPosts();
          setStatus(root, 'Post deleted.', 'success');
        })
        .catch((error) => {
          console.error('[profile-posts] Delete failed.', error);
          setStatus(root, 'Unable to delete this post. Check Supabase policies.', 'error');
        });
      return;
    }

    if (openTrigger) {
      event.preventDefault();
      openPostComposer(root);
      return;
    }

    if (closeTrigger) {
      event.preventDefault();
      STORE.editingPostId = '';
      syncSubmitLabel(root);
      setPostOverlayOpen(root, false);
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
