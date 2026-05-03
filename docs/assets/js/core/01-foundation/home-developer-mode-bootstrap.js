/* =============================================================================
   NEUROARTAN · HOME DEVELOPER MODE BOOTSTRAP
   -----------------------------------------------------------------------------
   Purpose: Apply persisted Developer Mode root state before homepage visual
   systems initialize, preventing first-paint footer/stage/circle flash.
============================================================================= */

/* =============================================================================
   01) CONSTANTS
============================================================================= */
const HOME_DEVELOPER_MODE_STORAGE_KEY = 'neuroartan.home.developerMode.active';
const HOME_DEVELOPER_MODE_ACTIVE_VALUE = 'true';
const HOME_DEVELOPER_MODE_ROOT_VALUE = 'active';
const HOME_DEVELOPER_MODE_ACTIVE_CLASS = 'home-developer-mode-active';

/* =============================================================================
   02) STATE RESOLUTION
============================================================================= */
function readPersistedHomeDeveloperModeState() {
  try {
    return window.localStorage?.getItem(HOME_DEVELOPER_MODE_STORAGE_KEY) === HOME_DEVELOPER_MODE_ACTIVE_VALUE;
  } catch {
    return false;
  }
}

/* =============================================================================
   03) ROOT BOOTSTRAP
============================================================================= */
function applyHomeDeveloperModeBootstrapState() {
  if (!readPersistedHomeDeveloperModeState()) {
    return;
  }

  document.documentElement.dataset.homeDeveloperMode = HOME_DEVELOPER_MODE_ROOT_VALUE;

  if (document.body) {
    document.body.classList.add(HOME_DEVELOPER_MODE_ACTIVE_CLASS);
    return;
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.body?.classList.add(HOME_DEVELOPER_MODE_ACTIVE_CLASS);
  }, { once:true });
}

/* =============================================================================
   04) INITIALIZATION
============================================================================= */
applyHomeDeveloperModeBootstrapState();