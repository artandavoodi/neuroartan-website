/* =============================================================================
   00) FILE INDEX
   01) IMPORTS
   02) SESSION STORE
   03) PROJECT STORE
   04) AGENT SESSION STORE
   05) END OF FILE
============================================================================= */

/* =============================================================================
   01) IMPORTS
============================================================================= */
import crypto from 'node:crypto';

/* =============================================================================
   02) SESSION STORE
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
   03) PROJECT STORE
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
  return project;
}

export function listProjects(sessionId) {
  return Array.from(projects.values()).filter((project) => project.sessionId === sessionId);
}

/* =============================================================================
   04) AGENT SESSION STORE
============================================================================= */
export function createAgentSession(sessionId, payload = {}) {
  const agentSession = {
    id:crypto.randomUUID(),
    sessionId,
    repository:String(payload.repository || '').trim(),
    provider:String(payload.provider || '').trim(),
    agentRole:String(payload.agentRole || payload.agent_role || '').trim(),
    command:String(payload.command || '').trim(),
    status:'created_waiting_for_runtime_provider',
    approvalState:'not_requested',
    commitState:'not_started',
    createdAt:new Date().toISOString(),
    updatedAt:new Date().toISOString()
  };

  agentSessions.set(agentSession.id, agentSession);
  return agentSession;
}

export function listAgentSessions(sessionId) {
  return Array.from(agentSessions.values()).filter((session) => session.sessionId === sessionId);
}

/* =============================================================================
   05) END OF FILE
============================================================================= */
