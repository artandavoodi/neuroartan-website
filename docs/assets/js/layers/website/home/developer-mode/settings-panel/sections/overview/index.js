/* =============================================================================
   00) FILE INDEX
   01) SETTINGS PANEL SECTION · OVERVIEW
   02) END OF FILE
============================================================================= */

/* =============================================================================
   01) SETTINGS PANEL SECTION · OVERVIEW
============================================================================= */
(() => {
  'use strict';

  const SECTION_ID = 'overview';
  const SECTION_SELECTOR = '[data-developer-mode-settings-section="overview"]';
  const OUTPUT_SELECTOR = '[data-developer-mode-settings-output="overview"]';
  const ACTIVE_EVENT = 'neuroartan:home-developer-mode-settings-tab-changed';
  let isOverviewSectionBound = false;

  function getSectionRoot(root = document) {
    return root.querySelector(SECTION_SELECTOR);
  }

  function getSectionOutput(root = document) {
    return root.querySelector(OUTPUT_SELECTOR);
  }

  function syncOverviewState(root = document) {
    const section = getSectionRoot(root);
    const output = getSectionOutput(root);

    if (!(section instanceof HTMLElement)) return;

    section.dataset.developerModeSettingsSectionActive = 'true';

    if (output instanceof HTMLElement) {
      output.textContent = 'Overview section registered.';
    }
  }

  function handleSectionChange(event) {
    if (!(event instanceof CustomEvent)) return;
    if (event.detail?.tab !== SECTION_ID) return;

    syncOverviewState(document);
  }

  function handleFragmentMounted() {
    syncOverviewState(document);
  }

  function bindOverviewSection() {
    if (isOverviewSectionBound) return;

    isOverviewSectionBound = true;

    document.addEventListener(ACTIVE_EVENT, handleSectionChange);
    document.addEventListener('neuroartan:fragments-mounted', handleFragmentMounted);
  }

  function initOverviewSection() {
    if (!getSectionRoot(document)) return;

    bindOverviewSection();
    syncOverviewState(document);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initOverviewSection, { once: true });
  } else {
    initOverviewSection();
  }
})();

/* =============================================================================
   02) END OF FILE
============================================================================= */