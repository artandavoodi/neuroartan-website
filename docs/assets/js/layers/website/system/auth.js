/* =============================================================================
   00) FILE INDEX
   01) MODULE IDENTITY
   02) FIREBASE STATE
   03) PROFILE ROUTES
   04) ROUTE HELPERS
   05) REDIRECT HELPERS
   06) DOM TEXT HELPERS
   07) DOM IMAGE HELPERS
   08) PROFILE SURFACE — SIGNED IN
   09) PROFILE SURFACE — SIGNED OUT
   10) AUTH STATE HANDLERS
   11) AUTH BINDING
   12) SIGN OUT FLOW
   13) GOOGLE SIGN-IN FLOW
   14) INITIALIZATION
============================================================================= */

/* =============================================================================
   01) MODULE IDENTITY
============================================================================= */
// /website/docs/assets/js/layers/website/system/auth.js

/* =============================================================================
   02) FIREBASE STATE
============================================================================= */
const firebaseReady = typeof window !== 'undefined' && typeof window.firebase !== 'undefined';
const authInstance = firebaseReady ? firebase.auth() : null;

/* =============================================================================
   03) PROFILE ROUTES
============================================================================= */
const PROFILE_ROUTE_MATCHERS = ['/profile.html', '/profile/'];
const PROFILE_ROUTE = '/profile.html';
const INDEX_ROUTE = '/';
const CORE_NEUROARTAN_LOGO = 'assets/icons/core/identity/brand/neuroartan/logo-plain.svg';

/* =============================================================================
   04) ROUTE HELPERS
============================================================================= */
function isProfileRoute(pathname) {
  return PROFILE_ROUTE_MATCHERS.some((route) => pathname.endsWith(route));
}

/* =============================================================================
   05) REDIRECT HELPERS
============================================================================= */
function redirectToIndex() {
  window.location.href = INDEX_ROUTE;
}

function redirectToProfile() {
  window.location.href = PROFILE_ROUTE;
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
   08) PROFILE SURFACE — SIGNED IN
============================================================================= */
function updateProfileSurface(user) {
  if (!user) return;

  const displayName = user.displayName || 'Neuroartan User';
  const email = user.email || 'No email available';
  const photoURL = user.photoURL || CORE_NEUROARTAN_LOGO;

  setText('profile-label', 'Profile');
  setText('profile-name', displayName);
  setText('profile-email', email);
  setText(
    'profile-copy',
    'Your unified Neuroartan identity is active across the current platform surfaces available to your access level.'
  );
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
   09) PROFILE SURFACE — SIGNED OUT
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
   10) AUTH STATE HANDLERS
============================================================================= */
function handleSignedOutState() {
  console.log('No user signed in');
  updateSignedOutSurface();
}

function handleSignedInState(user) {
  console.log('User signed in:', user);
  updateProfileSurface(user);
}

/* =============================================================================
   11) AUTH BINDING
============================================================================= */
function bindAuthState() {
  if (!authInstance) {
    console.warn('Firebase auth is not available.');
    updateSignedOutSurface();
    return;
  }

  authInstance.onAuthStateChanged((user) => {
    if (user) {
      handleSignedInState(user);
      return;
    }

    handleSignedOutState();
  });
}

/* =============================================================================
   12) SIGN OUT FLOW
============================================================================= */
function logout() {
  if (!authInstance) return;

  authInstance
    .signOut()
    .then(() => {
      console.log('User logged out');
      redirectToIndex();
    })
    .catch((error) => {
      console.error('Logout error:', error);
    });
}

/* =============================================================================
   13) GOOGLE SIGN-IN FLOW
============================================================================= */
function loginWithGoogle() {
  if (!authInstance) return;

  const provider = new firebase.auth.GoogleAuthProvider();

  authInstance
    .signInWithPopup(provider)
    .then((result) => {
      console.log('Google login success:', result.user);
      redirectToProfile();
    })
    .catch((error) => {
      console.error('Login error:', error);
    });
}

/* =============================================================================
   14) INITIALIZATION
============================================================================= */
bindAuthState();

window.logout = logout;
window.loginWithGoogle = loginWithGoogle;