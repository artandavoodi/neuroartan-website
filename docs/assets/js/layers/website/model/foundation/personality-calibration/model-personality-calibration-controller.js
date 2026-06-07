// MARK: - Personality Calibration Controller
// Personality Calibration consumes Source assessment behavior and supplies only Personality data, scoring, and labels.

import {
  getPersonalityCalibrationState,
  hydratePersonalityCalibrationState,
  resetPersonalityCalibrationState,
  setPersonalityCalibrationAnswer,
  setPersonalityCalibrationIndex,
  setPersonalityCalibrationQuestions,
  setPersonalityCalibrationResult,
  setPersonalityCalibrationWorkspaceOpen,
} from './model-personality-calibration-state.js';
import {
  isPersonalityCalibrationComplete,
  scorePersonalityCalibration,
} from './model-personality-calibration-scoring.js';
import {
  renderPersonalityCalibrationQuestion,
} from './model-personality-calibration-renderer.js';
import {
  closePersonalityCalibrationWorkspace,
  openPersonalityCalibrationWorkspace,
  setPersonalityCalibrationWorkspaceContent,
  updatePersonalityCalibrationWorkspaceProgress,
} from './workspace/model-personality-calibration-workspace.js';
import {
  hideModelInformativeFooter,
  showModelInformativeFooter,
} from '../../shared/informative-footer/model-informative-footer.js';

import {
  getOwnedCanonicalModel,
  readLatestModelPersonalityCalibrationResult,
  saveModelPersonalityCalibrationResult,
} from '../../../system/model/model-store.js';

const PERSONALITY_QUESTIONS_URL = '/assets/data/website/model-foundation/personality-calibration/personality-calibration-questions.json';

let personalityCalibrationInitialized = false;
let personalityCalibrationRoot = null;
let personalityCalibrationSessionActive = false;
let latestPersonalityCalibrationResult = null;

// MARK: - Public API

export async function initializePersonalityCalibration(root = document) {
  personalityCalibrationRoot = root.querySelector?.('[data-model-personality-calibration-root]') || document.querySelector('[data-model-personality-calibration-root]');

  if (personalityCalibrationInitialized) {
    bindPersonalityCalibrationEvents(root);
    refreshPersonalityCalibration(root);

    const state = getPersonalityAssessmentState();
    if (state.status === 'active' && state.workspaceOpen === true) {
      personalityCalibrationSessionActive = true;
      void restoreActivePersonalityCalibrationWorkspace(root);
    }

    return getPersonalityCalibrationState();
  }

  hydratePersonalityCalibrationState();

  const state = getPersonalityCalibrationState();
  const shouldRestoreActiveWorkspace = state.status === 'active' && state.workspaceOpen === true && !state.completed;
  const questions = await loadPersonalityCalibrationQuestions();
  const shouldRefreshQuestions = shouldRefreshPersonalityQuestions(state.questions, questions);

  if (shouldRefreshQuestions) {
    setPersonalityCalibrationQuestions(questions);
  }

  if (!shouldRestoreActiveWorkspace) {
    await hydrateLatestPersonalityCalibrationResult();
  } else {
    latestPersonalityCalibrationResult = null;
  }

  bindPersonalityCalibrationEvents(root);
  refreshPersonalityCalibration(root);
  personalityCalibrationInitialized = true;

  const hydratedState = getPersonalityAssessmentState();
  if (shouldRestoreActiveWorkspace || (hydratedState.status === 'active' && hydratedState.workspaceOpen === true && !hydratedState.completed)) {
    personalityCalibrationSessionActive = true;
    void restoreActivePersonalityCalibrationWorkspace(root);
  }

  return getPersonalityCalibrationState();
}

export function refreshPersonalityCalibration(root = document) {
  const container = root.querySelector?.('[data-model-personality-calibration-root]') || document.querySelector('[data-model-personality-calibration-root]');
  if (!container) return;

  const assessmentState = getPersonalityAssessmentState();
  const isActiveWorkspace = assessmentState.status === 'active' && assessmentState.workspaceOpen === true && !assessmentState.completed;
  const latestResult = isActiveWorkspace ? null : readLatestPersonalityCalibrationResult();
  const latestPayload = latestResult?.result_payload || latestResult || null;
  const hasCompleteResult = !isActiveWorkspace && Boolean(
    latestPayload
    && latestPayload.summary_metrics
    && Object.keys(latestPayload.summary_metrics).length
  );

  renderPersonalityCalibrationStatus(root, {
    ...assessmentState,
    status: hasCompleteResult ? 'complete' : 'ready',
    result: latestResult,
  });

  if (hasCompleteResult) {
    void renderPersonalityCalibrationInformativeFooter(container);
    return;
  }

  hideModelInformativeFooter();
}

export function readLatestPersonalityCalibrationResult() {
  return latestPersonalityCalibrationResult || getPersonalityCalibrationState().result || null;
}

export function resetPersonalityCalibration() {
  personalityCalibrationSessionActive = false;
  latestPersonalityCalibrationResult = null;
  resetPersonalityCalibrationState();
  closePersonalityCalibrationWorkspace({ emitCloseEvent: false });
  refreshPersonalityCalibration();
}

// MARK: - Loading

async function loadPersonalityCalibrationQuestions() {
  const response = await fetch(PERSONALITY_QUESTIONS_URL, { cache: 'no-store' });

  if (!response.ok) {
    throw new Error('Unable to load Personality Calibration questions.');
  }

  const payload = await response.json();
  return Array.isArray(payload.questions) ? payload.questions : [];
}

function shouldRefreshPersonalityQuestions(currentQuestions = [], latestQuestions = []) {
  if (!Array.isArray(latestQuestions) || !latestQuestions.length) {
    return false;
  }

  if (!Array.isArray(currentQuestions) || !currentQuestions.length) {
    return true;
  }

  if (currentQuestions.length !== latestQuestions.length) {
    return true;
  }

  const currentIds = currentQuestions.map((question) => question?.id).filter(Boolean).join('|');
  const latestIds = latestQuestions.map((question) => question?.id).filter(Boolean).join('|');

  return currentIds !== latestIds;
}


// MARK: - Personality Assessment Events

function bindPersonalityCalibrationEvents(root = document) {
  if (root.dataset.personalityCalibrationEventsBound === 'true') {
    return;
  }

  root.dataset.personalityCalibrationEventsBound = 'true';

  root.addEventListener('click', (event) => {
    const startButton = event.target.closest('[data-model-personality-calibration-start]');
    const previousButton = event.target.closest('[data-model-personality-calibration-previous]');
    const saveDraftButton = event.target.closest('[data-model-personality-calibration-save-draft]');
    const restartDraftButton = event.target.closest('[data-model-personality-calibration-restart-draft]');
    const range = event.target.closest('[data-model-personality-calibration-range]');

    if (range) {
      return;
    }

    if (startButton) {
      event.preventDefault();
      void startPersonalityCalibrationFlow(root);
      return;
    }

    if (previousButton) {
      event.preventDefault();
      void showPreviousPersonalityCalibrationQuestion(root);
      return;
    }

    if (saveDraftButton) {
      event.preventDefault();
      savePersonalityCalibrationDraft();
      removePersonalityCalibrationDraftDecision();
      closePersonalityCalibrationWorkspace({ emitCloseEvent: false });
      refreshPersonalityCalibration(root);
      return;
    }

    if (restartDraftButton) {
      event.preventDefault();
      restartPersonalityCalibrationDraft();
      removePersonalityCalibrationDraftDecision();
      refreshPersonalityCalibration(root);
    }
  });

  document.addEventListener('click', (event) => {
    const previousButton = event.target.closest('[data-model-personality-calibration-previous]');
    const saveDraftButton = event.target.closest('[data-model-personality-calibration-save-draft]');
    const restartDraftButton = event.target.closest('[data-model-personality-calibration-restart-draft]');

    if (previousButton) {
      event.preventDefault();
      void showPreviousPersonalityCalibrationQuestion(root);
      return;
    }

    if (saveDraftButton) {
      event.preventDefault();
      savePersonalityCalibrationDraft();
      removePersonalityCalibrationDraftDecision();
      closePersonalityCalibrationWorkspace({ emitCloseEvent: false });
      refreshPersonalityCalibration(root);
      return;
    }

    if (restartDraftButton) {
      event.preventDefault();
      restartPersonalityCalibrationDraft();
      removePersonalityCalibrationDraftDecision();
      refreshPersonalityCalibration(root);
    }
  });

  document.addEventListener('input', (event) => {
    const range = event.target.closest('[data-model-personality-calibration-range]');
    if (!range) return;

    setPersonalityCalibrationAnswer(range.dataset.questionId || range.dataset.modelPersonalityCalibrationRange, range.value);
  });

  document.addEventListener('change', (event) => {
    const range = event.target.closest('[data-model-personality-calibration-range]');
    if (!range) return;

    event.preventDefault();
    setPersonalityCalibrationAnswer(range.dataset.questionId || range.dataset.modelPersonalityCalibrationRange, range.value);
    if (personalityCalibrationSessionActive) {
      void showNextPersonalityCalibrationQuestion(root);
    }
  });

  document.addEventListener('model:personality-calibration-workspace-closed', () => {
    const state = getPersonalityAssessmentState();

    if (!personalityCalibrationSessionActive || state.completed) {
      return;
    }

    markPersonalityCalibrationWorkspaceClosed();
    renderPersonalityCalibrationDraftDecision();
  });
}

async function startPersonalityCalibrationFlow(root = document) {
  removePersonalityCalibrationDraftDecision();
  latestPersonalityCalibrationResult = null;
  hideModelInformativeFooter();
  personalityCalibrationSessionActive = true;

  const state = getPersonalityAssessmentState();

  if (state.status === 'active' && state.sessionId && !state.completed) {
    resumePersonalityCalibrationDraft();
  } else {
    startPersonalityCalibrationSession({ restart: true });
  }

  await openPersonalityCalibrationWorkspace();
  await renderCurrentPersonalityCalibrationQuestion(root);
  refreshPersonalityCalibration(root);
}

async function restoreActivePersonalityCalibrationWorkspace(root = document) {
  removePersonalityCalibrationDraftDecision();
  hideModelInformativeFooter();
  personalityCalibrationSessionActive = true;
  markPersonalityCalibrationWorkspaceOpen();
  await openPersonalityCalibrationWorkspace();
  await renderCurrentPersonalityCalibrationQuestion(root);
  renderPersonalityCalibrationStatus(root, getPersonalityAssessmentState());
}

async function showPreviousPersonalityCalibrationQuestion(root = document) {
  movePersonalityCalibrationPrevious();
  await renderCurrentPersonalityCalibrationQuestion(root);
  renderPersonalityCalibrationStatus(root, getPersonalityAssessmentState());
}

async function showNextPersonalityCalibrationQuestion(root = document) {
  const state = getPersonalityAssessmentState();
  const question = getCurrentPersonalityCalibrationQuestion();

  if (!question) return;

  if (state.answers?.[question.id] === undefined) {
    setPersonalityCalibrationAnswer(question.id, state.scale?.scale?.default ?? 5);
  }

  const latestState = getPersonalityAssessmentState();
  const questions = Array.isArray(latestState.questions?.questions)
    ? latestState.questions.questions
    : Array.isArray(latestState.questions)
      ? latestState.questions
      : [];
  const isLastQuestion = latestState.currentIndex >= latestState.questionOrder.length - 1;

  if (isLastQuestion && isPersonalityCalibrationComplete({ questions, answers: latestState.answers })) {
    await completeCurrentPersonalityCalibration(root);
    return;
  }

  movePersonalityCalibrationNext();
  await renderCurrentPersonalityCalibrationQuestion(root);
  renderPersonalityCalibrationStatus(root, getPersonalityAssessmentState());
}

async function completeCurrentPersonalityCalibration(root = document) {
  const state = getPersonalityAssessmentState();
  const questions = Array.isArray(state.questions?.questions)
    ? state.questions.questions
    : Array.isArray(state.questions)
      ? state.questions
      : [];

  const result = scorePersonalityCalibration({
    questions,
    answers: state.answers || {},
    results: state.results || {},
  });

  personalityCalibrationSessionActive = false;
  completePersonalityCalibrationSession(result);
  await persistPersonalityCalibrationResult(result, state);
  closePersonalityCalibrationWorkspace({ emitCloseEvent: false });
  refreshPersonalityCalibration(root);
}

async function renderCurrentPersonalityCalibrationQuestion(root = document) {
  const state = getPersonalityAssessmentState();
  const question = getCurrentPersonalityCalibrationQuestion();
  const progress = getPersonalityCalibrationProgress();

  if (!question) return;

  const value = state.answers?.[question.id] ?? 5;
  const node = renderPersonalityCalibrationQuestion({
    question,
    index: Math.max(0, progress.current - 1),
    total: progress.total,
    value,
  });

  await setPersonalityCalibrationWorkspaceContent(node);
  updatePersonalityCalibrationWorkspaceProgress(progress.percent);
  renderPersonalityCalibrationStatus(root, state);
}

function renderPersonalityCalibrationDraftDecision() {
  removePersonalityCalibrationDraftDecision();

  const layer = document.createElement('section');
  layer.className = 'ui-confirm-layer profile-filter-overlay__confirm-layer';
  layer.dataset.modelPersonalityCalibrationDraftDecision = '';
  layer.setAttribute('role', 'dialog');
  layer.setAttribute('aria-modal', 'true');
  layer.setAttribute('aria-label', 'Save Personality draft');

  layer.innerHTML = `
    <article class="ui-confirm-card profile-filter-overlay__confirm-card">
      <strong>Save Personality draft</strong>
      <p>Save current answers privately or restart from the beginning?</p>
      <div class="profile-filter-overlay__options">
        <button class="profile-filter-overlay__chip" type="button" data-model-personality-calibration-restart-draft>Restart</button>
        <button class="profile-filter-overlay__chip" type="button" data-model-personality-calibration-save-draft>Save draft</button>
      </div>
    </article>
  `;

  document.body.append(layer);
  layer.querySelector('[data-model-personality-calibration-save-draft]')?.focus?.();
}

function removePersonalityCalibrationDraftDecision() {
  document.querySelector('[data-model-personality-calibration-draft-decision]')?.remove();
}

// MARK: - State Adapter

function getPersonalityAssessmentState() {
  const state = getPersonalityCalibrationState();
  const questions = Array.isArray(state.questions) ? state.questions : [];

  return {
    ...state,
    status: state.completed ? 'complete' : state.status || 'ready',
    sessionId: state.sessionId || null,
    workspaceOpen: Boolean(state.workspaceOpen),
    questions: {
      version: '1.0.0',
      questions,
    },
    questionOrder: Array.isArray(state.questionOrder) && state.questionOrder.length
      ? [...state.questionOrder]
      : questions.map((question) => question.id),
    scale: {
      scale: {
        default: 5,
        min: 0,
        max: 10,
        step: 0.1,
      },
    },
    results: {},
  };
}

function getCurrentPersonalityCalibrationQuestion() {
  const state = getPersonalityCalibrationState();
  return state.questions[state.currentIndex] || null;
}

function getPersonalityCalibrationProgress() {
  const state = getPersonalityCalibrationState();
  const total = Array.isArray(state.questions) ? state.questions.length : 0;
  const currentIndex = Number.isFinite(Number(state.currentIndex)) ? Number(state.currentIndex) : 0;
  const current = total ? Math.min(total, Math.max(1, currentIndex + 1)) : 0;

  return {
    current,
    total,
    percent: total ? Math.min(100, Math.max(0, Math.round((current / total) * 100))) : 0,
  };
}

function startPersonalityCalibrationSession({ restart = false } = {}) {
  latestPersonalityCalibrationResult = null;

  if (restart) {
    const currentQuestions = getPersonalityCalibrationState().questions;
    resetPersonalityCalibrationState();
    setPersonalityCalibrationQuestions(currentQuestions);
  }

  personalityCalibrationSessionActive = true;
  setPersonalityCalibrationIndex(0);
  return setPersonalityCalibrationWorkspaceOpen(true);
}

function savePersonalityCalibrationDraft() {
  personalityCalibrationSessionActive = false;
  return setPersonalityCalibrationWorkspaceOpen(false);
}

function resumePersonalityCalibrationDraft() {
  personalityCalibrationSessionActive = true;
  return setPersonalityCalibrationWorkspaceOpen(true);
}

function restartPersonalityCalibrationDraft() {
  personalityCalibrationSessionActive = false;
  latestPersonalityCalibrationResult = null;
  resetPersonalityCalibrationState();
  closePersonalityCalibrationWorkspace({ emitCloseEvent: false });
  return getPersonalityCalibrationState();
}

function markPersonalityCalibrationWorkspaceOpen() {
  personalityCalibrationSessionActive = true;
  return setPersonalityCalibrationWorkspaceOpen(true);
}

function markPersonalityCalibrationWorkspaceClosed() {
  return setPersonalityCalibrationWorkspaceOpen(false);
}

function movePersonalityCalibrationPrevious() {
  const state = getPersonalityCalibrationState();
  return setPersonalityCalibrationIndex(state.currentIndex - 1);
}

function movePersonalityCalibrationNext() {
  const state = getPersonalityCalibrationState();
  const total = Array.isArray(state.questions) ? state.questions.length : 0;
  const nextIndex = Math.min(Math.max(0, total - 1), state.currentIndex + 1);
  return setPersonalityCalibrationIndex(nextIndex);
}

function completePersonalityCalibrationSession(result) {
  return setPersonalityCalibrationResult(result);
}

// MARK: - Rendering Adapter

function renderPersonalityCalibrationStatus(root, state) {
  const container = getPersonalityRenderRoot(root);
  if (!container) return;

  const startButton = container.querySelector('[data-model-personality-calibration-start]');
  if (startButton instanceof HTMLButtonElement) {
    startButton.disabled = false;
    startButton.textContent = state.status === 'complete' ? 'Recalibrate Personality' : 'Start Personality Calibration';
  }

  updatePersonalityCalibrationStatusCards(root, state);
}


function updatePersonalityCalibrationStatusCards(root, state) {
  const scope = root?.matches?.('[data-model-foundation-group="personality"]')
    ? root
    : root?.querySelector?.('[data-model-foundation-group="personality"]')
      || document.querySelector('[data-model-foundation-group="personality"]')
      || document;
  const payload = state?.result?.result_payload || state?.result || {};
  const metrics = payload.summary_metrics || {};
  const isComplete = state?.status === 'complete' && Boolean(payload.summary_metrics);

  const profileStatus = isComplete ? 'Calibrated' : 'Not calibrated';
  const profileDotStatus = isComplete ? 'complete' : 'pending';

  const coherenceMetric = metrics.personality_coherence_index || null;
  const coherenceStatus = getPersonalityMetricStatus(coherenceMetric, isComplete ? 'forming' : 'pending');
  const coherenceText = getPersonalityMetricText(coherenceMetric, isComplete ? 'Recorded' : 'Pending assessment');

  const readinessValue = payload.personality_readiness
    || payload.personality_readiness_state
    || metrics.personality_readiness?.value
    || null;
  const readinessScore = Number(payload.personality_readiness_score ?? metrics.personality_readiness?.score);
  const readinessStatus = getPersonalityReadinessStatus(readinessValue, readinessScore, isComplete);
  const readinessText = readinessValue ? humanizePersonalityStatus(readinessValue) : isComplete ? 'Recorded' : 'Initial';

  setPersonalityStatusCard(scope, '[data-model-personality-profile-status-dot]', '[data-model-personality-calibration-profile-status]', profileDotStatus, profileStatus);
  setPersonalityStatusCard(scope, '[data-model-personality-coherence-index-dot]', '[data-model-personality-calibration-coherence-status]', coherenceStatus, coherenceText);
  setPersonalityStatusCard(scope, '[data-model-personality-readiness-dot]', '[data-model-personality-calibration-readiness-status]', readinessStatus, readinessText);
}

function setPersonalityStatusCard(scope, dotSelector, textSelector, status, text) {
  const dot = scope.querySelector(dotSelector);
  const label = scope.querySelector(textSelector);
  const normalizedStatus = normalizePersonalityStatusToken(status);

  if (dot instanceof HTMLElement) {
    dot.dataset.status = normalizedStatus;
    dot.setAttribute('data-status', normalizedStatus);
  }

  if (label instanceof HTMLElement) {
    label.textContent = text;
  }
}

function normalizePersonalityStatusToken(status = 'pending') {
  const normalizedStatus = String(status || 'pending').toLowerCase().trim();
  const supportedStatuses = new Set(['ready', 'complete', 'calibrated', 'stable', 'pending', 'initial', 'forming', 'draft', 'error']);

  return supportedStatuses.has(normalizedStatus) ? normalizedStatus : 'pending';
}


function getPersonalityMetricStatus(metric, fallback = 'pending') {
  if (!metric || typeof metric !== 'object') {
    return fallback;
  }

  if (metric.status) {
    return String(metric.status);
  }

  const score = Number(metric.score);
  if (!Number.isFinite(score)) {
    return fallback;
  }

  if (score >= 7) return 'complete';
  if (score >= 4) return 'forming';
  return 'initial';
}

function getPersonalityMetricText(metric, fallback = 'Pending assessment') {
  if (!metric || typeof metric !== 'object') {
    return fallback;
  }

  const value = metric.value ?? metric.label ?? fallback;
  const score = Number(metric.score);

  if (!Number.isFinite(score)) {
    return String(value);
  }

  const normalizedScore = Math.round(score * 10) / 10;
  const numericValue = Number(value);

  if (Number.isFinite(numericValue) && Math.round(numericValue * 10) / 10 === normalizedScore) {
    return `${normalizedScore} / 10`;
  }

  if (String(value).trim() === String(normalizedScore)) {
    return `${normalizedScore} / 10`;
  }

  return `${value} · ${normalizedScore} / 10`;
}

function getPersonalityReadinessStatus(value, score, isComplete = false) {
  const normalizedValue = String(value || '').toLowerCase();

  if (normalizedValue.includes('complete') || normalizedValue.includes('ready')) {
    return 'complete';
  }

  if (normalizedValue.includes('forming') || normalizedValue.includes('developing')) {
    return 'forming';
  }

  if (Number.isFinite(score)) {
    if (score >= 7) return 'complete';
    if (score >= 4) return 'forming';
    return 'initial';
  }

  return isComplete ? 'forming' : 'initial';
}

function humanizePersonalityStatus(value) {
  return String(value || '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, (letter) => letter.toUpperCase());
}


function clearPersonalityCalibrationQuestion(root) {
  const container = getPersonalityRenderRoot(root);
  const question = container?.querySelector?.('[data-model-personality-calibration-question]');
  question?.remove();
}

function getPersonalityRenderRoot(root = document) {
  return root.querySelector?.('[data-model-personality-calibration-root]') || personalityCalibrationRoot || document.querySelector('[data-model-personality-calibration-root]');
}

async function renderPersonalityCalibrationInformativeFooter(host = personalityCalibrationRoot) {
  if (!host) return;

  await showModelInformativeFooter({
    host,
    title: 'Personality Calibration complete',
    html: 'Your private Personality Profile has been saved. Open <button class="model-informative-footer__link" type="button" data-model-personality-summary-link>Summary</button> to review the Personality Learn dashboard.',
  });
}

// MARK: - Persistence Adapter

async function persistPersonalityCalibrationResult(result, state = getPersonalityAssessmentState()) {
  latestPersonalityCalibrationResult = result;
  setPersonalityCalibrationResult(result);

  try {
    await saveModelPersonalityCalibrationResult(await getActivePersonalityCalibrationModel(), {
      result,
      answers: state.answers || {},
      questions: Array.isArray(state.questions?.questions)
        ? state.questions
        : {
            version: '1.0.0',
            questions: Array.isArray(state.questions) ? state.questions : [],
          },
      scale: state.scale,
      results: state.results,
      calibration_version: result.version || '0.1.0',
      question_version: state.questions?.version || '1.0.0',
      scale_version: state.scale?.version || '1.0.0',
      results_version: state.results?.version || '1.0.0',
      consent_state: 'personality_calibration_completed',
    });
  } catch (error) {
    console.warn('[Neuroartan][Personality Calibration] Supabase persistence failed.', error);
  }

  document.dispatchEvent(new CustomEvent('model:personality-calibration-completed', {
    detail: {
      result,
    },
  }));
}

async function hydrateLatestPersonalityCalibrationResult() {
  try {
    const model = await getActivePersonalityCalibrationModel();
    const latest = await readLatestModelPersonalityCalibrationResult(model.id);

    if (!latest) {
      latestPersonalityCalibrationResult = getPersonalityCalibrationState().result || null;
      return latestPersonalityCalibrationResult;
    }

    const result = latest.result_payload || {
      schema: 'neuroartan.model.foundation.personality_calibration.result',
      version: '0.1.0',
      status: 'hydrated',
      completed_at: latest.created_at,
      personality_coherence_index: latest.personality_coherence_index,
      dominant_personality_pattern: latest.dominant_personality_pattern,
      personality_readiness: latest.personality_readiness,
      dimension_scores: latest.dimension_scores || {},
      construct_scores: latest.construct_scores || {},
      summary_metrics: latest.summary_metrics || {},
      personality_readiness_summary: latest.personality_readiness_summary || '',
    };

    latestPersonalityCalibrationResult = result;
    setPersonalityCalibrationResult(result);
    return result;
  } catch (error) {
    console.warn('[Neuroartan][Personality Calibration] Latest result hydration failed.', error);
    latestPersonalityCalibrationResult = getPersonalityCalibrationState().result || null;
    return latestPersonalityCalibrationResult;
  }
}

async function getActivePersonalityCalibrationModel() {
  const model = await getOwnedCanonicalModel();

  return {
    id: model?.id || '',
    profile_id: model?.profile_id || '',
  };
}

document.addEventListener('click', (event) => {
  const summaryLink = event.target.closest('[data-model-personality-summary-link]');
  if (!summaryLink) return;

  event.preventDefault();
  document.dispatchEvent(new CustomEvent('model:personality-summary-open-request', {
    detail: {
      source: 'model-informative-footer'
    }
  }));
});
