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

function createThoughtEntry(entry, taxonomy) {
  const article = document.createElement('article');
  article.className = 'profile-thought-stream__entry';

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

  article.appendChild(meta);
  article.appendChild(body);

  return article;
}

/* =============================================================================
   03) COMPOSER RENDER
   ============================================================================= */

function renderComposer(state = getProfileThoughtState()) {
  getComposerRoots().forEach((root) => {
    const authenticated = state.runtimeState.viewerState === 'authenticated';
    const publicAudienceSelected = state.composerAudience === 'public';
    const textarea = root.querySelector('[data-profile-thought-textarea="true"]');
    const categorySelect = root.querySelector('[data-profile-thought-category="true"]');
    const submitButton = root.querySelector('[data-profile-thought-submit="true"]');

    setText(
      root,
      '[data-profile-thought-bank-copy]',
      !authenticated
        ? 'Authenticate to activate the private and public writing lanes tied to your profile.'
        : state.runtimeState.completion.complete
          ? 'Capture private reflections or stage public writing inside the mature private profile surface.'
          : 'Thought capture is already available here, but complete your identity and username state to stabilize the route-facing publishing layer.'
    );

    setText(
      root,
      '[data-profile-thought-bank-status]',
      !authenticated
        ? 'Thought capture is locked until account access is active.'
        : publicAudienceSelected && !state.runtimeState.publicViewAvailable
          ? 'Public writing is currently staged inside your private profile until the public route is ready.'
          : publicAudienceSelected
            ? 'Public writing is active for your route-facing lane.'
            : 'Private thought capture is active inside your owner environment.'
    );

    const submitStatus = root.querySelector('[data-profile-thought-submit-status]');
    if (submitStatus instanceof HTMLElement) {
      submitStatus.dataset.profileThoughtSubmitStatus = state.submitStatus;
      submitStatus.textContent = state.submitMessage || '';
    }

    root.querySelectorAll('[data-profile-thought-audience-toggle]').forEach((button) => {
      const audience = button.getAttribute('data-profile-thought-audience-toggle') || '';
      button.dataset.profileThoughtAudienceActive = audience === state.composerAudience ? 'true' : 'false';
      setControlDisabled(button, !authenticated);
    });

    if (textarea instanceof HTMLTextAreaElement) {
      textarea.value = state.composerText;
      textarea.placeholder = authenticated
        ? publicAudienceSelected
          ? 'Write a public-facing thought for your company-domain route.'
          : 'Write a private reflection, note, or structured thought.'
        : 'Authenticate to activate the thought composer.';
      setControlDisabled(textarea, !authenticated);
    }

    ensureCategoryOptions(categorySelect, state);
    setControlDisabled(categorySelect, !authenticated);
    setControlDisabled(submitButton, !authenticated);

    setText(
      root,
      '[data-profile-thought-submit-label]',
      publicAudienceSelected
        ? (state.runtimeState.publicViewAvailable ? 'Publish Publicly' : 'Stage for Public Route')
        : 'Save Privately'
    );
  });
}

/* =============================================================================
   04) STREAM RENDER
   ============================================================================= */

function renderLane(root, audience, entries, state) {
  const list = root.querySelector(`[data-profile-thought-stream-list="${audience}"]`);
  const empty = root.querySelector(`[data-profile-thought-stream-empty="${audience}"]`);

  setText(
    root,
    `[data-profile-thought-stream-count="${audience}"]`,
    `${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}`
  );

  if (!(list instanceof HTMLElement)) return;
  clearNode(list);

  if (!entries.length) {
    if (empty instanceof HTMLElement) {
      empty.hidden = false;
      empty.textContent = audience === 'public' && !state.runtimeState.publicViewAvailable
        ? 'No public-writing entries are staged yet. Public route readiness is still pending.'
        : audience === 'public'
          ? 'No public-writing entries have been published yet.'
          : 'No private thought entries have been captured yet.';
    }
    return;
  }

  if (empty instanceof HTMLElement) {
    empty.hidden = true;
  }

  entries.forEach((entry) => {
    list.appendChild(createThoughtEntry(entry, state.taxonomy));
  });
}

function renderStream(state = getProfileThoughtState()) {
  getStreamRoots().forEach((root) => {
    renderLane(root, 'private', state.privateEntries, state);
    renderLane(root, 'public', state.publicEntries, state);
  });
}

/* =============================================================================
   05) THOUGHT BANK RENDER
   ============================================================================= */

function renderThoughtBank(state = getProfileThoughtState()) {
  renderComposer(state);
  renderStream(state);
}

/* =============================================================================
   06) EVENT BINDING
   ============================================================================= */

function bindThoughtComposerEvents() {
  if (document.documentElement.dataset.profileThoughtComposerBound === 'true') return;
  document.documentElement.dataset.profileThoughtComposerBound = 'true';

  document.addEventListener('click', (event) => {
    const audienceToggle = event.target instanceof Element
      ? event.target.closest('[data-profile-thought-audience-toggle]')
      : null;

    if (!audienceToggle) return;

    event.preventDefault();
    updateProfileThoughtComposer({
      composerAudience: audienceToggle.getAttribute('data-profile-thought-audience-toggle') || 'private',
      resetStatus: true
    });
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
  });

  document.addEventListener('submit', (event) => {
    const form = event.target instanceof HTMLFormElement
      ? event.target.closest('[data-profile-thought-compose-form="true"]')
      : null;

    if (!(form instanceof HTMLFormElement)) return;

    event.preventDefault();
    submitProfileThought();
  });
}

/* =============================================================================
   07) THOUGHT BANK INIT
   ============================================================================= */

function initProfileThoughtBank() {
  subscribeProfileThoughtState(renderThoughtBank);
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
