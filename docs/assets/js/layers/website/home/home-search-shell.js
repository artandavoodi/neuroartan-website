import { subscribeHomeSurfaceState } from './home-surface-state.js';

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
  root: null,
  snapshot: null,
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

function getLiveSearchShellRoot() {
  return document.querySelector('#home-search-shell');
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

function getHomeSearchRouteLabel(route) {
  switch (String(route || '').toLowerCase()) {
    case 'knowledge':
      return 'Knowledge';
    case 'site-knowledge':
      return 'Website knowledge';
    case 'web':
      return 'Web retrieval';
    case 'platform-search':
      return 'Platform search';
    default:
      return 'Interactive search';
  }
}

function getHomeSearchCta(snapshot) {
  const route = String(snapshot?.voice?.lastRoute || '').toLowerCase();

  switch (route) {
    case 'knowledge':
    case 'site-knowledge':
      return {
        href: '/pages/about/',
        label: 'Open About',
      };
    case 'platform-search':
      return {
        href: '/pages/platform/',
        label: 'Open Platform',
      };
    case 'web':
      return {
        href: '/updates/',
        label: 'Open Updates',
      };
    default:
      return {
        href: '/pages/about/',
        label: 'Explore About',
      };
  }
}

function renderHomeSearchShell(snapshot) {
  HOME_SEARCH_SHELL_STATE.snapshot = snapshot;

  const nodes = getHomeSearchShellNodes();
  if (!nodes.results) {
    return;
  }

  const query = normalizeHomeSearchQuery(snapshot?.voice?.lastQuery || '');
  const response = normalizeHomeSearchQuery(snapshot?.voice?.response || '');
  const routeLabel = getHomeSearchRouteLabel(snapshot?.voice?.lastRoute || '');

  if (!query) {
    nodes.results.innerHTML = `
      <div class="home-search-shell__empty-state" id="home-search-shell-empty-state">
        <p class="home-search-shell__empty-title">Start with a query</p>
        <p class="home-search-shell__empty-text">
          Search public pages, platform knowledge, and future profile routes from one surface.
        </p>
      </div>
    `;
    return;
  }

  const cta = getHomeSearchCta(snapshot);
  const responseMarkup = response
    ? escapeHomeSearchHtml(response)
    : 'The homepage engine is routing this query through the appropriate knowledge surface.';
  const safeQuery = escapeHomeSearchHtml(query);
  const safeRouteLabel = escapeHomeSearchHtml(routeLabel);
  const safeCtaLabel = escapeHomeSearchHtml(cta.label);

  nodes.results.innerHTML = `
    <article class="home-search-shell__result-card">
      <div class="home-search-shell__result-meta">
        <span class="home-search-shell__result-route">${safeRouteLabel}</span>
        <span class="home-search-shell__result-query">${safeQuery}</span>
      </div>
      <p class="home-search-shell__result-body">${responseMarkup}</p>
      <div class="home-search-shell__result-actions">
        <button class="home-search-shell__result-action" data-home-search-result-action="voice" type="button">
          Continue by voice
        </button>
        <a class="home-search-shell__result-link" href="${cta.href}">${safeCtaLabel}</a>
      </div>
    </article>
  `;
}

/* =========================================================
   04. SEARCH HELPERS
   ========================================================= */

function normalizeHomeSearchQuery(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function escapeHomeSearchHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
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
  subscribeHomeSurfaceState(renderHomeSearchShell);

  document.addEventListener('neuroartan:home-search-shell-open-requested', () => {
    openHomeSearchShell();
  });

  document.addEventListener('neuroartan:home-search-shell-close-requested', () => {
    closeHomeSearchShell();
  });

  document.addEventListener('click', (event) => {
    const root = getLiveSearchShellRoot();
    if (!root) return;

    const target = event.target.closest(
      '#home-search-shell-close, ' +
      '#home-search-shell [data-home-search-close="true"], ' +
      '#home-search-shell [data-home-search-chip], ' +
      '#home-search-shell [data-home-search-result-action]'
    );

    if (!target || !root.contains(target)) {
      return;
    }

    if (target.matches('#home-search-shell-close, [data-home-search-close="true"]')) {
      closeHomeSearchShell();
      return;
    }

    if (target.matches('[data-home-search-result-action="voice"]')) {
      closeHomeSearchShell();
      document.querySelector('#stage-microphone-button')?.click();
      return;
    }

    if (target.matches('[data-home-search-chip]')) {
      handleHomeSearchChipSelection(target.getAttribute('data-home-search-chip') || '');
    }
  });

  document.addEventListener('submit', (event) => {
    const root = getLiveSearchShellRoot();
    if (!root) return;

    const form = event.target.closest('#home-search-shell-form');
    if (!form || !root.contains(form)) {
      return;
    }

    event.preventDefault();
    const nodes = getHomeSearchShellNodes();
    submitHomeSearchQuery(nodes.input?.value || '', 'home-search-shell');
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && HOME_SEARCH_SHELL_STATE.isOpen) {
      closeHomeSearchShell();
    }
  });
}

/* =========================================================
   06. MODULE BOOT
   ========================================================= */

function bootHomeSearchShell() {
  const root = getLiveSearchShellRoot();
  if (!root) {
    return;
  }

  HOME_SEARCH_SHELL_STATE.root = root;

  if (HOME_SEARCH_SHELL_STATE.isBound) {
    renderHomeSearchShell(HOME_SEARCH_SHELL_STATE.snapshot || {});
    return;
  }

  HOME_SEARCH_SHELL_STATE.isBound = true;
  bindHomeSearchShell();
}

document.addEventListener('fragment:mounted', (event) => {
  if (event?.detail?.name !== 'home-search-shell') return;
  bootHomeSearchShell();
});

document.addEventListener('neuroartan:runtime-ready', () => {
  bootHomeSearchShell();
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootHomeSearchShell, { once: true });
} else {
  bootHomeSearchShell();
}
