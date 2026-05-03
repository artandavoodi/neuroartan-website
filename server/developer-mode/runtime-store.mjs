/* =============================================================================
   00) FILE INDEX
   01) IMPORTS
   02) DEVELOPER STATE DEFAULTS
   03) SESSION STORE
   04) PROJECT STORE
   05) AGENT SESSION STORE
   06) DEVELOPER STATE STORE
   07) END OF FILE
============================================================================= */

/* =============================================================================
   01) IMPORTS
============================================================================= */
import crypto from 'node:crypto';

/* =============================================================================
   02) DEVELOPER STATE DEFAULTS
============================================================================= */
function createDefaultDeveloperState() {
  return {
    github:{
      connected:false,
      viewer:null,
      scope:'',
      connectedAt:'',
      repositoriesCachedAt:''
    },
    repositories:[],
    activeRepository:'',
    activeBranch:'',
    activeWorkspace:'',
    activeProjectId:'',
    configuredProviders:[],
    activeAgent:null,
    developerPreferences:{
      defaultProvider:'',
      defaultEnvironmentMode:'',
      mutationApprovalRequired:true
    },
    updatedAt:new Date().toISOString(),
    canonicalPersistence:'server_session_pending_supabase_profile_link'
  };
}

function getSafeGitHubState(github = null) {
  return {
    connected:Boolean(github?.accessToken),
    viewer:github?.viewer || null,
    scope:github?.scope || '',
    connectedAt:github?.connectedAt || '',
    repositoriesCachedAt:github?.repositoriesCachedAt || ''
  };
}

function ensureDeveloperState(session) {
  if (!session.developerState) {
    session.developerState = createDefaultDeveloperState();
  }

  session.developerState.github = getSafeGitHubState(session.github);
  session.developerState.updatedAt = new Date().toISOString();
  return session.developerState;
}

function sanitizeRepository(repository = {}) {
  return {
    id:String(repository.id || repository.fullName || repository.full_name || '').trim(),
    fullName:String(repository.fullName || repository.full_name || repository.id || '').trim(),
    label:String(repository.label || repository.fullName || repository.full_name || repository.id || '').trim(),
    htmlUrl:String(repository.htmlUrl || repository.html_url || '').trim(),
    private:Boolean(repository.private),
    defaultBranch:String(repository.defaultBranch || repository.default_branch || '').trim(),
    githubConnectionStatus:String(repository.githubConnectionStatus || repository.github_connection_status || 'authorized').trim(),
    writePermissionStatus:String(repository.writePermissionStatus || repository.write_permission_status || 'unknown_until_permission_check').trim()
  };
}

function sanitizeProviderConfig(provider = {}) {
  return {
    id:String(provider.id || provider.provider || provider.providerId || provider.provider_id || '').trim(),
    label:String(provider.label || provider.name || '').trim(),
    mode:String(provider.mode || '').trim(),
    runtime:String(provider.runtime || '').trim(),
    selectedModel:String(provider.selectedModel || provider.selected_model || provider.model || '').trim(),
    credentialStatus:String(provider.credentialStatus || provider.credential_status || 'unknown').trim(),
    runtimeStatus:String(provider.runtimeStatus || provider.runtime_status || 'unknown').trim(),
    configuredAt:String(provider.configuredAt || provider.configured_at || new Date().toISOString()).trim()
  };
}

/* =============================================================================
   03) SESSION STORE
============================================================================= */
const sessions = new Map();
const oauthStates = new Map();
const projects = new Map();
const agentSessions = new Map();

export function createSession() {
  const id = crypto.randomUUID();
  sessions.set(id, {
    id,
    github:null,
    developerState:createDefaultDeveloperState(),
    createdAt:new Date().toISOString(),
    updatedAt:new Date().toISOString()
  });
  return sessions.get(id);
}

export function getSession(sessionId) {
  if (!sessionId || !sessions.has(sessionId)) {
    return null;
  }
  return sessions.get(sessionId);
}

export function ensureSession(sessionId) {
  return getSession(sessionId) || createSession();
}

export function attachGitHubSession(sessionId, github) {
  const session = ensureSession(sessionId);
  session.github = github;
  ensureDeveloperState(session);
  session.updatedAt = new Date().toISOString();
  sessions.set(session.id, session);
  return session;
}

export function clearGitHubSession(sessionId) {
  const session = ensureSession(sessionId);
  session.github = null;
  updateDeveloperState(session.id, {
    github:getSafeGitHubState(null),
    repositories:[],
    activeRepository:'',
    activeBranch:''
  });
  session.updatedAt = new Date().toISOString();
  sessions.set(session.id, session);
  return session;
}

export function createOAuthState(sessionId) {
  const state = crypto.randomUUID();
  oauthStates.set(state, {
    state,
    sessionId,
    createdAt:Date.now()
  });
  return state;
}

export function consumeOAuthState(state) {
  const entry = oauthStates.get(state);
  oauthStates.delete(state);
  return entry || null;
}

/* =============================================================================
   04) PROJECT STORE
============================================================================= */
export function createProject(sessionId, payload = {}) {
  const project = {
    id:crypto.randomUUID(),
    sessionId,
    projectName:String(payload.projectName || payload.project_name || '').trim(),
    workspaceName:String(payload.workspaceName || payload.workspace_name || '').trim(),
    repository:String(payload.repository || payload.repository_id || '').trim(),
    provider:String(payload.provider || payload.provider_id || '').trim(),
    environmentMode:String(payload.environmentMode || payload.environment_mode || '').trim(),
    status:'local_backend_created',
    canonicalPersistence:'pending_supabase_profile_link',
    createdAt:new Date().toISOString(),
    updatedAt:new Date().toISOString()
  };

  projects.set(project.id, project);
  updateDeveloperState(sessionId, {
    activeRepository:project.repository,
    activeWorkspace:project.workspaceName,
    activeProjectId:project.id,
    developerPreferences:{
      defaultProvider:project.provider,
      defaultEnvironmentMode:project.environmentMode
    }
  });
  return project;
}

export function listProjects(sessionId) {
  return Array.from(projects.values()).filter((project) => project.sessionId === sessionId);
}

/* =============================================================================
   05) AGENT SESSION STORE
============================================================================= */
export function createAgentSession(sessionId, payload = {}) {
  const state = getDeveloperState(sessionId);
  const agentSession = {
    id:crypto.randomUUID(),
    sessionId,
    repository:String(payload.repository || state.activeRepository || '').trim(),
    provider:String(payload.provider || state.activeAgent?.providerId || state.developerPreferences.defaultProvider || '').trim(),
    agentRole:String(payload.agentRole || payload.agent_role || '').trim(),
    command:String(payload.command || '').trim(),
    status:'created_waiting_for_runtime_provider',
    approvalState:'not_requested',
    commitState:'not_started',
    createdAt:new Date().toISOString(),
    updatedAt:new Date().toISOString()
  };

  agentSessions.set(agentSession.id, agentSession);
  updateDeveloperState(sessionId, {
    activeRepository:agentSession.repository,
    developerPreferences:{
      defaultProvider:agentSession.provider
    }
  });
  return agentSession;
}

export function listAgentSessions(sessionId) {
  return Array.from(agentSessions.values()).filter((session) => session.sessionId === sessionId);
}

/* =============================================================================
   06) DEVELOPER STATE STORE
============================================================================= */
export function getDeveloperState(sessionId) {
  const session = ensureSession(sessionId);
  const state = ensureDeveloperState(session);
  sessions.set(session.id, session);
  return state;
}

export function updateDeveloperState(sessionId, patch = {}) {
  const session = ensureSession(sessionId);
  const state = ensureDeveloperState(session);

  if (Object.hasOwn(patch, 'repositories')) {
    state.repositories = Array.isArray(patch.repositories)
      ? patch.repositories.map(sanitizeRepository).filter((repository) => repository.id || repository.fullName)
      : state.repositories;
  }

  ['activeRepository', 'activeBranch', 'activeWorkspace', 'activeProjectId'].forEach((key) => {
    if (Object.hasOwn(patch, key)) {
      state[key] = String(patch[key] || '').trim();
    }
  });

  if (patch.github) {
    state.github = {
      ...state.github,
      ...patch.github,
      connected:Boolean(patch.github.connected ?? state.github.connected)
    };
  }

  if (patch.developerPreferences) {
    state.developerPreferences = {
      ...state.developerPreferences,
      ...patch.developerPreferences,
      mutationApprovalRequired:true
    };
  }

  if (Object.hasOwn(patch, 'activeAgent')) {
    state.activeAgent = patch.activeAgent || null;
  }

  state.updatedAt = new Date().toISOString();
  session.updatedAt = state.updatedAt;
  sessions.set(session.id, session);
  return state;
}

export function cacheGitHubRepositories(sessionId, repositories = []) {
  const session = ensureSession(sessionId);
  if (session.github) {
    session.github.repositoriesCachedAt = new Date().toISOString();
  }

  const normalizedRepositories = repositories.map(sanitizeRepository).filter((repository) => repository.id || repository.fullName);
  updateDeveloperState(session.id, {
    github:getSafeGitHubState(session.github),
    repositories:normalizedRepositories
  });

  const state = getDeveloperState(session.id);
  if (!state.activeRepository && normalizedRepositories[0]) {
    updateDeveloperState(session.id, {
      activeRepository:normalizedRepositories[0].fullName || normalizedRepositories[0].id,
      activeBranch:normalizedRepositories[0].defaultBranch || ''
    });
  }

  return getDeveloperState(session.id);
}

export function configureProvider(sessionId, providerConfig = {}) {
  const session = ensureSession(sessionId);
  const state = ensureDeveloperState(session);
  const provider = sanitizeProviderConfig(providerConfig);
  const providers = state.configuredProviders.filter((entry) => entry.id !== provider.id);

  if (provider.id) {
    providers.push(provider);
  }

  state.configuredProviders = providers;
  state.developerPreferences.defaultProvider = provider.id || state.developerPreferences.defaultProvider;
  state.updatedAt = new Date().toISOString();
  session.updatedAt = state.updatedAt;
  sessions.set(session.id, session);
  return state;
}

export function activateAgent(sessionId, payload = {}) {
  const providerId = String(payload.providerId || payload.provider_id || payload.provider || '').trim();
  const selectedModel = String(payload.selectedModel || payload.selected_model || payload.model || '').trim();
  const state = updateDeveloperState(sessionId, {
    activeAgent:{
      id:String(payload.id || `${providerId || 'manual-review'}-agent`).trim(),
      providerId,
      selectedModel,
      agentRole:String(payload.agentRole || payload.agent_role || 'implementation-agent').trim(),
      status:String(payload.status || 'active_pending_runtime_execution').trim(),
      activatedAt:new Date().toISOString()
    },
    developerPreferences:{
      defaultProvider:providerId
    }
  });

  return state;
}

/* =============================================================================
   07) END OF FILE
============================================================================= */
