// MARK: - Personality Calibration State

const PERSONALITY_CALIBRATION_STORAGE_KEY = 'neuroartan.model.foundation.personality_calibration.state';
const PERSONALITY_CALIBRATION_RESULT_KEY = 'neuroartan.model.foundation.personality_calibration.result';

let personalityCalibrationState = {
  questions: [],
  questionOrder: [],
  answers: {},
  currentIndex: 0,
  completed: false,
  status: 'idle',
  sessionId: null,
  workspaceOpen: false,
  result: null,
};

// MARK: - Public API

export function getPersonalityCalibrationState() {
  return {
    ...personalityCalibrationState,
    questions: [...personalityCalibrationState.questions],
    questionOrder: [...personalityCalibrationState.questionOrder],
    answers: { ...personalityCalibrationState.answers },
  };
}

export function setPersonalityCalibrationQuestions(questions = []) {
  const normalizedQuestions = Array.isArray(questions) ? questions : [];
  const orderedQuestions = createBalancedPersonalityQuestionOrder(normalizedQuestions);

  personalityCalibrationState = {
    ...personalityCalibrationState,
    questions: orderedQuestions,
    questionOrder: orderedQuestions.map((question) => question.id),
    currentIndex: normalizePersonalityCalibrationIndex(personalityCalibrationState.currentIndex, orderedQuestions),
  };

  persistPersonalityCalibrationState();
  return getPersonalityCalibrationState();
}

export function setPersonalityCalibrationAnswer(questionId, value) {
  if (!questionId) return getPersonalityCalibrationState();

  personalityCalibrationState = {
    ...personalityCalibrationState,
    answers: {
      ...personalityCalibrationState.answers,
      [questionId]: Number(value),
    },
    status: 'active',
  };

  persistPersonalityCalibrationState();
  return getPersonalityCalibrationState();
}

export function setPersonalityCalibrationIndex(index = 0) {
  const normalizedIndex = normalizePersonalityCalibrationIndex(index, personalityCalibrationState.questions);

  personalityCalibrationState = {
    ...personalityCalibrationState,
    currentIndex: normalizedIndex,
    status: 'active',
  };

  persistPersonalityCalibrationState();
  return getPersonalityCalibrationState();
}

export function setPersonalityCalibrationResult(result = null) {
  personalityCalibrationState = {
    ...personalityCalibrationState,
    completed: Boolean(result),
    status: result ? 'complete' : 'ready',
    workspaceOpen: false,
    result,
  };

  persistPersonalityCalibrationState();
  persistPersonalityCalibrationResult(result);

  return getPersonalityCalibrationState();
}

export function setPersonalityCalibrationWorkspaceOpen(workspaceOpen = false) {
  const nextWorkspaceOpen = Boolean(workspaceOpen);

  personalityCalibrationState = {
    ...personalityCalibrationState,
    workspaceOpen: nextWorkspaceOpen,
    sessionId: nextWorkspaceOpen
      ? personalityCalibrationState.sessionId || `personality-${Date.now()}`
      : personalityCalibrationState.sessionId,
    status: personalityCalibrationState.completed ? 'complete' : nextWorkspaceOpen ? 'active' : 'active',
  };

  persistPersonalityCalibrationState();
  return getPersonalityCalibrationState();
}

export function resetPersonalityCalibrationState() {
  personalityCalibrationState = {
    questions: createBalancedPersonalityQuestionOrder(personalityCalibrationState.questions),
    questionOrder: [],
    answers: {},
    currentIndex: 0,
    completed: false,
    status: 'idle',
    sessionId: null,
    workspaceOpen: false,
    result: null,
  };
  personalityCalibrationState.questionOrder = personalityCalibrationState.questions.map((question) => question.id);

  persistPersonalityCalibrationState();
  persistPersonalityCalibrationResult(null);

  return getPersonalityCalibrationState();
}

export function hydratePersonalityCalibrationState() {
  try {
    const rawState = window.localStorage?.getItem(PERSONALITY_CALIBRATION_STORAGE_KEY);
    if (!rawState) return getPersonalityCalibrationState();

    const parsedState = JSON.parse(rawState);

    personalityCalibrationState = {
      ...personalityCalibrationState,
      ...parsedState,
      questions: Array.isArray(parsedState.questions) ? parsedState.questions : personalityCalibrationState.questions,
      questionOrder: Array.isArray(parsedState.questionOrder) ? parsedState.questionOrder : [],
      answers: parsedState.answers && typeof parsedState.answers === 'object' ? parsedState.answers : {},
      currentIndex: normalizePersonalityCalibrationIndex(parsedState.currentIndex, Array.isArray(parsedState.questions) ? parsedState.questions : personalityCalibrationState.questions),
      completed: Boolean(parsedState.completed),
      status: parsedState.status || (parsedState.completed ? 'complete' : 'idle'),
      sessionId: parsedState.sessionId || null,
      workspaceOpen: Boolean(parsedState.workspaceOpen),
      result: parsedState.result || null,
    };
  } catch {
    return getPersonalityCalibrationState();
  }

  return getPersonalityCalibrationState();
}

export function readLatestPersonalityCalibrationResult() {
  try {
    const rawResult = window.localStorage?.getItem(PERSONALITY_CALIBRATION_RESULT_KEY);
    return rawResult ? JSON.parse(rawResult) : null;
  } catch {
    return null;
  }
}

// MARK: - Internals

function normalizePersonalityCalibrationIndex(index = 0, questions = personalityCalibrationState.questions) {
  const total = Array.isArray(questions) ? questions.length : 0;
  const maxIndex = Math.max(0, total - 1);
  const numericIndex = Number(index);

  if (!Number.isFinite(numericIndex)) {
    return 0;
  }

  return Math.max(0, Math.min(maxIndex, Math.trunc(numericIndex)));
}

function createBalancedPersonalityQuestionOrder(questions = []) {
  const normalizedQuestions = Array.isArray(questions) ? questions.filter(Boolean) : [];
  const buckets = normalizedQuestions.reduce((map, question) => {
    const key = question.dimension || question.construct || 'general';
    if (!map.has(key)) {
      map.set(key, []);
    }

    map.get(key).push(question);
    return map;
  }, new Map());

  const shuffledBuckets = [...buckets.entries()]
    .map(([key, bucket]) => [key, shufflePersonalityQuestions(bucket)])
    .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));

  const orderedQuestions = [];
  let previousKey = '';

  while (shuffledBuckets.some(([, bucket]) => bucket.length)) {
    const nextEntry = shuffledBuckets.find(([key, bucket]) => bucket.length && key !== previousKey)
      || shuffledBuckets.find(([, bucket]) => bucket.length);

    if (!nextEntry) break;

    const [key, bucket] = nextEntry;
    const nextQuestion = bucket.shift();
    if (nextQuestion) {
      orderedQuestions.push(nextQuestion);
      previousKey = key;
    }
  }

  return orderedQuestions;
}

function shufflePersonalityQuestions(questions = []) {
  const shuffledQuestions = [...questions];

  for (let index = shuffledQuestions.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffledQuestions[index], shuffledQuestions[swapIndex]] = [shuffledQuestions[swapIndex], shuffledQuestions[index]];
  }

  return shuffledQuestions;
}

// MARK: - Persistence

function persistPersonalityCalibrationState() {
  try {
    window.localStorage?.setItem(
      PERSONALITY_CALIBRATION_STORAGE_KEY,
      JSON.stringify(personalityCalibrationState),
    );
  } catch {
    // Storage failure must not block calibration.
  }
}

function persistPersonalityCalibrationResult(result) {
  try {
    if (!result) {
      window.localStorage?.removeItem(PERSONALITY_CALIBRATION_RESULT_KEY);
      return;
    }

    window.localStorage?.setItem(PERSONALITY_CALIBRATION_RESULT_KEY, JSON.stringify(result));
  } catch {
    // Storage failure must not block calibration.
  }
}
