/* =============================================================================
   00) FILE INDEX
   01) GLOBAL LAYOUT INJECTION
   02) RUNTIME STATE
   03) ASSET LOADERS
   04) ASSET URL CANDIDATES
   05) TEXT FETCH HELPERS
   06) ONE-TIME DISPATCH HELPERS
   07) OVERLAY MOUNT DISPATCHERS
   08) FRAGMENT MOUNT BROADCASTERS
   09) GLOBAL LAYOUT INJECTION EXECUTION
   10) FOOTER FRAGMENT INJECTION
   11) CORE LIFECYCLE BINDING
============================================================================= */

/* =============================================================================
   01) GLOBAL LAYOUT INJECTION
============================================================================= */
const WEBSITE_BASE_PATH = (() => {
  const pathname = window.location.pathname || '';

  if (pathname.includes('/website/docs/')) return '/website/docs';
  if (pathname.endsWith('/website/docs')) return '/website/docs';
  if (pathname.includes('/docs/')) return '/docs';
  if (pathname.endsWith('/docs')) return '/docs';

  return '';
})();

function assetPath(path) {
  const normalized = String(path || '').trim();
  if (!normalized) return '';
  return `${WEBSITE_BASE_PATH}${normalized.startsWith('/') ? normalized : `/${normalized}`}`;
}

const FRAGMENT_PATHS = {
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
  'products-sidebar': assetPath('/assets/fragments/layers/website/sections/products/products-sidebar.html'),
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
  'footer': assetPath('/assets/fragments/layers/website/footer/footer.html'),
  'brain-activity': assetPath('/assets/fragments/layers/website/system/brain-activity.html'),
  'system-node': assetPath('/assets/fragments/layers/website/system/system-node.html')
};

/* =============================================================================
   02) RUNTIME STATE
============================================================================= */
const NEURO_MAIN_RUNTIME = (window.__NEURO_MAIN_RUNTIME__ ||= {
  globalLayoutInjected: false,
  footerInjected: false,
  lifecycleBound: false,
  runtimeReadyDispatched: false,
  accountDrawerMountDispatched: false,
  cookieConsentMountDispatched: false,
  countryOverlayMountDispatched: false
});

/* =============================================================================
   03) ASSET LOADERS
============================================================================= */
function loadStylesheetOnce(href) {
  const resolvedHref = new URL(href, window.location.origin).href;
  const alreadyLoaded = Array.from(document.querySelectorAll('link[rel="stylesheet"]')).some((link) => {
    const currentHref = link.getAttribute('href') || '';
    try {
      return new URL(currentHref, window.location.origin).href === resolvedHref;
    } catch (_) {
      return currentHref === href;
    }
  });

  if (alreadyLoaded) return;

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
}

function loadScriptOnce(src) {
  const resolvedSrc = new URL(src, window.location.origin).href;
  const existingScript = Array.from(document.querySelectorAll('script[src]')).find((script) => {
    const currentSrc = script.getAttribute('src') || '';
    try {
      return new URL(currentSrc, window.location.origin).href === resolvedSrc;
    } catch (_) {
      return currentSrc === src;
    }
  });

  if (existingScript) return existingScript;

  const script = document.createElement('script');
  script.src = src;
  script.defer = true;
  script.addEventListener('load', () => {
    script.dataset.scriptLoaded = 'true';
  }, { once: true });
  document.body.appendChild(script);
  return script;
}

/* =============================================================================
   04) ASSET URL CANDIDATES
============================================================================= */
function buildAssetUrlCandidates(path) {
  const normalized = String(path || '').trim();
  if (!normalized) return [];

  const cleanPath = normalized.startsWith('/') ? normalized : `/${normalized}`;
  const relativePath = `.${cleanPath}`;
  const nestedRelativePath = cleanPath.replace(/^\//, '');

  return Array.from(new Set([
    cleanPath,
    relativePath,
    nestedRelativePath
  ]));
}

/* =============================================================================
   05) TEXT FETCH HELPERS
============================================================================= */
async function fetchTextFromCandidates(path, cache = 'no-store') {
  const candidates = buildAssetUrlCandidates(path);

  for (const candidate of candidates) {
    try {
      const res = await fetch(candidate, { cache });
      if (!res.ok) continue;
      const text = await res.text();
      return { ok: true, text, url: candidate };
    } catch (_) {}
  }

  return { ok: false, text: '', url: '' };
}

function resolveFragmentPath(name) {
  const authority = window.NeuroartanFragmentAuthorities;
  if (authority && typeof authority.resolveFragmentPath === 'function') {
    const resolved = authority.resolveFragmentPath(name);
    if (resolved) return resolved;
  }

  const normalized = String(name || '').trim();
  if (!normalized) return '';

  if (normalized.startsWith('/') || normalized.startsWith('./') || normalized.endsWith('.html')) {
    return assetPath(normalized);
  }

  return FRAGMENT_PATHS[normalized] || assetPath(`/assets/fragments/layers/website/${normalized}.html`);
}

/* =============================================================================
   06) ONE-TIME DISPATCH HELPERS
============================================================================= */
function markDispatchOnce(target, key) {
  if (!target || !key) return false;
  if (target.dataset[key] === 'true') return true;
  target.dataset[key] = 'true';
  return false;
}

/* =============================================================================
   07) OVERLAY MOUNT DISPATCHERS
============================================================================= */
function dispatchAccountDrawerMount(mount) {
  const host = mount || document.querySelector('[data-include="account-drawer"]');
  const root = host?.querySelector?.('.account-drawer, [data-account-drawer="root"], #account-drawer') || host;
  const target = host || root;
  if (!root || !target) return;
  if (markDispatchOnce(target, 'accountDrawerMountedDispatched')) return;

  document.dispatchEvent(new CustomEvent('account-drawer:mounted', {
    detail: { name: 'account-drawer', root, mount: host || root }
  }));

  NEURO_MAIN_RUNTIME.accountDrawerMountDispatched = true;
}

function dispatchCookieConsentMount(mount) {
  const host = mount || document.getElementById('cookie-consent-mount');
  const root = host?.querySelector?.('[data-cookie-consent="root"]') || host;
  const target = host || root;
  if (!host || !root || !target) return;
  if (markDispatchOnce(target, 'cookieConsentMountedDispatched')) return;

  document.dispatchEvent(new CustomEvent('cookie-consent:mounted', {
    detail: { name: 'cookie-consent', root, mount: host }
  }));

  NEURO_MAIN_RUNTIME.cookieConsentMountDispatched = true;
}

function dispatchCountryOverlayMount(mount) {
  const host = mount || document.getElementById('country-overlay-mount') || document.querySelector('[data-include="country-overlay"]');
  const root = host?.querySelector?.('#country-overlay, [data-country-overlay="root"]') || host;
  const target = host || root;
  if (!host || !root || !target) return;
  if (markDispatchOnce(target, 'countryOverlayMountedDispatched')) return;

  document.dispatchEvent(new CustomEvent('country-overlay-mounted', {
    detail: { name: 'country-overlay', root, mount: host }
  }));

  NEURO_MAIN_RUNTIME.countryOverlayMountDispatched = true;
}

function dispatchOverlayMounts() {
  dispatchAccountDrawerMount();
  dispatchCookieConsentMount();
  dispatchCountryOverlayMount();
}

/* =============================================================================
   08) FRAGMENT MOUNT BROADCASTERS
============================================================================= */
function broadcastMenuMounted(mount) {
  const host = mount || document.querySelector('[data-include="menu"]') || document.querySelector('[data-include="institutional-menu"]');
  const root = host?.querySelector?.('#institutional-menu, .institutional-menu, [data-menu-root]') || host;
  const target = host || root;
  if (!host || !root || !target) return;
  if (markDispatchOnce(target, 'menuMountedBroadcasted')) return;

  document.dispatchEvent(new CustomEvent('neuroartan:menu-mounted', {
    detail: { name: 'menu', root, mount: host }
  }));
}

function broadcastFooterMounted(mount) {
  const host = mount || document.getElementById('footer-mount') || document.querySelector('footer.site-footer');
  const root = host?.querySelector?.('footer.site-footer') || host;
  const target = host || root;
  if (!host || !root || !target) return;
  if (markDispatchOnce(target, 'footerMountedBroadcasted')) return;

  document.dispatchEvent(new CustomEvent('neuroartan:footer-mounted', {
    detail: { name: 'footer', root, mount: host }
  }));
}

/* =============================================================================
   09) GLOBAL LAYOUT INJECTION EXECUTION
============================================================================= */
async function injectGlobalLayout() {
  if (NEURO_MAIN_RUNTIME.globalLayoutInjected) return;

  let shouldScanAgain = true;

  while (shouldScanAgain) {
    shouldScanAgain = false;
    let mountedInThisPass = false;

    const targets = document.querySelectorAll('[data-include]');
    for (const el of targets) {
      if (el.dataset.includeMounted === 'true') continue;

      const name = el.getAttribute('data-include');
      try {
        const result = await fetchTextFromCandidates(resolveFragmentPath(name), 'no-store');
        if (!result.ok) continue;
        const html = result.text;
        el.innerHTML = html;
        el.dataset.includeMounted = 'true';
        mountedInThisPass = true;

        if (window.NeuroMotion && typeof window.NeuroMotion.scan === 'function') {
          window.NeuroMotion.scan(el);
        }

        el.dispatchEvent(new CustomEvent('fragment:mounted', {
          bubbles: true,
          detail: { name, root: el, mount: el }
        }));

        if (name === 'account-drawer') {
          dispatchAccountDrawerMount(el);
        }

        if (name === 'cookie-consent') {
          dispatchCookieConsentMount(el);
        }

        if (name === 'country-overlay') {
          dispatchCountryOverlayMount(el);
        }

        if (name === 'menu' || name === 'institutional-menu') {
          broadcastMenuMounted(el);
        }
      } catch (_) {}
    }

    if (mountedInThisPass) {
      shouldScanAgain = true;
    }
  }

  NEURO_MAIN_RUNTIME.globalLayoutInjected = true;
}

injectGlobalLayout().then(() => {
  injectFooterIfNeeded();

  if (!NEURO_MAIN_RUNTIME.runtimeReadyDispatched) {
    NEURO_MAIN_RUNTIME.runtimeReadyDispatched = true;
    document.dispatchEvent(new CustomEvent('neuroartan:runtime-ready', {
      detail: {
        source: 'core/03-runtime/global-layout-injection.js'
      }
    }));
  }

  window.requestAnimationFrame(() => {
    dispatchOverlayMounts();
  });
});

/* =============================================================================
   10) FOOTER FRAGMENT INJECTION
============================================================================= */
const FOOTER_FRAGMENT_URL = assetPath('/assets/fragments/layers/website/footer/footer.html');

async function injectFooterIfNeeded() {
  const existing = document.querySelector('footer.site-footer');
  if (existing) {
    NEURO_MAIN_RUNTIME.footerInjected = true;
    return true;
  }

  const mount = document.getElementById('footer-mount');
  if (!mount) return false;

  if (NEURO_MAIN_RUNTIME.footerInjected || mount.dataset.footerInjected === 'true') return true;
  mount.dataset.footerInjected = 'true';

  try {
    const result = await fetchTextFromCandidates(FOOTER_FRAGMENT_URL, 'no-cache');
    if (!result.ok) {
      delete mount.dataset.footerInjected;
      return false;
    }
    const html = result.text;
    mount.innerHTML = html;
    const mountedFooter = mount.querySelector('footer.site-footer');
    if (mountedFooter) {
      if (window.NeuroMotion && typeof window.NeuroMotion.scan === 'function') {
        window.NeuroMotion.scan(mountedFooter);
      }
      mountedFooter.dispatchEvent(new CustomEvent('fragment:mounted', {
        bubbles: true,
        detail: { name: 'footer', root: mountedFooter, mount: mountedFooter }
      }));
      broadcastFooterMounted(mount);
    }
    document.dispatchEvent(new Event('footer-mounted'));
    NEURO_MAIN_RUNTIME.footerInjected = true;
    return true;
  } catch (_) {
    delete mount.dataset.footerInjected;
    return false;
  }
}

/* =============================================================================
   11) CORE LIFECYCLE BINDING
============================================================================= */
document.addEventListener('DOMContentLoaded', () => {
  if (NEURO_MAIN_RUNTIME.lifecycleBound) return;
  NEURO_MAIN_RUNTIME.lifecycleBound = true;

  window.requestAnimationFrame(() => {
    dispatchOverlayMounts();
  });

  document.addEventListener('fragment:mounted', (event) => {
    const mountedName = event?.detail?.name;
    const root = event?.target instanceof Element ? event.target : document;

    if (mountedName === 'account-drawer') {
      dispatchAccountDrawerMount(root);
    }

    if (mountedName === 'cookie-consent') {
      dispatchCookieConsentMount(root);
    }

    if (mountedName === 'country-overlay') {
      dispatchCountryOverlayMount(root);
    }

    if (mountedName === 'menu' || mountedName === 'institutional-menu') {
      broadcastMenuMounted(root);
    }

    if (mountedName === 'footer') {
      broadcastFooterMounted(root);
    }

    window.requestAnimationFrame(() => {
      dispatchOverlayMounts();
    });
  });
});