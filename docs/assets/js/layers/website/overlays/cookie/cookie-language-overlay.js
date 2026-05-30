/* =============================================================================
   00) FILE INDEX
   01) MODULE IDENTITY
   02) MODULE STATE
   03) ROOT HELPERS
   04) COUNTRY DATA HELPERS
   05) LABEL HELPERS
   06) STORAGE HELPERS
   07) RENDER HELPERS
   08) FILTER HELPERS
   09) SELECTION HELPERS
   10) EVENT BINDING
   11) INITIALIZATION
   12) BOOTSTRAP
   13) END OF FILE
============================================================================= */

/* =============================================================================
   01) MODULE IDENTITY
============================================================================= */
(() => {
  'use strict';

  const MODULE_ID = 'cookie-language-overlay';

  /* =============================================================================
     02) MODULE STATE
  ============================================================================= */
  const state = {
    query: '',
    selectedCountryCode: '',
    selectedLanguage: '',
    countries: [],
    boundRoots: new WeakSet()
  };

  /* =============================================================================
     03) ROOT HELPERS
  ============================================================================= */
  const q = (selector, scope = document) => scope.querySelector(selector);

  function getRoot(preferredRoot = null) {
    if (preferredRoot instanceof HTMLElement) {
      return preferredRoot.matches('[data-cookie-language-overlay="root"]')
        ? preferredRoot
        : preferredRoot.querySelector('[data-cookie-language-overlay="root"]');
    }

    return q('[data-cookie-language-overlay="root"]');
  }

  function getSearchInput(root) {
    return root ? q('[data-cookie-language-overlay-search="true"]', root) : null;
  }

  function getStatusNode(root) {
    return root ? q('[data-cookie-consent-language-status="true"]', root) : null;
  }

  function getSection(name = '', root) {
    return root ? q(`[data-cookie-language-overlay-section="${name}"]`, root) : null;
  }

  function getGroup(name = '', root) {
    return root ? q(`[data-cookie-language-overlay-group="${name}"]`, root) : null;
  }

  function getTemplate(root) {
    return root ? q('[data-cookie-language-overlay-template="country-item"]', root) : null;
  }

  /* =============================================================================
     04) LANGUAGE DATA HELPERS
  ============================================================================= */
  function normalizeLang(code = '') {
    const raw = String(code || '').trim().toLowerCase();
    if (!raw) return 'en';
    return raw.split('-')[0] || 'en';
  }

  function getSupportedLanguageConfigs() {
    const api = window.NEUROARTAN_TRANSLATION || window.ARTAN_TRANSLATION || null;
    const languages = typeof api?.getSupportedLanguages === 'function'
      ? api.getSupportedLanguages()
      : [];

    const normalized = Array.isArray(languages)
      ? languages.map((item) => {
        const code = normalizeLang(item?.code || item);
        if (!code) return null;
        return {
          code,
          label: String(item?.label || code.toUpperCase()).trim(),
          nativeLabel: String(item?.nativeLabel || item?.label || code.toUpperCase()).trim(),
          direction: item?.direction === 'rtl' ? 'rtl' : 'ltr'
        };
      }).filter(Boolean)
      : [];

    return normalized.length
      ? normalized
      : [{ code: 'en', label: 'English', nativeLabel: 'English', direction: 'ltr' }];
  }

  function getSupportedLanguageCodes() {
    return getSupportedLanguageConfigs().map((item) => item.code);
  }

  function resolveSupportedLanguage(code = '') {
    const normalized = normalizeLang(code || 'en');
    return getSupportedLanguageCodes().includes(normalized) ? normalized : 'en';
  }

  function normalizeSupportedLanguages(languages = []) {
    const values = Array.isArray(languages) ? languages : [languages];
    const normalized = values.map((value) => resolveSupportedLanguage(value)).filter(Boolean);
    return Array.from(new Set(normalized.length ? normalized : ['en']));
  }

  function getCountryData() {
    return getSupportedLanguageConfigs().map((language) => ({
      code: language.code.toUpperCase(),
      name: language.nativeLabel || language.label || language.code.toUpperCase(),
      language: language.code,
      languages: [language.code],
      direction: language.direction
    }));
  }

  /* =============================================================================
     05) LABEL HELPERS
  ============================================================================= */
  function getLanguageLabel(languageCode = '') {
    const normalized = resolveSupportedLanguage(languageCode);
    const config = getSupportedLanguageConfigs().find((item) => item.code === normalized);
    return config?.nativeLabel || config?.label || normalized.toUpperCase();
  }

  function getCountryLabel(country) {
    return String(country?.name || country?.code || '').trim();
  }

  function getCountryLanguageLabel(country) {
    const primary = normalizeLang(country?.language || (Array.isArray(country?.languages) ? country.languages[0] : ''));
    return getLanguageLabel(primary);
  }

  /* =============================================================================
     06) STORAGE HELPERS
  ============================================================================= */
  function getStoredCountryCode() {
    const keys = ['neuroartan_country_code', 'artan_country_code', 'countryCode', 'localeCountryCode'];
    for (const key of keys) {
      try {
        const value = String(window.localStorage.getItem(key) || '').trim().toUpperCase();
        if (/^[A-Z]{2}$/.test(value)) return value;
      } catch {}
    }
    return '';
  }

  function getStoredLanguage() {
    const keys = ['neuroartan_language', 'neuroartan-language', 'artan_language', 'language'];
    for (const key of keys) {
      try {
      const value = resolveSupportedLanguage(window.localStorage.getItem(key) || '');
        if (value) return value;
      } catch {}
    }
    return resolveSupportedLanguage(document.documentElement.getAttribute('lang') || navigator.language || 'en');
  }

  function syncStateFromStorage() {
    state.selectedCountryCode = getStoredCountryCode();
    state.selectedLanguage = getStoredLanguage();
    state.countries = getCountryData();
  }

  /* =============================================================================
     07) RENDER HELPERS
  ============================================================================= */
  function clearNode(node) {
    if (node instanceof HTMLElement) node.innerHTML = '';
  }

  function cloneCountryTemplate(root) {
    const template = getTemplate(root);
    if (!(template instanceof HTMLTemplateElement)) return null;
    const fragment = template.content.cloneNode(true);
    return fragment.firstElementChild instanceof HTMLElement ? fragment.firstElementChild : null;
  }

  function createCountryButton(country, root) {
    const button = cloneCountryTemplate(root);
    if (!(button instanceof HTMLElement)) return null;

    const nameNode = q('[data-cookie-language-overlay-country-name="true"]', button);
    const languageNode = q('[data-cookie-language-overlay-country-language="true"]', button);
    const codeNode = q('[data-cookie-language-overlay-country-code="true"]', button);

    const countryCode = String(country.code || '').trim().toUpperCase();
    const countryName = getCountryLabel(country);
    const languageCode = resolveSupportedLanguage(country.language || state.selectedLanguage || 'en');
    const languageLabel = getCountryLanguageLabel(country);
    const languageSet = Array.isArray(country.languages) && country.languages.length
      ? normalizeSupportedLanguages(country.languages)
      : [languageCode];
    const isSelected = languageCode === state.selectedLanguage;

    button.dataset.countryCode = countryCode;
    button.dataset.language = languageCode;
    button.dataset.languages = Array.from(new Set([...languageSet, 'en'])).join(',');
    button.dataset.countryName = countryName;
    button.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
    button.classList.toggle('is-selected', isSelected);

    if (nameNode) nameNode.textContent = countryName;
    if (languageNode) languageNode.textContent = languageLabel;
    if (codeNode) codeNode.textContent = countryCode;

    return button;
  }

  function getFilteredCountries() {
    const query = String(state.query || '').trim().toLowerCase();
    if (!query) return state.countries.slice();

    return state.countries.filter((country) => {
      const code = String(country.code || '').trim().toLowerCase();
      const name = getCountryLabel(country).toLowerCase();
      const language = getCountryLanguageLabel(country).toLowerCase();
      return code.includes(query) || name.includes(query) || language.includes(query);
    });
  }

  function renderRegions(root) {
    if (!(root instanceof HTMLElement)) return;

    syncStateFromStorage();

    const recommendedSection = getSection('recommended', root);
    const recommendedGroup = getGroup('recommended', root);
    const allSection = getSection('all', root);
    const allGroup = getGroup('all', root);
    const statusNode = getStatusNode(root);

    clearNode(recommendedGroup);
    clearNode(allGroup);

    const countries = getFilteredCountries();
    const selected = countries.find((country) => country.code === state.selectedCountryCode) || null;
    const allItems = countries.filter((country) => country.code !== state.selectedCountryCode);

    if (recommendedSection instanceof HTMLElement) {
      recommendedSection.hidden = !selected;
    }

    if (allSection instanceof HTMLElement) {
      allSection.hidden = countries.length === 0;
    }

    if (selected && recommendedGroup instanceof HTMLElement) {
      const selectedButton = createCountryButton(selected, root);
      if (selectedButton) recommendedGroup.appendChild(selectedButton);
    }

    allItems.forEach((country) => {
      const button = createCountryButton(country, root);
      if (button && allGroup instanceof HTMLElement) allGroup.appendChild(button);
    });

    if (statusNode instanceof HTMLElement) {
      statusNode.hidden = countries.length > 0;
    }
  }

  function resetLanguageSurface(root) {
    if (!(root instanceof HTMLElement)) return;

    state.query = '';

    const input = getSearchInput(root);
    if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) {
      input.value = '';
    }

    renderRegions(root);
  }

  /* =============================================================================
     08) FILTER HELPERS
  ============================================================================= */
  function bindSearch(root) {
    const input = getSearchInput(root);
    if (!(input instanceof HTMLInputElement) && !(input instanceof HTMLTextAreaElement)) return;
    if (input.dataset.cookieLanguageOverlaySearchBound === 'true') return;
    input.dataset.cookieLanguageOverlaySearchBound = 'true';

    input.addEventListener('input', () => {
      state.query = String(input.value || '').trim();
      renderRegions(root);
    });
  }

  /* =============================================================================
     09) SELECTION HELPERS
  ============================================================================= */
  async function applySelection(button, root) {
    if (!(button instanceof HTMLElement)) return;

    const countryCode = String(button.dataset.countryCode || '').trim().toUpperCase();
    const language = resolveSupportedLanguage(button.dataset.language || state.selectedLanguage || 'en');
    const languages = String(button.dataset.languages || language || 'en')
      .split(',')
      .map((value) => resolveSupportedLanguage(value))
      .filter(Boolean);
    const countryName = String(button.dataset.countryName || '').trim();

    if (!language) return;

    state.selectedLanguage = language;

    try {
      window.localStorage.setItem('neuroartan_language', language);
      window.localStorage.setItem('neuroartan-language', language);
      window.localStorage.setItem('artan_language', language);
      window.localStorage.setItem('neuroartan_languages', JSON.stringify(Array.from(new Set(languages))));
      window.localStorage.setItem('artan_languages', JSON.stringify(Array.from(new Set(languages))));
    } catch {}

    const localeApi = window.NEUROARTAN_COUNTRY_LANGUAGE || window.ARTAN_COUNTRY_LANGUAGE || null;
    if (localeApi && typeof localeApi.setLocalePreference === 'function') {
      try {
        await localeApi.setLocalePreference({
          countryCode: window.NEUROARTAN_LOCALE?.countryCode || '',
          countryLabel: window.NEUROARTAN_LOCALE?.countryLabel || '',
          language,
          languages
        });
      } catch {}
    } else if (localeApi && typeof localeApi.applyTranslation === 'function') {
      try {
        await localeApi.applyTranslation(language);
      } catch {}
    }

    document.dispatchEvent(new CustomEvent('country-selected', {
      detail: {
        code: countryCode,
        countryCode,
        country: window.NEUROARTAN_LOCALE?.countryLabel || '',
        name: window.NEUROARTAN_LOCALE?.countryLabel || '',
        language
      }
    }));

    resetLanguageSurface(root);
  }

  /* =============================================================================
     10) EVENT BINDING
  ============================================================================= */
  function bindRegionSelection(root) {
    const allSection = getSection('all', root);
    const recommendedSection = getSection('recommended', root);
    const sections = [allSection, recommendedSection].filter((node) => node instanceof HTMLElement);

    sections.forEach((section) => {
      if (section.dataset.cookieLanguageOverlaySelectionBound === 'true') return;
      section.dataset.cookieLanguageOverlaySelectionBound = 'true';

      section.addEventListener('click', async (event) => {
        const target = event.target;
        const button = target instanceof HTMLElement ? target.closest('[data-cookie-language-overlay-country="true"]') : null;
        if (!(button instanceof HTMLElement)) return;
        event.preventDefault();
        event.stopPropagation();
        await applySelection(button, root);
      });
    });
  }

  /* =============================================================================
     11) INITIALIZATION
  ============================================================================= */
  function initCookieLanguageOverlay(preferredRoot = null) {
    const root = getRoot(preferredRoot);
    if (!(root instanceof HTMLElement)) return;

    if (state.boundRoots.has(root)) {
      resetLanguageSurface(root);
      return;
    }

    state.boundRoots.add(root);
    bindSearch(root);
    bindRegionSelection(root);
    resetLanguageSurface(root);
  }

  /* =============================================================================
     12) BOOTSTRAP
  ============================================================================= */
  document.addEventListener('fragment:mounted', (event) => {
    const name = event?.detail?.name || '';
    const mountedRoot = event?.detail?.root || null;
    if (name !== MODULE_ID) return;
    initCookieLanguageOverlay(mountedRoot);
  });

  document.addEventListener('country-selected', () => {
    const root = getRoot();
    if (!(root instanceof HTMLElement)) return;
    resetLanguageSurface(root);
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      const root = getRoot();
      if (root) initCookieLanguageOverlay(root);
    }, { once: true });
  } else {
    const root = getRoot();
    if (root) initCookieLanguageOverlay(root);
  }

  /* =============================================================================
     13) END OF FILE
  ============================================================================= */
})();
