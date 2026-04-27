import {
  buildPublicProfileDisplay,
  buildPublicProfilePath,
} from '../../system/account-profile-identity.js';
import {
  getPublicModels,
  loadPublicModelRegistry,
} from '../../system/public-model-registry.js';
import { subscribeHomeSurfaceState } from '../core/home-surface-state.js';

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

const HOME_PROFILE_CONTROL_PANEL_STATE = {
  isBound: false,
  isOpen: false,
  activeIntent: null,
  root: null,
  snapshot: null,
};

/* =========================================================
   02. DOM HELPERS
   ========================================================= */

function getHomeProfileControlPanelNodes() {
  return {
    panel: document.querySelector('#home-profile-control-panel'),
    closeButton: document.querySelector('#home-profile-control-panel-close'),
    title: document.querySelector('#home-profile-control-panel .home-profile-control-panel__title'),
    items: Array.from(document.querySelectorAll('#home-profile-control-panel .home-profile-control-panel__item')),
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

function dispatchHomeProfileControlPanelEvent(name, detail = {}) {
  document.dispatchEvent(new CustomEvent(name, { detail }));
}

function getLiveHomeProfileControlPanelRoot() {
  return document.querySelector('#home-profile-control-panel');
}

function getHomeProfileControlPanelSnapshot() {
  return HOME_PROFILE_CONTROL_PANEL_STATE.snapshot || {};
}

function isHomeProfileSignedIn(snapshot = getHomeProfileControlPanelSnapshot()) {
  return !!snapshot?.account?.signedIn;
}

function isHomeProfileComplete(snapshot = getHomeProfileControlPanelSnapshot()) {
  if (!isHomeProfileSignedIn(snapshot)) return false;

  return snapshot?.account?.profileComplete === true || snapshot?.account?.profile?.profile_complete === true;
}

function requestAccountEntry(source = 'home-profile-control-panel') {
  dispatchHomeProfileControlPanelEvent('account:entry-request', {
    source,
  });
}

function requestProfileSetup(source = 'home-profile-control-panel') {
  dispatchHomeProfileControlPanelEvent('account:profile-setup-open-request', {
    source,
    reason: 'profile-incomplete',
  });
}

/* =========================================================
   03. PANEL STATE HELPERS
   ========================================================= */

function getHomeProfileControlPanelTitleForIntent(intent) {
  switch (intent) {
    case 'create-profile':
      return 'Create private profile and account identity';
    default:
      return 'Profile, subscription, trust, and account control';
  }
}

function syncHomeProfileControlPanelIntent(intent) {
  const nodes = getHomeProfileControlPanelNodes();
  HOME_PROFILE_CONTROL_PANEL_STATE.activeIntent = intent || null;

  if (nodes.title) {
    nodes.title.textContent = getHomeProfileControlPanelTitleForIntent(
      HOME_PROFILE_CONTROL_PANEL_STATE.activeIntent
    );
  }

  if (nodes.panel) {
    nodes.panel.dataset.panelIntent = HOME_PROFILE_CONTROL_PANEL_STATE.activeIntent || 'default';
  }
}

function openHomeProfileControlPanel(intent = null) {
  const nodes = getHomeProfileControlPanelNodes();

  if (!nodes.panel) {
    return;
  }

  const snapshot = getHomeProfileControlPanelSnapshot();

  if (!isHomeProfileSignedIn(snapshot)) {
    requestAccountEntry('home-profile-control-trigger');
    return;
  }

  dispatchHomeProfileControlPanelEvent('home:platform-shell-close-request', {
    source: 'home-profile-control-panel',
  });
  HOME_PROFILE_CONTROL_PANEL_STATE.isOpen = true;
  nodes.panel.hidden = false;
  document.documentElement.classList.add('home-profile-control-panel-open');
  document.body.classList.add('home-profile-control-panel-open');
  syncHomeProfileControlPanelIntent(intent);
}

function closeHomeProfileControlPanel() {
  const nodes = getHomeProfileControlPanelNodes();

  if (!nodes.panel) {
    return;
  }

  HOME_PROFILE_CONTROL_PANEL_STATE.isOpen = false;
  nodes.panel.hidden = true;
  document.documentElement.classList.remove('home-profile-control-panel-open');
  document.body.classList.remove('home-profile-control-panel-open');
  syncHomeProfileControlPanelIntent(null);
  dispatchHomeProfileControlPanelEvent('neuroartan:home-topbar-reset-triggers');
}

function resolveHomeProfileControlPanelName(snapshot) {
  return (
    snapshot?.account?.profile?.display_name ||
    snapshot?.account?.user?.displayName ||
    snapshot?.account?.profile?.email ||
    snapshot?.account?.user?.email ||
    'Create your Neuroartan account'
  );
}

function resolveHomeProfileControlPanelUsername(snapshot) {
  const username = snapshot?.account?.profile?.username || '';
  if (username) return `@${username}`;

  return snapshot?.account?.signedIn ? '@username pending' : '@account required';
}

function resolveHomeProfileControlPanelMeta(snapshot) {
  if (!snapshot?.account?.signedIn) {
    return 'Authenticate to activate identity, verification, owned-model control, and subscription clarity from one account surface.';
  }

  if (snapshot?.account?.profileComplete === false) {
    return 'Your account is active. Complete the private profile to stabilize route control, verification posture, and model ownership.';
  }

  return 'Private profile anchored for account identity, subscription clarity, verification posture, and platform control.';
}

function resolveHomeProfileControlPanelRoute(snapshot) {
  const username = snapshot?.account?.profile?.username || '';
  return {
    display: buildPublicProfileDisplay(username),
    path: buildPublicProfilePath(username) || '/profile.html',
    username,
  };
}

function resolveHomeProfileControlPanelRouteStatus(snapshot, username) {
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

function resolveHomeProfileControlPanelPlan(snapshot) {
  const explicitPlan = snapshot?.account?.profile?.subscription_plan || '';

  if (explicitPlan) {
    return capitalizeWords(explicitPlan);
  }

  if (!snapshot?.account?.signedIn) {
    return 'Guest Access';
  }

  return 'Plan Pending';
}

function resolveHomeProfileControlPanelVerification(snapshot) {
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

function resolveHomeProfileControlPanelState(snapshot) {
  if (!snapshot?.account?.signedIn) {
    return 'Private';
  }

  return snapshot?.account?.profile?.public_profile_enabled ? 'Public' : 'Private';
}

function resolveHomeProfileControlPanelModelCount(snapshot) {
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

function renderHomeProfileControlPanel(snapshot) {
  HOME_PROFILE_CONTROL_PANEL_STATE.snapshot = snapshot;

  const nodes = getHomeProfileControlPanelNodes();
  const signedIn = !!snapshot?.account?.signedIn;
  const route = resolveHomeProfileControlPanelRoute(snapshot);
  const name = resolveHomeProfileControlPanelName(snapshot);
  const photo = snapshot?.account?.profile?.photo_url || snapshot?.account?.user?.photoURL || '';
  const fallback = (name.charAt(0) || 'N').toUpperCase();

  if (nodes.name) {
    nodes.name.textContent = name;
  }

  if (nodes.username) {
    nodes.username.textContent = resolveHomeProfileControlPanelUsername(snapshot);
  }

  if (nodes.plan) {
    nodes.plan.textContent = resolveHomeProfileControlPanelPlan(snapshot);
  }

  if (nodes.meta) {
    nodes.meta.textContent = resolveHomeProfileControlPanelMeta(snapshot);
  }

  if (nodes.route) {
    nodes.route.textContent = route.display;
    nodes.route.setAttribute('href', route.path);
  }

  if (nodes.routeStatus) {
    nodes.routeStatus.textContent = resolveHomeProfileControlPanelRouteStatus(snapshot, route.username);
  }

  if (nodes.verification) {
    nodes.verification.textContent = resolveHomeProfileControlPanelVerification(snapshot);
  }

  if (nodes.modelCount) {
    nodes.modelCount.textContent = resolveHomeProfileControlPanelModelCount(snapshot);
  }

  if (nodes.state) {
    nodes.state.textContent = resolveHomeProfileControlPanelState(snapshot);
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

function normalizeHomeProfileControlPanelLabel(label) {
  return typeof label === 'string' ? label.trim().toLowerCase() : '';
}

function handleHomeProfileControlPanelAction(action) {
  const normalized = normalizeHomeProfileControlPanelLabel(action);

  if (normalized === 'account-identity' || normalized === 'verification' || normalized === 'linked-accounts') {
    const snapshot = getHomeProfileControlPanelSnapshot();

    if (!isHomeProfileSignedIn(snapshot)) {
      requestAccountEntry('home-profile-control-panel');
      closeHomeProfileControlPanel();
      return;
    }

    if (!isHomeProfileComplete(snapshot)) {
      requestProfileSetup('home-profile-control-panel');
      closeHomeProfileControlPanel();
      return;
    }

    window.location.href = '/profile.html';
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
    dispatchHomeProfileControlPanelEvent('home:platform-shell-open-request', {
      destination: 'settings',
      source: 'home-profile-control-panel',
    });
    closeHomeProfileControlPanel();
    return;
  }

  if (normalized === 'sign-out') {
    dispatchHomeProfileControlPanelEvent('account:sign-out-request', {
      source: 'home-profile-control-panel',
    });
    closeHomeProfileControlPanel();
    return;
  }

  dispatchHomeProfileControlPanelEvent('neuroartan:home-profile-control-panel-item-selected', {
    label: action?.trim() || '',
    intent: HOME_PROFILE_CONTROL_PANEL_STATE.activeIntent,
  });
}

/* =========================================================
   05. EVENT BINDING
   ========================================================= */

function bindHomeProfileControlPanel() {
  void loadPublicModelRegistry().then(() => {
    renderHomeProfileControlPanel(HOME_PROFILE_CONTROL_PANEL_STATE.snapshot || {});
  });

  subscribeHomeSurfaceState(renderHomeProfileControlPanel);

  document.addEventListener('click', (event) => {
    const root = getLiveHomeProfileControlPanelRoot();
    if (!root) return;

    const target = event.target.closest(
      '#home-profile-control-panel-close, ' +
      '#home-profile-control-panel [data-home-profile-control-panel-close], ' +
      '#home-profile-control-panel .home-profile-control-panel__item'
    );

    if (!target || !root.contains(target)) {
      return;
    }

    if (target.matches('#home-profile-control-panel-close, [data-home-profile-control-panel-close]')) {
      closeHomeProfileControlPanel();
      return;
    }

    if (target.matches('.home-profile-control-panel__item')) {
      handleHomeProfileControlPanelAction(
        target.getAttribute('data-home-profile-action') ||
        target.textContent ||
        ''
      );
    }
  });

  document.addEventListener('neuroartan:home-profile-control-panel-open-requested', (event) => {
    openHomeProfileControlPanel(event?.detail?.intent || null);
  });

  document.addEventListener('neuroartan:home-profile-control-panel-close-requested', () => {
    closeHomeProfileControlPanel();
  });

  document.addEventListener('home:platform-shell-open-request', () => {
    closeHomeProfileControlPanel();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && HOME_PROFILE_CONTROL_PANEL_STATE.isOpen) {
      closeHomeProfileControlPanel();
    }
  });
}

/* =========================================================
   06. MODULE BOOT
   ========================================================= */

function bootHomeProfileControlPanel() {
  const root = getLiveHomeProfileControlPanelRoot();
  if (!root) {
    return;
  }

  HOME_PROFILE_CONTROL_PANEL_STATE.root = root;

  if (HOME_PROFILE_CONTROL_PANEL_STATE.isBound) {
    renderHomeProfileControlPanel(HOME_PROFILE_CONTROL_PANEL_STATE.snapshot || {});
    return;
  }

  HOME_PROFILE_CONTROL_PANEL_STATE.isBound = true;
  bindHomeProfileControlPanel();
}

document.addEventListener('fragment:mounted', (event) => {
  if (event?.detail?.name !== 'home-profile-control-panel') return;
  bootHomeProfileControlPanel();
});

document.addEventListener('neuroartan:runtime-ready', () => {
  bootHomeProfileControlPanel();
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootHomeProfileControlPanel, { once: true });
} else {
  bootHomeProfileControlPanel();
}
