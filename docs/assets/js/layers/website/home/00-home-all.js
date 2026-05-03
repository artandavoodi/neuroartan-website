/* =========================================================
   00. FILE INDEX
   01. HOME LAYER AUTHORITY IMPORTS
   01A. ENTER GATE BOOTSTRAP
   01B. CORE FOUNDATION
   01C. SHELL ENTRY + GLOBAL HOME COORDINATION
   01D. BACKGROUND + SCROLL EFFECTS
   01E. PLATFORM MENU
   01F. STAGE INTERFACE + SERVICES
   01G. INTERACTION SETTINGS
   01H. DEVELOPER MODE
   01I. FEATURED FUNCTIONS
   02. END OF FILE
   ========================================================= */

/* =========================================================
   01. HOME LAYER AUTHORITY IMPORTS
   ========================================================= */

/* =========================================================
   01A. ENTER GATE BOOTSTRAP
   Must load before every home subsystem because multiple modules
   call window.__artanRunAfterEnter during ES module evaluation.
   ========================================================= */
import './shell/home-enter-gate-bootstrap.js';

/* =========================================================
   01B. CORE FOUNDATION
   ========================================================= */
import './core/00-core-all.js';

/* =========================================================
   01C. SHELL ENTRY + GLOBAL HOME COORDINATION
   ========================================================= */
import './shell/00-shell-all.js';

/* =========================================================
   01D. BACKGROUND + SCROLL EFFECTS
   ========================================================= */
import './background/00-background-all.js';

/* =========================================================
   01E. PLATFORM MENU
   ========================================================= */
import './platform-menu/00-platform-menu-all.js';

/* =========================================================
   01F. STAGE INTERFACE + SERVICES
   ========================================================= */
import './stage/00-stage-all.js';

/* =========================================================
   01G. INTERACTION SETTINGS
   ========================================================= */
import './interaction-settings/00-interaction-settings-all.js';

/* =========================================================
   01H. DEVELOPER MODE
   ========================================================= */
import './developer-mode/00-developer-mode-all.js';

/* =========================================================
   01I. FEATURED FUNCTIONS
   ========================================================= */

/* =========================================================
   02. END OF FILE
   ========================================================= */
