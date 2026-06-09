// Now Module
// Provides usage metrics and interaction data

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

// Update now display
function updateNowDisplay(root) {
  const config = getHomeConfig();
  
  // Check if module is visible
  if (config && config.visibility && config.visibility['now'] === false) {
    root.style.display = 'none';
    return;
  }
  
  root.style.display = '';
  
  // Fetch now data from backend
  fetchNowData().then(data => {
    const value = root.querySelector('[data-home-usage-value]');
    if (value) {
      value.textContent = data.currentView || 'Sessions';
    }
  }).catch(err => {
    console.error('Failed to fetch now data:', err);
  });
}

// Fetch now data from backend
async function fetchNowData() {
  try {
    const response = await fetch('/assets/data/home/now-data.json');
    if (!response.ok) throw new Error('Failed to fetch now data');
    const data = await response.json();
    
    return {
      currentView: 'Sessions',
      sessionCount: data.metadata?.sessionCount || 0,
      conversationCount: data.metadata?.conversationCount || 0,
      reflectionCount: data.metadata?.reflectionCount || 0
    };
  } catch (error) {
    console.error('Error fetching now data:', error);
    return {
      currentView: 'Sessions',
      sessionCount: 0,
      conversationCount: 0,
      reflectionCount: 0
    };
  }
}

// Listen for home configuration changes
function listenForConfigChanges(root) {
  const controller = new AbortController();
  document.addEventListener('neuroartan:home:visibility:changed', (e) => {
    if (e.detail.moduleId === 'now') {
      updateNowDisplay(root);
    }
  }, { signal: controller.signal });
  
  document.addEventListener('neuroartan:home:initialized', () => {
    updateNowDisplay(root);
  }, { signal: controller.signal });
  return () => controller.abort();
}

// Mount now module
export function mountHomeNow(root) {
  const scope = root?.querySelector?.('[data-home-overview-module="now"]')
    || root?.matches?.('[data-home-overview-module="now"]') && root;

  if (!(scope instanceof Element)) return;

  const value = scope.querySelector('[data-home-usage-value]');
  const nodes = [...scope.querySelectorAll('[data-home-usage-view]')];

  // Initialize display
  updateNowDisplay(scope);
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
    updateNowDisplay(scope);
  }, 30000); // Update every 30 seconds
  
  // Return cleanup function
  return () => {
    cleanupConfigChanges?.();
    clearInterval(updateInterval);
  };
}
