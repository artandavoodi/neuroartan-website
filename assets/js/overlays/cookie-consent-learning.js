/* =============================================================================
   00) FILE INDEX
   01) MODULE BOOTSTRAP
   02) CONSTANTS
   03) STATE HELPERS
   04) DETAIL STATE CONTROL
   05) HORIZONTAL RAIL WHEEL BINDING
   06) ROOT INITIALIZATION
   07) DOCUMENT INITIALIZATION
============================================================================= */

/* =============================================================================
   01) MODULE BOOTSTRAP
============================================================================= */
(() => {
  "use strict";

  /* =============================================================================
     02) CONSTANTS
  ============================================================================= */
  const SELECTORS = {
    root: '[data-cookie-consent-learning="root"]',
    rail: '[data-cookie-consent-learning-rail="true"]',
    details: '[data-cookie-consent-learning-details="true"]',
    expand: '[data-cookie-consent-learning-expand]',
    close: '[data-cookie-consent-learning-close]',
    detail: '[data-cookie-consent-learning-detail]',
  };

  const STATE = {
    activeKey: "data-cookie-consent-learning-active",
  };

  /* =============================================================================
     03) STATE HELPERS
  ============================================================================= */
  function getExpandButtons(root) {
    return Array.from(root.querySelectorAll(SELECTORS.expand));
  }

  function getCloseButtons(root) {
    return Array.from(root.querySelectorAll(SELECTORS.close));
  }

  function getDetails(root) {
    return Array.from(root.querySelectorAll(SELECTORS.detail));
  }

  function getDetailsContainer(root) {
    return root.querySelector(SELECTORS.details);
  }

  function getRail(root) {
    return root.querySelector(SELECTORS.rail);
  }

  function getActiveKey(root) {
    return root.getAttribute(STATE.activeKey) || "";
  }

  function setActiveKey(root, key) {
    if (key) {
      root.setAttribute(STATE.activeKey, key);
      return;
    }

    root.removeAttribute(STATE.activeKey);
  }

  function getDetailByKey(root, key) {
    return root.querySelector(`[data-cookie-consent-learning-detail="${key}"]`);
  }

  function setButtonExpanded(root, activeKey) {
    getExpandButtons(root).forEach((button) => {
      const buttonKey = button.getAttribute("data-cookie-consent-learning-expand") || "";
      button.setAttribute("aria-expanded", String(buttonKey === activeKey && activeKey !== ""));
    });
  }

  /* =============================================================================
     04) DETAIL STATE CONTROL
  ============================================================================= */
  function closeAllDetails(root) {
    const detailsContainer = getDetailsContainer(root);

    if (detailsContainer) {
      detailsContainer.hidden = true;
    }

    getDetails(root).forEach((detail) => {
      detail.hidden = true;
    });

    setActiveKey(root, "");
    setButtonExpanded(root, "");
  }

  function openDetail(root, key) {
    const detailsContainer = getDetailsContainer(root);
    const targetDetail = getDetailByKey(root, key);

    if (!detailsContainer || !targetDetail) {
      closeAllDetails(root);
      return;
    }

    getDetails(root).forEach((detail) => {
      detail.hidden = detail !== targetDetail;
    });

    detailsContainer.hidden = false;
    setActiveKey(root, key);
    setButtonExpanded(root, key);

    targetDetail.scrollIntoView({
      block: "nearest",
      inline: "nearest",
      behavior: "smooth",
    });
  }

  function toggleDetail(root, key) {
    if (getActiveKey(root) === key) {
      closeAllDetails(root);
      return;
    }

    openDetail(root, key);
  }

  function bindDetailControls(root) {
    getExpandButtons(root).forEach((button) => {
      button.addEventListener("click", () => {
        const key = button.getAttribute("data-cookie-consent-learning-expand") || "";
        if (!key) return;
        toggleDetail(root, key);
      });
    });

    getCloseButtons(root).forEach((button) => {
      button.addEventListener("click", () => {
        closeAllDetails(root);
      });
    });
  }

  /* =============================================================================
     05) HORIZONTAL RAIL WHEEL BINDING
  ============================================================================= */
  function bindHorizontalWheel(root) {
    const rail = getRail(root);
    if (!rail) return;

    rail.addEventListener(
      "wheel",
      (event) => {
        const absDeltaX = Math.abs(event.deltaX);
        const absDeltaY = Math.abs(event.deltaY);

        if (absDeltaY <= absDeltaX) {
          return;
        }

        const canScrollHorizontally = rail.scrollWidth > rail.clientWidth;
        if (!canScrollHorizontally) {
          return;
        }

        event.preventDefault();
        rail.scrollLeft += event.deltaY;
      },
      { passive: false }
    );
  }

  /* =============================================================================
     06) ROOT INITIALIZATION
  ============================================================================= */
  function initLearningRoot(root) {
    if (!(root instanceof HTMLElement)) {
      return;
    }

    if (root.dataset.cookieConsentLearningReady === "true") {
      return;
    }

    closeAllDetails(root);
    bindDetailControls(root);
    bindHorizontalWheel(root);

    root.dataset.cookieConsentLearningReady = "true";
  }

  /* =============================================================================
     07) DOCUMENT INITIALIZATION
  ============================================================================= */
  function initCookieConsentLearning() {
    document.querySelectorAll(SELECTORS.root).forEach((root) => {
      initLearningRoot(root);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initCookieConsentLearning, { once: true });
  } else {
    initCookieConsentLearning();
  }

  window.initCookieConsentLearning = initCookieConsentLearning;
})();