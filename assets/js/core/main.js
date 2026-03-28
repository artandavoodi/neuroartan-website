/* =============================================================================
   00) FILE INDEX
   01) GLOBAL LAYOUT INJECTION
   02) RUNTIME STATE
   03) ASSET LOADERS
   04) ASSET URL CANDIDATES
   05) TEXT FETCH HELPERS
   06) GLOBAL LAYOUT INJECTION EXECUTION
   06A) ACCOUNT DRAWER MOUNT DISPATCH
   06B) COOKIE CONSENT MOUNT DISPATCH
   06C) OVERLAY MOUNT RE-DISPATCH
   07) FOOTER FRAGMENT INJECTION
   08) REVEAL GROUP INITIALIZATION
   09) INSTITUTIONAL LINKS REVEAL
   10) TEXT HOVER INITIALIZATION
   11) DOMCONTENTLOADED LIFECYCLE
============================================================================= */

/* =============================================================================
   01) GLOBAL LAYOUT INJECTION
============================================================================= */
const CUSTOM_CURSOR_CSS_URL = '/assets/css/ui/custom-cursor.css';
const CUSTOM_CURSOR_JS_URL = '/assets/js/ui/custom-cursor.js';

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
  cookieConsentMountDispatched: false
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
  const alreadyLoaded = Array.from(document.querySelectorAll('script[src]')).some((script) => {
    const currentSrc = script.getAttribute('src') || '';
    try {
      return new URL(currentSrc, window.location.origin).href === resolvedSrc;
    } catch (_) {
      return currentSrc === src;
    }
  });

  if (alreadyLoaded) return;

  const script = document.createElement('script');
  script.src = src;
  script.defer = true;
  document.body.appendChild(script);
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

/* =============================================================================
   06A) ACCOUNT DRAWER MOUNT DISPATCH
============================================================================= */
function dispatchAccountDrawerMount(mount) {
  const host = mount || document.querySelector('[data-include="account-drawer"]');
  const root = host?.querySelector?.('.account-drawer, [data-account-drawer="root"], #account-drawer') || host;
  if (!root) return;

  document.dispatchEvent(new CustomEvent('account-drawer:mounted', {
    detail: { name: 'account-drawer', root, mount: host || root }
  }));

  NEURO_MAIN_RUNTIME.accountDrawerMountDispatched = true;
}

/* =============================================================================
   06B) COOKIE CONSENT MOUNT DISPATCH
============================================================================= */
function dispatchCookieConsentMount(mount) {
  const host = mount || document.getElementById('cookie-consent-mount');
  const root = host?.querySelector?.('[data-cookie-consent="root"]') || host;
  if (!host || !root) return;

  document.dispatchEvent(new CustomEvent('cookie-consent:mounted', {
    detail: { name: 'cookie-consent', root, mount: host }
  }));

  NEURO_MAIN_RUNTIME.cookieConsentMountDispatched = true;
}

/* =============================================================================
   06C) OVERLAY MOUNT RE-DISPATCH
============================================================================= */
function dispatchOverlayMounts() {
  dispatchAccountDrawerMount();
  dispatchCookieConsentMount();
}

/* =============================================================================
   06) GLOBAL LAYOUT INJECTION EXECUTION
============================================================================= */
async function injectGlobalLayout() {
  if (NEURO_MAIN_RUNTIME.globalLayoutInjected) return;

  const targets = document.querySelectorAll('[data-include]');
  for (const el of targets) {
    if (el.dataset.includeMounted === 'true') continue;

    const name = el.getAttribute('data-include');
    try {
      const result = await fetchTextFromCandidates(`/assets/fragments/${name}.html`, 'no-store');
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
         06A) ACCOUNT DRAWER / COOKIE CONSENT MOUNT DISPATCH
      ============================================================================= */
      if (name === 'account-drawer') {
        dispatchAccountDrawerMount(el);
      }

      if (name === 'cookie-consent') {
        dispatchCookieConsentMount(el);
      }
    } catch (_) {}
  }

  NEURO_MAIN_RUNTIME.globalLayoutInjected = true;
}

injectGlobalLayout().then(() => {
  injectFooterIfNeeded();
  initInstitutionalLinksReveal(document);
  initLetterHover(document);
  loadStylesheetOnce(CUSTOM_CURSOR_CSS_URL);
  loadScriptOnce(CUSTOM_CURSOR_JS_URL);

  window.requestAnimationFrame(() => {
    dispatchOverlayMounts();
  });
});

/* =============================================================================
   07) FOOTER FRAGMENT INJECTION
============================================================================= */
const FOOTER_FRAGMENT_URL = '/assets/fragments/footer.html';

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
   08) REVEAL GROUP INITIALIZATION
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
   09) INSTITUTIONAL LINKS REVEAL
============================================================================= */
function initInstitutionalLinksReveal(root = document) {
  initRevealGroup(root, {
    sectionSelector: '.institutional-links',
    itemSelector: '.institutional-links-column, .institutional-links-social-row',
    initializedKey: 'motionInitialized'
  });
}

/* =============================================================================
   10) TEXT HOVER INITIALIZATION
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
   11) DOMCONTENTLOADED LIFECYCLE
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
            node.matches?.('.account-drawer, [data-account-drawer="root"], #account-drawer, #cookie-consent-mount, [data-cookie-consent="root"]')
            || node.querySelector?.('.account-drawer, [data-account-drawer="root"], #account-drawer, #cookie-consent-mount, [data-cookie-consent="root"]')
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