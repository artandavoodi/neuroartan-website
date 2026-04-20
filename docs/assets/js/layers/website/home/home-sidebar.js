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
};

/* =========================================================
   02. DOM HELPERS
   ========================================================= */

function getHomeSidebarNodes() {
  const root = document.querySelector('#home-sidebar');

  return {
    root,
    quickActionButtons: root ? Array.from(root.querySelectorAll('.home-sidebar__stack-item')) : [],
    navLinks: root ? Array.from(root.querySelectorAll('.home-sidebar__nav-link')) : [],
  };
}

function dispatchHomeSidebarEvent(name, detail = {}) {
  document.dispatchEvent(new CustomEvent(name, { detail }));
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
    return;
  }

  if (normalized === 'settings') {
    dispatchHomeSidebarEvent('neuroartan:home-settings-panel-open-requested', {
      source: 'home-sidebar',
    });
    return;
  }

  if (normalized === 'create profile') {
    dispatchHomeSidebarEvent('neuroartan:home-panel-right-open-requested', {
      source: 'home-sidebar',
      intent: 'create-profile',
    });
    return;
  }

  if (normalized === 'my profile model') {
    dispatchHomeSidebarEvent('neuroartan:home-panel-right-open-requested', {
      source: 'home-sidebar',
      intent: 'profile-model',
    });
    return;
  }

  if (normalized === 'saved continuities') {
    dispatchHomeSidebarEvent('neuroartan:home-panel-left-open-requested', {
      source: 'home-sidebar',
      intent: 'saved-continuities',
    });
    return;
  }

  if (normalized === 'recent interactions') {
    dispatchHomeSidebarEvent('neuroartan:home-panel-left-open-requested', {
      source: 'home-sidebar',
      intent: 'recent-interactions',
    });
  }
}

/* =========================================================
   04. EVENT BINDING
   ========================================================= */

function bindHomeSidebar() {
  const nodes = getHomeSidebarNodes();

  if (!nodes.root) {
    return;
  }

  nodes.quickActionButtons.forEach((button) => {
    button.addEventListener('click', () => {
      handleHomeSidebarQuickAction(button.textContent || '');
    });
  });
}

/* =========================================================
   05. MODULE BOOT
   ========================================================= */

function bootHomeSidebar() {
  if (HOME_SIDEBAR_STATE.isBound) {
    return;
  }

  HOME_SIDEBAR_STATE.isBound = true;
  bindHomeSidebar();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootHomeSidebar, { once: true });
} else {
  bootHomeSidebar();
}