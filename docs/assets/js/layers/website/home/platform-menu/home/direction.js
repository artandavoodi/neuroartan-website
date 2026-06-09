// Direction Module - Priority Actions
// Provides actionable guidance items and priority actions

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

// Update direction display
function updateDirectionDisplay(root) {
  const config = getHomeConfig();
  
  // Check if module is visible
  if (config && config.visibility && config.visibility['direction'] === false) {
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
    const response = await fetch('/assets/data/home/home-config.json');
    if (!response.ok) throw new Error('Failed to fetch home config');
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

// Listen for home configuration changes
function listenForConfigChanges(root) {
  const controller = new AbortController();
  document.addEventListener('neuroartan:home:visibility:changed', (e) => {
    if (e.detail.moduleId === 'direction') {
      updateDirectionDisplay(root);
    }
  }, { signal: controller.signal });
  
  document.addEventListener('neuroartan:home:initialized', () => {
    updateDirectionDisplay(root);
  }, { signal: controller.signal });
  
  document.addEventListener('neuroartan:home:model:changed', () => {
    updateDirectionDisplay(root);
  }, { signal: controller.signal });
  return () => controller.abort();
}

// Mount direction module
export function mountHomeDirection(root) {
  const scope = root?.querySelector?.('[data-home-overview-module="direction"]')
    || root?.matches?.('[data-home-overview-module="direction"]') && root;

  if (!(scope instanceof Element)) return;

  const value = scope.querySelector('[data-home-guidance-value]');
  const nodes = [...scope.querySelectorAll('[data-home-guidance-action]')];

  // Initialize display
  updateDirectionDisplay(scope);
  const cleanupConfigChanges = listenForConfigChanges(scope);

  // Handle action selection
  nodes.forEach((node) => {
    node.addEventListener("click", () => {
      nodes.forEach((item) => item.classList.toggle("is-active", item === node));
      if (value) value.textContent = node.textContent.trim();
    });
  });
  
  // Set up periodic updates
  const updateInterval = setInterval(() => {
    updateDirectionDisplay(scope);
  }, 30000); // Update every 30 seconds
  
  // Return cleanup function
  return () => {
    cleanupConfigChanges?.();
    clearInterval(updateInterval);
  };
}
