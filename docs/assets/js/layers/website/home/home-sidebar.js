/* =========================================================
   00. FILE INDEX
   01. MODULE STATE
   02. DOM HELPERS
   03. SIDEBAR ACTION HELPERS
   04. EVENT BINDING
   05. MODULE BOOT
   ========================================================= */

/* =========================================================
   01. MODULE STATE
   ========================================================= */

const HOME_SIDEBAR_STATE = {
  isBound: false,
  root: null,
};

/* =========================================================
   02. DOM HELPERS
   ========================================================= */

function getHomeSidebarNodes() {
  const root = document.querySelector('#home-sidebar');

  return {
    root,
    closeButton: document.querySelector('#home-sidebar-close'),
    quickActionButtons: root ? Array.from(root.querySelectorAll('.home-sidebar__stack-item')) : [],
    navLinks: root ? Array.from(root.querySelectorAll('.home-sidebar__nav-link')) : [],
  };
}

function dispatchHomeSidebarEvent(name, detail = {}) {
  document.dispatchEvent(new CustomEvent(name, { detail }));
}

function getLiveSidebarRoot() {
  return document.querySelector('#home-sidebar');
}

function openHomeSidebar() {
  const nodes = getHomeSidebarNodes();

  if (!nodes.root) {
    return;
  }

  nodes.root.hidden = false;
  document.documentElement.classList.add('home-sidebar-open');
  document.body.classList.add('home-sidebar-open');
}

function closeHomeSidebar() {
  const nodes = getHomeSidebarNodes();

  if (!nodes.root) {
    return;
  }

  nodes.root.hidden = true;
  document.documentElement.classList.remove('home-sidebar-open');
  document.body.classList.remove('home-sidebar-open');
  dispatchHomeSidebarEvent('neuroartan:home-topbar-reset-triggers');
}

/* =========================================================
   03. SIDEBAR ACTION HELPERS
   ========================================================= */

function normalizeSidebarLabel(label) {
  return typeof label === 'string' ? label.trim().toLowerCase() : '';
}

function handleHomeSidebarQuickAction(label) {
  const normalized = normalizeSidebarLabel(label);

  if (normalized === 'open search') {
    dispatchHomeSidebarEvent('neuroartan:home-search-shell-open-requested', {
      source: 'home-sidebar',
    });
    closeHomeSidebar();
    return;
  }

  if (normalized === 'settings') {
    dispatchHomeSidebarEvent('neuroartan:home-settings-panel-open-requested', {
      source: 'home-sidebar',
    });
    closeHomeSidebar();
    return;
  }

  if (normalized === 'create profile') {
    dispatchHomeSidebarEvent('neuroartan:home-panel-right-open-requested', {
      source: 'home-sidebar',
      intent: 'create-profile',
    });
    closeHomeSidebar();
    return;
  }

  if (normalized === 'my profile model') {
    dispatchHomeSidebarEvent('neuroartan:home-panel-right-open-requested', {
      source: 'home-sidebar',
      intent: 'profile-model',
    });
    closeHomeSidebar();
    return;
  }

  if (normalized === 'saved continuities') {
    dispatchHomeSidebarEvent('neuroartan:home-panel-left-open-requested', {
      source: 'home-sidebar',
      intent: 'saved-continuities',
    });
    closeHomeSidebar();
    return;
  }

  if (normalized === 'recent interactions') {
    dispatchHomeSidebarEvent('neuroartan:home-panel-left-open-requested', {
      source: 'home-sidebar',
      intent: 'recent-interactions',
    });
    closeHomeSidebar();
  }
}

/* =========================================================
   04. EVENT BINDING
   ========================================================= */

function bindHomeSidebar() {
  document.addEventListener('click', (event) => {
    const root = getLiveSidebarRoot();
    if (!root) return;

    const target = event.target.closest(
      '#home-sidebar-close, ' +
      '#home-sidebar .home-sidebar__stack-item, ' +
      '#home-sidebar .home-sidebar__nav-link'
    );

    if (!target || !root.contains(target)) {
      return;
    }

    if (target.matches('#home-sidebar-close')) {
      closeHomeSidebar();
      return;
    }

    if (target.matches('.home-sidebar__stack-item')) {
      handleHomeSidebarQuickAction(target.textContent || '');
      return;
    }

    if (target.matches('.home-sidebar__nav-link')) {
      closeHomeSidebar();
    }
  });

  document.addEventListener('neuroartan:home-sidebar-open-requested', () => {
    openHomeSidebar();
  });

  document.addEventListener('neuroartan:home-sidebar-close-requested', () => {
    closeHomeSidebar();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && document.body.classList.contains('home-sidebar-open')) {
      closeHomeSidebar();
    }
  });
}

/* =========================================================
   05. MODULE BOOT
   ========================================================= */

function bootHomeSidebar() {
  const root = getLiveSidebarRoot();
  if (!root) {
    return;
  }

  HOME_SIDEBAR_STATE.root = root;

  if (HOME_SIDEBAR_STATE.isBound) {
    return;
  }

  HOME_SIDEBAR_STATE.isBound = true;
  bindHomeSidebar();
}

document.addEventListener('fragment:mounted', (event) => {
  if (event?.detail?.name !== 'home-sidebar') return;
  bootHomeSidebar();
});

document.addEventListener('neuroartan:runtime-ready', () => {
  bootHomeSidebar();
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootHomeSidebar, { once: true });
} else {
  bootHomeSidebar();
}
