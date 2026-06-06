// MARK: - Source Calibration State

const SOURCE_CALIBRATION_DATA_ROOT = '/assets/data/website/model-foundation/source-calibration';

const SOURCE_CALIBRATION_DATA_FILES = Object.freeze({
  questions: `${SOURCE_CALIBRATION_DATA_ROOT}/source-calibration-questions.json`,
  scale: `${SOURCE_CALIBRATION_DATA_ROOT}/source-calibration-scale.json`,
  results: `${SOURCE_CALIBRATION_DATA_ROOT}/source-calibration-results.json`,
});

const SOURCE_CALIBRATION_DEFAULT_STATE = Object.freeze({
  status: 'idle',
  sessionId: null,
  currentIndex: 0,
  questionOrder: [],
  answers: {},
  questions: null,
  scale: null,
  results: null,
  result: null,
  error: null,
});

let sourceCalibrationState = createSourceCalibrationState();

// MARK: - State Factory

export function createSourceCalibrationState(overrides = {}) {
  return {
    ...SOURCE_CALIBRATION_DEFAULT_STATE,
    questionOrder: [],
    answers: {},
    ...overrides,
  };
}

export function getSourceCalibrationDataFiles() {
  return SOURCE_CALIBRATION_DATA_FILES;
}

export function getSourceCalibrationState() {
  return sourceCalibrationState;
}

export function setSourceCalibrationState(patch = {}) {
  sourceCalibrationState = {
    ...sourceCalibrationState,
    ...patch,
  };

  return sourceCalibrationState;
}

export function resetSourceCalibrationState(overrides = {}) {
  sourceCalibrationState = createSourceCalibrationState(overrides);
  return sourceCalibrationState;
}

// MARK: - Data Loading

export async function loadSourceCalibrationRegistry() {
  setSourceCalibrationState({ status: 'loading', error: null });

  try {
    const [questions, scale, results] = await Promise.all([
      loadSourceCalibrationJson(SOURCE_CALIBRATION_DATA_FILES.questions),
      loadSourceCalibrationJson(SOURCE_CALIBRATION_DATA_FILES.scale),
      loadSourceCalibrationJson(SOURCE_CALIBRATION_DATA_FILES.results),
    ]);

    const questionOrder = createBalancedSourceQuestionOrder(questions.questions || []);

    return setSourceCalibrationState({
      status: 'ready',
      questions,
      scale,
      results,
      questionOrder,
      currentIndex: 0,
      answers: {},
      result: null,
      error: null,
    });
  } catch (error) {
    return setSourceCalibrationState({
      status: 'error',
      error,
    });
  }
}

async function loadSourceCalibrationJson(path) {
  const response = await fetch(path, { cache: 'no-store' });

  if (!response.ok) {
    throw new Error(`Unable to load Source Calibration registry: ${path}`);
  }

  return response.json();
}

// MARK: - Session State

export function startSourceCalibrationSession() {
  const state = getSourceCalibrationState();

  if (!state.questions?.questions?.length) {
    return setSourceCalibrationState({
      status: 'error',
      error: new Error('Source Calibration questions are not loaded.'),
    });
  }

  return setSourceCalibrationState({
    status: 'active',
    sessionId: createSourceCalibrationSessionId(),
    currentIndex: 0,
    answers: {},
    result: null,
    error: null,
  });
}

export function recordSourceCalibrationAnswer(questionId, value) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return getSourceCalibrationState();
  }

  const state = getSourceCalibrationState();

  return setSourceCalibrationState({
    answers: {
      ...state.answers,
      [questionId]: Math.max(0, Math.min(10, numericValue)),
    },
  });
}

export function moveSourceCalibrationNext() {
  const state = getSourceCalibrationState();
  const nextIndex = Math.min(state.currentIndex + 1, Math.max(state.questionOrder.length - 1, 0));

  return setSourceCalibrationState({ currentIndex: nextIndex });
}

export function moveSourceCalibrationPrevious() {
  const state = getSourceCalibrationState();
  const previousIndex = Math.max(state.currentIndex - 1, 0);

  return setSourceCalibrationState({ currentIndex: previousIndex });
}

export function completeSourceCalibrationSession(result) {
  return setSourceCalibrationState({
    status: 'complete',
    result,
  });
}

// MARK: - Question Helpers

export function getCurrentSourceCalibrationQuestion() {
  const state = getSourceCalibrationState();
  const questionId = state.questionOrder[state.currentIndex];

  return (state.questions?.questions || []).find((question) => question.id === questionId) || null;
}

export function getSourceCalibrationProgress() {
  const state = getSourceCalibrationState();
  const total = state.questionOrder.length;
  const answered = Object.keys(state.answers).length;

  return {
    current: total ? state.currentIndex + 1 : 0,
    total,
    answered,
    percent: total ? Math.round(((state.currentIndex + 1) / total) * 100) : 0,
    complete: total > 0 && answered >= total,
  };
}

function createBalancedSourceQuestionOrder(questions) {
  const buckets = questions.reduce((accumulator, question) => {
    const key = question.orientation_band || 'unassigned';
    accumulator[key] = accumulator[key] || [];
    accumulator[key].push(question.id);
    return accumulator;
  }, {});

  Object.values(buckets).forEach((bucket) => deterministicShuffle(bucket));

  const order = [];
  const keys = Object.keys(buckets).sort();

  while (keys.some((key) => buckets[key].length)) {
    keys.forEach((key) => {
      const next = buckets[key].shift();
      if (next) order.push(next);
    });
  }

  return order;
}

function deterministicShuffle(items) {
  items.sort((a, b) => hashString(a) - hashString(b));
  return items;
}

function hashString(value) {
  return String(value).split('').reduce((hash, character) => {
    return ((hash << 5) - hash + character.charCodeAt(0)) | 0;
  }, 0);
}

function createSourceCalibrationSessionId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `source-calibration-${Date.now()}`;
}