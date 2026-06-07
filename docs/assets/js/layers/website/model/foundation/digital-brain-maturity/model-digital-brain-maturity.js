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
  listModelDatasetEntries,
  listModelKnowledgeEntries,
  listModelLogicRecords,
} from '../../../system/model/model-training-store.js';

import {
  getProfileThoughtState,
} from '../../../profile/private/thoughts/profile-thought-store.js';

const DIGITAL_BRAIN_MATURITY_FRAGMENT_URL = '/assets/fragments/layers/website/model/foundation/digital-brain-maturity/model-digital-brain-maturity.html';
const DIGITAL_BRAIN_MATURITY_DATA_URL = '/assets/data/website/model-foundation/digital-brain-maturity/digital-brain-maturity-layers.json';

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

  if (!mount.querySelector('[data-digital-brain-maturity-surface]')) {
    mount.innerHTML = fragment;
  }
  const runtime = await createDigitalBrainRuntimeSnapshot();
  const state = createDigitalBrainMaturityState(data, runtime);
  renderDigitalBrainMaturity(mount, state);
  digitalBrainMaturityInitialized = true;

  return state;
}

export async function refreshDigitalBrainMaturity(root = document) {
  const mount = root.querySelector?.('[data-model-digital-brain-maturity-mount]')
    || document.querySelector('[data-model-digital-brain-maturity-mount]');

  if (!(mount instanceof HTMLElement) || !digitalBrainMaturityData) {
    return null;
  }

  const runtime = await createDigitalBrainRuntimeSnapshot();
  const state = createDigitalBrainMaturityState(digitalBrainMaturityData, runtime);
  renderDigitalBrainMaturity(mount, state);
  return state;
}

export function isDigitalBrainMaturityInitialized() {
  return digitalBrainMaturityInitialized;
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

async function createDigitalBrainRuntimeSnapshot() {
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

  const model = await withDigitalBrainReadTimeout(getOwnedCanonicalModel(), null);
  runtime.modelId = normalizeDigitalBrainString(model?.id || '');

  if (!model?.id) return runtime;

  const [
    identity,
    sourceResult,
    personalityResult,
    datasets,
    knowledgeEntries,
    logicRecords,
    digitalBrainPreferences,
  ] = await Promise.all([
    withDigitalBrainReadTimeout(readModelFoundationIdentity(model.id), null),
    withDigitalBrainReadTimeout(readLatestModelSourceCalibrationResult(model.id), null),
    withDigitalBrainReadTimeout(readLatestModelPersonalityCalibrationResult(model.id), null),
    withDigitalBrainReadTimeout(listModelDatasetEntries(), []),
    withDigitalBrainReadTimeout(listModelKnowledgeEntries(), []),
    withDigitalBrainReadTimeout(listModelLogicRecords(), []),
    withDigitalBrainReadTimeout(readModelDigitalBrainPreferences(model.id), null),
  ]);

  runtime.layers.identity = createIdentityRuntimeLayer(model, identity);
  runtime.layers.source = createSourceRuntimeLayer(sourceResult, datasets);
  runtime.layers.personality = createPersonalityRuntimeLayer(personalityResult);
  runtime.layers.memory = createMemoryRuntimeLayer(getProfileThoughtState(), knowledgeEntries, logicRecords);
  runtime.layers.voice = createVoiceRuntimeLayer(model, identity);
  runtime.digitalBrainPreferences = digitalBrainPreferences;

  return runtime;
}

function withDigitalBrainReadTimeout(promise, fallback, timeoutMs = 1400) {
  return Promise.race([
    Promise.resolve(promise).catch(() => fallback),
    new Promise((resolve) => {
      window.setTimeout(() => resolve(fallback), timeoutMs);
    }),
  ]);
}

function createIdentityRuntimeLayer(model = {}, identity = {}) {
  const liveSignals = [
    createSignal('model_record', 'Model record', model?.id),
    createSignal('profile_link', 'Profile link', model?.profile_id || identity?.profileId),
    createSignal('public_identity', 'Public identity', model?.public_identity_id || identity?.publicIdentityId),
    createSignal('private_identity', 'Private identity', model?.private_identity_id || identity?.privateIdentityId),
    createSignal('birth_certificate', 'Birth certificate', model?.birth_certificate_id || identity?.birthCertificateId),
    createSignal('model_name', 'Model name', model?.model_name || identity?.modelNickname),
  ].filter(Boolean);
  const signals = mergeDigitalBrainConstructSignals('identity', liveSignals);

  return {
    state: liveSignals.length >= 4 ? 'complete' : liveSignals.length ? 'initial' : 'pending',
    signals,
  };
}

function createSourceRuntimeLayer(sourceResult = null, datasets = []) {
  const payload = sourceResult?.result_payload || sourceResult || null;
  const liveSignals = [
    ...createMetricSignals(payload?.summary_metrics, 'source_summary'),
    ...createMetricSignals(payload?.dimension_outputs, 'source_dimension'),
    ...createMetricSignals(payload?.dimension_scores, 'source_score'),
    ...createRecordSignals(datasets, 'dataset'),
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

function createMemoryRuntimeLayer(thoughtState = {}, knowledgeEntries = [], logicRecords = []) {
  const categoryCounts = Array.isArray(thoughtState?.categoryCounts) ? thoughtState.categoryCounts : [];
  const thoughtSignals = categoryCounts
    .filter((category) => Number(category?.count || 0) > 0)
    .map((category) => createSignal(
      `thought_${category.key}`,
      category.label || category.key,
      `${Number(category.count)} thought${Number(category.count) === 1 ? '' : 's'}`,
      'thought',
    ))
    .filter(Boolean);

  const liveSignals = [
    ...thoughtSignals,
    ...createRecordSignals(knowledgeEntries, 'knowledge'),
    ...createRecordSignals(logicRecords, 'logic'),
  ];
  const signals = mergeDigitalBrainConstructSignals('memory', liveSignals);

  return {
    state: liveSignals.length ? 'forming' : 'pending',
    signals,
  };
}

function createVoiceRuntimeLayer(model = {}, identity = {}) {
  const liveSignals = [
    createSignal('voice_avatar', 'Model avatar', model?.model_image_url || identity?.modelAvatar),
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
    .map(([key, value]) => createSignal(key, formatDigitalBrainKey(key), formatDigitalBrainMetricValue(value), source))
    .filter(Boolean);
}

function createRecordSignals(records = [], source = '') {
  return (Array.isArray(records) ? records : [])
    .map((record) => {
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
      return createSignal(id || label, label, value, source);
    })
    .filter(Boolean);
}

function mergeDigitalBrainConstructSignals(layerId = '', liveSignals = []) {
  const merged = new Map();
  const constructSignals = (DIGITAL_BRAIN_FOUNDATION_CONSTRUCTS[layerId] || [])
    .map(([id, label]) => createSignal(id, label, '', 'foundation_construct'))
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

function createSignal(id = '', label = '', value = '', source = '') {
  const normalizedLabel = normalizeDigitalBrainString(label);
  const normalizedValue = normalizeDigitalBrainString(value);

  if (!normalizedLabel && !normalizedValue) return null;

  return {
    id: normalizeDigitalBrainString(id || normalizedLabel).toLowerCase().replace(/[^a-z0-9]+/g, '_'),
    label: normalizedLabel,
    value: normalizedValue,
    source: normalizeDigitalBrainString(source),
  };
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
