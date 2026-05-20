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
import { normalizeString } from '../../../system/account/identity/account-profile-identity.js';
import {
  createFeedPost,
  listFeedPosts
} from '../../../system/feed/feed-store.js';
import { uploadProfileImage } from '../../../system/profile/profile-image-storage.js';

/* =============================================================================
   03) STATE
============================================================================= */
const DEFAULT_POLICY = Object.freeze({
  visibility: [
    { key: 'private', label: 'Private draft', summary: 'Owner-only profile post.' },
    { key: 'public', label: 'Public route', summary: 'Post staged for public route readiness.' }
  ],
  limits: {
    titleMaxLength: 120,
    bodyMaxLength: 4000
  }
});

const STORE = (window.__NEUROARTAN_PROFILE_POSTS__ ||= {
  initialized: false,
  policy: null,
  posts: [],
  selectedImageFile: null
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
  const posts = await listFeedPosts();
  STORE.posts = posts
    .filter((post) => post.ownedByCurrentUser)
    .map((post) => ({
      id: post.id,
      title: 'Profile post',
      body: post.content,
      visibility: 'public',
      createdAt: post.createdAt,
      source: post.source,
      imageUrl: post.imageUrl || ''
    }));
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

function renderPostList(root) {
  const list = root.querySelector('[data-profile-post-list]');
  const empty = root.querySelector('[data-profile-post-empty]');
  const count = root.querySelector('[data-profile-post-count]');
  if (!(list instanceof HTMLElement)) return;

  list.innerHTML = '';

  const posts = STORE.posts.slice().sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt)));
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
      ${post.imageUrl ? '<img class="profile-posts__item-image" alt="Post image">' : ''}
      <p class="profile-posts__item-meta"></p>
    `;
    item.querySelector('.profile-posts__item-title').textContent = post.title || 'Untitled post';
    item.querySelector('.ui-badge').textContent = post.visibility === 'public' ? 'Public route' : 'Private draft';
    item.querySelector('.profile-posts__item-body').textContent = post.body || '';
    const image = item.querySelector('.profile-posts__item-image');
    if (image instanceof HTMLImageElement) {
      image.loading = 'lazy';
      image.decoding = 'async';
      image.src = post.imageUrl;

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

function resetPostImage(root) {
  STORE.selectedImageFile = null;
  const input = root.querySelector('[data-profile-post-image-input]');
  if (input instanceof HTMLInputElement) input.value = '';
  const preview = root.querySelector('[data-profile-post-image-preview]');
  const image = root.querySelector('[data-profile-post-image-preview-image]');
  const name = root.querySelector('[data-profile-post-image-name]');
  if (image instanceof HTMLImageElement) {
    image.removeAttribute('src');
  }
  if (name instanceof HTMLElement) {
    name.textContent = '';
  }
  if (preview instanceof HTMLElement) {
    preview.hidden = true;
  }
}

function previewPostImage(root, file) {
  if (!(file instanceof File)) {
    resetPostImage(root);
    return;
  }

  STORE.selectedImageFile = file;
  const preview = root.querySelector('[data-profile-post-image-preview]');
  const image = root.querySelector('[data-profile-post-image-preview-image]');
  const name = root.querySelector('[data-profile-post-image-name]');
  if (image instanceof HTMLImageElement) {
    image.src = URL.createObjectURL(file);
  }
  if (name instanceof HTMLElement) {
    name.textContent = file.name || 'Image selected';
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
    const title = normalizeString(formData.get('title') || '');
    const body = normalizeString(formData.get('body') || '');
    const visibility = normalizeString(formData.get('visibility') || 'private') || 'private';

    if (!title && !body) {
      setStatus(root, 'Write a title or body before saving the post.', 'error');
      return;
    }

    if (visibility !== 'public') {
      setStatus(root, 'Private post storage requires the Supabase profile_posts table. Nothing was saved in this browser.', 'error');
      return;
    }

    setStatus(root, 'Publishing post to the public feed...', 'saving');

    try {
      let imageUpload = null;
      if (STORE.selectedImageFile instanceof File) {
        setStatus(root, 'Uploading image to profile media...', 'saving');
        imageUpload = await uploadProfileImage({
          file: STORE.selectedImageFile,
          user: state.profile,
          kind: 'post',
          bucket: 'profile-images',
          targetBucket: 'profile-images',
          storageBucket: 'profile-images'
        });
      }

      await createFeedPost({
        post_body: [title, body].filter(Boolean).join('\n\n'),
        source_surface: 'profile',
        post_image_url: imageUpload?.publicUrl || '',
        post_image_storage_path: imageUpload?.storagePath || '',
        post_media_type: imageUpload?.kind === 'post' ? 'image' : ''
      });
      form.reset();
      resetPostImage(root);
      await renderPosts();
      setPostOverlayOpen(root, false);
      setStatus(root, 'Post published to your public profile and feed.', 'success');
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
    } catch (error) {
      const code = normalizeString(error?.code || error?.message || '');
      const message = code === 'FEED_BACKEND_UNAVAILABLE'
        ? 'Feed storage is not configured. Connect the Supabase feed_posts table before publishing.'
        : code === 'PROFILE_REQUIRED'
          ? 'Create and save your profile before publishing posts.'
        : code === 'AUTH_REQUIRED'
            ? 'Sign in before publishing posts.'
            : code === 'FEED_POST_MEDIA_COLUMNS_REQUIRED'
              ? 'Image posts require media columns on feed_posts. Add them in Supabase before publishing image posts.'
              : 'Unable to publish this post. Check the Supabase feed_posts table and policies.';
      setStatus(root, message, 'error');
    }
  });

  root.addEventListener('click', (event) => {
    const openTrigger = event.target.closest('[data-profile-post-overlay-open]');
    const closeTrigger = event.target.closest('[data-profile-post-overlay-close]');
    const visibilityTrigger = event.target.closest('[data-profile-post-visibility-option]');
    const imageTrigger = event.target.closest('[data-profile-post-image-trigger]');
    const imageRemove = event.target.closest('[data-profile-post-image-remove]');

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

    if (imageTrigger) {
      event.preventDefault();
      root.querySelector('[data-profile-post-image-input]')?.click();
      return;
    }

    if (imageRemove) {
      event.preventDefault();
      resetPostImage(root);
      return;
    }

    if (openTrigger) {
      event.preventDefault();
      setPostOverlayOpen(root, true);
      root.querySelector('[data-profile-post-form] textarea')?.focus();
      return;
    }

    if (closeTrigger) {
      event.preventDefault();
      setPostOverlayOpen(root, false);
    }
  });

  root.addEventListener('change', (event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || !input.matches('[data-profile-post-image-input]')) return;
    previewPostImage(root, input.files?.[0] || null);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    setPostOverlayOpen(root, false);
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
