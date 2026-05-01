/* =============================================================================
   00) FILE INDEX
   01) MODULE IDENTITY
   02) PATH HELPERS
   03) CONSTANTS
   04) HELPERS
   05) REGISTRY LOADER
   06) SECTION RESOLUTION
   07) RENDERERS
   08) SCROLL STATE
   09) BOOTSTRAP
   10) INITIALIZATION
============================================================================= */

/* =============================================================================
   01) MODULE IDENTITY
============================================================================= */
(() => {
  'use strict';

  /* =============================================================================
     02) PATH HELPERS
  ============================================================================= */
  const WEBSITE_BASE_PATH = (() => {
    const pathname = window.location.pathname || '';

    if (pathname.includes('/website/docs/')) return '/website/docs';
    if (pathname.endsWith('/website/docs')) return '/website/docs';
    if (pathname.includes('/docs/')) return '/docs';
    if (pathname.endsWith('/docs')) return '/docs';

    return '';
  })();

  const assetPath = (path) => {
    const normalized = String(path || '').trim();
    if (!normalized) return '';
    return `${WEBSITE_BASE_PATH}${normalized.startsWith('/') ? normalized : `/${normalized}`}`;
  };

  const normalizePath = (path) => {
    const value = String(path || '').trim();
    if (!value) return '/';

    const clean = value.endsWith('/') ? value.slice(0, -1) || '/' : value;
    return clean.endsWith('/index.html') ? clean.slice(0, -'/index.html'.length) || '/' : clean;
  };

  /* =============================================================================
     03) CONSTANTS
  ============================================================================= */
  const PRODUCTS_REGISTRY_URL = assetPath('/assets/data/sections/products.json');
  const LOCAL_NAV_SELECTOR = '#products-local-nav-mount';
  const SCROLLED_CLASS = 'products-local-nav--scrolled';
  const ACTIVE_PAGE_CLASS = 'products-local-nav-active';
  const ACTIVE_BODY_CLASS = 'products-local-nav-active';
  const SCROLL_THRESHOLD = 1;

  /* =============================================================================
     04) HELPERS
  ============================================================================= */
  function getMount() {
    return document.querySelector(LOCAL_NAV_SELECTOR);
  }

  function getPageRoot() {
    return document.querySelector('.products-page') || document.body;
  }

  function getLocalNavElement() {
    const mount = getMount();
    if (!mount) return null;
    return mount.querySelector('.products-local-nav');
  }

  function getLocalNavLabel() {
    const mount = getMount();
    if (!mount) return null;
    return mount.querySelector('[data-products-local-label]');
  }

  function getLocalNavLinksContainer() {
    const mount = getMount();
    if (!mount) return null;
    return mount.querySelector('[data-products-local-links]');
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  async function fetchJson(url) {
    const response = await fetch(url, { cache: 'no-cache' });
    if (!response.ok) {
      throw new Error(`Failed to load ${url}: HTTP ${response.status}`);
    }
    return response.json();
  }

  /* =============================================================================
     05) REGISTRY LOADER
  ============================================================================= */
  async function loadRegistry() {
    return fetchJson(PRODUCTS_REGISTRY_URL);
  }

  /* =============================================================================
     06) SECTION RESOLUTION
  ============================================================================= */
  function resolveActiveSection(registry) {
    const currentPath = normalizePath(window.location.pathname || '/');
    const sections = Array.isArray(registry?.sections) ? registry.sections : [];
    const matched = sections.find((section) => normalizePath(section.route) === currentPath);
    const fallback = sections.find((section) => section.id === registry?.defaultSection);
    return matched || fallback || sections[0] || null;
  }

  /* =============================================================================
     07) RENDERERS
  ============================================================================= */
  function renderLocalNav(registry, activeSection) {
    const nav = getLocalNavElement();
    const label = getLocalNavLabel();
    const linksContainer = getLocalNavLinksContainer();

    if (!nav || !registry || !linksContainer) return false;

    if (label) {
      label.textContent = registry.label || 'Products';
      label.setAttribute('href', '/pages/products/index.html');
    }

    const links = (registry.sections || [])
      .filter((section) => section.showInTopbar)
      .map((section) => {
        const isActive = activeSection && section.id === activeSection.id;
        const className = [
          'products-local-nav__link',
          isActive ? 'products-local-nav__link--active' : ''
        ].filter(Boolean).join(' ');

        return `<a class="${className}" href="${escapeHtml(section.route)}" data-products-local-link="${escapeHtml(section.id)}" aria-current="${isActive ? 'page' : 'false'}">${escapeHtml(section.label)}</a>`;
      })
      .join('');

    linksContainer.innerHTML = links;
    return true;
  }

  /* =============================================================================
     08) SCROLL STATE
  ============================================================================= */
  function updateScrollState() {
    const nav = getLocalNavElement();
    const pageRoot = getPageRoot();
    if (!nav || !pageRoot) return;

    const isActive = window.scrollY > SCROLL_THRESHOLD;
    nav.classList.toggle(SCROLLED_CLASS, isActive);
    pageRoot.classList.toggle(ACTIVE_PAGE_CLASS, isActive);
    document.body.classList.toggle(ACTIVE_BODY_CLASS, isActive);
  }

  function bindScrollState() {
    let ticking = false;

    const onStateChange = () => {
      if (ticking) return;
      ticking = true;

      window.requestAnimationFrame(() => {
        updateScrollState();
        ticking = false;
      });
    };

    onStateChange();
    window.addEventListener('scroll', onStateChange, { passive: true });
    window.addEventListener('resize', onStateChange, { passive: true });
    window.addEventListener('load', onStateChange, { once: true });
  }

  /* =============================================================================
     09) BOOTSTRAP
  ============================================================================= */
  async function boot() {
    const mount = getMount();
    if (!mount) return;

    try {
      const registry = await loadRegistry();
      const activeSection = resolveActiveSection(registry);

      const tryRender = () => {
        const rendered = renderLocalNav(registry, activeSection);
        if (rendered) {
          bindScrollState();
          return true;
        }
        return false;
      };

      if (tryRender()) return;

      const observer = new MutationObserver(() => {
        if (tryRender()) {
          observer.disconnect();
        }
      });

      observer.observe(mount, { childList: true, subtree: true });
    } catch (error) {
      console.error('[products-local-nav] bootstrap failed', error);
    }
  }

  /* =============================================================================
     10) INITIALIZATION
  ============================================================================= */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();