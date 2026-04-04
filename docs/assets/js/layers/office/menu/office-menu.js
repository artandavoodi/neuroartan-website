/* =============================================================================
   00) FILE INDEX
   01) MODULE IDENTITY
   02) PATH NORMALIZATION
   03) ACTIVE LINK STATE
   04) MENU BINDING
   05) BOOT LIFECYCLE
   06) FRAGMENT RE-BIND
============================================================================= */

(function () {
  'use strict';

  /* =============================================================================
     01) MODULE IDENTITY
     - Office menu layer runtime.
     - Lives in the website canonical source under the Office layer branch.
     - Preserves sovereign Office navigation behavior while consuming canonical core runtime.
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
  function setActiveOfficeMenuLinks(root = document) {
    const currentPath = normalizePath(window.location.pathname);
    const links = Array.from(root.querySelectorAll('.office-menu__link, .office-menu__mobile-link'));

    links.forEach((link) => {
      try {
        const href = link.getAttribute('href') || '/';
        const linkUrl = new URL(href, window.location.origin);
        const linkPath = normalizePath(linkUrl.pathname);
        const isActive = linkPath === currentPath;

        link.classList.toggle('is-active', isActive);

        if (isActive) {
          link.setAttribute('aria-current', 'page');
        } else {
          link.removeAttribute('aria-current');
        }
      } catch (error) {
        console.error('[Office Menu] Invalid navigation link.', error);
      }
    });
  }

  /* =============================================================================
     04) MENU BINDING
  ============================================================================= */
  function bindOfficeMenu(root = document) {
    const menu = root.querySelector('.office-menu');
    if (!menu || menu.dataset.officeMenuBound === 'true') return;

    const toggle = menu.querySelector('.office-menu__toggle');
    const mobilePanel = menu.querySelector('.office-menu__mobile-panel');
    const mobileLinks = Array.from(menu.querySelectorAll('.office-menu__mobile-link'));

    menu.dataset.officeMenuBound = 'true';
    setActiveOfficeMenuLinks(root);

    if (!toggle || !mobilePanel) return;

    const closeMenu = () => {
      toggle.setAttribute('aria-expanded', 'false');
      mobilePanel.setAttribute('aria-hidden', 'true');
      mobilePanel.classList.remove('is-open');
    };

    const openMenu = () => {
      toggle.setAttribute('aria-expanded', 'true');
      mobilePanel.setAttribute('aria-hidden', 'false');
      mobilePanel.classList.add('is-open');
    };

    toggle.addEventListener('click', () => {
      const isExpanded = toggle.getAttribute('aria-expanded') === 'true';
      if (isExpanded) {
        closeMenu();
      } else {
        openMenu();
      }
    });

    mobileLinks.forEach((link) => {
      link.addEventListener('click', () => {
        closeMenu();
      });
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth > 900) {
        closeMenu();
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        closeMenu();
      }
    });

    document.addEventListener('click', (event) => {
      if (menu.contains(event.target)) return;
      closeMenu();
    });

    closeMenu();
  }

  /* =============================================================================
     05) BOOT LIFECYCLE
  ============================================================================= */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      bindOfficeMenu(document);
    }, { once: true });
  } else {
    bindOfficeMenu(document);
  }

  /* =============================================================================
     06) FRAGMENT RE-BIND
  ============================================================================= */
  document.addEventListener('fragment:mounted', (event) => {
    const detailRoot = event?.detail?.root;
    if (!(detailRoot instanceof Element)) return;
    if (!detailRoot.querySelector('.office-menu')) return;
    bindOfficeMenu(detailRoot);
  });
})();