/* =============================================================================
   00) FILE INDEX
   01) MODULE IDENTITY
   02) PATH HELPERS
   03) FETCH HELPERS
   04) STRING HELPERS
   05) URL HELPERS
   06) RENDER HELPERS
   07) END OF FILE
============================================================================= */

/* =============================================================================
   01) MODULE IDENTITY
============================================================================= */
/* /website/docs/assets/js/layers/website/sections/catalog-runtime.js */

/* =============================================================================
   02) PATH HELPERS
============================================================================= */
export function normalizeString(value) {
  return String(value || '').trim();
}

export function assetPath(path) {
  if (window.NeuroartanFragmentAuthorities?.assetPath) {
    return window.NeuroartanFragmentAuthorities.assetPath(path);
  }

  const pathname = window.location.pathname || '';
  let base = '';

  if (pathname.includes('/website/docs/')) {
    base = '/website/docs';
  } else if (pathname.endsWith('/website/docs')) {
    base = '/website/docs';
  } else if (pathname.includes('/docs/')) {
    base = '/docs';
  } else if (pathname.endsWith('/docs')) {
    base = '/docs';
  }

  const normalized = normalizeString(path);
  if (!normalized) return '';

  return `${base}${normalized.startsWith('/') ? normalized : `/${normalized}`}`;
}

/* =============================================================================
   03) FETCH HELPERS
============================================================================= */
export async function fetchJson(path) {
  const response = await fetch(assetPath(path), { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Failed to load ${path}: HTTP ${response.status}`);
  }

  return response.json();
}

/* =============================================================================
   04) STRING HELPERS
============================================================================= */
export function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function uniqueStrings(values = []) {
  return Array.from(new Set(
    values
      .map((value) => normalizeString(value))
      .filter(Boolean)
  ));
}

/* =============================================================================
   05) URL HELPERS
============================================================================= */
export function readQueryParam(name) {
  return normalizeString(new URLSearchParams(window.location.search).get(name) || '');
}

export function setQueryParam(name, value) {
  const url = new URL(window.location.href);
  const normalized = normalizeString(value);

  if (normalized) {
    url.searchParams.set(name, normalized);
  } else {
    url.searchParams.delete(name);
  }

  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
}

/* =============================================================================
   06) RENDER HELPERS
============================================================================= */
export function renderChipMarkup(values = [], className = 'catalog-chip') {
  return uniqueStrings(values)
    .map((value) => `<span class="${className}">${escapeHtml(value)}</span>`)
    .join('');
}

export function renderMetricMarkup(values = [], className = 'catalog-meta-item') {
  return uniqueStrings(values)
    .map((value) => `<span class="${className}">${escapeHtml(value)}</span>`)
    .join('');
}

/* =============================================================================
   07) END OF FILE
============================================================================= */
