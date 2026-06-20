import {
  listFeedPosts
} from '../../../system/feed/feed-store.js';
import {
  createFeedPostComment,
  getEmptyFeedPostSocialState,
  getFeedSocialState,
  toggleFeedPostInteraction
} from '../../../system/feed/feed-social-store.js';
import {
  listFollowedProfileIds
} from '../../../system/profile/profile-social-graph.js';
import {
  rankFeedPosts
} from '../../../system/feed/feed-ranker.js';
import {
  getProfileFilterState,
  subscribeProfileFilters
} from '../filter/profile-filter-overlay.js';

const MESSAGE_STORAGE_KEY = 'neuroartan.profile.home.messages';

const STATE = (window.__NEUROARTAN_PROFILE_HOME_PANELS__ ||= {
  initialized: false,
  feedLoading: true,
  feedPosts: [],
  feedSocialState: Object.create(null),
  followedProfileIds: [],
  openCommentPostId: '',
  messages: []
});

function escapeHtml(value = '') {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[char]);
}

function normalizeString(value = '') {
  return String(value ?? '').trim();
}

function formatDate(value = '') {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(document.documentElement.lang || 'en', {
    month: 'short',
    day: 'numeric'
  }).format(date);
}

function isVerifiedFeedPost(post = {}) {
  const directStatus = [
    post.verified,
    post.profile_verified,
    post.author_profile_verified,
    post.public_profile?.profile_verified,
    post.author?.profile_verified,
    post.profile?.profile_verified
  ].some(Boolean);

  const verificationStatus = [
    post.verification_status,
    post.public_verification_status,
    post.author_verification_status,
    post.author_public_verification_status,
    post.public_profile?.verification_status,
    post.public_profile?.public_verification_status,
    post.author?.verification_status,
    post.author?.public_verification_status,
    post.profile?.verification_status,
    post.profile?.public_verification_status
  ].map((value) => normalizeString(value).toLowerCase());

  return directStatus || verificationStatus.includes('verified');
}

function loadMessages() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(MESSAGE_STORAGE_KEY) || '[]');
    STATE.messages = Array.isArray(parsed) ? parsed.filter((entry) => normalizeString(entry?.body)) : [];
  } catch {
    STATE.messages = [];
  }
}

function saveMessages() {
  try {
    window.localStorage.setItem(MESSAGE_STORAGE_KEY, JSON.stringify(STATE.messages));
  } catch {}
}

function feedRoots() {
  return Array.from(document.querySelectorAll('[data-profile-home-feed]'));
}

function getPostsForFeedRoot(root, posts = []) {
  if (root?.dataset.profilePublicPosts !== 'true') return posts;

  const profileId = normalizeString(root.dataset.profilePublicProfileId);
  const username = normalizeString(root.dataset.profilePublicUsername).replace(/^@/, '').toLowerCase();
  if (!profileId && !username) return [];

  return posts.filter((post) => {
    const postProfileId = normalizeString(post.profileId);
    const postUsername = normalizeString(post.username).replace(/^@/, '').toLowerCase();
    return (profileId && postProfileId === profileId) || (username && postUsername === username);
  });
}

function notificationRoots() {
  return Array.from(document.querySelectorAll('[data-profile-home-notifications]'));
}

function messagingRoots() {
  return Array.from(document.querySelectorAll('[data-profile-home-messaging]'));
}

function renderFeedPost(post = {}) {
  const avatar = normalizeString(post.avatar || '');
  const publicProfileRoute = normalizeString(post.publicRoute || post.href || '/profile.html');
  const handle = normalizeString(post.username) ? `@${normalizeString(post.username)}` : normalizeString(post.publicRoute || post.href || '');
  const verified = isVerifiedFeedPost(post);
  const postId = normalizeString(post.id || '');
  const social = STATE.feedSocialState[postId] || getEmptyFeedPostSocialState();
  const counts = social.counts || {};
  const viewer = social.viewer || {};
  const commentsOpen = STATE.openCommentPostId === postId;
  const countLabel = (count) => Number(count || 0) > 0 ? `<span class="profile-home-panel__action-label">${escapeHtml(String(count))}</span>` : '';
  return `
    <article class="profile-home-panel__item" data-post-id="${escapeHtml(postId)}">
      <div class="profile-home-panel__item-header">
        <a class="profile-home-panel__item-avatar" href="${escapeHtml(publicProfileRoute)}" aria-label="View ${escapeHtml(post.entityLabel || 'profile')} profile">
          ${avatar ? `<img src="${escapeHtml(avatar)}" alt="">` : ''}
        </a>
        <span class="profile-home-panel__item-meta">
          <strong class="profile-home-panel__profile-name-line">
            <a class="profile-home-panel__profile-link" href="${escapeHtml(publicProfileRoute)}">${escapeHtml(post.entityLabel || 'Profile')}</a>
            ${verified ? `
              <span class="profile-home-panel__verified-badge" aria-label="Verified profile">
                <img class="profile-home-panel__verified-badge-icon ui-icon-theme-aware" src="/registry/icons/public/assets/core/identity/trust/verified.svg" alt="" aria-hidden="true">
              </span>
            ` : ''}
          </strong>
          ${handle ? `<span>${escapeHtml(handle)}</span>` : ''}
        </span>
        ${post.createdAt ? `<time>${escapeHtml(formatDate(post.createdAt))}</time>` : ''}
      </div>
      <p class="profile-home-panel__item-body">${escapeHtml(post.content || '')}</p>
      ${post.imageUrl ? `<img class="profile-home-panel__item-image" src="${escapeHtml(post.imageUrl)}" alt="">` : ''}
      <div class="profile-home-panel__item-actions">
        <button class="profile-home-panel__action-button profile-home-panel__action-button--like" type="button" data-profile-home-action="like" data-post-id="${escapeHtml(postId)}" data-profile-home-tooltip="Like" aria-label="Like post" aria-pressed="${viewer.like ? 'true' : 'false'}" data-active="${viewer.like ? 'true' : 'false'}">
          <span class="profile-home-panel__action-icon" aria-hidden="true">
            <img class="ui-icon-theme-aware" src="/registry/icons/public/assets/core/actions/like/like.svg" alt="">
          </span>
          ${countLabel(counts.like)}
        </button>
        <button class="profile-home-panel__action-button profile-home-panel__action-button--reply" type="button" data-profile-home-action="reply" data-post-id="${escapeHtml(postId)}" data-profile-home-tooltip="Reply" aria-label="Reply to post">
          <span class="profile-home-panel__action-icon" aria-hidden="true">
            <img class="ui-icon-theme-aware" src="/registry/icons/public/assets/core/actions/comment/reply.svg" alt="">
          </span>
          ${countLabel(counts.reply)}
        </button>
        <button class="profile-home-panel__action-button profile-home-panel__action-button--repost" type="button" data-profile-home-action="repost" data-post-id="${escapeHtml(postId)}" data-profile-home-tooltip="Repost" aria-label="Repost post" aria-pressed="${viewer.repost ? 'true' : 'false'}" data-active="${viewer.repost ? 'true' : 'false'}">
          <span class="profile-home-panel__action-icon" aria-hidden="true">
            <img class="ui-icon-theme-aware" src="/registry/icons/public/assets/core/actions/repost/repost.svg" alt="">
          </span>
          ${countLabel(counts.repost)}
        </button>
        <button class="profile-home-panel__action-button profile-home-panel__action-button--share" type="button" data-profile-home-action="share" data-post-id="${escapeHtml(postId)}" data-profile-home-tooltip="Share" aria-label="Share post" aria-pressed="${viewer.share ? 'true' : 'false'}" data-active="${viewer.share ? 'true' : 'false'}">
          <span class="profile-home-panel__action-icon" aria-hidden="true">
            <img class="ui-icon-theme-aware" src="/registry/icons/public/assets/core/actions/share/share.svg" alt="">
          </span>
          ${countLabel(counts.share)}
        </button>
        <button class="profile-home-panel__action-button profile-home-panel__action-button--bookmark" type="button" data-profile-home-action="bookmark" data-post-id="${escapeHtml(postId)}" data-profile-home-tooltip="Bookmark" aria-label="Bookmark post" aria-pressed="${viewer.bookmark ? 'true' : 'false'}" data-active="${viewer.bookmark ? 'true' : 'false'}">
          <span class="profile-home-panel__action-icon" aria-hidden="true">
            <img class="ui-icon-theme-aware" src="/registry/icons/public/assets/core/actions/bookmark/bookmark.svg" alt="">
          </span>
          ${countLabel(counts.bookmark)}
        </button>
      </div>
      <form class="profile-home-panel__comment-form" data-profile-home-comment-form data-post-id="${escapeHtml(postId)}" ${commentsOpen ? '' : 'hidden'}>
        <input class="profile-home-panel__comment-input" name="comment" type="text" placeholder="Write a reply" autocomplete="off">
        <button class="profile-home-panel__comment-submit" type="submit">Reply</button>
      </form>
      ${commentsOpen && social.comments?.length ? `
        <div class="profile-home-panel__comments" data-profile-home-comments>
          ${social.comments.slice(-3).map((comment) => `
            <article class="profile-home-panel__comment">
              <strong>${escapeHtml(comment.authorDisplayName || 'Profile')}</strong>
              <span>${escapeHtml(comment.body || '')}</span>
            </article>
          `).join('')}
        </div>
      ` : ''}
    </article>
  `;
}

function renderFeed() {
  const feedFilters = getProfileFilterState('feed').filters;
  const tab = feedFilters.source === 'following'
    ? 'following'
    : feedFilters.source === 'profiles'
      ? 'profiles'
      : 'for-you';
  const posts = rankFeedPosts(STATE.feedPosts, {
    tab,
    sort: feedFilters.sort || 'ranked',
    followedProfileIds: STATE.followedProfileIds
  });

  feedRoots().forEach((root) => {
    const list = root.querySelector('[data-profile-home-feed-list]');
    const empty = root.querySelector('[data-profile-home-feed-empty]');
    const loading = root.querySelector('[data-profile-home-feed-loading]');
    if (!(list instanceof HTMLElement) || !(empty instanceof HTMLElement)) return;
    const rootPosts = getPostsForFeedRoot(root, posts);
    list.innerHTML = STATE.feedLoading ? '' : rootPosts.map((post) => renderFeedPost(post)).join('');
    if (loading instanceof HTMLElement) loading.hidden = !STATE.feedLoading;
    empty.hidden = STATE.feedLoading || rootPosts.length > 0;
  });
}

function renderNotifications() {
  const snapshot = window.NEUROARTAN_NOTIFICATION_CENTER?.getSnapshot?.() || {};
  const notificationFilters = getProfileFilterState('notifications').filters;
  const notifications = (Array.isArray(snapshot.notifications) ? snapshot.notifications : [])
    .filter((item) => {
      if (notificationFilters.state === 'read') return Boolean(item.readAt);
      if (notificationFilters.state === 'unread') return !item.readAt;
      return true;
    })
    .filter((item) => {
      if (!notificationFilters.priority || notificationFilters.priority === 'all') return true;
      return String(item.priority || 'normal').toLowerCase() === notificationFilters.priority;
    });

  notificationRoots().forEach((root) => {
    const list = root.querySelector('[data-profile-home-notification-list]');
    const empty = root.querySelector('[data-profile-home-notification-empty]');
    if (!(list instanceof HTMLElement) || !(empty instanceof HTMLElement)) return;
    list.innerHTML = notifications.map((item) => `
      <article class="profile-home-panel__item" data-notification-read-state="${item.readAt ? 'read' : 'unread'}">
        <div class="profile-home-panel__item-header">
          <span class="profile-home-panel__item-meta">
            <strong>${escapeHtml(item.title || 'Notification')}</strong>
            ${item.createdAt ? `<span>${escapeHtml(formatDate(item.createdAt))}</span>` : ''}
          </span>
          ${item.readAt ? '' : `<button class="profile-home-panel__icon-button" type="button" data-profile-home-notification-read="${escapeHtml(item.id || '')}" aria-label="Mark notification read">
            <img class="ui-icon-theme-aware" src="/registry/icons/public/assets/core/actions/check/check.svg" alt="">
          </button>`}
        </div>
        ${item.body ? `<p class="profile-home-panel__item-body">${escapeHtml(item.body)}</p>` : ''}
      </article>
    `).join('');
    empty.hidden = notifications.length > 0;
  });
}

function renderMessages() {
  messagingRoots().forEach((root) => {
    const list = root.querySelector('[data-profile-home-message-list]');
    const empty = root.querySelector('[data-profile-home-message-empty]');
    if (!(list instanceof HTMLElement) || !(empty instanceof HTMLElement)) return;
    list.innerHTML = STATE.messages.map((item) => `
      <article class="profile-home-panel__item">
        <div class="profile-home-panel__item-header">
          <span class="profile-home-panel__item-meta">
            <strong>${escapeHtml(item.author || 'You')}</strong>
            <span>${escapeHtml(formatDate(item.createdAt))}</span>
          </span>
        </div>
        <p class="profile-home-panel__item-body">${escapeHtml(item.body)}</p>
      </article>
    `).join('');
    empty.hidden = STATE.messages.length > 0;
  });
}

async function loadFeed() {
  STATE.feedLoading = true;
  renderFeed();
  try {
    const [posts, followedProfileIds] = await Promise.all([
      listFeedPosts(),
      listFollowedProfileIds()
    ]);
    STATE.feedPosts = Array.isArray(posts) ? posts : [];
    STATE.followedProfileIds = Array.isArray(followedProfileIds) ? followedProfileIds : [];
    const social = await getFeedSocialState(STATE.feedPosts.map((post) => post.id));
    STATE.feedSocialState = social.state || Object.create(null);
  } catch (error) {
    STATE.feedPosts = [];
    STATE.feedSocialState = Object.create(null);
    STATE.followedProfileIds = [];
    console.error('[profile-home-panels] Feed load failed.', error);
  }
  STATE.feedLoading = false;
  renderFeed();
}

function bindEvents() {
  document.addEventListener('neuroartan:notifications-updated', renderNotifications);
  document.addEventListener('profile:feed-refresh-request', () => {
    void loadFeed();
  });

  document.addEventListener('click', (event) => {
    const read = event.target.closest('[data-profile-home-notification-read]');
    if (read instanceof HTMLButtonElement) {
      window.NEUROARTAN_NOTIFICATION_CENTER?.markRead?.(read.getAttribute('data-profile-home-notification-read') || '');
      renderNotifications();
    }

    const actionButton = event.target.closest('[data-profile-home-action]');
    if (actionButton instanceof HTMLButtonElement) {
      const action = actionButton.getAttribute('data-profile-home-action') || '';
      const postId = actionButton.getAttribute('data-post-id') || '';
      void handleSocialAction(action, postId, actionButton);
    }
  });

  document.addEventListener('submit', (event) => {
    const commentForm = event.target.closest('[data-profile-home-comment-form]');
    if (commentForm instanceof HTMLFormElement) {
      event.preventDefault();
      const postId = commentForm.getAttribute('data-post-id') || '';
      const input = commentForm.querySelector('input[name="comment"]');
      const body = normalizeString(input instanceof HTMLInputElement ? input.value : '');
      if (!postId || !body) return;
      void createFeedPostComment(postId, body)
        .then((snapshot) => {
          STATE.feedSocialState = {
            ...STATE.feedSocialState,
            ...(snapshot.state || {})
          };
          commentForm.reset();
          renderFeed();
        })
        .catch((error) => {
          console.error('[profile-home-panels] Comment save failed.', error);
        });
      return;
    }

    const form = event.target.closest('[data-profile-home-message-form]');
    if (!(form instanceof HTMLFormElement)) return;
    event.preventDefault();
    const input = form.querySelector('input[name="message"]');
    const body = normalizeString(input instanceof HTMLInputElement ? input.value : '');
    if (!body) return;
    STATE.messages.unshift({
      id: `message-${Date.now()}`,
      author: 'You',
      body,
      createdAt: new Date().toISOString()
    });
    saveMessages();
    form.reset();
    renderMessages();
  });
}

async function handleSocialAction(action = '', postId = '', button = null) {
  if (!button) return;

  switch (action) {
    case 'like':
    case 'repost':
    case 'bookmark':
    case 'share': {
      button.disabled = true;
      try {
        const snapshot = await toggleFeedPostInteraction(postId, action);
        STATE.feedSocialState = {
          ...STATE.feedSocialState,
          ...(snapshot.state || {})
        };
        renderFeed();
      } catch (error) {
        console.error('[profile-home-panels] Feed interaction failed.', error);
      } finally {
        button.disabled = false;
      }
      break;
    }
    case 'reply':
      STATE.openCommentPostId = STATE.openCommentPostId === postId ? '' : postId;
      renderFeed();
      break;
  }
}

function renderAll() {
  renderFeed();
  renderNotifications();
  renderMessages();
}

function initProfileHomePanels() {
  if (STATE.initialized) return;
  STATE.initialized = true;
  loadMessages();
  bindEvents();
  void loadFeed();
  renderAll();
}

subscribeProfileFilters((state) => {
  if (state.context === 'feed') {
    renderFeed();
  } else if (state.context === 'notifications') {
    renderNotifications();
  }
});

document.addEventListener('fragment:mounted', (event) => {
  if (![
    'profile-private-home-feed',
    'profile-private-home-notifications',
    'profile-private-home-messaging',
    'profile-public-posts'
  ].includes(event?.detail?.name)) return;
  renderAll();
});

document.addEventListener('profile:public-posts-context-changed', renderFeed);

window.addEventListener('neuroartan:supabase-ready', () => {
  void loadFeed();
});

initProfileHomePanels();
