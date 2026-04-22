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
  normalizeString,
  readQueryParam,
  renderMetricMarkup,
  setQueryParam
} from './catalog-runtime.js';

/* =============================================================================
   02) CONSTANTS
============================================================================= */
const CONTINUITY_HISTORY_URL = '/assets/data/platform/continuity-history.json';

/* =============================================================================
   03) STATE
============================================================================= */
const CONTINUITY_HISTORY_STATE = {
  data: null,
  root: null,
  isBound: false
};

/* =============================================================================
   04) HELPERS
============================================================================= */
function isContinuityHistoryPage() {
  return document.body.classList.contains('continuity-history-page');
}

function getContinuityHistoryRoot() {
  return document.querySelector('[data-continuity-history-page-root]');
}

function getCurrentHistoryQuery() {
  return readQueryParam('q');
}

function getFilteredYears(query) {
  const normalizedQuery = normalizeString(query).toLowerCase();
  const years = Array.isArray(CONTINUITY_HISTORY_STATE.data?.years)
    ? CONTINUITY_HISTORY_STATE.data.years
    : [];

  if (!normalizedQuery) {
    return years;
  }

  return years
    .map((year) => ({
      ...year,
      entries: (Array.isArray(year.entries) ? year.entries : []).filter((entry) => {
        const haystack = [
          entry.date,
          entry.title,
          entry.category,
          entry.summary
        ].join(' ').toLowerCase();

        return haystack.includes(normalizedQuery);
      })
    }))
    .filter((year) => year.entries.length > 0);
}

/* =============================================================================
   05) RENDER HELPERS
============================================================================= */
function renderContinuityHistoryPage() {
  if (!CONTINUITY_HISTORY_STATE.root || !CONTINUITY_HISTORY_STATE.data) {
    return;
  }

  const query = getCurrentHistoryQuery();
  const years = getFilteredYears(query);

  CONTINUITY_HISTORY_STATE.root.innerHTML = `
    <section class="catalog-page-hero">
      <p class="catalog-page-eyebrow">Continuity History</p>
      <h1 class="catalog-page-title">${escapeHtml(CONTINUITY_HISTORY_STATE.data.title || 'Continuity History')}</h1>
      <p class="catalog-page-description">${escapeHtml(CONTINUITY_HISTORY_STATE.data.description || '')}</p>
      <div class="catalog-meta">
        ${renderMetricMarkup([
          `${years.reduce((count, year) => count + year.entries.length, 0)} recorded public milestones`,
          'Year-based continuity archive',
          'Searchable product history'
        ])}
      </div>
    </section>

    <section class="catalog-section">
      <div class="catalog-toolbar">
        <label class="catalog-search" for="continuity-history-search-input">
          <span class="catalog-search__label">Search continuity history</span>
          <span class="catalog-search__input-row">
            <input
              class="catalog-search__input"
              id="continuity-history-search-input"
              type="search"
              name="q"
              placeholder="Search by date, category, or milestone"
              value="${escapeHtml(query)}"
              autocomplete="off">
          </span>
        </label>
      </div>
    </section>

    <section class="catalog-section">
      ${years.length ? years.map((year) => `
        <div class="catalog-timeline-year">
          <div class="catalog-timeline-year__header">
            <p class="catalog-timeline-year__label">${escapeHtml(year.year)}</p>
          </div>
          <div class="catalog-list catalog-list--timeline">
            ${(year.entries || []).map((entry) => `
              <article class="catalog-timeline-entry">
                <p class="catalog-timeline-entry__eyebrow">${escapeHtml(entry.date)} · ${escapeHtml(entry.category)}</p>
                <h2 class="catalog-timeline-entry__title">${escapeHtml(entry.title)}</h2>
                <p class="catalog-timeline-entry__copy">${escapeHtml(entry.summary)}</p>
                ${entry.href ? `<a class="catalog-inline-link" href="${escapeHtml(entry.href)}">Open related surface</a>` : ''}
              </article>
            `).join('')}
          </div>
        </div>
      `).join('') : `
        <div class="catalog-empty-state">
          <h2 class="catalog-empty-state__title">No continuity records matched this search</h2>
          <p class="catalog-empty-state__copy">Adjust the query to search the current continuity archive.</p>
        </div>
      `}
    </section>
  `;
}

/* =============================================================================
   06) EVENTS
============================================================================= */
function bindContinuityHistoryEvents() {
  if (CONTINUITY_HISTORY_STATE.isBound) {
    return;
  }

  CONTINUITY_HISTORY_STATE.isBound = true;

  document.addEventListener('input', (event) => {
    if (!CONTINUITY_HISTORY_STATE.root) return;

    const input = event.target.closest('#continuity-history-search-input');
    if (!(input instanceof HTMLInputElement) || !CONTINUITY_HISTORY_STATE.root.contains(input)) {
      return;
    }

    setQueryParam('q', input.value);
    renderContinuityHistoryPage();
  });

  window.addEventListener('popstate', renderContinuityHistoryPage);
}

/* =============================================================================
   07) INITIALIZATION
============================================================================= */
async function initContinuityHistoryPage() {
  if (!isContinuityHistoryPage()) {
    return;
  }

  CONTINUITY_HISTORY_STATE.root = getContinuityHistoryRoot();
  if (!CONTINUITY_HISTORY_STATE.root) {
    return;
  }

  CONTINUITY_HISTORY_STATE.data = await fetchJson(CONTINUITY_HISTORY_URL);
  bindContinuityHistoryEvents();
  renderContinuityHistoryPage();
}

void initContinuityHistoryPage();

/* =============================================================================
   08) END OF FILE
============================================================================= */
