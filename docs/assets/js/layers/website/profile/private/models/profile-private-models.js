/* =============================================================================
   01) MODULE IMPORTS
   02) DOM HELPERS
   03) RENDERING
   04) ACTIONS
   05) INITIALIZATION
============================================================================= */

import {
  getModelStoreBackendState,
  listOwnedModels
} from '../../../system/model/model-store.js';
import {
  getProfileFilterState,
  subscribeProfileFilters
} from '../filter/profile-filter-overlay.js';
import {
  getProfileRuntimeState,
  subscribeProfileRuntime
} from '../shell/profile-runtime.js';

function getRoot() {
  return document.querySelector('[data-profile-private-models]');
}

function setText(root, selector, value) {
  const node = root?.querySelector(selector);
  if (!node) return;
  node.textContent = value || '';
}

function setDisabled(root, selector, disabled) {
  const node = root?.querySelector(selector);
  if (!(node instanceof HTMLButtonElement)) return;
  node.disabled = disabled;
  node.setAttribute('aria-disabled', disabled ? 'true' : 'false');
}

async function renderModels() {
  const root = getRoot();
  if (!root) return;

  const state = getProfileRuntimeState();
  const backend = getModelStoreBackendState();
  let models = [];

  try {
    models = await listOwnedModels();
  } catch (error) {
    console.error('[profile-private-models] Failed to list owned models.', error);
  }

  const filters = getProfileFilterState('models').filters;
  const filteredModels = models.filter((model) => {
    if (filters.state !== 'all') {
      const stateKeys = [
        model.training_state,
        model.readiness_state,
        model.lifecycle_state,
        model.status
      ].map((value) => String(value || '').trim().toLowerCase());
      if (!stateKeys.includes(filters.state)) return false;
    }

    if (filters.scope === 'owned' && model.owner_scope === 'saved') return false;
    if (filters.scope === 'saved' && model.owner_scope !== 'saved') return false;

    if (filters.year !== 'all') {
      const year = new Date(model.created_at || model.createdAt || model.updated_at || model.updatedAt).getFullYear();
      if (String(year) !== String(filters.year)) return false;
    }

    return true;
  });
  const trainedModels = filteredModels.filter((model) => model.training_state === 'trained' || model.readiness_state === 'ready');
  const sourceCount = filteredModels.reduce((total, model) => total + (Number(model.source_count) || 0), 0);
  const authenticated = state.viewerState === 'authenticated';
  const profileComplete = state.completion?.complete === true;
  const canCreateModel = authenticated;

  setText(root, '[data-profile-saved-models-count]', String(filteredModels.length));
  setText(root, '[data-profile-owned-models-count]', String(trainedModels.length));
  setText(root, '[data-profile-training-sources-count]', String(sourceCount));
  setText(
    root,
    '[data-profile-model-status]',
    authenticated
      ? profileComplete && backend.supabaseConfigured
        ? 'Model registry is connected. Create and manage models from the canonical model creation control panel.'
        : profileComplete
          ? 'Open model creation to prepare a model draft. Canonical save requires the active models table and account policies.'
          : 'Open model creation after completing the private profile identity and username requirements.'
      : state.viewerState !== 'authenticated'
        ? 'Sign in to activate model registry access.'
        : 'Complete your profile before creating or registering models.'
  );
  setDisabled(root, '[data-profile-action="create-model"]', !canCreateModel);
}

function bindModelActions() {
  const root = getRoot();
  if (!root || root.dataset.profilePrivateModelsBound === 'true') return;
  root.dataset.profilePrivateModelsBound = 'true';

  root.addEventListener('click', (event) => {
    const trigger = event.target instanceof Element
      ? event.target.closest('[data-profile-action="create-model"]')
      : null;
    if (!trigger || trigger.disabled) return;

    event.preventDefault();
    window.location.href = '/pages/models/create/index.html';
  });
}

function initProfilePrivateModels() {
  bindModelActions();
  void renderModels();
  subscribeProfileRuntime(() => {
    void renderModels();
  });
  subscribeProfileFilters((state) => {
    if (state.context !== 'models') return;
    void renderModels();
  });

  document.addEventListener('fragment:mounted', (event) => {
    if (event?.detail?.name !== 'profile-private-models') return;
    bindModelActions();
    void renderModels();
  });
}

initProfilePrivateModels();

/* =============================================================================
   FSC-T-0007) PRIVATE MODEL ECONOMY PLACEHOLDER STATE
============================================================================= */

export const PROFILE_PRIVATE_MODEL_ECONOMY_PLACEHOLDER = Object.freeze({
  defaultPersonalModel: "assignedAtProfileBirth",
  birthIdentity: "ownerVisibleFutureState",
  dignitySecurity: "ownerVisibleFutureState",
  monetizationReadiness: "blockedUntilReview",
  hiringReadiness: "blockedUntilReview",
  marketplaceVisibility: "blockedUntilReview"
});

/* =============================================================================
   FSC-T-0007) PRIVATE MODEL READINESS LABELS
============================================================================= */

export const PROFILE_PRIVATE_MODEL_READINESS_LABELS = Object.freeze({
  defaultPersonalModel: "Default personal model",
  modelBirthIdentity: "Birth identity pending",
  modelDignity: "Dignity protected",
  monetization: "Monetization blocked until review",
  hiring: "Hiring blocked until review",
  marketplace: "Marketplace blocked until review",
  interModelHiring: "Inter-model hiring blocked until review"
});
