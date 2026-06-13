/* =============================================================================
   00) FILE INDEX
   01) MODULE IDENTITY
   02) IMPORTS
   03) CONSTANTS
   04) BACKEND HELPERS
   05) VALUE HELPERS
   06) PROFILE HELPERS
   07) MODEL READ HELPERS
   08) MODEL WRITE HELPERS
   09) SOURCE / TRAINING HELPERS
   10) END OF FILE
============================================================================= */

/* =============================================================================
   01) MODULE IDENTITY
============================================================================= */
/* /website/docs/assets/js/layers/website/system/model/model-store.js */

/* =============================================================================
   02) IMPORTS
============================================================================= */
import {
  REQUIRED_PROFILE_FIELDS,
  getSupabaseClient,
  getSupabaseProfileByAuthUserId,
  normalizeString,
  normalizeUsername,
} from '../account/identity/account-profile-identity.js';
import { uploadProfileImage } from '../profile/profile-image-storage.js';
import { recordProfileChangelogEvent } from '../profile/profile-changelog-store.js';

/* =============================================================================
   03) CONSTANTS
============================================================================= */
const MODELS_TABLE = 'models';
const SOURCE_CONNECTORS_TABLE = 'model_source_connectors';
const INGESTION_JOBS_TABLE = 'model_ingestion_jobs';
const TRAINING_RECORDS_TABLE = 'model_training_records';
const RETRIEVAL_RECORDS_TABLE = 'model_retrieval_records';
const RUNTIME_ROUTES_TABLE = 'model_runtime_routes';
const ACTIVE_MODEL_PREFERENCES_TABLE = 'active_model_preferences';
const MODEL_PERSONALIZATION_PREFERENCES_TABLE = 'model_personalization_preferences';
const MODEL_VISIBILITY_PREFERENCES_TABLE = 'model_visibility_preferences';
const MODEL_DIGITAL_BRAIN_PREFERENCES_TABLE = 'model_digital_brain_preferences';
const MODEL_VOICE_TRAINING_STATE_TABLE = 'model_voice_training_state';
const MODEL_VOICE_TRAINING_SAMPLES_TABLE = 'model_voice_training_samples';
const MODEL_LOGIC_RECORDS_TABLE = 'model_logic_records';
const MODEL_CHANGELOG_EVENTS_TABLE = 'model_changelog_events';
const MODEL_DEFAULT_REGISTRY_TABLE = 'model_default_registry';
const MODEL_SOURCE_CALIBRATION_SESSIONS_TABLE = 'model_source_calibration_sessions';
const MODEL_SOURCE_CALIBRATION_ANSWERS_TABLE = 'model_source_calibration_answers';
const MODEL_SOURCE_CALIBRATION_RESULTS_TABLE = 'model_source_calibration_results';
const MODEL_PERSONALITY_CALIBRATION_SESSIONS_TABLE = 'model_personality_calibration_sessions';
const MODEL_PERSONALITY_CALIBRATION_ANSWERS_TABLE = 'model_personality_calibration_answers';
const MODEL_PERSONALITY_CALIBRATION_RESULTS_TABLE = 'model_personality_calibration_results';
const PRIVACY_SOURCE_REGISTRY_TABLE = 'privacy_source_registry';
const PRIVACY_CONSENT_LEDGER_TABLE = 'privacy_consent_ledger';
const PRIVACY_PROCESSING_LEDGER_TABLE = 'privacy_processing_ledger';
const PRIVACY_STORAGE_LOCATION_REGISTRY_TABLE = 'privacy_storage_location_registry';
const PRIVACY_EXPORT_JOBS_TABLE = 'privacy_export_jobs';
const PRIVACY_DELETION_JOBS_TABLE = 'privacy_deletion_jobs';
const PRIVACY_MEMORY_REGISTRY_TABLE = 'privacy_memory_registry';
const PRIVACY_VOICE_REGISTRY_TABLE = 'privacy_voice_registry';
const PRIVACY_LEGACY_REGISTRY_TABLE = 'privacy_legacy_registry';
const PRIVACY_STAFF_ACCESS_AUDIT_TABLE = 'privacy_staff_access_audit';
const PRIVACY_PROVIDER_REGISTRY_TABLE = 'privacy_provider_registry';
const PRIVACY_PERMISSION_STATE_TABLE = 'privacy_permission_state';
const PRIVACY_CONNECTOR_STATE_TABLE = 'privacy_connector_state';
const MODEL_VOICE_SAMPLE_BUCKET = 'model-voice-samples';

const MODEL_SELECT_FIELDS = [
  'id',
  'profile_id',
  'slug',
  'model_name',
  'description',
  'model_visibility',
  'model_status',
  'readiness_state',
  'publication_state',
  'runtime_policy',
  'birth_certificate_id',
  'private_identity_id',
  'public_identity_id',
  'entitlement_state',
  'permission_state',
  'economy_state',
  'foundation_state',
  'created_at',
  'updated_at',
].join(', ');

const MODEL_PUBLIC_IDENTITY_SELECT_FIELDS = [
  '*',
].join(', ');

const MODEL_FOUNDATION_TABLES = Object.freeze({
  birthCertificates: 'model_birth_certificates',
  identityRegistry: 'model_identity_registry',
  publicIdentities: 'model_public_identities',
  privateIdentities: 'model_private_identities',
  providerRouting: 'model_provider_routing_state',
  entitlement: 'model_entitlement_state',
  permission: 'model_permission_state',
  sourceAuthorization: 'model_source_authorization_state',
  lifecycle: 'model_lifecycle_state',
  ownerDashboard: 'model_owner_dashboard_state',
  dignitySecurity: 'model_dignity_security_state',
  blockedEconomy: 'model_blocked_economy_state',
  deviceIntegrity: 'model_device_integrity_state',
  impersonationReview: 'model_impersonation_review_state',
  modelIdentityAntiAbuse: 'model_identity_anti_abuse_state',
  restrictionReviewAppeal: 'model_restriction_review_appeal_state',
});

const MODEL_IDENTITY_CHANGE_FIELDS = Object.freeze({
  modelNickname: 'Model nickname',
  modelPurposeDescription: 'Model purpose',
  privateNotes: 'Private notes',
});

const MODEL_PERSONALIZATION_CHANGE_FIELDS = Object.freeze({
  languageStyle: 'Language style',
  directnessLevel: 'Directness',
  emotionalTone: 'Emotional tone',
  responseLength: 'Response length',
  explanationDepth: 'Explanation depth',
  memoryRetention: 'Memory retention',
  continuityDepth: 'Continuity depth',
  emotionalWeighting: 'Emotional weighting',
  empathyLevel: 'Empathy level',
  reflectionFrequency: 'Reflection frequency',
  reflectionDepth: 'Reflection depth',
  senseOfHumor: 'Sense of humor',
  efficiencyPreference: 'Efficiency',
  creativityLevel: 'Creativity',
  riskTolerance: 'Risk tolerance',
  publicResponseOpenness: 'Public response openness',
  publicResponseDirectness: 'Public response directness',
  publicResponseHumor: 'Public response humor',
  friendsResponseWarmth: 'Friends response warmth',
  friendsResponseDetail: 'Friends response detail',
  friendsResponseHumor: 'Friends response humor',
  followersResponseClarity: 'Followers response clarity',
  followersResponseEfficiency: 'Followers response efficiency',
  followersResponseOpenness: 'Followers response openness',
  mutualResponseTrustDepth: 'Mutual response trust depth',
  mutualResponseExplanationDepth: 'Mutual response explanation depth',
  mutualResponseDirectness: 'Mutual response directness',
  familyResponseWarmth: 'Family response warmth',
  familyResponsePrivacyGuard: 'Family response privacy guard',
  familyResponseHumor: 'Family response humor',
  subscriberResponsePriority: 'Subscriber response priority',
  subscriberResponseDetail: 'Subscriber response detail',
  subscriberResponseProfessionalTone: 'Subscriber response professional tone',
});

const MODEL_RESPONSE_AUDIENCE_FIELDS = Object.freeze({
  publicResponseOpenness: ['public', 'openness'],
  publicResponseDirectness: ['public', 'directness'],
  publicResponseHumor: ['public', 'humor'],
  friendsResponseWarmth: ['friends', 'warmth'],
  friendsResponseDetail: ['friends', 'detail'],
  friendsResponseHumor: ['friends', 'humor'],
  followersResponseClarity: ['followers', 'clarity'],
  followersResponseEfficiency: ['followers', 'efficiency'],
  followersResponseOpenness: ['followers', 'openness'],
  mutualResponseTrustDepth: ['mutuals', 'trustDepth'],
  mutualResponseExplanationDepth: ['mutuals', 'explanationDepth'],
  mutualResponseDirectness: ['mutuals', 'directness'],
  familyResponseWarmth: ['family', 'warmth'],
  familyResponsePrivacyGuard: ['family', 'privacyGuard'],
  familyResponseHumor: ['family', 'humor'],
  subscriberResponsePriority: ['subscribers', 'priority'],
  subscriberResponseDetail: ['subscribers', 'detail'],
  subscriberResponseProfessionalTone: ['subscribers', 'professionalTone'],
});

const MODEL_RESPONSE_AUDIENCE_DEFAULTS = Object.freeze({
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
  subscriberResponseProfessionalTone: 75,
});

const MODEL_DIGITAL_BRAIN_CHANGE_FIELDS = Object.freeze({
  viewMode: 'Brain map view',
  displayMode: 'Brain map display mode',
  motionState: 'Brain map motion',
  motionDirection: 'Brain map rotation direction',
  constructNodesVisible: 'Construct nodes',
  constructLabelsVisible: 'Construct labels',
  nodeScale: 'Node scale',
  connectionScale: 'Connection thickness',
  connectionVisibility: 'Connection visibility',
  connectionPulse: 'Connection pulse',
  regionOpacity: 'Region opacity',
  labelScale: 'Label scale',
  constructScale: 'Construct node scale',
  constructSpread: 'Construct spread',
  signalIntensity: 'Signal intensity',
  blurIntensity: 'Signal blur',
  motionSpeed: 'Motion speed',
  colorIntensity: 'Color intensity',
  zoomLevel: 'Brain map zoom',
  rotateX: 'Brain map vertical rotation',
  rotateY: 'Brain map horizontal rotation',
});

/* =============================================================================
   04) BACKEND HELPERS
============================================================================= */
export function getModelStoreBackendState() {
  return {
    supabaseConfigured: Boolean(getSupabaseClient()),
    modelsTable: MODELS_TABLE,
    sourceConnectorsTable: SOURCE_CONNECTORS_TABLE,
    ingestionJobsTable: INGESTION_JOBS_TABLE,
    trainingRecordsTable: TRAINING_RECORDS_TABLE,
    retrievalRecordsTable: RETRIEVAL_RECORDS_TABLE,
    runtimeRoutesTable: RUNTIME_ROUTES_TABLE,
    activeModelPreferencesTable: ACTIVE_MODEL_PREFERENCES_TABLE,
    modelPersonalizationPreferencesTable: MODEL_PERSONALIZATION_PREFERENCES_TABLE,
    modelVisibilityPreferencesTable: MODEL_VISIBILITY_PREFERENCES_TABLE,
    modelVoiceTrainingStateTable: MODEL_VOICE_TRAINING_STATE_TABLE,
    modelVoiceTrainingSamplesTable: MODEL_VOICE_TRAINING_SAMPLES_TABLE,
    modelVoiceSampleBucket: MODEL_VOICE_SAMPLE_BUCKET,
    modelLogicRecordsTable: MODEL_LOGIC_RECORDS_TABLE,
    modelChangelogEventsTable: MODEL_CHANGELOG_EVENTS_TABLE,
    modelDefaultRegistryTable: MODEL_DEFAULT_REGISTRY_TABLE,
    modelSourceCalibrationSessionsTable: MODEL_SOURCE_CALIBRATION_SESSIONS_TABLE,
    modelSourceCalibrationAnswersTable: MODEL_SOURCE_CALIBRATION_ANSWERS_TABLE,
    modelSourceCalibrationResultsTable: MODEL_SOURCE_CALIBRATION_RESULTS_TABLE,
    modelPersonalityCalibrationSessionsTable: MODEL_PERSONALITY_CALIBRATION_SESSIONS_TABLE,
    modelPersonalityCalibrationAnswersTable: MODEL_PERSONALITY_CALIBRATION_ANSWERS_TABLE,
    modelPersonalityCalibrationResultsTable: MODEL_PERSONALITY_CALIBRATION_RESULTS_TABLE,
    modelFoundationTables: MODEL_FOUNDATION_TABLES,
    privacyDataGovernanceTables: {
      sourceRegistry: PRIVACY_SOURCE_REGISTRY_TABLE,
      consentLedger: PRIVACY_CONSENT_LEDGER_TABLE,
      processingLedger: PRIVACY_PROCESSING_LEDGER_TABLE,
      storageLocationRegistry: PRIVACY_STORAGE_LOCATION_REGISTRY_TABLE,
      exportJobs: PRIVACY_EXPORT_JOBS_TABLE,
      deletionJobs: PRIVACY_DELETION_JOBS_TABLE,
      memoryRegistry: PRIVACY_MEMORY_REGISTRY_TABLE,
      voiceRegistry: PRIVACY_VOICE_REGISTRY_TABLE,
      legacyRegistry: PRIVACY_LEGACY_REGISTRY_TABLE,
      staffAccessAudit: PRIVACY_STAFF_ACCESS_AUDIT_TABLE,
      providerRegistry: PRIVACY_PROVIDER_REGISTRY_TABLE,
      permissionState: PRIVACY_PERMISSION_STATE_TABLE,
      connectorState: PRIVACY_CONNECTOR_STATE_TABLE,
    },
    migrationStatus: 'supabase_canonical_model_foundation',
  };
}

async function resolveSupabaseClient(timeoutMs = 4000) {
  const currentClient = getSupabaseClient();
  if (currentClient) return currentClient;
  if (typeof window === 'undefined') return null;

  return new Promise((resolve) => {
    let settled = false;
    let timeoutId = null;

    const cleanup = () => {
      window.removeEventListener('neuroartan:supabase-ready', handleReady);
      window.removeEventListener('neuroartan:supabase-error', handleUnavailable);
      window.removeEventListener('neuroartan:supabase-missing-config', handleUnavailable);
      if (timeoutId) window.clearTimeout(timeoutId);
    };

    const finish = (client = null) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(client || getSupabaseClient() || null);
    };

    const handleReady = () => finish(getSupabaseClient());
    const handleUnavailable = () => finish(null);

    window.addEventListener('neuroartan:supabase-ready', handleReady, { once: true });
    window.addEventListener('neuroartan:supabase-error', handleUnavailable, { once: true });
    window.addEventListener('neuroartan:supabase-missing-config', handleUnavailable, { once: true });

    timeoutId = window.setTimeout(() => finish(null), timeoutMs);
  });
}

export function isSupabaseRelationMissingError(error) {
  const code = normalizeString(error?.code || '').toUpperCase();
  const message = normalizeString(error?.message || '').toLowerCase();
  const details = normalizeString(error?.details || '').toLowerCase();
  return code === '42P01'
    || code === 'PGRST205'
    || message.includes('does not exist')
    || message.includes('schema cache')
    || details.includes('schema cache');
}

function isSupabaseColumnMissingError(error) {
  const code = normalizeString(error?.code || '').toUpperCase();
  const message = normalizeString(error?.message || '').toLowerCase();
  const details = normalizeString(error?.details || '').toLowerCase();
  return code === '42703' || message.includes('column') || details.includes('column');
}

export async function getCurrentSupabaseUser() {
  const supabase = await resolveSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;

  return data?.session?.user || null;
}

function getUserId(user) {
  return normalizeString(user?.id || user?.uid || '');
}

/* =============================================================================
   05) VALUE HELPERS
============================================================================= */
export function buildModelSlug(value = '') {
  return normalizeUsername(value || `model-${Date.now()}`);
}

function mapSupabaseModel(row = {}) {
  if (!row || typeof row !== 'object') return null;

  return {
    ...row,
    id: normalizeString(row.id),
    slug: normalizeString(row.slug || row.model_slug || row.id),
    model_slug: normalizeString(row.slug || row.model_slug || row.id),
    model_name: normalizeString(row.model_name || row.display_name || 'Untitled model'),
    display_name: normalizeString(row.model_name || row.display_name || 'Untitled model'),
    description: normalizeString(row.description || ''),
    model_image_url: normalizeString(row.model_image_url || ''),
    creator_display_name: normalizeString(row.creator_display_name || ''),
    creator_username: normalizeUsername(row.creator_username || row.slug || row.model_slug || ''),
    model_visibility: normalizeString(row.model_visibility || 'private'),
    model_status: normalizeString(row.model_status || row.lifecycle_state || 'draft'),
    lifecycle_state: normalizeString(row.model_status || row.lifecycle_state || 'draft'),
    readiness_state: normalizeString(row.readiness_state || 'not_ready'),
    publication_state: normalizeString(row.publication_state || 'unpublished'),
    verification_state: normalizeString(row.foundation_state || row.verification_state || 'private_foundation_created'),
    training_state: normalizeString(row.readiness_state || row.training_state || 'not_ready'),
    default_runtime_policy: row.runtime_policy || row.default_runtime_policy || {},
    runtime_policy: row.runtime_policy || row.default_runtime_policy || {},
    release_version: normalizeString(row.foundation_state || row.release_version || 'private_foundation_created'),
  };
}

function normalizePreferenceNumber(value, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(0, Math.min(100, Math.round(numeric)));
}

function normalizeResponseAudienceRules(value = {}) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function flattenResponseAudienceRules(rules = {}) {
  const normalizedRules = normalizeResponseAudienceRules(rules);
  return Object.entries(MODEL_RESPONSE_AUDIENCE_FIELDS).reduce((result, [field, path]) => {
    const [audience, key] = path;
    const fallback = MODEL_RESPONSE_AUDIENCE_DEFAULTS[field] ?? 50;
    result[field] = normalizePreferenceNumber(normalizedRules?.[audience]?.[key], fallback);
    return result;
  }, {});
}

function buildResponseAudienceRules(preferences = {}) {
  return Object.entries(MODEL_RESPONSE_AUDIENCE_FIELDS).reduce((rules, [field, path]) => {
    const [audience, key] = path;
    rules[audience] ||= {};
    rules[audience][key] = normalizePreferenceNumber(preferences[field], MODEL_RESPONSE_AUDIENCE_DEFAULTS[field] ?? 50);
    return rules;
  }, {});
}

function mapModelPersonalizationPreferences(row = {}) {
  if (!row || typeof row !== 'object') return null;

  const responseAudienceRules = normalizeResponseAudienceRules(row.response_audience_rules);

  return {
    languageStyle: normalizeString(row.language_style || 'balanced'),
    directnessLevel: normalizeString(row.directness_level || 'nuanced'),
    emotionalTone: normalizeString(row.emotional_tone || 'neutral'),
    responseLength: normalizeString(row.response_length || 'balanced'),
    explanationDepth: normalizeString(row.explanation_depth || 'standard'),
    memoryRetention: normalizeString(row.memory_retention || 'session'),
    continuityDepth: normalizeString(row.continuity_depth || 'moderate'),
    emotionalWeighting: normalizeString(row.emotional_weighting || 'balanced'),
    empathyLevel: normalizeString(row.empathy_level || 'moderate'),
    reflectionFrequency: normalizeString(row.reflection_frequency || 'never'),
    reflectionDepth: normalizeString(row.reflection_depth || 'moderate'),
    senseOfHumor: normalizePreferenceNumber(row.sense_of_humor, 50),
    efficiencyPreference: normalizePreferenceNumber(row.efficiency_preference, 50),
    creativityLevel: normalizePreferenceNumber(row.creativity_level, 50),
    riskTolerance: normalizePreferenceNumber(row.risk_tolerance, 25),
    responseAudienceRules,
    ...flattenResponseAudienceRules(responseAudienceRules),
  };
}

function normalizeVisibilityBoolean(value, fallback = false) {
  if (value === true || value === 'true' || value === 1 || value === '1') return true;
  if (value === false || value === 'false' || value === 0 || value === '0') return false;
  return fallback;
}

function mapModelVisibilityPreferences(row = {}, model = {}) {
  const publicVisible = normalizeVisibilityBoolean(
    row.public_visible,
    model.model_visibility === 'public' && model.publication_state === 'published'
  );

  return {
    visibilityScope: normalizeString(row.visibility_scope || 'general') || 'general',
    publicVisible,
    friendsVisible: normalizeVisibilityBoolean(row.friends_visible, publicVisible),
    followersVisible: normalizeVisibilityBoolean(row.followers_visible, publicVisible),
    mutualsVisible: normalizeVisibilityBoolean(row.mutuals_visible, publicVisible),
    familyVisible: normalizeVisibilityBoolean(row.family_visible, publicVisible),
    subscribersVisible: normalizeVisibilityBoolean(row.subscribers_visible, publicVisible),
    updatedAt: normalizeString(row.updated_at || model.updated_at || ''),
  };
}

function buildModelVisibilityPreferencesPayload(modelId, preferences = {}, model = {}) {
  const publicVisible = normalizeVisibilityBoolean(preferences.publicVisible, model.model_visibility === 'public');

  return {
    model_id: normalizeString(modelId),
    visibility_scope: normalizeString(preferences.visibilityScope || 'general') || 'general',
    public_visible: publicVisible,
    friends_visible: normalizeVisibilityBoolean(preferences.friendsVisible, publicVisible),
    followers_visible: normalizeVisibilityBoolean(preferences.followersVisible, publicVisible),
    mutuals_visible: normalizeVisibilityBoolean(preferences.mutualsVisible, publicVisible),
    family_visible: normalizeVisibilityBoolean(preferences.familyVisible, publicVisible),
    subscribers_visible: normalizeVisibilityBoolean(preferences.subscribersVisible, publicVisible),
    updated_at: new Date().toISOString(),
  };
}

function buildModelPersonalizationPreferencesPayload(modelId, preferences = {}) {
  return {
    model_id: normalizeString(modelId),
    language_style: normalizeString(preferences.languageStyle || 'balanced'),
    directness_level: normalizeString(preferences.directnessLevel || 'nuanced'),
    emotional_tone: normalizeString(preferences.emotionalTone || 'neutral'),
    response_length: normalizeString(preferences.responseLength || 'balanced'),
    explanation_depth: normalizeString(preferences.explanationDepth || 'standard'),
    memory_retention: normalizeString(preferences.memoryRetention || 'session'),
    continuity_depth: normalizeString(preferences.continuityDepth || 'moderate'),
    emotional_weighting: normalizeString(preferences.emotionalWeighting || 'balanced'),
    empathy_level: normalizeString(preferences.empathyLevel || 'moderate'),
    reflection_frequency: normalizeString(preferences.reflectionFrequency || 'never'),
    reflection_depth: normalizeString(preferences.reflectionDepth || 'moderate'),
    sense_of_humor: normalizePreferenceNumber(preferences.senseOfHumor, 50),
    efficiency_preference: normalizePreferenceNumber(preferences.efficiencyPreference, 50),
    creativity_level: normalizePreferenceNumber(preferences.creativityLevel, 50),
    risk_tolerance: normalizePreferenceNumber(preferences.riskTolerance, 25),
    response_audience_rules: buildResponseAudienceRules(preferences),
    updated_at: new Date().toISOString(),
  };
}

function normalizeDigitalBrainPreferenceNumber(value, fallback = 1, min = 0, max = 3) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return fallback;
  return Math.max(min, Math.min(max, Math.round(numericValue * 100) / 100));
}

function normalizeDigitalBrainPreferenceBoolean(value, fallback = true) {
  if (value === true || value === 'true' || value === 'visible' || value === 1 || value === '1') return true;
  if (value === false || value === 'false' || value === 'hidden' || value === 0 || value === '0') return false;
  return fallback;
}

function normalizeDigitalBrainMotionState(value = '') {
  const normalized = normalizeString(value).toLowerCase();
  return normalized === 'paused' ? 'paused' : 'playing';
}

function normalizeDigitalBrainDisplayMode(value = '') {
  const normalized = normalizeString(value).toLowerCase();
  if (normalized === 'scan') return 'scan';
  if (normalized === 'connectome') return 'connectome';
  return 'nodes';
}

function normalizeDigitalBrainMotionDirection(value = '') {
  const normalized = normalizeString(value).toLowerCase();
  return normalized === 'counterclockwise' ? 'counterclockwise' : 'clockwise';
}

function mapModelDigitalBrainPreferences(row = {}) {
  if (!row || typeof row !== 'object') return null;
  const payload = row.preferences_payload && typeof row.preferences_payload === 'object' ? row.preferences_payload : {};

  return {
    viewMode: normalizeString(row.view_mode || 'overview') || 'overview',
    displayMode: normalizeDigitalBrainDisplayMode(row.display_mode ?? payload.display_mode),
    motionState: normalizeDigitalBrainMotionState(row.motion_state),
    motionDirection: normalizeDigitalBrainMotionDirection(row.motion_direction ?? payload.motion_direction),
    constructNodesVisible: normalizeDigitalBrainPreferenceBoolean(row.construct_nodes_visible, true),
    constructLabelsVisible: normalizeDigitalBrainPreferenceBoolean(row.construct_labels_visible, true),
    nodeScale: normalizeDigitalBrainPreferenceNumber(row.node_scale, 1, 0, 1.4),
    connectionScale: normalizeDigitalBrainPreferenceNumber(row.connection_scale, 1, 0, 1),
    connectionVisibility: normalizeDigitalBrainPreferenceNumber(row.connection_visibility ?? payload.connection_visibility, 1, 0, 2.5),
    connectionPulse: normalizeDigitalBrainPreferenceNumber(row.connection_pulse ?? payload.connection_pulse, 1, 0, 2.5),
    regionOpacity: normalizeDigitalBrainPreferenceNumber(row.region_opacity, 1, 0, 1),
    labelScale: normalizeDigitalBrainPreferenceNumber(row.label_scale, 1, 0, 1.35),
    constructScale: normalizeDigitalBrainPreferenceNumber(row.construct_scale, 1, 0, 2.4),
    constructSpread: normalizeDigitalBrainPreferenceNumber(row.construct_spread, 1, 0, 1.65),
    signalIntensity: normalizeDigitalBrainPreferenceNumber(row.signal_intensity, 1, 0, 1.45),
    blurIntensity: normalizeDigitalBrainPreferenceNumber(row.blur_intensity ?? payload.blur_intensity, 1, 0, 2),
    motionSpeed: normalizeDigitalBrainPreferenceNumber(row.motion_speed ?? payload.motion_speed, 1, 0, 2.5),
    colorIntensity: normalizeDigitalBrainPreferenceNumber(row.color_intensity ?? payload.color_intensity, 1, 0, 1.6),
    zoomLevel: normalizeDigitalBrainPreferenceNumber(row.zoom_level, 1, 0.7, 2.4),
    rotateX: normalizeString(row.rotate_x || '0deg') || '0deg',
    rotateY: normalizeString(row.rotate_y || '0deg') || '0deg',
    focusLayer: normalizeString(row.focus_layer || ''),
    focusSignal: normalizeString(row.focus_signal || ''),
    focusAtlas: normalizeString(row.focus_atlas || ''),
    updatedAt: normalizeString(row.updated_at || ''),
  };
}

function buildModelDigitalBrainPreferencesPayload(model = {}, preferences = {}) {
  const modelId = normalizeString(model?.id || preferences.modelId || preferences.model_id || '');
  const constructNodesVisible = normalizeDigitalBrainPreferenceBoolean(preferences.constructNodesVisible, true);
  const constructLabelsVisible = normalizeDigitalBrainPreferenceBoolean(preferences.constructLabelsVisible, true);
  const displayMode = normalizeDigitalBrainDisplayMode(preferences.displayMode);
  const motionDirection = normalizeDigitalBrainMotionDirection(preferences.motionDirection);

  return {
    model_id: modelId,
    profile_id: normalizeString(model?.profile_id || preferences.profileId || preferences.profile_id || '') || null,
    view_mode: normalizeString(preferences.viewMode || 'overview') || 'overview',
    motion_state: normalizeDigitalBrainMotionState(preferences.motionState),
    construct_nodes_visible: constructNodesVisible,
    construct_labels_visible: constructLabelsVisible,
    node_scale: normalizeDigitalBrainPreferenceNumber(preferences.nodeScale, 1, 0, 1.4),
    connection_scale: normalizeDigitalBrainPreferenceNumber(preferences.connectionScale, 1, 0, 1),
    region_opacity: normalizeDigitalBrainPreferenceNumber(preferences.regionOpacity, 1, 0, 1),
    label_scale: normalizeDigitalBrainPreferenceNumber(preferences.labelScale, 1, 0, 1.35),
    construct_scale: normalizeDigitalBrainPreferenceNumber(preferences.constructScale, 1, 0, 2.4),
    construct_spread: normalizeDigitalBrainPreferenceNumber(preferences.constructSpread, 1, 0, 1.65),
    signal_intensity: normalizeDigitalBrainPreferenceNumber(preferences.signalIntensity, 1, 0, 1.45),
    zoom_level: normalizeDigitalBrainPreferenceNumber(preferences.zoomLevel, 1, 0.7, 2.4),
    rotate_x: normalizeString(preferences.rotateX || '0deg') || '0deg',
    rotate_y: normalizeString(preferences.rotateY || '0deg') || '0deg',
    focus_layer: normalizeString(preferences.focusLayer || ''),
    focus_signal: normalizeString(preferences.focusSignal || ''),
    focus_atlas: normalizeString(preferences.focusAtlas || ''),
    preferences_payload: {
      construct_nodes_visible: constructNodesVisible,
      construct_labels_visible: constructLabelsVisible,
      view_mode: normalizeString(preferences.viewMode || 'overview') || 'overview',
      display_mode: displayMode,
      motion_state: normalizeDigitalBrainMotionState(preferences.motionState),
      motion_direction: motionDirection,
      node_scale: normalizeDigitalBrainPreferenceNumber(preferences.nodeScale, 1, 0, 1.4),
      connection_scale: normalizeDigitalBrainPreferenceNumber(preferences.connectionScale, 1, 0, 1),
      connection_visibility: normalizeDigitalBrainPreferenceNumber(preferences.connectionVisibility, 1, 0, 2.5),
      connection_pulse: normalizeDigitalBrainPreferenceNumber(preferences.connectionPulse, 1, 0, 2.5),
      region_opacity: normalizeDigitalBrainPreferenceNumber(preferences.regionOpacity, 1, 0, 1),
      label_scale: normalizeDigitalBrainPreferenceNumber(preferences.labelScale, 1, 0, 1.35),
      construct_scale: normalizeDigitalBrainPreferenceNumber(preferences.constructScale, 1, 0, 2.4),
      construct_spread: normalizeDigitalBrainPreferenceNumber(preferences.constructSpread, 1, 0, 1.65),
      signal_intensity: normalizeDigitalBrainPreferenceNumber(preferences.signalIntensity, 1, 0, 1.45),
      blur_intensity: normalizeDigitalBrainPreferenceNumber(preferences.blurIntensity, 1, 0, 2),
      motion_speed: normalizeDigitalBrainPreferenceNumber(preferences.motionSpeed, 1, 0, 2.5),
      color_intensity: normalizeDigitalBrainPreferenceNumber(preferences.colorIntensity, 1, 0, 1.6),
      zoom_level: normalizeDigitalBrainPreferenceNumber(preferences.zoomLevel, 1, 0.7, 2.4),
      rotate_x: normalizeString(preferences.rotateX || '0deg') || '0deg',
      rotate_y: normalizeString(preferences.rotateY || '0deg') || '0deg',
      focus_layer: normalizeString(preferences.focusLayer || ''),
      focus_signal: normalizeString(preferences.focusSignal || ''),
      focus_atlas: normalizeString(preferences.focusAtlas || ''),
    },
    updated_at: new Date().toISOString(),
  };
}

function buildModelFoundationSerial(modelId = '') {
  const normalizedModelId = normalizeString(modelId);
  const serialSeed = normalizedModelId ? normalizedModelId.slice(0, 8).toUpperCase() : 'PENDING';
  return `NA-MODEL-${serialSeed}`;
}

function resolveModelIdentityDisplayName(values = {}, model = {}) {
  return normalizeString(
    values.modelNickname
    || values.model_nickname
    || values.nickname
    || values.private_name
    || model.model_name
    || model.display_name
    || model.creator_display_name
    || 'Canonical personal model'
  );
}

function getChangedModelFields(before = {}, after = {}, labels = {}) {
  return Object.keys(labels).filter((field) => {
    const beforeValue = before?.[field];
    const afterValue = after?.[field];
    if (typeof beforeValue === 'number' || typeof afterValue === 'number') {
      return Number(beforeValue ?? 0) !== Number(afterValue ?? 0);
    }
    return normalizeString(beforeValue ?? '') !== normalizeString(afterValue ?? '');
  });
}

async function recordChangedModelFields(model = {}, changedFields = [], labels = {}, options = {}) {
  await Promise.all(changedFields.map((field) => {
    const label = labels[field];
    if (!label) return null;

    return recordModelChangelogEvent(model, {
      area: options.area,
      action: `${field}_changed`,
      title: `${label} changed`,
      detail: `${label} was updated.`,
      metadata: {
        changed_field: field,
        changed_field_label: label,
      },
    });
  }));
}

async function recordModelChangelogEvent(model = {}, event = {}) {
  if (!event?.title) return null;
  return recordProfileChangelogEvent({
    ...event,
    profile_id: normalizeString(model.profile_id || ''),
    metadata: {
      model_id: normalizeString(model.id || ''),
      ...(event.metadata || {}),
    },
  });
}

function dispatchModelProjectionUpdated(modelId) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('neuroartan:model-public-registry-invalidated', {
    detail: {
      modelId: normalizeString(modelId)
    }
  }));
}

function mapModelFoundationIdentity(records = {}, model = {}) {
  if (!model || typeof model !== 'object') return null;

  const privateIdentity = records.privateIdentity || {};
  const identityRegistry = records.identityRegistry || {};
  const publicIdentity = records.publicIdentity || {};
  const birthCertificate = records.birthCertificate || {};
  const lifecycle = records.lifecycle || {};
  const dignitySecurity = records.dignitySecurity || {};
  const modelId = normalizeString(model.id || privateIdentity.model_id || identityRegistry.model_id || birthCertificate.model_id || '');
  const publicDisplayName = normalizeString(publicIdentity.public_display_name || publicIdentity.display_name || '');
  return {
    modelId,
    modelNickname: normalizeString(privateIdentity.private_name || publicDisplayName || model.model_name || model.display_name || 'Canonical personal model'),
    modelPurposeDescription: normalizeString(model.description || ''),
    privateNotes: normalizeString(privateIdentity.private_notes || ''),
    registryId: normalizeString(identityRegistry.id || 'Registry record pending'),
    privateSerialIdentity: normalizeString(privateIdentity.id || model.private_identity_id || buildModelFoundationSerial(modelId)),
    publicSerialIdentity: normalizeString(publicIdentity.id || 'Public identity not enabled'),
    birthCertificateId: normalizeString(birthCertificate.id || model.birth_certificate_id || 'Birth record pending'),
    birthDate: normalizeString(birthCertificate.created_at || model.created_at || ''),
    modelType: 'Personal',
    lifecycleState: normalizeString(lifecycle.current_state || model.lifecycle_state || 'created'),
    readinessState: normalizeString(model.readiness_state || 'uninitialized'),
    verificationState: normalizeString(model.verification_state || 'unverified'),
    discoverabilityState: normalizeString(identityRegistry.discoverability_state || model.publication_state || 'unpublished'),
    privacyLockState: normalizeString(dignitySecurity.identity_protection_state || 'private_owner_controlled'),
    createdAt: normalizeString(model.created_at || ''),
    updatedAt: normalizeString(privateIdentity.updated_at || model.updated_at || ''),
    ownerRecordPolicy: normalizeString(privateIdentity.owner_visibility || 'owner_only'),
    modelAvatar: normalizeString(model.model_image_url || ''),
  };
}

function buildModelFoundationPrivateIdentityPayload(modelId, values = {}, model = {}) {
  const normalizedModelId = normalizeString(modelId);
  return {
    model_id: normalizedModelId,
    profile_id: normalizeString(model.profile_id || '') || undefined,
    private_identity_state: 'active',
    private_name: resolveModelIdentityDisplayName(values, model),
    private_notes: normalizeString(values.privateNotes || values.private_notes || ''),
    owner_visibility: 'owner_only',
    source_boundary: 'private_foundation_only',
    updated_at: new Date().toISOString(),
  };
}

async function upsertModelPrivateIdentity(supabase, payload = {}) {
  const tryUpsert = async (nextPayload) => {
    const compactPayload = Object.fromEntries(
      Object.entries(nextPayload).filter(([, value]) => value !== undefined)
    );
    return supabase
      .from(MODEL_FOUNDATION_TABLES.privateIdentities)
      .upsert(compactPayload, { onConflict: 'model_id' })
      .select('id')
      .maybeSingle();
  };

  const result = await tryUpsert(payload);
  if (!result.error || !isSupabaseColumnMissingError(result.error)) {
    return result;
  }

  const compatibilityPayload = { ...payload };
  delete compatibilityPayload.profile_id;
  return tryUpsert(compatibilityPayload);
}

async function upsertModelPublicIdentityProjection(supabase, payload = {}) {
  const tryUpsert = async (nextPayload) => {
    const compactPayload = Object.fromEntries(
      Object.entries(nextPayload).filter(([, value]) => value !== undefined)
    );
    return supabase
      .from(MODEL_FOUNDATION_TABLES.publicIdentities)
      .upsert(compactPayload, { onConflict: 'model_id' });
  };

  const { error } = await tryUpsert(payload);

  if (!error || isSupabaseRelationMissingError(error)) {
    return error || null;
  }

  if (!isSupabaseColumnMissingError(error)) {
    throw error;
  }

  const canonicalPayload = {
    model_id: payload.model_id,
    profile_id: payload.profile_id,
    public_display_name: payload.public_display_name,
    public_slug: payload.public_slug,
    public_description: payload.public_description,
    public_avatar_url: payload.public_avatar_url,
    public_visibility: payload.public_visibility,
    public_identity_state: payload.public_identity_state,
    updated_at: payload.updated_at,
  };

  const { error: canonicalError } = await tryUpsert(canonicalPayload);

  if (!canonicalError || isSupabaseRelationMissingError(canonicalError)) {
    return canonicalError || null;
  }

  if (!isSupabaseColumnMissingError(canonicalError)) {
    throw canonicalError;
  }

  const legacyPayload = {
    model_id: payload.model_id,
    profile_id: payload.profile_id,
    display_name: payload.public_display_name || payload.display_name,
    public_slug: payload.public_slug,
    public_description: payload.public_description,
    public_avatar_url: payload.public_avatar_url,
    public_visibility_state: payload.public_visibility || payload.public_visibility_state,
    public_profile_enabled: payload.public_visibility === 'public',
    updated_at: payload.updated_at,
  };

  const { error: legacyError } = await tryUpsert(legacyPayload);

  if (legacyError && !isSupabaseRelationMissingError(legacyError)) {
    throw legacyError;
  }

  return legacyError || null;
}

/* =============================================================================
   06) PROFILE HELPERS
============================================================================= */
export async function getCurrentCanonicalProfile() {
  const user = await getCurrentSupabaseUser();
  const userId = getUserId(user);
  if (!userId) return null;

  const profile = await getSupabaseProfileByAuthUserId({
    authUserId: userId,
  });

  return isUsableModelOwnerProfile(profile) ? profile : null;
}

async function getCurrentModelOwnerProfile() {
  const user = await getCurrentSupabaseUser();
  const userId = getUserId(user);
  if (!userId) return null;

  const profile = await getSupabaseProfileByAuthUserId({
    authUserId: userId,
  });

  return isUsableModelOwnerProfile(profile, { requireComplete:false }) ? profile : null;
}

function isUsableModelOwnerProfile(profile = null, options = {}) {
  if (!profile) return null;

  const profileExists = profile.profile_exists === true;
  const username = normalizeUsername(profile.username || profile.username_lower || profile.public_username || '');

  if (!profileExists || !username) return false;
  if (options.requireComplete === false) return true;

  return isCanonicalProfileComplete(profile);
}

function isCanonicalProfileComplete(profile = null) {
  if (!profile) return false;
  if (profile.profile_complete === true) return true;

  const missingFields = Array.isArray(profile.missing_required_fields)
    ? profile.missing_required_fields.map((field) => normalizeString(field)).filter(Boolean)
    : [];

  if (missingFields.length > 0) return false;

  return REQUIRED_PROFILE_FIELDS.every((field) => {
    if (field === 'username') {
      return normalizeString(profile.username || profile.username_lower || profile.username_normalized || profile.public_username || '');
    }

    if (field === 'date_of_birth') {
      return normalizeString(profile.date_of_birth || profile.birth_date || '');
    }

    return normalizeString(profile[field] || '');
  });
}

/* =============================================================================
   07) MODEL READ HELPERS
============================================================================= */
export async function getModelBySlug(modelSlug) {
  const supabase = getSupabaseClient();
  const normalizedSlug = buildModelSlug(modelSlug);
  if (!supabase || !normalizedSlug) return null;

  const { data, error } = await supabase
    .from(MODELS_TABLE)
    .select(MODEL_SELECT_FIELDS)
    .eq('slug', normalizedSlug)
    .maybeSingle();

  if (error) {
    if (isSupabaseRelationMissingError(error)) return null;
    throw error;
  }

  return mapSupabaseModel(data);
}

export async function listOwnedModels() {
  const supabase = await resolveSupabaseClient();
  const profile = await getCurrentModelOwnerProfile();

  if (!supabase || !profile?.id) {
    return [];
  }

  const { data, error } = await supabase
    .from(MODELS_TABLE)
    .select(MODEL_SELECT_FIELDS)
    .eq('profile_id', profile.id)
    .order('updated_at', { ascending: false });

  if (error) {
    if (isSupabaseRelationMissingError(error)) return [];
    throw error;
  }

  return Array.isArray(data) ? data.map(mapSupabaseModel).filter(Boolean) : [];
}

export async function getOwnedCanonicalModel() {
  const supabase = await resolveSupabaseClient();
  const user = await getCurrentSupabaseUser();
  const userId = getUserId(user);

  if (supabase && userId) {
    const { data, error } = await supabase
      .from(ACTIVE_MODEL_PREFERENCES_TABLE)
      .select('model_id')
      .eq('auth_user_id', userId)
      .maybeSingle();

    if (error && !isSupabaseRelationMissingError(error)) throw error;

    const activeModel = data?.model_id
      ? await getModelById(data.model_id)
      : null;

    if (activeModel?.id) return activeModel;
  }

  const ownedModels = await listOwnedModels();
  return ownedModels[0] || null;
}

async function setOwnedCanonicalModelActivePreference(supabase, model, profile, source = 'profile_birth') {
  const ownerAuthUserId = normalizeString(model?.owner_auth_user_id || profile?.auth_user_id || '');
  const profileId = normalizeString(model?.profile_id || profile?.id || '');
  const modelId = normalizeString(model?.id || '');

  if (!supabase || !ownerAuthUserId || !profileId || !modelId) {
    return model;
  }

  const { error } = await supabase
    .from(ACTIVE_MODEL_PREFERENCES_TABLE)
    .upsert({
      auth_user_id: ownerAuthUserId,
      profile_id: profileId,
      model_id: modelId,
      source: normalizeString(source || 'profile_birth'),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'auth_user_id' });

  if (error) throw error;
  return model;
}

export async function ensureOwnedCanonicalModel(values = {}) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    const error = new Error('MODEL_BACKEND_UNAVAILABLE');
    error.code = 'MODEL_BACKEND_UNAVAILABLE';
    throw error;
  }

  const profile = await getCurrentCanonicalProfile();
  if (!profile?.id) {
    const error = new Error('PROFILE_COMPLETE_REQUIRED');
    error.code = 'PROFILE_COMPLETE_REQUIRED';
    throw error;
  }

  const existingModel = await getOwnedCanonicalModel();
  if (existingModel?.id) {
    return setOwnedCanonicalModelActivePreference(supabase, existingModel, profile, 'profile_reconciliation');
  }

  const username = normalizeUsername(
    values.model_slug
    || values.slug
    || profile.username
    || profile.username_lower
    || profile.username_normalized
    || profile.public_username
    || ''
  );
  const displayName = normalizeString(
    values.model_name
    || values.name
    || profile.display_name
    || profile.public_display_name
    || [profile.first_name, profile.last_name].filter(Boolean).join(' ')
    || username
  );

  try {
    const model = await createOwnedModel({
      ...values,
      slug: username,
      model_name: displayName,
      creator_display_name: displayName,
      creator_username: username,
    });

    return setOwnedCanonicalModelActivePreference(supabase, model, profile, 'profile_birth');
  } catch (error) {
    if (normalizeString(error?.code || error?.message) !== 'CANONICAL_MODEL_ALREADY_EXISTS') {
      throw error;
    }

    const model = await getOwnedCanonicalModel();
    return setOwnedCanonicalModelActivePreference(supabase, model, profile, 'profile_reconciliation');
  }
}

export async function readModelPersonalizationPreferences(modelId) {
  const supabase = await resolveSupabaseClient();
  const normalizedModelId = normalizeString(modelId);
  if (!supabase || !normalizedModelId) return null;

  const { data, error } = await supabase
    .from(MODEL_PERSONALIZATION_PREFERENCES_TABLE)
    .select('*')
    .eq('model_id', normalizedModelId)
    .maybeSingle();

  if (error) {
    if (isSupabaseRelationMissingError(error)) return null;
    throw error;
  }

  return mapModelPersonalizationPreferences(data);
}

export async function listModelDefaultRegistry(options = {}) {
  const supabase = await resolveSupabaseClient();
  if (!supabase) return [];

  let query = supabase
    .from(MODEL_DEFAULT_REGISTRY_TABLE)
    .select('*')
    .eq('active', true)
    .order('pane', { ascending: true })
    .order('section', { ascending: true })
    .order('field', { ascending: true });

  const area = normalizeString(options.area || '');
  const pane = normalizeString(options.pane || '');
  const section = normalizeString(options.section || '');
  const field = normalizeString(options.field || '');

  if (area) query = query.eq('area', area);
  if (pane && pane !== 'all') query = query.eq('pane', pane);
  if (section && section !== 'all') query = query.eq('section', section);
  if (field && field !== 'all') query = query.eq('field', field);

  const { data, error } = await query;

  if (error) {
    if (isSupabaseRelationMissingError(error)) return [];
    throw error;
  }

  return Array.isArray(data) ? data : [];
}

export async function listModelChangelogEvents(modelId, filters = {}) {
  const supabase = await resolveSupabaseClient();
  const normalizedModelId = normalizeString(modelId);
  if (!supabase || !normalizedModelId) return [];

  let query = supabase
    .from(MODEL_CHANGELOG_EVENTS_TABLE)
    .select('*')
    .eq('model_id', normalizedModelId)
    .order('created_at', { ascending: false });

  const area = normalizeString(filters.area || '');
  const pane = normalizeString(filters.pane || '');
  const section = normalizeString(filters.section || '');
  const field = normalizeString(filters.field || '');
  const action = normalizeString(filters.action || '');

  if (area && area !== 'model' && area !== 'all') query = query.eq('area', area);
  if (pane && pane !== 'all') query = query.eq('pane', pane);
  if (section && section !== 'all') query = query.eq('section', section);
  if (field && field !== 'all') query = query.eq('field', field);
  if (action && action !== 'all') query = query.eq('action', action);

  const { data, error } = await query;

  if (error) {
    if (isSupabaseRelationMissingError(error)) return [];
    throw error;
  }

  return Array.isArray(data) ? data : [];
}

export async function listModelPrivacySourceRecords(modelId, filters = {}) {
  const supabase = await resolveSupabaseClient();
  const normalizedModelId = normalizeString(modelId);
  if (!supabase || !normalizedModelId) return [];

  let query = supabase
    .from(PRIVACY_SOURCE_REGISTRY_TABLE)
    .select('*')
    .eq('model_id', normalizedModelId)
    .order('updated_at', { ascending: false });

  const classification = normalizeString(filters.classification || '');
  const storageLocation = normalizeString(filters.storageLocation || filters.storage_location || '');
  const processingDepth = normalizeString(filters.processingDepth || filters.processing_depth || '');
  const consentState = normalizeString(filters.consentState || filters.consent_state || '');

  if (classification && classification !== 'all') query = query.eq('classification', classification);
  if (storageLocation && storageLocation !== 'all') query = query.eq('storage_location', storageLocation);
  if (processingDepth && processingDepth !== 'all') query = query.eq('processing_depth', processingDepth);
  if (consentState && consentState !== 'all') query = query.eq('consent_state', consentState);

  const { data, error } = await query;

  if (error) {
    if (isSupabaseRelationMissingError(error)) return [];
    throw error;
  }

  return Array.isArray(data) ? data : [];
}

export async function listModelPrivacyConsentRecords(modelId, filters = {}) {
  const supabase = await resolveSupabaseClient();
  const normalizedModelId = normalizeString(modelId);
  if (!supabase || !normalizedModelId) return [];

  let query = supabase
    .from(PRIVACY_CONSENT_LEDGER_TABLE)
    .select('*')
    .eq('model_id', normalizedModelId)
    .order('updated_at', { ascending: false });

  const consentScope = normalizeString(filters.consentScope || filters.consent_scope || '');
  const consentState = normalizeString(filters.consentState || filters.consent_state || '');

  if (consentScope && consentScope !== 'all') query = query.eq('consent_scope', consentScope);
  if (consentState && consentState !== 'all') query = query.eq('consent_state', consentState);

  const { data, error } = await query;

  if (error) {
    if (isSupabaseRelationMissingError(error)) return [];
    throw error;
  }

  return Array.isArray(data) ? data : [];
}

export async function listModelPrivacyProcessingRecords(modelId, filters = {}) {
  const supabase = await resolveSupabaseClient();
  const normalizedModelId = normalizeString(modelId);
  if (!supabase || !normalizedModelId) return [];

  let query = supabase
    .from(PRIVACY_PROCESSING_LEDGER_TABLE)
    .select('*')
    .eq('model_id', normalizedModelId)
    .order('updated_at', { ascending: false });

  const processingType = normalizeString(filters.processingType || filters.processing_type || '');
  const jobState = normalizeString(filters.jobState || filters.job_state || '');

  if (processingType && processingType !== 'all') query = query.eq('processing_type', processingType);
  if (jobState && jobState !== 'all') query = query.eq('job_state', jobState);

  const { data, error } = await query;

  if (error) {
    if (isSupabaseRelationMissingError(error)) return [];
    throw error;
  }

  return Array.isArray(data) ? data : [];
}

export async function listModelPrivacyGovernanceSnapshot(modelId) {
  const normalizedModelId = normalizeString(modelId);
  if (!normalizedModelId) {
    return {
      sources: [],
      consent: [],
      processing: [],
    };
  }

  const [sources, consent, processing] = await Promise.all([
    listModelPrivacySourceRecords(normalizedModelId),
    listModelPrivacyConsentRecords(normalizedModelId),
    listModelPrivacyProcessingRecords(normalizedModelId),
  ]);

  return {
    sources,
    consent,
    processing,
  };
}

export async function readUserPermissionState() {
  const supabase = await resolveSupabaseClient();
  const user = await getCurrentSupabaseUser();
  const userId = getUserId(user);

  if (!supabase || !userId) return {};

  const { data, error } = await supabase
    .from(PRIVACY_PERMISSION_STATE_TABLE)
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) {
    if (isSupabaseRelationMissingError(error)) return {};
    throw error;
  }

  return (Array.isArray(data) ? data : []).reduce((state, row) => {
    const key = normalizeString(row.permission_key || '');
    if (!key || state[key]) return state;
    state[key] = {
      state: normalizeString(row.permission_state || ''),
      runtime: normalizeString(row.runtime || ''),
      source: normalizeString(row.source || ''),
      scopeName: normalizeString(row.scope_name || ''),
      metadata: row.metadata || {},
      updatedAt: normalizeString(row.updated_at || ''),
    };
    return state;
  }, {});
}

export async function saveUserPermissionState(permissionKey, values = {}) {
  const supabase = await resolveSupabaseClient();
  const user = await getCurrentSupabaseUser();
  const userId = getUserId(user);
  const key = normalizeString(permissionKey || values.permission_key || values.key || '');

  if (!supabase || !userId || !key) return null;

  const profile = await getCurrentModelOwnerProfile().catch(() => null);
  const now = new Date().toISOString();
  const payload = {
    user_id: userId,
    profile_id: normalizeString(profile?.id || '') || null,
    permission_key: key,
    permission_state: normalizeString(values.state || values.permission_state || 'granted'),
    runtime: normalizeString(values.runtime || 'browser'),
    source: normalizeString(values.source || 'settings-permissions'),
    scope_name: normalizeString(values.scopeName || values.scope_name || ''),
    metadata: values.metadata && typeof values.metadata === 'object' ? values.metadata : {},
    updated_at: now,
  };

  const { data, error } = await supabase
    .from(PRIVACY_PERMISSION_STATE_TABLE)
    .upsert(payload, { onConflict: 'user_id,permission_key' })
    .select('*')
    .maybeSingle();

  if (error) {
    if (isSupabaseRelationMissingError(error)) return null;
    throw error;
  }

  return data || payload;
}

export async function readUserConnectorState() {
  const supabase = await resolveSupabaseClient();
  const user = await getCurrentSupabaseUser();
  const userId = getUserId(user);

  if (!supabase || !userId) return {};

  const { data, error } = await supabase
    .from(PRIVACY_CONNECTOR_STATE_TABLE)
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) {
    if (isSupabaseRelationMissingError(error)) return {};
    throw error;
  }

  return (Array.isArray(data) ? data : []).reduce((state, row) => {
    const service = normalizeString(row.connector_service || '');
    if (!service || state[service]) return state;
    state[service] = {
      service,
      label: normalizeString(row.connector_label || ''),
      category: normalizeString(row.connector_category || ''),
      runtime: normalizeString(row.runtime || ''),
      connectionState: normalizeString(row.connection_state || 'not-connected'),
      sourceVaultReady: row.source_vault_ready === true,
      metadata: row.metadata || {},
      updatedAt: normalizeString(row.updated_at || ''),
    };
    return state;
  }, {});
}

export async function saveUserConnectorState(connectorService, values = {}) {
  const supabase = await resolveSupabaseClient();
  const user = await getCurrentSupabaseUser();
  const userId = getUserId(user);
  const service = normalizeString(connectorService || values.connector_service || values.service || '');

  if (!supabase || !userId || !service) return null;

  const profile = await getCurrentModelOwnerProfile().catch(() => null);
  const now = new Date().toISOString();
  const payload = {
    user_id: userId,
    profile_id: normalizeString(profile?.id || '') || null,
    connector_service: service,
    connector_label: normalizeString(values.label || values.connector_label || service),
    connector_category: normalizeString(values.category || values.connector_category || 'general'),
    runtime: normalizeString(values.runtime || 'not-configured'),
    connection_state: normalizeString(values.connectionState || values.connection_state || 'not-connected'),
    source_vault_ready: values.sourceVaultReady === true || values.source_vault_ready === true,
    metadata: values.metadata && typeof values.metadata === 'object' ? values.metadata : {},
    updated_at: now,
  };

  const { data, error } = await supabase
    .from(PRIVACY_CONNECTOR_STATE_TABLE)
    .upsert(payload, { onConflict: 'user_id,connector_service' })
    .select('*')
    .maybeSingle();

  if (error) {
    if (isSupabaseRelationMissingError(error)) return null;
    throw error;
  }

  return data || payload;
}

export async function recordModelAuditEvent(model = {}, event = {}) {
  const supabase = await resolveSupabaseClient();
  const modelId = normalizeString(model?.id || event.model_id || event.modelId || '');
  const currentProfile = normalizeString(model?.profile_id || event.profile_id || event.profileId || '')
    ? null
    : await getCurrentModelOwnerProfile();
  const profileId = normalizeString(model?.profile_id || event.profile_id || event.profileId || currentProfile?.id || '');

  if (!supabase || !modelId || !profileId || !event?.field) {
    console.warn('[Neuroartan][Model] Audit event skipped.', {
      hasSupabase: Boolean(supabase),
      modelId,
      profileId,
      field: event?.field || ''
    });
    return null;
  }

  const payload = {
    model_id: modelId,
    profile_id: profileId,
    area: normalizeString(event.area || 'personalization'),
    pane: normalizeString(event.pane || 'all'),
    section: normalizeString(event.section || 'all'),
    field: normalizeString(event.field || ''),
    label: normalizeString(event.label || event.field || 'Model field'),
    action: normalizeString(event.action || 'change'),
    value_from: event.from == null ? null : String(event.from),
    value_to: event.to == null ? null : String(event.to),
    source: normalizeString(event.source || 'model_personalization'),
  };

  const { data, error } = await supabase
    .from(MODEL_CHANGELOG_EVENTS_TABLE)
    .insert(payload)
    .select('*')
    .maybeSingle();

  if (error) {
    if (isSupabaseRelationMissingError(error)) return null;
    console.warn('[Neuroartan][Model] Audit event insert failed.', error);
    throw error;
  }

  return data || null;
}

export async function saveModelSourceCalibrationResult(model = {}, calibration = {}) {
  const supabase = await resolveSupabaseClient();
  const modelId = normalizeString(model?.id || calibration.model_id || calibration.modelId || '');
  const currentProfile = normalizeString(model?.profile_id || calibration.profile_id || calibration.profileId || '')
    ? null
    : await getCurrentModelOwnerProfile();
  const profileId = normalizeString(model?.profile_id || calibration.profile_id || calibration.profileId || currentProfile?.id || '');

  if (!supabase || !modelId || !profileId || !calibration?.result) {
    console.warn('[Neuroartan][Model] Source Calibration save skipped.', {
      hasSupabase: Boolean(supabase),
      modelId,
      profileId,
      hasResult: Boolean(calibration?.result),
    });
    return null;
  }

  const result = calibration.result || {};
  const sourceProfile = {
    cognitive_orientation_index: result.cognitive_orientation_index ?? null,
    dominant_orientation: normalizeString(result.dominant_orientation || ''),
    source_readiness: normalizeString(result.source_readiness || ''),
    dimension_outputs: result.dimension_outputs || {},
  };

  const { data: session, error: sessionError } = await supabase
    .from(MODEL_SOURCE_CALIBRATION_SESSIONS_TABLE)
    .insert({
      model_id: modelId,
      profile_id: profileId,
      session_status: 'completed',
      calibration_version: normalizeString(calibration.calibration_version || result.version || '0.1.0'),
      question_version: normalizeString(calibration.question_version || calibration.questions?.version || '0.1.0'),
      scale_version: normalizeString(calibration.scale_version || calibration.scale?.version || '0.1.0'),
      results_version: normalizeString(calibration.results_version || calibration.results?.version || '0.1.0'),
      source_profile: sourceProfile,
      cognitive_orientation_index: result.cognitive_orientation_index ?? null,
      dominant_orientation: normalizeString(result.dominant_orientation || ''),
      source_readiness: normalizeString(result.source_readiness || ''),
      consent_state: normalizeString(calibration.consent_state || 'source_calibration_completed'),
      completed_at: result.completed_at || new Date().toISOString(),
    })
    .select('*')
    .maybeSingle();

  if (sessionError) {
    if (isSupabaseRelationMissingError(sessionError)) return null;
    console.warn('[Neuroartan][Model] Source Calibration session insert failed.', sessionError);
    throw sessionError;
  }

  const sessionId = normalizeString(session?.id || '');
  if (!sessionId) return null;

  const questions = Array.isArray(calibration.questions?.questions)
    ? calibration.questions.questions
    : Array.isArray(calibration.questions)
      ? calibration.questions
      : [];
  const answers = calibration.answers || {};
  const answerPayload = questions
    .filter((question) => answers[question.id] !== undefined)
    .map((question) => {
      const answerValue = normalizeSourceCalibrationNumber(answers[question.id]);
      return {
        session_id: sessionId,
        model_id: modelId,
        profile_id: profileId,
        question_id: normalizeString(question.id || ''),
        construct: normalizeString(question.construct || ''),
        dimension: normalizeString(question.dimension || ''),
        orientation_band: normalizeString(question.orientation_band || ''),
        answer_value: answerValue,
        scored_value: question.reverse_scored ? 10 - answerValue : answerValue,
        reverse_scored: question.reverse_scored === true,
        weight: Number(question.weight || 1),
        question_text: normalizeString(question.text || ''),
      };
    });

  if (answerPayload.length) {
    const { error: answersError } = await supabase
      .from(MODEL_SOURCE_CALIBRATION_ANSWERS_TABLE)
      .insert(answerPayload);

    if (answersError) {
      if (!isSupabaseRelationMissingError(answersError)) {
        console.warn('[Neuroartan][Model] Source Calibration answers insert failed.', answersError);
        throw answersError;
      }
    }
  }

  const { data: savedResult, error: resultError } = await supabase
    .from(MODEL_SOURCE_CALIBRATION_RESULTS_TABLE)
    .insert({
      session_id: sessionId,
      model_id: modelId,
      profile_id: profileId,
      cognitive_orientation_index: result.cognitive_orientation_index ?? 0,
      dominant_orientation: normalizeString(result.dominant_orientation || ''),
      source_readiness: normalizeString(result.source_readiness || ''),
      orientation_scores: result.orientation_scores || {},
      construct_scores: result.construct_scores || {},
      dimension_scores: result.dimension_scores || {},
      dimension_outputs: result.dimension_outputs || {},
      source_readiness_summary: normalizeString(result.source_readiness_summary || ''),
      result_payload: result,
    })
    .select('*')
    .maybeSingle();

  if (resultError) {
    if (isSupabaseRelationMissingError(resultError)) return { session, result: null };
    console.warn('[Neuroartan][Model] Source Calibration result insert failed.', resultError);
    throw resultError;
  }

  await recordModelAuditEvent({ id: modelId, profile_id: profileId }, {
    area: 'foundation',
    pane: 'sources',
    section: 'source_calibration',
    field: 'source_profile',
    label: 'Source Profile',
    action: 'source_calibration_completed',
    from: null,
    to: result.source_readiness || '',
    source: 'source_calibration',
  });

  return {
    session,
    result: savedResult || null,
    answers: answerPayload,
  };
}

export async function readLatestModelSourceCalibrationResult(modelId) {
  const supabase = await resolveSupabaseClient();
  const normalizedModelId = normalizeString(modelId);
  if (!supabase || !normalizedModelId) return null;

  const { data, error } = await supabase
    .from(MODEL_SOURCE_CALIBRATION_RESULTS_TABLE)
    .select('*, model_source_calibration_sessions(*)')
    .eq('model_id', normalizedModelId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (isSupabaseRelationMissingError(error)) return null;
    throw error;
  }

  return data || null;
}

export async function saveModelPersonalityCalibrationResult(model = {}, calibration = {}) {
  const supabase = await resolveSupabaseClient();
  const modelId = normalizeString(model?.id || calibration.model_id || calibration.modelId || '');
  const currentProfile = normalizeString(model?.profile_id || calibration.profile_id || calibration.profileId || '')
    ? null
    : await getCurrentModelOwnerProfile();
  const profileId = normalizeString(model?.profile_id || calibration.profile_id || calibration.profileId || currentProfile?.id || '');

  if (!supabase || !modelId || !profileId || !calibration?.result) {
    console.warn('[Neuroartan][Model] Personality Calibration save skipped.', {
      hasSupabase: Boolean(supabase),
      modelId,
      profileId,
      hasResult: Boolean(calibration?.result),
    });
    return null;
  }

  const result = calibration.result || {};
  const personalityProfile = {
    personality_coherence_index: result.personality_coherence_index ?? null,
    dominant_personality_pattern: normalizeString(result.dominant_personality_pattern || ''),
    personality_readiness: normalizeString(result.personality_readiness || ''),
    summary_metrics: result.summary_metrics || {},
  };

  const { data: session, error: sessionError } = await supabase
    .from(MODEL_PERSONALITY_CALIBRATION_SESSIONS_TABLE)
    .insert({
      model_id: modelId,
      profile_id: profileId,
      session_status: 'completed',
      calibration_version: normalizeString(calibration.calibration_version || result.version || '0.1.0'),
      question_version: normalizeString(calibration.question_version || calibration.questions?.version || '0.1.0'),
      scale_version: normalizeString(calibration.scale_version || calibration.scale?.version || '0.1.0'),
      results_version: normalizeString(calibration.results_version || calibration.results?.version || '0.1.0'),
      personality_profile: personalityProfile,
      personality_coherence_index: result.personality_coherence_index ?? null,
      dominant_personality_pattern: normalizeString(result.dominant_personality_pattern || ''),
      personality_readiness: normalizeString(result.personality_readiness || ''),
      consent_state: normalizeString(calibration.consent_state || 'personality_calibration_completed'),
      completed_at: result.completed_at || new Date().toISOString(),
    })
    .select('*')
    .maybeSingle();

  if (sessionError) {
    if (isSupabaseRelationMissingError(sessionError)) return null;
    console.warn('[Neuroartan][Model] Personality Calibration session insert failed.', sessionError);
    throw sessionError;
  }

  const sessionId = normalizeString(session?.id || '');
  if (!sessionId) return null;

  const questions = Array.isArray(calibration.questions?.questions)
    ? calibration.questions.questions
    : Array.isArray(calibration.questions)
      ? calibration.questions
      : [];
  const answers = calibration.answers || {};
  const answerPayload = questions
    .filter((question) => answers[question.id] !== undefined)
    .map((question) => {
      const answerValue = normalizePersonalityCalibrationNumber(answers[question.id]);
      return {
        session_id: sessionId,
        model_id: modelId,
        profile_id: profileId,
        question_id: normalizeString(question.id || ''),
        dimension: normalizeString(question.dimension || ''),
        construct: normalizeString(question.construct || ''),
        answer_value: answerValue,
        scored_value: question.reverse_scored ? 10 - answerValue : answerValue,
        reverse_scored: question.reverse_scored === true,
        weight: Number(question.weight || 1),
        question_text: normalizeString(question.text || question.displayText || ''),
      };
    });

  if (answerPayload.length) {
    const { error: answersError } = await supabase
      .from(MODEL_PERSONALITY_CALIBRATION_ANSWERS_TABLE)
      .insert(answerPayload);

    if (answersError) {
      if (!isSupabaseRelationMissingError(answersError)) {
        console.warn('[Neuroartan][Model] Personality Calibration answers insert failed.', answersError);
        throw answersError;
      }
    }
  }

  const { data: savedResult, error: resultError } = await supabase
    .from(MODEL_PERSONALITY_CALIBRATION_RESULTS_TABLE)
    .insert({
      session_id: sessionId,
      model_id: modelId,
      profile_id: profileId,
      personality_coherence_index: result.personality_coherence_index ?? 0,
      dominant_personality_pattern: normalizeString(result.dominant_personality_pattern || ''),
      personality_readiness: normalizeString(result.personality_readiness || ''),
      dimension_scores: result.dimension_scores || {},
      construct_scores: result.construct_scores || {},
      summary_metrics: result.summary_metrics || {},
      personality_readiness_summary: normalizeString(result.personality_readiness_summary || ''),
      result_payload: result,
    })
    .select('*')
    .maybeSingle();

  if (resultError) {
    if (isSupabaseRelationMissingError(resultError)) return { session, result: null };
    console.warn('[Neuroartan][Model] Personality Calibration result insert failed.', resultError);
    throw resultError;
  }

  await recordModelAuditEvent({ id: modelId, profile_id: profileId }, {
    area: 'foundation',
    pane: 'personality',
    section: 'personality_calibration',
    field: 'personality_profile',
    label: 'Personality Profile',
    action: 'personality_calibration_completed',
    from: null,
    to: result.personality_readiness || '',
    source: 'personality_calibration',
  });

  return {
    session,
    result: savedResult || null,
    answers: answerPayload,
  };
}

export async function readLatestModelPersonalityCalibrationResult(modelId) {
  const supabase = await resolveSupabaseClient();
  const normalizedModelId = normalizeString(modelId);
  if (!supabase || !normalizedModelId) return null;

  const { data, error } = await supabase
    .from(MODEL_PERSONALITY_CALIBRATION_RESULTS_TABLE)
    .select('*, model_personality_calibration_sessions(*)')
    .eq('model_id', normalizedModelId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (isSupabaseRelationMissingError(error)) return null;
    throw error;
  }

  return data || null;
}

export async function listModelPersonalityCalibrationSessions(modelId) {
  const supabase = await resolveSupabaseClient();
  const normalizedModelId = normalizeString(modelId);
  if (!supabase || !normalizedModelId) return [];

  const { data, error } = await supabase
    .from(MODEL_PERSONALITY_CALIBRATION_SESSIONS_TABLE)
    .select('*')
    .eq('model_id', normalizedModelId)
    .order('created_at', { ascending: false });

  if (error) {
    if (isSupabaseRelationMissingError(error)) return [];
    throw error;
  }

  return Array.isArray(data) ? data : [];
}

function normalizePersonalityCalibrationNumber(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return 0;
  return Math.max(0, Math.min(10, Math.round(numericValue * 10) / 10));
}

export async function listModelSourceCalibrationSessions(modelId) {
  const supabase = await resolveSupabaseClient();
  const normalizedModelId = normalizeString(modelId);
  if (!supabase || !normalizedModelId) return [];

  const { data, error } = await supabase
    .from(MODEL_SOURCE_CALIBRATION_SESSIONS_TABLE)
    .select('*')
    .eq('model_id', normalizedModelId)
    .order('created_at', { ascending: false });

  if (error) {
    if (isSupabaseRelationMissingError(error)) return [];
    throw error;
  }

  return Array.isArray(data) ? data : [];
}

function normalizeSourceCalibrationNumber(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return 0;
  return Math.max(0, Math.min(10, Math.round(numericValue * 10) / 10));
}

export async function saveModelPersonalizationPreferences(modelId, preferences = {}) {
  const supabase = await resolveSupabaseClient();
  const normalizedModelId = normalizeString(modelId);
  if (!supabase) {
    const error = new Error('MODEL_BACKEND_UNAVAILABLE');
    error.code = 'MODEL_BACKEND_UNAVAILABLE';
    throw error;
  }
  if (!normalizedModelId) {
    const error = new Error('MODEL_ID_REQUIRED');
    error.code = 'MODEL_ID_REQUIRED';
    throw error;
  }

  const model = await getModelById(normalizedModelId);
  const previousPreferences = await readModelPersonalizationPreferences(normalizedModelId).catch(() => null);
  const payload = buildModelPersonalizationPreferencesPayload(normalizedModelId, preferences);

  let payloadForSave = payload;
  let { data, error } = await supabase
    .from(MODEL_PERSONALIZATION_PREFERENCES_TABLE)
    .upsert(payloadForSave, { onConflict: 'model_id' })
    .select('*')
    .maybeSingle();

  if (error && isSupabaseColumnMissingError(error)) {
    payloadForSave = { ...payload };
    delete payloadForSave.response_audience_rules;

    const fallbackResult = await supabase
      .from(MODEL_PERSONALIZATION_PREFERENCES_TABLE)
      .upsert(payloadForSave, { onConflict: 'model_id' })
      .select('*')
      .maybeSingle();

    data = fallbackResult.data;
    error = fallbackResult.error;
  }

  if (error) {
    if (isSupabaseRelationMissingError(error)) return null;
    throw error;
  }

  const savedPreferences = mapModelPersonalizationPreferences(data || payloadForSave);
  const changedFields = getChangedModelFields(previousPreferences || {}, savedPreferences || {}, MODEL_PERSONALIZATION_CHANGE_FIELDS);
  if (model?.id && changedFields.length) {
    await recordChangedModelFields(model, changedFields, MODEL_PERSONALIZATION_CHANGE_FIELDS, {
      area: 'model.personalization.preferences',
    });
  }

  return savedPreferences;
}

export async function readModelVisibilityPreferences(modelId) {
  const supabase = await resolveSupabaseClient();
  const normalizedModelId = normalizeString(modelId);
  if (!supabase || !normalizedModelId) return null;

  const model = await getModelById(normalizedModelId);
  if (!model) return null;

  const { data, error } = await supabase
    .from(MODEL_VISIBILITY_PREFERENCES_TABLE)
    .select('*')
    .eq('model_id', normalizedModelId)
    .maybeSingle();

  if (error) {
    if (isSupabaseRelationMissingError(error)) return mapModelVisibilityPreferences({}, model);
    throw error;
  }

  return mapModelVisibilityPreferences(data || {}, model);
}

export async function saveModelVisibilityPreferences(modelId, preferences = {}) {
  const supabase = await resolveSupabaseClient();
  const normalizedModelId = normalizeString(modelId);
  if (!supabase) {
    const error = new Error('MODEL_BACKEND_UNAVAILABLE');
    error.code = 'MODEL_BACKEND_UNAVAILABLE';
    throw error;
  }
  if (!normalizedModelId) {
    const error = new Error('MODEL_ID_REQUIRED');
    error.code = 'MODEL_ID_REQUIRED';
    throw error;
  }

  const model = await getModelById(normalizedModelId);
  if (!model) return null;

  const previousPreferences = await readModelVisibilityPreferences(normalizedModelId).catch(() => null);
  const payload = buildModelVisibilityPreferencesPayload(normalizedModelId, preferences, model);
  const publicVisible = payload.public_visible === true;
  const publicationState = publicVisible ? 'published' : 'unpublished';
  const modelVisibility = publicVisible ? 'public' : 'private';
  const interactionState = publicVisible ? 'public' : 'private';
  const now = new Date().toISOString();

  let savedPreferenceRow = payload;
  const preferenceResult = await supabase
    .from(MODEL_VISIBILITY_PREFERENCES_TABLE)
    .upsert(payload, { onConflict: 'model_id' })
    .select('*')
    .maybeSingle();

  if (preferenceResult.error && !isSupabaseRelationMissingError(preferenceResult.error)) {
    throw preferenceResult.error;
  }
  if (preferenceResult.data) {
    savedPreferenceRow = preferenceResult.data;
  }

  const { data, error } = await supabase
    .from(MODELS_TABLE)
    .update({
      model_visibility: modelVisibility,
      publication_state: publicationState,
        updated_at: now,
    })
    .eq('id', normalizedModelId)
    .select(MODEL_SELECT_FIELDS)
    .single();

  if (error) throw error;

  const savedModel = mapSupabaseModel(data) || {
    ...model,
    model_visibility: modelVisibility,
    publication_state: publicationState,
    updated_at: now,
  };

  await upsertModelPublicIdentityProjection(supabase, {
    model_id: normalizedModelId,
    profile_id: savedModel.profile_id || undefined,
    public_display_name: savedModel.model_name || savedModel.display_name || '',
    display_name: savedModel.model_name || savedModel.display_name || '',
    public_slug: savedModel.slug || savedModel.slug || '',
    public_description: savedModel.description || '',
    public_visibility: modelVisibility,
    public_visibility_state: modelVisibility,
    public_identity_state: publicationState === 'published' ? 'published' : 'not_published',
    public_avatar_url: savedModel.model_image_url || '',
    updated_at: now,
  });

  const savedPreferences = mapModelVisibilityPreferences(savedPreferenceRow, savedModel);
  const changed = !previousPreferences
    || previousPreferences.publicVisible !== savedPreferences.publicVisible
    || previousPreferences.friendsVisible !== savedPreferences.friendsVisible
    || previousPreferences.followersVisible !== savedPreferences.followersVisible
    || previousPreferences.mutualsVisible !== savedPreferences.mutualsVisible
    || previousPreferences.familyVisible !== savedPreferences.familyVisible
    || previousPreferences.subscribersVisible !== savedPreferences.subscribersVisible;

  if (changed) {
    await recordModelChangelogEvent(savedModel, {
      area: 'model.settings.visibility',
      action: 'model_visibility_changed',
      title: 'Model visibility changed',
      detail: publicVisible ? 'Model was made visible in public discovery.' : 'Model was hidden from public discovery.',
      metadata: {
        public_visible: savedPreferences.publicVisible,
        friends_visible: savedPreferences.friendsVisible,
        followers_visible: savedPreferences.followersVisible,
        mutuals_visible: savedPreferences.mutualsVisible,
        family_visible: savedPreferences.familyVisible,
        subscribers_visible: savedPreferences.subscribersVisible,
      },
    });
  }

  dispatchModelProjectionUpdated(normalizedModelId);
  return savedPreferences;
}

export async function readModelDigitalBrainPreferences(modelId) {
  const supabase = await resolveSupabaseClient();
  const normalizedModelId = normalizeString(modelId);
  if (!supabase || !normalizedModelId) return null;

  const { data, error } = await supabase
    .from(MODEL_DIGITAL_BRAIN_PREFERENCES_TABLE)
    .select('*')
    .eq('model_id', normalizedModelId)
    .maybeSingle();

  if (error) {
    if (isSupabaseRelationMissingError(error)) return null;
    throw error;
  }

  return mapModelDigitalBrainPreferences(data || {});
}

export async function saveModelDigitalBrainPreferences(modelId, preferences = {}) {
  const supabase = await resolveSupabaseClient();
  const normalizedModelId = normalizeString(modelId);
  if (!supabase) {
    const error = new Error('MODEL_BACKEND_UNAVAILABLE');
    error.code = 'MODEL_BACKEND_UNAVAILABLE';
    throw error;
  }
  if (!normalizedModelId) {
    const error = new Error('MODEL_ID_REQUIRED');
    error.code = 'MODEL_ID_REQUIRED';
    throw error;
  }

  const model = await getModelById(normalizedModelId);
  if (!model) return null;

  const previousPreferences = await readModelDigitalBrainPreferences(normalizedModelId).catch(() => null);
  const payload = buildModelDigitalBrainPreferencesPayload(model, preferences);
  const { data, error } = await supabase
    .from(MODEL_DIGITAL_BRAIN_PREFERENCES_TABLE)
    .upsert(payload, { onConflict: 'model_id' })
    .select('*')
    .maybeSingle();

  if (error) {
    if (isSupabaseRelationMissingError(error)) return null;
    throw error;
  }

  const savedPreferences = mapModelDigitalBrainPreferences(data || payload);
  const changedFields = getChangedModelFields(previousPreferences || {}, savedPreferences || {}, MODEL_DIGITAL_BRAIN_CHANGE_FIELDS);
  if (changedFields.length) {
    await recordChangedModelFields(model, changedFields, MODEL_DIGITAL_BRAIN_CHANGE_FIELDS, {
      area: 'model.foundation.digital_brain',
    });
  }

  return savedPreferences;
}

function compactDefinedObject(value = {}) {
  return Object.fromEntries(
    Object.entries(value || {}).filter(([, entry]) => entry !== undefined)
  );
}

function normalizeVoiceTrainingNumber(value, fallback = 0, min = 0, max = 100) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return fallback;
  return Math.max(min, Math.min(max, Math.round(numericValue * 100) / 100));
}

function normalizeVoiceStorageSegment(value = '') {
  return normalizeString(value || 'voice-sample')
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 96) || 'voice-sample';
}

function normalizeModelVoiceTrainingState(row = {}) {
  if (!row || typeof row !== 'object') return null;

  return {
    id: normalizeString(row.id),
    modelId: normalizeString(row.model_id),
    profileId: normalizeString(row.profile_id),
    ownerAuthUserId: normalizeString(row.owner_auth_user_id),
    sampleCount: Number.parseInt(row.sample_count, 10) || 0,
    consentState: normalizeString(row.consent_state || 'not_yet_granted'),
    verificationState: normalizeString(row.verification_state || 'not_verified'),
    activationState: normalizeString(row.activation_state || 'inactive'),
    readinessState: normalizeString(row.readiness_state || 'not_started'),
    readinessScore: normalizeVoiceTrainingNumber(row.readiness_score, 0),
    sampleCoverage: row.sample_coverage && typeof row.sample_coverage === 'object' ? row.sample_coverage : {},
    emotionCoverage: row.emotion_coverage && typeof row.emotion_coverage === 'object' ? row.emotion_coverage : {},
    transcriptState: normalizeString(row.transcript_state || 'not_started'),
    speechToTextState: normalizeString(row.speech_to_text_state || 'not_started'),
    textToSpeechState: normalizeString(row.text_to_speech_state || 'not_started'),
    synthesisState: normalizeString(row.synthesis_state || 'not_started'),
    trainingPipelineState: normalizeString(row.training_pipeline_state || 'not_started'),
    voiceProfileReference: normalizeString(row.voice_profile_reference),
    lastSampleAt: normalizeString(row.last_sample_at),
    statePayload: row.state_payload && typeof row.state_payload === 'object' ? row.state_payload : {},
    createdAt: normalizeString(row.created_at),
    updatedAt: normalizeString(row.updated_at),
  };
}

function normalizeModelVoiceTrainingSample(row = {}) {
  if (!row || typeof row !== 'object') return null;

  return {
    id: normalizeString(row.id),
    modelId: normalizeString(row.model_id),
    profileId: normalizeString(row.profile_id),
    ownerAuthUserId: normalizeString(row.owner_auth_user_id),
    privacyVoiceRecordId: normalizeString(row.privacy_voice_record_id),
    sampleTitle: normalizeString(row.sample_title || 'Voice sample'),
    sampleOrigin: normalizeString(row.sample_origin || 'guided_recording'),
    promptId: normalizeString(row.prompt_id),
    promptText: normalizeString(row.prompt_text),
    emotionalTone: normalizeString(row.emotional_tone || 'neutral'),
    expressionMode: normalizeString(row.expression_mode || 'spoken'),
    sampleStatus: normalizeString(row.sample_status || 'received'),
    qualityState: normalizeString(row.quality_state || 'pending_review'),
    qualityScore: normalizeVoiceTrainingNumber(row.quality_score, 0),
    transcriptText: normalizeString(row.transcript_text),
    transcriptStatus: normalizeString(row.transcript_status || 'pending'),
    audioStorageBucket: normalizeString(row.audio_storage_bucket),
    audioStoragePath: normalizeString(row.audio_storage_path),
    audioMimeType: normalizeString(row.audio_mime_type),
    audioSizeBytes: Number(row.audio_size_bytes || 0),
    durationSeconds: Number(row.duration_seconds || 0),
    featureReference: normalizeString(row.feature_reference),
    trainingSplit: normalizeString(row.training_split || 'calibration'),
    readinessWeight: Number(row.readiness_weight || 1),
    metadata: row.metadata && typeof row.metadata === 'object' ? row.metadata : {},
    createdAt: normalizeString(row.created_at),
    updatedAt: normalizeString(row.updated_at),
  };
}

async function getVoiceTrainingContext(modelId = '') {
  const supabase = await resolveSupabaseClient();
  if (!supabase) {
    const error = new Error('MODEL_BACKEND_UNAVAILABLE');
    error.code = 'MODEL_BACKEND_UNAVAILABLE';
    throw error;
  }

  const requestedModelId = normalizeString(modelId);
  const [model, user] = await Promise.all([
    requestedModelId ? getModelById(requestedModelId) : ensureOwnedCanonicalModel(),
    getCurrentSupabaseUser(),
  ]);

  const profileId = normalizeString(model?.profile_id);
  const ownerAuthUserId = normalizeString(model?.owner_auth_user_id || user?.id);
  if (!model?.id || !profileId || !ownerAuthUserId) {
    const error = new Error('MODEL_VOICE_TRAINING_CONTEXT_REQUIRED');
    error.code = 'MODEL_VOICE_TRAINING_CONTEXT_REQUIRED';
    throw error;
  }

  return {
    supabase,
    model,
    modelId: normalizeString(model.id),
    profileId,
    ownerAuthUserId,
  };
}

async function uploadModelVoiceSampleFile(context, file, values = {}) {
  if (!(file instanceof Blob)) return null;

  const originalName = normalizeString(file.name || values.fileName || 'voice-sample.webm');
  const storageName = normalizeVoiceStorageSegment(`${Date.now()}-${originalName}`);
  const storagePath = `${context.ownerAuthUserId}/${context.modelId}/${storageName}`;
  const { error } = await context.supabase.storage
    .from(MODEL_VOICE_SAMPLE_BUCKET)
    .upload(storagePath, file, {
      cacheControl: '3600',
      contentType: normalizeString(file.type || values.mimeType || 'audio/webm'),
      upsert: false,
    });

  if (error) throw error;

  return {
    bucket: MODEL_VOICE_SAMPLE_BUCKET,
    path: storagePath,
    name: originalName,
    type: normalizeString(file.type || values.mimeType || 'audio/webm'),
    size: Number(file.size || 0),
  };
}

async function updateModelVoiceTrainingStateFromSamples(context) {
  const { data, error } = await context.supabase
    .from(MODEL_VOICE_TRAINING_SAMPLES_TABLE)
    .select('id, emotional_tone, sample_status, updated_at')
    .eq('model_id', context.modelId)
    .neq('sample_status', 'removed');

  if (error) {
    if (isSupabaseRelationMissingError(error)) return null;
    throw error;
  }

  const samples = Array.isArray(data) ? data : [];
  const sampleCount = samples.length;
  const toneCount = new Set(samples.map((sample) => normalizeString(sample.emotional_tone)).filter(Boolean)).size;
  const readinessScore = Math.min(100, Math.round((((Math.min(sampleCount, 12) / 12) * 65) + ((Math.min(toneCount, 8) / 8) * 35)) * 100) / 100);
  const readinessState = sampleCount >= 12 && toneCount >= 8
    ? 'ready_for_review'
    : sampleCount >= 6 && toneCount >= 4
      ? 'forming'
      : sampleCount > 0
        ? 'initial'
        : 'not_started';

  const payload = {
    model_id: context.modelId,
    profile_id: context.profileId,
    owner_auth_user_id: context.ownerAuthUserId,
    sample_count: sampleCount,
    readiness_state: readinessState,
    readiness_score: readinessScore,
    sample_coverage: { sample_count: sampleCount, target_sample_count: 12 },
    emotion_coverage: { tone_count: toneCount, target_tone_count: 8 },
    consent_state: sampleCount > 0 ? 'capture_requested' : 'not_yet_granted',
    verification_state: 'not_verified',
    activation_state: 'inactive',
    transcript_state: sampleCount > 0 ? 'pending' : 'not_started',
    speech_to_text_state: sampleCount > 0 ? 'queued' : 'not_started',
    text_to_speech_state: 'not_started',
    synthesis_state: 'not_started',
    training_pipeline_state: sampleCount > 0 ? 'sample_collection' : 'not_started',
    last_sample_at: samples[0]?.updated_at || null,
    state_payload: { sample_count: sampleCount, tone_count: toneCount, readiness_score: readinessScore },
    updated_at: new Date().toISOString(),
  };

  const result = await context.supabase
    .from(MODEL_VOICE_TRAINING_STATE_TABLE)
    .upsert(payload, { onConflict: 'model_id' })
    .select('*')
    .maybeSingle();

  if (result.error) {
    if (isSupabaseRelationMissingError(result.error)) return null;
    throw result.error;
  }

  return normalizeModelVoiceTrainingState(result.data || payload);
}

export async function readModelVoiceTrainingState(modelId = '') {
  const context = await getVoiceTrainingContext(modelId).catch((error) => {
    if (error?.code === 'MODEL_BACKEND_UNAVAILABLE' || error?.code === 'MODEL_VOICE_TRAINING_CONTEXT_REQUIRED') return null;
    throw error;
  });
  if (!context) return null;

  const { data, error } = await context.supabase
    .from(MODEL_VOICE_TRAINING_STATE_TABLE)
    .select('*')
    .eq('model_id', context.modelId)
    .maybeSingle();

  if (error) {
    if (isSupabaseRelationMissingError(error)) return null;
    throw error;
  }

  return normalizeModelVoiceTrainingState(data || {
    model_id: context.modelId,
    profile_id: context.profileId,
    owner_auth_user_id: context.ownerAuthUserId,
  });
}

export async function listModelVoiceTrainingSamples(modelId = '') {
  const context = await getVoiceTrainingContext(modelId).catch((error) => {
    if (error?.code === 'MODEL_BACKEND_UNAVAILABLE' || error?.code === 'MODEL_VOICE_TRAINING_CONTEXT_REQUIRED') return null;
    throw error;
  });
  if (!context) return [];

  const { data, error } = await context.supabase
    .from(MODEL_VOICE_TRAINING_SAMPLES_TABLE)
    .select('*')
    .eq('model_id', context.modelId)
    .neq('sample_status', 'removed')
    .order('updated_at', { ascending: false });

  if (error) {
    if (isSupabaseRelationMissingError(error)) return [];
    throw error;
  }

  return Array.isArray(data) ? data.map(normalizeModelVoiceTrainingSample).filter(Boolean) : [];
}

export async function saveModelVoiceTrainingSample(values = {}) {
  const context = await getVoiceTrainingContext(values.modelId || values.model_id);
  const file = values.file instanceof Blob ? values.file : null;
  const upload = file ? await uploadModelVoiceSampleFile(context, file, values) : null;
  const now = new Date().toISOString();
  const sampleTitle = normalizeString(values.sampleTitle || values.sample_title || values.title || 'Voice sample');
  const emotionalTone = normalizeString(values.emotionalTone || values.emotional_tone || 'neutral');
  const sampleOrigin = normalizeString(values.sampleOrigin || values.sample_origin || (upload ? 'audio_file' : 'external_reference'));
  const transcriptText = normalizeString(values.transcriptText || values.transcript_text);
  const audioReference = normalizeString(values.audioReference || values.audio_reference || upload?.path || values.reference || '');

  const privacyPayload = {
    user_id: context.ownerAuthUserId,
    profile_id: context.profileId,
    model_id: context.modelId,
    voice_record_type: sampleOrigin,
    classification: 'biometric_like',
    capture_consent_state: 'requested',
    processing_consent_state: 'requested',
    activation_consent_state: 'not_requested',
    legacy_voice_consent_state: 'not_requested',
    raw_audio_reference: audioReference || null,
    transcript_reference: transcriptText ? `inline-transcript:${now}` : null,
    feature_reference: null,
    activation_state: 'inactive',
    deletion_state: 'active',
    metadata: compactDefinedObject({
      sample_title: sampleTitle,
      sample_origin: sampleOrigin,
      prompt_id: normalizeString(values.promptId || values.prompt_id),
      emotional_tone: emotionalTone,
      expression_mode: normalizeString(values.expressionMode || values.expression_mode || 'spoken'),
      storage_bucket: upload?.bucket,
      storage_path: upload?.path,
      mime_type: upload?.type || values.mimeType,
      size_bytes: upload?.size,
      privacy_owner: 'model_voice_training',
      ...(values.metadata || {}),
    }),
    updated_at: now,
  };

  const privacyResult = await context.supabase
    .from(PRIVACY_VOICE_REGISTRY_TABLE)
    .insert(privacyPayload)
    .select('*')
    .maybeSingle();

  if (privacyResult.error && !isSupabaseRelationMissingError(privacyResult.error)) {
    throw privacyResult.error;
  }

  const samplePayload = compactDefinedObject({
    model_id: context.modelId,
    profile_id: context.profileId,
    owner_auth_user_id: context.ownerAuthUserId,
    privacy_voice_record_id: privacyResult.data?.id,
    sample_title: sampleTitle,
    sample_origin: sampleOrigin,
    prompt_id: normalizeString(values.promptId || values.prompt_id),
    prompt_text: normalizeString(values.promptText || values.prompt_text),
    emotional_tone: emotionalTone,
    expression_mode: normalizeString(values.expressionMode || values.expression_mode || 'spoken'),
    sample_status: 'received',
    quality_state: 'pending_review',
    quality_score: 0,
    transcript_text: transcriptText || null,
    transcript_status: transcriptText ? 'owner_provided' : 'pending',
    audio_storage_bucket: upload?.bucket,
    audio_storage_path: upload?.path || audioReference || null,
    audio_mime_type: upload?.type || values.mimeType,
    audio_size_bytes: upload?.size,
    duration_seconds: Number.isFinite(Number(values.durationSeconds)) ? Number(values.durationSeconds) : undefined,
    feature_reference: null,
    training_split: normalizeString(values.trainingSplit || values.training_split || 'calibration'),
    readiness_weight: Number.isFinite(Number(values.readinessWeight)) ? Number(values.readinessWeight) : 1,
    metadata: compactDefinedObject({
      external_reference: normalizeString(values.reference || values.externalReference),
      storage_upload: upload,
      ...(values.metadata || {}),
    }),
    updated_at: now,
  });

  const { data, error } = await context.supabase
    .from(MODEL_VOICE_TRAINING_SAMPLES_TABLE)
    .insert(samplePayload)
    .select('*')
    .maybeSingle();

  if (error) throw error;

  await updateModelVoiceTrainingStateFromSamples(context).catch((stateError) => {
    console.warn('[Neuroartan][Model Voice] State refresh skipped.', stateError);
  });

  await recordModelChangelogEvent(context.model, {
    area: 'model.foundation.voice',
    action: 'voice_sample_added',
    title: 'Voice sample added',
    detail: `${sampleTitle} was added to Voice Training.`,
    metadata: {
      changed_field: 'voice_sample',
      emotional_tone: emotionalTone,
      sample_origin: sampleOrigin,
    },
  });

  dispatchModelProjectionUpdated(context.modelId);
  return normalizeModelVoiceTrainingSample(data || samplePayload);
}

export async function removeModelVoiceTrainingSample(sampleId = '') {
  const normalizedSampleId = normalizeString(sampleId);
  if (!normalizedSampleId) return null;

  const context = await getVoiceTrainingContext();
  const { data: sample, error: readError } = await context.supabase
    .from(MODEL_VOICE_TRAINING_SAMPLES_TABLE)
    .select('*')
    .eq('id', normalizedSampleId)
    .eq('model_id', context.modelId)
    .maybeSingle();

  if (readError) throw readError;
  if (!sample) return null;

  const { data, error } = await context.supabase
    .from(MODEL_VOICE_TRAINING_SAMPLES_TABLE)
    .update({
      sample_status: 'removed',
      updated_at: new Date().toISOString(),
    })
    .eq('id', normalizedSampleId)
    .eq('model_id', context.modelId)
    .select('*')
    .maybeSingle();

  if (error) throw error;

  if (sample.audio_storage_bucket === MODEL_VOICE_SAMPLE_BUCKET && sample.audio_storage_path) {
    await context.supabase.storage
      .from(MODEL_VOICE_SAMPLE_BUCKET)
      .remove([sample.audio_storage_path])
      .catch((storageError) => {
        console.warn('[Neuroartan][Model Voice] Storage sample removal skipped.', storageError);
      });
  }

  if (sample.privacy_voice_record_id) {
    await context.supabase
      .from(PRIVACY_VOICE_REGISTRY_TABLE)
      .update({ deletion_state: 'deleted', updated_at: new Date().toISOString() })
      .eq('id', sample.privacy_voice_record_id)
      .catch((privacyError) => {
        console.warn('[Neuroartan][Model Voice] Privacy voice registry update skipped.', privacyError);
      });
  }

  await updateModelVoiceTrainingStateFromSamples(context).catch(() => null);
  dispatchModelProjectionUpdated(context.modelId);
  return normalizeModelVoiceTrainingSample(data || sample);
}

export async function readModelFoundationIdentity(modelId) {
  const supabase = getSupabaseClient();
  const normalizedModelId = normalizeString(modelId);
  if (!supabase || !normalizedModelId) return null;

  const model = await getModelById(normalizedModelId);
  if (!model) return null;

  const [
    privateIdentityResult,
    identityRegistryResult,
    birthCertificateResult,
    publicIdentityResult,
    lifecycleResult,
    dignitySecurityResult,
  ] = await Promise.all([
    supabase.from(MODEL_FOUNDATION_TABLES.privateIdentities).select('*').eq('model_id', normalizedModelId).maybeSingle(),
    supabase.from(MODEL_FOUNDATION_TABLES.identityRegistry).select('*').eq('model_id', normalizedModelId).maybeSingle(),
    supabase.from(MODEL_FOUNDATION_TABLES.birthCertificates).select('*').eq('model_id', normalizedModelId).maybeSingle(),
    supabase.from(MODEL_FOUNDATION_TABLES.publicIdentities).select('*').eq('model_id', normalizedModelId).maybeSingle(),
    supabase.from(MODEL_FOUNDATION_TABLES.lifecycle).select('*').eq('model_id', normalizedModelId).maybeSingle(),
    supabase.from(MODEL_FOUNDATION_TABLES.dignitySecurity).select('*').eq('model_id', normalizedModelId).maybeSingle(),
  ]);

  const missingRelationError = [
    privateIdentityResult.error,
    identityRegistryResult.error,
    birthCertificateResult.error,
    publicIdentityResult.error,
    lifecycleResult.error,
    dignitySecurityResult.error,
  ].find(isSupabaseRelationMissingError);

  if (missingRelationError) return mapModelFoundationIdentity({}, model);

  const blockingError = [
    privateIdentityResult.error,
    identityRegistryResult.error,
    birthCertificateResult.error,
    publicIdentityResult.error,
    lifecycleResult.error,
    dignitySecurityResult.error,
  ].find(Boolean);

  if (blockingError) throw blockingError;

  return mapModelFoundationIdentity({
    privateIdentity: privateIdentityResult.data,
    identityRegistry: identityRegistryResult.data,
    birthCertificate: birthCertificateResult.data,
    publicIdentity: publicIdentityResult.data,
    lifecycle: lifecycleResult.data,
    dignitySecurity: dignitySecurityResult.data,
  }, model);
}

export async function saveModelFoundationIdentity(modelId, values = {}) {
  const supabase = getSupabaseClient();
  const normalizedModelId = normalizeString(modelId);
  if (!supabase || !normalizedModelId) return null;

  const model = await getModelById(normalizedModelId);
  if (!model) return null;

  const previousIdentity = await readModelFoundationIdentity(normalizedModelId).catch(() => null);
  const payload = buildModelFoundationPrivateIdentityPayload(normalizedModelId, values, model);
  const modelDisplayName = resolveModelIdentityDisplayName(values, model);
  const modelPurposeDescription = normalizeString(
    values.modelPurposeDescription
    ?? values.model_purpose_description
    ?? model.description
    ?? ''
  );

  const { error: modelError } = await supabase
    .from(MODELS_TABLE)
    .update({
      model_name: modelDisplayName,
      description: modelPurposeDescription,
      updated_at: new Date().toISOString(),
    })
    .eq('id', normalizedModelId);

  if (modelError) throw modelError;

  const { error } = await upsertModelPrivateIdentity(supabase, payload);

  if (error) {
    if (isSupabaseRelationMissingError(error)) return null;
    throw error;
  }

  await upsertModelPublicIdentityProjection(supabase, {
    model_id: normalizedModelId,
    profile_id: model.profile_id || undefined,
    public_display_name: modelDisplayName,
    display_name: modelDisplayName,
    public_slug: model.slug || model.slug || '',
    public_description: modelPurposeDescription,
    public_visibility: model.model_visibility || 'private',
    public_visibility_state: model.model_visibility || 'private',
    public_identity_state: model.publication_state === 'published' ? 'published' : 'not_published',
    public_avatar_url: model.model_image_url || '',
    updated_at: new Date().toISOString(),
  });

  dispatchModelProjectionUpdated(normalizedModelId);
  const savedIdentity = await readModelFoundationIdentity(normalizedModelId);
  const changedFields = getChangedModelFields(previousIdentity || {}, savedIdentity || {}, MODEL_IDENTITY_CHANGE_FIELDS);
  if (changedFields.length) {
    await recordChangedModelFields(model, changedFields, MODEL_IDENTITY_CHANGE_FIELDS, {
      area: 'model.foundation.identity',
    });
  }

  return savedIdentity;
}

export async function saveOwnedCanonicalModelAvatar(file) {
  const supabase = getSupabaseClient();
  const model = await getOwnedCanonicalModel();
  const user = await getCurrentSupabaseUser();
  if (!supabase) throw new Error('MODEL_BACKEND_UNAVAILABLE');
  if (!model?.id) throw new Error('CANONICAL_MODEL_REQUIRED');
  if (!user?.id) throw new Error('AUTH_REQUIRED');

  const uploaded = await uploadProfileImage({
    file,
    user,
    kind:'model-avatar',
    supabase
  });

  const { data, error } = await supabase
    .from(MODELS_TABLE)
    .update({
      model_image_url:uploaded.publicUrl,
      updated_at:new Date().toISOString()
    })
    .eq('id', model.id)
    .select(MODEL_SELECT_FIELDS)
    .single();

  if (error) throw error;

  const { error: publicIdentityError } = await supabase
    .from(MODEL_FOUNDATION_TABLES.publicIdentities)
    .update({
      public_avatar_url: uploaded.publicUrl,
      updated_at: new Date().toISOString(),
    })
    .eq('model_id', model.id);

  if (publicIdentityError && !isSupabaseRelationMissingError(publicIdentityError)) {
    throw publicIdentityError;
  }

  await recordModelChangelogEvent(model, {
    area: 'model.foundation.identity',
    action: 'model_avatar_changed',
    title: 'Model avatar changed',
    detail: 'Model avatar was updated.',
  });
  dispatchModelProjectionUpdated(model.id);
  return mapSupabaseModel(data);
}

export async function resetOwnedCanonicalModelAvatar() {
  const supabase = getSupabaseClient();
  const model = await getOwnedCanonicalModel();
  if (!supabase) throw new Error('MODEL_BACKEND_UNAVAILABLE');
  if (!model?.id) throw new Error('CANONICAL_MODEL_REQUIRED');

  const { data, error } = await supabase
    .from(MODELS_TABLE)
    .update({
      model_image_url:'',
      updated_at:new Date().toISOString()
    })
    .eq('id', model.id)
    .select(MODEL_SELECT_FIELDS)
    .single();

  if (error) throw error;

  const { error: publicIdentityError } = await supabase
    .from(MODEL_FOUNDATION_TABLES.publicIdentities)
    .update({
      public_avatar_url: '',
      updated_at: new Date().toISOString(),
    })
    .eq('model_id', model.id);

  if (publicIdentityError && !isSupabaseRelationMissingError(publicIdentityError)) {
    throw publicIdentityError;
  }

  await recordModelChangelogEvent(model, {
    area: 'model.foundation.identity',
    action: 'model_avatar_reset',
    title: 'Model avatar reset',
    detail: 'Model avatar was reset to the default state.',
  });
  dispatchModelProjectionUpdated(model.id);
  return mapSupabaseModel(data);
}

async function getModelById(modelId) {
  const supabase = await resolveSupabaseClient();
  const normalizedModelId = normalizeString(modelId);
  if (!supabase || !normalizedModelId) return null;

  const { data, error } = await supabase
    .from(MODELS_TABLE)
    .select(MODEL_SELECT_FIELDS)
    .eq('id', normalizedModelId)
    .maybeSingle();

  if (error) {
    if (isSupabaseRelationMissingError(error)) return null;
    throw error;
  }

  return mapSupabaseModel(data);
}

export async function listPublishedModels() {
  const supabase = await resolveSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from(MODELS_TABLE)
    .select(MODEL_SELECT_FIELDS)
    .eq('model_visibility', 'public')
    .eq('publication_state', 'published')
    .order('updated_at', { ascending: false });

  if (error) {
    if (isSupabaseRelationMissingError(error)) return [];
    throw error;
  }

  const models = Array.isArray(data) ? data.map(mapSupabaseModel).filter(Boolean) : [];
  if (!models.length) return [];

  const modelIds = models.map((model) => model.id).filter(Boolean);
  const visibilityResult = await supabase
    .from(MODEL_VISIBILITY_PREFERENCES_TABLE)
    .select('model_id, public_visible')
    .in('model_id', modelIds);

  if (visibilityResult.error && !isSupabaseRelationMissingError(visibilityResult.error)) {
    console.warn('[Neuroartan][Model] Visibility preference projection unavailable for published models.', visibilityResult.error);
  }

  const visibilityByModel = new Map(
    (!visibilityResult.error && Array.isArray(visibilityResult.data) ? visibilityResult.data : [])
      .map((preference) => [normalizeString(preference.model_id), preference])
  );

  const discoverableModels = models.filter((model) => {
    const preference = visibilityByModel.get(model.id);
    return !preference || preference.public_visible === true;
  });

  if (!discoverableModels.length) return [];

  const discoverableModelIds = discoverableModels.map((model) => model.id).filter(Boolean);
  const publicIdentityResult = await supabase
    .from(MODEL_FOUNDATION_TABLES.publicIdentities)
    .select(MODEL_PUBLIC_IDENTITY_SELECT_FIELDS)
    .in('model_id', discoverableModelIds);

  if (publicIdentityResult.error && !isSupabaseRelationMissingError(publicIdentityResult.error)) {
    console.warn('[Neuroartan][Model] Public identity projection unavailable for published models.', publicIdentityResult.error);
  }

  const publicIdentityByModel = new Map(
    (!publicIdentityResult.error && Array.isArray(publicIdentityResult.data) ? publicIdentityResult.data : [])
      .map((identity) => [normalizeString(identity.model_id), identity])
  );

  return discoverableModels.map((model) => {
    const publicIdentity = publicIdentityByModel.get(model.id) || {};
    const displayName = normalizeString(
      publicIdentity.public_display_name
      || publicIdentity.display_name
      || model.model_name
      || model.creator_display_name
    );
    const avatarUrl = normalizeString(publicIdentity.public_avatar_url || model.model_image_url || '');

    return {
      ...model,
      model_name: displayName || model.model_name,
      display_name: displayName || model.display_name,
      search_title: displayName || model.search_title,
      public_display_name: normalizeString(publicIdentity.public_display_name || displayName),
      model_image_url: avatarUrl,
      public_avatar_url: avatarUrl,
      public_identity_state: normalizeString(publicIdentity.public_identity_state || ''),
      public_visibility: normalizeString(publicIdentity.public_visibility || publicIdentity.public_visibility_state || model.model_visibility || ''),
    };
  });
}

/* =============================================================================
   08) MODEL WRITE HELPERS
============================================================================= */
async function assertModelSlugAvailable(modelSlug) {
  const existingModel = await getModelBySlug(modelSlug);
  if (!existingModel) {
    return buildModelSlug(modelSlug);
  }

  const error = new Error('MODEL_SLUG_TAKEN');
  error.code = 'MODEL_SLUG_TAKEN';
  throw error;
}

async function insertModelFoundationRecord(supabase, tableName, payload) {
  const { data, error } = await supabase
    .from(tableName)
    .upsert(payload, { onConflict: 'model_id' })
    .select('id')
    .single();

  if (error) throw error;

  return data;
}

async function initializePrivateModelFoundation(supabase, model, values = {}) {
  const modelId = normalizeString(model?.id || '');
  if (!supabase || !modelId) return model;

  const modelName = normalizeString(model.model_name || values.model_name || values.name || 'Canonical Personal Model');
  const modelSlug = normalizeString(model.slug || values.slug || values.model_slug || '');
  const description = normalizeString(model.description || values.description || '');

  const birthCertificate = await insertModelFoundationRecord(supabase, MODEL_FOUNDATION_TABLES.birthCertificates, {
    model_id: modelId,
    birth_state: 'created',
    birth_reason: 'canonical_private_personal_model',
    birth_source: 'website_profile_creation',
  });

  await insertModelFoundationRecord(supabase, MODEL_FOUNDATION_TABLES.identityRegistry, {
    model_id: modelId,
    registry_state: 'registered_private',
    registry_scope: 'private_personal_model',
    canonical_slug: modelSlug,
  });

  const publicVisible = normalizeString(model.model_visibility || values.model_visibility || 'public') === 'public';

  const publicIdentity = await insertModelFoundationRecord(supabase, MODEL_FOUNDATION_TABLES.publicIdentities, {
    model_id: modelId,
    public_identity_state: publicVisible ? 'published' : 'not_published',
    public_display_name: modelName,
    public_slug: modelSlug,
    public_description: description,
    public_avatar_url: '',
    public_visibility: publicVisible ? 'public' : 'private',
  });

  const privateIdentity = await insertModelFoundationRecord(supabase, MODEL_FOUNDATION_TABLES.privateIdentities, {
    model_id: modelId,
    private_identity_state: 'active',
    private_name: modelName,
    private_notes: '',
    owner_visibility: 'owner_only',
    source_boundary: 'private_foundation_only',
  });

  await insertModelFoundationRecord(supabase, MODEL_FOUNDATION_TABLES.providerRouting, {
    model_id: modelId,
    provider_state: 'not_assigned',
    provider_name: 'unassigned',
    route_class: 'site_knowledge',
    runtime_policy: model.default_runtime_policy || model.runtime_policy || {},
    routing_enabled: false,
    voice_enabled: false,
  });

  await insertModelFoundationRecord(supabase, MODEL_FOUNDATION_TABLES.entitlement, {
    model_id: modelId,
    subscription_tier: 'free',
    model_creation_limit: 1,
    personal_model_included: true,
    additional_model_slots: 0,
    paid_multi_model_personal_expansion_blocked: true,
    marketplace_access_state: 'blocked_until_review',
    monetization_request_state: 'blocked_until_review',
  });

  await insertModelFoundationRecord(supabase, MODEL_FOUNDATION_TABLES.permission, {
    model_id: modelId,
    permission_scope: publicVisible ? 'owner_controlled_public_discovery' : 'private_owner_only',
    owner_read_enabled: true,
    owner_write_enabled: true,
    public_read_enabled: publicVisible,
    public_interaction_enabled: publicVisible,
    export_enabled: false,
    deletion_enabled: true,
  });

  await insertModelFoundationRecord(supabase, MODEL_FOUNDATION_TABLES.sourceAuthorization, {
    model_id: modelId,
    source_type: 'none',
    authorization_scope: 'none',
    authorization_state: 'not_yet_granted',
    revocation_state: 'not_applicable',
    revocation_effect: 'none',
  });

  await insertModelFoundationRecord(supabase, MODEL_FOUNDATION_TABLES.lifecycle, {
    model_id: modelId,
    current_state: 'created',
    previous_state: 'none',
    state_reason: 'canonical_personal_model_birth',
    archive_eligible: true,
    delete_eligible: true,
  });

  await insertModelFoundationRecord(supabase, MODEL_FOUNDATION_TABLES.ownerDashboard, {
    model_id: modelId,
    birth_status_display: 'created',
    registry_status_display: 'registered_private',
    provider_route_display: 'not_assigned',
    entitlement_display: 'free_personal_model_included',
    permission_display: 'private_owner_only',
    readiness_display: 'foundation_ready',
    blocked_economy_display: 'economy_features_blocked_until_review',
  });

  await insertModelFoundationRecord(supabase, MODEL_FOUNDATION_TABLES.dignitySecurity, {
    model_id: modelId,
    sensitive_data_state: 'protected',
    identity_protection_state: 'private_owner_controlled',
    voice_protection_state: 'not_yet_linked',
    memory_protection_state: 'private_foundation_only',
    deletion_policy_state: 'owner_request_required',
    export_policy_state: 'blocked_until_policy_review',
  });

  await insertModelFoundationRecord(supabase, MODEL_FOUNDATION_TABLES.blockedEconomy, {
    model_id: modelId,
    marketplace_blocked: true,
    monetization_blocked: true,
    payout_blocked: true,
    public_ranking_blocked: true,
    inter_model_hiring_blocked: true,
    regulated_domain_blocked: true,
    guaranteed_income_claim_blocked: true,
    consciousness_personhood_claim_blocked: true,
    posthumous_economy_blocked: true,
  });

  await insertModelFoundationRecord(supabase, MODEL_FOUNDATION_TABLES.deviceIntegrity, {
    model_id: modelId,
    device_integrity_state: 'review_blocked',
    raw_physical_device_serial_collection_blocked: true,
    security_only_use_confirmed: true,
    advertising_tracking_personalization_use_blocked: true,
    production_enforcement_approved: false,
  });

  await insertModelFoundationRecord(supabase, MODEL_FOUNDATION_TABLES.impersonationReview, {
    model_id: modelId,
    impersonation_review_state: 'not_required',
    profile_identity_review_state: 'pending_if_triggered',
    public_identity_review_state: 'blocked_until_publication_review',
    manual_review_required: false,
    appeal_state: 'available_for_severe_restriction',
  });

  await insertModelFoundationRecord(supabase, MODEL_FOUNDATION_TABLES.modelIdentityAntiAbuse, {
    model_id: modelId,
    canonical_model_limit_state: 'one_profile_one_canonical_model',
    additional_personal_model_slots_blocked: true,
    duplicate_model_risk_state: 'blocked_by_policy',
    bot_factory_creation_blocked: true,
    future_economy_activation_blocked: true,
  });

  await insertModelFoundationRecord(supabase, MODEL_FOUNDATION_TABLES.restrictionReviewAppeal, {
    model_id: modelId,
    restriction_level: 'none',
    restriction_scope: 'none',
    manual_review_state: 'not_required',
    user_notice_state: 'not_required',
    appeal_state: 'available_for_severe_restriction',
  });

  const referencePayload = {
    birth_certificate_id: birthCertificate?.id || model.birth_certificate_id || null,
    private_identity_id: privateIdentity?.id || model.private_identity_id || null,
    public_identity_id: publicIdentity?.id || model.public_identity_id || null,
  };

  const { data, error } = await supabase
    .from(MODELS_TABLE)
    .update(referencePayload)
    .eq('id', modelId)
    .select(MODEL_SELECT_FIELDS)
    .single();

  if (error) throw error;

  return mapSupabaseModel(data || {
    ...model,
    ...referencePayload,
  });
}

export async function createOwnedModel(values = {}) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    const error = new Error('MODEL_BACKEND_UNAVAILABLE');
    error.code = 'MODEL_BACKEND_UNAVAILABLE';
    throw error;
  }

  const profile = await getCurrentCanonicalProfile();
  if (!profile?.id) {
    const error = new Error('PROFILE_COMPLETE_REQUIRED');
    error.code = 'PROFILE_COMPLETE_REQUIRED';
    throw error;
  }

  const user = await getCurrentSupabaseUser();
  const ownerAuthUserId = normalizeString(profile.auth_user_id || getUserId(user));
  if (!ownerAuthUserId) {
    const error = new Error('MODEL_OWNER_REQUIRED');
    error.code = 'MODEL_OWNER_REQUIRED';
    throw error;
  }

  const ownedModels = await listOwnedModels();
  if (ownedModels.length > 0) {
    const error = new Error('CANONICAL_MODEL_ALREADY_EXISTS');
    error.code = 'CANONICAL_MODEL_ALREADY_EXISTS';
    throw error;
  }

  const modelName = normalizeString(values.model_name || values.name || '');
  if (!modelName) {
    const error = new Error('MODEL_NAME_REQUIRED');
    error.code = 'MODEL_NAME_REQUIRED';
    throw error;
  }

  const modelSlug = await assertModelSlugAvailable(values.slug || values.model_slug || modelName);
  const payload = {
    profile_id: profile.id,
    slug: modelSlug,
    model_name: modelName,
    description: normalizeString(values.description || ''),
    creator_display_name: normalizeString(values.creator_display_name || modelName),
    creator_username: normalizeUsername(values.creator_username || modelSlug),
    model_visibility: normalizeString(values.model_visibility || 'public'),
    model_status: normalizeString(values.model_status || values.lifecycle_state || 'draft'),
    readiness_state: normalizeString(values.readiness_state || 'not_ready'),
    publication_state: normalizeString(values.publication_state || 'published'),
    runtime_policy: {
      provider: normalizeString(values.provider || 'unassigned'),
      route: normalizeString(values.route || 'site_knowledge'),
      voice_enabled: values.voice_enabled === true,
    },
    entitlement_state: normalizeString(values.entitlement_state || 'free_canonical_personal_model_included'),
    permission_state: normalizeString(values.permission_state || 'owner_controlled_public_discovery'),
    economy_state: normalizeString(values.economy_state || 'blocked_until_review'),
    foundation_state: normalizeString(values.foundation_state || 'private_foundation_created'),
  };

  const { data, error } = await supabase
    .from(MODELS_TABLE)
    .insert(payload)
    .select(MODEL_SELECT_FIELDS)
    .single();

  if (error) throw error;

  const model = mapSupabaseModel(data);
  return initializePrivateModelFoundation(supabase, model, values);
}

/* =============================================================================
   09) SOURCE / TRAINING HELPERS
============================================================================= */
export async function listModelSourceConnectors(modelId) {
  const supabase = getSupabaseClient();
  const normalizedModelId = normalizeString(modelId);
  if (!supabase || !normalizedModelId) return [];

  const { data, error } = await supabase
    .from(SOURCE_CONNECTORS_TABLE)
    .select('*')
    .eq('model_id', normalizedModelId)
    .order('updated_at', { ascending: false });

  if (error) {
    if (isSupabaseRelationMissingError(error)) return [];
    throw error;
  }

  return Array.isArray(data) ? data : [];
}

export async function listModelTrainingRecords(modelId) {
  const supabase = getSupabaseClient();
  const normalizedModelId = normalizeString(modelId);
  if (!supabase || !normalizedModelId) return [];

  const { data, error } = await supabase
    .from(TRAINING_RECORDS_TABLE)
    .select('*')
    .eq('model_id', normalizedModelId)
    .order('updated_at', { ascending: false });

  if (error) {
    if (isSupabaseRelationMissingError(error)) return [];
    throw error;
  }

  return Array.isArray(data) ? data : [];
}

/* =============================================================================
   10) END OF FILE
============================================================================= */

/* =============================================================================
   FSC-T-0007) MODEL ECONOMY READINESS
============================================================================= */

export const MODEL_ECONOMY_READINESS_STATE = Object.freeze({
  canonicalPersonalModel: "profileBirthRequired",
  oneProfileOneCanonicalModel: true,
  paidMultiModelPersonalExpansionBlocked: true,
  modelBirthCertificate: "schemaReady",
  publicPrivateIdentity: "boundaryRequired",
  modelDignity: "required",
  deviceIntegrity: "reviewBlocked",
  impersonationPrevention: "required",
  modelIdentityAntiAbuse: "required",
  restrictionReviewAppeal: "required",
  rawPhysicalDeviceSerialCollection: "blocked",
  advertisingTrackingPersonalizationUse: "blocked",
  monetization: "blockedUntilReview",
  hiring: "blockedUntilReview",
  marketplace: "blockedUntilReview",
  interModelCoordination: "blockedUntilReview"
});
