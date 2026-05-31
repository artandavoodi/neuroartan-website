const MODEL_TRAINING_RECIPE_STORAGE_KEY = 'neuroartan.model.training.recipe-draft';

function workspaceRoot() {
  return document.querySelector('[data-model-training-workspace]');
}

function loadRecipeDraft() {
  try {
    return JSON.parse(window.localStorage?.getItem(MODEL_TRAINING_RECIPE_STORAGE_KEY) || '{}');
  } catch (error) {
    return {};
  }
}

function setWorkspaceOpen(open) {
  const root = workspaceRoot();
  if (!(root instanceof HTMLElement)) return;

  root.hidden = !open;
  root.setAttribute('aria-hidden', open ? 'false' : 'true');
  document.documentElement.classList.toggle('model-training-workspace-open', open);
  document.body?.classList.toggle('model-training-workspace-open', open);

  if (open) {
    hydrateRecipeForm(root);
  }
}

function setActivePane(pane) {
  const root = workspaceRoot();
  if (!(root instanceof HTMLElement)) return;

  root.querySelectorAll('[data-model-training-workspace-pane]').forEach((button) => {
    button.classList.toggle('is-active', button.dataset.modelTrainingWorkspacePane === pane);
  });
  root.querySelectorAll('[data-model-training-workspace-panel]').forEach((panel) => {
    panel.hidden = panel.dataset.modelTrainingWorkspacePanel !== pane;
  });
}

function hydrateRecipeForm(root = workspaceRoot()) {
  if (!(root instanceof HTMLElement)) return;
  const form = root.querySelector('[data-model-training-workspace-form]');
  if (!(form instanceof HTMLFormElement)) return;

  const draft = loadRecipeDraft();
  Object.entries(draft).forEach(([key, value]) => {
    const control = form.elements.namedItem(key);
    if (control instanceof HTMLInputElement && control.type === 'checkbox') {
      control.checked = value === true;
    } else if (control instanceof HTMLInputElement || control instanceof HTMLSelectElement) {
      control.value = String(value ?? '');
    }
  });

  const status = root.querySelector('[data-model-training-workspace-status]');
  if (status instanceof HTMLElement && draft.updatedAt) {
    status.textContent = `Recipe draft saved ${new Date(draft.updatedAt).toLocaleString()}`;
  }
}

function serializeRecipeForm(form) {
  return Array.from(form.elements).reduce((draft, control) => {
    if (!(control instanceof HTMLInputElement || control instanceof HTMLSelectElement)) return draft;
    if (!control.name) return draft;
    draft[control.name] = control.type === 'checkbox' ? control.checked : control.value;
    return draft;
  }, {
    updatedAt: new Date().toISOString()
  });
}

function handleWorkspaceSubmit(event) {
  const form = event.target?.closest?.('[data-model-training-workspace-form]');
  if (!(form instanceof HTMLFormElement)) return;

  event.preventDefault();
  if (!form.reportValidity()) return;

  const draft = serializeRecipeForm(form);
  window.localStorage?.setItem(MODEL_TRAINING_RECIPE_STORAGE_KEY, JSON.stringify(draft));

  const status = workspaceRoot()?.querySelector('[data-model-training-workspace-status]');
  if (status instanceof HTMLElement) {
    status.textContent = 'Recipe draft saved. Backend training runner is not connected.';
  }
  setActivePane('readiness');
}

function handleWorkspaceClick(event) {
  if (event.target?.closest?.('[data-model-training-workspace-open]')) {
    setWorkspaceOpen(true);
    return;
  }

  if (event.target?.closest?.('[data-model-training-workspace-close]')) {
    setWorkspaceOpen(false);
    return;
  }

  const paneTrigger = event.target?.closest?.('[data-model-training-workspace-pane]');
  if (paneTrigger instanceof HTMLElement) {
    setActivePane(paneTrigger.dataset.modelTrainingWorkspacePane || 'recipe');
  }
}

function initModelTrainingWorkspace() {
  document.addEventListener('click', handleWorkspaceClick);
  document.addEventListener('submit', handleWorkspaceSubmit);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') setWorkspaceOpen(false);
  });
  document.addEventListener('fragment:mounted', (event) => {
    if (event?.detail?.name !== 'model-training-workspace') return;
    hydrateRecipeForm();
  });
}

initModelTrainingWorkspace();
