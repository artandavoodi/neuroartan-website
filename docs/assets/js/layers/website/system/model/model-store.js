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
  'owner_auth_user_id',
  'model_slug',
  'model_name',
  'description',
  'model_image_url',
  'creator_display_name',
  'creator_username',
  'model_visibility',
  'lifecycle_state',
  'readiness_state',
  'publication_state',
  'verification_state',
  'training_state',
  'interaction_state',
  'routing_class',
  'default_runtime_policy',
  'deployment_origin',
  'external_source_ref',
  'source_count',
  'release_version',
  'workspace_state',
  'created_at',
  'updated_at',
].join(', ');

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

/* =============================================================================
   05) VALUE HELPERS
============================================================================= */
export function buildModelSlug(value = '') {
  return normalizeUsername(value || `model-${Date.now()}`);
}

function getUserId(user) {
  return normalizeString(user?.id || user?.uid || '');
}

function mapSupabaseModel(row = {}) {
  if (!row || typeof row !== 'object') return null;

  return {
    ...row,
    id: normalizeString(row.id),
    slug: normalizeString(row.model_slug || row.slug || row.id),
    model_slug: normalizeString(row.model_slug || row.slug || row.id),
    model_name: normalizeString(row.model_name || row.display_name || 'Untitled model'),
    display_name: normalizeString(row.model_name || row.display_name || 'Untitled model'),
    description: normalizeString(row.description || ''),
    creator_display_name: normalizeString(row.creator_display_name || ''),
    creator_username: normalizeUsername(row.creator_username || ''),
    model_visibility: normalizeString(row.model_visibility || 'private'),
    lifecycle_state: normalizeString(row.lifecycle_state || 'draft'),
    readiness_state: normalizeString(row.readiness_state || 'uninitialized'),
    publication_state: normalizeString(row.publication_state || 'unpublished'),
    verification_state: normalizeString(row.verification_state || 'unverified'),
    training_state: normalizeString(row.training_state || 'uninitialized'),
    release_version: normalizeString(row.release_version || '0.1.0'),
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
    .eq('model_slug', normalizedSlug)
    .maybeSingle();

  if (error) {
    if (isSupabaseRelationMissingError(error)) return null;
    throw error;
  }

  return mapSupabaseModel(data);
}

export async function listOwnedModels() {
  const supabase = getSupabaseClient();
  const user = await getCurrentSupabaseUser();
  const ownerAuthUserId = getUserId(user);

  if (!supabase || !ownerAuthUserId) {
    return [];
  }

  const { data, error } = await supabase
    .from(MODELS_TABLE)
    .select(MODEL_SELECT_FIELDS)
    .eq('owner_auth_user_id', ownerAuthUserId)
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
async function assertModelSlugAvailable(modelSlug, ownerAuthUserId = '') {
  const existingModel = await getModelBySlug(modelSlug);
  if (!existingModel) {
    return buildModelSlug(modelSlug);
  }

  const existingOwnerAuthUserId = normalizeString(existingModel.owner_auth_user_id || '');
  const normalizedOwnerAuthUserId = normalizeString(ownerAuthUserId || '');

  if (existingOwnerAuthUserId && normalizedOwnerAuthUserId && existingOwnerAuthUserId === normalizedOwnerAuthUserId) {
    const error = new Error('MODEL_SLUG_ALREADY_OWNED');
    error.code = 'MODEL_SLUG_ALREADY_OWNED';
    throw error;
  }

  const error = new Error('MODEL_SLUG_TAKEN');
  error.code = 'MODEL_SLUG_TAKEN';
  throw error;
}

export async function createOwnedModel(values = {}) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    const error = new Error('MODEL_BACKEND_UNAVAILABLE');
    error.code = 'MODEL_BACKEND_UNAVAILABLE';
    throw error;
  }

  const user = await getCurrentSupabaseUser();
  const ownerAuthUserId = getUserId(user);
  if (!ownerAuthUserId) {
    const error = new Error('AUTH_REQUIRED');
    error.code = 'AUTH_REQUIRED';
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

  const modelSlug = await assertModelSlugAvailable(values.model_slug || modelName, ownerAuthUserId);
  const payload = {
    profile_id: profile.id,
    owner_auth_user_id: ownerAuthUserId,
    model_slug: modelSlug,
    model_name: modelName,
    description: normalizeString(values.description || ''),
    model_image_url: normalizeString(values.model_image_url || values.image_url || ''),
    creator_display_name: normalizeString(profile.public_display_name || profile.display_name || user.user_metadata?.name || ''),
    creator_username: normalizeUsername(profile.username || profile.username_lower || profile.public_username || ''),
    model_visibility: normalizeString(values.model_visibility || 'private'),
    lifecycle_state: 'draft',
    readiness_state: 'uninitialized',
    publication_state: normalizeString(values.publication_state || 'unpublished'),
    verification_state: normalizeString(values.verification_state || 'unverified'),
    training_state: 'uninitialized',
    interaction_state: normalizeString(values.interaction_state || 'private'),
    routing_class: normalizeString(values.routing_class || 'profile_continuity'),
    default_runtime_policy: {
      provider: normalizeString(values.provider || 'unassigned'),
      route: normalizeString(values.route || 'site_knowledge'),
      voice_enabled: values.voice_enabled === true,
    },
    deployment_origin: 'neuroartan_supabase',
    external_source_ref: {},
    source_count: 0,
    release_version: '0.1.0',
    workspace_state: 'active',
  };

  const { data, error } = await supabase
    .from(MODELS_TABLE)
    .insert(payload)
    .select(MODEL_SELECT_FIELDS)
    .single();

  if (error) throw error;

  return mapSupabaseModel(data);
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
