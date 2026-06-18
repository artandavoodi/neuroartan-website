import {
  getCurrentSupabaseUser,
  getOwnedCanonicalModel,
  listModelVoiceTrainingSamples,
  listModelPersonalityCalibrationSessions,
  listModelSourceCalibrationSessions,
  readModelDigitalBrainPreferences,
} from '../../../system/model/model-store.js';
import {
  listModelKnowledgeEntries,
  listModelLogicRecords,
  listModelSourceVaultIndexEntries,
  listModelTrainingDatasetEntries,
} from '../../../system/model/model-training-store.js';
import { listProfilePosts } from '../../../system/profile/profile-post-store.js';
import { listProfileThoughts } from '../../../system/profile/profile-thought-store.js';
import { listFeedPosts } from '../../../system/feed/feed-store.js';

const HOME_COGNITIVE_MAP_READ_TIMEOUT_MS = 6500;
const HOME_COGNITIVE_MAP_READ_TIMEOUT = Object.freeze({ __homeCognitiveMapReadTimeout: true });
const HOME_COGNITIVE_MAP_LIVE_PREFERENCES = new Map();
const HOME_COGNITIVE_MAP_PULSE_FRAMES = new WeakMap();
const HOME_COGNITIVE_MAP_RETRY_TIMERS = new WeakMap();
const HOME_COGNITIVE_MAP_LAYERS = Object.freeze([
  { id: 'identity', label: 'Self schema', x: 50, y: 18, tone: 'identity' },
  { id: 'source', label: 'Semantic knowledge', x: 74, y: 36, tone: 'source' },
  { id: 'memory', label: 'Episodic continuity', x: 25, y: 62, tone: 'memory' },
  { id: 'personality', label: 'Social-affective pattern', x: 55, y: 50, tone: 'personality' },
  { id: 'voice', label: 'Expression system', x: 76, y: 70, tone: 'voice' },
]);

function getHomeConfig() {
  const stored = localStorage.getItem('neuroartan-home-config');
  if (!stored) return { visibility: { 'cognitive-map': true } };

  try {
    const parsed = JSON.parse(stored);
    return {
      ...parsed,
      visibility: {
        'cognitive-map': true,
        ...(parsed.visibility || {}),
      },
    };
  } catch (error) {
    console.error('[home-cognitive-map] Failed to parse Home config.', error);
    return { visibility: { 'cognitive-map': true } };
  }
}

function normalizeNumber(value = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function normalizeString(value = '') {
  return String(value || '').trim();
}

function clampNumber(value = 0, min = 0, max = 1) {
  return Math.min(max, Math.max(min, normalizeNumber(value)));
}

function createHomeCognitiveMapHeartbeatPulse(motionSpeed = 1) {
  const numericSpeed = Number(motionSpeed);
  const speed = clampNumber(Number.isFinite(numericSpeed) ? numericSpeed : 1, 0, 2.5);
  if (speed <= 0) return 0;
  const phase = ((Date.now() * speed) % 1180) / 1180;
  const breathPhase = (Math.sin(Date.now() / (1250 / speed)) + 1) / 2;
  const primaryBeat = Math.exp(-Math.pow((phase - 0.12) / 0.044, 2));
  const secondaryBeat = Math.exp(-Math.pow((phase - 0.27) / 0.072, 2)) * 0.42;
  const breathingFloor = breathPhase * 0.2;
  return clampNumber(primaryBeat + secondaryBeat + breathingFloor, 0, 1);
}

function normalizePreferenceNumber(preferences = null, key = '', fallback = 1) {
  const source = preferences && typeof preferences === 'object' ? preferences : {};
  const payload = source.preferencesPayload && typeof source.preferencesPayload === 'object'
    ? source.preferencesPayload
    : {};
  const value = source[key] ?? payload[key] ?? fallback;
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizePreferenceBoolean(preferences = null, key = '', fallback = true) {
  const source = preferences && typeof preferences === 'object' ? preferences : {};
  const payload = source.preferencesPayload && typeof source.preferencesPayload === 'object'
    ? source.preferencesPayload
    : {};
  const value = source[key] ?? payload[key];
  return value === undefined || value === null ? fallback : value !== false;
}

function readDigitalBrainPreferencesCache(modelId = '') {
  const normalizedModelId = normalizeString(modelId);
  if (!normalizedModelId) return null;

  try {
    const cached = window.localStorage.getItem(`neuroartan:model:digital-brain-preferences:${normalizedModelId}`);
    if (!cached) return null;
    const parsed = JSON.parse(cached);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch (_) {
    return null;
  }
}

function resolveFreshestPreferences(cloudPreferences = null, cachedPreferences = null, livePreferences = null) {
  const candidates = [cloudPreferences, cachedPreferences, livePreferences]
    .filter((candidate) => candidate && typeof candidate === 'object');
  if (!candidates.length) return null;

  return candidates.reduce((freshest, candidate) => {
    const freshestTime = Date.parse(freshest.cachedAt || freshest.updatedAt || '') || 0;
    const candidateTime = Date.parse(candidate.cachedAt || candidate.updatedAt || '') || 0;
    return candidateTime >= freshestTime ? candidate : freshest;
  });
}

function getRecordAggregateCount(record = {}) {
  const metadata = record?.source_metadata && typeof record.source_metadata === 'object'
    ? record.source_metadata
    : {};
  return Math.max(
    1,
    normalizeNumber(metadata.source_vault_file_count)
      || normalizeNumber(metadata.file_count)
      || normalizeNumber(metadata.content_file_count)
      || normalizeNumber(record.aggregate_count)
      || 1
  );
}

async function safeRead(label, reader, fallback) {
  try {
    return await reader();
  } catch (error) {
    console.warn(`[home-cognitive-map] ${label} unavailable.`, error);
    return fallback;
  }
}

async function withReadTimeout(promise, fallback, timeoutMs = HOME_COGNITIVE_MAP_READ_TIMEOUT_MS) {
  if (!timeoutMs || timeoutMs < 1) return promise;

  let timeoutId = null;
  const timeout = new Promise((resolve) => {
    timeoutId = window.setTimeout(() => resolve(fallback), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timeoutId) window.clearTimeout(timeoutId);
  }
}

function titleize(value = '') {
  return normalizeString(value)
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase()) || 'Pending';
}

function getLayerState(strength = 0) {
  if (strength >= 0.82) return 'stable';
  if (strength >= 0.42) return 'forming';
  if (strength > 0.12) return 'initial';
  return 'pending';
}

function getLayerStrength(layerId, snapshot = {}) {
  switch (layerId) {
    case 'identity':
      return snapshot.model?.id ? 1 : 0.12;
    case 'source':
      return Math.min(1, (snapshot.sourceInputCount + snapshot.sourceSessionCount) / 12);
    case 'memory':
      return Math.min(1, (snapshot.memoryInputCount + snapshot.profilePostCount + snapshot.profileThoughtCount) / 18);
    case 'personality':
      return Math.min(1, (snapshot.personalitySessionCount + snapshot.feedPostCount + snapshot.profileThoughtCount) / 9);
    case 'voice':
      return Math.min(1, snapshot.voiceSampleCount / 12);
    default:
      return 0.2;
  }
}

function calculateConstructPosition(layer = {}, index = 0, total = 1, spread = 1) {
  const angle = index * Math.PI * (3 - Math.sqrt(5));
  const density = Math.max(1, Math.sqrt(Math.max(1, total)));
  const ring = Math.sqrt(index + 1) / density;
  const radiusX = (12 + (ring * 19)) * spread;
  const radiusY = (8 + (ring * 14)) * spread;
  return {
    x: Math.max(5, Math.min(95, layer.x + (Math.cos(angle) * radiusX))),
    y: Math.max(5, Math.min(95, layer.y + (Math.sin(angle) * radiusY))),
  };
}

function getLayerConstructs(layerId, snapshot = {}) {
  switch (layerId) {
    case 'identity':
      return [
        { id: 'model-status', label: 'Lifecycle', value: snapshot.model?.model_status || '' },
        { id: 'publication', label: 'Publication', value: snapshot.model?.publication_state || '' },
      ].filter((item) => normalizeString(item.value));
    case 'source':
      return [
        { id: 'source-vault', label: 'Source vault', value: snapshot.sourceVaultCount },
        { id: 'semantic-sources', label: 'Semantic sources', value: snapshot.sourceSessionCount + snapshot.trainingDatasetCount },
      ].filter((item) => normalizeNumber(item.value) > 0);
    case 'memory':
      return [
        { id: 'episodic-records', label: 'Episodic records', value: snapshot.profilePostCount + snapshot.profileThoughtCount },
        { id: 'knowledge', label: 'Knowledge', value: snapshot.knowledgeEntryCount },
        { id: 'logic', label: 'Logic', value: snapshot.logicRecordCount },
      ].filter((item) => normalizeNumber(item.value) > 0);
    case 'personality':
      return [
        { id: 'personality-calibration', label: 'Calibration', value: snapshot.personalitySessionCount },
        { id: 'social-context', label: 'Social context', value: snapshot.feedPostCount + snapshot.profileThoughtCount },
      ].filter((item) => normalizeNumber(item.value) > 0);
    case 'voice':
      return [
        { id: 'voice-samples', label: 'Voice samples', value: snapshot.voiceSampleCount },
      ].filter((item) => normalizeNumber(item.value) > 0);
    default:
      return [];
  }
}

async function readCognitiveMapSnapshot() {
  const user = await withReadTimeout(
    safeRead('Current user', () => getCurrentSupabaseUser(), null),
    HOME_COGNITIVE_MAP_READ_TIMEOUT
  );
  if (user === HOME_COGNITIVE_MAP_READ_TIMEOUT) {
    return {
      model: null,
      layers: [],
      preferences: null,
      totalSignals: 0,
      totalRelations: 0,
      resolving: true,
    };
  }

  if (!user?.id) {
    return {
      model: null,
      nodes: [],
      layers: [],
      preferences: null,
      totalSignals: 0,
      totalRelations: 0,
    };
  }

  const model = await withReadTimeout(
    safeRead('Canonical model', () => getOwnedCanonicalModel(), null),
    HOME_COGNITIVE_MAP_READ_TIMEOUT
  );
  if (model === HOME_COGNITIVE_MAP_READ_TIMEOUT) {
    return {
      model: null,
      layers: [],
      preferences: null,
      totalSignals: 0,
      totalRelations: 0,
      resolving: true,
    };
  }

  if (!model?.id) {
    return {
      model: null,
      nodes: [],
      layers: [],
      preferences: null,
      totalSignals: 0,
      totalRelations: 0,
    };
  }

  const [
    sourceVaultRecords,
    trainingDatasets,
    knowledgeEntries,
    logicRecords,
    sourceSessions,
    personalitySessions,
    voiceSamples,
    profilePosts,
    profileThoughts,
    feedPosts,
    digitalBrainPreferences,
  ] = await Promise.all([
    withReadTimeout(safeRead('Source Vault records', () => listModelSourceVaultIndexEntries(), []), []),
    withReadTimeout(safeRead('Training datasets', () => listModelTrainingDatasetEntries(), []), []),
    withReadTimeout(safeRead('Knowledge entries', () => listModelKnowledgeEntries(), []), []),
    withReadTimeout(safeRead('Logic records', () => listModelLogicRecords(), []), []),
    withReadTimeout(safeRead('Source calibration sessions', () => listModelSourceCalibrationSessions(model.id), []), []),
    withReadTimeout(safeRead('Personality calibration sessions', () => listModelPersonalityCalibrationSessions(model.id), []), []),
    withReadTimeout(safeRead('Voice samples', () => listModelVoiceTrainingSamples(model.id), []), []),
    withReadTimeout(safeRead('Profile posts', () => listProfilePosts(), []), []),
    withReadTimeout(safeRead('Profile thoughts', () => listProfileThoughts(), []), []),
    withReadTimeout(safeRead('Feed posts', () => listFeedPosts(), []), []),
    withReadTimeout(safeRead('Digital Brain preferences', () => readModelDigitalBrainPreferences(model.id), null), null),
  ]);
  const livePreferences = HOME_COGNITIVE_MAP_LIVE_PREFERENCES.get(model.id) || null;
  const cachedPreferences = readDigitalBrainPreferencesCache(model.id);
  const resolvedPreferences = resolveFreshestPreferences(digitalBrainPreferences, cachedPreferences, livePreferences);

  const sourceVaultCount = sourceVaultRecords.reduce((total, record) => total + getRecordAggregateCount(record), 0);
  const trainingDatasetCount = trainingDatasets.length;
  const knowledgeEntryCount = knowledgeEntries.length;
  const logicRecordCount = logicRecords.length;
  const sourceInputCount = sourceVaultCount + trainingDatasetCount;
  const memoryInputCount = knowledgeEntryCount + logicRecordCount + trainingDatasetCount;
  const snapshot = {
    model,
    sourceVaultCount,
    trainingDatasetCount,
    knowledgeEntryCount,
    logicRecordCount,
    sourceInputCount,
    memoryInputCount,
    sourceSessionCount: sourceSessions.length,
    personalitySessionCount: personalitySessions.length,
    voiceSampleCount: voiceSamples.length,
    profilePostCount: profilePosts.length,
    profileThoughtCount: profileThoughts.length,
    feedPostCount: feedPosts.length,
  };
  const layers = HOME_COGNITIVE_MAP_LAYERS.map((layer) => {
    const strength = getLayerStrength(layer.id, snapshot);
    const state = getLayerState(strength);
    return {
      ...layer,
      strength,
      state,
      constructs: getLayerConstructs(layer.id, snapshot),
    };
  });

  const totalSignals = sourceInputCount + memoryInputCount + sourceSessions.length + personalitySessions.length;
  const totalConstructs = layers.reduce((total, layer) => total + layer.constructs.length, 0);
  const activeNodeCount = layers.filter((layer) => layer.strength > 0.12).length;

  return {
    model,
    layers,
    preferences: resolvedPreferences,
    totalSignals,
    totalRelations: Math.max(0, activeNodeCount * (activeNodeCount - 1)) + totalConstructs,
  };
}

function createGraphNode(layer) {
  return `
    <button
      class="home-cognitive-map__node home-cognitive-map__node--${layer.id}"
      type="button"
      data-home-cognitive-map-node="${layer.id}"
      data-home-cognitive-map-state="${layer.state}"
      style="--home-cognitive-node-strength:${Math.max(0.14, layer.strength).toFixed(2)};--home-cognitive-node-x:${layer.x}%;--home-cognitive-node-y:${layer.y}%"
      aria-label="${layer.label}: ${titleize(layer.state)}"
    >
      <span class="home-cognitive-map__node-label">${layer.label}</span>
    </button>
  `;
}

function createGraphConstruct(layer, construct, index, total, preferences) {
  const constructSpread = clampNumber(normalizePreferenceNumber(preferences, 'constructSpread', 1), 0, 1.65);
  const position = calculateConstructPosition(layer, index, total, constructSpread);
  const value = normalizeNumber(construct.value) || (normalizeString(construct.value) ? 1 : 0);
  const strength = Math.max(0.12, Math.min(1, Math.log10(value + 1) / 2));
  return `
    <button
      class="home-cognitive-map__construct home-cognitive-map__construct--${layer.id}"
      type="button"
      data-home-cognitive-map-construct="${layer.id}:${construct.id}"
      data-home-cognitive-map-state="${layer.state}"
      style="--home-cognitive-construct-x:${position.x.toFixed(2)}%;--home-cognitive-construct-y:${position.y.toFixed(2)}%;--home-cognitive-construct-strength:${strength.toFixed(2)};--home-cognitive-node-index:${index + 1}"
      aria-label="${construct.label}: ${normalizeString(construct.value) || value}"
    >
      <span class="home-cognitive-map__node-label">${construct.label}</span>
    </button>
  `;
}

function createSignalMetric(label, value, tone = 'source', progress = 0) {
  const normalizedProgress = clampNumber(progress, 0, 1);
  return `
    <article
      class="home-cognitive-map__signal-metric"
      data-home-cognitive-map-tone="${tone}"
      style="--home-cognitive-map-metric-progress:${normalizedProgress.toFixed(3)}"
    >
      <span class="home-cognitive-map__signal-value">${value}</span>
      <span class="home-cognitive-map__signal-label">${label}</span>
    </article>
  `;
}

function getMapSalience(layers = []) {
  if (!Array.isArray(layers) || !layers.length) return 0;
  const total = layers.reduce((sum, layer) => sum + clampNumber(layer.strength || 0, 0, 1), 0);
  return total / layers.length;
}

function stopHomeCognitiveMapPulse(scope) {
  const frame = HOME_COGNITIVE_MAP_PULSE_FRAMES.get(scope);
  if (frame) window.cancelAnimationFrame(frame);
  HOME_COGNITIVE_MAP_PULSE_FRAMES.delete(scope);
}

function scheduleHomeCognitiveMapRetry(scope) {
  if (!(scope instanceof Element)) return;
  const existingTimer = HOME_COGNITIVE_MAP_RETRY_TIMERS.get(scope);
  if (existingTimer) window.clearTimeout(existingTimer);
  const timer = window.setTimeout(() => {
    HOME_COGNITIVE_MAP_RETRY_TIMERS.delete(scope);
    void updateCognitiveMapDisplay(scope);
  }, 900);
  HOME_COGNITIVE_MAP_RETRY_TIMERS.set(scope, timer);
}

function clearHomeCognitiveMapRetry(scope) {
  const timer = HOME_COGNITIVE_MAP_RETRY_TIMERS.get(scope);
  if (timer) window.clearTimeout(timer);
  HOME_COGNITIVE_MAP_RETRY_TIMERS.delete(scope);
}

function syncHomeCognitiveMapPulse(scope, network) {
  if (!(scope instanceof Element) || !(network instanceof HTMLElement)) return;
  stopHomeCognitiveMapPulse(scope);

  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true;
  const motionPaused = network.dataset.homeCognitiveMapMotion === 'paused';
  const motionSpeed = clampNumber(Number(network.dataset.homeCognitiveMapMotionSpeed || 1), 0, 2.5);
  const connectionPulse = clampNumber(Number(network.dataset.homeCognitiveMapPulse || 1), 0, 2.5);

  if (reduceMotion || motionPaused || motionSpeed <= 0 || connectionPulse <= 0) {
    network.style.setProperty('--home-cognitive-live-pulse', '0');
    return;
  }

  const animate = () => {
    if (!scope.isConnected || !network.isConnected) {
      stopHomeCognitiveMapPulse(scope);
      return;
    }

    const livePulse = createHomeCognitiveMapHeartbeatPulse(motionSpeed) * connectionPulse;
    network.style.setProperty('--home-cognitive-live-pulse', livePulse.toFixed(4));
    HOME_COGNITIVE_MAP_PULSE_FRAMES.set(scope, window.requestAnimationFrame(animate));
  };

  HOME_COGNITIVE_MAP_PULSE_FRAMES.set(scope, window.requestAnimationFrame(animate));
}

function applyDigitalBrainPreferencesToNetwork(scope, preferences = {}) {
  const network = scope.querySelector?.('.home-cognitive-map__network');
  if (!(network instanceof HTMLElement)) return false;

  const displayMode = normalizeString(preferences.displayMode || preferences.preferencesPayload?.displayMode || 'nodes');
  const nodeScale = clampNumber(normalizePreferenceNumber(preferences, 'nodeScale', 1), 0, 1.4);
  const constructScale = clampNumber(normalizePreferenceNumber(preferences, 'constructScale', 1), 0, 2.4);
  const connectionScale = clampNumber(normalizePreferenceNumber(preferences, 'connectionScale', 1), 0, 1);
  const connectionVisibility = clampNumber(normalizePreferenceNumber(preferences, 'connectionVisibility', 1), 0, 2.5);
  const signalIntensity = clampNumber(normalizePreferenceNumber(preferences, 'signalIntensity', 1), 0, 1.45);
  const blurIntensity = clampNumber(normalizePreferenceNumber(preferences, 'blurIntensity', 0), 0, 2);
  const connectionPulse = clampNumber(normalizePreferenceNumber(preferences, 'connectionPulse', 1), 0, 2.5);
  const motionSpeed = clampNumber(normalizePreferenceNumber(preferences, 'motionSpeed', 1), 0, 2.5);
  const colorIntensity = clampNumber(normalizePreferenceNumber(preferences, 'colorIntensity', 1), 0, 1.6);
  const motionState = normalizeString(preferences.motionState || preferences.preferencesPayload?.motionState || 'playing');
  const motionDirection = normalizeString(preferences.motionDirection || preferences.preferencesPayload?.motionDirection || 'clockwise');
  const motionPaused = motionState === 'paused' || motionSpeed <= 0;
  const motionDuration = motionSpeed <= 0 ? 999 : Math.max(1.2, 4.8 / motionSpeed);

  network.dataset.homeCognitiveMapDisplay = displayMode === 'scan' || displayMode === 'connectome' ? displayMode : 'nodes';
  network.dataset.homeCognitiveMapMotion = motionPaused ? 'paused' : 'playing';
  network.dataset.homeCognitiveMapMotionDirection = motionDirection === 'counterclockwise' ? 'counterclockwise' : 'clockwise';
  network.dataset.homeCognitiveMapMotionSpeed = String(motionSpeed);
  network.dataset.homeCognitiveMapPulse = String(connectionPulse);
  network.style.setProperty('--home-cognitive-core-node-scale', String(nodeScale));
  network.style.setProperty('--home-cognitive-construct-node-scale', String(constructScale));
  network.style.setProperty('--home-cognitive-connection-scale', String(connectionScale));
  network.style.setProperty('--home-cognitive-connection-visibility', String(connectionVisibility));
  network.style.setProperty('--home-cognitive-signal-intensity', String(signalIntensity));
  network.style.setProperty('--home-cognitive-blur-intensity', `${blurIntensity}px`);
  network.style.setProperty('--home-cognitive-pulse-intensity', String(connectionPulse));
  network.style.setProperty('--home-cognitive-color-intensity', String(colorIntensity));
  network.style.setProperty('--home-cognitive-motion-duration', `${motionDuration.toFixed(2)}s`);
  syncHomeCognitiveMapPulse(scope, network);
  return true;
}

function renderCognitiveMap(scope, snapshot) {
  const graph = scope.querySelector('[data-home-cognitive-map-graph]');
  const stats = scope.querySelector('[data-home-cognitive-map-stats]');

  if (graph instanceof HTMLElement) {
    const preferences = snapshot.preferences || {};
    const displayMode = normalizeString(preferences.displayMode || preferences.preferencesPayload?.displayMode || 'nodes');
    const nodeScale = clampNumber(normalizePreferenceNumber(preferences, 'nodeScale', 1), 0, 1.4);
    const constructScale = clampNumber(normalizePreferenceNumber(preferences, 'constructScale', 1), 0, 2.4);
    const signalIntensity = clampNumber(normalizePreferenceNumber(preferences, 'signalIntensity', 1), 0, 1.45);
    const blurIntensity = clampNumber(normalizePreferenceNumber(preferences, 'blurIntensity', 0), 0, 2);
    const connectionPulse = clampNumber(normalizePreferenceNumber(preferences, 'connectionPulse', 1), 0, 2.5);
    const motionSpeed = clampNumber(normalizePreferenceNumber(preferences, 'motionSpeed', 1), 0, 2.5);
    const colorIntensity = clampNumber(normalizePreferenceNumber(preferences, 'colorIntensity', 1), 0, 1.6);
    const constructNodesVisible = normalizePreferenceBoolean(preferences, 'constructNodesVisible', true);
    const motionState = normalizeString(preferences.motionState || preferences.preferencesPayload?.motionState || 'playing');
    const motionDirection = normalizeString(preferences.motionDirection || preferences.preferencesPayload?.motionDirection || 'clockwise');
    const motionPaused = motionState === 'paused' || motionSpeed <= 0;
    const motionDuration = motionSpeed <= 0 ? 999 : Math.max(1.2, 4.8 / motionSpeed);
    const constructNodes = constructNodesVisible
      ? snapshot.layers.flatMap((layer) => {
        const constructs = layer.constructs || [];
        return constructs.map((construct, index) => createGraphConstruct(layer, construct, index, constructs.length, preferences));
      }).join('')
      : '';
    const activeNodes = snapshot.layers.filter((layer) => layer.strength > 0.12);
    graph.innerHTML = `
      <div
        class="home-cognitive-map__network"
        data-home-cognitive-map-display="${displayMode === 'scan' || displayMode === 'connectome' ? displayMode : 'nodes'}"
        data-home-cognitive-map-motion="${motionPaused ? 'paused' : 'playing'}"
        data-home-cognitive-map-motion-direction="${motionDirection === 'counterclockwise' ? 'counterclockwise' : 'clockwise'}"
        data-home-cognitive-map-motion-speed="${motionSpeed}"
        data-home-cognitive-map-pulse="${connectionPulse}"
        style="--home-cognitive-core-node-scale:${nodeScale};--home-cognitive-construct-node-scale:${constructScale};--home-cognitive-signal-intensity:${signalIntensity};--home-cognitive-blur-intensity:${blurIntensity}px;--home-cognitive-pulse-intensity:${connectionPulse};--home-cognitive-color-intensity:${colorIntensity};--home-cognitive-motion-duration:${motionDuration.toFixed(2)}s"
      >
        <span class="home-cognitive-map__core"></span>
        ${snapshot.layers.map(createGraphNode).join('')}
        ${constructNodes}
      </div>
    `;
    applyDigitalBrainPreferencesToNetwork(scope, preferences);
  }

  if (stats instanceof HTMLElement) {
    const activeDomainCount = snapshot.layers.filter((layer) => layer.strength > 0.12).length;
    const constructCount = snapshot.layers.reduce((total, layer) => total + layer.constructs.length, 0);
    const relationProgress = Math.min(1, Math.log10(Math.max(1, snapshot.totalRelations)) / 2);
    const domainProgress = activeDomainCount / HOME_COGNITIVE_MAP_LAYERS.length;
    const constructProgress = Math.min(1, constructCount / 12);
    const salience = getMapSalience(snapshot.layers);
    stats.innerHTML = [
      createSignalMetric('Domains', activeDomainCount.toLocaleString(), 'source', domainProgress),
      createSignalMetric('Constructs', constructCount.toLocaleString(), 'personality', constructProgress),
      createSignalMetric('Relations', snapshot.totalRelations.toLocaleString(), 'memory', relationProgress),
      createSignalMetric('Salience', `${Math.round(salience * 100)}%`, 'voice', salience),
    ].join('');
  }
}

async function updateCognitiveMapDisplay(scope) {
  const config = getHomeConfig();
  const content = scope.querySelector('[data-home-cognitive-map-content]');
  const loading = scope.querySelector('[data-home-cognitive-map-loading]');
  const empty = scope.querySelector('[data-home-module-empty-state]');

  if (config.visibility?.['cognitive-map'] === false) {
    scope.hidden = true;
    return;
  }

  scope.hidden = false;
  const hasRenderedContent = content instanceof HTMLElement && content.dataset.homeCognitiveMapResolved === 'true';
  if (!hasRenderedContent && content instanceof HTMLElement) content.hidden = true;
  if (empty instanceof HTMLElement) empty.hidden = true;
  if (loading instanceof HTMLElement) loading.hidden = hasRenderedContent;
  scope.setAttribute('aria-busy', 'true');

  let keepLoading = false;
  try {
    const snapshot = await readCognitiveMapSnapshot();
    if (snapshot.resolving) {
      if (content instanceof HTMLElement) content.hidden = !hasRenderedContent;
      if (empty instanceof HTMLElement) empty.hidden = true;
      if (loading instanceof HTMLElement) loading.hidden = hasRenderedContent;
      scope.setAttribute('aria-busy', 'true');
      keepLoading = true;
      scheduleHomeCognitiveMapRetry(scope);
      return;
    }

    clearHomeCognitiveMapRetry(scope);
    const hasGraph = Boolean(snapshot.model?.id);
    if (content instanceof HTMLElement) content.hidden = !hasGraph && !hasRenderedContent;
    if (empty instanceof HTMLElement) empty.hidden = hasGraph || hasRenderedContent;
    if (hasGraph) {
      renderCognitiveMap(scope, snapshot);
      if (content instanceof HTMLElement) {
        content.dataset.homeCognitiveMapResolved = 'true';
        content.hidden = false;
      }
    }
  } finally {
    if (!keepLoading) {
      if (loading instanceof HTMLElement) loading.hidden = true;
      scope.setAttribute('aria-busy', 'false');
    }
  }
}

function listenForConfigChanges(scope) {
  const controller = new AbortController();
  const rerender = () => {
    void updateCognitiveMapDisplay(scope);
  };

  document.addEventListener('neuroartan:home:visibility:changed', (event) => {
    if (event.detail?.moduleId === 'cognitive-map') rerender();
  }, { signal: controller.signal });
  document.addEventListener('neuroartan:home:initialized', rerender, { signal: controller.signal });
  document.addEventListener('neuroartan:supabase-ready', rerender, { signal: controller.signal });
  document.addEventListener('model:digital-brain-refresh-request', rerender, { signal: controller.signal });
  document.addEventListener('model:projection-updated', rerender, { signal: controller.signal });
  document.addEventListener('model:digital-brain-preferences-changed', (event) => {
    const modelId = normalizeString(event.detail?.modelId || '');
    const preferences = event.detail?.preferences;
    if (modelId && preferences && typeof preferences === 'object') {
      const livePreferences = {
        ...preferences,
        cachedAt: new Date().toISOString(),
      };
      HOME_COGNITIVE_MAP_LIVE_PREFERENCES.set(modelId, livePreferences);
      const affectsGraphStructure = ['constructNodesVisible', 'constructSpread'].some((key) => (
        livePreferences[key] !== undefined
        || livePreferences.preferencesPayload?.[key] !== undefined
      ));
      if (affectsGraphStructure || !applyDigitalBrainPreferencesToNetwork(scope, livePreferences)) rerender();
      return;
    }
    rerender();
  }, { signal: controller.signal });

  return () => controller.abort();
}

export function mountHomeCognitiveMap(root) {
  const scope = root?.querySelector?.('[data-home-overview-module="cognitive-map"]')
    || (root?.matches?.('[data-home-overview-module="cognitive-map"]') ? root : null);

  if (!(scope instanceof Element)) return null;

  void updateCognitiveMapDisplay(scope);
  const cleanupConfigChanges = listenForConfigChanges(scope);
  const updateInterval = window.setInterval(() => {
    void updateCognitiveMapDisplay(scope);
  }, 45000);

  return () => {
    clearHomeCognitiveMapRetry(scope);
    stopHomeCognitiveMapPulse(scope);
    cleanupConfigChanges?.();
    window.clearInterval(updateInterval);
  };
}
