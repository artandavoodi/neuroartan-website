/* =============================================================================
   00) FILE INDEX
   01) MODULE IMPORTS
   02) MODULE CONSTANTS
   03) THEME HELPERS
   04) THEME INTENT HELPERS
   05) MODE OPTION BINDING
   06) CURSOR CONTROL BINDING
   07) TOGGLE CONSUMER BINDING
   08) HOMEPAGE TOGGLE ATTRIBUTE BRIDGE
   09) PANEL STATE SYNC
   10) DESTINATION MOUNT
   11) END OF FILE
============================================================================= */

/* =============================================================================
   01) MODULE IMPORTS
============================================================================= */

/* =============================================================================
   02) MODULE CONSTANTS
============================================================================= */
const DESTINATION_SELECTOR = '[data-home-platform-destination-root]';
const MODE_OPTION_SELECTOR = '[data-home-platform-theme-mode-option]';
const CONTRAST_OPTION_SELECTOR = '[data-home-platform-theme-contrast-option]';
const PALETTE_OPTION_SELECTOR = '[data-home-platform-theme-palette-option]';
const TOKEN_INPUT_SELECTOR = '[data-theme-token]';
const CURSOR_MODE_OPTION_SELECTOR = '[data-home-platform-cursor-mode-option]';
const CURSOR_COLOR_INPUT_SELECTOR = '[data-home-platform-cursor-color]';
const COMPANY_RESET_SELECTOR = '[data-home-platform-theme-reset-company]';
const TOGGLE_SELECTOR = '[data-na-toggle][data-toggle-scope="homepage-theme"]';

const HOMEPAGE_THEME_TOGGLE_ATTRIBUTE_MAP = Object.freeze({
  'breathing-circle': 'homepageThemeBreathingCircle',
  'cinematic-background': 'homepageThemeCinematicBackground',
  'hero-shader': 'homepageThemeHeroShader',
  'matte-atmosphere': 'homepageThemeMatteAtmosphere'
});

const THEME_COMPANY = 'company';
const THEME_SYSTEM = 'system';
const THEME_CUSTOM = 'custom';
const THEME_DARK = 'dark';
const THEME_LIGHT = 'light';

const CONTRAST_LOW = 'low';
const CONTRAST_STANDARD = 'standard';
const CONTRAST_HIGH = 'high';

const VALID_THEMES = new Set([THEME_COMPANY, THEME_SYSTEM, THEME_CUSTOM, THEME_DARK, THEME_LIGHT]);
const VALID_CONTRASTS = new Set([CONTRAST_LOW, CONTRAST_STANDARD, CONTRAST_HIGH]);

/* =============================================================================
   03) THEME HELPERS
============================================================================= */
function normalizeTheme(theme) {
  const normalized = String(theme || '').trim().toLowerCase();

  if (normalized === 'color') return THEME_CUSTOM;
  if (normalized === 'factory') return THEME_COMPANY;
  if (normalized === 'default') return THEME_COMPANY;
  if (normalized === 'company-default') return THEME_COMPANY;
  if (VALID_THEMES.has(normalized)) return normalized;

  return THEME_SYSTEM;
}

function normalizeContrast(contrast) {
  const normalized = String(contrast || '').trim().toLowerCase();
  return VALID_CONTRASTS.has(normalized) ? normalized : CONTRAST_STANDARD;
}

function getCurrentThemeState() {
  const themeApi = window.NeuroartanTheme;

  if (themeApi && typeof themeApi.getCurrentThemeState === 'function') {
    return themeApi.getCurrentThemeState();
  }

  return {
    theme: THEME_COMPANY,
    effective: THEME_DARK,
    contrast: CONTRAST_STANDARD,
    palette: 'neuroartan',
    tokens: {}
  };
}

function getThemeDetail(theme = getCurrentThemeState()) {
  const state = typeof theme === 'string'
    ? { ...getCurrentThemeState(), theme: normalizeTheme(theme) }
    : { ...getCurrentThemeState(), ...theme };

  const normalizedTheme = normalizeTheme(state.theme);
  const themeApi = window.NeuroartanTheme;

  if (themeApi && typeof themeApi.getThemeStateDetail === 'function') {
    return themeApi.getThemeStateDetail({
      ...state,
      theme: normalizedTheme,
      contrast: normalizeContrast(state.contrast)
    });
  }

  return {
    theme: normalizedTheme,
    themeLabel: normalizedTheme === THEME_COMPANY
      ? 'Company Default'
      : normalizedTheme === THEME_SYSTEM
        ? 'System'
        : normalizedTheme === THEME_CUSTOM
          ? 'Custom'
          : normalizedTheme === THEME_DARK
            ? 'Dark'
            : 'Light',
    themeSummary: normalizedTheme === THEME_COMPANY
      ? 'Company Default restores the authored Neuroartan interface baseline.'
      : normalizedTheme === THEME_SYSTEM
        ? 'System follows the device appearance preference and keeps the global interface synchronized.'
        : normalizedTheme === THEME_CUSTOM
          ? 'Custom applies founder-controlled palette, contrast, and hex-token settings through the global token layer.'
          : normalizedTheme === THEME_DARK
            ? 'Dark applies the institutional dark surface with optional contrast refinement.'
            : 'Light applies the institutional light surface with optional contrast refinement.',
    effectiveTheme: state.effective || THEME_DARK,
    contrast: normalizeContrast(state.contrast),
    palette: state.palette || 'neuroartan',
    tokens: state.tokens || {},
    companyDefault: normalizedTheme === THEME_COMPANY,
    cinematicAllowed: normalizedTheme === THEME_CUSTOM || normalizedTheme === THEME_COMPANY,
    monoSolidRequired: normalizedTheme === THEME_DARK || normalizedTheme === THEME_LIGHT
  };
}

/* =============================================================================
   04) THEME INTENT HELPERS
============================================================================= */
function createThemeStatePatch(patch = {}) {
  const currentState = getCurrentThemeState();
  const nextTheme = normalizeTheme(patch.theme || currentState.theme);
  const nextContrast = normalizeContrast(patch.contrast || currentState.contrast);
  const nextTokens = {
    ...(currentState.tokens || {}),
    ...(patch.tokens || {})
  };

  return {
    ...currentState,
    ...patch,
    theme: nextTheme,
    contrast: nextContrast,
    palette: patch.palette || currentState.palette || 'neuroartan',
    tokens: nextTokens
  };
}

function createThemeIntentFromPatch(patch = {}, source = 'home-platform-settings-theme') {
  const state = createThemeStatePatch(patch);
  const themeDetail = getThemeDetail(state);

  return {
    theme: themeDetail.theme,
    themeLabel: themeDetail.themeLabel,
    themeSummary: themeDetail.themeSummary,
    effectiveTheme: themeDetail.effectiveTheme,
    contrast: themeDetail.contrast,
    palette: themeDetail.palette,
    tokens: themeDetail.tokens,
    companyDefault: themeDetail.companyDefault,
    cinematicAllowed: themeDetail.cinematicAllowed,
    monoSolidRequired: themeDetail.monoSolidRequired,
    source
  };
}

function requestThemeChange(detail) {
  document.dispatchEvent(new CustomEvent('neuroartan:home-theme-settings-intent', {
    detail: {
      ...detail,
      source: detail.source || 'home-platform-settings-theme'
    }
  }));
}

function getThemeSurfaceRoot(root) {
  if (!(root instanceof HTMLElement)) return null;
  if (root.classList.contains('home-platform-theme')) return root;

  const surface = root.querySelector('.home-platform-theme');
  return surface instanceof HTMLElement ? surface : null;
}

/* =============================================================================
   05) MODE OPTION BINDING
============================================================================= */
function bindModeOptions(root) {
  const modeOptions = Array.from(root.querySelectorAll(MODE_OPTION_SELECTOR));
  const contrastOptions = Array.from(root.querySelectorAll(CONTRAST_OPTION_SELECTOR));
  const paletteOptions = Array.from(root.querySelectorAll(PALETTE_OPTION_SELECTOR));
  const tokenInputs = Array.from(root.querySelectorAll(TOKEN_INPUT_SELECTOR));
  const companyResetButton = root.querySelector(COMPANY_RESET_SELECTOR);

  modeOptions.forEach((option) => {
    if (!(option instanceof HTMLElement)) return;
    if (option.dataset.homePlatformThemeModeBound === 'true') return;

    option.dataset.homePlatformThemeModeBound = 'true';

    option.addEventListener('click', (event) => {
      event.preventDefault();

      const requestedTheme = normalizeTheme(option.getAttribute('data-theme-option'));
      const nextState = createThemeStatePatch({ theme: requestedTheme });

      if (requestedTheme !== THEME_COMPANY && requestedTheme !== THEME_CUSTOM) {
        setAllHomepageVisualToggles(root, false);
      }

      syncDestinationState(root, nextState);
      requestThemeChange(createThemeIntentFromPatch(nextState));
    });
  });

  contrastOptions.forEach((option) => {
    if (!(option instanceof HTMLElement)) return;
    if (option.dataset.homePlatformThemeContrastBound === 'true') return;

    option.dataset.homePlatformThemeContrastBound = 'true';

    option.addEventListener('click', (event) => {
      event.preventDefault();

      const requestedContrast = normalizeContrast(option.getAttribute('data-theme-contrast-option'));
      const nextState = createThemeStatePatch({ contrast: requestedContrast });

      syncDestinationState(root, nextState);
      requestThemeChange(createThemeIntentFromPatch(nextState));
    });
  });

  paletteOptions.forEach((option) => {
    if (!(option instanceof HTMLElement)) return;
    if (option.dataset.homePlatformThemePaletteBound === 'true') return;

    option.dataset.homePlatformThemePaletteBound = 'true';

    option.addEventListener('click', (event) => {
      event.preventDefault();

      const requestedPalette = String(option.getAttribute('data-theme-palette-option') || 'neuroartan').trim().toLowerCase();
      const nextState = createThemeStatePatch({ theme: THEME_CUSTOM, palette: requestedPalette });

      syncDestinationState(root, nextState);
      requestThemeChange(createThemeIntentFromPatch(nextState));
    });
  });

  tokenInputs.forEach((input) => {
    if (!(input instanceof HTMLInputElement)) return;
    if (input.dataset.homePlatformThemeTokenBound === 'true') return;

    input.dataset.homePlatformThemeTokenBound = 'true';

    input.addEventListener('input', () => {
      const token = input.getAttribute('data-theme-token');
      if (!token) return;

      const nextState = createThemeStatePatch({
        theme: THEME_CUSTOM,
        tokens: {
          [token]: input.value
        }
      });

      syncDestinationState(root, nextState);
      requestThemeChange(createThemeIntentFromPatch(nextState));
    });
  });

  if (companyResetButton instanceof HTMLElement && companyResetButton.dataset.homePlatformThemeCompanyResetBound !== 'true') {
    companyResetButton.dataset.homePlatformThemeCompanyResetBound = 'true';

    companyResetButton.addEventListener('click', (event) => {
      event.preventDefault();

      const themeApi = window.NeuroartanTheme;

      if (themeApi && typeof themeApi.resetThemeToCompanyDefault === 'function') {
        const nextState = themeApi.resetThemeToCompanyDefault();
        setAllHomepageVisualToggles(root, true);
        syncDestinationState(root, nextState);
        return;
      }

      const nextState = createThemeStatePatch({
        theme: THEME_COMPANY,
        contrast: CONTRAST_STANDARD,
        palette: 'neuroartan',
        tokens: {}
      });

      setAllHomepageVisualToggles(root, true);
      syncDestinationState(root, nextState);
      requestThemeChange(createThemeIntentFromPatch(nextState));
    });
  }
}

/* =============================================================================
   06) CURSOR CONTROL BINDING
============================================================================= */
function getCurrentCursorState() {
  const cursorApi = window.NeuroartanCursor;

  if (cursorApi && typeof cursorApi.getState === 'function') {
    return cursorApi.getState();
  }

  return {
    mode: document.documentElement.dataset.cursorMode || 'custom',
    color: getComputedStyle(document.documentElement).getPropertyValue('--cursor-accent-color').trim() || '#917c6f',
    enabled: document.documentElement.dataset.cursorCustom === 'true'
  };
}

function requestCursorChange(detail = {}) {
  document.dispatchEvent(new CustomEvent('neuroartan:cursor-change-requested', {
    detail: {
      ...detail,
      source: 'home-platform-settings-theme'
    }
  }));
}

function syncCursorControls(root) {
  const cursorState = getCurrentCursorState();
  const modeOptions = Array.from(root.querySelectorAll(CURSOR_MODE_OPTION_SELECTOR));
  const colorInput = root.querySelector(CURSOR_COLOR_INPUT_SELECTOR);

  modeOptions.forEach((option) => {
    if (!(option instanceof HTMLElement)) return;

    const optionMode = String(option.getAttribute('data-cursor-mode-option') || 'custom').trim().toLowerCase();
    const active = optionMode === cursorState.mode;

    option.setAttribute('aria-pressed', active ? 'true' : 'false');
    option.toggleAttribute('data-active', active);
  });

  if (colorInput instanceof HTMLInputElement && colorInput.value !== cursorState.color) {
    colorInput.value = cursorState.color;
  }
}

function bindCursorControls(root) {
  const modeOptions = Array.from(root.querySelectorAll(CURSOR_MODE_OPTION_SELECTOR));
  const colorInput = root.querySelector(CURSOR_COLOR_INPUT_SELECTOR);

  modeOptions.forEach((option) => {
    if (!(option instanceof HTMLElement)) return;
    if (option.dataset.homePlatformCursorModeBound === 'true') return;

    option.dataset.homePlatformCursorModeBound = 'true';

    option.addEventListener('click', (event) => {
      event.preventDefault();

      const mode = String(option.getAttribute('data-cursor-mode-option') || 'custom').trim().toLowerCase();
      const nextState = {
        ...getCurrentCursorState(),
        mode
      };

      syncCursorControls(root);
      requestCursorChange(nextState);
    });
  });

  if (colorInput instanceof HTMLInputElement && colorInput.dataset.homePlatformCursorColorBound !== 'true') {
    colorInput.dataset.homePlatformCursorColorBound = 'true';

    colorInput.addEventListener('input', () => {
      const nextState = {
        ...getCurrentCursorState(),
        mode: 'custom',
        color: colorInput.value
      };

      syncCursorControls(root);
      requestCursorChange(nextState);
    });
  }
}

/* =============================================================================
   07) TOGGLE CONSUMER BINDING
============================================================================= */
function syncToggleAvailability(root, theme) {
  const customThemeActive = getThemeDetail(theme).cinematicAllowed;
  const toggles = Array.from(root.querySelectorAll(TOGGLE_SELECTOR));
  const rows = Array.from(root.querySelectorAll('[data-home-platform-theme-toggle-row]'));

  if (!customThemeActive) {
    setAllHomepageVisualToggles(root, false);
  }

  toggles.forEach((toggle) => {
    if (!(toggle instanceof HTMLElement)) return;

    toggle.setAttribute('aria-disabled', customThemeActive ? 'false' : 'true');
    toggle.disabled = !customThemeActive;
    toggle.dataset.toggleAvailability = customThemeActive ? 'active' : 'locked';
  });

  rows.forEach((row) => {
    if (!(row instanceof HTMLElement)) return;
    row.dataset.toggleAvailability = customThemeActive ? 'active' : 'locked';
  });
}

/* =============================================================================
   08) HOMEPAGE TOGGLE ATTRIBUTE BRIDGE
============================================================================= */
function readToggleChecked(toggle) {
  if (!(toggle instanceof HTMLElement)) return false;

  const toggleApi = window.NeuroartanToggle;

  if (toggleApi && typeof toggleApi.getStoredToggleValue === 'function') {
    const storedValue = toggleApi.getStoredToggleValue(toggle);
    if (storedValue !== null) return Boolean(storedValue);
  }

  if (toggle instanceof HTMLInputElement) return Boolean(toggle.checked);

  return toggle.getAttribute('aria-checked') === 'true'
    || toggle.getAttribute('aria-pressed') === 'true'
    || toggle.dataset.toggleChecked === 'true';
}

function setHomepageToggleAttribute(key, checked) {
  const attributeName = HOMEPAGE_THEME_TOGGLE_ATTRIBUTE_MAP[key];
  if (!attributeName) return;

  const attributeValue = checked ? 'true' : 'false';
  const kebabAttribute = `data-${attributeName.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`)}`;

  document.documentElement.dataset[attributeName] = attributeValue;
  document.body?.setAttribute(kebabAttribute, attributeValue);
}

function syncHomepageToggleAttributes(root) {
  const toggles = Array.from(root.querySelectorAll(TOGGLE_SELECTOR));

  toggles.forEach((toggle) => {
    if (!(toggle instanceof HTMLElement)) return;

    const key = toggle.getAttribute('data-toggle-key') || '';
    if (!key) return;

    setHomepageToggleAttribute(key, readToggleChecked(toggle));
  });

  Object.keys(HOMEPAGE_THEME_TOGGLE_ATTRIBUTE_MAP).forEach((key) => {
    const matchingToggle = toggles.find((toggle) => toggle instanceof HTMLElement && toggle.getAttribute('data-toggle-key') === key);
    if (matchingToggle instanceof HTMLElement) return;

    const toggleApi = window.NeuroartanToggle;
    const storedState = toggleApi && typeof toggleApi.readStoredToggleState === 'function'
      ? toggleApi.readStoredToggleState()
      : {};
    const storedId = `homepage-theme:${key}`;

    if (storedId in storedState) {
      setHomepageToggleAttribute(key, Boolean(storedState[storedId]));
    }
  });
}

/* =============================================================================
   09) PANEL STATE SYNC
============================================================================= */
function syncDestinationState(root, state = getCurrentThemeState()) {
  const themeDetail = getThemeDetail(state);
  const normalizedTheme = themeDetail.theme;
  const modeOptions = Array.from(root.querySelectorAll(MODE_OPTION_SELECTOR));
  const contrastOptions = Array.from(root.querySelectorAll(CONTRAST_OPTION_SELECTOR));
  const paletteOptions = Array.from(root.querySelectorAll(PALETTE_OPTION_SELECTOR));
  const tokenInputs = Array.from(root.querySelectorAll(TOKEN_INPUT_SELECTOR));
  const summaryNode = root.querySelector('.home-platform-theme__summary');
  const surfaceRoot = getThemeSurfaceRoot(root);
  const stateRoots = [root, surfaceRoot].filter((node, index, nodes) => node instanceof HTMLElement && nodes.indexOf(node) === index);

  stateRoots.forEach((stateRoot) => {
    stateRoot.dataset.activeTheme = normalizedTheme;
    stateRoot.dataset.activeThemeEffective = themeDetail.effectiveTheme;
    stateRoot.dataset.activeThemeContrast = themeDetail.contrast;
    stateRoot.dataset.activeThemePalette = themeDetail.palette;
    stateRoot.dataset.activeThemeLabel = themeDetail.themeLabel;
    stateRoot.dataset.cinematicAllowed = themeDetail.cinematicAllowed ? 'true' : 'false';
    stateRoot.dataset.monoSolidRequired = themeDetail.monoSolidRequired ? 'true' : 'false';
  });

  if (summaryNode) {
    summaryNode.textContent = themeDetail.themeSummary;
  }

  modeOptions.forEach((option) => {
    if (!(option instanceof HTMLElement)) return;

    const optionTheme = normalizeTheme(option.getAttribute('data-theme-option'));
    const optionDetail = getThemeDetail(optionTheme);

    option.setAttribute('aria-pressed', optionTheme === normalizedTheme ? 'true' : 'false');
    option.toggleAttribute('data-active', optionTheme === normalizedTheme);
    option.dataset.activeThemeOption = optionTheme;
    option.dataset.activeThemeLabel = optionDetail.themeLabel;
  });

  contrastOptions.forEach((option) => {
    if (!(option instanceof HTMLElement)) return;

    const optionContrast = normalizeContrast(option.getAttribute('data-theme-contrast-option'));
    option.setAttribute('aria-pressed', optionContrast === themeDetail.contrast ? 'true' : 'false');
    option.toggleAttribute('data-active', optionContrast === themeDetail.contrast);
    option.dataset.activeThemeContrast = optionContrast;
  });

  paletteOptions.forEach((option) => {
    if (!(option instanceof HTMLElement)) return;

    const optionPalette = String(option.getAttribute('data-theme-palette-option') || '').trim().toLowerCase();
    option.setAttribute('aria-pressed', optionPalette === themeDetail.palette ? 'true' : 'false');
    option.toggleAttribute('data-active', optionPalette === themeDetail.palette);
    option.dataset.activeThemePalette = optionPalette;
  });

  tokenInputs.forEach((input) => {
    if (!(input instanceof HTMLInputElement)) return;

    const token = input.getAttribute('data-theme-token');
    if (!token) return;

    const value = themeDetail.tokens?.[token];
    if (value && input.value !== value) input.value = value;
  });

  syncToggleAvailability(root, normalizedTheme);
  syncHomepageToggleAttributes(root);
  syncCursorControls(root);
}

function bindThemeSync(root) {
  if (!(root instanceof HTMLElement)) return;
  if (root.dataset.homePlatformThemeSyncBound === 'true') return;

  root.dataset.homePlatformThemeSyncBound = 'true';

  document.addEventListener('neuroartan:theme-changed', (event) => {
    syncDestinationState(root, event?.detail || getCurrentThemeState());
  });

  document.addEventListener('neuroartan:toggle-changed', (event) => {
    const toggle = event?.detail?.element;
    if (!(toggle instanceof HTMLElement)) return;
    if (toggle.getAttribute('data-toggle-scope') !== 'homepage-theme') return;

    const key = toggle.getAttribute('data-toggle-key') || '';
    if (!key) return;

    const checked = Boolean(event?.detail?.checked);
    setHomepageToggleAttribute(key, checked);

    const themeDetail = getThemeDetail();

    root.dispatchEvent(new CustomEvent('neuroartan:homepage-theme-control-changed', {
      bubbles: true,
      detail: {
        key,
        checked,
        theme: themeDetail.theme,
        themeLabel: themeDetail.themeLabel,
        themeSummary: themeDetail.themeSummary,
        effectiveTheme: themeDetail.effectiveTheme,
        contrast: themeDetail.contrast,
        palette: themeDetail.palette,
        companyDefault: themeDetail.companyDefault,
        cinematicAllowed: themeDetail.cinematicAllowed,
        monoSolidRequired: themeDetail.monoSolidRequired,
        source: 'home-platform-settings-theme'
      }
    }));
  });

  document.addEventListener('neuroartan:cursor-changed', () => {
    syncCursorControls(root);
  });
}

/* =============================================================================
   10) DESTINATION MOUNT
============================================================================= */
export function mountHomePlatformDestination(root) {
  if (!(root instanceof HTMLElement)) return;

  const destinationRoot = root.matches(DESTINATION_SELECTOR)
    ? root
    : root.querySelector(DESTINATION_SELECTOR);

  if (!(destinationRoot instanceof HTMLElement)) return;

  bindModeOptions(destinationRoot);
  bindCursorControls(destinationRoot);
  bindThemeSync(destinationRoot);
  syncDestinationState(destinationRoot, getCurrentThemeState());
}

/* =============================================================================
   11) END OF FILE
============================================================================= */
function setHomepageToggleStorage(key, checked) {
  const toggleApi = window.NeuroartanToggle;
  const storageId = `homepage-theme:${key}`;

  if (toggleApi && typeof toggleApi.writeStoredToggleState === 'function') {
    toggleApi.writeStoredToggleState(storageId, checked);
  }
}

function setHomepageToggleElement(toggle, checked) {
  if (!(toggle instanceof HTMLElement)) return;

  const toggleApi = window.NeuroartanToggle;

  if (toggleApi && typeof toggleApi.syncToggleState === 'function') {
    toggleApi.syncToggleState(toggle, checked, {
      emit: true,
      persist: true,
      source: 'home-platform-settings-theme-mode-gate'
    });
    return;
  }

  toggle.setAttribute('aria-checked', checked ? 'true' : 'false');
  toggle.setAttribute('aria-pressed', checked ? 'true' : 'false');
  toggle.dataset.toggleChecked = checked ? 'true' : 'false';
}

function setAllHomepageVisualToggles(root, checked) {
  const toggles = Array.from(root.querySelectorAll(TOGGLE_SELECTOR));

  Object.keys(HOMEPAGE_THEME_TOGGLE_ATTRIBUTE_MAP).forEach((key) => {
    setHomepageToggleAttribute(key, checked);
    setHomepageToggleStorage(key, checked);
  });

  toggles.forEach((toggle) => {
    if (!(toggle instanceof HTMLElement)) return;
    setHomepageToggleElement(toggle, checked);
  });
}