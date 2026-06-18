// @ts-nocheck
/// <reference path="../types.d.ts" />
import { createClient } from 'npm:@supabase/supabase-js@2';

const X_TOKEN_URL = 'https://api.x.com/2/oauth2/token';
const X_ME_URL = 'https://api.x.com/2/users/me';
const X_USER_FIELDS = [
  'id',
  'username',
  'name',
  'created_at',
  'description',
  'profile_image_url',
  'profile_banner_url',
  'public_metrics',
  'verified',
  'verified_type',
].join(',');
const X_TWEET_FIELDS = [
  'id',
  'text',
  'created_at',
  'author_id',
  'conversation_id',
  'entities',
  'lang',
  'public_metrics',
  'possibly_sensitive',
  'referenced_tweets',
  'context_annotations',
].join(',');

function requiredEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`${name}_MISSING`);
  return value;
}

function readServiceRoleKey() {
  const legacy = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (legacy) return legacy;

  const secretKeys = Deno.env.get('SUPABASE_SECRET_KEYS');
  if (!secretKeys) throw new Error('SUPABASE_SERVICE_ROLE_KEY_MISSING');

  const parsed = JSON.parse(secretKeys);
  const value = parsed.default || Object.values(parsed)[0];
  if (typeof value !== 'string') throw new Error('SUPABASE_SERVICE_ROLE_KEY_MISSING');
  return value;
}

function siteUrl() {
  return Deno.env.get('NEUROARTAN_SITE_URL') || 'http://localhost:8891';
}

function readPositiveIntegerEnv(name: string, fallback = 0) {
  const rawValue = Deno.env.get(name);
  if (!rawValue) return fallback;

  const parsed = Number.parseInt(rawValue, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function readRequestedImportLimit(session: Record<string, unknown>) {
  const metadata = typeof session.metadata === 'object' && session.metadata !== null
    ? session.metadata as Record<string, unknown>
    : {};

  const rawValue = session.requested_import_limit
    ?? metadata.requested_import_limit
    ?? metadata.import_limit
    ?? metadata.post_limit
    ?? 0;

  const parsed = Number.parseInt(String(rawValue || '0'), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function redirect(status: string) {
  const url = new URL(siteUrl());
  url.searchParams.set('connector', 'x');
  url.searchParams.set('connectorStatus', status);
  url.hash = 'home-platform-settings-connectors';
  return Response.redirect(url.toString(), 302);
}

function toBase64(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes));
}

function fromUtf8(value: string) {
  return new TextEncoder().encode(value);
}

async function importEncryptionKey() {
  const secret = requiredEnv('CONNECTOR_TOKEN_ENCRYPTION_KEY');
  const digest = await crypto.subtle.digest('SHA-256', fromUtf8(secret));
  return crypto.subtle.importKey('raw', digest, 'AES-GCM', false, ['encrypt']);
}

async function encryptToken(value: string) {
  const key = await importEncryptionKey();
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, fromUtf8(value));
  return JSON.stringify({
    v: 1,
    alg: 'AES-GCM',
    iv: toBase64(iv),
    data: toBase64(new Uint8Array(encrypted)),
  });
}

async function fetchJson(url: string, options: RequestInit = {}) {
  const response = await fetch(url, options);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw Object.assign(new Error('UPSTREAM_REQUEST_FAILED'), {
      status: response.status,
      payload,
    });
  }
  return payload;
}

async function exchangeCodeForToken(session: Record<string, unknown>) {
  const clientId = requiredEnv('X_CLIENT_ID');
  const clientSecret = requiredEnv('X_CLIENT_SECRET');
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code: String(session.code || ''),
    redirect_uri: String(session.redirect_uri || ''),
    code_verifier: String(session.code_verifier || ''),
    client_id: clientId,
  });

  const basic = btoa(`${clientId}:${clientSecret}`);
  return fetchJson(X_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });
}

async function readXProfile(accessToken: string) {
  const url = new URL(X_ME_URL);
  url.searchParams.set('user.fields', X_USER_FIELDS);
  return fetchJson(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

async function readInitialPosts(accessToken: string, xUserId: string, paginationToken = '') {
  const url = new URL(`https://api.x.com/2/users/${encodeURIComponent(xUserId)}/tweets`);
  url.searchParams.set('max_results', '100');
  url.searchParams.set('tweet.fields', X_TWEET_FIELDS);
  if (paginationToken) url.searchParams.set('pagination_token', paginationToken);
  return fetchJson(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

async function readInitialPostPages(accessToken: string, xUserId: string, requestedPostLimit = 0) {
  const posts: Array<Record<string, unknown>> = [];
  const pages: Array<Record<string, unknown>> = [];
  let nextToken = '';
  let reachedRequestedLimit = false;
  const pageLimit = readPositiveIntegerEnv('CONNECTOR_X_IMPORT_PAGE_LIMIT', 0);

  for (let pageIndex = 0; pageLimit === 0 || pageIndex < pageLimit; pageIndex += 1) {
    const payload = await readInitialPosts(accessToken, xUserId, nextToken);
    pages.push(payload?.meta || {});

    if (Array.isArray(payload?.data)) {
      for (const post of payload.data) {
        if (requestedPostLimit > 0 && posts.length >= requestedPostLimit) {
          reachedRequestedLimit = true;
          break;
        }
        posts.push(post);
      }
    }

    if (reachedRequestedLimit) break;

    nextToken = String(payload?.meta?.next_token || '');
    if (!nextToken) break;
  }

  return {
    posts,
    pages,
    receivedCount: posts.length,
    requestedPostLimit,
    reachedRequestedLimit,
    reachedApiEnd: !nextToken && !reachedRequestedLimit,
  };
}

async function upsertSourceConnector(supabase: ReturnType<typeof createClient>, session: Record<string, unknown>, xUser: Record<string, unknown>, tokenReference: string | null) {
  const userId = String(session.user_id || '');
  const modelId = String(session.model_id || '');
  const profileId = String(session.profile_id || '');
  if (!userId || !profileId || !modelId) return null;

  const { data: existing } = await supabase
    .from('model_source_connectors')
    .select('id')
    .eq('owner_auth_user_id', userId)
    .eq('model_id', modelId)
    .eq('source_platform', 'x')
    .maybeSingle();

  const payload = {
    model_id: modelId,
    profile_id: profileId,
    owner_auth_user_id: userId,
    source_platform: 'x',
    connector_type: 'oauth',
    authorization_status: 'authorized',
    granted_scope: session.requested_scopes || [],
    connector_owner_identity_reference: `x:${String(xUser.id || '')}`,
    token_reference: tokenReference,
    provenance_state: 'owner_authorized',
    granted_at: new Date().toISOString(),
    last_validated_at: new Date().toISOString(),
    revoked_at: null,
  };

  if (existing?.id) {
    const { data, error } = await supabase
      .from('model_source_connectors')
      .update(payload)
      .eq('id', existing.id)
      .select('id')
      .maybeSingle();
    if (error) throw error;
    return data || existing;
  }

  const { data, error } = await supabase
    .from('model_source_connectors')
    .insert(payload)
    .select('id')
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function importInitialPosts(supabase: ReturnType<typeof createClient>, session: Record<string, unknown>, connectorId: string | null, xUser: Record<string, unknown>, accessToken: string) {
  const userId = String(session.user_id || '');
  const profileId = String(session.profile_id || '');
  const modelId = String(session.model_id || '');
  const xUserId = String(xUser.id || '');
  if (!userId || !modelId || !xUserId) {
    return {
      importedCount: 0,
      receivedCount: 0,
      existingCount: 0,
      skipped: true,
      importAttempted: false,
      importCompleted: false,
      importFailed: false,
    };
  }

  const sourceRegistryPayload = {
    user_id: userId,
    profile_id: profileId || null,
    model_id: modelId,
    source_name: `X @${String(xUser.username || xUserId)}`,
    source_type: 'x_connector_import',
    storage_location: 'third_party_infrastructure',
    storage_reference: `x:user:${xUserId}`,
    classification: 'sensitive',
    processing_depth: 'cloud_parse',
    consent_state: 'granted',
    retention_rule: 'user_controlled',
    metadata: {
      provider: 'x',
      provider_account_id: xUserId,
      provider_account_handle: xUser.username || '',
    },
  };

  const { data: sourceRegistry, error: sourceRegistryError } = await supabase
    .from('privacy_source_registry')
    .insert(sourceRegistryPayload)
    .select('id')
    .maybeSingle();
  if (sourceRegistryError) throw sourceRegistryError;

  const requestedPostLimit = readRequestedImportLimit(session);
  const postsPayload = await readInitialPostPages(accessToken, xUserId, requestedPostLimit);
  const posts = postsPayload.posts;
  if (!posts.length) {
    await supabase
      .from('privacy_processing_ledger')
      .insert({
        user_id: userId,
        profile_id: profileId || null,
        model_id: modelId,
        source_id: sourceRegistry?.id || null,
        processing_type: 'cloud_parse',
        processing_purpose: 'x_connector_initial_import',
        processor_name: 'neuroartan_x_connector',
        processor_type: 'internal',
        job_state: 'completed',
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        output_metadata: {
          provider: 'x',
          imported_count: 0,
          received_count: 0,
          existing_count: 0,
          page_count: postsPayload.pages.length,
          pages: postsPayload.pages,
          requested_post_limit: postsPayload.requestedPostLimit,
          reached_requested_limit: postsPayload.reachedRequestedLimit,
          reached_api_end: postsPayload.reachedApiEnd,
        },
      });

    return {
      importedCount: 0,
      receivedCount: 0,
      existingCount: 0,
      skipped: false,
      importAttempted: true,
      importCompleted: true,
      importFailed: false,
      requestedPostLimit: postsPayload.requestedPostLimit,
      reachedRequestedLimit: postsPayload.reachedRequestedLimit,
      reachedApiEnd: postsPayload.reachedApiEnd,
    };
  }

  const references = posts.map((post: Record<string, unknown>) => `x:tweet:${String(post.id || '')}`).filter(Boolean);
  const { data: existingRows } = await supabase
    .from('model_source_objects')
    .select('source_reference')
    .eq('model_id', modelId)
    .in('source_reference', references);

  const existingReferences = new Set((Array.isArray(existingRows) ? existingRows : []).map((row) => row.source_reference));
  const existingCount = existingReferences.size;
  const sourceObjects = posts
    .filter((post: Record<string, unknown>) => !existingReferences.has(`x:tweet:${String(post.id || '')}`))
    .map((post: Record<string, unknown>) => ({
      model_id: modelId,
      profile_id: profileId || null,
      connector_id: connectorId,
      owner_auth_user_id: userId,
      source_kind: 'x_post',
      source_title: `X post ${String(post.created_at || post.id || '')}`,
      source_reference: `x:tweet:${String(post.id || '')}`,
      source_content: String(post.text || ''),
      source_status: 'received',
      provenance_state: 'owner_authorized_import',
      source_scope: 'owner_private',
      source_metadata: {
        provider: 'x',
        privacy_source_id: sourceRegistry?.id || null,
        provider_account_id: xUserId,
        provider_account_handle: xUser.username || '',
        tweet: post,
      },
    }));

  let insertedSourceObjects: Array<Record<string, unknown>> = [];
  if (sourceObjects.length) {
    const { data, error } = await supabase
      .from('model_source_objects')
      .insert(sourceObjects)
      .select('id, source_reference, source_content, source_title');
    if (error) throw error;
    insertedSourceObjects = Array.isArray(data) ? data : [];
  }

  await supabase
    .from('privacy_processing_ledger')
    .insert({
      user_id: userId,
      profile_id: profileId || null,
      model_id: modelId,
      source_id: sourceRegistry?.id || null,
      processing_type: 'cloud_parse',
      processing_purpose: 'x_connector_initial_import',
      processor_name: 'neuroartan_x_connector',
      processor_type: 'internal',
      job_state: 'completed',
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      output_metadata: {
        provider: 'x',
        imported_count: insertedSourceObjects.length,
        received_count: posts.length,
        existing_count: existingCount,
        page_count: postsPayload.pages.length,
        pages: postsPayload.pages,
        requested_post_limit: postsPayload.requestedPostLimit,
        reached_requested_limit: postsPayload.reachedRequestedLimit,
        reached_api_end: postsPayload.reachedApiEnd,
      },
    });

  const { data: memoryPreference } = await supabase
    .from('model_memory_preferences')
    .select('external_connector_memory_enabled')
    .eq('model_id', modelId)
    .maybeSingle();

  if (memoryPreference?.external_connector_memory_enabled && insertedSourceObjects.length) {
    await supabase
      .from('model_memory_consolidation_queue')
      .insert(insertedSourceObjects.map((sourceObject) => ({
        model_id: modelId,
        profile_id: profileId || null,
        owner_auth_user_id: userId,
        candidate_type: 'x_post',
        candidate_title: String(sourceObject.source_title || 'X post'),
        candidate_body: String(sourceObject.source_content || ''),
        source_table: 'model_source_objects',
        source_record_id: String(sourceObject.id || ''),
        proposed_memory_type: 'social_affective',
        proposed_confidence: 0.55,
        proposed_salience: 0.5,
        queue_state: 'pending',
        candidate_payload: {
          provider: 'x',
          source_reference: sourceObject.source_reference || '',
        },
      })));
  }

  return {
    importedCount: insertedSourceObjects.length,
    receivedCount: posts.length,
    existingCount,
    skipped: false,
    importAttempted: true,
    importCompleted: true,
    importFailed: false,
    requestedPostLimit: postsPayload.requestedPostLimit,
    reachedRequestedLimit: postsPayload.reachedRequestedLimit,
    reachedApiEnd: postsPayload.reachedApiEnd,
  };
}

Deno.serve(async (req: Request) => {
  const requestUrl = new URL(req.url);
  const code = requestUrl.searchParams.get('code') || '';
  const state = requestUrl.searchParams.get('state') || '';
  const oauthError = requestUrl.searchParams.get('error') || '';

  const supabase = createClient(requiredEnv('SUPABASE_URL'), readServiceRoleKey(), {
    auth: { persistSession: false },
  });

  if (oauthError || !code || !state) {
    if (state) {
      await supabase
        .from('connector_oauth_sessions')
        .update({ session_status: 'failed', error_message: oauthError || 'missing_code_or_state' })
        .eq('oauth_state', state);
    }
    return redirect('error');
  }

  try {
    const { data: session, error: sessionError } = await supabase
      .from('connector_oauth_sessions')
      .select('*')
      .eq('oauth_state', state)
      .eq('connector_service', 'x')
      .maybeSingle();

    if (sessionError || !session) throw sessionError || new Error('OAUTH_SESSION_NOT_FOUND');
    if (new Date(String(session.expires_at)).getTime() < Date.now()) throw new Error('OAUTH_SESSION_EXPIRED');

    const tokenPayload = await exchangeCodeForToken({ ...session, code });
    const accessToken = String(tokenPayload.access_token || '');
    if (!accessToken) throw new Error('X_ACCESS_TOKEN_MISSING');

    const profilePayload = await readXProfile(accessToken);
    const xUser = profilePayload?.data || {};
    if (!xUser?.id) throw new Error('X_USER_PROFILE_MISSING');

    const encryptedAccessToken = await encryptToken(accessToken);
    const encryptedRefreshToken = tokenPayload.refresh_token
      ? await encryptToken(String(tokenPayload.refresh_token))
      : null;

    await supabase
      .from('connector_token_vault')
      .update({ revoked_at: new Date().toISOString() })
      .eq('user_id', session.user_id)
      .eq('connector_service', 'x')
      .is('revoked_at', null);

    const expiresIn = Number(tokenPayload.expires_in || 0);
    const expiresAt = expiresIn > 0
      ? new Date(Date.now() + expiresIn * 1000).toISOString()
      : null;

    const { data: tokenVault, error: tokenVaultError } = await supabase
      .from('connector_token_vault')
      .insert({
        user_id: session.user_id,
        profile_id: session.profile_id,
        model_id: session.model_id,
        connector_service: 'x',
        provider_account_id: xUser.id,
        provider_account_handle: xUser.username || '',
        encrypted_access_token: encryptedAccessToken,
        encrypted_refresh_token: encryptedRefreshToken,
        token_type: tokenPayload.token_type || 'bearer',
        scope: tokenPayload.scope || '',
        expires_at: expiresAt,
        metadata: {
          provider: 'x',
          profile: xUser,
        },
      })
      .select('id')
      .maybeSingle();
    if (tokenVaultError) throw tokenVaultError;

    const connector = await upsertSourceConnector(supabase, session, xUser, tokenVault?.id || null);
    if (tokenVault?.id && connector?.id) {
      await supabase
        .from('connector_token_vault')
        .update({ source_connector_id: connector.id })
        .eq('id', tokenVault.id);
    }

    let importSummary = {
      importedCount: 0,
      receivedCount: 0,
      existingCount: 0,
      requestedPostLimit: readRequestedImportLimit(session),
      reachedRequestedLimit: false,
      reachedApiEnd: false,
      skipped: true,
      importAttempted: false,
      importCompleted: false,
      importFailed: false,
      importError: '',
    };
    try {
      importSummary = await importInitialPosts(supabase, session, connector?.id || null, xUser, accessToken);
    } catch (importError) {
      console.warn('[connectors-x-callback] Initial import failed.', importError);
      importSummary = {
        ...importSummary,
        importAttempted: true,
        importCompleted: false,
        importFailed: true,
        importError: importError instanceof Error ? importError.message : 'X_IMPORT_FAILED',
      };
      await supabase
        .from('privacy_processing_ledger')
        .insert({
          user_id: session.user_id,
          profile_id: session.profile_id,
          model_id: session.model_id,
          processing_type: 'cloud_parse',
          processing_purpose: 'x_connector_initial_import',
          processor_name: 'neuroartan_x_connector',
          processor_type: 'internal',
          job_state: 'failed',
          error_message: importError instanceof Error ? importError.message : 'X_IMPORT_FAILED',
          output_metadata: {
            provider: 'x',
            requested_post_limit: importSummary.requestedPostLimit,
            import_attempted: importSummary.importAttempted,
            import_completed: importSummary.importCompleted,
            import_failed: importSummary.importFailed,
          },
        });
    }

    const importMetadata = importSummary.importCompleted
      ? {
        import_attempted: true,
        import_completed: true,
        import_failed: false,
        imported_count: importSummary.importedCount,
        received_count: importSummary.receivedCount,
        existing_count: importSummary.existingCount,
        requested_post_limit: importSummary.requestedPostLimit,
        reached_requested_limit: importSummary.reachedRequestedLimit,
        reached_api_end: importSummary.reachedApiEnd,
      }
      : {
        import_attempted: importSummary.importAttempted,
        import_completed: false,
        import_failed: importSummary.importFailed,
        requested_post_limit: importSummary.requestedPostLimit,
        last_import_error: importSummary.importError || '',
      };

    const connectedConnectorState = {
      user_id: session.user_id,
      profile_id: session.profile_id,
      model_id: session.model_id,
      connector_service: 'x',
      connector_label: 'X',
      connector_category: 'social',
      runtime: 'oauth-required',
      connection_state: 'connected',
      source_vault_ready: importSummary.importCompleted === true,
      metadata: {
        provider: 'x',
        provider_account_id: xUser.id,
        provider_account_handle: xUser.username || '',
        scopes: session.requested_scopes || [],
        ...importMetadata,
        connected_at: new Date().toISOString(),
      },
    };

    const { data: updatedConnectedState, error: connectedStateUpdateError } = await supabase
      .from('privacy_connector_state')
      .update(connectedConnectorState)
      .eq('user_id', session.user_id)
      .eq('connector_service', 'x')
      .select('id')
      .maybeSingle();

    if (connectedStateUpdateError) throw connectedStateUpdateError;

    if (!updatedConnectedState?.id) {
      const { error: connectedStateInsertError } = await supabase
        .from('privacy_connector_state')
        .insert(connectedConnectorState);
      if (connectedStateInsertError) throw connectedStateInsertError;
    }

    await supabase
      .from('connector_oauth_sessions')
      .update({
        session_status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', session.id);

    return redirect('connected');
  } catch (error) {
    console.error('[connectors-x-callback]', error);

    const errorMessage = error instanceof Error ? error.message : 'X_CONNECTOR_CALLBACK_FAILED';
    const errorPayload = typeof error === 'object' && error && 'payload' in error
      ? (error as Record<string, unknown>).payload
      : null;

    const { data: failedSession } = await supabase
      .from('connector_oauth_sessions')
      .select('id, user_id, profile_id, model_id, connector_service, requested_scopes')
      .eq('oauth_state', state)
      .maybeSingle();

    await supabase
      .from('connector_oauth_sessions')
      .update({
        session_status: 'failed',
        error_message: errorMessage,
      })
      .eq('oauth_state', state);

    if (failedSession?.user_id) {
      const failedConnectorState = {
        user_id: failedSession.user_id,
        profile_id: failedSession.profile_id,
        model_id: failedSession.model_id,
        connector_service: 'x',
        connector_label: 'X',
        connector_category: 'social',
        runtime: 'oauth-required',
        connection_state: 'error',
        source_vault_ready: false,
        metadata: {
          provider: 'x',
          scopes: failedSession.requested_scopes || [],
          last_error: errorMessage,
          upstream_payload: errorPayload,
          failed_at: new Date().toISOString(),
        },
      };

      const { data: updatedFailedState, error: failedStateUpdateError } = await supabase
        .from('privacy_connector_state')
        .update(failedConnectorState)
        .eq('user_id', failedSession.user_id)
        .eq('connector_service', 'x')
        .select('id')
        .maybeSingle();

      if (failedStateUpdateError) {
        console.error('[connectors-x-callback] Failed to update connector error state.', failedStateUpdateError);
      }

      if (!updatedFailedState?.id) {
        const { error: failedStateInsertError } = await supabase
          .from('privacy_connector_state')
          .insert(failedConnectorState);

        if (failedStateInsertError) {
          console.error('[connectors-x-callback] Failed to insert connector error state.', failedStateInsertError);
        }
      }
    }

    return redirect('error');
  }
});
