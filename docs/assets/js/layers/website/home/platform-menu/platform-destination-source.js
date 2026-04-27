/* =============================================================================
   00) FILE INDEX
   01) CONSTANTS
   02) DOM HELPERS
   03) SANITIZE HELPERS
   04) FALLBACK BUILDERS
   05) MOUNT HELPERS
   06) END OF FILE
============================================================================= */

/* =============================================================================
   01) CONSTANTS
============================================================================= */
const DEFAULT_REMOVALS = [
  '[id]',
  '[data-home-workspace-panel-close]',
  '[data-home-profile-control-panel-close]',
  '[data-home-settings-close]',
  '.home-workspace-panel__section-title',
  '.home-profile-control-panel__section-title',
  '.home-settings-panel__section-title',
];

/* =============================================================================
   02) DOM HELPERS
============================================================================= */
function getDestinationSurface(root) {
  if (!(root instanceof Element)) {
    return null;
  }

  return root.querySelector('[data-home-platform-destination-surface]') || root;
}

function getFirstMatchingNode(selectors = []) {
  for (const selector of selectors) {
    if (typeof selector !== 'string' || !selector.trim()) {
      continue;
    }

    const match = document.querySelector(selector);
    if (match) {
      return match;
    }
  }

  return null;
}

/* =============================================================================
   03) SANITIZE HELPERS
============================================================================= */
function cloneSanitizedNode(node, removeSelectors = DEFAULT_REMOVALS) {
  if (!(node instanceof Element)) {
    return null;
  }

  const clone = node.cloneNode(true);

  removeSelectors.forEach((selector) => {
    if (selector === '[id]') {
      clone.querySelectorAll('[id]').forEach((element) => {
        element.removeAttribute('id');
      });
      return;
    }

    clone.querySelectorAll(selector).forEach((element) => {
      element.remove();
    });
  });

  return clone;
}

/* =============================================================================
   04) FALLBACK BUILDERS
============================================================================= */
function buildFallbackState(title = '', copy = '') {
  const wrapper = document.createElement('div');
  wrapper.className = 'home-platform-shell__content-state';

  if (title) {
    const titleNode = document.createElement('h3');
    titleNode.className = 'home-platform-shell__content-state-title';
    titleNode.textContent = title;
    wrapper.append(titleNode);
  }

  if (copy) {
    const copyNode = document.createElement('p');
    copyNode.className = 'home-platform-shell__content-state-copy';
    copyNode.textContent = copy;
    wrapper.append(copyNode);
  }

  return wrapper;
}

/* =============================================================================
   05) MOUNT HELPERS
============================================================================= */
export function mountClonedDestinationSection(root, {
  selectors = [],
  fallbackTitle = '',
  fallbackCopy = '',
  removeSelectors = DEFAULT_REMOVALS,
} = {}) {
  const surface = getDestinationSurface(root);
  if (!surface) {
    return;
  }

  surface.innerHTML = '';

  const sourceNode = getFirstMatchingNode(selectors);
  const clone = cloneSanitizedNode(sourceNode, removeSelectors);

  if (!clone) {
    surface.append(buildFallbackState(fallbackTitle, fallbackCopy));
    return;
  }

  const stack = document.createElement('div');
  stack.className = 'home-platform-shell__content-stack';
  stack.append(clone);
  surface.append(stack);
}

export function mountFallbackDestination(root, {
  title = '',
  copy = '',
} = {}) {
  const surface = getDestinationSurface(root);
  if (!surface) {
    return;
  }

  surface.innerHTML = '';
  surface.append(buildFallbackState(title, copy));
}

/* =============================================================================
   06) END OF FILE
============================================================================= */
