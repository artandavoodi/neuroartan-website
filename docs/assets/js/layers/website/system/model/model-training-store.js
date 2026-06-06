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
const TRAINING_SOURCE_BUCKET = 'model-training-sources';
const DATASET_SOURCE_KINDS = Object.freeze(['dataset_file', 'dataset_text', 'dataset_reference']);
const KNOWLEDGE_SOURCE_KINDS = Object.freeze(['knowledge_note', 'knowledge_asset']);

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
  const payload = compactObject({
    id: recipeId || undefined,
    model_id: context.modelId,
    profile_id: context.profileId,
    owner_auth_user_id: context.ownerAuthUserId,
    recipe_name: normalizeString(values.recipeName || 'Model foundation recipe'),
    base_model_provider: normalizeProviderValue(values.baseModelProvider || 'model_registry'),
    base_model_reference: normalizeString(values.baseModel),
    training_method: normalizeString(values.trainingMethod || 'supervised_fine_tuning'),
    source_profile_foundation: values.sourceProfile !== false,
    source_thought_bank: values.sourceThoughts === true,
    source_documents: values.sourceDocuments === true,
    source_knowledge_base: values.sourceKnowledge === true,
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
  const { data, error } = await context.supabase
    .from(SOURCE_OBJECTS_TABLE)
    .select('*')
    .eq('model_id', context.modelId)
    .in('source_kind', KNOWLEDGE_SOURCE_KINDS)
    .order('updated_at', { ascending: false });
  if (error) throw createTrainingSchemaError(error);
  return Array.isArray(data) ? data : [];
}

export async function createModelDatasetEntry(values = {}) {
  const context = await getTrainingContext();
  const upload = await uploadTrainingSourceFile(context, values.file);
  const sourceKind = normalizeString(values.sourceKind || (upload ? 'dataset_file' : 'dataset_text'));
  const sourceTitle = normalizeString(values.sourceTitle || values.datasetTitle || upload?.name || 'Dataset');
  const sourceContent = normalizeString(values.sourceContent || values.datasetContent);
  const sourceReference = normalizeString(values.sourceReference || values.datasetReference || upload?.path || `dataset:${Date.now()}`);
  if (!sourceTitle || (!sourceContent && !sourceReference)) throw new Error('MODEL_DATASET_REQUIRED');

  const { data, error } = await context.supabase
    .from(SOURCE_OBJECTS_TABLE)
    .insert({
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
    })
    .select('*')
    .single();
  if (error) throw createTrainingSchemaError(error);
  await recordTrainingEvent(context, {
    area: 'model.training.datasets',
    action: 'dataset_added',
    title: 'Training dataset added',
    detail: `${sourceTitle} was added to the private training dataset library.`,
    metadata: { source_object_id: data.id },
  });
  return data;
}

export async function listModelDatasetEntries() {
  const context = await getTrainingContext();
  const { data, error } = await context.supabase
    .from(SOURCE_OBJECTS_TABLE)
    .select('*')
    .eq('model_id', context.modelId)
    .in('source_kind', DATASET_SOURCE_KINDS)
    .order('updated_at', { ascending: false });
  if (error) throw createTrainingSchemaError(error);
  return Array.isArray(data) ? data : [];
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

  const { data, error } = await context.supabase
    .from(SOURCE_OBJECTS_TABLE)
    .insert({
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
    })
    .select('*')
    .single();
  if (error) throw createTrainingSchemaError(error);
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
  const { data, error } = await context.supabase
    .from(LOGIC_RECORDS_TABLE)
    .select('*')
    .eq('model_id', context.modelId)
    .order('display_order', { ascending: true })
    .order('updated_at', { ascending: false });
  if (error) throw createTrainingSchemaError(error);
  return Array.isArray(data) ? data : [];
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
