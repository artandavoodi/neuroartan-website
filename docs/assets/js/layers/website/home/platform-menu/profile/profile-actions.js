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
      source: 'profile-menu'
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

export function routeProfileMenuAction(action) {
  const normalized = normalizeString(action);

  switch (normalized) {
    case 'edit-profile':
      navigateToProfileHash('#settings/identity');
      return;
    case 'public-route':
      navigateToPublicProfileRoute();
      return;
    case 'preferences':
      navigateToProfileHash('#settings/visibility');
      return;
    case 'change-password':
    case 'password':
      navigateToProfileHash('#settings/password');
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

    if (!(button instanceof HTMLElement)) {
      return;
    }

    const action = button.getAttribute('data-profile-action') || '';
    if (!action) {
      return;
    }

    event.preventDefault();
    routeProfileMenuAction(action);
  });
}
