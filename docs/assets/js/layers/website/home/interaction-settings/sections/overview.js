import {
  getHomeInteractionConversationState,
} from './session-store.js';
import {
  getActiveModelState,
  subscribeActiveModelState,
} from '../../../system/model/active-model.js';

/* =============================================================================
   00) FILE INDEX
   01) OVERVIEW STATE
   02) DOM HELPERS
   03) VALUE HELPERS
   04) RENDER
   05) EVENT BINDINGS
============================================================================= */

/* =============================================================================
   01) OVERVIEW STATE
============================================================================= */
const HOME_INTERACTION_OVERVIEW_STATE = {
  isBound: false,
};

/* =============================================================================
   02) DOM HELPERS
============================================================================= */
function getHomeInteractionOverviewNodes() {
  return {
    activeTitle: document.querySelector('[data-home-interaction-conversation-active-title]'),
    conversationCount: document.querySelector('[data-home-interaction-conversation-count]'),
    messageCount: document.querySelector('[data-home-interaction-conversation-message-count]'),
    empty: document.querySelector('[data-home-interaction-conversation-empty]'),
    transcript: document.querySelector('[data-home-interaction-conversation-transcript]'),
  };
}

/* =============================================================================
   03) VALUE HELPERS
============================================================================= */
function formatHomeInteractionConversationCount(count = 0, singular = 'item', plural = 'items') {
  return `${count} ${count === 1 ? singular : plural}`;
}

function formatHomeInteractionMessageTimestamp(value = '') {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function getHomeInteractionAssistantLabel() {
  const activeModel = getActiveModelState().activeModel;
  return activeModel?.engine?.label
    || activeModel?.display_name
    || activeModel?.search_title
    || activeModel?.model_name
    || 'Active model';
}

/* =============================================================================
   04) RENDER
============================================================================= */
function createHomeInteractionMessageNode(message) {
  const item = document.createElement('li');
  const bubble = document.createElement('article');
  const meta = document.createElement('span');
  const content = document.createElement('p');
  const role = message.role === 'assistant' ? getHomeInteractionAssistantLabel() : 'You';
  const timestamp = formatHomeInteractionMessageTimestamp(message.createdAt);

  item.className = `home-interaction-conversation-transcript__item home-interaction-conversation-transcript__item--${message.role}`;
  bubble.className = 'home-interaction-conversation-transcript__bubble';
  meta.className = 'home-interaction-conversation-transcript__meta';
  content.className = 'home-interaction-conversation-transcript__content';

  meta.textContent = timestamp ? `${role} · ${timestamp}` : role;
  content.textContent = message.content || '';

  bubble.append(meta, content);
  item.append(bubble);
  return item;
}

function renderHomeInteractionConversationOverview() {
  const nodes = getHomeInteractionOverviewNodes();
  const state = getHomeInteractionConversationState();
  const conversations = state.conversations || [];
  const activeConversation = state.activeConversation || null;
  const messages = Array.isArray(activeConversation?.messages) ? activeConversation.messages : [];

  if (nodes.activeTitle instanceof HTMLElement) {
    nodes.activeTitle.textContent = activeConversation?.title || 'No session yet';
  }

  if (nodes.conversationCount instanceof HTMLElement) {
    nodes.conversationCount.textContent = formatHomeInteractionConversationCount(conversations.length, 'session', 'sessions');
  }

  if (nodes.messageCount instanceof HTMLElement) {
    nodes.messageCount.textContent = formatHomeInteractionConversationCount(messages.length, 'message', 'messages');
  }

  if (nodes.empty instanceof HTMLElement) {
    nodes.empty.hidden = messages.length > 0;
  }

  if (nodes.transcript instanceof HTMLOListElement) {
    nodes.transcript.replaceChildren(...messages.map(createHomeInteractionMessageNode));
    nodes.transcript.hidden = messages.length === 0;
  }
}

/* =============================================================================
   05) EVENT BINDINGS
============================================================================= */
function bindHomeInteractionOverview() {
  if (HOME_INTERACTION_OVERVIEW_STATE.isBound) {
    renderHomeInteractionConversationOverview();
    return;
  }

  HOME_INTERACTION_OVERVIEW_STATE.isBound = true;

  document.addEventListener('neuroartan:home-interaction-conversations-updated', renderHomeInteractionConversationOverview);
  subscribeActiveModelState(renderHomeInteractionConversationOverview);
  document.addEventListener('fragment:mounted', (event) => {
    if (event?.detail?.name === 'home-interaction-settings-overview') {
      renderHomeInteractionConversationOverview();
    }
  });

  renderHomeInteractionConversationOverview();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bindHomeInteractionOverview, { once: true });
} else {
  bindHomeInteractionOverview();
}
