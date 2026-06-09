// Continuity Module
// Provides continuity and memory state information

// Get home configuration
function getHomeConfig() {
  const stored = localStorage.getItem('neuroartan-home-config');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error('Failed to parse home config:', e);
    }
  }
  return null;
}

// Update continuity display
function updateContinuityDisplay(root) {
  const config = getHomeConfig();
  
  // Check if module is visible
  if (config && config.visibility && config.visibility['continuity'] === false) {
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
  });
}

// Fetch continuity data from backend
async function fetchContinuityData() {
  try {
    const response = await fetch('/assets/data/home/activity-data.json');
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

// Listen for home configuration changes
function listenForConfigChanges(root) {
  const controller = new AbortController();
  document.addEventListener('neuroartan:home:visibility:changed', (e) => {
    if (e.detail.moduleId === 'continuity') {
      updateContinuityDisplay(root);
    }
  }, { signal: controller.signal });
  
  document.addEventListener('neuroartan:home:initialized', () => {
    updateContinuityDisplay(root);
  }, { signal: controller.signal });
  return () => controller.abort();
}

// Mount continuity module
export function mountHomeContinuity(root) {
  const scope = root?.querySelector?.('[data-home-overview-module="continuity"]')
    || root?.matches?.('[data-home-overview-module="continuity"]') && root;

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
