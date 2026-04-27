/* =========================================================
   00. FILE INDEX
   01. MODULE STATE
   02. DOM HELPERS
   03. LABEL HELPERS
   04. RENDERING
   05. EVENT BINDING
   06. MODULE BOOT
   ========================================================= */

/* =========================================================
   01. MODULE STATE
   ========================================================= */

const HOME_STAGE_INTERACTIVE_TEXT_STATE = {
  isBound: false,
  mode: 'idle',
  label: 'What is in my mind?',
  resetIndex: 0,
  hasReceivedInput: false,
  isResetting: false,
  switchTimer: null,
};

const HOME_STAGE_INTERACTIVE_TEXT_IDLE_LABELS = Object.freeze([
  'What is in my mind?',
  'Ready when you are',
  'I am here',
  'Continue when ready',
]);

/* =========================================================
   02. DOM HELPERS
   ========================================================= */

function getHomeStageInteractiveTextNodes() {
  return {
    root: document.querySelector('#home-stage-interactive-text'),
    label: document.querySelector('#home-stage-interactive-text-label'),
    dot: document.querySelector('#home-stage-interactive-text-dot'),
  };
}

function clearHomeStageInteractiveTextTimer() {
  if (!HOME_STAGE_INTERACTIVE_TEXT_STATE.switchTimer) {
    return;
  }

  window.clearTimeout(HOME_STAGE_INTERACTIVE_TEXT_STATE.switchTimer);
  HOME_STAGE_INTERACTIVE_TEXT_STATE.switchTimer = null;
}

/* =========================================================
   03. LABEL HELPERS
   ========================================================= */

function normalizeHomeStageInteractiveTextMode(mode) {
  const normalizedMode = typeof mode === 'string' ? mode.trim().toLowerCase() : '';

  switch (normalizedMode) {
    case 'listening':
    case 'transcribing':
    case 'thinking':
    case 'responding':
    case 'finding':
    case 'idle':
      return normalizedMode;
    case 'web':
    case 'site-knowledge':
    case 'platform-search':
      return 'finding';
    default:
      return 'idle';
  }
}

function getHomeStageInteractiveTextIdleLabel() {
  if (!HOME_STAGE_INTERACTIVE_TEXT_STATE.hasReceivedInput) {
    return HOME_STAGE_INTERACTIVE_TEXT_IDLE_LABELS[0];
  }

  const index = HOME_STAGE_INTERACTIVE_TEXT_STATE.resetIndex % (HOME_STAGE_INTERACTIVE_TEXT_IDLE_LABELS.length - 1);
  return HOME_STAGE_INTERACTIVE_TEXT_IDLE_LABELS[index + 1];
}

function getHomeStageInteractiveTextLabel(mode) {
  switch (normalizeHomeStageInteractiveTextMode(mode)) {
    case 'listening':
      return 'Listening';
    case 'transcribing':
      return 'Transcribing';
    case 'thinking':
      return 'Thinking';
    case 'responding':
      return 'Responding';
    case 'finding':
      return 'Finding';
    default:
      return getHomeStageInteractiveTextIdleLabel();
  }
}

/* =========================================================
   04. RENDERING
   ========================================================= */

function syncHomeStageInteractiveText() {
  const nodes = getHomeStageInteractiveTextNodes();
  const mode = normalizeHomeStageInteractiveTextMode(HOME_STAGE_INTERACTIVE_TEXT_STATE.mode);
  const label = getHomeStageInteractiveTextLabel(mode);

  HOME_STAGE_INTERACTIVE_TEXT_STATE.mode = mode;
  HOME_STAGE_INTERACTIVE_TEXT_STATE.label = label;

  if (nodes.root) {
    nodes.root.dataset.homeStageInteractiveTextMode = mode;
    nodes.root.dataset.homeStageInteractiveTextSwitch = 'text';
  }

  if (nodes.label) {
    nodes.label.textContent = label;
  }
}

function animateHomeStageInteractiveText(mode) {
  const nodes = getHomeStageInteractiveTextNodes();

  clearHomeStageInteractiveTextTimer();

  const normalizedMode = normalizeHomeStageInteractiveTextMode(mode);

  if (
    normalizedMode === 'listening' ||
    normalizedMode === 'transcribing' ||
    normalizedMode === 'thinking' ||
    normalizedMode === 'responding' ||
    normalizedMode === 'finding'
  ) {
    HOME_STAGE_INTERACTIVE_TEXT_STATE.hasReceivedInput = true;
  }

  HOME_STAGE_INTERACTIVE_TEXT_STATE.mode = normalizedMode;

  if (!nodes.root) {
    syncHomeStageInteractiveText();
    return;
  }

  nodes.root.dataset.homeStageInteractiveTextSwitch = 'dot';

  HOME_STAGE_INTERACTIVE_TEXT_STATE.switchTimer = window.setTimeout(() => {
    syncHomeStageInteractiveText();
  }, 420);
}

/* =========================================================
   05. EVENT BINDING
   ========================================================= */

function bindHomeStageInteractiveText() {
  if (HOME_STAGE_INTERACTIVE_TEXT_STATE.isBound) {
    syncHomeStageInteractiveText();
    return;
  }

  HOME_STAGE_INTERACTIVE_TEXT_STATE.isBound = true;

  document.addEventListener('neuroartan:home-stage-voice-mode', (event) => {
    animateHomeStageInteractiveText(event?.detail?.mode || 'idle');
  });

  document.addEventListener('neuroartan:home-stage-query-routing', (event) => {
    animateHomeStageInteractiveText(event?.detail?.route || 'finding');
  });

  document.addEventListener('neuroartan:home-stage-voice-response', (event) => {
    if (HOME_STAGE_INTERACTIVE_TEXT_STATE.isResetting) {
      return;
    }

    const response = typeof event?.detail?.response === 'string'
      ? event.detail.response.trim()
      : '';

    if (!response) {
      return;
    }

    animateHomeStageInteractiveText('responding');
  });

  document.addEventListener('neuroartan:home-stage-reset-requested', () => {
    HOME_STAGE_INTERACTIVE_TEXT_STATE.isResetting = true;
    HOME_STAGE_INTERACTIVE_TEXT_STATE.resetIndex += 1;
    HOME_STAGE_INTERACTIVE_TEXT_STATE.hasReceivedInput = true;
    animateHomeStageInteractiveText('idle');

    window.setTimeout(() => {
      HOME_STAGE_INTERACTIVE_TEXT_STATE.isResetting = false;
      syncHomeStageInteractiveText();
    }, 480);
  });
}

/* =========================================================
   06. MODULE BOOT
   ========================================================= */

function bootHomeStageInteractiveText() {
  HOME_STAGE_INTERACTIVE_TEXT_STATE.isResetting = false;
  bindHomeStageInteractiveText();
  syncHomeStageInteractiveText();
}

document.addEventListener('fragment:mounted', (event) => {
  if (event?.detail?.name !== 'home-stage-interactive-text') {
    return;
  }

  bootHomeStageInteractiveText();
});

document.addEventListener('neuroartan:runtime-ready', bootHomeStageInteractiveText);

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootHomeStageInteractiveText, { once: true });
} else {
  bootHomeStageInteractiveText();
}