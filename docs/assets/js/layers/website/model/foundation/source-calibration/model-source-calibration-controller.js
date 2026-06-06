// MARK: - Source Calibration Controller

import {
  completeSourceCalibrationSession,
  getCurrentSourceCalibrationQuestion,
  getSourceCalibrationProgress,
  getSourceCalibrationState,
  loadSourceCalibrationRegistry,
  moveSourceCalibrationNext,
  moveSourceCalibrationPrevious,
  recordSourceCalibrationAnswer,
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
  getOwnedCanonicalModel,
  readLatestModelSourceCalibrationResult,
  saveModelSourceCalibrationResult,
} from '../../../system/model/model-store.js';

let sourceCalibrationRoot = null;
let sourceCalibrationInitialized = false;

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
  const hydratedState = await hydrateLatestSourceCalibrationResult(state);
  renderSourceCalibrationStatus(sourceCalibrationRoot, hydratedState);
  refreshSourceCalibration();

  return hydratedState;
}

export function refreshSourceCalibration() {
  const state = getSourceCalibrationState();

  if (!sourceCalibrationRoot) {
    return state;
  }

  renderSourceCalibrationStatus(sourceCalibrationRoot, state);

  if (state.status === 'active') {
    renderActiveSourceCalibrationQuestion();
  }

  if (state.status === 'complete') {
    clearSourceCalibrationQuestion(sourceCalibrationRoot);
    renderSourceCalibrationResult(sourceCalibrationRoot, state.result, state.results);
  }

  return state;
}

// MARK: - Event Binding

function bindSourceCalibrationEvents(root) {
  root.addEventListener('click', (event) => {
    const startButton = event.target.closest('[data-model-source-calibration-start]');
    const previousButton = event.target.closest('[data-model-source-calibration-previous]');
    const nextButton = event.target.closest('[data-model-source-calibration-next]');

    if (startButton) {
      event.preventDefault();
      handleSourceCalibrationStart();
      return;
    }

    if (previousButton) {
      event.preventDefault();
      handleSourceCalibrationPrevious();
      return;
    }

    if (nextButton) {
      event.preventDefault();
      handleSourceCalibrationNext();
    }
  });

  root.addEventListener('input', (event) => {
    const slider = event.target.closest('[data-model-source-calibration-answer]');

    if (!slider) {
      return;
    }

    recordSourceCalibrationAnswer(slider.dataset.questionId, slider.value);
    renderSourceCalibrationStatus(root, getSourceCalibrationState());
  });
}

// MARK: - Handlers

function handleSourceCalibrationStart() {
  startSourceCalibrationSession();
  renderActiveSourceCalibrationQuestion();
  renderSourceCalibrationStatus(sourceCalibrationRoot, getSourceCalibrationState());
}

function handleSourceCalibrationPrevious() {
  moveSourceCalibrationPrevious();
  renderActiveSourceCalibrationQuestion();
  renderSourceCalibrationStatus(sourceCalibrationRoot, getSourceCalibrationState());
}

function handleSourceCalibrationNext() {
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
    completeCurrentSourceCalibration();
    return;
  }

  moveSourceCalibrationNext();
  renderActiveSourceCalibrationQuestion();
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

async function getActiveSourceCalibrationModel() {
  const model = await getOwnedCanonicalModel();

  return {
    id: model?.id || '',
    profile_id: model?.profile_id || '',
  };
}

// MARK: - Rendering

function renderActiveSourceCalibrationQuestion() {
  const state = getSourceCalibrationState();
  const question = getCurrentSourceCalibrationQuestion();
  const progress = getSourceCalibrationProgress();

  if (!sourceCalibrationRoot || !question) {
    return;
  }

  renderSourceCalibrationQuestion(sourceCalibrationRoot, state, question, progress);
}