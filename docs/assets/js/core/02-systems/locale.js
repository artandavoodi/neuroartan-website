/* =============================================================================
   00) FILE INDEX
   01) MODULE IDENTITY
   02) LANGUAGE STATE VARIABLES
   03) LANGUAGE NORMALIZATION
   04) DIRECTION HANDLING
   04A) LANGUAGE STATE & STORAGE
   05) ENGLISH BASELINE CAPTURE
   05A) TRANSLATABLE ATTRIBUTE HELPERS
   06) DOM READINESS
   07) TRANSLATION LIFECYCLE EVENTS
   08) LOCALIZATION CATALOG RESOLUTION
   09) RTL TEXT-ONLY STYLING
   09A) TRANSLATION PAYLOAD PREPARATION
   10) LANGUAGE APPLICATION
   11) CURRENT LANGUAGE REFRESH
   12) PUBLIC HELPER
   12A) PUBLIC LANGUAGE STATE
   13) API EXPOSURE
   14) FRAGMENT-MOUNTED REFRESH
   15) CANONICAL BOOTSTRAP
============================================================================= */

/* =============================================================================
   01) MODULE IDENTITY
============================================================================= */

/* /website/docs/assets/js/core/02-systems/locale.js */
window.NEUROARTAN_TRANSLATION = (() => {


/* =============================================================================
     02) LANGUAGE STATE VARIABLES
============================================================================= */
  let currentLang = 'en';
  let isApplyingLanguage = false;
  let pendingApplyPromise = null;
  let pendingApplyLang = null;
  let fragmentRefreshScheduled = false;
  let pendingFragmentFlushPromise = null;
  const pendingFragmentRoots = new Set();
  let localizationManifestPromise = null;
  let supportedLanguages = [
    { code: 'en', label: 'English', nativeLabel: 'English', direction: 'ltr', source: true, enabled: true },
    { code: 'de', label: 'German', nativeLabel: 'Deutsch', direction: 'ltr', source: false, enabled: true },
    { code: 'fa', label: 'Persian', nativeLabel: 'فارسی', direction: 'rtl', source: false, enabled: true }
  ];
  const catalogCache = new Map();
  const keyCache = new Map();
  const missingTranslationCache = new Set();

  const queuePendingFragmentRoot = (root) => {
    if (!(root instanceof Element)) return;
    pendingFragmentRoots.add(root);
  };

  const flushPendingFragmentRoots = () => {
    if (fragmentRefreshScheduled && pendingFragmentFlushPromise) return pendingFragmentFlushPromise;
    if (currentLang === 'en' || !pendingFragmentRoots.size) return Promise.resolve();

    fragmentRefreshScheduled = true;

    pendingFragmentFlushPromise = new Promise((resolve) => {
      window.requestAnimationFrame(async () => {
        fragmentRefreshScheduled = false;

        while (pendingFragmentRoots.size) {
          const roots = Array.from(pendingFragmentRoots).filter((root) => {
            return root instanceof Element && document.contains(root);
          });

          pendingFragmentRoots.clear();

          for (const rootEl of roots) {
            await refreshCurrentLanguage(rootEl);
          }
        }

        pendingFragmentFlushPromise = null;
        resolve();
      });
    });

    return pendingFragmentFlushPromise;
  };

  /* =============================================================================
     03) LANGUAGE NORMALIZATION
  ============================================================================= */
  const normalizeLang = (lang) => {
    if (!lang) return "en";

    const raw = String(lang).trim();
    if (!raw) return "en";

    const ALIASES = {
      EN: "en",
      DE: "de",
      FA: "fa",
      AR: "ar",
      ES: "es",
      FR: "fr",
      IT: "it",
      PT: "pt",
      RU: "ru",
      TR: "tr",
      ZH: "zh",
      JA: "ja",
      KO: "ko",
      UR: "ur",
      HI: "hi",
      BN: "bn",
      PA: "pa",
      GU: "gu",
      TA: "ta",
      TE: "te",
      ML: "ml",
      MR: "mr",
      KN: "kn",
      SI: "si",
      NE: "ne",
      TH: "th",
      VI: "vi",
      ID: "id",
      MS: "ms",
      TL: "tl",
      HE: "he",
      UK: "uk",
      PL: "pl",
      NL: "nl",
      SV: "sv",
      NO: "no",
      DA: "da",
      FI: "fi",
      EL: "el",
      CS: "cs",
      SK: "sk",
      HU: "hu",
      RO: "ro",
      BG: "bg",
      HR: "hr",
      SR: "sr",
      SL: "sl",
      ET: "et",
      LV: "lv",
      LT: "lt",
      KA: "ka",
      HY: "hy",
      AZ: "az",
      KK: "kk",
      UZ: "uz",
      KY: "ky",
      MN: "mn",
      KM: "km",
      LO: "lo",
      MY: "my",

      English: "en",
      Deutsch: "de",
      German: "de",
      فارسی: "fa",
      Farsi: "fa",
      Persian: "fa",
      العربية: "ar",
      Arabic: "ar",
      Español: "es",
      Spanish: "es",
      Français: "fr",
      French: "fr",
      Italiano: "it",
      Italian: "it",
      Português: "pt",
      Portuguese: "pt",
      Русский: "ru",
      Russian: "ru",
      Türkçe: "tr",
      Turkish: "tr",
      中文: "zh",
      日本語: "ja",
      한국어: "ko",
    };

    if (ALIASES[raw]) return ALIASES[raw];

    const upper = raw.toUpperCase();
    if (ALIASES[upper]) return ALIASES[upper];

    const primary = raw.split(/[-_]/)[0].toLowerCase();

    const rescue = {
      deutsch: "de",
      german: "de",
      farsi: "fa",
      persian: "fa",
      arabic: "ar",
      english: "en",
      spanish: "es",
      french: "fr",
      italian: "it",
      portuguese: "pt",
      russian: "ru",
      turkish: "tr",
      chinese: "zh",
      japanese: "ja",
      korean: "ko",
      urdu: "ur",
      hindi: "hi",
      bengali: "bn",
      punjabi: "pa",
      gujarati: "gu",
      tamil: "ta",
      telugu: "te",
      malayalam: "ml",
      marathi: "mr",
      kannada: "kn",
      sinhala: "si",
      nepali: "ne",
      thai: "th",
      vietnamese: "vi",
      indonesian: "id",
      malay: "ms",
      filipino: "tl",
      hebrew: "he",
      ukrainian: "uk",
      polish: "pl",
      dutch: "nl",
      swedish: "sv",
      norwegian: "no",
      danish: "da",
      finnish: "fi",
      greek: "el",
      czech: "cs",
      slovak: "sk",
      hungarian: "hu",
      romanian: "ro",
      bulgarian: "bg",
      croatian: "hr",
      serbian: "sr",
      slovenian: "sl",
      estonian: "et",
      latvian: "lv",
      lithuanian: "lt",
      georgian: "ka",
      armenian: "hy",
      azerbaijani: "az",
      kazakh: "kk",
      uzbek: "uz",
      kyrgyz: "ky",
      mongolian: "mn",
      khmer: "km",
      lao: "lo",
      burmese: "my",
    };

    if (rescue[primary]) return rescue[primary];
    return primary || "en";
  };


  /* =============================================================================
     04) DIRECTION HANDLING
  ============================================================================= */
  const RTL_LANGS = ["ar", "fa", "ur", "he"];
  const applyDir = (lang) => {
    const nl = normalizeLang(lang) || "en";
    const isRtl = RTL_LANGS.includes(nl);
    const nextDir = isRtl ? "rtl" : "ltr";

    document.documentElement.lang = nl;
    document.documentElement.dir = nextDir;
    document.documentElement.classList.toggle("lang-rtl", isRtl);
    document.documentElement.setAttribute("data-lang", nl);
    document.documentElement.setAttribute("data-language-direction", nextDir);

    if (document.body) {
      document.body.setAttribute("dir", nextDir);
      document.body.setAttribute("data-dir", nextDir);
    }

    const siteMain = document.getElementById("site-main");
    if (siteMain) {
      siteMain.setAttribute("dir", nextDir);
      siteMain.setAttribute("data-dir", nextDir);
    }

    const linksMount = document.getElementById("institutional-links-mount");
    if (linksMount) {
      linksMount.setAttribute("dir", nextDir);
      linksMount.setAttribute("data-dir", nextDir);
    }

    window.dispatchEvent(new CustomEvent("neuroartan:language-applied", {
      detail: { lang: nl, rtl: isRtl }
    }));
  };

  /* =============================================================================
     04A) LANGUAGE STATE & STORAGE
  ============================================================================= */
  const STORAGE_KEYS = [
    'neuroartan_language',
    'neuroartan-language',
    'artan_language',
    'selectedLanguage',
    'preferredLanguage',
    'language',
    'lang',
  ];

  function setRuntimeLanguage(lang) {
    currentLang = normalizeLang(lang) || 'en';
    window.__NEUROARTAN_LANG__ = currentLang;
    document.documentElement.setAttribute('data-lang', currentLang);
  }

  function readStoredLanguage() {
    for (const key of STORAGE_KEYS) {
      try {
        const localValue = localStorage.getItem(key);
        if (localValue) return normalizeLang(localValue);
      } catch {}

      try {
        const sessionValue = sessionStorage.getItem(key);
        if (sessionValue) return normalizeLang(sessionValue);
      } catch {}
    }

    const docLang = document.documentElement.getAttribute('data-lang');
    if (docLang) return normalizeLang(docLang);

    const htmlLang = document.documentElement.lang;
    if (htmlLang) return normalizeLang(htmlLang);

    return 'en';
  }

  function writeStoredLanguage(lang) {
    const normalized = normalizeLang(lang) || 'en';

    STORAGE_KEYS.slice(0, 3).forEach((key) => {
      try {
        localStorage.setItem(key, normalized);
      } catch {}

      try {
        sessionStorage.setItem(key, normalized);
      } catch {}
    });

    window.__NEUROARTAN_LANG__ = normalized;
  }

  /* =============================================================================
     05A) TRANSLATABLE ATTRIBUTE HELPERS
  ============================================================================= */
  function collectUniqueTranslatableNodes(scope) {
    const nodes = [];
    const seen = new Set();

    const pushNode = (node) => {
      if (!(node instanceof Element)) return;
      if (seen.has(node)) return;
      seen.add(node);
      nodes.push(node);
    };

    if (scope instanceof Element) {
      if (
        scope.matches('[data-i18n-key]') ||
        scope.matches('[data-i18n-placeholder-key]') ||
        scope.matches('[data-i18n-aria-label-key]') ||
        scope.matches('[data-i18n-title-key]')
      ) {
        pushNode(scope);
      }
    }

    scope.querySelectorAll('[data-i18n-key], [data-i18n-placeholder-key], [data-i18n-aria-label-key], [data-i18n-title-key]').forEach(pushNode);
    return nodes;
  }

  /* =============================================================================
     05) ENGLISH BASELINE CAPTURE
  ============================================================================= */
  function ensureEnglishBaselineCaptured(root = document) {
    const scope = root instanceof Element || root instanceof Document ? root : document;
    const nodes = collectUniqueTranslatableNodes(scope);

    for (const el of nodes) {
      if (el.hasAttribute('data-i18n-key') && !el.dataset.i18nEn) {
        el.dataset.i18nEn = el instanceof HTMLMetaElement
          ? (el.getAttribute('content') || '').trim()
          : (el.textContent || '').trim();
      }

      if (el.hasAttribute('data-i18n-aria-label-key') && !el.dataset.i18nAriaEn) {
        el.dataset.i18nAriaEn = (el.getAttribute('aria-label') || '').trim();
      }
      if (el.hasAttribute('data-i18n-title-key') && !el.dataset.i18nTitleEn) {
        el.dataset.i18nTitleEn = (el.getAttribute('title') || '').trim();
      }
      if (el.hasAttribute('data-i18n-placeholder-key') && !el.dataset.i18nPlaceholderEn) {
        el.dataset.i18nPlaceholderEn = (el.getAttribute('placeholder') || '').trim();
      }

      if (el.hasAttribute('aria-label') && !el.dataset.i18nAriaEn) {
        el.dataset.i18nAriaEn = (el.getAttribute('aria-label') || '').trim();
      }
      if (el.hasAttribute('title') && !el.dataset.i18nTitleEn) {
        el.dataset.i18nTitleEn = (el.getAttribute('title') || '').trim();
      }
      if (el.hasAttribute('placeholder') && !el.dataset.i18nPlaceholderEn) {
        el.dataset.i18nPlaceholderEn = (el.getAttribute('placeholder') || '').trim();
      }
    }
  }

  /* =============================================================================
     06) DOM READINESS
  ============================================================================= */
  function whenDomReady() {
    if (document.readyState !== "loading") return Promise.resolve();
    return new Promise((resolve) => {
      document.addEventListener("DOMContentLoaded", resolve, { once: true });
    });
  }

  /* =============================================================================
     07) TRANSLATION LIFECYCLE EVENTS
  ============================================================================= */
  function emitTranslationLifecycle(type, detail = {}) {
    document.dispatchEvent(new CustomEvent(`translation:${type}`, {
      detail: {
        lang: currentLang,
        ...detail
      }
    }));
  }

  /* =============================================================================
     08) LOCALIZATION CATALOG RESOLUTION
  ============================================================================= */
  const LOCALIZATION_MANIFEST_URL = '/assets/data/system/localization/manifest.json';
  const LOCALIZATION_DEFAULT_CATALOG_BASE_PATH = '/assets/data/system/localization/locales/';

  function normalizeManifestLanguages(manifest) {
    const languages = Array.isArray(manifest?.languages) ? manifest.languages : [];
    const normalized = languages
      .map((item) => {
        const code = normalizeLang(item?.code || '');
        if (!code || item?.enabled === false) return null;

        return {
          code,
          label: String(item?.label || code.toUpperCase()).trim(),
          nativeLabel: String(item?.nativeLabel || item?.native_label || item?.label || code.toUpperCase()).trim(),
          direction: item?.direction === 'rtl' ? 'rtl' : 'ltr',
          source: item?.source === true,
          enabled: true,
          catalog: String(item?.catalog || `${code}.json`).trim()
        };
      })
      .filter(Boolean);

    return normalized.length ? normalized : supportedLanguages;
  }

  function normalizeCatalogEntries(catalog) {
    const entries = catalog?.entries;
    return entries && typeof entries === 'object' && !Array.isArray(entries) ? entries : {};
  }

  async function fetchLocalizationJson(path) {
    const response = await fetch(path, {
      cache: 'no-store',
      credentials: 'same-origin'
    });

    if (!response.ok) {
      throw new Error(`Failed to load localization asset ${path}: HTTP ${response.status}`);
    }

    return response.json();
  }

  async function loadLocalizationManifest() {
    if (!localizationManifestPromise) {
      localizationManifestPromise = fetchLocalizationJson(LOCALIZATION_MANIFEST_URL)
        .then((manifest) => {
          supportedLanguages = normalizeManifestLanguages(manifest);
          return manifest;
        })
        .catch(() => ({
          sourceLanguage: 'en',
          defaultLanguage: 'en',
          catalogBasePath: LOCALIZATION_DEFAULT_CATALOG_BASE_PATH,
          languages: [
            { code: 'en', direction: 'ltr', catalog: 'en.json', enabled: true, source: true }
          ]
        }));
    }

    return localizationManifestPromise;
  }

  async function getLocalizationLanguageConfig(lang) {
    const manifest = await loadLocalizationManifest();
    const normalized = normalizeLang(lang);
    const languages = Array.isArray(manifest.languages) ? manifest.languages : [];
    return languages.find((item) => normalizeLang(item?.code) === normalized)
      || languages.find((item) => normalizeLang(item?.code) === normalizeLang(manifest.defaultLanguage || 'en'))
      || { code: 'en', direction: 'ltr', catalog: 'en.json', enabled: true, source: true };
  }

  async function loadLocalizationCatalog(lang) {
    const config = await getLocalizationLanguageConfig(lang);
    const code = normalizeLang(config?.code || lang || 'en');

    if (catalogCache.has(code)) {
      return catalogCache.get(code);
    }

    const manifest = await loadLocalizationManifest();
    const basePath = String(manifest.catalogBasePath || LOCALIZATION_DEFAULT_CATALOG_BASE_PATH).replace(/\/?$/, '/');
    const catalogPath = `${basePath}${config.catalog || `${code}.json`}`;

    const promise = fetchLocalizationJson(catalogPath)
      .then((catalog) => ({
        language: normalizeLang(catalog?.language || code),
        direction: catalog?.direction === 'rtl' ? 'rtl' : 'ltr',
        entries: normalizeCatalogEntries(catalog)
      }))
      .catch(() => ({
        language: code,
        direction: config?.direction === 'rtl' ? 'rtl' : 'ltr',
        entries: {}
      }));

    catalogCache.set(code, promise);
    return promise;
  }

  async function resolveCatalogValue(key, fallback = '', lang = currentLang) {
    const normalizedKey = String(key || '').trim();
    const fallbackText = String(fallback || '').trim();
    const normalizedLang = normalizeLang(lang);

    if (!normalizedKey) {
      return fallbackText;
    }

    const sourceLang = 'en';
    const targetCatalog = await loadLocalizationCatalog(normalizedLang);
    const sourceCatalog = normalizedLang === sourceLang
      ? targetCatalog
      : await loadLocalizationCatalog(sourceLang);

    const targetValue = targetCatalog.entries?.[normalizedKey];
    if (typeof targetValue === 'string' && targetValue.trim()) {
      return targetValue;
    }

    const sourceValue = sourceCatalog.entries?.[normalizedKey];
    if (typeof sourceValue === 'string' && sourceValue.trim()) {
      if (normalizedLang !== sourceLang) {
        reportMissingTranslation(normalizedKey, normalizedLang);
      }
      return sourceValue;
    }

    if (fallbackText) {
      if (normalizedLang !== sourceLang) {
        reportMissingTranslation(normalizedKey, normalizedLang);
      }
      return fallbackText;
    }

    return '';
  }

  function reportMissingTranslation(key, lang) {
    const normalizedKey = String(key || '').trim();
    const normalizedLang = normalizeLang(lang);
    if (!normalizedKey || normalizedLang === 'en') return;

    const cacheKey = `${normalizedLang}::${normalizedKey}`;
    if (missingTranslationCache.has(cacheKey)) return;
    missingTranslationCache.add(cacheKey);

    document.dispatchEvent(new CustomEvent('localization:missing-translation', {
      detail: {
        key: normalizedKey,
        lang: normalizedLang,
        source: 'localization-catalog'
      }
    }));
  }

  /* =============================================================================
     09) RTL TEXT-ONLY STYLING
  ============================================================================= */
  const applyTextRTL = (el, isRtl) => {
    if (!el) return;

    if (isRtl) {
      el.style.letterSpacing = "normal";
      el.style.direction = "rtl";
      el.style.unicodeBidi = "isolate";
      el.style.textAlign = "";
    } else {
      el.style.letterSpacing = "";
      el.style.direction = "";
      el.style.unicodeBidi = "";
      el.style.textAlign = "";
    }
  };

  function shouldApplyTextRTL(el) {
    if (!(el instanceof Element)) return false;
    if (el.getAttribute('data-locale-direction-locked') === 'true') return false;

    if (el.hasAttribute('data-i18n-key')) {
      return true;
    }

    if (
      (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)
      && (el.hasAttribute('data-i18n-placeholder-key') || el.hasAttribute('placeholder'))
    ) {
      return true;
    }

    return false;
  }

  /* =============================================================================
     09A) TRANSLATION PAYLOAD PREPARATION
  ============================================================================= */
  async function prepareNodeTranslationPayload(el, lang) {
    const payload = {
      textContent: null,
      content: null,
      ariaLabel: null,
      title: null,
      placeholder: null,
    };

    const enText = (el.dataset.i18nEn || '').trim();

    if (el.hasAttribute('data-i18n-key')) {
      const textKey = (el.getAttribute('data-i18n-key') || '').trim();
      const source = enText || (el instanceof HTMLMetaElement ? (el.getAttribute('content') || '').trim() : (el.textContent || '').trim());
      const value = source ? await resolveCatalogValue(textKey, source, lang) : null;
      if (el instanceof HTMLMetaElement) {
        payload.content = value;
      } else {
        payload.textContent = value;
      }
    }

    if (el.dataset.i18nAriaEn) {
      const ariaKey = (el.getAttribute('data-i18n-aria-label-key') || el.getAttribute('data-i18n-key') || '').trim();
      payload.ariaLabel = await resolveCatalogValue(ariaKey, el.dataset.i18nAriaEn, lang);
    }

    if (el.dataset.i18nTitleEn) {
      const titleKey = (el.getAttribute('data-i18n-title-key') || el.getAttribute('data-i18n-key') || '').trim();
      payload.title = await resolveCatalogValue(titleKey, el.dataset.i18nTitleEn, lang);
    }

    if (el.dataset.i18nPlaceholderEn) {
      const placeholderKey = (el.getAttribute('data-i18n-placeholder-key') || el.getAttribute('data-i18n-key') || '').trim();
      payload.placeholder = await resolveCatalogValue(placeholderKey, el.dataset.i18nPlaceholderEn, lang);
    }

    return payload;
  }

  /* =============================================================================
     10) LANGUAGE APPLICATION
  ============================================================================= */
  async function applyLanguage(lang, root = document) {
    await whenDomReady();

    lang = normalizeLang(lang);
    const isRtl = RTL_LANGS.includes(lang);
    const scope = root instanceof Element || root instanceof Document ? root : document;
    const isGlobalScope = scope === document;

    if (isGlobalScope && isApplyingLanguage && pendingApplyPromise && pendingApplyLang === lang) {
      return pendingApplyPromise;
    }

    if (isGlobalScope && !isApplyingLanguage && currentLang === lang && document.documentElement.getAttribute("data-lang") === lang) {
      return;
    }

    const run = (async () => {
      ensureEnglishBaselineCaptured(scope);

      if (isGlobalScope) {
        applyDir(lang);
        setRuntimeLanguage(lang);
        emitTranslationLifecycle("start", { lang });
      }

      try {
        if (isGlobalScope) {
          keyCache.clear();
        }

        const nodes = collectUniqueTranslatableNodes(scope);
        const payloads = await Promise.all(
          nodes.map(async (el) => ({
            el,
            payload: await prepareNodeTranslationPayload(el, lang),
          }))
        );

        for (const { el, payload } of payloads) {
          if (el.hasAttribute('data-i18n-key') && payload.textContent !== null) {
            el.textContent = payload.textContent;
            const textKey = (el.getAttribute('data-i18n-key') || '').trim();
            if (textKey) {
              keyCache.set(textKey, payload.textContent);
            }
          }

          if (payload.content !== null) {
            el.setAttribute('content', payload.content);
            const contentKey = (el.getAttribute('data-i18n-key') || '').trim();
            if (contentKey) {
              keyCache.set(contentKey, payload.content);
            }
          }

          if (payload.ariaLabel !== null) {
            el.setAttribute('aria-label', payload.ariaLabel);
          }

          if (payload.title !== null) {
            el.setAttribute('title', payload.title);
          }

          if (payload.placeholder !== null) {
            el.setAttribute('placeholder', payload.placeholder);
          }

          applyTextRTL(el, isRtl && shouldApplyTextRTL(el));
        }

        const previewNodes = Array.from(scope.querySelectorAll('[data-preview-title-i18n], [data-preview-sub-i18n]'));
        for (const el of previewNodes) {
          const titleKey = (el.getAttribute("data-preview-title-i18n") || "").trim();
          const subKey = (el.getAttribute("data-preview-sub-i18n") || "").trim();

          if (titleKey) {
            const enTitle = ((el.getAttribute("data-preview-title") || "")).trim();
            const val = await resolveCatalogValue(titleKey, enTitle, lang);
            if (val) keyCache.set(titleKey, val);
          }

          if (subKey) {
            const enSub = ((el.getAttribute("data-preview-sub") || "")).trim();
            const val = await resolveCatalogValue(subKey, enSub, lang);
            if (val) keyCache.set(subKey, val);
          }
        }

        if (isGlobalScope && pendingFragmentRoots.size) {
          await flushPendingFragmentRoots();
        }

        if (isGlobalScope) {
          writeStoredLanguage(lang);
          emitTranslationLifecycle("complete", { lang });
        }
      } catch (error) {
        if (isGlobalScope) {
          emitTranslationLifecycle("error", { lang, error });
        }
      } finally {
        if (isGlobalScope) {
          isApplyingLanguage = false;
          pendingApplyPromise = null;
          pendingApplyLang = null;

          if (currentLang !== 'en' && pendingFragmentRoots.size) {
            void flushPendingFragmentRoots();
          }
        }
      }
    })();

    if (isGlobalScope) {
      isApplyingLanguage = true;
      pendingApplyPromise = run;
      pendingApplyLang = lang;
    }

    return run;
  }

  /* =============================================================================
     11) CURRENT LANGUAGE REFRESH
  ============================================================================= */
  async function refreshCurrentLanguage(root = document) {
    await applyLanguage(currentLang, root);
  }

  /* =============================================================================
     12) PUBLIC HELPER
  ============================================================================= */
  function t(key) {
    if (!key) return "";
    const k = String(key).trim();
    if (!k) return "";

    if (keyCache.has(k)) return keyCache.get(k) || "";

    const el = document.querySelector(`[data-i18n-key="${k}"]`);
    if (!el) return "";

    const current = (el.textContent || "").trim();
    if (current) return current;

    const en = (el.dataset.i18nEn || "").trim();
    if (en) return en;

    return "";
  }

  /* =============================================================================
     12A) PUBLIC LANGUAGE STATE
  ============================================================================= */
  function getCurrentLanguage() {
    return normalizeLang(currentLang || readStoredLanguage() || 'en');
  }

  function setLanguage(lang, root = document) {
    return applyLanguage(lang, root);
  }

  function getSupportedLanguages() {
    return supportedLanguages.map((item) => ({ ...item }));
  }

  function getLanguageDirection(lang) {
    const normalized = normalizeLang(lang);
    return supportedLanguages.find((item) => item.code === normalized)?.direction
      || (RTL_LANGS.includes(normalized) ? 'rtl' : 'ltr');
  }

  /* =============================================================================
     13) API EXPOSURE
  ============================================================================= */
  const api = {
    applyLanguage,
    refreshCurrentLanguage,
    t,
    getCurrentLanguage,
    setLanguage,
    normalizeLang,
    getSupportedLanguages,
    getLanguageDirection,
    loadLocalizationManifest
  };
  window.ARTAN_TRANSLATION = api;
  window.NEUROARTAN_TRANSLATION = api;

  /* =============================================================================
     14) FRAGMENT-MOUNTED REFRESH
  ============================================================================= */
  document.addEventListener("fragment:mounted", (event) => {
    if (!currentLang || currentLang === "en") return;

    const detailRoot = event?.detail?.root;
    const root = detailRoot instanceof Element ? detailRoot : null;
    if (!root) return;

    queuePendingFragmentRoot(root);

    if (isApplyingLanguage) {
      return;
    }

    flushPendingFragmentRoots();
  });

  /* =============================================================================
     15) CANONICAL BOOTSTRAP
  ============================================================================= */
  whenDomReady().then(() => {
    const initialLang = readStoredLanguage();

    if (initialLang === 'en') {
      setRuntimeLanguage('en');
      applyDir('en');
      writeStoredLanguage('en');
      return;
    }

    currentLang = 'en';
    document.documentElement.setAttribute('data-lang', 'en');
    applyLanguage(initialLang).catch(() => {});
  }).catch(() => {});

  return api;

})();
