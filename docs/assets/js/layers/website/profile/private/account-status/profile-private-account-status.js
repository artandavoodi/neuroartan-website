/* =============================================================================
   01) MODULE IDENTITY
   02) IMPORTS
   03) DOM HELPERS
   04) ACCOUNT STATUS RENDERING
   05) ACCOUNT STATUS ACTIONS
   06) INITIALIZATION
============================================================================= */

/* =============================================================================
   01) MODULE IDENTITY
============================================================================= */
const MODULE_ID = 'profile-private-account-status';

/* =============================================================================
   02) IMPORTS
============================================================================= */
import {
  getProfileRuntimeState,
  subscribeProfileRuntime
} from '../shell/profile-runtime.js';

/* =============================================================================
   03) DOM HELPERS
============================================================================= */
function getAccountStatusRoot() {
  return document.querySelector('[data-profile-private-account-status]');
}

function setText(root, selector, value) {
  const node = root?.querySelector(selector);
  if (!node) return;
  node.textContent = value || '';
}

function setStepState(root, key, active) {
  const node = root?.querySelector(`[data-profile-readiness-step="${key}"]`);
  if (!node) return;
  node.dataset.profileReadinessState = active ? 'complete' : 'pending';
}

/* =============================================================================
   04) ACCOUNT STATUS RENDERING
============================================================================= */
function renderProfilePrivateAccountStatus(state = getProfileRuntimeState()) {
  const root = getAccountStatusRoot();
  if (!root) return;

  const profile = state.profile || {};
  const user = state.user || {};
  const emailVerified = user.email_confirmed_at || user.emailConfirmed || user.email_verified || profile.email_verified;
  const profileComplete = profile.profile_complete === true || state.profileComplete === true;
  const usernameReserved = !!profile.username;
  const platformReady = profileComplete && usernameReserved;

  setStepState(root, 'email', !!emailVerified);
  setStepState(root, 'profile', !!profileComplete);
  setStepState(root, 'username', !!usernameReserved);
  setStepState(root, 'platform', !!platformReady);

  setText(root, '[data-profile-email-verification-status]', emailVerified ? 'Confirmed' : 'Pending confirmation');
  setText(root, '[data-profile-creation-status]', profileComplete ? 'Created' : 'Not completed');
  setText(root, '[data-profile-username-reservation-status]', usernameReserved ? 'Reserved' : 'Pending reservation');
  setText(root, '[data-profile-platform-access-status]', platformReady ? 'Private baseline active' : 'Private baseline only');
  setText(
    root,
    '[data-profile-readiness-summary]',
    platformReady ? 'Profile foundation is ready.' : 'Profile readiness is being prepared.'
  );
}

/* =============================================================================
   05) ACCOUNT STATUS ACTIONS
============================================================================= */
function bindProfilePrivateAccountStatusActions() {
  const root = getAccountStatusRoot();
  if (!root || root.dataset.profilePrivateAccountStatusBound === 'true') return;

  root.dataset.profilePrivateAccountStatusBound = 'true';
  root.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-profile-action]');
    if (!trigger) return;

    document.dispatchEvent(new CustomEvent('profile:action-request', {
      detail: {
        source: MODULE_ID,
        action: trigger.dataset.profileAction || ''
      }
    }));
  });
}

/* =============================================================================
   06) INITIALIZATION
============================================================================= */
function initProfilePrivateAccountStatus() {
  bindProfilePrivateAccountStatusActions();
  renderProfilePrivateAccountStatus();
  subscribeProfileRuntime(renderProfilePrivateAccountStatus);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initProfilePrivateAccountStatus, { once:true });
} else {
  initProfilePrivateAccountStatus();
}