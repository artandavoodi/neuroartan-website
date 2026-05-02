/* =========================================================
   00. FILE INDEX
   01. INTERACTION SETTINGS SHELL STATE
   02. DOM HELPERS
   03. ACTIVE DESCRIPTION PROPAGATION
   04. SECTION NAVIGATION
   05. SETTING CONTROLS
   06. PANEL LIFECYCLE
   07. SHELL DELEGATION
   08. GLOBAL TRIGGERS
   09. BOOT
   ========================================================= */

/* =========================================================
   01. INTERACTION SETTINGS SHELL STATE
   ========================================================= */
const HOME_INTERACTION_SETTINGS_SHELL_STATE = {
  isShellBound: false,
  isGlobalBound: false,
  shellRoot: null,
  activeSection: 'overview',
};

/* =========================================================
   02. DOM HELPERS
   ========================================================= */
function getHomeInteractionSettingsShellNodes() {
  const root = document.getElementById('home-interaction-settings-panel');

  return {
    root,
    navItems: Array.from(root?.querySelectorAll?.('[data-home-interaction-settings-tab]') ?? []),
    sectionMounts: Array.from(root?.querySelectorAll?.('[data-home-interaction-settings-section-mount]') ?? []),
    activeDescription: root?.querySelector?.('[data-home-interaction-settings-active-description="true"]') ?? null,
    settingControls: Array.from(root?.querySelectorAll?.('[data-home-interaction-setting]') ?? []),
  };
}

function normalizeHomeInteractionSettingsSection(section) {
  const normalized = typeof section === 'string' ? section.trim() : '';
  return normalized || 'overview';
}

/* =========================================================
   03. ACTIVE DESCRIPTION PROPAGATION
   ========================================================= */
function getHomeInteractionSettingsDescriptionForSection(nodes, activeSection) {
  const activeNavItem = nodes.navItems.find((item) => item.dataset.homeInteractionSettingsTab === activeSection);
  return activeNavItem?.dataset?.homeInteractionSettingsDescription || '';
}

function setHomeInteractionSettingsActiveDescription(nodes, activeSection) {
  if (!nodes.activeDescription) return;

  const description = getHomeInteractionSettingsDescriptionForSection(nodes, activeSection);
  nodes.activeDescription.textContent = description;
  nodes.activeDescription.hidden = !description;
  nodes.activeDescription.setAttribute('aria-hidden', String(!description));
}

/* =========================================================
   04. SECTION NAVIGATION
   ========================================================= */
function setHomeInteractionSettingsSection(section) {
  const nodes = getHomeInteractionSettingsShellNodes();
  const activeSection = normalizeHomeInteractionSettingsSection(section);

  HOME_INTERACTION_SETTINGS_SHELL_STATE.activeSection = activeSection;

  if (nodes.root) {
    nodes.root.dataset.homeInteractionSettingsActiveSection = activeSection;
  }

  setHomeInteractionSettingsActiveDescription(nodes, activeSection);

  nodes.navItems.forEach((item) => {
    const isActive = item.dataset.homeInteractionSettingsTab === activeSection;
    item.setAttribute('aria-selected', String(isActive));
  });

  nodes.sectionMounts.forEach((mount) => {
    const mountSection = normalizeHomeInteractionSettingsSection(mount.dataset.homeInteractionSettingsSectionMount);
    const isActive = mountSection === activeSection;

    mount.hidden = !isActive;
    mount.setAttribute('aria-hidden', String(!isActive));
  });
}

/* =========================================================
   05. SETTING CONTROLS
   ========================================================= */
function syncHomeInteractionSettingsControl(control) {
  if (!control) return;
  if (control.closest('[data-ui-radio-list]')) return;

  const isToggle = control.classList.contains('home-interaction-settings-panel__toggle-row');

  if (isToggle) {
    const nextPressed = control.getAttribute('aria-pressed') !== 'true';
    control.setAttribute('aria-pressed', String(nextPressed));
    control.dataset.homeInteractionSettingValue = nextPressed ? 'enabled' : 'disabled';
    return;
  }

  const settingName = control.dataset.homeInteractionSetting;
  const group = control.closest('[role="group"]');

  if (!settingName || !group) return;

  group.querySelectorAll(`[data-home-interaction-setting="${settingName}"]`).forEach((item) => {
    item.setAttribute('aria-pressed', String(item === control));
  });
}

/* =========================================================
   06. PANEL LIFECYCLE
   ========================================================= */
function openHomeInteractionSettingsPanel(section = HOME_INTERACTION_SETTINGS_SHELL_STATE.activeSection) {
  const nodes = getHomeInteractionSettingsShellNodes();

  if (!nodes.root) return;

  nodes.root.hidden = false;
  nodes.root.dataset.homeInteractionSettingsState = 'open';
  nodes.root.setAttribute('aria-hidden', 'false');
  document.documentElement.dataset.homeInteractionSettingsState = 'open';
  document.body?.setAttribute('data-home-interaction-settings-state', 'open');
  document.querySelectorAll('[data-home-interaction-settings-open], [data-home-interaction-settings-trigger], [data-home-topbar-action="interaction-settings"], [data-home-action="interaction-settings"]').forEach((trigger) => {
    trigger.setAttribute('aria-expanded', 'true');
  });
  setHomeInteractionSettingsSection(section);
}

function closeHomeInteractionSettingsPanel() {
  const nodes = getHomeInteractionSettingsShellNodes();

  if (!nodes.root) return;

  nodes.root.dataset.homeInteractionSettingsState = 'closed';
  nodes.root.hidden = true;
  nodes.root.setAttribute('aria-hidden', 'true');
  document.documentElement.dataset.homeInteractionSettingsState = 'closed';
  document.body?.setAttribute('data-home-interaction-settings-state', 'closed');
  document.querySelectorAll('[data-home-interaction-settings-open], [data-home-interaction-settings-trigger], [data-home-topbar-action="interaction-settings"], [data-home-action="interaction-settings"]').forEach((trigger) => {
    trigger.setAttribute('aria-expanded', 'false');
  });
  nodes.root.dispatchEvent(new CustomEvent('neuroartan:home-interaction-settings-closed', {
    bubbles: true,
    detail: {
      source: 'home-interaction-settings-shell',
    },
  }));
}

function bindHomeInteractionSettingsShell() {
  const nodes = getHomeInteractionSettingsShellNodes();

  if (!nodes.root) return false;

  HOME_INTERACTION_SETTINGS_SHELL_STATE.shellRoot = nodes.root;
  HOME_INTERACTION_SETTINGS_SHELL_STATE.isShellBound = true;
  return true;
}

/* =========================================================
   07. SHELL DELEGATION
   ========================================================= */
function handleHomeInteractionSettingsShellClick(event) {
  const target = event.target instanceof Element ? event.target : null;

  if (!target) return false;

  const nodes = getHomeInteractionSettingsShellNodes();

  if (!nodes.root || !nodes.root.contains(target)) return false;

  const closeTrigger = target.closest('[data-home-interaction-settings-close="true"]');

  if (closeTrigger) {
    event.preventDefault();
    event.stopPropagation();
    closeHomeInteractionSettingsPanel();
    return true;
  }

  const navItem = target.closest('[data-home-interaction-settings-tab]');

  if (navItem) {
    event.preventDefault();
    event.stopPropagation();
    setHomeInteractionSettingsSection(navItem.dataset.homeInteractionSettingsTab);
    return true;
  }

  const control = target.closest('[data-home-interaction-setting]');

  if (control?.closest?.('[data-ui-radio-list]')) {
    return false;
  }

  if (control) {
    const section = control.closest('[data-home-interaction-settings-section]');
    const sectionName = section?.dataset?.homeInteractionSettingsSection || '';

    if (sectionName === 'stage') {
      return false;
    }

    event.preventDefault();
    event.stopPropagation();
    syncHomeInteractionSettingsControl(control);
    return true;
  }

  return false;
}

/* =========================================================
   08. GLOBAL TRIGGERS
   ========================================================= */
function bindHomeInteractionSettingsGlobalTriggers() {
  if (HOME_INTERACTION_SETTINGS_SHELL_STATE.isGlobalBound) return;

  document.addEventListener('neuroartan:home-interaction-settings-open-requested', (event) => {
    const section = event instanceof CustomEvent ? event.detail?.section : undefined;
    openHomeInteractionSettingsPanel(section);
  });

  document.addEventListener('neuroartan:home-interaction-settings-panel-open-requested', (event) => {
    const section = event instanceof CustomEvent ? event.detail?.section : undefined;
    openHomeInteractionSettingsPanel(section);
  });

  document.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : null;

    if (!target) return;

    if (handleHomeInteractionSettingsShellClick(event)) return;

    const trigger = target.closest(
      '[data-home-interaction-settings-open], [data-home-interaction-settings-trigger], [data-home-topbar-action="interaction-settings"], [data-home-action="interaction-settings"]'
    );

    if (trigger) {
      event.preventDefault();
      event.stopPropagation();
      openHomeInteractionSettingsPanel(trigger.dataset.homeInteractionSettingsSection);
      return;
    }

    const competingSurfaceTrigger = target.closest(
      [
        '[data-home-platform-shell-open]',
        '[data-home-menu-open]',
        '[data-home-search-open]',
        '[data-home-feed-open]',
        '[data-home-models-open]',
        '[data-home-topbar-action]',
        '[data-home-action]',
        '[data-locale-trigger]',
        '[data-menu-panel]',
        '.institutional-menu-panel-trigger',
        '.institutional-menu-search-trigger',
        '#home-dashboard-menu-trigger',
        '#home-dashboard-search-trigger',
        '#language-toggle',
        '#country-selector',
      ].join(', ')
    );

    if (competingSurfaceTrigger) {
      closeHomeInteractionSettingsPanel();
    }
  }, true);

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeHomeInteractionSettingsPanel();
    }
  });

  HOME_INTERACTION_SETTINGS_SHELL_STATE.isGlobalBound = true;
}

/* =========================================================
   09. BOOT
   ========================================================= */
function bootHomeInteractionSettingsShell() {
  bindHomeInteractionSettingsGlobalTriggers();

  bindHomeInteractionSettingsShell();

  if (!getHomeInteractionSettingsShellNodes().root) return;

  setHomeInteractionSettingsSection(HOME_INTERACTION_SETTINGS_SHELL_STATE.activeSection);
}

window.addEventListener('fragment:mounted', () => {
  if (!document.getElementById('home-interaction-settings-panel')) return;

  bootHomeInteractionSettingsShell();
});
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootHomeInteractionSettingsShell, { once: true });
} else {
  bootHomeInteractionSettingsShell();
}