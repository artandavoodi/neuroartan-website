// MARK: - Digital Brain Maturity State

const DIGITAL_BRAIN_MATURITY_STATE_ORDER = Object.freeze({
  complete: 5,
  stable: 4,
  forming: 3,
  initial: 2,
  blocked: 1,
  pending: 0,
  not_started: 0,
});

const DIGITAL_BRAIN_MATURITY_STATE_LABELS = Object.freeze({
  complete: 'Complete',
  stable: 'Stable',
  forming: 'Forming',
  initial: 'Initial',
  blocked: 'Blocked',
  pending: 'Pending',
  not_started: 'Not started',
});

export function createDigitalBrainMaturityState(data = {}, runtime = {}) {
  const runtimeLayers = runtime?.layers && typeof runtime.layers === 'object'
    ? runtime.layers
    : {};
  const layers = Array.isArray(data.layers)
    ? data.layers.map((layer) => normalizeDigitalBrainMaturityLayer(layer, runtimeLayers[layer.id]))
    : [];

  const connections = Array.isArray(data.connections)
    ? data.connections.map((connection) => normalizeDigitalBrainMaturityConnection(connection, layers))
    : [];

  return {
    schema: data.schema || 'neuroartan.model.foundation.digital_brain_maturity',
    version: data.version || '0.1.0',
    title: data.title || 'Digital Brain Maturity',
    summary: data.summary || 'Foundation maturity connects calibrated model layers into one operational map.',
    layers,
    connections,
    runtime,
    maturity: calculateDigitalBrainMaturity(layers),
  };
}

function normalizeDigitalBrainMaturityLayer(layer = {}, runtimeLayer = {}) {
  const state = normalizeDigitalBrainMaturityState(runtimeLayer?.state || layer.state);
  const signals = Array.isArray(runtimeLayer?.signals)
    ? runtimeLayer.signals.map(normalizeDigitalBrainSignal).filter((signal) => signal.label || signal.value)
    : [];

  return {
    id: normalizeString(layer.id),
    label: normalizeString(layer.label),
    description: normalizeString(layer.description),
    state,
    stateLabel: DIGITAL_BRAIN_MATURITY_STATE_LABELS[state] || DIGITAL_BRAIN_MATURITY_STATE_LABELS.pending,
    icon: normalizeString(layer.icon),
    weight: normalizeNumber(layer.weight, 1),
    x: normalizeNumber(layer.x, 0),
    y: normalizeNumber(layer.y, 0),
    z: normalizeNumber(layer.z, 0),
    next: Array.isArray(layer.next) ? layer.next.map(normalizeString).filter(Boolean) : [],
    signals,
    signalCount: signals.length,
  };
}

function normalizeDigitalBrainMaturityConnection(connection = {}, layers = []) {
  const toLayer = layers.find((layer) => layer.id === normalizeString(connection.to));
  const fromLayer = layers.find((layer) => layer.id === normalizeString(connection.from));

  return {
    from: normalizeString(connection.from),
    to: normalizeString(connection.to),
    state: normalizeDigitalBrainMaturityState(connection.state || toLayer?.state || fromLayer?.state),
  };
}

function calculateDigitalBrainMaturity(layers = []) {
  if (!layers.length) {
    return {
      score: 0,
      state: 'pending',
      label: 'Pending',
      completeCount: 0,
      totalCount: 0,
    };
  }

  const totalWeight = layers.reduce((total, layer) => total + layer.weight, 0);
  const weightedScore = layers.reduce((total, layer) => {
    const stateValue = DIGITAL_BRAIN_MATURITY_STATE_ORDER[layer.state] ?? 0;
    return total + ((stateValue / DIGITAL_BRAIN_MATURITY_STATE_ORDER.complete) * layer.weight);
  }, 0);

  const score = totalWeight > 0 ? Math.round((weightedScore / totalWeight) * 100) : 0;
  const completeCount = layers.filter((layer) => layer.state === 'complete' || layer.state === 'stable').length;
  const state = classifyDigitalBrainMaturity(score, layers);

  return {
    score,
    state,
    label: DIGITAL_BRAIN_MATURITY_STATE_LABELS[state] || DIGITAL_BRAIN_MATURITY_STATE_LABELS.pending,
    completeCount,
    totalCount: layers.length,
  };
}

function classifyDigitalBrainMaturity(score = 0, layers = []) {
  if (layers.some((layer) => layer.state === 'blocked')) return 'blocked';
  if (score >= 85) return 'stable';
  if (score >= 55) return 'forming';
  if (score > 0) return 'initial';
  return 'pending';
}

function normalizeDigitalBrainMaturityState(state = '') {
  const normalizedState = normalizeString(state).toLowerCase().replace(/\s+/g, '_');
  return Object.prototype.hasOwnProperty.call(DIGITAL_BRAIN_MATURITY_STATE_ORDER, normalizedState)
    ? normalizedState
    : 'pending';
}

function normalizeDigitalBrainSignal(signal = {}) {
  return {
    id: normalizeString(signal.id),
    label: normalizeString(signal.label),
    value: normalizeString(signal.value),
    category: normalizeString(signal.category),
    source: normalizeString(signal.source),
  };
}

function normalizeString(value = '') {
  return String(value || '').trim();
}

function normalizeNumber(value = 0, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}
