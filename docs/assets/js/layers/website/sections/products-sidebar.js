/* =============================================================================
   00) FILE INDEX
   01) MODULE IDENTITY
   02) CONSTANTS
   03) PATH HELPERS
   04) HELPERS
   05) REGISTRY LOADER
   06) SIDEBAR STATE
   07) SIDEBAR CONTENT SYNC
   08) ACTIVE ANCHOR SYNC
   09) TOGGLE BINDING
   10) NAV LINK BINDING
   11) FRAGMENT HYDRATION
   12) BOOTSTRAP
   13) INITIALIZATION
============================================================================= */

/* =============================================================================
   01) MODULE IDENTITY
============================================================================= */
(() => {
  'use strict';

  /* =============================================================================
     02) CONSTANTS
  ============================================================================= */
  const ROOT_SELECTOR = '.products-page, .products-overview-page';
  const TOGGLE_SELECTOR = '[data-products-sidebar-toggle]';
  const STATE_ATTR = 'data-products-sidebar-open';
  const TITLE_SELECTOR = '[data-products-sidebar-title]';
  const DESCRIPTION_SELECTOR = '[data-products-sidebar-description]';
  const NAV_LIST_SELECTOR = '[data-products-sidebar-list]';
  const PRODUCTS_REGISTRY_URL = '/assets/data/sections/products.json';

  /* =============================================================================
     03) PATH HELPERS
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

  /* =============================================================================
     04) HELPERS
  ============================================================================= */
  function getRoot() {
    return document.querySelector(ROOT_SELECTOR);
  }

  function getToggle(root) {
    return root ? root.querySelector(TOGGLE_SELECTOR) : null;
  }

  function getTitle(root) {
    return root ? root.querySelector(TITLE_SELECTOR) : null;
  }

  function getDescription(root) {
    return root ? root.querySelector(DESCRIPTION_SELECTOR) : null;
  }

  function getNavList(root) {
    return root ? root.querySelector(NAV_LIST_SELECTOR) : null;
  }

  function isOpen(root) {
    return root?.getAttribute(STATE_ATTR) === 'true';
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function normalizePath(path) {
    const value = String(path || '').trim();
    if (!value) return '/';

    const clean = value.endsWith('/') ? value.slice(0, -1) || '/' : value;
    return clean.endsWith('/index.html') ? clean.slice(0, -'/index.html'.length) || '/' : clean;
  }

  function resolveActiveSection(registry) {
    const currentPath = normalizePath(window.location.pathname || '/');
    const sections = Array.isArray(registry?.sections) ? registry.sections : [];
    const matched = sections.find((section) => normalizePath(section.route) === currentPath);
    const fallback = sections.find((section) => section.id === registry?.defaultSection);
    return matched || fallback || sections[0] || null;
  }

  /* =============================================================================
     05) REGISTRY LOADER
  ============================================================================= */
  async function fetchJson(url) {
    const response = await fetch(url, { cache: 'no-cache' });
    if (!response.ok) {
      throw new Error(`Failed to load ${url}: HTTP ${response.status}`);
    }
    return response.json();
  }

  async function loadLocalRegistry() {
    const productsRegistry = await fetchJson(assetPath(PRODUCTS_REGISTRY_URL));
    const activeSection = resolveActiveSection(productsRegistry);
    const localSourcePath = String(activeSection?.localNavigationSource?.path || '').trim();

    if (!localSourcePath) return null;

    return fetchJson(assetPath(localSourcePath));
  }

  /* =============================================================================
     06) SIDEBAR STATE
  ============================================================================= */
  function syncState(root) {
    const toggle = getToggle(root);
    const open = isOpen(root);

    if (toggle) {
      toggle.setAttribute('aria-expanded', String(open));
    }
  }

  function setState(root, open) {
    if (!root) return;
    root.setAttribute(STATE_ATTR, String(Boolean(open)));
    syncState(root);
  }

  /* =============================================================================
     07) SIDEBAR CONTENT SYNC
  ============================================================================= */
  function syncSidebarContent(root, registry) {
    if (!root || !registry) return;

    const title = getTitle(root);
    const description = getDescription(root);
    const navList = getNavList(root);

    if (title) {
      title.textContent = registry.page?.title || registry.title || 'Overview';
    }

    if (description) {
      description.textContent = registry.page?.description || registry.description || '';
    }

    if (navList && Array.isArray(registry.sections)) {
      navList.innerHTML = registry.sections.map((section) => `
        <li class="products-sidebar__item">
          <a class="products-sidebar__link" href="${escapeHtml(section.anchor || '#')}" data-products-nav="${escapeHtml(section.id)}">${escapeHtml(section.label || section.title || '')}</a>
        </li>
      `).join('');
    }
  }

  /* =============================================================================
     08) ACTIVE ANCHOR SYNC
  ============================================================================= */
  function syncActiveAnchor(root, registry = null) {
    if (!root) return;

    const currentHash = window.location.hash || '';
    const defaultAnchor = registry?.sections?.find((section) => section.id === registry?.defaultSection)?.anchor
      || registry?.sections?.[0]?.anchor
      || '';
    const links = root.querySelectorAll('[data-products-nav]');

    links.forEach((link) => {
      if (!(link instanceof HTMLAnchorElement)) return;

      const href = link.getAttribute('href') || '';
      const isActive = currentHash
        ? href === currentHash
        : Boolean(defaultAnchor) && href === defaultAnchor;

      link.classList.toggle('products-sidebar__link--active', isActive);
      link.setAttribute('aria-current', isActive ? 'location' : 'false');
    });
  }

  function hydrateSidebar(root, registry) {
    if (!root || !registry) return false;

    const title = getTitle(root);
    const navList = getNavList(root);

    if (!title || !navList) return false;

    syncSidebarContent(root, registry);
    syncActiveAnchor(root, registry);
    syncState(root);
    return true;
  }

  /* =============================================================================
     09) TOGGLE BINDING
  ============================================================================= */
  function bindToggle(root) {
    if (!root || root.getAttribute('data-products-sidebar-root-bound') === 'true') return;

    root.setAttribute('data-products-sidebar-root-bound', 'true');
    root.addEventListener('click', (event) => {
      const toggle = event.target instanceof Element
        ? event.target.closest(TOGGLE_SELECTOR)
        : null;

      if (!toggle) return;

      setState(root, !isOpen(root));
    });
  }

  /* =============================================================================
     10) NAV LINK BINDING
  ============================================================================= */
  function bindNavLinks(root) {
    if (!root || root.getAttribute('data-products-sidebar-nav-bound') === 'true') return;

    root.setAttribute('data-products-sidebar-nav-bound', 'true');
    root.addEventListener('click', (event) => {
      const link = event.target instanceof Element
        ? event.target.closest('[data-products-nav]')
        : null;

      if (!(link instanceof HTMLAnchorElement)) return;

      window.requestAnimationFrame(() => {
        setState(root, false);
        syncActiveAnchor(root);
      });
    });
  }

  /* =============================================================================
     11) FRAGMENT HYDRATION
  ============================================================================= */
  function observeFragmentHydration(root, registry) {
    if (!root || !registry) return;
    if (root.getAttribute('data-products-sidebar-hydration-bound') === 'true') return;

    root.setAttribute('data-products-sidebar-hydration-bound', 'true');

    if (hydrateSidebar(root, registry)) {
      return;
    }

    const observer = new MutationObserver(() => {
      if (!hydrateSidebar(root, registry)) return;
      observer.disconnect();
    });

    observer.observe(root, {
      childList: true,
      subtree: true
    });
  }

  /* =============================================================================
     12) BOOTSTRAP
  ============================================================================= */
  async function boot() {
    const root = getRoot();
    if (!root) return;

    if (!root.hasAttribute(STATE_ATTR)) {
      root.setAttribute(STATE_ATTR, 'false');
    }

    const registry = await loadLocalRegistry().catch(() => null);

    syncState(root);
    bindToggle(root);
    bindNavLinks(root);
    observeFragmentHydration(root, registry);

    window.addEventListener('hashchange', () => {
      syncActiveAnchor(root, registry);
    });
  }

  /* =============================================================================
     13) INITIALIZATION
  ============================================================================= */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
