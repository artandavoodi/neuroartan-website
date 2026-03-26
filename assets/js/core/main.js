/* =================== Global Layout Injection (Future-Proof Shell) =================== */

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

async function injectGlobalLayout() {
  const targets = document.querySelectorAll('[data-include]');
  for (const el of targets) {
    const name = el.getAttribute('data-include');
    try {
      const result = await fetchTextFromCandidates(`/assets/fragments/${name}.html`, 'no-store');
      if (!result.ok) continue;
      const html = result.text;
      el.innerHTML = html;

      if (window.NeuroMotion && typeof window.NeuroMotion.scan === 'function') {
        window.NeuroMotion.scan(el);
      }

      el.dispatchEvent(new CustomEvent('fragment:mounted', {
        bubbles: true,
        detail: { name, root: el, mount: el }
      }));
    } catch (_) {}
  }
}


injectGlobalLayout().then(() => {
  injectInstitutionalMenuIfNeeded();
  injectFooterIfNeeded();
  initInstitutionalLinksReveal(document);
  initLetterHover(document);
  loadStylesheetOnce(CUSTOM_CURSOR_CSS_URL);
  loadScriptOnce(CUSTOM_CURSOR_JS_URL);
});

/* =================== Institutional Menu Fragment Injection =================== */
const INSTITUTIONAL_MENU_FRAGMENT_URL = '/assets/fragments/institutional-menu.html';
const INSTITUTIONAL_MENU_CSS_URL = '/assets/css/navigation/institutional-menu.css';
const INSTITUTIONAL_MENU_JS_URL = '/assets/js/navigation/institutional-menu.js';
const CUSTOM_CURSOR_CSS_URL = '/assets/css/ui/custom-cursor.css';
const CUSTOM_CURSOR_JS_URL = '/assets/js/ui/custom-cursor.js';

function loadStylesheetOnce(href) {
  if (document.querySelector(`link[rel="stylesheet"][href="${href}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
}

function loadScriptOnce(src) {
  if (document.querySelector(`script[src="${src}"]`)) return;
  const script = document.createElement('script');
  script.src = src;
  script.defer = true;
  document.body.appendChild(script);
}

async function injectInstitutionalMenuIfNeeded() {
  const header = document.getElementById('header-controls');
  if (!header) return false;

  loadStylesheetOnce(INSTITUTIONAL_MENU_CSS_URL);
  loadScriptOnce(INSTITUTIONAL_MENU_JS_URL);

  const existingMenu = header.querySelector('#institutional-menu');
  if (existingMenu) {
    const hasPanelSystem = existingMenu.querySelector('.institutional-menu-panels');
    const hasPrimaryTriggers = existingMenu.querySelectorAll('.institutional-menu-panel-trigger').length > 0;

    if (hasPanelSystem && hasPrimaryTriggers) {
      document.dispatchEvent(new CustomEvent('institutional-menu:mounted'));
      return true;
    }

    existingMenu.remove();
  }

  const legacyButton = header.querySelector('#menu-button');

  if (header.dataset.institutionalMenuMounting === 'true') return false;
  header.dataset.institutionalMenuMounting = 'true';

  try {
    const result = await fetchTextFromCandidates(INSTITUTIONAL_MENU_FRAGMENT_URL, 'no-store');
    if (!result.ok) {
      header.dataset.institutionalMenuMounting = 'false';
      return false;
    }

    const html = result.text;
    const staleMenu = header.querySelector('#institutional-menu');
    if (staleMenu) staleMenu.remove();

    header.insertAdjacentHTML('afterbegin', html);

    const mountedMenu = header.querySelector('#institutional-menu');
    const hasPanelSystem = mountedMenu?.querySelector('.institutional-menu-panels');
    const hasPrimaryTriggers = mountedMenu?.querySelectorAll('.institutional-menu-panel-trigger').length > 0;

    if (!mountedMenu || !hasPanelSystem || !hasPrimaryTriggers) {
      header.dataset.institutionalMenuMounting = 'false';
      return false;
    }

    if (window.NeuroMotion && typeof window.NeuroMotion.scan === 'function') {
      window.NeuroMotion.scan(mountedMenu);
    }

    if (legacyButton) {
      legacyButton.hidden = true;
      legacyButton.setAttribute('aria-hidden', 'true');
      legacyButton.tabIndex = -1;
      legacyButton.style.display = 'none';
    }

    mountedMenu.dispatchEvent(new CustomEvent('fragment:mounted', {
      bubbles: true,
      detail: { name: 'institutional-menu', root: mountedMenu, mount: mountedMenu }
    }));

    document.dispatchEvent(new CustomEvent('institutional-menu:mounted'));
    header.dataset.institutionalMenuMounting = 'false';
    return true;
  } catch (_) {
    header.dataset.institutionalMenuMounting = 'false';
    return false;
  }
}

/* =================== Footer Fragment Injection =================== */
const FOOTER_FRAGMENT_URL = '/assets/fragments/footer.html';

async function injectFooterIfNeeded() {
  const existing = document.querySelector('footer.site-footer');
  if (existing) return true;

  const mount = document.getElementById('footer-mount');
  if (!mount) return false;

  if (mount.dataset.footerInjected === 'true') return true;
  mount.dataset.footerInjected = 'true';

  try {
    const result = await fetchTextFromCandidates(FOOTER_FRAGMENT_URL, 'no-cache');
    if (!result.ok) return false;
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
    // Notify locale systems that footer controls now exist
    document.dispatchEvent(new Event('footer-mounted'));
    return true;
  } catch (_) {
    return false;
  }
}

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

function initInstitutionalLinksReveal(root = document) {
  initRevealGroup(root, {
    sectionSelector: '.institutional-links',
    itemSelector: '.institutional-links-column, .institutional-links-social-row',
    initializedKey: 'motionInitialized'
  });
}

/* =================== Text Hover — Subtle Luxury Emphasis =================== */

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

document.addEventListener("DOMContentLoaded", () => {
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
  });

  window.addEventListener('load', () => {
    initInstitutionalLinksReveal(document);
    initLetterHover(document);
  }, { once: true });

  // Init once for the page
  initLetterHover(document);

  // Re-init for dynamically injected overlay items (country/language/menu)
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

});