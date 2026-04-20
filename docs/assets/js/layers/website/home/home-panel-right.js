import {
  buildPublicProfileDisplay,
  buildPublicProfilePath,
} from '../system/account-profile-identity.js';
import { subscribeHomeSurfaceState } from './home-surface-state.js';

/* =========================================================
   00. FILE INDEX
   01. MODULE STATE
   02. DOM HELPERS
   03. PANEL STATE HELPERS
   04. ACTION HELPERS
   05. EVENT BINDING
   06. MODULE BOOT
   ========================================================= */

/* =========================================================
   01. MODULE STATE
   ========================================================= */

const HOME_PANEL_RIGHT_STATE = {
  isBound: false,
  isOpen: false,
  activeIntent: null,
  root: null,
  snapshot: null,
};

/* =========================================================
   02. DOM HELPERS
   ========================================================= */

function getHomePanelRightNodes() {
  return {
    panel: document.querySelector('#home-panel-right'),
    closeButton: document.querySelector('#home-panel-right-close'),
    title: document.querySelector('#home-panel-right .home-panel-right__title'),
    items: Array.from(document.querySelectorAll('#home-panel-right .home-panel-right__item')),
    avatarImage: document.querySelector('[data-home-profile-avatar]'),
    avatarFallback: document.querySelector('[data-home-profile-avatar-fallback]'),
    name: document.querySelector('[data-home-profile-name]'),
    username: document.querySelector('[data-home-profile-username]'),
    meta: document.querySelector('[data-home-profile-meta]'),
    route: document.querySelector('[data-home-profile-route]'),
    routeStatus: document.querySelector('[data-home-profile-route-status]'),
    accountEntryAction: document.querySelector('[data-home-profile-action="account-entry"]'),
    signOutAction: document.querySelector('[data-home-profile-action="sign-out"]'),
  };
}

function dispatchHomePanelRightEvent(name, detail = {}) {
  document.dispatchEvent(new CustomEvent(name, { detail }));
}

function getLivePanelRightRoot() {
  return document.querySelector('#home-panel-right');
}

/* =========================================================
   03. PANEL STATE HELPERS
   ========================================================= */

function getHomePanelRightTitleForIntent(intent) {
  switch (intent) {
    case 'create-profile':
      return 'Create private profile and route state';
    case 'profile-model':
      return 'Identity, route, and account state';
    default:
      return 'Identity, route, and account state';
  }
}

function syncHomePanelRightIntent(intent) {
  const nodes = getHomePanelRightNodes();
  HOME_PANEL_RIGHT_STATE.activeIntent = intent || null;

  if (nodes.title) {
    nodes.title.textContent = getHomePanelRightTitleForIntent(HOME_PANEL_RIGHT_STATE.activeIntent);
  }

  if (nodes.panel) {
    nodes.panel.dataset.panelIntent = HOME_PANEL_RIGHT_STATE.activeIntent || 'default';
  }
}

function openHomePanelRight(intent = null) {
  const nodes = getHomePanelRightNodes();

  if (!nodes.panel) {
    return;
  }

  HOME_PANEL_RIGHT_STATE.isOpen = true;
  nodes.panel.hidden = false;
  document.documentElement.classList.add('home-panel-right-open');
  document.body.classList.add('home-panel-right-open');
  syncHomePanelRightIntent(intent);
}

function closeHomePanelRight() {
  const nodes = getHomePanelRightNodes();

  if (!nodes.panel) {
    return;
  }

  HOME_PANEL_RIGHT_STATE.isOpen = false;
  nodes.panel.hidden = true;
  document.documentElement.classList.remove('home-panel-right-open');
  document.body.classList.remove('home-panel-right-open');
  syncHomePanelRightIntent(null);
  dispatchHomePanelRightEvent('neuroartan:home-topbar-reset-triggers');
}

function resolveHomePanelRightName(snapshot) {
  return (
    snapshot?.account?.profile?.display_name
    || snapshot?.account?.user?.displayName
    || snapshot?.account?.profile?.email
    || snapshot?.account?.user?.email
    || 'Sign in to Neuroartan'
  );
}

function resolveHomePanelRightUsername(snapshot) {
  const username = snapshot?.account?.profile?.username || '';
  return username ? `@${username}` : '@username';
}

function resolveHomePanelRightMeta(snapshot) {
  if (!snapshot?.account?.signedIn) {
    return 'Create a private profile to govern identity, public route, and future continuity access.';
  }

  if (snapshot?.account?.profileComplete === false) {
    return 'Your account is active. Complete the private profile to activate the public route and continuity surfaces.';
  }

  return 'Private profile anchored for route control, continuity access, and voice-trained identity.';
}

function resolveHomePanelRightRoute(snapshot) {
  const username = snapshot?.account?.profile?.username || '';
  return {
    display: buildPublicProfileDisplay(username),
    path: buildPublicProfilePath(username) || '/profile.html',
    username,
  };
}

function resolveHomePanelRightRouteStatus(snapshot, username) {
  if (!snapshot?.account?.signedIn) {
    return 'Create a private profile to activate a canonical company-domain route.';
  }

  if (!username) {
    return 'Reserve a canonical username before the public route can resolve.';
  }

  if (snapshot?.account?.profile?.public_profile_enabled) {
    return 'Canonical company-domain route is active.';
  }

  return 'Canonical username is reserved. Public visibility is still private.';
}

function renderHomePanelRight(snapshot) {
  HOME_PANEL_RIGHT_STATE.snapshot = snapshot;

  const nodes = getHomePanelRightNodes();
  const signedIn = !!snapshot?.account?.signedIn;
  const route = resolveHomePanelRightRoute(snapshot);
  const name = resolveHomePanelRightName(snapshot);
  const photo = snapshot?.account?.profile?.photo_url || snapshot?.account?.user?.photoURL || '';
  const fallback = (name.charAt(0) || 'N').toUpperCase();

  if (nodes.name) {
    nodes.name.textContent = name;
  }

  if (nodes.username) {
    nodes.username.textContent = resolveHomePanelRightUsername(snapshot);
  }

  if (nodes.meta) {
    nodes.meta.textContent = resolveHomePanelRightMeta(snapshot);
  }

  if (nodes.route) {
    nodes.route.textContent = route.display;
    nodes.route.setAttribute('href', route.path);
  }

  if (nodes.routeStatus) {
    nodes.routeStatus.textContent = resolveHomePanelRightRouteStatus(snapshot, route.username);
  }

  if (nodes.avatarImage) {
    if (photo) {
      nodes.avatarImage.hidden = false;
      nodes.avatarImage.src = photo;
      nodes.avatarImage.alt = name;
    } else {
      nodes.avatarImage.hidden = true;
      nodes.avatarImage.removeAttribute('src');
      nodes.avatarImage.alt = '';
    }
  }

  if (nodes.avatarFallback) {
    nodes.avatarFallback.hidden = !!photo;
    nodes.avatarFallback.textContent = fallback;
  }

  if (nodes.accountEntryAction) {
    nodes.accountEntryAction.textContent = signedIn ? 'Open private profile' : 'Create private profile';
  }

  if (nodes.signOutAction) {
    nodes.signOutAction.hidden = !signedIn;
  }
}

/* =========================================================
   04. ACTION HELPERS
   ========================================================= */

function normalizeHomePanelRightLabel(label) {
  return typeof label === 'string' ? label.trim().toLowerCase() : '';
}

function handleHomePanelRightAction(action) {
  const normalized = normalizeHomePanelRightLabel(action);

  if (normalized === 'open-profile') {
    if (HOME_PANEL_RIGHT_STATE.snapshot?.account?.signedIn) {
      window.location.href = '/profile.html';
      return;
    }

    dispatchHomePanelRightEvent('account:entry-request', {
      source: 'home-panel-right',
    });
    closeHomePanelRight();
    return;
  }

  if (normalized === 'public-route') {
    const path = resolveHomePanelRightRoute(HOME_PANEL_RIGHT_STATE.snapshot).path;
    window.location.href = path;
    return;
  }

  if (normalized === 'account-entry') {
    if (HOME_PANEL_RIGHT_STATE.snapshot?.account?.signedIn) {
      window.location.href = '/profile.html';
      return;
    }

    dispatchHomePanelRightEvent('account:entry-request', {
      source: 'home-panel-right',
    });
    closeHomePanelRight();
    return;
  }

  if (normalized === 'settings') {
    dispatchHomePanelRightEvent('neuroartan:home-settings-panel-open-requested', {
      source: 'home-panel-right',
    });
    closeHomePanelRight();
    return;
  }

  if (normalized === 'language') {
    dispatchHomePanelRightEvent('neuroartan:country-overlay-open-requested', {
      source: 'home-panel-right',
    });
    closeHomePanelRight();
    return;
  }

  if (normalized === 'privacy') {
    dispatchHomePanelRightEvent('neuroartan:cookie-consent-open-requested', {
      source: 'home-panel-right',
      surface: 'settings',
    });
    closeHomePanelRight();
    return;
  }

  if (normalized === 'sign-out') {
    dispatchHomePanelRightEvent('account:sign-out-request', {
      source: 'home-panel-right',
    });
    closeHomePanelRight();
    return;
  }

  dispatchHomePanelRightEvent('neuroartan:home-panel-right-item-selected', {
    label: action?.trim() || '',
    intent: HOME_PANEL_RIGHT_STATE.activeIntent,
  });
}

/* =========================================================
   05. EVENT BINDING
   ========================================================= */

function bindHomePanelRight() {
  subscribeHomeSurfaceState(renderHomePanelRight);

  document.addEventListener('click', (event) => {
    const root = getLivePanelRightRoot();
    if (!root) return;

    const target = event.target.closest(
      '#home-panel-right-close, ' +
      '#home-panel-right .home-panel-right__item'
    );

    if (!target || !root.contains(target)) {
      return;
    }

    if (target.matches('#home-panel-right-close')) {
      closeHomePanelRight();
      return;
    }

    if (target.matches('.home-panel-right__item')) {
      handleHomePanelRightAction(
        target.getAttribute('data-home-profile-action')
        || target.textContent
        || ''
      );
    }
  });

  document.addEventListener('neuroartan:home-panel-right-open-requested', (event) => {
    openHomePanelRight(event?.detail?.intent || null);
  });

  document.addEventListener('neuroartan:home-panel-right-close-requested', () => {
    closeHomePanelRight();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && HOME_PANEL_RIGHT_STATE.isOpen) {
      closeHomePanelRight();
    }
  });
}

/* =========================================================
   06. MODULE BOOT
   ========================================================= */

function bootHomePanelRight() {
  const root = getLivePanelRightRoot();
  if (!root) {
    return;
  }

  HOME_PANEL_RIGHT_STATE.root = root;

  if (HOME_PANEL_RIGHT_STATE.isBound) {
    renderHomePanelRight(HOME_PANEL_RIGHT_STATE.snapshot || {});
    return;
  }

  HOME_PANEL_RIGHT_STATE.isBound = true;
  bindHomePanelRight();
}

document.addEventListener('fragment:mounted', (event) => {
  if (event?.detail?.name !== 'home-panel-right') return;
  bootHomePanelRight();
});

document.addEventListener('neuroartan:runtime-ready', () => {
  bootHomePanelRight();
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootHomePanelRight, { once: true });
} else {
  bootHomePanelRight();
}
