// Model Readiness Module - Model Layer
// Provides model training and deployment readiness information

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

// Update model readiness display
function updateModelReadinessDisplay(root) {
  const config = getDashboardConfig();
  
  // Check if module is visible
  if (config && config.visibility && config.visibility['model-readiness'] === false) {
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
    const response = await fetch('/assets/data/dashboard/readiness-data.json');
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

// Listen for dashboard configuration changes
function listenForConfigChanges(root) {
  document.addEventListener('neuroartan:dashboard:visibility:changed', (e) => {
    if (e.detail.moduleId === 'model-readiness') {
      updateModelReadinessDisplay(root);
    }
  });
  
  document.addEventListener('neuroartan:dashboard:initialized', () => {
    updateModelReadinessDisplay(root);
  });
}

// Mount model readiness module
export function mountHomeModelReadiness(root) {
  const scope = root?.querySelector?.('[data-home-overview-module="model-readiness"]')
    || root?.matches?.('[data-home-overview-module="model-readiness"]') && root;

  if (!(scope instanceof Element)) return;

  const value = scope.querySelector('[data-home-readiness-value]');
  const nodes = [...scope.querySelectorAll('[data-readiness-node]')];

  // Initialize display
  updateModelReadinessDisplay(scope);
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
    updateModelReadinessDisplay(scope);
  }, 30000); // Update every 30 seconds
  
  // Return cleanup function
  return () => {
    clearInterval(updateInterval);
  };
}
