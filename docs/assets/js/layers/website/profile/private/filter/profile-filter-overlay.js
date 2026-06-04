import {
  listProfileChangelogEvents
} from '../../../system/profile/profile-changelog-store.js';
import { getProfileNavigationState } from '../navigation/profile-navigation.js';

/* =============================================================================
   PROFILE FILTER OVERLAY
============================================================================= */

const DEFAULT_VALUE = 'all';

const FILTER_CONTEXTS = Object.freeze({
  feed: {
    title: 'Feed Filters',
    copy: 'Refine the home feed by source, visibility, and order.',
    groups: [
      {
        key: 'source',
        label: 'Source',
        options: [
          { value: 'all', label: 'All' },
          { value: 'following', label: 'Following' },
          { value: 'profiles', label: 'Profiles' }
        ]
      },
      {
        key: 'sort',
        label: 'Sort',
        options: [
          { value: 'ranked', label: 'Ranked' },
          { value: 'latest', label: 'Latest' }
        ]
      }
    ]
  },
  notifications: {
    title: 'Notification Filters',
    copy: 'Refine notification history by read state and priority.',
    groups: [
      {
        key: 'state',
        label: 'State',
        options: [
          { value: 'all', label: 'All' },
          { value: 'unread', label: 'Unread' },
          { value: 'read', label: 'Read' }
        ]
      },
      {
        key: 'priority',
        label: 'Priority',
        options: [
          { value: 'all', label: 'All' },
          { value: 'normal', label: 'Normal' },
          { value: 'low', label: 'Low' }
        ]
      }
    ]
  },
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
          { value: '2026', label: '2026' }
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
    copy: 'Refine private Thought Bank entries by category, year, and order.',
    groups: [
      {
        key: 'audience',
        label: 'Thought Bank',
        options: [
          { value: 'private', label: 'Private Thought Bank' }
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
          { value: '2026', label: '2026' }
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
    copy: 'Refine owned and saved model records by trust, state, scope, expertise, and year.',
    groups: [
      {
        key: 'trust',
        label: 'Trust',
        options: [
          { value: 'all', label: 'Any' },
          { value: 'verified', label: 'Verified' },
          { value: 'not-verified', label: 'Not Verified' }
        ]
      },
      {
        key: 'state',
        label: 'State',
        options: [
          { value: 'all', label: 'Any' },
          { value: 'ready', label: 'Ready' },
          { value: 'training', label: 'Training' }
        ]
      },
      {
        key: 'scope',
        label: 'Scope',
        options: [
          { value: 'all', label: 'Any' },
          { value: 'saved', label: 'Saved' },
          { value: 'hired', label: 'Hired' },
          { value: 'deployed', label: 'Deployed' }
        ]
      },
      {
        key: 'expertise',
        label: 'Expertise',
        options: [
          { value: 'all', label: 'Any' },
          { value: 'personal', label: 'Personal' },
          { value: 'expert', label: 'Expert' }
        ]
      },
      {
        key: 'year',
        label: 'Year',
        options: [
          { value: 'all', label: 'Any' },
          { value: '2026', label: '2026' }
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
          { value: 'general', label: 'General' },
          { value: 'identity', label: 'Identity' },
          { value: 'route', label: 'Route' },
          { value: 'privacy', label: 'Privacy' },
          { value: 'security', label: 'Security' },
          { value: 'verification', label: 'Verification' }
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
  },
  modelChangelog: {
    title: 'Model Changelog',
    copy: 'Review changes recorded for the active model area.',
    groups: [
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
  },
  modelLearn: {
    title: 'Learn',
    copy: 'Review the purpose of the active model area.',
    groups: []
  }
});

const MODEL_LEARN_CONTENT = Object.freeze({
  default: {
    title: 'Model workspace',
    copy: 'This area controls the personal model owned by the profile. It is separate from ICOS machine preferences and interface settings.'
  },
  behavior: {
    title: 'Behavior',
    copy: 'Behavior controls the model’s directness, risk posture, efficiency, and owner-representative style.'
  },
  language: {
    title: 'Language',
    copy: 'Language controls how the model speaks. It does not change the interface language or ICOS assistant preferences.'
  },
  emotion: {
    title: 'Emotion',
    copy: 'Emotion controls tone, empathy, and emotional weighting for the model’s public and staged interactions.'
  },
  response: {
    title: 'Response',
    copy: 'Response controls how the owner model answers different relationship groups. General applies by default; public, friends, followers, mutuals, family, and subscribers can be tuned separately.',
    docsHref: 'https://docs.neuroartan.com/products/model-training/'
  },
  'response:general': {
    title: 'General response',
    copy: 'General response settings apply as the default behavior for every interaction unless a relationship-specific rule overrides them.',
    docsHref: 'https://docs.neuroartan.com/products/model-training/'
  },
  'response:public': {
    title: 'Public response',
    copy: 'Public response settings control how the model answers people with no private relationship to the owner. This layer should keep openness, directness, and humor within public-safe boundaries.',
    docsHref: 'https://docs.neuroartan.com/products/model-training/'
  },
  'response:friends': {
    title: 'Friends response',
    copy: 'Friends response settings tune warmth, detail, and humor for people the owner has accepted into a closer social circle.',
    docsHref: 'https://docs.neuroartan.com/products/model-training/'
  },
  'response:followers': {
    title: 'Followers response',
    copy: 'Followers response settings tune clarity, efficiency, and openness for people who follow the owner without requiring mutual access.',
    docsHref: 'https://docs.neuroartan.com/products/model-training/'
  },
  'response:mutuals': {
    title: 'Mutual response',
    copy: 'Mutual response settings tune trust depth, explanation depth, and directness for accounts where the relationship is reciprocal.',
    docsHref: 'https://docs.neuroartan.com/products/model-training/'
  },
  'response:family': {
    title: 'Family response',
    copy: 'Family response settings tune warmth, privacy guard, and humor for close personal relationships while preserving owner safety and consent boundaries.',
    docsHref: 'https://docs.neuroartan.com/products/model-training/'
  },
  'response:subscribers': {
    title: 'Subscriber response',
    copy: 'Subscriber response settings tune priority, detail, and professional tone for paid or privileged audience contexts.',
    docsHref: 'https://docs.neuroartan.com/products/model-training/'
  },
  memory: {
    title: 'Memory',
    copy: 'Memory controls model retention and continuity depth. It does not expose private source material without owner-approved source and consent states.'
  },
  creativity: {
    title: 'Creativity',
    copy: 'Creativity controls humor, exploration, and expressive tolerance for model responses.'
  },
  reflection: {
    title: 'Reflection',
    copy: 'Reflection controls how often the model reviews behavior and adapts from owner-approved context.'
  },
  consent: {
    title: 'Consent',
    copy: 'Consent controls which owner-approved sources can be used for model context, training, and runtime behavior.'
  },
  sources: {
    title: 'Source',
    copy: 'Source controls the approved material that can become model context, including profile foundation, thoughts, documents, knowledge notes, and governed datasets.'
  },
  voice: {
    title: 'Voice',
    copy: 'Voice controls consent-bound voice training and future owner-representative interaction.'
  },
  protocol: {
    title: 'Protocol',
    copy: 'Protocol defines the training recipe, source selection, execution settings, readiness checks, and governed activation path.'
  },
  directory: {
    title: 'Directory',
    copy: 'Directory shows public model registry projections and discovery filters. Private owner-only model controls stay hidden when the viewer is not authenticated.'
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
    normalizeContext(context) === 'thoughts' && group.key === 'audience'
      ? 'private'
      : group.options[0]?.value || DEFAULT_VALUE
  ]));
}

function normalizeFilters(context, filters = {}) {
  const definition = FILTER_CONTEXTS[normalizeContext(context)];
  const defaults = getDefaultFilters(context);
  const normalizedContext = normalizeContext(context);

  definition.groups.forEach((group) => {
    const value = String(filters?.[group.key] || '').trim();
    const allowed = new Set(group.options.map((option) => option.value));
    defaults[group.key] = normalizedContext === 'thoughts' && group.key === 'audience'
      ? 'private'
      : allowed.has(value) ? value : defaults[group.key];
  });

  if (normalizedContext === 'modelChangelog') {
    defaults.area = String(filters?.area || '').trim() || 'model';
  }

  if (normalizedContext === 'modelLearn') {
    defaults.section = String(filters?.section || '').trim();
    defaults.modelPane = String(filters?.modelPane || '').trim();
    defaults.responseAudience = String(filters?.responseAudience || '').trim();
  }

  return defaults;
}

function resolveModelLearnContent(filters = {}) {
  const navigationState = getProfileNavigationState();
  const pane = String(filters.modelPane || navigationState.modelPane || '').trim();
  const responseAudience = String(filters.responseAudience || '').trim();
  const section = String(filters.section || navigationState.section || '').replace(/^model-/, '').trim();
  if (pane === 'response' && responseAudience) {
    return MODEL_LEARN_CONTENT[`response:${responseAudience}`] || MODEL_LEARN_CONTENT.response;
  }
  return MODEL_LEARN_CONTENT[pane] || MODEL_LEARN_CONTENT[section] || MODEL_LEARN_CONTENT.default;
}

function renderModelLearn(root, filters = {}) {
  if (!(root instanceof HTMLElement)) return;
  const content = resolveModelLearnContent(filters);
  const section = document.createElement('section');
  section.className = 'profile-filter-overlay__learn';

  const title = document.createElement('h3');
  title.className = 'profile-filter-overlay__learn-title';
  title.textContent = content.title;

  const copy = document.createElement('p');
  copy.className = 'profile-filter-overlay__learn-copy';
  copy.textContent = content.copy;

  section.append(title, copy);

  if (content.docsHref) {
    const link = document.createElement('a');
    link.className = 'profile-filter-overlay__learn-link';
    link.href = content.docsHref;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = 'Learn more';
    section.append(link);
  }

  root.append(section);
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
  const reset = root.querySelector('[data-profile-filter-reset]');

  root.dataset.profileFilterContext = normalizedContext;
  if (title instanceof HTMLElement) title.textContent = definition.title;
  if (reset instanceof HTMLElement) reset.hidden = normalizedContext === 'modelLearn';
  if (!(groupsRoot instanceof HTMLElement)) return;

  clearNode(groupsRoot);

  if (normalizedContext === 'modelLearn') {
    renderModelLearn(groupsRoot, state.filters);
    return;
  }

  definition.groups.forEach((group) => {
    const section = document.createElement('section');
    section.className = 'profile-filter-overlay__group';
    section.dataset.profileFilterGroup = group.key;

    const label = document.createElement('p');
    label.className = 'profile-filter-overlay__label';
    label.textContent = group.label;

    const options = document.createElement('div');
    options.className = 'profile-filter-overlay__options';

    if (group.key === 'year') {
      const select = document.createElement('select');
      select.className = 'profile-filter-overlay__select';
      select.dataset.profileFilterOption = group.key;
      select.setAttribute('aria-label', group.label);

      group.options.forEach((option) => {
        const optionElement = document.createElement('option');
        optionElement.value = option.value;
        optionElement.textContent = option.label;
        if (state.filters[group.key] === option.value) {
          optionElement.selected = true;
        }
        select.appendChild(optionElement);
      });

      select.addEventListener('change', () => {
        updateFilter(normalizedContext, group.key, select.value);
      });

      options.appendChild(select);
    } else {
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
    }

    section.appendChild(label);
    section.appendChild(options);
    groupsRoot.appendChild(section);
  });

  if (normalizedContext === 'settingsChangelog' || normalizedContext === 'modelChangelog') {
    const ledger = document.createElement('section');
    ledger.className = 'profile-filter-overlay__ledger';
    ledger.setAttribute('aria-live', 'polite');
    ledger.innerHTML = '<div class="ui-loading-inline"><span class="ui-loading-inline__spinner" aria-hidden="true"></span></div>';
    groupsRoot.appendChild(ledger);
    void renderChangelogLedger(ledger, state.filters);
  }
}

function formatEventDate(value = '') {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(document.documentElement.lang || 'en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(date);
}

function escapeHtml(value = '') {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[char]);
}

async function renderChangelogLedger(root, filters = {}) {
  const events = await listProfileChangelogEvents(filters);
  if (!events.length) {
    root.innerHTML = '<p class="profile-filter-overlay__empty">No changes recorded yet.</p>';
    return;
  }

  root.innerHTML = events.map((event) => `
    <article class="profile-filter-overlay__event">
      <strong>${escapeHtml(event.event_title || 'Change recorded')}</strong>
      <span>${escapeHtml(formatEventDate(event.created_at))}</span>
      ${event.event_detail ? `<p>${escapeHtml(event.event_detail)}</p>` : ''}
    </article>
  `).join('');
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

function openFilterOverlay(context, filters = {}) {
  STORE.context = normalizeContext(context);
  STORE.filters[STORE.context] = normalizeFilters(STORE.context, {
    ...STORE.filters[STORE.context],
    ...filters
  });
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
    openFilterOverlay(detail.context || 'posts', detail.filters || {});
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
