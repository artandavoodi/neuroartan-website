// MARK: - Source Calibration Controller
// Source owns the reusable assessment controller pattern for Foundation calibrations.

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
  closeSourceCalibrationWorkspace,
  openSourceCalibrationWorkspace,
  setSourceCalibrationWorkspaceQuestion,
} from './workspace/model-source-calibration-workspace.js';

import {
  hideModelInformativeFooter,
  showModelInformativeFooter,
} from '../../shared/informative-footer/model-informative-footer.js';

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

  if (state.status === 'active' && state.workspaceOpen === true) {
    void renderActiveSourceCalibrationQuestion();
  }

  if (state.status === 'complete') {
    clearSourceCalibrationQuestion(sourceCalibrationRoot);
    renderSourceCalibrationResult(sourceCalibrationRoot, state.result, state.results);
    void renderSourceCalibrationInformativeFooter();
  }

  if (state.status !== 'complete') {
    hideModelInformativeFooter();
  }

  return state;
}


// MARK: - Shared Assessment Behavior

export function bindSourceAssessmentEvents({
  root,
  selectors,
  state,
  workspace,
  renderer,
  scoring,
  footer,
  persistence,
  labels,
  changelog,
}) {
  if (!(root instanceof HTMLElement)) return;

  const handleClick = (event) => {
    const startButton = event.target.closest(selectors.start);
    const previousButton = event.target.closest(selectors.previous);
    const nextButton = event.target.closest(selectors.next);

    if (startButton) {
      event.preventDefault();
      void handleAssessmentStart();
      return;
    }

    if (previousButton) {
      event.preventDefault();
      void handleAssessmentPrevious();
      return;
    }

    if (nextButton) {
      event.preventDefault();
      void handleAssessmentNext();
    }
  };

  const handleInput = (event) => {
    const slider = event.target.closest(selectors.answer);

    if (!slider) {
      return;
    }

    state.recordAnswer(slider.dataset.questionId, slider.value);
    renderer.renderStatus(root, state.getState());
  };

  const handleCommittedAnswer = (event) => {
    const slider = event.target.closest(selectors.answer);

    if (!slider) {
      return;
    }

    state.recordAnswer(slider.dataset.questionId, slider.value);
    void handleAssessmentNext();
  };

  const handleDraftAction = (event) => {
    const saveButton = event.target.closest(selectors.saveDraft);
    const restartButton = event.target.closest(selectors.restartDraft);

    if (saveButton) {
      event.preventDefault();
      handleAssessmentSaveDraft();
      return;
    }

    if (restartButton) {
      event.preventDefault();
      void handleAssessmentRestartDraft();
    }
  };

  document.addEventListener('click', handleClick);
  document.addEventListener('click', handleDraftAction);
  document.addEventListener('input', handleInput);
  document.addEventListener('change', handleCommittedAnswer);

  document.addEventListener(workspace.closedEventName, () => {
    const currentState = state.getState();

    if (currentState.status !== 'active') {
      return;
    }

    state.markWorkspaceClosed();
    renderAssessmentDraftDecision();
  });

  function handleAssessmentSaveDraft() {
    state.saveDraft();
    removeAssessmentDraftDecision();
    renderer.clearQuestion(root);
    renderer.renderStatus(root, state.getState());
  }

  async function handleAssessmentRestartDraft() {
    previousSourceCalibrationResult = state.getState().result || null;
    removeAssessmentDraftDecision();
    footer.hide();
    state.restartDraft();
    renderer.clearQuestion(root);
    renderer.renderStatus(root, state.getState());
  }

  async function handleAssessmentStart() {
    removeAssessmentDraftDecision();
    footer.hide();

    const currentState = state.getState();

    if (currentState.status === 'active' && currentState.sessionId) {
      previousSourceCalibrationResult = currentState.result || previousSourceCalibrationResult || null;
      state.resumeDraft();
      await workspace.open();
      await renderActiveAssessmentQuestion();
      renderer.renderStatus(root, state.getState());
      return;
    }

    previousSourceCalibrationResult = currentState.result || null;
    await workspace.open();
    state.markWorkspaceOpen();
    state.startSession();
    await renderActiveAssessmentQuestion();
    renderer.renderStatus(root, state.getState());
  }

  async function handleAssessmentPrevious() {
    state.movePrevious();
    await renderActiveAssessmentQuestion();
    renderer.renderStatus(root, state.getState());
  }

  async function handleAssessmentNext() {
    const currentState = state.getState();
    const question = state.getCurrentQuestion();

    if (!question) {
      return;
    }

    if (currentState.answers?.[question.id] === undefined) {
      state.recordAnswer(question.id, currentState.scale?.scale?.default ?? 5);
    }

    const latestState = state.getState();
    const questions = latestState.questions?.questions || [];
    const isLastQuestion = latestState.currentIndex >= latestState.questionOrder.length - 1;

    if (isLastQuestion && scoring.isComplete({ questions, answers: latestState.answers })) {
      void completeCurrentAssessment();
      return;
    }

    state.moveNext();
    await renderActiveAssessmentQuestion();
    renderer.renderStatus(root, state.getState());
  }

  async function completeCurrentAssessment() {
    const currentState = state.getState();
    const result = scoring.score({
      questions: currentState.questions?.questions || [],
      answers: currentState.answers || {},
      results: currentState.results,
    });

    state.completeSession(result);
    refreshSourceCalibration();
    await renderCompletedAssessmentResultInWorkspace();
    previousSourceCalibrationResult = null;

    try {
      await persistence.saveResult(result, currentState);

      document.dispatchEvent(new CustomEvent('model:changelog-refresh-request', {
        detail: changelog,
      }));
    } catch (error) {
      console.warn(labels.persistenceFailureWarning, error);
    }
  }

  async function renderActiveAssessmentQuestion() {
    const currentState = state.getState();
    const question = state.getCurrentQuestion();
    const progress = state.getProgress();

    if (!question) {
      return;
    }

    renderer.renderQuestion(root, currentState, question, progress);
    renderer.renderStatus(root, state.getState());

    const questionNode = root.querySelector(selectors.question);
    if (questionNode) {
      await workspace.setQuestion(questionNode);
      renderer.clearQuestion(root);
    }
  }

  async function renderCompletedAssessmentResultInWorkspace() {
    workspace.close();
    renderer.clearQuestion(root);
    await footer.renderComplete(root);
  }


  function renderAssessmentDraftDecision() {
    removeAssessmentDraftDecision();

    const layer = document.createElement('section');
    layer.className = 'ui-confirm-layer profile-filter-overlay__confirm-layer';
    layer.dataset.modelSourceCalibrationDraftDecision = '';
    layer.setAttribute('role', 'dialog');
    layer.setAttribute('aria-modal', 'true');
    layer.setAttribute('aria-label', labels.saveDraftDialogLabel);

    layer.innerHTML = `
      <article class="ui-confirm-card profile-filter-overlay__confirm-card">
        <strong>${labels.saveDraftTitle}</strong>
        <p>${labels.saveDraftCopy}</p>
        <div class="profile-filter-overlay__options">
          <button class="profile-filter-overlay__chip" type="button" ${selectors.restartDraft.replace('[', '').replace(']', '')}>Restart</button>
          <button class="profile-filter-overlay__chip" type="button" ${selectors.saveDraft.replace('[', '').replace(']', '')}>Save draft</button>
        </div>
      </article>
    `;

    document.body.append(layer);
    layer.querySelector(selectors.saveDraft)?.focus?.();
  }

  function removeAssessmentDraftDecision() {
    document.querySelector(selectors.draftDecision)?.remove();
  }

  return {
    renderActiveAssessmentQuestion,
  };
}

// MARK: - Event Binding

function bindSourceCalibrationEvents(root) {
  bindSourceAssessmentEvents({
    root,
    selectors: {
      start: '[data-model-source-calibration-start]',
      previous: '[data-model-source-calibration-previous]',
      next: '[data-model-source-calibration-next]',
      answer: '[data-model-source-calibration-answer]',
      question: '[data-model-source-calibration-question]',
      saveDraft: '[data-model-source-calibration-save-draft]',
      restartDraft: '[data-model-source-calibration-restart-draft]',
      draftDecision: '[data-model-source-calibration-draft-decision]',
    },
    state: {
      getState: getSourceCalibrationState,
      getCurrentQuestion: getCurrentSourceCalibrationQuestion,
      getProgress: getSourceCalibrationProgress,
      recordAnswer: recordSourceCalibrationAnswer,
      saveDraft: saveSourceCalibrationDraft,
      restartDraft: restartSourceCalibrationDraft,
      resumeDraft: resumeSourceCalibrationDraft,
      markWorkspaceOpen: markSourceCalibrationWorkspaceOpen,
      markWorkspaceClosed: markSourceCalibrationWorkspaceClosed,
      startSession: startSourceCalibrationSession,
      movePrevious: moveSourceCalibrationPrevious,
      moveNext: moveSourceCalibrationNext,
      completeSession: completeSourceCalibrationSession,
    },
    workspace: {
      open: openSourceCalibrationWorkspace,
      close: closeSourceCalibrationWorkspace,
      setQuestion: setSourceCalibrationWorkspaceQuestion,
      closedEventName: 'model:source-calibration-workspace-closed',
    },
    renderer: {
      clearQuestion: clearSourceCalibrationQuestion,
      renderQuestion: renderSourceCalibrationQuestion,
      renderStatus: renderSourceCalibrationStatus,
    },
    scoring: {
      isComplete: isSourceCalibrationComplete,
      score: scoreSourceCalibration,
    },
    footer: {
      hide: hideModelInformativeFooter,
      renderComplete: renderSourceCalibrationInformativeFooter,
    },
    persistence: {
      saveResult: persistSourceCalibrationResult,
    },
    labels: {
      start: 'Start Source Calibration',
      recalibrate: 'Recalibrate Source',
      saveDraftDialogLabel: 'Save Source draft',
      saveDraftTitle: 'Save Source draft',
      saveDraftCopy: 'Save current answers privately or restart from the beginning?',
      persistenceFailureWarning: '[Neuroartan][Source Calibration] Supabase persistence failed.',
    },
    changelog: {
      source: 'source_calibration',
      area: 'foundation',
      pane: 'sources',
    },
  });
}

async function persistSourceCalibrationResult(result, state) {
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

async function renderSourceCalibrationInformativeFooter() {
  if (!sourceCalibrationRoot) {
    return;
  }

  await showModelInformativeFooter({
    host: sourceCalibrationRoot,
    title: 'Source Calibration complete',
    html: 'Your private Source Profile has been saved. Open <button class="model-informative-footer__link" type="button" data-model-source-summary-link>Summary</button> to review details.',
  });
}