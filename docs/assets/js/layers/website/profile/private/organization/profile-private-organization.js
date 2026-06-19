/* =============================================================================
   01) IMPORTS
   02) DOM HELPERS
   03) ORGANIZATION STATE RENDERING
   04) INITIALIZATION
============================================================================= */

/* =============================================================================
   01) IMPORTS
============================================================================= */
import {
  getProfileRuntimeState,
  subscribeProfileRuntime
} from '../shell/profile-runtime.js';

/* =============================================================================
   02) DOM HELPERS
============================================================================= */
function getOrganizationRoot() {
  return document.querySelector('[data-profile-private-organization]');
}

function setText(root, selector, value) {
  const node = root?.querySelector(selector);
  if (!node) return;
  node.textContent = value || '';
}

/* =============================================================================
   03) ORGANIZATION STATE RENDERING
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
    hasCompanySpace
      ? 'Organization records are connected to this profile.'
      : 'Organization records are not active yet.'
  );
}

/* =============================================================================
   04) INITIALIZATION
============================================================================= */
function initProfilePrivateOrganization() {
  renderProfilePrivateOrganization();
  subscribeProfileRuntime(renderProfilePrivateOrganization);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initProfilePrivateOrganization, { once:true });
} else {
  initProfilePrivateOrganization();
}
