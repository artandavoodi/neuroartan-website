/* =============================================================================
   FILE INDEX
   01) MODULE IDENTITY
   02) MOUNT CONSTANTS
   03) FRAGMENT MOUNT
   04) BOOTSTRAP
   05) DOCUMENT READY HANDOFF
============================================================================= */

/* =============================================================================
   01) MODULE IDENTITY
============================================================================= */

(() => {
  /* =============================================================================
     02) MOUNT CONSTANTS
  ============================================================================= */
  const MOUNT_ID = 'system-node-mount';
  const FRAGMENT_URL = 'assets/fragments/system/system-node.html';

  /* =============================================================================
     03) FRAGMENT MOUNT
  ============================================================================= */
  const mount = async () => {
    const host = document.getElementById(MOUNT_ID);
    if (!host) return false;
    if (host.dataset.mounted === '1') return true;

    try {
      const res = await fetch(FRAGMENT_URL, { cache: 'no-store' });
      if (!res.ok) return false;
      const html = await res.text();
      host.innerHTML = html;
      host.dataset.mounted = '1';
      return true;
    } catch {
      return false;
    }
  };

  /* =============================================================================
     04) BOOTSTRAP
  ============================================================================= */
  const boot = () => {
    // Try immediately
    mount().then((ok) => {
      if (ok) return;

      // If mount not yet present, observe DOM
      const mo = new MutationObserver(() => {
        mount().then((done) => {
          if (done) mo.disconnect();
        });
      });
      mo.observe(document.body, { childList: true, subtree: true });
    });
  };

  /* =============================================================================
     05) DOCUMENT READY HANDOFF
  ============================================================================= */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();