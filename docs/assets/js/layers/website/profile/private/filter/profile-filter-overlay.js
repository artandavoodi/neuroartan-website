/* =============================================================================
   PROFILE FILTER OVERLAY
============================================================================= */

const DEFAULT_VALUE = 'all';

const FILTER_CONTEXTS = Object.freeze({
  posts: {
    title: 'Post Filters',
    copy: 'Refine your posts by route state, media, year, and order.',
    groups: [
      {
        key: 'visibility',
        label: 'Visibility',
        options: [
          { value: 'all', label: 'All' },
          { value: 'public', label: 'Public' },
          { value: 'private', label: 'Private' }
        ]
      },
      {
        key: 'media',
        label: 'Media',
        options: [
          { value: 'all', label: 'All' },
          { value: 'text', label: 'Text' },
          { value: 'image', label: 'Image' },
          { value: 'video', label: 'Video' },
          { value: 'audio', label: 'Audio' }
        ]
      },
      {
        key: 'year',
        label: 'Year',
        options: [
          { value: 'all', label: 'Any' },
          { value: '2026', label: '2026' },
          { value: '2025', label: '2025' }
        ]
      },
      {
        key: 'sort',
        label: 'Sort',
        options: [
          { value: 'newest', label: 'Newest' },
          { value: 'oldest', label: 'Oldest' }
        ]
      }
    ]
  },
  thoughts: {
    title: 'Thought Filters',
    copy: 'Refine private and public thoughts by lane, category, year, and order.',
    groups: [
      {
        key: 'audience',
        label: 'Lane',
        options: [
          { value: 'all', label: 'All' },
          { value: 'public', label: 'Public' },
          { value: 'private', label: 'Private' }
        ]
      },
      {
        key: 'category',
        label: 'Category',
        options: [
          { value: 'all', label: 'All' },
          { value: 'identity', label: 'Identity' },
          { value: 'memory', label: 'Memory' },
          { value: 'strategy', label: 'Strategy' },
          { value: 'voice', label: 'Voice' }
        ]
      },
      {
        key: 'year',
        label: 'Year',
        options: [
          { value: 'all', label: 'Any' },
          { value: '2026', label: '2026' },
          { value: '2025', label: '2025' }
        ]
      },
      {
        key: 'sort',
        label: 'Sort',
        options: [
          { value: 'newest', label: 'Newest' },
          { value: 'oldest', label: 'Oldest' }
        ]
      }
    ]
  },
  models: {
    title: 'Model Filters',
    copy: 'Refine owned and saved model records by state, scope, and year.',
    groups: [
      {
        key: 'state',
        label: 'State',
        options: [
          { value: 'all', label: 'All' },
          { value: 'ready', label: 'Ready' },
          { value: 'training', label: 'Training' },
          { value: 'draft', label: 'Draft' }
        ]
      },
      {
        key: 'scope',
        label: 'Scope',
        options: [
          { value: 'all', label: 'All' },
          { value: 'owned', label: 'Owned' },
          { value: 'saved', label: 'Saved' }
        ]
      },
      {
        key: 'year',
        label: 'Year',
        options: [
          { value: 'all', label: 'Any' },
          { value: '2026', label: '2026' },
          { value: '2025', label: '2025' }
        ]
      }
    ]
  },
  dashboard: {
    title: 'Dashboard Filters',
    copy: 'Scope dashboard signals by time range and metric family.',
    groups: [
      {
        key: 'range',
        label: 'Range',
        options: [
          { value: 'all', label: 'All time' },
          { value: '7d', label: '7 days' },
          { value: '30d', label: '30 days' },
          { value: 'year', label: 'This year' }
        ]
      },
      {
        key: 'metric',
        label: 'Metric',
        options: [
          { value: 'all', label: 'All' },
          { value: 'completion', label: 'Completion' },
          { value: 'activity', label: 'Activity' },
          { value: 'route', label: 'Route' }
        ]
      }
    ]
  },
  settingsChangelog: {
    title: 'Settings Changelog',
    copy: 'Review owner-side changes by settings area and time range.',
    groups: [
      {
        key: 'area',
        label: 'Area',
        options: [
          { value: 'all', label: 'All' },
          { value: 'identity', label: 'Identity' },
          { value: 'route', label: 'Route' },
          { value: 'privacy', label: 'Privacy' }
        ]
      },
      {
        key: 'range',
        label: 'Range',
        options: [
          { value: 'all', label: 'All time' },
          { value: 'today', label: 'Today' },
          { value: '7d', label: '7 days' },
          { value: '30d', label: '30 days' }
        ]
      }
    ]
  }
});

const STORE = (window.__NEUROARTAN_PROFILE_FILTERS__ ||= {
  context: 'posts',
  filters: {},
  subscribers: new Set()
});

function normalizeContext(value) {
  const context = String(value || '').trim();
  return FILTER_CONTEXTS[context] ? context : 'posts';
}

function getDefaultFilters(context) {
  const definition = FILTER_CONTEXTS[normalizeContext(context)];
  return Object.fromEntries(definition.groups.map((group) => [
    group.key,
    group.options[0]?.value || DEFAULT_VALUE
  ]));
}

function normalizeFilters(context, filters = {}) {
  const definition = FILTER_CONTEXTS[normalizeContext(context)];
  const defaults = getDefaultFilters(context);

  definition.groups.forEach((group) => {
    const value = String(filters?.[group.key] || '').trim();
    const allowed = new Set(group.options.map((option) => option.value));
    defaults[group.key] = allowed.has(value) ? value : defaults[group.key];
  });

  return defaults;
}

function notifySubscribers(context = STORE.context) {
  const state = getProfileFilterState(context);
  STORE.subscribers.forEach((subscriber) => {
    try {
      subscriber(state);
    } catch (error) {
      console.error('[profile-filter-overlay] Subscriber update failed.', error);
    }
  });

  document.dispatchEvent(new CustomEvent('profile:filter-change', {
    detail: state
  }));
}

export function getProfileFilterState(context = STORE.context) {
  const normalizedContext = normalizeContext(context);
  return {
    context: normalizedContext,
    filters: normalizeFilters(normalizedContext, STORE.filters[normalizedContext])
  };
}

export function subscribeProfileFilters(subscriber) {
  if (typeof subscriber !== 'function') return () => {};
  STORE.subscribers.add(subscriber);
  subscriber(getProfileFilterState());
  return () => {
    STORE.subscribers.delete(subscriber);
  };
}

function getOverlayRoot() {
  return document.querySelector('[data-profile-filter-overlay]');
}

function setOverlayOpen(open) {
  const root = getOverlayRoot();
  if (!(root instanceof HTMLElement)) return;
  root.hidden = !open;
}

function clearNode(node) {
  while (node.firstChild) {
    node.removeChild(node.firstChild);
  }
}

function renderOverlay(context = STORE.context) {
  const root = getOverlayRoot();
  if (!(root instanceof HTMLElement)) return;

  const normalizedContext = normalizeContext(context);
  const definition = FILTER_CONTEXTS[normalizedContext];
  const state = getProfileFilterState(normalizedContext);
  const groupsRoot = root.querySelector('[data-profile-filter-groups]');
  const title = root.querySelector('[data-profile-filter-title]');
  const copy = root.querySelector('[data-profile-filter-copy]');

  root.dataset.profileFilterContext = normalizedContext;
  if (title instanceof HTMLElement) title.textContent = definition.title;
  if (copy instanceof HTMLElement) copy.textContent = definition.copy;
  if (!(groupsRoot instanceof HTMLElement)) return;

  clearNode(groupsRoot);

  definition.groups.forEach((group) => {
    const section = document.createElement('section');
    section.className = 'profile-filter-overlay__group';
    section.dataset.profileFilterGroup = group.key;

    const label = document.createElement('p');
    label.className = 'profile-filter-overlay__label';
    label.textContent = group.label;

    const options = document.createElement('div');
    options.className = 'profile-filter-overlay__options';

    group.options.forEach((option) => {
      const button = document.createElement('button');
      button.className = 'profile-filter-overlay__chip';
      button.type = 'button';
      button.dataset.profileFilterOption = group.key;
      button.dataset.profileFilterValue = option.value;
      button.setAttribute('aria-pressed', state.filters[group.key] === option.value ? 'true' : 'false');
      button.textContent = option.label;
      options.appendChild(button);
    });

    section.appendChild(label);
    section.appendChild(options);
    groupsRoot.appendChild(section);
  });
}

function updateFilter(context, key, value) {
  const normalizedContext = normalizeContext(context);
  const filters = normalizeFilters(normalizedContext, STORE.filters[normalizedContext]);
  filters[key] = value;
  STORE.filters[normalizedContext] = normalizeFilters(normalizedContext, filters);
  renderOverlay(normalizedContext);
  notifySubscribers(normalizedContext);
}

function resetFilters(context) {
  const normalizedContext = normalizeContext(context);
  STORE.filters[normalizedContext] = getDefaultFilters(normalizedContext);
  renderOverlay(normalizedContext);
  notifySubscribers(normalizedContext);
}

function openFilterOverlay(context) {
  STORE.context = normalizeContext(context);
  STORE.filters[STORE.context] = normalizeFilters(STORE.context, STORE.filters[STORE.context]);
  renderOverlay(STORE.context);
  setOverlayOpen(true);
}

function bindFilterOverlay() {
  if (document.documentElement.dataset.profileFilterOverlayBound === 'true') return;
  document.documentElement.dataset.profileFilterOverlayBound = 'true';

  document.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const close = target?.closest('[data-profile-filter-close]');
    const reset = target?.closest('[data-profile-filter-reset]');
    const option = target?.closest('[data-profile-filter-option]');

    if (close) {
      event.preventDefault();
      setOverlayOpen(false);
      return;
    }

    if (reset) {
      event.preventDefault();
      resetFilters(STORE.context);
      return;
    }

    if (option instanceof HTMLButtonElement) {
      event.preventDefault();
      updateFilter(
        STORE.context,
        option.getAttribute('data-profile-filter-option') || '',
        option.getAttribute('data-profile-filter-value') || DEFAULT_VALUE
      );
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    setOverlayOpen(false);
  });

  document.addEventListener('profile:filter-open-request', (event) => {
    const detail = event instanceof CustomEvent ? event.detail || {} : {};
    openFilterOverlay(detail.context || 'posts');
  });
}

function initProfileFilterOverlay() {
  bindFilterOverlay();
  renderOverlay(STORE.context);
}

document.addEventListener('fragment:mounted', (event) => {
  if (event?.detail?.name !== 'profile-private-filter-overlay') return;
  initProfileFilterOverlay();
});

initProfileFilterOverlay();
