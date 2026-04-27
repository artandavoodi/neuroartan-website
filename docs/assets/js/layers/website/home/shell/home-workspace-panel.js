import { subscribeHomeSurfaceState } from '../core/home-surface-state.js';

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

const HOME_WORKSPACE_PANEL_STATE = {
  isBound: false,
  isOpen: false,
  activeIntent: null,
  root: null,
  snapshot: null,
};

/* =========================================================
   02. DOM HELPERS
   ========================================================= */

function getHomeWorkspacePanelNodes() {
  return {
    panel: document.querySelector('#home-workspace-panel'),
    closeButton: document.querySelector('#home-workspace-panel-close'),
    title: document.querySelector('#home-workspace-panel .home-workspace-panel__title'),
    items: Array.from(document.querySelectorAll('#home-workspace-panel .home-workspace-panel__item')),
    modeValue: document.querySelector('[data-home-workspace-mode]'),
    routeValue: document.querySelector('[data-home-workspace-route]'),
    queryValue: document.querySelector('[data-home-workspace-query]'),
    responseValue: document.querySelector('[data-home-workspace-response]'),
  };
}

function dispatchHomeWorkspacePanelEvent(name, detail = {}) {
  document.dispatchEvent(new CustomEvent(name, { detail }));
}

function getLiveWorkspacePanelRoot() {
  return document.querySelector('#home-workspace-panel');
}

/* =========================================================
   03. PANEL STATE HELPERS
   ========================================================= */

function getHomeWorkspacePanelTitleForIntent(intent) {
  switch (intent) {
    case 'history':
      return 'Continuity workspace and continuity history';
    case 'knowledge':
      return 'Continuity workspace and knowledge surface';
    default:
      return 'Continuity workspace and current interaction';
  }
}

function syncHomeWorkspacePanelIntent(intent) {
  const nodes = getHomeWorkspacePanelNodes();
  HOME_WORKSPACE_PANEL_STATE.activeIntent = intent || null;

  if (nodes.title) {
    nodes.title.textContent = getHomeWorkspacePanelTitleForIntent(HOME_WORKSPACE_PANEL_STATE.activeIntent);
  }

  if (nodes.panel) {
    nodes.panel.dataset.panelIntent = HOME_WORKSPACE_PANEL_STATE.activeIntent || 'default';
  }
}

function openHomeWorkspacePanel(intent = null) {
  const nodes = getHomeWorkspacePanelNodes();

  if (!nodes.panel) {
    return;
  }

  HOME_WORKSPACE_PANEL_STATE.isOpen = true;
  nodes.panel.hidden = false;
  document.documentElement.classList.add('home-workspace-panel-open');
  document.body.classList.add('home-workspace-panel-open');
  syncHomeWorkspacePanelIntent(intent);
}

function closeHomeWorkspacePanel() {
  const nodes = getHomeWorkspacePanelNodes();

  if (!nodes.panel) {
    return;
  }

  HOME_WORKSPACE_PANEL_STATE.isOpen = false;
  nodes.panel.hidden = true;
  document.documentElement.classList.remove('home-workspace-panel-open');
  document.body.classList.remove('home-workspace-panel-open');
  syncHomeWorkspacePanelIntent(null);
  dispatchHomeWorkspacePanelEvent('neuroartan:home-topbar-reset-triggers');
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

function renderHomeWorkspacePanel(snapshot) {
  HOME_WORKSPACE_PANEL_STATE.snapshot = snapshot;

  const nodes = getHomeWorkspacePanelNodes();

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
      'Responses, route classification, and continuity traces appear here after the first interaction.'
    );
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

function bindHomeWorkspacePanel() {
  subscribeHomeSurfaceState(renderHomeWorkspacePanel);

  document.addEventListener('click', (event) => {
    const root = getLiveWorkspacePanelRoot();
    if (!root) return;

    const target = event.target.closest(
      '#home-workspace-panel-close, ' +
      '#home-workspace-panel .home-workspace-panel__item'
    );

    if (!target || !root.contains(target)) {
      return;
    }

    if (target.matches('#home-workspace-panel-close')) {
      closeHomeWorkspacePanel();
      return;
    }

    if (target.matches('.home-workspace-panel__item')) {
      const action = target.getAttribute('data-home-workspace-action') || '';

      if (action === 'voice') {
        closeHomeWorkspacePanel();
        requestMicrophoneInteraction();
        return;
      }

      if (action === 'history') {
        window.location.href = '/pages/continuity-history/index.html';
        return;
      }

      if (action === 'knowledge') {
        window.location.href = '/pages/knowledge-research/index.html';
        return;
      }

      dispatchHomeWorkspacePanelEvent('neuroartan:home-workspace-panel-item-selected', {
        label: target.textContent?.trim() || '',
        intent: HOME_WORKSPACE_PANEL_STATE.activeIntent,
      });
    }
  });

  document.addEventListener('neuroartan:home-workspace-panel-open-requested', (event) => {
    openHomeWorkspacePanel(event?.detail?.intent || null);
  });

  document.addEventListener('neuroartan:home-workspace-panel-close-requested', () => {
    closeHomeWorkspacePanel();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && HOME_WORKSPACE_PANEL_STATE.isOpen) {
      closeHomeWorkspacePanel();
    }
  });
}

/* =========================================================
   05. MODULE BOOT
   ========================================================= */

function bootHomeWorkspacePanel() {
  const root = getLiveWorkspacePanelRoot();
  if (!root) {
    return;
  }

  HOME_WORKSPACE_PANEL_STATE.root = root;

  if (HOME_WORKSPACE_PANEL_STATE.isBound) {
    renderHomeWorkspacePanel(HOME_WORKSPACE_PANEL_STATE.snapshot || {});
    return;
  }

  HOME_WORKSPACE_PANEL_STATE.isBound = true;
  bindHomeWorkspacePanel();
}

document.addEventListener('fragment:mounted', (event) => {
  if (event?.detail?.name !== 'home-workspace-panel') return;
  bootHomeWorkspacePanel();
});

document.addEventListener('neuroartan:runtime-ready', () => {
  bootHomeWorkspacePanel();
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootHomeWorkspacePanel, { once: true });
} else {
  bootHomeWorkspacePanel();
}