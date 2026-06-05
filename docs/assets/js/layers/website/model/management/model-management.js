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
const MODEL_FOUNDATION_IDENTITY_STORAGE_KEY = 'neuroartan.model.foundation.identity';
const MODEL_VISIBILITY_PREFERENCES_STORAGE_KEY = 'neuroartan.model.visibility.preferences';
const MODEL_KNOWLEDGE_BASE_STORAGE_KEY = 'neuroartan.model.training.knowledge-base';
const MODEL_LOGIC_RECORDS_STORAGE_KEY = 'neuroartan.model.training.logics';

const MODEL_PERSONALIZATION_DEFAULTS = Object.freeze({
  languageStyle: 'balanced',
  directnessLevel: 'nuanced',
  emotionalTone: 'neutral',
  responseLength: 'balanced',
  explanationDepth: 'standard',
  responseAudienceScope: 'general',
  memoryRetention: 'session',
  continuityDepth: 'moderate',
  emotionalWeighting: 'balanced',
  empathyLevel: 'moderate',
  reflectionFrequency: 'never',
  reflectionDepth: 'moderate',
  senseOfHumor: 50,
  efficiencyPreference: 50,
  creativityLevel: 50,
  riskTolerance: 25,
  publicResponseOpenness: 50,
  publicResponseDirectness: 50,
  publicResponseHumor: 35,
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
  subscriberResponseProfessionalTone: 75
});

const MODEL_PERSONALIZATION_PANE_GROUPS = Object.freeze({
  behavior: 'behavior',
  language: 'language',
  emotion: 'emotion',
  response: 'response',
  memory: 'memory',
  creativity: 'creativity',
  reflection: 'reflection'
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
let modelPersonalizationBackendLoaded = false;
let modelPersonalizationBackendSaveTimer = 0;
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
  behavior: {
    title: 'Behavior',
    summary: 'Tune the model’s directness, risk posture, efficiency, and owner-representative behavior.'
  },
  language: {
    title: 'Language',
    summary: 'Set the model’s speaking style without changing the user interface language or ICOS assistant preferences.'
  },
  emotion: {
    title: 'Emotion',
    summary: 'Control emotional tone, empathy, and emotional weighting for the model’s public and staged interactions.'
  },
  response: {
    title: 'Response',
    summary: 'Control response length, explanation depth, pacing, and clarity for the model itself.'
  },
  creativity: {
    title: 'Creativity',
    summary: 'Tune humor, creativity, and exploratory tolerance for model responses.'
  },
  reflection: {
    title: 'Reflection',
    summary: 'Set how often the model reflects, reviews, and updates behavior from owner-approved context.'
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
      if (!model?.id) return;
      await saveModelPersonalizationPreferences(model.id, modelPersonalizationPreferences);
      setModelPersonalizationStatus('Model personalization saved.', 'success');
    } catch (error) {
      setModelPersonalizationStatus(formatModelPersonalizationError(error), 'error');
      console.warn('[Neuroartan][Model] Personalization preference sync skipped.', error);
    }
  }, 350);
}

function updateModelPersonalizationPreferences(nextPatch = {}, options = {}) {
  modelPersonalizationPreferences = normalizeModelPersonalizationPreferences({
    ...modelPersonalizationPreferences,
    ...nextPatch
  });
  writeStoredModelPersonalizationPreferences(modelPersonalizationPreferences);
  renderAllModelPersonalizationControls();

  document.dispatchEvent(new CustomEvent('model:personalization-preferences-updated', {
    detail: {
      preferences: { ...modelPersonalizationPreferences },
      source: options.source || 'model-management'
    }
  }));

  if (options.sync !== false) {
    setModelPersonalizationStatus('Saving personalization...', 'saving');
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

  void hydrateModelFoundationIdentityFromBackend();
  void hydrateModelPersonalizationFromBackend();
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
  return MODEL_PERSONALIZATION_PANE_GROUPS[navigationState.modelPane] || 'behavior';
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
    label.textContent = select.selectedOptions[0]?.textContent || '';
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

  switch (navigationState.modelPane) {
    case 'memory':
      return {
        title: 'Memory',
        summary: 'Set retention and continuity depth for the owner model behavior without changing the private memory substrate.'
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

    if (control instanceof HTMLInputElement || control instanceof HTMLSelectElement) {
      control.value = String(value ?? '');
    }
  });

  root.querySelectorAll('[data-model-personalization-label]').forEach((label) => {
    if (!(label instanceof HTMLElement)) return;
    const field = label.dataset.modelPersonalizationLabel;
    const select = field ? root.querySelector(`[data-model-personalization-field="${field}"]`) : null;
    if (!(select instanceof HTMLSelectElement)) return;
    label.textContent = select.selectedOptions[0]?.textContent || '';
  });

  root.querySelectorAll('[data-model-personalization-value]').forEach((valueNode) => {
    if (!(valueNode instanceof HTMLElement)) return;
    const field = valueNode.dataset.modelPersonalizationValue;
    valueNode.textContent = String(getModelPersonalizationValue(field) ?? '');
  });

  const responseAudienceScope = String(getModelPersonalizationValue('responseAudienceScope') || 'general');
  root.querySelectorAll('[data-model-response-audience-panel]').forEach((panel) => {
    if (!(panel instanceof HTMLElement)) return;
    panel.hidden = panel.dataset.modelResponseAudiencePanel !== responseAudienceScope;
  });
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
    label.textContent = select.selectedOptions[0]?.textContent || '';
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
    return 'Model personalization schema update required before these controls can save.';
  }
  if (code === '42501') {
    return 'Model personalization could not be saved because the Supabase policy blocked this owner.';
  }
  return code ? `Model personalization could not be saved: ${code}` : 'Model personalization could not be saved.';
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
}

function handleModelFoundationInput(event) {
  const control = event.target?.closest?.('[data-model-foundation-field]');
  if (!(control instanceof HTMLElement)) return;

  const field = control.dataset.modelFoundationField;
  if (!field) return;

  updateModelFoundationIdentity({ [field]: control.value });
}

function handleModelPersonalizationInput(event) {
  const control = event.target?.closest?.('[data-model-personalization-field]');
  if (!(control instanceof HTMLElement)) return;

  const field = control.dataset.modelPersonalizationField;
  if (!field) return;

  const rawValue = control instanceof HTMLInputElement && control.type === 'range'
    ? Number(control.value)
    : control.value;

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
