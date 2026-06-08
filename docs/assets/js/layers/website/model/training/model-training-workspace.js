import {
  addTrainingRecipeSource,
  getDefaultTrainingRecipeGraph,
  listTrainingRecipeSources,
  readLatestTrainingRecipe,
  removeTrainingRecipeSource,
  requestTrainingRun,
  saveTrainingRecipeDraft,
} from '../../system/model/model-training-store.js';

const MODEL_TRAINING_RECIPE_STORAGE_KEY = 'neuroartan.model.training.recipe-draft';
const DEFAULT_DRAFT = Object.freeze({
  recipeName: 'Model foundation recipe',
  baseModelProvider: 'model_registry',
  baseModel: '',
  trainingMethod: 'supervised_fine_tuning',
  sourceProfile: true,
  sourceThoughts: false,
  sourceDocuments: false,
  sourceKnowledge: false,
  epochs: 1,
  learningRate: '0.0002',
  contextLength: 2048,
});

let activeRecipe = null;
let activeRecipeSources = [];
let activeGraphConfig = getDefaultTrainingRecipeGraph();
let selectedConnectionNodeId = '';
let draggingNode = null;

function normalizeProviderValue(value = '') {
  return value === 'hugging_face' ? 'model_registry' : value;
}

function workspaceRoot() {
  return document.querySelector('[data-model-training-workspace]');
}

function loadRecipeDraft() {
  try {
    const parsed = JSON.parse(window.localStorage?.getItem(MODEL_TRAINING_RECIPE_STORAGE_KEY) || '{}');
    return {
      ...DEFAULT_DRAFT,
      ...(parsed && typeof parsed === 'object' ? parsed : {}),
      graphConfig: parsed?.graphConfig || getDefaultTrainingRecipeGraph(),
    };
  } catch (error) {
    return {
      ...DEFAULT_DRAFT,
      graphConfig: getDefaultTrainingRecipeGraph(),
    };
  }
}

function writeRecipeDraft(draft) {
  try {
    window.localStorage?.setItem(
      MODEL_TRAINING_RECIPE_STORAGE_KEY,
      JSON.stringify({
        ...draft,
        graphConfig: activeGraphConfig,
        updatedAt: new Date().toISOString(),
      })
    );
  } catch (error) {
    /* Browser persistence remains a resilience fallback; Supabase owns the record. */
  }
}

function setWorkspaceStatus(message, state = 'idle') {
  const status = workspaceRoot()?.querySelector('[data-model-training-workspace-status]');
  if (!(status instanceof HTMLElement)) return;
  status.textContent = message;
  status.dataset.modelTrainingWorkspaceStatus = state;
}

function formatWorkspaceError(error) {
  const code = String(error?.code || error?.message || '').trim();
  if (code === 'MODEL_TRAINING_SCHEMA_REQUIRED') {
    return 'Training schema migration required before this workspace can save.';
  }
  if (code === 'MODEL_BACKEND_UNAVAILABLE') {
    return 'Supabase is unavailable. The browser draft remains available locally.';
  }
  if (code === 'TRAINING_RECIPE_NOT_READY') {
    return 'Complete the required recipe, source, and execution stages before requesting a run.';
  }
  return code ? `Training workspace could not save: ${code}` : 'Training workspace could not save.';
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
    void hydrateRecipeFromBackend();
  } else {
    setBoardExpanded(false);
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

  const actions = root.querySelector('[data-model-training-workspace-actions]');
  if (actions instanceof HTMLElement) actions.hidden = pane === 'readiness';
  if (pane === 'readiness') renderRecipeBoard(root);
}

function setBoardExpanded(expanded) {
  const root = workspaceRoot();
  if (!(root instanceof HTMLElement)) return;
  root.classList.toggle('is-board-expanded', expanded);
  const expand = root.querySelector('[data-model-training-board-expand]');
  const close = root.querySelector('[data-model-training-board-close]');
  if (expand instanceof HTMLElement) expand.setAttribute('aria-expanded', expanded ? 'true' : 'false');
  if (close instanceof HTMLElement) close.hidden = !expanded;
  renderRecipeBoard(root);
}

function getSafeSelectOptionText(select) {
  if (!(select instanceof HTMLSelectElement)) return '';
  if (!select.selectedOptions.length && select.options.length) {
    select.value = select.options[0].value;
  }
  return select.selectedOptions[0]?.textContent || select.options[0]?.textContent || '';
}

function hydrateRecipeForm(root = workspaceRoot(), draft = loadRecipeDraft()) {
  if (!(root instanceof HTMLElement)) return;
  const form = root.querySelector('[data-model-training-workspace-form]');
  if (!(form instanceof HTMLFormElement)) return;

  activeRecipe = draft.id ? draft : activeRecipe;

  root.querySelectorAll('[data-model-training-label]').forEach((label) => {
    if (!(label instanceof HTMLElement)) return;
    const field = label.dataset.modelTrainingLabel;
    const select = field ? root.querySelector(`[data-model-training-field="${field}"]`) : null;
    if (!(select instanceof HTMLSelectElement)) return;
    label.textContent = getSafeSelectOptionText(select);
  });

  root.querySelectorAll('[data-model-training-field]').forEach((select) => {
    if (!(select instanceof HTMLSelectElement)) return;
    select.addEventListener('change', () => {
      const field = select.dataset.modelTrainingField;
      const label = field ? root.querySelector(`[data-model-training-label="${field}"]`) : null;
      if (label instanceof HTMLElement) label.textContent = getSafeSelectOptionText(select);
    });
  });
  activeGraphConfig = draft.graphConfig || activeGraphConfig || getDefaultTrainingRecipeGraph();
  Object.entries(draft).forEach(([key, value]) => {
    const control = form.elements.namedItem(key);
    if (control instanceof HTMLInputElement && control.type === 'checkbox') {
      control.checked = value === true;
    } else if (control instanceof HTMLInputElement || control instanceof HTMLSelectElement) {
      control.value = String(key === 'baseModelProvider' ? normalizeProviderValue(value) : value ?? '');
    }
  });

  const recipeId = form.elements.namedItem('recipeId');
  if (recipeId instanceof HTMLInputElement) recipeId.value = String(draft.id || '');
  renderRecipeBoard(root);
  renderRecipeSources(root);

  if (draft.updatedAt) {
    setWorkspaceStatus(`Recipe draft saved ${new Date(draft.updatedAt).toLocaleString()}`, 'saved');
  }
}

async function hydrateRecipeFromBackend() {
  try {
    const recipe = await readLatestTrainingRecipe();
    if (!recipe) return;
    activeRecipe = recipe;
    activeGraphConfig = recipe.graphConfig || getDefaultTrainingRecipeGraph();
    activeRecipeSources = await listTrainingRecipeSources(recipe.id);
    hydrateRecipeForm(workspaceRoot(), recipe);
    writeRecipeDraft(recipe);
    setWorkspaceStatus('Recipe draft loaded from Supabase.', 'saved');
  } catch (error) {
    setWorkspaceStatus(formatWorkspaceError(error), 'error');
  }
}

function serializeRecipeForm(form) {
  if (!(form instanceof HTMLFormElement)) {
    return {
      ...(activeRecipe || loadRecipeDraft()),
      graphConfig: activeGraphConfig,
    };
  }

  return Array.from(form.elements).reduce((draft, control) => {
    if (!(control instanceof HTMLInputElement || control instanceof HTMLSelectElement)) return draft;
    if (!control.name || control.type === 'file') return draft;
    draft[control.name] = control.type === 'checkbox' ? control.checked : control.value;
    return draft;
  }, {
    id: activeRecipe?.id || '',
    graphConfig: activeGraphConfig,
  });
}

function renderRecipeSources(root = workspaceRoot()) {
  const list = root?.querySelector('[data-model-training-source-list]');
  if (!(list instanceof HTMLElement)) return;
  list.replaceChildren();

  if (!activeRecipeSources.length) {
    const empty = document.createElement('p');
    empty.className = 'model-training-workspace__copy';
    empty.textContent = 'No external sources attached.';
    list.append(empty);
    return;
  }

  activeRecipeSources.forEach((source) => {
    const item = document.createElement('article');
    item.className = 'model-training-workspace__source-item';

    const text = document.createElement('div');
    const title = document.createElement('strong');
    title.textContent = source.source_label || 'Training source';
    const detail = document.createElement('span');
    detail.textContent = source.source_kind || 'source';
    text.append(title, detail);

    const remove = document.createElement('button');
    remove.className = 'model-management__text-button';
    remove.type = 'button';
    remove.dataset.modelTrainingSourceRemove = source.id;
    remove.textContent = 'Remove';
    item.append(text, remove);
    list.append(item);
  });
}

function getBoardNode(nodeId) {
  return activeGraphConfig.nodes.find((node) => node.id === nodeId) || null;
}

function getRecipeFormValues(root = workspaceRoot()) {
  return serializeRecipeForm(root?.querySelector('[data-model-training-workspace-form]'));
}

function getEnabledSourceLabels(values = {}) {
  return [
    values.sourceProfile ? 'Profile foundation' : '',
    values.sourceThoughts ? 'Thought bank' : '',
    values.sourceDocuments ? 'Documents' : '',
    values.sourceKnowledge ? 'Knowledge base' : '',
    ...activeRecipeSources.map((source) => source.source_label || source.source_kind || 'External source'),
  ].filter(Boolean);
}

function formatProviderLabel(value = '') {
  switch (normalizeProviderValue(value)) {
    case 'model_registry':
      return 'Model registry';
    case 'external_registry':
      return 'External registry';
    case 'local_runtime':
      return 'Local runtime';
    default:
      return 'Not assigned';
  }
}

function getBoardNodePresentation(nodeId, values = {}) {
  const sources = getEnabledSourceLabels(values);
  const baseModelReady = Boolean(values.baseModel);
  const sourcesReady = sources.length > 0;
  const executionReady = Boolean(values.epochs && values.learningRate && values.contextLength);
  const queued = activeRecipe?.runRequestState === 'queued_for_runner';

  switch (nodeId) {
    case 'base-model':
      return {
        state: baseModelReady ? 'ready' : 'setup',
        status: baseModelReady ? 'Ready' : 'Needs setup',
        details: [
          ['Provider', formatProviderLabel(values.baseModelProvider)],
          ['Reference', values.baseModel || 'Not assigned'],
          ['Method', String(values.trainingMethod || '').replaceAll('_', ' ') || 'Not assigned'],
        ],
      };
    case 'sources':
      return {
        state: sourcesReady ? 'ready' : 'setup',
        status: sourcesReady ? 'Ready' : 'Needs setup',
        details: [
          ['Selected', String(sources.length)],
          ['Sources', sources.join(', ') || 'None selected'],
        ],
      };
    case 'execution':
      return {
        state: executionReady ? 'ready' : 'setup',
        status: executionReady ? 'Ready' : 'Needs setup',
        details: [
          ['Epochs', values.epochs || 'Not assigned'],
          ['Learning rate', values.learningRate || 'Not assigned'],
          ['Context', values.contextLength || 'Not assigned'],
        ],
      };
    case 'readiness':
      return {
        state: queued ? 'queued' : baseModelReady && sourcesReady && executionReady ? 'ready' : 'setup',
        status: queued ? 'Queued' : baseModelReady && sourcesReady && executionReady ? 'Ready' : 'Needs setup',
        details: [
          ['Recipe', values.recipeName || 'Untitled recipe'],
          ['Request', queued ? 'Queued for runner' : 'Not queued'],
        ],
      };
    default:
      return {
        state: 'setup',
        status: 'Needs setup',
        details: [],
      };
  }
}

function renderRecipeBoardConnections(board) {
  board.querySelectorAll('.model-training-workspace__connection').forEach((line) => line.remove());

  activeGraphConfig.connections.forEach((connection) => {
    const source = board.querySelector(`[data-model-training-board-node="${connection.source}"]`);
    const target = board.querySelector(`[data-model-training-board-node="${connection.target}"]`);
    const sourceNode = getBoardNode(connection.source);
    const targetNode = getBoardNode(connection.target);
    if (!(source instanceof HTMLElement) || !(target instanceof HTMLElement) || !sourceNode || !targetNode) return;

    const line = document.createElement('span');
    const sourceX = sourceNode.x + source.offsetWidth;
    const sourceY = sourceNode.y + (source.offsetHeight / 2);
    const targetX = targetNode.x;
    const targetY = targetNode.y + (target.offsetHeight / 2);
    const length = Math.hypot(targetX - sourceX, targetY - sourceY);
    const angle = Math.atan2(targetY - sourceY, targetX - sourceX) * 180 / Math.PI;
    line.className = 'model-training-workspace__connection';
    line.style.width = `${length}px`;
    line.style.transform = `translate(${sourceX}px, ${sourceY}px) rotate(${angle}deg)`;
    board.prepend(line);
  });
}

function renderRecipeBoard(root = workspaceRoot()) {
  const board = root?.querySelector('[data-model-training-board]');
  if (!(board instanceof HTMLElement)) return;
  board.replaceChildren();
  const values = getRecipeFormValues(root);

  activeGraphConfig.nodes.forEach((node) => {
    const button = document.createElement('button');
    const presentation = getBoardNodePresentation(node.id, values);
    button.className = 'model-training-workspace__node';
    button.classList.toggle('is-connecting', selectedConnectionNodeId === node.id);
    button.type = 'button';
    button.dataset.modelTrainingBoardNode = node.id;
    button.dataset.modelTrainingNodeState = presentation.state;
    button.style.transform = `translate(${node.x}px, ${node.y}px)`;

    const header = document.createElement('span');
    header.className = 'model-training-workspace__node-header';
    const label = document.createElement('strong');
    label.className = 'model-training-workspace__node-label';
    label.textContent = node.label;
    const status = document.createElement('span');
    status.className = 'model-training-workspace__node-status';
    status.textContent = presentation.status;
    header.append(label, status);

    const details = document.createElement('dl');
    details.className = 'model-training-workspace__node-details';
    presentation.details.forEach(([term, description]) => {
      const row = document.createElement('div');
      row.className = 'model-training-workspace__node-detail';
      const key = document.createElement('dt');
      key.textContent = term;
      const value = document.createElement('dd');
      value.textContent = description;
      row.append(key, value);
      details.append(row);
    });

    button.append(header, details);
    board.append(button);
  });

  renderRecipeBoardConnections(board);
}

function connectBoardNode(nodeId) {
  if (!selectedConnectionNodeId) {
    selectedConnectionNodeId = nodeId;
    renderRecipeBoard();
    return;
  }

  if (selectedConnectionNodeId !== nodeId) {
    const exists = activeGraphConfig.connections.some((connection) => (
      connection.source === selectedConnectionNodeId && connection.target === nodeId
    ));
    if (!exists) {
      activeGraphConfig.connections.push({ source: selectedConnectionNodeId, target: nodeId });
    }
  }
  selectedConnectionNodeId = '';
  writeRecipeDraft(serializeRecipeForm(workspaceRoot()?.querySelector('[data-model-training-workspace-form]')));
  renderRecipeBoard();
}

function handleBoardPointerDown(event) {
  const node = event.target?.closest?.('[data-model-training-board-node]');
  if (!(node instanceof HTMLButtonElement)) return;
  const graphNode = getBoardNode(node.dataset.modelTrainingBoardNode);
  if (!graphNode) return;
  draggingNode = {
    node: graphNode,
    element: node,
    startX: event.clientX,
    startY: event.clientY,
    originX: graphNode.x,
    originY: graphNode.y,
    moved: false,
  };
  node.setPointerCapture?.(event.pointerId);
}

function handleBoardPointerMove(event) {
  if (!draggingNode) return;
  const board = workspaceRoot()?.querySelector('[data-model-training-board]');
  if (!(board instanceof HTMLElement)) return;
  const maxX = Math.max(0, board.clientWidth - 150);
  const maxY = Math.max(0, board.clientHeight - 72);
  const deltaX = event.clientX - draggingNode.startX;
  const deltaY = event.clientY - draggingNode.startY;
  draggingNode.moved ||= Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3;
  draggingNode.node.x = Math.max(0, Math.min(maxX, draggingNode.originX + deltaX));
  draggingNode.node.y = Math.max(0, Math.min(maxY, draggingNode.originY + deltaY));
  draggingNode.element.style.transform = `translate(${draggingNode.node.x}px, ${draggingNode.node.y}px)`;
  renderRecipeBoardConnections(board);
}

function handleBoardPointerUp(event) {
  if (!draggingNode) return;
  const moved = draggingNode.moved;
  draggingNode = null;
  const form = workspaceRoot()?.querySelector('[data-model-training-workspace-form]');
  if (form instanceof HTMLFormElement) writeRecipeDraft(serializeRecipeForm(form));
  if (!moved) connectBoardNode(event.target?.closest?.('[data-model-training-board-node]')?.dataset.modelTrainingBoardNode || '');
  if (moved) renderRecipeBoard();
}

async function saveWorkspaceDraft(form) {
  const draft = serializeRecipeForm(form);
  writeRecipeDraft(draft);
  setWorkspaceStatus('Saving recipe draft...', 'saving');
  const recipe = await saveTrainingRecipeDraft(draft);
  activeRecipe = recipe;
  activeGraphConfig = recipe.graphConfig;
  writeRecipeDraft(recipe);
  setWorkspaceStatus('Recipe draft saved to Supabase.', 'saved');
  return recipe;
}

async function handleWorkspaceSubmit(event) {
  const form = event.target?.closest?.('[data-model-training-workspace-form]');
  if (!(form instanceof HTMLFormElement)) return;
  event.preventDefault();
  if (!form.reportValidity()) return;

  try {
    await saveWorkspaceDraft(form);
    setActivePane('readiness');
  } catch (error) {
    setWorkspaceStatus(formatWorkspaceError(error), 'error');
  }
}

async function handleSourceAdd() {
  const form = workspaceRoot()?.querySelector('[data-model-training-workspace-form]');
  if (!(form instanceof HTMLFormElement)) return;
  try {
    const recipe = activeRecipe?.id ? activeRecipe : await saveWorkspaceDraft(form);
    const sourceKind = form.elements.namedItem('externalSourceKind');
    const sourceLabel = form.elements.namedItem('externalSourceLabel');
    const sourceReference = form.elements.namedItem('externalSourceReference');
    const sourceFile = form.elements.namedItem('externalSourceFile');
    await addTrainingRecipeSource(recipe.id, {
      sourceKind: sourceKind instanceof HTMLSelectElement ? sourceKind.value : '',
      sourceLabel: sourceLabel instanceof HTMLInputElement ? sourceLabel.value : '',
      sourceReference: sourceReference instanceof HTMLInputElement ? sourceReference.value : '',
      file: sourceFile instanceof HTMLInputElement ? sourceFile.files?.[0] : null,
    });
    activeRecipeSources = await listTrainingRecipeSources(recipe.id);
    renderRecipeSources();
    if (sourceLabel instanceof HTMLInputElement) sourceLabel.value = '';
    if (sourceReference instanceof HTMLInputElement) sourceReference.value = '';
    if (sourceFile instanceof HTMLInputElement) sourceFile.value = '';
    setWorkspaceStatus('Training source attached.', 'saved');
  } catch (error) {
    setWorkspaceStatus(formatWorkspaceError(error), 'error');
  }
}

async function handleSourceRemove(sourceId) {
  try {
    await removeTrainingRecipeSource(sourceId);
    activeRecipeSources = activeRecipe?.id ? await listTrainingRecipeSources(activeRecipe.id) : [];
    renderRecipeSources();
  } catch (error) {
    setWorkspaceStatus(formatWorkspaceError(error), 'error');
  }
}

async function handleRunRequest() {
  const form = workspaceRoot()?.querySelector('[data-model-training-workspace-form]');
  if (!(form instanceof HTMLFormElement)) return;
  try {
    const recipe = await saveWorkspaceDraft(form);
    await requestTrainingRun(recipe);
    activeRecipe = {
      ...recipe,
      runRequestState: 'queued_for_runner',
    };
    renderRecipeBoard();
    setWorkspaceStatus('Run queued. A connected training runner can claim this request.', 'queued');
  } catch (error) {
    setWorkspaceStatus(formatWorkspaceError(error), 'error');
  }
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

  if (event.target?.closest?.('[data-model-training-board-expand]')) {
    setBoardExpanded(true);
    return;
  }

  if (event.target?.closest?.('[data-model-training-board-close]')) {
    setBoardExpanded(false);
    return;
  }

  const paneTrigger = event.target?.closest?.('[data-model-training-workspace-pane]');
  if (paneTrigger instanceof HTMLElement) {
    setActivePane(paneTrigger.dataset.modelTrainingWorkspacePane || 'recipe');
    return;
  }

  if (event.target?.closest?.('[data-model-training-source-add]')) {
    void handleSourceAdd();
    return;
  }

  const sourceRemove = event.target?.closest?.('[data-model-training-source-remove]');
  if (sourceRemove instanceof HTMLElement) {
    void handleSourceRemove(sourceRemove.dataset.modelTrainingSourceRemove || '');
    return;
  }

  if (event.target?.closest?.('[data-model-training-run-request]')) {
    void handleRunRequest();
  }
}

function initModelTrainingWorkspace() {
  document.addEventListener('click', handleWorkspaceClick);
  document.addEventListener('submit', handleWorkspaceSubmit);
  document.addEventListener('pointerdown', handleBoardPointerDown);
  document.addEventListener('pointermove', handleBoardPointerMove);
  document.addEventListener('pointerup', handleBoardPointerUp);
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if (workspaceRoot()?.classList.contains('is-board-expanded')) {
      setBoardExpanded(false);
      return;
    }
    setWorkspaceOpen(false);
  });
  document.addEventListener('fragment:mounted', (event) => {
    if (event?.detail?.name !== 'model-training-workspace') return;
    hydrateRecipeForm();
  });
}

initModelTrainingWorkspace();
