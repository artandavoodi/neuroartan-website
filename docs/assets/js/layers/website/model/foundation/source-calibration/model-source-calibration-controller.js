// MARK: - Source Calibration Controller

import {
  completeSourceCalibrationSession,
  getCurrentSourceCalibrationQuestion,
  getSourceCalibrationProgress,
  getSourceCalibrationState,
  loadSourceCalibrationRegistry,
  markSourceCalibrationWorkspaceClosed,
  markSourceCalibrationWorkspaceOpen,
  moveSourceCalibrationNext,
  moveSourceCalibrationPrevious,
  recordSourceCalibrationAnswer,
  restartSourceCalibrationDraft,
  resumeSourceCalibrationDraft,
  saveSourceCalibrationDraft,
  setSourceCalibrationState,
  startSourceCalibrationSession,
} from './model-source-calibration-state.js';

import {
  isSourceCalibrationComplete,
  scoreSourceCalibration,
} from './model-source-calibration-scoring.js';

import {
  clearSourceCalibrationQuestion,
  renderSourceCalibrationQuestion,
  renderSourceCalibrationResult,
  renderSourceCalibrationStatus,
} from './model-source-calibration-renderer.js';

import {
  openSourceCalibrationWorkspace,
  setSourceCalibrationWorkspaceQuestion,
  setSourceCalibrationWorkspaceResult,
} from './workspace/model-source-calibration-workspace.js';

import {
  getOwnedCanonicalModel,
  readLatestModelSourceCalibrationResult,
  saveModelSourceCalibrationResult,
} from '../../../system/model/model-store.js';

let sourceCalibrationRoot = null;
let sourceCalibrationInitialized = false;
let previousSourceCalibrationResult = null;

// MARK: - Public API

export async function initializeSourceCalibration(root = document) {
  sourceCalibrationRoot = root?.querySelector?.('[data-model-foundation-group="sources"]') || null;

  if (!sourceCalibrationRoot || sourceCalibrationInitialized) {
    return getSourceCalibrationState();
  }

  sourceCalibrationInitialized = true;
  bindSourceCalibrationEvents(sourceCalibrationRoot);
  renderSourceCalibrationStatus(sourceCalibrationRoot, getSourceCalibrationState());

  const state = await loadSourceCalibrationRegistry();
  const hydratedState = state.status === 'active'
    ? state
    : await hydrateLatestSourceCalibrationResult(state);

  renderSourceCalibrationStatus(sourceCalibrationRoot, hydratedState);
  refreshSourceCalibration();

  if (hydratedState.status === 'active' && hydratedState.workspaceOpen === true) {
    void restoreActiveSourceCalibrationWorkspace();
  }

  return hydratedState;
}

export function refreshSourceCalibration() {
  const state = getSourceCalibrationState();

  if (!sourceCalibrationRoot) {
    return state;
  }

  renderSourceCalibrationStatus(sourceCalibrationRoot, state);

  updateSourceCalibrationPrimaryAction(state);

  if (state.status === 'active' && state.workspaceOpen === true) {
    void renderActiveSourceCalibrationQuestion();
  }

  if (state.status === 'complete') {
    clearSourceCalibrationQuestion(sourceCalibrationRoot);
    renderSourceCalibrationResult(sourceCalibrationRoot, state.result, state.results);
  }

  return state;
}

// MARK: - Event Binding

function bindSourceCalibrationEvents(root) {
  const handleClick = (event) => {
    const startButton = event.target.closest('[data-model-source-calibration-start]');
    const previousButton = event.target.closest('[data-model-source-calibration-previous]');
    const nextButton = event.target.closest('[data-model-source-calibration-next]');

    if (startButton) {
      event.preventDefault();
      void handleSourceCalibrationStart();
      return;
    }

    if (previousButton) {
      event.preventDefault();
      void handleSourceCalibrationPrevious();
      return;
    }

    if (nextButton) {
      event.preventDefault();
      void handleSourceCalibrationNext();
    }
  };

  const handleInput = (event) => {
    const slider = event.target.closest('[data-model-source-calibration-answer]');

    if (!slider) {
      return;
    }

    recordSourceCalibrationAnswer(slider.dataset.questionId, slider.value);
    renderSourceCalibrationStatus(root, getSourceCalibrationState());
  };

  const handleCommittedAnswer = (event) => {
    const slider = event.target.closest('[data-model-source-calibration-answer]');

    if (!slider) {
      return;
    }

    recordSourceCalibrationAnswer(slider.dataset.questionId, slider.value);
    void handleSourceCalibrationNext();
  };

  const handleDraftAction = (event) => {
    const saveButton = event.target.closest('[data-model-source-calibration-save-draft]');
    const restartButton = event.target.closest('[data-model-source-calibration-restart-draft]');

    if (saveButton) {
      event.preventDefault();
      handleSourceCalibrationSaveDraft();
      return;
    }

    if (restartButton) {
      event.preventDefault();
      void handleSourceCalibrationRestartDraft();
      return;
    }
  };

  document.addEventListener('click', handleClick);
  document.addEventListener('click', handleDraftAction);
  document.addEventListener('input', handleInput);
  document.addEventListener('change', handleCommittedAnswer);

  document.addEventListener('model:source-calibration-workspace-closed', () => {
    const state = getSourceCalibrationState();

    if (state.status !== 'active') {
      return;
    }

    markSourceCalibrationWorkspaceClosed();
    renderSourceCalibrationDraftDecision();
  });
}

function handleSourceCalibrationSaveDraft() {
  saveSourceCalibrationDraft();
  removeSourceCalibrationDraftDecision();
  clearSourceCalibrationQuestion(sourceCalibrationRoot);
  renderSourceCalibrationStatus(sourceCalibrationRoot, getSourceCalibrationState());
  updateSourceCalibrationPrimaryAction(getSourceCalibrationState());
}

async function handleSourceCalibrationRestartDraft() {
  previousSourceCalibrationResult = getSourceCalibrationState().result || null;
  removeSourceCalibrationDraftDecision();
  restartSourceCalibrationDraft();
  clearSourceCalibrationQuestion(sourceCalibrationRoot);
  renderSourceCalibrationStatus(sourceCalibrationRoot, getSourceCalibrationState());
  updateSourceCalibrationPrimaryAction(getSourceCalibrationState());
}

async function handleSourceCalibrationStart() {
  removeSourceCalibrationDraftDecision();

  const state = getSourceCalibrationState();

  if (state.status === 'active' && state.sessionId) {
    previousSourceCalibrationResult = state.result || previousSourceCalibrationResult || null;
    resumeSourceCalibrationDraft();
    await openSourceCalibrationWorkspace();
    await renderActiveSourceCalibrationQuestion();
    renderSourceCalibrationStatus(sourceCalibrationRoot, getSourceCalibrationState());
    return;
  }

  previousSourceCalibrationResult = state.result || null;
  await openSourceCalibrationWorkspace();
  markSourceCalibrationWorkspaceOpen();
  startSourceCalibrationSession();
  await renderActiveSourceCalibrationQuestion();
  renderSourceCalibrationStatus(sourceCalibrationRoot, getSourceCalibrationState());
}

async function handleSourceCalibrationPrevious() {
  moveSourceCalibrationPrevious();
  await renderActiveSourceCalibrationQuestion();
  renderSourceCalibrationStatus(sourceCalibrationRoot, getSourceCalibrationState());
}

async function handleSourceCalibrationNext() {
  const state = getSourceCalibrationState();
  const question = getCurrentSourceCalibrationQuestion();

  if (!question) {
    return;
  }

  if (state.answers?.[question.id] === undefined) {
    recordSourceCalibrationAnswer(question.id, state.scale?.scale?.default ?? 5);
  }

  const latestState = getSourceCalibrationState();
  const questions = latestState.questions?.questions || [];
  const isLastQuestion = latestState.currentIndex >= latestState.questionOrder.length - 1;

  if (isLastQuestion && isSourceCalibrationComplete({ questions, answers: latestState.answers })) {
    void completeCurrentSourceCalibration();
    return;
  }

  moveSourceCalibrationNext();
  await renderActiveSourceCalibrationQuestion();
  renderSourceCalibrationStatus(sourceCalibrationRoot, getSourceCalibrationState());
}

async function completeCurrentSourceCalibration() {
  const state = getSourceCalibrationState();
  const result = scoreSourceCalibration({
    questions: state.questions?.questions || [],
    answers: state.answers || {},
    results: state.results,
  });

  completeSourceCalibrationSession(result);
  refreshSourceCalibration();
  await renderCompletedSourceCalibrationResultInWorkspace();
  previousSourceCalibrationResult = null;

  try {
    await saveModelSourceCalibrationResult(await getActiveSourceCalibrationModel(), {
      result,
      answers: state.answers || {},
      questions: state.questions,
      scale: state.scale,
      results: state.results,
      calibration_version: result.version || '0.1.0',
      question_version: state.questions?.version || '0.1.0',
      scale_version: state.scale?.version || '0.1.0',
      results_version: state.results?.version || '0.1.0',
      consent_state: 'source_calibration_completed',
    });

    document.dispatchEvent(new CustomEvent('model:changelog-refresh-request', {
      detail: {
        source: 'source_calibration',
        area: 'foundation',
        pane: 'sources',
      },
    }));
  } catch (error) {
    console.warn('[Neuroartan][Source Calibration] Supabase persistence failed.', error);
  }
}

async function hydrateLatestSourceCalibrationResult(state) {
  try {
    const model = await getActiveSourceCalibrationModel();
    const latest = await readLatestModelSourceCalibrationResult(model.id);

    if (!latest) {
      return state;
    }

    const result = latest.result_payload || {
      schema: 'neuroartan.model.foundation.source_calibration.result',
      version: '0.1.0',
      status: 'hydrated',
      completed_at: latest.created_at,
      cognitive_orientation_index: latest.cognitive_orientation_index,
      dominant_orientation: latest.dominant_orientation,
      source_readiness: latest.source_readiness,
      orientation_scores: latest.orientation_scores || {},
      construct_scores: latest.construct_scores || {},
      dimension_scores: latest.dimension_scores || {},
      dimension_outputs: latest.dimension_outputs || {},
      source_readiness_summary: latest.source_readiness_summary || '',
    };

    return setSourceCalibrationState({
      ...state,
      status: 'complete',
      result,
    });
  } catch (error) {
    console.warn('[Neuroartan][Source Calibration] Latest result hydration failed.', error);
    return state;
  }
}

async function restoreActiveSourceCalibrationWorkspace() {
  await openSourceCalibrationWorkspace();
  await renderActiveSourceCalibrationQuestion();
  renderSourceCalibrationStatus(sourceCalibrationRoot, getSourceCalibrationState());
}

async function getActiveSourceCalibrationModel() {
  const model = await getOwnedCanonicalModel();

  return {
    id: model?.id || '',
    profile_id: model?.profile_id || '',
  };
}

function updateSourceCalibrationPrimaryAction(state) {
  const button = sourceCalibrationRoot?.querySelector('[data-model-source-calibration-start]');
  if (!button) return;

  if (state.status === 'active') {
    button.disabled = false;
    button.textContent = 'Continue Source Calibration';
    return;
  }

  if (state.status === 'complete') {
    button.disabled = false;
    button.textContent = 'Recalibrate Source';
    return;
  }

  if (state.status === 'ready') {
    button.disabled = false;
    button.textContent = 'Start Source Calibration';
  }
}

function renderSourceCalibrationDraftDecision() {
  removeSourceCalibrationDraftDecision();

  const layer = document.createElement('section');
  layer.className = 'ui-confirm-layer';
  layer.dataset.modelSourceCalibrationDraftDecision = '';
  layer.setAttribute('role', 'dialog');
  layer.setAttribute('aria-modal', 'true');
  layer.setAttribute('aria-label', 'Save Source Calibration draft');

  layer.innerHTML = `
    <article class="ui-confirm-card">
      <h2>Save Source Calibration draft?</h2>
      <p>Your current answers can be saved as a private draft so you can continue later from the same question, or the calibration can be reset from the beginning.</p>
      <div class="ui-confirm-actions">
        <button class="ui-button ui-button--secondary" type="button" data-model-source-calibration-restart-draft>Restart</button>
        <button class="ui-button ui-button--primary" type="button" data-model-source-calibration-save-draft>Save draft</button>
      </div>
    </article>
  `;

  document.body.append(layer);
}

function removeSourceCalibrationDraftDecision() {
  document.querySelector('[data-model-source-calibration-draft-decision]')?.remove();
}

// MARK: - Rendering

async function renderActiveSourceCalibrationQuestion() {
  const state = getSourceCalibrationState();
  const question = getCurrentSourceCalibrationQuestion();
  const progress = getSourceCalibrationProgress();

  if (!sourceCalibrationRoot || !question) {
    return;
  }

  renderSourceCalibrationQuestion(sourceCalibrationRoot, state, question, progress);
  renderSourceCalibrationStatus(sourceCalibrationRoot, getSourceCalibrationState());

  const questionNode = sourceCalibrationRoot.querySelector('[data-model-source-calibration-question]');
  if (questionNode) {
    await setSourceCalibrationWorkspaceQuestion(questionNode);
    clearSourceCalibrationQuestion(sourceCalibrationRoot);
  }
}

async function renderCompletedSourceCalibrationResultInWorkspace() {
  if (!sourceCalibrationRoot) {
    return;
  }

  const resultNode = sourceCalibrationRoot.querySelector('[data-model-source-calibration-result]');
  if (resultNode) {
    await setSourceCalibrationWorkspaceResult(resultNode);
    resultNode.remove();
  }
}