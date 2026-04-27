function getMessagingSurface(root) {
  if (!(root instanceof Element)) {
    return null;
  }

  return root.querySelector('[data-home-platform-destination-surface]') || root;
}

function renderMessagingMarkup(snapshot = {}) {
  const signedIn = !!snapshot?.account?.signedIn;
  const unreadCount = Number(snapshot?.communication?.messaging?.unreadCount || 0);
  const hasUnread = unreadCount > 0;

  return `
    <div class="home-platform-messaging__grid">
      <article class="home-platform-messaging__card">
        <p class="home-platform-messaging__eyebrow">Messaging Overview</p>
        <h3 class="home-platform-messaging__title">${signedIn ? 'Continuity-linked inbox ready' : 'Sign in to unlock private messaging'}</h3>
        <p class="home-platform-messaging__state">${signedIn ? (hasUnread ? `${Math.min(unreadCount, 99)} unread conversation updates detected.` : 'No unread messages are currently staged in this shell runtime.') : 'Messaging stays private and account-bound. Public website surfaces do not expose private conversations.'}</p>
        <div class="home-platform-messaging__actions">
          <a class="home-platform-messaging__action" href="/pages/feed/index.html">Open Feed</a>
          <a class="home-platform-messaging__action" href="/pages/dashboard/index.html">Open Dashboard</a>
        </div>
      </article>

      <article class="home-platform-messaging__card">
        <p class="home-platform-messaging__eyebrow">Architecture</p>
        <h3 class="home-platform-messaging__title">Governed conversation lanes</h3>
        <ul class="home-platform-messaging__list">
          <li class="home-platform-messaging__item">Private owner conversations remain distinct from public profile or model surfaces.</li>
          <li class="home-platform-messaging__item">Continuity-linked threads will later bind to models, profiles, and dashboard routes without rewriting the shell.</li>
          <li class="home-platform-messaging__item">Unread, priority, and archival states are now scaffolded at the navigation level.</li>
        </ul>
      </article>
    </div>
  `;
}

export function mountHomePlatformDestination(root, { snapshot = {} } = {}) {
  const surface = getMessagingSurface(root);
  if (!surface) {
    return;
  }

  surface.innerHTML = renderMessagingMarkup(snapshot);
}
