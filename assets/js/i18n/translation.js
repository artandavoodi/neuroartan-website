/**
 * ============================================================
 * NEUROARTAN — TRANSLATION ENGINE (LOCKED · SINGLE RESPONSIBILITY)
 * Translates DOM text ONLY.
 * No IP logic · No country logic · No UI logic.
 * Controlled exclusively by country-language.js
 * ============================================================
 */

window.NEUROARTAN_TRANSLATION = (() => {

  /* ------------------------------------------------------------
     State
  ------------------------------------------------------------ */
  let currentLang = "en";
  let isApplyingLanguage = false;
  let pendingApplyPromise = null;
  let pendingApplyLang = null;
  let fragmentRefreshScheduled = false;
  const pendingFragmentRoots = new Set();
  const cache = new Map();
  const keyCache = new Map(); // sync lookup cache for i18n keys (including menu preview keys)

  /* ------------------------------------------------------------
     Language normalization
     - Accepts locales like: de-DE, fa-IR, zh-Hans-CN
     - Translation engine works on the primary subtag only.
     - Also accepts UI labels/codes coming from the selector (DE, Deutsch, فارسی, ...)
  ------------------------------------------------------------ */
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

  /* ------------------------------------------------------------
     Direction handling
     - Professional default: set `lang` attribute always.
     - RTL flipping is temporarily disabled because it breaks the custom cursor
       interaction layer in some browsers.
     - Re-enable once cursor layer is made RTL-safe.
  ------------------------------------------------------------ */
  const RTL_LANGS = ["ar", "fa", "ur", "he"];
  const applyDir = (lang) => {
    const nl = normalizeLang(lang) || "en";
    document.documentElement.lang = nl;

    document.documentElement.dir = "ltr";

    document.documentElement.classList.toggle('lang-rtl', RTL_LANGS.includes(nl));
    document.documentElement.setAttribute('data-lang', nl);

    window.dispatchEvent(new CustomEvent("neuroartan:language-applied", { detail: { lang: nl, rtl: RTL_LANGS.includes(nl) } }));
  };

  /* ------------------------------------------------------------
     Baseline capture
  ------------------------------------------------------------ */
  function ensureEnglishBaselineCaptured(root = document) {
    const scope = root instanceof Element || root instanceof Document ? root : document;
    const nodes = [];

    if (scope instanceof Element && scope.matches("[data-i18n-key]")) {
      nodes.push(scope);
    }
    nodes.push(...scope.querySelectorAll("[data-i18n-key]"));

    for (const el of nodes) {
      if (!el.dataset.i18nEn) {
        el.dataset.i18nEn = (el.textContent || "").trim();
      }

      if (el.hasAttribute("aria-label") && !el.dataset.i18nAriaEn) {
        el.dataset.i18nAriaEn = (el.getAttribute("aria-label") || "").trim();
      }
      if (el.hasAttribute("title") && !el.dataset.i18nTitleEn) {
        el.dataset.i18nTitleEn = (el.getAttribute("title") || "").trim();
      }
      if (el.hasAttribute("placeholder") && !el.dataset.i18nPlaceholderEn) {
        el.dataset.i18nPlaceholderEn = (el.getAttribute("placeholder") || "").trim();
      }
    }
  }

  /* ------------------------------------------------------------
     DOM readiness
  ------------------------------------------------------------ */
  function whenDomReady() {
    if (document.readyState !== "loading") return Promise.resolve();
    return new Promise((resolve) => {
      document.addEventListener("DOMContentLoaded", resolve, { once: true });
    });
  }

  function emitTranslationLifecycle(type, detail = {}) {
    document.dispatchEvent(new CustomEvent(`translation:${type}`, {
      detail: {
        lang: currentLang,
        ...detail
      }
    }));
  }

  /* ------------------------------------------------------------
     Google Translate fetch
  ------------------------------------------------------------ */
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

  async function translateMany(values, lang, chunkSize = 8) {
    const tl = normalizeLang(lang);
    if (!tl || tl === "en") return values;

    const output = new Array(values.length);
    const pending = [];
    const seen = new Map();

    values.forEach((value, index) => {
      const text = String(value || "").trim();
      if (!text) {
        output[index] = text;
        return;
      }

      const key = `${tl}::${text}`;
      if (cache.has(key)) {
        output[index] = cache.get(key);
        return;
      }

      if (!seen.has(text)) {
        seen.set(text, []);
        pending.push(text);
      }
      seen.get(text).push(index);
    });

    for (let i = 0; i < pending.length; i += chunkSize) {
      const chunk = pending.slice(i, i + chunkSize);
      const translatedChunk = await Promise.all(chunk.map((text) => translate(text, tl)));

      translatedChunk.forEach((translated, offset) => {
        const source = chunk[offset];
        const resolved = translated || source;
        cache.set(`${tl}::${source}`, resolved);

        const targetIndexes = seen.get(source) || [];
        targetIndexes.forEach((targetIndex) => {
          output[targetIndex] = resolved;
        });
      });
    }

    return output.map((value, index) => value ?? String(values[index] || "").trim());
  }

  /* ------------------------------------------------------------
     RTL text-only styling
  ------------------------------------------------------------ */
  const applyTextRTL = (el, isRtl) => {
    if (!el) return;

    if (isRtl) {
      el.style.letterSpacing = 'normal';
      el.style.direction = 'rtl';
      el.style.unicodeBidi = 'isolate';
      el.style.textAlign = '';
    } else {
      el.style.letterSpacing = '';
      el.style.direction = '';
      el.style.unicodeBidi = '';
      el.style.textAlign = '';
    }
  };

  /* ------------------------------------------------------------
     Apply language to DOM
  ------------------------------------------------------------ */
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

        const nodes = [];
        if (scope instanceof Element && scope.matches("[data-i18n-key]")) {
          nodes.push(scope);
        }
        nodes.push(...scope.querySelectorAll("[data-i18n-key]"));

        const textSources = nodes.map((el) => (el.dataset.i18nEn || el.textContent || "").trim());
        const ariaSources = nodes.map((el) => (el.dataset.i18nAriaEn || "").trim());
        const titleSources = nodes.map((el) => (el.dataset.i18nTitleEn || "").trim());
        const placeholderSources = nodes.map((el) => (el.dataset.i18nPlaceholderEn || "").trim());

        const translatedTexts = lang === "en" ? textSources : await translateMany(textSources, lang);
        const translatedAria = lang === "en" ? ariaSources : await translateMany(ariaSources, lang);
        const translatedTitles = lang === "en" ? titleSources : await translateMany(titleSources, lang);
        const translatedPlaceholders = lang === "en" ? placeholderSources : await translateMany(placeholderSources, lang);

        nodes.forEach((el, index) => {
          const textValue = translatedTexts[index];
          if (textValue) {
            el.textContent = textValue;
          }

          if (ariaSources[index]) {
            el.setAttribute("aria-label", translatedAria[index] || ariaSources[index]);
          }

          if (titleSources[index]) {
            el.setAttribute("title", translatedTitles[index] || titleSources[index]);
          }

          if (placeholderSources[index]) {
            el.setAttribute("placeholder", translatedPlaceholders[index] || placeholderSources[index]);
          }

          applyTextRTL(el, isRtl);
        });

        const previewNodes = Array.from(scope.querySelectorAll('[data-preview-title-i18n], [data-preview-sub-i18n]'));
        const previewTitleSources = previewNodes.map((el) => ((el.getAttribute('data-preview-title') || '')).trim());
        const previewSubSources = previewNodes.map((el) => ((el.getAttribute('data-preview-sub') || '')).trim());

        const translatedPreviewTitles = lang === 'en' ? previewTitleSources : await translateMany(previewTitleSources, lang);
        const translatedPreviewSubs = lang === 'en' ? previewSubSources : await translateMany(previewSubSources, lang);

        previewNodes.forEach((el, index) => {
          const titleKey = (el.getAttribute('data-preview-title-i18n') || '').trim();
          const subKey = (el.getAttribute('data-preview-sub-i18n') || '').trim();

          if (titleKey && translatedPreviewTitles[index]) {
            keyCache.set(titleKey, translatedPreviewTitles[index]);
          }

          if (subKey && translatedPreviewSubs[index]) {
            keyCache.set(subKey, translatedPreviewSubs[index]);
          }
        });

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

  async function refreshCurrentLanguage(root = document) {
    await applyLanguage(currentLang, root);
  }

  /* ------------------------------------------------------------
     Public helper
  ------------------------------------------------------------ */
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

  const api = { applyLanguage, refreshCurrentLanguage, t };
  window.ARTAN_TRANSLATION = api;
  window.NEUROARTAN_TRANSLATION = api;

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