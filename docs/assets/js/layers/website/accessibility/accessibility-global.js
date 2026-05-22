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

function applyAccessibilitySettings(settings) {
  const root = document.documentElement;

  if (settings.typography) {
    root.dataset.accessibilityTypography = settings.typography;
  }

  if (settings.density) {
    root.dataset.accessibilityDensity = settings.density;
  }

  if (settings.motion === 'reduced') {
    root.dataset.accessibilityMotion = 'reduced';
  } else {
    delete root.dataset.accessibilityMotion;
  }

  if (settings.ariaAnnouncements) {
    root.dataset.accessibilityAriaAnnouncements = 'true';
  } else {
    delete root.dataset.accessibilityAriaAnnouncements;
  }
}

function initializeAccessibility() {
  const settings = readAccessibilitySettings();
  applyAccessibilitySettings(settings);
}

document.addEventListener('accessibility:settings-changed', (event) => {
  const settings = event.detail;
  if (settings) {
    applyAccessibilitySettings(settings);
  }
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeAccessibility, { once: true });
} else {
  initializeAccessibility();
}
