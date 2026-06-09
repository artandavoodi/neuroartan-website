import { mountSettingsCategory } from '../_shared/settings-category.js';

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
    items: [
      {
        id: 'feed',
        label: 'Feed',
        target: 'feed'
      },
      {
        id: 'model',
        label: 'Model',
        target: 'model'
      },
      {
        id: 'memory',
        label: 'Memory',
        target: 'memory'
      }
    ]
  },
  display: {
    mode: 'standard',
    emptyStateBehavior: 'guidance'
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
    defaultView: 'overview'
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
        shortcuts: { ...HOME_CONFIG.shortcuts, ...(storedConfig.shortcuts || {}) },
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
  localStorage.setItem('neuroartan-home-config', JSON.stringify(config));
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

  const optionValues = options
    .map((option) => option.dataset.homeDisplayModeOption || option.dataset.homeEmptyStateBehaviorOption)
    .filter(Boolean);
  const fallbackValue = optionValues.includes(value) ? value : optionValues[0];

  const applyValue = (nextValue) => {
    options.forEach((option) => {
      const optionValue = option.dataset.homeDisplayModeOption || option.dataset.homeEmptyStateBehaviorOption;
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
      const nextValue = option.dataset.homeDisplayModeOption || option.dataset.homeEmptyStateBehaviorOption;
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

// Initialize global toggle system integration
function initGlobalToggles(root) {
  const config = getHomeConfig();
  
  // Sync home config with global toggle system
  document.addEventListener('neuroartan:toggle-changed', (event) => {
    const { scope, key, checked } = event.detail;
    
    if (scope === 'home-visibility' && key in config.visibility) {
      config.visibility[key] = checked;
      saveHomeConfig(config);
      dispatchHomeEvent('visibility:changed', { moduleId: key, visible: checked });
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
  });
  
  // Initialize toggle states from home config
  const visibilityToggles = root.querySelectorAll('[data-toggle-scope="home-visibility"]');
  visibilityToggles.forEach(toggle => {
    const toggleKey = toggle.dataset.toggleKey;
    const isChecked = config.visibility[toggleKey] !== false;
    toggle.setAttribute('aria-checked', isChecked);
  });

  const shortcutsRows = root.querySelectorAll('[data-home-shortcut-row]');
  shortcutsRows.forEach((row) => {
    const moduleId = row.dataset.homeShortcutRow;
    const shortcut = config.shortcuts.items.find((item) => item.id === moduleId || item.target === moduleId);
    const caption = row.querySelector('.home-platform-theme__toggle-caption');
    if (caption && shortcut) {
      caption.textContent = `Default shortcut: ${shortcut.label}`;
    }
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
  listenForConfigChanges(root);
  
  // Dispatch initialization event
  const config = getHomeConfig();
  dispatchHomeEvent('initialized', config);
}
