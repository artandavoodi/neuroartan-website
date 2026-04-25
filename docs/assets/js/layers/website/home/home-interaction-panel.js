/* =========================================================
   00. FILE INDEX
   01. IMPORTS
   02. MODULE STATE
   03. DOM HELPERS
   04. VALUE HELPERS
   05. EVENT HELPERS
   06. COMPOSER RENDERING
   07. MODEL CONTROL
   08. SUBMISSION CONTROL
   09. EVENT BINDING
   10. MODULE BOOT
   ========================================================= */

/* =========================================================
   01. IMPORTS
   ========================================================= */

import {
  getActiveModelState,
  subscribeActiveModelState,
} from '../system/active-model.js';

/* =========================================================
   02. MODULE STATE
   ========================================================= */

const HOME_INTERACTION_PANEL_STATE = {
  isBound: false,
  files: [],
};

/* =========================================================
   03. DOM HELPERS
   ========================================================= */

function getHomeInteractionPanelNodes() {
  return {
    root: document.querySelector('#home-interaction-panel'),
    form: document.querySelector('#home-interaction-panel-form'),
    input: document.querySelector('#home-interaction-panel-input'),
    fileInput: document.querySelector('#home-interaction-panel-file-input'),
    files: document.querySelector('[data-home-interaction-files]'),
    activeModel: document.querySelector('[data-home-interaction-active-model]'),
  };
}

/* =========================================================
   04. VALUE HELPERS
   ========================================================= */

function escapeHomeInteractionHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function normalizeHomeInteractionQuery(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function getHomeInteractionSubmitIntent() {
  const submit = document.querySelector('#home-interaction-panel-submit');

  if (!(submit instanceof HTMLButtonElement)) {
    return 'submit';
  }

  return submit.dataset.homeInteractionSubmitIntent || 'submit';
}

function hasHomeInteractionTypedInput(input) {
  return input instanceof HTMLTextAreaElement && input.value.trim().length > 0;
}

/* =========================================================
   05. EVENT HELPERS
   ========================================================= */

function dispatchHomeInteractionEvent(name, detail = {}) {
  document.dispatchEvent(new CustomEvent(name, { detail }));
}

function resetHomeInteractionPanel() {
  const nodes = getHomeInteractionPanelNodes();

  if (nodes.input instanceof HTMLTextAreaElement) {
    nodes.input.value = '';
    nodes.input.style.height = 'auto';
    nodes.input.dispatchEvent(new Event('input', { bubbles: true }));
    nodes.input.focus();
  }

  if (nodes.fileInput instanceof HTMLInputElement) {
    nodes.fileInput.value = '';
  }

  HOME_INTERACTION_PANEL_STATE.files = [];
  renderHomeInteractionFiles();
  syncHomeInteractionComposerHeight();

  dispatchHomeInteractionEvent('neuroartan:home-stage-reset-requested', {
    source: 'home-interaction-panel-reset',
  });
}

/* =========================================================
   06. COMPOSER RENDERING
   ========================================================= */

function syncHomeInteractionComposerHeight() {
  const { input } = getHomeInteractionPanelNodes();
  if (!(input instanceof HTMLTextAreaElement)) {
    return;
  }

  input.style.height = 'auto';
  input.style.height = `${Math.max(input.scrollHeight, 70)}px`;
}

function renderHomeInteractionFiles() {
  const nodes = getHomeInteractionPanelNodes();
  if (!nodes.files) {
    return;
  }

  nodes.files.innerHTML = HOME_INTERACTION_PANEL_STATE.files.length
    ? HOME_INTERACTION_PANEL_STATE.files
        .map((file) => `<span class="home-interaction-panel__file-chip">${escapeHomeInteractionHtml(file.name)}</span>`)
        .join('')
    : '';
}

function renderHomeInteractionActiveModel() {
  const nodes = getHomeInteractionPanelNodes();
  const activeModelState = getActiveModelState();
  const activeModel = activeModelState.activeModel;
  const modelLabel = activeModel?.display_name || activeModel?.search_title || 'Neuroartan Institution';

  if (nodes.activeModel) {
    nodes.activeModel.textContent = modelLabel;
  }

  if (nodes.input instanceof HTMLTextAreaElement) {
    nodes.input.placeholder = 'Ask anything.';
  }
}

/* =========================================================
   07. MODEL CONTROL
   ========================================================= */

function openHomeInteractionModelSelector() {
  dispatchHomeInteractionEvent('home:platform-shell-close-request', {
    source: 'home-interaction-panel',
  });
  dispatchHomeInteractionEvent('neuroartan:home-search-shell-open-requested', {
    source: 'home-interaction-panel',
    mode: 'models',
    focus: 'models',
  });

  dispatchHomeInteractionEvent('neuroartan:home-model-selector-open-requested', {
    source: 'home-interaction-panel',
  });
}

/* =========================================================
   08. SUBMISSION CONTROL
   ========================================================= */

function submitHomeInteractionQuery() {
  const nodes = getHomeInteractionPanelNodes();
  const query = normalizeHomeInteractionQuery(nodes.input?.value || '');

  if (!query) {
    nodes.input?.focus();
    return;
  }

  dispatchHomeInteractionEvent('neuroartan:home-stage-voice-mode', {
    mode: 'thinking',
  });

  dispatchHomeInteractionEvent('neuroartan:home-stage-voice-query-submitted', {
    query,
    source: 'text',
    mode: 'search_or_knowledge',
    stagedFiles: HOME_INTERACTION_PANEL_STATE.files.map((file) => file.name),
  });

  if (nodes.fileInput instanceof HTMLInputElement) {
    nodes.fileInput.value = '';
  }

  HOME_INTERACTION_PANEL_STATE.files = [];
  renderHomeInteractionFiles();
  if (nodes.input instanceof HTMLTextAreaElement) {
    nodes.input.focus();
  }
  syncHomeInteractionComposerHeight();
}

/* =========================================================
   09. EVENT BINDING
   ========================================================= */

function bindHomeInteractionPanel() {
  subscribeActiveModelState(() => {
    renderHomeInteractionActiveModel();
  });

  document.addEventListener('click', (event) => {
    const root = document.querySelector('#home-interaction-panel');
    if (!root) {
      return;
    }

    const target = event.target.closest('[data-home-interaction-open-search], [data-home-interaction-attach], [data-home-interaction-settings="true"]');
    if (!target || !root.contains(target)) {
      return;
    }

    if (target.matches('[data-home-interaction-open-search]')) {
      event.preventDefault();
      openHomeInteractionModelSelector();
      return;
    }

    if (target.matches('[data-home-interaction-attach]')) {
      event.preventDefault();
      getHomeInteractionPanelNodes().fileInput?.click();
      return;
    }

    if (target.matches('[data-home-interaction-settings="true"]')) {
      event.preventDefault();
      const isExpanded = target.getAttribute('aria-expanded') === 'true';
      target.setAttribute('aria-expanded', isExpanded ? 'false' : 'true');
      dispatchHomeInteractionEvent('neuroartan:home-interaction-settings-toggle-requested', {
        source: 'home-interaction-panel',
        open: !isExpanded,
      });
    }
  });

  document.addEventListener('change', (event) => {
    const fileInput = event.target.closest('#home-interaction-panel-file-input');
    if (!(fileInput instanceof HTMLInputElement)) {
      return;
    }

    HOME_INTERACTION_PANEL_STATE.files = Array.from(fileInput.files || []);
    renderHomeInteractionFiles();
  });

  document.addEventListener('input', (event) => {
    const input = event.target.closest('#home-interaction-panel-input');
    if (!(input instanceof HTMLTextAreaElement)) {
      return;
    }

    syncHomeInteractionComposerHeight();
  });

  document.addEventListener('keydown', (event) => {
    const input = event.target.closest('#home-interaction-panel-input');
    if (!(input instanceof HTMLTextAreaElement)) {
      return;
    }

    if (event.key !== 'Enter' || event.shiftKey) {
      return;
    }

    event.preventDefault();

    const submitIntent = getHomeInteractionSubmitIntent();

    if (submitIntent === 'reset' && !hasHomeInteractionTypedInput(input)) {
      resetHomeInteractionPanel();
      return;
    }

    submitHomeInteractionQuery();
  });

  document.addEventListener('submit', (event) => {
    const form = event.target.closest('#home-interaction-panel-form');
    if (!form) {
      return;
    }

    event.preventDefault();

    const submitIntent = getHomeInteractionSubmitIntent();
    const nodes = getHomeInteractionPanelNodes();

    if (submitIntent === 'reset' && !hasHomeInteractionTypedInput(nodes.input)) {
      resetHomeInteractionPanel();
      return;
    }

    submitHomeInteractionQuery();
  });
}

/* =========================================================
   10. MODULE BOOT
   ========================================================= */

function bootHomeInteractionPanel() {
  const nodes = getHomeInteractionPanelNodes();
  if (!nodes.root) {
    return;
  }

  renderHomeInteractionActiveModel();
  renderHomeInteractionFiles();
  syncHomeInteractionComposerHeight();

  if (HOME_INTERACTION_PANEL_STATE.isBound) {
    return;
  }

  HOME_INTERACTION_PANEL_STATE.isBound = true;
  bindHomeInteractionPanel();
}

document.addEventListener('fragment:mounted', (event) => {
  if (event?.detail?.name !== 'home-interaction-panel') return;
  bootHomeInteractionPanel();
});

document.addEventListener('neuroartan:runtime-ready', () => {
  bootHomeInteractionPanel();
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootHomeInteractionPanel, { once: true });
} else {
  bootHomeInteractionPanel();
}
