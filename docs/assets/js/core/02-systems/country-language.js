/* =============================================================================
   00) FILE INDEX
   01) MODULE IDENTITY
   02) MODULE REGISTRATION
   03) STORAGE KEYS
   04) DEFAULTS AND LANGUAGE NORMALIZATION
   05) STORAGE AND CACHE HELPERS
   06) LANGUAGE STATE HELPERS
   06A) CANONICAL COUNTRY DATA HELPERS
   07) LOCALE STATE EXPOSURE
   08) UI LABELS
   09) FOOTER LOCALE UI REFRESH
   10) LOCALE API RESOLUTION
   10A) CANONICAL LOCALE DELEGATION
   11) COUNTRY OVERLAY
   12) LANGUAGE DROPDOWN
   13) IP DETECTION
   14) COUNTRY RESOLUTION
   15) FOOTER AND OVERLAY BINDINGS
   15A) REBIND SCHEDULER
   15B) GLOBAL API EXPOSURE
   16) MAIN INITIALIZATION
   17) FRAGMENT-MOUNTED REBINDING
   18) SHARED READINESS HELPERS
   19) DEFER-SAFE BOOTSTRAP
============================================================================= */

/* =============================================================================
   01) MODULE IDENTITY
============================================================================= */
/* /website/docs/assets/js/core/02-systems/country-language.js */
(() => {
  'use strict';
  const MODULE_PATH = '/website/docs/assets/js/core/02-systems/country-language.js';

  /* =============================================================================
     02) MODULE REGISTRATION
  ============================================================================= */
  const getCountryOverlayRoot = () => {
    return document.getElementById('country-overlay') || document.querySelector('[data-country-overlay="root"]');
  };

  const getCountryOverlayCloseButton = () => {
    const root = getCountryOverlayRoot();
    return root ? root.querySelector('#country-overlay-close, [data-country-overlay-close="true"]') : null;
  };

  const getCountryRegionsRoot = () => {
    const root = getCountryOverlayRoot();
    return root ? root.querySelector('#country-regions, [data-country-regions="true"]') : null;
  };

  const getFooterCountryButton = () => {
    return document.getElementById('country-selector')
      || document.querySelector('[data-footer-country-selector="true"]')
      || document.querySelector('[data-home-footer-country-selector="true"]');
  };

  const getFooterLanguageToggle = () => {
    return document.getElementById('language-toggle')
      || document.querySelector('[data-footer-language-toggle="true"]')
      || document.querySelector('[data-home-footer-language-toggle="true"]');
  };

  const getFooterLanguageDropdown = () => {
    return document.getElementById('language-dropdown')
      || document.querySelector('[data-footer-language-dropdown="true"]')
      || document.querySelector('[data-home-footer-language-dropdown="true"]');
  };

  const getHomeFooterCountryValue = () => {
    return document.querySelector('[data-home-footer-country-value="true"]');
  };

  const getHomeFooterLanguageValue = () => {
    return document.querySelector('[data-home-footer-language-value="true"]');
  };

  /* =============================================================================
     03) STORAGE KEYS
  ============================================================================= */
  const STORAGE = {
    COUNTRY_CODE: 'neuroartan_country_code',
    COUNTRY_LABEL: 'neuroartan_country_label',
    LANGUAGE: 'neuroartan_language',
    LANGUAGES: 'neuroartan_languages',
    SESSION: 'neuroartan_session',
    COUNTRY_CACHE: 'neuroartan_country_cache_v1'
  };

  const LEGACY_STORAGE = {
    COUNTRY_CODE: 'artan_country_code',
    COUNTRY_LABEL: 'artan_country_label',
    LANGUAGE: 'artan_language',
    LANGUAGES: 'artan_languages',
    SESSION: 'artan_session',
    COUNTRY_CACHE: 'artan_country_cache_v1'
  };

  /* =============================================================================
     04) DEFAULTS AND LANGUAGE NORMALIZATION
  ============================================================================= */
  const DEFAULT_LANGUAGE = 'en';

  const ISO639_3_TO_1 = {
    ara: 'ar', bel: 'be', ben: 'bn', bul: 'bg', ces: 'cs', cmn: 'zh', dan: 'da',
    deu: 'de', ell: 'el', eng: 'en', est: 'et', fas: 'fa', fin: 'fi', fra: 'fr',
    heb: 'he', hin: 'hi', hrv: 'hr', hun: 'hu', ind: 'id', ita: 'it', jpn: 'ja',
    kaz: 'kk', kor: 'ko', lav: 'lv', lit: 'lt', msa: 'ms', nld: 'nl', nor: 'no',
    pol: 'pl', por: 'pt', ron: 'ro', rus: 'ru', slk: 'sk', slv: 'sl', spa: 'es',
    srp: 'sr', swe: 'sv', tam: 'ta', afr: 'af', tel: 'te', tha: 'th', tur: 'tr', ukr: 'uk',
    urd: 'ur', vie: 'vi', zho: 'zh'
  };

  const normalizeLang = (code) => {
    const raw = String(code || '').trim();
    if (!raw) return DEFAULT_LANGUAGE;

    let c = raw.split('-')[0].toLowerCase();

    if (c === 'nno' || c === 'nob' || c === 'nn' || c === 'nb') c = 'no';

    if (c.length === 3 && ISO639_3_TO_1[c]) {
      c = ISO639_3_TO_1[c];
    }

    if (!/^[a-z]{2}$/.test(c)) return DEFAULT_LANGUAGE;
    return c;
  };

  const resolveBrowserCountryCode = () => {
    const candidates = [
      navigator.language,
      ...(Array.isArray(navigator.languages) ? navigator.languages : [])
    ];

    for (const candidate of candidates) {
      const raw = String(candidate || '').trim();
      if (!raw) continue;

      const parts = raw.split(/[-_]/).map((value) => String(value || '').trim());
      const region = parts.find((value, index) => index > 0 && /^[A-Za-z]{2}$/.test(value));

      if (region) {
        return region.toUpperCase();
      }
    }

    return 'US';
  };

  const DEFAULT_COUNTRY_CODE = resolveBrowserCountryCode();

  /* =============================================================================
     05) STORAGE AND CACHE HELPERS
  ============================================================================= */
  const qs = (s) => document.querySelector(s);

  const getLS = (k, legacyKey = null) => {
    try {
      const primary = localStorage.getItem(k);
      if (primary !== null) return primary;
      if (legacyKey) return localStorage.getItem(legacyKey);
      return null;
    } catch {
      return null;
    }
  };

  const setLS = (k, v, legacyKey = null) => {
    try {
      localStorage.setItem(k, v);
      if (legacyKey) localStorage.setItem(legacyKey, v);
    } catch {}
  };

  const cache = (() => {
    try { return JSON.parse(getLS(STORAGE.COUNTRY_CACHE, LEGACY_STORAGE.COUNTRY_CACHE) || '{}') || {}; }
    catch { return {}; }
  })();

  const saveCache = () => {
    try { setLS(STORAGE.COUNTRY_CACHE, JSON.stringify(cache), LEGACY_STORAGE.COUNTRY_CACHE); } catch {}
  };

  const state = {
    countryCode: null,
    countryLabel: null,
    language: DEFAULT_LANGUAGE,
    languages: null
  };

  /* =============================================================================
     06) LANGUAGE STATE HELPERS
  ============================================================================= */
  const getStoredLanguages = () => {
    try {
      const raw = getLS(STORAGE.LANGUAGES, LEGACY_STORAGE.LANGUAGES);
      const arr = raw ? JSON.parse(raw) : null;
      return Array.isArray(arr)
        ? Array.from(new Set(arr.map((value) => resolveSupportedLanguage(value)).filter(Boolean)))
        : null;
    } catch {
      return null;
    }
  };

  const setStoredLanguages = (langs) => {
    try {
      const arr = Array.isArray(langs)
        ? langs.map((value) => resolveSupportedLanguage(value)).filter(Boolean)
        : null;
      state.languages = (arr && arr.length) ? Array.from(new Set(arr)) : null;
      setLS(STORAGE.LANGUAGES, JSON.stringify(state.languages || []), LEGACY_STORAGE.LANGUAGES);
    } catch {
      state.languages = null;
    }
  };

  const parseDatasetLanguages = (btn) => {
    if (!btn) return null;
    const raw = btn.getAttribute('data-languages') || btn.getAttribute('data-langs') || '';
    if (!raw.trim()) return null;
    const arr = raw
      .split(',')
      .map(s => resolveSupportedLanguage(s))
      .filter(Boolean);
    return arr.length ? Array.from(new Set(arr)) : null;
  };

  /* =============================================================================
     06A) CANONICAL COUNTRY DATA HELPERS
  ============================================================================= */
  const getCanonicalCountries = () => {
    const raw = Array.isArray(window.ARTAN_COUNTRIES_DATA) ? window.ARTAN_COUNTRIES_DATA : [];
    if (!raw.length) return [];

    const looksFlat = raw.some((entry) => {
      const code = String(entry?.code || entry?.countryCode || entry?.isoCode || '').trim();
      const name = String(entry?.name || entry?.country || entry?.label || '').trim();
      return Boolean(code || name);
    });

    if (looksFlat) {
      return raw.map((entry) => ({
        ...entry,
        code: String(entry?.code || entry?.countryCode || entry?.isoCode || '').trim().toUpperCase(),
        name: String(entry?.name || entry?.country || entry?.label || '').trim(),
        language: resolveSupportedLanguage(entry?.language || entry?.primaryLanguage || ''),
        languages: Array.isArray(entry?.languages)
          ? Array.from(new Set(entry.languages.map((value) => resolveSupportedLanguage(value)).filter(Boolean)))
          : []
      })).filter((entry) => entry.code || entry.name);
    }

    return raw.flatMap((group) => {
      const countries = Array.isArray(group?.countries) ? group.countries : [];
      return countries.map((entry) => ({
        ...entry,
        code: String(entry?.code || entry?.countryCode || entry?.isoCode || '').trim().toUpperCase(),
        name: String(entry?.name || entry?.country || entry?.label || '').trim(),
        language: resolveSupportedLanguage(entry?.language || entry?.primaryLanguage || ''),
        languages: Array.isArray(entry?.languages)
          ? Array.from(new Set(entry.languages.map((value) => resolveSupportedLanguage(value)).filter(Boolean)))
          : []
      })).filter((entry) => entry.code || entry.name);
    });
  };

  const getCanonicalCountryByCode = (countryCode) => {
    const code = String(countryCode || '').trim().toUpperCase();
    if (!code) return null;
    return getCanonicalCountries().find((entry) => entry.code === code) || null;
  };

  const inferLanguageForCountry = (countryCode, fallback = DEFAULT_LANGUAGE) => {
    const rawFallback = String(fallback || '').trim();
    const normalizedFallback = rawFallback ? resolveSupportedLanguage(rawFallback) : '';
    const canonical = getCanonicalCountryByCode(countryCode);

    if (canonical) {
      if (Array.isArray(canonical.languages) && canonical.languages.length) {
        const supportedCountryLanguages = canonical.languages
          .map((value) => resolveSupportedLanguage(value))
          .filter(Boolean);

        if (supportedCountryLanguages.length) {
          if (normalizedFallback && supportedCountryLanguages.includes(normalizedFallback)) {
            return normalizedFallback;
          }

          return supportedCountryLanguages[0];
        }

        if (normalizedFallback && canonical.languages.includes(normalizedFallback)) {
          return normalizedFallback;
        }
      }

      if (canonical.language) {
        const supportedLanguage = resolveSupportedLanguage(canonical.language);
        if (supportedLanguage && normalizedFallback && supportedLanguage === normalizedFallback) {
          return normalizedFallback;
        }

        if (supportedLanguage) return supportedLanguage;
      }
    }

    if (normalizedFallback) return normalizedFallback;

    const browserLanguage = resolveSupportedLanguage(navigator.language || '');
    if (browserLanguage) return browserLanguage;

    return DEFAULT_LANGUAGE;
  };

  /* =============================================================================
     07) LOCALE STATE EXPOSURE
  ============================================================================= */
  Object.defineProperty(window, 'NEUROARTAN_LOCALE', {
    configurable: true,
    get: () => ({ ...state })
  });

  Object.defineProperty(window, 'ARTAN_LOCALE', {
    configurable: true,
    get: () => window.NEUROARTAN_LOCALE
  });

  /* =============================================================================
     08) UI LABELS
  ============================================================================= */

  const nativeCountryName = (countryCode, langCode) => {
    try {
      const dn = new Intl.DisplayNames([langCode], { type: 'region' });
      return dn.of(countryCode) || countryCode;
    } catch {
      return countryCode;
    }
  };

  const setLabels = () => {
    const countryEl = qs('#current-country');
    const langEl = qs('#current-language');
    const homeCountryEl = getHomeFooterCountryValue();
    const homeLangEl = getHomeFooterLanguageValue();

    if (countryEl) countryEl.textContent = state.countryLabel || '—';
    if (langEl) langEl.textContent = (state.language || DEFAULT_LANGUAGE).toUpperCase();
    if (homeCountryEl) homeCountryEl.textContent = state.countryLabel || '—';
    if (homeLangEl) homeLangEl.textContent = (state.language || DEFAULT_LANGUAGE).toUpperCase();
  };

  const dispatchLocaleStateChanged = () => {
    document.dispatchEvent(new CustomEvent('neuroartan:locale-state-changed', {
      detail: {
        countryCode: state.countryCode,
        countryLabel: state.countryLabel,
        language: state.language,
        languages: Array.isArray(state.languages) ? [...state.languages] : []
      }
    }));
  };

  const hydrateStateFromStorage = () => {
    state.countryCode = (getLS(STORAGE.COUNTRY_CODE, LEGACY_STORAGE.COUNTRY_CODE) || DEFAULT_COUNTRY_CODE).toUpperCase();

    const localeAPI = getLocaleAPI();
    const rawStoredLanguage =
      (localeAPI && typeof localeAPI.getCurrentLanguage === 'function'
        ? localeAPI.getCurrentLanguage()
        : getLS(STORAGE.LANGUAGE, LEGACY_STORAGE.LANGUAGE)) || '';
    const storedLanguage = rawStoredLanguage ? resolveSupportedLanguage(rawStoredLanguage) : '';

    const storedLabel = getLS(STORAGE.COUNTRY_LABEL, LEGACY_STORAGE.COUNTRY_LABEL) || '';

    state.languages = getStoredLanguages();
    if (!state.languages || !state.languages.length) {
      const canonical = getCanonicalCountryByCode(state.countryCode);
      if (canonical && Array.isArray(canonical.languages) && canonical.languages.length) {
        state.languages = canonical.languages;
      } else {
        state.languages = [inferLanguageForCountry(state.countryCode, storedLanguage || DEFAULT_LANGUAGE)];
      }
    }

    const availableLanguages = Array.isArray(state.languages)
      ? state.languages.map((value) => resolveSupportedLanguage(value)).filter(Boolean)
      : [];
    state.language = availableLanguages.includes(storedLanguage)
      ? storedLanguage
      : inferLanguageForCountry(state.countryCode, storedLanguage || DEFAULT_LANGUAGE);

    if (!availableLanguages.includes(state.language)) {
      state.languages = Array.from(new Set([...availableLanguages, state.language].filter(Boolean)));
    }

    state.countryLabel = storedLabel && storedLabel !== '—'
      ? storedLabel
      : nativeCountryName(state.countryCode, state.language);
  };

  /* =============================================================================
     09) FOOTER LOCALE UI REFRESH
  ============================================================================= */
  const refreshFooterLocaleUI = async () => {
    hydrateStateFromStorage();
    bindFooterTriggers();
    bindOverlayClose();
    bindCountrySelection();
    setLabels();
    buildLanguageDropdown(state.language, state.languages);
  };

  /* =============================================================================
     10) LOCALE API RESOLUTION
  ============================================================================= */
  const getLocaleAPI = () => {
    const api = window.NEUROARTAN_TRANSLATION || window.ARTAN_TRANSLATION;
    if (!api) return null;
    return api;
  };

  const getSupportedLanguageConfigs = () => {
    const localeApi = getLocaleAPI();
    const languages = typeof localeApi?.getSupportedLanguages === 'function'
      ? localeApi.getSupportedLanguages()
      : [];

    const normalized = Array.isArray(languages)
      ? languages
          .map((item) => {
            const code = normalizeLang(item?.code || item);
            if (!code) return null;
            return {
              code,
              label: String(item?.label || code.toUpperCase()).trim(),
              nativeLabel: String(item?.nativeLabel || item?.label || code.toUpperCase()).trim(),
              direction: item?.direction === 'rtl' ? 'rtl' : 'ltr'
            };
          })
          .filter(Boolean)
      : [];

    return normalized.length
      ? normalized
      : [{ code: DEFAULT_LANGUAGE, label: 'English', nativeLabel: 'English', direction: 'ltr' }];
  };

  const getSupportedLanguageCodes = () => {
    return getSupportedLanguageConfigs().map((item) => item.code);
  };

  const getSupportedLanguageConfig = (language) => {
    const normalized = normalizeLang(language || DEFAULT_LANGUAGE);
    const configs = getSupportedLanguageConfigs();
    return configs.find((item) => item.code === normalized)
      || configs.find((item) => item.code === DEFAULT_LANGUAGE)
      || configs[0]
      || { code: DEFAULT_LANGUAGE, label: 'English', nativeLabel: 'English', direction: 'ltr' };
  };

  const resolveSupportedLanguage = (language) => {
    const normalized = normalizeLang(language || DEFAULT_LANGUAGE);
    const codes = getSupportedLanguageCodes();
    return codes.includes(normalized) ? normalized : DEFAULT_LANGUAGE;
  };

  const syncLocalePreferenceToSupabase = async () => {
    const supabase = window.neuroartanSupabase || window.NEUROARTAN_SUPABASE_CLIENT || null;
    if (!supabase?.auth) return false;

    try {
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;
      const authUserId = String(data?.user?.id || '').trim();
      if (!authUserId) return false;

      const language = resolveSupportedLanguage(state.language || DEFAULT_LANGUAGE);
      const direction = getSupportedLanguageConfig(language).direction;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          preferred_language: language,
          preferred_language_direction: direction,
          locale_country_code: state.countryCode || null,
          locale_country_label: state.countryLabel || null,
          locale_languages: Array.isArray(state.languages) ? state.languages : [language]
        })
        .eq('auth_user_id', authUserId);

      if (updateError) throw updateError;
      return true;
    } catch (error) {
      console.warn('[country-language] Locale preference Supabase sync skipped.', error);
      return false;
    }
  };

  const hydrateLocalePreferenceFromSupabase = async () => {
    const supabase = window.neuroartanSupabase || window.NEUROARTAN_SUPABASE_CLIENT || null;
    if (!supabase?.auth) return false;

    try {
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;
      const authUserId = String(data?.user?.id || '').trim();
      if (!authUserId) return false;

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('preferred_language, preferred_language_direction, locale_country_code, locale_country_label, locale_languages')
        .eq('auth_user_id', authUserId)
        .maybeSingle();

      if (profileError) throw profileError;
      if (!profile) return false;

      const language = resolveSupportedLanguage(profile.preferred_language || state.language || DEFAULT_LANGUAGE);
      const languages = Array.isArray(profile.locale_languages)
        ? profile.locale_languages.map((value) => resolveSupportedLanguage(value)).filter(Boolean)
        : [language];

      state.language = language;
      state.languages = Array.from(new Set([...languages, language].filter(Boolean)));
      if (profile.locale_country_code) state.countryCode = String(profile.locale_country_code).trim().toUpperCase();
      if (profile.locale_country_label) state.countryLabel = String(profile.locale_country_label).trim();

      setLS(STORAGE.LANGUAGE, state.language, LEGACY_STORAGE.LANGUAGE);
      setLS(STORAGE.LANGUAGES, JSON.stringify(state.languages), LEGACY_STORAGE.LANGUAGES);
      if (state.countryCode) setLS(STORAGE.COUNTRY_CODE, state.countryCode, LEGACY_STORAGE.COUNTRY_CODE);
      if (state.countryLabel) setLS(STORAGE.COUNTRY_LABEL, state.countryLabel, LEGACY_STORAGE.COUNTRY_LABEL);

      return true;
    } catch (error) {
      console.warn('[country-language] Locale preference Supabase hydration skipped.', error);
      return false;
    }
  };

  const setLocalePreference = async ({
    countryCode = state.countryCode,
    countryLabel = state.countryLabel,
    language = state.language,
    languages = state.languages
  } = {}) => {
    state.countryCode = String(countryCode || DEFAULT_COUNTRY_CODE).trim().toUpperCase();
    state.language = resolveSupportedLanguage(language || DEFAULT_LANGUAGE);
    state.countryLabel = String(countryLabel || nativeCountryName(state.countryCode, state.language) || '').trim();
    setStoredLanguages(Array.isArray(languages) && languages.length ? languages : [state.language]);

    setLS(STORAGE.COUNTRY_CODE, state.countryCode, LEGACY_STORAGE.COUNTRY_CODE);
    setLS(STORAGE.COUNTRY_LABEL, state.countryLabel, LEGACY_STORAGE.COUNTRY_LABEL);
    setLS(STORAGE.LANGUAGE, state.language, LEGACY_STORAGE.LANGUAGE);

    setLabels();
    buildLanguageDropdown(state.language, state.languages);
    dispatchLocaleStateChanged();
    await applyTranslation(state.language);
    await syncLocalePreferenceToSupabase();
    hydrateStateFromStorage();
    setLabels();
    buildLanguageDropdown(state.language, state.languages);
  };

  /* =============================================================================
     10A) CANONICAL LOCALE DELEGATION
  ============================================================================= */
  const applyTranslation = async (lang) => {
    const normalized = resolveSupportedLanguage(lang);
    const api = getLocaleAPI();
    const loadingReason = `locale:${normalized}`;

    if (!api) return false;

    document.dispatchEvent(new CustomEvent('neuroartan:loading-start', {
      detail: {
        reason: loadingReason,
        source: MODULE_PATH
      }
    }));

    try {
      if (typeof api.setLanguage === 'function') {
        const out = api.setLanguage(normalized);
        if (out && typeof out.then === 'function') await out;
        return true;
      }

      if (typeof api.applyLanguage === 'function') {
        const out = api.applyLanguage(normalized);
        if (out && typeof out.then === 'function') await out;
        return true;
      }
    } catch {
      return false;
    } finally {
      document.dispatchEvent(new CustomEvent('neuroartan:loading-stop', {
        detail: {
          reason: loadingReason,
          source: MODULE_PATH
        }
      }));
    }

    return false;
  };

  /* =============================================================================
     11) COUNTRY OVERLAY
  ============================================================================= */

  const CO_CLOSE_DURATION_FALLBACK = 520;
  const CO_STAGGER_IN_START_DELAY = 180;
  const CO_STAGGER_IN_STEP = 70;
  const CO_STAGGER_OUT_STEP = 55;

  const getCountryItems = () => {
    const root = getCountryOverlayRoot();
    return root ? Array.from(root.querySelectorAll('.country-item')) : [];
  };

  const parseMotionDurationMs = (value) => {
    const raw = String(value || '').trim();
    if (!raw) return 0;

    const firstValue = raw.split(',')[0].trim();
    const parsedValue = Number.parseFloat(firstValue);
    if (!Number.isFinite(parsedValue)) return 0;

    return firstValue.endsWith('ms') ? parsedValue : parsedValue * 1000;
  };

  const getCountryOverlayInner = () => {
    const root = getCountryOverlayRoot();
    return root ? root.querySelector('.country-overlay-inner') : null;
  };

  const getCountryOverlayCloseDuration = () => {
    const root = getCountryOverlayRoot();
    if (!root) return CO_CLOSE_DURATION_FALLBACK;

    const computed = window.getComputedStyle(root);
    const tokenDuration = parseMotionDurationMs(computed.getPropertyValue('--country-motion-overlay'));
    if (tokenDuration > 0) return tokenDuration;

    const inner = getCountryOverlayInner();
    if (!inner) return CO_CLOSE_DURATION_FALLBACK;

    const innerComputed = window.getComputedStyle(inner);
    const transitionDuration = parseMotionDurationMs(innerComputed.transitionDuration);
    const transitionDelay = parseMotionDurationMs(innerComputed.transitionDelay);
    const totalDuration = transitionDuration + transitionDelay;

    return totalDuration > 0 ? totalDuration : CO_CLOSE_DURATION_FALLBACK;
  };

  const runAfterCountryOverlayClose = (callback) => {
    const inner = getCountryOverlayInner();
    const fallbackDuration = getCountryOverlayCloseDuration();
    let didRun = false;

    const complete = () => {
      if (didRun) return;
      didRun = true;
      if (inner) inner.removeEventListener('transitionend', complete);
      callback();
    };

    if (inner) {
      inner.addEventListener('transitionend', complete, { once: true });
    }

    window.setTimeout(complete, fallbackDuration + 80);
  };

  const prepCountryItemsForOpen = (items) => {
    items.forEach((el) => {
      el.style.transitionDelay = '0ms';
      el.style.opacity = '';
      el.style.transform = '';
    });
  };

  const staggerCountryIn = (items) => {
    items.forEach((el, i) => {
      el.style.transitionDelay = `${CO_STAGGER_IN_START_DELAY + (i * CO_STAGGER_IN_STEP)}ms`;
    });
  };

  const staggerCountryOut = (items) => {
    items.slice().reverse().forEach((el, i) => {
      el.style.transitionDelay = `${i * CO_STAGGER_OUT_STEP}ms`;
    });
  };

  const openCountryOverlay = () => {
    const o = qs('#country-overlay');
    if (!o) return;

    const items = getCountryItems();
    prepCountryItemsForOpen(items);

    o.classList.remove('active', 'closing');
    o.setAttribute('aria-hidden', 'true');

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        staggerCountryIn(items);
        o.classList.add('active');
        o.setAttribute('aria-hidden', 'false');
        document.body.classList.add('country-active');
      });
    });
  };

  const closeCountryOverlay = () => {
    const o = qs('#country-overlay');
    if (!o || o.classList.contains('closing')) return;

    const items = getCountryItems();
    items.forEach((el) => {
      el.style.transitionDelay = '0ms';
      el.style.opacity = '0';
      el.style.transform = 'translateY(0)';
    });

    o.classList.add('closing');
    o.setAttribute('aria-hidden', 'true');
    o.classList.remove('active');
    document.body.classList.remove('country-active');

    runAfterCountryOverlayClose(() => {
      o.classList.remove('closing');
      items.forEach((el) => {
        el.style.transitionDelay = '';
        el.style.opacity = '';
        el.style.transform = '';
      });
    });
  };

  /* =============================================================================
     12) LANGUAGE DROPDOWN
  ============================================================================= */

  const closeLanguageDropdown = () => {
    const dd = getFooterLanguageDropdown();
    const toggle = getFooterLanguageToggle();
    if (!dd) return;
    dd.classList.remove('visible');
    dd.setAttribute('aria-hidden', 'true');
    if (toggle) toggle.setAttribute('aria-expanded', 'false');
  };

  const openLanguageDropdown = () => {
    const dd = getFooterLanguageDropdown();
    const toggle = getFooterLanguageToggle();
    if (!dd) return;
    dd.classList.add('visible');
    dd.setAttribute('aria-hidden', 'false');
    if (toggle) toggle.setAttribute('aria-expanded', 'true');
  };

  const toggleLanguageDropdown = () => {
    const dd = getFooterLanguageDropdown();
    if (!dd) return;
    const isOpen = dd.classList.contains('visible');
    if (isOpen) closeLanguageDropdown();
    else openLanguageDropdown();
  };

  const ensureLanguageDropdownPortal = (dropdown) => {
    if (!(dropdown instanceof HTMLElement)) {
      return dropdown;
    }

    dropdown.dataset.footerLanguageDropdown = 'true';

    if (dropdown.parentElement !== document.body) {
      document.body.appendChild(dropdown);
    }

    return dropdown;
  };

  let languageDocCloserBound = false;
  let localeStateEventsBound = false;
  let localeOpenRequestsBound = false;

  const buildLanguageDropdown = (primaryLang, availableLangs) => {
    const dd = ensureLanguageDropdownPortal(getFooterLanguageDropdown());
    const toggle = getFooterLanguageToggle();
    if (!dd || !toggle) return;

    dd.innerHTML = '';
    dd.setAttribute('aria-hidden', 'true');
    dd.classList.remove('visible');

    const supportedLanguages = getSupportedLanguageConfigs();
    const supportedCodes = getSupportedLanguageCodes();
    const base = supportedCodes.length ? supportedCodes : [resolveSupportedLanguage(primaryLang)];

    const langs = Array.from(new Set([
      ...base,
      DEFAULT_LANGUAGE
    ].filter(Boolean)));

    langs.forEach((code) => {
      const isSelected = code === normalizeLang(state.language || primaryLang || DEFAULT_LANGUAGE);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'language-option';
      btn.setAttribute('data-lang', code);
      btn.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
      btn.classList.toggle('is-selected', isSelected);
      const languageConfig = supportedLanguages.find((item) => item.code === code);
      btn.textContent = languageConfig?.nativeLabel || code.toUpperCase();
      btn.addEventListener('click', async () => {
        state.language = resolveSupportedLanguage(code);
        closeLanguageDropdown();
        setLS(STORAGE.LANGUAGE, state.language, LEGACY_STORAGE.LANGUAGE);

        if (state.countryCode) {
          state.countryLabel = nativeCountryName(state.countryCode, state.language);
          setLS(STORAGE.COUNTRY_LABEL, state.countryLabel, LEGACY_STORAGE.COUNTRY_LABEL);
        }

        setLabels();
        buildLanguageDropdown(state.language, state.languages);
        dispatchLocaleStateChanged();

        await applyTranslation(code);
        await syncLocalePreferenceToSupabase();
        hydrateStateFromStorage();
        setLabels();
        buildLanguageDropdown(state.language, state.languages);
      });
      dd.appendChild(btn);
    });

    toggle.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleLanguageDropdown();
    };

    toggle.setAttribute('aria-haspopup', 'listbox');
    toggle.setAttribute('aria-expanded', 'false');

    if (!languageDocCloserBound) {
      languageDocCloserBound = true;
      document.addEventListener('click', (e) => {
        const toggleNode = getFooterLanguageToggle();
        const dropdownNode = getFooterLanguageDropdown();
        const target = e.target;
        const insideToggle = toggleNode && target instanceof Node ? toggleNode.contains(target) : false;
        const insideDropdown = dropdownNode && target instanceof Node ? dropdownNode.contains(target) : false;
        if (!insideToggle && !insideDropdown) closeLanguageDropdown();
      }, { passive: true });

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeLanguageDropdown();
      });
    }
  };

  /* =============================================================================
     13) IP DETECTION
  ============================================================================= */

  async function detectIP() {
    const browserLanguage = resolveSupportedLanguage(navigator.language || DEFAULT_LANGUAGE);

    const providers = [
      async () => {
        const response = await fetch('https://ipapi.co/json/', {
          cache: 'no-store',
          headers: {
            Accept: 'application/json'
          }
        });

        if (!response.ok) return null;
        const data = await response.json();
        return {
          code: String(data?.country_code || '').trim().toUpperCase(),
          lang: data?.languages || data?.language || ''
        };
      },
      async () => {
        const response = await fetch('https://ipwho.is/', {
          cache: 'no-store',
          headers: {
            Accept: 'application/json'
          }
        });

        if (!response.ok) return null;
        const data = await response.json();
        if (data?.success === false) return null;

        return {
          code: String(data?.country_code || '').trim().toUpperCase(),
          lang: ''
        };
      }
    ];

    for (const provider of providers) {
      try {
        const result = await provider();
        const code = String(result?.code || '').trim().toUpperCase();
        const rawLang = String(result?.lang || '').trim();
        const lang = rawLang
          ? resolveSupportedLanguage(rawLang.split(',')[0].trim())
          : '';

        if (/^[A-Z]{2}$/.test(code)) {
          return {
            code,
            lang: lang || browserLanguage
          };
        }
      } catch (_) {}
    }

    return {
      code: resolveBrowserCountryCode(),
      lang: browserLanguage
    };
  }

  /* =============================================================================
     14) COUNTRY RESOLUTION
  ============================================================================= */

  async function resolveCountryFromName(name) {
    const key = String(name || '').trim();
    if (!key) return null;

    if (cache[key]) return cache[key];

    try {
      const url = `https://restcountries.com/v3.1/name/${encodeURIComponent(key)}?fields=cca2,languages`;
      const r = await fetch(url);
      const arr = await r.json();
      const item = Array.isArray(arr) ? arr[0] : null;
      if (!item) return null;

      const code = item.cca2 ? String(item.cca2).toUpperCase() : null;

      let lang = DEFAULT_LANGUAGE;
      if (item.languages && typeof item.languages === 'object') {
        const firstKey = Object.keys(item.languages)[0];
        if (firstKey) lang = resolveSupportedLanguage(firstKey);
      }

      const out = { code, lang };
      cache[key] = out;
      saveCache();
      return out;
    } catch {
      return null;
    }
  }

  /* =============================================================================
     15) FOOTER AND OVERLAY BINDINGS
  ============================================================================= */

  const bindFooterTriggers = () => {
    const countryBtn = getFooterCountryButton();
    if (countryBtn) {
      countryBtn.onclick = (e) => {
        e.preventDefault();
        closeLanguageDropdown();
        openCountryOverlay();
      };
    }
  };

  const bindOverlayClose = () => {
    const closeBtn = getCountryOverlayCloseButton();
    if (closeBtn) closeBtn.onclick = closeCountryOverlay;

    if (!document.body.dataset.countryOverlayEscapeBound) {
      document.body.dataset.countryOverlayEscapeBound = 'true';
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeCountryOverlay();
      });
    }
  };

  const bindCountrySelection = () => {
    const regions = getCountryRegionsRoot();
    if (!regions || regions.__neuroartanBound) return;
    regions.__neuroartanBound = true;

    regions.addEventListener('click', async (e) => {
      const target = e.target;
      const btn = target && target.closest ? target.closest('.country-option') : null;
      if (!btn) return;

      const attrCode = btn.getAttribute('data-country-code') || btn.getAttribute('data-code') || btn.getAttribute('data-cca2');
      const attrLang = btn.getAttribute('data-language') || btn.getAttribute('data-lang');

      const selectedName = btn.getAttribute('data-country') || btn.getAttribute('data-name') || btn.textContent || '';
      const selectedLabel = btn.textContent || selectedName;
      const datasetLangs = parseDatasetLanguages(btn);

      let code = attrCode ? String(attrCode).toUpperCase() : null;
      let lang = attrLang ? resolveSupportedLanguage(attrLang) : null;

      if (!code || !lang) {
        const resolved = await resolveCountryFromName(selectedName);
        if (!code) code = resolved && resolved.code ? resolved.code : (state.countryCode || DEFAULT_COUNTRY_CODE);
        if (!lang) lang = resolved && resolved.lang ? resolveSupportedLanguage(resolved.lang) : DEFAULT_LANGUAGE;
      }

      closeCountryOverlay();
      closeLanguageDropdown();
      await setLocalePreference({
        countryCode: code,
        countryLabel: nativeCountryName(String(code || DEFAULT_COUNTRY_CODE).toUpperCase(), lang) || selectedLabel,
        language: lang,
        languages: datasetLangs && datasetLangs.length ? datasetLangs : [lang]
      });
    }, { passive: true });
  };

  /* =============================================================================
     15A) REBIND SCHEDULER
  ============================================================================= */
  let rebindScheduled = false;

  const scheduleLocaleUiRefresh = () => {
    if (rebindScheduled) return;
    rebindScheduled = true;

    window.requestAnimationFrame(() => {
      rebindScheduled = false;
      refreshFooterLocaleUI();
    });
  };

  const bindLocaleStateEvents = () => {
    if (localeStateEventsBound) return;
    localeStateEventsBound = true;

    document.addEventListener('country-selected', () => {
      scheduleLocaleUiRefresh();
    });

    document.addEventListener('translation:complete', () => {
      scheduleLocaleUiRefresh();
    });
  };

  const bindLocaleOpenRequests = () => {
    if (localeOpenRequestsBound) return;
    localeOpenRequestsBound = true;

    document.addEventListener('neuroartan:country-overlay-open-requested', () => {
      closeLanguageDropdown();
      openCountryOverlay();
    });
  };

  /* =============================================================================
     15B) GLOBAL API EXPOSURE
  ============================================================================= */
  const COUNTRY_LANGUAGE_API = {
    refreshFooterLocaleUI,
    scheduleLocaleUiRefresh,
    openCountryOverlay,
    closeCountryOverlay,
    openLanguageDropdown,
    closeLanguageDropdown,
    toggleLanguageDropdown,
    buildLanguageDropdown,
    applyTranslation,
    detectIP,
    resolveCountryFromName,
    getSupportedLanguageConfigs,
    getSupportedLanguageCodes,
    resolveSupportedLanguage,
    setLocalePreference,
    syncLocalePreferenceToSupabase,
    hydrateLocalePreferenceFromSupabase
  };

  window.ARTAN_COUNTRY_LANGUAGE = COUNTRY_LANGUAGE_API;
  window.ARTAN_I18N_COUNTRY_LANGUAGE = COUNTRY_LANGUAGE_API;
  window.NEUROARTAN_COUNTRY_LANGUAGE = COUNTRY_LANGUAGE_API;

  document.dispatchEvent(
    new CustomEvent('neuroartan:i18n-country-language-ready', {
      detail: {
        modulePath: MODULE_PATH,
        countryCode: state.countryCode,
        language: state.language
      }
    })
  );

  /* =============================================================================
     16) MAIN INITIALIZATION
  ============================================================================= */

  async function init() {
    hydrateStateFromStorage();
    const hydratedFromSupabase = await hydrateLocalePreferenceFromSupabase();
    if (hydratedFromSupabase) {
      setLabels();
      await applyTranslation(state.language);
    }
    bindLocaleStateEvents();
    bindLocaleOpenRequests();

    const localeAPI = getLocaleAPI();
    const storedCountryCode = String(getLS(STORAGE.COUNTRY_CODE, LEGACY_STORAGE.COUNTRY_CODE) || '').trim().toUpperCase();
    const storedLanguage = resolveSupportedLanguage(
      (localeAPI && typeof localeAPI.getCurrentLanguage === 'function'
        ? localeAPI.getCurrentLanguage()
        : getLS(STORAGE.LANGUAGE, LEGACY_STORAGE.LANGUAGE)) || ''
    );
    const hasPersistedLocalePreference = Boolean(storedCountryCode || storedLanguage);

    let isNewSession = true;
    try {
      isNewSession = !sessionStorage.getItem(STORAGE.SESSION);
    } catch {}

    if (isNewSession && !hasPersistedLocalePreference) {
      const ip = await detectIP();

      const code = (ip.code || DEFAULT_COUNTRY_CODE).toUpperCase();
      const lang = inferLanguageForCountry(code, resolveSupportedLanguage(ip.lang || DEFAULT_LANGUAGE));

      state.countryCode = code;
      state.language = lang;
      state.countryLabel = nativeCountryName(code, lang);

      const canonical = getCanonicalCountryByCode(code);
      if (canonical && Array.isArray(canonical.languages) && canonical.languages.length) {
        setStoredLanguages(canonical.languages);
      } else {
        setStoredLanguages([lang]);
      }

      setLS(STORAGE.COUNTRY_CODE, code, LEGACY_STORAGE.COUNTRY_CODE);
      setLS(STORAGE.COUNTRY_LABEL, state.countryLabel, LEGACY_STORAGE.COUNTRY_LABEL);
      setLS(STORAGE.LANGUAGE, state.language, LEGACY_STORAGE.LANGUAGE);

      try {
        sessionStorage.setItem(STORAGE.SESSION, '1');
      } catch {}
    } else if (isNewSession) {
      try {
        sessionStorage.setItem(STORAGE.SESSION, '1');
      } catch {}
    }

    refreshFooterLocaleUI();
    await applyTranslation(state.language);
    hydrateStateFromStorage();
    setLabels();
    buildLanguageDropdown(state.language, state.languages);
  }

  /* =============================================================================
     17) FRAGMENT-MOUNTED REBINDING
  ============================================================================= */
  document.addEventListener('fragment:mounted', (event) => {
    const name = event?.detail?.name || '';
    if (name === 'footer' || name === 'country-overlay' || name === 'cookie-consent') {
      scheduleLocaleUiRefresh();
    }
  });

  document.addEventListener('neuroartan:footer-mounted', () => {
    scheduleLocaleUiRefresh();
  });

  /* =============================================================================
     18) SHARED READINESS HELPERS
  ============================================================================= */
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
     19) DEFER-SAFE BOOTSTRAP
  ============================================================================= */
  window.__artanRunWhenReady(init);
})();
