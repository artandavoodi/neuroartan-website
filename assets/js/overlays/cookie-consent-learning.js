/* =============================================================================
   00) FILE INDEX
   01) MODULE BOOTSTRAP
   02) CONSTANTS
   03) STATE HELPERS
   04) DRAWER STATE CONTROL
   05) DETAIL STATE CONTROL
   06) HORIZONTAL RAIL WHEEL BINDING
   07) ROOT INITIALIZATION
   08) DOCUMENT INITIALIZATION
============================================================================= */

(() => {
  "use strict";

  /* =============================================================================
     01) MODULE BOOTSTRAP
  ============================================================================= */

  if (window.__cookieConsentLearningInitialized) {
    return;
  }

  window.__cookieConsentLearningInitialized = true;

  /* =============================================================================
     02) CONSTANTS
  ============================================================================= */

  const SELECTORS = {
    root: '[data-cookie-consent-learning="root"]',
    layer: '.cookie-consent-learning-layer',
    panel: '.cookie-consent-panel',
    body: '.cookie-consent-body',
    experienceRow: '[data-cookie-consent-row="experience"]',
    rail: '[data-cookie-consent-learning-rail="true"]',
    details: '[data-cookie-consent-learning-details="true"]',
    expand: '[data-cookie-consent-learning-expand]',
    close: '[data-cookie-consent-learning-close]',
    detail: '[data-cookie-consent-learning-detail]',
  };

  const STATE = {
    activeKey: 'data-cookie-consent-learning-active',
    drawerState: 'data-cookie-consent-drawer-state',
    lastScrollTop: 'data-cookie-consent-drawer-last-scroll-top',
  };

  /* =============================================================================
     03) STATE HELPERS
  ============================================================================= */

  function getRail(root) {
    return root.querySelector(SELECTORS.rail);
  }

  function getLayer(root) {
    return root.closest(SELECTORS.layer);
  }

  function getPanel(root) {
    return root.closest(SELECTORS.panel);
  }

  function getScrollBody(root) {
    return getPanel(root)?.querySelector(SELECTORS.body) || null;
  }

  function getExperienceRow(root) {
    return getPanel(root)?.querySelector(SELECTORS.experienceRow) || null;
  }

  function getDetailsContainer(root) {
    return root.querySelector(SELECTORS.details);
  }

  function getDetailByKey(root, key) {
    return root.querySelector(`${SELECTORS.detail}[data-cookie-consent-learning-detail="${key}"]`);
  }

  function getActiveKey(root) {
    return root.getAttribute(STATE.activeKey) || '';
  }

  function setActiveKey(root, key) {
    if (!key) {
      root.removeAttribute(STATE.activeKey);
      return;
    }

    root.setAttribute(STATE.activeKey, key);
  }

  function setButtonExpanded(root, activeKey) {
    root.querySelectorAll(SELECTORS.expand).forEach((button) => {
      if (!(button instanceof HTMLElement)) {
        return;
      }

      const key = button.getAttribute('data-cookie-consent-learning-expand') || '';
      button.setAttribute('aria-expanded', key === activeKey ? 'true' : 'false');
    });
  }

  function getDrawerState(root) {
    return getLayer(root)?.getAttribute(STATE.drawerState) || '';
  }

  function setDrawerState(root, state) {
    const layer = getLayer(root);
    if (!layer) {
      return;
    }

    layer.setAttribute(STATE.drawerState, state);
  }

  function getLastScrollTop(root) {
    const layer = getLayer(root);
    if (!layer) {
      return 0;
    }

    const value = Number(layer.getAttribute(STATE.lastScrollTop));
    return Number.isFinite(value) ? value : 0;
  }

  function setLastScrollTop(root, value) {
    const layer = getLayer(root);
    if (!layer) {
      return;
    }

    layer.setAttribute(STATE.lastScrollTop, String(Math.max(0, value)));
  }

  function hasReachedExperienceBottom(root) {
    const scrollBody = getScrollBody(root);
    const experienceRow = getExperienceRow(root);

    if (!(scrollBody instanceof HTMLElement) || !(experienceRow instanceof HTMLElement)) {
      return false;
    }

    const bodyRect = scrollBody.getBoundingClientRect();
    const experienceRect = experienceRow.getBoundingClientRect();

    return experienceRect.bottom <= (bodyRect.bottom + 1);
  }

  /* =============================================================================
     04) DRAWER STATE CONTROL
  ============================================================================= */

  function syncDrawerState(root) {
    const scrollBody = getScrollBody(root);
    if (!(scrollBody instanceof HTMLElement)) {
      setDrawerState(root, 'hidden');
      setLastScrollTop(root, 0);
      return;
    }

    const currentScrollTop = Math.max(0, scrollBody.scrollTop);
    const lastScrollTop = getLastScrollTop(root);
    const isScrollingDown = currentScrollTop > lastScrollTop;
    const isScrollingUp = currentScrollTop < lastScrollTop;
    const reachedThreshold = hasReachedExperienceBottom(root);

    if (reachedThreshold) {
      setDrawerState(root, 'visible');
      setLastScrollTop(root, currentScrollTop);
      return;
    }

    if (isScrollingUp || currentScrollTop <= 0 || !isScrollingDown) {
      setDrawerState(root, 'hidden');
    }

    setLastScrollTop(root, currentScrollTop);
  }

  function bindDrawerState(root) {
    const scrollBody = getScrollBody(root);
    if (!(scrollBody instanceof HTMLElement)) {
      setDrawerState(root, 'hidden');
      setLastScrollTop(root, 0);
      return;
    }

    let rafId = 0;

    const update = () => {
      rafId = 0;
      syncDrawerState(root);
    };

    const requestUpdate = () => {
      if (rafId !== 0) {
        return;
      }

      rafId = window.requestAnimationFrame(update);
    };

    setDrawerState(root, 'hidden');
    setLastScrollTop(root, scrollBody.scrollTop);

    scrollBody.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate);
    requestUpdate();
  }

  /* =============================================================================
     05) DETAIL STATE CONTROL
  ============================================================================= */

  function closeAllDetails(root) {
    const detailsContainer = getDetailsContainer(root);
    if (detailsContainer instanceof HTMLElement) {
      detailsContainer.hidden = true;
    }

    root.querySelectorAll(SELECTORS.detail).forEach((detail) => {
      if (detail instanceof HTMLElement) {
        detail.hidden = true;
      }
    });

    setActiveKey(root, '');
    setButtonExpanded(root, '');
  }

  function openDetail(root, key) {
    const detailsContainer = getDetailsContainer(root);
    const detail = getDetailByKey(root, key);

    if (!(detailsContainer instanceof HTMLElement) || !(detail instanceof HTMLElement)) {
      return;
    }

    detailsContainer.hidden = false;

    root.querySelectorAll(SELECTORS.detail).forEach((node) => {
      if (node instanceof HTMLElement) {
        node.hidden = node !== detail;
      }
    });

    setActiveKey(root, key);
    setButtonExpanded(root, key);
  }

  function toggleDetail(root, key) {
    if (getActiveKey(root) === key) {
      closeAllDetails(root);
      return;
    }

    openDetail(root, key);
  }

  function bindDetailControls(root) {
    root.querySelectorAll(SELECTORS.expand).forEach((button) => {
      if (!(button instanceof HTMLElement)) {
        return;
      }

      button.addEventListener('click', () => {
        const key = button.getAttribute('data-cookie-consent-learning-expand') || '';
        if (!key) {
          return;
        }

        toggleDetail(root, key);
      });
    });

    root.querySelectorAll(SELECTORS.close).forEach((button) => {
      if (!(button instanceof HTMLElement)) {
        return;
      }

      button.addEventListener('click', () => {
        closeAllDetails(root);
      });
    });
  }

  /* =============================================================================
     06) HORIZONTAL RAIL WHEEL BINDING
  ============================================================================= */

  function bindHorizontalWheel(root) {
    const rail = getRail(root);
    if (!(rail instanceof HTMLElement)) {
      return;
    }

    rail.addEventListener(
      'wheel',
      (event) => {
        if (!(event instanceof WheelEvent)) {
          return;
        }

        if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) {
          return;
        }

        rail.scrollLeft += event.deltaY;
        event.preventDefault();
      },
      { passive: false }
    );
  }

  /* =============================================================================
     07) ROOT INITIALIZATION
  ============================================================================= */

  function initLearningRoot(root) {
    if (!(root instanceof HTMLElement)) {
      return;
    }

    closeAllDetails(root);
    bindDrawerState(root);
    bindDetailControls(root);
    bindHorizontalWheel(root);
  }

  /* =============================================================================
     08) DOCUMENT INITIALIZATION
  ============================================================================= */

  function initCookieConsentLearning() {
    document.querySelectorAll(SELECTORS.root).forEach((root) => {
      initLearningRoot(root);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCookieConsentLearning, { once: true });
  } else {
    initCookieConsentLearning();
  }
})();