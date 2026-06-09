// Cognitive Map Module
// Provides knowledge graph preview and navigation

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

// Update cognitive map display
function updateCognitiveMapDisplay(root) {
  const config = getHomeConfig();
  
  // Check if module is visible
  if (config && config.visibility && config.visibility['cognitive-map'] === false) {
    root.style.display = 'none';
    return;
  }
  
  root.style.display = '';
  
  // Fetch cognitive map data from backend
  fetchCognitiveMapData().then(data => {
    const value = root.querySelector('[data-home-graph-value]');
    if (value) {
      value.textContent = data.currentView || 'Domains';
    }
  }).catch(err => {
    console.error('Failed to fetch knowledge graph data:', err);
  });
}

// Fetch cognitive map data from backend
async function fetchCognitiveMapData() {
  try {
    const response = await fetch('/assets/data/home/cognitive-map.json');
    if (!response.ok) throw new Error('Failed to fetch cognitive map data');
    const data = await response.json();
    
    return {
      currentView: 'Domains',
      domainCount: data.nodes?.domains?.length || 0,
      themeCount: data.nodes?.themes?.length || 0,
      entityCount: data.nodes?.entities?.length || 0
    };
  } catch (error) {
    console.error('Error fetching cognitive map data:', error);
    return {
      currentView: 'Domains',
      domainCount: 0,
      themeCount: 0,
      entityCount: 0
    };
  }
}

// Listen for home configuration changes
function listenForConfigChanges(root) {
  const controller = new AbortController();
  document.addEventListener('neuroartan:home:visibility:changed', (e) => {
    if (e.detail.moduleId === 'cognitive-map') {
      updateCognitiveMapDisplay(root);
    }
  }, { signal: controller.signal });
  
  document.addEventListener('neuroartan:home:initialized', () => {
    updateCognitiveMapDisplay(root);
  }, { signal: controller.signal });
  return () => controller.abort();
}

// Mount cognitive map module
export function mountHomeCognitiveMap(root) {
  const scope = root?.querySelector?.('[data-home-overview-module="cognitive-map"]')
    || root?.matches?.('[data-home-overview-module="cognitive-map"]') && root;

  if (!(scope instanceof Element)) return;

  const value = scope.querySelector('[data-home-graph-value]');
  const nodes = [...scope.querySelectorAll('[data-home-graph-node]')];

  // Initialize display
  updateCognitiveMapDisplay(scope);
  const cleanupConfigChanges = listenForConfigChanges(scope);

  // Handle node selection
  nodes.forEach((node) => {
    node.addEventListener("click", () => {
      nodes.forEach((item) => item.classList.toggle("is-active", item === node));
      if (value) value.textContent = node.textContent.trim();
    });
  });
  
  // Set up periodic updates
  const updateInterval = setInterval(() => {
    updateCognitiveMapDisplay(scope);
  }, 30000); // Update every 30 seconds
  
  // Return cleanup function
  return () => {
    cleanupConfigChanges?.();
    clearInterval(updateInterval);
  };
}
