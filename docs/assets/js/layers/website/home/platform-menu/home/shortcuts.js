// Shortcuts Module
// Provides quick access to selected destinations and actions

function getHomeConfig() {
  const stored = localStorage.getItem('neuroartan-home-config');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (error) {
      console.error('Failed to parse home config:', error);
    }
  }
  return null;
}

function updateShortcutsDisplay(root) {
  const config = getHomeConfig();

  if (config && config.visibility && config.visibility.shortcuts === false) {
    root.style.display = 'none';
    return;
  }

  root.style.display = '';

  const emptyState = root.querySelector('[data-home-shortcuts-empty-state]');
  if (!emptyState) return;

  const shortcuts = config?.shortcuts?.items || [];
  if (!shortcuts.length) {
    emptyState.hidden = false;
    return;
  }

  emptyState.hidden = false;
}

function listenForConfigChanges(root) {
  const controller = new AbortController();

  document.addEventListener('neuroartan:home:visibility:changed', (event) => {
    if (event.detail.moduleId === 'shortcuts') {
      updateShortcutsDisplay(root);
    }
  }, { signal: controller.signal });

  document.addEventListener('neuroartan:home:shortcuts:changed', () => {
    updateShortcutsDisplay(root);
  }, { signal: controller.signal });

  document.addEventListener('neuroartan:home:initialized', () => {
    updateShortcutsDisplay(root);
  }, { signal: controller.signal });

  return () => controller.abort();
}

// Mount shortcuts module
export function mountHomeShortcuts(root) {
  const scope = root?.querySelector?.('[data-home-overview-module="shortcuts"]')
    || root?.matches?.('[data-home-overview-module="shortcuts"]') && root;

  if (!scope) return () => {};

  updateShortcutsDisplay(scope);
  const cleanupConfigChanges = listenForConfigChanges(scope);

  return () => {
    cleanupConfigChanges();
  };
}
