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
    const searchTrigger = event.target.closest('[data-profile-search-trigger="true"]');
    if (searchTrigger instanceof HTMLElement) {
      event.preventDefault();
      searchTrigger.setAttribute('aria-expanded', 'true');
      document.dispatchEvent(new CustomEvent('neuroartan:home-search-shell-open-requested', {
        detail: {
          source: MODULE_ID
        }
      }));
      return;
    }

    const trigger = event.target.closest('[data-profile-action]');
    if (!trigger) return;
    if (trigger instanceof HTMLAnchorElement) return;

    event.preventDefault();
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

  document.addEventListener('neuroartan:home-topbar-reset-triggers', () => {
    getProfileMenuRoots().forEach((root) => {
      root.querySelectorAll('[data-profile-search-trigger="true"]').forEach((trigger) => {
        if (trigger instanceof HTMLElement) {
          trigger.setAttribute('aria-expanded', 'false');
        }
      });
    });
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initProfileMenu, { once:true });
} else {
  initProfileMenu();
}
