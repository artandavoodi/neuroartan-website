/* =========================================================
   00. FILE INDEX
   01. MODULE STATE
   02. DOM HELPERS
   03. EVENT HELPERS
   04. MODULE BOOT
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

function getLiveFooterRoot() {
  return document.querySelector('#home-footer.site-footer');
}

/* =========================================================
   03. EVENT HELPERS
   ========================================================= */

function dispatchHomeFooterMounted() {
  document.dispatchEvent(new CustomEvent('neuroartan:footer-mounted', {
    detail: {
      source: 'home-footer',
    },
  }));
}

/* =========================================================
   04. MODULE BOOT
   ========================================================= */

function bootHomeFooter() {
  const root = getLiveFooterRoot();
  if (!root) {
    return;
  }

  HOME_FOOTER_STATE.root = root;

  if (HOME_FOOTER_STATE.isBound) {
    dispatchHomeFooterMounted();
    return;
  }

  HOME_FOOTER_STATE.isBound = true;
  dispatchHomeFooterMounted();
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
