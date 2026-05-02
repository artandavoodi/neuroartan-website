/* =============================================================================
   00) FILE INDEX
   01) MODULE IDENTITY
   02) COMPLETION REQUEST API
   03) GLOBAL COMPATIBILITY API
   04) END OF FILE
============================================================================= */

/* =============================================================================
   01) MODULE IDENTITY
============================================================================= */
const MODULE_ID = 'account-profile-completion';
const MODULE_PATH = '/website/docs/assets/js/layers/website/system/account/profile/account-profile-completion.js';

/* =============================================================================
   02) COMPLETION REQUEST API
============================================================================= */
export function requestAccountProfileCompletion(detail = {}) {
  document.dispatchEvent(new CustomEvent('account:profile-setup-open-request', {
    detail:{
      source:MODULE_ID,
      action:'profile-setup',
      ...detail
    }
  }));

  document.dispatchEvent(new CustomEvent('account-drawer:open-request', {
    detail:{
      source:MODULE_ID,
      state:'guest',
      surface:'profile-setup',
      ...detail
    }
  }));
}

export function requestAccountProfileRefresh(detail = {}) {
  document.dispatchEvent(new CustomEvent('account:profile-refresh-request', {
    detail:{
      source:MODULE_ID,
      ...detail
    }
  }));
}

/* =============================================================================
   03) GLOBAL COMPATIBILITY API
============================================================================= */
if (typeof window !== 'undefined') {
  window.NeuroartanAccountProfileCompletion = Object.freeze({
    MODULE_ID,
    MODULE_PATH,
    requestAccountProfileCompletion,
    requestAccountProfileRefresh
  });
}

/* =============================================================================
   04) END OF FILE
============================================================================= */
