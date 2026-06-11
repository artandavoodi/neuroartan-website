// Shortcuts Module
// Provides quick access to selected destinations and actions

import {
  getOrderedHomeShortcutItems,
  normalizeHomeShortcutState,
} from './shortcut-registry.js';

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

function closeHomePlatformShellForShortcut() {
  document.dispatchEvent(new CustomEvent('home:platform-shell-close-request', {
    detail: {
      clearPersistedState: true,
    },
  }));
}

function navigateHomeShortcut(event, href = '') {
  const destination = String(href || '').trim();
  if (!destination) return;

  event.preventDefault();
  closeHomePlatformShellForShortcut();
  window.requestAnimationFrame(() => {
    window.location.assign(destination);
  });
}

function navigateShortcutSettings(event) {
  event.preventDefault();
  document.dispatchEvent(new CustomEvent('home:platform-shell-open-request', {
    detail: {
      destination: 'settings-home',
      section: 'settings',
    },
  }));
}

function updateShortcutsDisplay(root) {
  const config = getHomeConfig();
  const shortcutState = normalizeHomeShortcutState(config?.shortcuts || {});

  if (config && config.visibility && config.visibility.shortcuts === false) {
    root.style.display = 'none';
    return;
  }

  root.style.display = '';

  const shortcutsList = root.querySelector('[data-home-overview-shortcuts-list]');
  const emptyState = root.querySelector('[data-home-overview-shortcuts-empty]');
  
  if (!(shortcutsList instanceof HTMLElement)) return;
  if (!(emptyState instanceof HTMLElement)) return;
  
  shortcutsList.innerHTML = '';

  const visibleShortcuts = getOrderedHomeShortcutItems(shortcutState, { enabledOnly: true });

  if (!visibleShortcuts.length) {
    emptyState.hidden = false;
    const settingsLink = emptyState.querySelector('[data-home-shortcut-settings-link]');
    if (settingsLink instanceof HTMLAnchorElement && settingsLink.dataset.homeShortcutSettingsBound !== 'true') {
      settingsLink.dataset.homeShortcutSettingsBound = 'true';
      settingsLink.addEventListener('click', navigateShortcutSettings);
    }
    return;
  }
  
  emptyState.hidden = true;

  visibleShortcuts.forEach((shortcut) => {
    const shortcutLink = document.createElement('a');
    shortcutLink.className = 'home-platform-theme__shortcut-link home-dashboard-topbar__action';
    shortcutLink.href = shortcut.href;
    shortcutLink.dataset.homeOverviewShortcut = shortcut.id;
    shortcutLink.setAttribute('aria-label', shortcut.label);
    shortcutLink.innerHTML = `
      <span class="home-platform-theme__shortcut-icon home-dashboard-topbar__icon" aria-hidden="true">
        <img class="ui-icon-theme-aware" src="${shortcut.icon}" alt="" draggable="false">
      </span>
      <span class="home-platform-theme__shortcut-label home-dashboard-topbar__label">${shortcut.label}</span>
    `;
    shortcutLink.addEventListener('click', (event) => {
      navigateHomeShortcut(event, shortcut.href);
    });
    shortcutsList.appendChild(shortcutLink);
  });
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
