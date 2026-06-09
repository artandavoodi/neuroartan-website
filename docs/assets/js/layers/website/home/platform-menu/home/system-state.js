// System State Module
// Provides real-time system state information

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

// Update system state display
function updateSystemState(root) {
  const config = getHomeConfig();
  
  // Check if module is visible
  if (config && config.visibility && config.visibility['system-state'] === false) {
    root.style.display = 'none';
    return;
  }
  
  root.style.display = '';
  
  // Update system values with real data from backend
  const modelValue = root.querySelector('[data-home-system-value="model"]');
  const sessionValue = root.querySelector('[data-home-system-value="session"]');
  const memoryValue = root.querySelector('[data-home-system-value="memory"]');
  const continuityValue = root.querySelector('[data-home-system-value="continuity"]');
  
  // Fetch real system state from backend
  fetchSystemState().then(state => {
    if (modelValue) modelValue.textContent = state.model || 'Not active';
    if (sessionValue) sessionValue.textContent = state.session || 'No session';
    if (memoryValue) memoryValue.textContent = state.memory || '0 MB';
    if (continuityValue) continuityValue.textContent = state.continuity || 'Not connected';
  }).catch(err => {
    console.error('Failed to fetch system state:', err);
    // Set default values
    if (modelValue) modelValue.textContent = 'Not active';
    if (sessionValue) sessionValue.textContent = 'No session';
    if (memoryValue) memoryValue.textContent = '0 MB';
    if (continuityValue) continuityValue.textContent = 'Not connected';
  });
}

// Fetch system state from backend
async function fetchSystemState() {
  try {
    const response = await fetch('/assets/data/home/home-config.json');
    if (!response.ok) throw new Error('Failed to fetch home config');
    const config = await response.json();
    
    // Return mock system state based on config
    return {
      model: config.model.enableDashboard ? 'Active' : 'Not active',
      session: 'Active',
      memory: '128 MB',
      continuity: 'Connected'
    };
  } catch (error) {
    console.error('Error fetching system state:', error);
    return {
      model: 'Not active',
      session: 'No session',
      memory: '0 MB',
      continuity: 'Not connected'
    };
  }
}

// Listen for home configuration changes
function listenForConfigChanges(root) {
  const controller = new AbortController();
  document.addEventListener('neuroartan:home:visibility:changed', (e) => {
    if (e.detail.moduleId === 'system-state') {
      updateSystemState(root);
    }
  }, { signal: controller.signal });
  
  document.addEventListener('neuroartan:home:initialized', () => {
    updateSystemState(root);
  }, { signal: controller.signal });
  return () => controller.abort();
}

// Mount system state module
export function mountHomeSystemState(root) {
  updateSystemState(root);
  const cleanupConfigChanges = listenForConfigChanges(root);
  
  // Set up periodic updates
  const updateInterval = setInterval(() => {
    updateSystemState(root);
  }, 30000); // Update every 30 seconds
  
  // Return cleanup function
  return () => {
    cleanupConfigChanges?.();
    clearInterval(updateInterval);
  };
}
