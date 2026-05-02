/* =============================================================================
   FILE INDEX
   01) MODULE IDENTITY
   02) STATE
   03) HELPERS
   04) ICON MARKING & INLINING
   05) ICON SCAN
   06) INITIALIZATION
============================================================================= */

/* =============================================================================
   01) MODULE IDENTITY
============================================================================= */
const ICON_STROKE_STATE = {
  svgCache: new Map(),
};

/* =============================================================================
   02) STATE
============================================================================= */
const ICON_STROKE_SELECTOR = '[data-inline-stroke-icon] img[src$=".svg"], .inline-stroke-icon img[src$=".svg"]';
const ICON_STROKE_SHAPE_SELECTOR = 'g, path, line, polyline, polygon, circle, ellipse, rect';

/* =============================================================================
   03) HELPERS
============================================================================= */
function normalizeIconStrokeString(value) {
  return String(value ?? '').trim();
}

function removeInlineStrokeWidthStyle(node) {
  if (!(node instanceof SVGElement)) return;

  const styleValue = node.getAttribute('style') || '';
  if (!styleValue.trim()) return;

  const normalizedEntries = styleValue
    .split(';')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .filter((entry) => {
      const property = entry.split(':')[0]?.trim().toLowerCase();
      return property !== 'stroke-width';
    });

  if (normalizedEntries.length) {
    node.setAttribute('style', normalizedEntries.join(';'));
  } else {
    node.removeAttribute('style');
  }
}

async function fetchIconStrokeText(source) {
  const response = await fetch(source, { cache: 'force-cache' });
  if (!response.ok) {
    throw new Error(`Failed to load icon SVG: ${source}`);
  }
  return response.text();
}

function normalizeInlineStrokeSvg(svg) {
  if (!(svg instanceof SVGSVGElement)) return null;

  svg.classList.add('inline-stroke-icon__svg', 'ui-icon-theme-aware');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');

  svg.querySelectorAll(ICON_STROKE_SHAPE_SELECTOR).forEach((node) => {
    removeInlineStrokeWidthStyle(node);

    if (node.matches('path, line, polyline, polygon, circle, ellipse, rect')) {
      node.classList.add('inline-stroke-icon__shape');
    }
  });

  return svg;
}

/* =============================================================================
   04) ICON MARKING & INLINING
============================================================================= */
async function inlineStrokeIconImage(image) {
  if (!(image instanceof HTMLImageElement)) return;
  if (image.dataset.inlineStrokeIconReady === 'true') return;

  const source = normalizeIconStrokeString(image.getAttribute('src') || '');
  if (!source) return;

  image.dataset.inlineStrokeIconReady = 'true';

  if (!ICON_STROKE_STATE.svgCache.has(source)) {
    ICON_STROKE_STATE.svgCache.set(source, fetchIconStrokeText(source).catch(() => ''));
  }

  const svgText = await ICON_STROKE_STATE.svgCache.get(source);
  if (!svgText) return;

  const template = document.createElement('template');
  template.innerHTML = svgText.trim();
  const svg = normalizeInlineStrokeSvg(template.content.querySelector('svg'));
  if (!svg) return;

  image.replaceWith(svg);
}

/* =============================================================================
   05) ICON SCAN
============================================================================= */
export function scanInlineStrokeIcons(root = document) {
  if (!root) return;

  const iconImages = Array.from(root.querySelectorAll(ICON_STROKE_SELECTOR));
  iconImages.forEach((image) => {
    void inlineStrokeIconImage(image);
  });
}

/* =============================================================================
   06) INITIALIZATION
============================================================================= */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => scanInlineStrokeIcons(), { once: true });
} else {
  scanInlineStrokeIcons();
}

window.addEventListener('fragment:mounted', (event) => {
  scanInlineStrokeIcons(event.detail?.root || document);
});