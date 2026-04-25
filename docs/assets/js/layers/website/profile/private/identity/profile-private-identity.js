/* =============================================================================
   01) MODULE IDENTITY
   02) IMPORTS
   03) DOM HELPERS
   04) IDENTITY STATE RENDERING
   05) IDENTITY ACTIONS
   06) INITIALIZATION
============================================================================= */

/* =============================================================================
   01) MODULE IDENTITY
============================================================================= */
const MODULE_ID = 'profile-private-identity';

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
function getIdentityRoot() {
  return document.querySelector('[data-profile-private-identity]');
}

function setText(root, selector, value) {
  const node = root?.querySelector(selector);
  if (!node) return;
  node.textContent = value || '';
}

function formatUsername(username = '') {
  const value = String(username || '').trim();
  return value ? `@${value}` : '@username pending';
}

function formatValue(value = '', fallback = 'Not set') {
  const normalized = String(value || '').trim();
  return normalized || fallback;
}

/* =============================================================================
   04) IDENTITY STATE RENDERING
============================================================================= */
function renderProfilePrivateIdentity(state = getProfileRuntimeState()) {
  const root = getIdentityRoot();
  if (!root) return;

  const profile = state.profile || {};
  const profileComplete = profile.profile_complete === true || state.profileComplete === true;

  setText(root, '[data-profile-email]', formatValue(profile.email, 'Not connected'));
  setText(root, '[data-profile-identity-username]', formatUsername(profile.username));
  setText(root, '[data-profile-first-name]', formatValue(profile.first_name || profile.firstName));
  setText(root, '[data-profile-last-name]', formatValue(profile.last_name || profile.lastName));
  setText(root, '[data-profile-identity-display-name]', formatValue(profile.display_name || profile.displayName));
  setText(root, '[data-profile-date-of-birth]', formatValue(profile.date_of_birth || profile.birth_date));
  setText(
    root,
    '[data-profile-identity-status]',
    profileComplete ? 'Private identity baseline is complete.' : 'Private profile pending completion.'
  );
}

/* =============================================================================
   05) IDENTITY ACTIONS
============================================================================= */
function bindProfilePrivateIdentityActions() {
  const root = getIdentityRoot();
  if (!root || root.dataset.profilePrivateIdentityBound === 'true') return;

  root.dataset.profilePrivateIdentityBound = 'true';
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
function initProfilePrivateIdentity() {
  bindProfilePrivateIdentityActions();
  renderProfilePrivateIdentity();
  subscribeProfileRuntime(renderProfilePrivateIdentity);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initProfilePrivateIdentity, { once:true });
} else {
  initProfilePrivateIdentity();
}
