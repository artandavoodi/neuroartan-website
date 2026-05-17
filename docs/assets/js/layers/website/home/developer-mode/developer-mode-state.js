/* =============================================================================
   00) FILE INDEX
   01) MODULE IDENTITY
   02) STATE
   03) PUBLIC API
   04) END OF FILE
============================================================================= */

/* =============================================================================
   01) MODULE IDENTITY
============================================================================= */
/* /website/docs/assets/js/layers/website/home/developer-mode/developer-mode-state.js */

/* =============================================================================
   02) STATE
============================================================================= */
const HOME_DEVELOPER_MODE_STATE = {
  registry:null,
  providers:[],
  projects:[],
  activePanel:'repositories',
  activeMode:'scan-repository',
  developerState:null,
  providerStatuses:[]
};

/* =============================================================================
   03) PUBLIC API
============================================================================= */
export function getHomeDeveloperModeState() {
  return HOME_DEVELOPER_MODE_STATE;
}

export function setHomeDeveloperModeState(patch = {}) {
  Object.assign(HOME_DEVELOPER_MODE_STATE, patch);
  return HOME_DEVELOPER_MODE_STATE;
}

export function getHomeDeveloperCommandMode(modeId = HOME_DEVELOPER_MODE_STATE.activeMode) {
  const modes = Array.isArray(HOME_DEVELOPER_MODE_STATE.registry?.commandModes)
    ? HOME_DEVELOPER_MODE_STATE.registry.commandModes
    : [];
  return modes.find((mode) => mode.id === modeId) || modes[0] || null;
}

export function getActiveHomeDeveloperRepository() {
  return HOME_DEVELOPER_MODE_STATE.developerState?.activeRepository || '';
}

export function getActiveHomeDeveloperProvider() {
  return HOME_DEVELOPER_MODE_STATE.developerState?.activeAgent?.providerId
    || HOME_DEVELOPER_MODE_STATE.developerState?.developerPreferences?.defaultProvider
    || '';
}

/* =============================================================================
   04) END OF FILE
============================================================================= */
