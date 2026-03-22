/* =================== Global Layout Injection (Future-Proof Shell) =================== */

async function injectGlobalLayout() {
  const targets = document.querySelectorAll('[data-include]');
  for (const el of targets) {
    const name = el.getAttribute('data-include');
    try {
      const res = await fetch(`/assets/fragments/${name}.html`, { cache: 'no-store' });
      if (!res.ok) continue;
      const html = await res.text();
      el.innerHTML = html;

      if (window.NeuroMotion && typeof window.NeuroMotion.scan === 'function') {
        window.NeuroMotion.scan(el);
      }

      el.dispatchEvent(new CustomEvent('fragment:mounted', {
        bubbles: true,
        detail: { name, mount: el }
      }));
    } catch (_) {}
  }
}


injectGlobalLayout();

/* =================== Institutional Menu Fragment Injection =================== */
const INSTITUTIONAL_MENU_FRAGMENT_URL = '/assets/fragments/institutional-menu.html';
const INSTITUTIONAL_MENU_CSS_URL = '/assets/css/navigation/institutional-menu.css';
const INSTITUTIONAL_MENU_JS_URL = '/assets/js/navigation/institutional-menu.js';

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

  if (header.querySelector('#institutional-menu')) {
    loadStylesheetOnce(INSTITUTIONAL_MENU_CSS_URL);
    loadScriptOnce(INSTITUTIONAL_MENU_JS_URL);
    return true;
  }

  const legacyButton = header.querySelector('#menu-button');

  try {
    const res = await fetch(INSTITUTIONAL_MENU_FRAGMENT_URL, { cache: 'no-cache' });
    if (!res.ok) return false;

    const html = await res.text();
    header.insertAdjacentHTML('afterbegin', html);
    const mountedMenu = header.querySelector('#institutional-menu');
    if (mountedMenu) {
      if (window.NeuroMotion && typeof window.NeuroMotion.scan === 'function') {
        window.NeuroMotion.scan(mountedMenu);
      }
      mountedMenu.dispatchEvent(new CustomEvent('fragment:mounted', {
        bubbles: true,
        detail: { name: 'institutional-menu', mount: mountedMenu }
      }));
    }

    if (legacyButton) {
      legacyButton.hidden = true;
      legacyButton.setAttribute('aria-hidden', 'true');
      legacyButton.tabIndex = -1;
      legacyButton.style.display = 'none';
    }

    loadStylesheetOnce(INSTITUTIONAL_MENU_CSS_URL);
    loadScriptOnce(INSTITUTIONAL_MENU_JS_URL);
    return true;
  } catch (_) {
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
    const res = await fetch(FOOTER_FRAGMENT_URL, { cache: 'no-cache' });
    if (!res.ok) return false;
    const html = await res.text();
    mount.innerHTML = html;
    const mountedFooter = mount.querySelector('footer.site-footer');
    if (mountedFooter) {
      if (window.NeuroMotion && typeof window.NeuroMotion.scan === 'function') {
        window.NeuroMotion.scan(mountedFooter);
      }
      mountedFooter.dispatchEvent(new CustomEvent('fragment:mounted', {
        bubbles: true,
        detail: { name: 'footer', mount: mountedFooter }
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

document.addEventListener("DOMContentLoaded", () => {
  injectInstitutionalMenuIfNeeded();
  injectFooterIfNeeded();
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

  /* =================== Custom Cursor (RTL-safe + re-init on language/dir change) =================== */

  let cursorRAF = null;

  function ensureCursorNode() {
    let node = document.querySelector(".custom-cursor");
    if (!node) {
      node = document.createElement("div");
      node.className = "custom-cursor";
      document.body.appendChild(node);
    }
    return node;
  }

  function stopCursorLoop() {
    if (cursorRAF) cancelAnimationFrame(cursorRAF);
    cursorRAF = null;
  }

  function initCustomCursor() {
    stopCursorLoop();

    const customCursor = ensureCursorNode();
    if (!customCursor) return;

    customCursor.style.display = "";
    customCursor.style.opacity = "1";
    customCursor.style.transform = "translate(-50%, -50%) scale(1)";

    let mouseX = 0;
    let mouseY = 0;
    let cursorX = 0;
    let cursorY = 0;
    const speed = 0.15;

    const onMove = (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;

      // Hard-restore in case RTL/dir switches leave it invisible
      if (customCursor.style.display === "none") customCursor.style.display = "";
      if (customCursor.style.opacity === "0") customCursor.style.opacity = "1";
    };

    document.addEventListener("mousemove", onMove, { passive: true });

    const animateCursor = () => {
      cursorX += (mouseX - cursorX) * speed;
      cursorY += (mouseY - cursorY) * speed;
      customCursor.style.left = cursorX + "px";
      customCursor.style.top = cursorY + "px";
      cursorRAF = requestAnimationFrame(animateCursor);
    };

    animateCursor();

    // Pointer-based interaction feedback (RTL-safe)
    document.addEventListener(
      "pointerover",
      (e) => {
        const target = e.target;
        const interactive =
          target &&
          target.closest(
            "button, a, input, select, textarea, [role='button'], .enter-button, .logo-container, .country-option, #country-overlay-close, #country-selector, #language-toggle, #language-dropdown"
          );

        if (interactive) {
          customCursor.style.transform = "translate(-50%, -50%) scale(0.4)";
          customCursor.style.opacity = "0.35";
        }
      },
      { passive: true }
    );

    document.addEventListener(
      "pointerout",
      () => {
        customCursor.style.transform = "translate(-50%, -50%) scale(1)";
        customCursor.style.opacity = "1";
      },
      { passive: true }
    );
  }

  initCustomCursor();

  // Re-init cursor when language / direction changes (RTL flips)
  const reinitCursor = () => {
    // next paint: let other scripts finish updating DOM/dir
    requestAnimationFrame(() => initCustomCursor());
  };

  // Custom events (if your locale system dispatches any)
  window.addEventListener("languagechange", reinitCursor);
  window.addEventListener("neuroartan:language-applied", reinitCursor);
  window.addEventListener("artan:language-applied", reinitCursor);
  window.addEventListener("neuroartan:languageChanged", reinitCursor);
  window.addEventListener("neuroartan:dirChanged", reinitCursor);

  // Mutation observer: catches dir/lang/class flips on html/body
  const mo = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (
        m.type === "attributes" &&
        (m.attributeName === "dir" ||
          m.attributeName === "lang" ||
          m.attributeName === "class")
      ) {
        reinitCursor();
        break;
      }
    }
  });

  mo.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["dir", "lang", "class"],
  });
  mo.observe(document.body, {
    attributes: true,
    attributeFilter: ["dir", "lang", "class"],
  });

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