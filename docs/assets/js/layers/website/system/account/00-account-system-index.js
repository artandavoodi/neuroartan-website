/* =============================================================================
   00) FILE INDEX
   01) MODULE IDENTITY
   02) IDENTITY EXPORTS
   03) USERNAME EXPORTS
   04) PROFILE EXPORTS
   05) ORGANIZATION EXPORTS
   06) MODEL EXPORTS
   07) ENTITLEMENT EXPORTS
   08) SESSION EXPORTS
   09) WORKSPACE EXPORTS
   10) END OF FILE
============================================================================= */

/* =============================================================================
   01) MODULE IDENTITY
============================================================================= */
const MODULE_ID = 'account-system-index';
const MODULE_PATH = '/website/docs/assets/js/layers/website/system/account/00-account-system-index.js';

/* =============================================================================
   02) IDENTITY EXPORTS
============================================================================= */
export * from './identity/account-identity-state.js';

/* =============================================================================
   03) USERNAME EXPORTS
============================================================================= */
export * from './username/account-username-policy.js';
export * from './username/account-username-suggestions.js';
export * from './username/account-username-reservation.js';

/* =============================================================================
   04) PROFILE EXPORTS
============================================================================= */
export * from './profile/account-profile-state.js';
export * from './profile/account-profile-completion.js';
export * from './profile/account-profile-persistence.js';

/* =============================================================================
   05) ORGANIZATION EXPORTS
============================================================================= */
export * from './organization/account-organization-registry.js';
export * from './organization/account-organization-policy.js';

/* =============================================================================
   06) MODEL EXPORTS
============================================================================= */
export * from './model/account-model-registry.js';
export * from './model/account-model-policy.js';

/* =============================================================================
   07) ENTITLEMENT EXPORTS
============================================================================= */
export * from './entitlement/account-entitlement-state.js';

/* =============================================================================
   08) SESSION EXPORTS
============================================================================= */
export * from './session/account-session-state.js';

/* =============================================================================
   09) WORKSPACE EXPORTS
============================================================================= */
export * from './workspace/account-workspace-access.js';

/* =============================================================================
   10) END OF FILE
============================================================================= */
export const ACCOUNT_SYSTEM_INDEX_META = Object.freeze({
  moduleId:MODULE_ID,
  modulePath:MODULE_PATH,
  status:'scaffolded',
  authority:'account-system-index'
});