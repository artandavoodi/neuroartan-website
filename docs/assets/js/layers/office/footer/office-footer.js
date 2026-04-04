/* =============================================================================
   00) FILE INDEX
   01) MODULE IDENTITY
   02) PATH NORMALIZATION
   03) ACTIVE LINK STATE
   04) FOOTER BINDING
   05) BOOT LIFECYCLE
   06) FRAGMENT RE-BIND
============================================================================= */

(function () {
  'use strict';

  /* =============================================================================
     01) MODULE IDENTITY
     - Office footer layer runtime.
     - Lives in the website canonical source under the Office layer branch.
     - Preserves sovereign Office footer behavior while consuming canonical core runtime.
  ============================================================================= */

  /* =============================================================================
     02) PATH NORMALIZATION
  ============================================================================= */
  function normalizePath(path) {
    return (path || '/').replace(/\/$/, '') || '/';
  }

  /* =============================================================================
     03) ACTIVE LINK STATE
  ============================================================================= */
  function setActiveOfficeFooterLinks(root = document) {
    const currentPath = normalizePath(window.location.pathname);
    const links = Array.from(root.querySelectorAll('.office-footer__link-list a'));

    links.forEach((link) => {
      try {
        const href = link.getAttribute('href') || '/';
        const linkUrl = new URL(href, window.location.origin);
        const linkPath = normalizePath(linkUrl.pathname);
        const isActive = linkPath === currentPath;

        if (isActive) {
          link.setAttribute('aria-current', 'page');
        } else {
          link.removeAttribute('aria-current');
        }
      } catch (error) {
        console.error('[Office Footer] Invalid navigation link.', error);
      }
    });
  }

  /* =============================================================================
     04) FOOTER BINDING
  ============================================================================= */
  function bindOfficeFooter(root = document) {
    const footer = root.querySelector('.office-footer');
    if (!footer || footer.dataset.officeFooterBound === 'true') return;

    footer.dataset.officeFooterBound = 'true';
    setActiveOfficeFooterLinks(root);
  }

  /* =============================================================================
     05) BOOT LIFECYCLE
  ============================================================================= */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      bindOfficeFooter(document);
    }, { once: true });
  } else {
    bindOfficeFooter(document);
  }

  /* =============================================================================
     06) FRAGMENT RE-BIND
  ============================================================================= */
  document.addEventListener('fragment:mounted', (event) => {
    const detailRoot = event?.detail?.root;
    if (!(detailRoot instanceof Element)) return;
    if (!detailRoot.querySelector('.office-footer')) return;
    bindOfficeFooter(detailRoot);
  });
})();