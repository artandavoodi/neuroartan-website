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
import { refreshAccountProfileState } from '../../system/account/profile/account-profile-state.js';
import { getPublicModels, loadPublicModelRegistry } from '../../system/model/public-model-registry.js';
import {
  createModelKnowledgeEntry,
  createModelLogicRecord,
  listModelKnowledgeEntries,
  listModelLogicRecords,
  removeModelKnowledgeEntry,
  removeModelLogicRecord
} from '../../system/model/model-training-store.js';
import { registerProfileMediaEditorTarget } from '../../profile/private/media/profile-media-editor.js';
import {
  constrainModelNavigationForViewer,
  isPublicModelNavigation
} from '../navigation/model-tab-registry.js';

const MODEL_PERSONALIZATION_STORAGE_KEY = 'neuroartan.model.personalization.preferences';
const MODEL_CHANGELOG_STORAGE_KEY = 'neuroartan.model.changelog.records';
const MODEL_FOUNDATION_IDENTITY_STORAGE_KEY = 'neuroartan.model.foundation.identity';
const MODEL_VISIBILITY_PREFERENCES_STORAGE_KEY = 'neuroartan.model.visibility.preferences';
const MODEL_KNOWLEDGE_BASE_STORAGE_KEY = 'neuroartan.model.training.knowledge-base';
const MODEL_LOGIC_RECORDS_STORAGE_KEY = 'neuroartan.model.training.logics';

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
let modelKnowledgeBaseEntries = loadStoredModelKnowledgeBaseEntries();
let modelLogicRecords = loadStoredModelLogicRecords();
let modelTrainingSubstrateBackendLoaded = false;
let modelAuthResolutionTimer = 0;
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

function normalizeModelPersonalizationPreferences(value = {}) {
  return {
    ...MODEL_PERSONALIZATION_DEFAULTS,
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

  const defaultValue = String(MODEL_PERSONALIZATION_DEFAULTS[field] ?? '');
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

  records.forEach((record) => {
    const field = String(record?.field || '').trim();
    if (!field || !Object.prototype.hasOwnProperty.call(MODEL_PERSONALIZATION_DEFAULTS, field)) return;
    MODEL_PERSONALIZATION_DEFAULTS[field] = normalizeModelDefaultRegistryValue(record);
  });
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
  if (!entries.length || !isModelOwnerAuthenticated()) return;

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
      [field]: MODEL_PERSONALIZATION_DEFAULTS[field]
    };
  }

  const patch = {};
  Object.entries(MODEL_PERSONALIZATION_FIELD_AREAS).forEach(([fieldKey, metadata]) => {
    if (area === 'personalization' && metadata.area !== 'personalization') return;
    if (pane !== 'all' && metadata.pane !== pane) return;
    if (section !== 'all' && metadata.section !== section) return;
    patch[fieldKey] = MODEL_PERSONALIZATION_DEFAULTS[fieldKey];
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

function loadStoredModelKnowledgeBaseEntries() {
  try {
    const parsed = JSON.parse(window.localStorage?.getItem(MODEL_KNOWLEDGE_BASE_STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.filter((entry) => entry && typeof entry === 'object') : [];
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
    return Array.isArray(parsed) ? parsed.filter((entry) => entry && typeof entry === 'object') : [];
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
  if (!isModelOwnerAuthenticated()) return;
  if (modelTrainingSubstrateBackendLoaded) return;

  try {
    const [knowledgeEntries, logicRecords] = await Promise.all([
      listModelKnowledgeEntries(),
      listModelLogicRecords()
    ]);
    modelKnowledgeBaseEntries = knowledgeEntries.map((entry) => ({
      id: entry.id,
      text: entry.source_content || entry.source_title || '',
      createdAt: entry.created_at
    }));
    modelLogicRecords = logicRecords.map((entry) => ({
      id: entry.id,
      title: entry.logic_title || '',
      text: entry.logic_body || '',
      createdAt: entry.created_at
    }));
    modelTrainingSubstrateBackendLoaded = true;
    writeStoredModelKnowledgeBaseEntries();
    writeStoredModelLogicRecords();
    renderAllModelManagement();
  } catch (error) {
    setTrainingSubstrateStatus(formatTrainingSubstrateError(error), 'error');
  }
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
  if (!isModelOwnerAuthenticated()) return;
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
  if (!isModelOwnerAuthenticated()) return;
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
  if (!isModelOwnerAuthenticated()) return;
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

    const records = await listModelChangelogEvents(model.id, { area: 'personalization' });
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
  if (!isModelOwnerAuthenticated()) return;
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
  const authenticated = runtimeState.viewerState === 'authenticated';
  const constrained = constrainModelNavigationForViewer(section, modelPane, authenticated);

  return {
    ...navigationState,
    section: constrained.section,
    modelPane: constrained.section === 'model-discovery' && constrained.modelPane === 'overview'
      ? 'directory'
      : constrained.modelPane
  };
}

function isModelManagementHydrationPending(runtimeState = getProfileRuntimeState(), navigationState = getProfileNavigationState()) {
  const section = getActiveModelSection(navigationState);
  const modelPane = navigationState.modelPane || 'overview';
  return runtimeState.authResolved !== true && !isPublicModelNavigation(section, modelPane);
}

function isModelOwnerAuthenticated(runtimeState = getProfileRuntimeState()) {
  return runtimeState.authResolved === true && runtimeState.viewerState === 'authenticated';
}

function hydrateModelOwnerDataFromBackend(runtimeState = getProfileRuntimeState()) {
  if (!isModelOwnerAuthenticated(runtimeState)) return;

  void hydrateModelDefaultsFromBackend();
  void hydrateModelFoundationIdentityFromBackend();
  void hydrateModelPersonalizationFromBackend();
  void hydrateModelChangelogFromBackend();
  void hydrateModelVisibilityFromBackend();
  void hydrateTrainingSubstrateFromBackend();
}

function requestModelAuthResolution() {
  window.clearTimeout(modelAuthResolutionTimer);
  modelAuthResolutionTimer = window.setTimeout(() => {
    const runtimeState = getProfileRuntimeState();
    if (runtimeState.authResolved === true) return;

    void refreshAccountProfileState().catch((error) => {
      document.dispatchEvent(new CustomEvent('account:profile-signed-out', {
        detail: {
          source: 'model-management-auth-resolution',
          authResolved: true,
          reason: error?.code || error?.message || 'ACCOUNT_PROFILE_STATE_UNAVAILABLE'
        }
      }));
    });
  }, 600);
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

    const text = document.createElement('p');
    text.className = 'model-management__directory-title';
    text.textContent = entry.text;

    const remove = document.createElement('button');
    remove.className = 'model-management__text-button';
    remove.type = 'button';
    remove.dataset.modelKnowledgeRemove = entry.id;
    remove.textContent = 'Remove';

    item.append(text, remove);
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

  if (isModelManagementHydrationPending(runtimeState, navigationState)) {
    const section = getActiveModelSection(navigationState);
    root.dataset.modelSection = section;
    root.dataset.modelPane = navigationState.modelPane || 'overview';
    setModelManagementLoading(root, true);
    root.querySelectorAll('[data-model-management-section]').forEach((panel) => {
      if (panel instanceof HTMLElement) panel.hidden = true;
    });
    requestModelAuthResolution();
    return;
  }

  setModelManagementLoading(root, false);

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
  setText(root, '#model-management-title', paneCopy.title === 'Overview' ? sectionCopy.title : paneCopy.title);
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
  renderModelKnowledgeBase(root);
  renderModelLogicRecords(root);
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

async function handleModelKnowledgeSubmit(event) {
  const form = event.target?.closest?.('[data-model-knowledge-form]');
  if (!(form instanceof HTMLFormElement)) return;

  event.preventDefault();
  const input = form.querySelector('[data-model-knowledge-input]');
  if (!(input instanceof HTMLTextAreaElement)) return;

  const text = String(input.value || '').trim();
  if (!text) return;

  try {
    const entry = await createModelKnowledgeEntry(text);
    modelKnowledgeBaseEntries = [
      {
        id: entry.id,
        text: entry.source_content || entry.source_title || text,
        createdAt: entry.created_at
      },
      ...modelKnowledgeBaseEntries
    ];
    writeStoredModelKnowledgeBaseEntries();
    input.value = '';
    setTrainingSubstrateStatus('Knowledge note saved to Supabase.', 'saved');
    renderAllModelManagement();
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
  } catch (error) {
    setTrainingSubstrateStatus(formatTrainingSubstrateError(error), 'error');
  }
}

async function handleModelLogicSubmit(event) {
  const form = event.target?.closest?.('[data-model-logic-form]');
  if (!(form instanceof HTMLFormElement)) return;
  event.preventDefault();

  const title = form.querySelector('[data-model-logic-title]');
  const input = form.querySelector('[data-model-logic-input]');
  if (!(title instanceof HTMLInputElement) || !(input instanceof HTMLTextAreaElement)) return;
  if (!title.value.trim() || !input.value.trim()) return;

  try {
    const entry = await createModelLogicRecord({
      logicTitle: title.value,
      logicBody: input.value
    });
    modelLogicRecords = [
      {
        id: entry.id,
        title: entry.logic_title || title.value,
        text: entry.logic_body || input.value,
        createdAt: entry.created_at
      },
      ...modelLogicRecords
    ];
    writeStoredModelLogicRecords();
    form.reset();
    setTrainingSubstrateStatus('Model logic saved to Supabase.', 'saved');
    renderAllModelManagement();
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
  } catch (error) {
    setTrainingSubstrateStatus(formatTrainingSubstrateError(error), 'error');
  }
}

function renderAllModelManagement() {
  const runtimeState = getProfileRuntimeState();
  const navigationState = getProfileNavigationState();
  modelManagementRoots().forEach((root) => renderModelManagement(root, runtimeState, navigationState));
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
  document.addEventListener('submit', handleModelKnowledgeSubmit);
  document.addEventListener('click', handleModelKnowledgeRemove);
  document.addEventListener('submit', handleModelLogicSubmit);
  document.addEventListener('click', handleModelLogicRemove);
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
    renderAllModelManagement();
  });
}

initModelManagement();
