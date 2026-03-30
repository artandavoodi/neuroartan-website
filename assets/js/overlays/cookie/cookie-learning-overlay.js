/* =============================================================================
   00) FILE INDEX
   01) MODULE IDENTITY
   02) STATE
   03) QUERY HELPERS
   04) PANEL STATE HELPERS
   05) OPEN / CLOSE FLOW
   06) EVENT BINDING
   07) INITIALIZATION
============================================================================= */

(() => {
  /* =============================================================================
     01) MODULE IDENTITY
  ============================================================================= */
  const MODULE_ID = 'cookie-learning-overlay';

  /* =============================================================================
     02) STATE
  ============================================================================= */
  const STATE = {
    initialized: false,
    escapeBound: false,
    requestBound: false,
    returnBound: false,
    mountBound: false,
  };

  /* =============================================================================
     03) QUERY HELPERS
  ============================================================================= */
  const q = (selector, scope = document) => scope.querySelector(selector);
  const qa = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

  function getRoot() {
    return q('[data-cookie-learning-overlay="root"]');
  }

  function getPanel() {
    const root = getRoot();
    return root ? q('[data-cookie-learning-overlay="panel"]', root) : null;
  }

  function getBackdrop() {
    const root = getRoot();
    return root ? q('[data-cookie-learning-overlay="backdrop"]', root) : null;
  }

  function getBackControl() {
    const root = getRoot();
    return root ? q('[data-cookie-learning-overlay-back="true"]', root) : null;
  }

  function getCloseControl() {
    const root = getRoot();
    return root ? q('[data-cookie-learning-overlay-close="true"]', root) : null;
  }

  function getTitleNode() {
    const root = getRoot();
    return root ? q('[data-cookie-learning-overlay-title="true"]', root) : null;
  }

  function getArticles() {
    const root = getRoot();
    return root ? qa('[data-cookie-learning-overlay-article]', root) : [];
  }

  function getArticleByKey(key) {
    const root = getRoot();
    return root ? q(`[data-cookie-learning-overlay-article="${key}"]`, root) : null;
  }

  function getConsentRoot() {
    return q('[data-cookie-consent="root"]');
  }

  /* =============================================================================
     04) PANEL STATE HELPERS
  ============================================================================= */
  function hideAllArticles() {
    getArticles().forEach((article) => {
      if (!(article instanceof HTMLElement)) return;
      article.hidden = true;
      article.setAttribute('aria-hidden', 'true');
    });
  }

  function setTitleFromArticle(article) {
    const titleNode = getTitleNode();
    if (!(titleNode instanceof HTMLElement) || !(article instanceof HTMLElement)) return;

    const heading = article.querySelector('.cookie-learning-overlay-article-topline strong');
    const text = (heading?.textContent || '').trim();
    titleNode.textContent = text || 'Cookie information';
  }

  function showArticle(key) {
    const target = getArticleByKey(key);
    if (!(target instanceof HTMLElement)) return false;

    hideAllArticles();
    target.hidden = false;
    target.setAttribute('aria-hidden', 'false');
    setTitleFromArticle(target);
    return true;
  }

  /* =============================================================================
     05) OPEN / CLOSE FLOW
  ============================================================================= */
  function openOverlay(key = '') {
    const root = getRoot();
    const consentRoot = getConsentRoot();
    if (!(root instanceof HTMLElement)) return false;
    if (!showArticle(key)) return false;

    root.hidden = false;
    root.removeAttribute('hidden');
    root.setAttribute('aria-hidden', 'false');
    root.dataset.cookieLearningOverlayOpen = 'true';

    if (consentRoot instanceof HTMLElement) {
      consentRoot.dataset.cookieLearningOverlayOpen = 'true';
    }

    document.body.classList.add('cookie-learning-overlay-open');

    document.dispatchEvent(new CustomEvent('cookie-learning-overlay:opened', {
      detail: {
        source: MODULE_ID,
        key
      }
    }));
    return true;
  }

  function closeOverlay({ returnToConsent = true } = {}) {
    const root = getRoot();
    const consentRoot = getConsentRoot();
    if (!(root instanceof HTMLElement)) return;

    root.hidden = true;
    root.setAttribute('aria-hidden', 'true');
    hideAllArticles();
    delete root.dataset.cookieLearningOverlayOpen;

    if (consentRoot instanceof HTMLElement) {
      delete consentRoot.dataset.cookieLearningOverlayOpen;
    }

    document.body.classList.remove('cookie-learning-overlay-open');

    document.dispatchEvent(new CustomEvent('cookie-learning-overlay:closed', {
      detail: {
        source: MODULE_ID
      }
    }));

    if (returnToConsent) {
      document.dispatchEvent(new CustomEvent('cookie-learning-overlay:return', {
        detail: { source: MODULE_ID }
      }));
    }
  }

  /* =============================================================================
     06) EVENT BINDING
  ============================================================================= */
  function bindOpenRequests() {
    if (STATE.requestBound) return;
    STATE.requestBound = true;

    document.addEventListener('cookie-learning-overlay:open-request', (event) => {
      const detail = event?.detail && typeof event.detail === 'object' ? event.detail : {};
      const key = String(detail.key || '').trim();
      if (!key) return;

      initCookieLearningOverlay();
      openOverlay(key);
    });
  }

  function bindReturnControls() {
    if (STATE.returnBound) return;
    STATE.returnBound = true;

    const backControl = getBackControl();
    const closeControl = getCloseControl();
    const backdrop = getBackdrop();

    if (backControl instanceof HTMLElement && backControl.dataset.cookieLearningOverlayBound !== 'true') {
      backControl.dataset.cookieLearningOverlayBound = 'true';
      backControl.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        closeOverlay({ returnToConsent: true });
      });
    }

    if (closeControl instanceof HTMLElement && closeControl.dataset.cookieLearningOverlayBound !== 'true') {
      closeControl.dataset.cookieLearningOverlayBound = 'true';
      closeControl.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        closeOverlay({ returnToConsent: false });
        document.dispatchEvent(new CustomEvent('cookie-consent:close-request', {
          detail: { source: MODULE_ID }
        }));
      });
    }

    if (backdrop instanceof HTMLElement && backdrop.dataset.cookieLearningOverlayBound !== 'true') {
      backdrop.dataset.cookieLearningOverlayBound = 'true';
      backdrop.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
      });
    }
  }

  function bindEscapeKey() {
    if (STATE.escapeBound) return;
    STATE.escapeBound = true;

    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;

      const root = getRoot();
      if (!(root instanceof HTMLElement)) return;
      if (root.hidden || root.getAttribute('aria-hidden') === 'true') return;

      event.preventDefault();
      event.stopPropagation();
      closeOverlay({ returnToConsent: true });
    });
  }

  function bindMountLifecycle() {
    if (STATE.mountBound) return;
    STATE.mountBound = true;

    document.addEventListener('fragment:mounted', (event) => {
      const detail = event?.detail && typeof event.detail === 'object' ? event.detail : {};
      if (detail.name !== 'cookie-learning-overlay') return;
      initCookieLearningOverlay();
    });

    document.addEventListener('cookie-consent:mounted', () => {
      initCookieLearningOverlay();
    });
  }

  /* =============================================================================
     07) INITIALIZATION
  ============================================================================= */
  function initCookieLearningOverlay() {
    const root = getRoot();
    if (!(root instanceof HTMLElement)) return;

    hideAllArticles();
    root.hidden = true;
    root.setAttribute('aria-hidden', 'true');
    bindOpenRequests();
    bindReturnControls();
    bindEscapeKey();
    bindMountLifecycle();
    STATE.initialized = true;
  }

  bindOpenRequests();
  bindMountLifecycle();
  window.initCookieLearningOverlay = initCookieLearningOverlay;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCookieLearningOverlay, { once: true });
  } else {
    initCookieLearningOverlay();
  }
})();
