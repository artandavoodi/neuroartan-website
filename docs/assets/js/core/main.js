/* =============================================================================
   00) FILE INDEX
   01) GLOBAL LAYOUT INJECTION
   02) RUNTIME STATE
   03) ASSET LOADERS
   04) ASSET URL CANDIDATES
   05) TEXT FETCH HELPERS
   06) OVERLAY MOUNT DISPATCHERS
   07) GLOBAL LAYOUT INJECTION EXECUTION
   08) FOOTER FRAGMENT INJECTION
   09) REVEAL GROUP INITIALIZATION
   10) INSTITUTIONAL LINKS REVEAL
   11) TEXT HOVER INITIALIZATION
   12) DOMCONTENTLOADED LIFECYCLE
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

const CUSTOM_CURSOR_CSS_URL = assetPath('/assets/css/layers/website/ui/custom-cursor.css');
const CUSTOM_CURSOR_JS_URL = assetPath('/assets/js/layers/website/ui/custom-cursor.js');
const COOKIE_LEARNING_OVERLAY_CSS_URL = assetPath('/assets/css/layers/website/overlays/cookie/cookie-learning-overlay.css');
const COOKIE_LEARNING_OVERLAY_JS_URL = assetPath('/assets/js/layers/website/overlays/cookie/cookie-learning-overlay.js');

const FRAGMENT_PATHS = {
  'account-drawer': assetPath('/assets/fragments/layers/website/account/account-drawer.html'),
  'account-sign-in-drawer': assetPath('/assets/fragments/layers/website/account/account-sign-in-drawer.html'),
  'account-sign-up-drawer': assetPath('/assets/fragments/layers/website/account/account-sign-up-drawer.html'),
  'account-provider-apple-sheet': assetPath('/assets/fragments/layers/website/account/account-provider-apple-sheet.html'),
  'account-provider-google-sheet': assetPath('/assets/fragments/layers/website/account/account-provider-google-sheet.html'),
  'account-email-auth-drawer': assetPath('/assets/fragments/layers/website/account/account-email-auth-drawer.html'),
  'account-phone-auth-drawer': assetPath('/assets/fragments/layers/website/account/account-phone-auth-drawer.html'),
  'cookie-consent': assetPath('/assets/fragments/layers/website/cookie/cookie-consent.html'),
  'cookie-language-overlay': assetPath('/assets/fragments/layers/website/cookie/cookie-language-overlay.html'),
  'cookie-learning-overlay': assetPath('/assets/fragments/layers/website/cookie/cookie-learning-overlay.html'),
  'country-overlay': assetPath('/assets/fragments/layers/website/country/country-overlay.html'),
  'institutional-links': assetPath('/assets/fragments/layers/website/navigation/institutional-links.html'),
  'institutional-menu': assetPath('/assets/fragments/layers/website/navigation/institutional-menu.html'),
  'menu': assetPath('/assets/fragments/layers/website/navigation/menu.html'),
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
  hoverObserverBound: false,
  overlayMountObserverBound: false,
  accountDrawerMountDispatched: false,
  cookieConsentMountDispatched: false,
  countryOverlayMountDispatched: false
});
/* =============================================================================
   06) OVERLAY MOUNT DISPATCHERS
============================================================================= */
function dispatchCountryOverlayMount(mount) {
  const host = mount || document.getElementById('country-overlay-mount') || document.querySelector('[data-include="country-overlay"]');
  const root = host?.querySelector?.('#country-overlay, [data-country-overlay="root"]') || host;
  if (!host || !root) return;

  document.dispatchEvent(new CustomEvent('country-overlay-mounted', {
    detail: { name: 'country-overlay', root, mount: host }
  }));

  NEURO_MAIN_RUNTIME.countryOverlayMountDispatched = true;
}

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
  return FRAGMENT_PATHS[name] || assetPath(`/assets/fragments/layers/website/${name}.html`);
}

function dispatchAccountDrawerMount(mount) {
  const host = mount || document.querySelector('[data-include="account-drawer"]');
  const root = host?.querySelector?.('.account-drawer, [data-account-drawer="root"], #account-drawer') || host;
  if (!root) return;

  document.dispatchEvent(new CustomEvent('account-drawer:mounted', {
    detail: { name: 'account-drawer', root, mount: host || root }
  }));

  NEURO_MAIN_RUNTIME.accountDrawerMountDispatched = true;
}
function dispatchCookieConsentMount(mount) {
  const host = mount || document.getElementById('cookie-consent-mount');
  const root = host?.querySelector?.('[data-cookie-consent="root"]') || host;
  if (!host || !root) return;

  document.dispatchEvent(new CustomEvent('cookie-consent:mounted', {
    detail: { name: 'cookie-consent', root, mount: host }
  }));

  NEURO_MAIN_RUNTIME.cookieConsentMountDispatched = true;
}
function dispatchOverlayMounts() {
  dispatchAccountDrawerMount();
  dispatchCookieConsentMount();
  dispatchCountryOverlayMount();
}

/* =============================================================================
   07) GLOBAL LAYOUT INJECTION EXECUTION
============================================================================= */
async function injectGlobalLayout() {
  if (NEURO_MAIN_RUNTIME.globalLayoutInjected) return;

  let foundUnrenderedInclude = true;

  while (foundUnrenderedInclude) {
    foundUnrenderedInclude = false;

    const targets = document.querySelectorAll('[data-include]');
    for (const el of targets) {
      if (el.dataset.includeMounted === 'true') continue;

      foundUnrenderedInclude = true;

      const name = el.getAttribute('data-include');
      try {
        const result = await fetchTextFromCandidates(resolveFragmentPath(name), 'no-store');
        if (!result.ok) continue;
        const html = result.text;
        el.innerHTML = html;
        el.dataset.includeMounted = 'true';

        if (window.NeuroMotion && typeof window.NeuroMotion.scan === 'function') {
          window.NeuroMotion.scan(el);
        }

        el.dispatchEvent(new CustomEvent('fragment:mounted', {
          bubbles: true,
          detail: { name, root: el, mount: el }
        }));
        /* =============================================================================
           07A) OVERLAY-SPECIFIC MOUNT DISPATCH
        ============================================================================= */
        if (name === 'account-drawer') {
          dispatchAccountDrawerMount(el);
        }

        if (name === 'cookie-consent') {
          dispatchCookieConsentMount(el);
        }

        if (name === 'country-overlay') {
          dispatchCountryOverlayMount(el);
        }
      } catch (_) {}
    }
  }

  NEURO_MAIN_RUNTIME.globalLayoutInjected = true;
}

injectGlobalLayout().then(() => {
  injectFooterIfNeeded();
  initInstitutionalLinksReveal(document);
  initLetterHover(document);
  loadStylesheetOnce(CUSTOM_CURSOR_CSS_URL);
  loadScriptOnce(CUSTOM_CURSOR_JS_URL);
  loadStylesheetOnce(COOKIE_LEARNING_OVERLAY_CSS_URL);
  loadScriptOnce(COOKIE_LEARNING_OVERLAY_JS_URL);

  window.requestAnimationFrame(() => {
    dispatchOverlayMounts();
  });
});

/* =============================================================================
   08) FOOTER FRAGMENT INJECTION
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
   09) REVEAL GROUP INITIALIZATION
============================================================================= */
function initRevealGroup(root = document, config = {}) {
  const {
    sectionSelector,
    itemSelector,
    initializedKey,
    threshold = 0.18,
    rootMargin = '0px 0px -10% 0px'
  } = config;

  if (!sectionSelector || !itemSelector || !initializedKey) return;

  const scope = root instanceof Element || root instanceof Document ? root : document;
  const section = scope.matches?.(sectionSelector)
    ? scope
    : scope.querySelector?.(sectionSelector);

  if (!section || section.dataset[initializedKey] === 'true') return;

  const items = section.querySelectorAll(itemSelector);
  if (!items.length) return;

  items.forEach((item) => item.classList.add('motion-init'));

  if (!('IntersectionObserver' in window)) {
    items.forEach((item) => item.classList.add('motion-visible'));
    section.dataset[initializedKey] = 'true';
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && entry.intersectionRatio > threshold) {
          entry.target.classList.add('motion-visible');
        } else {
          entry.target.classList.remove('motion-visible');
        }
      });
    },
    {
      threshold: [0, threshold, 0.32, 0.5],
      rootMargin
    }
  );

  items.forEach((item) => observer.observe(item));
  section.dataset[initializedKey] = 'true';
}

/* =============================================================================
   10) INSTITUTIONAL LINKS REVEAL
============================================================================= */
function initInstitutionalLinksReveal(root = document) {
  initRevealGroup(root, {
    sectionSelector: '.institutional-links',
    itemSelector: '.institutional-links-column, .institutional-links-social-row, .institutional-links-separator-row',
    initializedKey: 'motionInitialized'
  });
}

/* =============================================================================
   11) TEXT HOVER INITIALIZATION
============================================================================= */

function initLetterHover(root = document) {
  const selectors = [
    "a",
    "button",
    "[role='button']",
    ".country-option",
    "#country-selector",
    "#language-toggle",
    "#language-dropdown button",
    ".language-dropdown button",
    ".language-dropdown a",
    ".language-option",
    ".lang-option",
    "[data-i18n][tabindex]",
    ".menu-list a",
    ".menu-list button"
  ];

  const elements = root.querySelectorAll(selectors.join(","));

  elements.forEach((el) => {
    if (!el || el.dataset.letterified) return;
    if (el.children && el.children.length > 0) return;
    if (el.dataset.noLetterHover === "true") return;
    if (
      el.closest(
        "#institutional-menu, .institutional-menu, .institutional-menu-panels, .institutional-menu-nav, .institutional-menu-utility"
      )
    ) return;

    const raw = el.textContent || "";
    const text = raw.trim();
    if (!text) return;

    el.dataset.letterified = "true";
    el.style.transition = "color 220ms ease, opacity 220ms ease, transform 220ms ease";
    el.style.transformOrigin = "center center";

    el.addEventListener(
      "mouseenter",
      () => {
        el.style.opacity = "1";
        el.style.transform = "scale(1.01)";
      },
      { passive: true }
    );

    el.addEventListener(
      "mouseleave",
      () => {
        el.style.opacity = "1";
        el.style.transform = "scale(1)";
      },
      { passive: true }
    );
  });
}

/* =============================================================================
   12) DOMCONTENTLOADED LIFECYCLE
============================================================================= */
document.addEventListener("DOMContentLoaded", () => {
  if (NEURO_MAIN_RUNTIME.lifecycleBound) return;
  NEURO_MAIN_RUNTIME.lifecycleBound = true;

  initInstitutionalLinksReveal(document);

  initRevealGroup(document, {
    sectionSelector: '#home-icos-chapter',
    itemSelector: '.home-icos-chapter-figure, .home-icos-chapter-left, .home-icos-chapter-right',
    initializedKey: 'motionIcosInitialized'
  });

  initRevealGroup(document, {
    sectionSelector: '.home-updates-chapter',
    itemSelector: '.home-title, .home-text',
    initializedKey: 'motionUpdatesInitialized'
  });

  initRevealGroup(document, {
    sectionSelector: '.home-featured-chapter',
    itemSelector: '.featured-header, .featured-grid',
    initializedKey: 'motionFeaturedInitialized'
  });

  initRevealGroup(document, {
    sectionSelector: '.home-insights-chapter',
    itemSelector: '.featured-header, .notes-list',
    initializedKey: 'motionInsightsInitialized'
  });

  initRevealGroup(document, {
    sectionSelector: '.home-closing-chapter',
    itemSelector: '.home-closing-line',
    initializedKey: 'motionClosingInitialized'
  });

  document.addEventListener('fragment:mounted', (event) => {
    const root = event?.target instanceof Element ? event.target : document;

    initInstitutionalLinksReveal(root);
    initLetterHover(root);

    initRevealGroup(root, {
      sectionSelector: '#home-icos-chapter',
      itemSelector: '.home-icos-chapter-figure, .home-icos-chapter-left, .home-icos-chapter-right',
      initializedKey: 'motionIcosInitialized'
    });

    initRevealGroup(root, {
      sectionSelector: '.home-updates-chapter',
      itemSelector: '.home-title, .home-text',
      initializedKey: 'motionUpdatesInitialized'
    });

    initRevealGroup(root, {
      sectionSelector: '.home-featured-chapter',
      itemSelector: '.featured-header, .featured-grid',
      initializedKey: 'motionFeaturedInitialized'
    });

    initRevealGroup(root, {
      sectionSelector: '.home-insights-chapter',
      itemSelector: '.featured-header, .notes-list',
      initializedKey: 'motionInsightsInitialized'
    });

    initRevealGroup(root, {
      sectionSelector: '.home-closing-chapter',
      itemSelector: '.home-closing-line',
      initializedKey: 'motionClosingInitialized'
    });

    window.requestAnimationFrame(() => {
      dispatchOverlayMounts();
    });
  });

  window.addEventListener('load', () => {
    initInstitutionalLinksReveal(document);
    initLetterHover(document);
  }, { once: true });

  initLetterHover(document);

  window.requestAnimationFrame(() => {
    dispatchOverlayMounts();
  });

  if (!NEURO_MAIN_RUNTIME.hoverObserverBound) {
    const hoverMO = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === "childList" && (m.addedNodes?.length || 0) > 0) {
          m.addedNodes.forEach((n) => {
            if (n && n.nodeType === 1) initLetterHover(n);
          });
        }
      }
    });

    hoverMO.observe(document.body, { childList: true, subtree: true });
    NEURO_MAIN_RUNTIME.hoverObserverBound = true;
  }

  if (!NEURO_MAIN_RUNTIME.overlayMountObserverBound) {
    const overlayMountMO = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type !== 'childList' || !(mutation.addedNodes?.length > 0)) continue;

        let shouldDispatch = false;

        mutation.addedNodes.forEach((node) => {
          if (!(node instanceof Element)) return;

          if (
            node.matches?.('.account-drawer, [data-account-drawer="root"], #account-drawer, #cookie-consent-mount, [data-cookie-consent="root"], #country-overlay-mount, #country-overlay, [data-country-overlay="root"]')
            || node.querySelector?.('.account-drawer, [data-account-drawer="root"], #account-drawer, #cookie-consent-mount, [data-cookie-consent="root"], #country-overlay-mount, #country-overlay, [data-country-overlay="root"]')
          ) {
            shouldDispatch = true;
          }
        });

        if (shouldDispatch) {
          window.requestAnimationFrame(() => {
            dispatchOverlayMounts();
          });
        }
      }
    });

    overlayMountMO.observe(document.body, { childList: true, subtree: true });
    NEURO_MAIN_RUNTIME.overlayMountObserverBound = true;
  }
});