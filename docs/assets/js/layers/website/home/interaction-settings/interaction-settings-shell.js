/* =========================================================
   00. FILE INDEX
   01. INTERACTION SETTINGS SHELL STATE
   02. CONSTANTS
   03. DOM HELPERS
   04. CONFIG HELPERS
   05. ACTIVE DESCRIPTION PROPAGATION
   06. SECTION NAVIGATION
   07. NESTED PANEL NAVIGATION
   08. SETTING ACTIONS
   09. SETTING CONTROLS
   10. PANEL LIFECYCLE
   11. SHELL DELEGATION
   12. GLOBAL TRIGGERS
   13. BOOT
   ========================================================= */

/* =========================================================
   01. INTERACTION SETTINGS SHELL STATE
   ========================================================= */
const HOME_INTERACTION_SETTINGS_SHELL_STATE = {
  isShellBound: false,
  isGlobalBound: false,
  shellRoot: null,
  activeSection: 'overview',
  activeNestedPanel: '',
  nestedPanelParentSection: '',
  config: [],
  configPromise: null,
  railMode: 'expanded',
};

const HOME_INTERACTION_SETTINGS_NESTED_PANEL_PATHS = {
  'home-interaction-settings-session': '/assets/fragments/layers/website/home/interaction-settings/sections/session/index.html',
  'home-interaction-settings-session-active-chat': '/assets/fragments/layers/website/home/interaction-settings/sections/session/active-chat.html',
  'home-interaction-settings-session-reset-behavior': '/assets/fragments/layers/website/home/interaction-settings/sections/session/reset-behavior.html',
  'home-interaction-settings-session-persistence': '/assets/fragments/layers/website/home/interaction-settings/sections/session/persistence.html',
};

/* =========================================================
   02. CONSTANTS
   ========================================================= */
const HOME_INTERACTION_SETTINGS_CONFIG_URL = '/assets/data/platform/home-interaction-settings.json';
const HOME_INTERACTION_SETTINGS_RAIL_STORAGE_KEY = 'neuroartan.home.interactionSettings.railMode';

/* =========================================================
   03. DOM HELPERS
   ========================================================= */
function getHomeInteractionSettingsShellNodes() {
  const root = document.getElementById('home-interaction-settings-panel');

  return {
    root,
    navItems: Array.from(root?.querySelectorAll?.('[data-home-interaction-settings-destination]') ?? []),
    sectionMounts: Array.from(root?.querySelectorAll?.('[data-home-interaction-settings-section-mount]') ?? []),
    activeDescription: root?.querySelector?.('[data-home-interaction-settings-active-description="true"]') ?? null,
    panelHeader: root?.querySelector?.('.home-interaction-settings-panel__chrome') ?? null,
    panelTitle: root?.querySelector?.('.home-interaction-settings-panel__title') ?? null,
    nestedBackControl: root?.querySelector?.('[data-home-interaction-settings-nested-back]') ?? null,
    settingControls: Array.from(root?.querySelectorAll?.('[data-home-interaction-setting]') ?? []),
    railToggle: root?.querySelector?.('[data-home-interaction-settings-rail-toggle]') ?? null,
    railToggleIcon: root?.querySelector?.('[data-home-interaction-settings-rail-toggle-icon]') ?? null,
    railToggleIconHost: root?.querySelector?.('.home-interaction-settings-panel__rail-toggle-icon[data-inline-stroke-icon]') ?? null,
    subrail: root?.querySelector?.('.home-interaction-settings-panel__subrail') ?? null,
    subrailLabel: root?.querySelector?.('[data-home-interaction-settings-subrail-label]') ?? null,
    subnav: root?.querySelector?.('[data-home-interaction-settings-subnav-root]') ?? null,
    contentEyebrow: root?.querySelector?.('[data-home-interaction-settings-content-eyebrow]') ?? null,
    contentTitle: root?.querySelector?.('[data-home-interaction-settings-content-title]') ?? null,
    contentCopy: root?.querySelector?.('[data-home-interaction-settings-content-copy]') ?? null,
  };
}

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeHomeInteractionSettingsSection(section) {
  const normalized = typeof section === 'string' ? section.trim() : '';
  return normalized || 'overview';
}

function normalizeHomeInteractionSettingsFragmentKey(fragmentKey) {
  const normalized = typeof fragmentKey === 'string' ? fragmentKey.trim() : '';
  return normalized;
}

function normalizeHomeInteractionSettingsRailMode(value) {
  return value === 'collapsed' ? 'collapsed' : 'expanded';
}

function loadHomeInteractionSettingsRailMode() {
  try {
    return normalizeHomeInteractionSettingsRailMode(window.localStorage.getItem(HOME_INTERACTION_SETTINGS_RAIL_STORAGE_KEY));
  } catch (_error) {
    return 'expanded';
  }
}

function saveHomeInteractionSettingsRailMode(mode) {
  try {
    window.localStorage.setItem(HOME_INTERACTION_SETTINGS_RAIL_STORAGE_KEY, normalizeHomeInteractionSettingsRailMode(mode));
  } catch (_error) {
    /* Intentionally empty: rail mode persistence is best-effort only. */
  }
}

function getHomeInteractionSettingsActiveMount(nodes) {
  return nodes.sectionMounts.find((mount) => !mount.hidden && mount.getAttribute('aria-hidden') !== 'true') ?? null;
}

/* =========================================================
   05. RAIL MODE HELPERS
   ========================================================= */
function syncHomeInteractionSettingsRailMode(mode = HOME_INTERACTION_SETTINGS_SHELL_STATE.railMode) {
  const normalized = normalizeHomeInteractionSettingsRailMode(mode);
  HOME_INTERACTION_SETTINGS_SHELL_STATE.railMode = normalized;

  const nodes = getHomeInteractionSettingsShellNodes();
  if (nodes.root) {
    nodes.root.setAttribute('data-home-interaction-settings-rail', normalized);
  }

  if (nodes.railToggle) {
    const isExpanded = normalized === 'expanded';
    nodes.railToggle.setAttribute('aria-pressed', isExpanded ? 'true' : 'false');
    nodes.railToggle.setAttribute('aria-label', isExpanded ? 'Collapse navigation rail' : 'Expand navigation rail');
  }

  const toggleIconHost = nodes.railToggleIconHost;
  const toggleIcon = nodes.railToggleIcon;
  const expandedIcon = normalizeString(
    toggleIconHost?.getAttribute('data-home-interaction-settings-rail-icon-expanded')
    || toggleIcon?.getAttribute('data-home-interaction-settings-rail-icon-expanded')
    || ''
  );
  const collapsedIcon = normalizeString(
    toggleIconHost?.getAttribute('data-home-interaction-settings-rail-icon-collapsed')
    || toggleIcon?.getAttribute('data-home-interaction-settings-rail-icon-collapsed')
    || ''
  );
  const nextIcon = normalized === 'expanded' ? expandedIcon : collapsedIcon;

  if (toggleIconHost && expandedIcon && collapsedIcon) {
    toggleIconHost.setAttribute('data-home-interaction-settings-rail-icon-expanded', expandedIcon);
    toggleIconHost.setAttribute('data-home-interaction-settings-rail-icon-collapsed', collapsedIcon);
  }

  if (toggleIconHost && nextIcon) {
    const currentIcon = normalizeString(toggleIconHost.getAttribute('data-home-interaction-settings-rail-current-icon') || '');
    if (currentIcon !== nextIcon) {
      toggleIconHost.setAttribute('data-home-interaction-settings-rail-current-icon', nextIcon);
      toggleIconHost.innerHTML = `<img class="ui-icon-theme-aware" src="${nextIcon}" alt="" data-home-interaction-settings-rail-toggle-icon data-home-interaction-settings-rail-icon-expanded="${expandedIcon}" data-home-interaction-settings-rail-icon-collapsed="${collapsedIcon}">`;
      window.dispatchEvent(new CustomEvent('fragment:mounted', {
        detail: {
          name: 'home-interaction-settings-rail-toggle-icon',
          root: toggleIconHost,
        },
      }));
    }
  }
}

function toggleHomeInteractionSettingsRailMode() {
  const currentMode = HOME_INTERACTION_SETTINGS_SHELL_STATE.railMode;
  const nextMode = currentMode === 'expanded' ? 'collapsed' : 'expanded';
  syncHomeInteractionSettingsRailMode(nextMode);
  saveHomeInteractionSettingsRailMode(nextMode);
}

/* =========================================================
   04. CONFIG HELPERS
   ========================================================= */
function normalizeHomeInteractionSettingsSubdestinations(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      const id = normalizeString(item?.id);
      if (!id) return null;

      return {
        id,
        label: normalizeString(item?.label || id),
        icon: normalizeString(item?.icon || ''),
        fragment: normalizeString(item?.fragment || ''),
        stylesheet: normalizeString(item?.stylesheet || ''),
        module: normalizeString(item?.module || ''),
      };
    })
    .filter(Boolean);
}

function normalizeHomeInteractionSettingsConfig(raw = {}) {
  if (!Array.isArray(raw?.destinations)) {
    return [];
  }

  return raw.destinations
    .map((item) => {
      const id = normalizeString(item?.id);
      if (!id) return null;

      return {
        id,
        eyebrow: normalizeString(item?.eyebrow || item?.label || id),
        defaultSubdestination: normalizeString(item?.default_subdestination || item?.defaultSubdestination || ''),
        subdestinations: normalizeHomeInteractionSettingsSubdestinations(item?.subdestinations),
      };
    })
    .filter(Boolean);
}

function getHomeInteractionSettingsDestinationConfig(destination) {
  return HOME_INTERACTION_SETTINGS_SHELL_STATE.config.find((item) => item.id === destination) || null;
}

function getHomeInteractionSettingsSubdestinationConfig(destination, subdestination) {
  const destinationConfig = getHomeInteractionSettingsDestinationConfig(destination);
  if (!destinationConfig) {
    return null;
  }

  return destinationConfig.subdestinations.find((item) => item.id === subdestination) || null;
}

function resolveDefaultSubdestination(destination) {
  const destinationConfig = getHomeInteractionSettingsDestinationConfig(destination);
  if (!destinationConfig) {
    return '';
  }

  if (destinationConfig.defaultSubdestination) {
    return destinationConfig.defaultSubdestination;
  }

  return destinationConfig.subdestinations[0]?.id || '';
}

function fetchHomeInteractionSettingsJson(path) {
  return fetch(path, {
    cache: 'no-store',
    credentials: 'same-origin',
  }).then((response) => {
    if (!response.ok) {
      throw new Error(`Failed to load ${path}: HTTP ${response.status}`);
    }

    return response.json();
  });
}

async function ensureHomeInteractionSettingsConfig() {
  if (HOME_INTERACTION_SETTINGS_SHELL_STATE.config.length) {
    return HOME_INTERACTION_SETTINGS_SHELL_STATE.config;
  }

  if (!HOME_INTERACTION_SETTINGS_SHELL_STATE.configPromise) {
    HOME_INTERACTION_SETTINGS_SHELL_STATE.configPromise = fetchHomeInteractionSettingsJson(HOME_INTERACTION_SETTINGS_CONFIG_URL)
      .then((json) => {
        HOME_INTERACTION_SETTINGS_SHELL_STATE.config = normalizeHomeInteractionSettingsConfig(json);
        return HOME_INTERACTION_SETTINGS_SHELL_STATE.config;
      })
      .catch(() => {
        HOME_INTERACTION_SETTINGS_SHELL_STATE.config = [];
        return HOME_INTERACTION_SETTINGS_SHELL_STATE.config;
      })
      .finally(() => {
        HOME_INTERACTION_SETTINGS_SHELL_STATE.configPromise = null;
      });
  }

  return HOME_INTERACTION_SETTINGS_SHELL_STATE.configPromise;
}

/* =========================================================
   05. ACTIVE DESCRIPTION PROPAGATION
   ========================================================= */
function getHomeInteractionSettingsDescriptionForSection(nodes, activeSection) {
  const activeNavItem = nodes.navItems.find((item) => item.dataset.homeInteractionSettingsDestination === activeSection);
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
   06. SECTION NAVIGATION
   ========================================================= */
function setHomeInteractionSettingsSection(section) {
  const nodes = getHomeInteractionSettingsShellNodes();
  const activeSection = normalizeHomeInteractionSettingsSection(section);

  HOME_INTERACTION_SETTINGS_SHELL_STATE.activeSection = activeSection;

  if (nodes.root) {
    nodes.root.dataset.homeInteractionSettingsActiveSection = activeSection;
  }

  setHomeInteractionSettingsActiveDescription(nodes, activeSection);

  HOME_INTERACTION_SETTINGS_SHELL_STATE.activeNestedPanel = '';
  HOME_INTERACTION_SETTINGS_SHELL_STATE.nestedPanelParentSection = '';
  if (nodes.root) delete nodes.root.dataset.homeInteractionSettingsNestedPanel;
  setHomeInteractionSettingsNestedBackState(false);

  nodes.navItems.forEach((item) => {
    const isActive = item.dataset.homeInteractionSettingsDestination === activeSection;
    item.classList.toggle('is-active', isActive);
    item.setAttribute('aria-pressed', String(isActive));
  });

  nodes.sectionMounts.forEach((mount) => {
    const mountSection = normalizeHomeInteractionSettingsSection(mount.dataset.homeInteractionSettingsSectionMount);
    const isActive = mountSection === activeSection;

    mount.hidden = !isActive;
    mount.setAttribute('aria-hidden', String(!isActive));
  });

  // Update content header
  updateHomeInteractionSettingsContentHeader(nodes, activeSection);
}

function updateHomeInteractionSettingsContentHeader(nodes, activeSection) {
  const destinationConfig = getHomeInteractionSettingsDestinationConfig(activeSection);
  
  if (nodes.contentEyebrow) {
    nodes.contentEyebrow.textContent = destinationConfig?.eyebrow || activeSection;
  }
  
  if (nodes.contentTitle) {
    nodes.contentTitle.textContent = destinationConfig?.label || activeSection;
  }
  
  if (nodes.contentCopy) {
    nodes.contentCopy.textContent = '';
  }
  
  // Hide subrail by default (destinations without secondary navigation)
  if (nodes.subrail) {
    nodes.subrail.hidden = true;
  }
  
  if (nodes.subnav) {
    nodes.subnav.innerHTML = '';
  }
}

/* =========================================================
   07. NESTED PANEL NAVIGATION
   ========================================================= */
function getHomeInteractionSettingsNestedPanelPath(fragmentKey) {
  const normalizedKey = normalizeHomeInteractionSettingsFragmentKey(fragmentKey);
  return HOME_INTERACTION_SETTINGS_NESTED_PANEL_PATHS[normalizedKey] || '';
}

function ensureHomeInteractionSettingsNestedBackControl(nodes) {
  if (!nodes.root || !nodes.panelHeader) return null;

  const existingControl = nodes.root.querySelector('[data-home-interaction-settings-nested-back]');

  if (existingControl) return existingControl;

  const navigationControl = document.createElement('div');
  const previousControl = document.createElement('button');
  const previousIcon = document.createElement('img');
  const navigationDivider = document.createElement('span');
  const nextControl = document.createElement('button');
  const nextIcon = document.createElement('img');

  navigationControl.className = 'home-interaction-settings-panel__nested-navigation';
  navigationControl.dataset.homeInteractionSettingsNestedNavigation = 'true';
  navigationControl.hidden = true;
  navigationControl.setAttribute('aria-hidden', 'true');

  previousControl.type = 'button';
  previousControl.className = 'home-interaction-settings-panel__nested-back';
  previousControl.dataset.homeInteractionSettingsNestedBack = 'true';
  previousControl.setAttribute('aria-label', 'Previous');

  previousIcon.className = 'ui-icon-theme-aware home-interaction-settings-panel__nested-navigation-icon';
  previousIcon.src = '/registry/icons/public/assets/core/navigation/direction/left.svg';
  previousIcon.alt = '';
  previousIcon.setAttribute('aria-hidden', 'true');

  navigationDivider.className = 'home-interaction-settings-panel__nested-navigation-divider';
  navigationDivider.setAttribute('aria-hidden', 'true');

  nextControl.type = 'button';
  nextControl.className = 'home-interaction-settings-panel__nested-next';
  nextControl.dataset.homeInteractionSettingsNestedNext = 'true';
  nextControl.setAttribute('aria-label', 'Next');
  nextControl.disabled = true;
  nextControl.setAttribute('aria-disabled', 'true');

  nextIcon.className = 'ui-icon-theme-aware home-interaction-settings-panel__nested-navigation-icon';
  nextIcon.src = '/registry/icons/public/assets/core/navigation/direction/right.svg';
  nextIcon.alt = '';
  nextIcon.setAttribute('aria-hidden', 'true');

  previousControl.appendChild(previousIcon);
  nextControl.appendChild(nextIcon);
  navigationControl.append(previousControl, navigationDivider, nextControl);

  if (nodes.panelTitle) {
    nodes.panelTitle.insertAdjacentElement('afterend', navigationControl);
  } else {
    nodes.panelHeader.appendChild(navigationControl);
  }

  return previousControl;
}

function setHomeInteractionSettingsNestedBackState(isVisible) {
  const nodes = getHomeInteractionSettingsShellNodes();
  const backControl = ensureHomeInteractionSettingsNestedBackControl(nodes);
  const navigationControl = nodes.root?.querySelector?.('[data-home-interaction-settings-nested-navigation]') ?? null;

  if (!backControl || !navigationControl) return;

  navigationControl.hidden = !isVisible;
  navigationControl.setAttribute('aria-hidden', String(!isVisible));
}

async function loadHomeInteractionSettingsFragmentIntoMount(fragmentKey, mount) {
  const fragmentPath = getHomeInteractionSettingsNestedPanelPath(fragmentKey);

  if (!fragmentPath || !mount) return false;

  const response = await fetch(fragmentPath, { credentials: 'same-origin' });

  if (!response.ok) return false;

  mount.innerHTML = await response.text();
  mount.dataset.include = fragmentKey;
  mount.dispatchEvent(new CustomEvent('fragment:mounted', {
    bubbles: true,
    detail: {
      fragment: fragmentKey,
      source: 'home-interaction-settings-nested-panel',
    },
  }));

  return true;
}

async function openHomeInteractionSettingsNestedPanel(fragmentKey) {
  const nodes = getHomeInteractionSettingsShellNodes();
  const activeMount = getHomeInteractionSettingsActiveMount(nodes);
  const normalizedKey = normalizeHomeInteractionSettingsFragmentKey(fragmentKey);

  if (!activeMount || !normalizedKey) return false;

  const parentSection = normalizeHomeInteractionSettingsSection(activeMount.dataset.homeInteractionSettingsSectionMount);
  const didLoad = await loadHomeInteractionSettingsFragmentIntoMount(normalizedKey, activeMount);

  if (!didLoad) return false;

  HOME_INTERACTION_SETTINGS_SHELL_STATE.activeNestedPanel = normalizedKey;
  HOME_INTERACTION_SETTINGS_SHELL_STATE.nestedPanelParentSection = parentSection;
  nodes.root.dataset.homeInteractionSettingsNestedPanel = normalizedKey;
  setHomeInteractionSettingsNestedBackState(true);

  return true;
}

async function closeHomeInteractionSettingsNestedPanel() {
  const nodes = getHomeInteractionSettingsShellNodes();
  const parentSection = normalizeHomeInteractionSettingsSection(HOME_INTERACTION_SETTINGS_SHELL_STATE.nestedPanelParentSection || HOME_INTERACTION_SETTINGS_SHELL_STATE.activeSection);
  const activeMount = getHomeInteractionSettingsActiveMount(nodes);
  const parentFragmentKey = `home-interaction-settings-${parentSection}`;

  if (!activeMount) return false;

  const didLoad = await loadHomeInteractionSettingsFragmentIntoMount(parentFragmentKey, activeMount);

  if (!didLoad) return false;

  HOME_INTERACTION_SETTINGS_SHELL_STATE.activeNestedPanel = '';
  HOME_INTERACTION_SETTINGS_SHELL_STATE.nestedPanelParentSection = '';
  delete nodes.root.dataset.homeInteractionSettingsNestedPanel;
  setHomeInteractionSettingsNestedBackState(false);

  return true;
}

/* =========================================================
   08. SETTING ACTIONS
   ========================================================= */
const HOME_INTERACTION_SETTINGS_ACTIONS = {
  'developer-mode': ({ control, isEnabled }) => {
    control.dispatchEvent(new CustomEvent('home-interaction-setting:changed', {
      bubbles: true,
      detail: {
        setting: 'developer-mode',
        value: isEnabled ? 'enabled' : 'disabled',
        source: 'home-interaction-settings-shell',
      },
    }));
  },
};

function runHomeInteractionSettingAction(control) {
  if (!control) return;

  const settingName = control.dataset.homeInteractionSetting;
  const action = HOME_INTERACTION_SETTINGS_ACTIONS[settingName];

  if (typeof action !== 'function') return;

  action({
    control,
    isEnabled: control.dataset.homeInteractionSettingValue === 'enabled' || control.getAttribute('aria-pressed') === 'true',
  });
}

function resolveHomeInteractionSettingsControl(target) {
  if (!(target instanceof Element)) return null;

  const toggleControl = target.closest('[data-home-interaction-toggle-control]');

  if (toggleControl) {
    const toggleRow = toggleControl.closest('.home-interaction-settings-panel__toggle-row');

    if (toggleRow instanceof HTMLElement) {
      const settingName = toggleControl.dataset.homeInteractionSetting;
      const settingValue = toggleControl.dataset.homeInteractionSettingValue;

      if (settingName) toggleRow.dataset.homeInteractionSetting = settingName;
      if (settingValue) toggleRow.dataset.homeInteractionSettingValue = settingValue;

      return toggleRow;
    }
  }

  const settingControl = target.closest('[data-home-interaction-setting]');

  return settingControl instanceof HTMLElement ? settingControl : null;
}

/* =========================================================
   09. SETTING CONTROLS
   ========================================================= */
function syncHomeInteractionSettingsControl(control) {
  if (!control) return;
  if (control.closest('[data-ui-radio-list]')) return;

  const isToggle = control.classList.contains('home-interaction-settings-panel__toggle-row');

  if (isToggle) {
    const nextPressed = control.getAttribute('aria-pressed') !== 'true';
    const toggleButton = control.querySelector('[data-home-interaction-toggle-control]');

    control.setAttribute('aria-pressed', String(nextPressed));
    control.dataset.homeInteractionSettingValue = nextPressed ? 'enabled' : 'disabled';

    if (toggleButton instanceof HTMLElement) {
      toggleButton.setAttribute('aria-pressed', String(nextPressed));
      toggleButton.dataset.homeInteractionSettingValue = nextPressed ? 'enabled' : 'disabled';
    }

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
   10. PANEL LIFECYCLE
   ========================================================= */
function closeConflictingHomeChromeForInteractionSettings() {
  // Close home platform shell if open
  const homePlatformShell = document.getElementById('home-platform-shell');
  if (homePlatformShell && !homePlatformShell.hidden) {
    homePlatformShell.hidden = true;
    homePlatformShell.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('home-platform-shell-open');
  }

  // Close developer mode shell if open
  const developerModeShell = document.querySelector('.home-developer-mode-shell');
  if (developerModeShell) {
    developerModeShell.hidden = true;
    developerModeShell.setAttribute('aria-hidden', 'true');
  }
}

function closeBlockingGlobalOverlaysForInteractionSettings() {
  // Close cookie consent if open
  document.dispatchEvent(new CustomEvent('neuroartan:cookie-consent-close-requested', {
    detail: {
      source: 'home-interaction-settings-shell',
    },
  }));
}

function openHomeInteractionSettingsPanel(section = HOME_INTERACTION_SETTINGS_SHELL_STATE.activeSection) {
  const nodes = getHomeInteractionSettingsShellNodes();

  if (!nodes.root) return;

  closeConflictingHomeChromeForInteractionSettings();
  closeBlockingGlobalOverlaysForInteractionSettings();

  nodes.root.hidden = false;
  nodes.root.dataset.homeInteractionSettingsState = 'open';
  nodes.root.setAttribute('aria-hidden', 'false');
  document.documentElement.dataset.homeInteractionSettingsState = 'open';
  document.body?.setAttribute('data-home-interaction-settings-state', 'open');
  document.body?.classList.add('home-interaction-settings-open');
  document.querySelectorAll('[data-home-interaction-settings-open], [data-home-interaction-settings-trigger], [data-home-topbar-action="interaction-settings"], [data-home-action="interaction-settings"]').forEach((trigger) => {
    trigger.setAttribute('aria-expanded', 'true');
  });
  setHomeInteractionSettingsSection(section);

  setHomeInteractionSettingsNestedBackState(false);

  // Initialize rail mode
  const savedRailMode = loadHomeInteractionSettingsRailMode();
  syncHomeInteractionSettingsRailMode(savedRailMode);
}

function closeHomeInteractionSettingsPanel() {
  const nodes = getHomeInteractionSettingsShellNodes();

  if (!nodes.root) return;

  nodes.root.dataset.homeInteractionSettingsState = 'closed';
  nodes.root.hidden = true;
  nodes.root.setAttribute('aria-hidden', 'true');
  document.documentElement.dataset.homeInteractionSettingsState = 'closed';
  document.body?.setAttribute('data-home-interaction-settings-state', 'closed');
  document.body?.classList.remove('home-interaction-settings-open');
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

  ensureHomeInteractionSettingsNestedBackControl(nodes);
  HOME_INTERACTION_SETTINGS_SHELL_STATE.shellRoot = nodes.root;
  HOME_INTERACTION_SETTINGS_SHELL_STATE.isShellBound = true;
  return true;
}

/* =========================================================
   11. SHELL DELEGATION
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

  const railToggleTrigger = target.closest('[data-home-interaction-settings-rail-toggle]');

  if (railToggleTrigger) {
    event.preventDefault();
    event.stopPropagation();
    toggleHomeInteractionSettingsRailMode();
    return true;
  }

  const nestedBackControl = target.closest('[data-home-interaction-settings-nested-back]');

  if (nestedBackControl) {
    event.preventDefault();
    event.stopPropagation();
    closeHomeInteractionSettingsNestedPanel();
    return true;
  }

  const drillControl = target.closest('[data-home-interaction-settings-drill-control]');

  if (drillControl) {
    event.preventDefault();
    event.stopPropagation();
    openHomeInteractionSettingsNestedPanel(drillControl.dataset.homeInteractionSettingsTarget);
    return true;
  }

  const navItem = target.closest('[data-home-interaction-settings-destination]');

  if (navItem) {
    event.preventDefault();
    event.stopPropagation();
    setHomeInteractionSettingsSection(navItem.dataset.homeInteractionSettingsDestination);

    return true;
  }

  const control = resolveHomeInteractionSettingsControl(target);

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
    runHomeInteractionSettingAction(control);
    return true;
  }

  return false;
}

/* =========================================================
   12. GLOBAL TRIGGERS
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
   13. BOOT
   ========================================================= */
async function bootHomeInteractionSettingsShell() {
  bindHomeInteractionSettingsGlobalTriggers();

  bindHomeInteractionSettingsShell();

  if (!getHomeInteractionSettingsShellNodes().root) return;

  await ensureHomeInteractionSettingsConfig();

  setHomeInteractionSettingsSection(HOME_INTERACTION_SETTINGS_SHELL_STATE.activeSection);

}

window.addEventListener('fragment:mounted', (event) => {
  if (event instanceof CustomEvent && event.detail?.source === 'home-interaction-settings-nested-panel') return;
  if (!document.getElementById('home-interaction-settings-panel')) return;

  bootHomeInteractionSettingsShell();
});
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootHomeInteractionSettingsShell, { once: true });
} else {
  bootHomeInteractionSettingsShell();
}