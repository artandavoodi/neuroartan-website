/* =============================================================================
   00) FILE INDEX
   01) MODULE IDENTITY
   02) CANONICAL IA SOURCE
   03) IA FETCH AND REGISTRATION
   04) INITIALIZATION
============================================================================= */

/* =============================================================================
   01) MODULE IDENTITY
============================================================================= */
(() => {
  /* =============================================================================
     02) CANONICAL IA SOURCE
     
  ============================================================================= */
  const IA_URL = '/assets/data/system/ia.json';

  /* =============================================================================
     03) IA FETCH AND REGISTRATION
  ============================================================================= */
  async function loadIA() {
    try {
      const res = await fetch(IA_URL, { cache: 'no-cache' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const ia = await res.json();

      window.ARTAN_IA = ia;
      window.dispatchEvent(new CustomEvent('artan:ia:ready', { detail: ia }));
    } catch (e) {
      window.ARTAN_IA = null;
      window.dispatchEvent(new CustomEvent('artan:ia:error', { detail: String(e) }));
    }
  }

  /* =============================================================================
     04) INITIALIZATION
  ============================================================================= */
  document.addEventListener('DOMContentLoaded', loadIA);
})();