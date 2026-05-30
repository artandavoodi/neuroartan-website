# Neuroartan Localization Engine Doctrine

English is the canonical source language for every Neuroartan interface string.

All visible interface copy must be registered with a stable localization key and resolved from the governed local catalogs in `/docs/assets/data/system/localization/locales/`. Runtime translation must never call external machine translation services.

The browser consumes optimized JSON catalogs. Human editing, Control Center governance, and future table-style review can be built on top of the same catalog source without changing the runtime contract.

`data-i18n-*` attributes are the local binding contract. They do not represent Google Translate ownership; they identify the catalog key for text, placeholder, title, or aria-label resolution.

Missing translations fall back to English and are reported through the localization audit event so development can find incomplete catalog entries without breaking production.

Localization direction is language-owned. Left-to-right and right-to-left behavior must be resolved from the manifest, not from page-specific CSS or local assumptions.

To sync the English source catalog and audit missing translations, run:

```bash
node docs/assets/utilities/localization/sync-locales.mjs
```
