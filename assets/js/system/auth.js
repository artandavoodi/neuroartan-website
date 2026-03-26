// /website/assets/js/system/auth.js

const firebaseReady = typeof window !== 'undefined' && typeof window.firebase !== 'undefined';
const authInstance = firebaseReady ? firebase.auth() : null;

const PROFILE_ROUTE_MATCHERS = ['/profile.html', '/profile/'];
const PROFILE_ROUTE = '/profile.html';
const INDEX_ROUTE = '/';

function isProfileRoute(pathname) {
  return PROFILE_ROUTE_MATCHERS.some((route) => pathname.endsWith(route));
}

function redirectToIndex() {
  window.location.href = INDEX_ROUTE;
}

function redirectToProfile() {
  window.location.href = PROFILE_ROUTE;
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (!element) return;
  element.textContent = value;
}

function setImage(id, src, alt) {
  const element = document.getElementById(id);
  if (!element || element.tagName !== 'IMG') return;
  element.src = src;
  element.alt = alt;
}

function updateProfileSurface(user) {
  if (!user) return;

  const displayName = user.displayName || 'Neuroartan User';
  const email = user.email || 'No email available';
  const photoURL = user.photoURL || 'assets/icons/brand/logos/neuroartan/logo-plain.svg';

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

function updateSignedOutSurface() {
  if (!isProfileRoute(window.location.pathname)) return;

  setText('profile-label', 'Account Access');
  setText('profile-name', 'Sign in to Neuroartan');
  setText('profile-email', 'Use your unified account to continue.');
  setText(
    'profile-copy',
    'This profile surface is being upgraded into the unified Neuroartan account layer for website, Office, ICOS, Investor, and Jobs.'
  );
  setImage('profile-avatar-image', 'assets/icons/brand/logos/neuroartan/logo-plain.svg', 'Neuroartan');

  const guestOnly = document.querySelectorAll('[data-auth-state="guest"]');
  const userOnly = document.querySelectorAll('[data-auth-state="user"]');

  guestOnly.forEach((element) => {
    element.hidden = false;
  });

  userOnly.forEach((element) => {
    element.hidden = true;
  });
}

function handleSignedOutState() {
  console.log('No user signed in');
  updateSignedOutSurface();
}

function handleSignedInState(user) {
  console.log('User signed in:', user);
  updateProfileSurface(user);
}

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

bindAuthState();

window.logout = logout;
window.loginWithGoogle = loginWithGoogle;