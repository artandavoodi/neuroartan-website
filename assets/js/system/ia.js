// SECTION: INFORMATION ARCHITECTURE LOADER
// PURPOSE: Load the canonical IA registry and expose it globally as window.ARTAN_IA.
// EVENTS: Emit 'artan:ia:ready' and 'artan:ia:error'.

(() => {
  // SECTION: CANONICAL IA SOURCE
  const IA_URL = '/assets/data/system/ia.json';

  // SECTION: IA FETCH AND REGISTRATION
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

  // SECTION: INITIALIZATION
  document.addEventListener('DOMContentLoaded', loadIA);
})();