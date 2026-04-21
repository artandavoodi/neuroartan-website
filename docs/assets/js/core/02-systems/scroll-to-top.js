/* =============================================================================
   00) FILE INDEX
   01) MODULE CONSTANTS
   02) MODULE STATE
   03) HELPERS
   04) VISIBILITY LOGIC
   05) BUTTON BINDING
   06) BOOTSTRAP
   07) INITIALIZATION
============================================================================= */

/* =============================================================================
   01) MODULE CONSTANTS
============================================================================= */
const SCROLL_TO_TOP_SELECTOR = '[data-scroll-to-top]';
const VISIBLE_CLASS = 'is-visible';
const ROOT_ATTR = 'data-scroll-to-top-bound';
const SHOW_SCROLL_Y = 320;
const HIDE_NEAR_SELECTOR = '#institutional-links, .institutional-links, #footer, footer.site-footer, #footer-mount';

/* =============================================================================
   02) MODULE STATE
============================================================================= */
const SCROLL_TO_TOP_STATE = {
  isBound: false,
  ticking: false
};

/* =============================================================================
   03) HELPERS
============================================================================= */
function getButton() {
  return document.querySelector(SCROLL_TO_TOP_SELECTOR);
}

function getHideBoundary() {
  const candidates = Array.from(document.querySelectorAll(HIDE_NEAR_SELECTOR));
  return candidates.find((node) => node instanceof HTMLElement) || null;
}

function shouldShowButton(button, boundary) {
  if (!(button instanceof HTMLElement)) return false;
  if (window.scrollY < SHOW_SCROLL_Y) return false;

  if (!(boundary instanceof HTMLElement)) return true;

  const rect = boundary.getBoundingClientRect();
  return rect.top > window.innerHeight;
}

function setVisible(button, visible) {
  if (!(button instanceof HTMLElement)) return;
  button.classList.toggle(VISIBLE_CLASS, visible);
}

function updateVisibility() {
  const button = getButton();
  const boundary = getHideBoundary();
  setVisible(button, shouldShowButton(button, boundary));
  SCROLL_TO_TOP_STATE.ticking = false;
}

function requestVisibilityUpdate() {
  if (SCROLL_TO_TOP_STATE.ticking) return;
  SCROLL_TO_TOP_STATE.ticking = true;
  window.requestAnimationFrame(updateVisibility);
}

/* =============================================================================
   04) VISIBILITY LOGIC
============================================================================= */
function bindVisibility() {
  window.addEventListener('scroll', requestVisibilityUpdate, { passive: true });
  window.addEventListener('resize', requestVisibilityUpdate);
  window.addEventListener('hashchange', () => {
    window.requestAnimationFrame(requestVisibilityUpdate);
  });
  document.addEventListener('fragment:mounted', () => {
    window.requestAnimationFrame(requestVisibilityUpdate);
  });
  requestVisibilityUpdate();
}

/* =============================================================================
   05) BUTTON BINDING
============================================================================= */
function bindButton(button) {
  if (!(button instanceof HTMLElement)) return;
  if (button.getAttribute(ROOT_ATTR) === 'true') return;

  button.setAttribute(ROOT_ATTR, 'true');
  button.addEventListener('click', () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  });
}

/* =============================================================================
   06) BOOTSTRAP
============================================================================= */
function boot() {
  if (SCROLL_TO_TOP_STATE.isBound) return;

  const button = getButton();
  if (!(button instanceof HTMLElement)) return;

  SCROLL_TO_TOP_STATE.isBound = true;
  bindButton(button);
  bindVisibility();
}

/* =============================================================================
   07) INITIALIZATION
============================================================================= */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}

document.addEventListener('fragment:mounted', () => {
  window.requestAnimationFrame(boot);
});