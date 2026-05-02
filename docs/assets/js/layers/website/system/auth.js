/* =============================================================================
   00) FILE INDEX
   01) MODULE IDENTITY
   02) MODULE STATE
   03) SUPABASE STATE
   04) FIREBASE FALLBACK STATE
   05) PROFILE ROUTES
   06) ROUTE HELPERS
   07) DOM TEXT HELPERS
   08) DOM IMAGE HELPERS
   09) PROFILE SURFACE RESOLUTION
   10) PROFILE SURFACE — SIGNED IN
   11) PROFILE SURFACE — SIGNED OUT
   12) AUTH STATE HANDLERS
   13) AUTH BINDING
   14) ACCOUNT REQUEST HELPERS
   15) PROFILE STATE EVENTS
   16) EVENT REBINDING
   17) INITIALIZATION
   18) END OF FILE
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
  let authSource = 'none';
  let supabaseReadyEventsBound = false;

  /* =============================================================================
     03) SUPABASE STATE
  ============================================================================= */
  function getSupabaseClient() {
    if (typeof window === 'undefined') return null;
    return window.neuroartanSupabase || null;
  }

  function hasSupabaseRuntimeConfig() {
    if (typeof window === 'undefined') return false;
    const supabase = window.NEUROARTAN_CONFIG?.supabase || {};
    return Boolean(supabase.url && supabase.anonKey);
  }

  /* =============================================================================
     04) FIREBASE FALLBACK STATE
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
     05) PROFILE ROUTES
  ============================================================================= */
  const PROFILE_ROUTE_MATCHERS = ['/profile.html', '/profile/'];
  const CORE_NEUROARTAN_LOGO = 'assets/icons/core/identity/brand/neuroartan/logo-plain.svg';

  /* =============================================================================
     06) ROUTE HELPERS
  ============================================================================= */
  function isProfileRoute(pathname) {
    return PROFILE_ROUTE_MATCHERS.some((route) => pathname.endsWith(route));
  }

  /* =============================================================================
     07) DOM TEXT HELPERS
  ============================================================================= */
  function setText(id, value) {
    const element = document.getElementById(id);
    if (!element) return;
    element.textContent = value;
  }

  /* =============================================================================
     08) DOM IMAGE HELPERS
  ============================================================================= */
  function setImage(id, src, alt) {
    const element = document.getElementById(id);
    if (!element || element.tagName !== 'IMG') return;
    element.src = src;
    element.alt = alt;
  }

  /* =============================================================================
     09) PROFILE SURFACE RESOLUTION
  ============================================================================= */
  function resolveDisplayName(user, profile) {
    return profile?.public_display_name
      || profile?.display_name
      || user?.user_metadata?.name
      || user?.displayName
      || 'Neuroartan User';
  }

  function resolveEmail(user, profile) {
    return profile?.email
      || user?.email
      || user?.user_metadata?.email
      || 'No email available';
  }

  function resolvePhotoUrl(user, profile) {
    return profile?.public_avatar_url
      || profile?.photo_url
      || profile?.avatar_url
      || user?.user_metadata?.avatar_url
      || user?.user_metadata?.picture
      || user?.photoURL
      || CORE_NEUROARTAN_LOGO;
  }

  function resolveSignedInCopy(profileComplete) {
    if (profileComplete === false) {
      return 'Your account is active, but profile completion is still required before the full Neuroartan profile layer is considered complete.';
    }

    return 'Your unified Neuroartan identity is active across the current platform surfaces available to your access level.';
  }

  /* =============================================================================
     10) PROFILE SURFACE — SIGNED IN
  ============================================================================= */
  function updateProfileSurface(user, profile = null, profileComplete = null) {
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
     11) PROFILE SURFACE — SIGNED OUT
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
     12) AUTH STATE HANDLERS
  ============================================================================= */
  function handleSignedOutState() {
    updateSignedOutSurface();
  }

  function handleSignedInState(user) {
    updateProfileSurface(user, null, null);
    document.dispatchEvent(new CustomEvent('account:profile-refresh-request'));
  }

  /* =============================================================================
     13) AUTH BINDING
  ============================================================================= */
  function bindAuthState() {
    const supabase = getSupabaseClient();
    if (supabase) {
      if (authSource === 'supabase') return;
      authSource = 'supabase';
      authBound = true;

      supabase.auth.getSession()
        .then(({ data }) => {
          const user = data?.session?.user || null;
          if (user) {
            handleSignedInState(user);
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
          handleSignedInState(user);
          return;
        }

        handleSignedOutState();
      });

      return;
    }

    if (hasSupabaseRuntimeConfig()) {
      updateSignedOutSurface();
      return;
    }

    const authInstance = getFirebaseAuth();
    if (!authInstance) {
      updateSignedOutSurface();
      return;
    }

    if (authSource === 'firebase') return;

    authSource = 'firebase';
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
     14) ACCOUNT REQUEST HELPERS
  ============================================================================= */
  function requestLogout() {
    const supabase = getSupabaseClient();

    if (supabase) {
      supabase.auth.signOut().catch((error) => {
        console.error('[Neuroartan][Auth] Sign-out failed.', error);
      });
      return;
    }

    document.dispatchEvent(new CustomEvent('account:sign-out-request', {
      detail: {
        source: 'profile-shell'
      }
    }));
  }

  function requestGoogleLogin() {
    const supabase = getSupabaseClient();

    if (supabase) {
      const redirectTo = `${window.location.origin}/profile.html`;
      supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo
        }
      }).catch((error) => {
        console.error('[Neuroartan][Auth] Google sign-in failed.', error);
      });
      return;
    }

    document.dispatchEvent(new CustomEvent('account:provider-submit', {
      detail: {
        source: 'profile-shell',
        provider: 'google'
      }
    }));
  }

  /* =============================================================================
     15) PROFILE STATE EVENTS
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
     16) EVENT REBINDING
  ============================================================================= */
  function bindSupabaseReadyEvents() {
    if (supabaseReadyEventsBound) return;
    supabaseReadyEventsBound = true;

    window.addEventListener('neuroartan:supabase-ready', () => {
      authBound = false;
      authSource = 'none';
      bindAuthState();
    });
  }

  function bindFirebaseReadyEvents() {
    if (firebaseReadyEventsBound) return;
    firebaseReadyEventsBound = true;

    document.addEventListener('neuroartan:firebase-ready', () => {
      if (hasSupabaseRuntimeConfig()) return;
      authBound = false;
      authSource = 'none';
      bindAuthState();
    });

    window.addEventListener('neuroartan:supabase-ready', () => {
      authBound = false;
      authSource = 'none';
      bindAuthState();
    });

    window.addEventListener('load', () => {
      authBound = false;
      authSource = 'none';
      bindAuthState();
    }, { once: true });
  }

  /* =============================================================================
     17) INITIALIZATION
  ============================================================================= */
  function boot() {
    if (bootBound) return;
    bootBound = true;

    bindSupabaseReadyEvents();
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
   18) END OF FILE
============================================================================= */
