/* =============================================================================
   00) FILE INDEX
   01) DEVELOPER MODE WORKSPACE MOUNT
   02) END OF FILE
============================================================================= */

/* =============================================================================
   01) DEVELOPER MODE WORKSPACE MOUNT
============================================================================= */
export function mountHomePlatformDestination(root) {
  const route = root?.querySelector('[data-developer-mode-route]');
  if (route instanceof HTMLAnchorElement) {
    route.setAttribute('aria-label', 'Open governed Developer Mode Codex Sessions layer');
  }
}

/* =============================================================================
   02) END OF FILE
============================================================================= */
