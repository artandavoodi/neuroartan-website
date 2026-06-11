import { mountSettingsCategory } from '../_shared/settings-category.js';
import {
  HOME_SHORTCUT_ITEMS,
  getDefaultHomeShortcutEnabled,
  getDefaultHomeShortcutPriority,
  getOrderedHomeShortcutItems,
  normalizeHomeShortcutState,
} from '../../home/shortcut-registry.js';

// Home configuration state
const HOME_CONFIG = {
  visibility: {
    'shortcuts': true,
    'system-state': true,
    'continuity': true,
    'cognitive-map': true,
    'model': true,
    'direction': true,
    'now': true
  },
  priority: {
    'shortcuts': 1,
    'now': 2,
    'system-state': 3,
    'model': 4,
    'continuity': 5,
    'cognitive-map': 6,
    'direction': 7
  },
  shortcuts: {
    enabled: getDefaultHomeShortcutEnabled(),
    priority: getDefaultHomeShortcutPriority(),
  },
  display: {
    mode: 'standard',
    emptyStateBehavior: 'guidance',
    sectionChrome: 'guidance'
  },
  analytics: {
    enableTracking: false,
    retention: '7days',
    frequency: 'realtime'
  },
  health: {
    enableMonitoring: false,
    enableAlerts: false
  },
  readiness: {
    enableTracking: false,
    enableMilestoneNotifications: false
  },
  model: {
    enableDashboard: false,
    defaultView: 'overview',
    showBrainScan: true,
    showReadiness: true,
    showSourceCoverage: true,
    showTrainingState: true,
    showVisibilityState: true
  }
};

// Get home configuration from localStorage
function getHomeConfig() {
  const stored = localStorage.getItem('neuroartan-home-config');
  if (stored) {
    try {
      const storedConfig = JSON.parse(stored);
      return {
        ...HOME_CONFIG,
        ...storedConfig,
        visibility: { ...HOME_CONFIG.visibility, ...(storedConfig.visibility || {}) },
        priority: { ...HOME_CONFIG.priority, ...(storedConfig.priority || {}) },
        shortcuts: normalizeHomeShortcutState({
          ...HOME_CONFIG.shortcuts,
          ...(storedConfig.shortcuts || {}),
        }),
        display: { ...HOME_CONFIG.display, ...(storedConfig.display || {}) },
        analytics: { ...HOME_CONFIG.analytics, ...(storedConfig.analytics || {}) },
        health: { ...HOME_CONFIG.health, ...(storedConfig.health || {}) },
        readiness: { ...HOME_CONFIG.readiness, ...(storedConfig.readiness || {}) },
        model: { ...HOME_CONFIG.model, ...(storedConfig.model || {}) }
      };
    } catch (e) {
      console.error('Failed to parse home config:', e);
    }
  }
  return HOME_CONFIG;
}

// Save home configuration to localStorage
function saveHomeConfig(config) {
  localStorage.setItem('neuroartan-home-config', JSON.stringify({
    ...config,
    shortcuts: normalizeHomeShortcutState(config.shortcuts || {}),
  }));
}

function saveHomeShortcutEnabled(shortcutId, isEnabled) {
  const nextConfig = getHomeConfig();
  const nextShortcutState = normalizeHomeShortcutState(nextConfig.shortcuts || {});

  nextShortcutState.enabled[shortcutId] = isEnabled;
  nextConfig.shortcuts = nextShortcutState;
  saveHomeConfig(nextConfig);
  dispatchHomeEvent('shortcuts:changed', { moduleId: shortcutId, enabled: isEnabled });
}

function syncHomeShortcutToggle(toggle, checked) {
  const isChecked = Boolean(checked);
  toggle.setAttribute('aria-checked', String(isChecked));
  toggle.setAttribute('data-toggle-checked', String(isChecked));
  toggle.dataset.toggleState = isChecked ? 'on' : 'off';

  toggle.querySelector('.na-toggle__track, [data-na-toggle-track]')
    ?.setAttribute('data-toggle-state', isChecked ? 'on' : 'off');
  toggle.querySelector('.na-toggle__thumb, [data-na-toggle-thumb]')
    ?.setAttribute('data-toggle-state', isChecked ? 'on' : 'off');
}

// Initialize drag-and-drop for priority ordering
function initDragAndDrop(root) {
  const priorityList = root.querySelector('[data-home-dashboard-priority-list]');
  if (!priorityList) return;

  const priorityRows = [...priorityList.querySelectorAll('[data-home-dashboard-priority-row]')];
  let draggedItem = null;

  priorityRows.forEach(row => {
    row.addEventListener('dragstart', (e) => {
      draggedItem = row;
      row.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });

    row.addEventListener('dragend', () => {
      row.classList.remove('dragging');
      draggedItem = null;
      updatePriorityOrder(root);
    });

    row.addEventListener('dragover', (e) => {
      if (draggedItem && draggedItem !== row) {
        e.dataTransfer.dropEffect = 'move';
        
        const rect = row.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        
        if (e.clientY < midY) {
          priorityList.insertBefore(draggedItem, row);
        } else {
          priorityList.insertBefore(draggedItem, row.nextSibling);
        }
      }
    });

    row.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
  });
}

// Update priority order after drag-and-drop
function updatePriorityOrder(root) {
  const config = getHomeConfig();
  const priorityList = root.querySelector('[data-home-dashboard-priority-list]');
  if (!priorityList) return;

  const priorityRows = [...priorityList.querySelectorAll('[data-home-dashboard-priority-row]')];
  
  // Update priority numbers based on new order
  priorityRows.forEach((row, index) => {
    const moduleId = row.dataset.homeDashboardPriorityRow;
    const caption = row.querySelector('.home-platform-dashboard__priority-caption');
    
    config.priority[moduleId] = index + 1;
    if (caption) {
      caption.textContent = `Priority: ${index + 1}`;
    }
  });

  saveHomeConfig(config);
  dispatchHomeEvent('priority:changed', config.priority);
}

// Initialize priority controls with up/down buttons
function initPriorityControls(root) {
  const config = getHomeConfig();
  const priorityRows = root.querySelectorAll('[data-home-dashboard-priority-row]');
  
  priorityRows.forEach(row => {
    const moduleId = row.dataset.homeDashboardPriorityRow;
    const upButton = row.querySelector('[data-home-dashboard-priority-action="up"]');
    const downButton = row.querySelector('[data-home-dashboard-priority-action="down"]');
    
    // Handle up button
    if (upButton) {
      upButton.addEventListener('click', () => {
        const currentOrder = config.priority[moduleId];
        if (currentOrder > 1) {
          // Find the module above and swap
          const moduleAbove = Object.keys(config.priority).find(
            key => config.priority[key] === currentOrder - 1
          );
          
          if (moduleAbove) {
            config.priority[moduleId] = currentOrder - 1;
            config.priority[moduleAbove] = currentOrder;
            saveHomeConfig(config);
            updatePriorityDisplay(root, config);
            dispatchHomeEvent('priority:changed', { moduleId, newPriority: currentOrder - 1 });
          }
        }
      });
    }
    
    // Handle down button
    if (downButton) {
      downButton.addEventListener('click', () => {
        const currentOrder = config.priority[moduleId];
        const maxOrder = Object.keys(config.priority).length;
        
        if (currentOrder < maxOrder) {
          // Find the module below and swap
          const moduleBelow = Object.keys(config.priority).find(
            key => config.priority[key] === currentOrder + 1
          );
          
          if (moduleBelow) {
            config.priority[moduleId] = currentOrder + 1;
            config.priority[moduleBelow] = currentOrder;
            saveHomeConfig(config);
            updatePriorityDisplay(root, config);
            dispatchHomeEvent('priority:changed', { moduleId, newPriority: currentOrder + 1 });
          }
        }
      });
    }
  });
  
  updatePriorityDisplay(root, config);
}

// Update priority display
function updatePriorityDisplay(root, config) {
  const priorityRows = root.querySelectorAll('[data-home-dashboard-priority-row]');
  const priorityList = root.querySelector('[data-home-dashboard-priority-list]');
  
  if (!priorityList) return;
  
  // Sort rows by priority
  const sortedRows = [...priorityRows].sort((a, b) => {
    const priorityA = config.priority[a.dataset.homeDashboardPriorityRow] || 999;
    const priorityB = config.priority[b.dataset.homeDashboardPriorityRow] || 999;
    return priorityA - priorityB;
  });
  
  // Reorder in DOM
  sortedRows.forEach(row => {
    priorityList.appendChild(row);
  });
  
  // Update captions and button states
  priorityRows.forEach(row => {
    const moduleId = row.dataset.homeDashboardPriorityRow;
    const caption = row.querySelector('.home-platform-dashboard__priority-caption');
    const upButton = row.querySelector('[data-home-dashboard-priority-action="up"]');
    const downButton = row.querySelector('[data-home-dashboard-priority-action="down"]');
    
    const currentPriority = config.priority[moduleId];
    const maxOrder = Object.keys(config.priority).length;
    
    if (caption) {
      caption.textContent = `Priority: ${currentPriority}`;
    }
    
    if (upButton) {
      upButton.disabled = currentPriority <= 1;
    }
    
    if (downButton) {
      downButton.disabled = currentPriority >= maxOrder;
    }
  });
}

// Update dropdown value display
function updateHomePlatformDropdownValue(fieldId, value) {
  const dropdownValue = document.querySelector(`[data-home-platform-dropdown-value="${fieldId}"]`);
  if (!(dropdownValue instanceof HTMLElement)) return;

  const select = document.querySelector(`[data-home-platform-field="${fieldId}"]`);
  if (!(select instanceof HTMLSelectElement)) return;

  const selectedOption = select.options[select.selectedIndex];
  dropdownValue.textContent = selectedOption?.text || value;
}

function syncHomePlatformSelect(root, selectors, value, onChange) {
  const select = selectors
    .map((selector) => root.querySelector(selector))
    .find((candidate) => candidate instanceof HTMLSelectElement);

  if (!(select instanceof HTMLSelectElement)) return;

  select.value = value;
  updateHomePlatformDropdownValue(select.dataset.homePlatformField || select.id, select.value);

  select.addEventListener('change', (event) => {
    const nextValue = event.target.value;
    onChange(nextValue);
    updateHomePlatformDropdownValue(select.dataset.homePlatformField || select.id, nextValue);
  });
}

function syncHomePlatformOptionGroup(root, groupSelector, optionSelector, value, onChange) {
  const group = root.querySelector(groupSelector);
  if (!(group instanceof HTMLElement)) return;

  const options = [...group.querySelectorAll(optionSelector)]
    .filter((option) => option instanceof HTMLButtonElement);

  if (!options.length) return;

  const getOptionValue = (option) => (
    option.dataset.homeDisplayModeOption
    || option.dataset.homeEmptyStateBehaviorOption
    || option.dataset.homeSectionChromeOption
  );

  const optionValues = options
    .map(getOptionValue)
    .filter(Boolean);
  const fallbackValue = optionValues.includes(value) ? value : optionValues[0];

  const applyValue = (nextValue) => {
    options.forEach((option) => {
      const optionValue = getOptionValue(option);
      const isActive = optionValue === nextValue;
      option.classList.toggle('home-platform-theme__mode-option--active', isActive);
      option.classList.toggle('is-active', isActive);
      option.dataset.state = isActive ? 'active' : 'inactive';
      option.tabIndex = isActive ? 0 : -1;
      option.setAttribute('aria-pressed', String(isActive));
      option.removeAttribute('aria-checked');
    });
  };

  applyValue(fallbackValue);
  group.dataset.value = fallbackValue;

  options.forEach((option) => {
    option.addEventListener('click', () => {
      const nextValue = getOptionValue(option);
      if (!nextValue) return;
      applyValue(nextValue);
      group.dataset.value = nextValue;
      onChange(nextValue);
    });
  });
}

// Initialize dropdown controls
function initDropdownControls(root) {
  const retentionSelect = root.querySelector('#analytics-retention');
  const frequencySelect = root.querySelector('#analytics-frequency');
  const modelViewSelect = root.querySelector('#model-default-view');
  const displayModeSelectors = [
    '#home-display-mode',
    '#display-mode',
    '#home-density-mode',
    '[data-home-platform-field="home-display-mode"]',
    '[data-home-platform-field="display-mode"]',
    '[data-home-platform-field="home-density-mode"]'
  ];
  const emptyStateBehaviorSelectors = [
    '#home-empty-state-behavior',
    '#empty-state-behavior',
    '[data-home-platform-field="home-empty-state-behavior"]',
    '[data-home-platform-field="empty-state-behavior"]'
  ];
  const sectionChromeSelectors = [
    '#home-section-chrome',
    '[data-home-platform-field="home-section-chrome"]'
  ];

  const config = getHomeConfig();

  syncHomePlatformSelect(root, displayModeSelectors, config.display.mode, (value) => {
    config.display.mode = value;
    saveHomeConfig(config);
    dispatchHomeEvent('display:changed', { mode: value });
  });

  syncHomePlatformOptionGroup(root, '[data-home-display-mode-group]', '[data-home-display-mode-option]', config.display.mode, (value) => {
    config.display.mode = value;
    saveHomeConfig(config);
    dispatchHomeEvent('display:changed', { mode: value });
  });

  syncHomePlatformSelect(root, emptyStateBehaviorSelectors, config.display.emptyStateBehavior, (value) => {
    config.display.emptyStateBehavior = value;
    saveHomeConfig(config);
    dispatchHomeEvent('empty-state:changed', { behavior: value });
  });

  syncHomePlatformOptionGroup(
    root,
    '[data-home-empty-state-behavior-group]',
    '[data-home-empty-state-behavior-option]',
    config.display.emptyStateBehavior,
    (value) => {
      config.display.emptyStateBehavior = value;
      saveHomeConfig(config);
      dispatchHomeEvent('empty-state:changed', { behavior: value });
    }
  );

  syncHomePlatformSelect(root, sectionChromeSelectors, config.display.sectionChrome, (value) => {
    config.display.sectionChrome = value;
    saveHomeConfig(config);
    dispatchHomeEvent('section-chrome:changed', { mode: value });
  });

  syncHomePlatformOptionGroup(
    root,
    '[data-home-section-chrome-group]',
    '[data-home-section-chrome-option]',
    config.display.sectionChrome,
    (value) => {
      config.display.sectionChrome = value;
      saveHomeConfig(config);
      dispatchHomeEvent('section-chrome:changed', { mode: value });
    }
  );
  
  if (retentionSelect) {
    retentionSelect.value = config.analytics.retention;
    retentionSelect.addEventListener('change', (e) => {
      config.analytics.retention = e.target.value;
      saveHomeConfig(config);
      updateHomePlatformDropdownValue('analytics-retention', e.target.value);
      dispatchHomeEvent('analytics:changed', { retention: e.target.value });
    });
  }
  
  if (frequencySelect) {
    frequencySelect.value = config.analytics.frequency;
    frequencySelect.addEventListener('change', (e) => {
      config.analytics.frequency = e.target.value;
      saveHomeConfig(config);
      updateHomePlatformDropdownValue('analytics-frequency', e.target.value);
      dispatchHomeEvent('analytics:changed', { frequency: e.target.value });
    });
  }
  
  if (modelViewSelect) {
    modelViewSelect.value = config.model.defaultView;
    modelViewSelect.addEventListener('change', (e) => {
      config.model.defaultView = e.target.value;
      saveHomeConfig(config);
      updateHomePlatformDropdownValue('model-default-view', e.target.value);
      dispatchHomeEvent('model:changed', { defaultView: e.target.value });
    });
  }
}

// Render shortcuts list
function renderShortcuts(root) {
  const config = getHomeConfig();
  const shortcutsList = root.querySelector('[data-home-shortcuts-list]');
  
  if (!(shortcutsList instanceof HTMLElement)) return;
  
  shortcutsList.innerHTML = '';

  const shortcutState = normalizeHomeShortcutState(config.shortcuts || {});
  const shortcutItems = getOrderedHomeShortcutItems(shortcutState);

  shortcutItems.forEach((shortcut, index) => {
    const shortcutRow = document.createElement('div');
    shortcutRow.className = 'home-platform-dashboard__priority-row home-platform-dashboard__priority-row--shortcut';
    shortcutRow.role = 'listitem';
    shortcutRow.draggable = true;
    shortcutRow.dataset.homeShortcutRow = shortcut.id;
    shortcutRow.dataset.homeShortcutPriorityOrder = String(index + 1);
    shortcutRow.innerHTML = `
      <div class="home-platform-dashboard__priority-handle" data-home-shortcut-priority-handle>
        <img class="ui-icon-theme-aware" src="/registry/icons/public/assets/core/actions/drag/drag.svg" alt="" width="16" height="16" aria-hidden="true">
      </div>
      <div class="home-platform-dashboard__priority-copy">
        <p class="home-platform-dashboard__priority-title">${shortcut.label}</p>
      </div>
      <button class="na-toggle" type="button" role="switch" aria-checked="${shortcutState.enabled[shortcut.id] !== false ? 'true' : 'false'}" data-na-toggle data-toggle-key="${shortcut.id}" data-toggle-scope="home-shortcuts">
        <span class="na-toggle__track" aria-hidden="true">
          <span class="na-toggle__thumb"></span>
        </span>
      </button>
    `;

    const toggle = shortcutRow.querySelector('[data-toggle-scope="home-shortcuts"]');
    if (toggle instanceof HTMLButtonElement) {
      toggle.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();

        const isChecked = toggle.getAttribute('aria-checked') !== 'true';
        syncHomeShortcutToggle(toggle, isChecked);
        saveHomeShortcutEnabled(shortcut.id, isChecked);
      }, { capture: true });

      toggle.addEventListener('keydown', (event) => {
        if (event.key !== ' ' && event.key !== 'Enter') return;
        event.preventDefault();
        event.stopPropagation();

        const isChecked = toggle.getAttribute('aria-checked') !== 'true';
        syncHomeShortcutToggle(toggle, isChecked);
        saveHomeShortcutEnabled(shortcut.id, isChecked);
      }, { capture: true });
    }

    shortcutsList.appendChild(shortcutRow);
  });

  initShortcutDragAndDrop(root);
}

function updateShortcutPriorityOrder(root) {
  const config = getHomeConfig();
  const shortcutState = normalizeHomeShortcutState(config.shortcuts || {});
  const shortcutsList = root.querySelector('[data-home-shortcuts-list]');
  if (!(shortcutsList instanceof HTMLElement)) return;

  const shortcutRows = [...shortcutsList.querySelectorAll('[data-home-shortcut-row]')];
  shortcutRows.forEach((row, index) => {
    const shortcutId = row.dataset.homeShortcutRow;
    if (!shortcutId) return;
    shortcutState.priority[shortcutId] = index + 1;
    row.dataset.homeShortcutPriorityOrder = String(index + 1);
  });

  config.shortcuts = shortcutState;
  saveHomeConfig(config);
  dispatchHomeEvent('shortcuts:changed', { priority: shortcutState.priority });
}

function initShortcutDragAndDrop(root) {
  const shortcutsList = root.querySelector('[data-home-shortcuts-list]');
  if (!(shortcutsList instanceof HTMLElement) || shortcutsList.dataset.homeShortcutDragBound === 'true') return;

  shortcutsList.dataset.homeShortcutDragBound = 'true';
  let draggedItem = null;

  shortcutsList.addEventListener('dragstart', (event) => {
    const row = event.target.closest('[data-home-shortcut-row]');
    if (!(row instanceof HTMLElement)) return;
    draggedItem = row;
    row.classList.add('dragging');
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
    }
  });

  shortcutsList.addEventListener('dragend', () => {
    if (draggedItem instanceof HTMLElement) {
      draggedItem.classList.remove('dragging');
    }
    draggedItem = null;
    updateShortcutPriorityOrder(root);
  });

  shortcutsList.addEventListener('dragover', (event) => {
    if (!(draggedItem instanceof HTMLElement)) return;
    const row = event.target.closest('[data-home-shortcut-row]');
    if (!(row instanceof HTMLElement) || row === draggedItem) return;

    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }

    const rect = row.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;

    if (event.clientY < midY) {
      shortcutsList.insertBefore(draggedItem, row);
    } else {
      shortcutsList.insertBefore(draggedItem, row.nextSibling);
    }
  });

  shortcutsList.addEventListener('drop', (event) => {
    event.preventDefault();
    event.stopPropagation();
  });
}

function syncShortcutToggleState(root) {
  const config = getHomeConfig();
  const shortcutState = normalizeHomeShortcutState(config.shortcuts || {});
  root.querySelectorAll('[data-toggle-scope="home-shortcuts"]').forEach((toggle) => {
    const shortcutId = toggle.dataset.toggleKey;
    if (!shortcutId) return;
    syncHomeShortcutToggle(toggle, shortcutState.enabled[shortcutId] !== false);
  });
}

function syncShortcutSectionVisibility(root) {
  const config = getHomeConfig();
  const shortcutSection = root
    .querySelector('[data-home-shortcuts-list]')
    ?.closest('[data-home-platform-theme-section]');
  if (!(shortcutSection instanceof HTMLElement)) return;

  shortcutSection.hidden = config.visibility.shortcuts === false;
}

function syncModelSectionVisibility(root) {
  const config = getHomeConfig();
  const modelSection = root.querySelector('[data-home-model-settings-section]');
  if (!(modelSection instanceof HTMLElement)) return;

  modelSection.hidden = config.visibility.model === false;
}

// Render available modules for adding as shortcuts
function renderAvailableModules(root) {
  const availableModulesList = root.querySelector('[data-home-available-modules-list]');
  
  if (!(availableModulesList instanceof HTMLElement)) return;
  
  availableModulesList.innerHTML = '';
  HOME_SHORTCUT_ITEMS.forEach((shortcut) => {
    const moduleRow = document.createElement('div');
    moduleRow.className = 'home-platform-theme__toggle-row';
    moduleRow.role = 'listitem';
    moduleRow.dataset.homeAvailableModuleRow = shortcut.id;
    moduleRow.innerHTML = `
      <div class="home-platform-theme__toggle-copy">
        <p class="home-platform-theme__toggle-title">${shortcut.label}</p>
      </div>
    `;
    availableModulesList.appendChild(moduleRow);
  });
}

function initGlobalToggles(root) {
  const config = getHomeConfig();
  
  // Sync home config with global toggle system
  document.addEventListener('neuroartan:toggle-changed', (event) => {
    const { scope, key, checked } = event.detail;
    
    if (scope === 'home-visibility' && key in config.visibility) {
      const nextConfig = getHomeConfig();
      nextConfig.visibility[key] = checked;
      saveHomeConfig(nextConfig);
      if (key === 'shortcuts') {
        syncShortcutSectionVisibility(root);
      }
      if (key === 'model') {
        syncModelSectionVisibility(root);
      }
      dispatchHomeEvent('visibility:changed', { moduleId: key, visible: checked });
    }

    if (scope === 'home-shortcuts') {
      saveHomeShortcutEnabled(key, checked);
    }
    
    if (scope === 'home-analytics' && key === 'enableTracking') {
      config.analytics.enableTracking = checked;
      saveHomeConfig(config);
      dispatchHomeEvent('analytics:changed', { enableTracking: checked });
    }
    
    if (scope === 'home-health' && key in config.health) {
      config.health[key] = checked;
      saveHomeConfig(config);
      dispatchHomeEvent('health:changed', { [key]: checked });
    }
    
    if (scope === 'home-readiness' && key in config.readiness) {
      config.readiness[key] = checked;
      saveHomeConfig(config);
      dispatchHomeEvent('readiness:changed', { [key]: checked });
    }
    
    if (scope === 'home-model' && key === 'enableDashboard') {
      config.model.enableDashboard = checked;
      saveHomeConfig(config);
      dispatchHomeEvent('model:changed', { enableDashboard: checked });
    }

    if (scope === 'home-model-display' && key in config.model) {
      const nextConfig = getHomeConfig();
      nextConfig.model[key] = checked;
      saveHomeConfig(nextConfig);
      dispatchHomeEvent('model:changed', { [key]: checked });
    }
  });
  
  // Initialize toggle states from home config
  const visibilityToggles = root.querySelectorAll('[data-toggle-scope="home-visibility"]');
  visibilityToggles.forEach(toggle => {
    const toggleKey = toggle.dataset.toggleKey;
    const isChecked = config.visibility[toggleKey] !== false;
    toggle.setAttribute('aria-checked', isChecked);
  });

  const analyticsToggle = root.querySelector('[data-toggle-scope="home-analytics"]');
  if (analyticsToggle) {
    const isChecked = config.analytics.enableTracking;
    analyticsToggle.setAttribute('aria-checked', isChecked);
  }
  
  const healthToggles = root.querySelectorAll('[data-toggle-scope="home-health"]');
  healthToggles.forEach(toggle => {
    const toggleKey = toggle.dataset.toggleKey;
    const isChecked = config.health[toggleKey] !== false;
    toggle.setAttribute('aria-checked', isChecked);
  });
  
  const readinessToggles = root.querySelectorAll('[data-toggle-scope="home-readiness"]');
  readinessToggles.forEach(toggle => {
    const toggleKey = toggle.dataset.toggleKey;
    const isChecked = config.readiness[toggleKey] !== false;
    toggle.setAttribute('aria-checked', isChecked);
  });
  
  const modelToggle = root.querySelector('[data-toggle-scope="home-model"]');
  if (modelToggle) {
    const isChecked = config.model.enableDashboard;
    modelToggle.setAttribute('aria-checked', isChecked);
  }

  const modelDisplayToggles = root.querySelectorAll('[data-toggle-scope="home-model-display"]');
  modelDisplayToggles.forEach((toggle) => {
    const toggleKey = toggle.dataset.toggleKey;
    const isChecked = config.model[toggleKey] !== false;
    syncHomeShortcutToggle(toggle, isChecked);
  });
}

// Dispatch home event
function dispatchHomeEvent(type, detail) {
  const event = new CustomEvent(`neuroartan:home:${type}`, {
    detail,
    bubbles: true
  });
  document.dispatchEvent(event);
}

// Listen for home configuration changes
function listenForConfigChanges(root) {
  document.addEventListener('neuroartan:home:initialized', () => {
    const config = getHomeConfig();
    updatePriorityDisplay(root, config);
  });
}

// Mount home settings
export function mountHomePlatformDestination(root, options = {}) {
  mountSettingsCategory(root, options);
  
  // Initialize all home controls
  initGlobalToggles(root);
  initPriorityControls(root);
  initDragAndDrop(root);
  initDropdownControls(root);
  renderShortcuts(root);
  syncShortcutToggleState(root);
  syncShortcutSectionVisibility(root);
  syncModelSectionVisibility(root);
  renderAvailableModules(root);
  listenForConfigChanges(root);
  
  // Dispatch initialization event
  const config = getHomeConfig();
  dispatchHomeEvent('initialized', config);
}
