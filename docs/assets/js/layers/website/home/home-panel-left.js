import { subscribeHomeSurfaceState } from './home-surface-state.js';

/* =========================================================
   00. FILE INDEX
   01. MODULE STATE
   02. DOM HELPERS
   03. PANEL STATE HELPERS
   04. EVENT BINDING
   05. MODULE BOOT
   ========================================================= */

/* =========================================================
   01. MODULE STATE
   ========================================================= */

const HOME_PANEL_LEFT_STATE = {
  isBound: false,
  isOpen: false,
  activeIntent: null,
  root: null,
  snapshot: null,
};

/* =========================================================
   02. DOM HELPERS
   ========================================================= */

function getHomePanelLeftNodes() {
  return {
    panel: document.querySelector('#home-panel-left'),
    closeButton: document.querySelector('#home-panel-left-close'),
    title: document.querySelector('#home-panel-left .home-panel-left__title'),
    items: Array.from(document.querySelectorAll('#home-panel-left .home-panel-left__item')),
    modeValue: document.querySelector('[data-home-workspace-mode]'),
    routeValue: document.querySelector('[data-home-workspace-route]'),
    queryValue: document.querySelector('[data-home-workspace-query]'),
    responseValue: document.querySelector('[data-home-workspace-response]'),
    profileAction: document.querySelector('[data-home-workspace-action="profile"]'),
  };
}

function dispatchHomePanelLeftEvent(name, detail = {}) {
  document.dispatchEvent(new CustomEvent(name, { detail }));
}

function getLivePanelLeftRoot() {
  return document.querySelector('#home-panel-left');
}

/* =========================================================
   03. PANEL STATE HELPERS
   ========================================================= */

function getHomePanelLeftTitleForIntent(intent) {
  switch (intent) {
    case 'saved-continuities':
      return 'Continuities and saved memory surfaces';
    case 'recent-interactions':
      return 'Recent interactions and active retrieval threads';
    default:
      return 'Continuities and recent interactions';
  }
}

function syncHomePanelLeftIntent(intent) {
  const nodes = getHomePanelLeftNodes();
  HOME_PANEL_LEFT_STATE.activeIntent = intent || null;

  if (nodes.title) {
    nodes.title.textContent = getHomePanelLeftTitleForIntent(HOME_PANEL_LEFT_STATE.activeIntent);
  }

  if (nodes.panel) {
    nodes.panel.dataset.panelIntent = HOME_PANEL_LEFT_STATE.activeIntent || 'default';
  }
}

function openHomePanelLeft(intent = null) {
  const nodes = getHomePanelLeftNodes();

  if (!nodes.panel) {
    return;
  }

  HOME_PANEL_LEFT_STATE.isOpen = true;
  nodes.panel.hidden = false;
  document.documentElement.classList.add('home-panel-left-open');
  document.body.classList.add('home-panel-left-open');
  syncHomePanelLeftIntent(intent);
}

function closeHomePanelLeft() {
  const nodes = getHomePanelLeftNodes();

  if (!nodes.panel) {
    return;
  }

  HOME_PANEL_LEFT_STATE.isOpen = false;
  nodes.panel.hidden = true;
  document.documentElement.classList.remove('home-panel-left-open');
  document.body.classList.remove('home-panel-left-open');
  syncHomePanelLeftIntent(null);
  dispatchHomePanelLeftEvent('neuroartan:home-topbar-reset-triggers');
}

function getVoiceModeLabel(mode) {
  switch (String(mode || '').toLowerCase()) {
    case 'listening':
      return 'Listening';
    case 'thinking':
      return 'Thinking';
    case 'responding':
      return 'Responding';
    default:
      return 'Idle';
  }
}

function getRouteLabel(route) {
  switch (String(route || '').toLowerCase()) {
    case 'knowledge':
      return 'Knowledge';
    case 'site-knowledge':
      return 'Website knowledge';
    case 'platform-search':
      return 'Platform search';
    case 'web':
      return 'Web retrieval';
    default:
      return 'Awaiting a query';
  }
}

function buildSummaryText(value, fallback) {
  const normalized = typeof value === 'string' ? value.trim() : '';
  return normalized || fallback;
}

function renderHomePanelLeft(snapshot) {
  HOME_PANEL_LEFT_STATE.snapshot = snapshot;

  const nodes = getHomePanelLeftNodes();

  if (nodes.modeValue) {
    nodes.modeValue.textContent = getVoiceModeLabel(snapshot?.voice?.mode);
  }

  if (nodes.routeValue) {
    nodes.routeValue.textContent = getRouteLabel(snapshot?.voice?.lastRoute);
  }

  if (nodes.queryValue) {
    nodes.queryValue.textContent = buildSummaryText(
      snapshot?.voice?.lastQuery,
      'Ask a question by voice or search to create a continuity trace across the homepage surface.'
    );
  }

  if (nodes.responseValue) {
    nodes.responseValue.textContent = buildSummaryText(
      snapshot?.voice?.response,
      'Responses and route classification will appear here after your first interaction.'
    );
  }

  if (nodes.profileAction) {
    nodes.profileAction.textContent = snapshot?.account?.signedIn ? 'Open profile surface' : 'Create account';
  }
}

function requestMicrophoneInteraction() {
  const microphone = document.querySelector('#stage-microphone-button');
  if (!(microphone instanceof HTMLButtonElement)) {
    return;
  }

  microphone.click();
}

/* =========================================================
   04. EVENT BINDING
   ========================================================= */

function bindHomePanelLeft() {
  subscribeHomeSurfaceState(renderHomePanelLeft);

  document.addEventListener('click', (event) => {
    const root = getLivePanelLeftRoot();
    if (!root) return;

    const target = event.target.closest(
      '#home-panel-left-close, ' +
      '#home-panel-left .home-panel-left__item'
    );

    if (!target || !root.contains(target)) {
      return;
    }

    if (target.matches('#home-panel-left-close')) {
      closeHomePanelLeft();
      return;
    }

    if (target.matches('.home-panel-left__item')) {
      const action = target.getAttribute('data-home-workspace-action') || '';

      if (action === 'voice') {
        closeHomePanelLeft();
        requestMicrophoneInteraction();
        return;
      }

      if (action === 'search') {
        dispatchHomePanelLeftEvent('neuroartan:home-search-shell-open-requested', {
          source: 'home-panel-left',
        });
        closeHomePanelLeft();
        return;
      }

      if (action === 'profile') {
        if (HOME_PANEL_LEFT_STATE.snapshot?.account?.signedIn) {
          window.location.href = '/profile.html';
          return;
        }

        dispatchHomePanelLeftEvent('neuroartan:home-panel-right-open-requested', {
          source: 'home-panel-left',
          intent: 'create-profile',
        });
        closeHomePanelLeft();
        return;
      }

      dispatchHomePanelLeftEvent('neuroartan:home-panel-left-item-selected', {
        label: target.textContent?.trim() || '',
        intent: HOME_PANEL_LEFT_STATE.activeIntent,
      });
    }
  });

  document.addEventListener('neuroartan:home-panel-left-open-requested', (event) => {
    openHomePanelLeft(event?.detail?.intent || null);
  });

  document.addEventListener('neuroartan:home-panel-left-close-requested', () => {
    closeHomePanelLeft();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && HOME_PANEL_LEFT_STATE.isOpen) {
      closeHomePanelLeft();
    }
  });
}

/* =========================================================
   05. MODULE BOOT
   ========================================================= */

function bootHomePanelLeft() {
  const root = getLivePanelLeftRoot();
  if (!root) {
    return;
  }

  HOME_PANEL_LEFT_STATE.root = root;

  if (HOME_PANEL_LEFT_STATE.isBound) {
    renderHomePanelLeft(HOME_PANEL_LEFT_STATE.snapshot || {});
    return;
  }

  HOME_PANEL_LEFT_STATE.isBound = true;
  bindHomePanelLeft();
}

document.addEventListener('fragment:mounted', (event) => {
  if (event?.detail?.name !== 'home-panel-left') return;
  bootHomePanelLeft();
});

document.addEventListener('neuroartan:runtime-ready', () => {
  bootHomePanelLeft();
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootHomePanelLeft, { once: true });
} else {
  bootHomePanelLeft();
}
