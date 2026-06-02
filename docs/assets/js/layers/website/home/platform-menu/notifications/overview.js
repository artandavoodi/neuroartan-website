function getNotificationsSurface(root) {
  if (!(root instanceof Element)) {
    return null;
  }

  return root.querySelector('[data-home-platform-destination-surface]') || root;
}

function escapeHtml(value = '') {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[char]);
}

function getNotificationSnapshot(snapshot = {}) {
  return window.NEUROARTAN_NOTIFICATION_CENTER?.getSnapshot?.()
    || snapshot?.communication?.notifications
    || {};
}

const STORAGE_KEY = 'neuroartan_notification_read_state';

function getSavedReadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

function saveReadState(notificationId) {
  try {
    const saved = getSavedReadState();
    saved[notificationId] = Date.now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  } catch {
    // Silently fail if localStorage is not available
  }
}

function saveAllReadState(notificationIds = []) {
  try {
    const saved = getSavedReadState();
    notificationIds.forEach((id) => {
      saved[id] = Date.now();
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  } catch {
    // Silently fail if localStorage is not available
  }
}

function applySavedReadState(notifications = []) {
  const saved = getSavedReadState();
  return notifications.map((notification) => {
    if (saved[notification.id]) {
      return { ...notification, readAt: saved[notification.id] };
    }
    return notification;
  });
}

function categorizeNotification(notification = {}) {
  const category = notification?.category || 'system';
  return category;
}

function filterNotificationsByCategory(notifications = [], category = 'all') {
  if (category === 'all') {
    return notifications;
  }
  return notifications.filter((item) => categorizeNotification(item) === category);
}

function renderNotificationEntry(item = {}) {
  const isRead = !!item.readAt;
  const iconPath = isRead 
    ? '/registry/icons/public/assets/core/actions/notification-read/notification-read.svg'
    : '/registry/icons/public/assets/core/actions/notification-unread/notification-unread.svg';
  
  return `
    <li class="home-platform-notifications__entry" data-notification-read-state="${isRead ? 'read' : 'unread'}">
      <div class="home-platform-notifications__entry-content">
        <div class="home-platform-notifications__entry-copy">
          <strong>${escapeHtml(item.title || 'Notification')}</strong>
          ${item.body ? `<span>${escapeHtml(item.body)}</span>` : ''}
        </div>
        <button class="home-platform-notifications__entry-action" type="button" data-notification-mark-read="${escapeHtml(item.id || '')}" ${isRead ? 'disabled' : ''} aria-label="${isRead ? 'Read' : 'Mark as read'}">
          <img class="ui-icon-theme-aware home-platform-notifications__entry-icon" src="${iconPath}" alt="" width="16" height="16">
        </button>
      </div>
    </li>
  `;
}

function renderNotificationList(notifications = [], category = 'all') {
  if (!notifications.length) {
    const categoryLabels = {
      all: 'No notifications are currently stored.',
      system: 'No system notifications.',
      social: 'No social notifications.',
      cognitive: 'No cognitive notifications.',
      account: 'No account notifications.'
    };
    
    return `
      <div class="home-platform-notifications__empty">
        <p class="home-platform-notifications__state">${categoryLabels[category] || 'No notifications in this category.'}</p>
      </div>
    `;
  }

  return `
    <ul class="home-platform-notifications__feed" aria-label="Notification list">
      ${notifications.map(renderNotificationEntry).join('')}
    </ul>
  `;
}

function renderTabs(activeCategory = 'all', unreadCounts = {}) {
  const categories = [
    { id: 'all', label: 'All', icon: '/registry/icons/public/assets/core/actions/notification-all/notification-all.svg' },
    { id: 'system', label: 'System', icon: '/registry/icons/public/assets/core/actions/notification-system/notification-system.svg' },
    { id: 'social', label: 'Social', icon: '/registry/icons/public/assets/core/actions/notification-social/notification-social.svg' },
    { id: 'cognitive', label: 'Cognitive', icon: '/registry/icons/public/assets/core/actions/notification-cognitive/notification-cognitive.svg' },
    { id: 'account', label: 'Account', icon: '/registry/icons/public/assets/core/actions/notification-account/notification-account.svg' }
  ];

  return `
    <div class="home-platform-notifications__tabs" role="tablist">
      <div class="home-platform-notifications__tabs-left">
        ${categories.map((cat) => `
          <button 
            class="home-platform-notifications__tab" 
            type="button" 
            role="tab" 
            data-notification-category="${cat.id}"
            ${activeCategory === cat.id ? 'aria-selected="true"' : 'aria-selected="false"'}
          >
            <img class="ui-icon-theme-aware home-platform-notifications__tab-icon" src="${cat.icon}" alt="" width="16" height="16">
            ${escapeHtml(cat.label)}
            ${unreadCounts[cat.id] > 0 ? `<span class="home-platform-notifications__tab-badge">${Math.min(unreadCounts[cat.id], 99)}</span>` : ''}
          </button>
        `).join('')}
      </div>
      <button class="home-platform-notifications__tabs-more" type="button" aria-label="More options" data-notification-tabs-more>
        <img class="ui-icon-theme-aware home-platform-notifications__tabs-more-icon" src="/registry/icons/public/assets/core/actions/more-vertical/more-vertical.svg" alt="" width="16" height="16">
      </button>
    </div>
  `;
}

function renderNotificationsMarkup(snapshot = {}, activeCategory = 'all') {
  const signedIn = !!snapshot?.account?.signedIn;
  const notificationSnapshot = getNotificationSnapshot(snapshot);
  const unreadCount = Number(notificationSnapshot?.unreadCount || 0);
  const notifications = Array.isArray(notificationSnapshot?.notifications)
    ? notificationSnapshot.notifications
    : [];
  const permission = 'Notification' in window ? Notification.permission : 'not supported';
  const hasUnread = unreadCount > 0;

  // Apply saved read state from localStorage
  const notificationsWithReadState = applySavedReadState(notifications);

  // Calculate unread counts per category
  const unreadCounts = {
    all: unreadCount,
    system: 0,
    social: 0,
    cognitive: 0,
    account: 0
  };

  notificationsWithReadState.forEach((item) => {
    if (!item.readAt) {
      const category = categorizeNotification(item);
      if (unreadCounts[category] !== undefined) {
        unreadCounts[category]++;
      }
    }
  });

  // Filter notifications by active category
  const filteredNotifications = filterNotificationsByCategory(notificationsWithReadState, activeCategory);

  return `
    <div class="home-platform-notifications__container">
      ${renderTabs(activeCategory, unreadCounts)}
      
      ${renderNotificationList(filteredNotifications, activeCategory)}
    </div>
    
    <article class="home-platform-notifications-overlay" role="dialog" aria-labelledby="notifications-overlay-title" hidden>
      <div class="home-platform-notifications-overlay__backdrop"></div>
      <div class="home-platform-notifications-overlay__dialog ui-card ui-surface--glass">
        <header class="home-platform-notifications-overlay__header">
          <h2 class="home-platform-notifications-overlay__title" id="notifications-overlay-title">Notification Settings</h2>
          <button class="home-platform-notifications-overlay__close global-close-button" type="button" data-notifications-overlay-close aria-label="Close overlay" data-core-close-button="true" data-close-button-primitive-bound="true">
            <span class="global-close-button__line global-close-button__line--first" aria-hidden="true"></span>
            <span class="global-close-button__line global-close-button__line--second" aria-hidden="true"></span>
          </button>
        </header>
        <div class="home-platform-notifications-overlay__actions">
          <button class="home-platform-notifications__action home-platform-notifications-overlay__action" type="button" data-notification-mark-all-read ${hasUnread ? '' : 'disabled'}>
            <img class="ui-icon-theme-aware home-platform-notifications__action-icon" src="/registry/icons/public/assets/core/actions/notification-mark-read/notification-mark-read.svg" alt="" width="16" height="16">
            Mark all read
          </button>
          <button class="home-platform-notifications__action home-platform-notifications-overlay__action" type="button" data-notification-preferences>
            <img class="ui-icon-theme-aware home-platform-notifications__action-icon" src="/registry/icons/public/assets/core/actions/notification-preferences/notification-preferences.svg" alt="" width="16" height="16">
            Preferences
          </button>
          <button class="home-platform-notifications__action home-platform-notifications-overlay__action" type="button" data-notification-request-permission>
            <img class="ui-icon-theme-aware home-platform-notifications__action-icon" src="/registry/icons/public/assets/core/actions/notification-browser-permission/notification-browser-permission.svg" alt="" width="16" height="16">
            Browser Permission
            <span class="home-platform-notifications__permission-status">${escapeHtml(permission)}</span>
          </button>
        </div>
      </div>
    </article>
  `;
}

export function mountHomePlatformDestination(root, { snapshot = {} } = {}) {
  const surface = getNotificationsSurface(root);
  if (!surface) {
    return;
  }

  let activeCategory = 'all';
  
  function render() {
    surface.innerHTML = renderNotificationsMarkup(snapshot, activeCategory);
    attachEventListeners(surface, snapshot, () => activeCategory, (newCategory) => {
      activeCategory = newCategory;
    });
  }
  
  render();
}

function attachEventListeners(surface, snapshot, getActiveCategory, setActiveCategory) {
  const currentCategory = getActiveCategory();
  
  // Tab switching
  surface.querySelectorAll('[data-notification-category]').forEach((tab) => {
    tab.addEventListener('click', () => {
      const newCategory = tab.getAttribute('data-notification-category') || 'all';
      setActiveCategory(newCategory);
      surface.innerHTML = renderNotificationsMarkup(snapshot, newCategory);
      attachEventListeners(surface, snapshot, getActiveCategory, setActiveCategory);
    });
  });

  // More button - open overlay
  surface.querySelector('[data-notification-tabs-more]')?.addEventListener('click', () => {
    const overlay = document.querySelector('.home-platform-notifications-overlay');
    if (overlay) {
      overlay.hidden = false;
    }
  });

  // Overlay close button
  document.querySelector('[data-notifications-overlay-close]')?.addEventListener('click', () => {
    const overlay = document.querySelector('.home-platform-notifications-overlay');
    if (overlay) {
      overlay.hidden = true;
    }
  });

  // Overlay backdrop - close on click
  document.querySelector('.home-platform-notifications-overlay__backdrop')?.addEventListener('click', () => {
    const overlay = document.querySelector('.home-platform-notifications-overlay');
    if (overlay) {
      overlay.hidden = true;
    }
  });

  surface.querySelector('[data-notification-request-permission]')?.addEventListener('click', async () => {
    await window.NEUROARTAN_NOTIFICATION_CENTER?.requestPermission?.();
    surface.innerHTML = renderNotificationsMarkup(snapshot, currentCategory);
    attachEventListeners(surface, snapshot, getActiveCategory, setActiveCategory);
  });

  surface.querySelector('[data-notification-mark-all-read]')?.addEventListener('click', () => {
    const notificationSnapshot = getNotificationSnapshot(snapshot);
    const notifications = Array.isArray(notificationSnapshot?.notifications)
      ? notificationSnapshot.notifications
      : [];
    const unreadNotifications = notifications.filter((n) => !n.readAt);
    const unreadIds = unreadNotifications.map((n) => n.id).filter(Boolean);
    
    window.NEUROARTAN_NOTIFICATION_CENTER?.markAllRead?.();
    saveAllReadState(unreadIds);
    surface.innerHTML = renderNotificationsMarkup(snapshot, currentCategory);
    attachEventListeners(surface, snapshot, getActiveCategory, setActiveCategory);
  });

  surface.querySelector('[data-notification-preferences]')?.addEventListener('click', () => {
    window.location.hash = '#home-platform-settings-notifications';
  });

  surface.querySelectorAll('[data-notification-mark-read]').forEach((button) => {
    button.addEventListener('click', () => {
      const notificationId = button.getAttribute('data-notification-mark-read') || '';
      window.NEUROARTAN_NOTIFICATION_CENTER?.markRead?.(notificationId);
      saveReadState(notificationId);
      surface.innerHTML = renderNotificationsMarkup(snapshot, currentCategory);
      attachEventListeners(surface, snapshot, getActiveCategory, setActiveCategory);
    });
  });
}
