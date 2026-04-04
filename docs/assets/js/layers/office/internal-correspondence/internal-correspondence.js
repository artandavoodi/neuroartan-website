/* =============================================================================
   00) FILE INDEX
   01) MODULE IDENTITY
   02) CANONICAL OFFICE SOURCE PATHS
   03) FRAGMENT FETCH HELPER
   04) ASSET ENSURE HELPERS
   05) FRAGMENT MOUNT HELPER
   06) ACTIVE LINK STATE
   07) DEPARTMENT CONTEXT
   08) OFFICE CONTEXT
   09) INTERNAL CORRESPONDENCE INITIALIZATION
   10) BOOT LIFECYCLE
============================================================================= */

(function () {
  'use strict';

  /* =============================================================================
     01) MODULE IDENTITY
     - Office internal-correspondence runtime controller.
     - Consumes sovereign Office layer assets from the canonical website source layer.
     - Preserves menu, sidebar, footer, and department-context behavior.
  ============================================================================= */

  /* =============================================================================
     02) CANONICAL OFFICE SOURCE PATHS
  ============================================================================= */
  const OFFICE_MENU_FRAGMENT_PATH = '/website/docs/assets/fragments/layers/office/menu/office-menu.html';
  const OFFICE_MENU_CSS_PATH = '/website/docs/assets/css/layers/office/menu/office-menu.css';
  const OFFICE_MENU_JS_PATH = '/website/docs/assets/js/layers/office/menu/office-menu.js';
  const OFFICE_SIDEBAR_FRAGMENT_PATH = '/website/docs/assets/fragments/layers/office/sidebar/office-sidebar.html';
  const OFFICE_SIDEBAR_CSS_PATH = '/website/docs/assets/css/layers/office/sidebar/office-sidebar.css';
  const OFFICE_SIDEBAR_JS_PATH = '/website/docs/assets/js/layers/office/sidebar/office-sidebar.js';
  const OFFICE_FOOTER_FRAGMENT_PATH = '/website/docs/assets/fragments/layers/office/footer/office-footer.html';
  const OFFICE_FOOTER_CSS_PATH = '/website/docs/assets/css/layers/office/footer/office-footer.css';
  const OFFICE_FOOTER_JS_PATH = '/website/docs/assets/js/layers/office/footer/office-footer.js';

  /* =============================================================================
     03) FRAGMENT FETCH HELPER
  ============================================================================= */
  async function fetchFragment(path) {
    const response = await fetch(path, { credentials: 'same-origin' });
    if (!response.ok) {
      throw new Error(`Failed to fetch fragment: ${path}`);
    }
    return response.text();
  }

  /* =============================================================================
     04) ASSET ENSURE HELPERS
  ============================================================================= */
  function ensureStylesheet(path, id) {
    if (document.getElementById(id)) return;

    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = path;
    document.head.appendChild(link);
  }

  function ensureScript(path, id) {
    if (document.getElementById(id)) return;

    const script = document.createElement('script');
    script.id = id;
    script.src = path;
    script.defer = true;
    document.body.appendChild(script);
  }

  /* =============================================================================
     05) FRAGMENT MOUNT HELPER
  ============================================================================= */
  async function mountFragment({ mountId, path, name }) {
    const mount = document.getElementById(mountId);
    if (!mount) return null;
    if (mount.dataset.icMounted === 'true') return mount;

    try {
      const markup = await fetchFragment(path);
      mount.innerHTML = markup;
      mount.dataset.icMounted = 'true';

      mount.dispatchEvent(new CustomEvent('fragment:mounted', {
        bubbles: true,
        detail: { name, root: mount, mount }
      }));

      return mount;
    } catch (error) {
      console.error(`[Internal Correspondence] Unable to mount ${name}.`, error);
      return null;
    }
  }

  /* =============================================================================
     06) ACTIVE LINK STATE
  ============================================================================= */
  function setActiveLinks() {
    const currentPath = window.location.pathname.replace(/\/$/, '') || '/';
    const links = Array.from(document.querySelectorAll('.internal-correspondence-link-list a, .internal-correspondence-subcard a'));

    links.forEach((link) => {
      try {
        const url = new URL(link.getAttribute('href'), window.location.origin);
        const linkPath = url.pathname.replace(/\/$/, '') || '/';
        const isExactMatch = linkPath === currentPath;
        link.classList.toggle('is-active', isExactMatch);
        if (isExactMatch) {
          link.setAttribute('aria-current', 'page');
        } else {
          link.removeAttribute('aria-current');
        }
      } catch (error) {
        console.error('[Internal Correspondence] Invalid link path.', error);
      }
    });
  }

  /* =============================================================================
     07) DEPARTMENT CONTEXT
  ============================================================================= */
  function markDepartmentContext() {
    const currentPath = window.location.pathname.toLowerCase();
    const departmentMap = [
      ['governance', 'governance'],
      ['operations', 'operations'],
      ['knowledge', 'knowledge-research'],
      ['research', 'knowledge-research'],
      ['infrastructure', 'infrastructure'],
      ['brand', 'brand'],
      ['communication', 'communication']
    ];

    const matchedDepartment = departmentMap.find(([segment]) => currentPath.includes(segment));
    const department = matchedDepartment ? matchedDepartment[1] : 'operations';

    document.documentElement.dataset.officeDepartment = department;
    document.body.dataset.officeDepartment = department;
  }

  /* =============================================================================
     08) OFFICE CONTEXT
  ============================================================================= */
  function markOfficeContext() {
    document.documentElement.classList.add('office-platform');
    document.body.classList.add('office-platform');
  }

  /* =============================================================================
     09) INTERNAL CORRESPONDENCE INITIALIZATION
  ============================================================================= */
  async function initInternalCorrespondence() {
    markOfficeContext();
    markDepartmentContext();
    ensureStylesheet(OFFICE_MENU_CSS_PATH, 'office-menu-css');
    ensureScript(OFFICE_MENU_JS_PATH, 'office-menu-js');
    ensureStylesheet(OFFICE_SIDEBAR_CSS_PATH, 'office-sidebar-css');
    ensureScript(OFFICE_SIDEBAR_JS_PATH, 'office-sidebar-js');
    ensureStylesheet(OFFICE_FOOTER_CSS_PATH, 'office-footer-css');
    ensureScript(OFFICE_FOOTER_JS_PATH, 'office-footer-js');

    await Promise.all([
      mountFragment({
        mountId: 'menu-mount',
        path: OFFICE_MENU_FRAGMENT_PATH,
        name: 'office-menu'
      }),
      mountFragment({
        mountId: 'sidebar-mount',
        path: OFFICE_SIDEBAR_FRAGMENT_PATH,
        name: 'office-sidebar'
      }),
      mountFragment({
        mountId: 'footer-mount',
        path: OFFICE_FOOTER_FRAGMENT_PATH,
        name: 'office-footer'
      })
    ]);

    setActiveLinks();
  }

  /* =============================================================================
     10) BOOT LIFECYCLE
  ============================================================================= */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initInternalCorrespondence, { once: true });
  } else {
    initInternalCorrespondence();
  }
})();