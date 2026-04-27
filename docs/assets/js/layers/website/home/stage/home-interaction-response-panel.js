/* =========================================================
   00. FILE INDEX
   01. MODULE STATE
   02. DOM HELPERS
   03. VALUE HELPERS
   04. RESPONSE RENDERING
   05. EVENT BINDING
   06. MODULE BOOT
   ========================================================= */

/* =========================================================
   01. MODULE STATE
   ========================================================= */

const HOME_INTERACTION_RESPONSE_PANEL_STATE = {
  isBound: false,
  response: '',
  state: 'idle',
};

/* =========================================================
   02. DOM HELPERS
   ========================================================= */

function getHomeInteractionResponsePanelNodes() {
  return {
    panel: document.querySelector('#home-interaction-response-panel'),
    scroller: document.querySelector('#home-interaction-response-panel-scroller'),
    content: document.querySelector('#home-interaction-response-panel-content'),
  };
}

/* =========================================================
   03. VALUE HELPERS
   ========================================================= */

function normalizeHomeInteractionResponse(value) {
  return typeof value === 'string' ? value.trim() : '';
}

/* =========================================================
   04. RESPONSE RENDERING
   ========================================================= */

function syncHomeInteractionResponsePanel() {
  const nodes = getHomeInteractionResponsePanelNodes();
  const response = normalizeHomeInteractionResponse(HOME_INTERACTION_RESPONSE_PANEL_STATE.response);
  const isVisible = Boolean(response);

  if (nodes.panel) {
    nodes.panel.hidden = !isVisible;
    nodes.panel.dataset.homeInteractionResponseState = isVisible ? 'responding' : 'idle';
  }

  if (nodes.content) {
    nodes.content.textContent = response;
  }

  if (isVisible && nodes.scroller) {
    nodes.scroller.scrollTop = 0;
  }
}

function clearHomeInteractionResponsePanel() {
  HOME_INTERACTION_RESPONSE_PANEL_STATE.response = '';
  HOME_INTERACTION_RESPONSE_PANEL_STATE.state = 'idle';
  syncHomeInteractionResponsePanel();
}

/* =========================================================
   05. EVENT BINDING
   ========================================================= */

function bindHomeInteractionResponsePanel() {
  if (HOME_INTERACTION_RESPONSE_PANEL_STATE.isBound) {
    syncHomeInteractionResponsePanel();
    return;
  }

  HOME_INTERACTION_RESPONSE_PANEL_STATE.isBound = true;

  document.addEventListener('neuroartan:home-stage-voice-response', (event) => {
    const response = normalizeHomeInteractionResponse(event?.detail?.response ?? '');
    HOME_INTERACTION_RESPONSE_PANEL_STATE.response = response;
    HOME_INTERACTION_RESPONSE_PANEL_STATE.state = response ? 'responding' : 'idle';
    syncHomeInteractionResponsePanel();
  });

  document.addEventListener('neuroartan:home-stage-reset-requested', () => {
    clearHomeInteractionResponsePanel();
  });
}

/* =========================================================
   06. MODULE BOOT
   ========================================================= */

function bootHomeInteractionResponsePanel() {
  bindHomeInteractionResponsePanel();
  syncHomeInteractionResponsePanel();
}

document.addEventListener('fragment:mounted', (event) => {
  if (event?.detail?.name !== 'home-interaction-response-panel') {
    return;
  }

  bootHomeInteractionResponsePanel();
});

document.addEventListener('neuroartan:runtime-ready', bootHomeInteractionResponsePanel);

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootHomeInteractionResponsePanel, { once: true });
} else {
  bootHomeInteractionResponsePanel();
}