import { mountHomeSystemState } from "./system-state.js";
import { mountHomeModel } from "./model.js";
import { mountHomeContinuity } from "./continuity.js";
import { mountHomeCognitiveMap } from "./cognitive-map.js";
import { mountHomeNow } from "./now.js";
import { mountHomeDirection } from "./direction.js";

import { mountHomeShortcuts } from "./shortcuts.js";

const HOME_OVERVIEW_MODULES = [
  {
    id: "shortcuts",
    fragment: "/assets/fragments/layers/website/home/platform-menu/home/shortcuts.html",
    mount: mountHomeShortcuts,
  },
  {
    id: "now",
    fragment: "/assets/fragments/layers/website/home/platform-menu/home/now.html",
    mount: mountHomeNow,
  },
  {
    id: "system-state",
    fragment: "/assets/fragments/layers/website/home/platform-menu/home/system-state.html",
    mount: mountHomeSystemState,
  },
  {
    id: "model",
    fragment: "/assets/fragments/layers/website/home/platform-menu/home/model.html",
    mount: mountHomeModel,
  },
  {
    id: "continuity",
    fragment: "/assets/fragments/layers/website/home/platform-menu/home/continuity.html",
    mount: mountHomeContinuity,
  },
  {
    id: "cognitive-map",
    fragment: "/assets/fragments/layers/website/home/platform-menu/home/cognitive-map.html",
    mount: mountHomeCognitiveMap,
  },
  {
    id: "direction",
    fragment: "/assets/fragments/layers/website/home/platform-menu/home/direction.html",
    mount: mountHomeDirection,
  },
];

const HOME_OVERVIEW_ROOT_STATE = new WeakMap();

// Get home configuration
function getHomeConfig() {
  const stored = localStorage.getItem('neuroartan-home-config');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      return {
        ...parsed,
        visibility: {
          shortcuts: true,
          'now': true,
          'system-state': true,
          model: true,
          continuity: true,
          'cognitive-map': true,
          direction: true,
          ...(parsed.visibility || {})
        },
        priority: {
          shortcuts: 1,
          'now': 2,
          'system-state': 3,
          model: 4,
          continuity: 5,
          'cognitive-map': 6,
          direction: 7,
          ...(parsed.priority || {})
        },
        display: {
          mode: 'standard',
          emptyStateBehavior: 'guidance',
          sectionChrome: 'guidance',
          ...(parsed.display || {})
        }
      };
    } catch (e) {
      console.error('Failed to parse home config:', e);
    }
  }
  return null;
}

// Get ordered modules based on priority configuration
function getOrderedModules() {
  const config = getHomeConfig();
  if (!config || !config.priority) {
    return HOME_OVERVIEW_MODULES;
  }
  
  // Sort modules by priority
  return [...HOME_OVERVIEW_MODULES].sort((a, b) => {
    const priorityA = Number(config.priority[a.id] || 999);
    const priorityB = Number(config.priority[b.id] || 999);
    return priorityA - priorityB;
  });
}

// Get visible modules based on visibility configuration
function getVisibleModules(modules) {
  const config = getHomeConfig();
  if (!config || !config.visibility) {
    return modules;
  }
  
  return modules.filter(module => config.visibility[module.id] !== false);
}

function applyHomeDisplaySettings(root) {
  const config = getHomeConfig();
  const mode = config?.display?.mode || 'standard';
  const emptyStateBehavior = config?.display?.emptyStateBehavior || 'guidance';
  const sectionChrome = config?.display?.sectionChrome || 'guidance';

  root.dataset.homeDisplayMode = mode;
  root.dataset.homeEmptyStateBehavior = emptyStateBehavior;
  root.dataset.homeSectionChrome = sectionChrome;

  const destination = root.closest('.home-platform-destination--home-overview');
  if (destination instanceof HTMLElement) {
    destination.dataset.homeDisplayMode = mode;
    destination.dataset.homeEmptyStateBehavior = emptyStateBehavior;
    destination.dataset.homeSectionChrome = sectionChrome;
  }
}

async function loadHomeOverviewFragment(fragmentPath) {
  const response = await fetch(fragmentPath, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Home overview fragment failed: ${fragmentPath}`);
  }
  return response.text();
}

async function mountHomeOverviewModule(root, descriptor) {
  const slot = root.querySelector(`[data-home-overview-slot="${descriptor.id}"]`);
  if (!(slot instanceof Element)) return;

  const html = await loadHomeOverviewFragment(descriptor.fragment);
  slot.innerHTML = html;
  slot.dataset.homeOverviewRendered = "true";
  slot.classList.add("home-overview-canvas__slot--rendered");

  const mountedRoot = slot.firstElementChild || slot;
  const cleanup = descriptor.mount?.(mountedRoot);
  return typeof cleanup === 'function' ? cleanup : null;
}

// Reorder modules in the DOM based on priority
function reorderModules(root, orderedModules) {
  const stack = root.querySelector('[data-home-overview-stack]');
  if (!(stack instanceof Element)) return;

  orderedModules.forEach((module) => {
    const slot = root.querySelector(`[data-home-overview-slot="${module.id}"]`);
    if (slot instanceof Element) {
      slot.hidden = false;
      stack.appendChild(slot);
    }
  });

  HOME_OVERVIEW_MODULES.forEach((module) => {
    if (orderedModules.some((visibleModule) => visibleModule.id === module.id)) return;
    const slot = root.querySelector(`[data-home-overview-slot="${module.id}"]`);
    if (slot instanceof Element) {
      slot.hidden = true;
      stack.appendChild(slot);
    }
  });
}

// Listen for priority changes
function listenForPriorityChanges(root, signal) {
  document.addEventListener('neuroartan:home:priority:changed', () => {
    const orderedModules = getOrderedModules();
    const visibleModules = getVisibleModules(orderedModules);
    reorderModules(root, visibleModules);
  }, { signal });
}

// Listen for visibility changes
function listenForVisibilityChanges(root, signal) {
  document.addEventListener('neuroartan:home:visibility:changed', (e) => {
    const orderedModules = getOrderedModules();
    const visibleModules = getVisibleModules(orderedModules);
    
    reorderModules(root, visibleModules);
  }, { signal });
}

function listenForDisplayChanges(root, signal) {
  document.addEventListener('neuroartan:home:display:changed', () => {
    applyHomeDisplaySettings(root);
  }, { signal });

  document.addEventListener('neuroartan:home:empty-state:changed', () => {
    applyHomeDisplaySettings(root);
  }, { signal });
}

export async function mountHomePlatformDestination(root) {
  if (!(root instanceof Element)) return;

  const previousCleanup = HOME_OVERVIEW_ROOT_STATE.get(root);
  if (typeof previousCleanup === 'function') {
    previousCleanup();
  }

  const controller = new AbortController();
  const cleanupTasks = [];

  applyHomeDisplaySettings(root);

  // Get ordered and visible modules
  const orderedModules = getOrderedModules();
  const visibleModules = getVisibleModules(orderedModules);
  
  // Mount all modules
  const moduleCleanups = await Promise.all(
    visibleModules.map((descriptor) => mountHomeOverviewModule(root, descriptor))
  );
  moduleCleanups.forEach((cleanup) => {
    if (typeof cleanup === 'function') {
      cleanupTasks.push(cleanup);
    }
  });
  
  // Reorder modules based on priority
  reorderModules(root, visibleModules);
  
  // Set up listeners for configuration changes
  listenForPriorityChanges(root, controller.signal);
  listenForVisibilityChanges(root, controller.signal);
  listenForDisplayChanges(root, controller.signal);

  const cleanup = () => {
    controller.abort();
    cleanupTasks.splice(0).forEach((task) => task());
    HOME_OVERVIEW_ROOT_STATE.delete(root);
  };

  HOME_OVERVIEW_ROOT_STATE.set(root, cleanup);
  return cleanup;
}
