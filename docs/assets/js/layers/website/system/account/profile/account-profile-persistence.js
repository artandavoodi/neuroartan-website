/* =============================================================================
   00) FILE INDEX
   01) MODULE IDENTITY
   02) CANONICAL PROFILE PERSISTENCE RE-EXPORTS
   03) GLOBAL COMPATIBILITY API
   04) END OF FILE
============================================================================= */

/* =============================================================================
   01) MODULE IDENTITY
============================================================================= */
const MODULE_ID = 'account-profile-persistence';
const MODULE_PATH = '/website/docs/assets/js/layers/website/system/account/profile/account-profile-persistence.js';

/* =============================================================================
   02) CANONICAL PROFILE PERSISTENCE RE-EXPORTS
============================================================================= */
export {
  createPrivateBaselineProfile,
  getPrivateProfileSaveState,
  savePrivateProfileScope,
  subscribePrivateProfileSaveState
} from '../../profile/profile-save.js';

import {
  createPrivateBaselineProfile,
  getPrivateProfileSaveState,
  savePrivateProfileScope,
  subscribePrivateProfileSaveState
} from '../../profile/profile-save.js';

/* =============================================================================
   03) GLOBAL COMPATIBILITY API
============================================================================= */
if (typeof window !== 'undefined') {
  window.NeuroartanAccountProfilePersistence = Object.freeze({
    MODULE_ID,
    MODULE_PATH,
    createPrivateBaselineProfile,
    getPrivateProfileSaveState,
    savePrivateProfileScope,
    subscribePrivateProfileSaveState
  });
}

/* =============================================================================
   04) END OF FILE
============================================================================= */
