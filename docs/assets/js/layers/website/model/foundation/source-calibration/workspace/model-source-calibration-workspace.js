// MARK: - Source Calibration Workspace

let sourceCalibrationWorkspace = null;
let sourceCalibrationWorkspaceMounted = false;

// MARK: - Public API

export async function mountSourceCalibrationWorkspace(root = document) {
  if (sourceCalibrationWorkspaceMounted) {
    return getSourceCalibrationWorkspace();
  }

  sourceCalibrationWorkspace = root.querySelector?.('[data-model-source-calibration-workspace]') || null;

  if (!sourceCalibrationWorkspace) {
    await loadSourceCalibrationWorkspaceFragment();
    sourceCalibrationWorkspace = document.querySelector('[data-model-source-calibration-workspace]');
  }

  if (!sourceCalibrationWorkspace) {
    return null;
  }

  bindSourceCalibrationWorkspace(sourceCalibrationWorkspace);
  bindSourceCalibrationWorkspaceProgress();
  sourceCalibrationWorkspaceMounted = true;

  return sourceCalibrationWorkspace;
}

export function getSourceCalibrationWorkspace() {
  return sourceCalibrationWorkspace || document.querySelector('[data-model-source-calibration-workspace]');
}

export async function openSourceCalibrationWorkspace() {
  const workspace = await mountSourceCalibrationWorkspace();
  if (!workspace) return null;

  workspace.hidden = false;
  workspace.setAttribute('aria-hidden', 'false');
  document.documentElement.classList.add('model-source-calibration-workspace-open');
  document.body.classList.add('model-source-calibration-workspace-open');

  return workspace;
}

export function closeSourceCalibrationWorkspace() {
  const workspace = getSourceCalibrationWorkspace();
  if (!workspace) return;

  workspace.hidden = true;
  workspace.setAttribute('aria-hidden', 'true');
  document.documentElement.classList.remove('model-source-calibration-workspace-open');
  document.body.classList.remove('model-source-calibration-workspace-open');

  document.dispatchEvent(new CustomEvent('model:source-calibration-workspace-closed', {
    detail: {
      source: 'source_calibration_workspace',
    },
  }));
}

export async function setSourceCalibrationWorkspaceQuestion(contentNode) {
  const workspace = await mountSourceCalibrationWorkspace();
  const target = workspace?.querySelector('[data-model-source-calibration-workspace-question]');
  const result = workspace?.querySelector('[data-model-source-calibration-workspace-result]');

  if (!target) return;
  const safeContentNode = cloneWorkspaceContentNode(contentNode);

  target.replaceChildren(safeContentNode);

  if (result) {
    result.hidden = true;
    result.replaceChildren();
  }
}

export async function setSourceCalibrationWorkspaceResult(contentNode) {
  const workspace = await mountSourceCalibrationWorkspace();
  const target = workspace?.querySelector('[data-model-source-calibration-workspace-result]');
  const question = workspace?.querySelector('[data-model-source-calibration-workspace-question]');

  if (!target) return;
  const safeContentNode = cloneWorkspaceContentNode(contentNode);

  if (question) {
    question.replaceChildren();
  }

  target.hidden = false;
  target.replaceChildren(safeContentNode);
}

export function updateSourceCalibrationWorkspaceProgress(percent = 0) {
  const workspace = getSourceCalibrationWorkspace();
  const progress = workspace?.querySelector('[data-model-source-calibration-workspace-progress]');

  if (!progress) return;

  const normalizedPercent = Math.max(0, Math.min(100, Number(percent || 0)));
  progress.textContent = `${Math.round(normalizedPercent)}%`;
}

// MARK: - Fragment Loading

function cloneWorkspaceContentNode(contentNode) {
  if (contentNode instanceof HTMLElement) {
    return contentNode.cloneNode(true);
  }

  const fallback = document.createElement('div');
  return fallback;
}

async function loadSourceCalibrationWorkspaceFragment() {
  const response = await fetch('/assets/fragments/layers/website/model/foundation/source-calibration/model-source-calibration-workspace.html', {
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error('Unable to load Source Calibration workspace fragment.');
  }

  const wrapper = document.createElement('div');
  wrapper.innerHTML = await response.text();

  const workspace = wrapper.querySelector('[data-model-source-calibration-workspace]');
  if (workspace) {
    document.body.append(workspace);
  }
}

function bindSourceCalibrationWorkspaceProgress() {
  document.addEventListener('model:source-calibration-progress-updated', (event) => {
    updateSourceCalibrationWorkspaceProgress(event.detail?.percent || 0);
  });
}

// MARK: - Events

function bindSourceCalibrationWorkspace(workspace) {
  workspace.addEventListener('click', (event) => {
    const closeTarget = event.target.closest('[data-model-source-calibration-workspace-close]');
    if (!closeTarget) return;

    event.preventDefault();
    closeSourceCalibrationWorkspace();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    const activeWorkspace = getSourceCalibrationWorkspace();
    if (!activeWorkspace || activeWorkspace.hidden) return;

    closeSourceCalibrationWorkspace();
  });
}