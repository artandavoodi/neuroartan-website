/* =============================================================================
   00) FILE INDEX
   01) MODULE IDENTITY
   02) RUNTIME STATE
   03) CONSTANTS
   04) FIREBASE HELPERS
   05) ROUTE AND DRAWER HELPERS
   06) FORM AND FIELD HELPERS
   07) NORMALIZATION HELPERS
   08) FLOW STATE HELPERS
   09) ONBOARDING CONTEXT HELPERS
   10) PROFILE STORE HELPERS
   11) PROFILE RESOLUTION HELPERS
   12) PROFILE SURFACE EVENTS
   13) ACCOUNT FLOW HELPERS
   14) PROVIDER AUTH FLOW
   15) EMAIL AND PASSWORD SIGN-IN FLOW
   16) EMAIL ONBOARDING FLOW
   17) PHONE AUTH FLOW
   18) FORGOT PASSWORD FLOW
   19) PROFILE SETUP FLOW
   20) AUTH STATE HANDLERS
   21) EVENT BINDING
   22) INITIALIZATION
   23) END OF FILE
============================================================================= */

/* =============================================================================
   01) MODULE IDENTITY
============================================================================= */
/* /website/docs/assets/js/layers/website/system/account-completion.js */

(() => {
  'use strict';

  /* =============================================================================
     02) RUNTIME STATE
  ============================================================================= */
  const RUNTIME = (window.__NEUROARTAN_ACCOUNT_COMPLETION__ ||= {
    authBound: false,
    firebaseReadyBound: false,
    profileRequestId: 0,
    profileSaveInProgress: false,
    onboardingContext: {},
    lastProviderContext: {}
  });

  /* =============================================================================
     03) CONSTANTS
  ============================================================================= */
  const MODULE_ID = 'account-completion';
  const PROFILE_ROUTE = '/profile.html';
  const INDEX_ROUTE = '/';
  const PROFILE_ROUTE_MATCHERS = ['/profile.html', '/profile/'];
  const FLOW_STATE_STORAGE_KEY = 'neuroartan_account_flow_state';
  const PROFILE_COLLECTION = 'profiles';
  const REQUIRED_PROFILE_FIELDS = ['username', 'first_name', 'last_name', 'display_name', 'date_of_birth'];

  /* =============================================================================
     04) FIREBASE HELPERS
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
     05) ROUTE AND DRAWER HELPERS
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
     06) FORM AND FIELD HELPERS
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

  /* =============================================================================
     07) NORMALIZATION HELPERS
  ============================================================================= */
  function normalizeString(value) {
    return String(value || '').trim();
  }

  function normalizeEmail(value) {
    return normalizeString(value).toLowerCase();
  }

  function normalizeUsername(value) {
    const raw = normalizeString(value).toLowerCase();

    return raw
      .replace(/[^a-z0-9_-]+/g, '-')
      .replace(/-{2,}/g, '-')
      .replace(/^[-_]+|[-_]+$/g, '');
  }

  function isPhoneIdentity(value) {
    return /^\+?[0-9().\-\s]{7,}$/.test(normalizeString(value));
  }

  function splitFullName(value) {
    const normalized = normalizeString(value);
    if (!normalized) {
      return {
        first_name: '',
        last_name: ''
      };
    }

    const parts = normalized.split(/\s+/).filter(Boolean);
    if (parts.length === 1) {
      return {
        first_name: parts[0],
        last_name: ''
      };
    }

    return {
      first_name: parts[0],
      last_name: parts.slice(1).join(' ')
    };
  }

  function buildUsernameSuggestion(values = {}) {
    const explicit = normalizeUsername(values.username || '');
    if (explicit) return explicit;

    const email = normalizeEmail(values.email || '');
    const emailStem = normalizeUsername(email.split('@')[0] || '');
    if (emailStem) return emailStem;

    const displayName = normalizeUsername(values.display_name || '');
    if (displayName) return displayName;

    const combined = normalizeUsername(`${values.first_name || ''}-${values.last_name || ''}`);
    if (combined) return combined;

    return '';
  }

  function buildDisplayName(values = {}) {
    return normalizeString(
      values.display_name
      || `${values.first_name || ''} ${values.last_name || ''}`.trim()
      || values.name
      || ''
    );
  }

  function getPrimaryProviderId(user) {
    const providerId = user?.providerData?.find((entry) => entry?.providerId && entry.providerId !== 'firebase')?.providerId || '';

    switch (providerId) {
      case 'google.com':
        return 'google';
      case 'apple.com':
        return 'apple';
      case 'password':
        return 'email';
      case 'phone':
        return 'phone';
      default:
        return providerId ? providerId.replace('.com', '') : '';
    }
  }

  function mapFirebaseError(error, fallbackMessage) {
    const code = normalizeString(error?.code || '');

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
        return 'Use a stronger password with at least 6 characters.';
      case 'auth/too-many-requests':
        return 'Too many attempts were made. Please wait and try again.';
      case 'permission-denied':
        return 'Profile storage is not available with the current Firebase rules.';
      default:
        return fallbackMessage;
    }
  }

  /* =============================================================================
     08) FLOW STATE HELPERS
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
     09) ONBOARDING CONTEXT HELPERS
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

    RUNTIME.onboardingContext = nextContext;
    return nextContext;
  }

  function setLastProviderContext(values = {}) {
    RUNTIME.lastProviderContext = {
      ...values
    };
  }

  function clearOnboardingContext() {
    RUNTIME.onboardingContext = {};
    RUNTIME.lastProviderContext = {};
  }

  /* =============================================================================
     10) PROFILE STORE HELPERS
  ============================================================================= */
  async function getProfileByUid(uid) {
    const firestore = getFirestore();
    if (!firestore || !uid) return null;

    const snapshot = await firestore.collection(PROFILE_COLLECTION).doc(uid).get();
    if (!snapshot.exists) return null;
    return snapshot.data() || null;
  }

  async function getProfileByUsername(username) {
    const firestore = getFirestore();
    const normalizedUsername = normalizeUsername(username);
    if (!firestore || !normalizedUsername) return null;

    const snapshot = await firestore
      .collection(PROFILE_COLLECTION)
      .where('username_lower', '==', normalizedUsername)
      .limit(1)
      .get();

    if (snapshot.empty) return null;
    return snapshot.docs[0]?.data() || null;
  }

  async function assertUsernameAvailable(username, currentUid) {
    const firestore = getFirestore();
    const normalizedUsername = normalizeUsername(username);
    if (!firestore || !normalizedUsername) return;

    const snapshot = await firestore
      .collection(PROFILE_COLLECTION)
      .where('username_lower', '==', normalizedUsername)
      .limit(1)
      .get();

    if (snapshot.empty) return;

    const conflicting = snapshot.docs.find((doc) => doc.id !== currentUid);
    if (conflicting) {
      throw new Error('USERNAME_TAKEN');
    }
  }

  async function saveProfile(user, values, existingProfile = null) {
    const firestore = getFirestore();
    const fieldValue = window.firebase?.firestore?.FieldValue;
    if (!firestore || !user?.uid) {
      throw new Error('PROFILE_STORE_UNAVAILABLE');
    }

    const timestamp = typeof fieldValue?.serverTimestamp === 'function'
      ? fieldValue.serverTimestamp()
      : new Date().toISOString();

    const payload = {
      uid: user.uid,
      email: normalizeEmail(values.email || user.email || ''),
      username: values.username,
      username_lower: values.username,
      first_name: values.first_name,
      last_name: values.last_name,
      display_name: values.display_name,
      date_of_birth: values.date_of_birth,
      gender: values.gender || '',
      auth_provider: values.auth_provider,
      photo_url: user.photoURL || existingProfile?.photo_url || '',
      profile_complete: true,
      updated_at: timestamp
    };

    if (!existingProfile?.created_at) {
      payload.created_at = timestamp;
    }

    await firestore.collection(PROFILE_COLLECTION).doc(user.uid).set(payload, { merge: true });
    return payload;
  }

  /* =============================================================================
     11) PROFILE RESOLUTION HELPERS
  ============================================================================= */
  function isProfileComplete(profile) {
    if (!profile) return false;
    return REQUIRED_PROFILE_FIELDS.every((field) => normalizeString(profile[field]));
  }

  function buildProfilePrefill(user, profile = null) {
    const providerContext = RUNTIME.lastProviderContext || {};
    const onboarding = RUNTIME.onboardingContext || {};
    const splitDisplayName = splitFullName(user?.displayName || providerContext.display_name || '');

    const values = {
      method: onboarding.method || providerContext.method || getPrimaryProviderId(user),
      provider: onboarding.provider || providerContext.provider || getPrimaryProviderId(user),
      email: onboarding.email || providerContext.email || normalizeEmail(profile?.email || user?.email || ''),
      first_name: profile?.first_name || onboarding.first_name || providerContext.first_name || splitDisplayName.first_name || '',
      last_name: profile?.last_name || onboarding.last_name || providerContext.last_name || splitDisplayName.last_name || '',
      display_name: profile?.display_name || onboarding.display_name || providerContext.display_name || normalizeString(user?.displayName || ''),
      username: profile?.username || onboarding.username || providerContext.username || '',
      password: onboarding.password || '',
      password_confirm: onboarding.password_confirm || onboarding.password || '',
      date_of_birth: profile?.date_of_birth || onboarding.date_of_birth || '',
      gender: profile?.gender || onboarding.gender || ''
    };

    values.username = buildUsernameSuggestion(values);
    values.display_name = buildDisplayName(values);

    return values;
  }

  async function resolveEmailIdentity(identity) {
    const normalizedIdentity = normalizeString(identity);
    if (!normalizedIdentity) return '';

    if (normalizedIdentity.includes('@')) {
      return normalizeEmail(normalizedIdentity);
    }

    if (isPhoneIdentity(normalizedIdentity)) {
      return '';
    }

    const profile = await getProfileByUsername(normalizedIdentity);
    return normalizeEmail(profile?.email || '');
  }

  /* =============================================================================
     12) PROFILE SURFACE EVENTS
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

  /* =============================================================================
     13) ACCOUNT FLOW HELPERS
  ============================================================================= */
  async function ensureReadyOrThrow() {
    const ready = await ensureFirebaseServices();
    if (!ready) {
      throw new Error('FIREBASE_NOT_READY');
    }

    const auth = getFirebaseAuth();
    const firestore = getFirestore();
    if (!auth || !firestore) {
      throw new Error('FIREBASE_NOT_READY');
    }

    return { auth, firestore };
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

    emitProfileState(user, await getProfileByUid(user.uid));
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
     14) PROVIDER AUTH FLOW
  ============================================================================= */
  async function handleProviderSubmit(detail = {}) {
    const provider = normalizeString(detail.provider || '');
    if (!provider) return;

    try {
      const { auth } = await ensureReadyOrThrow();
      setFlowState({
        resolveProfile: true,
        redirectToProfile: true
      });

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
        throw new Error('UNSUPPORTED_PROVIDER');
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
    } catch (error) {
      clearFlowState();
      const message = mapFirebaseError(error, `Unable to continue with ${provider} right now.`);
      if (!message) return;
      window.alert(message);
      console.error('Provider auth error:', error);
    }
  }

  /* =============================================================================
     15) EMAIL AND PASSWORD SIGN-IN FLOW
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
      const { auth } = await ensureReadyOrThrow();
      const email = await resolveEmailIdentity(identity);

      if (!email) {
        setFieldError(identityField, 'Use your email address or an existing username.');
        return;
      }

      setFlowState({
        resolveProfile: true,
        redirectToProfile: true
      });

      await auth.signInWithEmailAndPassword(email, password);
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
     16) EMAIL ONBOARDING FLOW
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
     17) PHONE AUTH FLOW
  ============================================================================= */
  function handlePhoneAuthRequest(detail = {}) {
    const form = document.querySelector('[data-account-phone-auth-form="true"]');
    const phoneField = form instanceof HTMLFormElement
      ? getFieldFromForm(form, '#account-phone-auth-number')
      : null;

    setFieldError(phoneField, 'Phone authentication is not live yet.');
    console.warn('Phone auth request is not implemented:', detail);
  }

  /* =============================================================================
     18) FORGOT PASSWORD FLOW
  ============================================================================= */
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
      const { auth } = await ensureReadyOrThrow();
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
     19) PROFILE SETUP FLOW
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
    const dobField = form instanceof HTMLFormElement
      ? getFieldFromForm(form, '#account-profile-setup-date-of-birth')
      : null;

    if (!(form instanceof HTMLFormElement)) return;

    clearFormErrors(form);

    const context = patchOnboardingContext(detail);
    const auth = getFirebaseAuth();
    const currentUser = auth?.currentUser || null;
    const method = normalizeString(detail.method || context.method || getPrimaryProviderId(currentUser));

    const values = {
      method,
      auth_provider: method || getPrimaryProviderId(currentUser) || 'email',
      email: normalizeEmail(context.email || currentUser?.email || ''),
      username: normalizeUsername(detail.username || context.username || ''),
      first_name: normalizeString(detail.first_name || context.first_name || ''),
      last_name: normalizeString(detail.last_name || context.last_name || ''),
      display_name: buildDisplayName({
        display_name: detail.display_name || context.display_name || '',
        first_name: detail.first_name || context.first_name || '',
        last_name: detail.last_name || context.last_name || ''
      }),
      password: normalizeString(detail.password || context.password || ''),
      password_confirm: normalizeString(detail.password_confirm || context.password_confirm || detail.password || context.password || ''),
      date_of_birth: normalizeString(detail.date_of_birth || context.date_of_birth || ''),
      gender: normalizeString(detail.gender || context.gender || '')
    };

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
      setFieldError(dobField, 'Enter your date of birth.');
      return;
    }

    if (method === 'email' && !currentUser) {
      if (!values.email) {
        setFieldError(firstNameField, 'Email onboarding lost context. Start again from Continue with email.');
        return;
      }

      if (!values.password) {
        setFieldError(passwordField, 'Create a password.');
        return;
      }

      if (values.password.length < 6) {
        setFieldError(passwordField, 'Use a password with at least 6 characters.');
        return;
      }

      if (values.password !== values.password_confirm) {
        setFieldError(passwordConfirmField, 'Passwords do not match.');
        return;
      }
    }

    setFormBusy(form, true);
    RUNTIME.profileSaveInProgress = true;

    try {
      const { auth: authInstance } = await ensureReadyOrThrow();
      let user = authInstance.currentUser || null;

      if (method === 'email' && !user) {
        const credential = await authInstance.createUserWithEmailAndPassword(values.email, values.password);
        user = credential.user || null;
      }

      if (!user) {
        throw new Error('AUTHENTICATED_USER_REQUIRED');
      }

      const existingProfile = await getProfileByUid(user.uid);
      await assertUsernameAvailable(values.username, user.uid);
      await updateFirebaseDisplayName(user, values.display_name);
      const savedProfile = await saveProfile(user, values, existingProfile);

      clearOnboardingContext();
      clearFlowState();
      emitProfileState(user, savedProfile);
      redirectToProfile();
    } catch (error) {
      if (error instanceof Error && error.message === 'USERNAME_TAKEN') {
        setFieldError(usernameField, 'That username is already taken.');
      } else {
        const message = mapFirebaseError(error, 'Unable to complete profile setup right now.');
        setFieldError(usernameField, message);
      }
      console.error('Profile setup error:', error);
    } finally {
      RUNTIME.profileSaveInProgress = false;
      setFormBusy(form, false);
    }
  }

  /* =============================================================================
     20) AUTH STATE HANDLERS
  ============================================================================= */
  async function handleSignedInState(user) {
    const requestId = ++RUNTIME.profileRequestId;

    try {
      const profile = await getProfileByUid(user.uid);
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
      emitProfileState(user, null);
      console.error('Profile lookup error:', error);
    }
  }

  function handleSignedOutState() {
    ++RUNTIME.profileRequestId;
    clearOnboardingContext();
    clearFlowState();
    emitSignedOutState();
  }

  function bindAuthState() {
    if (RUNTIME.authBound) return;

    const auth = getFirebaseAuth();
    if (!auth) return;

    RUNTIME.authBound = true;

    auth.onAuthStateChanged((user) => {
      if (user) {
        void handleSignedInState(user);
        return;
      }

      handleSignedOutState();
    });
  }

  /* =============================================================================
     21) EVENT BINDING
  ============================================================================= */
  function bindFirebaseReadyEvents() {
    if (RUNTIME.firebaseReadyBound) return;
    RUNTIME.firebaseReadyBound = true;

    document.addEventListener('neuroartan:firebase-ready', () => {
      RUNTIME.authBound = false;
      bindAuthState();
    });
  }

  function bindAccountEvents() {
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

    document.addEventListener('account:sign-out-request', async () => {
      try {
        const auth = getFirebaseAuth();
        if (!auth) return;
        await auth.signOut();
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
     22) INITIALIZATION
  ============================================================================= */
  function boot() {
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
   23) END OF FILE
============================================================================= */
