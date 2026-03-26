// /website/assets/js/system/auth.js

const authInstance = firebase.auth();
const PROFILE_ROUTE_MATCHERS = ["/profile.html", "/profile/"];
const INDEX_ROUTE = "/";

function isProfileRoute(pathname) {
  return PROFILE_ROUTE_MATCHERS.some((route) => pathname.endsWith(route));
}

function redirectToIndex() {
  window.location.href = INDEX_ROUTE;
}

function redirectToProfile() {
  window.location.href = "/profile.html";
}

function updateProfileSurface(user) {
  const nameEl = document.getElementById("profile-name");
  const emailEl = document.getElementById("profile-email");

  if (nameEl) {
    nameEl.textContent = user.displayName || "No Name";
  }

  if (emailEl) {
    emailEl.textContent = user.email || "No Email";
  }
}

function handleSignedOutState() {
  console.log("No user signed in");

  if (isProfileRoute(window.location.pathname)) {
    redirectToIndex();
  }
}

function handleSignedInState(user) {
  console.log("User signed in:", user);
  updateProfileSurface(user);
}

authInstance.onAuthStateChanged((user) => {
  if (user) {
    handleSignedInState(user);
    return;
  }

  handleSignedOutState();
});

function logout() {
  authInstance
    .signOut()
    .then(() => {
      console.log("User logged out");
      redirectToIndex();
    })
    .catch((error) => {
      console.error("Logout error:", error);
    });
}

function loginWithGoogle() {
  const provider = new firebase.auth.GoogleAuthProvider();

  authInstance
    .signInWithPopup(provider)
    .then((result) => {
      console.log("Google login success:", result.user);
      redirectToProfile();
    })
    .catch((error) => {
      console.error("Login error:", error);
    });
}

window.logout = logout;
window.loginWithGoogle = loginWithGoogle;