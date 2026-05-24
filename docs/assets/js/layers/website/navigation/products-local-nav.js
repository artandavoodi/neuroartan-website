/* =============================================================================
   00) FILE INDEX
   01) MODULE IDENTITY
   02) PATH HELPERS
   03) LOCAL NAV REGISTRY
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
     03) LOCAL NAV REGISTRY
  ============================================================================= */
  const LOCAL_NAV_CONFIGS = [
    {
      id: 'products',
      selector: '#products-local-nav-mount',
      pageRootSelector: '.products-page',
      registryUrl: assetPath('/assets/data/sections/products.json'),
      label: 'Products',
      labelHref: '/pages/products/index.html',
      scrolledClass: 'products-local-nav--scrolled',
      activePageClass: 'products-local-nav-active',
      activeBodyClass: 'products-local-nav-active'
    },
    {
      id: 'leadership',
      selector: '#leadership-local-nav-mount',
      pageRootSelector: '.leadership-page',
      registryUrl: '',
      label: 'Leadership',
      labelHref: '/pages/company/leadership/index.html',
      sections: [],
      scrolledClass: 'products-local-nav--scrolled',
      activePageClass: 'products-local-nav-active',
      activeBodyClass: 'products-local-nav-active'
    }
  ];

  const SCROLL_THRESHOLD = 1;

  /* =============================================================================
     04) HELPERS
  ============================================================================= */
  function getMount(config) {
    return document.querySelector(config.selector);
  }

  function getPageRoot(config) {
    return document.querySelector(config.pageRootSelector) || document.body;
  }

  function getLocalNavElement(config) {
    const mount = getMount(config);
    if (!mount) return null;
    return mount.querySelector('.products-local-nav');
  }

  function getLocalNavLabel(config) {
    const mount = getMount(config);
    if (!mount) return null;
    return mount.querySelector('[data-products-local-label]');
  }

  function getLocalNavLinksContainer(config) {
    const mount = getMount(config);
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
  async function loadRegistry(config) {
    if (config.registryUrl) {
      return fetchJson(config.registryUrl);
    }

    return {
      label: config.label,
      labelHref: config.labelHref,
      sections: config.sections || [],
      defaultSection: ''
    };
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
  function renderLocalNav(config, registry, activeSection) {
    const nav = getLocalNavElement(config);
    const label = getLocalNavLabel(config);
    const linksContainer = getLocalNavLinksContainer(config);

    if (!nav || !registry || !linksContainer) return false;

    if (label) {
      label.textContent = registry.label || config.label;
      label.setAttribute('href', registry.labelHref || config.labelHref);
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
  function updateScrollState(config) {
    const nav = getLocalNavElement(config);
    const pageRoot = getPageRoot(config);
    if (!nav || !pageRoot) return;

    const isActive = window.scrollY > SCROLL_THRESHOLD;
    nav.classList.toggle(config.scrolledClass, isActive);
    pageRoot.classList.toggle(config.activePageClass, isActive);
    document.body.classList.toggle(config.activeBodyClass, isActive);
  }

  function bindScrollState(config) {
    let ticking = false;

    const onStateChange = () => {
      if (ticking) return;
      ticking = true;

      window.requestAnimationFrame(() => {
        updateScrollState(config);
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
  async function bootConfig(config) {
    const mount = getMount(config);
    if (!mount) return;

    try {
      const registry = await loadRegistry(config);
      const activeSection = resolveActiveSection(registry);

      const tryRender = () => {
        const rendered = renderLocalNav(config, registry, activeSection);
        if (rendered) {
          bindScrollState(config);
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
      console.error(`[products-local-nav] ${config.id} bootstrap failed`, error);
    }
  }

  async function boot() {
    LOCAL_NAV_CONFIGS.forEach((config) => {
      bootConfig(config);
    });
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