/* =============================================================================
   01) MODULE IMPORTS
   02) DOM HELPERS
   03) RENDERING
   04) EVENTS
   05) INITIALIZATION
============================================================================= */

import {
  subscribeProfileThoughtState,
  updateProfileThoughtComposer,
  submitProfileThought
} from './profile-thought-store.js';

function getRoots() {
  return Array.from(document.querySelectorAll('[data-profile-thought-composer]'));
}

function clearNode(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

function renderComposer(state) {
  getRoots().forEach((root) => {
    const category = root.querySelector('[data-profile-thought-category]');
    const textarea = root.querySelector('[data-profile-thought-textarea]');
    const submitLabel = root.querySelector('[data-profile-thought-submit-label]');
    const status = root.querySelector('[data-profile-thought-submit-status]');

    if (category instanceof HTMLSelectElement) {
      const activeValue = category.value || state.composerCategory;
      clearNode(category);
      state.taxonomy.categories.forEach((entry) => {
        const option = document.createElement('option');
        option.value = entry.key;
        option.textContent = entry.label;
        category.appendChild(option);
      });
      category.value = activeValue || state.composerCategory;
      
      const categoryLabel = root.querySelector('[data-profile-thought-category-label]');
      if (categoryLabel instanceof HTMLElement) {
        const selectedCategory = state.taxonomy.categories.find((entry) => entry.key === category.value);
        categoryLabel.textContent = selectedCategory?.label || 'Thought';
      }
    }

    if (textarea instanceof HTMLTextAreaElement && textarea.value !== state.composerText) {
      textarea.value = state.composerText;
    }

    root.querySelectorAll('[data-profile-thought-audience-option]').forEach((button) => {
      const key = button.getAttribute('data-profile-thought-audience-option') || '';
      const active = key === state.composerAudience;
      button.classList.toggle('profile-thought-composer__visibility-option--active', active);
      button.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    
    const audienceInput = root.querySelector('[data-profile-thought-audience]');
    if (audienceInput instanceof HTMLInputElement) {
      audienceInput.value = state.composerAudience || 'private';
    }
    
    const visibilityTrigger = root.querySelector('[data-profile-thought-audience-trigger]');
    const visibilityLabel = visibilityTrigger?.querySelector('.profile-thought-composer__visibility-label');
    const visibilityIcon = visibilityTrigger?.querySelector('.profile-thought-composer__visibility-icon');
    if (visibilityLabel instanceof HTMLElement) {
      const audience = state.taxonomy.audiences.find((entry) => entry.key === state.composerAudience);
      visibilityLabel.textContent = audience?.label || 'Private bank';
    }
    if (visibilityIcon instanceof HTMLImageElement) {
      const iconSrc = state.composerAudience === 'public'
        ? '/registry/icons/public/assets/core/actions/visibility/public-route.svg'
        : '/registry/icons/public/assets/core/actions/visibility/private-draft.svg';
      visibilityIcon.src = iconSrc;
    }

    if (submitLabel) {
      submitLabel.textContent = state.composerAudience === 'public' ? 'Stage Public Thought' : 'Save Privately';
    }

    if (status instanceof HTMLElement) {
      status.textContent = state.submitMessage || '';
      status.dataset.profileThoughtSubmitStatus = state.submitStatus || 'idle';
    }
  });
}

function bindComposerEvents() {
  document.addEventListener('click', (event) => {
    const trigger = event.target instanceof Element
      ? event.target.closest('[data-profile-thought-audience-trigger]')
      : null;
    if (trigger) {
      event.preventDefault();
      const dropdown = trigger.nextElementSibling;
      if (dropdown instanceof HTMLElement) {
        const isHidden = dropdown.hidden;
        dropdown.hidden = !isHidden;
        trigger.setAttribute('aria-expanded', (!isHidden).toString());
      }
      return;
    }

    const option = event.target instanceof Element
      ? event.target.closest('[data-profile-thought-audience-option]')
      : null;
    if (option) {
      event.preventDefault();
      const audience = option.getAttribute('data-profile-thought-audience-option') || 'private';
      updateProfileThoughtComposer({
        composerAudience: audience,
        resetStatus: true
      });
      const controls = option.closest('[data-profile-thought-audience-controls]');
      const dropdown = controls?.querySelector('[data-profile-thought-audience-dropdown]');
      const trigger = controls?.querySelector('[data-profile-thought-audience-trigger]');
      if (dropdown instanceof HTMLElement) dropdown.hidden = true;
      if (trigger instanceof HTMLElement) trigger.setAttribute('aria-expanded', 'false');
      return;
    }
  });

  document.addEventListener('input', (event) => {
    const target = event.target;
    if (target instanceof HTMLTextAreaElement && target.matches('[data-profile-thought-textarea]')) {
      updateProfileThoughtComposer({
        composerText: target.value,
        resetStatus: true
      });
      return;
    }

    if (target instanceof HTMLSelectElement && target.matches('[data-profile-thought-category]')) {
      updateProfileThoughtComposer({
        composerCategory: target.value,
        resetStatus: true
      });
    }
  });

  document.addEventListener('submit', (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || !form.matches('[data-profile-thought-compose-form="true"]')) return;
    event.preventDefault();
    submitProfileThought();
  });
}

function initThoughtComposer() {
  bindComposerEvents();
  subscribeProfileThoughtState(renderComposer);
}

initThoughtComposer();
