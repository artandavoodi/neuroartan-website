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
  hasNestedBack: false,
  config: [],
  configPromise: null,
  railMode: 'expanded',
  subrailExpanded: false,
  mobileStackLevel: 'root',
  mobileTouchLockTimer: null,
  didRestorePersistedState: false,
  isRestoringFromStorage: false,
  conversationComposerPlaceholder: null,
  conversationComposerOriginParent: null,
  conversationComposerDocked: false,
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
const HOME_INTERACTION_SETTINGS_SUBRAIL_STORAGE_KEY = 'neuroartan.home.interactionSettings.subrailExpanded';
const HOME_INTERACTION_SETTINGS_STATE_STORAGE_KEY = 'neuroartan.home.interactionSettings.state';
const HOME_INTERACTION_SETTINGS_MOBILE_QUERY = window.matchMedia('(max-width: 760px)');
const HOME_INTERACTION_SETTINGS_MOBILE_TOUCH_LOCK_MS = 180;

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

function normalizeHomeInteractionSettingsSubrailExpanded(value) {
  return value === true || value === 'true' || value === 'expanded';
}

function normalizeHomeInteractionSettingsMobileStackLevel(level) {
  if (level === 'subnav' || level === 'content') {
    return level;
  }

  return 'root';
}

function normalizeHomeInteractionSettingsStorageState(state = {}) {
  const hasSubrailExpanded = Object.prototype.hasOwnProperty.call(state, 'subrailExpanded');

  return {
    isOpen: state.isOpen === true,
    section: normalizeHomeInteractionSettingsSection(state.section),
    railMode: normalizeHomeInteractionSettingsRailMode(state.railMode),
    subrailExpanded: hasSubrailExpanded
      ? normalizeHomeInteractionSettingsSubrailExpanded(state.subrailExpanded)
      : loadHomeInteractionSettingsSubrailExpanded(),
    mobileStackLevel: normalizeHomeInteractionSettingsMobileStackLevel(state.mobileStackLevel),
  };
}

function readHomeInteractionSettingsStorageState() {
  try {
    return normalizeHomeInteractionSettingsStorageState(
      JSON.parse(window.localStorage.getItem(HOME_INTERACTION_SETTINGS_STATE_STORAGE_KEY) || '{}')
    );
  } catch {
    return normalizeHomeInteractionSettingsStorageState();
  }
}

function writeHomeInteractionSettingsStorageState(state = {}) {
  try {
    window.localStorage.setItem(
      HOME_INTERACTION_SETTINGS_STATE_STORAGE_KEY,
      JSON.stringify(normalizeHomeInteractionSettingsStorageState(state))
    );
  } catch {}
}

function persistHomeInteractionSettingsStorageState(overrides = {}) {
  const nodes = getHomeInteractionSettingsShellNodes();
  const current = readHomeInteractionSettingsStorageState();

  writeHomeInteractionSettingsStorageState({
    ...current,
    isOpen: nodes.root ? !nodes.root.hidden : current.isOpen,
    section: HOME_INTERACTION_SETTINGS_SHELL_STATE.activeSection,
    railMode: HOME_INTERACTION_SETTINGS_SHELL_STATE.railMode,
    subrailExpanded: HOME_INTERACTION_SETTINGS_SHELL_STATE.subrailExpanded,
    mobileStackLevel: HOME_INTERACTION_SETTINGS_SHELL_STATE.mobileStackLevel,
    ...overrides,
  });
}

function clearHomeInteractionSettingsStorageState() {
  try {
    window.localStorage.removeItem(HOME_INTERACTION_SETTINGS_STATE_STORAGE_KEY);
  } catch {}
}

async function restoreHomeInteractionSettingsStorageState() {
  if (HOME_INTERACTION_SETTINGS_SHELL_STATE.didRestorePersistedState) {
    return false;
  }

  HOME_INTERACTION_SETTINGS_SHELL_STATE.didRestorePersistedState = true;

  const storedState = readHomeInteractionSettingsStorageState();
  if (storedState.isOpen) {
    if (storedState.railMode) {
      HOME_INTERACTION_SETTINGS_SHELL_STATE.railMode = storedState.railMode;
    }
    HOME_INTERACTION_SETTINGS_SHELL_STATE.subrailExpanded = storedState.subrailExpanded;
    HOME_INTERACTION_SETTINGS_SHELL_STATE.mobileStackLevel = storedState.mobileStackLevel;
    HOME_INTERACTION_SETTINGS_SHELL_STATE.isRestoringFromStorage = true;
    await openHomeInteractionSettingsPanel(storedState.section);
    HOME_INTERACTION_SETTINGS_SHELL_STATE.isRestoringFromStorage = false;
    return true;
  }

  return false;
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

function loadHomeInteractionSettingsSubrailExpanded() {
  try {
    return normalizeHomeInteractionSettingsSubrailExpanded(
      window.localStorage.getItem(HOME_INTERACTION_SETTINGS_SUBRAIL_STORAGE_KEY)
    );
  } catch (_error) {
    return false;
  }
}

function saveHomeInteractionSettingsSubrailExpanded(expanded) {
  try {
    window.localStorage.setItem(
      HOME_INTERACTION_SETTINGS_SUBRAIL_STORAGE_KEY,
      normalizeHomeInteractionSettingsSubrailExpanded(expanded) ? 'true' : 'false'
    );
  } catch (_error) {
    /* Intentionally empty: subrail expansion persistence is best-effort only. */
  }
}

function isHomeInteractionSettingsMobileView() {
  return HOME_INTERACTION_SETTINGS_MOBILE_QUERY.matches;
}

function setHomeInteractionSettingsMobileTouchLock(isLocked) {
  const nodes = getHomeInteractionSettingsShellNodes();

  if (nodes.root) {
    nodes.root.toggleAttribute('data-home-interaction-settings-touch-locked', isLocked);
  }
}

function clearHomeInteractionSettingsMobileTouchLock() {
  if (HOME_INTERACTION_SETTINGS_SHELL_STATE.mobileTouchLockTimer) {
    window.clearTimeout(HOME_INTERACTION_SETTINGS_SHELL_STATE.mobileTouchLockTimer);
    HOME_INTERACTION_SETTINGS_SHELL_STATE.mobileTouchLockTimer = null;
  }

  setHomeInteractionSettingsMobileTouchLock(false);
}

function lockHomeInteractionSettingsMobileTouchCycle() {
  if (!isHomeInteractionSettingsMobileView()) {
    return;
  }

  clearHomeInteractionSettingsMobileTouchLock();
  setHomeInteractionSettingsMobileTouchLock(true);

  HOME_INTERACTION_SETTINGS_SHELL_STATE.mobileTouchLockTimer = window.setTimeout(() => {
    clearHomeInteractionSettingsMobileTouchLock();
  }, HOME_INTERACTION_SETTINGS_MOBILE_TOUCH_LOCK_MS);
}

function isHomeInteractionSettingsMobileTouchLocked() {
  return !!getHomeInteractionSettingsShellNodes().root?.hasAttribute('data-home-interaction-settings-touch-locked');
}

function hasHomeInteractionSettingsSubnavigation(section = HOME_INTERACTION_SETTINGS_SHELL_STATE.activeSection) {
  const parentConfig = getHomeInteractionSettingsParentConfig(section);
  return (parentConfig?.subdestinations || []).length > 0;
}

function shouldRouteHomeInteractionSettingsMobileSectionDirectlyToContent(section) {
  const config = getHomeInteractionSettingsDestinationConfig(section);
  return !(config?.subdestinations || []).length;
}

function syncHomeInteractionSettingsMobileStackLevel(level = HOME_INTERACTION_SETTINGS_SHELL_STATE.mobileStackLevel) {
  const nodes = getHomeInteractionSettingsShellNodes();
  const normalized = normalizeHomeInteractionSettingsMobileStackLevel(level);
  const previous = HOME_INTERACTION_SETTINGS_SHELL_STATE.mobileStackLevel;
  HOME_INTERACTION_SETTINGS_SHELL_STATE.mobileStackLevel = normalized;

  if (isHomeInteractionSettingsMobileView() && normalized !== previous) {
    lockHomeInteractionSettingsMobileTouchCycle();
  }

  if (nodes.root) {
    nodes.root.setAttribute('data-home-interaction-settings-mobile-level', normalized);
  }

  syncHomeInteractionSettingsBackControls();

  if (nodes.root && !nodes.root.hidden) {
    persistHomeInteractionSettingsStorageState();
  }
}

function setHomeInteractionSettingsMobileStackLevel(level) {
  syncHomeInteractionSettingsMobileStackLevel(level);
}

function resetHomeInteractionSettingsMobileStackLevel() {
  clearHomeInteractionSettingsMobileTouchLock();
  syncHomeInteractionSettingsMobileStackLevel('root');
}

function advanceHomeInteractionSettingsMobileStackLevel(level) {
  if (!isHomeInteractionSettingsMobileView()) {
    return;
  }

  setHomeInteractionSettingsMobileStackLevel(level);
}

function navigateHomeInteractionSettingsMobileBack() {
  if (!isHomeInteractionSettingsMobileView()) {
    return false;
  }

  if (isHomeInteractionSettingsMobileTouchLocked()) {
    return true;
  }

  if (HOME_INTERACTION_SETTINGS_SHELL_STATE.mobileStackLevel === 'content') {
    setHomeInteractionSettingsMobileStackLevel(
      hasHomeInteractionSettingsSubnavigation(HOME_INTERACTION_SETTINGS_SHELL_STATE.activeSection) ? 'subnav' : 'root'
    );
    return true;
  }

  if (HOME_INTERACTION_SETTINGS_SHELL_STATE.mobileStackLevel === 'subnav') {
    setHomeInteractionSettingsMobileStackLevel('root');
    return true;
  }

  return false;
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

  saveHomeInteractionSettingsRailMode(normalized);
  persistHomeInteractionSettingsStorageState();
}

function toggleHomeInteractionSettingsRailMode() {
  const currentMode = HOME_INTERACTION_SETTINGS_SHELL_STATE.railMode;
  const nextMode = currentMode === 'expanded' ? 'collapsed' : 'expanded';
  syncHomeInteractionSettingsRailMode(nextMode);
  saveHomeInteractionSettingsRailMode(nextMode);
}

function setHomeInteractionSettingsSessionExpanded(expanded = false) {
  const nodes = getHomeInteractionSettingsShellNodes();
  if (!(nodes.root instanceof HTMLElement)) return;

  const normalized = expanded === true;
  nodes.root.dataset.homeInteractionSessionExpanded = normalized ? 'true' : 'false';

  nodes.root.querySelectorAll('[data-home-interaction-session-expand]').forEach((control) => {
    if (!(control instanceof HTMLElement)) return;
    control.setAttribute('aria-pressed', normalized ? 'true' : 'false');
  });

  nodes.root.querySelectorAll('[data-home-interaction-session-expand-label]').forEach((label) => {
    if (!(label instanceof HTMLElement)) return;
    label.textContent = normalized ? 'Return to settings navigation' : 'Expand session workspace';
  });
}

function toggleHomeInteractionSettingsSessionExpanded() {
  const nodes = getHomeInteractionSettingsShellNodes();
  const expanded = nodes.root?.dataset.homeInteractionSessionExpanded === 'true';
  setHomeInteractionSettingsSessionExpanded(!expanded);
}

function getHomeInteractionConversationDockNodes() {
  return {
    root: document.getElementById('home-interaction-settings-panel'),
    dock: document.querySelector('[data-home-interaction-conversation-composer-dock]'),
    origin: document.getElementById('stage-actions'),
    panel: document.getElementById('home-stage-panel-stack'),
  };
}

function shouldDockHomeInteractionConversationComposer(nodes = getHomeInteractionConversationDockNodes()) {
  return (
    nodes.root instanceof HTMLElement
    && !nodes.root.hidden
    && HOME_INTERACTION_SETTINGS_SHELL_STATE.activeSection === 'overview'
    && nodes.dock instanceof HTMLElement
    && nodes.panel instanceof HTMLElement
  );
}

function rememberHomeInteractionConversationComposerOrigin(panel) {
  if (HOME_INTERACTION_SETTINGS_SHELL_STATE.conversationComposerPlaceholder) {
    return;
  }

  const placeholder = document.createComment('home-stage-panel-stack-origin');
  panel.parentNode?.insertBefore(placeholder, panel);
  HOME_INTERACTION_SETTINGS_SHELL_STATE.conversationComposerPlaceholder = placeholder;
  HOME_INTERACTION_SETTINGS_SHELL_STATE.conversationComposerOriginParent = placeholder.parentNode || null;
}

function restoreHomeInteractionConversationComposer(nodes = getHomeInteractionConversationDockNodes()) {
  const panel = nodes.panel;
  const placeholder = HOME_INTERACTION_SETTINGS_SHELL_STATE.conversationComposerPlaceholder;

  if (panel instanceof HTMLElement) {
    if (placeholder?.parentNode) {
      placeholder.parentNode.insertBefore(panel, placeholder);
      placeholder.remove();
    } else if (nodes.origin instanceof HTMLElement && panel.parentNode !== nodes.origin) {
      nodes.origin.appendChild(panel);
    }
  }

  HOME_INTERACTION_SETTINGS_SHELL_STATE.conversationComposerPlaceholder = null;
  HOME_INTERACTION_SETTINGS_SHELL_STATE.conversationComposerOriginParent = null;
  HOME_INTERACTION_SETTINGS_SHELL_STATE.conversationComposerDocked = false;

  if (nodes.dock instanceof HTMLElement) {
    nodes.dock.hidden = true;
  }

  if (nodes.root instanceof HTMLElement) {
    delete nodes.root.dataset.homeInteractionConversationDocked;
  }
}

function syncHomeInteractionConversationComposerDock() {
  const nodes = getHomeInteractionConversationDockNodes();

  if (!shouldDockHomeInteractionConversationComposer(nodes)) {
    restoreHomeInteractionConversationComposer(nodes);
    return;
  }

  if (!(nodes.panel instanceof HTMLElement) || !(nodes.dock instanceof HTMLElement) || !(nodes.root instanceof HTMLElement)) {
    return;
  }

  rememberHomeInteractionConversationComposerOrigin(nodes.panel);

  const didMove = nodes.panel.parentNode !== nodes.dock;

  if (didMove) {
    nodes.dock.appendChild(nodes.panel);
  }

  nodes.dock.hidden = false;
  nodes.root.dataset.homeInteractionConversationDocked = 'true';
  HOME_INTERACTION_SETTINGS_SHELL_STATE.conversationComposerDocked = true;

  if (didMove) {
    window.dispatchEvent(new CustomEvent('fragment:mounted', {
      detail: {
        name: 'home-stage-panel-stack',
        root: nodes.panel,
        source: 'home-interaction-settings-conversation-dock',
      },
    }));
  }
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
        label: normalizeString(item?.label || id),
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

function getHomeInteractionSettingsParentConfig(destination) {
  const normalized = normalizeHomeInteractionSettingsSection(destination);
  return HOME_INTERACTION_SETTINGS_SHELL_STATE.config.find((item) => (
    item.id === normalized
    || item.subdestinations.some((subdestination) => subdestination.id === normalized)
  )) || null;
}

function getHomeInteractionSettingsPrimaryDestination(destination) {
  return getHomeInteractionSettingsParentConfig(destination)?.id || normalizeHomeInteractionSettingsSection(destination);
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
async function setHomeInteractionSettingsSection(section) {
  const nodes = getHomeInteractionSettingsShellNodes();
  const requestedSection = normalizeHomeInteractionSettingsSection(section);
  const requestedConfig = getHomeInteractionSettingsDestinationConfig(requestedSection);
  const activeSection = requestedConfig?.subdestinations?.length
    ? normalizeHomeInteractionSettingsSection(resolveDefaultSubdestination(requestedSection))
    : requestedSection;
  const primarySection = getHomeInteractionSettingsPrimaryDestination(activeSection);
  const previousSection = HOME_INTERACTION_SETTINGS_SHELL_STATE.activeSection;

  HOME_INTERACTION_SETTINGS_SHELL_STATE.activeSection = activeSection;

  if (nodes.root) {
    nodes.root.dataset.homeInteractionSettingsActiveSection = activeSection;
    nodes.root.dataset.homeInteractionSettingsPrimarySection = primarySection;
  }

  setHomeInteractionSettingsActiveDescription(nodes, activeSection);

  HOME_INTERACTION_SETTINGS_SHELL_STATE.activeNestedPanel = '';
  HOME_INTERACTION_SETTINGS_SHELL_STATE.nestedPanelParentSection = '';
  if (nodes.root) delete nodes.root.dataset.homeInteractionSettingsNestedPanel;
  setHomeInteractionSettingsNestedBackState(false);

  if (!HOME_INTERACTION_SETTINGS_SHELL_STATE.isRestoringFromStorage) {
    if (previousSection && previousSection !== activeSection) {
      syncHomeInteractionSettingsSubrailExpanded(false, activeSection, { persist: false });
    }
  }

  nodes.navItems.forEach((item) => {
    const isActive = item.dataset.homeInteractionSettingsDestination === primarySection;
    item.classList.toggle('is-active', isActive);
    item.setAttribute('aria-pressed', String(isActive));
  });

  nodes.sectionMounts.forEach((mount) => {
    const mountSection = normalizeHomeInteractionSettingsSection(mount.dataset.homeInteractionSettingsSectionMount);
    const isActive = mountSection === activeSection;

    mount.hidden = !isActive;
    mount.setAttribute('aria-hidden', String(!isActive));
  });

  renderHomeInteractionSettingsSubnavigation(nodes, activeSection);
  syncHomeInteractionSettingsMobileStackLevel(HOME_INTERACTION_SETTINGS_SHELL_STATE.mobileStackLevel);

  const expandControl = nodes.root?.querySelector?.('[data-home-interaction-settings-nav-expand]');
  if (expandControl) {
    const isSessionSection = activeSection === 'overview';
    expandControl.hidden = !isSessionSection;
    expandControl.setAttribute('aria-hidden', String(!isSessionSection));
    expandControl.setAttribute('data-home-interaction-settings-nav-expand', activeSection);
  }

  syncHomeInteractionSettingsSubrailExpanded(
    HOME_INTERACTION_SETTINGS_SHELL_STATE.isRestoringFromStorage && activeSection === 'overview'
      ? HOME_INTERACTION_SETTINGS_SHELL_STATE.subrailExpanded
      : false,
    activeSection,
    { persist: false }
  );

  syncHomeInteractionConversationComposerDock();

  if (nodes.root && !nodes.root.hidden) {
    persistHomeInteractionSettingsStorageState();
  }
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

function createHomeInteractionSettingsSubnavIcon(path) {
  const iconWrap = document.createElement('span');
  iconWrap.className = 'home-interaction-settings-panel__nav-icon inline-stroke-icon';
  iconWrap.dataset.inlineStrokeIcon = '';
  iconWrap.setAttribute('aria-hidden', 'true');

  const icon = document.createElement('img');
  icon.className = 'ui-icon-theme-aware';
  icon.src = path;
  icon.alt = '';
  icon.setAttribute('aria-hidden', 'true');
  iconWrap.appendChild(icon);

  return iconWrap;
}

function renderHomeInteractionSettingsSubnavigation(nodes, activeSection) {
  const parentConfig = getHomeInteractionSettingsParentConfig(activeSection);
  const subdestinations = parentConfig?.subdestinations || [];
  const hasSubnavigation = subdestinations.length > 0;

  if (nodes.subrail) {
    nodes.subrail.hidden = !hasSubnavigation;
    nodes.subrail.setAttribute('aria-hidden', String(!hasSubnavigation));
  }

  if (nodes.subrailLabel) {
    nodes.subrailLabel.textContent = parentConfig?.label || '';
  }

  if (!nodes.subnav) return;

  nodes.subnav.replaceChildren();

  if (!hasSubnavigation) return;

  subdestinations.forEach((subdestination) => {
    const button = document.createElement('button');
    const label = document.createElement('span');
    const isActive = subdestination.id === activeSection;

    button.type = 'button';
    button.className = 'home-interaction-settings-panel__subnav-item';
    button.dataset.homeInteractionSettingsDestination = subdestination.id;
    button.setAttribute('aria-pressed', String(isActive));
    button.classList.toggle('is-active', isActive);

    if (subdestination.icon) {
      button.appendChild(createHomeInteractionSettingsSubnavIcon(subdestination.icon));
    }

    label.className = 'home-interaction-settings-panel__nav-text';
    label.textContent = subdestination.label || subdestination.id;
    button.appendChild(label);
    nodes.subnav.appendChild(button);
  });
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

  const previousControl = document.createElement('button');
  const previousIcon = document.createElement('img');
  const nextControl = document.createElement('button');
  const nextIcon = document.createElement('img');

  previousControl.type = 'button';
  previousControl.className = 'home-interaction-settings-panel__nested-back';
  previousControl.dataset.homeInteractionSettingsNestedBack = 'true';
  previousControl.setAttribute('aria-label', 'Previous');
  previousControl.hidden = true;

  previousIcon.className = 'ui-icon-theme-aware home-interaction-settings-panel__nested-navigation-icon';
  previousIcon.src = '/registry/icons/public/assets/core/navigation/direction/back.svg';
  previousIcon.alt = '';
  previousIcon.setAttribute('aria-hidden', 'true');

  nextControl.type = 'button';
  nextControl.className = 'home-interaction-settings-panel__nested-next';
  nextControl.dataset.homeInteractionSettingsNestedNext = 'true';
  nextControl.setAttribute('aria-label', 'Next');
  nextControl.disabled = true;
  nextControl.setAttribute('aria-disabled', 'true');
  nextControl.hidden = true;

  nextIcon.className = 'ui-icon-theme-aware home-interaction-settings-panel__nested-navigation-icon';
  nextIcon.src = '/registry/icons/public/assets/core/navigation/direction/right.svg';
  nextIcon.alt = '';
  nextIcon.setAttribute('aria-hidden', 'true');

  previousControl.appendChild(previousIcon);
  nextControl.appendChild(nextIcon);

  const chromeLeading = nodes.root.querySelector('.home-interaction-settings-panel__chrome-leading');
  if (chromeLeading) {
    chromeLeading.appendChild(previousControl);
    chromeLeading.appendChild(nextControl);
  } else {
    nodes.panelHeader.appendChild(previousControl);
    nodes.panelHeader.appendChild(nextControl);
  }

  return previousControl;
}

function setHomeInteractionSettingsNestedBackState(isVisible) {
  HOME_INTERACTION_SETTINGS_SHELL_STATE.hasNestedBack = isVisible === true;
  syncHomeInteractionSettingsBackControls();
}

function syncHomeInteractionSettingsBackControls() {
  const nodes = getHomeInteractionSettingsShellNodes();
  const backControl = ensureHomeInteractionSettingsNestedBackControl(nodes);
  const nextControl = nodes.root?.querySelector?.('[data-home-interaction-settings-nested-next]') ?? null;

  if (!backControl || !nextControl) return;

  const hasNestedBack = HOME_INTERACTION_SETTINGS_SHELL_STATE.hasNestedBack === true;
  const hasMobileBack = isHomeInteractionSettingsMobileView()
    && HOME_INTERACTION_SETTINGS_SHELL_STATE.mobileStackLevel !== 'root';
  const canGoBack = hasNestedBack || hasMobileBack;

  backControl.hidden = !canGoBack;
  backControl.setAttribute('aria-hidden', String(!canGoBack));
  backControl.setAttribute(
    'aria-label',
    hasNestedBack
      ? 'Back'
      : HOME_INTERACTION_SETTINGS_SHELL_STATE.mobileStackLevel === 'content'
        ? 'Back to section navigation'
        : 'Back to main navigation'
  );

  nextControl.hidden = !hasNestedBack;
  nextControl.setAttribute('aria-hidden', String(!hasNestedBack));
}

function syncHomeInteractionSettingsSubrailExpanded(expanded = false, section = HOME_INTERACTION_SETTINGS_SHELL_STATE.activeSection, options = {}) {
  const nodes = getHomeInteractionSettingsShellNodes();
  if (!nodes.root) return;

  const normalized = expanded === true;
  const activeSection = normalizeHomeInteractionSettingsSection(section);

  nodes.root.setAttribute('data-home-interaction-settings-subrail', normalized ? 'expanded' : 'normal');
  HOME_INTERACTION_SETTINGS_SHELL_STATE.subrailExpanded = normalized;
  saveHomeInteractionSettingsSubrailExpanded(normalized);

  nodes.root.querySelectorAll('[data-home-interaction-settings-nav-expand]').forEach((expandControl) => {
    const expandIcon = expandControl.querySelector('[data-home-interaction-settings-nav-expand-icon]');
    if (expandIcon) {
      const expandedIcon = expandIcon.getAttribute('data-home-interaction-settings-nav-expand-icon-expanded');
      const collapsedIcon = expandIcon.getAttribute('data-home-interaction-settings-nav-expand-icon-collapsed');
      expandIcon.src = normalized ? expandedIcon : collapsedIcon;
    }

    const sectionLabel = activeSection === 'overview' ? 'session' : activeSection;
    expandControl.setAttribute('aria-pressed', String(normalized));
    expandControl.setAttribute('aria-label', normalized ? `Collapse ${sectionLabel}` : `Expand ${sectionLabel}`);
  });

  if (options.persist !== false) {
    persistHomeInteractionSettingsStorageState();
  }

  syncHomeInteractionConversationComposerDock();
}

function toggleHomeInteractionSettingsSubrailExpand(section) {
  const nodes = getHomeInteractionSettingsShellNodes();
  if (!nodes.root) return;

  const currentState = nodes.root.getAttribute('data-home-interaction-settings-subrail') === 'expanded';
  syncHomeInteractionSettingsSubrailExpanded(!currentState, section);
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

  // Only show navigation buttons when nested panel is open
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

async function openHomeInteractionSettingsPanel(section = HOME_INTERACTION_SETTINGS_SHELL_STATE.activeSection) {
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

  setHomeInteractionSettingsNestedBackState(false);

  if (isHomeInteractionSettingsMobileView()) {
    HOME_INTERACTION_SETTINGS_SHELL_STATE.railMode = 'expanded';
    syncHomeInteractionSettingsRailMode('expanded');
    if (HOME_INTERACTION_SETTINGS_SHELL_STATE.isRestoringFromStorage) {
      syncHomeInteractionSettingsMobileStackLevel(HOME_INTERACTION_SETTINGS_SHELL_STATE.mobileStackLevel);
    } else {
      resetHomeInteractionSettingsMobileStackLevel();
    }
  } else {
    const savedRailMode = loadHomeInteractionSettingsRailMode();
    syncHomeInteractionSettingsRailMode(savedRailMode);
    syncHomeInteractionSettingsMobileStackLevel('root');
  }

  // Set section after rail mode is initialized
  await setHomeInteractionSettingsSection(section);
  syncHomeInteractionConversationComposerDock();

  writeHomeInteractionSettingsStorageState({
    isOpen: true,
    section: HOME_INTERACTION_SETTINGS_SHELL_STATE.activeSection,
    railMode: HOME_INTERACTION_SETTINGS_SHELL_STATE.railMode,
    subrailExpanded: HOME_INTERACTION_SETTINGS_SHELL_STATE.subrailExpanded,
    mobileStackLevel: HOME_INTERACTION_SETTINGS_SHELL_STATE.mobileStackLevel,
  });
}

function closeHomeInteractionSettingsPanel() {
  const nodes = getHomeInteractionSettingsShellNodes();

  if (!nodes.root) return;

  restoreHomeInteractionConversationComposer();
  setHomeInteractionSettingsSessionExpanded(false);
  HOME_INTERACTION_SETTINGS_SHELL_STATE.hasNestedBack = false;
  resetHomeInteractionSettingsMobileStackLevel();
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

  writeHomeInteractionSettingsStorageState({
    isOpen: false,
    section: HOME_INTERACTION_SETTINGS_SHELL_STATE.activeSection,
    railMode: HOME_INTERACTION_SETTINGS_SHELL_STATE.railMode,
    subrailExpanded: HOME_INTERACTION_SETTINGS_SHELL_STATE.subrailExpanded,
    mobileStackLevel: HOME_INTERACTION_SETTINGS_SHELL_STATE.mobileStackLevel,
  });
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

  const sessionExpandTrigger = target.closest('[data-home-interaction-session-expand]');

  if (sessionExpandTrigger) {
    event.preventDefault();
    event.stopPropagation();
    toggleHomeInteractionSettingsSessionExpanded();
    return true;
  }

  const nestedBackControl = target.closest('[data-home-interaction-settings-nested-back]');

  if (nestedBackControl) {
    event.preventDefault();
    event.stopPropagation();
    if (!HOME_INTERACTION_SETTINGS_SHELL_STATE.activeNestedPanel && navigateHomeInteractionSettingsMobileBack()) {
      return true;
    }
    closeHomeInteractionSettingsNestedPanel();
    return true;
  }

  const navExpandControl = target.closest('[data-home-interaction-settings-nav-expand]');

  if (navExpandControl) {
    event.preventDefault();
    event.stopPropagation();
    const section = navExpandControl.dataset.homeInteractionSettingsNavExpand;
    toggleHomeInteractionSettingsSubrailExpand(section);
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
    const section = navItem.dataset.homeInteractionSettingsDestination;
    const isSubnavItem = navItem.classList.contains('home-interaction-settings-panel__subnav-item');
    void setHomeInteractionSettingsSection(section).then(() => {
      advanceHomeInteractionSettingsMobileStackLevel(
        isSubnavItem || shouldRouteHomeInteractionSettingsMobileSectionDirectlyToContent(section)
          ? 'content'
          : 'subnav'
      );
    });

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

  // Restore open state if panel was previously open
  if (await restoreHomeInteractionSettingsStorageState()) {
    return;
  }

  // Load saved state for section and rail mode (only if panel wasn't open)
  const savedState = readHomeInteractionSettingsStorageState();
  if (savedState.section) {
    HOME_INTERACTION_SETTINGS_SHELL_STATE.activeSection = savedState.section;
  }
  if (savedState.railMode) {
    HOME_INTERACTION_SETTINGS_SHELL_STATE.railMode = savedState.railMode;
  }
  HOME_INTERACTION_SETTINGS_SHELL_STATE.subrailExpanded = savedState.subrailExpanded;
  HOME_INTERACTION_SETTINGS_SHELL_STATE.mobileStackLevel = savedState.mobileStackLevel;

  setHomeInteractionSettingsSection(HOME_INTERACTION_SETTINGS_SHELL_STATE.activeSection);
  syncHomeInteractionSettingsRailMode(HOME_INTERACTION_SETTINGS_SHELL_STATE.railMode);
  syncHomeInteractionSettingsMobileStackLevel(HOME_INTERACTION_SETTINGS_SHELL_STATE.mobileStackLevel);
  syncHomeInteractionConversationComposerDock();

}

window.addEventListener('fragment:mounted', (event) => {
  if (event instanceof CustomEvent && event.detail?.source === 'home-interaction-settings-nested-panel') return;
  if (event instanceof CustomEvent && event.detail?.source === 'home-interaction-settings-conversation-dock') return;
  if (!document.getElementById('home-interaction-settings-panel')) return;

  void bootHomeInteractionSettingsShell().then(() => {
    syncHomeInteractionConversationComposerDock();
  });
});
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootHomeInteractionSettingsShell, { once: true });
} else {
  bootHomeInteractionSettingsShell();
}
