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

function renderNotificationList(notifications = []) {
  if (!notifications.length) {
    return `
      <div class="home-platform-notifications__empty">
        <p class="home-platform-notifications__state">No notifications are stored in this browser.</p>
      </div>
    `;
  }

  return `
    <ul class="home-platform-notifications__feed" aria-label="Notification list">
      ${notifications.map((item) => `
        <li class="home-platform-notifications__entry" data-notification-read-state="${item.readAt ? 'read' : 'unread'}">
          <div class="home-platform-notifications__entry-copy">
            <strong>${escapeHtml(item.title || 'Notification')}</strong>
            ${item.body ? `<span>${escapeHtml(item.body)}</span>` : ''}
          </div>
          <button class="home-platform-notifications__entry-action" type="button" data-notification-mark-read="${escapeHtml(item.id || '')}" ${item.readAt ? 'disabled' : ''}>
            ${item.readAt ? 'Read' : 'Mark read'}
          </button>
        </li>
      `).join('')}
    </ul>
  `;
}

function renderNotificationsMarkup(snapshot = {}) {
  const signedIn = !!snapshot?.account?.signedIn;
  const notificationSnapshot = getNotificationSnapshot(snapshot);
  const unreadCount = Number(notificationSnapshot?.unreadCount || 0);
  const notifications = Array.isArray(notificationSnapshot?.notifications)
    ? notificationSnapshot.notifications
    : [];
  const permission = notificationSnapshot?.permission || 'default';
  const hasUnread = unreadCount > 0;

  return `
    <div class="home-platform-notifications__grid">
      <article class="home-platform-notifications__card">
        <p class="home-platform-notifications__eyebrow">Notifications Overview</p>
        <h3 class="home-platform-notifications__title">${signedIn ? 'Trust-sensitive updates stay visible here' : 'Local notification center is active'}</h3>
        <p class="home-platform-notifications__state">${hasUnread ? `${Math.min(unreadCount, 99)} unread notifications are stored for review.` : 'No unread notifications are currently stored.'}</p>
        <div class="home-platform-notifications__actions">
          <button class="home-platform-notifications__action" type="button" data-notification-request-permission>Browser Permission: ${escapeHtml(permission)}</button>
          <button class="home-platform-notifications__action" type="button" data-notification-mark-all-read ${hasUnread ? '' : 'disabled'}>Mark all read</button>
        </div>
      </article>

      <article class="home-platform-notifications__card">
        <p class="home-platform-notifications__eyebrow">Notification Log</p>
        <h3 class="home-platform-notifications__title">Account, privacy, and runtime events</h3>
        ${renderNotificationList(notifications)}
      </article>
    </div>
  `;
}

export function mountHomePlatformDestination(root, { snapshot = {} } = {}) {
  const surface = getNotificationsSurface(root);
  if (!surface) {
    return;
  }

  surface.innerHTML = renderNotificationsMarkup(snapshot);

  surface.querySelector('[data-notification-request-permission]')?.addEventListener('click', async () => {
    await window.NEUROARTAN_NOTIFICATION_CENTER?.requestPermission?.();
    surface.innerHTML = renderNotificationsMarkup(snapshot);
    mountHomePlatformDestination(root, { snapshot });
  });

  surface.querySelector('[data-notification-mark-all-read]')?.addEventListener('click', () => {
    window.NEUROARTAN_NOTIFICATION_CENTER?.markAllRead?.();
    surface.innerHTML = renderNotificationsMarkup(snapshot);
    mountHomePlatformDestination(root, { snapshot });
  });

  surface.querySelectorAll('[data-notification-mark-read]').forEach((button) => {
    button.addEventListener('click', () => {
      window.NEUROARTAN_NOTIFICATION_CENTER?.markRead?.(button.getAttribute('data-notification-mark-read') || '');
      surface.innerHTML = renderNotificationsMarkup(snapshot);
      mountHomePlatformDestination(root, { snapshot });
    });
  });
}
