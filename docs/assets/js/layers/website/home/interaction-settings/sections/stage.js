/* =========================================================
   00. FILE INDEX
   01. STAGE SETTINGS CONSTANTS
   02. STAGE SETTINGS STATE
   03. STAGE SETTINGS DOM HELPERS
   04. STAGE SETTINGS MODE RESOLUTION
   05. STAGE SETTINGS APPLICATION
   06. STAGE SETTINGS EVENTS
   07. STAGE SETTINGS INITIALIZATION
   08. STAGE SETTINGS FRAGMENT OBSERVER
   ========================================================= */

/* =========================================================
   01. STAGE SETTINGS CONSTANTS
   ========================================================= */
const STAGE_SETTINGS_STORAGE_KEY = 'neuroartan.home.interactionSettings.stage';

const STAGE_SETTINGS_DEFAULTS = Object.freeze({
  stageMode: 'standard',
  stageCircle: 'enabled',
  stageFooter: 'enabled',
  stageAmbientLayer: 'enabled',
  stageMotion: 'reduced',
  stageIdleAnimation: 'enabled',
  stageVisualFeedback: 'enabled',
  stageDensity: 'comfortable',
  stageContrast: 'standard',
  stageBackgroundDepth: 'cinematic',
});

const STAGE_SETTING_KEYS = Object.freeze({
  'stage-mode': 'stageMode',
  'stage-circle': 'stageCircle',
  'stage-footer': 'stageFooter',
  'stage-ambient-layer': 'stageAmbientLayer',
  'stage-motion': 'stageMotion',
  'stage-idle-animation': 'stageIdleAnimation',
  'stage-visual-feedback': 'stageVisualFeedback',
  'stage-density': 'stageDensity',
  'stage-contrast': 'stageContrast',
  'stage-background-depth': 'stageBackgroundDepth',
});

const STAGE_SETTING_LABELS = Object.freeze({
  standard: 'Standard',
  'developer-focus': 'Developer Focus',
  minimal: 'Minimal',
  presentation: 'Presentation',
  full: 'Full',
  reduced: 'Reduced',
  comfortable: 'Comfortable',
  compact: 'Compact',
  soft: 'Soft',
  high: 'High',
  cinematic: 'Cinematic',
  clean: 'Clean',
  flat: 'Flat',
  enabled: 'On',
  disabled: 'Off',
});

/* =========================================================
   02. STAGE SETTINGS STATE
   ========================================================= */
function readStoredStageSettings(){
  try{
    const stored = window.localStorage.getItem(STAGE_SETTINGS_STORAGE_KEY);
    if (!stored) return { ...STAGE_SETTINGS_DEFAULTS };
    const parsed = JSON.parse(stored);
    return { ...STAGE_SETTINGS_DEFAULTS, ...parsed };
  }catch(error){
    return { ...STAGE_SETTINGS_DEFAULTS };
  }
}

function writeStoredStageSettings(nextState){
  try{
    window.localStorage.setItem(STAGE_SETTINGS_STORAGE_KEY, JSON.stringify(nextState));
  }catch(error){
    /* Storage failure must not break the homepage runtime. */
  }
}

const STAGE_SETTINGS_STATE = readStoredStageSettings();
let STAGE_SETTINGS_DEVELOPER_MODE_ACTIVE = document.documentElement?.dataset?.homeDeveloperMode === 'active';

/* =========================================================
   03. STAGE SETTINGS DOM HELPERS
   ========================================================= */
function getStageSection(){
  return document.querySelector('[data-home-interaction-settings-section="stage"]');
}

function getStageControls(section){
  return Array.from(section?.querySelectorAll('[data-home-interaction-setting]') || []);
}

function getStageControlKey(control){
  return STAGE_SETTING_KEYS[control?.dataset?.homeInteractionSetting] || null;
}

function getStageControlValue(control){
  return control?.dataset?.homeInteractionSettingValue || '';
}

function getStageTargets(){
  return {
    stageRoot: document.querySelector('#stage-center-core'),
    stageShell: document.querySelector('#stage-cognitive-core-shell'),
    footerMount: document.querySelector('#home-footer-mount'),
    footer: document.querySelector('#home-footer, .home-shell__footer'),
    footerSeparator: document.querySelector('.home-shell__footer-separator'),
    ambientLayer: document.querySelector('[data-home-stage-core-effect="mount"]'),
    stageText: document.querySelector('#home-stage-interactive-text'),
  };
}

function normalizeToggleValue(currentValue){
  return currentValue === 'enabled' ? 'disabled' : 'enabled';
}

function formatStageSettingValue(value){
  return STAGE_SETTING_LABELS[value] || String(value || '').replaceAll('-', ' ');
}

/* =========================================================
   04. STAGE SETTINGS MODE RESOLUTION
   ========================================================= */
function resolveEffectiveStageSettings(){
  if (!STAGE_SETTINGS_DEVELOPER_MODE_ACTIVE){
    return { ...STAGE_SETTINGS_STATE };
  }

  return {
    ...STAGE_SETTINGS_STATE,
    stageCircle: 'disabled',
    stageFooter: 'disabled',
    stageIdleAnimation: 'disabled',
    stageVisualFeedback: 'disabled',
  };
}

/* =========================================================
   05. STAGE SETTINGS APPLICATION
   ========================================================= */
function setBodyStageAttributes(state){
  if (!document.body) return;

  document.body.dataset.homeStageMode = state.stageMode;
  document.body.dataset.homeStageCircle = state.stageCircle;
  document.body.dataset.homeStageFooter = state.stageFooter;
  document.body.dataset.homeStageAmbientLayer = state.stageAmbientLayer;
  document.body.dataset.homeStageMotion = state.stageMotion;
  document.body.dataset.homeStageIdleAnimation = state.stageIdleAnimation;
  document.body.dataset.homeStageVisualFeedback = state.stageVisualFeedback;
  document.body.dataset.homeStageDensity = state.stageDensity;
  document.body.dataset.homeStageContrast = state.stageContrast;
  document.body.dataset.homeStageBackgroundDepth = state.stageBackgroundDepth;
}

function applyStageVisibility(state){
  const targets = getStageTargets();
  const isCircleEnabled = state.stageCircle === 'enabled';
  const isFooterEnabled = state.stageFooter === 'enabled';
  const isAmbientEnabled = state.stageAmbientLayer === 'enabled';
  const isFeedbackEnabled = state.stageVisualFeedback === 'enabled';
  const isStageTextEnabled = state.stageVisualFeedback === 'enabled';

  [targets.stageRoot, targets.stageShell].forEach((node) => {
    if (!node) return;
    node.hidden = !isCircleEnabled;
    node.setAttribute('aria-hidden', String(!isCircleEnabled));
  });

  [targets.footerMount, targets.footer, targets.footerSeparator].forEach((node) => {
    if (!node) return;
    node.hidden = !isFooterEnabled;
    node.setAttribute('aria-hidden', String(!isFooterEnabled));
  });

  if (targets.ambientLayer){
    targets.ambientLayer.hidden = !isAmbientEnabled;
    targets.ambientLayer.setAttribute('aria-hidden', String(!isAmbientEnabled));
  }

  if (targets.stageText){
    targets.stageText.dataset.stageVisualFeedback = isFeedbackEnabled ? 'enabled' : 'disabled';
    targets.stageText.hidden = !isStageTextEnabled;
    targets.stageText.setAttribute('aria-hidden', String(!isStageTextEnabled));
  }
}

function applyStageControls(section, state){
  getStageControls(section).forEach((control) => {
    const key = getStageControlKey(control);
    const value = getStageControlValue(control);
    if (!key || !value) return;

    const isPressed = state[key] === value;
    const radioRow = control.closest('[data-ui-radio-list-item]');
    const toggleRow = control.closest('.home-interaction-settings-panel__toggle-row');

    control.setAttribute('aria-pressed', String(isPressed));

    if (radioRow){
      control.setAttribute('aria-checked', String(isPressed));
      control.tabIndex = isPressed ? 0 : -1;
      radioRow.setAttribute('aria-checked', String(isPressed));
      radioRow.setAttribute('aria-pressed', String(isPressed));
    }

    if (toggleRow){
      toggleRow.setAttribute('aria-pressed', String(isPressed));
    }

    const rowValue = control.querySelector('.home-interaction-settings-panel__row-value');
    if (rowValue && isPressed){
      rowValue.textContent = formatStageSettingValue(value);
    }
  });

  section.querySelectorAll('.home-interaction-settings-panel__row[data-home-interaction-setting]').forEach((row) => {
    const key = getStageControlKey(row);
    const rowValue = row.querySelector('.home-interaction-settings-panel__row-value');
    if (!key || !rowValue) return;
    rowValue.textContent = formatStageSettingValue(state[key]);
  });
}

function applyStageSettings(){
  const section = getStageSection();
  const effectiveState = resolveEffectiveStageSettings();

  setBodyStageAttributes(effectiveState);
  applyStageVisibility(effectiveState);
  if (section) applyStageControls(section, effectiveState);

  document.dispatchEvent(new CustomEvent('neuroartan:home-stage-settings-changed', {
    detail: { ...effectiveState },
  }));
}

/* =========================================================
   06. STAGE SETTINGS EVENTS
   ========================================================= */

function setStageDeveloperModeActive(isActive){
  STAGE_SETTINGS_DEVELOPER_MODE_ACTIVE = Boolean(isActive);
  applyStageSettings();
}

function getStageInteractiveControl(control){
  return control || null;
}

function updateStageSetting(control){
  const key = getStageControlKey(control);
  if (!key) return;

  const declaredValue = getStageControlValue(control);
  const isToggle = control.hasAttribute('data-home-interaction-toggle-control');

  STAGE_SETTINGS_STATE[key] = isToggle
    ? normalizeToggleValue(STAGE_SETTINGS_STATE[key])
    : declaredValue;

  writeStoredStageSettings(STAGE_SETTINGS_STATE);
  applyStageSettings();
}

function bindStageSettings(section){
  getStageControls(section).forEach((control) => {
    const interactiveControl = getStageInteractiveControl(control);
    if (!interactiveControl || interactiveControl.dataset.homeStageSettingsBound === 'true') return;

    interactiveControl.dataset.homeStageSettingsBound = 'true';
    interactiveControl.addEventListener('click', () => {
      window.requestAnimationFrame(() => updateStageSetting(control));
    });
  });
}
function bindStageDeveloperModeEvents(){
  if (document.documentElement?.dataset?.homeStageDeveloperModeBound === 'true') return;

  document.documentElement.dataset.homeStageDeveloperModeBound = 'true';

  document.addEventListener('home-developer-mode:activated', () => {
    setStageDeveloperModeActive(true);
  });

  document.addEventListener('home-developer-mode:deactivated', () => {
    setStageDeveloperModeActive(false);
  });
}

/* =========================================================
   07. STAGE SETTINGS INITIALIZATION
   ========================================================= */
function initializeStageSettings(){
  bindStageDeveloperModeEvents();
  const section = getStageSection();
  if (!section){
    setBodyStageAttributes(STAGE_SETTINGS_STATE);
    applyStageVisibility(STAGE_SETTINGS_STATE);
    return false;
  }

  bindStageSettings(section);
  applyStageSettings();
  return true;
}

/* =========================================================
   08. STAGE SETTINGS FRAGMENT OBSERVER
   ========================================================= */
function observeStageSettingsFragment(){
  if (initializeStageSettings()) return;

  let frame = null;
  const observer = new MutationObserver(() => {
    if (frame) return;

    frame = window.requestAnimationFrame(() => {
      frame = null;
      if (!initializeStageSettings()) return;
      observer.disconnect();
    });
  });

  observer.observe(document.body || document.documentElement, {
    childList: true,
    subtree: true,
  });
}

if (document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', observeStageSettingsFragment, { once: true });
}else{
  observeStageSettingsFragment();
}