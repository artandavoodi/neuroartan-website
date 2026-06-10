import { mountSettingsCategory } from '../_shared/settings-category.js';
import {
  getOwnedCanonicalModel,
  readModelPersonalizationPreferences,
  readModelVisibilityPreferences,
  saveModelVisibilityPreferences
} from '../../../../system/model/model-store.js';

const VISIBILITY_DEFAULTS = Object.freeze({
  publicVisible: false,
  friendsVisible: false,
  followersVisible: false,
  mutualsVisible: false,
  familyVisible: false,
  subscribersVisible: false
});

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function titleize(value) {
  return normalizeString(value || 'Not set')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function parseRuntimePolicy(model = {}) {
  const raw = model.default_runtime_policy || model.runtime_policy || {};
  if (raw && typeof raw === 'object') return raw;
  try {
    const parsed = JSON.parse(String(raw || '{}'));
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function setStatus(root, message, state = '') {
  const node = root.querySelector('[data-model-settings-status]');
  if (!(node instanceof HTMLElement)) return;
  node.textContent = message;
  node.dataset.state = state;
}

function setText(root, selector, text) {
  const node = root.querySelector(selector);
  if (node instanceof HTMLElement) node.textContent = text;
}

function getVisibilityState(root) {
  return {
    ...(root.__modelVisibilityPreferences || VISIBILITY_DEFAULTS)
  };
}

function renderVisibility(root, preferences = VISIBILITY_DEFAULTS) {
  root.__modelVisibilityPreferences = {
    ...VISIBILITY_DEFAULTS,
    ...preferences
  };

  root.querySelectorAll('[data-model-visibility-toggle]').forEach((toggle) => {
    const field = toggle.getAttribute('data-model-visibility-toggle') || '';
    if (toggle instanceof HTMLInputElement) {
      toggle.checked = root.__modelVisibilityPreferences[field] === true;
    } else if (toggle instanceof HTMLButtonElement) {
      const isChecked = root.__modelVisibilityPreferences[field] === true;
      toggle.setAttribute('aria-checked', String(isChecked));
      toggle.setAttribute('data-toggle-state', isChecked ? 'on' : 'off');
      toggle.setAttribute('data-toggle-checked', String(isChecked));
      const track = toggle.querySelector('.na-toggle__track');
      if (track instanceof HTMLElement) {
        track.setAttribute('data-toggle-state', isChecked ? 'on' : 'off');
      }
      const thumb = toggle.querySelector('.na-toggle__thumb');
      if (thumb instanceof HTMLElement) {
        thumb.setAttribute('data-toggle-state', isChecked ? 'on' : 'off');
      }
    }
  });
}

async function hydrateModelSettings(root) {
  try {
    const model = await getOwnedCanonicalModel();
    if (!model?.id) {
      setStatus(root, 'Create a model before editing model settings.', 'error');
      return;
    }

    root.__modelSettingsModel = model;

    const runtimePolicy = parseRuntimePolicy(model);
    root.querySelectorAll('[data-model-settings-model-field]').forEach((node) => {
      const field = node.getAttribute('data-model-settings-model-field') || '';
      node.textContent = titleize(model[field] || '');
    });
    root.querySelectorAll('[data-model-settings-runtime-field]').forEach((node) => {
      const field = node.getAttribute('data-model-settings-runtime-field') || '';
      node.textContent = titleize(runtimePolicy[field] || '');
    });

    const [personalization, visibility] = await Promise.all([
      readModelPersonalizationPreferences(model.id).catch(() => null),
      readModelVisibilityPreferences(model.id).catch(() => null)
    ]);

    setText(root, '[data-model-settings-preference="responseLength"]', titleize(personalization?.responseLength || 'balanced'));
    setText(root, '[data-model-settings-preference="explanationDepth"]', titleize(personalization?.explanationDepth || 'standard'));
    setText(root, '[data-model-settings-preference="emotionalTone"]', titleize(personalization?.emotionalTone || 'neutral'));
    renderVisibility(root, visibility || VISIBILITY_DEFAULTS);
  } catch (error) {
    console.error('[model-settings] Hydration failed.', error);
    setStatus(root, 'Model settings could not be loaded.', 'error');
  }
}

async function saveVisibility(root, patch = {}) {
  const model = root.__modelSettingsModel || await getOwnedCanonicalModel();
  if (!model?.id) {
    setStatus(root, 'Create a model before editing visibility.', 'error');
    return;
  }

  const next = {
    ...getVisibilityState(root),
    ...patch
  };

  renderVisibility(root, next);
  setStatus(root, 'Saving model visibility...', 'pending');

  try {
    const saved = await saveModelVisibilityPreferences(model.id, next);
    renderVisibility(root, saved || next);
    setStatus(root, 'Model visibility saved.', 'success');
  } catch (error) {
    console.error('[model-settings] Visibility save failed.', error);
    setStatus(root, 'Model visibility could not be saved.', 'error');
  }
}

export function mountHomePlatformDestination(root, options = {}) {
  mountSettingsCategory(root, options);
  void hydrateModelSettings(root);

  root.addEventListener('click', (event) => {
    const toggle = event.target?.closest?.('[data-model-visibility-toggle]');
    if (!(toggle instanceof HTMLButtonElement)) return;

    const field = toggle.getAttribute('data-model-visibility-toggle') || '';
    if (!field) return;

    const currentState = root.__modelVisibilityPreferences[field] === true;
    void saveVisibility(root, { [field]: !currentState });
  });
}

export function updateHomePlatformDestination(root) {
  void hydrateModelSettings(root);
}
