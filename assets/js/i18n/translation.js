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

    // Common UI / human labels that may come from toggles (keep SMALL, safe, explicit)
    const ALIASES = {
      // Codes
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
      // Additional country language codes
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

      // Human labels
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

    // Handle common BCP-47 shapes: xx, xx-YY, xx_Script, xx-YY-variant
    const primary = raw.split(/[-_]/)[0].toLowerCase();

    // Minimal rescue if a label leaked through lowercased
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
      // Additional country language lowercased human labels
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

    // Keep layout direction stable for now (prevents custom-cursor disappearing).
    // If you later want full RTL layout switching, change this line back to:
    // document.documentElement.dir = RTL_LANGS.includes(nl) ? "rtl" : "ltr";
    document.documentElement.dir = "ltr";

    // Text-direction mode (layout remains LTR; only translated text nodes become RTL).
    document.documentElement.classList.toggle('lang-rtl', RTL_LANGS.includes(nl));
    document.documentElement.setAttribute('data-lang', nl);

    // Notify other modules (cursor/menu) that a language apply finished.
    window.dispatchEvent(new CustomEvent("neuroartan:language-applied", { detail: { lang: nl, rtl: RTL_LANGS.includes(nl) } }));
  };

  /* ------------------------------------------------------------
     Baseline capture (English source)
     - translation.js loads BEFORE countrylanguage.js (defer order)
     - so we can lock the original English strings once
  ------------------------------------------------------------ */
  function ensureEnglishBaselineCaptured(root = document) {
    const scope = root instanceof Element || root instanceof Document ? root : document;
    const nodes = scope.querySelectorAll("[data-i18n-key]");
    for (const el of nodes) {
      // Lock once: what we saw at load is considered EN baseline.
      if (!el.dataset.i18nEn) {
        el.dataset.i18nEn = (el.textContent || "").trim();
      }

      // Optional: also capture common translatable attributes if present.
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
     - Prevents a no-op translate call if countrylanguage.js triggers
       before the DOM is fully parsed.
  ------------------------------------------------------------ */
  function whenDomReady() {
    if (document.readyState !== "loading") return Promise.resolve();
    return new Promise((resolve) => {
      document.addEventListener("DOMContentLoaded", resolve, { once: true });
    });
  }

  /* ------------------------------------------------------------
     Google Translate fetch
     - Use `sl=auto` so it still works even if the current DOM is not English.
     - Cache per (lang + source).
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

  /* ------------------------------------------------------------
     RTL text-only styling (no layout flipping)
     - Applies only to nodes with [data-i18n-key]
  ------------------------------------------------------------ */
  const applyTextRTL = (el, isRtl) => {
    if (!el) return;

    if (isRtl) {
      // Prevent Latin-style tracking from making Arabic/Persian look spaced out.
      el.style.letterSpacing = 'normal';

      // Make punctuation + runs behave correctly without flipping global layout.
      el.style.direction = 'rtl';
      el.style.unicodeBidi = 'isolate';

      // Text alignment for RTL scripts.
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
     - Restores EN baseline when lang === 'en'
     - Translates from EN baseline (preferred)
     - Falls back to current DOM if baseline missing
  ------------------------------------------------------------ */
  async function applyLanguage(lang, root = document) {
    // Ensure DOM exists before we query `[data-i18n-key]`.
    await whenDomReady();

    lang = normalizeLang(lang);
    const isRtl = RTL_LANGS.includes(lang);

    // Capture baseline once, before any transforms.
    const scope = root instanceof Element || root instanceof Document ? root : document;
    ensureEnglishBaselineCaptured(scope);

    // Always set direction/lang attributes.
    applyDir(lang);

    currentLang = lang;

    keyCache.clear();
    const nodes = scope.querySelectorAll("[data-i18n-key]");

    for (const el of nodes) {
      const enText = (el.dataset.i18nEn || "").trim();

      // TextContent
      if (lang === "en") {
        if (enText) el.textContent = enText;
      } else {
        const source = enText || (el.textContent || "").trim();
        el.textContent = await translate(source, lang);
      }

      // aria-label
      if (el.dataset.i18nAriaEn) {
        if (lang === "en") {
          el.setAttribute("aria-label", el.dataset.i18nAriaEn);
        } else {
          el.setAttribute("aria-label", await translate(el.dataset.i18nAriaEn, lang));
        }
      }

      // title
      if (el.dataset.i18nTitleEn) {
        if (lang === "en") {
          el.setAttribute("title", el.dataset.i18nTitleEn);
        } else {
          el.setAttribute("title", await translate(el.dataset.i18nTitleEn, lang));
        }
      }

      // placeholder
      if (el.dataset.i18nPlaceholderEn) {
        if (lang === "en") {
          el.setAttribute("placeholder", el.dataset.i18nPlaceholderEn);
        } else {
          el.setAttribute("placeholder", await translate(el.dataset.i18nPlaceholderEn, lang));
        }
      }

      applyTextRTL(el, isRtl);
    }

    // Additive: cache translations for menu preview keys (data-preview-*-i18n)
    const previewNodes = scope.querySelectorAll('[data-preview-title-i18n], [data-preview-sub-i18n]');
    for (const el of previewNodes) {
      const titleKey = (el.getAttribute('data-preview-title-i18n') || '').trim();
      const subKey = (el.getAttribute('data-preview-sub-i18n') || '').trim();

      if (titleKey) {
        const enTitle = ((el.getAttribute('data-preview-title') || '')).trim();
        const val = lang === 'en' ? enTitle : await translate(enTitle, lang);
        if (val) keyCache.set(titleKey, val);
      }

      if (subKey) {
        const enSub = ((el.getAttribute('data-preview-sub') || '')).trim();
        const val = lang === 'en' ? enSub : await translate(enSub, lang);
        if (val) keyCache.set(subKey, val);
      }
    }
  }

  async function refreshCurrentLanguage(root = document) {
    await applyLanguage(currentLang, root);
  }

  /* ------------------------------------------------------------
     Public helper (sync lookup)
     - Used by menu.js hover previews
     - Returns translated text if available, otherwise EN baseline
  ------------------------------------------------------------ */
  function t(key) {
    if (!key) return "";
    const k = String(key).trim();
    if (!k) return "";

    // Prefer cached strings (includes menu preview keys)
    if (keyCache.has(k)) return keyCache.get(k) || "";

    // Fallback: element text already translated by applyLanguage
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

  document.addEventListener("fragment:mounted", async (event) => {
    const root = event?.target instanceof Element ? event.target : document;
    await refreshCurrentLanguage(root);
  });

  return api;

})();