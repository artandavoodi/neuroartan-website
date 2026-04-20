/* =============================================================================
   00) FILE INDEX
   01) MODULE IDENTITY
   02) ROOT CONSTANTS
   03) STATE
   04) QUERY HELPERS
   05) MOUNT HELPERS
   06) SURFACE HELPERS
   07) ROW / TOGGLE HELPERS
   08) GRANULAR SUBTOGGLE HELPERS
   09) LANGUAGE / REGION HELPERS
   10) LANGUAGE ACTION HELPERS
   11) INNER SURFACE ROUTING HELPERS
   12) STORAGE HELPERS
   13) DISPLAY DECISION HELPERS
   14) OPEN / CLOSE STATE
   15) CONSENT ACTIONS
   16) EVENT BINDING
   17) SINGLE-OWNER COORDINATION
   18) EVENT REBINDING
   19) INITIALIZATION
   20) BOOTSTRAP
   21) END OF FILE
============================================================================= */

/* =============================================================================
   01) MODULE IDENTITY
============================================================================= */
(() => {
  'use strict';
  const MODULE_ID = 'cookie-consent';

  window.__artanRunWhenReady = window.__artanRunWhenReady || ((bootFn) => {
    if (typeof bootFn !== 'function') return;

    const run = () => {
      try { bootFn(); } catch (_) {}
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', run, { once: true });
    } else {
      run();
    }
  });

  /* =============================================================================
     02) ROOT CONSTANTS
  ============================================================================= */
  const OPEN_CLASS = 'cookie-consent-open';
  const CLOSING_CLASS = 'cookie-consent-closing';
  const STORAGE_KEY = 'neuroartan.cookieConsent';
  const CLOSE_DELAY_MS = 360;

  /* =============================================================================
     03) STATE
  ============================================================================= */
  let closeTimer = null;
  let escapeBound = false;
  let requestBound = false;
  let coordinationBound = false;
  let initCompleted = false;
  let mountEventsBound = false;
  let lastBodyScrollTop = 0;

  const INNER_SURFACE_CACHE = new Map();

  const INNER_SURFACE_PATHS = {
    language: [
      'assets/fragments/layers/website/cookie/cookie-language-overlay.html',
      './assets/fragments/layers/website/cookie/cookie-language-overlay.html',
      '/assets/fragments/layers/website/cookie/cookie-language-overlay.html',
      '/website/docs/assets/fragments/layers/website/cookie/cookie-language-overlay.html',
      '/docs/assets/fragments/layers/website/cookie/cookie-language-overlay.html'
    ],
    learning: [
      'assets/fragments/layers/website/cookie/cookie-learning-overlay.html',
      './assets/fragments/layers/website/cookie/cookie-learning-overlay.html',
      '/assets/fragments/layers/website/cookie/cookie-learning-overlay.html',
      '/website/docs/assets/fragments/layers/website/cookie/cookie-learning-overlay.html',
      '/docs/assets/fragments/layers/website/cookie/cookie-learning-overlay.html'
    ]
  };

  /* =============================================================================
     18) EVENT REBINDING
  ============================================================================= */
  function bindMountEvents() {
    if (mountEventsBound) return;
    mountEventsBound = true;

    document.addEventListener('cookie-consent:mounted', () => {
      initCompleted = false;
      initCookieConsent();
    });

    document.addEventListener('fragment:mounted', (event) => {
      const name = event?.detail?.name || '';
      if (name !== 'cookie-consent') return;

      initCompleted = false;
      initCookieConsent();
    });
  }

  /* =============================================================================
     04) QUERY HELPERS
  ============================================================================= */
  const q = (selector, scope = document) => scope.querySelector(selector);
  const qa = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

  function getMount() {
    return document.getElementById('cookie-consent-mount');
  }

  function getOverlay() {
    return q('[data-cookie-consent="root"]');
  }

  function getPanel() {
    const overlay = getOverlay();
    return overlay ? q('[data-cookie-consent="panel"]', overlay) : null;
  }

  function getBody() {
    const overlay = getOverlay();
    return overlay ? q('.cookie-consent-body', overlay) : null;
  }

  function getBackdrop() {
    const overlay = getOverlay();
    return overlay ? q('[data-cookie-consent="backdrop"]', overlay) : null;
  }

  function getCloseControls() {
    const overlay = getOverlay();
    return overlay ? qa('[data-cookie-consent-close="true"]', overlay) : [];
  }

  function getAcceptControls() {
    const overlay = getOverlay();
    return overlay ? qa('[data-cookie-consent-accept="true"]', overlay) : [];
  }

  function getRejectControls() {
    const overlay = getOverlay();
    return overlay ? qa('[data-cookie-consent-reject="true"]', overlay) : [];
  }

  function getSettingsControls() {
    const overlay = getOverlay();
    return overlay ? qa('[data-cookie-consent-settings="true"]', overlay) : [];
  }

  function getSaveControls() {
    const overlay = getOverlay();
    return overlay ? qa('[data-cookie-consent-save="true"]', overlay) : [];
  }

  function getSurfaceNodes() {
    const overlay = getOverlay();
    return overlay ? qa('[data-cookie-consent-surface]', overlay) : [];
  }

  function getCheckboxes() {
    const overlay = getOverlay();
    return overlay ? qa('[data-cookie-consent-category]', overlay) : [];
  }

  function getExpandControls() {
    const overlay = getOverlay();
    return overlay ? qa('[data-cookie-consent-expand]', overlay) : [];
  }

  function getToggleControls() {
    const overlay = getOverlay();
    return overlay ? qa('[data-cookie-consent-toggle]', overlay) : [];
  }

  function getSubtoggleControls() {
    const overlay = getOverlay();
    return overlay ? qa('[data-cookie-consent-subtoggle]', overlay) : [];
  }

  function getSubcheckboxes() {
    const overlay = getOverlay();
    return overlay ? qa('[data-cookie-consent-subcategory]', overlay) : [];
  }

  function getLanguageControls() {
    const overlay = getOverlay();
    return overlay ? qa('[data-cookie-consent-language="true"]', overlay) : [];
  }

  function getLanguageValueNode() {
    const overlay = getOverlay();
    return overlay ? q('[data-cookie-consent-language-value="true"]', overlay) : null;
  }

  function getTitleNode() {
    const overlay = getOverlay();
    return overlay ? q('[data-cookie-consent-title="true"]', overlay) : null;
  }

  function getTitleIconAsset(asset = '') {
    const overlay = getOverlay();
    const normalized = String(asset || '').trim();
    if (!overlay || !normalized) return null;
    return q(`[data-cookie-consent-title-icon-asset="${normalized}"]`, overlay);
  }

  function syncTitleIconState(surface = '') {
    const normalized = String(surface || '').trim();
    const defaultIcon = getTitleIconAsset('default');
    const languageIcon = getTitleIconAsset('language');
    const showLanguage = normalized === 'language';

    if (defaultIcon instanceof HTMLElement) {
      defaultIcon.hidden = showLanguage;
      defaultIcon.setAttribute('aria-hidden', showLanguage ? 'true' : 'false');
    }

    if (languageIcon instanceof HTMLElement) {
      languageIcon.hidden = !showLanguage;
      languageIcon.setAttribute('aria-hidden', showLanguage ? 'false' : 'true');
    }
  }

  function getDefaultTitle() {
    const node = getTitleNode();
    return String(node?.dataset?.cookieConsentTitleDefault || 'Privacy & Cookie Preferences').trim() || 'Privacy & Cookie Preferences';
  }

  function getSurfaceTitle(surface = '') {
    const node = getTitleNode();
    const normalized = String(surface || '').trim();
    if (!node || !normalized) return '';

    const datasetKey = `cookieConsentTitle${normalized
      .split('-')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join('')}`;

    return String(node.dataset?.[datasetKey] || '').trim();
  }

  function getPrimaryShellNode() {
    const overlay = getOverlay();
    return overlay ? q('[data-cookie-consent-primary-shell="true"]', overlay) : null;
  }

  function getHideWhenSubviewNodes() {
    const overlay = getOverlay();
    return overlay ? qa('[data-cookie-consent-hide-when-subview="true"]', overlay) : [];
  }

  function getPrimaryActionsNode() {
    const overlay = getOverlay();
    return overlay ? q('[data-cookie-consent-primary-actions="true"]', overlay) : null;
  }

  function getBackCloseControl() {
    const overlay = getOverlay();
    return overlay ? q('.cookie-consent-close--back', overlay) : null;
  }

  function getLanguageSurface() {
    const overlay = getOverlay();
    return overlay ? q('[data-cookie-consent-surface="language"]', overlay) : null;
  }

  function getLearningSurface() {
    const overlay = getOverlay();
    return overlay ? q('[data-cookie-consent-surface="learning"]', overlay) : null;
  }

  function getInnerSurfaceMount(surfaceName = '') {
    const normalized = String(surfaceName || '').trim();
    if (!normalized) return null;
    return document.getElementById(`cookie-consent-${normalized}-mount`);
  }

  function getLearningArticles() {
    const surface = getLearningSurface();
    return surface ? qa('[data-cookie-learning-overlay-article]', surface) : [];
  }

  function getLanguageReturnControls() {
    const surface = getLanguageSurface();
    return surface
      ? qa('[data-cookie-consent-return="settings"], [data-cookie-language-overlay-return="true"]', surface)
      : [];
  }

  function getLearningReturnControls() {
    const surface = getLearningSurface();
    return surface
      ? qa('[data-cookie-consent-return="settings"], [data-cookie-learning-overlay-return="true"]', surface)
      : [];
  }

  function getCheckboxByKey(key) {
    const overlay = getOverlay();
    return overlay ? q(`[data-cookie-consent-category="${key}"]`, overlay) : null;
  }

  function getToggleByKey(key) {
    const overlay = getOverlay();
    return overlay ? q(`[data-cookie-consent-toggle="${key}"]`, overlay) : null;
  }

  function getSubtoggleByKey(key) {
    const overlay = getOverlay();
    return overlay ? q(`[data-cookie-consent-subtoggle="${key}"]`, overlay) : null;
  }

  function getSubcheckboxByKey(key) {
    const overlay = getOverlay();
    return overlay ? q(`[data-cookie-consent-subcategory="${key}"]`, overlay) : null;
  }

  function getExpandByKey(key) {
    const overlay = getOverlay();
    return overlay ? q(`[data-cookie-consent-expand="${key}"]`, overlay) : null;
  }

  function getDetailByKey(key) {
    const overlay = getOverlay();
    return overlay ? q(`#cookie-consent-detail-${key}`, overlay) : null;
  }

  function getEventDetail(event) {
    return event && event.detail && typeof event.detail === 'object' ? event.detail : {};
  }

  function getSelectedCountryCode() {
    const storageKeys = [
      'neuroartan_country_code',
      'artan_country_code',
      'countryCode',
      'localeCountryCode'
    ];

    for (const key of storageKeys) {
      try {
        const localValue = window.localStorage.getItem(key);
        const localNormalized = String(localValue || '').trim().toUpperCase();
        if (/^[A-Z]{2}$/.test(localNormalized)) return localNormalized;
      } catch {}

      try {
        const sessionValue = window.sessionStorage.getItem(key);
        const sessionNormalized = String(sessionValue || '').trim().toUpperCase();
        if (/^[A-Z]{2}$/.test(sessionNormalized)) return sessionNormalized;
      } catch {}
    }

    return '';
  }

  function normalizeLanguageCode(value = '') {
    const raw = String(value || '').trim().toLowerCase();
    if (!raw) return '';
    return raw.split(/[-_]/)[0] || '';
  }

  function getStoredPreferredLanguageCode() {
    const storageKeys = [
      'neuroartan_language',
      'neuroartan-language',
      'artan_language',
      'selectedLanguage',
      'preferredLanguage',
      'language',
      'lang'
    ];

    for (const key of storageKeys) {
      try {
        const localValue = normalizeLanguageCode(window.localStorage.getItem(key) || '');
        if (localValue) return localValue;
      } catch {}

      try {
        const sessionValue = normalizeLanguageCode(window.sessionStorage.getItem(key) || '');
        if (sessionValue) return sessionValue;
      } catch {}
    }

    const localeApi = window.NEUROARTAN_TRANSLATION || window.ARTAN_TRANSLATION || null;
    if (localeApi && typeof localeApi.getCurrentLanguage === 'function') {
      const runtimeLanguage = normalizeLanguageCode(localeApi.getCurrentLanguage());
      if (runtimeLanguage) return runtimeLanguage;
    }

    return normalizeLanguageCode(document.documentElement.getAttribute('lang') || navigator.language || '');
  }

  /* =============================================================================
     05) MOUNT HELPERS
  ============================================================================= */
  function ensureMountMetadata() {
    const mount = getMount();
    if (!mount) return;

    if (!mount.dataset.consentState) mount.dataset.consentState = 'pending';
    if (!mount.dataset.consentSurface) mount.dataset.consentSurface = 'banner';
    if (!mount.dataset.consentSettings) mount.dataset.consentSettings = 'available';
  }

  function ensureOverlayReady() {
    const mount = getMount();
    const overlay = getOverlay();
    if (!mount || !overlay) return false;

    mount.dataset.cookieConsentRendered = 'true';
    return true;
  }

  function resetInnerSurfaceMount(surfaceName = '') {
    const normalized = String(surfaceName || '').trim();
    if (!normalized) return;

    const mount = getInnerSurfaceMount(normalized);
    if (!(mount instanceof HTMLElement)) return;

    mount.innerHTML = '';
    delete mount.dataset.cookieConsentInnerMounted;
  }

  /* =============================================================================
     06) SURFACE HELPERS
  ============================================================================= */
  function applyState(state = 'pending') {
    const mount = getMount();
    if (!mount) return;
    mount.dataset.consentState = state;
  }

  function applySurface(surface = 'banner') {
    const mount = getMount();
    const overlay = getOverlay();
    if (!mount || !overlay) return;

    const allowed = new Set(['banner', 'settings', 'language', 'learning']);
    const normalized = allowed.has(surface) ? surface : 'banner';
    mount.dataset.consentSurface = normalized;

    deactivateInnerSurfaces(normalized);

    getSurfaceNodes().forEach((node) => {
      node.hidden = node.dataset.cookieConsentSurface !== normalized;
    });
    syncShellViewState();
  }

  function rememberBodyScrollPosition() {
    const body = getBody();
    if (!body) return;
    lastBodyScrollTop = body.scrollTop;
  }

  function restoreBodyScrollPosition() {
    const body = getBody();
    if (!body) return;

    window.requestAnimationFrame(() => {
      body.scrollTop = lastBodyScrollTop;
    });
  }

  function getCurrentSurface() {
    const mount = getMount();
    return String(mount?.dataset?.consentSurface || 'banner').trim() || 'banner';
  }

  function isConsentOpen() {
    return document.body.classList.contains(OPEN_CLASS);
  }

  function isLanguageSurfaceOpen() {
    return getCurrentSurface() === 'language';
  }

  function isLearningSurfaceOpen() {
    return getCurrentSurface() === 'learning';
  }

  function isInnerSurfaceOpen() {
    return isLanguageSurfaceOpen() || isLearningSurfaceOpen();
  }

  function resolveLearningTitle(articleKey = '') {
    const normalized = String(articleKey || '').trim();
    const trigger = q(`[data-cookie-consent-learning-expand="${normalized}"]`, getOverlay() || document);
    const explicitTitle = String(trigger?.dataset?.cookieConsentLearningTitle || '').trim();
    if (explicitTitle) return explicitTitle;
    if (normalized === 'why-we-use-them') return 'Why we use them';
    return 'What are cookies?';
  }

  function syncShellViewState() {
    const currentSurface = getCurrentSurface();
    const titleNode = getTitleNode();
    const backControl = getBackCloseControl();
    const closeControls = getCloseControls().filter((control) => !control.classList.contains('cookie-consent-close--back'));
    const primaryShell = getPrimaryShellNode();
    const hideWhenSubviewNodes = getHideWhenSubviewNodes();
    const learningSurface = getLearningSurface();

    let titleText = getDefaultTitle();

    if (currentSurface === 'language') {
      titleText = getSurfaceTitle('language') || 'Language & Region';
    }

    if (currentSurface === 'learning' && learningSurface) {
      const activeArticle = getLearningArticles().find((article) => !article.hidden);
      const articleKey = String(activeArticle?.dataset?.cookieLearningOverlayArticle || '').trim();
      titleText = resolveLearningTitle(articleKey);
    }

    if (titleNode) {
      titleNode.textContent = titleText;
    }
    syncTitleIconState(currentSurface);

    const showInnerState = currentSurface === 'language' || currentSurface === 'learning';

    closeControls.forEach((control) => {
      if (!(control instanceof HTMLElement)) return;
      control.hidden = showInnerState;
      control.setAttribute('aria-hidden', showInnerState ? 'true' : 'false');
    });

    if (backControl instanceof HTMLElement) {
      backControl.hidden = !showInnerState;
      backControl.setAttribute('aria-hidden', showInnerState ? 'false' : 'true');
    }

    if (primaryShell instanceof HTMLElement) {
      primaryShell.hidden = showInnerState;
      primaryShell.setAttribute('aria-hidden', showInnerState ? 'true' : 'false');
    }

    hideWhenSubviewNodes.forEach((node) => {
      if (!(node instanceof HTMLElement)) return;
      node.hidden = showInnerState;
      node.setAttribute('aria-hidden', showInnerState ? 'true' : 'false');
    });
  }

  /* =============================================================================
     07) ROW / TOGGLE HELPERS
  ============================================================================= */
  function setToggleVisualState(key, enabled) {
    const toggle = getToggleByKey(key);
    if (!toggle) return;

    const value = Boolean(enabled);
    toggle.dataset.cookieConsentEnabled = value ? 'true' : 'false';
    toggle.setAttribute('aria-pressed', value ? 'true' : 'false');
    toggle.setAttribute('aria-checked', value ? 'true' : 'false');
  }

  function syncToggleStates() {
    getCheckboxes().forEach((checkbox) => {
      const key = checkbox.dataset.cookieConsentCategory;
      if (!key || key === 'essential') return;
      setToggleVisualState(key, checkbox.checked);
    });
  }

  /* =============================================================================
     08) GRANULAR SUBTOGGLE HELPERS
  ============================================================================= */
  function setSubtoggleVisualState(key, enabled) {
    const toggle = getSubtoggleByKey(key);
    if (!toggle) return;

    const value = Boolean(enabled);
    toggle.dataset.cookieConsentEnabled = value ? 'true' : 'false';
    toggle.setAttribute('aria-pressed', value ? 'true' : 'false');
    toggle.setAttribute('aria-checked', value ? 'true' : 'false');
  }

  function syncSubtoggleStates() {
    getSubcheckboxes().forEach((checkbox) => {
      const key = checkbox.dataset.cookieConsentSubcategory;
      if (!key) return;
      setSubtoggleVisualState(key, checkbox.checked);
    });
  }

  function syncParentToggleFromSubitems(parentKey) {
    if (!parentKey) return;

    const children = getSubcheckboxes().filter((checkbox) => checkbox.dataset.cookieConsentParent === parentKey);
    if (!children.length) return;

    const parentCheckbox = getCheckboxByKey(parentKey);
    if (!parentCheckbox) return;

    parentCheckbox.checked = children.some((checkbox) => checkbox.checked);
    setToggleVisualState(parentKey, parentCheckbox.checked);
  }

  function setSubitemsForParent(parentKey, enabled) {
    if (!parentKey) return;

    getSubcheckboxes().forEach((checkbox) => {
      if (checkbox.dataset.cookieConsentParent !== parentKey) return;
      checkbox.checked = Boolean(enabled);
      const subkey = checkbox.dataset.cookieConsentSubcategory;
      if (subkey) setSubtoggleVisualState(subkey, checkbox.checked);
    });
  }

  /* =============================================================================
     09) LANGUAGE / REGION HELPERS
  ============================================================================= */
  function getPreferredLanguageLabel(preferredLanguageCode = '') {
    const explicitCode = normalizeLanguageCode(preferredLanguageCode) || getStoredPreferredLanguageCode();

    if (explicitCode) {
      try {
        const explicitDisplayNames = new Intl.DisplayNames([explicitCode], { type: 'language' });
        const explicitLabel = String(explicitDisplayNames.of(explicitCode) || '').trim();
        if (explicitLabel) return explicitLabel;
      } catch {}
    }

    const selectedCountryCode = getSelectedCountryCode();

    if (selectedCountryCode && Array.isArray(window.ARTAN_COUNTRIES_DATA)) {
      const selectedCountry = window.ARTAN_COUNTRIES_DATA
        .flatMap((region) => Array.isArray(region?.countries) ? region.countries : [])
        .find((country) => {
          const code = String(country?.code || country?.countryCode || '').trim().toUpperCase();
          return code === selectedCountryCode;
        }) || null;

      const languageCode = String(
        selectedCountry?.language ||
        selectedCountry?.primaryLanguage ||
        (Array.isArray(selectedCountry?.languages) ? selectedCountry.languages[0] : '') ||
        ''
      ).trim().toLowerCase();

      if (languageCode) {
        try {
          const displayNames = new Intl.DisplayNames([languageCode], { type: 'language' });
          const label = String(displayNames.of(languageCode) || '').trim();
          if (label) return label;
        } catch {}
      }
    }

    const docLang = (document.documentElement.getAttribute('lang') || '').trim();
    const navLang = (navigator.language || '').trim();
    const raw = docLang || navLang;
    if (!raw) return 'Auto';

    const normalized = raw.replace('_', '-');
    const languageCode = normalized.split('-')[0].toLowerCase();

    try {
      const displayNames = new Intl.DisplayNames([languageCode || normalized], { type: 'language' });
      const label = String(displayNames.of(languageCode) || '').trim();
      return label || normalized.toUpperCase();
    } catch {
      return normalized.toUpperCase();
    }
  }

  function syncLanguageValue(preferredLanguageCode = '') {
    const valueNode = getLanguageValueNode();
    if (!valueNode) return;
    valueNode.textContent = getPreferredLanguageLabel(preferredLanguageCode);
  }

  /* =============================================================================
     10) LANGUAGE ACTION HELPERS
  ============================================================================= */
  async function requestLanguageOverlay() {
    openConsent('settings');
    rememberBodyScrollPosition();
    deactivateInnerSurfaces('language');

    const mounted = await mountInnerSurface('language');
    if (!mounted) return;

    applySurface('language');
  }

  function deactivateInnerSurfaces(nextSurface = '') {
    const normalizedNextSurface = String(nextSurface || '').trim();
    const languageSurface = getLanguageSurface();
    const learningSurface = getLearningSurface();

    if (languageSurface instanceof HTMLElement) {
      const isLanguageTarget = normalizedNextSurface === 'language';
      languageSurface.hidden = !isLanguageTarget;
      languageSurface.setAttribute('aria-hidden', isLanguageTarget ? 'false' : 'true');

      if (!isLanguageTarget) {
        resetInnerSurfaceMount('language');
      }
    }

    if (learningSurface instanceof HTMLElement) {
      const isLearningTarget = normalizedNextSurface === 'learning';
      learningSurface.hidden = !isLearningTarget;
      learningSurface.setAttribute('aria-hidden', isLearningTarget ? 'false' : 'true');

      if (!isLearningTarget) {
        delete learningSurface.dataset.cookieConsentActiveArticle;
      }
    }

    if (normalizedNextSurface !== 'learning') {
      getLearningArticles().forEach((article) => {
        if (!(article instanceof HTMLElement)) return;
        article.hidden = true;
      });
    }
  }

  function closeLanguageSettingsInline() {
    getLanguageControls().forEach((control) => {
      control.setAttribute('aria-expanded', 'false');
    });
  }

  /* =============================================================================
     11) INNER SURFACE ROUTING HELPERS
  ============================================================================= */
  async function fetchInnerSurfaceMarkup(surfaceName = '') {
    const normalized = String(surfaceName || '').trim();
    if (!normalized) return '';

    if (INNER_SURFACE_CACHE.has(normalized)) {
      return INNER_SURFACE_CACHE.get(normalized) || '';
    }

    const candidates = INNER_SURFACE_PATHS[normalized] || [];

    for (const candidate of candidates) {
      try {
        const response = await fetch(candidate, { cache: 'no-store' });
        if (!response.ok) continue;
        const html = await response.text();
        if (!html) continue;
        INNER_SURFACE_CACHE.set(normalized, html);
        return html;
      } catch {}
    }

    return '';
  }

  async function mountInnerSurface(surfaceName = '') {
    const normalized = String(surfaceName || '').trim();
    if (!normalized) return false;

    const mount = getInnerSurfaceMount(normalized);
    if (!(mount instanceof HTMLElement)) return false;

    if (mount.dataset.cookieConsentInnerMounted === 'true') return true;

    const markup = await fetchInnerSurfaceMarkup(normalized);
    if (!markup) return false;

    const parser = new DOMParser();
    const parsed = parser.parseFromString(markup, 'text/html');
    const root = parsed.body.firstElementChild;
    if (!(root instanceof HTMLElement)) return false;

    root.removeAttribute('hidden');
    root.setAttribute('aria-hidden', 'false');

    mount.innerHTML = '';
    mount.appendChild(root);
    mount.dataset.cookieConsentInnerMounted = 'true';

    if (normalized === 'language' && window.NeuroMotion && typeof window.NeuroMotion.scan === 'function') {
      window.NeuroMotion.scan(mount);
    }

    document.dispatchEvent(new CustomEvent('fragment:mounted', {
      detail: { name: normalized === 'language' ? 'cookie-language-overlay' : 'cookie-learning-overlay', root: mount, mount }
    }));

    bindInnerReturnControls();
    syncShellViewState();
    return true;
  }

  function activateLearningArticle(articleKey = '') {
    const normalized = String(articleKey || '').trim() || 'cookies';
    const learningSurface = getLearningSurface();

    getLearningArticles().forEach((article) => {
      if (!(article instanceof HTMLElement)) return;
      const isMatch = String(article.dataset.cookieLearningOverlayArticle || '').trim() === normalized;
      article.hidden = !isMatch;
    });

    if (learningSurface instanceof HTMLElement) {
      learningSurface.dataset.cookieConsentActiveArticle = normalized;
    }

    syncShellViewState();
  }

  async function requestLearningOverlay(articleKey = '') {
    openConsent('settings');
    rememberBodyScrollPosition();
    deactivateInnerSurfaces('learning');

    const mounted = await mountInnerSurface('learning');
    if (!mounted) return;

    activateLearningArticle(articleKey || 'cookies');
    applySurface('learning');
  }

  function closeLearningPanelsInline() {
    restoreBodyScrollPosition();
    resetExpandedRows();
  }

  function hasOpenLearningPanel() {
    return false;
  }

  function setExpandedState(key, expanded) {
    const overlay = getOverlay();
    if (!overlay || !key) return;

    const triggers = qa(`[data-cookie-consent-expand="${key}"]`, overlay);
    const detail = q(`#cookie-consent-detail-${key}`, overlay);
    const value = Boolean(expanded);

    triggers.forEach((trigger) => {
      trigger.setAttribute('aria-expanded', value ? 'true' : 'false');
    });

    if (detail) {
      detail.hidden = !value;
    }
  }

  function collapseExpandedRows(exceptKey = '') {
    getExpandControls().forEach((control) => {
      const key = control.dataset.cookieConsentExpand;
      if (!key || key === exceptKey) return;
      setExpandedState(key, false);
    });
  }

  function resetExpandedRows() {
    getExpandControls().forEach((control) => {
      const key = control.dataset.cookieConsentExpand;
      if (!key) return;
      setExpandedState(key, false);
    });
  }

  /* =============================================================================
     12) STORAGE HELPERS
  ============================================================================= */
  function readStoredConsent() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {
    }

    try {
      const raw = window.sessionStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function writeStoredConsent(payload) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
    }

    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {}
  }

  function applyStoredConsentToInputs() {
    const stored = readStoredConsent();

    getCheckboxes().forEach((checkbox) => {
      const key = checkbox.dataset.cookieConsentCategory;
      if (!key || key === 'essential') return;

      if (stored && stored.preferences) {
        checkbox.checked = Boolean(stored.preferences[key]);
        return;
      }

      checkbox.checked = true;
    });

    getSubcheckboxes().forEach((checkbox) => {
      const key = checkbox.dataset.cookieConsentSubcategory;
      const parentKey = checkbox.dataset.cookieConsentParent;
      if (!key || !parentKey) return;

      const storedValue = stored?.preferences?.[key];
      checkbox.checked = typeof storedValue === 'boolean'
        ? storedValue
        : Boolean(getCheckboxByKey(parentKey)?.checked);
    });

    syncToggleStates();
    syncSubtoggleStates();
    syncParentToggleFromSubitems('analytics');
    syncParentToggleFromSubitems('experience');
  }

  function getSettingsPayload() {
    const payload = {
      essential: true,
      analytics: true,
      experience: true,
      'analytics-performance': true,
      'analytics-usage': true,
      'experience-preferences': true,
      'experience-continuity': true
    };

    getCheckboxes().forEach((checkbox) => {
      const key = checkbox.dataset.cookieConsentCategory;
      if (!key || key === 'essential') return;
      payload[key] = Boolean(checkbox.checked);
    });

    getSubcheckboxes().forEach((checkbox) => {
      const key = checkbox.dataset.cookieConsentSubcategory;
      if (!key) return;
      payload[key] = Boolean(checkbox.checked);
    });

    return payload;
  }

  /* =============================================================================
     13) DISPLAY DECISION HELPERS
  ============================================================================= */
  function shouldAutoOpenBanner(stored) {
    if (!stored) return true;
    return String(stored.state || 'pending').trim() === 'pending';
  }

  /* =============================================================================
     14) OPEN / CLOSE STATE
  ============================================================================= */
  function clearCloseTimer() {
    if (!closeTimer) return;
    window.clearTimeout(closeTimer);
    closeTimer = null;
  }

  function openConsent(surface = 'banner') {
    const overlay = getOverlay();
    if (!overlay) return;

    const wasOpen = isConsentOpen();

    clearCloseTimer();
    applySurface(surface);
    syncShellViewState();

    if (!wasOpen) {
      applyStoredConsentToInputs();
    }

    resetExpandedRows();

    document.body.classList.remove(CLOSING_CLASS);
    document.body.classList.add(OPEN_CLASS);
    overlay.setAttribute('aria-hidden', 'false');

    const body = getBody();
    if (body) {
      body.scrollTop = surface === 'settings' ? lastBodyScrollTop : 0;
    }

    if (surface === 'language' || surface === 'learning') {
      window.requestAnimationFrame(() => {
        body?.scrollTo?.({ top: 0, behavior: 'auto' });
      });
    }

    document.dispatchEvent(new CustomEvent('cookie-consent:opened', {
      detail: { source: MODULE_ID, surface }
    }));
  }

  function closeConsent() {
    const overlay = getOverlay();
    if (!overlay) return;

    clearCloseTimer();
    document.body.classList.remove(OPEN_CLASS);
    document.body.classList.add(CLOSING_CLASS);
    overlay.setAttribute('aria-hidden', 'true');
    getLanguageControls().forEach((control) => {
      control.setAttribute('aria-expanded', 'false');
    });
    deactivateInnerSurfaces('banner');
    closeLearningPanelsInline();
    applySurface('banner');
    syncShellViewState();

    closeTimer = window.setTimeout(() => {
      document.body.classList.remove(CLOSING_CLASS);
      document.dispatchEvent(new CustomEvent('cookie-consent:closed', {
        detail: { source: MODULE_ID }
      }));
    }, CLOSE_DELAY_MS);
  }

  /* =============================================================================
     15) CONSENT ACTIONS
  ============================================================================= */
  function acceptAll() {
    writeStoredConsent({
      state: 'accepted',
      preferences: {
        essential: true,
        analytics: true,
        experience: true,
        'analytics-performance': true,
        'analytics-usage': true,
        'experience-preferences': true,
        'experience-continuity': true
      },
      updatedAt: new Date().toISOString()
    });

    applyState('accepted');
    applyStoredConsentToInputs();
    closeConsent();
  }

  function rejectNonEssential() {
    writeStoredConsent({
      state: 'rejected',
      preferences: {
        essential: true,
        analytics: false,
        experience: false,
        'analytics-performance': false,
        'analytics-usage': false,
        'experience-preferences': false,
        'experience-continuity': false
      },
      updatedAt: new Date().toISOString()
    });

    applyState('rejected');
    applyStoredConsentToInputs();
    closeConsent();
  }

  function saveSettings() {
    writeStoredConsent({
      state: 'customized',
      preferences: getSettingsPayload(),
      updatedAt: new Date().toISOString()
    });

    applyState('customized');
    syncToggleStates();
    closeConsent();
  }

  /* =============================================================================
     16) EVENT BINDING
  ============================================================================= */
  function bindCloseControls() {
    const backdrop = getBackdrop();

    getCloseControls().forEach((control) => {
      if (control.dataset.cookieConsentCloseBound === 'true') return;
      control.dataset.cookieConsentCloseBound = 'true';

      if (backdrop && control === backdrop) {
        control.addEventListener('click', (event) => {
          event.preventDefault();
          event.stopPropagation();
        });
        return;
      }

      control.addEventListener('click', () => closeConsent());
    });
  }

  function bindAcceptControls() {
    getAcceptControls().forEach((control) => {
      if (control.dataset.cookieConsentAcceptBound === 'true') return;
      control.dataset.cookieConsentAcceptBound = 'true';
      control.addEventListener('click', () => acceptAll());
    });
  }

  function bindRejectControls() {
    getRejectControls().forEach((control) => {
      if (control.dataset.cookieConsentRejectBound === 'true') return;
      control.dataset.cookieConsentRejectBound = 'true';
      control.addEventListener('click', () => rejectNonEssential());
    });
  }

  function bindSettingsControls() {
    getSettingsControls().forEach((control) => {
      if (control.dataset.cookieConsentSettingsBound === 'true') return;
      control.dataset.cookieConsentSettingsBound = 'true';
      control.addEventListener('click', () => openConsent('settings'));
    });
  }

  function bindSaveControls() {
    getSaveControls().forEach((control) => {
      if (control.dataset.cookieConsentSaveBound === 'true') return;
      control.dataset.cookieConsentSaveBound = 'true';
      control.addEventListener('click', () => saveSettings());
    });
  }

  function bindLanguageControls() {
    getLanguageControls().forEach((control) => {
      if (control.dataset.cookieConsentLanguageBound === 'true') return;
      control.dataset.cookieConsentLanguageBound = 'true';

      control.addEventListener('click', async (event) => {
        event.preventDefault();
        event.stopPropagation();
        await requestLanguageOverlay();
      });

      control.addEventListener('keydown', async (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        event.stopPropagation();
        await requestLanguageOverlay();
      });
    });
  }

  function bindInnerReturnControls() {
    const bindReturn = (control) => {
      if (!(control instanceof HTMLElement)) return;
      if (control.dataset.cookieConsentReturnBound === 'true') return;
      control.dataset.cookieConsentReturnBound = 'true';

      control.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        deactivateInnerSurfaces('settings');
        applySurface('settings');
        restoreBodyScrollPosition();
        syncShellViewState();
      });
    };

    getLanguageReturnControls().forEach(bindReturn);
    getLearningReturnControls().forEach(bindReturn);

    const backControl = getBackCloseControl();
    bindReturn(backControl);
  }

  function bindLearningControls() {
    const overlay = getOverlay();
    if (!overlay) return;

    qa('[data-cookie-consent-learning-expand]', overlay).forEach((control) => {
      if (!(control instanceof HTMLElement)) return;
      if (control.dataset.cookieConsentLearningBound === 'true') return;
      control.dataset.cookieConsentLearningBound = 'true';

      control.addEventListener('click', async (event) => {
        event.preventDefault();
        event.stopPropagation();
        const articleKey = String(control.dataset.cookieConsentLearningExpand || '').trim() || 'cookies';
        await requestLearningOverlay(articleKey);
      });

      control.addEventListener('keydown', async (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        event.stopPropagation();
        const articleKey = String(control.dataset.cookieConsentLearningExpand || '').trim() || 'cookies';
        await requestLearningOverlay(articleKey);
      });
    });
  }

  function bindExpandControls() {
    getExpandControls().forEach((control) => {
      if (control.dataset.cookieConsentExpandBound === 'true') return;
      control.dataset.cookieConsentExpandBound = 'true';

      control.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();

        const key = control.dataset.cookieConsentExpand;
        if (!key) return;

        const isExpanded = control.getAttribute('aria-expanded') === 'true';
        collapseExpandedRows(key);
        setExpandedState(key, !isExpanded);
      });

      control.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;

        event.preventDefault();
        event.stopPropagation();
        control.click();
      });
    });
  }

  function bindToggleControls() {
    getToggleControls().forEach((control) => {
      if (control.dataset.cookieConsentToggleBound === 'true') return;
      control.dataset.cookieConsentToggleBound = 'true';

      control.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();

        const key = control.dataset.cookieConsentToggle;
        if (!key) return;

        const checkbox = getCheckboxByKey(key);
        if (!checkbox) return;

        checkbox.checked = !checkbox.checked;
        setSubitemsForParent(key, checkbox.checked);
        setToggleVisualState(key, checkbox.checked);
      });

      control.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;

        event.preventDefault();
        event.stopPropagation();
        control.click();
      });
    });
  }

  function bindSubtoggleControls() {
    getSubtoggleControls().forEach((control) => {
      if (control.dataset.cookieConsentSubtoggleBound === 'true') return;
      control.dataset.cookieConsentSubtoggleBound = 'true';

      control.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();

        const key = control.dataset.cookieConsentSubtoggle;
        if (!key) return;

        const checkbox = getSubcheckboxByKey(key);
        if (!checkbox) return;

        checkbox.checked = !checkbox.checked;
        setSubtoggleVisualState(key, checkbox.checked);
        syncParentToggleFromSubitems(checkbox.dataset.cookieConsentParent || '');
      });

      control.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;

        event.preventDefault();
        event.stopPropagation();
        control.click();
      });
    });
  }

  function bindEscapeKey() {
    if (escapeBound) return;
    escapeBound = true;

    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      if (!isConsentOpen()) return;

      if (isLearningSurfaceOpen()) {
        event.preventDefault();
        event.stopPropagation();
        deactivateInnerSurfaces('settings');
        applySurface('settings');
        restoreBodyScrollPosition();
        return;
      }

      if (isLanguageSurfaceOpen()) {
        event.preventDefault();
        event.stopPropagation();
        deactivateInnerSurfaces('settings');
        applySurface('settings');
        restoreBodyScrollPosition();
        return;
      }

      if (hasOpenLearningPanel()) {
        event.preventDefault();
        event.stopPropagation();
        closeLearningPanelsInline();
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      closeConsent();
    });
  }

  function bindScrollContainment() {
    const overlay = getOverlay();
    const panel = getPanel();
    const body = getBody();
    const backdrop = getBackdrop();

    if (!overlay || !panel || !body || !backdrop) return;
    if (overlay.dataset.cookieConsentScrollBound === 'true') return;
    overlay.dataset.cookieConsentScrollBound = 'true';

    panel.style.touchAction = 'pan-y';
    body.style.touchAction = 'pan-y';
    body.style.overscrollBehavior = 'contain';
    body.style.webkitOverflowScrolling = 'touch';

    panel.addEventListener('wheel', (event) => event.stopPropagation(), { passive: true });
    body.addEventListener('wheel', (event) => event.stopPropagation(), { passive: true });
    panel.addEventListener('touchmove', (event) => event.stopPropagation(), { passive: true });
    body.addEventListener('touchmove', (event) => event.stopPropagation(), { passive: true });
    backdrop.addEventListener('wheel', (event) => event.stopPropagation(), { passive: true });
    backdrop.addEventListener('touchmove', (event) => event.stopPropagation(), { passive: true });
  }

  function bindControls() {
    bindCloseControls();
    bindAcceptControls();
    bindRejectControls();
    bindSettingsControls();
    bindSaveControls();
    bindLanguageControls();
    bindInnerReturnControls();
    bindLearningControls();
    bindExpandControls();
    bindToggleControls();
    bindSubtoggleControls();
    bindEscapeKey();
    bindScrollContainment();
  }

  /* =============================================================================
     17) SINGLE-OWNER COORDINATION
  ============================================================================= */
  function bindOpenRequests() {
    if (requestBound) return;
    requestBound = true;

    document.addEventListener('cookie-consent:open-request', (event) => {
      const detail = getEventDetail(event);
      const requestedSurface = String(detail.surface || '').trim();

      if (requestedSurface === 'settings' || requestedSurface === 'language' || requestedSurface === 'learning') {
        openConsent(requestedSurface);
        return;
      }

      openConsent('banner');
    });

    document.addEventListener('neuroartan:cookie-consent-open-requested', (event) => {
      const detail = getEventDetail(event);
      const requestedSurface = String(detail.surface || '').trim();

      if (requestedSurface === 'settings' || requestedSurface === 'language' || requestedSurface === 'learning') {
        openConsent(requestedSurface);
        return;
      }

      openConsent('banner');
    });
  }

  function bindOverlayCoordination() {
    if (coordinationBound) return;
    coordinationBound = true;

    document.addEventListener('cookie-consent:open-request', () => {
      document.dispatchEvent(new CustomEvent('account-drawer:close-request', {
        detail: { source: MODULE_ID, reason: 'cookie-consent-open' }
      }));
    });

    document.addEventListener('cookie-consent:opened', () => {
      document.dispatchEvent(new CustomEvent('account-drawer:close-request', {
        detail: { source: MODULE_ID, reason: 'cookie-consent-opened' }
      }));
    });

    document.addEventListener('country-selected', (event) => {
      const detail = getEventDetail(event);
      syncLanguageValue(detail.language || '');
      closeLanguageSettingsInline();
    });

    document.addEventListener('neuroartan:locale-state-changed', (event) => {
      const detail = getEventDetail(event);
      syncLanguageValue(detail.language || '');
    });

    document.addEventListener('translation:complete', (event) => {
      const detail = getEventDetail(event);
      const completedLanguage = detail.language || detail.lang || '';

      window.requestAnimationFrame(() => {
        syncLanguageValue(completedLanguage);
        closeLanguageSettingsInline();
      });
    });
  }

  /* =============================================================================
     19) INITIALIZATION
  ============================================================================= */
  async function initCookieConsent() {
    const mount = getMount();
    if (!mount) return;
    if (initCompleted && ensureOverlayReady()) return;

    ensureMountMetadata();

    if (!ensureOverlayReady()) return;

    applyStoredConsentToInputs();
    syncLanguageValue();
    syncToggleStates();
    bindControls();
    bindOpenRequests();
    bindOverlayCoordination();

    syncShellViewState();
    const stored = readStoredConsent();
    if (shouldAutoOpenBanner(stored)) {
      window.requestAnimationFrame(() => {
        openConsent('banner');
      });
      initCompleted = true;
      return;
    }

    applyState(stored?.state || 'pending');
    initCompleted = true;
  }

  /* =============================================================================
     20) BOOTSTRAP
  ============================================================================= */

  function boot() {
    bindMountEvents();
    initCookieConsent();
  }

  window.__artanRunWhenReady(boot);

 /* =============================================================================
   21) END OF FILE
============================================================================= */
})();
