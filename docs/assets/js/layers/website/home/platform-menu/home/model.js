// Model Module
// Provides model training and deployment readiness information

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

// Update model display
function updateModelDisplay(root) {
  const config = getHomeConfig();
  
  // Check if module is visible
  if (config && config.visibility && config.visibility['model'] === false) {
    root.style.display = 'none';
    return;
  }
  
  root.style.display = '';
  
  // Fetch readiness data from backend
  fetchReadinessData().then(data => {
    const value = root.querySelector('[data-home-readiness-value]');
    if (value) {
      value.textContent = data.currentView || 'Training';
    }
  }).catch(err => {
    console.error('Failed to fetch readiness data:', err);
  });
}

// Fetch readiness data from backend
async function fetchReadinessData() {
  try {
    const response = await fetch('/assets/data/home/readiness-data.json');
    if (!response.ok) throw new Error('Failed to fetch readiness data');
    const data = await response.json();
    
    return {
      currentView: 'Training',
      trainingProgress: data.model?.training?.progress || 0,
      voiceProgress: data.model?.voice?.progress || 0,
      verificationProgress: data.model?.verification?.progress || 0,
      publicationProgress: data.model?.publication?.progress || 0,
      overallProgress: data.overallProgress || 0
    };
  } catch (error) {
    console.error('Error fetching readiness data:', error);
    return {
      currentView: 'Training',
      trainingProgress: 0,
      voiceProgress: 0,
      verificationProgress: 0,
      publicationProgress: 0,
      overallProgress: 0
    };
  }
}

// Listen for home configuration changes
function listenForConfigChanges(root) {
  const controller = new AbortController();
  document.addEventListener('neuroartan:home:visibility:changed', (e) => {
    if (e.detail.moduleId === 'model') {
      updateModelDisplay(root);
    }
  }, { signal: controller.signal });
  
  document.addEventListener('neuroartan:home:initialized', () => {
    updateModelDisplay(root);
  }, { signal: controller.signal });
  return () => controller.abort();
}

// Mount model module
export function mountHomeModel(root) {
  const scope = root?.querySelector?.('[data-home-overview-module="model"]')
    || root?.matches?.('[data-home-overview-module="model"]') && root;

  if (!(scope instanceof Element)) return;

  const value = scope.querySelector('[data-home-readiness-value]');
  const nodes = [...scope.querySelectorAll('[data-readiness-node]')];

  // Initialize display
  updateModelDisplay(scope);
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
    updateModelDisplay(scope);
  }, 30000); // Update every 30 seconds
  
  // Return cleanup function
  return () => {
    cleanupConfigChanges?.();
    clearInterval(updateInterval);
  };
}
