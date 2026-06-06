// MARK: - Source Calibration State

const SOURCE_CALIBRATION_DATA_ROOT = '/assets/data/website/model-foundation/source-calibration';

const SOURCE_CALIBRATION_DATA_FILES = Object.freeze({
  questions: `${SOURCE_CALIBRATION_DATA_ROOT}/source-calibration-questions.json`,
  scale: `${SOURCE_CALIBRATION_DATA_ROOT}/source-calibration-scale.json`,
  results: `${SOURCE_CALIBRATION_DATA_ROOT}/source-calibration-results.json`,
});

const SOURCE_CALIBRATION_STORAGE = Object.freeze({
  key: 'neuroartan:model:foundation:source_calibration:draft',
  version: '0.1.0',
});

const SOURCE_CALIBRATION_PRESENTATION_FRAMES = Object.freeze([
  '{text}',
  'Right now, {text}',
  'In my current experience, {text}',
  'At this point, {text}',
  'When I reflect honestly, {text}',
]);

const SOURCE_CALIBRATION_DEFAULT_STATE = Object.freeze({
  status: 'idle',
  sessionId: null,
  draftSaved: false,
  currentIndex: 0,
  questionOrder: [],
  questionTextVariants: {},
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
    questionTextVariants: {},
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

  persistSourceCalibrationDraft(sourceCalibrationState);

  return sourceCalibrationState;
}

export function resetSourceCalibrationState(overrides = {}) {
  sourceCalibrationState = createSourceCalibrationState(overrides);

  persistSourceCalibrationDraft(sourceCalibrationState);

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

    const sessionQuestionSet = createSourceCalibrationQuestionSet(questions.questions || []);

    const restoredDraft = restoreSourceCalibrationDraft({
      questions,
      scale,
      results,
      questionOrder: sessionQuestionSet.questionOrder,
      questionTextVariants: sessionQuestionSet.questionTextVariants,
    });

    return setSourceCalibrationState(restoredDraft || {
      status: 'ready',
      questions,
      scale,
      results,
      questionOrder: sessionQuestionSet.questionOrder,
      questionTextVariants: sessionQuestionSet.questionTextVariants,
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

  const sessionQuestionSet = createSourceCalibrationQuestionSet(state.questions.questions || []);

  return setSourceCalibrationState({
    status: 'active',
    sessionId: createSourceCalibrationSessionId(),
    workspaceOpen: true,
    draftSaved: false,
    currentIndex: 0,
    questionOrder: sessionQuestionSet.questionOrder,
    questionTextVariants: sessionQuestionSet.questionTextVariants,
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
  clearSourceCalibrationDraft();

  return setSourceCalibrationState({
    status: 'complete',
    workspaceOpen: false,
    draftSaved: false,
    result,
  });
}

export function markSourceCalibrationWorkspaceOpen() {
  return setSourceCalibrationState({ workspaceOpen: true });
}

export function markSourceCalibrationWorkspaceClosed() {
  return setSourceCalibrationState({ workspaceOpen: false });
}

export function saveSourceCalibrationDraft() {
  return setSourceCalibrationState({
    status: 'active',
    workspaceOpen: false,
    draftSaved: true,
  });
}

export function resumeSourceCalibrationDraft() {
  return setSourceCalibrationState({
    status: 'active',
    workspaceOpen: true,
    draftSaved: false,
  });
}

export function restartSourceCalibrationDraft() {
  clearSourceCalibrationDraft();

  const state = getSourceCalibrationState();
  const sessionQuestionSet = createSourceCalibrationQuestionSet(state.questions?.questions || []);

  return setSourceCalibrationState({
    status: 'ready',
    sessionId: null,
    workspaceOpen: false,
    draftSaved: false,
    currentIndex: 0,
    questionOrder: sessionQuestionSet.questionOrder,
    questionTextVariants: sessionQuestionSet.questionTextVariants,
    answers: {},
    result: state.result || null,
    error: null,
  });
}

export function clearSourceCalibrationDraft() {
  try {
    window.localStorage?.removeItem(SOURCE_CALIBRATION_STORAGE.key);
  } catch (error) {
    console.warn('[Neuroartan][Source Calibration] Draft clear failed.', error);
  }
}

// MARK: - Question Helpers

export function getCurrentSourceCalibrationQuestion() {
  const state = getSourceCalibrationState();
  const questionId = state.questionOrder[state.currentIndex];

  const question = (state.questions?.questions || []).find((candidate) => candidate.id === questionId) || null;
  if (!question) return null;

  return {
    ...question,
    text: state.questionTextVariants?.[question.id] || question.text,
    canonical_text: question.text,
  };
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

// MARK: - Browser Draft Persistence

function persistSourceCalibrationDraft(state) {
  if (!shouldPersistSourceCalibrationDraft(state)) {
    return;
  }

  try {
    window.localStorage?.setItem(SOURCE_CALIBRATION_STORAGE.key, JSON.stringify({
      version: SOURCE_CALIBRATION_STORAGE.version,
      savedAt: new Date().toISOString(),
      status: state.status,
      workspaceOpen: state.workspaceOpen === true,
      draftSaved: state.draftSaved === true,
      sessionId: state.sessionId,
      currentIndex: state.currentIndex,
      questionOrder: state.questionOrder,
      questionTextVariants: state.questionTextVariants,
      answers: state.answers,
    }));
  } catch (error) {
    console.warn('[Neuroartan][Source Calibration] Draft persistence failed.', error);
  }
}

function shouldPersistSourceCalibrationDraft(state) {
  return state?.status === 'active' && Boolean(state.sessionId);
}

function restoreSourceCalibrationDraft(baseState) {
  try {
    const raw = window.localStorage?.getItem(SOURCE_CALIBRATION_STORAGE.key);
    if (!raw) return null;

    const draft = JSON.parse(raw);
    if (draft?.version !== SOURCE_CALIBRATION_STORAGE.version) return null;
    if (draft?.status !== 'active') return null;
    if (!Array.isArray(draft.questionOrder)) return null;

    const validQuestionIds = new Set((baseState.questions?.questions || []).map((question) => question.id));
    const questionOrder = draft.questionOrder.filter((questionId) => validQuestionIds.has(questionId));
    const questionTextVariants = sanitizeSourceCalibrationTextVariants(draft.questionTextVariants || {}, validQuestionIds);

    if (!questionOrder.length) return null;

    return {
      status: 'active',
      sessionId: draft.sessionId || createSourceCalibrationSessionId(),
      workspaceOpen: draft.workspaceOpen === true,
      draftSaved: draft.draftSaved === true,
      questions: baseState.questions,
      scale: baseState.scale,
      results: baseState.results,
      questionOrder,
      questionTextVariants,
      currentIndex: Math.max(0, Math.min(Number(draft.currentIndex || 0), questionOrder.length - 1)),
      answers: sanitizeSourceCalibrationDraftAnswers(draft.answers || {}, validQuestionIds),
      result: null,
      error: null,
    };
  } catch (error) {
    console.warn('[Neuroartan][Source Calibration] Draft restore failed.', error);
    return null;
  }
}

function sanitizeSourceCalibrationTextVariants(variants, validQuestionIds) {
  return Object.entries(variants || {}).reduce((sanitized, [questionId, value]) => {
    if (!validQuestionIds.has(questionId)) return sanitized;
    if (typeof value !== 'string' || !value.trim()) return sanitized;

    sanitized[questionId] = value.trim();
    return sanitized;
  }, {});
}

function sanitizeSourceCalibrationDraftAnswers(answers, validQuestionIds) {
  return Object.entries(answers || {}).reduce((sanitized, [questionId, value]) => {
    if (!validQuestionIds.has(questionId)) return sanitized;

    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) return sanitized;

    sanitized[questionId] = Math.max(0, Math.min(10, numericValue));
    return sanitized;
  }, {});
}

function createSourceCalibrationQuestionSet(questions) {
  const questionOrder = createBalancedSourceQuestionOrder(questions);
  const questionTextVariants = createSourceCalibrationQuestionTextVariants(questions, questionOrder);

  return {
    questionOrder,
    questionTextVariants,
  };
}

function createBalancedSourceQuestionOrder(questions) {
  const buckets = questions.reduce((accumulator, question) => {
    const key = question.orientation_band || 'unassigned';
    accumulator[key] = accumulator[key] || [];
    accumulator[key].push(question.id);
    return accumulator;
  }, {});

  Object.values(buckets).forEach((bucket) => randomShuffle(bucket));

  const order = [];
  const keys = randomShuffle(Object.keys(buckets));

  while (keys.some((key) => buckets[key].length)) {
    keys.forEach((key) => {
      const next = buckets[key].shift();
      if (next) order.push(next);
    });
  }

  return order;
}

function createSourceCalibrationQuestionTextVariants(questions, questionOrder) {
  const questionMap = new Map(questions.map((question) => [question.id, question]));

  return questionOrder.reduce((variants, questionId, index) => {
    const question = questionMap.get(questionId);
    if (!question) return variants;

    variants[questionId] = chooseSourceCalibrationQuestionText(question, index);
    return variants;
  }, {});
}

function chooseSourceCalibrationQuestionText(question, index) {
  if (Array.isArray(question.variants) && question.variants.length) {
    const variants = question.variants.filter((variant) => typeof variant === 'string' && variant.trim());
    if (variants.length) {
      return variants[randomInteger(variants.length)].trim();
    }
  }

  const text = normalizeSourceCalibrationQuestionText(question.text || '');
  const frame = SOURCE_CALIBRATION_PRESENTATION_FRAMES[index % SOURCE_CALIBRATION_PRESENTATION_FRAMES.length];

  return normalizeSourceCalibrationQuestionText(frame.replace('{text}', text));
}

function normalizeSourceCalibrationQuestionText(text) {
  const normalizedText = String(text || '').trim();
  if (!normalizedText) return '';

  const sentenceCaseText = normalizedText.replace(/(^|[\s“'‘(\[])i(?=\s|['’.,;:!?)]|$)/g, '$1I');

  if (/[.!?]$/.test(sentenceCaseText)) {
    return sentenceCaseText;
  }

  return `${sentenceCaseText}.`;
}

function randomShuffle(items) {
  const shuffledItems = [...items];

  for (let index = shuffledItems.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInteger(index + 1);
    [shuffledItems[index], shuffledItems[swapIndex]] = [shuffledItems[swapIndex], shuffledItems[index]];
  }

  items.splice(0, items.length, ...shuffledItems);
  return items;
}

function randomInteger(max) {
  if (!Number.isFinite(max) || max <= 0) return 0;

  const cryptoSource = globalThis.crypto;
  if (cryptoSource?.getRandomValues) {
    const values = new Uint32Array(1);
    cryptoSource.getRandomValues(values);
    return values[0] % max;
  }

  return Math.floor(Math.random() * max);
}

function createSourceCalibrationSessionId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `source-calibration-${Date.now()}`;
}