/* =========================================================
   00. FILE INDEX
   01. MODULE STATE
   02. NORMALIZATION HELPERS
   03. SNAPSHOT HELPERS
   04. STATE MUTATION HELPERS
   05. INTERACTION SETTINGS HELPERS
   06. EVENT BINDING
   07. MODULE BOOT
   ========================================================= */

/* =========================================================
   01. MODULE STATE
   ========================================================= */

const HOME_SURFACE_STATE = {
  isBound: false,
  theme: 'system',
  themeDetail: {
    theme: 'system',
    themeLabel: 'System',
    themeSummary: '',
    effectiveTheme: 'dark',
    contrast: 'standard',
    palette: 'neuroartan',
    tokens: {},
    cinematicAllowed: false,
    monoSolidRequired: false,
  },
  locale: {
    countryCode: '',
    countryLabel: '',
    language: 'en',
    languages: [],
  },
  account: {
    signedIn: false,
    user: null,
    profile: null,
    profileComplete: false,
  },
  voice: {
    mode: 'idle',
    transcript: '',
    response: '',
    lastQuery: '',
    lastRoute: '',
    lastQueryId: null,
  },
  interaction: {
    responseMode: 'text',
    interactionStyle: 'composer',
    stageEffects: 'subtle',
    stageText: 'minimal',
  },
  subscribers: new Set(),
};

/* =========================================================
   02. NORMALIZATION HELPERS
   ========================================================= */

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeThemeValue(value) {
  const normalized = normalizeString(value).toLowerCase();

  if (normalized === 'color') return 'custom';
  if (normalized === 'system' || normalized === 'custom' || normalized === 'dark' || normalized === 'light') {
    return normalized;
  }

  return 'system';
}

function normalizeLocaleSnapshot(locale = {}) {
  return {
    countryCode: normalizeString(locale.countryCode || locale.country_code || '').toUpperCase(),
    countryLabel: normalizeString(locale.countryLabel || locale.country_label || ''),
    language: normalizeString(locale.language || 'en').toLowerCase() || 'en',
    languages: Array.isArray(locale.languages)
      ? locale.languages.map((value) => normalizeString(value).toLowerCase()).filter(Boolean)
      : [],
  };
}

function normalizeUserSnapshot(user = null) {
  if (!user || typeof user !== 'object') {
    return null;
  }

  return {
    uid: normalizeString(user.uid || ''),
    email: normalizeString(user.email || ''),
    displayName: normalizeString(user.displayName || user.display_name || ''),
    photoURL: normalizeString(user.photoURL || user.photo_url || ''),
    emailVerified: user.emailVerified === true,
    providerIds: Array.isArray(user.providerData)
      ? user.providerData
        .map((entry) => normalizeString(entry?.providerId || ''))
        .filter(Boolean)
      : [],
  };
}

function normalizeProfileSnapshot(profile = null) {
  if (!profile || typeof profile !== 'object') {
    return null;
  }

  return {
    username: normalizeString(profile.username || profile.username_normalized || profile.username_lower || '').toLowerCase(),
    display_name: normalizeString(profile.display_name || ''),
    first_name: normalizeString(profile.first_name || ''),
    last_name: normalizeString(profile.last_name || ''),
    email: normalizeString(profile.email || ''),
    photo_url: normalizeString(profile.photo_url || ''),
    public_profile_enabled: profile.public_profile_enabled === true,
    public_profile_discoverable: profile.public_profile_discoverable === true,
    auth_email_verified: profile.auth_email_verified === true,
    subscription_plan: normalizeString(profile.subscription_plan || profile.plan || ''),
    verification_state: normalizeString(profile.verification_state || ''),
  };
}

function normalizeVoiceMode(mode) {
  const normalized = normalizeString(mode).toLowerCase();

  if (!normalized) {
    return 'idle';
  }

  return normalized;
}

function normalizeVoiceRoute(route) {
  const normalized = normalizeString(route).toLowerCase();

  if (!normalized) {
    return '';
  }

  return normalized;
}

function readThemeFromRuntime() {
  const runtimeTheme = window.NeuroartanTheme?.getCurrentTheme?.();
  if (runtimeTheme) return normalizeThemeValue(runtimeTheme);

  const htmlTheme = document.documentElement?.getAttribute('data-theme');
  if (htmlTheme) return normalizeThemeValue(htmlTheme);

  return 'system';
}

function readThemeDetailFromRuntime() {
  const runtimeThemeApi = window.NeuroartanTheme;
  const theme = readThemeFromRuntime();

  if (runtimeThemeApi && typeof runtimeThemeApi.getThemeStateDetail === 'function') {
    return runtimeThemeApi.getThemeStateDetail(theme);
  }

  return {
    theme,
    themeLabel: theme === 'system' ? 'System' : theme === 'custom' ? 'Custom' : theme === 'dark' ? 'Dark' : 'Light',
    themeSummary: '',
    effectiveTheme: document.documentElement?.getAttribute('data-theme-effective') || 'dark',
    contrast: document.documentElement?.getAttribute('data-theme-contrast') || 'standard',
    palette: document.documentElement?.getAttribute('data-theme-palette') || 'neuroartan',
    tokens: {},
    cinematicAllowed: theme === 'custom',
    monoSolidRequired: theme === 'dark' || theme === 'light',
  };
}

function readLocaleFromRuntime() {
  return normalizeLocaleSnapshot(window.NEUROARTAN_LOCALE || {});
}

function readAccountFromRuntime() {
  let currentUser = null;

  try {
    currentUser = window.firebase?.auth?.()?.currentUser || null;
  } catch (_) {
    currentUser = null;
  }

  return {
    signedIn: !!currentUser,
    user: normalizeUserSnapshot(currentUser),
    profile: HOME_SURFACE_STATE.account.profile,
    profileComplete: HOME_SURFACE_STATE.account.profileComplete,
  };
}

/* =========================================================
   03. SNAPSHOT HELPERS
   ========================================================= */

function cloneHomeSurfaceState() {
  return {
    theme: HOME_SURFACE_STATE.theme,
    themeDetail: {
      ...HOME_SURFACE_STATE.themeDetail,
    },
    locale: {
      ...HOME_SURFACE_STATE.locale,
      languages: [...HOME_SURFACE_STATE.locale.languages],
    },
    account: {
      signedIn: HOME_SURFACE_STATE.account.signedIn,
      user: HOME_SURFACE_STATE.account.user ? { ...HOME_SURFACE_STATE.account.user } : null,
      profile: HOME_SURFACE_STATE.account.profile ? { ...HOME_SURFACE_STATE.account.profile } : null,
      profileComplete: HOME_SURFACE_STATE.account.profileComplete,
    },
    voice: {
      ...HOME_SURFACE_STATE.voice,
    },
    interaction: {
      ...HOME_SURFACE_STATE.interaction,
    },
  };
}

function emitHomeSurfaceState() {
  const snapshot = cloneHomeSurfaceState();

  HOME_SURFACE_STATE.subscribers.forEach((listener) => {
    try {
      listener(snapshot);
    } catch (error) {
      console.error('[home-surface-state] Subscriber update failed.', error);
    }
  });
}

export function getHomeSurfaceState() {
  return cloneHomeSurfaceState();
}

export function subscribeHomeSurfaceState(listener) {
  if (typeof listener !== 'function') {
    return () => {};
  }

  HOME_SURFACE_STATE.subscribers.add(listener);
  listener(cloneHomeSurfaceState());

  return () => {
    HOME_SURFACE_STATE.subscribers.delete(listener);
  };
}

/* =========================================================
   04. STATE MUTATION HELPERS
   ========================================================= */

function syncThemeState(value = null) {
  const runtimeDetail = readThemeDetailFromRuntime();
  const normalizedTheme = normalizeThemeValue(value || runtimeDetail.theme || readThemeFromRuntime());

  HOME_SURFACE_STATE.theme = normalizedTheme;
  HOME_SURFACE_STATE.themeDetail = {
    ...runtimeDetail,
    theme: normalizedTheme,
    themeLabel: runtimeDetail.themeLabel || (normalizedTheme === 'system' ? 'System' : normalizedTheme === 'custom' ? 'Custom' : normalizedTheme === 'dark' ? 'Dark' : 'Light'),
    effectiveTheme: runtimeDetail.effectiveTheme || document.documentElement?.getAttribute('data-theme-effective') || 'dark',
    contrast: runtimeDetail.contrast || document.documentElement?.getAttribute('data-theme-contrast') || 'standard',
    palette: runtimeDetail.palette || document.documentElement?.getAttribute('data-theme-palette') || 'neuroartan',
    tokens: runtimeDetail.tokens || {},
    cinematicAllowed: normalizedTheme === 'custom',
    monoSolidRequired: normalizedTheme === 'dark' || normalizedTheme === 'light',
  };
}

function syncLocaleState(detail = null) {
  HOME_SURFACE_STATE.locale = normalizeLocaleSnapshot(detail || readLocaleFromRuntime());
}

function syncSignedOutAccountState() {
  HOME_SURFACE_STATE.account = {
    signedIn: false,
    user: null,
    profile: null,
    profileComplete: false,
  };
}

function syncSignedInAccountState(detail = null) {
  const runtimeAccount = readAccountFromRuntime();
  const user = normalizeUserSnapshot(detail?.user || runtimeAccount.user);
  const profile = normalizeProfileSnapshot(detail?.profile || HOME_SURFACE_STATE.account.profile);
  const profileComplete = detail?.profileComplete === false ? false : !!(detail?.profileComplete || profile);

  HOME_SURFACE_STATE.account = {
    signedIn: !!user,
    user,
    profile,
    profileComplete,
  };
}

function syncVoiceMode(mode = '') {
  HOME_SURFACE_STATE.voice.mode = normalizeVoiceMode(mode);
}

function syncVoiceTranscript(transcript = '') {
  HOME_SURFACE_STATE.voice.transcript = normalizeString(transcript);
}

function syncVoiceResponse(response = '') {
  HOME_SURFACE_STATE.voice.response = normalizeString(response);
}

function syncVoiceQuery(detail = {}) {
  HOME_SURFACE_STATE.voice.lastQuery = normalizeString(detail.query || HOME_SURFACE_STATE.voice.lastQuery);
}

function syncVoiceRoute(detail = {}) {
  HOME_SURFACE_STATE.voice.lastRoute = normalizeVoiceRoute(detail.route || '');
  HOME_SURFACE_STATE.voice.lastQuery = normalizeString(detail.query || HOME_SURFACE_STATE.voice.lastQuery);
  HOME_SURFACE_STATE.voice.lastQueryId = detail.queryId ?? HOME_SURFACE_STATE.voice.lastQueryId;
}

/* =========================================================
   05. INTERACTION SETTINGS HELPERS
   ========================================================= */

function normalizeInteractionSetting(value, fallback = '') {
  const normalized = normalizeString(value).toLowerCase();
  return normalized || fallback;
}

function syncInteractionSettings(detail = {}) {
  const values = detail.values && typeof detail.values === 'object'
    ? detail.values
    : detail;

  HOME_SURFACE_STATE.interaction = {
    responseMode: normalizeInteractionSetting(values.responseMode, HOME_SURFACE_STATE.interaction.responseMode),
    interactionStyle: normalizeInteractionSetting(values.interactionStyle, HOME_SURFACE_STATE.interaction.interactionStyle),
    stageEffects: normalizeInteractionSetting(values.stageEffects, HOME_SURFACE_STATE.interaction.stageEffects),
    stageText: normalizeInteractionSetting(values.stageText, HOME_SURFACE_STATE.interaction.stageText),
  };
}

/* =========================================================
   06. EVENT BINDING
   ========================================================= */

function bindHomeSurfaceStateEvents() {
  if (HOME_SURFACE_STATE.isBound) {
    return;
  }

  HOME_SURFACE_STATE.isBound = true;

  document.addEventListener('neuroartan:theme-ready', (event) => {
    syncThemeState(event?.detail?.theme || null);
    emitHomeSurfaceState();
  });

  document.addEventListener('neuroartan:theme-changed', (event) => {
    syncThemeState(event?.detail?.theme || null);
    emitHomeSurfaceState();
  });

  document.addEventListener('neuroartan:locale-state-changed', (event) => {
    syncLocaleState(event?.detail || null);
    emitHomeSurfaceState();
  });

  document.addEventListener('account:profile-state-changed', (event) => {
    syncSignedInAccountState(event?.detail || null);
    emitHomeSurfaceState();
  });

  document.addEventListener('account:profile-signed-out', () => {
    syncSignedOutAccountState();
    emitHomeSurfaceState();
  });

  document.addEventListener('neuroartan:home-stage-voice-mode', (event) => {
    syncVoiceMode(event?.detail?.mode || '');
    emitHomeSurfaceState();
  });

  document.addEventListener('neuroartan:home-stage-voice-transcript', (event) => {
    syncVoiceTranscript(event?.detail?.transcript || '');
    emitHomeSurfaceState();
  });

  document.addEventListener('neuroartan:home-stage-voice-response', (event) => {
    syncVoiceResponse(event?.detail?.response || '');
    emitHomeSurfaceState();
  });

  document.addEventListener('neuroartan:home-stage-voice-query-submitted', (event) => {
    syncVoiceQuery(event?.detail || {});
    emitHomeSurfaceState();
  });

  document.addEventListener('neuroartan:home-stage-query-routing', (event) => {
    syncVoiceRoute(event?.detail || {});
    emitHomeSurfaceState();
  });

  document.addEventListener('neuroartan:home-interaction-settings-changed', (event) => {
    syncInteractionSettings(event?.detail || {});
    emitHomeSurfaceState();
  });

  document.addEventListener('neuroartan:firebase-ready', () => {
    syncSignedInAccountState();
    emitHomeSurfaceState();
  });
}

/* =========================================================
   07. MODULE BOOT
   ========================================================= */

function bootHomeSurfaceState() {
  syncThemeState();
  syncLocaleState();
  syncSignedInAccountState();
  bindHomeSurfaceStateEvents();
  emitHomeSurfaceState();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootHomeSurfaceState, { once: true });
} else {
  bootHomeSurfaceState();
}
