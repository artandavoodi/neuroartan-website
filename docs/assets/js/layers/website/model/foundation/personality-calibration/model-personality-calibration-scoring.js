// MARK: - Personality Calibration Scoring

const PERSONALITY_RESULT_DIMENSIONS = Object.freeze([
  'cognitiveStyle',
  'socialExpression',
  'regulationPattern',
  'selfModelFunction',
  'adaptationStyle',
  'reflectionTolerance',
]);

const PERSONALITY_PATTERN_DIMENSIONS = Object.freeze([
  'cognitiveStyle',
  'socialExpression',
  'regulationPattern',
  'selfModelFunction',
  'adaptationStyle',
  'reflectionTolerance',
  'opennessExploration',
  'structureOrientation',
  'agencyExpression',
  'conflictPosture',
]);

// MARK: - Public API

export function scorePersonalityCalibration({ questions = [], answers = {} } = {}) {
  const scoredQuestions = questions
    .map((question) => scorePersonalityCalibrationQuestion(question, answers[question.id]))
    .filter(Boolean);

  const dimensionScores = calculateGroupedAverages(scoredQuestions, 'dimension');
  const polarityScores = calculateGroupedAverages(scoredQuestions, 'polarity');
  const personalityCoherenceIndex = calculatePersonalityCoherenceIndex(dimensionScores);
  const dominantPersonalityPattern = getDominantPersonalityPattern(dimensionScores);
  const dimensionOutputs = classifyPersonalityDimensions(dimensionScores);
  const personalityReadiness = classifyPersonalityReadiness(personalityCoherenceIndex);
  const personalityReadinessSummary = createPersonalityReadinessSummary(personalityReadiness);

  return {
    schema: 'neuroartan.model.foundation.personality_calibration.result',
    version: '0.1.0',
    status: 'draft',
    completed_at: new Date().toISOString(),
    answered_count: scoredQuestions.length,
    expected_count: questions.length,
    personality_coherence_index: personalityCoherenceIndex,
    dominant_personality_pattern: dominantPersonalityPattern,
    personality_readiness: personalityReadiness,
    personality_readiness_summary: personalityReadinessSummary,
    dimension_scores: dimensionScores,
    polarity_scores: polarityScores,
    dimension_outputs: dimensionOutputs,
    summary_metrics: createPersonalitySummaryMetrics({
      personalityCoherenceIndex,
      dominantPersonalityPattern,
      personalityReadiness,
      dimensionScores,
      dimensionOutputs,
    }),
  };
}

export function isPersonalityCalibrationComplete({ questions = [], answers = {} } = {}) {
  return questions.length > 0 && questions.every((question) => answers[question.id] !== undefined);
}

// MARK: - Question Scoring

function scorePersonalityCalibrationQuestion(question, rawAnswer) {
  if (!question || rawAnswer === undefined) {
    return null;
  }

  const value = normalizePersonalityScore(rawAnswer);
  const scoredValue = question.reverse_scored ? 10 - value : value;

  return {
    question_id: question.id,
    dimension: question.dimension,
    polarity: question.polarity,
    raw_value: value,
    scored_value: scoredValue,
    weight: Number(question.weight || 1),
  };
}

function normalizePersonalityScore(value) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return 0;
  }

  return Math.max(0, Math.min(10, numericValue));
}

// MARK: - Grouping

function calculateGroupedAverages(scoredQuestions, key) {
  return scoredQuestions.reduce((groups, item) => {
    const groupKey = item[key] || 'unassigned';
    const group = groups[groupKey] || {
      count: 0,
      weighted_total: 0,
      weight_total: 0,
      average: 0,
    };

    group.count += 1;
    group.weighted_total += item.scored_value * item.weight;
    group.weight_total += item.weight;
    group.average = roundPersonalityScore(group.weighted_total / Math.max(group.weight_total, 1));

    groups[groupKey] = group;
    return groups;
  }, {});
}

function calculatePersonalityCoherenceIndex(dimensionScores = {}) {
  const scoredDimensions = PERSONALITY_PATTERN_DIMENSIONS
    .map((dimension) => Number(dimensionScores[dimension]?.average))
    .filter((score) => Number.isFinite(score));

  if (!scoredDimensions.length) {
    return 0;
  }

  const total = scoredDimensions.reduce((sum, score) => sum + score, 0);

  return roundPersonalityScore(total / scoredDimensions.length);
}

function roundPersonalityScore(value) {
  return Math.round(Number(value || 0) * 10) / 10;
}

// MARK: - Classification

function getDominantPersonalityPattern(dimensionScores = {}) {
  return PERSONALITY_PATTERN_DIMENSIONS.reduce((dominant, dimension) => {
    const currentScore = Number(dimensionScores[dimension]?.average ?? -Infinity);
    const dominantScore = Number(dimensionScores[dominant]?.average ?? -Infinity);

    if (currentScore >= dominantScore) {
      return dimension;
    }

    return dominant;
  }, PERSONALITY_PATTERN_DIMENSIONS[0]);
}

function classifyPersonalityDimensions(dimensionScores = {}) {
  return PERSONALITY_RESULT_DIMENSIONS.reduce((outputs, dimension) => {
    const average = Number(dimensionScores[dimension]?.average || 0);
    outputs[dimension] = classifyPersonalityDimension(dimension, average);
    return outputs;
  }, {});
}

function createPersonalitySummaryMetrics({
  personalityCoherenceIndex,
  dominantPersonalityPattern,
  personalityReadiness,
  dimensionScores = {},
  dimensionOutputs = {},
} = {}) {
  const dominantPatternScore = dimensionScores[dominantPersonalityPattern]?.average ?? null;

  return {
    personality_coherence_index: {
      label: 'Personality Coherence Index',
      value: personalityCoherenceIndex,
      score: personalityCoherenceIndex,
      status: classifyMetricStatus(personalityCoherenceIndex),
    },
    dominant_personality_pattern: {
      label: 'Dominant Personality Pattern',
      value: formatPersonalityPattern(dominantPersonalityPattern),
      score: dominantPatternScore,
      status: classifyMetricStatus(dominantPatternScore),
    },
    personality_readiness: {
      label: 'Personality Readiness',
      value: formatPersonalityReadiness(personalityReadiness),
      score: null,
      status: personalityReadiness || classifyMetricStatus(personalityCoherenceIndex),
    },
    self_model_function: createPersonalityDimensionSummaryMetric('Self-Model Function', dimensionScores.selfModelFunction, dimensionOutputs.selfModelFunction),
    social_expression: createPersonalityDimensionSummaryMetric('Social Expression', dimensionScores.socialExpression, dimensionOutputs.socialExpression),
    regulation_pattern: createPersonalityDimensionSummaryMetric('Regulation Pattern', dimensionScores.regulationPattern, dimensionOutputs.regulationPattern),
    cognitive_style: createPersonalityDimensionSummaryMetric('Cognitive Style', dimensionScores.cognitiveStyle, dimensionOutputs.cognitiveStyle),
    adaptation_style: createPersonalityDimensionSummaryMetric('Adaptation Style', dimensionScores.adaptationStyle, dimensionOutputs.adaptationStyle),
    reflection_tolerance: createPersonalityDimensionSummaryMetric('Reflection Tolerance', dimensionScores.reflectionTolerance, dimensionOutputs.reflectionTolerance),
  };
}

function createPersonalityDimensionSummaryMetric(label, dimensionScore = {}, output = '') {
  const score = dimensionScore?.average ?? null;

  return {
    label,
    value: output || 'Unclassified',
    score,
    status: classifyMetricStatus(score),
  };
}

function classifyMetricStatus(value) {
  const score = Number(value);
  if (!Number.isFinite(score)) return 'pending';
  if (score >= 7) return 'complete';
  if (score >= 4) return 'forming';
  return 'initial';
}

function classifyPersonalityReadiness(personalityCoherenceIndex = 0) {
  const score = Number(personalityCoherenceIndex);

  if (!Number.isFinite(score)) return 'initial';
  if (score >= 7) return 'complete';
  if (score >= 4) return 'forming';
  return 'initial';
}

function formatPersonalityReadiness(personalityReadiness = '') {
  const labels = {
    initial: 'Initial',
    forming: 'Forming',
    complete: 'Complete',
  };

  return labels[personalityReadiness] || 'Initial';
}

function createPersonalityReadinessSummary(personalityReadiness = '') {
  if (personalityReadiness === 'complete') {
    return 'Your Personality Profile is ready. The model can use it as a stable baseline for more natural responses.';
  }

  if (personalityReadiness === 'forming') {
    return 'Your Personality Profile is forming. The model should use it gently while it continues learning your response pattern.';
  }

  return 'Your Personality Profile is initial. The model should keep responses simple while it learns your style and reflection needs.';
}

function classifyPersonalityDimension(dimension, average) {
  const level = average >= 7 ? 2 : average >= 4 ? 1 : 0;

  const labels = {
    cognitiveStyle: ['Concrete', 'Balanced', 'Abstract'],
    socialExpression: ['Contained', 'Measured', 'Expressive'],
    regulationPattern: ['Reactive', 'Reflective', 'Integrated'],
    selfModelFunction: ['Protective', 'Developing', 'Integrative'],
    adaptationStyle: ['Stable', 'Flexible', 'Adaptive'],
    reflectionTolerance: ['Gentle', 'Paced', 'Direct'],
  };

  return labels[dimension]?.[level] || 'Unclassified';
}

function formatPersonalityPattern(pattern = '') {
  const labels = {
    cognitiveStyle: 'Cognitive style',
    socialExpression: 'Social expression',
    regulationPattern: 'Regulation pattern',
    selfModelFunction: 'Self-model function',
    adaptationStyle: 'Adaptation style',
    reflectionTolerance: 'Reflection tolerance',
    opennessExploration: 'Openness / exploration',
    structureOrientation: 'Structure orientation',
    agencyExpression: 'Agency expression',
    conflictPosture: 'Conflict posture',
  };

  return labels[pattern] || 'Unclassified';
}
