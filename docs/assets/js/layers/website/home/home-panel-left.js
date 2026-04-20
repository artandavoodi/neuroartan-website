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

/* =========================================================
   04. EVENT BINDING
   ========================================================= */

function bindHomePanelLeft() {
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
