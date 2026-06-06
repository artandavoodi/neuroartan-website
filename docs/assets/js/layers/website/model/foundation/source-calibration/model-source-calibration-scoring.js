// MARK: - Source Calibration Scoring

const SOURCE_ORIENTATION_BANDS = Object.freeze([
  'externalized_control',
  'reflective_agency',
  'integrated_regulation',
]);

const SOURCE_RESULT_DIMENSIONS = Object.freeze([
  'control_orientation',
  'agency_level',
  'regulation_style',
  'cognitive_flexibility',
  'narrative_coherence',
  'source_readiness',
]);

// MARK: - Public API

export function scoreSourceCalibration({ questions = [], answers = {}, results = null } = {}) {
  const scoredQuestions = questions
    .map((question) => scoreSourceCalibrationQuestion(question, answers[question.id]))
    .filter(Boolean);

  const orientationScores = calculateGroupedAverages(scoredQuestions, 'orientation_band');
  const constructScores = calculateGroupedAverages(scoredQuestions, 'construct');
  const dimensionScores = calculateGroupedAverages(scoredQuestions, 'dimension');
  const dominantOrientation = getDominantSourceOrientation(orientationScores);
  const cognitiveOrientationIndex = calculateCognitiveOrientationIndex(orientationScores);
  const sourceReadiness = classifySourceReadiness(cognitiveOrientationIndex);

  return {
    schema: 'neuroartan.model.foundation.source_calibration.result',
    version: '0.1.0',
    status: 'draft',
    completed_at: new Date().toISOString(),
    answered_count: scoredQuestions.length,
    expected_count: questions.length,
    cognitive_orientation_index: cognitiveOrientationIndex,
    dominant_orientation: dominantOrientation,
    source_readiness: sourceReadiness,
    orientation_scores: orientationScores,
    construct_scores: constructScores,
    dimension_scores: dimensionScores,
    dimension_outputs: classifySourceDimensions(dimensionScores),
    source_readiness_summary: getSourceReadinessSummary(sourceReadiness, results),
  };
}

export function isSourceCalibrationComplete({ questions = [], answers = {} } = {}) {
  return questions.length > 0 && questions.every((question) => answers[question.id] !== undefined);
}

export function getDominantSourceOrientation(orientationScores = {}) {
  return SOURCE_ORIENTATION_BANDS.reduce((dominant, band) => {
    const currentScore = Number(orientationScores[band]?.average ?? -Infinity);
    const dominantScore = Number(orientationScores[dominant]?.average ?? -Infinity);

    if (currentScore >= dominantScore) {
      return band;
    }

    return dominant;
  }, SOURCE_ORIENTATION_BANDS[0]);
}

// MARK: - Question Scoring

function scoreSourceCalibrationQuestion(question, rawAnswer) {
  if (!question || rawAnswer === undefined) {
    return null;
  }

  const value = normalizeSourceScore(rawAnswer);
  const scoredValue = question.reverse_scored ? 10 - value : value;

  return {
    question_id: question.id,
    construct: question.construct,
    dimension: question.dimension,
    orientation_band: question.orientation_band,
    raw_value: value,
    scored_value: scoredValue,
    weight: Number(question.weight || 1),
  };
}

function normalizeSourceScore(value) {
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
    group.average = roundSourceScore(group.weighted_total / Math.max(group.weight_total, 1));

    groups[groupKey] = group;
    return groups;
  }, {});
}

function calculateCognitiveOrientationIndex(orientationScores = {}) {
  const externalized = Number(orientationScores.externalized_control?.average || 0);
  const reflective = Number(orientationScores.reflective_agency?.average || 0);
  const integrated = Number(orientationScores.integrated_regulation?.average || 0);

  const readinessWeightedScore = (reflective * 0.35) + (integrated * 0.5) + ((10 - externalized) * 0.15);

  return roundSourceScore(readinessWeightedScore);
}

function roundSourceScore(value) {
  return Math.round(Number(value || 0) * 10) / 10;
}

// MARK: - Classification

function classifySourceReadiness(index) {
  if (index >= 7) return 'stable';
  if (index >= 4) return 'forming';
  return 'initial';
}

function classifySourceDimensions(dimensionScores = {}) {
  return SOURCE_RESULT_DIMENSIONS.reduce((outputs, dimension) => {
    const average = Number(dimensionScores[dimension]?.average || 0);
    outputs[dimension] = classifySourceDimension(dimension, average);
    return outputs;
  }, {});
}

function classifySourceDimension(dimension, average) {
  const level = average >= 7 ? 2 : average >= 4 ? 1 : 0;

  const labels = {
    control_orientation: ['Externalized', 'Mixed', 'Internalized'],
    agency_level: ['Low', 'Developing', 'Stable'],
    regulation_style: ['Reactive', 'Reflective', 'Integrated'],
    cognitive_flexibility: ['Fixed', 'Adaptive', 'Fluid'],
    narrative_coherence: ['Fragmented', 'Developing', 'Coherent'],
    source_readiness: ['Initial', 'Forming', 'Stable'],
  };

  return labels[dimension]?.[level] || 'Unclassified';
}

function getSourceReadinessSummary(readiness, results) {
  return results?.summary_templates?.[readiness] || '';
}