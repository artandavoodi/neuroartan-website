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
  root: null,
};

/* =========================================================
   02. DOM HELPERS
   ========================================================= */

function getHomeFooterNodes() {
  const root = document.querySelector('#home-footer');

  return {
    root,
    copy: root ? root.querySelector('[data-home-footer-copy]') : null,
  };
}

function dispatchHomeFooterEvent(name, detail = {}) {
  document.dispatchEvent(new CustomEvent(name, { detail }));
}

function getLiveFooterRoot() {
  return document.querySelector('#home-footer');
}

function renderHomeFooter() {
  const nodes = getHomeFooterNodes();

  if (nodes.copy) {
    nodes.copy.textContent = `© ${new Date().getFullYear()} Neuroartan`;
  }
}

/* =========================================================
   03. ACTION HELPERS
   ========================================================= */

function handleHomeFooterAction(actionLabel) {
  const normalized = typeof actionLabel === 'string' ? actionLabel.trim().toLowerCase() : '';

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
  document.addEventListener('click', (event) => {
    const root = getLiveFooterRoot();
    if (!root) return;

    const target = event.target.closest('#home-footer [data-home-footer-action]');

    if (!target || !root.contains(target)) {
      return;
    }

    handleHomeFooterAction(
      target.getAttribute('data-home-footer-action')
      || target.textContent
      || ''
    );
  });
}

/* =========================================================
   05. MODULE BOOT
   ========================================================= */

function bootHomeFooter() {
  const root = getLiveFooterRoot();
  if (!root) {
    return;
  }

  HOME_FOOTER_STATE.root = root;

  if (HOME_FOOTER_STATE.isBound) {
    renderHomeFooter();
    return;
  }

  HOME_FOOTER_STATE.isBound = true;
  renderHomeFooter();
  bindHomeFooter();
}

document.addEventListener('fragment:mounted', (event) => {
  if (event?.detail?.name !== 'home-footer') return;
  bootHomeFooter();
});

document.addEventListener('neuroartan:runtime-ready', () => {
  bootHomeFooter();
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootHomeFooter, { once: true });
} else {
  bootHomeFooter();
}
