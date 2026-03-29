/* =============================================================================
   00) FILE INDEX
   01) MODULE IDENTITY
   02) COUNTRY OVERLAY FRAGMENT INJECTION
   03) STORAGE KEYS
   04) DEFAULTS AND LANGUAGE NORMALIZATION
   05) STORAGE AND CACHE HELPERS
   06) LANGUAGE STATE HELPERS
   06A) CANONICAL COUNTRY DATA HELPERS
   07) LOCALE STATE EXPOSURE
   08) UI LABELS
   09) FOOTER LOCALE UI REFRESH
   10) TRANSLATION BRIDGE
   10A) LOADING OVERLAY BRIDGE
   11) COUNTRY OVERLAY
   12) LANGUAGE DROPDOWN
   13) IP DETECTION
   14) COUNTRY RESOLUTION
   15) FOOTER AND OVERLAY BINDINGS
   15A) COOKIE LANGUAGE OVERLAY BRIDGE
   16) MAIN INITIALIZATION
   17) FRAGMENT-MOUNTED REBINDING
   18) DEFER-SAFE BOOTSTRAP
============================================================================= */

/* =============================================================================
   01) MODULE IDENTITY
============================================================================= */
(() => {
  'use strict';

  /* =============================================================================
     02) COUNTRY OVERLAY FRAGMENT INJECTION
  ============================================================================= */
  const COUNTRY_FRAGMENT_URLS = [
    '/assets/fragments/country-overlay.html',
    'assets/fragments/country-overlay.html'
  ];

  const injectCountryOverlayIfNeeded = async () => {
    const existing = document.getElementById('country-overlay');
    if (existing) return true;

    const mount = document.getElementById('country-overlay-mount');
    if (!mount) return false;

    if (mount.dataset.injected === 'true') return !!document.getElementById('country-overlay');
    mount.dataset.injected = 'true';

    for (const url of COUNTRY_FRAGMENT_URLS) {
      try {
        const res = await fetch(url, { cache: 'no-cache' });
        if (!res.ok) continue;
        const html = await res.text();
        mount.innerHTML = html;
        document.dispatchEvent(new Event('country-overlay-mounted'));
        return !!document.getElementById('country-overlay');
      } catch {}
    }

    return false;
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
  const DEFAULT_COUNTRY_CODE = 'DE';
  const DEFAULT_LANGUAGE = 'en';

  // Normalize language codes to ISO-639-1 where possible.
  // restcountries.com often returns ISO-639-3 keys (e.g. "fas"); translations use ISO-639-1 (e.g. "fa").
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

    // Norway variants sometimes appear as "nno" / "nob" / "nn" / "nb"; treat as "no".
    if (c === 'nno' || c === 'nob' || c === 'nn' || c === 'nb') c = 'no';

    if (c.length === 3 && ISO639_3_TO_1[c]) {
      c = ISO639_3_TO_1[c];
    }

    // Only accept normalized ISO-639-1 language codes at runtime.
    if (!/^[a-z]{2}$/.test(c)) return DEFAULT_LANGUAGE;
    return c;
  };

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
      return Array.isArray(arr) ? arr.map(normalizeLang).filter(Boolean) : null;
    } catch {
      return null;
    }
  };

  const setStoredLanguages = (langs) => {
    try {
      const arr = Array.isArray(langs) ? langs.map(normalizeLang).filter(Boolean) : null;
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
      .map(s => normalizeLang(s))
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
        language: normalizeLang(entry?.language || entry?.primaryLanguage || ''),
        languages: Array.isArray(entry?.languages) ? entry.languages.map(normalizeLang).filter(Boolean) : []
      })).filter((entry) => entry.code || entry.name);
    }

    return raw.flatMap((group) => {
      const countries = Array.isArray(group?.countries) ? group.countries : [];
      return countries.map((entry) => ({
        ...entry,
        code: String(entry?.code || entry?.countryCode || entry?.isoCode || '').trim().toUpperCase(),
        name: String(entry?.name || entry?.country || entry?.label || '').trim(),
        language: normalizeLang(entry?.language || entry?.primaryLanguage || ''),
        languages: Array.isArray(entry?.languages) ? entry.languages.map(normalizeLang).filter(Boolean) : []
      })).filter((entry) => entry.code || entry.name);
    });
  };

  const getCanonicalCountryByCode = (countryCode) => {
    const code = String(countryCode || '').trim().toUpperCase();
    if (!code) return null;
    return getCanonicalCountries().find((entry) => entry.code === code) || null;
  };

  const inferLanguageForCountry = (countryCode, fallback = DEFAULT_LANGUAGE) => {
    const normalizedFallback = normalizeLang(fallback || DEFAULT_LANGUAGE);
    const canonical = getCanonicalCountryByCode(countryCode);

    if (canonical) {
      if (Array.isArray(canonical.languages) && canonical.languages.length) {
        return canonical.languages[0];
      }
      if (canonical.language) {
        return canonical.language;
      }
    }

    const browserLanguage = normalizeLang(navigator.language || '');
    if (browserLanguage) return browserLanguage;

    return normalizedFallback;
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

    if (countryEl) countryEl.textContent = state.countryLabel || '—';
    if (langEl) langEl.textContent = (state.language || DEFAULT_LANGUAGE).toUpperCase();
  };

  const hydrateStateFromStorage = () => {
    state.countryCode = (getLS(STORAGE.COUNTRY_CODE, LEGACY_STORAGE.COUNTRY_CODE) || DEFAULT_COUNTRY_CODE).toUpperCase();

    const storedLanguage = normalizeLang(getLS(STORAGE.LANGUAGE, LEGACY_STORAGE.LANGUAGE) || '');
    state.language = inferLanguageForCountry(state.countryCode, storedLanguage || DEFAULT_LANGUAGE);

    const storedLabel = getLS(STORAGE.COUNTRY_LABEL, LEGACY_STORAGE.COUNTRY_LABEL) || '';
    state.countryLabel = storedLabel && storedLabel !== '—'
      ? storedLabel
      : nativeCountryName(state.countryCode, state.language);

    state.languages = getStoredLanguages();
    if (!state.languages || !state.languages.length) {
      const canonical = getCanonicalCountryByCode(state.countryCode);
      if (canonical && Array.isArray(canonical.languages) && canonical.languages.length) {
        state.languages = canonical.languages;
      } else {
        state.languages = [state.language];
      }
    }
  };

  /* =============================================================================
     09) FOOTER LOCALE UI REFRESH
  ============================================================================= */
  const refreshFooterLocaleUI = async () => {
    hydrateStateFromStorage();
    bindFooterTriggers();
    setLabels();
    buildLanguageDropdown(state.language, state.languages);
    await injectCountryOverlayIfNeeded();
    bindOverlayClose();
    bindCountrySelection();
    setLabels();
    buildLanguageDropdown(state.language, state.languages);
  };

  /* =============================================================================
     10A) LOADING OVERLAY BRIDGE
  ============================================================================= */
  const startLoadingOverlay = (reason = 'locale-translation') => {
    const api = window.ARTAN_LOADING_OVERLAY;
    if (!api || typeof api.start !== 'function') return;
    try { api.start(reason); } catch {}
  };

  const stopLoadingOverlay = (reason = 'locale-translation') => {
    const api = window.ARTAN_LOADING_OVERLAY;
    if (!api || typeof api.stop !== 'function') return;
    try { api.stop(reason); } catch {}
  };

  /* =============================================================================
     10) TRANSLATION BRIDGE
  ============================================================================= */

  let pendingLang = null;

  const applyTranslationNow = async (lang) => {
    const api = window.NEUROARTAN_TRANSLATION || window.ARTAN_TRANSLATION;
    if (!api || typeof api.applyLanguage !== 'function') return false;

    try {
      const out = api.applyLanguage(normalizeLang(lang));
      if (out === false) return false;
      if (out && typeof out.then === 'function') {
        await out;
      }
      return true;
    } catch {
      return false;
    }
  };

  const forceEnglishFallback = async () => {
    state.language = DEFAULT_LANGUAGE;
    setLS(STORAGE.LANGUAGE, DEFAULT_LANGUAGE, LEGACY_STORAGE.LANGUAGE);
    setLabels();
    buildLanguageDropdown(DEFAULT_LANGUAGE, state.languages);
    await applyTranslationNow(DEFAULT_LANGUAGE);
  };

  const applyTranslation = async (lang) => {
    const normalized = normalizeLang(lang);
    pendingLang = normalized;
    startLoadingOverlay('locale-translation');

    if (await applyTranslationNow(normalized)) {
      pendingLang = null;
      stopLoadingOverlay('locale-translation');
      return true;
    }

    return await new Promise((resolve) => {
      let tries = 0;
      const t = setInterval(async () => {
        tries += 1;
        if (!pendingLang) {
          clearInterval(t);
          stopLoadingOverlay('locale-translation');
          resolve(true);
          return;
        }

        if (await applyTranslationNow(pendingLang)) {
          pendingLang = null;
          clearInterval(t);
          stopLoadingOverlay('locale-translation');
          resolve(true);
          return;
        }

        if (tries >= 30) {
          pendingLang = null;
          clearInterval(t);
          await forceEnglishFallback();
          stopLoadingOverlay('locale-translation');
          resolve(false);
        }
      }, 80);
    });
  };

  /* =============================================================================
     11) COUNTRY OVERLAY
  ============================================================================= */

  const CO_CLOSE_DURATION = 520;
  const CO_STAGGER_IN_START_DELAY = 180;
  const CO_STAGGER_IN_STEP = 70;
  const CO_STAGGER_OUT_STEP = 55;

  const getCountryItems = () => Array.from(document.querySelectorAll('#country-overlay .country-item'));

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
    // reverse order for a calm, deliberate exit
    items.slice().reverse().forEach((el, i) => {
      el.style.transitionDelay = `${i * CO_STAGGER_OUT_STEP}ms`;
    });
  };

  const openCountryOverlay = () => {
    const o = qs('#country-overlay');
    if (!o) return;

    const items = getCountryItems();
    prepCountryItemsForOpen(items);

    // Ensure starting state is applied before activating
    o.classList.remove('active', 'closing');
    o.setAttribute('aria-hidden', 'true');

    // Micro-delay to let the browser paint initial state
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
    if (!o) return;

    const items = getCountryItems();
    staggerCountryOut(items);

    o.classList.add('closing');
    o.setAttribute('aria-hidden', 'true');

    window.setTimeout(() => {
      o.classList.remove('active', 'closing');
      document.body.classList.remove('country-active');
      items.forEach((el) => {
        el.style.transitionDelay = '';
        el.style.opacity = '';
        el.style.transform = '';
      });
    }, CO_CLOSE_DURATION);
  };

  /* =============================================================================
     12) LANGUAGE DROPDOWN
  ============================================================================= */

  const closeLanguageDropdown = () => {
    const dd = qs('#language-dropdown');
    const toggle = qs('#language-toggle');
    if (!dd) return;
    dd.classList.remove('visible');
    dd.setAttribute('aria-hidden', 'true');
    if (toggle) toggle.setAttribute('aria-expanded', 'false');
  };

  const openLanguageDropdown = () => {
    const dd = qs('#language-dropdown');
    const toggle = qs('#language-toggle');
    if (!dd) return;
    dd.classList.add('visible');
    dd.setAttribute('aria-hidden', 'false');
    if (toggle) toggle.setAttribute('aria-expanded', 'true');
  };

  const toggleLanguageDropdown = () => {
    const dd = qs('#language-dropdown');
    if (!dd) return;
    const isOpen = dd.classList.contains('visible');
    if (isOpen) closeLanguageDropdown();
    else openLanguageDropdown();
  };

  let languageDocCloserBound = false;

  const buildLanguageDropdown = (primaryLang, availableLangs) => {
    const dd = qs('#language-dropdown');
    const toggle = qs('#language-toggle');
    if (!dd || !toggle) return;

    dd.innerHTML = '';
    dd.setAttribute('aria-hidden', 'true');
    dd.classList.remove('visible');

    const base = Array.isArray(availableLangs) && availableLangs.length
      ? availableLangs.map(normalizeLang)
      : [normalizeLang(primaryLang)];

    const langs = Array.from(new Set([
      ...base,
      DEFAULT_LANGUAGE
    ].filter(Boolean)));

    langs.forEach((code) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'language-option';
      btn.setAttribute('data-lang', code);
      btn.textContent = code.toUpperCase();
      btn.addEventListener('click', async () => {
        state.language = code;
        setLS(STORAGE.LANGUAGE, code, LEGACY_STORAGE.LANGUAGE);
        closeLanguageDropdown();
        setLabels();

        // Keep country label native to current language.
        if (state.countryCode) {
          state.countryLabel = nativeCountryName(state.countryCode, state.language);
          setLS(STORAGE.COUNTRY_LABEL, state.countryLabel);
          setLabels();
        }

        // Rebuild dropdown with current stored languages.
        buildLanguageDropdown(state.language, state.languages);
        await applyTranslation(code);
      });
      dd.appendChild(btn);
    });

    // Bind toggle once (replace handler cleanly)
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
        const inside = e.target && (e.target.closest('#language-toggle') || e.target.closest('#language-dropdown'));
        if (!inside) closeLanguageDropdown();
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
    try {
      const r = await fetch('https://ipapi.co/json/');
      const d = await r.json();

      const code = d && d.country_code ? String(d.country_code).toUpperCase() : null;

      let lang = DEFAULT_LANGUAGE;
      // ipapi.co often returns languages like: "de-DE,en-US,en" (comma-separated)
      if (d && typeof d.languages === 'string' && d.languages.trim()) {
        lang = normalizeLang(d.languages.split(',')[0].trim());
      } else if (d && typeof d.language === 'string' && d.language.trim()) {
        lang = normalizeLang(d.language);
      }

      return { code, lang };
    } catch {
      return { code: null, lang: DEFAULT_LANGUAGE };
    }
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
        if (firstKey) lang = normalizeLang(firstKey);
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
    const countryBtn = qs('#country-selector');
    if (countryBtn) {
      countryBtn.onclick = (e) => {
        e.preventDefault();
        closeLanguageDropdown();
        openCountryOverlay();
      };
    }
  };

  const bindOverlayClose = () => {
    const closeBtn = qs('#country-overlay-close');
    if (closeBtn) closeBtn.onclick = closeCountryOverlay;

    const overlay = qs('#country-overlay');
    if (overlay && !overlay.__neuroartanBackdropBound) {
      overlay.__neuroartanBackdropBound = true;
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeCountryOverlay();
      }, { passive: true });

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeCountryOverlay();
      });
    }
  };

  const bindCountrySelection = () => {
    const regions = qs('#country-regions');
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
      let lang = attrLang ? normalizeLang(attrLang) : null;

      if (!code || !lang) {
        const resolved = await resolveCountryFromName(selectedName);
        if (!code) code = resolved && resolved.code ? resolved.code : (state.countryCode || DEFAULT_COUNTRY_CODE);
        if (!lang) lang = resolved && resolved.lang ? normalizeLang(resolved.lang) : DEFAULT_LANGUAGE;
      }

      state.countryCode = String(code || DEFAULT_COUNTRY_CODE).toUpperCase();
      state.language = normalizeLang(lang || DEFAULT_LANGUAGE);
      state.countryLabel = nativeCountryName(state.countryCode, state.language) || selectedLabel;

      // Prefer explicit country language sets (e.g. Canada: en,fr).
      if (datasetLangs && datasetLangs.length) {
        setStoredLanguages(datasetLangs);
      } else {
        setStoredLanguages([state.language]);
      }

      setLS(STORAGE.COUNTRY_CODE, state.countryCode, LEGACY_STORAGE.COUNTRY_CODE);
      setLS(STORAGE.COUNTRY_LABEL, state.countryLabel, LEGACY_STORAGE.COUNTRY_LABEL);
      setLS(STORAGE.LANGUAGE, state.language, LEGACY_STORAGE.LANGUAGE);

      closeCountryOverlay();
      closeLanguageDropdown();
      setLabels();
      buildLanguageDropdown(state.language, state.languages);
      await applyTranslation(state.language);
    }, { passive: true });
  };

  /* =============================================================================
     15A) COOKIE LANGUAGE OVERLAY BRIDGE
  ============================================================================= */

  const bindCookieLanguageOverlayBridge = () => {
    if (document.body.dataset.cookieLanguageOverlayBridgeBound === 'true') return;
    document.body.dataset.cookieLanguageOverlayBridgeBound = 'true';

    document.addEventListener('country-selected', async (event) => {
      const detail = event?.detail || {};
      if (detail.source !== 'cookie-language-overlay') return;

      const selectedCountry = detail.country && typeof detail.country === 'object' ? detail.country : null;
      const selectedCode = String(detail.countryCode || detail.code || selectedCountry?.code || '').trim().toUpperCase();
      if (!selectedCode) return;

      const explicitLanguage = normalizeLang(detail.language || '');
      const canonical = getCanonicalCountryByCode(selectedCode);
      const canonicalLanguages = canonical && Array.isArray(canonical.languages) ? canonical.languages : [];
      const canonicalPrimary = canonical?.language ? normalizeLang(canonical.language) : '';
      const countryLanguages = Array.isArray(selectedCountry?.languages)
        ? selectedCountry.languages.map(normalizeLang).filter(Boolean)
        : [];
      const singleCountryLanguage = normalizeLang(selectedCountry?.language || '');
      const storedLanguage = normalizeLang(getLS(STORAGE.LANGUAGE, LEGACY_STORAGE.LANGUAGE) || state.language || DEFAULT_LANGUAGE);

      const nextLanguage = (
        explicitLanguage ||
        canonicalLanguages[0] ||
        canonicalPrimary ||
        countryLanguages[0] ||
        singleCountryLanguage ||
        inferLanguageForCountry(selectedCode, storedLanguage || DEFAULT_LANGUAGE)
      );

      state.countryCode = selectedCode;
      state.language = nextLanguage;
      state.countryLabel = nativeCountryName(selectedCode, nextLanguage);

      if (canonicalLanguages.length) {
        setStoredLanguages(canonicalLanguages);
      } else if (countryLanguages.length) {
        setStoredLanguages(countryLanguages);
      } else {
        setStoredLanguages([nextLanguage]);
      }

      setLS(STORAGE.COUNTRY_CODE, state.countryCode, LEGACY_STORAGE.COUNTRY_CODE);
      setLS(STORAGE.COUNTRY_LABEL, state.countryLabel, LEGACY_STORAGE.COUNTRY_LABEL);
      setLS(STORAGE.LANGUAGE, state.language, LEGACY_STORAGE.LANGUAGE);

      closeLanguageDropdown();
      setLabels();
      buildLanguageDropdown(state.language, state.languages);
      await applyTranslation(state.language);
    });
  };

  /* =============================================================================
     16) MAIN INITIALIZATION
  ============================================================================= */

  async function init() {
    hydrateStateFromStorage();
    bindCookieLanguageOverlayBridge();

    const isNewSession = !sessionStorage.getItem(STORAGE.SESSION);

    if (isNewSession) {
      const ip = await detectIP();

      const code = (ip.code || DEFAULT_COUNTRY_CODE).toUpperCase();
      const lang = inferLanguageForCountry(code, normalizeLang(ip.lang || DEFAULT_LANGUAGE));

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
      setLS(STORAGE.LANGUAGE, lang, LEGACY_STORAGE.LANGUAGE);

      sessionStorage.setItem(STORAGE.SESSION, '1');
    }

    await refreshFooterLocaleUI();
    await applyTranslation(state.language);
  }

  /* =============================================================================
     17) FRAGMENT-MOUNTED REBINDING
  ============================================================================= */
  document.addEventListener('footer-mounted', () => {
    refreshFooterLocaleUI();
  });

  document.addEventListener('country-overlay-mounted', () => {
    refreshFooterLocaleUI();
  });

  document.addEventListener('fragment:mounted', (event) => {
    const name = event?.detail?.name || '';
    if (name === 'footer' || name === 'country-overlay') {
      refreshFooterLocaleUI();
    }
  });
  /* =============================================================================
     18) DEFER-SAFE BOOTSTRAP
  ============================================================================= */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();