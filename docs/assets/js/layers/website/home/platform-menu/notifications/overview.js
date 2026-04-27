function getNotificationsSurface(root) {
  if (!(root instanceof Element)) {
    return null;
  }

  return root.querySelector('[data-home-platform-destination-surface]') || root;
}

function renderNotificationsMarkup(snapshot = {}) {
  const signedIn = !!snapshot?.account?.signedIn;
  const unreadCount = Number(snapshot?.communication?.notifications?.unreadCount || 0);
  const hasUnread = unreadCount > 0;

  return `
    <div class="home-platform-notifications__grid">
      <article class="home-platform-notifications__card">
        <p class="home-platform-notifications__eyebrow">Notifications Overview</p>
        <h3 class="home-platform-notifications__title">${signedIn ? 'Trust-sensitive updates stay visible here' : 'Notifications will appear after account entry'}</h3>
        <p class="home-platform-notifications__state">${signedIn ? (hasUnread ? `${Math.min(unreadCount, 99)} unread notifications are currently marked for review.` : 'No unread notifications are currently staged in this shell runtime.') : 'Verification, profile, and runtime alerts remain private until the owner runtime is active.'}</p>
        <div class="home-platform-notifications__actions">
          <a class="home-platform-notifications__action" href="/pages/models/index.html">Open Models</a>
          <a class="home-platform-notifications__action" href="/pages/dashboard/index.html">Open Dashboard</a>
        </div>
      </article>

      <article class="home-platform-notifications__card">
        <p class="home-platform-notifications__eyebrow">Notification Policy</p>
        <h3 class="home-platform-notifications__title">Priority, verification, and system state</h3>
        <ul class="home-platform-notifications__list">
          <li class="home-platform-notifications__item">Verification changes, public-route shifts, and trust-state alerts stay distinct from social noise.</li>
          <li class="home-platform-notifications__item">Unread and high-volume icon states are now scaffolded at the shell navigation level.</li>
          <li class="home-platform-notifications__item">Future account, model, and system notifications can graduate into sovereign runtime storage without changing this shell contract.</li>
        </ul>
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
}
