import {
  listFeedPosts
} from '../../../system/feed/feed-store.js';
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
  feedPosts: [],
  followedProfileIds: [],
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

function notificationRoots() {
  return Array.from(document.querySelectorAll('[data-profile-home-notifications]'));
}

function messagingRoots() {
  return Array.from(document.querySelectorAll('[data-profile-home-messaging]'));
}

function renderFeedPost(post = {}) {
  const avatar = normalizeString(post.avatar || '');
  const handle = normalizeString(post.username) ? `@${normalizeString(post.username)}` : normalizeString(post.publicRoute || post.href || '');
  return `
    <article class="profile-home-panel__item">
      <div class="profile-home-panel__item-header">
        <span class="profile-home-panel__item-avatar" aria-hidden="true">
          ${avatar ? `<img src="${escapeHtml(avatar)}" alt="">` : ''}
        </span>
        <span class="profile-home-panel__item-meta">
          <strong>${escapeHtml(post.entityLabel || 'Profile')}</strong>
          ${handle ? `<span>${escapeHtml(handle)}</span>` : ''}
        </span>
        ${post.createdAt ? `<time>${escapeHtml(formatDate(post.createdAt))}</time>` : ''}
      </div>
      <p class="profile-home-panel__item-body">${escapeHtml(post.content || '')}</p>
      ${post.imageUrl ? `<img class="profile-home-panel__item-image" src="${escapeHtml(post.imageUrl)}" alt="">` : ''}
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
    if (!(list instanceof HTMLElement) || !(empty instanceof HTMLElement)) return;
    list.innerHTML = posts.map((post) => renderFeedPost(post)).join('');
    empty.hidden = posts.length > 0;
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
  try {
    const [posts, followedProfileIds] = await Promise.all([
      listFeedPosts(),
      listFollowedProfileIds()
    ]);
    STATE.feedPosts = Array.isArray(posts) ? posts : [];
    STATE.followedProfileIds = Array.isArray(followedProfileIds) ? followedProfileIds : [];
  } catch (error) {
    STATE.feedPosts = [];
    STATE.followedProfileIds = [];
    console.error('[profile-home-panels] Feed load failed.', error);
  }
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
  });

  document.addEventListener('submit', (event) => {
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
  if (!['profile-private-home-feed', 'profile-private-home-notifications', 'profile-private-home-messaging'].includes(event?.detail?.name)) return;
  renderAll();
});

window.addEventListener('neuroartan:supabase-ready', () => {
  void loadFeed();
});

initProfileHomePanels();
