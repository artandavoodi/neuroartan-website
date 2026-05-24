// Continuity & Memory Module
// Provides continuity and memory state information

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

// Update continuity display
function updateContinuityDisplay(root) {
  const config = getDashboardConfig();
  
  // Check if module is visible
  if (config && config.visibility && config.visibility['continuity-memory'] === false) {
    root.style.display = 'none';
    return;
  }
  
  root.style.display = '';
  
  // Fetch continuity data from backend
  fetchContinuityData().then(data => {
    const value = root.querySelector('[data-home-continuity-value]');
    if (value) {
      value.textContent = data.currentView || 'Recent Carryover';
    }
  }).catch(err => {
    console.error('Failed to fetch continuity data:', err);
  }, { signal: controller.signal });
  return () => controller.abort();
}

// Fetch continuity data from backend
async function fetchContinuityData() {
  try {
    const response = await fetch('/assets/data/dashboard/activity-data.json');
    if (!response.ok) throw new Error('Failed to fetch activity data');
    const data = await response.json();
    
    return {
      currentView: 'Recent Carryover',
      carryoverCount: data.reflections?.length || 0,
      threadCount: data.conversations?.length || 0,
      memoryDensity: 'Low'
    };
  } catch (error) {
    console.error('Error fetching continuity data:', error);
    return {
      currentView: 'Recent Carryover',
      carryoverCount: 0,
      threadCount: 0,
      memoryDensity: 'Low'
    };
  }
}

// Listen for dashboard configuration changes
function listenForConfigChanges(root) {
  const controller = new AbortController();
  document.addEventListener('neuroartan:dashboard:visibility:changed', (e) => {
    if (e.detail.moduleId === 'continuity-memory') {
      updateContinuityDisplay(root);
    }
  }, { signal: controller.signal });
  
  document.addEventListener('neuroartan:dashboard:initialized', () => {
    updateContinuityDisplay(root);
  }, { signal: controller.signal });
  return () => controller.abort();
}

// Mount continuity memory module
export function mountHomeContinuityMemory(root) {
  const scope = root?.querySelector?.('[data-home-overview-module="continuity-memory"]')
    || root?.matches?.('[data-home-overview-module="continuity-memory"]') && root;

  if (!(scope instanceof Element)) return;

  const value = scope.querySelector('[data-home-continuity-value]');
  const nodes = [...scope.querySelectorAll('[data-continuity-thread]')];

  // Initialize display
  updateContinuityDisplay(scope);
  const cleanupConfigChanges = listenForConfigChanges(scope);

  // Handle thread selection
  nodes.forEach((node) => {
    node.addEventListener("click", () => {
      nodes.forEach((item) => item.classList.toggle("is-active", item === node));
      if (value) value.textContent = node.textContent.trim();
    });
  });
  
  // Set up periodic updates
  const updateInterval = setInterval(() => {
    updateContinuityDisplay(scope);
  }, 30000); // Update every 30 seconds
  
  // Return cleanup function
  return () => {
    cleanupConfigChanges?.();
    clearInterval(updateInterval);
  };
}
