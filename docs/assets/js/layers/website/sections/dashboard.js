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
} from '../system/active-model.js';
import {
  getPublicModels,
  loadPublicModelRegistry
} from '../system/public-model-registry.js';

/* =============================================================================
   02) CONSTANTS
============================================================================= */
const DASHBOARD_SECTION_URL = '/assets/data/sections/dashboard.json';

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
  try {
    const currentUser = window.firebase?.auth?.()?.currentUser || null;
    if (!currentUser) {
      return {
        label: 'Guest Access',
        detail: 'Sign in to connect dashboard controls to a private profile and owner-specific runtime.'
      };
    }

    return {
      label: currentUser.displayName || currentUser.email || 'Signed in',
      detail: currentUser.emailVerified ? 'Verified sign-in runtime active.' : 'Signed-in runtime active. Email verification is still pending.'
    };
  } catch (_) {
    return {
      label: 'Guest Access',
      detail: 'Authentication runtime is not currently connected.'
    };
  }
}

function renderDashboardSections() {
  return (DASHBOARD_PAGE_STATE.config?.sections || []).map((section) => `
    <article class="catalog-panel">
      <h2 class="catalog-panel__title">${escapeHtml(section.title)}</h2>
      <p class="catalog-panel__copy">${escapeHtml(section.summary || '')}</p>
      <div class="catalog-list">
        ${(section.items || []).map((item) => `
          <div class="catalog-list-item">${escapeHtml(item)}</div>
        `).join('')}
      </div>
    </article>
  `).join('');
}

/* =============================================================================
   05) RENDER HELPERS
============================================================================= */
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
          <p class="dashboard-summary-card__eyebrow">Runtime Status</p>
          <h2 class="catalog-panel__title">${escapeHtml(routingContext.preferredRoute || 'Platform route')}</h2>
          <p class="catalog-panel__copy">${escapeHtml(activeModelState.activeModel?.training_state || 'Training status will appear here as the owner runtime connects.')}</p>
        </article>
      </div>
    </section>

    <section class="catalog-section">
      <div class="catalog-detail-grid dashboard-detail-grid">
        ${renderDashboardSections()}
      </div>
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
