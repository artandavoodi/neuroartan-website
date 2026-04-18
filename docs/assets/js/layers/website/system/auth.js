/* =============================================================================
   00) FILE INDEX
   01) MODULE IDENTITY
   02) MODULE STATE
   03) FIREBASE STATE
   04) PROFILE ROUTES
   05) ROUTE HELPERS
   06) DOM TEXT HELPERS
   07) DOM IMAGE HELPERS
   08) PROFILE SURFACE RESOLUTION
   09) PROFILE SURFACE — SIGNED IN
   10) PROFILE SURFACE — SIGNED OUT
   11) AUTH STATE HANDLERS
   12) AUTH BINDING
   13) ACCOUNT REQUEST HELPERS
   14) PROFILE STATE EVENTS
   15) EVENT REBINDING
   16) INITIALIZATION
   17) END OF FILE
============================================================================= */

/* =============================================================================
   01) MODULE IDENTITY
============================================================================= */
/* /website/docs/assets/js/layers/website/system/auth.js */

(() => {
  'use strict';

  /* =============================================================================
     02) MODULE STATE
  ============================================================================= */
  let bootBound = false;
  let authBound = false;
  let firebaseReadyEventsBound = false;
  let profileStateEventsBound = false;

  /* =============================================================================
     03) FIREBASE STATE
  ============================================================================= */
  function getFirebaseAuth() {
    const firebaseReady = typeof window !== 'undefined' && typeof window.firebase !== 'undefined';
    if (!firebaseReady || typeof window.firebase.auth !== 'function') return null;

    try {
      return window.firebase.auth();
    } catch (_) {
      return null;
    }
  }

  /* =============================================================================
     04) PROFILE ROUTES
  ============================================================================= */
  const PROFILE_ROUTE_MATCHERS = ['/profile.html', '/profile/'];
  const CORE_NEUROARTAN_LOGO = 'assets/icons/core/identity/brand/neuroartan/logo-plain.svg';

  /* =============================================================================
     05) ROUTE HELPERS
  ============================================================================= */
  function isProfileRoute(pathname) {
    return PROFILE_ROUTE_MATCHERS.some((route) => pathname.endsWith(route));
  }

  /* =============================================================================
     06) DOM TEXT HELPERS
  ============================================================================= */
  function setText(id, value) {
    const element = document.getElementById(id);
    if (!element) return;
    element.textContent = value;
  }

  /* =============================================================================
     07) DOM IMAGE HELPERS
  ============================================================================= */
  function setImage(id, src, alt) {
    const element = document.getElementById(id);
    if (!element || element.tagName !== 'IMG') return;
    element.src = src;
    element.alt = alt;
  }

  /* =============================================================================
     08) PROFILE SURFACE RESOLUTION
  ============================================================================= */
  function resolveDisplayName(user, profile) {
    return profile?.display_name || user?.displayName || 'Neuroartan User';
  }

  function resolveEmail(user, profile) {
    return profile?.email || user?.email || 'No email available';
  }

  function resolvePhotoUrl(user, profile) {
    return profile?.photo_url || user?.photoURL || CORE_NEUROARTAN_LOGO;
  }

  function resolveSignedInCopy(profileComplete) {
    if (profileComplete === false) {
      return 'Your account is active, but profile completion is still required before the full Neuroartan profile layer is considered complete.';
    }

    return 'Your unified Neuroartan identity is active across the current platform surfaces available to your access level.';
  }

  /* =============================================================================
     09) PROFILE SURFACE — SIGNED IN
  ============================================================================= */
  function updateProfileSurface(user, profile = null, profileComplete = true) {
    if (!user) return;

    const displayName = resolveDisplayName(user, profile);
    const email = resolveEmail(user, profile);
    const photoURL = resolvePhotoUrl(user, profile);

    setText('profile-label', 'Profile');
    setText('profile-name', displayName);
    setText('profile-email', email);
    setText('profile-copy', resolveSignedInCopy(profileComplete));
    setImage('profile-avatar-image', photoURL, displayName);

    const guestOnly = document.querySelectorAll('[data-auth-state="guest"]');
    const userOnly = document.querySelectorAll('[data-auth-state="user"]');

    guestOnly.forEach((element) => {
      element.hidden = true;
    });

    userOnly.forEach((element) => {
      element.hidden = false;
    });
  }

  /* =============================================================================
     10) PROFILE SURFACE — SIGNED OUT
  ============================================================================= */
  function updateSignedOutSurface() {
    if (!isProfileRoute(window.location.pathname)) return;

    setText('profile-label', 'Account Access');
    setText('profile-name', 'Sign in to Neuroartan');
    setText('profile-email', 'Use your unified account to continue.');
    setText(
      'profile-copy',
      'This profile surface is being upgraded into the unified Neuroartan account layer for website, Office, ICOS, Investor, and Jobs.'
    );
    setImage('profile-avatar-image', CORE_NEUROARTAN_LOGO, 'Neuroartan');

    const guestOnly = document.querySelectorAll('[data-auth-state="guest"]');
    const userOnly = document.querySelectorAll('[data-auth-state="user"]');

    guestOnly.forEach((element) => {
      element.hidden = false;
    });

    userOnly.forEach((element) => {
      element.hidden = true;
    });
  }

  /* =============================================================================
     11) AUTH STATE HANDLERS
  ============================================================================= */
  function handleSignedOutState() {
    updateSignedOutSurface();
  }

  function handleSignedInState(user) {
    updateProfileSurface(user);
  }

  /* =============================================================================
     12) AUTH BINDING
  ============================================================================= */
  function bindAuthState() {
    if (authBound) return;

    const authInstance = getFirebaseAuth();
    if (!authInstance) {
      updateSignedOutSurface();
      return;
    }

    authBound = true;

    authInstance.onAuthStateChanged((user) => {
      if (user) {
        handleSignedInState(user);
        return;
      }

      handleSignedOutState();
    });
  }

  /* =============================================================================
     13) ACCOUNT REQUEST HELPERS
  ============================================================================= */
  function requestLogout() {
    document.dispatchEvent(new CustomEvent('account:sign-out-request', {
      detail: {
        source: 'profile-shell'
      }
    }));
  }

  function requestGoogleLogin() {
    document.dispatchEvent(new CustomEvent('account:provider-submit', {
      detail: {
        source: 'profile-shell',
        provider: 'google'
      }
    }));
  }

  /* =============================================================================
     14) PROFILE STATE EVENTS
  ============================================================================= */
  function bindProfileStateEvents() {
    if (profileStateEventsBound) return;
    profileStateEventsBound = true;

    document.addEventListener('account:profile-state-changed', (event) => {
      const detail = event instanceof CustomEvent && event.detail
        ? event.detail
        : {};

      if (!detail.user) {
        updateSignedOutSurface();
        return;
      }

      updateProfileSurface(detail.user, detail.profile || null, detail.profileComplete !== false);
    });

    document.addEventListener('account:profile-signed-out', () => {
      updateSignedOutSurface();
    });
  }

  /* =============================================================================
     15) EVENT REBINDING
  ============================================================================= */
  function bindFirebaseReadyEvents() {
    if (firebaseReadyEventsBound) return;
    firebaseReadyEventsBound = true;

    document.addEventListener('neuroartan:firebase-ready', () => {
      authBound = false;
      bindAuthState();
    });

    window.addEventListener('load', () => {
      authBound = false;
      bindAuthState();
    }, { once: true });
  }

  /* =============================================================================
     16) INITIALIZATION
  ============================================================================= */
  function boot() {
    if (bootBound) return;
    bootBound = true;

    bindFirebaseReadyEvents();
    bindProfileStateEvents();
    bindAuthState();
    window.logout = requestLogout;
    window.loginWithGoogle = requestGoogleLogin;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();

/* =============================================================================
   17) END OF FILE
============================================================================= */
