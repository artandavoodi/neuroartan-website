// MARK: - Digital Brain Maturity Controller

import {
  createDigitalBrainMaturityState,
} from './model-digital-brain-maturity-state.js';

import {
  renderDigitalBrainMaturity,
} from './model-digital-brain-maturity-renderer.js';

import {
  getOwnedCanonicalModel,
  readModelDigitalBrainPreferences,
  readLatestModelPersonalityCalibrationResult,
  readLatestModelSourceCalibrationResult,
  readModelFoundationIdentity,
} from '../../../system/model/model-store.js';

import {
  listModelKnowledgeEntries,
  listModelLogicRecords,
  listModelSourceVaultIndexEntries,
  listModelTrainingDatasetEntries,
  listTrainingRecipeSources,
  readLatestTrainingRecipe,
} from '../../../system/model/model-training-store.js';

import {
  getProfileThoughtState,
} from '../../../profile/private/thoughts/profile-thought-store.js';

const DIGITAL_BRAIN_MATURITY_FRAGMENT_URL = '/assets/fragments/layers/website/model/foundation/digital-brain-maturity/model-digital-brain-maturity.html';
const DIGITAL_BRAIN_MATURITY_DATA_URL = '/assets/data/website/model-foundation/digital-brain-maturity/digital-brain-maturity-layers.json';
const DIGITAL_BRAIN_QUICK_READ_TIMEOUT_MS = 8000;
const DIGITAL_BRAIN_SOURCE_READ_TIMEOUT_MS = 0;
const DIGITAL_BRAIN_CONTENT_SEGMENT_MIN_LENGTH = 24;
const DIGITAL_BRAIN_SUBJECT_MIN_COUNT = 2;
const DIGITAL_BRAIN_DETAIL_VISUAL_ROLE = 'detail';
const DIGITAL_BRAIN_CONSTRUCT_VISUAL_ROLE = 'construct';
const DIGITAL_BRAIN_CLUSTER_VISUAL_ROLE = 'cluster';
const DIGITAL_BRAIN_PROTECTED_VALUE = 'Protected by owner controls';
const DIGITAL_BRAIN_SENSITIVE_LABEL_PATTERN = /\b(api|auth|token|secret|password|passkey|private|owner|model\s*id|profile\s*id|user\s*id|birth\s*certificate|serial|key)\b/i;
const DIGITAL_BRAIN_UUID_PATTERN = /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi;
const DIGITAL_BRAIN_SECRET_PATTERN = /\b(?:sk-[a-z0-9_-]{12,}|pk_[a-z0-9_-]{12,}|eyJ[a-z0-9_-]{16,}|[a-z0-9]{32,})\b/gi;
const DIGITAL_BRAIN_STOP_WORDS = Object.freeze(new Set([
  'about',
  'after',
  'again',
  'also',
  'because',
  'before',
  'between',
  'could',
  'every',
  'everything',
  'from',
  'have',
  'into',
  'like',
  'make',
  'must',
  'need',
  'needs',
  'only',
  'right',
  'should',
  'that',
  'their',
  'there',
  'these',
  'thing',
  'things',
  'this',
  'through',
  'with',
  'would',
  'your',
]));

const DIGITAL_BRAIN_CONSTRUCT_TERMS = Object.freeze({
  identity: ['identity', 'name', 'biography', 'birth', 'owner', 'profile', 'role', 'self', 'origin'],
  source: ['axiom', 'belief', 'principle', 'value', 'reason', 'decision', 'agency', 'orientation', 'evidence', 'source'],
  personality: ['personality', 'trait', 'motivation', 'style', 'relationship', 'family', 'friend', 'social', 'risk', 'emotion', 'assertive'],
  memory: ['memory', 'remember', 'experience', 'event', 'history', 'context', 'knowledge', 'learning', 'pattern', 'thought'],
  voice: ['voice', 'tone', 'speech', 'language', 'rhythm', 'expression', 'response', 'communication'],
});

const DIGITAL_BRAIN_FOUNDATION_CONSTRUCTS = Object.freeze({
  identity: [
    ['canonical_identity', 'Canonical identity'],
    ['owner_continuity', 'Owner continuity'],
    ['biographical_anchor', 'Biographical anchor'],
    ['private_record_chain', 'Private record chain'],
  ],
  source: [
    ['agency_orientation', 'Agency orientation'],
    ['axiom_structure', 'Axiom structure'],
    ['belief_regulation', 'Belief regulation'],
    ['salience_monitoring', 'Salience monitoring'],
  ],
  personality: [
    ['trait_expression', 'Trait expression'],
    ['motivational_pattern', 'Motivational pattern'],
    ['interpersonal_style', 'Interpersonal style'],
    ['adaptive_risk_pattern', 'Adaptive risk pattern'],
  ],
  memory: [
    ['episodic_continuity', 'Episodic continuity'],
    ['semantic_context', 'Semantic context'],
    ['emotional_salience', 'Emotional salience'],
    ['retrieval_linking', 'Retrieval linking'],
  ],
  voice: [
    ['prosodic_identity', 'Prosodic identity'],
    ['rhythm_pacing', 'Rhythm and pacing'],
    ['expression_alignment', 'Expression alignment'],
    ['activation_control', 'Activation control'],
  ],
});

let digitalBrainMaturityInitialized = false;
let digitalBrainMaturityFragment = null;
let digitalBrainMaturityData = null;
let digitalBrainMaturityRefreshBound = false;
let digitalBrainMaturityRefreshPromise = null;

export async function initializeDigitalBrainMaturity(root = document) {
  const mount = root.querySelector?.('[data-model-digital-brain-maturity-mount]')
    || document.querySelector('[data-model-digital-brain-maturity-mount]');

  if (!(mount instanceof HTMLElement)) {
    return null;
  }

  const [fragment, data] = await Promise.all([
    loadDigitalBrainMaturityFragment(),
    loadDigitalBrainMaturityData(),
  ]);
  bindDigitalBrainMaturityRefreshRequests();

  if (!mount.querySelector('[data-digital-brain-maturity-surface]')) {
    mount.innerHTML = fragment;
  }
  const runtime = await createDigitalBrainRuntimeSnapshot({ includeSourceRecords: false });
  const state = createDigitalBrainMaturityState(data, runtime);
  renderDigitalBrainMaturity(mount, state);
  window.requestAnimationFrame(() => {
    void refreshDigitalBrainMaturity(root);
  });
  digitalBrainMaturityInitialized = true;

  return state;
}

export async function refreshDigitalBrainMaturity(root = document) {
  if (digitalBrainMaturityRefreshPromise) return digitalBrainMaturityRefreshPromise;

  const mount = root.querySelector?.('[data-model-digital-brain-maturity-mount]')
    || document.querySelector('[data-model-digital-brain-maturity-mount]');

  if (!(mount instanceof HTMLElement) || !digitalBrainMaturityData) {
    return null;
  }

  digitalBrainMaturityRefreshPromise = (async () => {
    const runtime = await createDigitalBrainRuntimeSnapshot({ includeSourceRecords: true });
    const state = createDigitalBrainMaturityState(digitalBrainMaturityData, runtime);
    renderDigitalBrainMaturity(mount, state);
    return state;
  })().finally(() => {
    digitalBrainMaturityRefreshPromise = null;
  });

  return digitalBrainMaturityRefreshPromise;
}

export function isDigitalBrainMaturityInitialized() {
  return digitalBrainMaturityInitialized;
}

function bindDigitalBrainMaturityRefreshRequests() {
  if (digitalBrainMaturityRefreshBound) return;
  digitalBrainMaturityRefreshBound = true;
  document.addEventListener('model:digital-brain-refresh-request', () => {
    void refreshDigitalBrainMaturity(document);
  });
}

async function loadDigitalBrainMaturityFragment() {
  if (digitalBrainMaturityFragment !== null) {
    return digitalBrainMaturityFragment;
  }

  const response = await fetch(DIGITAL_BRAIN_MATURITY_FRAGMENT_URL, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error('Unable to load Digital Brain Maturity fragment.');
  }

  digitalBrainMaturityFragment = await response.text();
  return digitalBrainMaturityFragment;
}

async function loadDigitalBrainMaturityData() {
  if (digitalBrainMaturityData !== null) {
    return digitalBrainMaturityData;
  }

  const response = await fetch(DIGITAL_BRAIN_MATURITY_DATA_URL, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error('Unable to load Digital Brain Maturity data.');
  }

  digitalBrainMaturityData = await response.json();
  return digitalBrainMaturityData;
}

async function createDigitalBrainRuntimeSnapshot(options = {}) {
  const includeSourceRecords = options.includeSourceRecords !== false;
  const runtime = {
    modelId: '',
    layers: {
      identity: createEmptyDigitalBrainRuntimeLayer('identity'),
      source: createEmptyDigitalBrainRuntimeLayer('source'),
      personality: createEmptyDigitalBrainRuntimeLayer('personality'),
      memory: createEmptyDigitalBrainRuntimeLayer('memory'),
      voice: createEmptyDigitalBrainRuntimeLayer('voice'),
    },
  };

  const model = await withDigitalBrainReadTimeout(getOwnedCanonicalModel(), null, DIGITAL_BRAIN_QUICK_READ_TIMEOUT_MS);
  runtime.modelId = normalizeDigitalBrainString(model?.id || '');

  if (!model?.id) return runtime;

  const [
    identity,
    sourceResult,
    personalityResult,
    sourceVaultEntries,
    trainingDatasets,
    knowledgeEntries,
    logicRecords,
    trainingRecipe,
    digitalBrainPreferences,
  ] = await Promise.all([
    withDigitalBrainReadTimeout(readModelFoundationIdentity(model.id), null, DIGITAL_BRAIN_QUICK_READ_TIMEOUT_MS),
    withDigitalBrainReadTimeout(readLatestModelSourceCalibrationResult(model.id), null, DIGITAL_BRAIN_QUICK_READ_TIMEOUT_MS),
    withDigitalBrainReadTimeout(readLatestModelPersonalityCalibrationResult(model.id), null, DIGITAL_BRAIN_QUICK_READ_TIMEOUT_MS),
    includeSourceRecords ? withDigitalBrainReadTimeout(listModelSourceVaultIndexEntries(), [], DIGITAL_BRAIN_SOURCE_READ_TIMEOUT_MS) : Promise.resolve([]),
    includeSourceRecords ? withDigitalBrainReadTimeout(listModelTrainingDatasetEntries(), [], DIGITAL_BRAIN_SOURCE_READ_TIMEOUT_MS) : Promise.resolve([]),
    includeSourceRecords ? withDigitalBrainReadTimeout(listModelKnowledgeEntries(), [], DIGITAL_BRAIN_SOURCE_READ_TIMEOUT_MS) : Promise.resolve([]),
    includeSourceRecords ? withDigitalBrainReadTimeout(listModelLogicRecords(), [], DIGITAL_BRAIN_SOURCE_READ_TIMEOUT_MS) : Promise.resolve([]),
    withDigitalBrainReadTimeout(readLatestTrainingRecipe(), null, DIGITAL_BRAIN_QUICK_READ_TIMEOUT_MS),
    withDigitalBrainReadTimeout(readModelDigitalBrainPreferences(model.id), null, DIGITAL_BRAIN_QUICK_READ_TIMEOUT_MS),
  ]);
  const recipeSources = includeSourceRecords && trainingRecipe?.id
    ? await withDigitalBrainReadTimeout(listTrainingRecipeSources(trainingRecipe.id), [], DIGITAL_BRAIN_SOURCE_READ_TIMEOUT_MS)
    : [];

  runtime.layers.identity = createIdentityRuntimeLayer(model, identity);
  runtime.layers.source = createSourceRuntimeLayer(sourceResult, sourceVaultEntries, trainingDatasets, recipeSources);
  runtime.layers.personality = createPersonalityRuntimeLayer(personalityResult);
  runtime.layers.memory = createMemoryRuntimeLayer(getProfileThoughtState(), knowledgeEntries, logicRecords, trainingDatasets);
  runtime.layers.voice = createVoiceRuntimeLayer(model, identity);
  runtime.digitalBrainPreferences = digitalBrainPreferences;

  return runtime;
}

function withDigitalBrainReadTimeout(promise, fallback, timeoutMs = 1400) {
  if (Number(timeoutMs) <= 0) {
    return Promise.resolve(promise).catch(() => fallback);
  }

  return Promise.race([
    Promise.resolve(promise).catch(() => fallback),
    new Promise((resolve) => {
      window.setTimeout(() => resolve(fallback), timeoutMs);
    }),
  ]);
}

function createIdentityRuntimeLayer(model = {}, identity = {}) {
  const liveSignals = [
    createSignal('model_record', 'Model record', model?.id, 'identity', { private: true }),
    createSignal('profile_link', 'Profile link', model?.profile_id || identity?.profileId, 'identity', { private: true }),
    createSignal('public_identity', 'Public identity', model?.public_identity_id || identity?.publicIdentityId, 'identity', { private: true }),
    createSignal('private_identity', 'Private identity', model?.private_identity_id || identity?.privateIdentityId, 'identity', { private: true }),
    createSignal('birth_certificate', 'Birth certificate', model?.birth_certificate_id || identity?.birthCertificateId, 'identity', { private: true }),
    createSignal('model_name', 'Model name', model?.model_name || identity?.modelNickname),
  ].filter(Boolean);
  const signals = mergeDigitalBrainConstructSignals('identity', liveSignals);

  return {
    state: liveSignals.length >= 4 ? 'complete' : liveSignals.length ? 'initial' : 'pending',
    signals,
  };
}

function createSourceRuntimeLayer(sourceResult = null, sourceVaultRecords = [], trainingDatasetRecords = [], recipeSources = []) {
  const payload = sourceResult?.result_payload || sourceResult || null;
  const liveSignals = [
    ...createMetricSignals(payload?.summary_metrics, 'source_summary'),
    ...createMetricSignals(payload?.dimension_outputs, 'source_dimension'),
    ...createMetricSignals(payload?.dimension_scores, 'source_score'),
    ...createRecordClusterSignals(sourceVaultRecords, 'source_vault', 'source', { includeDetails: false }),
    ...createRecordClusterSignals(trainingDatasetRecords, 'dataset', 'source'),
    ...createRecordClusterSignals(recipeSources, 'recipe_source', 'source'),
  ];
  const signals = mergeDigitalBrainConstructSignals('source', liveSignals);

  return {
    state: payload ? 'complete' : liveSignals.length ? 'initial' : 'pending',
    signals,
  };
}

function createPersonalityRuntimeLayer(personalityResult = null) {
  const payload = personalityResult?.result_payload || personalityResult || null;
  const liveSignals = [
    ...createMetricSignals(payload?.summary_metrics, 'personality_summary'),
    ...createMetricSignals(payload?.dimension_scores, 'personality_dimension'),
    ...createMetricSignals(payload?.construct_scores, 'personality_construct'),
  ];
  const signals = mergeDigitalBrainConstructSignals('personality', liveSignals);

  return {
    state: payload ? 'complete' : liveSignals.length ? 'initial' : 'pending',
    signals,
  };
}

function createMemoryRuntimeLayer(thoughtState = {}, knowledgeEntries = [], logicRecords = [], datasets = []) {
  const categoryCounts = Array.isArray(thoughtState?.categoryCounts) ? thoughtState.categoryCounts : [];
  const thoughtEntries = Array.isArray(thoughtState?.entries) ? thoughtState.entries : [];
  const thoughtSignals = categoryCounts
    .filter((category) => Number(category?.count || 0) > 0)
    .map((category) => createSignal(
      `thought_${category.key}`,
      category.label || category.key,
      `${Number(category.count)} thought${Number(category.count) === 1 ? '' : 's'}`,
      'thought',
    ))
    .filter(Boolean);
  const thoughtContentSignals = thoughtEntries.flatMap((entry, index) => createContentSignalsFromRecord({
    id: entry.id || `thought_${index}`,
    source_title: entry.category || 'Thought',
    source_content: entry.text,
    source_kind: 'thought',
    source_metadata: {
      thought_category: entry.category,
      created_at: entry.createdAt,
      updated_at: entry.updatedAt,
    },
  }, 'thought', 'memory'));

  const liveSignals = [
    ...thoughtSignals,
    ...thoughtContentSignals,
    ...createRecordClusterSignals(knowledgeEntries, 'knowledge', 'memory'),
    ...createRecordClusterSignals(logicRecords, 'logic', 'memory'),
    ...createRecordClusterSignals(datasets.filter((record) => !isSourceVaultRecord(record)), 'dataset_memory', 'memory'),
  ];
  const signals = mergeDigitalBrainConstructSignals('memory', liveSignals);

  return {
    state: liveSignals.length ? 'forming' : 'pending',
    signals,
  };
}

function createVoiceRuntimeLayer(model = {}, identity = {}) {
  const liveSignals = [
    createSignal('voice_avatar', 'Model avatar', model?.model_image_url || identity?.modelAvatar, 'voice', {
      private: true,
    }),
  ].filter(Boolean);
  const signals = mergeDigitalBrainConstructSignals('voice', liveSignals);

  return {
    state: liveSignals.length ? 'initial' : 'pending',
    signals,
  };
}

function createMetricSignals(metrics = {}, source = '') {
  if (!metrics || typeof metrics !== 'object' || Array.isArray(metrics)) return [];

  return Object.entries(metrics)
    .map(([key, value]) => createSignal(key, formatDigitalBrainKey(key), formatDigitalBrainMetricValue(value), source, {
      category: 'metric',
      visualRole: DIGITAL_BRAIN_CONSTRUCT_VISUAL_ROLE,
      aggregateCount: 1,
      impact: calculateMetricImpact(value),
    }))
    .filter(Boolean);
}

function createRecordSignals(records = [], source = '', layerId = '') {
  return (Array.isArray(records) ? records : [])
    .flatMap((record) => {
      const id = normalizeDigitalBrainString(record?.id || record?.source_id || record?.logic_id || '');
      const label = normalizeDigitalBrainString(
        record?.source_title
        || record?.title
        || record?.logic_title
        || record?.name
        || id
      );
      const value = normalizeDigitalBrainString(
        record?.source_kind
        || record?.kind
        || record?.logic_state
        || record?.source_status
        || ''
      );
      const baseSignal = createSignal(id || label, label, value, source, {
        category: classifyDigitalBrainConstruct(`${label} ${value}`, layerId),
        reference: normalizeDigitalBrainString(record?.source_reference || record?.reference || ''),
        dataType: normalizeDigitalBrainString(record?.source_kind || record?.kind || source),
        visualRole: DIGITAL_BRAIN_DETAIL_VISUAL_ROLE,
        aggregateCount: 1,
        impact: calculateRecordImpact(record),
      });
      return [
        baseSignal,
        ...createContentSignalsFromRecord(record, source, layerId),
      ];
    })
    .filter(Boolean);
}

function createRecordClusterSignals(records = [], source = '', layerId = '', options = {}) {
  const normalizedRecords = Array.isArray(records) ? records.filter(Boolean) : [];
  if (!normalizedRecords.length) return [];

  const includeDetails = options.includeDetails !== false;
  const detailSignals = includeDetails ? createRecordSignals(normalizedRecords, source, layerId) : [];
  const clusterSignals = createRecordSubjectClusters(normalizedRecords, source, layerId);
  return [...clusterSignals, ...detailSignals];
}

function createRecordSubjectClusters(records = [], source = '', layerId = '') {
  const clusters = new Map();

  records.forEach((record) => {
    const label = normalizeDigitalBrainString(record?.source_title || record?.title || record?.logic_title || record?.name || '');
    const value = normalizeDigitalBrainString(record?.source_kind || record?.kind || record?.logic_state || record?.source_status || source);
    const subject = deriveDigitalBrainRecordSubject(record, layerId);
    const category = classifyDigitalBrainConstruct(`${label} ${value} ${subject}`, layerId);
    const key = `${category || layerId}:${subject || value || source}`;
    const metadata = record?.source_metadata && typeof record.source_metadata === 'object' ? record.source_metadata : {};
    const aggregateCount = Number(metadata.source_vault_file_count || metadata.file_count || metadata.content_file_count || 1);
    const contentChars = Number(metadata.source_vault_total_content_chars || metadata.total_content_chars || metadata.content_chars || 0);
    const entry = clusters.get(key) || {
      subject: subject || formatDigitalBrainKey(value || source),
      category,
      rowCount: 0,
      count: 0,
      contentChars: 0,
      impact: 0,
      references: new Set(),
      dataTypes: new Set(),
    };
    entry.rowCount += 1;
    entry.count += Math.max(1, Number.isFinite(aggregateCount) ? aggregateCount : 1);
    entry.contentChars += Math.max(0, Number.isFinite(contentChars) ? contentChars : 0);
    entry.impact += calculateRecordImpact(record);
    if (label) entry.references.add(label);
    if (value) entry.dataTypes.add(value);
    clusters.set(key, entry);
  });

  return Array.from(clusters.entries()).map(([key, entry]) => {
    const averageImpact = entry.impact / Math.max(1, entry.rowCount);
    const label = formatDigitalBrainSubject(entry.subject || key);
    const references = Array.from(entry.references).slice(0, 3).join(', ');
    const value = entry.contentChars > 0
      ? `${entry.count} source item${entry.count === 1 ? '' : 's'} · ${formatDigitalBrainLargeNumber(entry.contentChars)} characters`
      : `${entry.count} source item${entry.count === 1 ? '' : 's'}`;

    return createSignal(`${source}_${layerId}_${hashDigitalBrainText(key)}`, label, value, source, {
      category: entry.category || layerId,
      subject: entry.subject,
      reference: references,
      dataType: Array.from(entry.dataTypes).slice(0, 3).join(', ') || source,
      searchableText: `${label} ${value} ${references}`,
      visualRole: DIGITAL_BRAIN_CLUSTER_VISUAL_ROLE,
      aggregateCount: entry.count,
      impact: clampDigitalBrainNumber(averageImpact + Math.log10(entry.count + 1) / 5, 0.2, 1),
    });
  }).filter(Boolean);
}

function mergeDigitalBrainConstructSignals(layerId = '', liveSignals = []) {
  const merged = new Map();
  const constructSignals = (DIGITAL_BRAIN_FOUNDATION_CONSTRUCTS[layerId] || [])
    .map(([id, label]) => createSignal(id, label, '', 'foundation_construct', {
      category: 'foundation_construct',
      visualRole: DIGITAL_BRAIN_CONSTRUCT_VISUAL_ROLE,
      aggregateCount: 1,
      impact: 0.18,
    }))
    .filter(Boolean);

  [...constructSignals, ...liveSignals].forEach((signal) => {
    if (!signal?.id) return;
    const existing = merged.get(signal.id);
    if (!existing || signal.value) {
      merged.set(signal.id, signal);
    }
  });

  return Array.from(merged.values());
}

function createEmptyDigitalBrainRuntimeLayer(layerId = '') {
  return {
    state: 'pending',
    signals: mergeDigitalBrainConstructSignals(layerId, []),
  };
}

function createSignal(id = '', label = '', value = '', source = '', options = {}) {
  const normalizedLabel = normalizeDigitalBrainString(label);
  const protectedSignal = options.private === true || isSensitiveDigitalBrainSignal(normalizedLabel, value);
  const normalizedValue = protectedSignal
    ? DIGITAL_BRAIN_PROTECTED_VALUE
    : redactDigitalBrainSensitiveText(normalizeDigitalBrainString(value));

  if (!normalizedLabel && !normalizedValue) return null;

  return {
    id: normalizeDigitalBrainString(id || normalizedLabel).toLowerCase().replace(/[^a-z0-9]+/g, '_'),
    label: normalizedLabel,
    value: normalizedValue,
    source: normalizeDigitalBrainString(source),
    category: normalizeDigitalBrainString(options.category),
    subject: normalizeDigitalBrainString(options.subject),
    reference: protectedSignal ? '' : redactDigitalBrainSensitiveText(normalizeDigitalBrainString(options.reference)),
    dataType: normalizeDigitalBrainString(options.dataType),
    searchableText: protectedSignal ? '' : redactDigitalBrainSensitiveText(normalizeDigitalBrainString(options.searchableText)),
    searchVisible: options.searchVisible === false || protectedSignal ? false : true,
    privacy: protectedSignal ? 'protected' : 'standard',
    visualRole: normalizeDigitalBrainString(options.visualRole || DIGITAL_BRAIN_CONSTRUCT_VISUAL_ROLE),
    aggregateCount: Math.max(1, Math.round(Number(options.aggregateCount || 1))),
    impact: clampDigitalBrainNumber(options.impact, 0.08, 1),
  };
}

function isSensitiveDigitalBrainSignal(label = '', value = '') {
  const labelText = normalizeDigitalBrainString(label);
  const valueText = normalizeDigitalBrainString(value);
  DIGITAL_BRAIN_UUID_PATTERN.lastIndex = 0;
  DIGITAL_BRAIN_SECRET_PATTERN.lastIndex = 0;
  return DIGITAL_BRAIN_SENSITIVE_LABEL_PATTERN.test(labelText)
    || DIGITAL_BRAIN_UUID_PATTERN.test(valueText)
    || DIGITAL_BRAIN_SECRET_PATTERN.test(valueText);
}

function redactDigitalBrainSensitiveText(value = '') {
  DIGITAL_BRAIN_UUID_PATTERN.lastIndex = 0;
  DIGITAL_BRAIN_SECRET_PATTERN.lastIndex = 0;
  return normalizeDigitalBrainString(value)
    .replace(DIGITAL_BRAIN_UUID_PATTERN, '[protected id]')
    .replace(DIGITAL_BRAIN_SECRET_PATTERN, '[protected secret]');
}

function createContentSignalsFromRecord(record = {}, source = '', layerId = '') {
  const sourceContent = normalizeDigitalBrainString(record?.source_content || record?.logic_body || record?.content || record?.text);
  const metadata = record?.source_metadata && typeof record.source_metadata === 'object' ? record.source_metadata : {};
  const contentFiles = Array.isArray(metadata.content_files) ? metadata.content_files : [];
  const contentSegments = [
    ...extractDigitalBrainContentSegments(sourceContent),
    ...contentFiles.flatMap((file) => {
      const content = normalizeDigitalBrainString(file?.content);
      if (!content) return [];
      return extractDigitalBrainContentSegments(content).map((segment) => ({
        ...segment,
        title: segment.title || normalizeDigitalBrainString(file.relativePath || file.name),
        reference: normalizeDigitalBrainString(file.relativePath || file.name),
        extension: normalizeDigitalBrainString(file.extension),
      }));
    }),
  ];

  const recordId = normalizeDigitalBrainString(record?.id || record?.source_reference || record?.logic_title || source || 'record');
  const recordTitle = normalizeDigitalBrainString(record?.source_title || record?.logic_title || record?.title || source || 'Source');

  const detailSignals = contentSegments
    .map((segment, index) => {
      const label = deriveDigitalBrainSegmentLabel(segment, recordTitle);
      const text = normalizeDigitalBrainString(segment.text);
      const category = classifyDigitalBrainConstruct(`${label} ${text}`, layerId);
      const subject = deriveDigitalBrainSubject(`${label} ${text}`) || category;
      return createSignal(`${recordId}_${index}_${hashDigitalBrainText(label + text)}`, label, createDigitalBrainExcerpt(text), source, {
        category,
        subject,
        reference: normalizeDigitalBrainString(segment.reference || record?.source_reference || recordTitle),
        dataType: normalizeDigitalBrainString(record?.source_kind || record?.kind || segment.extension || source),
        searchableText: text,
        visualRole: DIGITAL_BRAIN_DETAIL_VISUAL_ROLE,
        aggregateCount: 1,
        impact: calculateContentImpact(text),
      });
    })
    .filter(Boolean);

  return [
    ...createSubjectClusterSignals(detailSignals, recordId, recordTitle, source, layerId),
    ...detailSignals,
  ];
}

function createSubjectClusterSignals(signals = [], recordId = '', recordTitle = '', source = '', layerId = '') {
  const subjects = new Map();
  signals.forEach((signal) => {
    const subject = normalizeDigitalBrainString(signal.subject || signal.category);
    if (!subject) return;
    const entry = subjects.get(subject) || {
      count: 0,
      impact: 0,
      category: normalizeDigitalBrainString(signal.category || layerId),
      references: new Set(),
    };
    entry.count += 1;
    entry.impact += Number(signal.impact || 0);
    if (signal.reference) entry.references.add(signal.reference);
    subjects.set(subject, entry);
  });

  return Array.from(subjects.entries())
    .filter(([, entry]) => entry.count >= DIGITAL_BRAIN_SUBJECT_MIN_COUNT)
    .map(([subject, entry]) => {
      const averageImpact = entry.count ? entry.impact / entry.count : 0;
      const referenceLabel = Array.from(entry.references).slice(0, 3).join(', ');
      return createSignal(`${recordId}_subject_${hashDigitalBrainText(subject)}`, formatDigitalBrainSubject(subject), `${entry.count} linked detail node${entry.count === 1 ? '' : 's'}`, source, {
        category: entry.category || layerId,
        subject,
        reference: referenceLabel || recordTitle,
        dataType: 'subject_cluster',
        visualRole: DIGITAL_BRAIN_CLUSTER_VISUAL_ROLE,
        aggregateCount: entry.count,
        impact: clampDigitalBrainNumber(averageImpact + Math.log10(entry.count + 1) / 4, 0.24, 1),
      });
    });
}

function deriveDigitalBrainRecordSubject(record = {}, layerId = '') {
  const metadata = record?.source_metadata && typeof record.source_metadata === 'object' ? record.source_metadata : {};
  const candidatePath = normalizeDigitalBrainString(
    record?.source_reference
    || metadata.source_vault_parent_reference
    || metadata.relative_path
    || record?.source_title
    || record?.title
    || ''
  );
  const pathSubject = deriveDigitalBrainPathSubject(candidatePath);
  if (pathSubject) return pathSubject;

  const text = [
    record?.source_title,
    record?.title,
    record?.logic_title,
    record?.source_kind,
    record?.kind,
    layerId,
  ].map(normalizeDigitalBrainString).filter(Boolean).join(' ');
  return deriveDigitalBrainSubject(text) || formatDigitalBrainKey(record?.source_kind || record?.kind || layerId || 'source');
}

function deriveDigitalBrainPathSubject(path = '') {
  const parts = normalizeDigitalBrainString(path)
    .split(/[\\/]+/)
    .map((part) => normalizeDigitalBrainString(part).replace(/\.[a-z0-9]+$/i, ''))
    .map((part) => part.replace(/^\d+\s*[-–—_.]\s*/, '').trim())
    .filter((part) => part && !/^[a-z]$/i.test(part));
  const preferred = parts.find((part) => !['i', 'docs', 'documents', 'source', 'sources'].includes(part.toLowerCase()));
  return preferred || '';
}

function extractDigitalBrainContentSegments(content = '') {
  const text = normalizeDigitalBrainString(content).replace(/\r\n/g, '\n');
  if (!text) return [];

  const headingSegments = [];
  const headingPattern = /(^|\n)(#{1,6})\s+(.+?)(?=\n)/g;
  const matches = Array.from(text.matchAll(headingPattern));
  if (matches.length) {
    matches.forEach((match, index) => {
      const start = match.index + match[0].length;
      const end = index + 1 < matches.length ? matches[index + 1].index : text.length;
      const body = text.slice(start, end).trim();
      if (body.length >= DIGITAL_BRAIN_CONTENT_SEGMENT_MIN_LENGTH) {
        headingSegments.push({
          title: normalizeDigitalBrainString(match[3]),
          text: body,
        });
      }
    });
  }

  if (headingSegments.length) return headingSegments;

  const paragraphs = text
    .split(/\n{2,}/)
    .map((paragraph) => normalizeDigitalBrainString(paragraph))
    .filter((paragraph) => paragraph.length >= DIGITAL_BRAIN_CONTENT_SEGMENT_MIN_LENGTH);

  if (paragraphs.length) {
    return paragraphs.map((paragraph) => ({
      title: '',
      text: paragraph,
    }));
  }

  return text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => normalizeDigitalBrainString(sentence))
    .filter((sentence) => sentence.length >= DIGITAL_BRAIN_CONTENT_SEGMENT_MIN_LENGTH)
    .map((sentence) => ({
      title: '',
      text: sentence,
    }));
}

function deriveDigitalBrainSegmentLabel(segment = {}, fallback = 'Source') {
  const title = normalizeDigitalBrainString(segment.title);
  if (title) return title.slice(0, 96);
  const firstLine = normalizeDigitalBrainString(segment.text).split('\n')[0] || fallback;
  return firstLine.replace(/^[-*\d.\s]+/, '').slice(0, 96) || fallback;
}

function deriveDigitalBrainSubject(text = '') {
  const normalized = normalizeDigitalBrainString(text).toLowerCase();
  if (!normalized) return '';
  const phraseMatches = normalized.match(/\b[a-z][a-z0-9-]{3,}(?:\s+[a-z][a-z0-9-]{3,}){0,2}\b/g) || [];
  const counts = new Map();

  phraseMatches.forEach((phrase) => {
    const cleaned = phrase
      .split(/\s+/)
      .filter((word) => word.length > 3 && !DIGITAL_BRAIN_STOP_WORDS.has(word))
      .slice(0, 3)
      .join(' ');
    if (!cleaned) return;
    counts.set(cleaned, (counts.get(cleaned) || 0) + 1);
  });

  const [subject] = Array.from(counts.entries())
    .sort((left, right) => right[1] - left[1] || right[0].length - left[0].length)[0] || [];
  return subject || '';
}

function formatDigitalBrainSubject(subject = '') {
  return normalizeDigitalBrainString(subject)
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatDigitalBrainLargeNumber(value = 0) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '0';
  if (number >= 1000000) return `${Math.round(number / 100000) / 10}M`;
  if (number >= 1000) return `${Math.round(number / 100) / 10}K`;
  return String(Math.round(number));
}

function createDigitalBrainExcerpt(text = '') {
  const normalized = normalizeDigitalBrainString(text).replace(/\s+/g, ' ');
  return normalized.length > 260 ? `${normalized.slice(0, 257)}...` : normalized;
}

function classifyDigitalBrainConstruct(text = '', fallbackLayer = '') {
  const normalized = normalizeDigitalBrainString(text).toLowerCase();
  let bestLayer = normalizeDigitalBrainString(fallbackLayer);
  let bestScore = 0;

  Object.entries(DIGITAL_BRAIN_CONSTRUCT_TERMS).forEach(([layerId, terms]) => {
    const score = terms.reduce((sum, term) => sum + (normalized.includes(term) ? 1 : 0), 0);
    if (score > bestScore) {
      bestLayer = layerId;
      bestScore = score;
    }
  });

  return bestLayer || 'semantic_context';
}

function calculateRecordImpact(record = {}) {
  const byteSize = Number(record?.source_metadata?.total_accepted_bytes || record?.size || 0);
  const contentLength = normalizeDigitalBrainString(record?.source_content || record?.logic_body || record?.text).length;
  const fileCount = Number(record?.source_metadata?.accepted_count || record?.source_metadata?.content_file_count || 0);
  return clampDigitalBrainNumber(0.16 + Math.log10(Math.max(1, byteSize + contentLength + fileCount * 120)) / 7, 0.16, 0.92);
}

function calculateContentImpact(text = '') {
  const length = normalizeDigitalBrainString(text).length;
  return clampDigitalBrainNumber(0.18 + Math.log10(Math.max(1, length)) / 5.5, 0.18, 0.96);
}

function calculateMetricImpact(value) {
  if (typeof value === 'number') return clampDigitalBrainNumber(value / 100, 0.12, 0.9);
  if (value && typeof value === 'object') {
    const numeric = Number(value.score ?? value.value ?? value.average);
    if (Number.isFinite(numeric)) return clampDigitalBrainNumber(numeric / 100, 0.12, 0.9);
  }
  return 0.28;
}

function isSourceVaultRecord(record = {}) {
  const metadata = record?.source_metadata && typeof record.source_metadata === 'object' ? record.source_metadata : {};
  return metadata.intake_owner === 'model_source_vault' || !!metadata.source_vault_package_id;
}

function hashDigitalBrainText(value = '') {
  let hash = 0;
  const text = normalizeDigitalBrainString(value);
  for (let index = 0; index < text.length; index += 1) {
    hash = ((hash << 5) - hash + text.charCodeAt(index)) | 0;
  }
  return Math.abs(hash).toString(36);
}

function clampDigitalBrainNumber(value, min, max) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return min;
  return Math.min(max, Math.max(min, numeric));
}

function formatDigitalBrainMetricValue(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean') return String(value);
  if (typeof value !== 'object') return '';

  const label = value.label || value.value || value.status || value.summary || value.average || '';
  if (label !== '') return String(label);
  return '';
}

function formatDigitalBrainKey(key = '') {
  return normalizeDigitalBrainString(key)
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function normalizeDigitalBrainString(value = '') {
  return String(value || '').trim();
}
