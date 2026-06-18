import {
  getCurrentSupabaseUser,
  getModelStoreBackendState,
  getOwnedCanonicalModel,
  listModelChangelogEvents,
  listModelMemoryConsolidationQueue,
  listModelMemoryEdges,
  listModelMemoryItems,
  listModelPersonalityCalibrationSessions,
  listModelSourceCalibrationSessions,
  listModelSourceConnectors,
  listModelTrainingRecords,
  listModelVoiceTrainingSamples,
  readModelMemoryPreferences,
  readModelVoiceTrainingState,
} from '../../../system/model/model-store.js';
import {
  listModelKnowledgeEntries,
  listModelLogicRecords,
  listModelSourceVaultIndexEntries,
  listModelSourceVaultPackageEntries,
  listModelTrainingDatasetEntries,
  readLatestTrainingRecipe,
} from '../../../system/model/model-training-store.js';
import { listProfilePosts } from '../../../system/profile/profile-post-store.js';
import { listProfileThoughts } from '../../../system/profile/profile-thought-store.js';
import { listFeedPosts } from '../../../system/feed/feed-store.js';

const HOME_OVERVIEW_SNAPSHOT_TIMEOUT_MS = 6500;
const HOME_OVERVIEW_SNAPSHOT_TIMEOUT = Object.freeze({ __homeOverviewSnapshotTimeout: true });
const HOME_OVERVIEW_SNAPSHOT_CACHE_MS = 4000;

let snapshotCache = null;

export function normalizeHomeOverviewString(value = '') {
  return String(value || '').trim();
}

export function normalizeHomeOverviewNumber(value = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

export function clampHomeOverviewNumber(value = 0, min = 0, max = 1) {
  return Math.min(max, Math.max(min, normalizeHomeOverviewNumber(value)));
}

export function titleizeHomeOverview(value = '') {
  return normalizeHomeOverviewString(value)
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase()) || 'Pending';
}

function getRecordAggregateCount(record = {}) {
  const metadata = record?.source_metadata && typeof record.source_metadata === 'object'
    ? record.source_metadata
    : {};
  return Math.max(
    1,
    normalizeHomeOverviewNumber(metadata.source_vault_file_count)
      || normalizeHomeOverviewNumber(metadata.file_count)
      || normalizeHomeOverviewNumber(metadata.content_file_count)
      || normalizeHomeOverviewNumber(record.aggregate_count)
      || 1
  );
}

async function safeRead(label, reader, fallback) {
  try {
    return await reader();
  } catch (error) {
    console.warn(`[home-overview] ${label} unavailable.`, error);
    return fallback;
  }
}

async function withReadTimeout(promise, fallback, timeoutMs = HOME_OVERVIEW_SNAPSHOT_TIMEOUT_MS) {
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

function getTrainingProgress(recipe = null) {
  const state = normalizeHomeOverviewString(recipe?.readinessState || recipe?.recipeState || '').toLowerCase();
  if (['ready', 'complete', 'completed', 'trained', 'active'].includes(state)) return 1;
  if (['running', 'training', 'processing', 'queued'].includes(state)) return 0.72;
  if (['draft', 'pending', 'not_requested'].includes(state)) return 0.28;
  return recipe?.id ? 0.42 : 0.08;
}

function getVoiceProgress(voiceState = null, voiceSamples = []) {
  const readiness = normalizeHomeOverviewNumber(voiceState?.readinessScore || voiceState?.readiness_score);
  if (readiness > 0) return clampHomeOverviewNumber(readiness / 100, 0, 1);
  return clampHomeOverviewNumber((Array.isArray(voiceSamples) ? voiceSamples.length : 0) / 12, 0, 1);
}

function getMemoryContinuityProgress(memoryItems = [], memoryEdges = [], memoryPreferences = null) {
  const itemScore = clampHomeOverviewNumber(memoryItems.length / 24, 0, 1) * 0.44;
  const edgeScore = clampHomeOverviewNumber(memoryEdges.length / 48, 0, 1) * 0.32;
  const persistenceScore = memoryPreferences?.indefiniteContinuityEnabled ? 0.24 : 0.08;
  return clampHomeOverviewNumber(itemScore + edgeScore + persistenceScore, 0, 1);
}

function calculateReadiness(snapshot = {}) {
  const checks = [
    Boolean(snapshot.model?.id),
    snapshot.sourceInputCount > 0 || snapshot.sourceSessionCount > 0,
    snapshot.memorySignalCount > 0,
    snapshot.personalitySessionCount > 0,
    snapshot.voiceSampleCount > 0 || Boolean(snapshot.voiceState?.id),
    Boolean(snapshot.recipe?.id),
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

function createRecentActivity(snapshot = {}) {
  const events = [];

  (snapshot.profilePosts || []).slice(0, 4).forEach((post) => {
    events.push({
      type: 'post',
      label: normalizeHomeOverviewString(post.title || post.body || 'Profile post'),
      area: 'Profile',
      createdAt: post.createdAt || post.updatedAt || '',
    });
  });

  (snapshot.profileThoughts || []).slice(0, 4).forEach((thought) => {
    events.push({
      type: 'thought',
      label: normalizeHomeOverviewString(thought.title || thought.text || thought.body || 'Thought'),
      area: 'Thoughts',
      createdAt: thought.createdAt || thought.updatedAt || '',
    });
  });

  (snapshot.feedPosts || []).slice(0, 4).forEach((post) => {
    events.push({
      type: 'feed',
      label: normalizeHomeOverviewString(post.content || post.title || post.body || 'Feed post'),
      area: 'Feed',
      createdAt: post.createdAt || post.updatedAt || '',
    });
  });

  return events
    .sort((a, b) => (Date.parse(b.createdAt || '') || 0) - (Date.parse(a.createdAt || '') || 0))
    .slice(0, 6);
}

function createDirectionItems(snapshot = {}) {
  const items = [];

  if (!snapshot.model?.id) {
    items.push({
      label: 'Activate canonical model',
      detail: 'Complete profile identity so the personal model can resolve securely.',
      priority: 1,
      href: '/profile.html#settings/identity',
    });
  }

  if (snapshot.sourceInputCount < 1) {
    items.push({
      label: 'Connect source memory',
      detail: 'Add governed sources so the model has owner-approved context.',
      priority: 2,
      href: '/model/#model/foundation/sources',
    });
  }

  if (snapshot.memoryItemCount < 1 && snapshot.memoryQueueCount < 1) {
    items.push({
      label: 'Start memory consolidation',
      detail: 'Review approved signals and build continuity memory.',
      priority: 3,
      href: '/model/#model/foundation/memory',
    });
  }

  if (snapshot.personalitySessionCount < 1) {
    items.push({
      label: 'Calibrate personality',
      detail: 'Add trait architecture so responses follow owner intent.',
      priority: 4,
      href: '/model/#model/foundation/personality',
    });
  }

  if (snapshot.voiceSampleCount < 3) {
    items.push({
      label: 'Train expression system',
      detail: 'Capture guided voice samples for speech and tone readiness.',
      priority: 5,
      href: '/model/#model/foundation/voice',
    });
  }

  if (!items.length) {
    items.push({
      label: 'Review model readiness',
      detail: 'Inspect the overview and confirm source, memory, personality, and voice state.',
      priority: 1,
      href: '/model/#model/foundation/overview',
    });
  }

  return items.sort((a, b) => a.priority - b.priority).slice(0, 4);
}

async function buildHomeOverviewSnapshot() {
  const backend = getModelStoreBackendState();
  const user = await withReadTimeout(
    safeRead('Current user', () => getCurrentSupabaseUser(), null),
    HOME_OVERVIEW_SNAPSHOT_TIMEOUT
  );

  if (user === HOME_OVERVIEW_SNAPSHOT_TIMEOUT) {
    return { backend, resolving: true };
  }

  if (!user?.id) {
    return {
      backend,
      user: null,
      model: null,
      readiness: 0,
      directionItems: [],
      recentActivity: [],
    };
  }

  const model = await withReadTimeout(
    safeRead('Canonical model', () => getOwnedCanonicalModel(), null),
    HOME_OVERVIEW_SNAPSHOT_TIMEOUT
  );

  if (model === HOME_OVERVIEW_SNAPSHOT_TIMEOUT) {
    return { backend, user, resolving: true };
  }

  if (!model?.id) {
    return {
      backend,
      user,
      model: null,
      readiness: 0,
      directionItems: [],
      recentActivity: [],
    };
  }

  const [
    sourceVaultRecords,
    sourcePackages,
    trainingDatasets,
    knowledgeEntries,
    logicRecords,
    sourceSessions,
    personalitySessions,
    recipe,
    memoryPreferences,
    memoryItems,
    memoryQueue,
    memoryEdges,
    voiceState,
    voiceSamples,
    sourceConnectors,
    trainingRecords,
    changelogEvents,
    profilePosts,
    profileThoughts,
    feedPosts,
  ] = await Promise.all([
    withReadTimeout(safeRead('Source Vault records', () => listModelSourceVaultIndexEntries(), []), []),
    withReadTimeout(safeRead('Source Vault packages', () => listModelSourceVaultPackageEntries(), []), []),
    withReadTimeout(safeRead('Training datasets', () => listModelTrainingDatasetEntries(), []), []),
    withReadTimeout(safeRead('Knowledge entries', () => listModelKnowledgeEntries(), []), []),
    withReadTimeout(safeRead('Logic records', () => listModelLogicRecords(), []), []),
    withReadTimeout(safeRead('Source calibration sessions', () => listModelSourceCalibrationSessions(model.id), []), []),
    withReadTimeout(safeRead('Personality calibration sessions', () => listModelPersonalityCalibrationSessions(model.id), []), []),
    withReadTimeout(safeRead('Training recipe', () => readLatestTrainingRecipe(), null), null),
    withReadTimeout(safeRead('Memory preferences', () => readModelMemoryPreferences(model.id), null), null),
    withReadTimeout(safeRead('Memory items', () => listModelMemoryItems(model.id, { retentionState: 'all' }), []), []),
    withReadTimeout(safeRead('Memory queue', () => listModelMemoryConsolidationQueue(model.id, { queueState: 'all' }), []), []),
    withReadTimeout(safeRead('Memory edges', () => listModelMemoryEdges(model.id), []), []),
    withReadTimeout(safeRead('Voice state', () => readModelVoiceTrainingState(model.id), null), null),
    withReadTimeout(safeRead('Voice samples', () => listModelVoiceTrainingSamples(model.id), []), []),
    withReadTimeout(safeRead('Source connectors', () => listModelSourceConnectors(model.id), []), []),
    withReadTimeout(safeRead('Training records', () => listModelTrainingRecords(model.id), []), []),
    withReadTimeout(safeRead('Changelog events', () => listModelChangelogEvents(model.id), []), []),
    withReadTimeout(safeRead('Profile posts', () => listProfilePosts(), []), []),
    withReadTimeout(safeRead('Profile thoughts', () => listProfileThoughts(), []), []),
    withReadTimeout(safeRead('Feed posts', () => listFeedPosts(), []), []),
  ]);

  const sourceVaultCount = sourceVaultRecords.reduce((total, record) => total + getRecordAggregateCount(record), 0);
  const trainingDatasetCount = trainingDatasets.length;
  const knowledgeEntryCount = knowledgeEntries.length;
  const logicRecordCount = logicRecords.length;
  const sourceInputCount = sourceVaultCount + trainingDatasetCount;
  const memorySignalCount = memoryItems.length + memoryQueue.length + memoryEdges.length + knowledgeEntryCount + logicRecordCount + profilePosts.length + profileThoughts.length;
  const snapshot = {
    backend,
    user,
    model,
    sourceVaultRecords,
    sourcePackages,
    trainingDatasets,
    knowledgeEntries,
    logicRecords,
    sourceSessions,
    personalitySessions,
    recipe,
    memoryPreferences,
    memoryItems,
    memoryQueue,
    memoryEdges,
    voiceState,
    voiceSamples,
    sourceConnectors,
    trainingRecords,
    changelogEvents,
    profilePosts,
    profileThoughts,
    feedPosts,
    sourceVaultCount,
    sourcePackageCount: sourcePackages.length,
    trainingDatasetCount,
    knowledgeEntryCount,
    logicRecordCount,
    sourceInputCount,
    memorySignalCount,
    sourceSessionCount: sourceSessions.length,
    personalitySessionCount: personalitySessions.length,
    memoryItemCount: memoryItems.length,
    memoryQueueCount: memoryQueue.length,
    memoryEdgeCount: memoryEdges.length,
    voiceSampleCount: voiceSamples.length,
    sourceConnectorCount: sourceConnectors.length,
    trainingRecordCount: trainingRecords.length,
    feedPostCount: feedPosts.length,
    profilePostCount: profilePosts.length,
    profileThoughtCount: profileThoughts.length,
  };

  const readiness = calculateReadiness(snapshot);
  return {
    ...snapshot,
    readiness,
    trainingProgress: getTrainingProgress(recipe),
    voiceProgress: getVoiceProgress(voiceState, voiceSamples),
    continuityProgress: getMemoryContinuityProgress(memoryItems, memoryEdges, memoryPreferences),
    recentActivity: createRecentActivity(snapshot),
    directionItems: createDirectionItems(snapshot),
  };
}

export function clearHomeOverviewSnapshotCache() {
  snapshotCache = null;
}

export async function readHomeOverviewSnapshot({ force = false } = {}) {
  const now = Date.now();
  if (!force && snapshotCache && now - snapshotCache.createdAt < HOME_OVERVIEW_SNAPSHOT_CACHE_MS) {
    return snapshotCache.promise;
  }

  const promise = buildHomeOverviewSnapshot().catch((error) => {
    snapshotCache = null;
    throw error;
  });
  snapshotCache = { createdAt: now, promise };
  return promise;
}
