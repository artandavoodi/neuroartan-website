/* =============================================================================
   00) FILE INDEX
   01) MODULE IDENTITY
   02) CONSTANTS / STATE
   03) DOM HELPERS
   04) OVERLAY RESOLUTION
   05) OPEN / CLOSE STATE
   06) LANGUAGE VALUE / STATUS
   06A) COUNTRY DATA HELPERS
   06B) REGIONS RENDERING
   06C) SEARCH FILTERING
   06D) COUNTRY SELECTION BRIDGE
   07) BINDINGS
   08) EVENT BRIDGE
   08A) OVERLAY COORDINATION
   09) INITIALIZATION
   09A) INIT RETRY
============================================================================= */

/* =============================================================================
   01) MODULE IDENTITY
============================================================================= */
(() => {
  const MODULE_ID = 'cookie-language-overlay';

  /* =============================================================================
     02) CONSTANTS / STATE
  ============================================================================= */
  const BODY_OPEN_CLASS = 'cookie-language-overlay-open';
  const BODY_CLOSING_CLASS = 'cookie-language-overlay-closing';
  const CLOSE_DELAY_MS = 220;
  const INIT_RETRY_DELAY_MS = 180;

  let closeTimer = null;
  let initRetryTimer = null;
  let initialized = false;

  /* =============================================================================
     03) DOM HELPERS
  ============================================================================= */
  const q = (selector, root = document) => root.querySelector(selector);
  const qa = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  function getOverlay() {
    return q('#cookie-language-overlay');
  }

  function getInner() {
    return q('.cookie-language-overlay-inner', getOverlay() || document);
  }

  function getCloseControls() {
    const overlay = getOverlay();
    return overlay ? qa('[data-cookie-language-overlay-close="true"]', overlay) : [];
  }

  function getSearchInput() {
    const overlay = getOverlay();
    return overlay ? q('[data-cookie-language-overlay-search="true"]', overlay) : null;
  }

  function getStatusNode() {
    const overlay = getOverlay();
    return overlay ? q('[data-cookie-language-overlay-status="true"]', overlay) : null;
  }

  function getRegionsMount() {
    const overlay = getOverlay();
    return overlay ? q('[data-cookie-language-overlay-regions="true"]', overlay) : null;
  }

  function getRegionItems() {
    const overlay = getOverlay();
    return overlay ? qa('[data-cookie-language-overlay-country]', overlay) : [];
  }

  /* =============================================================================
     04) OVERLAY RESOLUTION
  ============================================================================= */
  function ensureOverlayReady() {
    return Boolean(getOverlay() && getInner());
  }

  /* =============================================================================
     05) OPEN / CLOSE STATE
  ============================================================================= */
  function clearCloseTimer() {
    if (!closeTimer) return;
    window.clearTimeout(closeTimer);
    closeTimer = null;
  }

  function clearInitRetryTimer() {
    if (!initRetryTimer) return;
    window.clearTimeout(initRetryTimer);
    initRetryTimer = null;
  }

  function setOverlayVisibility(isOpen) {
    const overlay = getOverlay();
    if (!overlay) return;
    overlay.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
  }

  function openOverlay() {
    if (!ensureOverlayReady()) return;

    clearCloseTimer();
    document.body.classList.remove(BODY_CLOSING_CLASS);
    document.body.classList.add(BODY_OPEN_CLASS);
    setOverlayVisibility(true);
    syncStatusNode();
    document.dispatchEvent(new CustomEvent('cookie-language-overlay:opened', {
      detail: {
        source: MODULE_ID
      }
    }));

    window.requestAnimationFrame(() => {
      getSearchInput()?.focus();
    });
  }

  function closeOverlay() {
    if (!ensureOverlayReady()) return;

    clearCloseTimer();
    document.body.classList.remove(BODY_OPEN_CLASS);
    document.body.classList.add(BODY_CLOSING_CLASS);

    closeTimer = window.setTimeout(() => {
      document.body.classList.remove(BODY_CLOSING_CLASS);
      setOverlayVisibility(false);
      document.dispatchEvent(new CustomEvent('cookie-language-overlay:closed', {
        detail: {
          source: MODULE_ID
        }
      }));
      closeTimer = null;
    }, CLOSE_DELAY_MS);
  }
  /* =============================================================================
     08A) OVERLAY COORDINATION
  ============================================================================= */
  function bindOverlayCoordination() {
    if (document.body.dataset.cookieLanguageOverlayCoordinationBound === 'true') return;
    document.body.dataset.cookieLanguageOverlayCoordinationBound = 'true';

    document.addEventListener('country-overlay:open-request', () => {
      if (!isOpen()) return;
      closeOverlay();
    });

    document.addEventListener('country-selected', () => {
      syncSelectedCountryState();
      syncStatusNode();
    });
  }
  /* =============================================================================
     09A) INIT RETRY
  ============================================================================= */
  function scheduleInitRetry() {
    clearInitRetryTimer();
    initRetryTimer = window.setTimeout(() => {
      initRetryTimer = null;
      initCookieLanguageOverlay();
    }, INIT_RETRY_DELAY_MS);
  }

  function isOpen() {
    return document.body.classList.contains(BODY_OPEN_CLASS);
  }

  /* =============================================================================
     06) LANGUAGE VALUE / STATUS
  ============================================================================= */
  function getPreferredLanguageLabel() {
    const docLang = (document.documentElement.getAttribute('lang') || '').trim();
    const navLang = (navigator.language || '').trim();
    const raw = docLang || navLang;
    if (!raw) return 'Auto';

    const normalized = raw.replace('_', '-');
    const base = normalized.split('-')[0];

    try {
      const displayNames = new Intl.DisplayNames([normalized], { type: 'language' });
      return displayNames.of(base) || normalized.toUpperCase();
    } catch {
      return normalized.toUpperCase();
    }
  }

  function syncStatusNode() {
    const statusNode = getStatusNode();
    if (!statusNode) return;
    statusNode.textContent = `Current language: ${getPreferredLanguageLabel()}. Region selection layer ready.`;
  }

  /* =============================================================================
     06A) COUNTRY DATA HELPERS
  ============================================================================= */
  function getCountriesData() {
    return Array.isArray(window.ARTAN_COUNTRIES_DATA) ? window.ARTAN_COUNTRIES_DATA : [];
  }

  function getCountryLanguageLabel(country) {
    if (!country || typeof country !== 'object') return 'Language unavailable';

    const primary = typeof country.language === 'string' && country.language.trim()
      ? country.language.trim()
      : '';

    if (primary) return primary;

    if (Array.isArray(country.languages) && country.languages.length) {
      return country.languages.join(', ');
    }

    return 'Language unavailable';
  }

  function getSelectedCountryCode() {
    const stored = window.localStorage.getItem('selectedCountryCode');
    return typeof stored === 'string' ? stored.trim().toUpperCase() : '';
  }

  /* =============================================================================
     06B) REGIONS RENDERING
  ============================================================================= */
  function buildCountryItemMarkup(country) {
    const code = String(country.code || '').trim().toUpperCase();
    const name = String(country.name || 'Unknown region').trim();
    const languageLabel = getCountryLanguageLabel(country);
    const selected = getSelectedCountryCode() === code;

    return `
      <button
        type="button"
        class="cookie-language-overlay-country${selected ? ' is-selected' : ''}"
        data-cookie-language-overlay-country="${code}"
        data-cookie-language-overlay-name="${name.toLowerCase()}"
        data-cookie-language-overlay-language="${languageLabel.toLowerCase()}"
        aria-pressed="${selected ? 'true' : 'false'}"
      >
        <span class="cookie-language-overlay-country-copy">
          <strong>${name}</strong>
          <span>${languageLabel}</span>
        </span>
        <span class="cookie-language-overlay-country-code">${code || '—'}</span>
      </button>
    `;
  }

  function renderRegions() {
    const mount = getRegionsMount();
    if (!mount) return;

    const countries = getCountriesData();
    if (!countries.length) {
      mount.innerHTML = '';
      return;
    }

    mount.innerHTML = countries
      .slice()
      .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')))
      .map((country) => buildCountryItemMarkup(country))
      .join('');
  }

  function syncSelectedCountryState() {
    const selectedCode = getSelectedCountryCode();

    getRegionItems().forEach((item) => {
      const code = String(item.dataset.cookieLanguageOverlayCountry || '').trim().toUpperCase();
      const selected = Boolean(selectedCode) && code === selectedCode;
      item.classList.toggle('is-selected', selected);
      item.setAttribute('aria-pressed', selected ? 'true' : 'false');
    });
  }

  /* =============================================================================
     06C) SEARCH FILTERING
  ============================================================================= */
  function filterRegions(query) {
    const normalized = String(query || '').trim().toLowerCase();

    getRegionItems().forEach((item) => {
      const name = String(item.dataset.cookieLanguageOverlayName || '');
      const language = String(item.dataset.cookieLanguageOverlayLanguage || '');
      const code = String(item.dataset.cookieLanguageOverlayCountry || '').toLowerCase();
      const visible = !normalized || name.includes(normalized) || language.includes(normalized) || code.includes(normalized);
      item.hidden = !visible;
    });
  }

  /* =============================================================================
     06D) COUNTRY SELECTION BRIDGE
  ============================================================================= */
  function dispatchCountrySelection(code) {
    if (!code) return;

    document.dispatchEvent(new CustomEvent('country-selected', {
      detail: {
        countryCode: code
      }
    }));
  }

  function syncPlaceholderState() {
    const mount = getRegionsMount();
    if (!mount) return;
    mount.dataset.cookieLanguageOverlayReady = 'true';
    renderRegions();
    syncSelectedCountryState();
  }

  /* =============================================================================
     07) BINDINGS
  ============================================================================= */
  function bindCloseControls() {
    getCloseControls().forEach((control) => {
      if (control.dataset.cookieLanguageOverlayCloseBound === 'true') return;
      control.dataset.cookieLanguageOverlayCloseBound = 'true';

      control.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        closeOverlay();
      });
    });
  }

  function bindBackdropClose() {
    const overlay = getOverlay();
    const inner = getInner();
    if (!overlay || !inner || overlay.dataset.cookieLanguageOverlayBackdropBound === 'true') return;

    overlay.dataset.cookieLanguageOverlayBackdropBound = 'true';
    overlay.addEventListener('click', (event) => {
      if (!isOpen()) return;
      if (inner.contains(event.target)) return;
      closeOverlay();
    });
  }

  function bindEscapeKey() {
    if (document.body.dataset.cookieLanguageOverlayEscapeBound === 'true') return;
    document.body.dataset.cookieLanguageOverlayEscapeBound = 'true';

    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      if (!isOpen()) return;
      closeOverlay();
    });
  }

  function bindSearchInput() {
    const input = getSearchInput();
    if (!input || input.dataset.cookieLanguageOverlaySearchBound === 'true') return;

    input.dataset.cookieLanguageOverlaySearchBound = 'true';
    input.addEventListener('input', () => {
      filterRegions(input.value);
    });
  }

  function bindRegionSelection() {
    const mount = getRegionsMount();
    if (!mount || mount.dataset.cookieLanguageOverlaySelectionBound === 'true') return;

    mount.dataset.cookieLanguageOverlaySelectionBound = 'true';
    mount.addEventListener('click', (event) => {
      const item = event.target.closest('[data-cookie-language-overlay-country]');
      if (!item) return;

      event.preventDefault();
      event.stopPropagation();

      const code = String(item.dataset.cookieLanguageOverlayCountry || '').trim().toUpperCase();
      if (!code) return;

      dispatchCountrySelection(code);
      syncSelectedCountryState();
      closeOverlay();
    });
  }

  /* =============================================================================
     08) EVENT BRIDGE
  ============================================================================= */
  function bindOpenRequests() {
    if (document.body.dataset.cookieLanguageOverlayOpenRequestBound === 'true') return;
    document.body.dataset.cookieLanguageOverlayOpenRequestBound = 'true';

    document.addEventListener('cookie-language-overlay:open-request', () => {
      openOverlay();
    });
  }

  /* =============================================================================
     09) INITIALIZATION
  ============================================================================= */
  function initCookieLanguageOverlay() {
    if (initialized) return;
    if (!ensureOverlayReady()) {
      scheduleInitRetry();
      return;
    }

    clearInitRetryTimer();
    syncStatusNode();
    syncPlaceholderState();
    setOverlayVisibility(false);
    bindCloseControls();
    bindBackdropClose();
    bindEscapeKey();
    bindSearchInput();
    bindRegionSelection();
    bindOpenRequests();
    bindOverlayCoordination();

    initialized = true;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCookieLanguageOverlay, { once: true });
  } else {
    initCookieLanguageOverlay();
  }
})();