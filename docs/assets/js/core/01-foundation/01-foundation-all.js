/* =============================================================================
   00) FILE INDEX
   01) MODULE IDENTITY
   02) FOUNDATION AUTHORITIES
   03) FOUNDATION CONFIG BOOTSTRAP
   04) END OF FILE
============================================================================= */

/* =============================================================================
   01) MODULE IDENTITY
============================================================================= */
/* /website/docs/assets/js/core/01-foundation/01-foundation-all.js */

/* =============================================================================
   02) FOUNDATION AUTHORITIES
============================================================================= */
/*
 * Foundation-owned imports below remain canonical for shared path, fragment,
 * runtime-state, and baseline interaction authorities. New backend or config
 * ownership must not be hidden inside unrelated foundation modules.
 */
import './path-authorities.js';
import './fragment-authorities.js';
import './runtime-state.js';
import './toggle.js';
import './buttons.js';
import './selection.js';
import './radio-list.js';
import './forms.js';
import './menus.js';
import './navigation.js';
import './feedback.js';
import './data.js';
import './close-button.js';
import './back-button.js';
import './cursor.js';
import './drawers.js';
import './hover.js';
import './icon-stroke.js';
import './motion.js';
import './overlays.js';

/* =============================================================================
   03) FOUNDATION CONFIG BOOTSTRAP
============================================================================= */
/*
 * Foundation config bootstrap remains registered through the shared module
 * orchestrator. First-paint homepage state bootstraps must be loaded directly
 * in the document head before visual stylesheets.
 */
import './config-bootstrap.js';

/* =============================================================================
   04) END OF FILE
============================================================================= */
