const STORAGE_KEY = 'neuroartan.accessibility';

const ACCESSIBILITY_DEFAULTS = {
  typography: 'medium',
  density: 'standard',
  motion: 'enabled',
  ariaAnnouncements: false,
  iconSize: 'medium'
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
    if (raw) {
      const parsed = JSON.parse(raw);
      console.log('[Accessibility] Loaded from localStorage:', parsed);
      return parsed;
    }
  } catch (error) {
    console.error('[Accessibility] Error reading localStorage:', error);
  }
  console.log('[Accessibility] Using defaults:', ACCESSIBILITY_DEFAULTS);
  return { ...ACCESSIBILITY_DEFAULTS };
}

function writeLocalStorageSettings(settings) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    console.log('[Accessibility] Saved to localStorage:', settings);
  } catch (error) {
    console.error('[Accessibility] Error writing localStorage:', error);
  }
}

async function syncFromSupabase() {
  if (!window.neuroartanSupabase) {
    console.log('[Accessibility] Supabase not available, skipping sync');
    return;
  }

  try {
    const { data: { user } } = await window.neuroartanSupabase.auth.getUser();
    if (!user) {
      console.log('[Accessibility] No authenticated user, skipping Supabase sync');
      return;
    }

    const { data, error } = await window.neuroartanSupabase
      .from('profiles')
      .select('accessibility_typography, accessibility_density, accessibility_motion, accessibility_aria_announcements, accessibility_icon_size')
      .eq('auth_user_id', user.id)
      .single();

    if (error || !data) {
      console.log('[Accessibility] No Supabase data found, keeping localStorage settings');
      return;
    }

    const supabaseSettings = {
      typography: data.accessibility_typography,
      density: data.accessibility_density,
      motion: data.accessibility_motion,
      ariaAnnouncements: data.accessibility_aria_announcements,
      iconSize: data.accessibility_icon_size
    };

    console.log('[Accessibility] Synced from Supabase:', supabaseSettings);
    // Sync Supabase settings to localStorage
    writeLocalStorageSettings(supabaseSettings);
    applyAccessibilitySettings(supabaseSettings);
  } catch (error) {
    console.error('[Accessibility] Error syncing from Supabase:', error);
  }
}

async function syncToSupabase(settings) {
  if (!window.neuroartanSupabase) {
    console.log('[Accessibility] Supabase not available, skipping sync to Supabase');
    return;
  }

  try {
    const { data: { user } } = await window.neuroartanSupabase.auth.getUser();
    if (!user) {
      console.log('[Accessibility] No authenticated user, skipping sync to Supabase');
      return;
    }

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
    console.log('[Accessibility] Synced to Supabase:', settings);
  } catch (error) {
    console.error('[Accessibility] Error syncing to Supabase:', error);
  }
}

function readAccessibilitySettings() {
  return readLocalStorageSettings();
}

function writeAccessibilitySettings(settings) {
  writeLocalStorageSettings(settings);
  syncToSupabase(settings);
}

function applyAccessibilitySettings(settings) {
  const root = document.documentElement;

  // Set data attributes for CSS selectors
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

  // Apply CSS custom properties for visual changes
  const typographyScale = TYPOGRAPHY_SCALE[settings.typography] || 1;
  root.style.setProperty('--accessibility-typography-scale', typographyScale);

  const densityScale = DENSITY_SCALE[settings.density] || 1;
  root.style.setProperty('--accessibility-density-scale', densityScale);

  const motionReduced = settings.motion === 'reduced';
  root.style.setProperty('--accessibility-motion-reduced', motionReduced ? '1' : '0');

  const iconSizeScale = ICON_SIZE_SCALE[settings.iconSize] || 1.25;
  root.style.setProperty('--accessibility-icon-scale', iconSizeScale);

  const ariaAnnouncements = settings.ariaAnnouncements ? '1' : '0';
  root.style.setProperty('--accessibility-aria-announcements', ariaAnnouncements);
}

function initializeAccessibility() {
  console.log('[Accessibility] Initializing accessibility settings');
  const settings = readAccessibilitySettings();
  console.log('[Accessibility] Applying settings:', settings);
  applyAccessibilitySettings(settings);
}

document.addEventListener('accessibility:settings-changed', (event) => {
  const settings = event.detail;
  if (settings) {
    applyAccessibilitySettings(settings);
    writeAccessibilitySettings(settings);
  }
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeAccessibility, { once: true });
} else {
  initializeAccessibility();
}

window.addEventListener('neuroartan:supabase-ready', () => {
  // Sync from Supabase when ready (background operation)
  syncFromSupabase();
});
