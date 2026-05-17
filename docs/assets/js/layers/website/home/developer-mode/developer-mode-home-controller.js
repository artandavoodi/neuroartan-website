/* =============================================================================
   00) FILE INDEX
   01) MODULE IDENTITY
   02) STORAGE
   03) STATE
   04) SETTING SYNC
   05) EVENT BINDINGS
   06) BOOT
   07) END OF FILE
============================================================================= */

/* =============================================================================
   01) MODULE IDENTITY
============================================================================= */
const HOME_DEVELOPER_MODE_CONTROLLER = {
  isBound: false,
  isActive: false,
};

const HOME_DEVELOPER_MODE_STORAGE_KEY = 'neuroartan.home.developerMode.active';

/* =============================================================================
   02) STORAGE
============================================================================= */
function readHomeDeveloperModeStoredState() {
  try {
    return window.localStorage?.getItem(HOME_DEVELOPER_MODE_STORAGE_KEY) === 'true';
  } catch (error) {
    return false;
  }
}

function writeHomeDeveloperModeStoredState(isActive) {
  try {
    window.localStorage?.setItem(HOME_DEVELOPER_MODE_STORAGE_KEY, String(Boolean(isActive)));
  } catch (error) {
    // Storage may be unavailable in restricted privacy modes.
  }
}

/* =============================================================================
   03) STATE
============================================================================= */
function setHomeDeveloperModeState(isActive, shouldPersist = true, source = 'unknown') {
  HOME_DEVELOPER_MODE_CONTROLLER.isActive = Boolean(isActive);
  document.documentElement.dataset.homeDeveloperMode = HOME_DEVELOPER_MODE_CONTROLLER.isActive ? 'active' : 'inactive';
  document.body?.classList.toggle('home-developer-mode-active', HOME_DEVELOPER_MODE_CONTROLLER.isActive);

  if (shouldPersist) {
    writeHomeDeveloperModeStoredState(HOME_DEVELOPER_MODE_CONTROLLER.isActive);
  }

  document.dispatchEvent(new CustomEvent(HOME_DEVELOPER_MODE_CONTROLLER.isActive ? 'home-developer-mode:activated' : 'home-developer-mode:deactivated', {
    bubbles: true,
    detail: {
      source,
      active: HOME_DEVELOPER_MODE_CONTROLLER.isActive,
    },
  }));
}

function isHomeDeveloperModeActive() {
  return HOME_DEVELOPER_MODE_CONTROLLER.isActive === true;
}

/* =============================================================================
   04) SETTING SYNC
============================================================================= */
function syncHomeDeveloperModeSettingControl() {
  const control = document.querySelector('[data-home-interaction-setting="developer-mode"]');
  const isActive = isHomeDeveloperModeActive();

  if (!(control instanceof HTMLElement)) return;

  const toggleRow = control.closest('.home-interaction-settings-panel__toggle-row') || control;
  const toggleButton = toggleRow.querySelector?.('[data-home-interaction-toggle-control]') || control.querySelector?.('[data-home-interaction-toggle-control]');

  toggleRow.dataset.homeInteractionSettingValue = isActive ? 'enabled' : 'disabled';
  toggleRow.setAttribute('aria-pressed', String(isActive));

  if (toggleButton instanceof HTMLElement) {
    toggleButton.dataset.homeInteractionSettingValue = isActive ? 'enabled' : 'disabled';
    toggleButton.setAttribute('aria-pressed', String(isActive));
  }
}

/* =============================================================================
   05) EVENT BINDINGS
============================================================================= */
function bindHomeDeveloperModeController() {
  if (HOME_DEVELOPER_MODE_CONTROLLER.isBound) return;

  HOME_DEVELOPER_MODE_CONTROLLER.isBound = true;

  document.addEventListener('home-interaction-setting:changed', (event) => {
    if (!(event instanceof CustomEvent)) return;
    if (event.detail?.setting !== 'developer-mode') return;

    setHomeDeveloperModeState(event.detail?.value === 'enabled', true, event.detail?.source || 'home-interaction-setting');
    syncHomeDeveloperModeSettingControl();
  });

  document.addEventListener('home-developer-mode:set-active', (event) => {
    if (!(event instanceof CustomEvent)) return;

    setHomeDeveloperModeState(Boolean(event.detail?.active), true, event.detail?.source || 'home-developer-mode-set-active');
    syncHomeDeveloperModeSettingControl();
  });

  document.addEventListener('fragment:mounted', () => {
    syncHomeDeveloperModeSettingControl();
  });
}

/* =============================================================================
   06) BOOT
============================================================================= */
function bootHomeDeveloperModeController() {
  bindHomeDeveloperModeController();
  setHomeDeveloperModeState(readHomeDeveloperModeStoredState(), false, 'home-developer-mode-boot');
  syncHomeDeveloperModeSettingControl();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootHomeDeveloperModeController, { once: true });
} else {
  bootHomeDeveloperModeController();
}

/* =============================================================================
   07) END OF FILE
============================================================================= */