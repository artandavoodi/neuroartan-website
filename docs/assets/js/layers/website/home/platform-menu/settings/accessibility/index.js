import { mountSettingsCategory } from '../_shared/settings-category.js';

const STORAGE_KEY = 'neuroartan.accessibility';

function readAccessibilitySettings() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
  }
  return {
    typography: 'medium',
    density: 'standard',
    motion: 'enabled',
    ariaAnnouncements: false
  };
}

function writeAccessibilitySettings(settings) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    document.dispatchEvent(new CustomEvent('accessibility:settings-changed', { detail: settings }));
  } catch {
  }
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

function bindResetButton(root) {
  const resetButton = root.querySelector('[data-accessibility-reset]');

  if (resetButton) {
    resetButton.addEventListener('click', () => {
      const defaultSettings = {
        typography: 'medium',
        density: 'standard',
        motion: 'enabled',
        ariaAnnouncements: false
      };

      writeAccessibilitySettings(defaultSettings);

      const options = root.querySelectorAll('[data-accessibility-typography-option]');
      options.forEach((opt) => {
        opt.setAttribute('aria-pressed', String(opt.dataset.typographyOption === 'medium'));
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
    });
  }
}

export function mountHomePlatformDestination(root, options = {}) {
  mountSettingsCategory(root, options);

  bindTypographyOptions(root);
  bindDensityOptions(root);
  bindMotionOptions(root);
  bindAriaToggle(root);
  bindResetButton(root);
}
