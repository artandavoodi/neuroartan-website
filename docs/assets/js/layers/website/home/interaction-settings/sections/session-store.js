/* =============================================================================
   00) FILE INDEX
   01) SESSION STORE STATE
   02) VALUE HELPERS
   03) STORAGE HELPERS
   04) CONVERSATION MUTATIONS
   05) RUNTIME EVENT BINDINGS
   06) PUBLIC API
============================================================================= */

/* =============================================================================
   01) SESSION STORE STATE
============================================================================= */
const HOME_INTERACTION_CONVERSATION_STORAGE_KEY = 'neuroartan.home.interaction.conversations';
const HOME_INTERACTION_CONVERSATION_ACTIVE_KEY = 'neuroartan.home.interaction.activeConversation';
const HOME_INTERACTION_CONVERSATION_LIMIT = 40;

const HOME_INTERACTION_SESSION_STORE_STATE = {
  isBound: false,
  activeConversationId: '',
  conversations: [],
};

/* =============================================================================
   02) VALUE HELPERS
============================================================================= */
function normalizeHomeInteractionSessionText(value = '') {
  return typeof value === 'string' ? value.trim() : '';
}

function createHomeInteractionSessionId(prefix = 'conversation') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createHomeInteractionSessionTimestamp() {
  return new Date().toISOString();
}

function formatHomeInteractionConversationTitle(value = '') {
  const normalized = normalizeHomeInteractionSessionText(value).replace(/\s+/g, ' ');
  if (!normalized) return 'Untitled session';
  return normalized.length > 64 ? `${normalized.slice(0, 61)}...` : normalized;
}

function normalizeHomeInteractionConversation(conversation = {}) {
  const now = createHomeInteractionSessionTimestamp();
  const messages = Array.isArray(conversation.messages)
    ? conversation.messages
        .filter((message) => message && typeof message === 'object')
        .map((message) => ({
          id: normalizeHomeInteractionSessionText(message.id) || createHomeInteractionSessionId('message'),
          role: message.role === 'assistant' ? 'assistant' : 'user',
          content: normalizeHomeInteractionSessionText(message.content),
          createdAt: normalizeHomeInteractionSessionText(message.createdAt) || now,
        }))
        .filter((message) => message.content)
    : [];

  const title = normalizeHomeInteractionSessionText(conversation.title)
    || formatHomeInteractionConversationTitle(messages[0]?.content || '');

  return {
    id: normalizeHomeInteractionSessionText(conversation.id) || createHomeInteractionSessionId(),
    title,
    createdAt: normalizeHomeInteractionSessionText(conversation.createdAt) || now,
    updatedAt: normalizeHomeInteractionSessionText(conversation.updatedAt) || now,
    messages,
  };
}

/* =============================================================================
   03) STORAGE HELPERS
============================================================================= */
function readHomeInteractionConversationsFromStorage() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(HOME_INTERACTION_CONVERSATION_STORAGE_KEY) || '[]');
    return Array.isArray(parsed)
      ? parsed.map(normalizeHomeInteractionConversation)
      : [];
  } catch (_error) {
    return [];
  }
}

function writeHomeInteractionConversationsToStorage() {
  try {
    window.localStorage.setItem(
      HOME_INTERACTION_CONVERSATION_STORAGE_KEY,
      JSON.stringify(HOME_INTERACTION_SESSION_STORE_STATE.conversations.slice(0, HOME_INTERACTION_CONVERSATION_LIMIT))
    );
    window.localStorage.setItem(
      HOME_INTERACTION_CONVERSATION_ACTIVE_KEY,
      HOME_INTERACTION_SESSION_STORE_STATE.activeConversationId || ''
    );
  } catch (_error) {
    /* Local conversation history is best-effort until Supabase persistence is attached. */
  }
}

function loadHomeInteractionSessionStore() {
  HOME_INTERACTION_SESSION_STORE_STATE.conversations = readHomeInteractionConversationsFromStorage();
  try {
    HOME_INTERACTION_SESSION_STORE_STATE.activeConversationId = normalizeHomeInteractionSessionText(
      window.localStorage.getItem(HOME_INTERACTION_CONVERSATION_ACTIVE_KEY) || ''
    );
  } catch (_error) {
    HOME_INTERACTION_SESSION_STORE_STATE.activeConversationId = '';
  }

  if (
    HOME_INTERACTION_SESSION_STORE_STATE.activeConversationId
    && !HOME_INTERACTION_SESSION_STORE_STATE.conversations.some((conversation) => conversation.id === HOME_INTERACTION_SESSION_STORE_STATE.activeConversationId)
  ) {
    HOME_INTERACTION_SESSION_STORE_STATE.activeConversationId = '';
  }
}

function notifyHomeInteractionConversationsChanged(reason = 'updated') {
  writeHomeInteractionConversationsToStorage();
  document.dispatchEvent(new CustomEvent('neuroartan:home-interaction-conversations-updated', {
    detail: {
      reason,
      activeConversationId: HOME_INTERACTION_SESSION_STORE_STATE.activeConversationId,
      conversations: getHomeInteractionConversations(),
    },
  }));
}

/* =============================================================================
   04) CONVERSATION MUTATIONS
============================================================================= */
function getHomeInteractionActiveConversation() {
  if (!HOME_INTERACTION_SESSION_STORE_STATE.activeConversationId) return null;
  return HOME_INTERACTION_SESSION_STORE_STATE.conversations.find((conversation) => (
    conversation.id === HOME_INTERACTION_SESSION_STORE_STATE.activeConversationId
  )) || null;
}

function createHomeInteractionConversation(query = '') {
  const now = createHomeInteractionSessionTimestamp();
  const conversation = normalizeHomeInteractionConversation({
    id: createHomeInteractionSessionId(),
    title: formatHomeInteractionConversationTitle(query),
    createdAt: now,
    updatedAt: now,
    messages: [
      {
        id: createHomeInteractionSessionId('message'),
        role: 'user',
        content: query,
        createdAt: now,
      },
    ],
  });

  HOME_INTERACTION_SESSION_STORE_STATE.activeConversationId = conversation.id;
  HOME_INTERACTION_SESSION_STORE_STATE.conversations = [
    conversation,
    ...HOME_INTERACTION_SESSION_STORE_STATE.conversations.filter((item) => item.id !== conversation.id),
  ].slice(0, HOME_INTERACTION_CONVERSATION_LIMIT);

  notifyHomeInteractionConversationsChanged('conversation-created');
  return conversation;
}

function appendHomeInteractionUserMessage(content = '') {
  const normalized = normalizeHomeInteractionSessionText(content);
  if (!normalized) return null;

  const conversation = getHomeInteractionActiveConversation();
  if (!conversation) {
    return createHomeInteractionConversation(normalized);
  }

  const now = createHomeInteractionSessionTimestamp();
  conversation.messages = [
    ...conversation.messages,
    {
      id: createHomeInteractionSessionId('message'),
      role: 'user',
      content: normalized,
      createdAt: now,
    },
  ];
  conversation.updatedAt = now;

  if (
    !normalizeHomeInteractionSessionText(conversation.title)
    || conversation.title === 'Untitled conversation'
    || conversation.title === 'Untitled session'
  ) {
    conversation.title = formatHomeInteractionConversationTitle(normalized);
  }

  HOME_INTERACTION_SESSION_STORE_STATE.activeConversationId = conversation.id;
  HOME_INTERACTION_SESSION_STORE_STATE.conversations = [
    conversation,
    ...HOME_INTERACTION_SESSION_STORE_STATE.conversations.filter((item) => item.id !== conversation.id),
  ].slice(0, HOME_INTERACTION_CONVERSATION_LIMIT);

  notifyHomeInteractionConversationsChanged('user-message-added');
  return conversation;
}

function appendHomeInteractionAssistantMessage(content = '') {
  const normalized = normalizeHomeInteractionSessionText(content);
  const conversation = getHomeInteractionActiveConversation();
  if (!normalized || !conversation) return null;

  const now = createHomeInteractionSessionTimestamp();
  conversation.messages = [
    ...conversation.messages,
    {
      id: createHomeInteractionSessionId('message'),
      role: 'assistant',
      content: normalized,
      createdAt: now,
    },
  ];
  conversation.updatedAt = now;

  HOME_INTERACTION_SESSION_STORE_STATE.conversations = [
    conversation,
    ...HOME_INTERACTION_SESSION_STORE_STATE.conversations.filter((item) => item.id !== conversation.id),
  ].slice(0, HOME_INTERACTION_CONVERSATION_LIMIT);

  notifyHomeInteractionConversationsChanged('assistant-message-added');
  return conversation;
}

function renameHomeInteractionConversation(conversationId, title) {
  const normalizedTitle = formatHomeInteractionConversationTitle(title);
  const conversation = HOME_INTERACTION_SESSION_STORE_STATE.conversations.find((item) => item.id === conversationId);
  if (!conversation) return null;

  conversation.title = normalizedTitle;
  conversation.updatedAt = createHomeInteractionSessionTimestamp();
  notifyHomeInteractionConversationsChanged('conversation-renamed');
  return conversation;
}

function deleteHomeInteractionConversation(conversationId) {
  const beforeCount = HOME_INTERACTION_SESSION_STORE_STATE.conversations.length;
  HOME_INTERACTION_SESSION_STORE_STATE.conversations = HOME_INTERACTION_SESSION_STORE_STATE.conversations.filter((item) => item.id !== conversationId);

  if (HOME_INTERACTION_SESSION_STORE_STATE.activeConversationId === conversationId) {
    HOME_INTERACTION_SESSION_STORE_STATE.activeConversationId = HOME_INTERACTION_SESSION_STORE_STATE.conversations[0]?.id || '';
  }

  if (HOME_INTERACTION_SESSION_STORE_STATE.conversations.length !== beforeCount) {
    notifyHomeInteractionConversationsChanged('conversation-deleted');
  }
}

function selectHomeInteractionConversation(conversationId) {
  const conversation = HOME_INTERACTION_SESSION_STORE_STATE.conversations.find((item) => item.id === conversationId);
  if (!conversation) return null;

  HOME_INTERACTION_SESSION_STORE_STATE.activeConversationId = conversation.id;
  notifyHomeInteractionConversationsChanged('conversation-selected');
  return conversation;
}

/* =============================================================================
   05) RUNTIME EVENT BINDINGS
============================================================================= */
function bindHomeInteractionSessionStore() {
  if (HOME_INTERACTION_SESSION_STORE_STATE.isBound) return;
  HOME_INTERACTION_SESSION_STORE_STATE.isBound = true;

  document.addEventListener('neuroartan:home-stage-voice-query-submitted', (event) => {
    const query = normalizeHomeInteractionSessionText(event?.detail?.query || event?.detail?.prompt || '');
    if (!query) return;
    appendHomeInteractionUserMessage(query);
  });

  document.addEventListener('neuroartan:home-interaction-response-updated', (event) => {
    appendHomeInteractionAssistantMessage(event?.detail?.response || event?.detail?.message || event?.detail?.text || '');
  });
}

/* =============================================================================
   06) PUBLIC API
============================================================================= */
export function getHomeInteractionConversations() {
  return HOME_INTERACTION_SESSION_STORE_STATE.conversations.map((conversation) => ({
    ...conversation,
    messages: conversation.messages.map((message) => ({ ...message })),
  }));
}

export function getHomeInteractionConversationState() {
  return {
    activeConversationId: HOME_INTERACTION_SESSION_STORE_STATE.activeConversationId,
    activeConversation: getHomeInteractionActiveConversation(),
    conversations: getHomeInteractionConversations(),
  };
}

export function setHomeInteractionActiveConversation(conversationId) {
  return selectHomeInteractionConversation(conversationId);
}

export function updateHomeInteractionConversationTitle(conversationId, title) {
  return renameHomeInteractionConversation(conversationId, title);
}

export function removeHomeInteractionConversation(conversationId) {
  deleteHomeInteractionConversation(conversationId);
}

export function startHomeInteractionNewConversation() {
  createHomeInteractionConversation('');
}

loadHomeInteractionSessionStore();
bindHomeInteractionSessionStore();
