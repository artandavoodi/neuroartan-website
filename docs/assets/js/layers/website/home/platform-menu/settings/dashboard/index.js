import { mountSettingsCategory } from '../_shared/settings-category.js';

// Dashboard configuration state
const DASHBOARD_CONFIG = {
  visibility: {
    'system-overview': true,
    'continuity-memory': true,
    'knowledge-graph': true,
    'model-readiness': true,
    'system-guidance': true,
    'usage-interaction': true
  },
  priority: {
    'system-overview': 1,
    'continuity-memory': 2,
    'knowledge-graph': 3,
    'model-readiness': 4,
    'system-guidance': 5,
    'usage-interaction': 6
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

// Get dashboard configuration from localStorage
function getDashboardConfig() {
  const stored = localStorage.getItem('neuroartan-dashboard-config');
  if (stored) {
    try {
      return { ...DASHBOARD_CONFIG, ...JSON.parse(stored) };
    } catch (e) {
      console.error('Failed to parse dashboard config:', e);
    }
  }
  return DASHBOARD_CONFIG;
}

// Save dashboard configuration to localStorage
function saveDashboardConfig(config) {
  localStorage.setItem('neuroartan-dashboard-config', JSON.stringify(config));
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
  const config = getDashboardConfig();
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

  saveDashboardConfig(config);
  dispatchDashboardEvent('priority:changed', config.priority);
}

// Initialize priority controls with up/down buttons
function initPriorityControls(root) {
  const config = getDashboardConfig();
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
            saveDashboardConfig(config);
            updatePriorityDisplay(root, config);
            dispatchDashboardEvent('priority:changed', { moduleId, newPriority: currentOrder - 1 });
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
            saveDashboardConfig(config);
            updatePriorityDisplay(root, config);
            dispatchDashboardEvent('priority:changed', { moduleId, newPriority: currentOrder + 1 });
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

// Initialize dropdown controls
function initDropdownControls(root) {
  const retentionSelect = root.querySelector('#analytics-retention');
  const frequencySelect = root.querySelector('#analytics-frequency');
  const modelViewSelect = root.querySelector('#model-default-view');
  
  const config = getDashboardConfig();
  
  if (retentionSelect) {
    retentionSelect.value = config.analytics.retention;
    retentionSelect.addEventListener('change', (e) => {
      config.analytics.retention = e.target.value;
      saveDashboardConfig(config);
      dispatchDashboardEvent('analytics:changed', { retention: e.target.value });
    });
  }
  
  if (frequencySelect) {
    frequencySelect.value = config.analytics.frequency;
    frequencySelect.addEventListener('change', (e) => {
      config.analytics.frequency = e.target.value;
      saveDashboardConfig(config);
      dispatchDashboardEvent('analytics:changed', { frequency: e.target.value });
    });
  }
  
  if (modelViewSelect) {
    modelViewSelect.value = config.model.defaultView;
    modelViewSelect.addEventListener('change', (e) => {
      config.model.defaultView = e.target.value;
      saveDashboardConfig(config);
      dispatchDashboardEvent('model:changed', { defaultView: e.target.value });
    });
  }
}

// Initialize global toggle system integration
function initGlobalToggles(root) {
  const config = getDashboardConfig();
  
  // Sync dashboard config with global toggle system
  document.addEventListener('neuroartan:toggle-changed', (event) => {
    const { scope, key, checked } = event.detail;
    
    if (scope === 'dashboard-visibility' && key in config.visibility) {
      config.visibility[key] = checked;
      saveDashboardConfig(config);
      dispatchDashboardEvent('visibility:changed', { moduleId: key, visible: checked });
    }
    
    if (scope === 'dashboard-analytics' && key === 'enableTracking') {
      config.analytics.enableTracking = checked;
      saveDashboardConfig(config);
      dispatchDashboardEvent('analytics:changed', { enableTracking: checked });
    }
    
    if (scope === 'dashboard-health' && key in config.health) {
      config.health[key] = checked;
      saveDashboardConfig(config);
      dispatchDashboardEvent('health:changed', { [key]: checked });
    }
    
    if (scope === 'dashboard-readiness' && key in config.readiness) {
      config.readiness[key] = checked;
      saveDashboardConfig(config);
      dispatchDashboardEvent('readiness:changed', { [key]: checked });
    }
    
    if (scope === 'dashboard-model' && key === 'enableDashboard') {
      config.model.enableDashboard = checked;
      saveDashboardConfig(config);
      dispatchDashboardEvent('model:changed', { enableDashboard: checked });
    }
  });
  
  // Initialize toggle states from dashboard config
  const visibilityToggles = root.querySelectorAll('[data-toggle-scope="dashboard-visibility"]');
  visibilityToggles.forEach(toggle => {
    const toggleKey = toggle.dataset.toggleKey;
    const isChecked = config.visibility[toggleKey] !== false;
    toggle.setAttribute('aria-checked', isChecked);
  });
  
  const analyticsToggle = root.querySelector('[data-toggle-scope="dashboard-analytics"]');
  if (analyticsToggle) {
    const isChecked = config.analytics.enableTracking;
    analyticsToggle.setAttribute('aria-checked', isChecked);
  }
  
  const healthToggles = root.querySelectorAll('[data-toggle-scope="dashboard-health"]');
  healthToggles.forEach(toggle => {
    const toggleKey = toggle.dataset.toggleKey;
    const isChecked = config.health[toggleKey] !== false;
    toggle.setAttribute('aria-checked', isChecked);
  });
  
  const readinessToggles = root.querySelectorAll('[data-toggle-scope="dashboard-readiness"]');
  readinessToggles.forEach(toggle => {
    const toggleKey = toggle.dataset.toggleKey;
    const isChecked = config.readiness[toggleKey] !== false;
    toggle.setAttribute('aria-checked', isChecked);
  });
  
  const modelToggle = root.querySelector('[data-toggle-scope="dashboard-model"]');
  if (modelToggle) {
    const isChecked = config.model.enableDashboard;
    modelToggle.setAttribute('aria-checked', isChecked);
  }
}

// Dispatch dashboard event
function dispatchDashboardEvent(type, detail) {
  const event = new CustomEvent(`neuroartan:dashboard:${type}`, {
    detail,
    bubbles: true
  });
  document.dispatchEvent(event);
}

// Listen for dashboard configuration changes
function listenForConfigChanges(root) {
  document.addEventListener('neuroartan:dashboard:initialized', () => {
    const config = getDashboardConfig();
    updatePriorityDisplay(root, config);
  });
}

// Mount dashboard settings
export function mountHomePlatformDestination(root, options = {}) {
  mountSettingsCategory(root, options);
  
  // Initialize all dashboard controls
  initGlobalToggles(root);
  initPriorityControls(root);
  initDragAndDrop(root);
  initDropdownControls(root);
  listenForConfigChanges(root);
  
  // Dispatch initialization event
  const config = getDashboardConfig();
  dispatchDashboardEvent('initialized', config);
}
