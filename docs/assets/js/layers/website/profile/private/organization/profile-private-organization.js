/* =============================================================================
   01) MODULE IDENTITY
   02) IMPORTS
   03) DOM HELPERS
   04) ORGANIZATION STATE RENDERING
   05) ORGANIZATION ACTIONS
   06) INITIALIZATION
============================================================================= */

/* =============================================================================
   01) MODULE IDENTITY
============================================================================= */
const MODULE_ID = 'profile-private-organization';

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
function getOrganizationRoot() {
  return document.querySelector('[data-profile-private-organization]');
}

function setText(root, selector, value) {
  const node = root?.querySelector(selector);
  if (!node) return;
  node.textContent = value || '';
}

function setDisabled(root, selector, disabled) {
  const node = root?.querySelector(selector);
  if (!node) return;
  node.disabled = !!disabled;
  node.setAttribute('aria-disabled', disabled ? 'true' : 'false');
}

/* =============================================================================
   04) ORGANIZATION STATE RENDERING
============================================================================= */
function renderProfilePrivateOrganization(state = getProfileRuntimeState()) {
  const root = getOrganizationRoot();
  if (!root) return;

  const profile = state.profile || {};
  const profileComplete = profile.profile_complete === true || state.profileComplete === true;
  const organizations = Array.isArray(state.organizations) ? state.organizations : [];
  const hasCompanySpace = organizations.length > 0;

  setText(root, '[data-profile-personal-space-status]', profileComplete ? 'Private profile active' : 'Private profile pending');
  setText(root, '[data-profile-company-space-status]', hasCompanySpace ? `${organizations.length} organization space${organizations.length === 1 ? '' : 's'}` : 'Not created');
  setText(
    root,
    '[data-profile-organization-status]',
    profileComplete
      ? 'Organization controls are ready for the next account layer.'
      : 'Organization controls unlock after private profile completion.'
  );
  setDisabled(root, '[data-profile-action="create-organization"]', !profileComplete);
}

/* =============================================================================
   05) ORGANIZATION ACTIONS
============================================================================= */
function bindProfilePrivateOrganizationActions() {
  const root = getOrganizationRoot();
  if (!root || root.dataset.profilePrivateOrganizationBound === 'true') return;

  root.dataset.profilePrivateOrganizationBound = 'true';
  root.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-profile-action]');
    if (!trigger || trigger.disabled) return;

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
function initProfilePrivateOrganization() {
  bindProfilePrivateOrganizationActions();
  renderProfilePrivateOrganization();
  subscribeProfileRuntime(renderProfilePrivateOrganization);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initProfilePrivateOrganization, { once:true });
} else {
  initProfilePrivateOrganization();
}