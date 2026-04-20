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
      return 'Create profile and initialize model access';
    case 'profile-model':
      return 'Profile model, account, and identity access';
    default:
      return 'Account, identity, and model access';
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

/* =========================================================
   04. ACTION HELPERS
   ========================================================= */

function normalizeHomePanelRightLabel(label) {
  return typeof label === 'string' ? label.trim().toLowerCase() : '';
}

function handleHomePanelRightAction(label) {
  const normalized = normalizeHomePanelRightLabel(label);

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

  dispatchHomePanelRightEvent('neuroartan:home-panel-right-item-selected', {
    label: label?.trim() || '',
    intent: HOME_PANEL_RIGHT_STATE.activeIntent,
  });
}

/* =========================================================
   05. EVENT BINDING
   ========================================================= */

function bindHomePanelRight() {
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
      handleHomePanelRightAction(target.textContent || '');
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
