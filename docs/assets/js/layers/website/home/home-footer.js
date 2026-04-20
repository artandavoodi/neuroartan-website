/* =========================================================
   00. FILE INDEX
   01. MODULE STATE
   02. DOM HELPERS
   03. ACTION HELPERS
   04. EVENT BINDING
   05. MODULE BOOT
   ========================================================= */

/* =========================================================
   01. MODULE STATE
   ========================================================= */

const HOME_FOOTER_STATE = {
  isBound: false,
};

/* =========================================================
   02. DOM HELPERS
   ========================================================= */

function getHomeFooterNodes() {
  const root = document.querySelector('#home-footer');

  return {
    root,
    actions: root ? Array.from(root.querySelectorAll('.home-footer__meta-action')) : [],
  };
}

function dispatchHomeFooterEvent(name, detail = {}) {
  document.dispatchEvent(new CustomEvent(name, { detail }));
}

/* =========================================================
   03. ACTION HELPERS
   ========================================================= */

function handleHomeFooterAction(actionLabel) {
  const normalized = typeof actionLabel === 'string' ? actionLabel.trim().toLowerCase() : '';

  if (normalized === 'language') {
    dispatchHomeFooterEvent('neuroartan:country-overlay-open-requested', {
      source: 'home-footer',
    });
    return;
  }

  if (normalized === 'privacy') {
    dispatchHomeFooterEvent('neuroartan:cookie-consent-open-requested', {
      source: 'home-footer',
      surface: 'settings',
    });
  }
}

/* =========================================================
   04. EVENT BINDING
   ========================================================= */

function bindHomeFooter() {
  const nodes = getHomeFooterNodes();

  if (!nodes.root) {
    return;
  }

  nodes.actions.forEach((button) => {
    button.addEventListener('click', () => {
      handleHomeFooterAction(button.textContent || '');
    });
  });
}

/* =========================================================
   05. MODULE BOOT
   ========================================================= */

function bootHomeFooter() {
  if (HOME_FOOTER_STATE.isBound) {
    return;
  }

  HOME_FOOTER_STATE.isBound = true;
  bindHomeFooter();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootHomeFooter, { once: true });
} else {
  bootHomeFooter();
}