/* =============================================================================
   00) FILE INDEX
   01) MODULE IDENTITY
   02) ROOT CONSTANTS
   03) STATE
   04) QUERY HELPERS
   05) MOUNT HELPERS
   06) INIT RETRY HELPERS
   07) SURFACE HELPERS
   08) ROW / TOGGLE HELPERS
   09) GRANULAR SUBTOGGLE HELPERS
   10) LANGUAGE / REGION HELPERS
   11) COOKIE LANGUAGE OVERLAY TRIGGER HELPERS
   12) COOKIE LANGUAGE RETURN HELPERS
   13) LEARNING PANEL HELPERS
   14) STORAGE HELPERS
   15) DISPLAY DECISION HELPERS
   16) OPEN / CLOSE STATE
   17) CONSENT ACTIONS
   18) EVENT BINDING
   19) OVERLAY COORDINATION
   20) INITIALIZATION
============================================================================= */

/* =============================================================================
   01) MODULE IDENTITY
============================================================================= */
(() => {
  const MODULE_ID = 'cookie-consent';

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
  let initScheduled = false;
  let initCompleted = false;
  let initAttempts = 0;
  let lastBodyScrollTop = 0;
  const MAX_INIT_ATTEMPTS = 24;

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
    const storageKeys = ['countryCode', 'localeCountryCode'];

    for (const key of storageKeys) {
      const value = window.localStorage.getItem(key);
      const normalized = String(value || '').trim().toUpperCase();
      if (/^[A-Z]{2}$/.test(normalized)) return normalized;
    }

    return '';
  }

  function isHomePage() {
    const path = window.location.pathname || '';
    return path === '/' || path.endsWith('/index.html');
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

  /* =============================================================================
     06) INIT RETRY HELPERS
  ============================================================================= */
  function resetInitScheduling() {
    initScheduled = false;
  }

  function scheduleInitRetry() {
    if (initCompleted || initScheduled || initAttempts >= MAX_INIT_ATTEMPTS) return;

    initScheduled = true;
    initAttempts += 1;

    window.requestAnimationFrame(() => {
      resetInitScheduling();
      initCookieConsent();
    });
  }

  /* =============================================================================
     07) SURFACE HELPERS
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

    const normalized = surface === 'settings' ? 'settings' : 'banner';
    mount.dataset.consentSurface = normalized;

    getSurfaceNodes().forEach((node) => {
      node.hidden = node.dataset.cookieConsentSurface !== normalized;
    });
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

  /* =============================================================================
     08) ROW / TOGGLE HELPERS
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
     09) GRANULAR SUBTOGGLE HELPERS
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
     10) LANGUAGE / REGION HELPERS
  ============================================================================= */
  function getPreferredLanguageLabel(preferredLanguageCode = '') {
    const explicitCode = String(preferredLanguageCode || '').trim().toLowerCase();

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
     11) COOKIE LANGUAGE OVERLAY TRIGGER HELPERS
  ============================================================================= */
  function requestCookieLanguageOverlay() {
    document.dispatchEvent(new CustomEvent('cookie-language-overlay:open-request', {
      detail: {
        source: MODULE_ID,
        reason: 'cookie-consent-language'
      }
    }));
  }

  /* =============================================================================
     12) COOKIE LANGUAGE RETURN HELPERS
  ============================================================================= */
  function requestReturnFromCookieLanguageOverlay() {
    openConsent('settings');
    syncLanguageValue();

    getLanguageControls().forEach((control) => {
      control.setAttribute('aria-expanded', 'false');
    });
  }

  /* =============================================================================
     13) LEARNING PANEL HELPERS
  ============================================================================= */
  function requestCookieLearningOverlay(key) {
    if (!key) return;

    rememberBodyScrollPosition();
    document.dispatchEvent(new CustomEvent('cookie-learning-overlay:open-request', {
      detail: {
        source: MODULE_ID,
        key
      }
    }));
  }

  function requestReturnFromCookieLearningOverlay() {
    openConsent('settings');
    restoreBodyScrollPosition();

    qa('[data-cookie-consent-learning-expand]', getOverlay() || document).forEach((control) => {
      if (!(control instanceof HTMLElement)) return;
      control.setAttribute('aria-expanded', 'false');
    });
  }

  function hasOpenLearningPanel() {
    return document.body.classList.contains('cookie-learning-overlay-open');
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
     14) STORAGE HELPERS
  ============================================================================= */
  function readStoredConsent() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function writeStoredConsent(payload) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      return;
    }
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
     15) DISPLAY DECISION HELPERS
  ============================================================================= */
  function shouldAutoOpenBanner(stored) {
    if (!stored) return true;

    const mount = getMount();
    const mountState = mount?.dataset?.consentState || 'pending';
    if (isHomePage() && mountState === 'pending') return true;

    return stored.state === 'pending';
  }

  /* =============================================================================
     16) OPEN / CLOSE STATE
  ============================================================================= */
  function clearCloseTimer() {
    if (!closeTimer) return;
    window.clearTimeout(closeTimer);
    closeTimer = null;
  }

  function openConsent(surface = 'banner') {
    const overlay = getOverlay();
    if (!overlay) return;

    clearCloseTimer();
    applySurface(surface);

    applyStoredConsentToInputs();

    resetExpandedRows();

    document.body.classList.remove(CLOSING_CLASS);
    document.body.classList.add(OPEN_CLASS);
    overlay.setAttribute('aria-hidden', 'false');

    const body = getBody();
    if (body) {
      body.scrollTop = surface === 'settings' ? lastBodyScrollTop : 0;
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

    closeTimer = window.setTimeout(() => {
      document.body.classList.remove(CLOSING_CLASS);
      document.dispatchEvent(new CustomEvent('cookie-consent:closed', {
        detail: { source: MODULE_ID }
      }));
    }, CLOSE_DELAY_MS);
  }

  /* =============================================================================
     17) CONSENT ACTIONS
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
     18) EVENT BINDING
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

      control.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();

        control.setAttribute('aria-expanded', 'true');
        requestCookieLanguageOverlay();
      });

      control.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;

        event.preventDefault();
        event.stopPropagation();
        control.click();
      });
    });
  }

  function bindLearningControls() {
    const overlay = getOverlay();
    if (!overlay) return;

    qa('[data-cookie-consent-learning-expand]', overlay).forEach((control) => {
      if (!(control instanceof HTMLElement)) return;
      if (control.dataset.cookieConsentLearningBound === 'true') return;
      control.dataset.cookieConsentLearningBound = 'true';

      control.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();

        const key = control.dataset.cookieConsentLearningExpand || '';
        if (!key) return;

        qa('[data-cookie-consent-learning-expand]', overlay).forEach((node) => {
          if (!(node instanceof HTMLElement)) return;
          node.setAttribute('aria-expanded', node === control ? 'true' : 'false');
        });

        requestCookieLearningOverlay(key);
      });

      control.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;

        event.preventDefault();
        event.stopPropagation();
        control.click();
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
      if (!document.body.classList.contains(OPEN_CLASS)) return;

      if (hasOpenLearningPanel()) {
        return;
      }

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
    bindLearningControls();
    bindExpandControls();
    bindToggleControls();
    bindSubtoggleControls();
    bindEscapeKey();
    bindScrollContainment();
  }

  /* =============================================================================
     19) OVERLAY COORDINATION
  ============================================================================= */
  function bindOpenRequests() {
    if (requestBound) return;
    requestBound = true;

    document.addEventListener('cookie-consent:open-request', (event) => {
      const detail = getEventDetail(event);
      openConsent(detail.surface === 'settings' ? 'settings' : 'banner');
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

    document.addEventListener('cookie-language-overlay:opened', () => {
      closeConsent();
    });

    document.addEventListener('cookie-learning-overlay:opened', () => {
      closeConsent();
    });

    document.addEventListener('cookie-language-overlay:return-to-cookie-consent', () => {
      requestReturnFromCookieLanguageOverlay();
    });
    document.addEventListener('cookie-learning-overlay:return', () => {
      requestReturnFromCookieLearningOverlay();
    });
    document.addEventListener('country-selected', (event) => {
      const detail = getEventDetail(event);
      syncLanguageValue(detail.language || '');
    });
    document.addEventListener('translation:complete', (event) => {
      const detail = getEventDetail(event);
      const completedLanguage = detail.language || detail.lang || '';

      window.requestAnimationFrame(() => {
        syncLanguageValue(completedLanguage);
      });
    });
  }

  function bindMountLifecycle() {
    if (document.documentElement.dataset.cookieConsentLifecycleBound === 'true') return;
    document.documentElement.dataset.cookieConsentLifecycleBound = 'true';

    document.addEventListener('cookie-consent:mounted', () => {
      scheduleInitRetry();
    });

    document.addEventListener('fragment:mounted', (event) => {
      const detail = getEventDetail(event);
      if (detail.name !== 'cookie-consent') return;
      scheduleInitRetry();
    });
  }

  /* =============================================================================
     20) INITIALIZATION
  ============================================================================= */
  async function initCookieConsent() {
    const mount = getMount();
    if (!mount) {
      scheduleInitRetry();
      return;
    }

    ensureMountMetadata();

    if (!ensureOverlayReady()) {
      scheduleInitRetry();
      return;
    }

    applyStoredConsentToInputs();
    syncLanguageValue();
    syncToggleStates();
    bindControls();
    bindOpenRequests();
    bindOverlayCoordination();
    bindMountLifecycle();

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

  bindMountLifecycle();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initCookieConsent();
    }, { once: true });
  } else {
    initCookieConsent();
  }
})();