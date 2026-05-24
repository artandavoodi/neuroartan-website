import { mountHomeSystemOverview } from "./system-overview.js";
import { mountHomeModelReadiness } from "./model-readiness.js";
import { mountHomeContinuityMemory } from "./continuity-memory.js";
import { mountHomeKnowledgeGraph } from "./knowledge-graph.js";
import { mountHomeUsageInteraction } from "./usage-interaction.js";
import { mountHomeSystemGuidance } from "./system-guidance.js";

const HOME_OVERVIEW_MODULES = [
  {
    id: "system-overview",
    fragment: "/assets/fragments/layers/website/home/platform-menu/home/system-overview.html",
    mount: mountHomeSystemOverview,
  },
  {
    id: "model-readiness",
    fragment: "/assets/fragments/layers/website/home/platform-menu/home/model-readiness.html",
    mount: mountHomeModelReadiness,
  },
  {
    id: "continuity-memory",
    fragment: "/assets/fragments/layers/website/home/platform-menu/home/continuity-memory.html",
    mount: mountHomeContinuityMemory,
  },
  {
    id: "knowledge-graph",
    fragment: "/assets/fragments/layers/website/home/platform-menu/home/knowledge-graph.html",
    mount: mountHomeKnowledgeGraph,
  },
  {
    id: "usage-interaction",
    fragment: "/assets/fragments/layers/website/home/platform-menu/home/usage-interaction.html",
    mount: mountHomeUsageInteraction,
  },
  {
    id: "system-guidance",
    fragment: "/assets/fragments/layers/website/home/platform-menu/home/system-guidance.html",
    mount: mountHomeSystemGuidance,
  },
];

const HOME_OVERVIEW_ROOT_STATE = new WeakMap();

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

// Get ordered modules based on priority configuration
function getOrderedModules() {
  const config = getDashboardConfig();
  if (!config || !config.priority) {
    return HOME_OVERVIEW_MODULES;
  }
  
  // Sort modules by priority
  return [...HOME_OVERVIEW_MODULES].sort((a, b) => {
    const priorityA = config.priority[a.id] || 999;
    const priorityB = config.priority[b.id] || 999;
    return priorityA - priorityB;
  });
}

// Get visible modules based on visibility configuration
function getVisibleModules(modules) {
  const config = getDashboardConfig();
  if (!config || !config.visibility) {
    return modules;
  }
  
  return modules.filter(module => config.visibility[module.id] !== false);
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

  const mountedRoot = slot.firstElementChild || slot;
  const cleanup = descriptor.mount?.(mountedRoot);
  return typeof cleanup === 'function' ? cleanup : null;
}

// Reorder modules in the DOM based on priority
function reorderModules(root, orderedModules) {
  const stack = root.querySelector('[data-home-overview-stack]');
  if (!(stack instanceof Element)) return;
  
  orderedModules.forEach(module => {
    const slot = root.querySelector(`[data-home-overview-slot="${module.id}"]`);
    if (slot instanceof Element) {
      stack.appendChild(slot);
    }
  });
}

// Listen for priority changes
function listenForPriorityChanges(root, signal) {
  document.addEventListener('neuroartan:dashboard:priority:changed', () => {
    const orderedModules = getOrderedModules();
    const visibleModules = getVisibleModules(orderedModules);
    reorderModules(root, visibleModules);
  }, { signal });
}

// Listen for visibility changes
function listenForVisibilityChanges(root, signal) {
  document.addEventListener('neuroartan:dashboard:visibility:changed', (e) => {
    const orderedModules = getOrderedModules();
    const visibleModules = getVisibleModules(orderedModules);
    
    // Toggle visibility of the specific module
    const slot = root.querySelector(`[data-home-overview-slot="${e.detail.moduleId}"]`);
    if (slot instanceof Element) {
      slot.style.display = e.detail.visible ? '' : 'none';
    }
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

  const cleanup = () => {
    controller.abort();
    cleanupTasks.splice(0).forEach((task) => task());
    HOME_OVERVIEW_ROOT_STATE.delete(root);
  };

  HOME_OVERVIEW_ROOT_STATE.set(root, cleanup);
  return cleanup;
}
