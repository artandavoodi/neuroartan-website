/* =============================================================================
   00) FILE INDEX
   01) MODULE IMPORTS
   02) CONSTANTS
   03) STATE
   04) HELPERS
   05) RENDER HELPERS
   06) EVENTS
   07) INITIALIZATION
   08) END OF FILE
============================================================================= */

/* =============================================================================
   01) MODULE IMPORTS
============================================================================= */
import {
  escapeHtml,
  fetchJson,
  renderMetricMarkup
} from './catalog-runtime.js';
import {
  getActiveModelRoutingContext,
  getActiveModelState,
  subscribeActiveModelState
} from '../system/model/active-model.js';
import {
  getPublicModels,
  loadPublicModelRegistry
} from '../system/model/public-model-registry.js';

/* =============================================================================
   02) CONSTANTS
============================================================================= */
const DASHBOARD_SECTION_URL = '/assets/data/sections/dashboard.json';
const DASHBOARD_GROUP_ORDER = ['overview', 'management', 'intelligence', 'governance', 'continuity', 'utility'];
const DASHBOARD_GROUP_LABELS = {
  overview: 'Overview',
  management: 'Management',
  intelligence: 'Intelligence',
  governance: 'Governance',
  continuity: 'Continuity',
  utility: 'Utility',
};

/* =============================================================================
   03) STATE
============================================================================= */
const DASHBOARD_PAGE_STATE = {
  config: null,
  root: null,
  isBound: false
};

/* =============================================================================
   04) HELPERS
============================================================================= */
function isDashboardPage() {
  return document.body.classList.contains('dashboard-page');
}

function getDashboardRoot() {
  return document.querySelector('[data-dashboard-page-root]');
}

function getAccountSummary() {
  const account = window.NEUROARTAN_AUTH_STATE || {};
  const currentUser = account.user || null;

  if (!account.signedIn || !currentUser) {
    return {
      label: 'Guest Access',
      detail: 'Sign in to connect dashboard controls to a private profile and owner-specific runtime.'
    };
  }

  return {
    label: currentUser.displayName || currentUser.email || 'Signed in',
    detail: currentUser.emailVerified ? 'Verified sign-in runtime active.' : 'Signed-in runtime active. Email verification is still pending.'
  };
}

function groupDashboardSections() {
  const sections = Array.isArray(DASHBOARD_PAGE_STATE.config?.sections) ? DASHBOARD_PAGE_STATE.config.sections : [];
  const groups = new Map();

  DASHBOARD_GROUP_ORDER.forEach((group) => {
    groups.set(group, []);
  });

  sections.forEach((section) => {
    const group = DASHBOARD_GROUP_ORDER.includes(section.group) ? section.group : 'utility';
    groups.get(group).push(section);
  });

  return groups;
}

function renderDashboardSectionCard(section = {}) {
  return `
    <article class="catalog-panel dashboard-section-card">
      <h3 class="catalog-panel__title">${escapeHtml(section.title || '')}</h3>
      <p class="catalog-panel__copy">${escapeHtml(section.summary || '')}</p>
      <div class="catalog-list">
        ${(section.items || []).map((item) => `
          <div class="catalog-list-item">${escapeHtml(item)}</div>
        `).join('')}
      </div>
    </article>
  `;
}

/* =============================================================================
   05) RENDER HELPERS
============================================================================= */
function renderDashboardGroups() {
  const groups = groupDashboardSections();

  return DASHBOARD_GROUP_ORDER
    .map((group) => {
      const sections = groups.get(group) || [];
      if (!sections.length) {
        return '';
      }

      return `
        <section class="dashboard-section-group dashboard-section-group--${escapeHtml(group)}">
          <div class="dashboard-section-group__header">
            <p class="dashboard-section-group__eyebrow">${escapeHtml(DASHBOARD_GROUP_LABELS[group] || group)}</p>
            <h2 class="dashboard-section-group__title">${escapeHtml(DASHBOARD_GROUP_LABELS[group] || group)}</h2>
          </div>
          <div class="catalog-detail-grid dashboard-detail-grid">
            ${sections.map((section) => renderDashboardSectionCard(section)).join('')}
          </div>
        </section>
      `;
    })
    .join('');
}

function renderDashboardPage() {
  if (!DASHBOARD_PAGE_STATE.root || !DASHBOARD_PAGE_STATE.config) {
    return;
  }

  const activeModelState = getActiveModelState();
  const routingContext = getActiveModelRoutingContext();
  const accountSummary = getAccountSummary();
  const publicModelCount = getPublicModels().length;

  DASHBOARD_PAGE_STATE.root.innerHTML = `
    <section class="catalog-page-hero">
      <p class="catalog-page-eyebrow">${escapeHtml(DASHBOARD_PAGE_STATE.config.label || 'Dashboard')}</p>
      <h1 class="catalog-page-title">${escapeHtml(DASHBOARD_PAGE_STATE.config.title || 'Dashboard')}</h1>
      <p class="catalog-page-description">${escapeHtml(DASHBOARD_PAGE_STATE.config.description || '')}</p>
      <div class="catalog-meta">
        ${renderMetricMarkup([
          `Active model: ${routingContext.engineLabel || 'Neuroartan'}`,
          `${publicModelCount} public continuity models in registry`,
          accountSummary.label
        ])}
      </div>
    </section>

    <section class="catalog-section">
      <div class="dashboard-summary-grid">
        <article class="catalog-panel dashboard-summary-card">
          <p class="dashboard-summary-card__eyebrow">Dashboard Overview</p>
          <h2 class="catalog-panel__title">${escapeHtml(activeModelState.activeModel?.display_name || activeModelState.activeModel?.search_title || 'No active model')}</h2>
          <p class="catalog-panel__copy">${escapeHtml(routingContext.responsePrelude || 'The active model route will anchor command, reflection, and continuity management here.')}</p>
        </article>

        <article class="catalog-panel dashboard-summary-card">
          <p class="dashboard-summary-card__eyebrow">Account Identity</p>
          <h2 class="catalog-panel__title">${escapeHtml(accountSummary.label)}</h2>
          <p class="catalog-panel__copy">${escapeHtml(accountSummary.detail)}</p>
        </article>

        <article class="catalog-panel dashboard-summary-card">
          <p class="dashboard-summary-card__eyebrow">Training Status</p>
          <h2 class="catalog-panel__title">${escapeHtml(activeModelState.activeModel?.training_state || activeModelState.activeModel?.model_maturity || 'Pending')}</h2>
          <p class="catalog-panel__copy">${escapeHtml(activeModelState.activeModel?.voice_state || 'Voice and response training state will appear here as the owner runtime connects.')}</p>
        </article>

        <article class="catalog-panel dashboard-summary-card">
          <p class="dashboard-summary-card__eyebrow">Runtime Status</p>
          <h2 class="catalog-panel__title">${escapeHtml(routingContext.preferredRoute || 'Platform route')}</h2>
          <p class="catalog-panel__copy">${escapeHtml(activeModelState.activeModel?.availability || 'Interaction runtime posture will appear here as connected services come online.')}</p>
        </article>
      </div>
    </section>

    <section class="catalog-section dashboard-groups">
      ${renderDashboardGroups()}
    </section>
  `;
}

/* =============================================================================
   06) EVENTS
============================================================================= */
function bindDashboardEvents() {
  if (DASHBOARD_PAGE_STATE.isBound) {
    return;
  }

  DASHBOARD_PAGE_STATE.isBound = true;

  subscribeActiveModelState(() => {
    if (DASHBOARD_PAGE_STATE.root) {
      renderDashboardPage();
    }
  });
}

/* =============================================================================
   07) INITIALIZATION
============================================================================= */
async function initDashboardPage() {
  if (!isDashboardPage()) {
    return;
  }

  DASHBOARD_PAGE_STATE.root = getDashboardRoot();
  if (!DASHBOARD_PAGE_STATE.root) {
    return;
  }

  const [config] = await Promise.all([
    fetchJson(DASHBOARD_SECTION_URL),
    loadPublicModelRegistry()
  ]);

  DASHBOARD_PAGE_STATE.config = config;
  bindDashboardEvents();
  renderDashboardPage();
}

void initDashboardPage();

/* =============================================================================
   08) END OF FILE
============================================================================= */
