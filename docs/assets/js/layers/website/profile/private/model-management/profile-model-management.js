/* =============================================================================
   01) MODULE IMPORTS
   02) MODEL MANAGEMENT HELPERS
   03) MODEL MANAGEMENT RENDER
   04) INITIALIZATION
   ============================================================================= */

import { getProfileNavigationState, subscribeProfileNavigation } from '../navigation/profile-navigation.js';
import { getProfileRuntimeState, subscribeProfileRuntime } from '../shell/profile-runtime.js';
import {
  getOwnedCanonicalModel,
  readModelFoundationIdentity,
  readModelPersonalizationPreferences,
  saveModelFoundationIdentity,
  saveModelPersonalizationPreferences
} from '../../../system/model/model-store.js';

const MODEL_PERSONALIZATION_STORAGE_KEY = 'neuroartan.model.personalization.preferences';
const MODEL_FOUNDATION_IDENTITY_STORAGE_KEY = 'neuroartan.model.foundation.identity';

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

const MODEL_FOUNDATION_IDENTITY_DEFAULTS = Object.freeze({
  modelNickname: '',
  apiIdentity: 'Private API identity pending',
  serialNumber: 'Serial pending',
  birthNumber: 'Birth record pending',
  ownerRecordPolicy: 'fixed_owner_binding'
});

let modelPersonalizationPreferences = loadStoredModelPersonalizationPreferences();
let modelPersonalizationBackendLoaded = false;
let modelPersonalizationBackendSaveTimer = 0;
let modelFoundationIdentity = loadStoredModelFoundationIdentity();
let modelFoundationIdentityBackendLoaded = false;
let modelFoundationIdentityBackendSaveTimer = 0;

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
  return Array.from(document.querySelectorAll('[data-profile-model-management]'));
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

function scheduleModelFoundationIdentityBackendSave() {
  window.clearTimeout(modelFoundationIdentityBackendSaveTimer);
  modelFoundationIdentityBackendSaveTimer = window.setTimeout(async () => {
    try {
      const model = await getOwnedCanonicalModel();
      if (!model?.id) return;
      await saveModelFoundationIdentity(model.id, modelFoundationIdentity);
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

  document.dispatchEvent(new CustomEvent('profile:model-foundation-identity-updated', {
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
  modelFoundationIdentityBackendLoaded = true;

  try {
    const model = await getOwnedCanonicalModel();
    if (!model?.id) return;

    const identity = await readModelFoundationIdentity(model.id);
    updateModelFoundationIdentity({
      modelNickname: identity?.modelNickname || model.model_name || model.display_name || '',
      apiIdentity: identity?.apiIdentity || model.slug || model.model_slug || 'Private API identity pending',
      serialNumber: identity?.serialNumber || `NA-MODEL-${String(model.id).slice(0, 8).toUpperCase()}`,
      birthNumber: identity?.birthNumber || model.birth_certificate_id || 'Birth record pending',
      ownerRecordPolicy: identity?.ownerRecordPolicy || 'fixed_owner_binding'
    }, {
      source: 'model-management-backend',
      sync: false
    });
  } catch (error) {
    console.warn('[Neuroartan][Model] Foundation identity hydration skipped.', error);
  }
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

  document.dispatchEvent(new CustomEvent('profile:model-personalization-preferences-updated', {
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

function renderModelFoundationGroups(root, navigationState = getProfileNavigationState()) {
  if (!(root instanceof HTMLElement)) return;

  const visibleGroup = getVisibleModelFoundationGroup(navigationState);
  root.querySelectorAll('[data-profile-model-foundation-group]').forEach((group) => {
    if (!(group instanceof HTMLElement)) return;
    group.hidden = group.dataset.profileModelFoundationGroup !== visibleGroup;
  });
}

function renderModelFoundationIdentityControls(root) {
  if (!(root instanceof HTMLElement)) return;

  const identity = normalizeModelFoundationIdentity(modelFoundationIdentity);

  root.querySelectorAll('[data-profile-model-foundation-field]').forEach((control) => {
    if (!(control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement || control instanceof HTMLSelectElement)) return;
    const field = control.dataset.profileModelFoundationField;
    if (!field) return;
    control.value = String(identity[field] || '');
  });

  setText(root, '[data-profile-model-api-identity]', identity.apiIdentity);
  setText(root, '[data-profile-model-serial-number]', identity.serialNumber);
  setText(root, '[data-profile-model-birth-number]', identity.birthNumber);
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
  root.querySelectorAll('[data-profile-model-personalization-group]').forEach((group) => {
    if (!(group instanceof HTMLElement)) return;
    group.hidden = group.dataset.profileModelPersonalizationGroup !== visibleGroup;
  });

  root.querySelectorAll('[data-profile-model-personalization-field]').forEach((control) => {
    if (!(control instanceof HTMLElement)) return;
    const field = control.dataset.profileModelPersonalizationField;
    const value = getModelPersonalizationValue(field);

    if (control instanceof HTMLInputElement || control instanceof HTMLSelectElement) {
      control.value = String(value ?? '');
    }
  });

  root.querySelectorAll('[data-profile-model-personalization-value]').forEach((valueNode) => {
    if (!(valueNode instanceof HTMLElement)) return;
    const field = valueNode.dataset.profileModelPersonalizationValue;
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

  root.dataset.profileModelSection = section;
  root.dataset.profileModelPane = navigationState.modelPane || 'overview';
  setText(root, '[data-profile-model-owner-name]', displayName || 'Profile owner');
  setText(root, '[data-profile-model-owner-handle]', username ? `@${username}` : '@username');
  setText(root, '[data-profile-model-owner-id]', profile.id || profile.auth_user_id || 'Owner record pending');
  setText(root, '#profile-model-management-title', paneCopy.title === 'Overview' ? sectionCopy.title : paneCopy.title);
  setText(root, '[data-profile-model-management-summary]', paneCopy.summary || sectionCopy.summary);
  setText(root, '[data-profile-model-status]', profileComplete ? 'Foundation active' : 'Foundation incomplete');
  setText(root, '[data-profile-model-profile-link]', username ? `Profile linked to @${username}` : 'Profile route pending');
  setText(root, '[data-profile-model-readiness]', profileComplete ? 'Preparing' : 'Blocked by profile foundation');
  setText(root, '[data-profile-model-readiness-state]', profileComplete ? 'Preparing' : 'Not ready');

  root.querySelectorAll('[data-profile-model-management-section]').forEach((panel) => {
    if (!(panel instanceof HTMLElement)) return;
    panel.hidden = panel.dataset.profileModelManagementSection !== section;
  });

  renderModelFoundationGroups(root, navigationState);
  renderModelFoundationIdentityControls(root);
  renderModelPersonalizationControls(root, navigationState);
}

function handleModelFoundationInput(event) {
  const control = event.target?.closest?.('[data-profile-model-foundation-field]');
  if (!(control instanceof HTMLElement)) return;

  const field = control.dataset.profileModelFoundationField;
  if (!field) return;

  updateModelFoundationIdentity({ [field]: control.value });
}

function handleModelPersonalizationInput(event) {
  const control = event.target?.closest?.('[data-profile-model-personalization-field]');
  if (!(control instanceof HTMLElement)) return;

  const field = control.dataset.profileModelPersonalizationField;
  if (!field) return;

  const rawValue = control instanceof HTMLInputElement && control.type === 'range'
    ? Number(control.value)
    : control.value;

  updateModelPersonalizationPreferences({ [field]: rawValue });
}

function renderAllModelManagement() {
  const runtimeState = getProfileRuntimeState();
  const navigationState = getProfileNavigationState();
  modelManagementRoots().forEach((root) => renderModelManagement(root, runtimeState, navigationState));
}

function initModelManagement() {
  renderAllModelManagement();
  void hydrateModelFoundationIdentityFromBackend();
  void hydrateModelPersonalizationFromBackend();
  subscribeProfileRuntime(renderAllModelManagement);
  subscribeProfileNavigation(renderAllModelManagement);
  document.addEventListener('input', handleModelPersonalizationInput);
  document.addEventListener('change', handleModelPersonalizationInput);
  document.addEventListener('input', handleModelFoundationInput);
  document.addEventListener('change', handleModelFoundationInput);

  document.addEventListener('fragment:mounted', (event) => {
    if (event?.detail?.name !== 'profile-private-model-management') return;
    renderAllModelManagement();
  });
}

initModelManagement();
