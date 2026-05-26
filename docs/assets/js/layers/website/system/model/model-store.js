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
/* /website/docs/assets/js/layers/website/system/model-store.js */

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
    migrationStatus: 'supabase_canonical_model_foundation',
  };
}

export function isSupabaseRelationMissingError(error) {
  const code = normalizeString(error?.code || '').toUpperCase();
  const message = normalizeString(error?.message || '').toLowerCase();
  return code === '42P01' || message.includes('does not exist');
}

export async function getCurrentSupabaseUser() {
  const supabase = getSupabaseClient();
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
    slug: normalizeString(row.slug || row.id),
    model_slug: normalizeString(row.slug || row.id),
    model_name: normalizeString(row.model_name || row.display_name || 'Untitled model'),
    display_name: normalizeString(row.model_name || row.display_name || 'Untitled model'),
    description: normalizeString(row.description || ''),
    creator_display_name: normalizeString(row.creator_display_name || ''),
    creator_username: normalizeUsername(row.creator_username || ''),
    model_visibility: normalizeString(row.model_visibility || 'private'),
    lifecycle_state: normalizeString(row.model_status || 'draft'),
    readiness_state: normalizeString(row.readiness_state || 'uninitialized'),
    publication_state: normalizeString(row.publication_state || 'unpublished'),
    verification_state: normalizeString(row.foundation_state || 'private_foundation_created'),
    training_state: normalizeString(row.readiness_state || 'not_ready'),
    release_version: normalizeString(row.foundation_state || 'private_foundation_created'),
  };
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

  if (!profile) return null;

  const profileExists = profile.profile_exists === true;
  const profileComplete = isCanonicalProfileComplete(profile);
  const username = normalizeUsername(profile.username || profile.username_lower || profile.public_username || '');

  if (!profileExists || !profileComplete || !username) {
    return null;
  }

  return profile;
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
  const supabase = getSupabaseClient();
  const profile = await getCurrentCanonicalProfile();

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

export async function listPublishedModels() {
  const supabase = getSupabaseClient();
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

  return Array.isArray(data) ? data.map(mapSupabaseModel).filter(Boolean) : [];
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

  const modelName = normalizeString(model.model_name || values.model_name || values.name || 'Personal Model');
  const modelSlug = normalizeString(model.slug || values.slug || values.model_slug || '');
  const description = normalizeString(model.description || values.description || '');

  const birthCertificate = await insertModelFoundationRecord(supabase, MODEL_FOUNDATION_TABLES.birthCertificates, {
    model_id: modelId,
    birth_state: 'created',
    birth_reason: 'default_private_personal_model',
    birth_source: 'website_profile_creation',
  });

  await insertModelFoundationRecord(supabase, MODEL_FOUNDATION_TABLES.identityRegistry, {
    model_id: modelId,
    registry_state: 'registered_private',
    registry_scope: 'private_personal_model',
    canonical_slug: modelSlug,
  });

  const publicIdentity = await insertModelFoundationRecord(supabase, MODEL_FOUNDATION_TABLES.publicIdentities, {
    model_id: modelId,
    public_identity_state: 'not_published',
    public_display_name: modelName,
    public_slug: modelSlug,
    public_description: description,
    public_avatar_url: '',
    public_visibility: 'private',
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
    runtime_policy: model.runtime_policy || {},
    routing_enabled: false,
    voice_enabled: false,
  });

  await insertModelFoundationRecord(supabase, MODEL_FOUNDATION_TABLES.entitlement, {
    model_id: modelId,
    subscription_tier: 'free',
    model_creation_limit: 1,
    personal_model_included: true,
    additional_model_slots: 0,
    marketplace_access_state: 'blocked_until_review',
    monetization_request_state: 'blocked_until_review',
  });

  await insertModelFoundationRecord(supabase, MODEL_FOUNDATION_TABLES.permission, {
    model_id: modelId,
    permission_scope: 'private_owner_only',
    owner_read_enabled: true,
    owner_write_enabled: true,
    public_read_enabled: false,
    public_interaction_enabled: false,
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
    state_reason: 'default_personal_model_birth',
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
    model_visibility: normalizeString(values.model_visibility || 'private'),
    model_status: normalizeString(values.model_status || 'draft'),
    readiness_state: normalizeString(values.readiness_state || 'not_ready'),
    publication_state: normalizeString(values.publication_state || 'unpublished'),
    runtime_policy: {
      provider: normalizeString(values.provider || 'unassigned'),
      route: normalizeString(values.route || 'site_knowledge'),
      voice_enabled: values.voice_enabled === true,
    },
    entitlement_state: normalizeString(values.entitlement_state || 'free_personal_model_included'),
    permission_state: normalizeString(values.permission_state || 'private_owner_only'),
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
  defaultPersonalModel: "profileBirthRequired",
  modelBirthCertificate: "schemaReady",
  publicPrivateIdentity: "boundaryRequired",
  modelDignity: "required",
  monetization: "blockedUntilReview",
  hiring: "blockedUntilReview",
  marketplace: "blockedUntilReview",
  interModelHiring: "blockedUntilReview"
});
