// MARK: - Personality Calibration Workspace
// Personality Calibration owns a separate workspace lifecycle while reusing the finalized Source workspace classes.

let personalityCalibrationWorkspace = null;
let personalityCalibrationWorkspaceMounted = false;
let personalityCalibrationWorkspaceProgressBound = false;

// MARK: - Public API

export async function mountPersonalityCalibrationWorkspace(root = document) {
  if (personalityCalibrationWorkspaceMounted && personalityCalibrationWorkspace) {
    return personalityCalibrationWorkspace;
  }

  personalityCalibrationWorkspace = root.querySelector?.('[data-model-personality-calibration-workspace]') || document.querySelector('[data-model-personality-calibration-workspace]');

  if (!personalityCalibrationWorkspace) {
    personalityCalibrationWorkspace = createPersonalityCalibrationWorkspace();
    document.body.append(personalityCalibrationWorkspace);
  }

  bindPersonalityCalibrationWorkspace(personalityCalibrationWorkspace);
  bindPersonalityCalibrationWorkspaceProgress();
  personalityCalibrationWorkspaceMounted = true;
  return personalityCalibrationWorkspace;
}

export function getPersonalityCalibrationWorkspace() {
  return personalityCalibrationWorkspace || document.querySelector('[data-model-personality-calibration-workspace]');
}

export async function openPersonalityCalibrationWorkspace() {
  const workspace = await mountPersonalityCalibrationWorkspace(document);
  workspace.hidden = false;
  workspace.setAttribute('aria-hidden', 'false');
  document.documentElement.classList.add('model-source-calibration-workspace-open');
  document.body.classList.add('model-source-calibration-workspace-open');
  return workspace;
}

export function closePersonalityCalibrationWorkspace({ emitCloseEvent = true } = {}) {
  const workspace = getPersonalityCalibrationWorkspace();
  if (!workspace) return;

  workspace.hidden = true;
  workspace.setAttribute('aria-hidden', 'true');
  document.documentElement.classList.remove('model-source-calibration-workspace-open');
  document.body.classList.remove('model-source-calibration-workspace-open');

  if (!emitCloseEvent) {
    return;
  }

  document.dispatchEvent(new CustomEvent('model:personality-calibration-workspace-closed', {
    detail: {
      source: 'personality_calibration_workspace',
    },
  }));
}

export async function setPersonalityCalibrationWorkspaceContent(contentNode) {
  const workspace = await mountPersonalityCalibrationWorkspace();
  const target = workspace?.querySelector('[data-model-personality-calibration-workspace-question]');
  const result = workspace?.querySelector('[data-model-personality-calibration-workspace-result]');

  if (!target) return null;
  const safeContentNode = cloneWorkspaceContentNode(contentNode);

  target.hidden = false;
  target.replaceChildren(safeContentNode);

  if (result) {
    result.hidden = true;
    result.replaceChildren();
  }

  return safeContentNode;
}

export async function setPersonalityCalibrationWorkspaceResult(contentNode) {
  const workspace = await mountPersonalityCalibrationWorkspace();
  const target = workspace?.querySelector('[data-model-personality-calibration-workspace-result]');
  const question = workspace?.querySelector('[data-model-personality-calibration-workspace-question]');

  if (!target) return null;
  const safeContentNode = cloneWorkspaceContentNode(contentNode);

  if (question) {
    question.hidden = true;
    question.replaceChildren();
  }

  target.hidden = false;
  target.replaceChildren(safeContentNode);
  return safeContentNode;
}

export function updatePersonalityCalibrationWorkspaceProgress(percent = 0) {
  const workspace = getPersonalityCalibrationWorkspace();
  if (!workspace) return;

  const progress = workspace.querySelector('[data-model-personality-calibration-workspace-progress]');
  if (!progress) return;

  const normalizedPercent = Math.min(100, Math.max(0, Math.round(Number(percent) || 0)));
  progress.textContent = `${normalizedPercent}%`;
}

// MARK: - Internals

function cloneWorkspaceContentNode(contentNode) {
  if (contentNode instanceof HTMLElement) {
    return contentNode.cloneNode(true);
  }

  return document.createElement('div');
}

function bindPersonalityCalibrationWorkspaceProgress() {
  if (personalityCalibrationWorkspaceProgressBound) {
    return;
  }

  personalityCalibrationWorkspaceProgressBound = true;
  document.addEventListener('model:personality-calibration-progress-updated', (event) => {
    updatePersonalityCalibrationWorkspaceProgress(event.detail?.percent || 0);
  });
}

// MARK: - Workspace Creation

function createPersonalityCalibrationWorkspace() {
  const workspace = document.createElement('section');
  workspace.className = 'model-source-calibration-workspace';
  workspace.dataset.modelPersonalityCalibrationWorkspace = '';
  workspace.hidden = true;
  workspace.setAttribute('aria-hidden', 'true');
  workspace.setAttribute('role', 'dialog');
  workspace.setAttribute('aria-modal', 'true');
  workspace.setAttribute('aria-label', 'Personality Calibration');

  workspace.innerHTML = `
    <div class="model-source-calibration-workspace__backdrop" data-model-personality-calibration-workspace-close></div>
    <article class="model-source-calibration-workspace__surface" role="dialog" aria-modal="true" aria-label="Personality Calibration workspace">
      <header class="model-source-calibration-workspace__header">
        <span class="model-source-calibration-workspace__progress" data-model-personality-calibration-workspace-progress>0%</span>
        <button class="global-close-button" type="button" data-model-personality-calibration-workspace-close aria-label="Close Personality Calibration">
          <span class="global-close-button__line global-close-button__line--first" aria-hidden="true"></span>
          <span class="global-close-button__line global-close-button__line--second" aria-hidden="true"></span>
        </button>
      </header>
      <div class="model-source-calibration-workspace__body">
        <section class="model-source-calibration-workspace__question" data-model-personality-calibration-workspace-question></section>
        <section class="model-source-calibration-workspace__result" data-model-personality-calibration-workspace-result hidden></section>
      </div>
    </article>
  `;

  return workspace;
}

// MARK: - Events

function bindPersonalityCalibrationWorkspace(workspace) {
  if (!workspace || workspace.dataset.modelPersonalityCalibrationWorkspaceBound === 'true') return;

  let closePointerStarted = false;

  workspace.addEventListener('pointerdown', (event) => {
    closePointerStarted = Boolean(event.target.closest('[data-model-personality-calibration-workspace-close]'));
  });

  workspace.addEventListener('click', (event) => {
    const closeTarget = event.target.closest('[data-model-personality-calibration-workspace-close]');
    if (!closeTarget || !closePointerStarted) {
      closePointerStarted = false;
      return;
    }

    closePointerStarted = false;
    event.preventDefault();
    closePersonalityCalibrationWorkspace();
  });

  function stopPersonalitySliderEventPropagation(event) {
    const slider = event.target.closest('[data-model-personality-calibration-range]');
    if (!slider) return;

    closePointerStarted = false;
    event.stopPropagation();
  }

  workspace.addEventListener('pointerdown', stopPersonalitySliderEventPropagation, true);
  workspace.addEventListener('pointerup', stopPersonalitySliderEventPropagation, true);
  workspace.addEventListener('click', stopPersonalitySliderEventPropagation, true);

  document.addEventListener('keydown', (event) => {
    if (workspace.hidden) return;
    if (event.key !== 'Escape') return;

    event.preventDefault();
    closePersonalityCalibrationWorkspace();
  });

  workspace.dataset.modelPersonalityCalibrationWorkspaceBound = 'true';
}
