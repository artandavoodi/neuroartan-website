import { mountSettingsCategory } from '../_shared/settings-category.js';

const STORAGE_KEY = 'neuroartan.accessibility';

const ACCESSIBILITY_DEFAULTS = {
  typography: 'large',
  density: 'standard',
  motion: 'enabled',
  ariaAnnouncements: false,
  iconSize: 'large'
};

const TYPOGRAPHY_SCALE = {
  small: 0.875,
  medium: 1,
  large: 1.125,
  'extra-large': 1.25
};

const DENSITY_SCALE = {
  compact: 0.75,
  standard: 1,
  comfortable: 1.25
};

const ICON_SIZE_SCALE = {
  small: 1,
  medium: 1.25,
  large: 1.5
};

function readLocalStorageSettings() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
  }
  return { ...ACCESSIBILITY_DEFAULTS };
}

function writeLocalStorageSettings(settings) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
  }
}

async function syncToSupabase(settings) {
  if (!window.neuroartanSupabase) return;

  try {
    const { data: { user } } = await window.neuroartanSupabase.auth.getUser();
    if (!user) return;

    await window.neuroartanSupabase
      .from('profiles')
      .update({
        accessibility_typography: settings.typography,
        accessibility_density: settings.density,
        accessibility_motion: settings.motion,
        accessibility_aria_announcements: settings.ariaAnnouncements,
        accessibility_icon_size: settings.iconSize
      })
      .eq('auth_user_id', user.id);
  } catch {
  }
}

function readAccessibilitySettings() {
  return readLocalStorageSettings();
}

function writeAccessibilitySettings(settings) {
  writeLocalStorageSettings(settings);
  syncToSupabase(settings);
  document.dispatchEvent(new CustomEvent('accessibility:settings-changed', { detail: settings }));
}

function applyAccessibilitySettings(settings) {
  const root = document.documentElement;
  
  // Apply typography scale
  const typographyScale = TYPOGRAPHY_SCALE[settings.typography] || 1;
  root.style.setProperty('--accessibility-typography-scale', typographyScale);
  
  // Apply density scale
  const densityScale = DENSITY_SCALE[settings.density] || 1;
  root.style.setProperty('--accessibility-density-scale', densityScale);
  
  // Apply motion preference
  const motionReduced = settings.motion === 'reduced';
  root.style.setProperty('--accessibility-motion-reduced', motionReduced ? '1' : '0');
  
  // Apply icon size scale
  const iconSizeScale = ICON_SIZE_SCALE[settings.iconSize] || 1.25;
  root.style.setProperty('--accessibility-icon-scale', iconSizeScale);
  
  // Apply ARIA announcements preference
  const ariaAnnouncements = settings.ariaAnnouncements ? '1' : '0';
  root.style.setProperty('--accessibility-aria-announcements', ariaAnnouncements);
}

function bindTypographyOptions(root) {
  const options = root.querySelectorAll('[data-accessibility-typography-option]');
  const settings = readAccessibilitySettings();

  options.forEach((option) => {
    const value = option.dataset.typographyOption;
    option.setAttribute('aria-pressed', String(settings.typography === value));

    option.addEventListener('click', () => {
      const newSettings = readAccessibilitySettings();
      newSettings.typography = value;

      options.forEach((opt) => {
        opt.setAttribute('aria-pressed', String(opt.dataset.typographyOption === value));
      });

      writeAccessibilitySettings(newSettings);
    });
  });
}

function bindDensityOptions(root) {
  const options = root.querySelectorAll('[data-accessibility-density-option]');
  const settings = readAccessibilitySettings();

  options.forEach((option) => {
    const value = option.dataset.densityOption;
    option.setAttribute('aria-pressed', String(settings.density === value));

    option.addEventListener('click', () => {
      const newSettings = readAccessibilitySettings();
      newSettings.density = value;

      options.forEach((opt) => {
        opt.setAttribute('aria-pressed', String(opt.dataset.densityOption === value));
      });

      writeAccessibilitySettings(newSettings);
    });
  });
}

function bindMotionOptions(root) {
  const options = root.querySelectorAll('[data-accessibility-motion-option]');
  const settings = readAccessibilitySettings();

  options.forEach((option) => {
    const value = option.dataset.motionOption;
    option.setAttribute('aria-pressed', String(settings.motion === value));

    option.addEventListener('click', () => {
      const newSettings = readAccessibilitySettings();
      newSettings.motion = value;

      options.forEach((opt) => {
        opt.setAttribute('aria-pressed', String(opt.dataset.motionOption === value));
      });

      writeAccessibilitySettings(newSettings);
    });
  });
}

function bindAriaToggle(root) {
  const toggle = root.querySelector('[data-accessibility-aria-toggle]');
  const settings = readAccessibilitySettings();

  if (toggle) {
    toggle.setAttribute('aria-checked', String(settings.ariaAnnouncements));

    toggle.addEventListener('click', () => {
      const newSettings = readAccessibilitySettings();
      newSettings.ariaAnnouncements = !newSettings.ariaAnnouncements;
      toggle.setAttribute('aria-checked', String(newSettings.ariaAnnouncements));
      writeAccessibilitySettings(newSettings);
    });
  }
}

function bindIconSizeOptions(root) {
  const options = root.querySelectorAll('[data-accessibility-icon-option]');
  const settings = readAccessibilitySettings();

  options.forEach((option) => {
    const value = option.dataset.iconOption;
    option.setAttribute('aria-pressed', String(settings.iconSize === value));

    option.addEventListener('click', () => {
      const newSettings = readAccessibilitySettings();
      newSettings.iconSize = value;

      options.forEach((opt) => {
        opt.setAttribute('aria-pressed', String(opt.dataset.iconOption === value));
      });

      writeAccessibilitySettings(newSettings);
    });
  });
}

function bindResetButton(root) {
  const resetButton = root.querySelector('[data-accessibility-reset]');

  if (resetButton) {
    resetButton.addEventListener('click', () => {
      const defaultSettings = { ...ACCESSIBILITY_DEFAULTS };
      writeAccessibilitySettings(defaultSettings);

      const options = root.querySelectorAll('[data-accessibility-typography-option]');
      options.forEach((opt) => {
        opt.setAttribute('aria-pressed', String(opt.dataset.typographyOption === 'large'));
      });

      const densityOptions = root.querySelectorAll('[data-accessibility-density-option]');
      densityOptions.forEach((opt) => {
        opt.setAttribute('aria-pressed', String(opt.dataset.densityOption === 'standard'));
      });

      const motionOptions = root.querySelectorAll('[data-accessibility-motion-option]');
      motionOptions.forEach((opt) => {
        opt.setAttribute('aria-pressed', String(opt.dataset.motionOption === 'enabled'));
      });

      const ariaToggle = root.querySelector('[data-accessibility-aria-toggle]');
      if (ariaToggle) {
        ariaToggle.setAttribute('aria-checked', 'false');
      }

      const iconOptions = root.querySelectorAll('[data-accessibility-icon-option]');
      iconOptions.forEach((opt) => {
        opt.setAttribute('aria-pressed', String(opt.dataset.iconOption === 'large'));
      });
    });
  }
}

export function mountHomePlatformDestination(root, options = {}) {
  mountSettingsCategory(root, options);

  // Bind UI elements to current settings
  const settings = readAccessibilitySettings();

  bindTypographyOptions(root);
  bindDensityOptions(root);
  bindMotionOptions(root);
  bindAriaToggle(root);
  bindIconSizeOptions(root);
  bindResetButton(root);
}
