import '../../../home/shell/home-search-shell.js';

/* =============================================================================
   01) PUBLIC PROFILE PAGE AUTHORITY
   02) PUBLIC PROFILE INIT
   ============================================================================= */

/* =============================================================================
   01) PUBLIC PROFILE PAGE AUTHORITY
   ============================================================================= */

function initPublicProfilePage() {
  const root = document.querySelector('body[data-profile-page="public"]');
  if (!root) return;

  root.dataset.profilePageMode = 'public';
  root.dataset.profileSurface = 'public';
  document.documentElement.dataset.profileSurface = 'public';
}

/* =============================================================================
   02) PUBLIC PROFILE INIT
   ============================================================================= */

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPublicProfilePage, { once: true });
} else {
  initPublicProfilePage();
}
