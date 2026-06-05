import {
  getHomeInteractionConversationState,
  removeHomeInteractionConversation,
  setHomeInteractionActiveConversation,
  startHomeInteractionNewConversation,
  updateHomeInteractionConversationTitle,
} from './session-store.js';

/* =============================================================================
   00) FILE INDEX
   01) CONVERSATIONS STATE
   02) DOM HELPERS
   03) VALUE HELPERS
   04) RENDER
   05) EVENTS
============================================================================= */

/* =============================================================================
   01) CONVERSATIONS STATE
============================================================================= */
const HOME_INTERACTION_CONVERSATIONS_STATE = {
  isBound: false,
  query: '',
};

/* =============================================================================
   02) DOM HELPERS
============================================================================= */
function getHomeInteractionConversationsNodes() {
  return {
    searches: Array.from(document.querySelectorAll('[data-home-interaction-conversation-search]')),
    emptyStates: Array.from(document.querySelectorAll('[data-home-interaction-conversation-list-empty]')),
    lists: Array.from(document.querySelectorAll('[data-home-interaction-conversation-list]')),
  };
}

/* =============================================================================
   03) VALUE HELPERS
============================================================================= */
function normalizeHomeInteractionConversationsText(value = '') {
  return typeof value === 'string' ? value.trim() : '';
}

function formatHomeInteractionConversationUpdatedAt(value = '') {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function getHomeInteractionConversationPreview(conversation) {
  const lastMessage = Array.isArray(conversation.messages)
    ? conversation.messages[conversation.messages.length - 1]
    : null;
  return normalizeHomeInteractionConversationsText(lastMessage?.content || 'No messages');
}

function filterHomeInteractionConversations(conversations) {
  const query = HOME_INTERACTION_CONVERSATIONS_STATE.query.toLowerCase();
  if (!query) return conversations;

  return conversations.filter((conversation) => {
    const haystack = [
      conversation.title,
      ...(Array.isArray(conversation.messages) ? conversation.messages.map((message) => message.content) : []),
    ].join(' ').toLowerCase();
    return haystack.includes(query);
  });
}

/* =============================================================================
   04) RENDER
============================================================================= */
function createHomeInteractionConversationNode(conversation, activeConversationId) {
  const item = document.createElement('li');
  const card = document.createElement('article');
  const button = document.createElement('button');
  const title = document.createElement('strong');
  const meta = document.createElement('span');
  const preview = document.createElement('p');
  const actions = document.createElement('div');
  const renameButton = document.createElement('button');
  const deleteButton = document.createElement('button');
  const isActive = conversation.id === activeConversationId;

  item.className = 'home-interaction-conversations__item';
  card.className = 'home-interaction-conversations__card';
  card.dataset.homeInteractionConversationCard = conversation.id;
  card.classList.toggle('is-active', isActive);

  button.type = 'button';
  button.className = 'home-interaction-conversations__select';
  button.dataset.homeInteractionConversationSelect = conversation.id;
  button.setAttribute('aria-pressed', String(isActive));

  title.className = 'home-interaction-conversations__title';
  title.textContent = conversation.title || 'Untitled session';

  meta.className = 'home-interaction-conversations__meta';
  meta.textContent = [
    `${conversation.messages?.length || 0} ${conversation.messages?.length === 1 ? 'message' : 'messages'}`,
    formatHomeInteractionConversationUpdatedAt(conversation.updatedAt),
  ].filter(Boolean).join(' · ');

  preview.className = 'home-interaction-conversations__preview';
  preview.textContent = getHomeInteractionConversationPreview(conversation);

  actions.className = 'home-interaction-conversations__actions';

  renameButton.type = 'button';
  renameButton.className = 'home-interaction-conversations__action';
  renameButton.dataset.homeInteractionConversationRename = conversation.id;
  renameButton.textContent = 'Rename';

  deleteButton.type = 'button';
  deleteButton.className = 'home-interaction-conversations__action';
  deleteButton.dataset.homeInteractionConversationDelete = conversation.id;
  deleteButton.textContent = 'Delete';

  button.append(title, meta, preview);
  actions.append(renameButton, deleteButton);
  card.append(button, actions);
  item.append(card);
  return item;
}

function renderHomeInteractionConversations() {
  const nodes = getHomeInteractionConversationsNodes();
  const state = getHomeInteractionConversationState();
  const conversations = filterHomeInteractionConversations(state.conversations || []);

  nodes.emptyStates.forEach((empty) => {
    if (empty instanceof HTMLElement) {
      empty.hidden = conversations.length > 0;
    }
  });

  nodes.lists.forEach((list) => {
    if (!(list instanceof HTMLOListElement)) return;

    list.replaceChildren(...conversations.map((conversation) => (
      createHomeInteractionConversationNode(conversation, state.activeConversationId)
    )));
    list.hidden = conversations.length === 0;
  });
}

/* =============================================================================
   05) EVENTS
============================================================================= */
function bindHomeInteractionConversations() {
  if (HOME_INTERACTION_CONVERSATIONS_STATE.isBound) {
    renderHomeInteractionConversations();
    return;
  }

  HOME_INTERACTION_CONVERSATIONS_STATE.isBound = true;

  document.addEventListener('input', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement) || !target.matches('[data-home-interaction-conversation-search]')) return;
    HOME_INTERACTION_CONVERSATIONS_STATE.query = normalizeHomeInteractionConversationsText(target.value);
    renderHomeInteractionConversations();
  });

  document.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;

    const createNew = target.closest('[data-home-interaction-conversation-new]');
    if (createNew) {
      event.preventDefault();
      startHomeInteractionNewConversation();
      return;
    }

    const select = target.closest('[data-home-interaction-conversation-select]');
    if (select) {
      event.preventDefault();
      setHomeInteractionActiveConversation(select.getAttribute('data-home-interaction-conversation-select') || '');
      return;
    }

    const rename = target.closest('[data-home-interaction-conversation-rename]');
    if (rename) {
      event.preventDefault();
      const conversationId = rename.getAttribute('data-home-interaction-conversation-rename') || '';
      const conversation = getHomeInteractionConversationState().conversations.find((item) => item.id === conversationId);
      const nextTitle = window.prompt('Rename session', conversation?.title || '');
      if (nextTitle !== null) {
        updateHomeInteractionConversationTitle(conversationId, nextTitle);
      }
      return;
    }

    const remove = target.closest('[data-home-interaction-conversation-delete]');
    if (remove) {
      event.preventDefault();
      removeHomeInteractionConversation(remove.getAttribute('data-home-interaction-conversation-delete') || '');
    }
  });

  document.addEventListener('neuroartan:home-interaction-conversations-updated', renderHomeInteractionConversations);
  document.addEventListener('fragment:mounted', (event) => {
    if (
      event?.detail?.name === 'home-interaction-settings-workspace'
      || event?.detail?.name === 'home-interaction-settings-overview'
    ) {
      renderHomeInteractionConversations();
    }
  });

  renderHomeInteractionConversations();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bindHomeInteractionConversations, { once: true });
} else {
  bindHomeInteractionConversations();
}
