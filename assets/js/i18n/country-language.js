/* =========================================================
   country-language.js
   SINGLE SOURCE OF TRUTH — DROP-IN REPLACEMENT

   Responsibilities
   - Footer locale UI (country label + language toggle dropdown)
   - Country overlay open/close + selection
   - Session-first IP detection (new session => IP, same session => stored)
   - Calls translation engine via window.NEUROARTAN_TRANSLATION.applyLanguage(lang) with ARTAN fallback compatibility

   Guarantees
   - No duplicate event bindings
   - No regressions to menu/theme/cursor systems
   - Preserves existing micro-behaviors (CSS owns motion)
========================================================= */
(() => {
  'use strict';

  /* =================== Fragment Injection =================== */
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
    if (c.length === 3 && ISO639_3_TO_1[c]) c = ISO639_3_TO_1[c];
    if (!c || c.length < 2) return DEFAULT_LANGUAGE;
    return c;
  };

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

  // Expose read-only state for debugging without coupling.
  Object.defineProperty(window, 'NEUROARTAN_LOCALE', {
    configurable: true,
    get: () => ({ ...state })
  });

  Object.defineProperty(window, 'ARTAN_LOCALE', {
    configurable: true,
    get: () => window.NEUROARTAN_LOCALE
  });

  /* =================== UI: Labels =================== */

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
    state.language = normalizeLang(getLS(STORAGE.LANGUAGE, LEGACY_STORAGE.LANGUAGE) || DEFAULT_LANGUAGE);
    state.countryLabel = getLS(STORAGE.COUNTRY_LABEL, LEGACY_STORAGE.COUNTRY_LABEL) || nativeCountryName(state.countryCode, state.language);
    state.languages = getStoredLanguages();
  };

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

  /* =================== Translation Bridge (safe + retry + fallback) =================== */

  let pendingLang = null;

  const applyTranslationNow = (lang) => {
    const api = window.NEUROARTAN_TRANSLATION || window.ARTAN_TRANSLATION;
    if (!api || typeof api.applyLanguage !== 'function') return false;

    try {
      const out = api.applyLanguage(normalizeLang(lang));
      if (out === false) return false;
      return true;
    } catch {
      return false;
    }
  };

  const forceEnglishFallback = () => {
    state.language = DEFAULT_LANGUAGE;
    setLS(STORAGE.LANGUAGE, DEFAULT_LANGUAGE, LEGACY_STORAGE.LANGUAGE);
    setLabels();
    buildLanguageDropdown(DEFAULT_LANGUAGE, state.languages);
    applyTranslationNow(DEFAULT_LANGUAGE);
  };

  const applyTranslation = (lang) => {
    const normalized = normalizeLang(lang);
    pendingLang = normalized;

    if (applyTranslationNow(normalized)) {
      pendingLang = null;
      return;
    }

    // Retry briefly (translation.js may initialize after this file).
    let tries = 0;
    const t = setInterval(() => {
      tries += 1;
      if (!pendingLang) { clearInterval(t); return; }

      if (applyTranslationNow(pendingLang)) {
        pendingLang = null;
        clearInterval(t);
        return;
      }

      // After retries, keep UI consistent by falling back to English.
      if (tries >= 30) {
        pendingLang = null;
        clearInterval(t);
        forceEnglishFallback();
      }
    }, 80);
  };

  /* =================== Overlay: Country =================== */

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

  /* =================== Dropdown: Language =================== */

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
      btn.addEventListener('click', () => {
        state.language = code;
        setLS(STORAGE.LANGUAGE, code, LEGACY_STORAGE.LANGUAGE);
        closeLanguageDropdown();
        setLabels();
        applyTranslation(code);

        // Keep country label native to current language.
        if (state.countryCode) {
          state.countryLabel = nativeCountryName(state.countryCode, state.language);
          setLS(STORAGE.COUNTRY_LABEL, state.countryLabel);
          setLabels();
        }
        // Rebuild dropdown with current stored languages.
        buildLanguageDropdown(state.language, state.languages);
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

  /* =================== IP Detection (new session) =================== */

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

  /* =================== Country Resolve (fallback) =================== */

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

  /* =================== Bindings =================== */

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
      applyTranslation(state.language);
    }, { passive: true });
  };

  /* =================== Init =================== */

  async function init() {
    hydrateStateFromStorage();
    await refreshFooterLocaleUI();

    const isNewSession = !sessionStorage.getItem(STORAGE.SESSION);

    if (isNewSession) {
      const ip = await detectIP();

      const code = (ip.code || DEFAULT_COUNTRY_CODE).toUpperCase();
      const lang = normalizeLang(ip.lang || DEFAULT_LANGUAGE);

      state.countryCode = code;
      state.language = lang;
      state.countryLabel = nativeCountryName(code, lang);
      setStoredLanguages([lang]);

      setLS(STORAGE.COUNTRY_CODE, code, LEGACY_STORAGE.COUNTRY_CODE);
      setLS(STORAGE.COUNTRY_LABEL, state.countryLabel, LEGACY_STORAGE.COUNTRY_LABEL);
      setLS(STORAGE.LANGUAGE, lang, LEGACY_STORAGE.LANGUAGE);

      sessionStorage.setItem(STORAGE.SESSION, '1');
    }

    await refreshFooterLocaleUI();
    applyTranslation(state.language);
  }

  // Re-bind footer triggers if footer is injected after initial load
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
  // Defer-safe init
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();