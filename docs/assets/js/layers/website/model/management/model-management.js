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
  resetOwnedCanonicalModelAvatar,
  saveModelFoundationIdentity,
  saveOwnedCanonicalModelAvatar,
  saveModelPersonalizationPreferences
} from '../../system/model/model-store.js';
import { getPublicModels, loadPublicModelRegistry } from '../../system/model/public-model-registry.js';
import { registerProfileMediaEditorTarget } from '../../profile/private/media/profile-media-editor.js';

const MODEL_PERSONALIZATION_STORAGE_KEY = 'neuroartan.model.personalization.preferences';
const MODEL_FOUNDATION_IDENTITY_STORAGE_KEY = 'neuroartan.model.foundation.identity';
const MODEL_KNOWLEDGE_BASE_STORAGE_KEY = 'neuroartan.model.training.knowledge-base';

const MODEL_PERSONALIZATION_DEFAULTS = Object.freeze({
  languageStyle: 'balanced',
  directnessLevel: 'nuanced',
  emotionalTone: 'neutral',
  responseLength: 'balanced',
  explanationDepth: 'standard',
  memoryRetention: 'session',
  continuityDepth: 'moderate',
  emotionalWeighting: 'balanced',
  empathyLevel: 'moderate',
  reflectionFrequency: 'never',
  reflectionDepth: 'moderate',
  senseOfHumor: 50,
  efficiencyPreference: 50,
  creativityLevel: 50,
  riskTolerance: 25
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

let modelPersonalizationPreferences = loadStoredModelPersonalizationPreferences();
let modelPersonalizationBackendLoaded = false;
let modelPersonalizationBackendSaveTimer = 0;
let modelFoundationIdentity = loadStoredModelFoundationIdentity();
let modelFoundationIdentityBackendLoaded = false;
let modelFoundationIdentityBackendSaveTimer = 0;
let modelKnowledgeBaseEntries = loadStoredModelKnowledgeBaseEntries();
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
    /* Local persistence is an enhancement until the governed knowledge backend is connected. */
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
    } catch (error) {
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

function getActiveModelSection(navigationState = getProfileNavigationState()) {
  return MODEL_SECTIONS.has(navigationState.section) ? navigationState.section : 'model-foundation';
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
}

function renderAllModelPersonalizationControls() {
  const navigationState = getProfileNavigationState();
  modelManagementRoots().forEach((root) => renderModelPersonalizationControls(root, navigationState));
}

function renderModelManagement(root, runtimeState = getProfileRuntimeState(), navigationState = getProfileNavigationState()) {
  if (!(root instanceof HTMLElement)) return;

  const section = getActiveModelSection(navigationState);
  const sectionCopy = SECTION_LABELS[section] || SECTION_LABELS['model-foundation'];
  const paneCopy = getModelPersonalizationPaneCopy(navigationState)
    || PANE_LABELS[navigationState.modelPane]
    || PANE_LABELS.overview;
  const profile = runtimeState.profile || {};
  const displayName = String(runtimeState.displayName || profile.display_name || '').trim();
  const username = String(runtimeState.username?.normalized || profile.username || '').trim();
  const profileComplete = runtimeState.profileComplete === true || profile.profile_complete === true || runtimeState.completion?.complete === true;

  root.dataset.modelSection = section;
  root.dataset.modelPane = navigationState.modelPane || 'overview';
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

  renderModelFoundationGroups(root, navigationState);
  renderModelTrainingGroups(root, navigationState);
  renderModelDiscoveryGroups(root, navigationState);
  renderModelFoundationIdentityControls(root);
  renderModelPersonalizationControls(root, navigationState);
  renderModelKnowledgeBase(root);
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
    const model = await getOwnedCanonicalModel();
    if (model?.id) {
      const savedIdentity = await saveModelFoundationIdentity(model.id, {
        ...modelFoundationIdentity,
        ...nextIdentity
      });
      if (savedIdentity) {
        updateModelFoundationIdentity(savedIdentity, {
          source: 'model-identity-editor',
          sync: false
        });
      }
    }
    setModelIdentityEditorOpen(false);
  } catch (error) {
    console.warn('[Neuroartan][Model] Foundation identity save failed.', error);
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

function handleModelKnowledgeSubmit(event) {
  const form = event.target?.closest?.('[data-model-knowledge-form]');
  if (!(form instanceof HTMLFormElement)) return;

  event.preventDefault();
  const input = form.querySelector('[data-model-knowledge-input]');
  if (!(input instanceof HTMLTextAreaElement)) return;

  const text = String(input.value || '').trim();
  if (!text) return;

  modelKnowledgeBaseEntries = [
    ...modelKnowledgeBaseEntries,
    {
      id: window.crypto?.randomUUID?.() || `${Date.now()}`,
      text,
      createdAt: new Date().toISOString()
    }
  ];
  writeStoredModelKnowledgeBaseEntries();
  input.value = '';
  renderAllModelManagement();
}

function handleModelKnowledgeRemove(event) {
  const trigger = event.target?.closest?.('[data-model-knowledge-remove]');
  if (!(trigger instanceof HTMLElement)) return;

  const entryId = trigger.dataset.modelKnowledgeRemove;
  modelKnowledgeBaseEntries = modelKnowledgeBaseEntries.filter((entry) => entry.id !== entryId);
  writeStoredModelKnowledgeBaseEntries();
  renderAllModelManagement();
}

function renderAllModelManagement() {
  const runtimeState = getProfileRuntimeState();
  const navigationState = getProfileNavigationState();
  modelManagementRoots().forEach((root) => renderModelManagement(root, runtimeState, navigationState));
}

function initModelManagement() {
  registerModelAvatarEditor();
  renderAllModelManagement();
  void hydrateModelFoundationIdentityFromBackend();
  void hydrateModelPersonalizationFromBackend();
  void hydratePublicModelDirectory();
  subscribeProfileRuntime(renderAllModelManagement);
  subscribeProfileNavigation(renderAllModelManagement);
  document.addEventListener('input', handleModelPersonalizationInput);
  document.addEventListener('change', handleModelPersonalizationInput);
  document.addEventListener('input', handleModelFoundationInput);
  document.addEventListener('change', handleModelFoundationInput);
  document.addEventListener('click', handleModelAvatarClick);
  document.addEventListener('input', handleModelDirectoryFilter);
  document.addEventListener('change', handleModelDirectoryFilter);
  document.addEventListener('click', handleModelDirectorySearchOpen);
  document.addEventListener('submit', handleModelKnowledgeSubmit);
  document.addEventListener('click', handleModelKnowledgeRemove);
  document.addEventListener('model:identity-editor-open-request', handleModelIdentityEditorRequest);
  document.addEventListener('click', handleModelIdentityEditorClick);
  document.addEventListener('submit', handleModelIdentityEditorSubmit);
  document.addEventListener('keydown', handleModelIdentityEditorKeydown);
  window.addEventListener('neuroartan:model-public-registry-invalidated', invalidateModelDirectoryProjection);
  window.addEventListener('neuroartan:supabase-ready', retryModelFoundationIdentityHydration);
  document.addEventListener('account:profile-state-changed', retryModelFoundationIdentityHydration);
  document.addEventListener('account:profile-refresh-request', retryModelFoundationIdentityHydration);

  document.addEventListener('fragment:mounted', (event) => {
    if (event?.detail?.name !== 'model-management') return;
    renderAllModelManagement();
  });
}

initModelManagement();
