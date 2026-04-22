import {
  buildPublicProfileDisplay,
  buildPublicProfilePath,
} from '../system/account-profile-identity.js';
import {
  getPublicModels,
  loadPublicModelRegistry
} from '../system/public-model-registry.js';
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
    plan: document.querySelector('[data-home-profile-plan]'),
    meta: document.querySelector('[data-home-profile-meta]'),
    route: document.querySelector('[data-home-profile-route]'),
    routeStatus: document.querySelector('[data-home-profile-route-status]'),
    verification: document.querySelector('[data-home-profile-verification]'),
    modelCount: document.querySelector('[data-home-profile-model-count]'),
    state: document.querySelector('[data-home-profile-state]'),
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
      return 'Create private profile and account identity';
    default:
      return 'Profile, plan, and account control';
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
    return 'Authenticate to activate identity, verification, and owned-model control from one account surface.';
  }

  if (snapshot?.account?.profileComplete === false) {
    return 'Your account is active. Complete the private profile to stabilize route control, verification posture, and model ownership.';
  }

  return 'Private profile anchored for account identity, subscription clarity, verification posture, and platform control.';
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

function capitalizeWords(value) {
  return String(value || '')
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function resolveHomePanelRightPlan(snapshot) {
  const explicitPlan = snapshot?.account?.profile?.subscription_plan || '';

  if (explicitPlan) {
    return capitalizeWords(explicitPlan);
  }

  if (!snapshot?.account?.signedIn) {
    return 'Guest Access';
  }

  return 'Plan Pending';
}

function resolveHomePanelRightVerification(snapshot) {
  if (!snapshot?.account?.signedIn) {
    return 'Unverified';
  }

  if (snapshot?.account?.profile?.verification_state) {
    return capitalizeWords(snapshot.account.profile.verification_state);
  }

  if (snapshot?.account?.profile?.auth_email_verified || snapshot?.account?.user?.emailVerified) {
    return 'Verified';
  }

  return 'Verification Pending';
}

function resolveHomePanelRightState(snapshot) {
  if (!snapshot?.account?.signedIn) {
    return 'Private';
  }

  return snapshot?.account?.profile?.public_profile_enabled ? 'Public' : 'Private';
}

function resolveHomePanelRightModelCount(snapshot) {
  const username = (snapshot?.account?.profile?.username || '').trim().toLowerCase();
  if (!username) {
    return '0';
  }

  const total = getPublicModels().filter((model) => {
    const modelUsername = String(model?.username || '').trim().toLowerCase();
    const creatorUsername = String(model?.creator?.username || '').trim().toLowerCase();
    return modelUsername === username || creatorUsername === username;
  }).length;

  return String(total);
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

  if (nodes.plan) {
    nodes.plan.textContent = resolveHomePanelRightPlan(snapshot);
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

  if (nodes.verification) {
    nodes.verification.textContent = resolveHomePanelRightVerification(snapshot);
  }

  if (nodes.modelCount) {
    nodes.modelCount.textContent = resolveHomePanelRightModelCount(snapshot);
  }

  if (nodes.state) {
    nodes.state.textContent = resolveHomePanelRightState(snapshot);
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

  if (normalized === 'account-identity' || normalized === 'verification' || normalized === 'linked-accounts') {
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

  if (normalized === 'subscription-plan') {
    window.location.href = '/pages/pricing/index.html';
    return;
  }

  if (normalized === 'my-models') {
    window.location.href = '/pages/models/index.html';
    return;
  }

  if (normalized === 'dashboard') {
    window.location.href = '/pages/dashboard/index.html';
    return;
  }

  if (normalized === 'settings') {
    dispatchHomePanelRightEvent('neuroartan:home-settings-panel-open-requested', {
      source: 'home-panel-right',
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
  void loadPublicModelRegistry().then(() => {
    renderHomePanelRight(HOME_PANEL_RIGHT_STATE.snapshot || {});
  });

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
