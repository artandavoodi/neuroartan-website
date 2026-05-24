/* =============================================================================
   00) FILE INDEX
   01) MODULE IMPORTS
   02) CONSTANTS
   03) STATE
   04) HELPERS
   05) MARKUP HELPERS
   06) RENDER HELPERS
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
  renderChipMarkup
} from './catalog-runtime.js';

/* =============================================================================
   02) CONSTANTS
============================================================================= */
const LEADERSHIP_PUBLIC_LINK_ICON_KEYS = {
  neuroartan: 'neuroartan',
  x: 'x',
  github: 'github'
};
const LEADERSHIP_URL = '/assets/data/company/leadership.json';

/* =============================================================================
   03) STATE
============================================================================= */
const LEADERSHIP_PAGE_STATE = {
  leadership: null,
  members: [],
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

function getLeadershipMemberId() {
  const rootMemberId = normalizeString(document.body.dataset.leadershipMemberId);
  const queryMemberId = normalizeString(readQueryParam('leader'));

  return rootMemberId || queryMemberId;
}

function getLeadershipMember() {
  const requestedId = getLeadershipMemberId();
  const pathname = window.location.pathname || '';

  if (requestedId) {
    return LEADERSHIP_PAGE_STATE.members.find((member) => member.id === requestedId || member.role_id === requestedId) || null;
  }

  return LEADERSHIP_PAGE_STATE.members.find((member) => pathname.includes(`/leadership/${member.role_id}/`)) || null;
}

function isDetailPage() {
  return Boolean(document.querySelector('[data-leadership-profile-root]') || getLeadershipMemberId() || getLeadershipMember());
}

function getExternalLinkAttributes(url) {
  return /^https?:\/\//i.test(url) ? ' target="_blank" rel="noreferrer"' : '';
}

function getLeadershipPublicLinkIconKey(link) {
  const label = normalizeString(link?.label).toLowerCase();
  const url = normalizeString(link?.url).toLowerCase();

  if (label.includes('github') || url.includes('github.com')) {
    return LEADERSHIP_PUBLIC_LINK_ICON_KEYS.github;
  }

  if (label === 'x' || label.includes('twitter') || url.includes('x.com') || url.includes('twitter.com')) {
    return LEADERSHIP_PUBLIC_LINK_ICON_KEYS.x;
  }

  const isCompanyPublicProfile = label.includes('public profile') && (url.startsWith('/') || url.includes('neuroartan.com'));

  if (label.includes('neuroartan') || url.includes('neuroartan.com') || isCompanyPublicProfile) {
    return LEADERSHIP_PUBLIC_LINK_ICON_KEYS.neuroartan;
  }

  return '';
}

function renderLeadershipPublicLink(link) {
  const iconKey = getLeadershipPublicLinkIconKey(link);
  const label = normalizeString(link?.label || 'Public link');
  const url = normalizeString(link?.url);

  if (!url) {
    return '';
  }

  return `
    <a class="institutional-menu-utility-button leadership-public-link" href="${escapeHtml(url)}"${getExternalLinkAttributes(url)} aria-label="${escapeHtml(label)}">
      ${iconKey ? `<span class="leadership-public-link__icon leadership-public-link__icon--${escapeHtml(iconKey)}" aria-hidden="true"></span>` : ''}
      <span class="leadership-public-link__label">${escapeHtml(label)}</span>
    </a>
  `;
}

function getMemberDisplayName(member) {
  return normalizeString(member.display_name || member.public_name || 'Available Position');
}

function getMemberImageMarkup(member, mode = 'card') {
  const displayName = getMemberDisplayName(member);

  if (member.image) {
    return `
      <img class="leadership-avatar__image" src="${escapeHtml(member.image)}" alt="${escapeHtml(displayName)}">
    `;
  }

  return `
    <span class="leadership-avatar__placeholder" aria-hidden="true">${escapeHtml(member.role_acronym || 'NA')}</span>
    ${mode === 'hero' ? '' : '<span class="leadership-avatar__status">Open</span>'}
  `;
}

/* =============================================================================
   05) MARKUP HELPERS
============================================================================= */
function renderLeadershipCard(member) {
  const displayName = getMemberDisplayName(member);
  const isAvailable = member.appointment_status !== 'occupied';

  return `
    <article class="leadership-card" role="listitem" data-leadership-status="${escapeHtml(member.appointment_status || '')}">
      <a class="leadership-card__link" href="${escapeHtml(member.profile_route)}" aria-label="${escapeHtml(displayName)} ${escapeHtml(member.role_title)}">
        <span class="leadership-avatar leadership-avatar--card">
          ${getMemberImageMarkup(member)}
        </span>
        <span class="leadership-card__body">
          <span class="leadership-card__name">${escapeHtml(displayName)}</span>
          <span class="leadership-card__role">${escapeHtml(member.role_title || '')}</span>
          <span class="leadership-card__state">${escapeHtml(isAvailable ? 'Available position' : 'Active founder profile')}</span>
        </span>
      </a>
    </article>
  `;
}

function renderLeadershipActionStack(member) {
  const links = Array.isArray(member.public_links) ? member.public_links : [];
  const hiringRoute = normalizeString(member.hiring_route);

  return `
    <div class="catalog-action-stack">
      ${hiringRoute ? `
        <a class="ui-button ui-button--ghost" href="${escapeHtml(hiringRoute)}">Hiring route</a>
      ` : ''}
      ${links.map(renderLeadershipPublicLink).join('')}
    </div>
  `;
}

function renderLeadershipList(title, items) {
  if (!Array.isArray(items) || !items.length) {
    return '';
  }

  return `
    <article class="catalog-panel">
      <h2 class="catalog-panel__title">${escapeHtml(title)}</h2>
      <div class="catalog-list">
        ${items.map((item) => `<div class="catalog-list-item">${escapeHtml(item)}</div>`).join('')}
      </div>
    </article>
  `;
}

/* =============================================================================
   06) RENDER HELPERS
============================================================================= */
function renderLeadershipOverview() {
  if (!LEADERSHIP_PAGE_STATE.root || !LEADERSHIP_PAGE_STATE.leadership) {
    return;
  }

  LEADERSHIP_PAGE_STATE.root.innerHTML = `
    <section class="catalog-page-hero leadership-overview-hero">
      <p class="catalog-page-eyebrow">${escapeHtml(LEADERSHIP_PAGE_STATE.leadership.label || 'Leadership')}</p>
      <h1 class="catalog-page-title">${escapeHtml(LEADERSHIP_PAGE_STATE.leadership.title || 'Leadership')}</h1>
      <p class="catalog-page-description">${escapeHtml(LEADERSHIP_PAGE_STATE.leadership.description || '')}</p>
      <div class="catalog-meta">
        <span class="catalog-meta-item">${escapeHtml(LEADERSHIP_PAGE_STATE.leadership.expansion_state || 'Founder-led')}</span>
        <span class="catalog-meta-item">${escapeHtml(`${LEADERSHIP_PAGE_STATE.members.length} executive seats`)}</span>
      </div>
    </section>

    <section class="catalog-section leadership-showcase" aria-label="Executive leadership">
      <div class="leadership-grid" role="list">
        ${LEADERSHIP_PAGE_STATE.members.map(renderLeadershipCard).join('')}
      </div>
    </section>
  `;
}

function renderLeadershipDetail(member) {
  if (!LEADERSHIP_PAGE_STATE.root || !member) {
    return;
  }

  const displayName = getMemberDisplayName(member);
  const isAvailable = member.appointment_status !== 'occupied';

  LEADERSHIP_PAGE_STATE.root.innerHTML = `
    <section class="catalog-page-hero leadership-profile-hero">
      <div class="leadership-profile-hero__layout">
        <span class="leadership-avatar leadership-avatar--hero">
          ${getMemberImageMarkup(member, 'hero')}
        </span>
        <div class="leadership-profile-hero__body">
          <h1 class="catalog-page-title">${escapeHtml(displayName)}</h1>
          <p class="leadership-profile-hero__role">${escapeHtml(member.role_title || member.title || '')}</p>
          <div class="catalog-meta">
            <span class="catalog-meta-item">${escapeHtml(member.role_acronym || '')}</span>
            <span class="catalog-meta-item">${escapeHtml(isAvailable ? 'Hiring architecture ready' : `Joined ${member.joined_year || '2026'}`)}</span>
            <span class="catalog-meta-item">${escapeHtml(member.source_posture || '')}</span>
          </div>
        </div>
      </div>
    </section>

    <section class="catalog-section leadership-profile-summary">
      <p class="catalog-page-description">${escapeHtml(member.summary || '')}</p>
    </section>

    <section class="catalog-section">
      <div class="catalog-detail-grid">
        <article class="catalog-panel catalog-panel--primary">
          <p class="catalog-panel__copy">${escapeHtml(member.mandate || '')}</p>
          <div class="catalog-list">
            ${(member.biography || []).map((paragraph) => `<div class="catalog-list-item">${escapeHtml(paragraph)}</div>`).join('')}
          </div>
        </article>



        <article class="catalog-panel">
          ${renderLeadershipActionStack(member)}
        </article>
      </div>
    </section>
  `;
}

function renderLeadershipPage() {
  const member = getLeadershipMember();

  if (isDetailPage() && member) {
    renderLeadershipDetail(member);
    return;
  }

  renderLeadershipOverview();
}

/* =============================================================================
   07) INITIALIZATION
============================================================================= */
async function initLeadershipPage() {
  if (!isLeadershipPage()) {
    return;
  }

  LEADERSHIP_PAGE_STATE.root = getLeadershipRoot();
  if (!LEADERSHIP_PAGE_STATE.root) {
    return;
  }

  const leadership = await fetchJson(LEADERSHIP_URL);
  const members = await Promise.all((leadership.members || []).map((member) => fetchJson(member.data_url)));

  LEADERSHIP_PAGE_STATE.leadership = leadership;
  LEADERSHIP_PAGE_STATE.members = members.sort((a, b) => (a.order || 0) - (b.order || 0));
  renderLeadershipPage();
}

void initLeadershipPage();

/* =============================================================================
   08) END OF FILE
============================================================================= */
