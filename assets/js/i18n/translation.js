/* =============================================================================
   00) FILE INDEX
   01) MODULE IDENTITY
   02) RUNTIME STATE
   03) LANGUAGE NORMALIZATION
   04) DIRECTION HANDLING
   05) ENGLISH BASELINE CAPTURE
   05A) TRANSLATABLE ATTRIBUTE HELPERS
   06) DOM READINESS
   07) TRANSLATION LIFECYCLE EVENTS
   08) GOOGLE TRANSLATE FETCH
   09) RTL TEXT-ONLY STYLING
   09A) TRANSLATION PAYLOAD PREPARATION
   10) LANGUAGE APPLICATION
   11) CURRENT LANGUAGE REFRESH
   12) PUBLIC HELPER
   13) API EXPOSURE
   14) FRAGMENT-MOUNTED REFRESH
============================================================================= */

/* =============================================================================
   01) MODULE IDENTITY
============================================================================= */

window.NEUROARTAN_TRANSLATION = (() => {

  /* =============================================================================
     02) RUNTIME STATE
  ============================================================================= */
  let currentLang = "en";
  let isApplyingLanguage = false;
  let pendingApplyPromise = null;
  let pendingApplyLang = null;
  let fragmentRefreshScheduled = false;
  const pendingFragmentRoots = new Set();
  const cache = new Map();
  const keyCache = new Map();

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
    document.documentElement.dir = "ltr";
    document.documentElement.classList.toggle("lang-rtl", isRtl);
    document.documentElement.setAttribute("data-lang", nl);

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
        el.dataset.i18nEn = (el.textContent || '').trim();
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
     08) GOOGLE TRANSLATE FETCH
  ============================================================================= */
  async function translate(text, lang) {
    if (!text) return text;
    const tl = normalizeLang(lang);
    if (!tl || tl === "en") return text;

    const key = `${tl}::${text}`;
    if (cache.has(key)) return cache.get(key);

    try {
      const res = await fetch(
        "https://translate.googleapis.com/translate_a/single" +
          `?client=gtx&sl=auto&tl=${encodeURIComponent(tl)}&dt=t&q=${encodeURIComponent(text)}`
      );
      const json = await res.json();
      const out = (json?.[0] || []).map((x) => x?.[0] || "").join("");
      cache.set(key, out || text);
      return out || text;
    } catch {
      return text;
    }
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

  /* =============================================================================
     09A) TRANSLATION PAYLOAD PREPARATION
  ============================================================================= */
  async function prepareNodeTranslationPayload(el, lang) {
    const payload = {
      textContent: null,
      ariaLabel: null,
      title: null,
      placeholder: null,
    };

    const enText = (el.dataset.i18nEn || '').trim();

    if (el.hasAttribute('data-i18n-key')) {
      if (lang === 'en') {
        payload.textContent = enText || null;
      } else {
        const source = enText || (el.textContent || '').trim();
        payload.textContent = source ? await translate(source, lang) : null;
      }
    }

    if (el.dataset.i18nAriaEn) {
      payload.ariaLabel = lang === 'en'
        ? el.dataset.i18nAriaEn
        : await translate(el.dataset.i18nAriaEn, lang);
    }

    if (el.dataset.i18nTitleEn) {
      payload.title = lang === 'en'
        ? el.dataset.i18nTitleEn
        : await translate(el.dataset.i18nTitleEn, lang);
    }

    if (el.dataset.i18nPlaceholderEn) {
      payload.placeholder = lang === 'en'
        ? el.dataset.i18nPlaceholderEn
        : await translate(el.dataset.i18nPlaceholderEn, lang);
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
        currentLang = lang;
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

          applyTextRTL(el, isRtl);
        }

        const previewNodes = Array.from(scope.querySelectorAll('[data-preview-title-i18n], [data-preview-sub-i18n]'));
        for (const el of previewNodes) {
          const titleKey = (el.getAttribute("data-preview-title-i18n") || "").trim();
          const subKey = (el.getAttribute("data-preview-sub-i18n") || "").trim();

          if (titleKey) {
            const enTitle = ((el.getAttribute("data-preview-title") || "")).trim();
            const val = lang === "en" ? enTitle : await translate(enTitle, lang);
            if (val) keyCache.set(titleKey, val);
          }

          if (subKey) {
            const enSub = ((el.getAttribute("data-preview-sub") || "")).trim();
            const val = lang === "en" ? enSub : await translate(enSub, lang);
            if (val) keyCache.set(subKey, val);
          }
        }

        if (isGlobalScope) {
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

          if (currentLang !== "en" && pendingFragmentRoots.size) {
            const roots = Array.from(pendingFragmentRoots);
            pendingFragmentRoots.clear();

            window.requestAnimationFrame(async () => {
              for (const rootEl of roots) {
                if (rootEl instanceof Element && document.contains(rootEl)) {
                  await refreshCurrentLanguage(rootEl);
                }
              }
            });
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
     13) API EXPOSURE
  ============================================================================= */
  const api = { applyLanguage, refreshCurrentLanguage, t };
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

    if (isApplyingLanguage) {
      pendingFragmentRoots.add(root);
      return;
    }

    if (fragmentRefreshScheduled) return;
    fragmentRefreshScheduled = true;

    window.requestAnimationFrame(async () => {
      try {
        await refreshCurrentLanguage(root);
      } finally {
        fragmentRefreshScheduled = false;
      }
    });
  });

  return api;

})();