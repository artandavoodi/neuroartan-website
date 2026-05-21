/* =============================================================================
   01) PRIVATE PROFILE PAGE AUTHORITY
   01A) PRIVATE PROFILE STATE
   02) PRIVATE PROFILE INIT
   ============================================================================= */

/* =============================================================================
   01A) PRIVATE PROFILE STATE
   ============================================================================= */

function resolvePrivateProfileRoot() {
  return document.querySelector('body[data-profile-page="private"]');
}

function applyPrivateProfileSurface(root) {
  if (!root) return;

  root.dataset.profilePageMode = 'private';
  root.dataset.profileSurface = 'private';
  document.documentElement.dataset.profileSurface = 'private';
}

/* =============================================================================
   01) PRIVATE PROFILE PAGE AUTHORITY
   ============================================================================= */

function initPrivateProfilePage() {
  const root = resolvePrivateProfileRoot();
  if (!root) return;

  applyPrivateProfileSurface(root);
}

/* =============================================================================
   02) PRIVATE PROFILE INIT
   ============================================================================= */

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPrivateProfilePage, { once: true });
} else {
  initPrivateProfilePage();
}
