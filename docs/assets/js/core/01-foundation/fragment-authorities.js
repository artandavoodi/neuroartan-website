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
    'profile-private-menu': assetPath('/assets/fragments/layers/website/profile/private/profile-menu.html'),
    'profile-private-shell': assetPath('/assets/fragments/layers/website/profile/private/profile-shell.html'),
    'profile-private-header': assetPath('/assets/fragments/layers/website/profile/private/profile-header.html'),
    'profile-private-sections': assetPath('/assets/fragments/layers/website/profile/private/profile-sections.html'),
    'profile-private-sidebar': assetPath('/assets/fragments/layers/website/profile/private/profile-sidebar.html'),
    'profile-private-workspace': assetPath('/assets/fragments/layers/website/profile/private/profile-workspace.html'),
    'profile-private-overview-panel': assetPath('/assets/fragments/layers/website/profile/private/profile-overview-panel.html'),
    'profile-private-thought-bank-panel': assetPath('/assets/fragments/layers/website/profile/private/profile-thought-bank-panel.html'),
    'profile-private-thought-composer-panel': assetPath('/assets/fragments/layers/website/profile/private/profile-thought-composer-panel.html'),
    'profile-private-thought-stream-panel': assetPath('/assets/fragments/layers/website/profile/private/profile-thought-stream-panel.html'),
    'profile-private-dashboard-panel': assetPath('/assets/fragments/layers/website/profile/private/profile-dashboard-panel.html'),
    'profile-private-dashboard-metrics-panel': assetPath('/assets/fragments/layers/website/profile/private/profile-dashboard-metrics-panel.html'),
    'profile-private-dashboard-graph-panel': assetPath('/assets/fragments/layers/website/profile/private/profile-dashboard-graph-panel.html'),
    'profile-private-settings-panel': assetPath('/assets/fragments/layers/website/profile/private/profile-settings-panel.html'),
    'profile-private-footer': assetPath('/assets/fragments/layers/website/profile/private/profile-footer.html'),
    'profile-public-menu': assetPath('/assets/fragments/layers/website/profile/public/profile-menu.html'),
    'profile-public-shell': assetPath('/assets/fragments/layers/website/profile/public/profile-shell.html'),
    'profile-public-header': assetPath('/assets/fragments/layers/website/profile/public/profile-header.html'),
    'profile-public-sections': assetPath('/assets/fragments/layers/website/profile/public/profile-sections.html'),
    'profile-public-footer': assetPath('/assets/fragments/layers/website/profile/public/profile-footer.html'),
    'home-featured-functions': assetPath('/assets/fragments/layers/website/sections/home-featured-functions.html'),
    'scroll-to-top': assetPath('/assets/fragments/core/scroll-to-top/scroll-to-top.html'),
    'products-sidebar': assetPath('/assets/fragments/layers/website/sections/products/products-sidebar.html'),
    'products-index-shell': assetPath('/assets/fragments/layers/website/sections/products/products-index-shell.html'),
    'footer': assetPath('/assets/fragments/layers/website/footer/footer.html'),
    'home-dashboard-topbar': assetPath('/assets/fragments/layers/website/home/home-dashboard-topbar.html'),
    'home-sidebar': assetPath('/assets/fragments/layers/website/home/home-sidebar.html'),
    'home-panel-left': assetPath('/assets/fragments/layers/website/home/home-panel-left.html'),
    'home-panel-right': assetPath('/assets/fragments/layers/website/home/home-panel-right.html'),
    'home-search-shell': assetPath('/assets/fragments/layers/website/home/home-search-shell.html'),
    'home-settings-panel': assetPath('/assets/fragments/layers/website/home/home-settings-panel.html'),
    'home-footer': assetPath('/assets/fragments/layers/website/home/home-footer.html'),
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
