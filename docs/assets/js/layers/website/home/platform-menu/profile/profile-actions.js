import {
  buildPublicProfilePath
} from '../../../system/account/identity/account-profile-identity.js';
import {
  getHomeSurfaceState
} from '../../core/home-surface-state.js';

const PROFILE_ROUTE = '/profile.html';
const PRICING_ROUTE = '/pages/pricing/index.html';

function normalizeString(value = '') {
  return String(value || '').trim();
}

function navigateToProfileHash(hash = '') {
  closeProfileMenu();
  window.location.href = `${PROFILE_ROUTE}${hash}`;
}

function getCurrentProfileUsername() {
  const snapshot = getHomeSurfaceState();
  return normalizeString(
    snapshot?.account?.profile?.username
    || snapshot?.account?.profile?.public_username
    || ''
  );
}

function navigateToPublicProfileRoute() {
  const username = getCurrentProfileUsername();
  closeProfileMenu();
  window.location.href = buildPublicProfilePath(username) || PROFILE_ROUTE;
}

function openProfileSubdestination(subdestination) {
  document.dispatchEvent(new CustomEvent('home:platform-shell-open-request', {
    detail: {
      destination: 'profile',
      subdestination,
      source: 'profile-menu'
    }
  }));
}

function closeProfileMenu() {
  document.dispatchEvent(new CustomEvent('home:platform-shell-close-request', {
    detail: {
      source: 'profile-menu',
      clearPersistedState: true
    }
  }));
}

function openAccountEntry() {
  document.dispatchEvent(new CustomEvent('account:entry-request', {
    detail: {
      source: 'profile-menu'
    }
  }));

  document.dispatchEvent(new CustomEvent('account-drawer:open-request', {
    detail: {
      source: 'profile-menu',
      state: 'guest',
      surface: 'entry'
    }
  }));
}

function isSignedIn() {
  return getHomeSurfaceState()?.account?.signedIn === true;
}

function requireSignedIn() {
  if (isSignedIn()) return true;
  openAccountEntry();
  closeProfileMenu();
  return false;
}

export function routeProfileMenuAction(action) {
  const normalized = normalizeString(action);

  switch (normalized) {
    case 'edit-profile':
      if (!requireSignedIn()) return;
      navigateToProfileHash('#settings/identity');
      return;
    case 'public-route':
      navigateToPublicProfileRoute();
      return;
    case 'change-password':
    case 'password':
      if (!requireSignedIn()) return;
      closeProfileMenu();
      window.location.href = '/profile.html#settings/password';
      return;
    case 'preferences':
      if (!requireSignedIn()) return;
      closeProfileMenu();
      window.location.href = '/profile.html#settings/privacy';
      return;
    case 'account-control':
      openProfileSubdestination('account-control');
      return;
    case 'subscription':
    case 'subscription-plan':
    case 'plans':
      openProfileSubdestination('subscription');
      return;
    case 'manage-plan':
    case 'pricing':
      closeProfileMenu();
      window.location.href = PRICING_ROUTE;
      return;
    case 'billing':
    case 'invoices':
      openProfileSubdestination('subscription');
      return;
    case 'sign-in':
      openAccountEntry();
      closeProfileMenu();
      return;
    case 'sign-out':
      document.dispatchEvent(new CustomEvent('account:sign-out-request', {
        detail: {
          source: 'profile-menu'
        }
      }));
      closeProfileMenu();
      return;
    default:
      return;
  }
}

export function bindProfileMenuActions(root) {
  const surface = root instanceof Element
    ? root.querySelector('[data-home-platform-destination-surface]')
    : null;

  if (!(surface instanceof HTMLElement) || surface.dataset.profileMenuActionsBound === 'true') {
    return;
  }

  surface.dataset.profileMenuActionsBound = 'true';
  surface.addEventListener('click', (event) => {
    const button = event.target instanceof Element
      ? event.target.closest('[data-profile-action]')
      : null;

    if (button instanceof HTMLElement) {
      const action = button.getAttribute('data-profile-action') || '';
      if (action) {
        event.preventDefault();
        routeProfileMenuAction(action);
        return;
      }
    }

    const settingsButton = event.target instanceof Element
      ? event.target.closest('[data-home-platform-settings-route], [data-home-platform-settings-subdestination]')
      : null;

    if (settingsButton instanceof HTMLElement) {
      const subdestination = settingsButton.getAttribute('data-home-platform-settings-route') 
        || settingsButton.getAttribute('data-home-platform-settings-subdestination') 
        || '';
      const detail = settingsButton.getAttribute('data-home-platform-settings-detail') || '';
      
      if (subdestination) {
        event.preventDefault();
        document.dispatchEvent(new CustomEvent('home:platform-shell-open-request', {
          detail: {
            destination: 'settings',
            subdestination,
            detail,
            source: 'profile-menu'
          }
        }));
      }
    }
  });
}
