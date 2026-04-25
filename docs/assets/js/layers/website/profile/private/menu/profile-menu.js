/* =============================================================================
   01) MODULE IDENTITY
   02) PROFILE MENU ROOTS
   03) PROFILE MENU ACTION ROUTING
   04) PROFILE MENU INIT
   ============================================================================= */

/* =============================================================================
   01) MODULE IDENTITY
   ============================================================================= */

const MODULE_ID = 'profile-private-menu';

/* =============================================================================
   02) PROFILE MENU ROOTS
   ============================================================================= */

function getProfileMenuRoots() {
  return Array.from(document.querySelectorAll('[data-profile-menu][data-profile-surface="private"]'));
}

/* =============================================================================
   03) PROFILE MENU ACTION ROUTING
   ============================================================================= */

function bindProfileMenu(root) {
  if (!root || root.dataset.profileMenuBound === 'true') return;

  root.dataset.profileMenuBound = 'true';

  root.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-profile-action]');
    if (!trigger) return;

    document.dispatchEvent(new CustomEvent('profile:action-request', {
      detail: {
        source: MODULE_ID,
        action: trigger.dataset.profileAction || '',
        trigger
      }
    }));
  });
}

/* =============================================================================
   04) PROFILE MENU INIT
   ============================================================================= */

function initProfileMenu() {
  getProfileMenuRoots().forEach(bindProfileMenu);

  document.addEventListener('fragment:mounted', (event) => {
    if (event?.detail?.name !== 'profile-private-menu') return;
    getProfileMenuRoots().forEach(bindProfileMenu);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initProfileMenu, { once:true });
} else {
  initProfileMenu();
}
