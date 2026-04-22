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
  normalizeString,
  readQueryParam,
  renderChipMarkup
} from './catalog-runtime.js';

/* =============================================================================
   02) CONSTANTS
============================================================================= */
const LEADERSHIP_URL = '/assets/data/company/leadership.json';
const FOUNDER_URL = '/assets/data/company/founder.json';

/* =============================================================================
   03) STATE
============================================================================= */
const LEADERSHIP_PAGE_STATE = {
  leadership: null,
  founder: null,
  root: null
};

/* =============================================================================
   04) HELPERS
============================================================================= */
function isLeadershipPage() {
  return document.body.classList.contains('leadership-page');
}

function getLeadershipRoot() {
  return document.querySelector('[data-leadership-page-root]');
}

function getResolvedMember() {
  const requestedId = readQueryParam('leader') || LEADERSHIP_PAGE_STATE.leadership?.members?.[0]?.id || '';

  if (requestedId === 'founder-artan-davoodi') {
    return {
      id: requestedId,
      title: LEADERSHIP_PAGE_STATE.founder?.title || 'Founder',
      display_name: LEADERSHIP_PAGE_STATE.founder?.public_name || LEADERSHIP_PAGE_STATE.founder?.display_name || 'Artan Davoodi',
      summary: LEADERSHIP_PAGE_STATE.founder?.summary || '',
      biography: Array.isArray(LEADERSHIP_PAGE_STATE.founder?.biography) ? LEADERSHIP_PAGE_STATE.founder.biography : [],
      image: LEADERSHIP_PAGE_STATE.founder?.image || '',
      public_route: '/artan',
      profile_route: '/pages/profiles/index.html?model=artan-davoodi',
      areas: Array.isArray(LEADERSHIP_PAGE_STATE.founder?.areas) ? LEADERSHIP_PAGE_STATE.founder.areas : [],
      public_links: Array.isArray(LEADERSHIP_PAGE_STATE.founder?.public_links) ? LEADERSHIP_PAGE_STATE.founder.public_links : []
    };
  }

  return null;
}

/* =============================================================================
   05) RENDER HELPERS
============================================================================= */
function renderLeadershipPage() {
  if (!LEADERSHIP_PAGE_STATE.root || !LEADERSHIP_PAGE_STATE.leadership || !LEADERSHIP_PAGE_STATE.founder) {
    return;
  }

  const member = getResolvedMember();
  if (!member) {
    return;
  }

  LEADERSHIP_PAGE_STATE.root.innerHTML = `
    <section class="catalog-page-hero">
      <p class="catalog-page-eyebrow">${escapeHtml(LEADERSHIP_PAGE_STATE.leadership.label || 'Leadership')}</p>
      <h1 class="catalog-page-title">${escapeHtml(member.display_name)}</h1>
      <p class="catalog-page-description">${escapeHtml(member.summary)}</p>
      <div class="catalog-meta">
        <span class="catalog-meta-item">${escapeHtml(member.title)}</span>
        <span class="catalog-meta-item">${escapeHtml(LEADERSHIP_PAGE_STATE.leadership.expansion_state || 'founder-first')}</span>
      </div>
    </section>

    <section class="catalog-section">
      <div class="catalog-detail-grid">
        <article class="catalog-panel catalog-panel--primary">
          <div class="catalog-media-card">
            ${member.image ? `
              <div class="catalog-media-card__figure">
                <img src="${escapeHtml(member.image)}" alt="${escapeHtml(member.display_name)}">
              </div>
            ` : ''}
            <div class="catalog-media-card__body">
              <h2 class="catalog-panel__title">${escapeHtml(member.title)}</h2>
              <div class="catalog-list">
                ${member.biography.map((paragraph) => `
                  <div class="catalog-list-item">${escapeHtml(paragraph)}</div>
                `).join('')}
              </div>
            </div>
          </div>
        </article>

        <article class="catalog-panel">
          <h2 class="catalog-panel__title">Leadership Areas</h2>
          <div class="catalog-chip-list">
            ${renderChipMarkup(member.areas)}
          </div>
        </article>

        <article class="catalog-panel">
          <h2 class="catalog-panel__title">Public Surfaces</h2>
          <div class="catalog-action-stack">
            <a class="ui-button ui-button--secondary" href="${escapeHtml(member.profile_route)}">Open continuity model</a>
            <a class="ui-button ui-button--ghost" href="${escapeHtml(member.public_route)}">Open public route</a>
          </div>
        </article>

        <article class="catalog-panel">
          <h2 class="catalog-panel__title">External Links</h2>
          <div class="catalog-action-stack">
            ${member.public_links.map((link) => `
              <a class="ui-button ui-button--ghost" href="${escapeHtml(link.url)}" target="_blank" rel="noreferrer">${escapeHtml(link.label)}</a>
            `).join('')}
          </div>
        </article>
      </div>
    </section>
  `;
}

/* =============================================================================
   06) INITIALIZATION
============================================================================= */
async function initLeadershipPage() {
  if (!isLeadershipPage()) {
    return;
  }

  LEADERSHIP_PAGE_STATE.root = getLeadershipRoot();
  if (!LEADERSHIP_PAGE_STATE.root) {
    return;
  }

  const [leadership, founder] = await Promise.all([
    fetchJson(LEADERSHIP_URL),
    fetchJson(FOUNDER_URL)
  ]);

  LEADERSHIP_PAGE_STATE.leadership = leadership;
  LEADERSHIP_PAGE_STATE.founder = founder;
  renderLeadershipPage();
}

void initLeadershipPage();

/* =============================================================================
   07) END OF FILE
============================================================================= */
