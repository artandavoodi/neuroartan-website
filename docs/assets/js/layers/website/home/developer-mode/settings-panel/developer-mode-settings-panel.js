/* =============================================================================
   00) FILE INDEX
   01) DEVELOPER MODE SETTINGS PANEL
   02) END OF FILE
============================================================================= */

/* =============================================================================
   01) DEVELOPER MODE SETTINGS PANEL
============================================================================= */
(() => {
  'use strict';

  const DEVELOPER_MODE_SETTINGS_PANEL = {
    isInitialized: false,
    isOpen: false,
    lastRoute: null,
    shell: null,
    panel: null,
    overlay: null,
    trigger: null,
    routeButtons: new Map(),
    sectionMounts: new Map(),
    isRegistered: false,
    authorityBound: false,
    eventsBound: false,
  };

  const SETTINGS_PANEL_FRAGMENT_ID = 'home-developer-mode-settings-panel-shell';
  const SETTINGS_PANEL_OPEN_CLASS = 'is-open';

  const SETTINGS_PANEL_SECTION_IDS = [
    'overview',
    'environments',
    'connectors',
    'analytics',
    'data-control',
    'privacy',
    'runtime',
    'approvals',
    'logs-history',
    'notifications',
    'security-access',
    'provider-model',
    'workspace-project-bindings',
  ];

  const SETTINGS_PANEL_EVENTS = {
    registerRequested: 'neuroartan:home-developer-mode-settings-register-requested',
    openRequested: 'neuroartan:home-developer-mode-settings-open-requested',
    closeRequested: 'neuroartan:home-developer-mode-settings-close-requested',
  };

  function getDeveloperModeSettingsShell(root = document) {
    return root.querySelector('[data-developer-mode-settings-shell]');
  }

  function getDeveloperModeSettingsPanel(root = document) {
    return root.querySelector('[data-developer-mode-settings-panel]');
  }

  function getDeveloperModeSettingsOverlay(root = document) {
    return root.querySelector('[data-developer-mode-settings-overlay]');
  }

  function getDeveloperModeSettingsTrigger(root = document) {
    return root.querySelector('[data-home-developer-mode-settings-trigger]');
  }

  function getDeveloperModeSettingsRouteButtons(root = document) {
    return Array.from(root.querySelectorAll('[data-developer-mode-settings-route]'));
  }

  function getDeveloperModeSettingsSectionMounts(root = document) {
    return SETTINGS_PANEL_SECTION_IDS.map((sectionId) => ({
      sectionId,
      element: root.querySelector(`[data-developer-mode-settings-section="${sectionId}"]`),
    }));
  }

  function getDeveloperModeSettingsMount(shell) {
    if (!(shell instanceof HTMLElement)) return null;

    const parent = shell.parentElement;
    if (parent instanceof HTMLElement && parent.matches('[data-include="home-developer-mode-settings-panel-shell"]')) {
      return parent;
    }

    return document.getElementById('home-developer-mode-settings-panel-shell-mount');
  }

  function registerDeveloperModeSettingsAuthority() {
    if (DEVELOPER_MODE_SETTINGS_PANEL.isRegistered) return;

    DEVELOPER_MODE_SETTINGS_PANEL.isRegistered = true;

    document.dispatchEvent(new CustomEvent(SETTINGS_PANEL_EVENTS.registerRequested, {
      detail: {
        source: 'developer-mode-settings-panel',
        fragmentId: SETTINGS_PANEL_FRAGMENT_ID,
        sections: SETTINGS_PANEL_SECTION_IDS,
      },
    }));
  }

  function setPanelVisibility(isVisible) {
    const shell = DEVELOPER_MODE_SETTINGS_PANEL.shell;
    const panel = DEVELOPER_MODE_SETTINGS_PANEL.panel;
    const overlay = DEVELOPER_MODE_SETTINGS_PANEL.overlay;
    const mount = getDeveloperModeSettingsMount(shell);

    if (mount instanceof HTMLElement) {
      mount.hidden = !isVisible;
      mount.setAttribute('aria-hidden', String(!isVisible));
    }

    if (shell instanceof HTMLElement) {
      shell.hidden = !isVisible;
      shell.setAttribute('aria-hidden', String(!isVisible));
    }

    if (panel instanceof HTMLElement) {
      panel.classList.toggle(SETTINGS_PANEL_OPEN_CLASS, isVisible);
      panel.hidden = !isVisible;
      panel.setAttribute('aria-hidden', String(!isVisible));
    }

    if (overlay instanceof HTMLElement) {
      overlay.hidden = !isVisible;
      overlay.setAttribute('aria-hidden', String(!isVisible));
    }

    DEVELOPER_MODE_SETTINGS_PANEL.isOpen = isVisible;
  }

  function handleDeveloperModeSettingsOpenRequest(event) {
    const route = event instanceof CustomEvent && event.detail?.section ? event.detail.section : 'overview';
    openSettingsPanel(route);
  }

  function mountDeveloperModeSettingsSections(root = document) {
    const sectionMounts = getDeveloperModeSettingsSectionMounts(root);

    DEVELOPER_MODE_SETTINGS_PANEL.sectionMounts.clear();

    for (const { sectionId, element } of sectionMounts) {
      if (!(element instanceof HTMLElement)) continue;

      DEVELOPER_MODE_SETTINGS_PANEL.sectionMounts.set(sectionId, element);
    }
  }

  function syncRouteState(route) {
    DEVELOPER_MODE_SETTINGS_PANEL.lastRoute = route;

    for (const [button, targetRoute] of DEVELOPER_MODE_SETTINGS_PANEL.routeButtons.entries()) {
      const isActive = targetRoute === route;
      button.setAttribute('aria-pressed', String(isActive));
      button.toggleAttribute('data-active', isActive);
    }

    for (const [sectionId, section] of DEVELOPER_MODE_SETTINGS_PANEL.sectionMounts.entries()) {
      const isActive = sectionId === route;
      section.hidden = !isActive;
      section.setAttribute('aria-hidden', String(!isActive));
      section.toggleAttribute('data-active', isActive);
    }
  }

  function openSettingsPanel(route = 'overview') {
    DEVELOPER_MODE_SETTINGS_PANEL.isOpen = true;
    syncRouteState(route);
    setPanelVisibility(true);
  }

  function closeSettingsPanel() {
    DEVELOPER_MODE_SETTINGS_PANEL.isOpen = false;
    setPanelVisibility(false);
  }

  function toggleSettingsPanel(route = 'overview') {
    if (DEVELOPER_MODE_SETTINGS_PANEL.isOpen) {
      closeSettingsPanel();
      return;
    }

    openSettingsPanel(route);
  }

  function bindRouteButtons(root = document) {
    const buttons = getDeveloperModeSettingsRouteButtons(root);

    for (const button of buttons) {
      if (button.dataset.developerModeSettingsRouteBound === 'true') continue;

      const route = button.getAttribute('data-developer-mode-settings-route') || 'overview';
      DEVELOPER_MODE_SETTINGS_PANEL.routeButtons.set(button, route);

      button.dataset.developerModeSettingsRouteBound = 'true';
      button.setAttribute('type', 'button');
      button.setAttribute('aria-pressed', 'false');
      button.addEventListener('click', () => {
        openSettingsPanel(route);
      });
    }
  }
  function bindTrigger(root = document) {
    const trigger = getDeveloperModeSettingsTrigger(root);

    if (!(trigger instanceof HTMLElement)) return;
    if (trigger.dataset.developerModeSettingsTriggerBound === 'true') return;

    DEVELOPER_MODE_SETTINGS_PANEL.trigger = trigger;
    trigger.dataset.developerModeSettingsTriggerBound = 'true';
    trigger.addEventListener('click', () => {
      openSettingsPanel(DEVELOPER_MODE_SETTINGS_PANEL.lastRoute || 'overview');
    });
  }

  function bindOverlay(root = document) {
    const overlay = getDeveloperModeSettingsOverlay(root);

    if (!(overlay instanceof HTMLElement)) return;
    if (overlay.dataset.developerModeSettingsOverlayBound === 'true') return;

    DEVELOPER_MODE_SETTINGS_PANEL.overlay = overlay;
    overlay.dataset.developerModeSettingsOverlayBound = 'true';

    overlay.addEventListener('click', () => {
      closeSettingsPanel();
    });
  }

  function bindExternalEvents() {
    if (DEVELOPER_MODE_SETTINGS_PANEL.eventsBound) return;

    DEVELOPER_MODE_SETTINGS_PANEL.eventsBound = true;

    document.addEventListener(SETTINGS_PANEL_EVENTS.openRequested, handleDeveloperModeSettingsOpenRequest);

    document.addEventListener(SETTINGS_PANEL_EVENTS.closeRequested, () => {
      closeSettingsPanel();
    });

  }

  function bindAuthorityRequests() {
    if (DEVELOPER_MODE_SETTINGS_PANEL.authorityBound) return;

    DEVELOPER_MODE_SETTINGS_PANEL.authorityBound = true;

    document.addEventListener('neuroartan:home-developer-mode-settings-register-requested', (event) => {
      if (!(event instanceof CustomEvent)) return;
      if (event.detail?.source === 'developer-mode-topbar' || event.detail?.source === 'global-layout-injection') {
        registerDeveloperModeSettingsAuthority();
      }
    });
  }

  function handleFragmentMounted(event) {
    const root = event?.target instanceof Element ? event.target : document;
    const shell = getDeveloperModeSettingsShell(root) || getDeveloperModeSettingsShell(document);
    const panel = getDeveloperModeSettingsPanel(root) || getDeveloperModeSettingsPanel(document);
    const overlay = getDeveloperModeSettingsOverlay(root) || getDeveloperModeSettingsOverlay(document);

    if (!(shell instanceof HTMLElement) && !(panel instanceof HTMLElement)) return;

    DEVELOPER_MODE_SETTINGS_PANEL.shell = shell || DEVELOPER_MODE_SETTINGS_PANEL.shell;
    DEVELOPER_MODE_SETTINGS_PANEL.panel = panel || DEVELOPER_MODE_SETTINGS_PANEL.panel;
    DEVELOPER_MODE_SETTINGS_PANEL.overlay = overlay || DEVELOPER_MODE_SETTINGS_PANEL.overlay;

    mountDeveloperModeSettingsSections(root);
    registerDeveloperModeSettingsAuthority();
    bindExternalEvents();
    bindAuthorityRequests();
    DEVELOPER_MODE_SETTINGS_PANEL.authorityBound = true;
    bindRouteButtons(root);
    bindTrigger(root);
    bindOverlay(root);

    DEVELOPER_MODE_SETTINGS_PANEL.isInitialized = true;
    if (DEVELOPER_MODE_SETTINGS_PANEL.isOpen) {
      setPanelVisibility(true);
    } else {
      setPanelVisibility(false);
    }
    syncRouteState(DEVELOPER_MODE_SETTINGS_PANEL.lastRoute || 'overview');
  }

  function bindFragmentMount() {
    document.addEventListener('fragment:mounted', handleFragmentMounted);
    document.addEventListener('neuroartan:fragments-mounted', () => {
      handleFragmentMounted({ target: document });
    });
  }

  function bindEscapeKey() {
    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      if (!DEVELOPER_MODE_SETTINGS_PANEL.isOpen) return;

      closeSettingsPanel();
    });
  }

  function initDeveloperModeSettingsPanel(root = document) {
    if (DEVELOPER_MODE_SETTINGS_PANEL.isInitialized) return;

    DEVELOPER_MODE_SETTINGS_PANEL.shell = getDeveloperModeSettingsShell(root);
    DEVELOPER_MODE_SETTINGS_PANEL.panel = getDeveloperModeSettingsPanel(root);
    DEVELOPER_MODE_SETTINGS_PANEL.overlay = getDeveloperModeSettingsOverlay(root);

    bindExternalEvents();
    bindAuthorityRequests();
    bindFragmentMount();
    bindEscapeKey();
    bindTrigger(root);
    bindOverlay(root);

    if (DEVELOPER_MODE_SETTINGS_PANEL.panel instanceof HTMLElement || DEVELOPER_MODE_SETTINGS_PANEL.shell instanceof HTMLElement) {
      mountDeveloperModeSettingsSections(root);
      registerDeveloperModeSettingsAuthority();
      bindRouteButtons(root);
      DEVELOPER_MODE_SETTINGS_PANEL.isInitialized = true;

      if (DEVELOPER_MODE_SETTINGS_PANEL.isOpen) {
        setPanelVisibility(true);
      } else {
        setPanelVisibility(false);
      }

      syncRouteState(DEVELOPER_MODE_SETTINGS_PANEL.lastRoute || 'overview');
    }
  }

  function getDeveloperModeSettingsSection(sectionId) {
    return DEVELOPER_MODE_SETTINGS_PANEL.sectionMounts.get(sectionId) || null;
  }

  function getDeveloperModeSettingsAuthority() {
    return {
      fragmentId: SETTINGS_PANEL_FRAGMENT_ID,
      sections: SETTINGS_PANEL_SECTION_IDS,
      isRegistered: DEVELOPER_MODE_SETTINGS_PANEL.isRegistered,
    };
  }

  window.DeveloperModeSettingsPanel = {
    fragmentId: SETTINGS_PANEL_FRAGMENT_ID,
    authority: getDeveloperModeSettingsAuthority(),
    sections: SETTINGS_PANEL_SECTION_IDS,
    getSection: getDeveloperModeSettingsSection,
    open: openSettingsPanel,
    close: closeSettingsPanel,
    toggle: toggleSettingsPanel,
    openFromEvent: handleDeveloperModeSettingsOpenRequest,
    syncRoute: syncRouteState,
    init: initDeveloperModeSettingsPanel,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initDeveloperModeSettingsPanel(document), { once: true });
  } else {
    initDeveloperModeSettingsPanel(document);
  }
})();

/* =============================================================================
   02) END OF FILE
============================================================================= */
