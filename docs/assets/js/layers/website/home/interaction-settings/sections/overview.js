/* =============================================================================
   00) FILE INDEX
   01) SESSION HISTORY STATE
   02) STORAGE HELPERS
   03) RENDER
   04) EVENT BINDINGS
============================================================================= */

/* =============================================================================
   01) SESSION HISTORY STATE
============================================================================= */
const HOME_INTERACTION_SESSION_STORAGE_KEY = 'neuroartan.home.interaction.sessions';
const HOME_INTERACTION_SESSION_LIMIT = 20;

const HOME_INTERACTION_OVERVIEW_STATE = {
  isBound: false,
  activeSessionId: '',
  sessions: loadHomeInteractionSessions(),
};

/* =============================================================================
   02) STORAGE HELPERS
============================================================================= */
function normalizeHomeInteractionSessionText(value = '') {
  return typeof value === 'string' ? value.trim() : '';
}

function createHomeInteractionSessionId() {
  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function loadHomeInteractionSessions() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(HOME_INTERACTION_SESSION_STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.filter((session) => session && typeof session === 'object') : [];
  } catch (_error) {
    return [];
  }
}

function saveHomeInteractionSessions() {
  try {
    window.localStorage.setItem(
      HOME_INTERACTION_SESSION_STORAGE_KEY,
      JSON.stringify(HOME_INTERACTION_OVERVIEW_STATE.sessions.slice(0, HOME_INTERACTION_SESSION_LIMIT))
    );
  } catch (_error) {
    /* Local session history is best-effort only. */
  }
}

function getActiveHomeInteractionSession() {
  return HOME_INTERACTION_OVERVIEW_STATE.sessions.find((session) => (
    session.id === HOME_INTERACTION_OVERVIEW_STATE.activeSessionId
  )) || null;
}

function recordHomeInteractionQuery(detail = {}) {
  const query = normalizeHomeInteractionSessionText(detail.query || detail.prompt || '');
  if (!query) return;

  const session = {
    id: createHomeInteractionSessionId(),
    query,
    response: '',
    source: normalizeHomeInteractionSessionText(detail.source || 'text'),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  HOME_INTERACTION_OVERVIEW_STATE.activeSessionId = session.id;
  HOME_INTERACTION_OVERVIEW_STATE.sessions = [
    session,
    ...HOME_INTERACTION_OVERVIEW_STATE.sessions.filter((item) => item.id !== session.id),
  ].slice(0, HOME_INTERACTION_SESSION_LIMIT);

  saveHomeInteractionSessions();
  renderHomeInteractionSessionOverview();
}

function recordHomeInteractionResponse(detail = {}) {
  const response = normalizeHomeInteractionSessionText(detail.response || detail.message || detail.text || '');
  const activeSession = getActiveHomeInteractionSession();
  if (!response || !activeSession) return;

  activeSession.response = response;
  activeSession.updatedAt = new Date().toISOString();
  saveHomeInteractionSessions();
  renderHomeInteractionSessionOverview();
}

/* =============================================================================
   03) RENDER
============================================================================= */
function getHomeInteractionOverviewNodes() {
  return {
    current: document.querySelector('[data-home-interaction-session-current]'),
    history: document.querySelector('[data-home-interaction-session-history]'),
    recent: document.querySelector('[data-home-interaction-session-recent]'),
  };
}

function renderHomeInteractionSessionOverview() {
  const nodes = getHomeInteractionOverviewNodes();
  const sessions = HOME_INTERACTION_OVERVIEW_STATE.sessions;
  const activeSession = getActiveHomeInteractionSession() || sessions[0] || null;

  if (nodes.current instanceof HTMLElement) {
    nodes.current.textContent = activeSession?.query || 'Waiting for interaction';
  }

  if (nodes.history instanceof HTMLElement) {
    nodes.history.textContent = `${sessions.length} saved ${sessions.length === 1 ? 'session' : 'sessions'}`;
  }

  if (nodes.recent instanceof HTMLElement) {
    nodes.recent.textContent = activeSession?.response || activeSession?.query || 'No recent entries in this browser';
  }
}

/* =============================================================================
   04) EVENT BINDINGS
============================================================================= */
function bindHomeInteractionOverview() {
  if (HOME_INTERACTION_OVERVIEW_STATE.isBound) {
    renderHomeInteractionSessionOverview();
    return;
  }

  HOME_INTERACTION_OVERVIEW_STATE.isBound = true;

  document.addEventListener('neuroartan:home-stage-voice-query-submitted', (event) => {
    recordHomeInteractionQuery(event?.detail || {});
  });

  document.addEventListener('neuroartan:home-stage-voice-response', (event) => {
    recordHomeInteractionResponse(event?.detail || {});
  });

  document.addEventListener('neuroartan:home-interaction-response-updated', (event) => {
    recordHomeInteractionResponse(event?.detail || {});
  });

  document.addEventListener('fragment:mounted', (event) => {
    if (event?.detail?.name === 'home-interaction-settings-overview') {
      renderHomeInteractionSessionOverview();
    }
  });

  renderHomeInteractionSessionOverview();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bindHomeInteractionOverview, { once: true });
} else {
  bindHomeInteractionOverview();
}
