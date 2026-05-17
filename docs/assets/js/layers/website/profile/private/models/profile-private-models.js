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

  const trainedModels = models.filter((model) => model.training_state === 'trained' || model.readiness_state === 'ready');
  const sourceCount = models.reduce((total, model) => total + (Number(model.source_count) || 0), 0);
  const authenticated = state.viewerState === 'authenticated';
  const profileComplete = state.completion?.complete === true;
  const canCreateModel = authenticated;

  setText(root, '[data-profile-saved-models-count]', String(models.length));
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

  document.addEventListener('fragment:mounted', (event) => {
    if (event?.detail?.name !== 'profile-private-models') return;
    bindModelActions();
    void renderModels();
  });
}

initProfilePrivateModels();
