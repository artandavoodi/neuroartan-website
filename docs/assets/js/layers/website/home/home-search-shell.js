/* =========================================================
   00. FILE INDEX
   01. MODULE STATE
   02. DOM HELPERS
   03. SHELL STATE HELPERS
   04. SEARCH HELPERS
   05. EVENT BINDING
   06. MODULE BOOT
   ========================================================= */

/* =========================================================
   01. MODULE STATE
   ========================================================= */

const HOME_SEARCH_SHELL_STATE = {
  isBound: false,
  isOpen: false,
};

/* =========================================================
   02. DOM HELPERS
   ========================================================= */

function getHomeSearchShellNodes() {
  return {
    shell: document.querySelector('#home-search-shell'),
    input: document.querySelector('#home-search-shell-input'),
    form: document.querySelector('#home-search-shell-form'),
    close: document.querySelector('#home-search-shell-close'),
    results: document.querySelector('#home-search-shell-results'),
    emptyState: document.querySelector('#home-search-shell-empty-state'),
    chips: Array.from(document.querySelectorAll('[data-home-search-chip]')),
    closeTargets: Array.from(document.querySelectorAll('[data-home-search-close="true"]')),
  };
}

function dispatchHomeSearchEvent(name, detail = {}) {
  document.dispatchEvent(new CustomEvent(name, { detail }));
}

/* =========================================================
   03. SHELL STATE HELPERS
   ========================================================= */

function openHomeSearchShell() {
  const nodes = getHomeSearchShellNodes();

  if (!nodes.shell) {
    return;
  }

  HOME_SEARCH_SHELL_STATE.isOpen = true;
  nodes.shell.hidden = false;
  document.documentElement.classList.add('home-search-shell-open');
  document.body.classList.add('home-search-shell-open');

  window.requestAnimationFrame(() => {
    nodes.input?.focus();
    nodes.input?.select();
  });
}

function closeHomeSearchShell() {
  const nodes = getHomeSearchShellNodes();

  if (!nodes.shell) {
    return;
  }

  HOME_SEARCH_SHELL_STATE.isOpen = false;
  nodes.shell.hidden = true;
  document.documentElement.classList.remove('home-search-shell-open');
  document.body.classList.remove('home-search-shell-open');
  dispatchHomeSearchEvent('neuroartan:home-topbar-reset-triggers');
}

/* =========================================================
   04. SEARCH HELPERS
   ========================================================= */

function normalizeHomeSearchQuery(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function setHomeSearchValue(value) {
  const nodes = getHomeSearchShellNodes();
  if (!nodes.input) return;
  nodes.input.value = value;
}

function submitHomeSearchQuery(query, source = 'home-search-shell') {
  const normalizedQuery = normalizeHomeSearchQuery(query);

  if (!normalizedQuery) {
    return;
  }

  dispatchHomeSearchEvent('neuroartan:home-stage-voice-query-submitted', {
    query: normalizedQuery,
    source,
    mode: 'search_or_knowledge',
  });
}

function handleHomeSearchChipSelection(chipValue) {
  const query = normalizeHomeSearchQuery(chipValue);
  if (!query) return;

  setHomeSearchValue(query);
  submitHomeSearchQuery(query, 'home-search-chip');
}

/* =========================================================
   05. EVENT BINDING
   ========================================================= */

function bindHomeSearchShell() {
  const nodes = getHomeSearchShellNodes();

  if (!nodes.shell || !nodes.form || !nodes.input) {
    return;
  }

  document.addEventListener('neuroartan:home-search-shell-open-requested', () => {
    openHomeSearchShell();
  });

  nodes.form.addEventListener('submit', (event) => {
    event.preventDefault();
    submitHomeSearchQuery(nodes.input.value, 'home-search-shell');
  });

  nodes.close?.addEventListener('click', () => {
    closeHomeSearchShell();
  });

  nodes.closeTargets.forEach((node) => {
    node.addEventListener('click', () => {
      closeHomeSearchShell();
    });
  });

  nodes.chips.forEach((chip) => {
    chip.addEventListener('click', () => {
      handleHomeSearchChipSelection(chip.getAttribute('data-home-search-chip') || '');
    });
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && HOME_SEARCH_SHELL_STATE.isOpen) {
      closeHomeSearchShell();
    }
  });

  document.addEventListener('neuroartan:home-stage-routing-resolved', () => {
    closeHomeSearchShell();
  });
}

/* =========================================================
   06. MODULE BOOT
   ========================================================= */

function bootHomeSearchShell() {
  if (HOME_SEARCH_SHELL_STATE.isBound) {
    return;
  }

  HOME_SEARCH_SHELL_STATE.isBound = true;
  bindHomeSearchShell();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootHomeSearchShell, { once: true });
} else {
  bootHomeSearchShell();
}