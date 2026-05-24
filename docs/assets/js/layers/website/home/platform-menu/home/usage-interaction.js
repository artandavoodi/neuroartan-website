// Usage & Interaction Module - Activity
// Provides usage metrics and interaction data

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

// Update usage display
function updateUsageDisplay(root) {
  const config = getDashboardConfig();
  
  // Check if module is visible
  if (config && config.visibility && config.visibility['usage-interaction'] === false) {
    root.style.display = 'none';
    return;
  }
  
  root.style.display = '';
  
  // Fetch usage data from backend
  fetchUsageData().then(data => {
    const value = root.querySelector('[data-home-usage-value]');
    if (value) {
      value.textContent = data.currentView || 'Sessions';
    }
  }).catch(err => {
    console.error('Failed to fetch usage data:', err);
  }, { signal: controller.signal });
  return () => controller.abort();
}

// Fetch usage data from backend
async function fetchUsageData() {
  try {
    const response = await fetch('/assets/data/dashboard/activity-data.json');
    if (!response.ok) throw new Error('Failed to fetch activity data');
    const data = await response.json();
    
    return {
      currentView: 'Sessions',
      sessionCount: data.metadata?.sessionCount || 0,
      conversationCount: data.metadata?.conversationCount || 0,
      reflectionCount: data.metadata?.reflectionCount || 0
    };
  } catch (error) {
    console.error('Error fetching usage data:', error);
    return {
      currentView: 'Sessions',
      sessionCount: 0,
      conversationCount: 0,
      reflectionCount: 0
    };
  }
}

// Listen for dashboard configuration changes
function listenForConfigChanges(root) {
  const controller = new AbortController();
  document.addEventListener('neuroartan:dashboard:visibility:changed', (e) => {
    if (e.detail.moduleId === 'usage-interaction') {
      updateUsageDisplay(root);
    }
  }, { signal: controller.signal });
  
  document.addEventListener('neuroartan:dashboard:initialized', () => {
    updateUsageDisplay(root);
  }, { signal: controller.signal });
  return () => controller.abort();
}

// Mount usage interaction module
export function mountHomeUsageInteraction(root) {
  const scope = root?.querySelector?.('[data-home-overview-module="usage-interaction"]')
    || root?.matches?.('[data-home-overview-module="usage-interaction"]') && root;

  if (!(scope instanceof Element)) return;

  const value = scope.querySelector('[data-home-usage-value]');
  const nodes = [...scope.querySelectorAll('[data-home-usage-view]')];

  // Initialize display
  updateUsageDisplay(scope);
  const cleanupConfigChanges = listenForConfigChanges(scope);

  // Handle view selection
  nodes.forEach((node) => {
    node.addEventListener("click", () => {
      nodes.forEach((item) => item.classList.toggle("is-active", item === node));
      if (value) value.textContent = node.textContent.trim();
    });
  });
  
  // Set up periodic updates
  const updateInterval = setInterval(() => {
    updateUsageDisplay(scope);
  }, 30000); // Update every 30 seconds
  
  // Return cleanup function
  return () => {
    cleanupConfigChanges?.();
    clearInterval(updateInterval);
  };
}
