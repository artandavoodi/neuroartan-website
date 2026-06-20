/* =============================================================================
00) FILE INDEX
01) MODULE IDENTITY
02) STATE
03) QUERY HELPERS
04) BUTTON STATE MANAGEMENT
05) EVENT BINDING
06) BOOTSTRAP
07) END OF FILE
============================================================================= */

(() => {
  'use strict';
  /* =============================================================================
     01) MODULE IDENTITY
  ============================================================================= */
  const MODULE_ID = 'sidebar-icon-overlay';
  const MODULE_PATH = '/website/docs/assets/js/layers/website/overlays/sidebar-icon-overlay/sidebar-icon-overlay.js';
  const LEFT_STORAGE_KEY = 'neuroartan.profile.mobile.leftSidebar.active';
  const RIGHT_STORAGE_KEY = 'neuroartan.profile.mobile.rightSidebar.active';

  /* =============================================================================
     02) STATE
  ============================================================================= */
  let bootBound = false;
  let mountEventsBound = false;
  let resizeBound = false;
  let leftActive = false;
  let rightActive = false;

  /* =============================================================================
     03) QUERY HELPERS
  ============================================================================= */
  const q = (selector, scope = document) => scope.querySelector(selector);
  const qa = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

  function getOverlay() {
    return q('#sidebar-icon-overlay') || q('.sidebar-icon-overlay');
  }

  function getLeftButton() {
    const overlay = getOverlay();
    return overlay ? q('.sidebar-icon-overlay__button--left', overlay) : null;
  }

  function getRightButton() {
    const overlay = getOverlay();
    return overlay ? q('.sidebar-icon-overlay__button--right', overlay) : null;
  }

  function getLayout() {
    return q('.profile-workspace__layout');
  }

  function getSideVisibility(side) {
    const layout = getLayout();
    if (!layout) return side === 'left' ? leftActive : rightActive;

    const attribute = side === 'left'
      ? 'data-sidebar-left-hidden'
      : 'data-sidebar-right-hidden';
    const hidden = layout.getAttribute(attribute);

    if (hidden === 'true') return false;
    if (hidden === 'false') return true;
    return true;
  }

  function storageAvailable() {
    return typeof window !== 'undefined' && 'localStorage' in window;
  }

  function readStoredState(key) {
    if (!storageAvailable()) return false;

    try {
      return window.localStorage.getItem(key) === 'true';
    } catch (_) {
      return false;
    }
  }

  function writeStoredState(key, active) {
    if (!storageAvailable()) return;

    try {
      window.localStorage.setItem(key, active ? 'true' : 'false');
    } catch (_) {
      // Storage is optional; CSS state remains the source of the current render.
    }
  }

  /* =============================================================================
     04) BUTTON STATE MANAGEMENT
  ============================================================================= */
  function toggleLeftButton() {
    leftActive = !getSideVisibility('left');
    const button = getLeftButton();
    if (button) {
      button.classList.toggle('active', leftActive);
    }
    writeStoredState(LEFT_STORAGE_KEY, leftActive);
    updateLeftSidebarVisibility(leftActive);

    if(leftActive){
      rightActive = false;
      const rightButton = getRightButton();
      if(rightButton){
        rightButton.classList.remove('active');
      }
      writeStoredState(RIGHT_STORAGE_KEY, false);
      updateRightToolbarVisibility(false);
    }

    document.dispatchEvent(new CustomEvent('sidebar-icon-overlay:left-toggled', {
      detail: { active: leftActive }
    }));
  }

  function toggleRightButton() {
    rightActive = !getSideVisibility('right');
    const button = getRightButton();
    if (button) {
      button.classList.toggle('active', rightActive);
    }
    writeStoredState(RIGHT_STORAGE_KEY, rightActive);
    updateRightToolbarVisibility(rightActive);

    if(rightActive){
      leftActive = false;
      const leftButton = getLeftButton();
      if(leftButton){
        leftButton.classList.remove('active');
      }
      writeStoredState(LEFT_STORAGE_KEY, false);
      updateLeftSidebarVisibility(false);
    }

    document.dispatchEvent(new CustomEvent('sidebar-icon-overlay:right-toggled', {
      detail: { active: rightActive }
    }));
  }

  function setLeftButtonState(active) {
    leftActive = active;
    const button = getLeftButton();
    if (button) {
      button.classList.toggle('active', leftActive);
    }
    writeStoredState(LEFT_STORAGE_KEY, leftActive);
    updateLeftSidebarVisibility(leftActive);
  }

  function setRightButtonState(active) {
    rightActive = active;
    const button = getRightButton();
    if (button) {
      button.classList.toggle('active', rightActive);
    }
    writeStoredState(RIGHT_STORAGE_KEY, rightActive);
    updateRightToolbarVisibility(rightActive);
  }

  function updateLeftSidebarVisibility(visible) {
    // Only apply on tablet/mobile views
    if (window.innerWidth > 1024) return;

    const sidebarMount = q('.profile-workspace__sidebar-mount');
    if (sidebarMount) {
      sidebarMount.style.display = '';
    }
    updateLayoutSideAttribute('left', visible);
  }

  function updateRightToolbarVisibility(visible) {
    // Only apply on tablet/mobile views
    if (window.innerWidth > 1024) return;

    const toolbarMount = q('.profile-workspace__right-toolbar-mount');
    if (toolbarMount) {
      toolbarMount.style.display = '';
    }
    updateLayoutSideAttribute('right', visible);
  }

  function updateLayoutSideAttribute(side, visible) {
    // Only apply on tablet/mobile views
    if (window.innerWidth > 1024) return;

    const layout = getLayout();
    if (!layout) return;

    const attribute = side === 'left'
      ? 'data-sidebar-left-hidden'
      : 'data-sidebar-right-hidden';

    layout.setAttribute(attribute, (!visible).toString());
  }

  function applyCurrentState() {
    const leftButton = getLeftButton();
    const rightButton = getRightButton();

    if (leftButton) leftButton.classList.toggle('active', leftActive);
    if (rightButton) rightButton.classList.toggle('active', rightActive);

    if (window.innerWidth <= 1024) {
      updateLeftSidebarVisibility(leftActive);
      updateRightToolbarVisibility(rightActive);
    }
  }

  function restoreStoredMobileState() {
    leftActive = readStoredState(LEFT_STORAGE_KEY);
    rightActive = readStoredState(RIGHT_STORAGE_KEY);
    applyCurrentState();
  }

  /* =============================================================================
     05) EVENT BINDING
  ============================================================================= */
  function bindButtonClicks() {
    const overlay = getOverlay();
    if (!overlay) return;

    const leftButton = getLeftButton();
    const rightButton = getRightButton();

    if (leftButton) {
      if (leftButton.dataset.sidebarIconOverlayBound !== 'true') {
        leftButton.dataset.sidebarIconOverlayBound = 'true';
        leftButton.addEventListener('click', (event) => {
          event.preventDefault();
          toggleLeftButton();
        });
      }
    }

    if (rightButton) {
      if (rightButton.dataset.sidebarIconOverlayBound !== 'true') {
        rightButton.dataset.sidebarIconOverlayBound = 'true';
        rightButton.addEventListener('click', (event) => {
          event.preventDefault();
          toggleRightButton();
        });
      }
    }
  }

  function bindGlobalRequests() {
    if (document.documentElement.dataset.sidebarIconOverlayRequestsBound === 'true') return;
    document.documentElement.dataset.sidebarIconOverlayRequestsBound = 'true';

    document.addEventListener('sidebar-icon-overlay:set-left-state', (event) => {
      const active = event?.detail?.active === true;
      setLeftButtonState(active);
    });

    document.addEventListener('sidebar-icon-overlay:set-right-state', (event) => {
      const active = event?.detail?.active === true;
      setRightButtonState(active);
    });
  }

  /* =============================================================================
     06) EVENT REBINDING
  ============================================================================= */
  function bindMountEvents() {
    if (mountEventsBound) return;
    mountEventsBound = true;

    document.addEventListener('sidebar-icon-overlay:mounted', () => {
      initSidebarIconOverlay();
    });

    document.addEventListener('fragment:mounted', (event) => {
      const name = event?.detail?.name || '';
      if (name === 'sidebar-icon-overlay') {
        initSidebarIconOverlay();
        return;
      }

      if (
        name === 'profile-private-shell'
        || name === 'profile-private-sections'
        || name === 'profile-private-sidebar'
        || name === 'profile-private-right-toolbar'
        || name === 'profile-private-workspace'
        || name === 'profile-public-shell'
        || name === 'profile-public-sections'
        || name === 'profile-public-workspace'
      ) {
        applyCurrentState();
      }
    });
  }

  /* =============================================================================
     07) BOOTSTRAP
  ============================================================================= */
  function initSidebarIconOverlay() {
    const overlay = getOverlay();
    if (!overlay) return;

    if (!overlay.hasAttribute('aria-hidden')) {
      overlay.setAttribute('aria-hidden', 'false');
    }

    overlay.dataset.moduleId = MODULE_ID;
    overlay.dataset.modulePath = MODULE_PATH;

    const leftButton = getLeftButton();
    const rightButton = getRightButton();

    if (window.innerWidth <= 1024) {
      restoreStoredMobileState();
    } else {
      leftActive = false;
      rightActive = false;
      applyCurrentState();
    }

    bindButtonClicks();
    bindResizeListener();
  }

  function bindResizeListener() {
    if (resizeBound) return;
    resizeBound = true;

    window.addEventListener('resize', () => {
      // On resize to desktop, reset sidebar/toolbar to default visibility and grid layout
      if (window.innerWidth > 1024) {
        const sidebarMount = q('.profile-workspace__sidebar-mount');
        const toolbarMount = q('.profile-workspace__right-toolbar-mount');
        const layout = getLayout();
        const leftButton = getLeftButton();
        const rightButton = getRightButton();
        leftActive = false;
        rightActive = false;
        if (leftButton) leftButton.classList.remove('active');
        if (rightButton) rightButton.classList.remove('active');
        if (sidebarMount) sidebarMount.style.display = '';
        if (toolbarMount) toolbarMount.style.display = '';
        if (layout) {
          layout.removeAttribute('data-sidebar-left-hidden');
          layout.removeAttribute('data-sidebar-right-hidden');
        }
      } else {
        restoreStoredMobileState();
      }
    });
  }

  function boot() {
    if (bootBound) return;

    bootBound = true;

    bindGlobalRequests();
    bindMountEvents();
    initSidebarIconOverlay();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }

  /* =============================================================================
     08) END OF FILE
  ============================================================================= */
})();
