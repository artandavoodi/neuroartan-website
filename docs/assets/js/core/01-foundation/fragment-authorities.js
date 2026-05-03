/* =============================================================================
   00) FILE INDEX
   01) MODULE IDENTITY
   02) MODULE REGISTRATION
   03) BASE PATH AUTHORITY
   04) FRAGMENT AUTHORITIES
   05) PATH HELPERS
   06) PUBLIC API EXPORTS
   07) END OF FILE
============================================================================= */

/* =============================================================================
   01) MODULE IDENTITY
============================================================================= */
/* /website/docs/assets/js/core/01-foundation/fragment-authorities.js */

/* =============================================================================
   02) MODULE REGISTRATION
============================================================================= */
const MODULE_ID = 'core-fragment-authorities';
const MODULE_PATH = '/website/docs/assets/js/core/01-foundation/fragment-authorities.js';

/* =============================================================================
   03) BASE PATH AUTHORITY
============================================================================= */
function getWebsiteBasePath() {
  const pathname = window.location.pathname || '';

  if (pathname.includes('/website/docs/')) return '/website/docs';
  if (pathname.endsWith('/website/docs')) return '/website/docs';
  if (pathname.includes('/docs/')) return '/docs';
  if (pathname.endsWith('/docs')) return '/docs';

  return '';
}

function assetPath(path) {
  const normalized = String(path || '').trim();
  if (!normalized) return '';

  const base = getWebsiteBasePath();
  return `${base}${normalized.startsWith('/') ? normalized : `/${normalized}`}`;
}

/* =============================================================================
   04) FRAGMENT AUTHORITIES
============================================================================= */
function getFragmentPaths() {
  return {
    'account-drawer': assetPath('/assets/fragments/layers/website/account/account-drawer.html'),
    'account-sign-in-drawer': assetPath('/assets/fragments/layers/website/account/account-sign-in-drawer.html'),
    'account-sign-up-drawer': assetPath('/assets/fragments/layers/website/account/account-sign-up-drawer.html'),
    'account-provider-apple-sheet': assetPath('/assets/fragments/layers/website/account/account-provider-apple-sheet.html'),
    'account-provider-google-sheet': assetPath('/assets/fragments/layers/website/account/account-provider-google-sheet.html'),
    'account-email-auth-drawer': assetPath('/assets/fragments/layers/website/account/account-email-auth-drawer.html'),
    'account-forgot-password-drawer': assetPath('/assets/fragments/layers/website/account/account-forgot-password-drawer.html'),
    'account-phone-auth-drawer': assetPath('/assets/fragments/layers/website/account/account-phone-auth-drawer.html'),
    'account-profile-setup-drawer': assetPath('/assets/fragments/layers/website/account/account-profile-setup-drawer.html'),
    'cookie-consent': assetPath('/assets/fragments/layers/website/cookie/cookie-consent.html'),
    'country-overlay': assetPath('/assets/fragments/layers/website/country/country-overlay.html'),
    'institutional-links': assetPath('/assets/fragments/layers/website/navigation/institutional-links.html'),
    'institutional-menu': assetPath('/assets/fragments/layers/website/navigation/institutional-menu.html'),
    'products-local-nav': assetPath('/assets/fragments/layers/website/navigation/products-local-nav.html'),
    'menu': assetPath('/assets/fragments/layers/website/navigation/menu.html'),
    'profile-private-menu': assetPath('/assets/fragments/layers/website/profile/private/menu/profile-menu.html'),
    'profile-private-shell': assetPath('/assets/fragments/layers/website/profile/private/shell/profile-shell.html'),
    'profile-private-header': assetPath('/assets/fragments/layers/website/profile/private/header/profile-header.html'),
    'profile-private-sections': assetPath('/assets/fragments/layers/website/profile/private/sections/profile-sections.html'),
    'profile-private-sidebar': assetPath('/assets/fragments/layers/website/profile/private/sidebar/profile-sidebar.html'),
    'profile-private-workspace': assetPath('/assets/fragments/layers/website/profile/private/workspace/profile-workspace.html'),
    'profile-private-overview-panel': assetPath('/assets/fragments/layers/website/profile/private/overview/profile-overview-panel.html'),
    'profile-private-posts': assetPath('/assets/fragments/layers/website/profile/private/posts/profile-posts.html'),
    'profile-private-thought-bank-panel': assetPath('/assets/fragments/layers/website/profile/private/thoughts/profile-thought-bank-panel.html'),
    'profile-private-thought-composer-panel': assetPath('/assets/fragments/layers/website/profile/private/thoughts/profile-thought-composer-panel.html'),
    'profile-private-thought-stream-panel': assetPath('/assets/fragments/layers/website/profile/private/thoughts/profile-thought-stream-panel.html'),
    'profile-private-dashboard-panel': assetPath('/assets/fragments/layers/website/profile/private/dashboard/profile-dashboard-panel.html'),
    'profile-private-dashboard-metrics-panel': assetPath('/assets/fragments/layers/website/profile/private/dashboard/profile-dashboard-metrics-panel.html'),
    'profile-private-dashboard-graph-panel': assetPath('/assets/fragments/layers/website/profile/private/dashboard/profile-dashboard-graph-panel.html'),
    'profile-private-settings-panel': assetPath('/assets/fragments/layers/website/profile/private/settings/profile-settings-panel.html'),
    'profile-private-footer': assetPath('/assets/fragments/layers/website/profile/private/footer/profile-footer.html'),
    'profile-private-hero': assetPath('/assets/fragments/layers/website/profile/private/hero/profile-private-hero.html'),
    'profile-private-identity': assetPath('/assets/fragments/layers/website/profile/private/identity/profile-private-identity.html'),
    'profile-private-account-status': assetPath('/assets/fragments/layers/website/profile/private/account-status/profile-private-account-status.html'),
    'profile-private-media': assetPath('/assets/fragments/layers/website/profile/private/media/profile-private-media.html'),
    'profile-private-organization': assetPath('/assets/fragments/layers/website/profile/private/organization/profile-private-organization.html'),
    'profile-private-models': assetPath('/assets/fragments/layers/website/profile/private/models/profile-private-models.html'),
    'profile-private-settings': assetPath('/assets/fragments/layers/website/profile/private/settings/profile-private-settings.html'),
    'profile-private-status': assetPath('/assets/fragments/layers/website/profile/private/status/profile-private-status.html'),
    'profile-public-menu': assetPath('/assets/fragments/layers/website/profile/public/profile-menu.html'),
    'profile-public-shell': assetPath('/assets/fragments/layers/website/profile/public/profile-shell.html'),
    'profile-public-header': assetPath('/assets/fragments/layers/website/profile/public/profile-header.html'),
    'profile-public-sections': assetPath('/assets/fragments/layers/website/profile/public/profile-sections.html'),
    'profile-public-footer': assetPath('/assets/fragments/layers/website/profile/public/profile-footer.html'),
    'home-background-shell': assetPath('/assets/fragments/layers/website/home/background/home-background-shell.html'),
    'home-cinematic-video': assetPath('/assets/fragments/layers/website/home/background/home-cinematic-video.html'),
    'home-hero-shader': assetPath('/assets/fragments/layers/website/home/background/home-hero-shader.html'),
    'home-breathing-circle': assetPath('/assets/fragments/layers/website/home/background/home-breathing-circle.html'),
    'home-hero-matte': assetPath('/assets/fragments/layers/website/home/background/home-hero-matte.html'),
    'home-stage-composition': assetPath('/assets/fragments/layers/website/home/stage/home-stage-composition.html'),
    'home-stage-circle': assetPath('/assets/fragments/layers/website/home/stage/home-stage-circle.html'),
    'about-featured-functions': assetPath('/assets/fragments/layers/website/about/featured-functions/about-featured-functions.html'),
    'scroll-to-top': assetPath('/assets/fragments/core/scroll-to-top/scroll-to-top.html'),
    'products-sidebar': assetPath('/assets/fragments/layers/website/sections/products/products-sidebar.html'),
    'products-index-shell': assetPath('/assets/fragments/layers/website/sections/products/products-index-shell.html'),
    'footer': assetPath('/assets/fragments/layers/website/footer/footer.html'),
    'home-dashboard-topbar': assetPath('/assets/fragments/layers/website/home/shell/home-dashboard-topbar.html'),
    'home-interaction-panel': assetPath('/assets/fragments/layers/website/home/stage/home-interaction-panel.html'),
    'home-interaction-response-panel': assetPath('/assets/fragments/layers/website/home/stage/home-interaction-response-panel.html'),
    'home-interaction-settings-panel': assetPath('/assets/fragments/layers/website/home/interaction-settings/interaction-settings-shell.html'),
    'home-interaction-settings-overview': assetPath('/assets/fragments/layers/website/home/interaction-settings/sections/overview/index.html'),
    'home-interaction-settings-workspace': assetPath('/assets/fragments/layers/website/home/interaction-settings/sections/workspace/index.html'),
    'home-interaction-settings-model': assetPath('/assets/fragments/layers/website/home/interaction-settings/sections/model/index.html'),
    'home-interaction-settings-response': assetPath('/assets/fragments/layers/website/home/interaction-settings/sections/response/index.html'),
    'home-interaction-settings-voice': assetPath('/assets/fragments/layers/website/home/interaction-settings/sections/voice/index.html'),
    'home-interaction-settings-memory': assetPath('/assets/fragments/layers/website/home/interaction-settings/sections/memory/index.html'),
    'home-interaction-settings-session': assetPath('/assets/fragments/layers/website/home/interaction-settings/sections/session/index.html'),
    'home-interaction-settings-session-active-chat': assetPath('/assets/fragments/layers/website/home/interaction-settings/sections/session/active-chat.html'),
    'home-interaction-settings-session-reset-behavior': assetPath('/assets/fragments/layers/website/home/interaction-settings/sections/session/reset-behavior.html'),
    'home-interaction-settings-session-persistence': assetPath('/assets/fragments/layers/website/home/interaction-settings/sections/session/persistence.html'),
    'home-interaction-settings-stage': assetPath('/assets/fragments/layers/website/home/interaction-settings/sections/stage/index.html'),
    'home-interaction-settings-developer': assetPath('/assets/fragments/layers/website/home/interaction-settings/sections/developer/index.html'),
    'home-interaction-settings-changelog': assetPath('/assets/fragments/layers/website/home/interaction-settings/sections/changelog/index.html'),
    'home-interaction-settings-privacy': assetPath('/assets/fragments/layers/website/home/interaction-settings/sections/privacy/index.html'),
    'home-interaction-settings-accessibility': assetPath('/assets/fragments/layers/website/home/interaction-settings/sections/accessibility/index.html'),
    'home-developer-mode-shell': assetPath('/assets/fragments/layers/website/home/developer-mode/developer-mode-shell.html'),
    'home-developer-mode-topbar': assetPath('/assets/fragments/layers/website/home/developer-mode/topbar/developer-mode-topbar.html'),
    'home-developer-mode-left-sidebar': assetPath('/assets/fragments/layers/website/home/developer-mode/left-sidebar/developer-mode-left-sidebar.html'),
    'home-developer-mode-right-sidebar': assetPath('/assets/fragments/layers/website/home/developer-mode/right-sidebar/developer-mode-right-sidebar.html'),
    'home-developer-mode-command-surface': assetPath('/assets/fragments/layers/website/home/developer-mode/command-surface/developer-mode-command-surface.html'),
    'home-developer-mode-repository-panel': assetPath('/assets/fragments/layers/website/home/developer-mode/repository-panel/developer-mode-repository-panel.html'),
    'home-developer-mode-project-panel': assetPath('/assets/fragments/layers/website/home/developer-mode/project-panel/developer-mode-project-panel.html'),
    'home-developer-mode-provider-panel': assetPath('/assets/fragments/layers/website/home/developer-mode/provider-panel/developer-mode-provider-panel.html'),
    'home-developer-mode-runtime-panel': assetPath('/assets/fragments/layers/website/home/developer-mode/runtime-panel/developer-mode-runtime-panel.html'),
    'home-developer-mode-review-panel': assetPath('/assets/fragments/layers/website/home/developer-mode/review-panel/developer-mode-review-panel.html'),
    'home-developer-mode-settings-panel': assetPath('/assets/fragments/layers/website/home/developer-mode/settings-panel/developer-mode-settings-panel.html'),
    'home-stage-interactive-text': assetPath('/assets/fragments/layers/website/home/stage/home-stage-interactive-text.html'),
    'home-platform-shell': assetPath('/assets/fragments/layers/website/home/platform-menu/home-platform-shell.html'),
    'home-navigation-drawer': assetPath('/assets/fragments/layers/website/home/shell/home-navigation-drawer.html'),
    'home-workspace-panel': assetPath('/assets/fragments/layers/website/home/shell/home-workspace-panel.html'),
    'home-profile-control-panel': assetPath('/assets/fragments/layers/website/home/shell/home-profile-control-panel.html'),
    'home-search-shell': assetPath('/assets/fragments/layers/website/home/shell/home-search-shell.html'),
    'home-settings-panel': assetPath('/assets/fragments/layers/website/home/shell/home-settings-panel.html'),
    'home-footer': assetPath('/assets/fragments/layers/website/home/shell/home-footer.html'),
    'brain-activity': assetPath('/assets/fragments/layers/website/system/brain-activity.html'),
    'system-node': assetPath('/assets/fragments/layers/website/system/system-node.html')
  };
}

/* =============================================================================
   05) PATH HELPERS
============================================================================= */
function resolveFragmentPath(name) {
  const normalized = String(name || '').trim();
  if (!normalized) return '';

  const registry = getFragmentPaths();
  if (registry[normalized]) return registry[normalized];

  if (normalized.startsWith('/') || normalized.startsWith('./') || normalized.endsWith('.html')) {
    return assetPath(normalized);
  }

  return assetPath(`/assets/fragments/layers/website/${normalized}.html`);
}

/* =============================================================================
   06) PUBLIC API EXPORTS
============================================================================= */
window.NeuroartanFragmentAuthorities = Object.freeze({
  MODULE_ID,
  MODULE_PATH,
  getWebsiteBasePath,
  assetPath,
  getFragmentPaths,
  resolveFragmentPath
});

/* =============================================================================
   07) END OF FILE
============================================================================= */
