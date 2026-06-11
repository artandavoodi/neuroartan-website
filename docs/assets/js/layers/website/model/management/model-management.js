/* =============================================================================
   01) MODULE IMPORTS
   02) MODEL MANAGEMENT HELPERS
   03) MODEL MANAGEMENT RENDER
   04) INITIALIZATION
   ============================================================================= */

import { getProfileNavigationState, subscribeProfileNavigation } from '../../profile/private/navigation/profile-navigation.js';
import { getProfileRuntimeState, subscribeProfileRuntime } from '../../profile/private/shell/profile-runtime.js';
import {
  ensureOwnedCanonicalModel,
  getOwnedCanonicalModel,
  readModelFoundationIdentity,
  readModelPersonalizationPreferences,
  readLatestModelSourceCalibrationResult,
  listModelDefaultRegistry,
  listModelChangelogEvents,
  recordModelAuditEvent,
  readModelVisibilityPreferences,
  resetOwnedCanonicalModelAvatar,
  saveModelFoundationIdentity,
  saveOwnedCanonicalModelAvatar,
  saveModelPersonalizationPreferences,
  saveModelVisibilityPreferences
} from '../../system/model/model-store.js';
import { getPublicModels, loadPublicModelRegistry } from '../../system/model/public-model-registry.js';
import {
  createModelDatasetEntry,
  createModelKnowledgeEntry,
  createModelLogicRecord,
  listModelKnowledgeEntries,
  listModelLogicRecords,
  listModelSourceVaultPackageEntries,
  listModelTrainingDatasetEntries,
  removeModelDatasetEntry,
  removeModelKnowledgeEntry,
  removeModelLogicRecord,
  removeModelSourceVaultPackageEntry,
  updateModelDatasetEntry,
  updateModelKnowledgeEntry,
  updateModelLogicRecord,
  upsertModelSourceVaultPackageEntry
} from '../../system/model/model-training-store.js';
import { registerProfileMediaEditorTarget } from '../../profile/private/media/profile-media-editor.js';
import {
  initializeSourceCalibration,
  refreshSourceCalibration
} from '../foundation/source-calibration/00-source-calibration-all.js';

import {
  initializePersonalityCalibration,
  refreshPersonalityCalibration
} from '../foundation/personality-calibration/model-personality-calibration-controller.js';
import {
  initializeDigitalBrainMaturity,
  refreshDigitalBrainMaturity,
} from '../foundation/digital-brain-maturity/model-digital-brain-maturity.js';
import { mountModelSourceVault } from '../foundation/source-vault/model-source-vault.js';
import {
  readModelInterfaceState,
  updateModelInterfaceState,
} from '../shared/interface-state/model-interface-state.js';


import {
  readLatestPersonalityCalibrationResult
} from '../foundation/personality-calibration/model-personality-calibration-state.js';

const MODEL_PERSONALIZATION_STORAGE_KEY = 'neuroartan.model.personalization.preferences';
const MODEL_CHANGELOG_STORAGE_KEY = 'neuroartan.model.changelog.records';
const MODEL_FOUNDATION_IDENTITY_STORAGE_KEY = 'neuroartan.model.foundation.identity';
const MODEL_VISIBILITY_PREFERENCES_STORAGE_KEY = 'neuroartan.model.visibility.preferences';
const MODEL_DATASET_STORAGE_KEY = 'neuroartan.model.training.datasets';
const MODEL_KNOWLEDGE_BASE_STORAGE_KEY = 'neuroartan.model.training.knowledge-base';
const MODEL_LOGIC_RECORDS_STORAGE_KEY = 'neuroartan.model.training.logics';
const MODEL_LOGIC_QUESTION_REGISTRY_URL = '/assets/data/website/model-creation/model-logic-question-registry.json';
const MODEL_SOURCE_VAULT_FRAGMENT_URL = '/assets/fragments/layers/website/model/foundation/source-vault/model-source-vault.html';
const MODEL_SOURCE_VAULT_CSS_URL = '/assets/css/layers/website/model/foundation/source-vault/model-source-vault.css';

const MODEL_PERSONALIZATION_DEFAULTS = Object.freeze({
  reasoningDepth: 'balanced',
  analyticalMode: 'systems',
  evidenceThreshold: 70,
  abstractionLevel: 65,
  synthesisStrength: 70,
  attentionFocus: 'balanced',
  detailSensitivity: 70,
  distractionResistance: 65,
  priorityDetection: 75,
  cognitiveFlexibility: 60,
  perspectiveShifting: 65,
  alternativeGeneration: 65,
  creativityLevel: 50,
  senseOfHumor: 50,
  metaphorUse: 55,
  noveltyTolerance: 55,
  imaginationMode: 'precise',
  reflectionFrequency: 'sometimes',
  reflectionDepth: 60,
  selfCorrectionStrength: 70,
  uncertaintyAwareness: 75,
  patternDetection: 70,
  contradictionDetection: 70,
  processingMode: 65,
  planningHorizon: 'strategic',
  complexityTolerance: 70,

  directnessLevel: 65,
  diplomacyLevel: 70,
  tactLevel: 70,
  assertivenessLevel: 55,
  conflictStyle: 'diplomatic',
  languageStyle: 'neutral',
  vocabularyLevel: 'standard',
  communicationRegister: 'professional',
  multilingualBehavior: 'mirror-input',
  responseLength: 'standard',
  explanationDepth: 55,
  structurePreference: 'tables',
  clarificationThreshold: 35,
  compressionLevel: 65,
  audienceAdaptation: 'professional',
  relationshipDistance: 60,
  boundaryAwareSpeech: 75,
  publicFacingRestraint: 80,
  responseAudienceScope: 'public',
  publicResponseOpenness: 50,
  publicResponseDirectness: 50,
  publicResponseRestraint: 80,
  friendsResponseWarmth: 65,
  friendsResponseDetail: 50,
  friendsResponseHumor: 55,
  followersResponseClarity: 70,
  followersResponseEfficiency: 60,
  followersResponseOpenness: 45,
  mutualResponseTrustDepth: 60,
  mutualResponseExplanationDepth: 55,
  mutualResponseDirectness: 55,
  familyResponseWarmth: 75,
  familyResponsePrivacyGuard: 80,
  familyResponseHumor: 60,
  subscriberResponsePriority: 65,
  subscriberResponseDetail: 65,
  subscriberResponseProfessionalTone: 75,

  memoryRetention: 'session',
  forgettingMode: 'relevance-based',
  decaySensitivity: 45,
  continuityDepth: 60,
  recallPriority: 'important',
  contextWeighting: 70,
  personalHistoryInfluence: 70,
  sourceConfidenceThreshold: 75,
  narrativeContinuity: 70,
  identityContinuity: 75,
  lifeEventSensitivity: 65,
  sensitiveMemoryHandling: 'ask',
  memoryCitationBehavior: false,
  recallPermissionStrictness: 80,

  emotionalTone: 'neutral',
  warmthLevel: 55,
  emotionalIntensity: 45,
  empathyLevel: 60,
  cognitiveEmpathy: 70,
  affectiveEmpathy: 55,
  validationStyle: 'reflective',
  emotionalRegulation: 75,
  calmnessLevel: 70,
  deescalationStrength: 70,
  distressSensitivity: 65,
  emotionalMirroring: 55,
  moodAdaptation: 'adapt-lightly',
  sentimentSensitivity: 65,
  emotionalWeighting: 50,

  riskTolerance: 25,
  efficiencyPreference: 50,
  initiativeLevel: 45,
  autonomyLevel: 'suggest',
  decisivenessLevel: 60,
  restraintLevel: 65,
  cautionLevel: 70,
  errorAvoidance: 75,
  escalationThreshold: 70,
  boundaryStrictness: 75,
  consentSensitivity: 85,
  privacyStrictness: 85,
  refusalStyle: 'diplomatic',
  vulnerabilityHandling: 'protective',
  consistencyLevel: 75,
  ruleAdherence: 80,
  taskPersistence: 70
});

let modelPersonalizationDefaultOverrides = {};

const MODEL_PERSONALIZATION_PANE_GROUPS = Object.freeze({
  cognition: 'cognition',
  communication: 'communication',
  memory: 'memory',
  emotion: 'emotion',
  behavior: 'behavior'
});

const MODEL_PERSONALIZATION_FILTER_SECTIONS = Object.freeze({
  reasoning: ['reasoningDepth', 'analyticalMode', 'evidenceThreshold', 'abstractionLevel', 'synthesisStrength'],
  attention: ['attentionFocus', 'detailSensitivity', 'distractionResistance', 'priorityDetection'],
  flexibility: ['cognitiveFlexibility', 'perspectiveShifting', 'alternativeGeneration'],
  creativity: ['creativityLevel', 'senseOfHumor', 'metaphorUse', 'noveltyTolerance', 'imaginationMode'],
  reflection: ['reflectionFrequency', 'reflectionDepth', 'selfCorrectionStrength', 'uncertaintyAwareness', 'patternDetection', 'contradictionDetection'],
  planning: ['processingMode', 'planningHorizon', 'complexityTolerance'],
  delivery: ['directnessLevel', 'diplomacyLevel', 'tactLevel', 'assertivenessLevel', 'conflictStyle'],
  language: ['languageStyle', 'vocabularyLevel', 'communicationRegister', 'multilingualBehavior'],
  'response-style': ['responseLength', 'explanationDepth', 'structurePreference', 'clarificationThreshold', 'compressionLevel'],
  'social-context': ['audienceAdaptation', 'relationshipDistance', 'boundaryAwareSpeech', 'publicFacingRestraint'],
  'audience-response': ['responseAudienceScope', 'publicResponseOpenness', 'publicResponseDirectness', 'publicResponseRestraint', 'friendsResponseWarmth', 'friendsResponseDetail', 'friendsResponseHumor', 'followersResponseClarity', 'followersResponseEfficiency', 'followersResponseOpenness', 'mutualResponseTrustDepth', 'mutualResponseExplanationDepth', 'mutualResponseDirectness', 'familyResponseWarmth', 'familyResponsePrivacyGuard', 'familyResponseHumor', 'subscriberResponsePriority', 'subscriberResponseDetail', 'subscriberResponseProfessionalTone'],
  retention: ['memoryRetention', 'forgettingMode', 'decaySensitivity'],
  recall: ['continuityDepth', 'recallPriority', 'contextWeighting', 'personalHistoryInfluence', 'sourceConfidenceThreshold'],
  'autobiographical-continuity': ['narrativeContinuity', 'identityContinuity', 'lifeEventSensitivity'],
  'memory-safety': ['sensitiveMemoryHandling', 'memoryCitationBehavior', 'recallPermissionStrictness'],
  tone: ['emotionalTone', 'warmthLevel', 'emotionalIntensity'],
  empathy: ['empathyLevel', 'cognitiveEmpathy', 'affectiveEmpathy', 'validationStyle'],
  regulation: ['emotionalRegulation', 'calmnessLevel', 'deescalationStrength', 'distressSensitivity'],
  mirroring: ['emotionalMirroring', 'moodAdaptation', 'sentimentSensitivity'],
  weighting: ['emotionalWeighting'],
  'action-posture': ['riskTolerance', 'efficiencyPreference', 'initiativeLevel', 'autonomyLevel', 'decisivenessLevel'],
  restraint: ['restraintLevel', 'cautionLevel', 'errorAvoidance', 'escalationThreshold'],
  boundaries: ['boundaryStrictness', 'consentSensitivity', 'privacyStrictness', 'refusalStyle', 'vulnerabilityHandling'],
  reliability: ['consistencyLevel', 'ruleAdherence', 'taskPersistence']
});

const MODEL_PERSONALIZATION_FIELD_AREAS = Object.freeze(
  Object.fromEntries(Object.keys(MODEL_PERSONALIZATION_DEFAULTS).map((field) => {
    const cognition = [
      'reasoningDepth','analyticalMode','evidenceThreshold','abstractionLevel','synthesisStrength',
      'attentionFocus','detailSensitivity','distractionResistance','priorityDetection',
      'cognitiveFlexibility','perspectiveShifting','alternativeGeneration',
      'creativityLevel','senseOfHumor','metaphorUse','noveltyTolerance','imaginationMode',
      'reflectionFrequency','reflectionDepth','selfCorrectionStrength','uncertaintyAwareness',
      'patternDetection','contradictionDetection','processingMode','planningHorizon','complexityTolerance'
    ];
    const communication = [
      'directnessLevel','diplomacyLevel','tactLevel','assertivenessLevel','conflictStyle',
      'languageStyle','vocabularyLevel','communicationRegister','multilingualBehavior',
      'responseLength','explanationDepth','structurePreference','clarificationThreshold','compressionLevel',
      'audienceAdaptation','relationshipDistance','boundaryAwareSpeech','publicFacingRestraint',
      'responseAudienceScope','publicResponseOpenness','publicResponseDirectness','publicResponseRestraint',
      'friendsResponseWarmth','friendsResponseDetail','friendsResponseHumor',
      'followersResponseClarity','followersResponseEfficiency','followersResponseOpenness',
      'mutualResponseTrustDepth','mutualResponseExplanationDepth','mutualResponseDirectness',
      'familyResponseWarmth','familyResponsePrivacyGuard','familyResponseHumor',
      'subscriberResponsePriority','subscriberResponseDetail','subscriberResponseProfessionalTone'
    ];
    const memory = [
      'memoryRetention','forgettingMode','decaySensitivity','continuityDepth','recallPriority',
      'contextWeighting','personalHistoryInfluence','sourceConfidenceThreshold',
      'narrativeContinuity','identityContinuity','lifeEventSensitivity',
      'sensitiveMemoryHandling','memoryCitationBehavior','recallPermissionStrictness'
    ];
    const emotion = [
      'emotionalTone','warmthLevel','emotionalIntensity','empathyLevel','cognitiveEmpathy',
      'affectiveEmpathy','validationStyle','emotionalRegulation','calmnessLevel',
      'deescalationStrength','distressSensitivity','emotionalMirroring','moodAdaptation',
      'sentimentSensitivity','emotionalWeighting'
    ];
    const behavior = [
      'riskTolerance','efficiencyPreference','initiativeLevel','autonomyLevel','decisivenessLevel',
      'restraintLevel','cautionLevel','errorAvoidance','escalationThreshold',
      'boundaryStrictness','consentSensitivity','privacyStrictness','refusalStyle',
      'vulnerabilityHandling','consistencyLevel','ruleAdherence','taskPersistence'
    ];

    const pane = cognition.includes(field) ? 'cognition'
      : communication.includes(field) ? 'communication'
      : memory.includes(field) ? 'memory'
      : emotion.includes(field) ? 'emotion'
      : behavior.includes(field) ? 'behavior'
      : 'personalization';

    const section = getModelPersonalizationFieldSection(field);

    return [field, { area: 'personalization', pane, section }];
  }))
);

function getModelPersonalizationFieldSection(field = '') {
  const normalizedField = String(field || '').trim();
  const sectionEntry = Object.entries(MODEL_PERSONALIZATION_FILTER_SECTIONS)
    .find(([, fields]) => fields.includes(normalizedField));
  return sectionEntry?.[0] || 'all';
}

const MODEL_PERSONALIZATION_FIELD_LABELS = Object.freeze({
  reasoningDepth: 'Reasoning depth',
  analyticalMode: 'Analytical mode',
  evidenceThreshold: 'Evidence threshold',
  abstractionLevel: 'Abstraction level',
  synthesisStrength: 'Synthesis strength',
  attentionFocus: 'Attention focus',
  directnessLevel: 'Directness',
  diplomacyLevel: 'Diplomacy',
  languageStyle: 'Language style',
  responseLength: 'Response length',
  explanationDepth: 'Explanation depth',
  audienceAdaptation: 'Audience adaptation',
  responseAudienceScope: 'Audience profile',
  memoryRetention: 'Retention period',
  continuityDepth: 'Continuity depth',
  emotionalTone: 'Tone',
  empathyLevel: 'Empathy',
  emotionalWeighting: 'Emotional weighting',
  riskTolerance: 'Risk tolerance',
  efficiencyPreference: 'Efficiency'
});

const MODEL_FOUNDATION_PANE_GROUPS = Object.freeze({
  overview: 'overview',
  identity: 'identity',
  consent: 'consent',
  sources: 'sources',
  memory: 'memory',
  personality: 'personality',
  voice: 'voice'
});

const MODEL_TRAINING_PANE_GROUPS = Object.freeze({
  protocol: 'protocol',
  datasets: 'datasets',
  'knowledge-base': 'knowledge-base',
  logics: 'logics',
  provenance: 'provenance',
  evaluation: 'evaluation'
});

const MODEL_DISCOVERY_PANE_GROUPS = Object.freeze({
  overview: 'overview',
  directory: 'directory',
  trending: 'trending',
  expertise: 'expertise',
  reputation: 'reputation',
  monetization: 'monetization'
});

const MODEL_FOUNDATION_IDENTITY_DEFAULTS = Object.freeze({
  modelId: 'Model record pending',
  modelNickname: '',
  modelPurposeDescription: '',
  privateNotes: '',
  registryId: 'Registry record pending',
  privateSerialIdentity: 'Serial pending',
  publicSerialIdentity: 'Public identity not enabled',
  birthCertificateId: 'Birth record pending',
  birthDate: '',
  modelType: 'Personal',
  lifecycleState: 'created',
  readinessState: 'uninitialized',
  verificationState: 'unverified',
  discoverabilityState: 'unpublished',
  privacyLockState: 'private_owner_controlled',
  createdAt: '',
  updatedAt: '',
  modelAvatar: '',
  ownerRecordPolicy: 'fixed_owner_binding'
});

const MODEL_VISIBILITY_DEFAULTS = Object.freeze({
  visibilityScope: 'general',
  publicVisible: false,
  friendsVisible: false,
  followersVisible: false,
  mutualsVisible: false,
  familyVisible: false,
  subscribersVisible: false
});

const MODEL_LOGIC_FALLBACK_QUESTIONS = Object.freeze([
  { category: 'Personal life', question: 'What should people understand about you before they ask for advice from your model?' },
  { category: 'Family life', question: 'How should your model protect family matters when someone asks about them?' },
  { category: 'Relationship logic', question: 'How should your model balance honesty and kindness in personal relationship advice?' },
  { category: 'Friendship logic', question: 'How should your model handle humor, memory, and privacy with friends?' },
  { category: 'Education logic', question: 'How should your model explain something when a person is learning for the first time?' },
  { category: 'Business logic', question: 'How should your model respond when a business question needs strategic judgment?' },
  { category: 'Values and boundaries', question: 'How should your model decide between being helpful and protecting your boundaries?' },
  { category: 'Decision making', question: 'How should your model make a decision when the facts are incomplete?' }
]);

let modelPersonalizationPreferences = loadStoredModelPersonalizationPreferences();
let modelChangelogRecords = loadStoredModelChangelogRecords();
let modelPersonalizationBackendLoaded = false;
let modelPersonalizationBackendSaveTimer = 0;
let modelDefaultRegistryBackendLoaded = false;
let modelChangelogBackendLoaded = false;
let modelFoundationIdentity = loadStoredModelFoundationIdentity();
let modelFoundationIdentityBackendLoaded = false;
let modelFoundationIdentityBackendSaveTimer = 0;
let modelVisibilityPreferences = loadStoredModelVisibilityPreferences();
let modelVisibilityBackendLoaded = false;
let modelVisibilityBackendSaveTimer = 0;
let modelOwnerHydrationInProgress = false;
let modelOwnerHydrationComplete = false;
let modelDatasetEntries = loadStoredModelDatasetEntries();
let modelKnowledgeBaseEntries = loadStoredModelKnowledgeBaseEntries();
let modelLogicRecords = loadStoredModelLogicRecords();
let modelLogicQuestionRegistry = null;
let modelLogicQuestionRegistryLoading = null;
let modelDataManagerOpen = false;
let modelDataManagerPane = 'datasets';
let modelTrainingSubstrateBackendLoaded = false;
let publicModelDirectory = [];
let publicModelDirectoryLoaded = false;
let publicModelDirectoryLoading = false;
const modelDirectoryFilters = {
  verification: 'all',
  expertise: 'all'
};

let modelParameterFilters = {
  area: 'personalization',
  pane: 'all',
  section: 'all',
  field: 'all'
};

let modelResponseAudienceFilter = 'public';

const MODEL_SECTIONS = new Set([
  'model-foundation',
  'model-training',
  'model-personalization',
  'model-sources',
  'model-memory',
  'model-voice',
  'model-readiness',
  'model-runtime',
  'model-discovery',
  'model-settings'
]);

const SECTION_LABELS = Object.freeze({
  'model-foundation': {
    title: 'Model foundation',
    summary: 'The personal model is created with the profile. Complete the foundation before training and runtime activation.'
  },
  'model-training': {
    title: 'Training protocol',
    summary: 'Training moves through authorization, ingestion, provenance, retrieval readiness, and activation gates.'
  },
  'model-personalization': {
    title: 'Model personalization',
    summary: 'Personalization controls the owner model behavior that other people experience on stage and in discovery. It is separate from ICOS machine preferences.'
  },
  'model-sources': {
    title: 'Source governance',
    summary: 'Sources stay owner-authorized and provenance-aware before they become model context.'
  },
  'model-memory': {
    title: 'Memory substrate',
    summary: 'Private thoughts, records, and continuity signals are staged separately from public expression.'
  },
  'model-voice': {
    title: 'Voice training',
    summary: 'Voice remains consent-bound and inactive until samples, policy, and readiness are complete.'
  },
  'model-readiness': {
    title: 'Readiness state',
    summary: 'Readiness shows whether the canonical model can safely enter runtime activation.'
  },
  'model-runtime': {
    title: 'Runtime controls',
    summary: 'Runtime governs provider routing, local/API execution boundaries, and activation state.'
  },
  'model-discovery': {
    title: 'Model discovery',
    summary: 'Discovery prepares public model visibility, ranking, expertise, reputation, and future monetization readiness.'
  },
  'model-settings': {
    title: 'Model settings',
    summary: 'Model settings govern owner preferences, provider routing, deployment visibility, and audit history.'
  }
});

const PANE_LABELS = Object.freeze({
  overview: {
    title: 'Overview',
    summary: 'Review the current state of the canonical personal model and the next foundation requirement.'
  },
  identity: {
    title: 'Identity',
    summary: 'Bind the model to the verified profile route, owner record, and canonical account identity.'
  },
  consent: {
    title: 'Consent',
    summary: 'Control which owner-approved sources may be used for model context, training, and runtime behavior.'
  },
  sources: {
    title: 'Sources',
    summary: 'Prepare profile records, thoughts, documents, and future dataset connections for governed ingestion.'
  },
  memory: {
    title: 'Memory',
    summary: 'Separate private cognitive substrate from public expression before anything becomes model context.'
  },
  personality: {
    title: 'Personality',
    summary: 'Complete the assessment before using personality signals for model behavior.'
  },
  voice: {
    title: 'Voice',
    summary: 'Prepare consent-bound voice material for future owner-representative response and interaction.'
  },
  protocol: {
    title: 'Protocol',
    summary: 'Move training through authorization, acquisition, normalization, embedding, evaluation, and activation gates.'
  },
  datasets: {
    title: 'Datasets',
    summary: 'Connect owner-approved datasets and external knowledge sources without bypassing provenance controls.'
  },
  'knowledge-base': {
    title: 'Knowledge Base',
    summary: 'Maintain current owner-approved knowledge notes as editable training inputs before provenance review.'
  },
  logics: {
    title: 'Logics',
    summary: 'Maintain owner-authored natural-language logic records as private training inputs before provenance review.'
  },
  provenance: {
    title: 'Provenance',
    summary: 'Keep source origin, permission, transformation, and retrieval readiness traceable before activation.'
  },
  evaluation: {
    title: 'Evaluation',
    summary: 'Assess whether the model is safe, useful, and sufficiently prepared for the next readiness state.'
  },
  cognition: {
    title: 'Cognition',
    summary: 'Tune the model’s reasoning, attention, abstraction, creativity, reflection, and problem-solving mode.'
  },
  communication: {
    title: 'Communication',
    summary: 'Tune the model’s language, directness, diplomacy, response style, and audience adaptation.'
  },
  emotion: {
    title: 'Emotion',
    summary: 'Tune the model’s empathy, warmth, emotional sensitivity, mirroring, and affect regulation.'
  },
  behavior: {
    title: 'Behavior',
    summary: 'Tune the model’s risk posture, efficiency, autonomy, restraint, boundaries, and action style.'
  },
  state: {
    title: 'State',
    summary: 'Track readiness as not ready, preparing, partially ready, ready, degraded, blocked, or retraining.'
  },
  checks: {
    title: 'Checks',
    summary: 'Review readiness checks for identity, sources, consent, retrieval quality, voice, and runtime boundaries.'
  },
  blockers: {
    title: 'Blockers',
    summary: 'Surface the missing requirements that prevent the personal model from moving into activation.'
  },
  history: {
    title: 'History',
    summary: 'Review model-specific changes, readiness transitions, source updates, and runtime decisions.'
  },
  trending: {
    title: 'Trending',
    summary: 'Prepare ranking signals for public model discovery without exposing private model records.'
  },
  directory: {
    title: 'Directory',
    summary: 'Browse public model registry projections by verification, trust, and expertise signals.'
  },
  expertise: {
    title: 'Expertise',
    summary: 'Map capability domains, source-backed strengths, and discoverable model expertise.'
  },
  reputation: {
    title: 'Reputation',
    summary: 'Prepare trust, review, rating, and capability signals for future public discovery.'
  },
  monetization: {
    title: 'Monetization',
    summary: 'Track eligibility separately from approval before any model becomes hireable or monetizable.'
  },
  preferences: {
    title: 'Preferences',
    summary: 'Control model behavior preferences without changing the canonical identity or source record.'
  },
  provider: {
    title: 'Provider',
    summary: 'Manage local and API provider routing for the private owner workspace.'
  },
  routing: {
    title: 'Routing',
    summary: 'Define which runtime path handles retrieval, response, and provider execution.'
  },
  visibility: {
    title: 'Visibility',
    summary: 'Keep the personal model private by default and expose only approved public-facing model signals.'
  },
  changelog: {
    title: 'Changelog',
    summary: 'Review model-specific changes for the active settings surface.'
  }
});

function modelManagementRoots() {
  return Array.from(document.querySelectorAll('[data-model-management]'));
}

function setText(root, selector, value) {
  root?.querySelectorAll(selector).forEach((node) => {
    node.textContent = value || '';
  });
}

function ensureModelSourceVaultStyles() {
  if (document.querySelector(`link[href="${MODEL_SOURCE_VAULT_CSS_URL}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = MODEL_SOURCE_VAULT_CSS_URL;
  document.head.append(link);
}

async function mountModelSourceVaultFragment(root = document) {
  const mount = root?.querySelector?.('[data-model-source-vault-mount]');
  if (!(mount instanceof HTMLElement) || mount.dataset.modelSourceVaultMounted === 'true') return;

  ensureModelSourceVaultStyles();

  try {
    const response = await fetch(MODEL_SOURCE_VAULT_FRAGMENT_URL, { cache: 'no-cache' });
    if (!response.ok) throw new Error('MODEL_SOURCE_VAULT_FRAGMENT_UNAVAILABLE');
    mount.innerHTML = await response.text();
    mount.dataset.modelSourceVaultMounted = 'true';
    mountModelSourceVault(mount);
  } catch (error) {
    console.warn('[Neuroartan][Model] Source Vault mount failed.', error);
    mount.innerHTML = '<p class="model-management__section-copy">Source Vault could not be loaded.</p>';
  }
}

function mountAllModelSourceVaultFragments() {
  modelManagementRoots().forEach((root) => {
    void mountModelSourceVaultFragment(root);
  });
}

function getModelPersonalizationDefaults() {
  return {
    ...MODEL_PERSONALIZATION_DEFAULTS,
    ...modelPersonalizationDefaultOverrides
  };
}

function getModelPersonalizationDefaultValue(field) {
  return getModelPersonalizationDefaults()[field];
}

function normalizeModelPersonalizationPreferences(value = {}) {
  return {
    ...getModelPersonalizationDefaults(),
    ...(value && typeof value === 'object' ? value : {})
  };
}

function getSafeModelPersonalizationSelectValue(select, field) {
  if (!(select instanceof HTMLSelectElement) || !field) return '';
  const currentValue = String(getModelPersonalizationValue(field) ?? '');
  const optionValues = Array.from(select.options).map((option) => option.value);

  if (optionValues.includes(currentValue)) {
    return currentValue;
  }

  const defaultValue = String(getModelPersonalizationDefaultValue(field) ?? '');
  if (optionValues.includes(defaultValue)) {
    return defaultValue;
  }

  return optionValues[0] || '';
}

function getSafeSelectOptionText(select) {
  if (!(select instanceof HTMLSelectElement)) return '';
  if (!select.selectedOptions.length && select.options.length) {
    select.value = select.options[0].value;
  }
  return select.selectedOptions[0]?.textContent || select.options[0]?.textContent || '';
}

function loadStoredModelPersonalizationPreferences() {
  try {
    const parsed = JSON.parse(window.localStorage?.getItem(MODEL_PERSONALIZATION_STORAGE_KEY) || '{}');
    return normalizeModelPersonalizationPreferences(parsed);
  } catch (error) {
    return normalizeModelPersonalizationPreferences();
  }
}

function writeStoredModelPersonalizationPreferences(preferences) {
  try {
    window.localStorage?.setItem(
      MODEL_PERSONALIZATION_STORAGE_KEY,
      JSON.stringify(normalizeModelPersonalizationPreferences(preferences))
    );
  } catch (error) {
    /* Local persistence is an enhancement; Supabase sync still attempts separately. */
  }
}

function loadStoredModelChangelogRecords() {
  try {
    const parsed = JSON.parse(window.localStorage?.getItem(MODEL_CHANGELOG_STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.filter((entry) => entry && typeof entry === 'object') : [];
  } catch (error) {
    return [];
  }
}

function writeStoredModelChangelogRecords() {
  try {
    window.localStorage?.setItem(MODEL_CHANGELOG_STORAGE_KEY, JSON.stringify(modelChangelogRecords));
  } catch (error) {
    /* Changelog storage is local-first until Supabase audit history is bound. */
  }
}

function normalizeModelDefaultRegistryValue(record = {}) {
  const value = record?.default_value;
  if (record.value_type === 'integer') return Number(value);
  if (record.value_type === 'boolean') return value === true || value === 'true';
  return typeof value === 'string' ? value : String(value ?? '');
}

function applyModelDefaultRegistryRecords(records = []) {
  if (!Array.isArray(records) || !records.length) return;

  const nextOverrides = { ...modelPersonalizationDefaultOverrides };
  records.forEach((record) => {
    const field = String(record?.field || '').trim();
    if (!field || !Object.prototype.hasOwnProperty.call(MODEL_PERSONALIZATION_DEFAULTS, field)) return;
    nextOverrides[field] = normalizeModelDefaultRegistryValue(record);
  });
  modelPersonalizationDefaultOverrides = nextOverrides;
}

function mapBackendModelChangelogEvent(event = {}) {
  return {
    id: event.id || `model-audit-${event.field}-${event.created_at || Date.now()}`,
    scope: 'Personalization',
    area: event.area || 'personalization',
    pane: event.pane || 'all',
    section: event.section || 'all',
    action: event.action || 'change',
    field: event.field || '',
    label: event.label || formatModelPersonalizationFieldLabel(event.field || ''),
    from: event.value_from || 'Unset',
    to: event.value_to || 'Unset',
    createdAt: event.created_at || new Date().toISOString()
  };
}

function formatModelPersonalizationFieldLabel(field = '') {
  return MODEL_PERSONALIZATION_FIELD_LABELS[field]
    || String(field || '')
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/[_-]+/g, ' ')
      .replace(/^./, (character) => character.toUpperCase());
}

function formatModelPersonalizationChangelogValue(value) {
  if (value === true) return 'On';
  if (value === false) return 'Off';
  if (value === null || typeof value === 'undefined') return 'Unset';
  return String(value).replace(/[_-]+/g, ' ');
}

function recordModelPersonalizationChangelog(nextPatch = {}, previousPreferences = {}, options = {}) {
  const normalizedPrevious = normalizeModelPersonalizationPreferences(previousPreferences);
  const changedFields = Object.keys(nextPatch).filter((field) => normalizedPrevious[field] !== nextPatch[field]);
  if (!changedFields.length) return;

  const timestamp = new Date().toISOString();
  const entries = changedFields.map((field) => ({
    id: `model-personalization-${field}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    scope: 'Personalization',
    area: MODEL_PERSONALIZATION_FIELD_AREAS[field]?.area || 'personalization',
    pane: MODEL_PERSONALIZATION_FIELD_AREAS[field]?.pane || 'personalization',
    section: MODEL_PERSONALIZATION_FIELD_AREAS[field]?.section || 'all',
    action: options.reset === true ? 'reset' : 'change',
    field,
    label: formatModelPersonalizationFieldLabel(field),
    from: formatModelPersonalizationChangelogValue(normalizedPrevious[field]),
    to: formatModelPersonalizationChangelogValue(nextPatch[field]),
    createdAt: timestamp
  }));

  modelChangelogRecords = [...entries, ...modelChangelogRecords];
  writeStoredModelChangelogRecords();
  void persistModelPersonalizationChangelogEntries(entries);
}

async function persistModelPersonalizationChangelogEntries(entries = []) {
  if (!entries.length) return;

  try {
    const model = await getOwnedCanonicalModel();
    if (!model?.id || !model?.profile_id) return;

    await Promise.all(entries.map((entry) => recordModelAuditEvent(model, {
      ...entry,
      source: 'model_personalization'
    })));
  } catch (error) {
    console.warn('[Neuroartan][Model] Changelog audit sync skipped.', error);
  }
}

function getModelPersonalizationResetPatch(filters = {}) {
  const area = String(filters.area || 'model').trim();
  const pane = String(filters.pane || 'all').trim();
  const section = String(filters.section || 'all').trim();
  const field = String(filters.field || 'all').trim();

  if (area !== 'model' && area !== 'personalization') return {};

  if (field !== 'all' && Object.prototype.hasOwnProperty.call(MODEL_PERSONALIZATION_DEFAULTS, field)) {
    return {
      [field]: getModelPersonalizationDefaultValue(field)
    };
  }

  const patch = {};
  Object.entries(MODEL_PERSONALIZATION_FIELD_AREAS).forEach(([fieldKey, metadata]) => {
    if (area === 'personalization' && metadata.area !== 'personalization') return;
    if (pane !== 'all' && metadata.pane !== pane) return;
    if (section !== 'all' && metadata.section !== section) return;
    patch[fieldKey] = getModelPersonalizationDefaultValue(fieldKey);
  });

  return patch;
}

function handleModelResetRequest(event) {
  const filters = event?.detail?.filters || {};
  const patch = getModelPersonalizationResetPatch(filters);
  if (!Object.keys(patch).length) {
    setModelPersonalizationStatus('No resettable model values found', 'idle');
    return;
  }

  updateModelPersonalizationPreferences(patch, {
    source: 'model-reset',
    reset: true
  });
  setModelPersonalizationStatus('Model defaults restored', 'success');
}

function normalizeModelFoundationIdentity(value = {}) {
  return {
    ...MODEL_FOUNDATION_IDENTITY_DEFAULTS,
    ...(value && typeof value === 'object' ? value : {})
  };
}

function loadStoredModelFoundationIdentity() {
  try {
    const parsed = JSON.parse(window.localStorage?.getItem(MODEL_FOUNDATION_IDENTITY_STORAGE_KEY) || '{}');
    return normalizeModelFoundationIdentity(parsed);
  } catch (error) {
    return normalizeModelFoundationIdentity();
  }
}

function writeStoredModelFoundationIdentity(identity) {
  try {
    window.localStorage?.setItem(
      MODEL_FOUNDATION_IDENTITY_STORAGE_KEY,
      JSON.stringify(normalizeModelFoundationIdentity(identity))
    );
  } catch (error) {
    /* Local persistence is an enhancement; Supabase sync still attempts separately. */
  }
}

function normalizeModelVisibilityPreferences(value = {}) {
  return {
    ...MODEL_VISIBILITY_DEFAULTS,
    ...(value && typeof value === 'object' ? value : {})
  };
}

function loadStoredModelVisibilityPreferences() {
  try {
    const parsed = JSON.parse(window.localStorage?.getItem(MODEL_VISIBILITY_PREFERENCES_STORAGE_KEY) || '{}');
    return normalizeModelVisibilityPreferences(parsed);
  } catch (error) {
    return normalizeModelVisibilityPreferences();
  }
}

function writeStoredModelVisibilityPreferences(preferences) {
  try {
    window.localStorage?.setItem(
      MODEL_VISIBILITY_PREFERENCES_STORAGE_KEY,
      JSON.stringify(normalizeModelVisibilityPreferences(preferences))
    );
  } catch (error) {
    /* Local persistence is an enhancement; Supabase sync remains canonical. */
  }
}

function formatModelIdentityState(value = '') {
  const normalizedValue = String(value || '').trim();
  if (!normalizedValue) return '';
  return normalizedValue
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatModelIdentityDate(value = '', fallback = '') {
  const normalizedValue = String(value || '').trim();
  if (!normalizedValue) return fallback;

  const parsedDate = new Date(normalizedValue);
  if (Number.isNaN(parsedDate.getTime())) return normalizedValue;

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium'
  }).format(parsedDate);
}

function loadStoredModelDatasetEntries() {
  try {
    const parsed = JSON.parse(window.localStorage?.getItem(MODEL_DATASET_STORAGE_KEY) || '[]');
    return Array.isArray(parsed)
      ? parsed.filter((entry) => entry && typeof entry === 'object').map((entry) => normalizeTrainingSourceEntry(entry, 'Dataset'))
      : [];
  } catch (error) {
    return [];
  }
}

function writeStoredModelDatasetEntries() {
  try {
    window.localStorage?.setItem(MODEL_DATASET_STORAGE_KEY, JSON.stringify(modelDatasetEntries));
  } catch (error) {
    /* Local persistence remains a resilience fallback for the Supabase-owned substrate. */
  }
}

function loadStoredModelKnowledgeBaseEntries() {
  try {
    const parsed = JSON.parse(window.localStorage?.getItem(MODEL_KNOWLEDGE_BASE_STORAGE_KEY) || '[]');
    return Array.isArray(parsed)
      ? parsed.filter((entry) => entry && typeof entry === 'object').map((entry) => normalizeTrainingSourceEntry(entry, 'Knowledge asset'))
      : [];
  } catch (error) {
    return [];
  }
}

function writeStoredModelKnowledgeBaseEntries() {
  try {
    window.localStorage?.setItem(MODEL_KNOWLEDGE_BASE_STORAGE_KEY, JSON.stringify(modelKnowledgeBaseEntries));
  } catch (error) {
    /* Local persistence remains a resilience fallback for the Supabase-owned substrate. */
  }
}

function loadStoredModelLogicRecords() {
  try {
    const parsed = JSON.parse(window.localStorage?.getItem(MODEL_LOGIC_RECORDS_STORAGE_KEY) || '[]');
    return Array.isArray(parsed)
      ? parsed.filter((entry) => entry && typeof entry === 'object').map(normalizeLogicRecordEntry)
      : [];
  } catch (error) {
    return [];
  }
}

function writeStoredModelLogicRecords() {
  try {
    window.localStorage?.setItem(MODEL_LOGIC_RECORDS_STORAGE_KEY, JSON.stringify(modelLogicRecords));
  } catch (error) {
    /* Local persistence remains a resilience fallback for the Supabase-owned substrate. */
  }
}

function normalizeModelLogicQuestionRegistry(value = {}) {
  const categories = Array.isArray(value?.categories) ? value.categories : [];
  const questions = categories.flatMap((category) => {
    const categoryLabel = String(category?.label || category?.id || 'Logic').trim();
    const categoryQuestions = Array.isArray(category?.questions) ? category.questions : [];
    return categoryQuestions.map((question) => ({
      category: categoryLabel,
      question: String(question || '').trim(),
    }));
  }).filter((entry) => entry.question);

  return questions.length ? questions : [...MODEL_LOGIC_FALLBACK_QUESTIONS];
}

async function readModelLogicQuestionRegistry() {
  if (Array.isArray(modelLogicQuestionRegistry) && modelLogicQuestionRegistry.length) {
    return modelLogicQuestionRegistry;
  }

  if (modelLogicQuestionRegistryLoading) return modelLogicQuestionRegistryLoading;

  modelLogicQuestionRegistryLoading = fetch(MODEL_LOGIC_QUESTION_REGISTRY_URL, { cache: 'no-cache' })
    .then((response) => (response.ok ? response.json() : null))
    .then((data) => {
      modelLogicQuestionRegistry = normalizeModelLogicQuestionRegistry(data);
      return modelLogicQuestionRegistry;
    })
    .catch(() => {
      modelLogicQuestionRegistry = [...MODEL_LOGIC_FALLBACK_QUESTIONS];
      return modelLogicQuestionRegistry;
    })
    .finally(() => {
      modelLogicQuestionRegistryLoading = null;
    });

  return modelLogicQuestionRegistryLoading;
}

function pickModelLogicQuestion(questions = []) {
  const source = Array.isArray(questions) && questions.length ? questions : MODEL_LOGIC_FALLBACK_QUESTIONS;
  return source[Math.floor(Math.random() * source.length)] || MODEL_LOGIC_FALLBACK_QUESTIONS[0];
}

function normalizeTrainingSourceEntry(entry = {}, fallbackTitle = 'Training source') {
  return {
    id: String(entry.id || '').trim(),
    title: String(entry.source_title || entry.title || fallbackTitle).trim(),
    text: String(entry.source_content || entry.text || entry.source_reference || '').trim(),
    kind: String(entry.source_kind || entry.kind || '').trim(),
    sourceReference: String(entry.source_reference || entry.sourceReference || '').trim(),
    metadata: entry.source_metadata || entry.metadata || {},
    createdAt: String(entry.created_at || entry.createdAt || '').trim(),
    updatedAt: String(entry.updated_at || entry.updatedAt || '').trim(),
  };
}

function normalizeLogicRecordEntry(entry = {}) {
  return {
    id: String(entry.id || '').trim(),
    title: String(entry.logic_title || entry.title || '').trim(),
    text: String(entry.logic_body || entry.text || '').trim(),
    createdAt: String(entry.created_at || entry.createdAt || '').trim(),
    updatedAt: String(entry.updated_at || entry.updatedAt || '').trim(),
  };
}

function setTrainingSubstrateStatus(message = '', state = 'idle') {
  modelManagementRoots().forEach((root) => {
    root.querySelectorAll('[data-model-training-substrate-status]').forEach((status) => {
      if (!(status instanceof HTMLElement)) return;
      status.setAttribute('data-status-message', '');
      status.textContent = message;
      status.dataset.modelTrainingSubstrateStatus = state;
      
      if (message && state !== 'idle') {
        status.dataset.statusMessageActive = 'true';
        handleStatusMessageAutoDismiss();
      } else {
        status.dataset.statusMessageActive = '';
      }
    });
  });
}

function formatTrainingSubstrateError(error) {
  const code = String(error?.code || error?.message || '').trim();
  if (code === 'MODEL_TRAINING_SCHEMA_REQUIRED') {
    return 'Training schema migration required before these records can save.';
  }
  return code ? `Training record could not be saved: ${code}` : 'Training record could not be saved.';
}

async function hydrateTrainingSubstrateFromBackend() {
  if (modelTrainingSubstrateBackendLoaded) return;

  try {
    const [datasetEntries, sourceVaultEntries, knowledgeEntries, logicRecords] = await Promise.all([
      listModelTrainingDatasetEntries(),
      listModelSourceVaultPackageEntries(),
      listModelKnowledgeEntries(),
      listModelLogicRecords()
    ]);
    modelDatasetEntries = [
      ...datasetEntries.map((entry) => normalizeTrainingSourceEntry(entry, 'Dataset')),
      ...sourceVaultEntries.map((entry) => normalizeTrainingSourceEntry(entry, 'Source package')),
    ];
    modelKnowledgeBaseEntries = knowledgeEntries.map((entry) => normalizeTrainingSourceEntry(entry, 'Knowledge asset'));
    modelLogicRecords = logicRecords.map(normalizeLogicRecordEntry);
    modelTrainingSubstrateBackendLoaded = true;
    writeStoredModelDatasetEntries();
    writeStoredModelKnowledgeBaseEntries();
    writeStoredModelLogicRecords();
    renderAllModelManagement();
  } catch (error) {
    setTrainingSubstrateStatus(formatTrainingSubstrateError(error), 'error');
  }
}

async function saveModelSourceVaultPackages(packages = [], options = {}) {
  if (!packages.length) return;

  setTrainingSubstrateStatus(options.savingMessage || 'Saving Source Vault package...', 'saving');
  try {
    const savedEntries = await Promise.all(packages.map((packageRecord) => upsertModelSourceVaultPackageEntry(packageRecord)));
    const normalizedEntries = savedEntries.map((entry) => normalizeTrainingSourceEntry(entry, 'Source package'));
    const nextEntriesById = new Map(modelDatasetEntries.map((entry) => [entry.id, entry]));
    normalizedEntries.forEach((entry) => {
      if (entry.id) nextEntriesById.set(entry.id, entry);
    });
    modelDatasetEntries = Array.from(nextEntriesById.values());
    writeStoredModelDatasetEntries();
    renderAllModelManagement();
    if (options.refreshBrain === true) await refreshDigitalBrainMaturity(document);
    const savedMessage = options.savedMessage || 'Source Vault package saved to Database.';
    setTrainingSubstrateStatus(savedMessage, 'saved');
    document.dispatchEvent(new CustomEvent('model-source-vault:database-save-result', {
      detail: {
        state: 'saved',
        message: savedMessage,
      },
    }));
  } catch (error) {
    const errorMessage = formatTrainingSubstrateError(error);
    setTrainingSubstrateStatus(errorMessage, 'error');
    document.dispatchEvent(new CustomEvent('model-source-vault:database-save-result', {
      detail: {
        state: 'error',
        message: errorMessage,
      },
    }));
  }
}

async function handleModelSourceVaultPackageSaved(event) {
  const detail = event instanceof CustomEvent ? event.detail || {} : {};
  const packages = Array.isArray(detail.sourcePackages) ? detail.sourcePackages : [];
  await saveModelSourceVaultPackages(packages, {
    savingMessage: 'Saving Source Vault package...',
    savedMessage: 'Source Vault package saved to Database.',
    refreshBrain: true,
  });
}

async function handleModelSourceVaultConfirmed(event) {
  const detail = event instanceof CustomEvent ? event.detail || {} : {};
  const packages = Array.isArray(detail.sourcePackages) ? detail.sourcePackages : [];
  await saveModelSourceVaultPackages(packages, {
    savingMessage: 'Confirming Source Vault intake...',
    savedMessage: 'Source Vault intake confirmed and linked to the brain overview.',
    refreshBrain: true,
  });
}

function scheduleModelFoundationIdentityBackendSave() {
  window.clearTimeout(modelFoundationIdentityBackendSaveTimer);
  modelFoundationIdentityBackendSaveTimer = window.setTimeout(async () => {
    try {
      const model = await getOwnedCanonicalModel();
      if (!model?.id) return;
      const identity = await saveModelFoundationIdentity(model.id, modelFoundationIdentity);
      if (!identity) return;
      updateModelFoundationIdentity(identity, {
        source: 'model-management-backend',
        sync: false
      });
    } catch (error) {
      console.warn('[Neuroartan][Model] Foundation identity sync skipped.', error);
    }
  }, 350);
}

function updateModelFoundationIdentity(nextPatch = {}, options = {}) {
  modelFoundationIdentity = normalizeModelFoundationIdentity({
    ...modelFoundationIdentity,
    ...nextPatch
  });
  writeStoredModelFoundationIdentity(modelFoundationIdentity);
  renderAllModelFoundationIdentityControls();

  document.dispatchEvent(new CustomEvent('model:foundation-identity-updated', {
    detail: {
      identity: { ...modelFoundationIdentity },
      source: options.source || 'model-management'
    }
  }));

  if (options.sync !== false) {
    scheduleModelFoundationIdentityBackendSave();
  }
}

async function hydrateModelFoundationIdentityFromBackend() {
  if (modelFoundationIdentityBackendLoaded) return;

  try {
    const model = await ensureOwnedCanonicalModel().catch(() => getOwnedCanonicalModel());
    if (!model?.id) return;

    const identity = await readModelFoundationIdentity(model.id);
    updateModelFoundationIdentity({
      modelId: identity?.modelId || model.id || 'Model record pending',
      modelNickname: identity?.modelNickname || model.model_name || model.display_name || '',
      modelPurposeDescription: identity?.modelPurposeDescription || model.description || '',
      privateNotes: identity?.privateNotes || '',
      registryId: identity?.registryId || 'Registry record pending',
      privateSerialIdentity: identity?.privateSerialIdentity || `NA-MODEL-${String(model.id).slice(0, 8).toUpperCase()}`,
      publicSerialIdentity: identity?.publicSerialIdentity || 'Public identity not enabled',
      birthCertificateId: identity?.birthCertificateId || model.birth_certificate_id || 'Birth record pending',
      birthDate: identity?.birthDate || model.created_at || '',
      modelType: identity?.modelType || 'Personal',
      lifecycleState: identity?.lifecycleState || model.lifecycle_state || 'created',
      readinessState: identity?.readinessState || model.readiness_state || 'uninitialized',
      verificationState: identity?.verificationState || model.verification_state || 'unverified',
      discoverabilityState: identity?.discoverabilityState || model.publication_state || 'unpublished',
      privacyLockState: identity?.privacyLockState || 'private_owner_controlled',
      createdAt: identity?.createdAt || model.created_at || '',
      updatedAt: identity?.updatedAt || model.updated_at || '',
      modelAvatar: identity?.modelAvatar || model.model_image_url || '',
      ownerRecordPolicy: identity?.ownerRecordPolicy || 'fixed_owner_binding'
    }, {
      source: 'model-management-backend',
      sync: false
    });
    modelFoundationIdentityBackendLoaded = true;
  } catch (error) {
    console.warn('[Neuroartan][Model] Foundation identity hydration skipped.', error);
  }
}

function retryModelFoundationIdentityHydration() {
  modelFoundationIdentityBackendLoaded = false;
  void hydrateModelFoundationIdentityFromBackend();
}

function getModelPersonalizationValue(field) {
  return normalizeModelPersonalizationPreferences(modelPersonalizationPreferences)[field];
}

function scheduleModelPersonalizationBackendSave() {
  window.clearTimeout(modelPersonalizationBackendSaveTimer);
  modelPersonalizationBackendSaveTimer = window.setTimeout(async () => {
    try {
      const model = await getOwnedCanonicalModel();
      if (!model?.id) {
        const error = new Error('MODEL_RECORD_UNAVAILABLE');
        error.code = 'MODEL_RECORD_UNAVAILABLE';
        throw error;
      }
      const preferences = await saveModelPersonalizationPreferences(model.id, modelPersonalizationPreferences);
      if (!preferences) {
        const error = new Error('MODEL_PERSONALIZATION_NOT_SAVED');
        error.code = 'MODEL_PERSONALIZATION_NOT_SAVED';
        throw error;
      }
      setModelPersonalizationStatus('Model personalization saved', 'success');
    } catch (error) {
      setModelPersonalizationStatus(formatModelPersonalizationError(error), 'error');
      console.warn('[Neuroartan][Model] Personalization preference sync skipped.', error);
    }
  }, 350);
}

function updateModelPersonalizationPreferences(nextPatch = {}, options = {}) {
  const previousPreferences = normalizeModelPersonalizationPreferences(modelPersonalizationPreferences);
  const shouldRecordChangelog = options.recordChangelog !== false && options.source !== 'model-management-backend';

  if (shouldRecordChangelog) {
    recordModelPersonalizationChangelog(nextPatch, previousPreferences, options);
  }

  modelPersonalizationPreferences = normalizeModelPersonalizationPreferences({
    ...modelPersonalizationPreferences,
    ...nextPatch
  });
  writeStoredModelPersonalizationPreferences(modelPersonalizationPreferences);
  renderAllModelPersonalizationControls();
  renderAllModelChangelogRecords();

  document.dispatchEvent(new CustomEvent('model:personalization-preferences-updated', {
    detail: {
      preferences: { ...modelPersonalizationPreferences },
      source: options.source || 'model-management'
    }
  }));

  if (options.sync !== false) {
    scheduleModelPersonalizationBackendSave();
  }
}

async function hydrateModelPersonalizationFromBackend() {
  if (modelPersonalizationBackendLoaded) return;
  modelPersonalizationBackendLoaded = true;

  try {
    const model = await getOwnedCanonicalModel();
    if (!model?.id) return;

    const preferences = await readModelPersonalizationPreferences(model.id);
    if (!preferences) return;

    updateModelPersonalizationPreferences(preferences, {
      source: 'model-management-backend',
      sync: false
    });
  } catch (error) {
    console.warn('[Neuroartan][Model] Personalization preference hydration skipped.', error);
  }
}

async function hydrateModelDefaultsFromBackend() {
  if (modelDefaultRegistryBackendLoaded) return;
  modelDefaultRegistryBackendLoaded = true;

  try {
    const defaults = await listModelDefaultRegistry({ area: 'personalization' });
    applyModelDefaultRegistryRecords(defaults);
    modelPersonalizationPreferences = normalizeModelPersonalizationPreferences(modelPersonalizationPreferences);
    renderAllModelPersonalizationControls();
  } catch (error) {
    console.warn('[Neuroartan][Model] Default registry hydration skipped.', error);
  }
}

async function hydrateModelChangelogFromBackend(options = {}) {
  if (modelChangelogBackendLoaded && options.force !== true) {
    document.dispatchEvent(new CustomEvent('model:changelog-hydrated', {
      detail: {
        source: options.source || 'model-management',
        cached: true
      }
    }));
    return;
  }
  modelChangelogBackendLoaded = true;

  try {
    const model = await getOwnedCanonicalModel();
    if (!model?.id) return;

    const records = await listModelChangelogEvents(model.id, {});
    if (records.length) {
      modelChangelogRecords = records.map(mapBackendModelChangelogEvent);
      writeStoredModelChangelogRecords();
      renderAllModelChangelogRecords();
    }

    document.dispatchEvent(new CustomEvent('model:changelog-hydrated', {
      detail: {
        source: options.source || 'model-management',
        records: records.length
      }
    }));
  } catch (error) {
    console.warn('[Neuroartan][Model] Changelog hydration skipped.', error);
  }
}


function formatSourceSummaryValue(value = '') {
  const normalizedValue = String(value || '').trim();
  if (!normalizedValue) return 'Not recorded';
  return normalizedValue
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function createReadableSourceSummary(payload = {}, latest = {}) {
  const readiness = String(payload.source_readiness || latest.source_readiness || '').trim();

  if (readiness === 'stable') {
    return 'Your Source Profile is stable. The model can use it as a grounded baseline for reflection and next-step planning.';
  }

  if (readiness === 'forming') {
    return 'Your Source Profile is forming. The model should use it gently while it continues learning your reflection pattern.';
  }

  return 'Your Source Profile is initial. The model should keep reflection simple while it learns your orientation pattern.';
}

function createReadablePersonalitySummary(payload = {}, latest = {}) {
  const readiness = String(payload.personality_readiness || latest.personality_readiness || '').trim();

  if (readiness === 'complete') {
    return 'Your Personality Profile is ready. The model can use it as a stable baseline for more natural responses.';
  }

  if (readiness === 'forming') {
    return 'Your Personality Profile is forming. The model should use it gently while it continues learning your response pattern.';
  }

  return 'Your Personality Profile is initial. The model should keep responses simple while it learns your style and reflection needs.';
}

function getSourceSummaryStatusToken(value = '') {
  const score = Number(value);
  if (Number.isFinite(score)) {
    if (score >= 7) return 'complete';
    if (score >= 4) return 'forming';
    return 'initial';
  }

  const normalizedValue = String(value || '').trim().toLowerCase();
  if (!normalizedValue || normalizedValue === 'not recorded' || normalizedValue === 'unclassified') return 'pending';
  if (['stable', 'calibrated', 'complete', 'completed'].includes(normalizedValue)) return 'complete';
  if (['forming', 'initial', 'draft', 'pending'].includes(normalizedValue)) return normalizedValue === 'initial' ? 'initial' : 'forming';

  return 'pending';
}


function getSourceSummaryMetricStatus(metric = {}) {
  if (metric?.status && metric.status !== 'complete') {
    return metric.status;
  }

  const score = Number(metric?.score ?? metric?.value);
  if (Number.isFinite(score)) {
    return getSourceSummaryStatusToken(score);
  }

  return getSourceSummaryStatusToken(metric?.value);
}

const SOURCE_SUMMARY_DOC_LINKS = Object.freeze({
  'Cognitive Orientation Index': 'https://docs.neuroartan.com/model-identity/source-calibration/cognitive-orientation-index/',
  'Dominant Orientation': 'https://docs.neuroartan.com/model-identity/source-calibration/dominant-orientation/',
  'Control Orientation': 'https://docs.neuroartan.com/model-identity/source-calibration/control-orientation/',
  'Agency Level': 'https://docs.neuroartan.com/model-identity/source-calibration/agency-level/',
  'Regulation Style': 'https://docs.neuroartan.com/model-identity/source-calibration/regulation-style/',
  'Cognitive Flexibility': 'https://docs.neuroartan.com/model-identity/source-calibration/cognitive-flexibility/',
  'Narrative Coherence': 'https://docs.neuroartan.com/model-identity/source-calibration/narrative-coherence/'
});

const PERSONALITY_SUMMARY_DOC_LINKS = Object.freeze({
  'Personality Coherence Index': 'https://docs.neuroartan.com/model-identity/personality-calibration/personality-coherence-index/',
  'Dominant Personality Pattern': 'https://docs.neuroartan.com/model-identity/personality-calibration/dominant-personality-pattern/',
  'Self-Model Function': 'https://docs.neuroartan.com/model-identity/personality-calibration/self-model-function/',
  'Social Expression': 'https://docs.neuroartan.com/model-identity/personality-calibration/social-expression/',
  'Regulation Pattern': 'https://docs.neuroartan.com/model-identity/personality-calibration/regulation-pattern/',
  'Cognitive Style': 'https://docs.neuroartan.com/model-identity/personality-calibration/cognitive-style/',
  'Adaptation Style': 'https://docs.neuroartan.com/model-identity/personality-calibration/adaptation-style/',
  'Reflection Tolerance': 'https://docs.neuroartan.com/model-identity/personality-calibration/reflection-tolerance/'
});

const PERSONALITY_SUMMARY_ICON_LINKS = Object.freeze({
  personality_coherence_index: '/registry/icons/public/assets/core/model/personality-coherence-index/personality-coherence-index.svg',
  dominant_personality_pattern: '/registry/icons/public/assets/core/model/dominant-personality-pattern/dominant-personality-pattern.svg',
  self_model_function: '/registry/icons/public/assets/core/model/self-model-function/self-model-function.svg',
  social_expression: '/registry/icons/public/assets/core/model/social-expression/social-expression.svg',
  regulation_pattern: '/registry/icons/public/assets/core/model/regulation-pattern/regulation-pattern.svg',
  cognitive_style: '/registry/icons/public/assets/core/model/cognitive-style/cognitive-style.svg',
  adaptation_style: '/registry/icons/public/assets/core/model/adaptation-style/adaptation-style.svg',
  reflection_tolerance: '/registry/icons/public/assets/core/model/reflection-tolerance/reflection-tolerance.svg'
});

const PERSONALITY_SUMMARY_METRIC_FALLBACKS = Object.freeze({
  personality_coherence_index: {
    label: 'Personality Coherence Index',
    value: 'Not recorded',
    status: 'pending',
  },
  dominant_personality_pattern: {
    label: 'Dominant Personality Pattern',
    value: 'Not recorded',
    status: 'pending',
  },
  self_model_function: {
    label: 'Self-Model Function',
    value: 'Not recorded',
    status: 'pending',
  },
  social_expression: {
    label: 'Social Expression',
    value: 'Not recorded',
    status: 'pending',
  },
  regulation_pattern: {
    label: 'Regulation Pattern',
    value: 'Not recorded',
    status: 'pending',
  },
  cognitive_style: {
    label: 'Cognitive Style',
    value: 'Not recorded',
    status: 'pending',
  },
  adaptation_style: {
    label: 'Adaptation Style',
    value: 'Not recorded',
    status: 'pending',
  },
  reflection_tolerance: {
    label: 'Reflection Tolerance',
    value: 'Not recorded',
    status: 'pending',
  },
});

function createSourceSummaryLearnButton(label = '') {
  const href = SOURCE_SUMMARY_DOC_LINKS[label] || 'https://docs.neuroartan.com/model-identity/source-calibration/';

  return `
    <a class="model-source-summary__learn" href="${href}" target="_blank" rel="noopener noreferrer" data-model-source-summary-learn="${label}" aria-label="Learn more about ${label}">
      <img class="model-source-summary__learn-icon ui-icon-theme-aware" src="/registry/icons/public/assets/core/actions/info/info.svg" alt="">
    </a>
  `;
}

function createPersonalitySummaryLearnButton(label = '') {
  const href = PERSONALITY_SUMMARY_DOC_LINKS[label] || 'https://docs.neuroartan.com/model-identity/personality-calibration/';

  return `
    <a class="model-source-summary__learn" href="${href}" target="_blank" rel="noopener noreferrer" data-model-personality-summary-learn="${label}" aria-label="Learn more about ${label}">
      <img class="model-source-summary__learn-icon ui-icon-theme-aware" src="/registry/icons/public/assets/core/actions/info/info.svg" alt="">
    </a>
  `;
}

function getSourceSummaryMetricValue(metric = {}, fallback = 'Not recorded') {
  const value = metric?.value ?? fallback;
  if (typeof value === 'number') {
    return `${value.toFixed(1).replace(/\.0$/, '')} / 10`;
  }
  return formatSourceSummaryValue(value);
}

function getSourceSummaryMetricScore(metric = {}) {
  if (typeof metric?.value === 'number') return '';

  const score = Number(metric?.score);
  if (!Number.isFinite(score)) return '';
  return `${score.toFixed(1).replace(/\.0$/, '')} / 10`;
}

function createSourceSummaryMetricMarkup(metricKey = '', metric = {}, icon = '') {
  const label = metric?.label || formatSourceSummaryValue(metricKey);
  const value = getSourceSummaryMetricValue(metric);
  const score = getSourceSummaryMetricScore(metric);
  const status = getSourceSummaryMetricStatus(metric);

  return `
    <div class="model-source-summary__metric">
      <dt>
        <img class="model-management__card-icon ui-icon-theme-aware" src="${icon}" alt="">
        <span>${label}</span>
        ${createSourceSummaryLearnButton(label)}
      </dt>
      <dd>
        <span class="model-management__status-dot" data-status="${status}" aria-hidden="true"></span>
        <strong>${value}</strong>
        ${score ? `<span class="model-source-summary__score">${score}</span>` : ''}
      </dd>
    </div>
  `;
}

function createPersonalitySummaryMetricMarkup(metricKey = '', metric = {}, icon = '') {
  const label = metric?.label || formatSourceSummaryValue(metricKey);
  const value = getSourceSummaryMetricValue(metric);
  const score = getSourceSummaryMetricScore(metric);
  const status = getSourceSummaryMetricStatus(metric);

  return `
    <div class="model-source-summary__metric">
      <dt>
        <img class="model-management__card-icon ui-icon-theme-aware" src="${icon}" alt="">
        <span>${label}</span>
        ${createPersonalitySummaryLearnButton(label)}
      </dt>
      <dd>
        <span class="model-management__status-dot" data-status="${status}" aria-hidden="true"></span>
        <strong>${value}</strong>
        ${score ? `<span class="model-source-summary__score">${score}</span>` : ''}
      </dd>
    </div>
  `;
}

function removeModelSourceSummaryOverlay() {
  document.querySelector('[data-model-source-summary-overlay]')?.remove();
}

function removeModelPersonalitySummaryOverlay() {
  document.querySelector('[data-model-personality-summary-overlay]')?.remove();
}

function removeModelKeysOverlay() {
  document.querySelector('[data-model-keys-overlay]')?.remove();
}

function removeModelInfoOverlay() {
  document.querySelector('[data-model-info-overlay]')?.remove();
}

function getMaskedModelKeyValue(value = '') {
  const normalizedValue = String(value || '').trim();
  if (!normalizedValue || normalizedValue.toLowerCase().includes('pending') || normalizedValue.toLowerCase().includes('not enabled')) {
    return 'Not issued';
  }
  return '••••••••';
}

function getPreviewModelKeyValue(value = '') {
  const normalizedValue = String(value || '').trim();
  if (!normalizedValue || normalizedValue.toLowerCase().includes('pending') || normalizedValue.toLowerCase().includes('not enabled')) {
    return 'Not issued';
  }

  if (normalizedValue.length <= 8) {
    return `${normalizedValue.slice(0, 2)}••••${normalizedValue.slice(-2)}`;
  }

  return `${normalizedValue.slice(0, 4)}••••${normalizedValue.slice(-4)}`;
}

function getModelKeyActionPayload(label = '', value = '') {
  const normalizedValue = String(value || '').trim();
  const unavailable = !normalizedValue
    || normalizedValue.toLowerCase().includes('pending')
    || normalizedValue.toLowerCase().includes('not enabled');

  return {
    label,
    value: unavailable ? '' : normalizedValue,
    masked: unavailable ? 'Not issued' : getMaskedModelKeyValue(normalizedValue),
    preview: unavailable ? 'Not issued' : getPreviewModelKeyValue(normalizedValue),
    unavailable,
  };
}

function getModelKeyIcon(label = '') {
  const normalizedLabel = String(label || '').trim().toLowerCase();
  const icons = {
    'model id': '/registry/icons/public/assets/layers/website/model/overview/model-id.svg',
    'owner id': '/registry/icons/public/assets/layers/website/model/overview/owner-id.svg',
    'registry id': '/registry/icons/public/assets/layers/website/model/overview/registry-id.svg',
    'birth certificate id': '/registry/icons/public/assets/layers/website/model/overview/birth-certificate-id.svg',
    'private serial id': '/registry/icons/public/assets/layers/website/model/overview/private-serial-identity.svg',
    'public serial identity': '/registry/icons/public/assets/layers/website/model/overview/public-serial-identity.svg',
    'legacy secret key': '/registry/icons/public/assets/core/identity/security/key.svg',
    'api key': '/registry/icons/public/assets/layers/software/api/api.svg',
  };

  return icons[normalizedLabel] || '/registry/icons/public/assets/core/identity/security/key.svg';
}

function getModelInfoIcon(label = '') {
  const normalizedLabel = String(label || '').trim().toLowerCase();
  const icons = {
    'model nickname': '/registry/icons/public/assets/layers/website/model/overview/model-nickname.svg',
    'model status': '/registry/icons/public/assets/layers/website/model/overview/model-status.svg',
    readiness: '/registry/icons/public/assets/layers/website/model/overview/readiness.svg',
    'profile link': '/registry/icons/public/assets/layers/website/model/overview/profile-link.svg',
    'model type': '/registry/icons/public/assets/layers/website/model/overview/model-type.svg',
    lifecycle: '/registry/icons/public/assets/layers/website/model/overview/lifecycle.svg',
    'owner verification': '/registry/icons/public/assets/layers/website/model/overview/verification.svg',
    discoverability: '/registry/icons/public/assets/layers/website/model/overview/discoverability.svg',
    'privacy lock': '/registry/icons/public/assets/layers/website/model/overview/privacy-lock.svg',
    created: '/registry/icons/public/assets/layers/website/model/overview/created.svg',
    updated: '/registry/icons/public/assets/layers/website/model/overview/updated.svg',
    'owner policy': '/registry/icons/public/assets/core/legal/policy/policy.svg',
  };

  return icons[normalizedLabel] || '/registry/icons/public/assets/core/actions/info/info.svg';
}

function showGlobalCopiedFeedback(anchor, message = 'Copied') {
  if (!(anchor instanceof HTMLElement)) return;

  document.querySelectorAll('[data-global-copied-feedback]').forEach((node) => node.remove());

  const feedback = document.createElement('span');
  feedback.className = 'global-copied-feedback';
  feedback.dataset.globalCopiedFeedback = '';
  feedback.textContent = message;
  feedback.setAttribute('role', 'status');
  feedback.setAttribute('aria-live', 'polite');

  const anchorBox = anchor.getBoundingClientRect();
  const viewportPadding = 12;
  const top = Math.max(viewportPadding, Math.min(window.innerHeight - viewportPadding, anchorBox.top + anchorBox.height / 2));
  const left = Math.max(viewportPadding, Math.min(window.innerWidth - viewportPadding, anchorBox.right + 8));

  feedback.style.position = 'fixed';
  feedback.style.top = `${top}px`;
  feedback.style.left = `${left}px`;
  feedback.style.transform = 'translateY(-50%)';
  feedback.style.zIndex = '2147483647';

  document.body.append(feedback);

  window.setTimeout(() => {
    feedback.dataset.globalCopiedFeedbackClosing = 'true';
  }, 1200);

  window.setTimeout(() => {
    feedback.remove();
  }, 1600);
}

async function copyTextToClipboard(value = '') {
  const normalizedValue = String(value || '').trim();
  if (!normalizedValue) return false;

  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(normalizedValue);
    return true;
  }

  const textarea = document.createElement('textarea');
  textarea.value = normalizedValue;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.top = '-9999px';
  textarea.style.left = '-9999px';
  document.body.append(textarea);
  textarea.select();

  try {
    return document.execCommand('copy');
  } finally {
    textarea.remove();
  }
}

function getReadableModelInfoValue(value = '', fallback = 'Not recorded') {
  const normalizedValue = String(value || '').trim();
  if (!normalizedValue) return fallback;
  return formatModelIdentityState(normalizedValue);
}

function escapeModelManagementText(value = '') {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function createModelKeyRow(label = '', value = '', options = {}) {
  const payload = getModelKeyActionPayload(label, value);
  const disabledAttribute = payload.unavailable ? ' disabled aria-disabled="true"' : '';
  const icon = getModelKeyIcon(label);

  return `
    <div class="model-source-summary__metric model-source-summary__metric--key">
      <dt>
        <img class="model-management__card-icon ui-icon-theme-aware" src="${icon}" alt="">
        <span>${options.secret === true ? `${label} · Protected` : `${label} · Private`}</span>
      </dt>
      <dd>
        <code class="model-source-summary__key-box" data-model-key-value="${payload.value}" data-model-key-masked="${payload.masked}" data-model-key-preview="${payload.preview}" data-model-key-revealed="false">${payload.preview}</code>
        <span class="model-source-summary__actions">
          <button class="model-source-summary__action" type="button" data-model-key-reveal${disabledAttribute} aria-label="Show ${label}">
            <img class="model-source-summary__learn-icon ui-icon-theme-aware" src="/registry/icons/public/assets/core/identity/access/visibility-on.svg" alt="">
          </button>
          <button class="model-source-summary__action" type="button" data-model-key-copy${disabledAttribute} aria-label="Copy ${label}">
            <img class="model-source-summary__learn-icon ui-icon-theme-aware" src="/registry/icons/public/assets/core/actions/copy/copy.svg" alt="">
          </button>
        </span>
      </dd>
    </div>
  `;
}

function createModelInfoRow(label = '', value = '') {
  const icon = getModelInfoIcon(label);

  return `
    <div class="model-source-summary__metric">
      <dt>
        <img class="model-management__card-icon ui-icon-theme-aware" src="${icon}" alt="">
        <span>${label}</span>
      </dt>
      <dd>
        <strong>${getReadableModelInfoValue(value)}</strong>
      </dd>
    </div>
  `;
}

function createModelInfoIdentityBlock(identity = {}, model = {}, runtimeState = {}) {
  const profile = runtimeState.profile || {};
  const displayName = String(runtimeState.displayName || profile.display_name || model?.creator_display_name || '').trim();
  const username = String(runtimeState.username?.normalized || profile.username || model?.creator_username || '').trim();
  const modelName = String(identity.modelNickname || model?.model_name || displayName || 'Personal model').trim();
  const avatarUrl = String(identity.modelAvatar || model?.model_image_url || '').trim();
  const avatarImage = avatarUrl
    ? `<img class="profile-private-hero__avatar-image" src="${escapeModelManagementText(avatarUrl)}" alt="" aria-hidden="true">`
    : '';

  return `
    <section class="model-source-summary__identity" aria-label="Model identity">
      <div class="model-source-summary__avatar profile-private-hero__avatar" aria-hidden="true">
        ${avatarImage}
      </div>
      <div class="model-source-summary__identity-copy">
        <strong>${escapeModelManagementText(modelName)}</strong>
        <span>${escapeModelManagementText(username ? `Linked to @${username}` : displayName || 'Owner profile linked')}</span>
      </div>
    </section>
  `;
}

async function handleModelKeysOpenRequest() {
  removeModelKeysOverlay();

  const overlay = document.createElement('section');
  overlay.className = 'model-source-calibration-workspace';
  overlay.dataset.modelKeysOverlay = '';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Model keys');
  overlay.innerHTML = `
    <div class="model-source-calibration-workspace__backdrop" data-model-keys-close></div>
    <article class="model-source-calibration-workspace__surface" role="dialog" aria-modal="true" aria-label="Model keys">
      <header class="model-source-calibration-workspace__header">
        <span class="model-source-calibration-workspace__progress">Keys</span>
        <button class="global-close-button" type="button" data-model-keys-close aria-label="Close model keys">
          <span class="global-close-button__line global-close-button__line--first" aria-hidden="true"></span>
          <span class="global-close-button__line global-close-button__line--second" aria-hidden="true"></span>
        </button>
      </header>
      <div class="model-source-calibration-workspace__body">
        <section class="model-source-calibration-workspace__result" data-model-keys-overlay-body>
          <p class="model-management__section-copy">Loading keys.</p>
        </section>
      </div>
    </article>
  `;

  document.body.append(overlay);

  const body = overlay.querySelector('[data-model-keys-overlay-body]');
  if (!(body instanceof HTMLElement)) return;

  try {
    const identity = normalizeModelFoundationIdentity(modelFoundationIdentity);
    const model = await getOwnedCanonicalModel().catch(() => null);
    const modelId = identity.modelId && identity.modelId !== 'Model record pending' ? identity.modelId : model?.id || '';
    const ownerId = model?.profile_id || '';

    body.innerHTML = `
      <section class="model-source-summary" aria-label="Model key dashboard">
        <dl class="model-source-summary__metrics">
          ${createModelKeyRow('Model ID', modelId)}
          ${createModelKeyRow('Owner ID', ownerId)}
          ${createModelKeyRow('Registry ID', identity.registryId)}
          ${createModelKeyRow('Birth Certificate ID', identity.birthCertificateId)}
          ${createModelKeyRow('Private Serial ID', identity.privateSerialIdentity)}
          ${createModelKeyRow('Public Serial Identity', identity.publicSerialIdentity)}
          ${createModelKeyRow('Legacy Secret Key', '', { secret: true })}
          ${createModelKeyRow('API Key', '', { secret: true })}
        </dl>
      </section>
    `;
  } catch (error) {
    console.warn('[Neuroartan][Model] Keys overlay failed.', error);
    body.innerHTML = '<p class="model-management__section-copy">Model keys could not be loaded.</p>';
  }
}

async function handleModelInfoOpenRequest() {
  removeModelInfoOverlay();

  const overlay = document.createElement('section');
  overlay.className = 'model-source-calibration-workspace';
  overlay.dataset.modelInfoOverlay = '';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Model information');
  overlay.innerHTML = `
    <div class="model-source-calibration-workspace__backdrop" data-model-info-close></div>
    <article class="model-source-calibration-workspace__surface" role="dialog" aria-modal="true" aria-label="Model information">
      <header class="model-source-calibration-workspace__header">
        <span class="model-source-calibration-workspace__progress">Info</span>
        <button class="global-close-button" type="button" data-model-info-close aria-label="Close model info">
          <span class="global-close-button__line global-close-button__line--first" aria-hidden="true"></span>
          <span class="global-close-button__line global-close-button__line--second" aria-hidden="true"></span>
        </button>
      </header>
      <div class="model-source-calibration-workspace__body">
        <section class="model-source-calibration-workspace__result" data-model-info-overlay-body>
          <p class="model-management__section-copy">Loading info.</p>
        </section>
      </div>
    </article>
  `;

  document.body.append(overlay);

  const body = overlay.querySelector('[data-model-info-overlay-body]');
  if (!(body instanceof HTMLElement)) return;

  try {
    const identity = normalizeModelFoundationIdentity(modelFoundationIdentity);
    const model = await getOwnedCanonicalModel().catch(() => null);
    const runtimeState = getProfileRuntimeState();
    const profile = runtimeState.profile || {};
    const username = String(runtimeState.username?.normalized || profile.username || model?.creator_username || '').trim();
    const profileComplete = runtimeState.profileComplete === true || profile.profile_complete === true || runtimeState.completion?.complete === true;
    const createdAt = identity.createdAt || model?.created_at || '';
    const updatedAt = identity.updatedAt || model?.updated_at || '';
    const modelNickname = identity.modelNickname || model?.model_name || '';
    const modelStatus = model?.foundation_state || model?.model_status || (profileComplete ? 'Foundation active' : 'Foundation incomplete');
    const readinessState = identity.readinessState || model?.readiness_state || (profileComplete ? 'Preparing' : 'Not ready');
    const profileLink = username ? `Profile linked to @${username}` : 'Profile route pending';

    body.innerHTML = `
      <section class="model-source-summary" aria-label="Model information dashboard">
        ${createModelInfoIdentityBlock(identity, model, runtimeState)}
        <dl class="model-source-summary__metrics">
          ${createModelInfoRow('Model nickname', modelNickname || 'Not assigned')}
          ${createModelInfoRow('Model status', modelStatus)}
          ${createModelInfoRow('Readiness', readinessState)}
          ${createModelInfoRow('Profile link', profileLink)}
          ${createModelInfoRow('Model Type', identity.modelType)}
          ${createModelInfoRow('Lifecycle', identity.lifecycleState)}
          ${createModelInfoRow('Owner Verification', identity.verificationState)}
          ${createModelInfoRow('Discoverability', identity.discoverabilityState)}
          ${createModelInfoRow('Privacy Lock', identity.privacyLockState)}
          ${createModelInfoRow('Created', formatModelIdentityDate(createdAt, 'Not recorded'))}
          ${createModelInfoRow('Updated', formatModelIdentityDate(updatedAt, 'Not recorded'))}
          ${createModelInfoRow('Owner Policy', identity.ownerRecordPolicy)}
        </dl>
      </section>
    `;
  } catch (error) {
    console.warn('[Neuroartan][Model] Info overlay failed.', error);
    body.innerHTML = '<p class="model-management__section-copy">Model information could not be loaded.</p>';
  }
}

async function handleModelSourceSummaryOpenRequest() {
  removeModelSourceSummaryOverlay();

  const overlay = document.createElement('section');
  overlay.className = 'model-source-calibration-workspace';
  overlay.dataset.modelSourceSummaryOverlay = '';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Source readiness summary');
  overlay.innerHTML = `
    <div class="model-source-calibration-workspace__backdrop" data-model-source-summary-close></div>
    <article class="model-source-calibration-workspace__surface" role="dialog" aria-modal="true" aria-label="Source summary">
      <header class="model-source-calibration-workspace__header">
        <span class="model-source-calibration-workspace__progress">Summary</span>
        <button class="global-close-button" type="button" data-model-source-summary-close aria-label="Close Source summary">
          <span class="global-close-button__line global-close-button__line--first" aria-hidden="true"></span>
          <span class="global-close-button__line global-close-button__line--second" aria-hidden="true"></span>
        </button>
      </header>
      <div class="model-source-calibration-workspace__body">
        <section class="model-source-calibration-workspace__result">
          <p class="model-management__section-copy">Loading private Source summary.</p>
        </section>
      </div>
    </article>
  `;

  document.body.append(overlay);

  try {
    const model = await getOwnedCanonicalModel();
    const latest = model?.id ? await readLatestModelSourceCalibrationResult(model.id) : null;
    const payload = latest?.result_payload || latest || {};
    const card = overlay.querySelector('.model-source-calibration-workspace__result');

    if (!(card instanceof HTMLElement)) return;

    if (!latest) {
      card.innerHTML = `
        <p class="model-management__section-copy">No Source Profile has been saved yet.</p>
      `;
      return;
    }

    const summaryMetrics = payload.summary_metrics || latest.summary_metrics || {};
    const metricIcons = {
      cognitive_orientation_index: '/registry/icons/public/assets/core/model/cognitive-orientation-index/cognitive-orientation-index.svg',
      dominant_orientation: '/registry/icons/public/assets/core/model/source-profile/source-profile.svg',
      control_orientation: '/registry/icons/public/assets/core/model/control-orientation/control-orientation.svg',
      agency_level: '/registry/icons/public/assets/core/model/agency-level/agency-level.svg',
      regulation_style: '/registry/icons/public/assets/core/model/regulation-style/regulation-style.svg',
      cognitive_flexibility: '/registry/icons/public/assets/core/model/cognitive-flexibility/cognitive-flexibility.svg',
      narrative_coherence: '/registry/icons/public/assets/core/model/narrative-coherence/narrative-coherence.svg',
    };

    const dimensionOutputs = payload.dimension_outputs || latest.dimension_outputs || {};
    const dimensionScores = payload.dimension_scores || latest.dimension_scores || {};

    const dimensionMetricFallbacks = {
      control_orientation: {
        label: 'Control Orientation',
        value: dimensionOutputs.control_orientation || 'Not recorded',
        score: dimensionScores.control_orientation?.average ?? null,
        status: getSourceSummaryStatusToken(dimensionScores.control_orientation?.average),
      },
      agency_level: {
        label: 'Agency Level',
        value: dimensionOutputs.agency_level || 'Not recorded',
        score: dimensionScores.agency_level?.average ?? null,
        status: getSourceSummaryStatusToken(dimensionScores.agency_level?.average),
      },
      regulation_style: {
        label: 'Regulation Style',
        value: dimensionOutputs.regulation_style || 'Not recorded',
        score: dimensionScores.regulation_style?.average ?? null,
        status: getSourceSummaryStatusToken(dimensionScores.regulation_style?.average),
      },
      cognitive_flexibility: {
        label: 'Cognitive Flexibility',
        value: dimensionOutputs.cognitive_flexibility || 'Not recorded',
        score: dimensionScores.cognitive_flexibility?.average ?? null,
        status: getSourceSummaryStatusToken(dimensionScores.cognitive_flexibility?.average),
      },
      narrative_coherence: {
        label: 'Narrative Coherence',
        value: dimensionOutputs.narrative_coherence || 'Not recorded',
        score: dimensionScores.narrative_coherence?.average ?? null,
        status: getSourceSummaryStatusToken(dimensionScores.narrative_coherence?.average),
      },
    };

    const fallbackMetrics = {
      cognitive_orientation_index: {
        label: 'Cognitive Orientation Index',
        value: payload.cognitive_orientation_index ?? latest.cognitive_orientation_index ?? 'Not recorded',
        status: getSourceSummaryStatusToken(payload.cognitive_orientation_index ?? latest.cognitive_orientation_index),
      },
      dominant_orientation: {
        label: 'Dominant Orientation',
        value: payload.dominant_orientation || latest.dominant_orientation || 'Not recorded',
        status: getSourceSummaryStatusToken((payload.orientation_scores || latest.orientation_scores || {})[payload.dominant_orientation || latest.dominant_orientation]?.average),
      },
      control_orientation: dimensionMetricFallbacks.control_orientation,
      agency_level: dimensionMetricFallbacks.agency_level,
      regulation_style: dimensionMetricFallbacks.regulation_style,
      cognitive_flexibility: dimensionMetricFallbacks.cognitive_flexibility,
      narrative_coherence: dimensionMetricFallbacks.narrative_coherence,
    };

    const metricOrder = [
      'cognitive_orientation_index',
      'dominant_orientation',
      'control_orientation',
      'agency_level',
      'regulation_style',
      'cognitive_flexibility',
      'narrative_coherence',
    ];

    const metricMarkup = metricOrder
      .map((metricKey) => {
        const metric = summaryMetrics[metricKey] || fallbackMetrics[metricKey];
        if (!metric) return '';
        return createSourceSummaryMetricMarkup(metricKey, metric, metricIcons[metricKey]);
      })
      .filter(Boolean)
      .join('');

    card.innerHTML = `
      <section class="model-source-summary" aria-label="Source summary dashboard">
        <p class="model-source-summary__copy">${createReadableSourceSummary(payload, latest)}</p>
        <dl class="model-source-summary__metrics">
          ${metricMarkup}
        </dl>
      </section>
    `;
  } catch (error) {
    console.warn('[Neuroartan][Model] Source summary overlay failed.', error);
  }
}

async function handleModelPersonalitySummaryOpenRequest() {
  removeModelPersonalitySummaryOverlay();

  const overlay = document.createElement('section');
  overlay.className = 'model-source-calibration-workspace';
  overlay.dataset.modelPersonalitySummaryOverlay = '';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Personality summary');
  overlay.innerHTML = `
    <div class="model-source-calibration-workspace__backdrop" data-model-personality-summary-close></div>
    <article class="model-source-calibration-workspace__surface" role="dialog" aria-modal="true" aria-label="Personality summary">
      <header class="model-source-calibration-workspace__header">
        <span class="model-source-calibration-workspace__progress">Summary</span>
        <button class="global-close-button" type="button" data-model-personality-summary-close aria-label="Close Personality summary">
          <span class="global-close-button__line global-close-button__line--first" aria-hidden="true"></span>
          <span class="global-close-button__line global-close-button__line--second" aria-hidden="true"></span>
        </button>
      </header>
      <div class="model-source-calibration-workspace__body">
        <section class="model-source-calibration-workspace__result">
          <p class="model-management__section-copy">Loading private Personality Summary.</p>
        </section>
      </div>
    </article>
  `;

  document.body.append(overlay);

  try {
    const latest = readLatestPersonalityCalibrationResult();
    const payload = latest?.result_payload || latest || {};
    const card = overlay.querySelector('.model-source-calibration-workspace__result');

    if (!(card instanceof HTMLElement)) return;

    if (!latest) {
      card.innerHTML = `
        <p class="model-management__section-copy">No Personality Summary has been saved yet.</p>
      `;
      return;
    }

    const summaryMetrics = payload.summary_metrics || latest.summary_metrics || {};
    const metricOrder = [
      'personality_coherence_index',
      'dominant_personality_pattern',
      'self_model_function',
      'social_expression',
      'regulation_pattern',
      'cognitive_style',
      'adaptation_style',
      'reflection_tolerance',
    ];

    const metricMarkup = metricOrder
      .map((metricKey) => {
        const metric = summaryMetrics[metricKey] || PERSONALITY_SUMMARY_METRIC_FALLBACKS[metricKey];
        if (!metric) return '';
        return createPersonalitySummaryMetricMarkup(metricKey, metric, PERSONALITY_SUMMARY_ICON_LINKS[metricKey]);
      })
      .filter(Boolean)
      .join('');

    card.innerHTML = `
      <section class="model-source-summary" aria-label="Personality summary dashboard">
        <p class="model-source-summary__copy">${createReadablePersonalitySummary(payload, latest)}</p>
        <dl class="model-source-summary__metrics">
          ${metricMarkup}
        </dl>
      </section>
    `;
  } catch (error) {
    console.warn('[Neuroartan][Model] Personality summary overlay failed.', error);
  }
}

function scheduleModelVisibilityBackendSave() {
  window.clearTimeout(modelVisibilityBackendSaveTimer);
  modelVisibilityBackendSaveTimer = window.setTimeout(async () => {
    try {
      const model = await getOwnedCanonicalModel();
      if (!model?.id) return;
      const preferences = await saveModelVisibilityPreferences(model.id, modelVisibilityPreferences);
      if (!preferences) return;
      updateModelVisibilityPreferences(preferences, {
        source: 'model-management-backend',
        sync: false
      });
      setModelVisibilityStatus('Model visibility saved.', 'success');
      invalidateModelDirectoryProjection();
    } catch (error) {
      setModelVisibilityStatus('Model visibility could not be saved.', 'error');
      console.warn('[Neuroartan][Model] Visibility preference sync skipped.', error);
    }
  }, 350);
}

function updateModelVisibilityPreferences(nextPatch = {}, options = {}) {
  modelVisibilityPreferences = normalizeModelVisibilityPreferences({
    ...modelVisibilityPreferences,
    ...nextPatch
  });
  writeStoredModelVisibilityPreferences(modelVisibilityPreferences);
  renderAllModelVisibilityControls();

  if (options.sync !== false) {
    setModelVisibilityStatus('Saving visibility...', 'saving');
    scheduleModelVisibilityBackendSave();
  }
}

async function hydrateModelVisibilityFromBackend() {
  if (modelVisibilityBackendLoaded) return;
  modelVisibilityBackendLoaded = true;

  try {
    const model = await getOwnedCanonicalModel();
    if (!model?.id) return;

    const preferences = await readModelVisibilityPreferences(model.id);
    if (!preferences) return;

    updateModelVisibilityPreferences(preferences, {
      source: 'model-management-backend',
      sync: false
    });
  } catch (error) {
    console.warn('[Neuroartan][Model] Visibility preference hydration skipped.', error);
  }
}

function getActiveModelSection(navigationState = getProfileNavigationState()) {
  return MODEL_SECTIONS.has(navigationState.section) ? navigationState.section : 'model-foundation';
}

function getSafeModelManagementNavigationState(runtimeState = getProfileRuntimeState(), navigationState = getProfileNavigationState()) {
  const section = getActiveModelSection(navigationState);
  const modelPane = navigationState.modelPane || 'overview';

  return {
    ...navigationState,
    section,
    modelPane
  };
}

document.addEventListener('model:source-summary-open-request', () => {
  void handleModelSourceSummaryOpenRequest();
});

document.addEventListener('model:personality-summary-open-request', () => {
  void handleModelPersonalitySummaryOpenRequest();
});

document.addEventListener('model:keys-open-request', () => {
  void handleModelKeysOpenRequest();
});

document.addEventListener('model:info-open-request', () => {
  void handleModelInfoOpenRequest();
});

document.addEventListener('click', (event) => {
  const closeButton = event.target.closest('[data-model-source-summary-close]');
  if (!closeButton) return;

  event.preventDefault();
  removeModelSourceSummaryOverlay();
});

document.addEventListener('click', (event) => {
  const closeButton = event.target.closest('[data-model-personality-summary-close]');
  if (!closeButton) return;

  event.preventDefault();
  removeModelPersonalitySummaryOverlay();
});

document.addEventListener('click', (event) => {
  const closeButton = event.target.closest('[data-model-keys-close]');
  if (!closeButton) return;

  event.preventDefault();
  removeModelKeysOverlay();
});

document.addEventListener('click', (event) => {
  const closeButton = event.target.closest('[data-model-info-close]');
  if (!closeButton) return;

  event.preventDefault();
  removeModelInfoOverlay();
});

document.addEventListener('click', (event) => {
  const revealButton = event.target.closest('[data-model-key-reveal]');
  if (!(revealButton instanceof HTMLButtonElement)) return;

  const row = revealButton.closest('.model-source-summary__metric--key');
  const keyBox = row?.querySelector('[data-model-key-value]');
  if (!(keyBox instanceof HTMLElement)) return;

  const revealed = keyBox.dataset.modelKeyRevealed === 'true';
  const nextRevealed = !revealed;
  const value = keyBox.dataset.modelKeyValue || '';
  const preview = keyBox.dataset.modelKeyPreview || 'Not issued';

  keyBox.dataset.modelKeyRevealed = String(nextRevealed);
  keyBox.textContent = nextRevealed ? value : preview;
  revealButton.setAttribute('aria-label', `${nextRevealed ? 'Hide' : 'Show'} model key`);

  const icon = revealButton.querySelector('img');
  if (icon instanceof HTMLImageElement) {
    icon.src = nextRevealed
      ? '/registry/icons/public/assets/core/identity/access/visibility-off.svg'
      : '/registry/icons/public/assets/core/identity/access/visibility-on.svg';
  }
});

document.addEventListener('click', (event) => {
  const copyButton = event.target.closest('[data-model-key-copy]');
  if (!(copyButton instanceof HTMLButtonElement)) return;

  const row = copyButton.closest('.model-source-summary__metric--key');
  const keyBox = row?.querySelector('[data-model-key-value]');
  const value = keyBox instanceof HTMLElement ? keyBox.dataset.modelKeyValue || '' : '';
  if (!value) return;

  void copyTextToClipboard(value).then((copied) => {
    showGlobalCopiedFeedback(copyButton, copied ? 'Copied' : 'Copy failed');
  }).catch(() => {
    showGlobalCopiedFeedback(copyButton, 'Copy failed');
  });
});


document.addEventListener('click', (event) => {
  const summaryLink = event.target.closest('[data-model-source-summary-link]');
  if (!summaryLink) return;

  event.preventDefault();
  document.dispatchEvent(new CustomEvent('model:source-summary-open-request', {
    detail: {
      source: 'model-informative-footer'
    }
  }));
});

document.addEventListener('click', (event) => {
  const summaryLink = event.target.closest('[data-model-personality-summary-link]');
  if (!summaryLink) return;

  event.preventDefault();
  document.dispatchEvent(new CustomEvent('model:personality-summary-open-request', {
    detail: {
      source: 'model-informative-footer'
    }
  }));
});


async function hydrateModelOwnerDataFromBackend(runtimeState = getProfileRuntimeState()) {
  if (modelOwnerHydrationInProgress || modelOwnerHydrationComplete) {
    return;
  }

  modelOwnerHydrationInProgress = true;
  modelManagementRoots().forEach((root) => setModelManagementLoading(root, true));

  try {
    await Promise.allSettled([
      hydrateModelDefaultsFromBackend(),
      hydrateModelFoundationIdentityFromBackend(),
      hydrateModelPersonalizationFromBackend(),
      hydrateModelChangelogFromBackend(),
      hydrateModelVisibilityFromBackend(),
      hydrateTrainingSubstrateFromBackend(),
    ]);
    modelOwnerHydrationComplete = true;
  } finally {
    modelOwnerHydrationInProgress = false;
    renderAllModelManagement();
    modelManagementRoots().forEach((root) => setModelManagementLoading(root, false));
  }
}

function ensureModelManagementLoadingNode(root) {
  if (!(root instanceof HTMLElement)) return null;

  let loading = root.querySelector('[data-model-management-loading]');
  if (loading instanceof HTMLElement) return loading;

  loading = document.createElement('div');
  loading.className = 'model-management__loading ui-loading-inline';
  loading.dataset.modelManagementLoading = 'true';
  loading.setAttribute('role', 'status');
  loading.setAttribute('aria-live', 'polite');
  loading.setAttribute('aria-label', 'Loading model workspace');
  loading.innerHTML = '<span class="ui-loading-inline__spinner" aria-hidden="true"></span>';

  const sections = root.querySelector('.model-management__sections');
  if (sections instanceof HTMLElement) {
    sections.before(loading);
  } else {
    root.append(loading);
  }

  return loading;
}

function setModelManagementLoading(root, loading) {
  const loadingNode = ensureModelManagementLoadingNode(root);
  if (loadingNode instanceof HTMLElement) {
    loadingNode.hidden = !loading;
  }
  const sections = root.querySelector('.model-management__sections');
  if (sections instanceof HTMLElement) {
    sections.hidden = loading;
  }
  root.dataset.modelHydrationState = loading ? 'resolving' : 'ready';
  root.setAttribute('aria-busy', loading ? 'true' : 'false');
}

function getVisibleModelPersonalizationGroup(navigationState = getProfileNavigationState()) {
  return MODEL_PERSONALIZATION_PANE_GROUPS[navigationState.modelPane] || 'cognition';
}

function normalizeModelParameterFilters(filters = {}) {
  return {
    area: String(filters.area || 'personalization').trim() || 'personalization',
    pane: String(filters.pane || 'all').trim() || 'all',
    section: String(filters.section || 'all').trim() || 'all',
    field: String(filters.field || 'all').trim() || 'all'
  };
}

function getEffectiveModelParameterFilters(visibleGroup = 'cognition') {
  const filters = normalizeModelParameterFilters(modelParameterFilters);
  if (filters.area === 'personalization' && filters.pane === 'all') {
    return {
      ...filters,
      pane: visibleGroup
    };
  }
  if (filters.pane !== 'all' && filters.pane !== visibleGroup) {
    return {
      area: 'personalization',
      pane: visibleGroup,
      section: 'all',
      field: 'all'
    };
  }
  return filters;
}

function shouldShowModelPersonalizationField(field = '', visibleGroup = 'cognition') {
  const filters = getEffectiveModelParameterFilters(visibleGroup);
  const metadata = MODEL_PERSONALIZATION_FIELD_AREAS[field];
  if (!metadata) return true;
  if (filters.area !== 'model' && filters.area !== 'personalization') return true;
  if (filters.pane !== 'all' && metadata.pane !== filters.pane) return false;
  if (filters.section !== 'all' && metadata.section !== filters.section) return false;
  if (metadata.section === 'audience-response' && field !== 'responseAudienceScope') {
    const selectedAudiencePrefix = getAudienceResponseScopePrefix(modelResponseAudienceFilter);
    if (selectedAudiencePrefix && !String(field || '').startsWith(selectedAudiencePrefix)) return false;
  }
  if (filters.field !== 'all' && field !== filters.field) return false;
  return true;
}

function normalizeModelPersonalizationSectionKey(value = '') {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function getModelPersonalizationTitleSectionKey(title) {
  if (!(title instanceof HTMLElement)) return 'all';
  const text = normalizeModelPersonalizationSectionKey(title.textContent || '');
  const aliases = {
    'response-style': 'response-style',
    'social-context': 'social-context',
    'audience-specific-response': 'audience-response',
    'autobiographical-continuity': 'autobiographical-continuity',
    'memory-safety': 'memory-safety',
    'action-posture': 'action-posture'
  };
  return aliases[text] || text || 'all';
}

function getAudienceResponseScopePrefix(scope = '') {
  const normalizedScope = String(scope || 'public').trim();
  if (normalizedScope === 'all') return '';
  return {
    public: 'publicResponse',
    friends: 'friendsResponse',
    followers: 'followersResponse',
    mutual: 'mutualResponse',
    mutuals: 'mutualResponse',
    family: 'familyResponse',
    subscribers: 'subscriberResponse'
  }[normalizedScope] || 'publicResponse';
}

function getAudienceResponsePanelKeys(scope = '') {
  const normalizedScope = String(scope || 'public').trim();
  if (normalizedScope === 'all') {
    return new Set(['all', 'public', 'friends', 'followers', 'mutual', 'mutuals', 'family', 'subscribers']);
  }

  const prefixKey = getAudienceResponseScopePrefix(normalizedScope).replace('Response', '').toLowerCase();
  return new Set([normalizedScope, prefixKey]);
}

function getModelPersonalizationFieldShell(node) {
  if (!(node instanceof HTMLElement)) return null;

  const fieldSelector = '[data-model-personalization-field], [data-model-personalization-toggle], [data-model-personalization-label], [data-model-personalization-value]';
  const preferredShellSelector = [
    '.model-management__control-row',
    '.model-management__control-item',
    '.model-management__control-card',
    '.model-management__setting-row',
    '.model-management__setting-item',
    '.model-management__field-row',
    '.model-management__field',
    '.model-management__item',
    'label'
  ].join(', ');

  const preferredShell = node.closest(preferredShellSelector);
  if (preferredShell instanceof HTMLElement && !preferredShell.hasAttribute('data-model-personalization-group')) {
    return preferredShell;
  }

  let current = node.parentElement;
  let lastSingleFieldShell = node.parentElement || node;

  while (current instanceof HTMLElement) {
    if (current.hasAttribute('data-model-personalization-group')) return lastSingleFieldShell;

    const fields = new Set(
      Array.from(current.querySelectorAll(fieldSelector))
        .filter((candidate) => candidate instanceof HTMLElement)
        .map((candidate) => candidate.dataset.modelPersonalizationField
          || candidate.dataset.modelPersonalizationToggle
          || candidate.dataset.modelPersonalizationLabel
          || candidate.dataset.modelPersonalizationValue)
        .filter(Boolean)
    );

    if (fields.size === 1) {
      lastSingleFieldShell = current;
    }

    if (fields.size > 1) {
      return lastSingleFieldShell;
    }

    current = current.parentElement;
  }

  return lastSingleFieldShell;
}

function applyModelParameterFilters(root, visibleGroup = 'cognition') {
  if (!(root instanceof HTMLElement)) return;

  const activeGroup = root.querySelector(`[data-model-personalization-group="${visibleGroup}"]`);
  if (!(activeGroup instanceof HTMLElement)) return;

  const filters = getEffectiveModelParameterFilters(visibleGroup);
  const filterActive = filters.section !== 'all' || filters.field !== 'all';
  const fieldSelector = '[data-model-personalization-field], [data-model-personalization-toggle], [data-model-personalization-label], [data-model-personalization-value]';
  const controls = Array.from(activeGroup.querySelectorAll(fieldSelector))
    .filter((node) => node instanceof HTMLElement);
  const shells = new Set();
  const touchedShells = new Set();

  controls.forEach((control) => {
    const field = control.dataset.modelPersonalizationField || control.dataset.modelPersonalizationToggle || control.dataset.modelPersonalizationLabel || control.dataset.modelPersonalizationValue;
    if (!field) return;

    const shell = getModelPersonalizationFieldShell(control);
    if (!(shell instanceof HTMLElement)) return;

    const visible = !filterActive || shouldShowModelPersonalizationField(field, visibleGroup);
    control.hidden = !visible;
    control.style.display = visible ? '' : 'none';
    control.setAttribute('aria-hidden', visible ? 'false' : 'true');
    shells.add(shell);
    touchedShells.add(shell);
    shell.hidden = !visible;
    shell.style.display = visible ? '' : 'none';
    shell.setAttribute('aria-hidden', visible ? 'false' : 'true');
  });

  touchedShells.forEach((shell) => {
    if (!(shell instanceof HTMLElement)) return;
    const shellControls = Array.from(shell.querySelectorAll(fieldSelector))
      .filter((node) => node instanceof HTMLElement);
    const shellVisible = !filterActive || shellControls.some((control) => {
      const field = control.dataset.modelPersonalizationField || control.dataset.modelPersonalizationToggle || control.dataset.modelPersonalizationLabel || control.dataset.modelPersonalizationValue;
      return field && shouldShowModelPersonalizationField(field, visibleGroup);
    });
    shell.hidden = !shellVisible;
    shell.style.display = shellVisible ? '' : 'none';
    shell.setAttribute('aria-hidden', shellVisible ? 'false' : 'true');
  });

  Array.from(activeGroup.children).forEach((child) => {
    if (!(child instanceof HTMLElement)) return;
    const childControls = Array.from(child.querySelectorAll(fieldSelector))
      .filter((node) => node instanceof HTMLElement);
    if (!childControls.length) return;

    const childVisible = !filterActive || childControls.some((control) => {
      const field = control.dataset.modelPersonalizationField || control.dataset.modelPersonalizationToggle || control.dataset.modelPersonalizationLabel || control.dataset.modelPersonalizationValue;
      return field && shouldShowModelPersonalizationField(field, visibleGroup);
    });

    child.hidden = !childVisible;
    child.style.display = childVisible ? '' : 'none';
    child.setAttribute('aria-hidden', childVisible ? 'false' : 'true');
  });

  if (filters.section !== 'all') {
    activeGroup.querySelectorAll('.model-management__control-title').forEach((title) => {
      if (!(title instanceof HTMLElement)) return;
      const titleSection = getModelPersonalizationTitleSectionKey(title);
      const sectionVisible = titleSection === filters.section;
      title.hidden = !sectionVisible;
      title.style.display = sectionVisible ? '' : 'none';
      title.setAttribute('aria-hidden', sectionVisible ? 'false' : 'true');
    });
  }

  activeGroup.querySelectorAll('.model-management__control-title').forEach((title) => {
    if (!(title instanceof HTMLElement)) return;

    let next = title.nextElementSibling;
    let titleVisible = !filterActive;

    while (next instanceof HTMLElement) {
      if (next.classList.contains('model-management__control-title')) break;
      const sectionControls = Array.from(next.querySelectorAll(fieldSelector))
        .filter((node) => node instanceof HTMLElement);
      if (sectionControls.length) {
        titleVisible = sectionControls.some((control) => {
          const field = control.dataset.modelPersonalizationField || control.dataset.modelPersonalizationToggle || control.dataset.modelPersonalizationLabel || control.dataset.modelPersonalizationValue;
          return field && shouldShowModelPersonalizationField(field, visibleGroup);
        });
        break;
      }
      next = next.nextElementSibling;
    }

    title.hidden = !titleVisible;
    title.style.display = titleVisible ? '' : 'none';
    title.setAttribute('aria-hidden', titleVisible ? 'false' : 'true');
  });
  if (visibleGroup === 'communication') {
    const activeAudiencePanels = getAudienceResponsePanelKeys(modelResponseAudienceFilter);
    activeGroup.querySelectorAll('[data-model-response-audience-panel]').forEach((panel) => {
      if (!(panel instanceof HTMLElement)) return;
      const active = activeAudiencePanels.has(panel.dataset.modelResponseAudiencePanel || '');
      panel.hidden = !active;
      panel.style.display = active ? '' : 'none';
      panel.setAttribute('aria-hidden', active ? 'false' : 'true');
      panel.toggleAttribute('inert', !active);
    });
  }

  activeGroup.dataset.modelParameterFilterActive = filterActive ? 'true' : 'false';
}

function getVisibleModelFoundationGroup(navigationState = getProfileNavigationState()) {
  return MODEL_FOUNDATION_PANE_GROUPS[navigationState.modelPane] || 'overview';
}

function getVisibleModelTrainingGroup(navigationState = getProfileNavigationState()) {
  return MODEL_TRAINING_PANE_GROUPS[navigationState.modelPane] || 'protocol';
}

function getVisibleModelDiscoveryGroup(navigationState = getProfileNavigationState()) {
  return MODEL_DISCOVERY_PANE_GROUPS[navigationState.modelPane] || 'overview';
}

function getVisibleModelSettingsGroup(navigationState = getProfileNavigationState()) {
  const pane = String(navigationState.modelPane || 'preferences').trim();
  return ['preferences', 'provider', 'routing', 'visibility', 'changelog'].includes(pane)
    ? pane
    : 'preferences';
}

function renderModelFoundationGroups(root, navigationState = getProfileNavigationState()) {
  if (!(root instanceof HTMLElement)) return;

  const visibleGroup = getVisibleModelFoundationGroup(navigationState);
  root.querySelectorAll('[data-model-foundation-group]').forEach((group) => {
    if (!(group instanceof HTMLElement)) return;
    group.hidden = group.dataset.modelFoundationGroup !== visibleGroup;
  });

  if (visibleGroup === 'sources') {
    void initializeSourceCalibration(root).then(() => {
      refreshSourceCalibration();
    });
  }

  if (visibleGroup === 'personality') {
    void initializePersonalityCalibration(root).then(() => {
      refreshPersonalityCalibration(root);
    });
  }

  if (visibleGroup === 'overview') {
    void initializeDigitalBrainMaturity(root);
  }

}

function renderModelTrainingGroups(root, navigationState = getProfileNavigationState()) {
  if (!(root instanceof HTMLElement)) return;

  const visibleGroup = getVisibleModelTrainingGroup(navigationState);
  root.querySelectorAll('[data-model-training-group]').forEach((group) => {
    if (!(group instanceof HTMLElement)) return;
    group.hidden = group.dataset.modelTrainingGroup !== visibleGroup;
  });
}

function renderModelDiscoveryGroups(root, navigationState = getProfileNavigationState()) {
  if (!(root instanceof HTMLElement)) return;

  const visibleGroup = getVisibleModelDiscoveryGroup(navigationState);
  root.querySelectorAll('[data-model-discovery-group]').forEach((group) => {
    if (!(group instanceof HTMLElement)) return;
    group.hidden = group.dataset.modelDiscoveryGroup !== visibleGroup;
  });
}

function renderModelSettingsGroups(root, navigationState = getProfileNavigationState()) {
  if (!(root instanceof HTMLElement)) return;

  const visibleGroup = getVisibleModelSettingsGroup(navigationState);
  root.querySelectorAll('[data-model-settings-group]').forEach((group) => {
    if (!(group instanceof HTMLElement)) return;
    group.hidden = group.dataset.modelSettingsGroup !== visibleGroup;
  });
}

function getModelExpertiseTags(model = {}) {
  return Array.isArray(model.tags)
    ? model.tags.map((tag) => String(tag || '').trim()).filter(Boolean)
    : [];
}

function populateDirectoryFilter(select, values, currentValue) {
  if (!(select instanceof HTMLSelectElement)) return;

  const existingValues = new Set(Array.from(select.options).map((option) => option.value));
  values.forEach((value) => {
    if (!value || existingValues.has(value)) return;
    select.add(new Option(value, value));
  });
  select.value = currentValue;
}

function getFilteredPublicModels() {
  return publicModelDirectory.filter((model) => {
    const verificationState = String(model.verification_state || 'unverified').toLowerCase();
    const expertiseTags = getModelExpertiseTags(model);

    if (modelDirectoryFilters.verification !== 'all' && verificationState !== modelDirectoryFilters.verification) return false;
    if (modelDirectoryFilters.expertise !== 'all' && !expertiseTags.includes(modelDirectoryFilters.expertise)) return false;
    return true;
  });
}

function isModelVerified(model = {}) {
  const state = String(model.verification_state || model.trust_label || '').trim().toLowerCase();
  return state === 'verified' || state === 'approved';
}

function createDirectoryCard(model = {}) {
  const article = document.createElement('article');
  article.className = 'model-management__directory-card';

  const avatar = document.createElement('span');
  avatar.className = 'model-management__directory-avatar';
  if (model.public_profile?.public_avatar_url || model.creator?.image) {
    const image = document.createElement('img');
    image.src = model.public_profile?.public_avatar_url || model.creator?.image;
    image.alt = '';
    image.className = 'model-management__directory-avatar-image';
    avatar.append(image);
  }

  const content = document.createElement('span');
  content.className = 'model-management__directory-content';

  const title = document.createElement('strong');
  title.className = 'model-management__directory-title';
  title.textContent = model.display_name || 'Continuity model';

  if (isModelVerified(model)) {
    const verified = document.createElement('img');
    verified.className = 'model-management__directory-verified';
    verified.src = '/registry/icons/public/assets/core/identity/trust/verified.svg';
    verified.alt = 'Verified';
    verified.loading = 'lazy';
    verified.decoding = 'async';
    title.append(verified);
  }

  content.append(title);
  article.append(avatar, content);
  return article;
}

function renderModelDirectory(root) {
  if (!(root instanceof HTMLElement)) return;

  const list = root.querySelector('[data-model-directory-list]');
  const status = root.querySelector('[data-model-directory-status]');
  if (!(list instanceof HTMLElement)) return;

  const expertiseValues = Array.from(new Set(publicModelDirectory.flatMap(getModelExpertiseTags))).sort();
  populateDirectoryFilter(root.querySelector('[data-model-directory-filter="expertise"]'), expertiseValues, modelDirectoryFilters.expertise);
  syncDirectoryFilterLabels(root);

  list.replaceChildren();
  if (!publicModelDirectoryLoaded) {
    if (status instanceof HTMLElement) status.textContent = 'Loading models';
    return;
  }

  const models = getFilteredPublicModels();
  if (status instanceof HTMLElement) {
    status.textContent = models.length === 1 ? '1 model' : `${models.length} models`;
  }

  if (!models.length) {
    const empty = document.createElement('p');
    empty.className = 'model-management__note';
    empty.textContent = 'No models match the selected filters.';
    list.append(empty);
    return;
  }

  list.append(...models.map(createDirectoryCard));
}

function syncDirectoryFilterLabels(root) {
  if (!(root instanceof HTMLElement)) return;

  root.querySelectorAll('[data-model-directory-filter]').forEach((select) => {
    if (!(select instanceof HTMLSelectElement)) return;
    const field = select.dataset.modelDirectoryFilter;
    const label = field ? root.querySelector(`[data-model-directory-filter-label="${field}"]`) : null;
    if (!(label instanceof HTMLElement)) return;
    label.textContent = getSafeSelectOptionText(select);
  });
}

function renderModelDatasetEntries(root) {
  if (!(root instanceof HTMLElement)) return;

  const list = root.querySelector('[data-model-dataset-list]');
  if (!(list instanceof HTMLElement)) return;

  list.replaceChildren();
  if (!modelDatasetEntries.length) {
    const empty = document.createElement('p');
    empty.className = 'model-management__note';
    empty.textContent = 'No datasets added.';
    list.append(empty);
    return;
  }

  modelDatasetEntries.forEach((entry) => {
    const item = document.createElement('article');
    item.className = 'model-management__knowledge-item';

    const title = document.createElement('strong');
    title.className = 'model-management__directory-title';
    title.textContent = entry.title || 'Dataset';

    const detail = document.createElement('p');
    detail.className = 'model-management__note';
    detail.textContent = entry.kind || entry.text || 'dataset';

    const remove = document.createElement('button');
    remove.className = 'model-management__text-button';
    remove.type = 'button';
    remove.dataset.modelDatasetRemove = entry.id;
    remove.textContent = 'Remove';

    item.append(title, detail, remove);
    list.append(item);
  });
}

function renderModelKnowledgeBase(root) {
  if (!(root instanceof HTMLElement)) return;

  const list = root.querySelector('[data-model-knowledge-list]');
  if (!(list instanceof HTMLElement)) return;

  list.replaceChildren();
  if (!modelKnowledgeBaseEntries.length) {
    const empty = document.createElement('p');
    empty.className = 'model-management__note';
    empty.textContent = 'No knowledge notes added.';
    list.append(empty);
    return;
  }

  modelKnowledgeBaseEntries.forEach((entry) => {
    const item = document.createElement('article');
    item.className = 'model-management__knowledge-item';

    const title = document.createElement('strong');
    title.className = 'model-management__directory-title';
    title.textContent = entry.title || 'Knowledge asset';

    const text = document.createElement('p');
    text.className = 'model-management__note';
    text.textContent = entry.text || entry.kind || 'knowledge';

    const remove = document.createElement('button');
    remove.className = 'model-management__text-button';
    remove.type = 'button';
    remove.dataset.modelKnowledgeRemove = entry.id;
    remove.textContent = 'Remove';

    item.append(title, text, remove);
    list.append(item);
  });
}

function renderModelLogicRecords(root) {
  if (!(root instanceof HTMLElement)) return;

  const list = root.querySelector('[data-model-logic-list]');
  if (!(list instanceof HTMLElement)) return;

  list.replaceChildren();
  if (!modelLogicRecords.length) {
    const empty = document.createElement('p');
    empty.className = 'model-management__note';
    empty.textContent = 'No model logics added.';
    list.append(empty);
    return;
  }

  modelLogicRecords.forEach((entry) => {
    const item = document.createElement('article');
    item.className = 'model-management__knowledge-item';

    const title = document.createElement('strong');
    title.className = 'model-management__directory-title';
    title.textContent = entry.title;

    const text = document.createElement('p');
    text.className = 'model-management__note';
    text.textContent = entry.text;

    const remove = document.createElement('button');
    remove.className = 'model-management__text-button';
    remove.type = 'button';
    remove.dataset.modelLogicRemove = entry.id;
    remove.textContent = 'Remove';

    item.append(title, text, remove);
    list.append(item);
  });
}

function normalizeModelDataManagerPane(value = '') {
  const normalizedValue = String(value || '').trim();
  if (normalizedValue === 'source-vault' || normalizedValue === 'sources') return 'source-vault';
  if (normalizedValue === 'knowledge-base') return 'knowledge-base';
  if (normalizedValue === 'logics') return 'logics';
  return 'datasets';
}

function isModelSourceVaultDatasetEntry(entry = {}) {
  const metadata = entry?.metadata && typeof entry.metadata === 'object' ? entry.metadata : {};
  return metadata.intake_owner === 'model_source_vault' || Boolean(metadata.source_vault_package_id);
}

function getModelDataManagerEntries(pane = modelDataManagerPane) {
  const normalizedPane = normalizeModelDataManagerPane(pane);
  if (normalizedPane === 'source-vault') {
    return modelDatasetEntries.filter(isModelSourceVaultDatasetEntry);
  }
  if (normalizedPane === 'knowledge-base') return modelKnowledgeBaseEntries;
  if (normalizedPane === 'logics') return modelLogicRecords;
  return modelDatasetEntries.filter((entry) => !isModelSourceVaultDatasetEntry(entry));
}

function getModelDataManagerCopy(pane = modelDataManagerPane) {
  const normalizedPane = normalizeModelDataManagerPane(pane);
  if (normalizedPane === 'source-vault') {
    return {
      title: 'Source database',
      empty: 'No Source Vault packages recorded.',
      titleLabel: 'Source package',
      bodyLabel: 'Source reference',
      removeAttribute: 'modelDataManagerDatasetRemove',
      saveAttribute: 'modelDataManagerDatasetSave',
    };
  }
  if (normalizedPane === 'knowledge-base') {
    return {
      title: 'Knowledge manager',
      empty: 'No knowledge entries recorded.',
      titleLabel: 'Knowledge title',
      bodyLabel: 'Knowledge content',
      removeAttribute: 'modelDataManagerKnowledgeRemove',
      saveAttribute: 'modelDataManagerKnowledgeSave',
    };
  }
  if (normalizedPane === 'logics') {
    return {
      title: 'Logic manager',
      empty: 'No logic records recorded.',
      titleLabel: 'Logic title',
      bodyLabel: 'Logic body',
      removeAttribute: 'modelDataManagerLogicRemove',
      saveAttribute: 'modelDataManagerLogicSave',
    };
  }
  return {
    title: 'Dataset manager',
    empty: 'No datasets recorded.',
    titleLabel: 'Dataset name',
    bodyLabel: 'Dataset content or reference',
    removeAttribute: 'modelDataManagerDatasetRemove',
    saveAttribute: 'modelDataManagerDatasetSave',
  };
}

function renderModelDataManagerTabs(overlay, pane = modelDataManagerPane) {
  const tabs = overlay.querySelectorAll('[data-model-data-manager-pane]');
  tabs.forEach((tab) => {
    if (!(tab instanceof HTMLButtonElement)) return;
    const isActive = normalizeModelDataManagerPane(tab.dataset.modelDataManagerPane) === normalizeModelDataManagerPane(pane);
    tab.setAttribute('aria-pressed', String(isActive));
    tab.setAttribute('aria-selected', String(isActive));
    tab.tabIndex = isActive ? 0 : -1;
    tab.dataset.active = isActive ? 'true' : 'false';
  });
}

function createModelDataManagerItem(entry = {}, pane = modelDataManagerPane) {
  const copy = getModelDataManagerCopy(pane);
  const item = document.createElement('article');
  item.className = 'model-management__data-manager-item';

  const titleField = document.createElement('label');
  titleField.className = 'model-management__field';
  const titleLabel = document.createElement('span');
  titleLabel.className = 'model-management__field-label';
  titleLabel.textContent = copy.titleLabel;
  const title = document.createElement('input');
  title.className = 'model-management__input';
  title.type = 'text';
  title.value = entry.title || '';
  title.dataset.modelDataManagerTitle = entry.id;
  titleField.append(titleLabel, title);

  const bodyField = document.createElement('label');
  bodyField.className = 'model-management__field';
  const bodyLabel = document.createElement('span');
  bodyLabel.className = 'model-management__field-label';
  bodyLabel.textContent = copy.bodyLabel;
  const body = document.createElement('textarea');
  body.className = 'model-management__input model-management__input--textarea';
  body.value = entry.text || '';
  body.dataset.modelDataManagerBody = entry.id;
  bodyField.append(bodyLabel, body);

  const actions = document.createElement('div');
  actions.className = 'model-management__data-manager-actions';

  const save = document.createElement('button');
  save.className = 'model-management__button';
  save.type = 'button';
  save.dataset[copy.saveAttribute] = entry.id;
  save.textContent = 'Save';

  const remove = document.createElement('button');
  remove.className = 'model-management__text-button';
  remove.type = 'button';
  remove.dataset[copy.removeAttribute] = entry.id;
  remove.textContent = 'Remove';

  actions.append(save, remove);
  item.append(titleField, bodyField, actions);
  return item;
}

function renderModelDataManager(root) {
  if (!(root instanceof HTMLElement)) return;

  const overlay = document.querySelector('[data-model-data-manager]');
  if (!(overlay instanceof HTMLElement)) return;

  overlay.hidden = !modelDataManagerOpen;
  overlay.setAttribute('aria-hidden', String(!modelDataManagerOpen));
  if (!modelDataManagerOpen) return;

  const copy = getModelDataManagerCopy(modelDataManagerPane);
  setText(overlay, '[data-model-data-manager-title]', copy.title);
  renderModelDataManagerTabs(overlay, modelDataManagerPane);

  const list = overlay.querySelector('[data-model-data-manager-list]');
  if (!(list instanceof HTMLElement)) return;
  list.replaceChildren();

  const entries = getModelDataManagerEntries(modelDataManagerPane);
  if (!entries.length) {
    const empty = document.createElement('p');
    empty.className = 'model-management__note';
    empty.textContent = copy.empty;
    list.append(empty);
    return;
  }

  list.append(...entries.map((entry) => createModelDataManagerItem(entry, modelDataManagerPane)));
}

async function hydratePublicModelDirectory() {
  if (publicModelDirectoryLoaded || publicModelDirectoryLoading) return;
  publicModelDirectoryLoading = true;

  try {
    await loadPublicModelRegistry();
    publicModelDirectory = getPublicModels();
  } catch (error) {
    console.warn('[Neuroartan][Model] Public model directory hydration skipped.', error);
    publicModelDirectory = [];
  } finally {
    publicModelDirectoryLoaded = true;
    publicModelDirectoryLoading = false;
    renderAllModelManagement();
  }
}

function invalidateModelDirectoryProjection() {
  publicModelDirectory = [];
  publicModelDirectoryLoaded = false;
  publicModelDirectoryLoading = false;
  void hydratePublicModelDirectory();
}

function renderModelFoundationIdentityControls(root) {
  if (!(root instanceof HTMLElement)) return;

  const identity = normalizeModelFoundationIdentity(modelFoundationIdentity);

  root.querySelectorAll('[data-model-foundation-field]').forEach((control) => {
    if (!(control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement || control instanceof HTMLSelectElement)) return;
    const field = control.dataset.modelFoundationField;
    if (!field) return;
    control.value = String(identity[field] || '');
  });

  setText(root, '[data-model-registry-id]', identity.registryId);
  setText(root, '[data-model-id]', identity.modelId);
  setText(root, '[data-model-private-serial-identity]', identity.privateSerialIdentity);
  setText(root, '[data-model-public-serial-identity]', identity.publicSerialIdentity);
  setText(root, '[data-model-birth-certificate-id]', identity.birthCertificateId);
  setText(root, '[data-model-birth-number]', identity.birthCertificateId);
  setText(root, '[data-model-birth-date]', formatModelIdentityDate(identity.birthDate, 'Birth date pending'));
  setText(root, '[data-model-type]', identity.modelType);
  setText(root, '[data-model-lifecycle-state]', formatModelIdentityState(identity.lifecycleState));
  setText(root, '[data-model-readiness-state]', formatModelIdentityState(identity.readinessState));
  setText(root, '[data-model-verification-state]', formatModelIdentityState(identity.verificationState));
  setText(root, '[data-model-discoverability-state]', formatModelIdentityState(identity.discoverabilityState));
  setText(root, '[data-model-privacy-lock-state]', formatModelIdentityState(identity.privacyLockState));
  setText(root, '[data-model-created-at]', formatModelIdentityDate(identity.createdAt, 'Creation date pending'));
  setText(root, '[data-model-updated-at]', formatModelIdentityDate(identity.updatedAt, 'Update date pending'));
  setText(root, '[data-model-nickname]', identity.modelNickname || 'Not assigned');

  root.querySelectorAll('[data-model-avatar-image]').forEach((avatarImage) => {
    if (!(avatarImage instanceof HTMLImageElement)) return;
    if (identity.modelAvatar) {
      avatarImage.src = identity.modelAvatar;
      avatarImage.hidden = false;
    } else {
      avatarImage.hidden = true;
      avatarImage.removeAttribute('src');
    }
  });
}

function renderAllModelFoundationIdentityControls() {
  modelManagementRoots().forEach((root) => renderModelFoundationIdentityControls(root));
}

function getModelPersonalizationPaneCopy(navigationState = getProfileNavigationState()) {
  if (navigationState.section !== 'model-personalization') {
    return null;
  }

  const personalizationGroup = getVisibleModelPersonalizationGroup(navigationState);

  switch (personalizationGroup) {
    case 'cognition':
      return {
        title: 'Cognition',
        summary: 'Tune how the model reasons, attends, abstracts, reflects, and shifts perspective before it responds.'
      };
    case 'communication':
      return {
        title: 'Communication',
        summary: 'Tune how the model speaks across language, delivery, response structure, social context, and audience-specific relationships.'
      };
    case 'memory':
      return {
        title: 'Memory',
        summary: 'Set retention, recall, autobiographical continuity, and memory safety for owner-controlled model behavior.'
      };
    case 'emotion':
      return {
        title: 'Emotion',
        summary: 'Tune tone, empathy, emotional regulation, mirroring, and affect weighting without turning the model into therapy.'
      };
    case 'behavior':
      return {
        title: 'Behavior',
        summary: 'Tune action posture, restraint, boundaries, and reliability so the model acts consistently within owner-defined limits.'
      };
    default:
      return null;
  }
}

function renderModelPersonalizationControls(root, navigationState = getProfileNavigationState()) {
  if (!(root instanceof HTMLElement)) return;

  const visibleGroup = getVisibleModelPersonalizationGroup(navigationState);
  root.querySelectorAll('[data-model-personalization-group]').forEach((group) => {
    if (!(group instanceof HTMLElement)) return;
    group.hidden = group.dataset.modelPersonalizationGroup !== visibleGroup;
  });

  root.querySelectorAll('[data-model-personalization-field]').forEach((control) => {
    if (!(control instanceof HTMLElement)) return;
    const field = control.dataset.modelPersonalizationField;
    const value = getModelPersonalizationValue(field);

    if (control instanceof HTMLSelectElement) {
      control.value = getSafeModelPersonalizationSelectValue(control, field);
      return;
    }

    if (control instanceof HTMLInputElement) {
      control.value = String(value ?? '');
    }
  });

  root.querySelectorAll('[data-model-personalization-label]').forEach((label) => {
    if (!(label instanceof HTMLElement)) return;
    const field = label.dataset.modelPersonalizationLabel;
    const select = field ? root.querySelector(`[data-model-personalization-field="${field}"]`) : null;
    if (!(select instanceof HTMLSelectElement)) return;
    const safeValue = getSafeModelPersonalizationSelectValue(select, field);
    if (select.value !== safeValue) select.value = safeValue;
    label.textContent = getSafeSelectOptionText(select);
  });

  root.querySelectorAll('[data-model-personalization-field="responseAudienceScope"]').forEach((select) => {
    if (!(select instanceof HTMLSelectElement)) return;
    const optionValues = Array.from(select.options).map((option) => option.value);
    if (!optionValues.includes(modelResponseAudienceFilter)) {
      modelResponseAudienceFilter = optionValues[0] || 'public';
    }
    select.value = modelResponseAudienceFilter;
    const label = root.querySelector('[data-model-personalization-label="responseAudienceScope"]');
    if (label instanceof HTMLElement) label.textContent = getSafeSelectOptionText(select);
  });

  root.querySelectorAll('[data-model-personalization-value]').forEach((valueNode) => {
    if (!(valueNode instanceof HTMLElement)) return;
    const field = valueNode.dataset.modelPersonalizationValue;
    valueNode.textContent = String(getModelPersonalizationValue(field) ?? '');
  });

  root.querySelectorAll('[data-model-personalization-toggle]').forEach((toggle) => {
    if (!(toggle instanceof HTMLButtonElement)) return;
    const field = toggle.dataset.modelPersonalizationToggle;
    if (!field) return;
    const checked = getModelPersonalizationValue(field) === true;
    toggle.setAttribute('aria-checked', checked ? 'true' : 'false');
    toggle.dataset.toggleState = checked ? 'on' : 'off';
    const label = toggle.querySelector('.na-toggle__label');
    if (label instanceof HTMLElement) label.textContent = checked ? 'On' : 'Off';
  });

  const responseAudienceScope = String(modelResponseAudienceFilter || 'public');
  root.querySelectorAll('[data-model-response-audience-panel]').forEach((panel) => {
    if (!(panel instanceof HTMLElement)) return;
    const active = getAudienceResponsePanelKeys(responseAudienceScope).has(panel.dataset.modelResponseAudiencePanel || '');
    panel.hidden = !active;
    panel.setAttribute('aria-hidden', active ? 'false' : 'true');
    panel.toggleAttribute('inert', !active);
    panel.querySelectorAll('input, select, textarea, button').forEach((control) => {
      if (!(control instanceof HTMLInputElement || control instanceof HTMLSelectElement || control instanceof HTMLTextAreaElement || control instanceof HTMLButtonElement)) return;
      control.disabled = !active;
    });
  });

  applyModelParameterFilters(root, visibleGroup);
}

function renderAllModelPersonalizationControls() {
  const navigationState = getProfileNavigationState();
  modelManagementRoots().forEach((root) => renderModelPersonalizationControls(root, navigationState));
}

function renderModelVisibilityControls(root) {
  if (!(root instanceof HTMLElement)) return;

  const preferences = normalizeModelVisibilityPreferences(modelVisibilityPreferences);
  const activeScope = String(preferences.visibilityScope || 'general').trim() || 'general';

  root.querySelectorAll('[data-model-visibility-field]').forEach((control) => {
    if (!(control instanceof HTMLSelectElement)) return;
    const field = control.dataset.modelVisibilityField;
    if (!field) return;
    control.value = String(preferences[field] || MODEL_VISIBILITY_DEFAULTS[field] || '');
  });

  root.querySelectorAll('[data-model-visibility-label]').forEach((label) => {
    if (!(label instanceof HTMLElement)) return;
    const field = label.dataset.modelVisibilityLabel;
    const select = field ? root.querySelector(`[data-model-visibility-field="${field}"]`) : null;
    if (!(select instanceof HTMLSelectElement)) return;
    label.textContent = getSafeSelectOptionText(select);
  });

  root.querySelectorAll('[data-model-visibility-panel]').forEach((panel) => {
    if (!(panel instanceof HTMLElement)) return;
    panel.hidden = panel.dataset.modelVisibilityPanel !== activeScope;
  });

  root.querySelectorAll('[data-model-visibility-toggle]').forEach((toggle) => {
    if (!(toggle instanceof HTMLButtonElement)) return;
    const field = toggle.dataset.modelVisibilityToggle;
    const checked = preferences[field] === true;
    toggle.setAttribute('aria-checked', checked ? 'true' : 'false');
    toggle.dataset.toggleState = checked ? 'on' : 'off';
    const label = toggle.querySelector('.na-toggle__label');
    if (label instanceof HTMLElement) label.textContent = checked ? 'On' : 'Off';
  });

  const stateCopy = root.querySelector('[data-model-visibility-state-copy]');
  if (stateCopy instanceof HTMLElement) {
    stateCopy.textContent = preferences.publicVisible
      ? 'Visible in public model discovery'
      : 'Hidden from public model discovery';
  }
}

function renderAllModelVisibilityControls() {
  modelManagementRoots().forEach(renderModelVisibilityControls);
}

function setModelVisibilityStatus(message = '', state = 'idle') {
  modelManagementRoots().forEach((root) => {
    root.querySelectorAll('[data-model-visibility-status]').forEach((status) => {
      if (!(status instanceof HTMLElement)) return;
      status.setAttribute('data-status-message', '');
      status.textContent = message;
      status.dataset.modelVisibilityStatus = state;
      
      if (message && state !== 'idle') {
        status.dataset.statusMessageActive = 'true';
        handleStatusMessageAutoDismiss();
      } else {
        status.dataset.statusMessageActive = '';
      }
    });
  });
}

function setModelPersonalizationStatus(message = '', state = 'idle') {
  modelManagementRoots().forEach((root) => {
    root.querySelectorAll('[data-model-personalization-status]').forEach((status) => {
      if (!(status instanceof HTMLElement)) return;
      status.setAttribute('data-status-message', '');
      status.textContent = message;
      status.dataset.modelPersonalizationStatus = state;
      
      if (message && state !== 'idle') {
        status.dataset.statusMessageActive = 'true';
        handleStatusMessageAutoDismiss();
      } else {
        status.dataset.statusMessageActive = '';
      }
    });
  });
}

function formatModelPersonalizationError(error) {
  const code = String(error?.code || error?.message || '').trim();
  if (code === '42703') {
    return 'Model personalization schema update required before these controls can save';
  }
  if (code === '42501') {
    return 'Model personalization could not be saved because the Supabase policy blocked this owner';
  }
  if (code === 'MODEL_BACKEND_UNAVAILABLE') {
    return 'Model personalization could not be saved because Supabase is not available';
  }
  if (code === 'MODEL_RECORD_UNAVAILABLE' || code === 'MODEL_ID_REQUIRED') {
    return 'Model personalization could not be saved because the active model record is unavailable';
  }
  return code ? `Model personalization could not be saved: ${code}` : 'Model personalization could not be saved';
}

function renderModelChangelogRecords(root) {
  if (!(root instanceof HTMLElement)) return;

  const lists = root.querySelectorAll('[data-model-changelog-list]');
  if (!lists.length) return;

  lists.forEach((list) => {
    if (!(list instanceof HTMLElement)) return;
    list.replaceChildren();

    if (!modelChangelogRecords.length) {
      const empty = document.createElement('p');
      empty.className = 'model-management__note';
      empty.textContent = 'No model changes recorded';
      list.append(empty);
      return;
    }

    modelChangelogRecords.forEach((entry) => {
      const item = document.createElement('article');
      item.className = 'model-management__knowledge-item';

      const title = document.createElement('strong');
      title.className = 'model-management__directory-title';
      title.textContent = entry.action === 'reset'
        ? `${entry.label} reset to default: ${entry.from} → ${entry.to}`
        : `${entry.label}: ${entry.from} → ${entry.to}`;

      const meta = document.createElement('p');
      meta.className = 'model-management__note';
      meta.textContent = `${entry.scope || 'Model'} · ${formatModelIdentityDate(entry.createdAt, 'Time pending')}`;

      item.append(title, meta);
      list.append(item);
    });
  });
}

function renderAllModelChangelogRecords() {
  modelManagementRoots().forEach(renderModelChangelogRecords);
}

function renderModelManagement(root, runtimeState = getProfileRuntimeState(), navigationState = getProfileNavigationState()) {
  if (!(root instanceof HTMLElement)) return;

  setModelManagementLoading(root, modelOwnerHydrationInProgress && !modelOwnerHydrationComplete);

  const safeNavigationState = getSafeModelManagementNavigationState(runtimeState, navigationState);
  const section = getActiveModelSection(safeNavigationState);
  const sectionCopy = SECTION_LABELS[section] || SECTION_LABELS['model-foundation'];
  const paneCopy = getModelPersonalizationPaneCopy(safeNavigationState)
    || PANE_LABELS[safeNavigationState.modelPane]
    || PANE_LABELS.overview;
  const profile = runtimeState.profile || {};
  const displayName = String(runtimeState.displayName || profile.display_name || '').trim();
  const username = String(runtimeState.username?.normalized || profile.username || '').trim();
  const profileComplete = runtimeState.profileComplete === true || profile.profile_complete === true || runtimeState.completion?.complete === true;

  root.dataset.modelSection = section;
  root.dataset.modelPane = safeNavigationState.modelPane || 'overview';
  if (section === 'model-personalization') {
    root.dataset.modelPersonalizationPane = getVisibleModelPersonalizationGroup(safeNavigationState);
  } else {
    delete root.dataset.modelPersonalizationPane;
  }
  setText(root, '[data-model-owner-name]', displayName || 'Profile owner');
  setText(root, '[data-model-owner-handle]', username ? `@${username}` : '@username');
  setText(root, '[data-model-owner-id]', profile.id || profile.auth_user_id || 'Owner record pending');
  setText(root, '#model-management-title', paneCopy.title || sectionCopy.title);
  setText(root, '[data-model-management-summary]', paneCopy.summary || sectionCopy.summary);
  setText(root, '[data-model-status]', profileComplete ? 'Foundation active' : 'Foundation incomplete');
  setText(root, '[data-model-profile-link]', username ? `Profile linked to @${username}` : 'Profile route pending');
  setText(root, '[data-model-readiness]', profileComplete ? 'Preparing' : 'Blocked by profile foundation');
  setText(root, '[data-model-readiness-state]', profileComplete ? 'Preparing' : 'Not ready');

  root.querySelectorAll('[data-model-management-section]').forEach((panel) => {
    if (!(panel instanceof HTMLElement)) return;
    panel.hidden = panel.dataset.modelManagementSection !== section;
  });

  renderModelFoundationGroups(root, safeNavigationState);
  renderModelTrainingGroups(root, safeNavigationState);
  renderModelDiscoveryGroups(root, safeNavigationState);
  renderModelSettingsGroups(root, safeNavigationState);
  renderModelFoundationIdentityControls(root);
  renderModelPersonalizationControls(root, safeNavigationState);
  renderModelVisibilityControls(root);
  renderModelDatasetEntries(root);
  renderModelKnowledgeBase(root);
  renderModelLogicRecords(root);
  renderModelDataManager(root);
  renderModelDirectory(root);
  renderModelChangelogRecords(root);
}

function handleModelParameterFilterChange(event) {
  const detail = event instanceof CustomEvent ? event.detail || {} : {};
  modelParameterFilters = normalizeModelParameterFilters(detail.filters || {});
  renderAllModelPersonalizationControls();
  renderAllModelManagement();
}

function handleModelFoundationInput(event) {
  const control = event.target?.closest?.('[data-model-foundation-field]');
  if (!(control instanceof HTMLElement)) return;

  const field = control.dataset.modelFoundationField;
  if (!field) return;

  updateModelFoundationIdentity({ [field]: control.value });
}

function handleModelPersonalizationInput(event) {
  const target = event?.target;
  if (target instanceof HTMLSelectElement && target.dataset.modelPersonalizationField === 'responseAudienceScope') {
    modelResponseAudienceFilter = target.value || 'public';
    renderAllModelPersonalizationControls();
    return;
  }
  if (event.type === 'click') {
    const toggle = event.target?.closest?.('[data-model-personalization-toggle]');
    if (!(toggle instanceof HTMLButtonElement)) return;

    const field = toggle.dataset.modelPersonalizationToggle;
    if (!field) return;

    const nextValue = toggle.getAttribute('aria-checked') !== 'true';
    if (getModelPersonalizationValue(field) === nextValue) return;

    updateModelPersonalizationPreferences({ [field]: nextValue });
    return;
  }

  const control = event.target?.closest?.('[data-model-personalization-field]');
  if (!(control instanceof HTMLElement)) return;

  const field = control.dataset.modelPersonalizationField;
  if (!field) return;

  const rawValue = control instanceof HTMLInputElement && control.type === 'range'
    ? Number(control.value)
    : control.value;

  if (getModelPersonalizationValue(field) === rawValue) return;

  updateModelPersonalizationPreferences({ [field]: rawValue });
}

function handleModelVisibilityInput(event) {
  const select = event.target?.closest?.('[data-model-visibility-field]');
  if (event.type === 'change' && select instanceof HTMLSelectElement) {
    const field = select.dataset.modelVisibilityField;
    if (!field) return;
    updateModelVisibilityPreferences({ [field]: select.value });
    return;
  }

  if (event.type !== 'click') return;
  const toggle = event.target?.closest?.('[data-model-visibility-toggle]');
  if (!(toggle instanceof HTMLButtonElement)) return;

  const field = toggle.dataset.modelVisibilityToggle;
  if (!field) return;

  updateModelVisibilityPreferences({
    [field]: toggle.getAttribute('aria-checked') !== 'true'
  });
}

function registerModelAvatarEditor() {
  registerProfileMediaEditorTarget('model', {
    getTitle: () => 'Edit Model Avatar',
    getCurrentImageUrl: () => modelFoundationIdentity.modelAvatar || '',
    save: async ({ file }) => {
      const model = await saveOwnedCanonicalModelAvatar(file);
      updateModelFoundationIdentity({
        modelAvatar:model?.model_image_url || ''
      }, {
        source:'model-avatar-editor',
        sync:false
      });
    },
    reset: async () => {
      await resetOwnedCanonicalModelAvatar();
      updateModelFoundationIdentity({
        modelAvatar:''
      }, {
        source:'model-avatar-editor',
        sync:false
      });
    }
  });
}

function handleModelAvatarClick(event) {
  const trigger = event.target?.closest?.('[data-model-avatar-edit]');
  if (!(trigger instanceof HTMLElement)) return;

  document.dispatchEvent(new CustomEvent('profile:media-editor-open-request', {
    detail:{
      source:'model-management',
      target:'model',
      kind:'avatar'
    }
  }));
}

function setModelIdentityEditorOpen(open) {
  const editor = document.querySelector('[data-model-identity-editor]');
  if (!(editor instanceof HTMLElement)) return;

  editor.hidden = !open;
  editor.setAttribute('aria-hidden', open ? 'false' : 'true');
  document.body?.classList.toggle('model-management-identity-editor-open', open);
  if (!open) {
    setModelIdentityEditorStatus('', 'idle');
  }

  if (!open) return;

  const identity = normalizeModelFoundationIdentity(modelFoundationIdentity);
  editor.querySelectorAll('[data-model-identity-editor-field]').forEach((control) => {
    if (!(control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement)) return;
    const field = control.dataset.modelIdentityEditorField;
    if (!field) return;
    control.value = String(identity[field] || '');
  });

  const nickname = editor.querySelector('[data-model-identity-editor-field="modelNickname"]');
  if (nickname instanceof HTMLInputElement) nickname.focus();
}

function setModelIdentityEditorStatus(message = '', state = 'idle') {
  const editor = document.querySelector('[data-model-identity-editor]');
  if (!(editor instanceof HTMLElement)) return;

  const status = editor.querySelector('[data-model-identity-editor-status]');
  if (status instanceof HTMLElement) {
    status.setAttribute('data-status-message', '');
    status.textContent = message;
    status.dataset.modelIdentityEditorState = state;
    
    if (message && state !== 'idle') {
      status.dataset.statusMessageActive = 'true';
      handleStatusMessageAutoDismiss();
    } else {
      status.dataset.statusMessageActive = '';
    }
  }
}

function setModelIdentityEditorSaving(saving) {
  const editor = document.querySelector('[data-model-identity-editor]');
  if (!(editor instanceof HTMLElement)) return;

  editor.querySelectorAll('button, input, textarea').forEach((control) => {
    if (!(control instanceof HTMLButtonElement || control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement)) return;
    if (control.matches('[data-model-identity-editor-close]')) {
      control.disabled = saving === true;
      return;
    }
    control.disabled = saving === true;
  });
}

function formatModelIdentitySaveError(error) {
  const message = String(error?.message || error?.details || error?.code || '').trim();
  if (!message) {
    return 'Model identity could not be saved. Check the model identity Supabase tables and policies.';
  }

  return `Model identity could not be saved: ${message}`;
}


function handleModelIdentityEditorRequest() {
  const editor = document.querySelector('[data-model-identity-editor]');
  if (!(editor instanceof HTMLElement)) return;

  document.body.appendChild(editor);
  setModelIdentityEditorOpen(true);
}

function handleModelIdentityEditorClick(event) {
  const closeTrigger = event.target?.closest?.('[data-model-identity-editor-close]');
  if (!closeTrigger) return;
  setModelIdentityEditorOpen(false);
}

async function handleModelIdentityEditorSubmit(event) {
  const form = event.target?.closest?.('[data-model-identity-editor-form]');
  if (!(form instanceof HTMLFormElement)) return;

  event.preventDefault();
  setModelIdentityEditorSaving(true);
  setModelIdentityEditorStatus('Saving model identity...', 'saving');
  const nickname = form.querySelector('[data-model-identity-editor-field="modelNickname"]');
  const purposeDescription = form.querySelector('[data-model-identity-editor-field="modelPurposeDescription"]');
  const privateNotes = form.querySelector('[data-model-identity-editor-field="privateNotes"]');
  const nextIdentity = {
    modelNickname: nickname instanceof HTMLInputElement ? nickname.value.trim() : '',
    modelPurposeDescription: purposeDescription instanceof HTMLTextAreaElement ? purposeDescription.value.trim() : '',
    privateNotes: privateNotes instanceof HTMLTextAreaElement ? privateNotes.value.trim() : ''
  };

  updateModelFoundationIdentity(nextIdentity, {
    source: 'model-identity-editor',
    sync: false
  });

  try {
    const model = await ensureOwnedCanonicalModel();
    if (!model?.id) {
      throw new Error('CANONICAL_MODEL_REQUIRED');
    }

    const savedIdentity = await saveModelFoundationIdentity(model.id, {
      ...modelFoundationIdentity,
      ...nextIdentity
    });

    if (!savedIdentity) {
      throw new Error('MODEL_IDENTITY_SAVE_UNCONFIRMED');
    }

    updateModelFoundationIdentity(savedIdentity, {
      source: 'model-identity-editor',
      sync: false
    });
    modelFoundationIdentityBackendLoaded = true;
    setModelIdentityEditorStatus('Model identity saved.', 'success');
  } catch (error) {
    console.warn('[Neuroartan][Model] Foundation identity save failed.', error);
    setModelIdentityEditorStatus(formatModelIdentitySaveError(error), 'error');
  } finally {
    setModelIdentityEditorSaving(false);
  }
}

function handleModelIdentityEditorKeydown(event) {
  if (event.key !== 'Escape') return;
  if (!document.querySelector('[data-model-identity-editor]:not([hidden])')) return;
  setModelIdentityEditorOpen(false);
}

function handleModelDirectoryFilter(event) {
  const control = event.target?.closest?.('[data-model-directory-filter]');
  if (!(control instanceof HTMLInputElement || control instanceof HTMLSelectElement)) return;

  const field = control.dataset.modelDirectoryFilter;
  if (!field || !(field in modelDirectoryFilters)) return;

  modelDirectoryFilters[field] = String(control.value || '').trim();
  renderAllModelManagement();
}

function handleModelDirectorySearchOpen(event) {
  const trigger = event.target?.closest?.('[data-model-directory-search-open]');
  if (!(trigger instanceof HTMLElement)) return;

  document.dispatchEvent(new CustomEvent('neuroartan:home-model-selector-open-requested', {
    detail:{ source:'model-directory' }
  }));
}

function handleModelTrainingInlineDropdownChange(event) {
  const select = event.target?.closest?.('[data-model-dataset-kind], [data-model-knowledge-category]');
  if (!(select instanceof HTMLSelectElement)) return;

  const dropdown = select.closest('.ui-inline-dropdown');
  const label = dropdown?.querySelector?.('.ui-inline-dropdown__value');
  if (!(label instanceof HTMLElement)) return;

  label.textContent = getSafeSelectOptionText(select);
}

async function handleModelDatasetSubmit(event) {
  const form = event.target?.closest?.('[data-model-dataset-form]');
  if (!(form instanceof HTMLFormElement)) return;

  event.preventDefault();
  const title = form.querySelector('[data-model-dataset-title]');
  const kind = form.querySelector('[data-model-dataset-kind]');
  const content = form.querySelector('[data-model-dataset-content]');
  const file = form.querySelector('[data-model-dataset-file]');
  if (!(title instanceof HTMLInputElement) || !(kind instanceof HTMLSelectElement) || !(content instanceof HTMLTextAreaElement)) return;

  const datasetTitle = String(title.value || '').trim();
  const datasetContent = String(content.value || '').trim();
  const datasetFile = file instanceof HTMLInputElement ? file.files?.[0] : null;
  if (!datasetTitle || (!datasetContent && !datasetFile)) return;

  try {
    const entry = await createModelDatasetEntry({
      sourceTitle: datasetTitle,
      sourceKind: kind.value,
      sourceContent: datasetContent,
      file: datasetFile
    });
    modelDatasetEntries = [
      normalizeTrainingSourceEntry(entry, 'Dataset'),
      ...modelDatasetEntries
    ];
    writeStoredModelDatasetEntries();
    form.reset();
    setTrainingSubstrateStatus('Dataset saved to Supabase.', 'saved');
    renderAllModelManagement();
    await refreshDigitalBrainMaturity(document);
  } catch (error) {
    setTrainingSubstrateStatus(formatTrainingSubstrateError(error), 'error');
  }
}

async function handleModelDatasetRemove(event) {
  const trigger = event.target?.closest?.('[data-model-dataset-remove]');
  if (!(trigger instanceof HTMLElement)) return;

  const entryId = trigger.dataset.modelDatasetRemove;
  try {
    await removeModelDatasetEntry(entryId);
    modelDatasetEntries = modelDatasetEntries.filter((entry) => entry.id !== entryId);
    writeStoredModelDatasetEntries();
    renderAllModelManagement();
    await refreshDigitalBrainMaturity(document);
  } catch (error) {
    setTrainingSubstrateStatus(formatTrainingSubstrateError(error), 'error');
  }
}

async function handleModelKnowledgeSubmit(event) {
  const form = event.target?.closest?.('[data-model-knowledge-form]');
  if (!(form instanceof HTMLFormElement)) return;

  event.preventDefault();
  const title = form.querySelector('[data-model-knowledge-title]');
  const category = form.querySelector('[data-model-knowledge-category]');
  const input = form.querySelector('[data-model-knowledge-input]');
  const file = form.querySelector('[data-model-knowledge-file]');
  if (!(input instanceof HTMLTextAreaElement)) return;

  const text = String(input.value || '').trim();
  const knowledgeTitle = title instanceof HTMLInputElement ? title.value.trim() : '';
  const knowledgeCategory = category instanceof HTMLSelectElement ? category.value : 'general';
  const knowledgeFile = file instanceof HTMLInputElement ? file.files?.[0] : null;
  if (!text && !knowledgeFile) return;

  try {
    const entry = await createModelKnowledgeEntry({
      sourceTitle: knowledgeTitle,
      sourceContent: text,
      knowledgeCategory,
      file: knowledgeFile
    });
    modelKnowledgeBaseEntries = [
      normalizeTrainingSourceEntry(entry, 'Knowledge asset'),
      ...modelKnowledgeBaseEntries
    ];
    writeStoredModelKnowledgeBaseEntries();
    form.reset();
    setTrainingSubstrateStatus('Knowledge saved to Supabase.', 'saved');
    renderAllModelManagement();
    await refreshDigitalBrainMaturity(document);
  } catch (error) {
    setTrainingSubstrateStatus(formatTrainingSubstrateError(error), 'error');
  }
}

async function handleModelKnowledgeRemove(event) {
  const trigger = event.target?.closest?.('[data-model-knowledge-remove]');
  if (!(trigger instanceof HTMLElement)) return;

  const entryId = trigger.dataset.modelKnowledgeRemove;
  try {
    await removeModelKnowledgeEntry(entryId);
    modelKnowledgeBaseEntries = modelKnowledgeBaseEntries.filter((entry) => entry.id !== entryId);
    writeStoredModelKnowledgeBaseEntries();
    renderAllModelManagement();
    await refreshDigitalBrainMaturity(document);
  } catch (error) {
    setTrainingSubstrateStatus(formatTrainingSubstrateError(error), 'error');
  }
}

async function handleModelLogicPromptGenerate(event) {
  const trigger = event.target?.closest?.('[data-model-logic-prompt-generate]');
  if (!(trigger instanceof HTMLElement)) return;

  const form = trigger.closest('[data-model-logic-form]');
  if (!(form instanceof HTMLFormElement)) return;

  const question = form.querySelector('[data-model-logic-question]');
  const title = form.querySelector('[data-model-logic-title]');
  if (!(question instanceof HTMLTextAreaElement)) return;

  const prompt = pickModelLogicQuestion(await readModelLogicQuestionRegistry());
  question.value = prompt.question;
  if (title instanceof HTMLInputElement && !title.value.trim()) {
    title.value = prompt.category;
  }
  question.focus();
}

async function handleModelLogicSubmit(event) {
  const form = event.target?.closest?.('[data-model-logic-form]');
  if (!(form instanceof HTMLFormElement)) return;
  event.preventDefault();

  const title = form.querySelector('[data-model-logic-title]');
  const question = form.querySelector('[data-model-logic-question]');
  const input = form.querySelector('[data-model-logic-input]');
  if (!(title instanceof HTMLInputElement) || !(question instanceof HTMLTextAreaElement) || !(input instanceof HTMLTextAreaElement)) return;
  if (!title.value.trim() || !question.value.trim() || !input.value.trim()) return;

  const logicBody = `Question: ${question.value.trim()}\nAnswer: ${input.value.trim()}`;

  try {
    const entry = await createModelLogicRecord({
      logicTitle: title.value,
      logicBody
    });
    modelLogicRecords = [
      normalizeLogicRecordEntry(entry),
      ...modelLogicRecords
    ];
    writeStoredModelLogicRecords();
    form.reset();
    setTrainingSubstrateStatus('Model logic saved to Supabase.', 'saved');
    renderAllModelManagement();
    await refreshDigitalBrainMaturity(document);
  } catch (error) {
    setTrainingSubstrateStatus(formatTrainingSubstrateError(error), 'error');
  }
}

async function handleModelLogicRemove(event) {
  const trigger = event.target?.closest?.('[data-model-logic-remove]');
  if (!(trigger instanceof HTMLElement)) return;

  const entryId = trigger.dataset.modelLogicRemove;
  try {
    await removeModelLogicRecord(entryId);
    modelLogicRecords = modelLogicRecords.filter((entry) => entry.id !== entryId);
    writeStoredModelLogicRecords();
    renderAllModelManagement();
    await refreshDigitalBrainMaturity(document);
  } catch (error) {
    setTrainingSubstrateStatus(formatTrainingSubstrateError(error), 'error');
  }
}

function setModelDataManagerStatus(message = '', state = 'idle') {
  modelManagementRoots().forEach((root) => {
    const status = root.querySelector('[data-model-data-manager-status]');
    if (!(status instanceof HTMLElement)) return;
    status.textContent = message;
    status.dataset.modelDataManagerStatus = state;
  });
}

function setModelDataManagerOpen(open, pane = modelDataManagerPane, options = {}) {
  modelDataManagerOpen = open === true;
  modelDataManagerPane = normalizeModelDataManagerPane(pane);

  if (options.persist !== false) {
    updateModelInterfaceState('modelDataManagerOpen', modelDataManagerOpen);
    updateModelInterfaceState('modelDataManagerPane', modelDataManagerPane);
  }

  if (!modelDataManagerOpen) setModelDataManagerStatus('', 'idle');

  if (options.render !== false) {
    renderAllModelManagement();
  }
}

function applyModelIdentityEditorInterfaceState(open) {
  const shouldOpen = open === true;

  modelManagementRoots().forEach((root) => {
    const editor = root.querySelector('[data-model-identity-editor]');
    if (!(editor instanceof HTMLElement)) return;
    editor.hidden = !shouldOpen;
    editor.setAttribute('aria-hidden', shouldOpen ? 'false' : 'true');
  });
}

function restoreModelManagementInterfaceState() {
  const interfaceState = readModelInterfaceState();
  modelDataManagerOpen = interfaceState.modelDataManagerOpen === true;
  modelDataManagerPane = normalizeModelDataManagerPane(interfaceState.modelDataManagerPane || modelDataManagerPane);

  window.requestAnimationFrame(() => {
    applyModelIdentityEditorInterfaceState(interfaceState.modelIdentityEditorOpen);
    renderAllModelManagement();
  });
}

function handleModelDataManagerOpenRequest(event) {
  const detail = event instanceof CustomEvent ? event.detail || {} : {};
  const pane = normalizeModelDataManagerPane(detail.filters?.pane || detail.filters?.managerPane || getProfileNavigationState().modelPane);
  const overlay = document.querySelector('[data-model-data-manager]');
  if (!(overlay instanceof HTMLElement)) return;
  document.body.appendChild(overlay);
  setModelDataManagerOpen(true, pane);
}

function handleModelDataManagerClick(event) {
  const close = event.target?.closest?.('[data-model-data-manager-close]');
  if (close instanceof HTMLElement) {
    setModelDataManagerOpen(false);
    return;
  }

  const pane = event.target?.closest?.('[data-model-data-manager-pane]');
  if (pane instanceof HTMLElement) {
    modelDataManagerPane = normalizeModelDataManagerPane(pane.dataset.modelDataManagerPane);
    renderAllModelManagement();
  }
}

function findModelDataManagerField(root, selector, entryId) {
  if (!(root instanceof HTMLElement) || !entryId) return null;
  const field = root.querySelector(`${selector}="${CSS.escape(entryId)}"]`);
  return field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement ? field : null;
}

function getModelDataManagerPayload(trigger) {
  const root = trigger?.closest?.('[data-model-data-manager]');
  const entryId = String(
    trigger?.dataset?.modelDataManagerDatasetSave
    || trigger?.dataset?.modelDataManagerKnowledgeSave
    || trigger?.dataset?.modelDataManagerLogicSave
    || ''
  ).trim();
  const title = findModelDataManagerField(root, '[data-model-data-manager-title]', entryId);
  const body = findModelDataManagerField(root, '[data-model-data-manager-body]', entryId);
  return {
    entryId,
    title: title?.value?.trim?.() || '',
    text: body?.value?.trim?.() || '',
  };
}

async function handleModelDataManagerSave(event) {
  const trigger = event.target?.closest?.('[data-model-data-manager-dataset-save], [data-model-data-manager-knowledge-save], [data-model-data-manager-logic-save]');
  if (!(trigger instanceof HTMLElement)) return;

  const payload = getModelDataManagerPayload(trigger);
  if (!payload.entryId || !payload.title) return;

  try {
    if (trigger.dataset.modelDataManagerDatasetSave) {
      const entry = await updateModelDatasetEntry(payload.entryId, payload);
      modelDatasetEntries = modelDatasetEntries.map((item) => item.id === payload.entryId ? normalizeTrainingSourceEntry(entry, 'Dataset') : item);
      writeStoredModelDatasetEntries();
      setModelDataManagerStatus('Dataset updated.', 'saved');
    } else if (trigger.dataset.modelDataManagerKnowledgeSave) {
      const entry = await updateModelKnowledgeEntry(payload.entryId, payload);
      modelKnowledgeBaseEntries = modelKnowledgeBaseEntries.map((item) => item.id === payload.entryId ? normalizeTrainingSourceEntry(entry, 'Knowledge asset') : item);
      writeStoredModelKnowledgeBaseEntries();
      setModelDataManagerStatus('Knowledge updated.', 'saved');
    } else {
      const entry = await updateModelLogicRecord(payload.entryId, {
        logicTitle: payload.title,
        logicBody: payload.text
      });
      modelLogicRecords = modelLogicRecords.map((item) => item.id === payload.entryId ? normalizeLogicRecordEntry(entry) : item);
      writeStoredModelLogicRecords();
      setModelDataManagerStatus('Logic updated.', 'saved');
    }
    renderAllModelManagement();
    await refreshDigitalBrainMaturity(document);
  } catch (error) {
    setModelDataManagerStatus(formatTrainingSubstrateError(error), 'error');
  }
}

async function handleModelDataManagerRemove(event) {
  const trigger = event.target?.closest?.('[data-model-data-manager-dataset-remove], [data-model-data-manager-knowledge-remove], [data-model-data-manager-logic-remove]');
  if (!(trigger instanceof HTMLElement)) return;

  const entryId = String(
    trigger.dataset.modelDataManagerDatasetRemove
    || trigger.dataset.modelDataManagerKnowledgeRemove
    || trigger.dataset.modelDataManagerLogicRemove
    || ''
  ).trim();
  if (!entryId) return;

  try {
    if (trigger.dataset.modelDataManagerDatasetRemove) {
      const entry = modelDatasetEntries.find((item) => item.id === entryId);
      if (isModelSourceVaultDatasetEntry(entry)) {
        await removeModelSourceVaultPackageEntry(entryId);
        setModelDataManagerStatus('Source package removed from Supabase.', 'saved');
      } else {
        await removeModelDatasetEntry(entryId);
        setModelDataManagerStatus('Dataset removed.', 'saved');
      }
      modelDatasetEntries = modelDatasetEntries.filter((entry) => entry.id !== entryId);
      writeStoredModelDatasetEntries();
    } else if (trigger.dataset.modelDataManagerKnowledgeRemove) {
      await removeModelKnowledgeEntry(entryId);
      modelKnowledgeBaseEntries = modelKnowledgeBaseEntries.filter((entry) => entry.id !== entryId);
      writeStoredModelKnowledgeBaseEntries();
      setModelDataManagerStatus('Knowledge removed.', 'saved');
    } else {
      await removeModelLogicRecord(entryId);
      modelLogicRecords = modelLogicRecords.filter((entry) => entry.id !== entryId);
      writeStoredModelLogicRecords();
      setModelDataManagerStatus('Logic removed.', 'saved');
    }
    renderAllModelManagement();
    await refreshDigitalBrainMaturity(document);
  } catch (error) {
    setModelDataManagerStatus(formatTrainingSubstrateError(error), 'error');
  }
}

function handleModelDataManagerKeydown(event) {
  if (event.key !== 'Escape' || !modelDataManagerOpen) return;
  setModelDataManagerOpen(false);
}

function renderAllModelManagement() {
  const runtimeState = getProfileRuntimeState();
  const navigationState = getProfileNavigationState();
  modelManagementRoots().forEach((root) => renderModelManagement(root, runtimeState, navigationState));
  mountAllModelSourceVaultFragments();
}

function handleModelSliderInteractionStart(event) {
  const slider = event.target?.closest?.('.model-management__slider');
  if (!(slider instanceof HTMLInputElement)) return;

  const sliderRow = slider.closest?.('.model-management__slider-row');
  if (!(sliderRow instanceof HTMLElement)) return;

  const sliderValue = sliderRow.querySelector?.('.model-management__slider-value');
  if (!(sliderValue instanceof HTMLElement)) return;

  sliderValue.dataset.sliderValueState = 'centered';
  sliderValue.dataset.sliderValueActive = 'true';
  
  document.body.style.setProperty('--viewport-dim-opacity', 'var(--viewport-dimmed-opacity)');
  document.body.style.setProperty('--viewport-dim-filter', 'var(--viewport-dimmed-filter)');
}

function handleModelSliderInteractionEnd(event) {
  const slider = event.target?.closest?.('.model-management__slider');
  if (!(slider instanceof HTMLInputElement)) return;

  const sliderRow = slider.closest?.('.model-management__slider-row');
  if (!(sliderRow instanceof HTMLElement)) return;

  const sliderValue = sliderRow.querySelector?.('.model-management__slider-value');
  if (!(sliderValue instanceof HTMLElement)) return;

  sliderValue.dataset.sliderValueState = '';
  sliderValue.dataset.sliderValueActive = '';
  
  document.body.style.setProperty('--viewport-dim-opacity', 'var(--viewport-dim-opacity)');
  document.body.style.setProperty('--viewport-dim-filter', 'var(--viewport-dim-filter)');
}

function handleModelSliderInput(event) {
  const slider = event.target?.closest?.('.model-management__slider');
  if (!(slider instanceof HTMLInputElement)) return;

  const sliderRow = slider.closest?.('.model-management__slider-row');
  if (!(sliderRow instanceof HTMLElement)) return;

  const sliderValue = sliderRow.querySelector?.('.model-management__slider-value');
  if (!(sliderValue instanceof HTMLElement)) return;

  sliderValue.textContent = slider.value;
}

function handleModelSliderGlobalMouseUp(event) {
  document.querySelectorAll('.model-management__slider-value[data-slider-value-state="centered"]').forEach((sliderValue) => {
    if (!(sliderValue instanceof HTMLElement)) return;
    sliderValue.dataset.sliderValueState = '';
    sliderValue.dataset.sliderValueActive = '';
  });
  
  document.body.style.setProperty('--viewport-dim-opacity', 'var(--viewport-dim-opacity)');
  document.body.style.setProperty('--viewport-dim-filter', 'var(--viewport-dim-filter)');
}

function handleStatusMessageAutoDismiss() {
  const autoDismissDuration = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--status-message-auto-dismiss-duration')) || 3000;
  
  document.querySelectorAll('.model-management__note[data-status-message-active="true"]').forEach((note) => {
    if (!(note instanceof HTMLElement)) return;
    if (!note.textContent.trim()) {
      note.dataset.statusMessageActive = '';
      return;
    }
    
    window.setTimeout(() => {
      note.dataset.statusMessageActive = '';
    }, autoDismissDuration);
  });
}

function initModelManagement() {
  registerModelAvatarEditor();
  renderAllModelManagement();
  void hydratePublicModelDirectory();
  hydrateModelOwnerDataFromBackend();
  subscribeProfileRuntime((runtimeState) => {
    renderAllModelManagement();
    hydrateModelOwnerDataFromBackend(runtimeState);
  });
  subscribeProfileNavigation(renderAllModelManagement);
  document.addEventListener('input', handleModelPersonalizationInput);
  document.addEventListener('change', handleModelPersonalizationInput);
  document.addEventListener('click', handleModelPersonalizationInput);
  document.addEventListener('change', handleModelVisibilityInput);
  document.addEventListener('click', handleModelVisibilityInput);
  document.addEventListener('input', handleModelFoundationInput);
  document.addEventListener('change', handleModelFoundationInput);
  document.addEventListener('click', handleModelAvatarClick);
  document.addEventListener('input', handleModelDirectoryFilter);
  document.addEventListener('change', handleModelDirectoryFilter);
  document.addEventListener('click', handleModelDirectorySearchOpen);
  document.addEventListener('change', handleModelTrainingInlineDropdownChange);
  document.addEventListener('submit', handleModelDatasetSubmit);
  document.addEventListener('click', handleModelDatasetRemove);
  document.addEventListener('submit', handleModelKnowledgeSubmit);
  document.addEventListener('click', handleModelKnowledgeRemove);
  document.addEventListener('click', handleModelLogicPromptGenerate);
  document.addEventListener('submit', handleModelLogicSubmit);
  document.addEventListener('click', handleModelLogicRemove);
  document.addEventListener('model-source-vault:package-saved', handleModelSourceVaultPackageSaved);
  document.addEventListener('model-source-vault:confirmed', handleModelSourceVaultConfirmed);
  document.addEventListener('model:data-manager-open-request', handleModelDataManagerOpenRequest);
  document.addEventListener('click', handleModelDataManagerClick);
  document.addEventListener('click', handleModelDataManagerSave);
  document.addEventListener('click', handleModelDataManagerRemove);
  document.addEventListener('keydown', handleModelDataManagerKeydown);
  document.addEventListener('model:identity-editor-open-request', handleModelIdentityEditorRequest);
  document.addEventListener('model:reset-request', handleModelResetRequest);
  document.addEventListener('model:parameter-filter-change', handleModelParameterFilterChange);
  document.addEventListener('model:changelog-hydration-request', (event) => {
    const detail = event instanceof CustomEvent ? event.detail || {} : {};
    void hydrateModelChangelogFromBackend({
      force: true,
      source: detail.source || 'profile-filter-overlay'
    });
  });
  document.addEventListener('click', handleModelIdentityEditorClick);
  document.addEventListener('submit', handleModelIdentityEditorSubmit);
  document.addEventListener('keydown', handleModelIdentityEditorKeydown);
  document.addEventListener('mousedown', handleModelSliderInteractionStart);
  document.addEventListener('touchstart', handleModelSliderInteractionStart);
  document.addEventListener('mouseup', handleModelSliderInteractionEnd);
  document.addEventListener('touchend', handleModelSliderInteractionEnd);
  document.addEventListener('mouseup', handleModelSliderGlobalMouseUp);
  document.addEventListener('touchend', handleModelSliderGlobalMouseUp);
  document.addEventListener('input', handleModelSliderInput);
  window.addEventListener('neuroartan:model-public-registry-invalidated', invalidateModelDirectoryProjection);
  window.addEventListener('neuroartan:supabase-ready', () => {
    invalidateModelDirectoryProjection();
    retryModelFoundationIdentityHydration();
    hydrateModelOwnerDataFromBackend();
  });
  document.addEventListener('account:profile-state-changed', () => {
    retryModelFoundationIdentityHydration();
    hydrateModelOwnerDataFromBackend();
  });
  document.addEventListener('account:profile-refresh-request', () => {
    retryModelFoundationIdentityHydration();
    hydrateModelOwnerDataFromBackend();
  });

  document.addEventListener('fragment:mounted', (event) => {
    if (event?.detail?.name !== 'model-management') return;
    restoreModelManagementInterfaceState();
    renderAllModelManagement();
  });
}

initModelManagement();
