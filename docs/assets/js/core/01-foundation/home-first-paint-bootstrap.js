/* =============================================================================
   NEUROARTAN · HOME FIRST-PAINT BOOTSTRAP
   -----------------------------------------------------------------------------
   Purpose: Apply homepage first-paint root state before visual stylesheets and
   runtime animation systems initialize.
============================================================================= */

/* =============================================================================
   01) CONSTANTS
============================================================================= */
const HOME_FIRST_PAINT_READY_VALUE = 'ready';
const HOME_FIRST_PAINT_CLASS = 'home-first-paint-ready';

/* =============================================================================
   02) ROOT BOOTSTRAP
============================================================================= */
function applyHomeFirstPaintBootstrapState() {
  document.documentElement.dataset.homeFirstPaint = HOME_FIRST_PAINT_READY_VALUE;

  if (document.body) {
    document.body.classList.add(HOME_FIRST_PAINT_CLASS);
    return;
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.body?.classList.add(HOME_FIRST_PAINT_CLASS);
  }, { once:true });
}

/* =============================================================================
   03) INITIALIZATION
============================================================================= */
applyHomeFirstPaintBootstrapState();