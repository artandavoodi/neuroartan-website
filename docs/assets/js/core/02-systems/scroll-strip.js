/* =============================================================================
   00) FILE INDEX
   01) MODULE IDENTITY
   02) MODULE STATE
   03) SCROLL TARGET HELPERS
   04) STRIP RENDERING
   05) OBSERVERS
   06) INITIALIZATION
   07) END OF FILE
============================================================================= */

/* =============================================================================
   01) MODULE IDENTITY
============================================================================= */
const MODULE_ID = 'na-scroll-strip';

/* =============================================================================
   02) MODULE STATE
============================================================================= */
const STATE = (window.__NEUROARTAN_SCROLL_STRIP__ ||= {
  initialized:false,
  targets:new Map(),
  raf:0,
  mutationObserver:null,
  resizeObserver:null
});

const SELECTOR_SKIP = [
  'input',
  'select',
  'textarea',
  '[contenteditable="true"]',
  '#home-platform-shell',
  '[data-home-platform-shell]',
  '[data-na-scroll-strip="off"]',
  '[data-na-scroll-strip="hidden"]',
  '[data-scroll-strip-hidden]',
  '[data-scrollbar-hidden]',
  '[data-native-scroll-hidden]'
].join(',');

/* =============================================================================
   03) SCROLL TARGET HELPERS
============================================================================= */
function isElement(value) {
  return value instanceof HTMLElement;
}

function getScrollElement() {
  return document.scrollingElement || document.documentElement;
}

function isViewportTarget(target) {
  return target === getScrollElement() || target === document.documentElement || target === document.body;
}

function hasHiddenScrollbar(target) {
  return target.matches?.('[data-na-scroll-strip="off"], [data-na-scroll-strip="hidden"], [data-scroll-strip-hidden], [data-scrollbar-hidden], [data-native-scroll-hidden]');
}

function canOwnStrip(target) {
  if (!isElement(target)) return false;
  if ((target === document.documentElement || target === document.body) && target !== getScrollElement()) return false;
  if (target.closest?.(SELECTOR_SKIP)) return false;
  if (target.classList.contains('na-scroll-strip') || target.classList.contains('na-scroll-strip__thumb')) return false;

  const style = getComputedStyle(target);
  if (hasHiddenScrollbar(target)) return false;
  if (target.hidden || style.display === 'none' || style.visibility === 'hidden') return false;

  const overflowY = style.overflowY;
  const scrollableOverflow = overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay';
  if (!isViewportTarget(target) && !scrollableOverflow) return false;

  const scrollHeight = isViewportTarget(target)
    ? Math.max(document.documentElement.scrollHeight, document.body.scrollHeight)
    : target.scrollHeight;
  const clientHeight = isViewportTarget(target)
    ? window.innerHeight
    : target.clientHeight;

  return scrollHeight - clientHeight > 2;
}

function collectTargets() {
  const targets = new Set();
  const scrollElement = getScrollElement();

  document.querySelectorAll('*').forEach((node) => {
    if (!isViewportTarget(node) && canOwnStrip(node)) targets.add(node);
  });

  if (!targets.size && canOwnStrip(scrollElement)) targets.add(scrollElement);

  return targets;
}

/* =============================================================================
   04) STRIP RENDERING
============================================================================= */
function createStrip(viewport = false) {
  const strip = document.createElement('span');
  strip.className = `na-scroll-strip${viewport ? ' na-scroll-strip--viewport' : ''}`;
  strip.setAttribute('aria-hidden', 'true');
  strip.dataset.scrollStripVisible = 'false';
  strip.innerHTML = '<span class="na-scroll-strip__track"></span><span class="na-scroll-strip__thumb"></span>';
  return strip;
}

function resolveCssMetric(name, reference = 0, fallback = 0) {
  const rootStyle = getComputedStyle(document.documentElement);
  const value = rootStyle.getPropertyValue(name).trim();
  const numeric = Number.parseFloat(value);
  if (!Number.isFinite(numeric)) return fallback;
  if (value.endsWith('%')) return (reference * numeric) / 100;
  if (value.endsWith('rem')) return numeric * Number.parseFloat(rootStyle.fontSize || '16');
  if (value.endsWith('em')) return numeric * Number.parseFloat(getComputedStyle(document.body).fontSize || '16');
  return numeric;
}

function positionStrip(record) {
  const { target, strip, viewport } = record;
  if (viewport) {
    strip.style.removeProperty('top');
    strip.style.removeProperty('right');
    strip.style.removeProperty('bottom');
    strip.style.removeProperty('left');
    strip.style.removeProperty('height');
    return true;
  }

  const rect = target.getBoundingClientRect();
  const visibleTop = Math.max(0, rect.top);
  const visibleBottom = Math.min(window.innerHeight, rect.bottom);
  const visibleHeight = Math.max(0, visibleBottom - visibleTop);
  if (visibleHeight < 12 || rect.right <= 0 || rect.left >= window.innerWidth) {
    strip.dataset.scrollStripVisible = 'false';
    return false;
  }

  const insetBlock = Math.min(resolveCssMetric('--scroll-strip-inset-block', visibleHeight, 0), visibleHeight / 3);
  const hitSize = Math.max(1, resolveCssMetric('--scroll-strip-hit-size', rect.width, 8));
  strip.style.top = `${visibleTop + insetBlock}px`;
  strip.style.right = 'auto';
  strip.style.bottom = 'auto';
  strip.style.left = `${Math.min(window.innerWidth - hitSize, Math.max(0, rect.right - hitSize))}px`;
  strip.style.height = `${Math.max(0, visibleHeight - (insetBlock * 2))}px`;
  return true;
}

function ensureTarget(target) {
  const viewport = isViewportTarget(target);
  const existing = STATE.targets.get(target);
  if (existing) return existing;

  const strip = createStrip(viewport);
  if (!viewport) {
    target.dataset.naScrollStrip = 'true';
  }
  document.body.appendChild(strip);

  const record = {
    target,
    viewport,
    strip,
    thumb: strip.querySelector('.na-scroll-strip__thumb'),
    hideTimer:0,
    hover:false
  };
  STATE.targets.set(target, record);
  target.addEventListener('scroll', handleScroll, { passive:true });
  target.addEventListener('wheel', handleScrollIntent, { passive:true });
  target.addEventListener('touchmove', handleScrollIntent, { passive:true });
  target.addEventListener('pointerenter', handlePointerEnter, { passive:true });
  target.addEventListener('pointerleave', handlePointerLeave, { passive:true });
  target.addEventListener('focusin', handlePointerEnter);
  target.addEventListener('focusout', handlePointerLeave);
  return record;
}

function removeTarget(target, record = STATE.targets.get(target)) {
  if (!record) return;
  target.removeEventListener('scroll', handleScroll);
  target.removeEventListener('wheel', handleScrollIntent);
  target.removeEventListener('touchmove', handleScrollIntent);
  target.removeEventListener('pointerenter', handlePointerEnter);
  target.removeEventListener('pointerleave', handlePointerLeave);
  target.removeEventListener('focusin', handlePointerEnter);
  target.removeEventListener('focusout', handlePointerLeave);
  window.clearTimeout(record.hideTimer);
  record.strip.remove();
  if (!isViewportTarget(target)) {
    target.removeAttribute('data-na-scroll-strip');
  }
  STATE.targets.delete(target);
}

function updateRecord(record) {
  const { target, strip, thumb } = record;
  if (!canOwnStrip(target)) {
    removeTarget(target, record);
    return;
  }

  if (!positionStrip(record)) return;

  const viewport = record.viewport;
  const clientHeight = viewport ? window.innerHeight : target.clientHeight;
  const scrollHeight = viewport
    ? Math.max(document.documentElement.scrollHeight, document.body.scrollHeight)
    : target.scrollHeight;
  const scrollTop = viewport ? window.scrollY || document.documentElement.scrollTop || 0 : target.scrollTop;
  const trackHeight = strip.clientHeight;

  if (!thumb || !trackHeight || scrollHeight <= clientHeight) {
    strip.dataset.scrollStripVisible = 'false';
    return;
  }

  const rootStyle = getComputedStyle(document.documentElement);
  const minThumb = Number.parseFloat(rootStyle.getPropertyValue('--scroll-strip-thumb-min')) || 28;
  const maxThumb = Number.parseFloat(rootStyle.getPropertyValue('--scroll-strip-thumb-max')) || 140;
  const rawHeight = Math.max(minThumb, trackHeight * (clientHeight / scrollHeight));
  const thumbHeight = Math.min(maxThumb, Math.min(trackHeight, rawHeight));
  const maxScroll = Math.max(1, scrollHeight - clientHeight);
  const maxTravel = Math.max(0, trackHeight - thumbHeight);
  const nextTop = Math.max(0, Math.min(maxTravel, (scrollTop / maxScroll) * maxTravel));

  strip.dataset.scrollStripVisible = 'true';
  thumb.style.height = `${thumbHeight}px`;
  thumb.style.transform = `translate3d(-50%, ${nextTop}px, 0)`;
}

function updateAll() {
  STATE.raf = 0;
  const currentTargets = collectTargets();
  currentTargets.forEach((target) => ensureTarget(target));
  Array.from(STATE.targets.entries()).forEach(([target, record]) => {
    if (!currentTargets.has(target)) {
      removeTarget(target, record);
      return;
    }
    updateRecord(record);
  });
}

function scheduleUpdate() {
  if (STATE.raf) return;
  STATE.raf = window.requestAnimationFrame(updateAll);
}

function setActive(record) {
  if (!record?.strip) return;
  record.strip.dataset.scrollStripActive = 'true';
  window.clearTimeout(record.hideTimer);
  record.hideTimer = window.setTimeout(() => {
    if (!record.hover) record.strip.dataset.scrollStripActive = 'false';
  }, 1400);
}

function handleScroll(event) {
  const target = event?.currentTarget || getScrollElement();
  const record = STATE.targets.get(target);
  if (!record) {
    scheduleUpdate();
    return;
  }

  updateRecord(record);
  setActive(record);
}

function handleScrollIntent(event) {
  const target = event?.currentTarget || getScrollElement();
  const record = STATE.targets.get(target);
  if (!record) {
    scheduleUpdate();
    return;
  }

  updateRecord(record);
  setActive(record);
}

function handlePointerEnter(event) {
  const record = STATE.targets.get(event.currentTarget);
  if (!record) return;
  record.hover = true;
  updateRecord(record);
  setActive(record);
}

function handlePointerLeave(event) {
  const record = STATE.targets.get(event.currentTarget);
  if (!record) return;
  record.hover = false;
  window.clearTimeout(record.hideTimer);
  record.hideTimer = window.setTimeout(() => {
    record.strip.dataset.scrollStripActive = 'false';
  }, 280);
}

/* =============================================================================
   05) OBSERVERS
============================================================================= */
function bindObservers() {
  if (typeof ResizeObserver !== 'undefined') {
    STATE.resizeObserver = new ResizeObserver(scheduleUpdate);
    STATE.resizeObserver.observe(document.documentElement);
    STATE.resizeObserver.observe(document.body);
  }

  if (typeof MutationObserver !== 'undefined') {
    STATE.mutationObserver = new MutationObserver(scheduleUpdate);
    STATE.mutationObserver.observe(document.documentElement, {
      childList:true,
      subtree:true,
      attributes:true,
      attributeFilter:['class', 'style', 'hidden', 'data-na-scroll-strip', 'data-scroll-strip-hidden', 'data-scrollbar-hidden']
    });
  }

  window.addEventListener('resize', scheduleUpdate, { passive:true });
  window.addEventListener('scroll', scheduleUpdate, { passive:true });
  window.addEventListener('orientationchange', scheduleUpdate, { passive:true });
  window.addEventListener('load', scheduleUpdate, { once:true });
  document.addEventListener('fragment:mounted', scheduleUpdate);
  document.addEventListener('account:profile-state-changed', scheduleUpdate);
  document.addEventListener('profile:public-state-changed', scheduleUpdate);
}

/* =============================================================================
   06) INITIALIZATION
============================================================================= */
function initScrollStrip() {
  if (STATE.initialized || typeof window === 'undefined') return;
  STATE.initialized = true;
  bindObservers();
  scheduleUpdate();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initScrollStrip, { once:true });
} else {
  initScrollStrip();
}

window.NeuroartanScrollStrip = Object.freeze({
  MODULE_ID,
  refresh:scheduleUpdate
});

/* =============================================================================
   07) END OF FILE
============================================================================= */
