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

  const shortcutsList = root.querySelector('[data-home-overview-shortcuts-list]');
  const emptyState = root.querySelector('[data-home-overview-shortcuts-empty]');
  
  if (!(shortcutsList instanceof HTMLElement)) return;
  if (!(emptyState instanceof HTMLElement)) return;
  
  // Clear existing shortcuts
  shortcutsList.innerHTML = '';
  
  // Check if model shortcut is enabled
  const modelShortcutEnabled = config?.shortcuts?.model === true;
  
  // Show empty state if model shortcut is not enabled
  if (!modelShortcutEnabled) {
    emptyState.hidden = false;
    return;
  }
  
  emptyState.hidden = true;
  
  // Render Model shortcut as interactive button
  const shortcutRow = document.createElement('div');
  shortcutRow.className = 'home-platform-theme__toggle-row';
  shortcutRow.role = 'listitem';
  shortcutRow.dataset.homeOverviewShortcutRow = 'model';
  
  const shortcutButton = document.createElement('button');
  shortcutButton.className = 'home-platform-theme__shortcut-button';
  shortcutButton.type = 'button';
  shortcutButton.textContent = 'Model';
  shortcutButton.addEventListener('click', () => {
    window.location.href = '/model/#model/foundation/overview';
  });
  
  shortcutRow.appendChild(shortcutButton);
  shortcutsList.appendChild(shortcutRow);
}

function initEmptyStateButtons(root) {
  console.log('initEmptyStateButtons called with root:', root);
  
  const buttonUrls = {
    'dashboard': '/model/#home-platform-workspace-dashboard',
    'profile': '/profile.html#profile',
    'training': '/model/#model/training/protocol',
    'discovery': '/model/#model/discovery/directory',
    'source': '/model/#model/foundation/sources',
    'voice': '/model/#model/foundation/voice',
    'model': '/model/#model/foundation/overview',
    'feed': '/feed/',
    'thoughts': '/profile.html#thoughts'
  };

  // Use event delegation on document for better reliability
  document.addEventListener('click', (e) => {
    const button = e.target.closest('[data-shortcut-button]');
    if (button) {
      const shortcutKey = button.getAttribute('data-shortcut-button');
      console.log('Button clicked via delegation:', shortcutKey);
      if (shortcutKey && buttonUrls[shortcutKey]) {
        e.preventDefault();
        e.stopPropagation();
        console.log('Navigating to:', buttonUrls[shortcutKey]);
        window.location.href = buttonUrls[shortcutKey];
      }
    }
  }, true);
  
  console.log('Event delegation set up for shortcut buttons');
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
  initEmptyStateButtons(scope);
  const cleanupConfigChanges = listenForConfigChanges(scope);

  return () => {
    cleanupConfigChanges();
  };
}
