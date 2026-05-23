// Knowledge Graph Module - Cognitive Map
// Provides knowledge graph preview and navigation

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

// Update knowledge graph display
function updateKnowledgeGraphDisplay(root) {
  const config = getDashboardConfig();
  
  // Check if module is visible
  if (config && config.visibility && config.visibility['knowledge-graph'] === false) {
    root.style.display = 'none';
    return;
  }
  
  root.style.display = '';
  
  // Fetch knowledge graph data from backend
  fetchKnowledgeGraphData().then(data => {
    const value = root.querySelector('[data-home-graph-value]');
    if (value) {
      value.textContent = data.currentView || 'Domains';
    }
  }).catch(err => {
    console.error('Failed to fetch knowledge graph data:', err);
  });
}

// Fetch knowledge graph data from backend
async function fetchKnowledgeGraphData() {
  try {
    const response = await fetch('/assets/data/dashboard/knowledge-graph.json');
    if (!response.ok) throw new Error('Failed to fetch knowledge graph data');
    const data = await response.json();
    
    return {
      currentView: 'Domains',
      domainCount: data.nodes?.domains?.length || 0,
      themeCount: data.nodes?.themes?.length || 0,
      entityCount: data.nodes?.entities?.length || 0
    };
  } catch (error) {
    console.error('Error fetching knowledge graph data:', error);
    return {
      currentView: 'Domains',
      domainCount: 0,
      themeCount: 0,
      entityCount: 0
    };
  }
}

// Listen for dashboard configuration changes
function listenForConfigChanges(root) {
  document.addEventListener('neuroartan:dashboard:visibility:changed', (e) => {
    if (e.detail.moduleId === 'knowledge-graph') {
      updateKnowledgeGraphDisplay(root);
    }
  });
  
  document.addEventListener('neuroartan:dashboard:initialized', () => {
    updateKnowledgeGraphDisplay(root);
  });
}

// Mount knowledge graph module
export function mountHomeKnowledgeGraph(root) {
  const scope = root?.querySelector?.('[data-home-overview-module="knowledge-graph"]')
    || root?.matches?.('[data-home-overview-module="knowledge-graph"]') && root;

  if (!(scope instanceof Element)) return;

  const value = scope.querySelector('[data-home-graph-value]');
  const nodes = [...scope.querySelectorAll('[data-home-graph-node]')];

  // Initialize display
  updateKnowledgeGraphDisplay(scope);
  listenForConfigChanges(scope);

  // Handle node selection
  nodes.forEach((node) => {
    node.addEventListener("click", () => {
      nodes.forEach((item) => item.classList.toggle("is-active", item === node));
      if (value) value.textContent = node.textContent.trim();
    });
  });
  
  // Set up periodic updates
  const updateInterval = setInterval(() => {
    updateKnowledgeGraphDisplay(scope);
  }, 30000); // Update every 30 seconds
  
  // Return cleanup function
  return () => {
    clearInterval(updateInterval);
  };
}
