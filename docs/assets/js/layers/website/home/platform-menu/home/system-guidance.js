// System Guidance Module - Priority Actions
// Provides actionable guidance items and priority actions

// Get dashboard configuration
function getDashboardConfig() {
  const stored = localStorage.getItem('neuroartan-dashboard-config');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error('Failed to parse dashboard config:', e);
    }
  }
  return null;
}

// Update system guidance display
function updateSystemGuidanceDisplay(root) {
  const config = getDashboardConfig();
  
  // Check if module is visible
  if (config && config.visibility && config.visibility['system-guidance'] === false) {
    root.style.display = 'none';
    return;
  }
  
  root.style.display = '';
  
  // Fetch guidance data from backend
  fetchGuidanceData().then(data => {
    const value = root.querySelector('[data-home-guidance-value]');
    if (value) {
      value.textContent = data.priorityAction || 'Strengthen Voice';
    }
  }).catch(err => {
    console.error('Failed to fetch guidance data:', err);
  });
}

// Fetch guidance data from backend
async function fetchGuidanceData() {
  try {
    const response = await fetch('/assets/data/dashboard/dashboard-config.json');
    if (!response.ok) throw new Error('Failed to fetch dashboard config');
    const config = await response.json();
    
    // Determine priority action based on config state
    let priorityAction = 'Strengthen Voice';
    if (!config.model.enableDashboard) {
      priorityAction = 'Complete Profile';
    } else if (!config.analytics.enableTracking) {
      priorityAction = 'Connect Sources';
    }
    
    return {
      priorityAction,
      guidanceItems: [
        'Strengthen Voice',
        'Complete Profile',
        'Connect Sources'
      ]
    };
  } catch (error) {
    console.error('Error fetching guidance data:', error);
    return {
      priorityAction: 'Strengthen Voice',
      guidanceItems: [
        'Strengthen Voice',
        'Complete Profile',
        'Connect Sources'
      ]
    };
  }
}

// Listen for dashboard configuration changes
function listenForConfigChanges(root) {
  document.addEventListener('neuroartan:dashboard:visibility:changed', (e) => {
    if (e.detail.moduleId === 'system-guidance') {
      updateSystemGuidanceDisplay(root);
    }
  });
  
  document.addEventListener('neuroartan:dashboard:initialized', () => {
    updateSystemGuidanceDisplay(root);
  });
  
  document.addEventListener('neuroartan:dashboard:model:changed', () => {
    updateSystemGuidanceDisplay(root);
  });
}

// Mount system guidance module
export function mountHomeSystemGuidance(root) {
  const scope = root?.querySelector?.('[data-home-overview-module="system-guidance"]')
    || root?.matches?.('[data-home-overview-module="system-guidance"]') && root;

  if (!(scope instanceof Element)) return;

  const value = scope.querySelector('[data-home-guidance-value]');
  const nodes = [...scope.querySelectorAll('[data-home-guidance-action]')];

  // Initialize display
  updateSystemGuidanceDisplay(scope);
  listenForConfigChanges(scope);

  // Handle action selection
  nodes.forEach((node) => {
    node.addEventListener("click", () => {
      nodes.forEach((item) => item.classList.toggle("is-active", item === node));
      if (value) value.textContent = node.textContent.trim();
    });
  });
  
  // Set up periodic updates
  const updateInterval = setInterval(() => {
    updateSystemGuidanceDisplay(scope);
  }, 30000); // Update every 30 seconds
  
  // Return cleanup function
  return () => {
    clearInterval(updateInterval);
  };
}
