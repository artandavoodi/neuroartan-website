/* =============================================================================
   01) MODULE IDENTITY
   02) IMPORTS
   03) DOM HELPERS
   04) HERO STATE RENDERING
   05) HERO ACTIONS
   06) INITIALIZATION
============================================================================= */

/* =============================================================================
   01) MODULE IDENTITY
============================================================================= */
const MODULE_ID = 'profile-private-hero';

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
function getHeroRoot() {
  return document.querySelector('[data-profile-private-hero]');
}

function setText(root, selector, value) {
  const node = root?.querySelector(selector);
  if (!node) return;
  node.textContent = value || '';
}

function getInitials(profile = {}) {
  const displayName = String(profile.display_name || profile.displayName || '').trim();
  const firstName = String(profile.first_name || profile.firstName || '').trim();
  const lastName = String(profile.last_name || profile.lastName || '').trim();
  const email = String(profile.email || '').trim();
  const source = displayName || `${firstName} ${lastName}`.trim() || email || 'Neuroartan';

  return source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

/* =============================================================================
   04) HERO STATE RENDERING
============================================================================= */
function renderProfilePrivateHero(state = getProfileRuntimeState()) {
  const root = getHeroRoot();
  if (!root) return;

  const profile = state.profile || {};
  const username = String(profile.username || '').trim();
  const displayName = String(profile.display_name || profile.displayName || '').trim();
  const profileComplete = profile.profile_complete === true || state.profileComplete === true;

  setText(root, '[data-profile-avatar-initials]', getInitials(profile));
  setText(root, '[data-profile-display-name]', displayName || (profileComplete ? 'Private profile' : 'Profile not completed'));
  setText(root, '[data-profile-username]', username ? `@${username}` : '@username pending');
  setText(
    root,
    '[data-profile-hero-description]',
    profileComplete
      ? 'Your private profile foundation is active. Public identity, organizations, models, and workspace layers can be activated from controlled modules.'
      : 'Complete your private identity layer before activating public profile, organizations, models, or workspace access.'
  );
}

/* =============================================================================
   05) HERO ACTIONS
============================================================================= */
function bindProfilePrivateHeroActions() {
  const root = getHeroRoot();
  if (!root || root.dataset.profilePrivateHeroBound === 'true') return;

  root.dataset.profilePrivateHeroBound = 'true';
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
function initProfilePrivateHero() {
  bindProfilePrivateHeroActions();
  renderProfilePrivateHero();
  subscribeProfileRuntime(renderProfilePrivateHero);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initProfilePrivateHero, { once:true });
} else {
  initProfilePrivateHero();
}