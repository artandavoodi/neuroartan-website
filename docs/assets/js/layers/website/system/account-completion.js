/* =============================================================================
   00) FILE INDEX
   01) MODULE IMPORTS
   02) MODULE IDENTITY
   03) RUNTIME STATE
   04) CONSTANTS
   05) SUPABASE HELPERS
   06) FIREBASE HELPERS
   07) ROUTE AND DRAWER HELPERS
   08) FORM HELPERS
   09) FLOW STATE HELPERS
   09A) PENDING PROFILE STATE HELPERS
   10) ONBOARDING CONTEXT HELPERS
   11) ACCOUNT STORE HELPERS
   12) PROFILE RESOLUTION HELPERS
   13) PROFILE SURFACE EVENTS
   14) ACCOUNT FLOW HELPERS
   14A) BACKEND READINESS HELPERS
   15) USERNAME STATUS FLOW
   16) PROVIDER AUTH FLOW
   17) EMAIL AND PASSWORD SIGN-IN FLOW
   18) EMAIL ONBOARDING FLOW
   19) PHONE AND PASSWORD RECOVERY FLOW
   20) PROFILE SETUP FLOW
   21) AUTH STATE HANDLERS
   22) EVENT BINDING
   23) INITIALIZATION
   24) END OF FILE
============================================================================= */

/* =============================================================================
   01) MODULE IMPORTS
============================================================================= */
import {
  REQUIRED_PROFILE_FIELDS,
  assertUsernameAvailable,
  buildDisplayName,
  buildUsernameStatus,
  buildUsernameSuggestion,
  createUsernameError,
  evaluateEligibility,
  findProfileByUsername,
  getSupabaseProfileByAuthUserId,
  getSupabaseProfileByUsername,
  getSupabaseUsernameReservation,
  getUsernameAvailability,
  loadProfileIdentityPolicy,
  messageForUsernameError,
  normalizeEmail,
  normalizeGenderValue,
  normalizeString,
  normalizeUsername,
  reserveUsernameProfile,
  splitFullName,
  validateUsernameLocally
} from './account-profile-identity.js';
import {
  evaluateAccountPassword,
  loadAccountPasswordPolicy
} from './account-password-policy.js';
import {
  createPrivateBaselineProfile
} from './profile-save.js';

/* =============================================================================
   02) MODULE IDENTITY
============================================================================= */
/* /website/docs/assets/js/layers/website/system/account-completion.js */

(() => {
  'use strict';

  /* =============================================================================
     03) RUNTIME STATE
  ============================================================================= */
  const RUNTIME = (window.__NEUROARTAN_ACCOUNT_COMPLETION__ ||= {
    authBound: false,
    firebaseReadyBound: false,
    supabaseReadyBound: false,
    authSource: 'none',
    profileRequestId: 0,
    profileSaveInProgress: false,
    onboardingContext: {},
    lastProviderContext: {},
    usernameValidationRequestId: 0,
    usernameValidationTimer: null
  });

  /* =============================================================================
     04) CONSTANTS
  ============================================================================= */
  /* =============================================================================
     05) SUPABASE HELPERS
  ============================================================================= */
  function getSupabaseClient() {
    if (typeof window === 'undefined') return null;
    return window.neuroartanSupabase || null;
  }

  function hasSupabaseClient() {
    return !!getSupabaseClient();
  }

  async function getSupabaseSessionUser() {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    const { data, error } = await supabase.auth.getSession();
    if (error) {
      throw error;
    }

    return data?.session?.user || null;
  }

  async function getSupabaseSession() {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    const { data, error } = await supabase.auth.getSession();
    if (error) {
      throw error;
    }

    return data?.session || null;
  }

  function isSupabaseEmailVerificationPending(data = {}) {
    const session = data?.session || null;
    const user = data?.user || null;

    return !!(user && !session && !user?.email_confirmed_at);
  }

  async function getSupabaseProfile(authUserId) {
    const supabase = getSupabaseClient();
    const normalizedAuthUserId = normalizeString(authUserId);

    if (!supabase || !normalizedAuthUserId) return null;

    const { data, error } = await supabase
      .from(PROFILE_COLLECTION)
      .select('*')
      .eq('auth_user_id', normalizedAuthUserId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data || null;
  }

  async function resolveSupabaseEmailIdentity(identity) {
    const normalizedIdentity = normalizeString(identity);
    if (!normalizedIdentity) return '';

    if (normalizedIdentity.includes('@')) {
      return normalizeEmail(normalizedIdentity);
    }

    if (isPhoneIdentity(normalizedIdentity)) {
      return '';
    }

    const profile = await getSupabaseProfileByUsername({
      supabase: getSupabaseClient(),
      username: normalizedIdentity
    });

    return normalizeEmail(profile?.email || '');
  }

  function isSupabaseRelationMissingError(error) {
    const code = normalizeString(error?.code || '').toUpperCase();
    const message = normalizeString(error?.message || '').toLowerCase();

    return code === '42P01' || message.includes('does not exist');
  }

  async function assertSupabaseUsernameAvailable(values, existingProfile, user) {
    const supabase = getSupabaseClient();
    const normalizedUsername = normalizeUsername(values?.username || existingProfile?.username || '');
    if (!supabase || !normalizedUsername) return normalizedUsername;

    const currentAuthUserId = normalizeString(user?.id || user?.uid || '');
    const currentProfileId = normalizeString(existingProfile?.id || '');

    const conflictingProfile = await getSupabaseProfileByUsername({
      supabase,
      username: normalizedUsername
    });

    if (conflictingProfile) {
      const conflictingAuthUserId = normalizeString(conflictingProfile.auth_user_id || '');
      const conflictingProfileId = normalizeString(conflictingProfile.id || '');

      if (conflictingAuthUserId && currentAuthUserId && conflictingAuthUserId !== currentAuthUserId) {
        throw createUsernameError('USERNAME_TAKEN');
      }

      if (conflictingProfileId && currentProfileId && conflictingProfileId !== currentProfileId) {
        throw createUsernameError('USERNAME_TAKEN');
      }
    }

    try {
      const reservation = await getSupabaseUsernameReservation({
        supabase,
        username: normalizedUsername
      });

      if (!reservation) return normalizedUsername;

      const reservationAuthUserId = normalizeString(reservation.auth_user_id || reservation.owner_auth_user_id || '');
      const reservationProfileId = normalizeString(reservation.profile_id || reservation.owner_profile_id || '');

      if (reservationAuthUserId && currentAuthUserId && reservationAuthUserId !== currentAuthUserId) {
        throw createUsernameError('USERNAME_TAKEN');
      }

      if (reservationProfileId && currentProfileId && reservationProfileId !== currentProfileId) {
        throw createUsernameError('USERNAME_TAKEN');
      }
    } catch (error) {
      if (!isSupabaseRelationMissingError(error)) {
        throw error;
      }
    }

    return normalizedUsername;
  }
  const MODULE_ID = 'account-completion';
  const PROFILE_ROUTE = '/profile.html';
  const INDEX_ROUTE = '/';
  const PROFILE_ROUTE_MATCHERS = ['/profile.html', '/profile/'];
  const FLOW_STATE_STORAGE_KEY = 'neuroartan_account_flow_state';
  const PENDING_PROFILE_STORAGE_KEY = 'neuroartan_pending_profile_setup';
  const PROFILE_COLLECTION = 'profiles';
  const USERNAME_RESERVATION_COLLECTION = 'username_reservations';
  const USERNAME_CHANGE_EVENT = 'account:profile-setup-username-change';
  const USERNAME_STATUS_EVENT = 'account:profile-setup-username-status';
  const USERNAME_VALIDATION_DEBOUNCE_MS = 240;
  /* =============================================================================
     06) FIREBASE HELPERS
  ============================================================================= */
  function hasFirebaseAuth() {
    return !!(window.firebase && typeof window.firebase.auth === 'function');
  }

  function hasFirestore() {
    return !!(window.firebase && typeof window.firebase.firestore === 'function');
  }

  function getFirebaseAuth() {
    if (!hasFirebaseAuth()) return null;

    try {
      return window.firebase.auth();
    } catch (_) {
      return null;
    }
  }

  function getFirestore() {
    if (!hasFirestore()) return null;

    try {
      return window.firebase.firestore();
    } catch (_) {
      return null;
    }
  }

  async function waitForFirebaseReady(timeoutMs = 15000) {
    if (hasFirebaseAuth() && hasFirestore()) return true;

    return new Promise((resolve) => {
      let settled = false;

      const finish = (value) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeoutId);
        document.removeEventListener('neuroartan:firebase-ready', handleReady);
        resolve(value);
      };

      const handleReady = () => {
        finish(hasFirebaseAuth() && hasFirestore());
      };

      const timeoutId = window.setTimeout(() => {
        finish(false);
      }, timeoutMs);

      document.addEventListener('neuroartan:firebase-ready', handleReady);
    });
  }

  async function ensureFirebaseServices() {
    if (hasFirebaseAuth() && hasFirestore()) return true;
    return waitForFirebaseReady();
  }

  /* =============================================================================
     07) ROUTE AND DRAWER HELPERS
  ============================================================================= */
  function isProfileRoute(pathname = window.location.pathname) {
    return PROFILE_ROUTE_MATCHERS.some((route) => pathname.endsWith(route));
  }

  function isIndexRoute(pathname = window.location.pathname) {
    return pathname === INDEX_ROUTE || pathname.endsWith('/index.html');
  }

  function redirectToIndex() {
    window.location.href = INDEX_ROUTE;
  }

  function redirectToProfile() {
    window.location.href = PROFILE_ROUTE;
  }

  function requestGuestAccountEntry(detail = {}) {
    document.dispatchEvent(new CustomEvent('account-drawer:guest-entry', {
      detail: {
        source: detail.source || MODULE_ID,
        surface: detail.surface || 'entry'
      }
    }));
  }

  function hasAccountDrawer() {
    return !!document.querySelector('#account-drawer, [data-account-drawer="true"]');
  }

  function hasAccountDrawerMountCapability() {
    return !!document.querySelector('#account-drawer-mount, [data-include="account-drawer"], #account-drawer, [data-account-drawer="true"]');
  }

  function openProfileSetupDrawer(detail = {}) {
    document.dispatchEvent(new CustomEvent('account:profile-setup-open-request', {
      detail: {
        source: MODULE_ID,
        action: 'profile-setup',
        ...detail
      }
    }));

    document.dispatchEvent(new CustomEvent('account-drawer:open-request', {
      detail: {
        source: MODULE_ID,
        state: 'guest',
        surface: 'profile-setup',
        ...detail
      }
    }));
  }

  function openProfileSetupDrawerWhenReady(detail = {}) {
    if (hasAccountDrawer()) {
      openProfileSetupDrawer(detail);
      return true;
    }

    if (!hasAccountDrawerMountCapability()) {
      return false;
    }

    document.addEventListener('account-drawer:mounted', () => {
      openProfileSetupDrawer(detail);
    }, { once: true });

    return true;
  }

  /* =============================================================================
     08) FORM HELPERS
  ============================================================================= */
  function getFieldFromForm(form, selector) {
    if (!(form instanceof HTMLFormElement)) return null;
    return form.querySelector(selector);
  }

  function clearFieldError(field) {
    if (!field || typeof field.setCustomValidity !== 'function') return;
    field.setCustomValidity('');
  }

  function setFieldError(field, message) {
    if (!field || typeof field.setCustomValidity !== 'function') {
      if (message) {
        window.alert(message);
      }
      return;
    }

    field.setCustomValidity(message);
    field.reportValidity();

    const clear = () => {
      clearFieldError(field);
      field.removeEventListener('input', clear);
      field.removeEventListener('change', clear);
    };

    field.addEventListener('input', clear);
    field.addEventListener('change', clear);
  }

  function clearFormErrors(form) {
    if (!(form instanceof HTMLFormElement)) return;

    Array.from(form.elements).forEach((element) => {
      if (
        element instanceof HTMLInputElement
        || element instanceof HTMLSelectElement
        || element instanceof HTMLTextAreaElement
      ) {
        clearFieldError(element);
      }
    });
  }

  function setFormBusy(form, isBusy) {
    if (!(form instanceof HTMLFormElement)) return;

    form.dataset.accountBusy = isBusy ? 'true' : 'false';

    const controls = [
      ...Array.from(form.elements),
      ...Array.from(document.querySelectorAll(`[form="${form.id}"]`))
    ];

    controls.forEach((control) => {
      if (!(control instanceof HTMLElement)) return;
      if (!(control instanceof HTMLButtonElement || control instanceof HTMLInputElement || control instanceof HTMLSelectElement || control instanceof HTMLTextAreaElement)) return;

      if (isBusy) {
        control.dataset.accountWasDisabled = control.disabled ? 'true' : 'false';
        control.disabled = true;
        return;
      }

      const wasDisabled = control.dataset.accountWasDisabled === 'true';
      delete control.dataset.accountWasDisabled;
      control.disabled = wasDisabled;
    });
  }

  function isPhoneIdentity(value) {
    return /^\+?[0-9().\-\s]{7,}$/.test(normalizeString(value));
  }

  function getPrimaryProviderId(user) {
    const firebaseProviderId = user?.providerData?.find((entry) => entry?.providerId && entry.providerId !== 'firebase')?.providerId || '';
    const supabaseProviderId = normalizeString(
      user?.app_metadata?.provider
      || (Array.isArray(user?.app_metadata?.providers) ? user.app_metadata.providers[0] : '')
      || user?.identities?.[0]?.provider
      || ''
    );
    const providerId = firebaseProviderId || supabaseProviderId;

    switch (providerId) {
      case 'apple.com':
      case 'apple':
        return 'apple';
      case 'google.com':
      case 'google':
        return 'google';
      case 'password':
      case 'email':
        return 'email';
      case 'phone':
        return 'phone';
      default:
        return providerId ? providerId.replace('.com', '') : '';
    }
  }

  function mapFirebaseError(error, fallbackMessage) {
    const code = normalizeString(error?.code || '');
    const message = normalizeString(error?.message || '').toLowerCase();

    if (code.startsWith('auth/requests-from-referer-') || message.includes('requests-from-referer-')) {
      return `Firebase Auth is blocking ${window.location.origin}. Add this origin to the authorized domains or API referrer allowlist for neuroartan-core.`;
    }

    switch (code) {
      case 'auth/popup-closed-by-user':
      case 'auth/cancelled-popup-request':
        return '';
      case 'auth/account-exists-with-different-credential':
        return 'This email is already attached to a different sign-in method.';
      case 'auth/email-already-in-use':
        return 'This email address already has a Neuroartan account.';
      case 'auth/invalid-email':
        return 'Enter a valid email address.';
      case 'auth/invalid-login-credentials':
      case 'auth/user-not-found':
      case 'auth/wrong-password':
        return 'The email address or password is not correct.';
      case 'auth/weak-password':
        return 'Use a stronger password that satisfies the current password requirements.';
      case 'auth/too-many-requests':
        return 'Too many attempts were made. Please wait and try again.';
      case 'permission-denied':
      case 'unavailable':
        return 'Profile storage is not available right now.';
      default:
        return fallbackMessage;
    }
  }

  function isProfileStoreUnavailableError(error) {
    const code = normalizeString(error?.code || '');
    const message = normalizeString(error?.message || '');

    return (
      code === 'permission-denied'
      || code === 'unavailable'
      || message.includes('cloud firestore api has not been used')
      || message.includes('failed to get document because the client is offline')
      || message.includes('could not reach cloud firestore backend')
    );
  }

  /* =============================================================================
     09) FLOW STATE HELPERS
  ============================================================================= */
  function readFlowState() {
    try {
      const raw = window.sessionStorage.getItem(FLOW_STATE_STORAGE_KEY);
      if (!raw) {
        return {
          resolveProfile: false,
          redirectToProfile: false
        };
      }

      const parsed = JSON.parse(raw);
      return {
        resolveProfile: parsed?.resolveProfile === true,
        redirectToProfile: parsed?.redirectToProfile === true
      };
    } catch (_) {
      return {
        resolveProfile: false,
        redirectToProfile: false
      };
    }
  }

  function writeFlowState(nextState) {
    const normalized = {
      resolveProfile: !!nextState?.resolveProfile,
      redirectToProfile: !!nextState?.redirectToProfile
    };

    try {
      if (!normalized.resolveProfile && !normalized.redirectToProfile) {
        window.sessionStorage.removeItem(FLOW_STATE_STORAGE_KEY);
        return normalized;
      }

      window.sessionStorage.setItem(FLOW_STATE_STORAGE_KEY, JSON.stringify(normalized));
    } catch (_) {}

    return normalized;
  }

  function setFlowState(patch = {}) {
    const current = readFlowState();
    return writeFlowState({
      ...current,
      ...patch
    });
  }

  function clearFlowState() {
    return writeFlowState({
      resolveProfile: false,
      redirectToProfile: false
    });
  }

  /* =============================================================================
     09A) PENDING PROFILE STATE HELPERS
  ============================================================================= */
  function writePendingProfileState(values = {}) {
    const payload = {
      ...values,
      stored_at: new Date().toISOString(),
      source: MODULE_ID
    };

    try {
      window.sessionStorage.setItem(PENDING_PROFILE_STORAGE_KEY, JSON.stringify(payload));
    } catch (_) {}

    try {
      window.localStorage.setItem(PENDING_PROFILE_STORAGE_KEY, JSON.stringify(payload));
    } catch (_) {}

    return payload;
  }

  function readPendingProfileState() {
    const read = (storage) => {
      try {
        const raw = storage.getItem(PENDING_PROFILE_STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
      } catch (_) {
        return null;
      }
    };

    return read(window.sessionStorage) || read(window.localStorage) || null;
  }

  function clearPendingProfileState() {
    try {
      window.sessionStorage.removeItem(PENDING_PROFILE_STORAGE_KEY);
    } catch (_) {}

    try {
      window.localStorage.removeItem(PENDING_PROFILE_STORAGE_KEY);
    } catch (_) {}
  }

  /* =============================================================================
     10) ONBOARDING CONTEXT HELPERS
  ============================================================================= */
  function patchOnboardingContext(detail = {}) {
    const splitName = splitFullName(detail.name || detail.full_name || '');
    const nextContext = {
      ...RUNTIME.onboardingContext,
      method: normalizeString(detail.method || detail.provider || RUNTIME.onboardingContext.method || ''),
      provider: normalizeString(detail.provider || detail.method || RUNTIME.onboardingContext.provider || ''),
      email: normalizeEmail(detail.email || RUNTIME.onboardingContext.email || ''),
      phone: normalizeString(detail.phone || RUNTIME.onboardingContext.phone || ''),
      password: normalizeString(detail.password || RUNTIME.onboardingContext.password || ''),
      password_confirm: normalizeString(detail.password_confirm || detail.password || RUNTIME.onboardingContext.password_confirm || ''),
      first_name: normalizeString(detail.first_name || splitName.first_name || RUNTIME.onboardingContext.first_name || ''),
      last_name: normalizeString(detail.last_name || splitName.last_name || RUNTIME.onboardingContext.last_name || ''),
      display_name: normalizeString(detail.display_name || detail.name || detail.full_name || RUNTIME.onboardingContext.display_name || ''),
      username: normalizeUsername(detail.username || RUNTIME.onboardingContext.username || ''),
      date_of_birth: normalizeString(detail.date_of_birth || RUNTIME.onboardingContext.date_of_birth || ''),
      gender: normalizeString(detail.gender || RUNTIME.onboardingContext.gender || '')
    };

    nextContext.gender = normalizeGenderValue(nextContext.gender);
    RUNTIME.onboardingContext = nextContext;
    return nextContext;
  }

  function setLastProviderContext(values = {}) {
    RUNTIME.lastProviderContext = {
      ...values
    };
  }

  function clearOnboardingContext() {
    clearPendingProfileState();
    RUNTIME.onboardingContext = {};
    RUNTIME.lastProviderContext = {};
  }

  /* =============================================================================
     11) ACCOUNT STORE HELPERS
  ============================================================================= */
  async function getProfileByUid(uid) {
    const normalizedUid = normalizeString(uid);
    if (!normalizedUid) return null;

    const supabase = getSupabaseClient();
    if (supabase) {
      return getSupabaseProfile(normalizedUid);
    }

    const firestore = getFirestore();
    if (!firestore) return null;

    const snapshot = await firestore.collection(PROFILE_COLLECTION).doc(normalizedUid).get();
    if (!snapshot.exists) return null;
    return snapshot.data() || null;
  }

  async function resolveEmailIdentity(identity) {
    const normalizedIdentity = normalizeString(identity);
    if (!normalizedIdentity) return '';

    const supabase = getSupabaseClient();
    if (supabase) {
      return resolveSupabaseEmailIdentity(normalizedIdentity);
    }

    if (normalizedIdentity.includes('@')) {
      return normalizeEmail(normalizedIdentity);
    }

    if (isPhoneIdentity(normalizedIdentity)) {
      return '';
    }

    const profile = await findProfileByUsername({
      firestore: getFirestore(),
      username: normalizedIdentity,
      profileCollection: PROFILE_COLLECTION
    });

    return normalizeEmail(profile?.email || '');
  }

  /* =============================================================================
     12) PROFILE RESOLUTION HELPERS
  ============================================================================= */
  function isProfileComplete(profile) {
    if (!profile) return false;

    return REQUIRED_PROFILE_FIELDS.every((field) => {
      switch (field) {
        case 'username':
          return normalizeString(profile.username || profile.username_normalized || profile.username_lower);
        case 'date_of_birth':
          return normalizeString(profile.date_of_birth || profile.birth_date);
        default:
          return normalizeString(profile[field]);
      }
    });
  }

  function buildProfilePrefill(user, profile = null) {
    const providerContext = RUNTIME.lastProviderContext || {};
    const onboarding = RUNTIME.onboardingContext || {};
    const pending = readPendingProfileState() || {};
    const splitDisplayName = splitFullName(user?.displayName || user?.user_metadata?.full_name || user?.user_metadata?.name || providerContext.display_name || '');

    const values = {
      method: onboarding.method || pending.method || providerContext.method || getPrimaryProviderId(user),
      provider: onboarding.provider || pending.provider || providerContext.provider || getPrimaryProviderId(user),
      email: onboarding.email || pending.email || providerContext.email || normalizeEmail(profile?.email || user?.email || ''),
      first_name: profile?.first_name || onboarding.first_name || pending.first_name || providerContext.first_name || splitDisplayName.first_name || '',
      last_name: profile?.last_name || onboarding.last_name || pending.last_name || providerContext.last_name || splitDisplayName.last_name || '',
      display_name: profile?.display_name || onboarding.display_name || pending.display_name || providerContext.display_name || normalizeString(user?.displayName || user?.user_metadata?.full_name || user?.user_metadata?.name || ''),
      username: profile?.username || onboarding.username || pending.username || providerContext.username || '',
      password: onboarding.password || pending.password || '',
      password_confirm: onboarding.password_confirm || onboarding.password || pending.password_confirm || pending.password || '',
      date_of_birth: profile?.date_of_birth || profile?.birth_date || onboarding.date_of_birth || pending.date_of_birth || '',
      gender: normalizeGenderValue(profile?.gender || onboarding.gender || pending.gender || '')
    };

    values.username = buildUsernameSuggestion(values);
    values.display_name = buildDisplayName(values);

    return values;
  }

  /* =============================================================================
     13) PROFILE SURFACE EVENTS
  ============================================================================= */
  function emitProfileState(user, profile) {
    document.dispatchEvent(new CustomEvent('account:profile-state-changed', {
      detail: {
        user,
        profile: profile || null,
        profileComplete: isProfileComplete(profile)
      }
    }));
  }

  function emitSignedOutState() {
    document.dispatchEvent(new CustomEvent('account:profile-signed-out'));
  }

  function emitUsernameStatus(detail = {}) {
    document.dispatchEvent(new CustomEvent(USERNAME_STATUS_EVENT, {
      detail: {
        source: MODULE_ID,
        ...detail
      }
    }));
  }

  function emitProfileSetupSubmitStatus(detail = {}) {
    document.dispatchEvent(new CustomEvent('account:profile-setup-submit-status', {
      detail: {
        source: MODULE_ID,
        state: detail.state || 'idle',
        message: detail.message || ''
      }
    }));
  }

  function resetAccountSurfaces(reason = 'session-transition') {
    document.dispatchEvent(new CustomEvent('account:close-all', {
      detail: {
        source: MODULE_ID,
        reason
      }
    }));

    [
      'account-drawer:close-request',
      'account-sign-in-drawer:close-request',
      'account-sign-up-drawer:close-request',
      'account-email-auth-drawer:close-request',
      'account-phone-auth-drawer:close-request',
      'account-forgot-password-drawer:close-request',
      'account-provider-apple-sheet:close-request',
      'account-provider-google-sheet:close-request'
    ].forEach((eventName) => {
      document.dispatchEvent(new CustomEvent(eventName, {
        detail: {
          source: MODULE_ID,
          reason
        }
      }));
    });
  }

  /* =============================================================================
     14) ACCOUNT FLOW HELPERS
  ============================================================================= */
  async function ensureFirebaseReadyOrThrow() {
    const ready = await ensureFirebaseServices();
    if (!ready) {
      throw createUsernameError('FIREBASE_NOT_READY');
    }

    const auth = getFirebaseAuth();
    const firestore = getFirestore();
    if (!auth || !firestore) {
      throw createUsernameError('FIREBASE_NOT_READY');
    }

    return { auth, firestore };
  }

  /* =============================================================================
     14A) BACKEND READINESS HELPERS
  ============================================================================= */
  async function ensureAccountBackendReadyOrThrow() {
    const supabase = getSupabaseClient();
    if (supabase) {
      return {
        source: 'supabase',
        supabase
      };
    }

    const { auth, firestore } = await ensureFirebaseReadyOrThrow();
    return {
      source: 'firebase',
      auth,
      firestore
    };
  }

  async function maybeRedirectAfterCompleteProfile(user) {
    const flowState = readFlowState();

    if (!flowState.redirectToProfile) {
      return;
    }

    clearFlowState();

    if (!isProfileRoute()) {
      redirectToProfile();
      return;
    }

    try {
      emitProfileState(user, await getProfileByUid(user.id || user.uid));
    } catch (error) {
      emitProfileState(user, null);
      console.error('Profile redirect state refresh failed:', error);
    }
  }

  function maybeHandleIncompleteProfile(user, profile) {
    const flowState = readFlowState();
    if (!flowState.resolveProfile || RUNTIME.profileSaveInProgress) {
      emitProfileState(user, profile);
      return;
    }

    const prefill = buildProfilePrefill(user, profile);
    emitProfileState(user, profile);

    if (openProfileSetupDrawerWhenReady(prefill)) {
      return;
    }

    if (!isIndexRoute()) {
      redirectToIndex();
    }
  }

  async function updateFirebaseDisplayName(user, displayName) {
    const nextDisplayName = normalizeString(displayName);
    if (!user || !nextDisplayName || typeof user.updateProfile !== 'function') return;
    if (normalizeString(user.displayName) === nextDisplayName) return;

    await user.updateProfile({
      displayName: nextDisplayName,
      photoURL: user.photoURL || null
    });
  }

  /* =============================================================================
     15) USERNAME STATUS FLOW
  ============================================================================= */
  function requestUsernameAvailability(detail = {}) {
    const normalized = normalizeUsername(detail.username || detail.raw_username || '');
    const requestId = ++RUNTIME.usernameValidationRequestId;
    const currentUid = normalizeString(getFirebaseAuth()?.currentUser?.uid || '');

    window.clearTimeout(RUNTIME.usernameValidationTimer);

    loadProfileIdentityPolicy()
      .then((policy) => {
        if (requestId !== RUNTIME.usernameValidationRequestId) return;

        if (!normalized) {
          emitUsernameStatus({
            state: 'idle',
            normalized: '',
            message: buildUsernameStatus('idle', '', policy)
          });
          return;
        }

        const localValidation = validateUsernameLocally(normalized, policy);
        if (requestId !== RUNTIME.usernameValidationRequestId) return;

        if (!localValidation.ok) {
          emitUsernameStatus({
            state: localValidation.state,
            normalized: localValidation.normalized,
            message: localValidation.message
          });
          return;
        }

        emitUsernameStatus({
          state: 'checking',
          normalized: localValidation.normalized,
          message: localValidation.message
        });

        RUNTIME.usernameValidationTimer = window.setTimeout(async () => {
          try {
            const supabase = getSupabaseClient();

            if (supabase) {
              const sessionUser = await getSupabaseSessionUser();
              const availability = await getUsernameAvailability({
                supabase,
                username:localValidation.normalized,
                currentAuthUserId:sessionUser?.id || '',
                policy
              });

              if (requestId !== RUNTIME.usernameValidationRequestId) return;

              emitUsernameStatus({
                state:availability.state,
                normalized:availability.normalized,
                message:availability.message
              });
              return;
            }

            const firestore = getFirestore() || (await waitForFirebaseReady(1500) ? getFirestore() : null);
            const availability = await getUsernameAvailability({
              firestore,
              username: localValidation.normalized,
              currentUid,
              policy,
              profileCollection: PROFILE_COLLECTION,
              reservationCollection: USERNAME_RESERVATION_COLLECTION
            });

            if (requestId !== RUNTIME.usernameValidationRequestId) return;

            emitUsernameStatus({
              state: availability.state,
              normalized: availability.normalized,
              message: availability.message
            });
          } catch (error) {
            if (requestId !== RUNTIME.usernameValidationRequestId) return;

            console.error('Username availability check failed:', error);
            emitUsernameStatus({
              state: 'unavailable',
              normalized: localValidation.normalized,
              message: buildUsernameStatus('unavailable', localValidation.normalized, policy)
            });
          }
        }, USERNAME_VALIDATION_DEBOUNCE_MS);
      })
      .catch((error) => {
        console.error('Username policy load failed during validation:', error);
      });
  }

  /* =============================================================================
     16) PROVIDER AUTH FLOW
  ============================================================================= */
  async function handleProviderSubmit(detail = {}) {
    const provider = normalizeString(detail.provider || '');
    if (!provider) return;

    try {
      const supabase = getSupabaseClient();

      setFlowState({
        resolveProfile: true,
        redirectToProfile: true
      });

      if (supabase && (provider === 'google' || provider === 'apple')) {
        const redirectTo = `${window.location.origin}${PROFILE_ROUTE}`;

        await supabase.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo
          }
        });

        return;
      }

      const { auth } = await ensureFirebaseReadyOrThrow();
      let providerInstance = null;

      if (provider === 'google') {
        providerInstance = new window.firebase.auth.GoogleAuthProvider();
      }

      if (provider === 'apple') {
        providerInstance = new window.firebase.auth.OAuthProvider('apple.com');
        providerInstance.addScope?.('email');
        providerInstance.addScope?.('name');
      }

      if (!providerInstance) {
        throw createUsernameError('UNSUPPORTED_PROVIDER');
      }

      const result = await auth.signInWithPopup(providerInstance);
      const providerProfile = result?.additionalUserInfo?.profile || {};
      const splitName = splitFullName(result?.user?.displayName || providerProfile?.name || '');

      setLastProviderContext({
        method: provider,
        provider,
        email: normalizeEmail(result?.user?.email || providerProfile?.email || ''),
        first_name: providerProfile?.given_name || splitName.first_name || '',
        last_name: providerProfile?.family_name || splitName.last_name || '',
        display_name: normalizeString(result?.user?.displayName || providerProfile?.name || ''),
        username: buildUsernameSuggestion({
          email: result?.user?.email || providerProfile?.email || '',
          display_name: result?.user?.displayName || providerProfile?.name || ''
        })
      });

      if (result?.user) {
        await handleSignedInState(result.user);
      }
    } catch (error) {
      clearFlowState();
      const message = mapFirebaseError(error, `Unable to continue with ${provider} right now.`);
      if (!message) return;
      window.alert(message);
      console.error('Provider auth error:', error);
    }
  }

  /* =============================================================================
     17) EMAIL AND PASSWORD SIGN-IN FLOW
  ============================================================================= */
  async function handleSignInSubmit(detail = {}) {
    const form = detail.form instanceof HTMLFormElement
      ? detail.form
      : document.querySelector('[data-account-sign-in-form="true"]');

    if (!(form instanceof HTMLFormElement)) return;

    const identityField = getFieldFromForm(form, '#account-sign-in-identity');
    const passwordField = getFieldFromForm(form, '#account-sign-in-password');
    const identity = normalizeString(identityField?.value || '');
    const password = normalizeString(passwordField?.value || '');

    clearFormErrors(form);

    if (!identity) {
      setFieldError(identityField, 'Enter your email or username.');
      return;
    }

    if (!password) {
      setFieldError(passwordField, 'Enter your password.');
      return;
    }

    if (isPhoneIdentity(identity) && !identity.includes('@')) {
      setFieldError(identityField, 'Phone sign-in is not live yet. Use your email address for now.');
      return;
    }

    setFormBusy(form, true);

    try {
      const email = await resolveEmailIdentity(identity);

      if (!email) {
        setFieldError(identityField, 'Use your email address or an existing username.');
        return;
      }

      setFlowState({
        resolveProfile: true,
        redirectToProfile: true
      });

      const supabase = getSupabaseClient();
      if (supabase) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (error) {
          throw error;
        }

        if (data?.user) {
          await handleSignedInState(data.user);
        }
        return;
      }

      const { auth } = await ensureFirebaseReadyOrThrow();
      const credential = await auth.signInWithEmailAndPassword(email, password);
      if (credential?.user) {
        await handleSignedInState(credential.user);
      }
    } catch (error) {
      clearFlowState();
      const message = mapFirebaseError(error, 'Unable to sign in right now.');
      if (message) {
        setFieldError(passwordField || identityField, message);
      }
      console.error('Email sign-in error:', error);
    } finally {
      setFormBusy(form, false);
    }
  }

  /* =============================================================================
     18) EMAIL ONBOARDING FLOW
  ============================================================================= */
  function handleEmailOnboardingRequest(detail = {}) {
    const email = normalizeEmail(detail.email || '');
    if (!email) return;

    patchOnboardingContext({
      ...detail,
      method: 'email',
      provider: 'email',
      email
    });

    setFlowState({
      resolveProfile: true,
      redirectToProfile: true
    });
  }

  /* =============================================================================
     19) PHONE AND PASSWORD RECOVERY FLOW
  ============================================================================= */
  function handlePhoneAuthRequest(detail = {}) {
    const form = document.querySelector('[data-account-phone-auth-form="true"]');
    const phoneField = form instanceof HTMLFormElement
      ? getFieldFromForm(form, '#account-phone-auth-number')
      : null;

    setFieldError(phoneField, 'Phone authentication is not live yet.');
    console.warn('Phone auth request is not implemented:', detail);
  }

  async function handleForgotPasswordSubmit(detail = {}) {
    const form = document.querySelector('[data-account-forgot-password-form="true"]');
    const emailField = form instanceof HTMLFormElement
      ? getFieldFromForm(form, '#account-forgot-password-email')
      : null;
    const email = normalizeEmail(detail.email || emailField?.value || '');

    if (!(form instanceof HTMLFormElement)) return;

    clearFormErrors(form);

    if (!email) {
      setFieldError(emailField, 'Enter the email address for your account.');
      return;
    }

    setFormBusy(form, true);

    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}${PROFILE_ROUTE}`
        });

        if (error) {
          throw error;
        }

        form.reset();
        return;
      }

      const { auth } = await ensureFirebaseReadyOrThrow();
      await auth.sendPasswordResetEmail(email);
      form.reset();
    } catch (error) {
      const message = mapFirebaseError(error, 'Unable to send a reset link right now.');
      if (message) {
        setFieldError(emailField, message);
      }
      console.error('Forgot password error:', error);
    } finally {
      setFormBusy(form, false);
    }
  }

  /* =============================================================================
     20) PROFILE SETUP FLOW
  ============================================================================= */
  async function handleProfileSetupSubmit(detail = {}) {
    const form = document.querySelector('[data-account-profile-setup-form="true"]');
    const usernameField = form instanceof HTMLFormElement
      ? getFieldFromForm(form, '#account-profile-setup-username')
      : null;
    const firstNameField = form instanceof HTMLFormElement
      ? getFieldFromForm(form, '#account-profile-setup-first-name')
      : null;
    const lastNameField = form instanceof HTMLFormElement
      ? getFieldFromForm(form, '#account-profile-setup-last-name')
      : null;
    const displayNameField = form instanceof HTMLFormElement
      ? getFieldFromForm(form, '#account-profile-setup-display-name')
      : null;
    const passwordField = form instanceof HTMLFormElement
      ? getFieldFromForm(form, '#account-profile-setup-password')
      : null;
    const passwordConfirmField = form instanceof HTMLFormElement
      ? getFieldFromForm(form, '#account-profile-setup-password-confirm')
      : null;
    const dateOfBirthField = form instanceof HTMLFormElement
      ? (
          getFieldFromForm(form, '[data-account-profile-setup-date-control="year"]')
          || getFieldFromForm(form, '#account-profile-setup-date-of-birth')
        )
      : null;
    if (!(form instanceof HTMLFormElement)) return;

    clearFormErrors(form);

    const [policy, passwordPolicy] = await Promise.all([
      loadProfileIdentityPolicy(),
      loadAccountPasswordPolicy()
    ]);
    const context = patchOnboardingContext(detail);
    const auth = getFirebaseAuth();
    const currentUser = auth?.currentUser || null;
    const supabase = getSupabaseClient();
    const supabaseSessionUser = supabase ? await getSupabaseSessionUser() : null;
    const activeUser = supabaseSessionUser || currentUser || null;
    const method = normalizeString(detail.method || context.method || getPrimaryProviderId(activeUser));
    const firstName = normalizeString(detail.first_name || context.first_name || '');
    const lastName = normalizeString(detail.last_name || context.last_name || '');
    const values = {
      method,
      auth_provider: method || getPrimaryProviderId(activeUser) || 'email',
      email: normalizeEmail(detail.email || context.email || activeUser?.email || activeUser?.user_metadata?.email || ''),
      username: normalizeUsername(detail.username || context.username || ''),
      first_name: firstName,
      last_name: lastName,
      display_name: buildDisplayName({
        display_name: detail.display_name || context.display_name || activeUser?.user_metadata?.full_name || activeUser?.user_metadata?.name || '',
        first_name: firstName,
        last_name: lastName
      }),
      password: normalizeString(detail.password || context.password || ''),
      password_confirm: normalizeString(detail.password_confirm || context.password_confirm || detail.password || context.password || ''),
      date_of_birth: normalizeString(detail.date_of_birth || context.date_of_birth || ''),
      gender: normalizeGenderValue(detail.gender || context.gender || '')
    };

    writePendingProfileState(values);

    patchOnboardingContext({
      ...context,
      ...values,
      display_name: values.display_name,
      first_name: values.first_name,
      last_name: values.last_name,
      username: values.username,
      date_of_birth: values.date_of_birth,
      gender: values.gender
    });

    if (!values.username) {
      setFieldError(usernameField, 'Choose a username.');
      return;
    }

    if (!values.first_name) {
      setFieldError(firstNameField, 'Enter your first name.');
      return;
    }

    if (!values.last_name) {
      setFieldError(lastNameField, 'Enter your last name.');
      return;
    }

    if (!values.display_name) {
      setFieldError(displayNameField, 'Enter a display name.');
      return;
    }

    if (!values.date_of_birth) {
      setFieldError(dateOfBirthField, 'Enter your date of birth.');
      return;
    }

    const localUsernameValidation = validateUsernameLocally(values.username, policy);
    if (!localUsernameValidation.ok) {
      emitUsernameStatus({
        state: localUsernameValidation.state,
        normalized: localUsernameValidation.normalized,
        message: localUsernameValidation.message
      });
      setFieldError(usernameField, messageForUsernameError(localUsernameValidation.code, policy));
      return;
    }

    const eligibility = evaluateEligibility(values.date_of_birth, policy);
    if (!eligibility.eligible) {
      const dateOfBirthMessage = eligibility.reason === 'USER_INELIGIBLE'
        ? `You must be at least ${eligibility.minimumAge} years old to create a Neuroartan account.`
        : 'Enter a valid date of birth.';

      setFieldError(dateOfBirthField, dateOfBirthMessage);
      return;
    }

    if (method === 'email' && !activeUser) {
      if (!values.email) {
        setFieldError(firstNameField, 'Email onboarding lost context. Start again from Continue with email.');
        return;
      }

      if (!values.password) {
        setFieldError(passwordField, 'Create a password.');
        return;
      }

      const passwordEvaluation = evaluateAccountPassword(values.password, passwordPolicy);
      if (!passwordEvaluation.ok) {
        setFieldError(passwordField, passwordEvaluation.message);
        return;
      }

      if (values.password !== values.password_confirm) {
        setFieldError(passwordConfirmField, 'Passwords do not match.');
        return;
      }
    }

    setFormBusy(form, true);
    RUNTIME.profileSaveInProgress = true;
    emitProfileSetupSubmitStatus({
      state: 'saving',
      message: 'Creating your account and profile…'
    });

    await ensureAccountBackendReadyOrThrow();

    try {
      let user = activeUser;
      let firestore = getFirestore();

      if (supabase) {
        const currentSession = await getSupabaseSession();
        user = currentSession?.user || user;

        if (method === 'email' && !user) {
          const { data, error } = await supabase.auth.signUp({
            email: values.email,
            password: values.password,
            options: {
              emailRedirectTo: `${window.location.origin}${PROFILE_ROUTE}`
            }
          });

          if (error) {
            throw error;
          }

          if (isSupabaseEmailVerificationPending(data)) {
            writePendingProfileState(values);
            setFlowState({
              resolveProfile: true,
              redirectToProfile: true
            });
            emitProfileSetupSubmitStatus({
              state: 'success',
              message: 'Check your email to verify your account. Your profile setup details are saved locally for completion after verification.'
            });
            return;
          }

          user = data?.session?.user || data?.user || null;
        }

        if (!user) {
          throw createUsernameError('AUTHENTICATED_USER_REQUIRED');
        }

        const activeSession = await getSupabaseSession();
        const authenticatedUser = activeSession?.user || null;

        if (!authenticatedUser?.id) {
          if (method === 'email') {
            throw createUsernameError('EMAIL_VERIFICATION_REQUIRED');
          }

          throw createUsernameError('AUTHENTICATED_USER_REQUIRED');
        }

        user = authenticatedUser;

        const existingProfile = await getSupabaseProfileByAuthUserId({
          supabase,
          authUserId: user.id || user.uid
        });

        await assertSupabaseUsernameAvailable(values, existingProfile, user);

        const profile = await createPrivateBaselineProfile({
          values:{
            ...values,
            eligibility_age_years:eligibility.ageYears,
            minimum_eligible_age_years:eligibility.minimumAge
          },
          existingProfile,
          user,
          policy,
          supabase
        });

        emitUsernameStatus({
          state: 'available',
          normalized: values.username,
          message: buildUsernameStatus('available', values.username, policy)
        });

        clearPendingProfileState();
        clearOnboardingContext();
        setFlowState({
          resolveProfile: true,
          redirectToProfile: true
        });
        emitProfileSetupSubmitStatus({
          state: 'success',
          message: 'Profile created. Opening your private profile.'
        });
        emitProfileState(user, profile || existingProfile || null);
        await maybeRedirectAfterCompleteProfile(user);
        return;
      }

      const readyServices = await ensureFirebaseReadyOrThrow();
      const authInstance = readyServices.auth;
      firestore = readyServices.firestore;
      user = authInstance.currentUser || user;

      await assertUsernameAvailable({
        firestore,
        username: values.username,
        currentUid: user?.uid || '',
        policy,
        profileCollection: PROFILE_COLLECTION,
        reservationCollection: USERNAME_RESERVATION_COLLECTION
      });

      if (method === 'email' && !user) {
        const credential = await authInstance.createUserWithEmailAndPassword(values.email, values.password);
        user = credential.user || null;
      }

      if (!user) {
        throw createUsernameError('AUTHENTICATED_USER_REQUIRED');
      }

      await assertUsernameAvailable({
        firestore,
        username: values.username,
        currentUid: user.uid,
        policy,
        profileCollection: PROFILE_COLLECTION,
        reservationCollection: USERNAME_RESERVATION_COLLECTION
      });

      await updateFirebaseDisplayName(user, values.display_name);

      const savedProfile = await reserveUsernameProfile({
        firestore,
        firebaseNamespace: window.firebase,
        user,
        values: {
          ...values,
          eligibility_age_years: eligibility.ageYears,
          minimum_eligible_age_years: eligibility.minimumAge
        },
        policy,
        profileCollection: PROFILE_COLLECTION,
        reservationCollection: USERNAME_RESERVATION_COLLECTION
      });

      emitUsernameStatus({
        state: 'available',
        normalized: values.username,
        message: buildUsernameStatus('available', values.username, policy)
      });

      clearPendingProfileState();
      clearOnboardingContext();
      clearFlowState();
      emitProfileState(user, savedProfile);
      emitProfileSetupSubmitStatus({
        state: 'success',
        message: 'Profile created. Opening your private profile…'
      });
      redirectToProfile();
    } catch (error) {
      const usernameCode = normalizeString(error?.code || error?.message || '');

      if (
        usernameCode === 'USERNAME_INVALID'
        || usernameCode === 'USERNAME_RESERVED'
        || usernameCode === 'USERNAME_RESTRICTED'
        || usernameCode === 'USERNAME_TAKEN'
        || usernameCode === 'USERNAME_CHANGE_LOCKED'
        || usernameCode === 'PROFILE_STORE_UNAVAILABLE'
        || usernameCode === 'EMAIL_VERIFICATION_REQUIRED'
      ) {
        const state = usernameCode === 'USERNAME_INVALID'
          ? 'invalid-format'
          : usernameCode === 'USERNAME_RESERVED'
            ? 'reserved'
            : usernameCode === 'USERNAME_RESTRICTED'
              ? 'restricted'
              : 'unavailable';

        emitUsernameStatus({
          state,
          normalized: values.username,
          message: buildUsernameStatus(state, values.username, policy)
        });
        const usernameMessage = usernameCode === 'EMAIL_VERIFICATION_REQUIRED'
          ? 'Verify your email first, then sign in again to complete your profile.'
          : messageForUsernameError(usernameCode, policy);
        emitProfileSetupSubmitStatus({
          state: 'error',
          message: usernameMessage
        });
        setFieldError(usernameField, usernameMessage);
      } else if (isProfileStoreUnavailableError(error)) {
        emitUsernameStatus({
          state: 'unavailable',
          normalized: values.username,
          message: buildUsernameStatus('unavailable', values.username, policy)
        });
        const unavailableMessage = 'Profile storage is not available right now. Please try again shortly.';
        emitProfileSetupSubmitStatus({
          state: 'error',
          message: unavailableMessage
        });
        setFieldError(usernameField, unavailableMessage);
      } else {
        const supabaseMessage = normalizeString(error?.message || '').toLowerCase();
        const message = supabaseMessage.includes('row-level security')
          ? 'Profile creation is blocked by backend access policy right now.'
          : mapFirebaseError(error, 'Unable to complete profile setup right now.');
        emitProfileSetupSubmitStatus({
          state: 'error',
          message
        });
        setFieldError(usernameField, message);
      }

      console.error('Profile setup error:', error);
    } finally {
      RUNTIME.profileSaveInProgress = false;
      setFormBusy(form, false);
    }
  }

  /* =============================================================================
     21) AUTH STATE HANDLERS
  ============================================================================= */
  async function handleSignedInState(user) {
    const requestId = ++RUNTIME.profileRequestId;
    resetAccountSurfaces('signed-in');

    try {
      const profile = await getProfileByUid(user.id || user.uid);
      if (requestId !== RUNTIME.profileRequestId) return;

      if (isProfileComplete(profile)) {
        emitProfileState(user, profile);
        await maybeRedirectAfterCompleteProfile(user);
        clearOnboardingContext();
        return;
      }

      maybeHandleIncompleteProfile(user, profile);
    } catch (error) {
      if (requestId !== RUNTIME.profileRequestId) return;
      if (readFlowState().resolveProfile && isProfileStoreUnavailableError(error)) {
        maybeHandleIncompleteProfile(user, null);
        return;
      }

      emitProfileState(user, null);
      console.error('Profile lookup error:', error);
    }
  }

  function handleSignedOutState() {
    ++RUNTIME.profileRequestId;
    clearOnboardingContext();
    clearFlowState();
    resetAccountSurfaces('signed-out');
    RUNTIME.authSource = 'none';
    emitSignedOutState();
  }

  function bindAuthState() {
    const supabase = getSupabaseClient();
    if (supabase) {
      if (RUNTIME.authSource === 'supabase') return;

      RUNTIME.authBound = true;
      RUNTIME.authSource = 'supabase';

      supabase.auth.getSession()
        .then(({ data }) => {
          const user = data?.session?.user || null;

          if (user) {
            void handleSignedInState(user);
            return;
          }

          handleSignedOutState();
        })
        .catch(() => {
          handleSignedOutState();
        });

      supabase.auth.onAuthStateChange((_event, session) => {
        const user = session?.user || null;

        if (user) {
          void handleSignedInState(user);
          return;
        }

        handleSignedOutState();
      });

      return;
    }

    if (RUNTIME.authBound && RUNTIME.authSource === 'firebase') return;

    const auth = getFirebaseAuth();
    if (!auth) return;

    RUNTIME.authBound = true;
    RUNTIME.authSource = 'firebase';

    auth.onAuthStateChanged((user) => {
      if (user) {
        void handleSignedInState(user);
        return;
      }

      handleSignedOutState();
    });
  }

  /* =============================================================================
     22) EVENT BINDING
  ============================================================================= */
  function bindSupabaseReadyEvents() {
    if (RUNTIME.supabaseReadyBound) return;
    RUNTIME.supabaseReadyBound = true;

    window.addEventListener('neuroartan:supabase-ready', () => {
      RUNTIME.authBound = false;
      RUNTIME.authSource = 'none';
      bindAuthState();
    });
  }

  function bindFirebaseReadyEvents() {
    if (RUNTIME.firebaseReadyBound) return;
    RUNTIME.firebaseReadyBound = true;

    document.addEventListener('neuroartan:firebase-ready', () => {
      RUNTIME.authBound = false;
      RUNTIME.authSource = 'none';
      bindAuthState();
    });
  }

  function bindAccountEvents() {
    document.addEventListener('account:entry-request', async (event) => {
      const detail = event instanceof CustomEvent ? event.detail || {} : {};
      const firebaseUser = getFirebaseAuth()?.currentUser || null;

      if (firebaseUser) {
        if (isProfileRoute()) {
          document.dispatchEvent(new CustomEvent('profile:navigate-request', {
            detail: {
              section: 'overview'
            }
          }));
          return;
        }

        redirectToProfile();
        return;
      }

      try {
        const supabaseUser = await getSupabaseSessionUser();

        if (supabaseUser) {
          if (isProfileRoute()) {
            document.dispatchEvent(new CustomEvent('profile:navigate-request', {
              detail: {
                section: 'overview'
              }
            }));
            return;
          }

          redirectToProfile();
          return;
        }
      } catch (error) {
        console.error('Supabase account entry resolution failed:', error);
      }

      requestGuestAccountEntry(detail);
    });

    document.addEventListener('account:provider-submit', (event) => {
      const detail = event instanceof CustomEvent ? event.detail || {} : {};
      void handleProviderSubmit(detail);
    });

    document.addEventListener('account-sign-in:submit-request', (event) => {
      const detail = event instanceof CustomEvent ? event.detail || {} : {};
      void handleSignInSubmit(detail);
    });

    document.addEventListener('account:profile-setup-open-request', (event) => {
      const detail = event instanceof CustomEvent ? event.detail || {} : {};
      patchOnboardingContext(detail);
      setFlowState({
        resolveProfile: true,
        redirectToProfile: true
      });
    });

    document.addEventListener('account:profile-setup-submit', (event) => {
      const detail = event instanceof CustomEvent ? event.detail || {} : {};
      void handleProfileSetupSubmit(detail);
    });

    document.addEventListener('account:forgot-password-submit', (event) => {
      const detail = event instanceof CustomEvent ? event.detail || {} : {};
      void handleForgotPasswordSubmit(detail);
    });

    document.addEventListener('account:phone-auth-submit-request', (event) => {
      const detail = event instanceof CustomEvent ? event.detail || {} : {};
      handlePhoneAuthRequest(detail);
    });

    document.addEventListener(USERNAME_CHANGE_EVENT, (event) => {
      const detail = event instanceof CustomEvent ? event.detail || {} : {};
      requestUsernameAvailability(detail);
    });

    document.addEventListener('account:sign-out-request', async () => {
      try {
        const supabase = getSupabaseClient();
        if (supabase) {
          const { error } = await supabase.auth.signOut();
          if (error) {
            throw error;
          }
        } else {
          const auth = getFirebaseAuth();
          if (!auth) return;
          await auth.signOut();
        }

        clearOnboardingContext();
        clearFlowState();
        if (!isIndexRoute()) {
          redirectToIndex();
        }
      } catch (error) {
        console.error('Sign-out error:', error);
      }
    });

    document.addEventListener('account:profile-setup-skip', () => {
      clearOnboardingContext();
      clearFlowState();
    });

    document.addEventListener('account:profile-refresh-request', async () => {
      const firebaseUser = getFirebaseAuth()?.currentUser || null;
      if (firebaseUser) {
        void handleSignedInState(firebaseUser);
        return;
      }

      try {
        const supabaseUser = await getSupabaseSessionUser();
        if (!supabaseUser) return;
        void handleSignedInState(supabaseUser);
      } catch (error) {
        console.error('Supabase profile refresh failed:', error);
      }
    });

    document.addEventListener('submit', (event) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) return;

      if (form.matches('[data-account-sign-up-form="true"]')) {
        const nameField = getFieldFromForm(form, '#account-sign-up-name');
        const emailField = getFieldFromForm(form, '#account-sign-up-email');
        const passwordField = getFieldFromForm(form, '#account-sign-up-password');

        patchOnboardingContext({
          method: 'email',
          provider: 'email',
          name: normalizeString(nameField?.value || ''),
          email: normalizeEmail(emailField?.value || ''),
          password: normalizeString(passwordField?.value || ''),
          password_confirm: normalizeString(passwordField?.value || '')
        });
      }

      if (form.matches('[data-account-email-auth-form="true"]')) {
        const emailField = getFieldFromForm(form, '#account-email-auth-email');
        handleEmailOnboardingRequest({
          method: 'email',
          provider: 'email',
          email: normalizeEmail(emailField?.value || '')
        });
      }
    });
  }

  /* =============================================================================
     23) INITIALIZATION
  ============================================================================= */
  function boot() {
    void loadProfileIdentityPolicy()
      .then((policy) => {
        emitUsernameStatus({
          state: 'idle',
          normalized: '',
          message: buildUsernameStatus('idle', '', policy)
        });
      })
      .catch((error) => {
        console.error('Profile identity policy boot load failed:', error);
      });

    bindSupabaseReadyEvents();
    bindFirebaseReadyEvents();
    bindAccountEvents();
    bindAuthState();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();

/* =============================================================================
   24) END OF FILE
============================================================================= */
