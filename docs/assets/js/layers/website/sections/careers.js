/* =============================================================================
   00) FILE INDEX
   01) MODULE IMPORTS
   02) CONSTANTS
   03) STATE
   04) HELPERS
   05) RENDER HELPERS
   06) INITIALIZATION
   07) END OF FILE
============================================================================= */

/* =============================================================================
   01) MODULE IMPORTS
============================================================================= */
import {
  escapeHtml,
  fetchJson,
  normalizeString
} from './catalog-runtime.js';

/* =============================================================================
   02) CONSTANTS
============================================================================= */
const CAREERS_SECTION_URL = '/assets/data/sections/careers.json';
const CAREERS_DATA_URLS = Object.freeze({
  roles: '/assets/data/careers/roles.json',
  process: '/assets/data/careers/process.json',
  departments: '/assets/data/careers/departments.json',
  culture: '/assets/data/careers/culture.json'
});

/* =============================================================================
   03) STATE
============================================================================= */
const CAREERS_PAGE_STATE = {
  registry: null,
  roles: null,
  process: null,
  departments: null,
  culture: null,
  root: null
};

/* =============================================================================
   04) HELPERS
============================================================================= */
function isCareersPage() {
  return document.body.classList.contains('careers-page');
}

function getCareersRoot() {
  return document.querySelector('[data-careers-page-root]');
}

function getActiveCareersSectionId() {
  const pathname = window.location.pathname || '';

  if (pathname.includes('/pages/careers/roles/')) return 'roles';
  if (pathname.includes('/pages/careers/process/')) return 'process';
  if (pathname.includes('/pages/careers/departments/')) return 'departments';
  if (pathname.includes('/pages/careers/culture/')) return 'culture';
  return 'overview';
}

function getActiveCareersSection() {
  const activeId = getActiveCareersSectionId();
  return CAREERS_PAGE_STATE.registry?.sections?.find((section) => section.id === activeId) || null;
}

function getRequestedRoleId() {
  return normalizeString(new URLSearchParams(window.location.search).get(
    CAREERS_PAGE_STATE.roles?.detail_query_param || 'role'
  ));
}

function getRequestedRole() {
  const requestedRoleId = getRequestedRoleId();
  if (!requestedRoleId) {
    return null;
  }

  return (CAREERS_PAGE_STATE.roles?.openings || []).find((opening) => opening.id === requestedRoleId) || null;
}

function renderCareersNav() {
  const activeId = getActiveCareersSectionId();
  const sections = Array.isArray(CAREERS_PAGE_STATE.registry?.sections)
    ? CAREERS_PAGE_STATE.registry.sections
    : [];

  return `
    <div class="catalog-grid catalog-grid--compact" role="list" aria-label="Careers sections">
      ${sections.map((section) => `
        <article class="catalog-card catalog-card--compact" role="listitem" data-active="${section.id === activeId ? 'true' : 'false'}">
          <a class="catalog-card__link" href="${escapeHtml(section.route)}">
            <div class="catalog-card__body">
              <p class="catalog-card__eyebrow">${escapeHtml(section.label)}</p>
              <h2 class="catalog-card__title">${escapeHtml(section.title)}</h2>
              <p class="catalog-card__summary">${escapeHtml(section.description || '')}</p>
            </div>
          </a>
        </article>
      `).join('')}
    </div>
  `;
}

function renderCareersOverview() {
  return `
    <div class="catalog-detail-grid">
      <article class="catalog-panel catalog-panel--primary">
        <h2 class="catalog-panel__title">Hiring Surface</h2>
        <p class="catalog-panel__copy">${escapeHtml(CAREERS_PAGE_STATE.registry?.description || '')}</p>
        <div class="catalog-list">
          <div class="catalog-list-item">${escapeHtml(CAREERS_PAGE_STATE.roles?.status?.public_openings_state || 'No public openings published')}</div>
          <div class="catalog-list-item">${escapeHtml(CAREERS_PAGE_STATE.roles?.status?.note || '')}</div>
        </div>
      </article>

      <article class="catalog-panel">
        <h2 class="catalog-panel__title">Recruitment Process</h2>
        <div class="catalog-list">
          ${(CAREERS_PAGE_STATE.process?.steps || []).slice(0, 3).map((step) => `
            <div class="catalog-list-item">
              <strong>${escapeHtml(step.title)}</strong><br>
              ${escapeHtml(step.summary)}
            </div>
          `).join('')}
        </div>
      </article>

      <article class="catalog-panel">
        <h2 class="catalog-panel__title">Recruiting Lanes</h2>
        <div class="catalog-list">
          ${(CAREERS_PAGE_STATE.departments?.departments || []).map((department) => `
            <div class="catalog-list-item">
              <strong>${escapeHtml(department.title)}</strong><br>
              ${escapeHtml(department.summary)}
            </div>
          `).join('')}
        </div>
      </article>

      <article class="catalog-panel">
        <h2 class="catalog-panel__title">Operating Culture</h2>
        <div class="catalog-list">
          ${(CAREERS_PAGE_STATE.culture?.principles || []).slice(0, 3).map((principle) => `
            <div class="catalog-list-item">
              <strong>${escapeHtml(principle.title)}</strong><br>
              ${escapeHtml(principle.summary)}
            </div>
          `).join('')}
        </div>
      </article>
    </div>
  `;
}

function renderCareersRoles() {
  const requestedRoleId = getRequestedRoleId();
  const requestedRole = getRequestedRole();
  const openings = Array.isArray(CAREERS_PAGE_STATE.roles?.openings)
    ? CAREERS_PAGE_STATE.roles.openings
    : [];

  if (requestedRoleId && requestedRole) {
    return `
      <div class="catalog-detail-grid">
        <article class="catalog-panel catalog-panel--primary">
          <h2 class="catalog-panel__title">${escapeHtml(requestedRole.title)}</h2>
          <p class="catalog-panel__copy">${escapeHtml(requestedRole.summary || '')}</p>
          <div class="catalog-list">
            <div class="catalog-list-item"><strong>Department</strong><br>${escapeHtml(requestedRole.department || 'Not published')}</div>
            <div class="catalog-list-item"><strong>Location</strong><br>${escapeHtml(requestedRole.location || 'Not published')}</div>
            <div class="catalog-list-item"><strong>Employment Type</strong><br>${escapeHtml(requestedRole.employment_type || 'Not published')}</div>
          </div>
        </article>
      </div>
    `;
  }

  if (requestedRoleId && !requestedRole) {
    return `
      <div class="catalog-empty-state">
        <h2 class="catalog-empty-state__title">This role is not currently published</h2>
        <p class="catalog-empty-state__copy">Return to the roles listing to browse the current public recruitment surface.</p>
      </div>
    `;
  }

  if (!openings.length) {
    return `
      <div class="catalog-empty-state">
        <h2 class="catalog-empty-state__title">${escapeHtml(CAREERS_PAGE_STATE.roles?.status?.public_openings_state || 'No public openings published')}</h2>
        <p class="catalog-empty-state__copy">${escapeHtml(CAREERS_PAGE_STATE.roles?.status?.note || '')}</p>
      </div>
    `;
  }

  return `
    <div class="catalog-grid" role="list" aria-label="Published roles">
      ${openings.map((opening) => `
        <article class="catalog-card" role="listitem">
          <div class="catalog-card__body">
            <p class="catalog-card__eyebrow">${escapeHtml(opening.department || 'Role')}</p>
            <h2 class="catalog-card__title">${escapeHtml(opening.title)}</h2>
            <p class="catalog-card__summary">${escapeHtml(opening.summary || '')}</p>
          </div>
        </article>
      `).join('')}
    </div>
  `;
}

function renderCareersProcess() {
  return `
    <div class="catalog-list catalog-list--timeline">
      ${(CAREERS_PAGE_STATE.process?.steps || []).map((step) => `
        <article class="catalog-timeline-entry">
          <p class="catalog-timeline-entry__eyebrow">${escapeHtml(step.id.replaceAll('-', ' '))}</p>
          <h2 class="catalog-timeline-entry__title">${escapeHtml(step.title)}</h2>
          <p class="catalog-timeline-entry__copy">${escapeHtml(step.summary)}</p>
        </article>
      `).join('')}
    </div>
  `;
}

function renderCareersDepartments() {
  return `
    <div class="catalog-grid" role="list" aria-label="Recruiting lanes">
      ${(CAREERS_PAGE_STATE.departments?.departments || []).map((department) => `
        <article class="catalog-card" role="listitem">
          <div class="catalog-card__body">
            <h2 class="catalog-card__title">${escapeHtml(department.title)}</h2>
            <p class="catalog-card__summary">${escapeHtml(department.summary)}</p>
          </div>
        </article>
      `).join('')}
    </div>
  `;
}

function renderCareersCulture() {
  return `
    <div class="catalog-grid" role="list" aria-label="Operating culture">
      ${(CAREERS_PAGE_STATE.culture?.principles || []).map((principle) => `
        <article class="catalog-card" role="listitem">
          <div class="catalog-card__body">
            <h2 class="catalog-card__title">${escapeHtml(principle.title)}</h2>
            <p class="catalog-card__summary">${escapeHtml(principle.summary)}</p>
          </div>
        </article>
      `).join('')}
    </div>
  `;
}

/* =============================================================================
   05) RENDER HELPERS
============================================================================= */
function renderCareersPage() {
  if (!CAREERS_PAGE_STATE.root || !CAREERS_PAGE_STATE.registry) {
    return;
  }

  const activeSection = getActiveCareersSection();
  let contentMarkup = renderCareersOverview();

  switch (activeSection?.id) {
    case 'roles':
      contentMarkup = renderCareersRoles();
      break;
    case 'process':
      contentMarkup = renderCareersProcess();
      break;
    case 'departments':
      contentMarkup = renderCareersDepartments();
      break;
    case 'culture':
      contentMarkup = renderCareersCulture();
      break;
    default:
      contentMarkup = renderCareersOverview();
      break;
  }

  CAREERS_PAGE_STATE.root.innerHTML = `
    <section class="catalog-page-hero">
      <p class="catalog-page-eyebrow">${escapeHtml(CAREERS_PAGE_STATE.registry.label || 'Careers')}</p>
      <h1 class="catalog-page-title">${escapeHtml(activeSection?.title || CAREERS_PAGE_STATE.registry.title || 'Careers')}</h1>
      <p class="catalog-page-description">${escapeHtml(activeSection?.description || CAREERS_PAGE_STATE.registry.description || '')}</p>
      <div class="catalog-meta">
        <span class="catalog-meta-item">${escapeHtml(CAREERS_PAGE_STATE.roles?.status?.public_openings_state || 'No public openings published')}</span>
        <span class="catalog-meta-item">Governed recruitment architecture</span>
      </div>
    </section>

    <section class="catalog-section">
      ${renderCareersNav()}
    </section>

    <section class="catalog-section">
      ${contentMarkup}
    </section>
  `;
}

/* =============================================================================
   06) INITIALIZATION
============================================================================= */
async function initCareersPage() {
  if (!isCareersPage()) {
    return;
  }

  CAREERS_PAGE_STATE.root = getCareersRoot();
  if (!CAREERS_PAGE_STATE.root) {
    return;
  }

  const [registry, roles, process, departments, culture] = await Promise.all([
    fetchJson(CAREERS_SECTION_URL),
    fetchJson(CAREERS_DATA_URLS.roles),
    fetchJson(CAREERS_DATA_URLS.process),
    fetchJson(CAREERS_DATA_URLS.departments),
    fetchJson(CAREERS_DATA_URLS.culture)
  ]);

  CAREERS_PAGE_STATE.registry = registry;
  CAREERS_PAGE_STATE.roles = roles;
  CAREERS_PAGE_STATE.process = process;
  CAREERS_PAGE_STATE.departments = departments;
  CAREERS_PAGE_STATE.culture = culture;
  renderCareersPage();
}

void initCareersPage();

/* =============================================================================
   07) END OF FILE
============================================================================= */
