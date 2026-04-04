/* =============================================================================
   00) FILE INDEX
   01) MODULE IDENTITY
   02) CONSTANTS / STATE
   03) DOM HELPERS
   04) OVERLAY RESOLUTION
   05) BODY SCROLL LOCK
   06) SCROLL GUARD
   07) OPEN / CLOSE STATE
   08) LANGUAGE VALUE / STATUS
   08A) STATUS MESSAGE HELPERS
   08B) COUNTRY DATA HELPERS
   08BA) LANGUAGE LABEL HELPERS
   08BB) COUNTRY LABEL HELPERS
   08C) REGIONS RENDERING
   08D) SEARCH FILTERING
   08DA) REGIONS SCROLL BEHAVIOR
   08E) COUNTRY SELECTION BRIDGE
   08F) COOKIE RETURN FLOW
   08G) PLACEHOLDER / INITIAL RENDER STATE
   09) BINDINGS
   10) EVENT BRIDGE
   10A) OVERLAY COORDINATION
   11) INITIALIZATION
   11A) INIT RETRY
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
  const COUNTRY_CODE_STORAGE_KEYS = [
    'countryCode',
    'localeCountryCode'
  ];

  let closeTimer = null;
  let initRetryTimer = null;
  let initialized = false;
  let scrollGuardBound = false;

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
    const overlayNode = overlay ? q('[data-cookie-language-overlay-status="true"]', overlay) : null;
    if (overlayNode) return overlayNode;
    return q('[data-cookie-language-overlay-status="true"]');
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
     05) BODY SCROLL LOCK
  ============================================================================= */
  function lockBodyScroll() {
    const body = document.body;
    const docEl = document.documentElement;
    if (!(body instanceof HTMLElement) || !(docEl instanceof HTMLElement)) return;

    if (!body.dataset.cookieLanguageOverlayPrevOverflow) {
      body.dataset.cookieLanguageOverlayPrevOverflow = body.style.overflow || '';
    }
    if (!docEl.dataset.cookieLanguageOverlayPrevOverflow) {
      docEl.dataset.cookieLanguageOverlayPrevOverflow = docEl.style.overflow || '';
    }

    body.style.overflow = 'hidden';
    docEl.style.overflow = 'hidden';
    body.classList.add(BODY_OPEN_CLASS);
  }

  function unlockBodyScroll() {
    const body = document.body;
    const docEl = document.documentElement;
    if (!(body instanceof HTMLElement) || !(docEl instanceof HTMLElement)) return;

    body.style.overflow = body.dataset.cookieLanguageOverlayPrevOverflow || '';
    docEl.style.overflow = docEl.dataset.cookieLanguageOverlayPrevOverflow || '';

    delete body.dataset.cookieLanguageOverlayPrevOverflow;
    delete docEl.dataset.cookieLanguageOverlayPrevOverflow;
    body.classList.remove(BODY_OPEN_CLASS);
  }

  /* =============================================================================
     06) SCROLL GUARD
  ============================================================================= */
  function overlayIsActivelyOpen() {
    const overlay = getOverlay();
    if (!(overlay instanceof HTMLElement)) return false;
    return overlay.getAttribute('aria-hidden') === 'false';
  }

  function handleScrollGuard(event) {
    if (!overlayIsActivelyOpen()) return;

    const inner = getInner();
    const target = event.target;

    if (inner instanceof HTMLElement && target instanceof Node && inner.contains(target)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
  }

  function bindScrollGuard() {
    if (scrollGuardBound) return;
    scrollGuardBound = true;

    window.addEventListener('wheel', handleScrollGuard, { passive: false, capture: true });
    window.addEventListener('touchmove', handleScrollGuard, { passive: false, capture: true });
  }

  /* =============================================================================
     07) OPEN / CLOSE STATE
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
    lockBodyScroll();
    setOverlayVisibility(true);
    renderRegions();
    syncStatusNode();
    syncSelectedCountryState();

    const input = getSearchInput();
    if (input) {
      input.value = '';
      filterRegions('');
    }

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
    document.body.classList.add(BODY_CLOSING_CLASS);

    closeTimer = window.setTimeout(() => {
      document.body.classList.remove(BODY_CLOSING_CLASS);
      setOverlayVisibility(false);
      unlockBodyScroll();
      document.dispatchEvent(new CustomEvent('cookie-language-overlay:closed', {
        detail: {
          source: MODULE_ID
        }
      }));
      closeTimer = null;
    }, CLOSE_DELAY_MS);
  }

  function isOpen() {
    return overlayIsActivelyOpen();
  }

  /* =============================================================================
     08) LANGUAGE VALUE / STATUS
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

    const selectedCountry = getSelectedCountry();
    if (selectedCountry) {
      const countryName = String(selectedCountry.name || 'Selected region').trim();
      const languageLabel = getCountryLanguageLabel(selectedCountry);
      statusNode.textContent = getSelectedStatusMessage(countryName, languageLabel);
      return;
    }

    statusNode.textContent = getAutoDetectedStatusMessage(getPreferredLanguageLabel());
  }

  /* =============================================================================
     08A) STATUS MESSAGE HELPERS
  ============================================================================= */
  function formatStatusMessage(template, replacements = {}) {
    return String(template || '').replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, token) => {
      const value = replacements[token];
      return value == null ? '' : String(value);
    });
  }

  function getStatusTemplate(key, fallback) {
    const statusNode = getStatusNode();
    if (!statusNode) return fallback;

    const attrName = `cookieLanguageOverlay${key}`;
    const datasetValue = statusNode.dataset?.[attrName];
    const value = String(datasetValue || '').trim();
    return value || fallback;
  }

  function getSelectedStatusMessage(countryName, languageLabel) {
    return formatStatusMessage(
      getStatusTemplate(
        'statusSelected',
        'Current selection: {{country}} · {{language}}. Choosing a different option will update the website language and return you to cookie settings.'
      ),
      {
        country: countryName,
        language: languageLabel
      }
    );
  }

  function getAutoDetectedStatusMessage(languageLabel) {
    return formatStatusMessage(
      getStatusTemplate(
        'statusAuto',
        'Current selection: {{language}} detected automatically. Choose a language or region to update the website and return to cookie settings.'
      ),
      {
        language: languageLabel
      }
    );
  }

  /* =============================================================================
     08B) COUNTRY DATA HELPERS
  ============================================================================= */
  function getCountriesData() {
    const raw = Array.isArray(window.ARTAN_COUNTRIES_DATA) ? window.ARTAN_COUNTRIES_DATA : [];
    if (!raw.length) return [];

    return raw.flatMap((region) => {
      const countries = Array.isArray(region?.countries) ? region.countries : [];
      return countries.filter((entry) => entry && typeof entry === 'object');
    });
  }

  function getSelectedCountryCode() {
    for (const key of COUNTRY_CODE_STORAGE_KEYS) {
      const value = window.localStorage.getItem(key);
      const normalized = String(value || '').trim().toUpperCase();
      if (/^[A-Z]{2}$/.test(normalized)) {
        return normalized;
      }
    }

    return '';
  }

  function getSelectedCountry() {
    const selectedCode = getSelectedCountryCode();
    if (!selectedCode) return null;

    return getCountriesData().find((country) => {
      const code = String(country?.code || country?.countryCode || '').trim().toUpperCase();
      return code === selectedCode;
    }) || null;
  }

  /* =============================================================================
     08BA) LANGUAGE LABEL HELPERS
  ============================================================================= */
  function getLanguageCodes(country) {
    const codes = [];

    if (Array.isArray(country?.languages)) {
      country.languages.forEach((value) => {
        const normalized = String(value || '').trim().toLowerCase();
        if (normalized) codes.push(normalized);
      });
    }

    const primary = String(country?.language || country?.primaryLanguage || '').trim().toLowerCase();
    if (primary) codes.unshift(primary);

    return Array.from(new Set(codes)).filter(Boolean);
  }

  function getLanguageDisplayName(code) {
    const normalized = String(code || '').trim().toLowerCase();
    if (!normalized) return '';

    try {
      const displayNames = new Intl.DisplayNames(['en'], { type: 'language' });
      return displayNames.of(normalized) || normalized.toUpperCase();
    } catch {
      return normalized.toUpperCase();
    }
  }

  function getCountryLanguageMeta(country) {
    const codes = getLanguageCodes(country);
    const primaryCode = codes[0] || '';
    const primaryLabel = getLanguageDisplayName(primaryCode);

    return {
      codes,
      primaryCode,
      label: primaryLabel || 'Language unavailable',
      searchable: [primaryLabel, ...codes].filter(Boolean).join(' ').toLowerCase()
    };
  }

  function getCountryLanguageLabel(country) {
    return getCountryLanguageMeta(country).label;
  }

  /* =============================================================================
     08BB) COUNTRY LABEL HELPERS
  ============================================================================= */
  function getCountryCode(country) {
    return String(country?.code || country?.countryCode || '').trim().toUpperCase();
  }

  function getCountryDisplayNameFromCode(code, locale = 'en') {
    const normalizedCode = String(code || '').trim().toUpperCase();
    if (!normalizedCode) return '';

    try {
      const displayNames = new Intl.DisplayNames([locale || 'en'], { type: 'region' });
      return displayNames.of(normalizedCode) || '';
    } catch {
      return '';
    }
  }

  function getCountrySearchMeta(country) {
    const code = getCountryCode(country);
    const englishCountryLabel = getCountryDisplayNameFromCode(code, 'en');
    const localCountryLabel = String(country?.name || '').trim();
    const explicitLabel = String(country?.label || '').trim();
    const regionLabel = String(country?.region || '').trim();

    const rawTerms = [
      englishCountryLabel,
      localCountryLabel,
      explicitLabel,
      regionLabel,
      code,
      getCountryDisplayNameFromCode(code, getCountryLanguageMeta(country).primaryCode)
    ];

    const terms = Array.from(new Set(
      rawTerms
        .map((value) => String(value || '').trim())
        .filter(Boolean)
    ));

    return {
      code,
      label: englishCountryLabel || localCountryLabel || explicitLabel || regionLabel || 'Unknown region',
      searchable: terms.join(' ').toLowerCase(),
      terms: terms.map((value) => value.toLowerCase())
    };
  }

  /* =============================================================================
     08C) REGIONS RENDERING
  ============================================================================= */
  function buildCountryItemMarkup(country) {
    const countryMeta = getCountrySearchMeta(country);
    const code = countryMeta.code;
    const name = countryMeta.label;
    const languageMeta = getCountryLanguageMeta(country);
    const selected = getSelectedCountryCode() === code;

    return `
      <button
        type="button"
        class="cookie-language-overlay-country${selected ? ' is-selected' : ''}"
        data-cookie-language-overlay-country="${code}"
        data-cookie-language-overlay-name="${countryMeta.searchable}"
        data-cookie-language-overlay-language="${languageMeta.searchable}"
        data-cookie-language-overlay-primary-language="${languageMeta.primaryCode}"
        aria-pressed="${selected ? 'true' : 'false'}"
      >
        <span class="cookie-language-overlay-country-copy">
          <strong translate="no">${name}</strong>
          <span translate="no">${languageMeta.label}</span>
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
     08D) SEARCH FILTERING
  ============================================================================= */
  function filterRegions(query) {
    const normalized = String(query || '').trim().toLowerCase();
    const items = getRegionItems();

    if (!normalized) {
      items.forEach((item) => {
        item.hidden = false;
        item.style.display = '';
        item.style.order = '0';
      });
      return;
    }

    items.forEach((item) => {
      const name = String(item.dataset.cookieLanguageOverlayName || '');
      const language = String(item.dataset.cookieLanguageOverlayLanguage || '');
      const code = String(item.dataset.cookieLanguageOverlayCountry || '').toLowerCase();
      const haystack = `${name} ${language} ${code}`.trim();
      const visible = haystack.includes(normalized);

      item.hidden = false;
      item.style.display = visible ? '' : 'none';

      if (!visible) {
        item.style.order = '9999';
        return;
      }

      const startsWithCode = code.startsWith(normalized);
      const startsWithName = name.startsWith(normalized);
      const startsWithLanguage = language.startsWith(normalized);
      const containsName = name.includes(normalized);
      const containsLanguage = language.includes(normalized);

      let order = 500;
      if (startsWithCode) order = 0;
      else if (startsWithName) order = 1;
      else if (startsWithLanguage) order = 2;
      else if (containsName) order = 3;
      else if (containsLanguage) order = 4;

      item.style.order = String(order);
    });
  }

  /* =============================================================================
     08DA) REGIONS SCROLL BEHAVIOR
  ============================================================================= */
  function bindRegionsScrollBehavior() {
    const mount = getRegionsMount();
    if (!mount || mount.dataset.cookieLanguageOverlayScrollBound === 'true') return;

    mount.dataset.cookieLanguageOverlayScrollBound = 'true';

    mount.addEventListener('wheel', (event) => {
      event.stopPropagation();
    }, { passive: true });

    mount.addEventListener('touchmove', (event) => {
      event.stopPropagation();
    }, { passive: true });
  }

  /* =============================================================================
     08E) COUNTRY SELECTION BRIDGE
  ============================================================================= */
  function dispatchCountrySelection(code) {
    if (!code) return;

    const normalizedCode = String(code).trim().toUpperCase();
    const selectedCountry = getCountriesData().find((country) => {
      return String(country?.code || country?.countryCode || '').trim().toUpperCase() === normalizedCode;
    }) || null;

    const languageMeta = getCountryLanguageMeta(selectedCountry);

    document.dispatchEvent(new CustomEvent('country-selected', {
      detail: {
        countryCode: normalizedCode,
        code: normalizedCode,
        country: selectedCountry,
        language: languageMeta.primaryCode,
        languages: languageMeta.codes,
        source: MODULE_ID
      }
    }));
  }

  /* =============================================================================
     08F) COOKIE RETURN FLOW
  ============================================================================= */
  function requestReturnToCookieConsent() {
    document.dispatchEvent(new CustomEvent('cookie-language-overlay:return-to-cookie-consent', {
      detail: {
        source: MODULE_ID
      }
    }));
  }

  /* =============================================================================
     08G) PLACEHOLDER / INITIAL RENDER STATE
  ============================================================================= */
  function syncPlaceholderState() {
    const mount = getRegionsMount();
    if (!mount) return;

    mount.dataset.cookieLanguageOverlayReady = 'true';
    renderRegions();
    syncSelectedCountryState();
  }

  /* =============================================================================
     09) BINDINGS
  ============================================================================= */
  function bindCloseControls() {
    getCloseControls().forEach((control) => {
      if (control.dataset.cookieLanguageOverlayCloseBound === 'true') return;
      control.dataset.cookieLanguageOverlayCloseBound = 'true';

      control.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        closeOverlay();
        requestReturnToCookieConsent();
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
      event.preventDefault();
      event.stopPropagation();
    });
  }

  function bindEscapeKey() {
    if (document.body.dataset.cookieLanguageOverlayEscapeBound === 'true') return;
    document.body.dataset.cookieLanguageOverlayEscapeBound = 'true';

    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      if (!isOpen()) return;
      event.preventDefault();
      closeOverlay();
      requestReturnToCookieConsent();
    });
  }

  function bindSearchInput() {
    const input = getSearchInput();
    if (!input || input.dataset.cookieLanguageOverlaySearchBound === 'true') return;

    input.dataset.cookieLanguageOverlaySearchBound = 'true';

    const applyFilter = () => {
      filterRegions(input.value);
    };

    input.addEventListener('keydown', (event) => {
      event.stopPropagation();
    });

    input.addEventListener('input', applyFilter);
    input.addEventListener('search', applyFilter);
    input.addEventListener('keyup', applyFilter);
    input.addEventListener('change', applyFilter);
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
      syncStatusNode();

      window.setTimeout(() => {
        closeOverlay();
        requestReturnToCookieConsent();
      }, 180);
    });
  }

  /* =============================================================================
     10) EVENT BRIDGE
  ============================================================================= */
  function bindOpenRequests() {
    if (document.body.dataset.cookieLanguageOverlayOpenRequestBound === 'true') return;
    document.body.dataset.cookieLanguageOverlayOpenRequestBound = 'true';

    document.addEventListener('cookie-language-overlay:open-request', () => {
      openOverlay();
    });
  }

  /* =============================================================================
     10A) OVERLAY COORDINATION
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
     11A) INIT RETRY
  ============================================================================= */
  function scheduleInitRetry() {
    clearInitRetryTimer();
    initRetryTimer = window.setTimeout(() => {
      initRetryTimer = null;
      initCookieLanguageOverlay();
    }, INIT_RETRY_DELAY_MS);
  }

  /* =============================================================================
     11) INITIALIZATION
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
    unlockBodyScroll();
    bindCloseControls();
    bindBackdropClose();
    bindEscapeKey();
    bindScrollGuard();
    bindSearchInput();
    bindRegionsScrollBehavior();
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