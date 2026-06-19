/* =============================================================================
   01) MODULE IMPORTS
   02) DOM HELPERS
   03) STREAM RENDERING
   04) ACTIONS
   05) INITIALIZATION
============================================================================= */

import {
  subscribeProfileThoughtState
} from './profile-thought-store.js';
import {
  getProfileFilterState,
  subscribeProfileFilters
} from '../filter/profile-filter-overlay.js';
import { normalizeString } from '../../../system/account/identity/account-profile-identity.js';

const STORE = {
  moreOverlayThoughtId: '',
  thoughts: []
};

function getRoots() {
  return Array.from(document.querySelectorAll('[data-profile-thought-bank-panel]'));
}

function clearNode(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Just now';

  try {
    return new Intl.DateTimeFormat(document.documentElement.lang || 'en', {
      month: 'short',
      day: 'numeric'
    }).format(date);
  } catch (_) {
    return date.toISOString();
  }
}

function setMoreDropdownOpen(button, open, thoughtId = '') {
  const header = button?.closest('.profile-thought-bank__item-header');
  const dropdown = header?.querySelector('[data-profile-thought-more-dropdown]');
  if (!(dropdown instanceof HTMLElement) || !(button instanceof HTMLElement)) return;
  dropdown.hidden = !open;
  STORE.moreOverlayThoughtId = thoughtId;
  
  if (open) {
    const buttonRect = button.getBoundingClientRect();
    const headerRect = header.getBoundingClientRect();
    dropdown.style.top = `${buttonRect.bottom - headerRect.top}px`;
    dropdown.style.right = '0';
  }
}

function renderEntry(entry) {
  const article = document.createElement('article');
  article.className = 'profile-thought-bank__item';
  article.innerHTML = `
    <div class="profile-thought-bank__item-content-wrapper">
      <div class="profile-thought-bank__item-header">
        <span class="profile-thought-bank__item-meta-group">
          <span class="ui-badge ui-badge--outline"></span>
          <span class="profile-thought-bank__item-meta"></span>
        </span>
        <button class="profile-thought-bank__item-more" type="button" data-profile-thought-more="${entry.id}" aria-label="More options">
          <img class="ui-icon-theme-aware" src="/registry/icons/public/assets/core/actions/more/more.svg" alt="" aria-hidden="true">
        </button>
        <div class="profile-thought-bank__more-dropdown ui-card ui-surface--glass" data-profile-thought-more-dropdown hidden aria-label="Thought options">
          <button class="profile-thought-bank__more-dropdown-item" type="button" data-profile-thought-more-dropdown-edit>
            <img class="ui-icon-theme-aware" src="/registry/icons/public/assets/core/actions/editing/edit.svg" alt="" aria-hidden="true">
            <span>Edit</span>
          </button>
          <button class="profile-thought-bank__more-dropdown-item profile-thought-bank__more-dropdown-item--danger" type="button" data-profile-thought-more-dropdown-delete>
            <img class="profile-thought-bank__more-dropdown-item-icon" src="/registry/icons/public/assets/core/actions/delete/delete.svg" alt="" aria-hidden="true">
            <span>Delete</span>
          </button>
        </div>
      </div>
      <p class="profile-thought-bank__item-body"></p>
    </div>
  `;
  const badge = article.querySelector('.ui-badge');
  if (badge instanceof HTMLElement) {
    badge.innerHTML = '<img class="ui-icon-theme-aware" src="/registry/icons/public/assets/core/actions/visibility/private-draft.svg" alt="Private Thought Bank" width="16" height="16">';
  }
  article.querySelector('.profile-thought-bank__item-body').textContent = entry.text || '';
  article.querySelector('.profile-thought-bank__item-meta').textContent = formatDate(entry.createdAt);
  return article;
}

function renderThoughtList(root) {
  const list = root.querySelector('[data-profile-thought-list]');
  const empty = root.querySelector('[data-profile-thought-empty]');
  const count = root.querySelector('[data-profile-thought-count]');
  if (!(list instanceof HTMLElement)) return;

  list.innerHTML = '';

  const filters = getProfileFilterState('thoughts').filters;
  const thoughts = STORE.thoughts
    .filter((thought) => {
      if (filters.audience !== 'all' && filters.audience !== 'private') return false;

      if (filters.category !== 'all' && thought.category !== filters.category) return false;

      if (filters.year !== 'all') {
        const year = new Date(thought.createdAt).getFullYear();
        if (String(year) !== String(filters.year)) return false;
      }

      return true;
    })
    .slice()
    .sort((left, right) => {
      const direction = filters.sort === 'oldest' ? 1 : -1;
      return String(left.createdAt).localeCompare(String(right.createdAt)) * direction;
    });
  
  thoughts.forEach((thought) => {
    list.appendChild(renderEntry(thought));
  });

  if (count) {
    count.textContent = `${thoughts.length} thought${thoughts.length === 1 ? '' : 's'}`;
  }

  if (empty instanceof HTMLElement) {
    empty.hidden = thoughts.length > 0;
  }
}

function renderThoughtStream(state) {
  STORE.thoughts = state.entries || [];
  getRoots().forEach((root) => {
    renderThoughtList(root);
  });
}

function bindThoughtActions() {
  document.addEventListener('click', (event) => {
    const moreTrigger = event.target.closest('[data-profile-thought-more]');
    const moreDropdownEdit = event.target.closest('[data-profile-thought-more-dropdown-edit]');
    const moreDropdownDelete = event.target.closest('[data-profile-thought-more-dropdown-delete]');

    if (moreTrigger) {
      event.preventDefault();
      const thoughtId = moreTrigger.getAttribute('data-profile-thought-more') || '';
      const header = moreTrigger.closest('.profile-thought-bank__item-header');
      const dropdown = header?.querySelector('[data-profile-thought-more-dropdown]');
      const isOpen = !(dropdown instanceof HTMLElement) || !dropdown.hidden;
      setMoreDropdownOpen(moreTrigger, !isOpen, thoughtId);
      return;
    }

    if (moreDropdownEdit) {
      event.preventDefault();
      const thoughtId = STORE.moreOverlayThoughtId || '';
      if (thoughtId) {
        const activeDropdown = document.querySelector('[data-profile-thought-more-dropdown]:not([hidden])');
        const activeButton = activeDropdown?.previousElementSibling;
        setMoreDropdownOpen(activeButton, false);
        console.log('[thoughts] Edit thought:', thoughtId);
      }
      return;
    }

    if (moreDropdownDelete) {
      event.preventDefault();
      const thoughtId = STORE.moreOverlayThoughtId || '';
      if (thoughtId) {
        const activeDropdown = document.querySelector('[data-profile-thought-more-dropdown]:not([hidden])');
        const activeButton = activeDropdown?.previousElementSibling;
        setMoreDropdownOpen(activeButton, false);
        console.log('[thoughts] Delete thought:', thoughtId);
      }
      return;
    }
  });

  document.addEventListener('click', (event) => {
    const activeDropdown = document.querySelector('[data-profile-thought-more-dropdown]:not([hidden])');
    if (activeDropdown instanceof HTMLElement && !event.target.closest('[data-profile-thought-more]') && !event.target.closest('[data-profile-thought-more-dropdown]')) {
      const activeButton = activeDropdown.previousElementSibling;
      setMoreDropdownOpen(activeButton, false);
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    const activeDropdown = document.querySelector('[data-profile-thought-more-dropdown]:not([hidden])');
    const activeButton = activeDropdown?.previousElementSibling;
    setMoreDropdownOpen(activeButton, false);
  });
}

subscribeProfileThoughtState(renderThoughtStream);
subscribeProfileFilters((filterState) => {
  if (filterState.context !== 'thoughts') return;
  getRoots().forEach((root) => {
    renderThoughtList(root);
  });
});
bindThoughtActions();
