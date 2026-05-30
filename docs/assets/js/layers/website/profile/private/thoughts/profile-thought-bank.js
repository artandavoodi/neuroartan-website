/* =============================================================================
   01) MODULE IMPORTS
   02) THOUGHT BANK HELPERS
   03) COMPOSER RENDER
   04) STREAM RENDER
   05) THOUGHT BANK RENDER
   06) EVENT BINDING
   07) THOUGHT BANK INIT
   ============================================================================= */

/* =============================================================================
   01) MODULE IMPORTS
   ============================================================================= */

import {
  getProfileFilterState,
  subscribeProfileFilters
} from '../filter/profile-filter-overlay.js';
import { getProfileThoughtState, subscribeProfileThoughtState, submitProfileThought, updateProfileThoughtComposer } from './profile-thought-store.js';

/* =============================================================================
   02) THOUGHT BANK HELPERS
   ============================================================================= */

function getComposerRoots() {
  return Array.from(document.querySelectorAll('[data-profile-thought-composer]'));
}

function getStreamRoots() {
  return Array.from(document.querySelectorAll('[data-profile-thought-stream]'));
}

function setText(root, selector, value) {
  const node = root.querySelector(selector);
  if (!node) return;
  node.textContent = value;
}

function clearNode(node) {
  while (node.firstChild) {
    node.removeChild(node.firstChild);
  }
}

function setControlDisabled(control, disabled) {
  if (!(control instanceof HTMLElement)) return;

  if (
    control instanceof HTMLButtonElement
    || control instanceof HTMLInputElement
    || control instanceof HTMLSelectElement
    || control instanceof HTMLTextAreaElement
  ) {
    control.disabled = disabled;
  }

  control.setAttribute('aria-disabled', disabled ? 'true' : 'false');
}

function formatCategoryLabel(key, taxonomy) {
  return taxonomy.categories.find((category) => category.key === key)?.label || 'Thought';
}

function formatTimestamp(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Just now';

  try {
    return new Intl.DateTimeFormat(document.documentElement.lang || 'en', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(date);
  } catch (_) {
    return value;
  }
}

function ensureCategoryOptions(select, state) {
  if (!(select instanceof HTMLSelectElement)) return;

  const signature = JSON.stringify(state.taxonomy.categories.map((category) => category.key));
  if (select.dataset.profileThoughtCategorySignature !== signature) {
    clearNode(select);

    state.taxonomy.categories.forEach((category) => {
      const option = document.createElement('option');
      option.value = category.key;
      option.textContent = category.label;
      select.appendChild(option);
    });

    select.dataset.profileThoughtCategorySignature = signature;
  }

  select.value = state.composerCategory;
}

function syncThoughtCategoryLabel(root, state = getProfileThoughtState()) {
  const label = root?.querySelector('[data-profile-thought-category-label]');
  const select = root?.querySelector('[data-profile-thought-category="true"]');
  if (!(label instanceof HTMLElement)) return;

  if (select instanceof HTMLSelectElement) {
    label.textContent = select.selectedOptions?.[0]?.textContent || formatCategoryLabel(state.composerCategory, state.taxonomy);
    return;
  }

  label.textContent = formatCategoryLabel(state.composerCategory, state.taxonomy);
}

function getAudienceMeta() {
  return {
    icon: '/registry/icons/public/assets/core/actions/visibility/private-draft.svg',
    label: 'Private Thought Bank'
  };
}

function setAudienceDropdownOpen(root, open) {
  const dropdown = root?.querySelector('[data-profile-thought-audience-dropdown]');
  const trigger = root?.querySelector('[data-profile-thought-audience-trigger]');
  if (dropdown instanceof HTMLElement) dropdown.hidden = !open;
  if (trigger instanceof HTMLElement) trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
}

function syncThoughtAudienceControl(root, state = getProfileThoughtState()) {
  if (!(root instanceof HTMLElement)) return;

  const audience = 'private';
  const meta = getAudienceMeta();
  const trigger = root.querySelector('[data-profile-thought-audience-trigger]');
  const icon = trigger?.querySelector('.profile-thought-composer__visibility-icon');
  const label = trigger?.querySelector('.profile-thought-composer__visibility-label');
  const input = root.querySelector('[data-profile-thought-audience]');

  if (icon instanceof HTMLImageElement) icon.src = meta.icon;
  if (label instanceof HTMLElement) label.textContent = meta.label;
  if (input instanceof HTMLInputElement) input.value = audience;

  root.querySelectorAll('[data-profile-thought-audience-option]').forEach((option) => {
    const selected = option.getAttribute('data-profile-thought-audience-option') === audience;
    option.setAttribute('aria-selected', selected ? 'true' : 'false');
    option.classList.toggle('profile-thought-composer__visibility-option--active', selected);
  });
}

function createThoughtEntry(entry, taxonomy) {
  const article = document.createElement('article');
  article.className = 'profile-thought-stream__entry';

  const contentWrapper = document.createElement('div');
  contentWrapper.className = 'profile-thought-stream__entry-content-wrapper';

  const meta = document.createElement('div');
  meta.className = 'profile-thought-stream__entry-meta';

  const badge = document.createElement('span');
  badge.className = 'ui-badge ui-badge--outline';
  badge.textContent = formatCategoryLabel(entry.category, taxonomy);

  const time = document.createElement('span');
  time.className = 'profile-thought-stream__entry-time';
  time.textContent = formatTimestamp(entry.createdAt);

  meta.appendChild(badge);
  meta.appendChild(time);

  const body = document.createElement('p');
  body.className = 'profile-thought-stream__entry-body';
  body.textContent = entry.text;

  contentWrapper.appendChild(meta);
  contentWrapper.appendChild(body);

  article.appendChild(contentWrapper);

  return article;
}

function filterThoughtEntries(entries = [], audience = '') {
  const filters = getProfileFilterState('thoughts').filters;
  return entries
    .filter((entry) => {
      if (filters.audience !== 'all' && filters.audience !== audience) return false;
      if (filters.category !== 'all' && entry.category !== filters.category) return false;
      if (filters.year !== 'all') {
        const year = new Date(entry.createdAt).getFullYear();
        if (String(year) !== String(filters.year)) return false;
      }
      return true;
    })
    .slice()
    .sort((left, right) => {
      const direction = filters.sort === 'oldest' ? 1 : -1;
      return String(left.createdAt).localeCompare(String(right.createdAt)) * direction;
    });
}

/* =============================================================================
   03) COMPOSER RENDER
   ============================================================================= */

function renderComposer(state = getProfileThoughtState()) {
  getComposerRoots().forEach((root) => {
    const authenticated = state.runtimeState.viewerState === 'authenticated';
    const publicAudienceSelected = false;
    const textarea = root.querySelector('[data-profile-thought-textarea="true"]');
    const categorySelect = root.querySelector('[data-profile-thought-category="true"]');
    const submitButton = root.querySelector('[data-profile-thought-submit="true"]');

    setText(
      root,
      '[data-profile-thought-bank-copy]',
      !authenticated
        ? 'Authenticate to activate the private Thought Bank tied to your profile.'
        : state.runtimeState.completion.complete
          ? 'Capture private reflections inside your owner-only Thought Bank.'
          : 'Thought capture is available here as a private cognitive substrate while your profile identity matures.'
    );

    setText(
      root,
      '[data-profile-thought-bank-status]',
      !authenticated
        ? 'Thought capture is locked until account access is active.'
        : 'Private Thought Bank capture is active inside your owner environment.'
    );

    const submitStatus = root.querySelector('[data-profile-thought-submit-status]');
    if (submitStatus instanceof HTMLElement) {
      submitStatus.dataset.profileThoughtSubmitStatus = state.submitStatus;
      submitStatus.textContent = state.submitMessage || '';
    }

    syncThoughtAudienceControl(root, state);
    setControlDisabled(root.querySelector('[data-profile-thought-audience-trigger]'), !authenticated);
    root.querySelectorAll('[data-profile-thought-audience-option]').forEach((button) => {
      setControlDisabled(button, !authenticated);
    });

    if (textarea instanceof HTMLTextAreaElement) {
      textarea.value = state.composerText;
      textarea.placeholder = authenticated
        ? 'Write a private reflection, note, or structured thought.'
        : 'Authenticate to activate the private Thought Bank composer.';
      setControlDisabled(textarea, !authenticated);
    }

    ensureCategoryOptions(categorySelect, state);
    syncThoughtCategoryLabel(root, state);
    setControlDisabled(categorySelect, !authenticated);
    setControlDisabled(submitButton, !authenticated);

    setText(
      root,
      '[data-profile-thought-submit-label]',
      'Save to Thought Bank'
    );
  });
}

/* =============================================================================
   04) STREAM RENDER
   ============================================================================= */

function renderLane(root, audience, entries, state) {
  const list = root.querySelector(`[data-profile-thought-stream-list="${audience}"]`);
  const empty = root.querySelector(`[data-profile-thought-stream-empty="${audience}"]`);
  const loading = root.querySelector(`[data-profile-thought-stream-loading="${audience}"]`);
  const filteredEntries = filterThoughtEntries(entries, audience);

  setText(
    root,
    `[data-profile-thought-stream-count="${audience}"]`,
    `${filteredEntries.length} ${filteredEntries.length === 1 ? 'entry' : 'entries'}`
  );

  if (!(list instanceof HTMLElement)) return;
  clearNode(list);
  if (loading instanceof HTMLElement) loading.hidden = !state.loading;
  if (state.loading) {
    if (empty instanceof HTMLElement) empty.hidden = true;
    return;
  }

  if (!filteredEntries.length) {
    if (empty instanceof HTMLElement) {
      empty.hidden = false;
      empty.textContent = 'No private Thought Bank entries have been captured yet.';
    }
    return;
  }

  if (empty instanceof HTMLElement) {
    empty.hidden = true;
  }

  filteredEntries.forEach((entry) => {
    list.appendChild(createThoughtEntry(entry, state.taxonomy));
  });
}

function renderStream(state = getProfileThoughtState()) {
  getStreamRoots().forEach((root) => {
    const list = root.querySelector('[data-profile-thought-stream-list]');
    const empty = root.querySelector('[data-profile-thought-stream-empty]');
    const loading = root.querySelector('[data-profile-thought-stream-loading]');
    if (list instanceof HTMLElement && empty instanceof HTMLElement) {
      clearNode(list);
      if (loading instanceof HTMLElement) loading.hidden = !state.loading;
      if (state.loading) {
        empty.hidden = true;
        return;
      }
      const entries = filterThoughtEntries(state.privateEntries, 'private');
      const count = root.querySelector('[data-profile-thought-stream-count]');
      if (count instanceof HTMLElement) count.textContent = `${entries.length} thought${entries.length === 1 ? '' : 's'}`;
      empty.hidden = entries.length > 0;
      entries.forEach((entry) => {
        list.appendChild(createThoughtEntry(entry, state.taxonomy));
      });
      return;
    }
    renderLane(root, 'private', state.privateEntries, state);
  });
}

/* =============================================================================
   05) THOUGHT BANK RENDER
   ============================================================================= */

function renderThoughtBank(state = getProfileThoughtState()) {
  renderComposer(state);
  renderStream(state);
}

function getThoughtBankRoot() {
  return document.querySelector('[data-profile-thought-bank-panel]');
}

function setThoughtOverlayOpen(open) {
  const root = getThoughtBankRoot();
  const overlay = root?.querySelector('[data-profile-thought-overlay]');
  if (!(overlay instanceof HTMLElement)) return;
  overlay.hidden = !open;
  document.body?.classList.toggle('profile-thought-overlay-open', open);
}

/* =============================================================================
   06) EVENT BINDING
   ============================================================================= */

function bindThoughtComposerEvents() {
  if (document.documentElement.dataset.profileThoughtComposerBound === 'true') return;
  document.documentElement.dataset.profileThoughtComposerBound = 'true';

  document.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const openTrigger = target?.closest('[data-profile-thought-overlay-open]') || null;
    const closeTrigger = event.target instanceof Element
      ? event.target.closest('[data-profile-thought-overlay-close]')
      : null;
    const audienceTrigger = event.target instanceof Element
      ? event.target.closest('[data-profile-thought-audience-trigger]')
      : null;
    const audienceOption = event.target instanceof Element
      ? event.target.closest('[data-profile-thought-audience-option]')
      : null;

    if (openTrigger) {
      event.preventDefault();
      setThoughtOverlayOpen(true);
      document.querySelector('[data-profile-thought-textarea="true"]')?.focus();
      return;
    }

    if (closeTrigger) {
      event.preventDefault();
      setThoughtOverlayOpen(false);
      return;
    }

    const openDropdown = document.querySelector('[data-profile-thought-audience-dropdown]:not([hidden])');
    if (openDropdown instanceof HTMLElement && !audienceTrigger && !audienceOption && !target?.closest('[data-profile-thought-audience-controls]')) {
      const openRoot = openDropdown.closest('[data-profile-thought-composer]');
      setAudienceDropdownOpen(openRoot, false);
    }

    if (audienceTrigger) {
      event.preventDefault();
      const root = audienceTrigger.closest('[data-profile-thought-composer]');
      const dropdown = root?.querySelector('[data-profile-thought-audience-dropdown]');
      setAudienceDropdownOpen(root, !(dropdown instanceof HTMLElement) || dropdown.hidden);
      return;
    }

    if (audienceOption) {
      event.preventDefault();
      const root = audienceOption.closest('[data-profile-thought-composer]');
      updateProfileThoughtComposer({
        composerAudience: 'private',
        resetStatus: true
      });
      setAudienceDropdownOpen(root, false);
    }
  });

  document.addEventListener('input', (event) => {
    const textarea = event.target instanceof HTMLTextAreaElement
      ? event.target.closest('[data-profile-thought-textarea="true"]')
      : null;

    if (!(textarea instanceof HTMLTextAreaElement)) return;

    updateProfileThoughtComposer({
      composerText: textarea.value,
      resetStatus: true
    });
  });

  document.addEventListener('change', (event) => {
    const categorySelect = event.target instanceof HTMLSelectElement
      ? event.target.closest('[data-profile-thought-category="true"]')
      : null;

    if (!(categorySelect instanceof HTMLSelectElement)) return;

    updateProfileThoughtComposer({
      composerCategory: categorySelect.value,
      resetStatus: true
    });

    const root = categorySelect.closest('[data-profile-thought-composer]');
    syncThoughtCategoryLabel(root);
  });

  document.addEventListener('submit', (event) => {
    const form = event.target instanceof HTMLFormElement
      ? event.target.closest('[data-profile-thought-compose-form="true"]')
      : null;

    if (!(form instanceof HTMLFormElement)) return;

    event.preventDefault();
    if (submitProfileThought()) {
      setThoughtOverlayOpen(false);
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    setThoughtOverlayOpen(false);
  });

  document.addEventListener('profile:thought-compose-open-request', () => {
    setThoughtOverlayOpen(true);
    document.querySelector('[data-profile-thought-textarea="true"]')?.focus();
  });
}

/* =============================================================================
   07) THOUGHT BANK INIT
   ============================================================================= */

function initProfileThoughtBank() {
  subscribeProfileThoughtState(renderThoughtBank);
  subscribeProfileFilters((state) => {
    if (state.context !== 'thoughts') return;
    renderStream();
  });
  bindThoughtComposerEvents();

  document.addEventListener('fragment:mounted', (event) => {
    const name = event?.detail?.name;
    if (
      name !== 'profile-private-thought-bank-panel'
      && name !== 'profile-private-thought-composer-panel'
      && name !== 'profile-private-thought-stream-panel'
    ) {
      return;
    }

    renderThoughtBank();
  });

  renderThoughtBank();
}

initProfileThoughtBank();
