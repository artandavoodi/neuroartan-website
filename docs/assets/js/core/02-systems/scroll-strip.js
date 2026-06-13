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

function hasHiddenScrollbar(target, style = getComputedStyle(target)) {
  return style.scrollbarWidth === 'none'
    || target.matches?.('[data-na-scroll-strip="off"], [data-na-scroll-strip="hidden"], [data-scroll-strip-hidden], [data-scrollbar-hidden], [data-native-scroll-hidden]');
}

function canOwnStrip(target) {
  if (!isElement(target)) return false;
  if ((target === document.documentElement || target === document.body) && target !== getScrollElement()) return false;
  if (target.closest?.(SELECTOR_SKIP)) return false;
  if (target.classList.contains('na-scroll-strip') || target.classList.contains('na-scroll-strip__thumb')) return false;

  const style = getComputedStyle(target);
  if (hasHiddenScrollbar(target, style)) return false;

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
  if (canOwnStrip(scrollElement)) targets.add(scrollElement);

  document.querySelectorAll('*').forEach((node) => {
    if (canOwnStrip(node)) targets.add(node);
  });

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

function ensureTarget(target) {
  const viewport = isViewportTarget(target);
  const existing = STATE.targets.get(target);
  if (existing) return existing;

  const strip = createStrip(viewport);
  const host = viewport ? document.body : target;
  if (!viewport) {
    target.dataset.naScrollStrip = 'true';
    if (getComputedStyle(target).position === 'static') {
      target.classList.add('na-scroll-strip-host');
    }
  }
  host.appendChild(strip);

  const record = {
    target,
    strip,
    thumb: strip.querySelector('.na-scroll-strip__thumb'),
    hideTimer:0
  };
  STATE.targets.set(target, record);
  target.addEventListener('scroll', handleScroll, { passive:true });
  return record;
}

function removeTarget(target, record = STATE.targets.get(target)) {
  if (!record) return;
  target.removeEventListener('scroll', handleScroll);
  window.clearTimeout(record.hideTimer);
  record.strip.remove();
  if (!isViewportTarget(target)) {
    target.removeAttribute('data-na-scroll-strip');
    target.classList.remove('na-scroll-strip-host');
  }
  STATE.targets.delete(target);
}

function updateRecord(record) {
  const { target, strip, thumb } = record;
  if (!canOwnStrip(target)) {
    removeTarget(target, record);
    return;
  }

  const viewport = isViewportTarget(target);
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
    record.strip.dataset.scrollStripActive = 'false';
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

/* =============================================================================
   05) OBSERVERS
============================================================================= */
function bindObservers() {
  STATE.resizeObserver = new ResizeObserver(scheduleUpdate);
  STATE.resizeObserver.observe(document.documentElement);
  STATE.resizeObserver.observe(document.body);

  STATE.mutationObserver = new MutationObserver(scheduleUpdate);
  STATE.mutationObserver.observe(document.documentElement, {
    childList:true,
    subtree:true,
    attributes:true,
    attributeFilter:['class', 'style', 'hidden', 'data-na-scroll-strip', 'data-scroll-strip-hidden', 'data-scrollbar-hidden']
  });

  window.addEventListener('resize', scheduleUpdate, { passive:true });
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
  if (STATE.initialized || typeof window === 'undefined' || typeof ResizeObserver === 'undefined') return;
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
