/* =============================================================================
   00) FILE INDEX
   01) MODULE IDENTITY
   02) CONSTANTS
   03) FETCH HELPERS
   04) DOM HELPERS
   05) TEMPLATE HELPERS
   06) SHELL RENDERING
   07) MODULE ROUTING
   08) END OF FILE
============================================================================= */

/* =============================================================================
   01) MODULE IDENTITY
============================================================================= */
/* /website/docs/assets/js/layers/website/development-cockpit/development-cockpit-shell.js */

/* =============================================================================
   02) CONSTANTS
============================================================================= */
export const DEVELOPMENT_COCKPIT_DATA_PATHS = Object.freeze({
  providers: '/assets/data/website/development-cockpit/provider-registry.json',
  workflows: '/assets/data/website/development-cockpit/workflow-registry.json',
  promptTemplates: '/assets/data/website/development-cockpit/prompt-template-registry.json',
  scanTemplates: '/assets/data/website/development-cockpit/scan-template-registry.json',
  repositoryScopes: '/assets/data/website/development-cockpit/repository-scope-registry.json',
  modules: '/assets/data/website/development-cockpit/cockpit-module-registry.json',
  developerCapabilities: '/assets/data/website/development-cockpit/developer-mode-capability-registry.json',
  runtimeInterfaces: '/assets/data/website/development-cockpit/developer-runtime-interface-registry.json',
  developerProjects: '/assets/data/website/development-cockpit/developer-project-registry.json',
  agentSessions: '/assets/data/website/development-cockpit/agent-session-registry.json',
  changelogIndex: '/assets/data/website/development-cockpit/changelog-index.json',
  releaseLedger: '/assets/data/website/development-cockpit/release-ledger.json'
});

const SHELL_FRAGMENT_PATH = '/assets/fragments/layers/website/development-cockpit/development-cockpit-shell.html';

/* =============================================================================
   03) FETCH HELPERS
============================================================================= */
export async function fetchCockpitText(path) {
  const response = await fetch(path, { credentials: 'same-origin' });
  if (!response.ok) {
    throw new Error(`COCKPIT_FETCH_FAILED:${path}`);
  }
  return response.text();
}

export async function fetchCockpitJson(path) {
  const response = await fetch(path, { credentials: 'same-origin' });
  if (!response.ok) {
    throw new Error(`COCKPIT_JSON_FETCH_FAILED:${path}`);
  }
  return response.json();
}

async function loadCockpitRegistries() {
  const [
    providers,
    workflows,
    promptTemplates,
    scanTemplates,
    repositoryScopes,
    modules,
    developerCapabilities,
    runtimeInterfaces,
    developerProjects,
    agentSessions,
    changelogIndex,
    releaseLedger
  ] = await Promise.all([
    fetchCockpitJson(DEVELOPMENT_COCKPIT_DATA_PATHS.providers),
    fetchCockpitJson(DEVELOPMENT_COCKPIT_DATA_PATHS.workflows),
    fetchCockpitJson(DEVELOPMENT_COCKPIT_DATA_PATHS.promptTemplates),
    fetchCockpitJson(DEVELOPMENT_COCKPIT_DATA_PATHS.scanTemplates),
    fetchCockpitJson(DEVELOPMENT_COCKPIT_DATA_PATHS.repositoryScopes),
    fetchCockpitJson(DEVELOPMENT_COCKPIT_DATA_PATHS.modules),
    fetchCockpitJson(DEVELOPMENT_COCKPIT_DATA_PATHS.developerCapabilities),
    fetchCockpitJson(DEVELOPMENT_COCKPIT_DATA_PATHS.runtimeInterfaces),
    fetchCockpitJson(DEVELOPMENT_COCKPIT_DATA_PATHS.developerProjects),
    fetchCockpitJson(DEVELOPMENT_COCKPIT_DATA_PATHS.agentSessions),
    fetchCockpitJson(DEVELOPMENT_COCKPIT_DATA_PATHS.changelogIndex),
    fetchCockpitJson(DEVELOPMENT_COCKPIT_DATA_PATHS.releaseLedger)
  ]);

  return {
    providers,
    workflows,
    promptTemplates,
    scanTemplates,
    repositoryScopes,
    modules,
    developerCapabilities,
    runtimeInterfaces,
    developerProjects,
    agentSessions,
    changelogIndex,
    releaseLedger
  };
}

/* =============================================================================
   04) DOM HELPERS
============================================================================= */
export function normalizeCockpitString(value = '') {
  return String(value || '').trim();
}

export function getCockpitModuleRoot(context, id) {
  return context?.root?.querySelector(`[data-cockpit-module="${id}"]`) || null;
}

export function setCockpitText(root, selector, value) {
  const node = root?.querySelector(selector);
  if (!node) return;
  node.textContent = normalizeCockpitString(value);
}

export function writeCockpitOutput(root, selector, value) {
  setCockpitText(root, selector, value);
}

export function fillCockpitSelect(select, entries = [], { valueKey = 'id', labelKey = 'label' } = {}) {
  if (!select) return;
  select.innerHTML = '';
  entries.forEach((entry) => {
    const option = document.createElement('option');
    option.value = normalizeCockpitString(entry?.[valueKey]);
    option.textContent = normalizeCockpitString(entry?.[labelKey] || entry?.[valueKey]);
    select.append(option);
  });
}

export function readCockpitForm(form) {
  const formData = new FormData(form);
  return Object.fromEntries(Array.from(formData.entries()).map(([key, value]) => {
    return [key, normalizeCockpitString(value)];
  }));
}

/* =============================================================================
   05) TEMPLATE HELPERS
============================================================================= */
export function fillCockpitTemplate(template = '', values = {}) {
  return normalizeCockpitString(template).replace(/\{([a-zA-Z0-9_]+)\}/g, (_, key) => {
    return normalizeCockpitString(values[key]);
  });
}

export function findCockpitEntry(entries = [], id = '') {
  const normalizedId = normalizeCockpitString(id);
  return entries.find((entry) => normalizeCockpitString(entry?.id) === normalizedId) || null;
}

/* =============================================================================
   06) SHELL RENDERING
============================================================================= */
function setShellStatus(root, title, copy) {
  setCockpitText(root, '[data-cockpit-status-title]', title);
  setCockpitText(root, '[data-cockpit-status-copy]', copy);
}

function setCockpitActiveNav(root, moduleId) {
  const nav = root.querySelector('[data-cockpit-module-nav]');
  if (!nav) return;

  nav.querySelectorAll('button').forEach((button) => {
    if (button.dataset.cockpitModuleTarget === moduleId) {
      button.setAttribute('aria-current', 'true');
      return;
    }

    button.removeAttribute('aria-current');
  });
}

function scrollCockpitModule(root, moduleId, { updateHash = true } = {}) {
  const target = root.querySelector(`[data-cockpit-module="${moduleId}"]`);
  if (!target) {
    return;
  }

  target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  setCockpitActiveNav(root, moduleId);

  if (updateHash) {
    window.history.replaceState(null, '', `#${moduleId}`);
  }
}

async function renderCockpitModules(root, registries) {
  const grid = root.querySelector('[data-cockpit-module-grid]');
  const nav = root.querySelector('[data-cockpit-module-nav]');
  const modules = Array.isArray(registries.modules?.modules) ? registries.modules.modules : [];

  if (!grid || !nav) return;

  grid.innerHTML = '';
  nav.innerHTML = '';

  for (const module of modules) {
    const html = await fetchCockpitText(module.fragment);
    const template = document.createElement('template');
    template.innerHTML = html.trim();
    const node = template.content.firstElementChild;
    if (node) {
      grid.append(node);
    }

    const navButton = document.createElement('button');
    navButton.type = 'button';
    navButton.dataset.cockpitModuleTarget = module.id;
    navButton.textContent = normalizeCockpitString(module.label || module.id);
    navButton.addEventListener('click', () => {
      scrollCockpitModule(root, module.id);
    });
    nav.append(navButton);
  }
}

/* =============================================================================
   07) MODULE ROUTING
============================================================================= */
function syncCockpitHashRoute(root) {
  const hash = normalizeCockpitString(window.location.hash).replace(/^#/, '');
  if (!hash) {
    return;
  }

  scrollCockpitModule(root, hash, { updateHash: false });
}

export async function initDevelopmentCockpitShell() {
  const mount = document.querySelector('[data-development-cockpit-root]');
  if (!mount || mount.dataset.developmentCockpitMounted === 'true') return null;

  mount.dataset.developmentCockpitMounted = 'true';
  mount.innerHTML = await fetchCockpitText(SHELL_FRAGMENT_PATH);

  const shell = mount.querySelector('[data-development-cockpit-shell]');
  if (!shell) return null;

  setShellStatus(shell, 'Loading registries', 'Reading cockpit data owners.');
  const registries = await loadCockpitRegistries();
  await renderCockpitModules(shell, registries);
  syncCockpitHashRoute(shell);
  setShellStatus(shell, 'Cockpit ready', 'Modules are mounted from fragments and registries.');

  return {
    mount,
    root: shell,
    registries
  };
}

/* =============================================================================
   08) END OF FILE
============================================================================= */
