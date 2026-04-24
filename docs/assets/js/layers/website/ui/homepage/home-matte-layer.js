/* =============================================================================
   00) FILE INDEX
   01) MODULE IDENTITY
   02) ENTER GATE
   03) THEME / TOGGLE HELPERS
   04) HOME MATTE STATE AUTHORITY
   05) END OF FILE
============================================================================= */

/* =============================================================================
   01) MODULE IDENTITY
============================================================================= */
(() => {
  /* =============================================================================
     02) ENTER GATE
  ============================================================================= */
  window.__artanRunAfterEnter(() => {
    /* =============================================================================
       03) THEME / TOGGLE HELPERS
    ============================================================================= */
    const normalizeThemeValue = (value) => {
      const normalized = String(value || '').trim().toLowerCase();

      if (normalized === 'color') return 'custom';
      if (normalized === 'factory') return 'company';
      if (normalized === 'default') return 'company';
      if (normalized === 'company-default') return 'company';
      if (normalized === 'company' || normalized === 'system' || normalized === 'custom' || normalized === 'dark' || normalized === 'light') {
        return normalized;
      }

      return '';
    };

    const readActiveTheme = () => {
      const html = document.documentElement;
      const candidates = [
        window.NeuroartanTheme?.getCurrentTheme?.(),
        html?.getAttribute('data-theme'),
      ];

      for (const candidate of candidates) {
        const normalized = normalizeThemeValue(candidate);
        if (normalized) return normalized;
      }

      return 'system';
    };

    const readMatteToggleActive = () => {
      const html = document.documentElement;
      const body = document.body;

      return html?.dataset?.homepageThemeMatteAtmosphere === 'true'
        || body?.getAttribute('data-homepage-theme-matte-atmosphere') === 'true';
    };

    const shouldUseMatteLayer = () => {
      const activeTheme = readActiveTheme();
      return activeTheme === 'company' || (activeTheme === 'custom' && readMatteToggleActive());
    };

    /* =============================================================================
       04) HOME MATTE STATE AUTHORITY
       Baseline matte map:
       - homepage default: matte-blur
       - Home Essence and the deeper homepage runway stay matte-solid
       - the matte begins transitioning only near Closing
       - closing / footer zone: matte-solid-softedge
       This file is the sovereign authority for homepage matte state switching.
    ============================================================================= */
    const body = document.body;
    const essenceSection = document.querySelector('.home-essence-effect');
    const closingSection = document.querySelector('.home-closing, #home-closing');

    const MATTE_STATES = ['matte-blur', 'matte-soft', 'matte-solid', 'matte-clear', 'matte-solid-softedge'];
    let raf = 0;
    let activeState = '';

    const clearMatteStates = () => {
      MATTE_STATES.forEach((name) => body.classList.remove(name));
    };

    const setMatteState = (name) => {
      if (!name || activeState === name) return;
      clearMatteStates();
      body.classList.add(name);
      activeState = name;
    };

    const getSectionRange = (section) => {
      if (!section) return null;
      const y = window.scrollY || window.pageYOffset || 0;
      const top = section.getBoundingClientRect().top + y;
      const bottom = top + section.offsetHeight;
      return { top, bottom };
    };

    const inRange = (y, range) => {
      return !!range && y >= range.top && y < range.bottom;
    };

    const update = () => {
      const y = window.scrollY || window.pageYOffset || 0;

      if (!shouldUseMatteLayer()) {
        setMatteState('matte-solid');
        return;
      }

      const essenceRange = getSectionRange(essenceSection);
      const closingRange = getSectionRange(closingSection);
      const viewportH = window.innerHeight || 0;
      const closingTransitionStart = closingRange ? (closingRange.top - (viewportH * 0.18)) : null;

      if (essenceRange && inRange(y, essenceRange)) {
        setMatteState('matte-solid');
        return;
      }

      if (essenceRange && closingTransitionStart !== null && y >= essenceRange.bottom && y < closingTransitionStart) {
        setMatteState('matte-solid');
        return;
      }

      if (closingTransitionStart !== null && y >= closingTransitionStart) {
        setMatteState('matte-solid-softedge');
        return;
      }

      if (essenceRange && y > essenceRange.bottom) {
        setMatteState('matte-solid');
        return;
      }

      setMatteState('matte-blur');
    };

    const requestUpdate = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        update();
      });
    };

    setMatteState('matte-blur');
    update();
    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate, { passive: true });
    window.addEventListener('load', requestUpdate);
    document.addEventListener('fragment:mounted', requestUpdate);
    window.addEventListener('neuroartan:language-applied', requestUpdate);
    window.addEventListener('neuroartan:theme-changed', requestUpdate);
    document.addEventListener('neuroartan:theme-changed', requestUpdate);
    document.addEventListener('neuroartan:toggle-changed', requestUpdate);
    document.addEventListener('neuroartan:homepage-theme-control-changed', requestUpdate);
    window.addEventListener('themechange', requestUpdate);
  });
})();

/* =============================================================================
   05) END OF FILE
============================================================================= */