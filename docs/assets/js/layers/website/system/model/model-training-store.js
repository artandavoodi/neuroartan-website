/* =============================================================================
   MODEL TRAINING STORE
   Supabase-owned recipe, source, knowledge, logic, and run-request persistence.
============================================================================= */

import {
  ensureOwnedCanonicalModel,
  getCurrentSupabaseUser,
  isSupabaseRelationMissingError,
} from './model-store.js';
import {
  getSupabaseClient,
  normalizeString,
} from '../account/identity/account-profile-identity.js';
import { recordProfileChangelogEvent } from '../profile/profile-changelog-store.js';

const TRAINING_RECIPES_TABLE = 'model_training_recipes';
const TRAINING_RECIPE_SOURCES_TABLE = 'model_training_recipe_sources';
const TRAINING_RUN_REQUESTS_TABLE = 'model_training_run_requests';
const SOURCE_OBJECTS_TABLE = 'model_source_objects';
const LOGIC_RECORDS_TABLE = 'model_logic_records';
const PRIVACY_SOURCE_REGISTRY_TABLE = 'privacy_source_registry';
const PRIVACY_CONSENT_LEDGER_TABLE = 'privacy_consent_ledger';
const PRIVACY_PROCESSING_LEDGER_TABLE = 'privacy_processing_ledger';
const PRIVACY_STORAGE_LOCATION_REGISTRY_TABLE = 'privacy_storage_location_registry';
const TRAINING_SOURCE_BUCKET = 'model-training-sources';
const DATASET_SOURCE_KINDS = Object.freeze(['dataset_file', 'dataset_text', 'dataset_reference']);
const KNOWLEDGE_SOURCE_KINDS = Object.freeze(['knowledge_note', 'knowledge_asset']);
const SOURCE_VAULT_CONTENT_CHUNK_SIZE = 60000;
const SOURCE_VAULT_INSERT_BATCH_MAX_ROWS = 25;
const SOURCE_VAULT_INSERT_BATCH_MAX_CHARS = 500000;
const SOURCE_VAULT_FREE_PLAN_LIMITS = Object.freeze({
  acceptedFiles: 250,
  acceptedBytes: 5 * 1024 * 1024,
  contentCharacters: 1000000,
  childRows: 750,
});
const MODEL_SOURCE_PAGE_SIZE = 1000;
const MODEL_SOURCE_VAULT_INDEX_SELECT = 'id, model_id, profile_id, owner_auth_user_id, source_kind, source_title, source_reference, source_metadata, source_status, provenance_state, storage_bucket, storage_path, created_at, updated_at';
const MODEL_SOURCE_VAULT_SEARCH_SELECT = 'id, model_id, source_kind, source_title, source_reference, source_content, source_metadata, source_status, provenance_state, updated_at';
const MODEL_SOURCE_VAULT_SEARCH_LIMIT = 24;
const MODEL_SOURCE_VAULT_UUID_PATTERN = /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi;
const MODEL_SOURCE_VAULT_SECRET_PATTERN = /\b(?:sk-[a-z0-9_-]{12,}|pk_[a-z0-9_-]{12,}|eyJ[a-z0-9_-]{16,}|[a-z0-9]{32,})\b/gi;

const DEFAULT_RECIPE_GRAPH = Object.freeze({
  nodes: [
    { id: 'base-model', label: 'Base model', x: 40, y: 48 },
    { id: 'sources', label: 'Sources', x: 360, y: 48 },
    { id: 'execution', label: 'Execution', x: 680, y: 48 },
    { id: 'readiness', label: 'Readiness', x: 1000, y: 48 },
  ],
  connections: [
    { source: 'base-model', target: 'sources' },
    { source: 'sources', target: 'execution' },
    { source: 'execution', target: 'readiness' },
  ],
});

function cloneDefaultRecipeGraph() {
  return JSON.parse(JSON.stringify(DEFAULT_RECIPE_GRAPH));
}

function createTrainingSchemaError(error) {
  if (!isSupabaseRelationMissingError(error)) return error;
  const schemaError = new Error('MODEL_TRAINING_SCHEMA_REQUIRED');
  schemaError.code = 'MODEL_TRAINING_SCHEMA_REQUIRED';
  schemaError.cause = error;
  return schemaError;
}

function createPrivacySchemaError(error) {
  if (!isSupabaseRelationMissingError(error)) return error;
  const schemaError = new Error('PRIVACY_DATA_GOVERNANCE_SCHEMA_REQUIRED');
  schemaError.code = 'PRIVACY_DATA_GOVERNANCE_SCHEMA_REQUIRED';
  schemaError.cause = error;
  return schemaError;
}

function compactObject(value = {}) {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined)
  );
}

function normalizeGraphConfig(graphConfig = {}) {
  const fallback = cloneDefaultRecipeGraph();
  const nodes = Array.isArray(graphConfig?.nodes) && graphConfig.nodes.length
    ? graphConfig.nodes
    : fallback.nodes;
  const connections = Array.isArray(graphConfig?.connections)
    ? graphConfig.connections
    : fallback.connections;

  return {
    nodes: nodes.map((node) => ({
      id: normalizeString(node?.id),
      label: normalizeString(node?.label || node?.id),
      x: Number.isFinite(Number(node?.x)) ? Number(node.x) : 0,
      y: Number.isFinite(Number(node?.y)) ? Number(node.y) : 0,
    })).filter((node) => node.id),
    connections: connections.map((connection) => ({
      source: normalizeString(connection?.source),
      target: normalizeString(connection?.target),
    })).filter((connection) => connection.source && connection.target && connection.source !== connection.target),
  };
}

function normalizeExecutionConfig(values = {}) {
  return {
    epochs: Math.max(1, Number.parseInt(values.epochs, 10) || 1),
    learning_rate: normalizeString(values.learningRate || values.learning_rate || '0.0002'),
    context_length: Math.max(1, Number.parseInt(values.contextLength || values.context_length, 10) || 2048),
  };
}

function normalizeProviderValue(value = '') {
  const normalized = normalizeString(value);
  return normalized === 'hugging_face' ? 'model_registry' : normalized;
}

function normalizePrivacyStorageLocation(upload = null, values = {}) {
  const explicitLocation = normalizeString(values.storageLocation || values.storage_location);
  if (explicitLocation) return explicitLocation;
  if (upload?.bucket || upload?.path) return 'neuroartan_cloud';
  return 'user_selected_folder';
}

function normalizePrivacyProcessingDepth(upload = null, values = {}) {
  const explicitDepth = normalizeString(values.processingDepth || values.processing_depth);
  if (explicitDepth) return explicitDepth;
  if (upload?.bucket || upload?.path) return 'encrypted_cloud_copy';
  return 'metadata_only';
}

function normalizePrivacyClassification(values = {}) {
  return normalizeString(values.classification || values.privacyClassification || 'sensitive');
}

function normalizePrivacyConsentScope(values = {}, fallback = 'training_source_intake') {
  return normalizeString(values.consentScope || values.consent_scope || fallback);
}

function normalizeTrainingRecipe(row = {}) {
  if (!row || typeof row !== 'object') return null;
  const executionConfig = row.execution_config || {};

  return {
    id: normalizeString(row.id),
    modelId: normalizeString(row.model_id),
    profileId: normalizeString(row.profile_id),
    ownerAuthUserId: normalizeString(row.owner_auth_user_id),
    recipeName: normalizeString(row.recipe_name),
    baseModelProvider: normalizeProviderValue(row.base_model_provider || 'model_registry'),
    baseModel: normalizeString(row.base_model_reference),
    trainingMethod: normalizeString(row.training_method || 'supervised_fine_tuning'),
    sourceProfile: row.source_profile_foundation !== false,
    sourceThoughts: row.source_thought_bank === true,
    sourceDocuments: row.source_documents === true,
    sourceKnowledge: row.source_knowledge_base === true,
    epochs: Math.max(1, Number.parseInt(executionConfig.epochs, 10) || 1),
    learningRate: normalizeString(executionConfig.learning_rate || '0.0002'),
    contextLength: Math.max(1, Number.parseInt(executionConfig.context_length, 10) || 2048),
    graphConfig: normalizeGraphConfig(row.graph_config),
    recipeState: normalizeString(row.recipe_state || 'draft'),
    readinessState: normalizeString(row.readiness_state || 'draft'),
    runRequestState: normalizeString(row.run_request_state || 'not_requested'),
    createdAt: normalizeString(row.created_at),
    updatedAt: normalizeString(row.updated_at),
  };
}

async function getTrainingContext() {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('MODEL_BACKEND_UNAVAILABLE');

  const [model, user] = await Promise.all([
    ensureOwnedCanonicalModel(),
    getCurrentSupabaseUser(),
  ]);

  const profileId = normalizeString(model?.profile_id);
  const ownerAuthUserId = normalizeString(model?.owner_auth_user_id || user?.id);
  if (!model?.id || !profileId || !ownerAuthUserId) {
    throw new Error('CANONICAL_MODEL_TRAINING_CONTEXT_REQUIRED');
  }

  return {
    supabase,
    model,
    modelId: normalizeString(model.id),
    profileId,
    ownerAuthUserId,
  };
}

async function recordTrainingEvent(context, event = {}) {
  return recordProfileChangelogEvent({
    ...event,
    profile_id: context.profileId,
    metadata: {
      model_id: context.modelId,
      ...(event.metadata || {}),
    },
  });
}

async function createPrivacyGovernanceSourceRecord(context, values = {}) {
  const sourceLabel = normalizeString(values.sourceLabel || values.sourceTitle || values.label || values.name || 'Source');
  const sourceKind = normalizeString(values.sourceKind || values.source_kind || values.sourceType || 'training_source');
  const sourceReference = normalizeString(values.sourceReference || values.source_reference || values.reference || values.upload?.path || 'local-reference');
  const upload = values.upload || null;
  const storageLocation = normalizePrivacyStorageLocation(upload, values);
  const processingDepth = normalizePrivacyProcessingDepth(upload, values);
  const classification = normalizePrivacyClassification(values);
  const consentScope = normalizePrivacyConsentScope(values);
  const consentState = normalizeString(values.consentState || values.consent_state || 'requested');
  const now = new Date().toISOString();

  console.info('[Neuroartan][Privacy Governance Bridge] source intake started', {
    modelId: context.modelId,
    sourceKind,
    sourceLabel,
    sourceReference,
    storageLocation,
    processingDepth,
    classification,
    consentScope,
    consentState,
  });

  const sourcePayload = compactObject({
    user_id: context.ownerAuthUserId,
    profile_id: context.profileId,
    model_id: context.modelId,
    source_name: sourceLabel,
    source_type: sourceKind,
    file_extension: normalizeString(values.fileExtension || values.file_extension || upload?.name?.split('.').pop() || ''),
    mime_type: normalizeString(values.mimeType || values.mime_type || upload?.type || ''),
    storage_location: storageLocation,
    storage_reference: sourceReference,
    size_bytes: Number.isFinite(Number(upload?.size)) ? Number(upload.size) : undefined,
    classification,
    processing_depth: processingDepth,
    consent_state: consentState,
    cloud_copy_state: storageLocation === 'neuroartan_cloud' ? 'copied' : 'not_copied',
    derived_data_state: 'not_created',
    retention_rule: normalizeString(values.retentionRule || values.retention_rule || 'user_controlled'),
    export_eligible: values.exportEligible !== false,
    deletion_eligible: values.deletionEligible !== false,
    legal_review_required: classification === 'biometric_like' || classification === 'legacy',
    gc_review_required: classification === 'biometric_like' || classification === 'legacy',
    creo_review_required: classification === 'biometric_like' || classification === 'legacy',
    metadata: compactObject({
      recipe_id: normalizeString(values.recipeId || values.recipe_id),
      source_object_id: normalizeString(values.sourceObjectId || values.source_object_id),
      source_kind: sourceKind,
      upload,
      intake_owner: 'model_training_store',
      ...(values.metadata || {}),
    }),
    updated_at: now,
  });

  const { data: sourceRecord, error: sourceError } = await context.supabase
    .from(PRIVACY_SOURCE_REGISTRY_TABLE)
    .insert(sourcePayload)
    .select('*')
    .single();

  if (sourceError) throw createPrivacySchemaError(sourceError);

  console.info('[Neuroartan][Privacy Governance Bridge] source registry written', {
    sourceId: sourceRecord?.id,
    sourceReference,
  });

  const consentPayload = compactObject({
    user_id: context.ownerAuthUserId,
    profile_id: context.profileId,
    model_id: context.modelId,
    source_id: sourceRecord.id,
    consent_scope: consentScope,
    consent_state: consentState,
    processing_depth: processingDepth,
    storage_location: storageLocation,
    granted_at: consentState === 'granted' ? now : undefined,
    consent_version: '0.1.0',
    evidence: compactObject({
      source_reference: sourceReference,
      source_kind: sourceKind,
      intake_owner: 'model_training_store',
    }),
    updated_at: now,
  });

  const { data: consentRecord, error: consentError } = await context.supabase
    .from(PRIVACY_CONSENT_LEDGER_TABLE)
    .insert(consentPayload)
    .select('*')
    .single();

  if (consentError) throw createPrivacySchemaError(consentError);

  const { error: storageError } = await context.supabase
    .from(PRIVACY_STORAGE_LOCATION_REGISTRY_TABLE)
    .insert({
      user_id: context.ownerAuthUserId,
      profile_id: context.profileId,
      model_id: context.modelId,
      source_id: sourceRecord.id,
      storage_location: storageLocation,
      storage_label: storageLocation,
      storage_reference: sourceReference,
      has_neuroartan_copy: storageLocation === 'neuroartan_cloud',
      has_raw_content: Boolean(upload?.bucket || upload?.path),
      has_derived_content: false,
      encryption_state: storageLocation === 'neuroartan_cloud' ? 'platform_encrypted_storage_pending_verification' : 'not_applicable',
      retention_rule: sourcePayload.retention_rule,
      metadata: compactObject({
        bucket: upload?.bucket || '',
        path: upload?.path || '',
        intake_owner: 'model_training_store',
      }),
    });

  if (storageError) throw createPrivacySchemaError(storageError);

  const { error: processingError } = await context.supabase
    .from(PRIVACY_PROCESSING_LEDGER_TABLE)
    .insert({
      user_id: context.ownerAuthUserId,
      profile_id: context.profileId,
      model_id: context.modelId,
      source_id: sourceRecord.id,
      consent_id: consentRecord.id,
      processing_type: processingDepth,
      processing_purpose: normalizeString(values.processingPurpose || values.processing_purpose || 'model_training_source_intake'),
      processor_name: 'neuroartan',
      processor_type: 'internal',
      job_state: 'completed',
      started_at: now,
      completed_at: now,
      output_reference: sourceReference,
      output_metadata: compactObject({
        recipe_id: normalizeString(values.recipeId || values.recipe_id),
        source_object_id: normalizeString(values.sourceObjectId || values.source_object_id),
        intake_owner: 'model_training_store',
      }),
    });

  if (processingError) throw createPrivacySchemaError(processingError);

  console.info('[Neuroartan][Privacy Governance Bridge] source intake completed', {
    sourceId: sourceRecord?.id,
    consentId: consentRecord?.id,
    sourceReference,
  });

  return sourceRecord;
}

async function queuePrivacySourceDeletion(context, source = {}, deletionScope = 'training_source_removed') {
  const sourceReference = normalizeString(source?.source_reference || source?.storage_path || source?.sourceReference || source?.storagePath);
  if (!sourceReference) return null;

  const { data: privacySource, error: sourceError } = await context.supabase
    .from(PRIVACY_SOURCE_REGISTRY_TABLE)
    .select('*')
    .eq('user_id', context.ownerAuthUserId)
    .eq('model_id', context.modelId)
    .eq('storage_reference', sourceReference)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (sourceError) throw createPrivacySchemaError(sourceError);
  if (!privacySource?.id) return null;

  const { data, error } = await context.supabase
    .from('privacy_deletion_jobs')
    .insert({
      user_id: context.ownerAuthUserId,
      profile_id: context.profileId,
      model_id: context.modelId,
      source_id: privacySource.id,
      deletion_scope: deletionScope,
      delete_raw_source: Boolean(source?.storage_path || source?.source_config?.upload?.path),
      delete_parsed_text: true,
      delete_chunks: true,
      delete_embeddings: true,
      delete_memory_links: true,
      delete_voice_derivatives: false,
      delete_legacy_settings: false,
      job_state: 'queued',
      metadata: compactObject({
        source_reference: sourceReference,
        intake_owner: 'model_training_store',
      }),
    })
    .select('*')
    .single();

  if (error) throw createPrivacySchemaError(error);

  await context.supabase
    .from(PRIVACY_SOURCE_REGISTRY_TABLE)
    .update({
      derived_data_state: 'deletion_requested',
      updated_at: new Date().toISOString(),
    })
    .eq('id', privacySource.id)
    .eq('user_id', context.ownerAuthUserId);

  return data;
}

export function getDefaultTrainingRecipeGraph() {
  return cloneDefaultRecipeGraph();
}

export async function listTrainingRecipes() {
  const context = await getTrainingContext();
  const { data, error } = await context.supabase
    .from(TRAINING_RECIPES_TABLE)
    .select('*')
    .eq('model_id', context.modelId)
    .order('updated_at', { ascending: false });

  if (error) throw createTrainingSchemaError(error);
  return Array.isArray(data) ? data.map(normalizeTrainingRecipe).filter(Boolean) : [];
}

export async function readLatestTrainingRecipe() {
  const recipes = await listTrainingRecipes();
  return recipes[0] || null;
}

export async function saveTrainingRecipeDraft(values = {}) {
  const context = await getTrainingContext();
  const now = new Date().toISOString();
  const recipeId = normalizeString(values.id || values.recipeId);
  const foundationSources = values.foundationSources && typeof values.foundationSources === 'object'
    ? values.foundationSources
    : {};
  const hasFoundationSources = Object.keys(foundationSources).length > 0;
  const payload = compactObject({
    id: recipeId || undefined,
    model_id: context.modelId,
    profile_id: context.profileId,
    owner_auth_user_id: context.ownerAuthUserId,
    recipe_name: normalizeString(values.recipeName || 'Model foundation recipe'),
    base_model_provider: normalizeProviderValue(values.baseModelProvider || 'model_registry'),
    base_model_reference: normalizeString(values.baseModel),
    training_method: normalizeString(values.trainingMethod || 'supervised_fine_tuning'),
    source_profile_foundation: hasFoundationSources ? foundationSources.identity === true : values.sourceProfile !== false,
    source_thought_bank: hasFoundationSources ? foundationSources.memory === true : values.sourceThoughts === true,
    source_documents: hasFoundationSources ? foundationSources.memory === true : values.sourceDocuments === true,
    source_knowledge_base: hasFoundationSources ? foundationSources.source === true : values.sourceKnowledge === true,
    execution_config: normalizeExecutionConfig(values),
    graph_config: normalizeGraphConfig(values.graphConfig),
    recipe_state: 'draft',
    readiness_state: 'draft',
    updated_at: now,
  });

  const { data, error } = await context.supabase
    .from(TRAINING_RECIPES_TABLE)
    .upsert(payload)
    .select('*')
    .single();

  if (error) throw createTrainingSchemaError(error);
  const recipe = normalizeTrainingRecipe(data);
  await recordTrainingEvent(context, {
    area: 'model.training.recipe',
    action: recipeId ? 'recipe_draft_updated' : 'recipe_draft_created',
    title: recipeId ? 'Training recipe updated' : 'Training recipe created',
    detail: `${recipe.recipeName} was saved as a training draft.`,
    metadata: { recipe_id: recipe.id },
  });
  return recipe;
}

export async function listTrainingRecipeSources(recipeId) {
  const context = await getTrainingContext();
  const normalizedRecipeId = normalizeString(recipeId);
  if (!normalizedRecipeId) return [];

  const { data, error } = await context.supabase
    .from(TRAINING_RECIPE_SOURCES_TABLE)
    .select('*')
    .eq('recipe_id', normalizedRecipeId)
    .order('updated_at', { ascending: false });

  if (error) throw createTrainingSchemaError(error);
  return Array.isArray(data) ? data : [];
}

function sanitizeStorageFileName(value = '') {
  return normalizeString(value || 'source')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || 'source';
}

async function uploadTrainingSourceFile(context, file) {
  if (!(file instanceof File)) return null;
  const storagePath = [
    context.ownerAuthUserId,
    context.modelId,
    `${Date.now()}-${sanitizeStorageFileName(file.name)}`,
  ].join('/');

  const { error } = await context.supabase.storage
    .from(TRAINING_SOURCE_BUCKET)
    .upload(storagePath, file, {
      cacheControl: '3600',
      contentType: file.type || undefined,
      upsert: false,
    });

  if (error) throw error;
  return {
    bucket: TRAINING_SOURCE_BUCKET,
    path: storagePath,
    name: file.name,
    size: file.size,
    type: file.type || '',
  };
}

export async function addTrainingRecipeSource(recipeId, values = {}) {
  const context = await getTrainingContext();
  const normalizedRecipeId = normalizeString(recipeId);
  if (!normalizedRecipeId) throw new Error('TRAINING_RECIPE_REQUIRED');

  const upload = await uploadTrainingSourceFile(context, values.file);
  const sourceKind = normalizeString(values.sourceKind || 'external_url');
  const sourceLabel = normalizeString(values.sourceLabel || upload?.name || sourceKind);
  const sourceReference = normalizeString(values.sourceReference || upload?.path);
  if (!sourceLabel || !sourceReference) throw new Error('TRAINING_SOURCE_REFERENCE_REQUIRED');

  const sourceConfig = compactObject({
    upload,
    provider: normalizeString(values.provider || ''),
  });
  const payload = {
    recipe_id: normalizedRecipeId,
    model_id: context.modelId,
    profile_id: context.profileId,
    owner_auth_user_id: context.ownerAuthUserId,
    source_kind: sourceKind,
    source_label: sourceLabel,
    source_reference: sourceReference,
    source_config: sourceConfig,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await context.supabase
    .from(TRAINING_RECIPE_SOURCES_TABLE)
    .upsert(payload, { onConflict: 'recipe_id,source_kind,source_reference' })
    .select('*')
    .single();

  if (error) throw createTrainingSchemaError(error);

  const { error: sourceObjectError } = await context.supabase
    .from(SOURCE_OBJECTS_TABLE)
    .insert({
      model_id: context.modelId,
      profile_id: context.profileId,
      recipe_id: normalizedRecipeId,
      owner_auth_user_id: context.ownerAuthUserId,
      source_kind: sourceKind,
      source_title: sourceLabel,
      source_reference: sourceReference,
      storage_bucket: upload?.bucket || null,
      storage_path: upload?.path || null,
      source_metadata: sourceConfig,
      source_status: 'received',
      provenance_state: 'pending',
    });

  if (sourceObjectError) throw createTrainingSchemaError(sourceObjectError);

  await createPrivacyGovernanceSourceRecord(context, {
    recipeId: normalizedRecipeId,
    sourceKind,
    sourceLabel,
    sourceReference,
    upload,
    consentScope: 'training_recipe_source_intake',
    consentState: values.consentState || 'requested',
    classification: values.classification || 'sensitive',
    processingPurpose: 'model_training_recipe_source_intake',
    metadata: sourceConfig,
  });

  await recordTrainingEvent(context, {
    area: 'model.training.sources',
    action: 'training_source_added',
    title: 'Training source added',
    detail: `${sourceLabel} was attached to the training recipe.`,
    metadata: { recipe_id: normalizedRecipeId, source_kind: sourceKind },
  });
  return data;
}

export async function removeTrainingRecipeSource(sourceId) {
  const context = await getTrainingContext();
  const normalizedSourceId = normalizeString(sourceId);
  if (!normalizedSourceId) return;
  const { data: source, error: sourceReadError } = await context.supabase
    .from(TRAINING_RECIPE_SOURCES_TABLE)
    .select('*')
    .eq('id', normalizedSourceId)
    .maybeSingle();
  if (sourceReadError) throw createTrainingSchemaError(sourceReadError);

  const { error } = await context.supabase
    .from(TRAINING_RECIPE_SOURCES_TABLE)
    .delete()
    .eq('id', normalizedSourceId);
  if (error) throw createTrainingSchemaError(error);

  if (source?.source_reference) {
    const { error: objectError } = await context.supabase
      .from(SOURCE_OBJECTS_TABLE)
      .delete()
      .eq('recipe_id', source.recipe_id)
      .eq('source_reference', source.source_reference);
    if (objectError) throw createTrainingSchemaError(objectError);
  }

  await queuePrivacySourceDeletion(context, source, 'training_recipe_source_removed');

  const storagePath = source?.source_config?.upload?.path;
  if (storagePath) {
    const { error: storageError } = await context.supabase.storage
      .from(TRAINING_SOURCE_BUCKET)
      .remove([storagePath]);
    if (storageError) throw storageError;
  }
}

export async function requestTrainingRun(recipe) {
  const context = await getTrainingContext();
  const normalizedRecipeId = normalizeString(recipe?.id || recipe?.recipeId);
  if (!normalizedRecipeId) throw new Error('TRAINING_RECIPE_REQUIRED');
  const { count: externalSourceCount, error: sourceCountError } = await context.supabase
    .from(TRAINING_RECIPE_SOURCES_TABLE)
    .select('id', { count: 'exact', head: true })
    .eq('recipe_id', normalizedRecipeId);
  if (sourceCountError) throw createTrainingSchemaError(sourceCountError);

  const sourceReady = recipe?.sourceProfile === true
    || recipe?.sourceThoughts === true
    || recipe?.sourceDocuments === true
    || recipe?.sourceKnowledge === true
    || Number(externalSourceCount || 0) > 0;
  const executionConfig = normalizeExecutionConfig(recipe);
  const executionReady = executionConfig.epochs > 0
    && Boolean(executionConfig.learning_rate)
    && executionConfig.context_length > 0;
  if (!normalizeString(recipe?.baseModel) || !sourceReady || !executionReady) {
    throw new Error('TRAINING_RECIPE_NOT_READY');
  }

  const now = new Date().toISOString();
  const runPayload = {
    recipe_id: normalizedRecipeId,
    model_id: context.modelId,
    profile_id: context.profileId,
    owner_auth_user_id: context.ownerAuthUserId,
    request_state: 'queued_for_runner',
    runner_provider: 'not_connected',
    execution_config: executionConfig,
    graph_config: normalizeGraphConfig(recipe.graphConfig),
    requested_at: now,
    updated_at: now,
  };
  const { data, error } = await context.supabase
    .from(TRAINING_RUN_REQUESTS_TABLE)
    .insert(runPayload)
    .select('*')
    .single();
  if (error) throw createTrainingSchemaError(error);

  const { error: recipeError } = await context.supabase
    .from(TRAINING_RECIPES_TABLE)
    .update({
      readiness_state: 'queued',
      run_request_state: 'queued_for_runner',
      updated_at: now,
    })
    .eq('id', normalizedRecipeId);
  if (recipeError) throw createTrainingSchemaError(recipeError);

  await recordTrainingEvent(context, {
    area: 'model.training.readiness',
    action: 'training_run_queued',
    title: 'Training run queued',
    detail: 'The recipe was queued for a connected training runner.',
    metadata: { recipe_id: normalizedRecipeId, run_request_id: data.id },
  });
  return data;
}

export async function listModelKnowledgeEntries() {
  const context = await getTrainingContext();
  return listModelSourceObjectRows(context, KNOWLEDGE_SOURCE_KINDS);
}

export async function createModelDatasetEntry(values = {}) {
  const context = await getTrainingContext();
  const upload = await uploadTrainingSourceFile(context, values.file);
  const sourceKind = normalizeString(values.sourceKind || (upload ? 'dataset_file' : 'dataset_text'));
  const sourceTitle = normalizeString(values.sourceTitle || values.datasetTitle || upload?.name || 'Dataset');
  const sourceContent = normalizeString(values.sourceContent || values.datasetContent);
  const sourceReference = normalizeString(values.sourceReference || values.datasetReference || upload?.path || `dataset:${Date.now()}`);
  if (!sourceTitle || (!sourceContent && !sourceReference)) throw new Error('MODEL_DATASET_REQUIRED');

  const sourcePayload = {
    model_id: context.modelId,
    profile_id: context.profileId,
    owner_auth_user_id: context.ownerAuthUserId,
    source_kind: DATASET_SOURCE_KINDS.includes(sourceKind) ? sourceKind : 'dataset_text',
    source_title: sourceTitle,
    source_content: sourceContent || null,
    source_reference: sourceReference,
    storage_bucket: upload?.bucket || null,
    storage_path: upload?.path || null,
    source_metadata: compactObject({
      upload,
      original_name: upload?.name || '',
      source_format: normalizeString(values.sourceFormat || values.datasetFormat || ''),
    }),
    source_status: 'received',
    provenance_state: 'pending',
  };

  const { data, error } = await context.supabase
    .from(SOURCE_OBJECTS_TABLE)
    .insert(sourcePayload)
    .select('*')
    .single();
  if (error) throw createTrainingSchemaError(error);

  await createPrivacyGovernanceSourceRecord(context, {
    sourceObjectId: data.id,
    sourceKind: sourcePayload.source_kind,
    sourceLabel: sourceTitle,
    sourceReference,
    upload,
    consentScope: 'model_dataset_source_intake',
    consentState: normalizeString(values.consentState || 'requested'),
    classification: normalizeString(values.classification || 'sensitive'),
    processingPurpose: 'model_dataset_source_intake',
    metadata: sourcePayload.source_metadata,
  });

  await recordTrainingEvent(context, {
    area: 'model.training.datasets',
    action: 'dataset_added',
    title: 'Training dataset added',
    detail: `${sourceTitle} was added to the private training dataset library.`,
    metadata: { source_object_id: data.id },
  });
  return data;
}

export async function upsertModelSourceVaultPackageEntry(packageRecord = {}) {
  const context = await getTrainingContext();
  validateSourceVaultPackagePlanBudget(packageRecord);
  const sourceReference = normalizeString(packageRecord.sourceReference || (packageRecord.id ? `source-vault:${packageRecord.id}` : ''));
  const sourceTitle = normalizeString(packageRecord.sourceLabel || packageRecord.sourceTypeLabel || 'Source Vault package');
  const contentFiles = Array.isArray(packageRecord.contentFiles) ? packageRecord.contentFiles : [];
  const contentFileMetadata = contentFiles.map((file) => {
    const {
      content,
      ...metadata
    } = file && typeof file === 'object' ? file : {};
    return {
      ...metadata,
      contentLength: Number(file?.contentLength ?? normalizeString(content).length ?? 0),
    };
  });
  if (!sourceReference || !sourceTitle) throw new Error('SOURCE_VAULT_PACKAGE_REQUIRED');
  const sourceVaultPackageId = normalizeString(packageRecord.id);

  const sourceMetadata = compactObject({
    source_vault_package_id: sourceVaultPackageId,
    source_vault_record_role: 'source_vault_package',
    source_type: normalizeString(packageRecord.sourceType),
    source_type_label: normalizeString(packageRecord.sourceTypeLabel),
    selected_formats: Array.isArray(packageRecord.selectedFormats) ? packageRecord.selectedFormats : [],
    detected_format_counts: packageRecord.detectedFormatCounts || {},
    accepted_count: Number(packageRecord.acceptedCount || 0),
    excluded_count: Number(packageRecord.excludedCount || 0),
    total_accepted_bytes: Number(packageRecord.totalAcceptedBytes || 0),
    selected_connectors: Array.isArray(packageRecord.selectedConnectors) ? packageRecord.selectedConnectors : [],
    accepted_file_preview: Array.isArray(packageRecord.acceptedFiles) ? packageRecord.acceptedFiles.slice(0, 100) : [],
    excluded_file_preview: Array.isArray(packageRecord.excludedFiles) ? packageRecord.excludedFiles.slice(0, 100) : [],
    content_file_preview: contentFileMetadata.slice(0, 100),
    content_file_count: Number(packageRecord.contentFileCount ?? contentFiles.length ?? 0),
    extracted_content_file_count: contentFiles.filter((file) => normalizeString(file?.contentStatus) === 'extracted').length,
    intake_owner: 'model_source_vault',
  });

  const sourcePayload = {
    model_id: context.modelId,
    profile_id: context.profileId,
    owner_auth_user_id: context.ownerAuthUserId,
    source_kind: 'dataset_reference',
    source_title: sourceTitle,
    source_content: null,
    source_reference: sourceReference,
    storage_bucket: null,
    storage_path: null,
    source_metadata: sourceMetadata,
    source_status: 'received',
    provenance_state: 'pending',
    updated_at: new Date().toISOString(),
  };
  const childPayloads = createSourceVaultChildPayloads(context, packageRecord, sourceReference);
  validateSourceVaultChildPayloadBudget(childPayloads);

  const { data: existing, error: existingError } = await context.supabase
    .from(SOURCE_OBJECTS_TABLE)
    .select('*')
    .eq('model_id', context.modelId)
    .eq('source_kind', 'dataset_reference')
    .eq('source_reference', sourceReference)
    .maybeSingle();
  if (existingError) throw createTrainingSchemaError(existingError);

  let parentRecord = null;
  if (existing?.id) {
    const { data, error } = await context.supabase
      .from(SOURCE_OBJECTS_TABLE)
      .update(sourcePayload)
      .eq('id', existing.id)
      .eq('model_id', context.modelId)
      .select('*')
      .single();
    if (error) throw createTrainingSchemaError(error);
    parentRecord = data;

    await recordTrainingEvent(context, {
      area: 'model.foundation.source',
      action: 'source_vault_package_updated',
      title: 'Source Vault package updated',
      detail: `${sourceTitle} was updated in the private source database.`,
      metadata: { source_object_id: data.id, source_reference: sourceReference },
    });
  } else {
    const { data, error } = await context.supabase
      .from(SOURCE_OBJECTS_TABLE)
      .insert(sourcePayload)
      .select('*')
      .single();
    if (error) throw createTrainingSchemaError(error);
    parentRecord = data;

    await createPrivacyGovernanceSourceRecord(context, {
      sourceObjectId: data.id,
      sourceKind: sourcePayload.source_kind,
      sourceLabel: sourceTitle,
      sourceReference,
      consentScope: 'model_source_vault_intake',
      consentState: 'requested',
      classification: 'sensitive',
      processingPurpose: 'model_source_vault_intake',
      metadata: sourceMetadata,
    });

    await recordTrainingEvent(context, {
      area: 'model.foundation.source',
      action: 'source_vault_package_added',
      title: 'Source Vault package added',
      detail: `${sourceTitle} was added to the private source database.`,
      metadata: { source_object_id: data.id, source_reference: sourceReference },
    });
  }

  await replaceSourceVaultChildRows(context, sourceVaultPackageId, childPayloads);
  return parentRecord;
}

function validateSourceVaultPackagePlanBudget(packageRecord = {}) {
  const acceptedFiles = Array.isArray(packageRecord.acceptedFiles) ? packageRecord.acceptedFiles : [];
  const contentFiles = Array.isArray(packageRecord.contentFiles) ? packageRecord.contentFiles : [];
  const acceptedCount = Number(packageRecord.acceptedCount ?? acceptedFiles.length ?? 0);
  const totalAcceptedBytes = Number(packageRecord.totalAcceptedBytes || acceptedFiles.reduce((sum, file) => sum + (Number(file?.size) || 0), 0));
  const contentCharacters = contentFiles.reduce((sum, file) => sum + normalizeString(file?.content).length, 0);
  const violations = [];

  if (acceptedCount > SOURCE_VAULT_FREE_PLAN_LIMITS.acceptedFiles) {
    violations.push(`${acceptedCount} files exceeds ${SOURCE_VAULT_FREE_PLAN_LIMITS.acceptedFiles}`);
  }
  if (totalAcceptedBytes > SOURCE_VAULT_FREE_PLAN_LIMITS.acceptedBytes) {
    violations.push(`${totalAcceptedBytes} bytes exceeds ${SOURCE_VAULT_FREE_PLAN_LIMITS.acceptedBytes}`);
  }
  if (contentCharacters > SOURCE_VAULT_FREE_PLAN_LIMITS.contentCharacters) {
    violations.push(`${contentCharacters} extracted characters exceeds ${SOURCE_VAULT_FREE_PLAN_LIMITS.contentCharacters}`);
  }

  if (!violations.length) return;

  const error = new Error('SOURCE_VAULT_PLAN_LIMIT_EXCEEDED');
  error.code = 'SOURCE_VAULT_PLAN_LIMIT_EXCEEDED';
  error.details = {
    violations,
    limits: SOURCE_VAULT_FREE_PLAN_LIMITS,
    acceptedCount,
    totalAcceptedBytes,
    contentCharacters,
  };
  throw error;
}

function validateSourceVaultChildPayloadBudget(childPayloads = []) {
  if (childPayloads.length <= SOURCE_VAULT_FREE_PLAN_LIMITS.childRows) return;
  const error = new Error('SOURCE_VAULT_PLAN_LIMIT_EXCEEDED');
  error.code = 'SOURCE_VAULT_PLAN_LIMIT_EXCEEDED';
  error.details = {
    violations: [`${childPayloads.length} child rows exceeds ${SOURCE_VAULT_FREE_PLAN_LIMITS.childRows}`],
    limits: SOURCE_VAULT_FREE_PLAN_LIMITS,
    childRows: childPayloads.length,
  };
  throw error;
}

function createSourceVaultChildPayloads(context, packageRecord = {}, parentReference = '') {
  const contentFiles = Array.isArray(packageRecord.contentFiles) ? packageRecord.contentFiles : [];
  const sourceVaultPackageId = normalizeString(packageRecord.id);
  const sourceType = normalizeString(packageRecord.sourceType);
  const now = new Date().toISOString();
  return contentFiles.flatMap((file, fileIndex) => {
    const fileContent = normalizeString(file?.content);
    const relativePath = normalizeString(file?.relativePath || file?.name || `source-file-${fileIndex + 1}`);
    const fileHash = hashTrainingSourceString(`${relativePath}:${fileIndex}`);
    const baseMetadata = compactObject({
      source_vault_package_id: sourceVaultPackageId,
      source_vault_parent_reference: parentReference,
      source_vault_record_role: 'source_vault_file',
      source_type: sourceType,
      file_index: fileIndex,
      file_name: normalizeString(file?.name),
      relative_path: relativePath,
      extension: normalizeString(file?.extension),
      size: Number(file?.size || 0),
      size_label: normalizeString(file?.sizeLabel),
      content_status: normalizeString(file?.contentStatus || (fileContent ? 'extracted' : 'metadata_only')),
      content_length: Number(file?.contentLength ?? fileContent.length ?? 0),
      intake_owner: 'model_source_vault',
    });

    if (!fileContent) {
      return [{
        model_id: context.modelId,
        profile_id: context.profileId,
        owner_auth_user_id: context.ownerAuthUserId,
        source_kind: 'dataset_reference',
        source_title: relativePath,
        source_content: null,
        source_reference: `${parentReference}:file:${fileHash}:metadata`,
        storage_bucket: null,
        storage_path: null,
        source_metadata: baseMetadata,
        source_status: 'received',
        provenance_state: 'pending',
        updated_at: now,
      }];
    }

    const chunkCount = Math.max(1, Math.ceil(fileContent.length / SOURCE_VAULT_CONTENT_CHUNK_SIZE));
    return Array.from({ length: chunkCount }, (_, chunkIndex) => {
      const start = chunkIndex * SOURCE_VAULT_CONTENT_CHUNK_SIZE;
      const content = fileContent.slice(start, start + SOURCE_VAULT_CONTENT_CHUNK_SIZE);
      return {
        model_id: context.modelId,
        profile_id: context.profileId,
        owner_auth_user_id: context.ownerAuthUserId,
        source_kind: 'dataset_text',
        source_title: chunkCount > 1 ? `${relativePath} · ${chunkIndex + 1}/${chunkCount}` : relativePath,
        source_content: content,
        source_reference: `${parentReference}:file:${fileHash}:chunk:${chunkIndex + 1}`,
        storage_bucket: null,
        storage_path: null,
        source_metadata: {
          ...baseMetadata,
          chunk_index: chunkIndex,
          chunk_count: chunkCount,
          chunk_start: start,
          chunk_end: start + content.length,
        },
        source_status: 'received',
        provenance_state: 'pending',
        updated_at: now,
      };
    });
  });
}

async function replaceSourceVaultChildRows(context, sourceVaultPackageId = '', childPayloads = []) {
  const normalizedPackageId = normalizeString(sourceVaultPackageId);
  if (!normalizedPackageId) return;

  const { error: deleteError } = await context.supabase
    .from(SOURCE_OBJECTS_TABLE)
    .delete()
    .eq('model_id', context.modelId)
    .contains('source_metadata', {
      source_vault_package_id: normalizedPackageId,
      source_vault_record_role: 'source_vault_file',
    });
  if (deleteError) throw createTrainingSchemaError(deleteError);

  const batches = createSourceVaultInsertBatches(childPayloads);
  for (const batch of batches) {
    const { error } = await context.supabase
      .from(SOURCE_OBJECTS_TABLE)
      .insert(batch);
    if (error) throw createTrainingSchemaError(error);
  }
}

function createSourceVaultInsertBatches(payloads = []) {
  const batches = [];
  let currentBatch = [];
  let currentCharacterCount = 0;

  payloads.forEach((payload) => {
    const contentLength = normalizeString(payload?.source_content).length;
    const nextBatchTooLarge = currentBatch.length >= SOURCE_VAULT_INSERT_BATCH_MAX_ROWS
      || (currentBatch.length > 0 && currentCharacterCount + contentLength > SOURCE_VAULT_INSERT_BATCH_MAX_CHARS);

    if (nextBatchTooLarge) {
      batches.push(currentBatch);
      currentBatch = [];
      currentCharacterCount = 0;
    }

    currentBatch.push(payload);
    currentCharacterCount += contentLength;
  });

  if (currentBatch.length) batches.push(currentBatch);
  return batches;
}

function hashTrainingSourceString(value = '') {
  let hash = 0;
  const text = normalizeString(value);
  for (let index = 0; index < text.length; index += 1) {
    hash = ((hash << 5) - hash + text.charCodeAt(index)) | 0;
  }
  return Math.abs(hash).toString(36);
}

export async function listModelDatasetEntries() {
  const context = await getTrainingContext();
  return listModelSourceObjectRows(context, DATASET_SOURCE_KINDS);
}

export async function listModelSourceVaultEntries() {
  const context = await getTrainingContext();
  return listModelSourceObjectRows(context, DATASET_SOURCE_KINDS, {
    metadataContains: {
      intake_owner: 'model_source_vault',
    },
  });
}

export async function listModelSourceVaultIndexEntries() {
  const context = await getTrainingContext();
  return listModelSourceObjectRows(context, DATASET_SOURCE_KINDS, {
    select: MODEL_SOURCE_VAULT_INDEX_SELECT,
    metadataContains: {
      intake_owner: 'model_source_vault',
    },
  });
}

export async function listModelSourceVaultPackageEntries() {
  const context = await getTrainingContext();
  return listModelSourceObjectRows(context, DATASET_SOURCE_KINDS, {
    select: MODEL_SOURCE_VAULT_INDEX_SELECT,
    metadataContains: {
      intake_owner: 'model_source_vault',
      source_vault_record_role: 'source_vault_package',
    },
  });
}

export async function searchModelSourceVaultEntries(searchTerm = '', options = {}) {
  const context = await getTrainingContext();
  const query = normalizeString(searchTerm);
  if (!query) return [];

  const limit = Math.max(1, Math.min(50, Number(options.limit || MODEL_SOURCE_VAULT_SEARCH_LIMIT) || MODEL_SOURCE_VAULT_SEARCH_LIMIT));
  const pattern = `%${escapeSupabaseLikePattern(query)}%`;
  const [titleRows, contentRows] = await Promise.all([
    queryModelSourceVaultSearchRows(context, 'source_title', pattern, limit),
    queryModelSourceVaultSearchRows(context, 'source_content', pattern, limit),
  ]);

  const mergedRows = new Map();
  [...titleRows, ...contentRows].forEach((row) => {
    if (!row?.id || mergedRows.has(row.id)) return;
    mergedRows.set(row.id, row);
  });

  return Array.from(mergedRows.values())
    .slice(0, limit)
    .map((row) => normalizeModelSourceVaultSearchResult(row, query));
}

export async function listModelTrainingDatasetEntries() {
  const context = await getTrainingContext();
  return listModelSourceObjectRows(context, DATASET_SOURCE_KINDS, {
    excludeSourceVault: true,
  });
}

export async function removeModelSourceVaultPackageEntry(entryId) {
  const context = await getTrainingContext();
  const normalizedEntryId = normalizeString(entryId);
  if (!normalizedEntryId) return;

  const { data: source, error: sourceReadError } = await context.supabase
    .from(SOURCE_OBJECTS_TABLE)
    .select(MODEL_SOURCE_VAULT_INDEX_SELECT)
    .eq('id', normalizedEntryId)
    .eq('model_id', context.modelId)
    .maybeSingle();
  if (sourceReadError) throw createTrainingSchemaError(sourceReadError);
  if (!source?.id) return;

  const metadata = source.source_metadata && typeof source.source_metadata === 'object' ? source.source_metadata : {};
  const sourceVaultPackageId = normalizeString(metadata.source_vault_package_id);
  const packageTitle = normalizeString(source.source_title || 'Source Vault package');
  const sourceRows = sourceVaultPackageId
    ? await listModelSourceVaultPackageRows(context, sourceVaultPackageId)
    : [source];
  const storagePaths = sourceRows
    .map((row) => normalizeString(row?.storage_path))
    .filter(Boolean);

  let deleteQuery = context.supabase
    .from(SOURCE_OBJECTS_TABLE)
    .delete()
    .eq('model_id', context.modelId);

  if (sourceVaultPackageId) {
    deleteQuery = deleteQuery.contains('source_metadata', {
      source_vault_package_id: sourceVaultPackageId,
    });
  } else {
    deleteQuery = deleteQuery.eq('id', normalizedEntryId);
  }

  const { error } = await deleteQuery;
  if (error) throw createTrainingSchemaError(error);

  await queuePrivacySourceDeletion(context, source, 'model_source_vault_package_removed');

  if (storagePaths.length) {
    const { error: storageError } = await context.supabase.storage
      .from(TRAINING_SOURCE_BUCKET)
      .remove(storagePaths);
    if (storageError) throw storageError;
  }

  await recordTrainingEvent(context, {
    area: 'model.foundation.source',
    action: 'source_vault_package_removed',
    title: 'Source Vault package removed',
    detail: `${packageTitle} was removed from the private source database.`,
    metadata: {
      source_object_id: normalizedEntryId,
      source_vault_package_id: sourceVaultPackageId,
      removed_source_rows: sourceRows.length,
    },
  });
}

export async function removeModelDatasetEntry(entryId) {
  const context = await getTrainingContext();
  const normalizedEntryId = normalizeString(entryId);
  if (!normalizedEntryId) return;

  const { data: source, error: sourceReadError } = await context.supabase
    .from(SOURCE_OBJECTS_TABLE)
    .select('*')
    .eq('id', normalizedEntryId)
    .eq('model_id', context.modelId)
    .maybeSingle();
  if (sourceReadError) throw createTrainingSchemaError(sourceReadError);

  const { error } = await context.supabase
    .from(SOURCE_OBJECTS_TABLE)
    .delete()
    .eq('id', normalizedEntryId)
    .eq('model_id', context.modelId)
    .in('source_kind', DATASET_SOURCE_KINDS);
  if (error) throw createTrainingSchemaError(error);

  await queuePrivacySourceDeletion(context, source, 'model_dataset_entry_removed');

  if (source?.storage_path) {
    const { error: storageError } = await context.supabase.storage
      .from(TRAINING_SOURCE_BUCKET)
      .remove([source.storage_path]);
    if (storageError) throw storageError;
  }
}

async function updateModelSourceEntry(entryId, values = {}, allowedSourceKinds = [], eventConfig = {}) {
  const context = await getTrainingContext();
  const normalizedEntryId = normalizeString(entryId);
  const sourceTitle = normalizeString(values.sourceTitle || values.title);
  const sourceContent = normalizeString(values.sourceContent || values.text || values.content);
  const sourceReference = normalizeString(values.sourceReference || values.reference);
  if (!normalizedEntryId || !sourceTitle) throw new Error('MODEL_SOURCE_UPDATE_REQUIRED');

  const payload = compactObject({
    source_title: sourceTitle,
    source_content: sourceContent || null,
    source_reference: sourceReference || undefined,
    source_metadata: values.sourceMetadata || values.metadata || undefined,
    updated_at: new Date().toISOString(),
  });

  let query = context.supabase
    .from(SOURCE_OBJECTS_TABLE)
    .update(payload)
    .eq('id', normalizedEntryId)
    .eq('model_id', context.modelId);

  if (Array.isArray(allowedSourceKinds) && allowedSourceKinds.length) {
    query = query.in('source_kind', allowedSourceKinds);
  }

  const { data, error } = await query.select('*').single();
  if (error) throw createTrainingSchemaError(error);

  await recordTrainingEvent(context, {
    area: eventConfig.area || 'model.training.sources',
    action: eventConfig.action || 'source_updated',
    title: eventConfig.title || 'Training source updated',
    detail: `${sourceTitle} was updated in the private training source library.`,
    metadata: { source_object_id: data.id },
  });
  return data;
}

export async function updateModelDatasetEntry(entryId, values = {}) {
  return updateModelSourceEntry(entryId, values, DATASET_SOURCE_KINDS, {
    area: 'model.training.datasets',
    action: 'dataset_updated',
    title: 'Training dataset updated',
  });
}

export async function createModelKnowledgeEntry(values = {}) {
  const context = await getTrainingContext();
  const normalizedValues = typeof values === 'string' ? { sourceContent: values } : values;
  const upload = await uploadTrainingSourceFile(context, normalizedValues.file);
  const sourceTitle = normalizeString(
    normalizedValues.sourceTitle
    || normalizedValues.knowledgeTitle
    || upload?.name
    || normalizeString(normalizedValues.sourceContent || normalizedValues.text).slice(0, 80)
  );
  const sourceContent = normalizeString(normalizedValues.sourceContent || normalizedValues.text);
  const sourceReference = normalizeString(normalizedValues.sourceReference || upload?.path || `knowledge-note:${Date.now()}`);
  if (!sourceTitle || (!sourceContent && !sourceReference)) throw new Error('KNOWLEDGE_NOTE_REQUIRED');

  const sourcePayload = {
    model_id: context.modelId,
    profile_id: context.profileId,
    owner_auth_user_id: context.ownerAuthUserId,
    source_kind: upload ? 'knowledge_asset' : 'knowledge_note',
    source_title: sourceTitle,
    source_content: sourceContent || null,
    source_reference: sourceReference,
    storage_bucket: upload?.bucket || null,
    storage_path: upload?.path || null,
    source_metadata: compactObject({
      upload,
      knowledge_category: normalizeString(normalizedValues.knowledgeCategory || ''),
    }),
    source_status: 'received',
    provenance_state: 'pending',
  };

  const { data, error } = await context.supabase
    .from(SOURCE_OBJECTS_TABLE)
    .insert(sourcePayload)
    .select('*')
    .single();
  if (error) throw createTrainingSchemaError(error);

  await createPrivacyGovernanceSourceRecord(context, {
    sourceObjectId: data.id,
    sourceKind: sourcePayload.source_kind,
    sourceLabel: sourceTitle,
    sourceReference,
    upload,
    consentScope: 'model_knowledge_source_intake',
    consentState: normalizeString(normalizedValues.consentState || 'requested'),
    classification: normalizeString(normalizedValues.classification || 'sensitive'),
    processingPurpose: 'model_knowledge_source_intake',
    metadata: sourcePayload.source_metadata,
  });

  await recordTrainingEvent(context, {
    area: 'model.training.knowledge-base',
    action: upload ? 'knowledge_asset_added' : 'knowledge_note_added',
    title: upload ? 'Knowledge asset added' : 'Knowledge note added',
    detail: `${sourceTitle} was added to the private knowledge base.`,
    metadata: { source_object_id: data.id },
  });
  return data;
}

export async function removeModelKnowledgeEntry(entryId) {
  const context = await getTrainingContext();
  const normalizedEntryId = normalizeString(entryId);
  if (!normalizedEntryId) return;

  const { data: source, error: sourceReadError } = await context.supabase
    .from(SOURCE_OBJECTS_TABLE)
    .select('*')
    .eq('id', normalizedEntryId)
    .eq('model_id', context.modelId)
    .maybeSingle();
  if (sourceReadError) throw createTrainingSchemaError(sourceReadError);

  const { error } = await context.supabase
    .from(SOURCE_OBJECTS_TABLE)
    .delete()
    .eq('id', normalizedEntryId)
    .eq('model_id', context.modelId)
    .in('source_kind', KNOWLEDGE_SOURCE_KINDS);
  if (error) throw createTrainingSchemaError(error);

  await queuePrivacySourceDeletion(context, source, 'model_knowledge_entry_removed');

  if (source?.storage_path) {
    const { error: storageError } = await context.supabase.storage
      .from(TRAINING_SOURCE_BUCKET)
      .remove([source.storage_path]);
    if (storageError) throw storageError;
  }
}

export async function updateModelKnowledgeEntry(entryId, values = {}) {
  return updateModelSourceEntry(entryId, values, KNOWLEDGE_SOURCE_KINDS, {
    area: 'model.training.knowledge-base',
    action: 'knowledge_entry_updated',
    title: 'Knowledge entry updated',
  });
}

export async function listModelLogicRecords() {
  const context = await getTrainingContext();
  const rows = [];
  for (let from = 0; ; from += MODEL_SOURCE_PAGE_SIZE) {
    const to = from + MODEL_SOURCE_PAGE_SIZE - 1;
    const { data, error } = await context.supabase
      .from(LOGIC_RECORDS_TABLE)
      .select('*')
      .eq('model_id', context.modelId)
      .order('display_order', { ascending: true })
      .order('updated_at', { ascending: false })
      .range(from, to);
    if (error) throw createTrainingSchemaError(error);
    const page = Array.isArray(data) ? data : [];
    rows.push(...page);
    if (page.length < MODEL_SOURCE_PAGE_SIZE) break;
  }
  return rows;
}

async function listModelSourceObjectRows(context, sourceKinds = [], options = {}) {
  const rows = [];
  for (let from = 0; ; from += MODEL_SOURCE_PAGE_SIZE) {
    const to = from + MODEL_SOURCE_PAGE_SIZE - 1;
    let query = context.supabase
      .from(SOURCE_OBJECTS_TABLE)
      .select(options.select || '*')
      .eq('model_id', context.modelId)
      .in('source_kind', sourceKinds)
      .order('updated_at', { ascending: false });

    if (options.metadataContains && typeof options.metadataContains === 'object') {
      query = query.contains('source_metadata', options.metadataContains);
    }

    if (options.excludeSourceVault === true) {
      query = query.not('source_metadata->>intake_owner', 'eq', 'model_source_vault');
    }

    const { data, error } = await query.range(from, to);
    if (error) throw createTrainingSchemaError(error);
    const page = Array.isArray(data) ? data : [];
    rows.push(...page);
    if (page.length < MODEL_SOURCE_PAGE_SIZE) break;
  }
  return rows;
}

async function listModelSourceVaultPackageRows(context, sourceVaultPackageId = '') {
  const normalizedPackageId = normalizeString(sourceVaultPackageId);
  if (!normalizedPackageId) return [];
  return listModelSourceObjectRows(context, DATASET_SOURCE_KINDS, {
    select: MODEL_SOURCE_VAULT_INDEX_SELECT,
    metadataContains: {
      source_vault_package_id: normalizedPackageId,
    },
  });
}

async function queryModelSourceVaultSearchRows(context, column = 'source_title', pattern = '', limit = MODEL_SOURCE_VAULT_SEARCH_LIMIT) {
  const normalizedColumn = column === 'source_content' ? 'source_content' : 'source_title';
  const { data, error } = await context.supabase
    .from(SOURCE_OBJECTS_TABLE)
    .select(MODEL_SOURCE_VAULT_SEARCH_SELECT)
    .eq('model_id', context.modelId)
    .in('source_kind', DATASET_SOURCE_KINDS)
    .contains('source_metadata', {
      intake_owner: 'model_source_vault',
    })
    .ilike(normalizedColumn, pattern)
    .order('updated_at', { ascending: false })
    .limit(limit);
  if (error) throw createTrainingSchemaError(error);
  return Array.isArray(data) ? data : [];
}

function normalizeModelSourceVaultSearchResult(row = {}, query = '') {
  const metadata = row.source_metadata && typeof row.source_metadata === 'object' ? row.source_metadata : {};
  const content = normalizeString(row.source_content);
  const title = redactModelSourceVaultSensitiveText(normalizeString(row.source_title || metadata.relative_path || 'Source Vault record'));
  const excerpt = content
    ? redactModelSourceVaultSensitiveText(createSourceVaultSearchExcerpt(content, query))
    : redactModelSourceVaultSensitiveText(normalizeString(metadata.relative_path || title));

  return {
    id: normalizeString(row.id),
    title,
    sourceKind: normalizeString(row.source_kind),
    sourceReference: '',
    excerpt,
    metadata,
    updatedAt: normalizeString(row.updated_at),
  };
}

function redactModelSourceVaultSensitiveText(value = '') {
  MODEL_SOURCE_VAULT_UUID_PATTERN.lastIndex = 0;
  MODEL_SOURCE_VAULT_SECRET_PATTERN.lastIndex = 0;
  return normalizeString(value)
    .replace(MODEL_SOURCE_VAULT_UUID_PATTERN, '[protected id]')
    .replace(MODEL_SOURCE_VAULT_SECRET_PATTERN, '[protected secret]');
}

function createSourceVaultSearchExcerpt(content = '', query = '') {
  const text = normalizeString(content).replace(/\s+/g, ' ');
  if (!text) return '';
  const needle = normalizeString(query).toLowerCase();
  const index = needle ? text.toLowerCase().indexOf(needle) : -1;
  const start = index >= 0 ? Math.max(0, index - 90) : 0;
  const end = Math.min(text.length, start + 240);
  const prefix = start > 0 ? '...' : '';
  const suffix = end < text.length ? '...' : '';
  return `${prefix}${text.slice(start, end)}${suffix}`;
}

function escapeSupabaseLikePattern(value = '') {
  return normalizeString(value)
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_');
}

export async function createModelLogicRecord(values = {}) {
  const context = await getTrainingContext();
  const logicTitle = normalizeString(values.logicTitle || values.logic_title);
  const logicBody = normalizeString(values.logicBody || values.logic_body);
  if (!logicTitle || !logicBody) throw new Error('MODEL_LOGIC_REQUIRED');
  const { data, error } = await context.supabase
    .from(LOGIC_RECORDS_TABLE)
    .insert({
      model_id: context.modelId,
      profile_id: context.profileId,
      owner_auth_user_id: context.ownerAuthUserId,
      logic_title: logicTitle,
      logic_body: logicBody,
      logic_language: normalizeString(values.logicLanguage || 'natural_language'),
      logic_state: 'active',
    })
    .select('*')
    .single();
  if (error) throw createTrainingSchemaError(error);
  await recordTrainingEvent(context, {
    area: 'model.training.logics',
    action: 'logic_record_added',
    title: 'Model logic added',
    detail: `${logicTitle} was added to the owner-defined logic registry.`,
    metadata: { logic_record_id: data.id },
  });
  return data;
}

export async function removeModelLogicRecord(recordId) {
  const context = await getTrainingContext();
  const { error } = await context.supabase
    .from(LOGIC_RECORDS_TABLE)
    .delete()
    .eq('id', normalizeString(recordId))
    .eq('model_id', context.modelId);
  if (error) throw createTrainingSchemaError(error);
}

export async function updateModelLogicRecord(recordId, values = {}) {
  const context = await getTrainingContext();
  const normalizedRecordId = normalizeString(recordId);
  const logicTitle = normalizeString(values.logicTitle || values.logic_title || values.title);
  const logicBody = normalizeString(values.logicBody || values.logic_body || values.text);
  if (!normalizedRecordId || !logicTitle || !logicBody) throw new Error('MODEL_LOGIC_UPDATE_REQUIRED');

  const { data, error } = await context.supabase
    .from(LOGIC_RECORDS_TABLE)
    .update({
      logic_title: logicTitle,
      logic_body: logicBody,
      updated_at: new Date().toISOString(),
    })
    .eq('id', normalizedRecordId)
    .eq('model_id', context.modelId)
    .select('*')
    .single();
  if (error) throw createTrainingSchemaError(error);

  await recordTrainingEvent(context, {
    area: 'model.training.logics',
    action: 'logic_record_updated',
    title: 'Model logic updated',
    detail: `${logicTitle} was updated in the owner-defined logic registry.`,
    metadata: { logic_record_id: data.id },
  });
  return data;
}
