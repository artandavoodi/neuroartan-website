/* =========================================================
   00. FILE INDEX
   01. MODULE STATE
   02. DOM CONSTANTS
   03. VOICE ENGINE CONSTANTS
   04. STATE HELPERS
   05. DOM HELPERS
   06. EVENT EMISSION HELPERS
   07. RECOGNITION HELPERS
   08. PERMISSION HELPERS
   09. VOICE SURFACE BINDING
   10. EVENT BINDING
   11. MODULE BOOT
   ========================================================= */

/* =========================================================
   01. MODULE STATE
   ========================================================= */

const HOME_STAGE_VOICE_STATE = {
  isBound: false,
  isActive: false,
  isStarting: false,
  isStopping: false,
  mode: 'idle',
  transcript: '',
  finalTranscript: '',
  response: '',
  recognition: null,
  recognitionSupported: false,
  permissionState: 'unknown',
  permissionsSupported: false,
  submittedQuery: '',
  route: '',
  baseEssenceLabel: '',
};

/* =========================================================
   02. DOM CONSTANTS
   ========================================================= */

const HOME_STAGE_VOICE_SELECTORS = {
  stageShell: '#stage-cognitive-core-shell',
  microphoneButton: '#stage-microphone-button',
  interactionShell: '#stage-voice-interaction-shell',
  essence: '#stage-essence',
  status: '#stage-voice-status',
  transcript: '#stage-voice-transcript',
  response: '#stage-voice-response',
};

/* =========================================================
   03. VOICE ENGINE CONSTANTS
   ========================================================= */

const HOME_STAGE_VOICE_MESSAGES = Object.freeze({
  idle: 'idle',
  listening: 'listening',
  thinking: 'thinking',
  responding: 'responding',
  unsupported: 'voice unavailable',
  prompt: 'allow microphone',
  denied: 'microphone denied',
  error: 'voice error',
});

function getHomeStageSpeechRecognitionConstructor() {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

/* =========================================================
   04. STATE HELPERS
   ========================================================= */

function setHomeStageVoiceMode(mode) {
  HOME_STAGE_VOICE_STATE.mode = typeof mode === 'string' ? mode : 'idle';
  HOME_STAGE_VOICE_STATE.isActive = HOME_STAGE_VOICE_STATE.mode !== 'idle';
}

function setHomeStageTranscript(value) {
  HOME_STAGE_VOICE_STATE.transcript = typeof value === 'string' ? value : '';
}

function setHomeStageFinalTranscript(value) {
  HOME_STAGE_VOICE_STATE.finalTranscript = typeof value === 'string' ? value : '';
}

function setHomeStageResponse(value) {
  HOME_STAGE_VOICE_STATE.response = typeof value === 'string' ? value : '';
}

function clearHomeStageVoiceTexts() {
  setHomeStageTranscript('');
  setHomeStageFinalTranscript('');
  setHomeStageResponse('');
}

function getHomeStageVisibleTranscript() {
  return HOME_STAGE_VOICE_STATE.transcript || HOME_STAGE_VOICE_STATE.finalTranscript || '';
}

function canHomeStageStartListening() {
  return (
    HOME_STAGE_VOICE_STATE.mode === 'idle' ||
    HOME_STAGE_VOICE_STATE.mode === 'thinking' ||
    HOME_STAGE_VOICE_STATE.mode === 'responding'
  );
}

/* =========================================================
   05. DOM HELPERS
   ========================================================= */

function getHomeStageVoiceNodes() {
  return {
    stageShell: document.querySelector(HOME_STAGE_VOICE_SELECTORS.stageShell),
    microphoneButton: document.querySelector(HOME_STAGE_VOICE_SELECTORS.microphoneButton),
    interactionShell: document.querySelector(HOME_STAGE_VOICE_SELECTORS.interactionShell),
    essence: document.querySelector(HOME_STAGE_VOICE_SELECTORS.essence),
    status: document.querySelector(HOME_STAGE_VOICE_SELECTORS.status),
    transcript: document.querySelector(HOME_STAGE_VOICE_SELECTORS.transcript),
    response: document.querySelector(HOME_STAGE_VOICE_SELECTORS.response),
  };
}

function getHomeStageRouteLabel() {
  switch (HOME_STAGE_VOICE_STATE.route) {
    case 'translation':
      return 'translating';
    case 'web':
    case 'site-knowledge':
    case 'platform-search':
      return 'finding';
    default:
      return 'responding';
  }
}

function getHomeStageEssenceLabel() {
  switch (HOME_STAGE_VOICE_STATE.mode) {
    case 'listening':
      return 'listening';
    case 'thinking':
      return 'thinking';
    case 'responding':
      return getHomeStageRouteLabel();
    default:
      return HOME_STAGE_VOICE_STATE.baseEssenceLabel || "What's in my mind?";
  }
}

function getHomeStageStatusLabel() {
  if (!HOME_STAGE_VOICE_STATE.recognitionSupported) {
    return HOME_STAGE_VOICE_MESSAGES.unsupported;
  }

  if (HOME_STAGE_VOICE_STATE.permissionState === 'denied') {
    return HOME_STAGE_VOICE_MESSAGES.denied;
  }

  if (HOME_STAGE_VOICE_STATE.permissionState === 'prompt' && HOME_STAGE_VOICE_STATE.mode === 'idle') {
    return HOME_STAGE_VOICE_MESSAGES.prompt;
  }

  switch (HOME_STAGE_VOICE_STATE.mode) {
    case 'listening':
      return HOME_STAGE_VOICE_MESSAGES.listening;
    case 'thinking':
      return HOME_STAGE_VOICE_MESSAGES.thinking;
    case 'responding':
      return HOME_STAGE_VOICE_MESSAGES.responding;
    default:
      return HOME_STAGE_VOICE_MESSAGES.idle;
  }
}

function syncHomeStageVoiceDom() {
  const nodes = getHomeStageVoiceNodes();

  if (!nodes.stageShell || !nodes.microphoneButton) {
    return;
  }

  nodes.stageShell.dataset.voiceMode = HOME_STAGE_VOICE_STATE.mode;
  nodes.stageShell.dataset.voiceActive = HOME_STAGE_VOICE_STATE.isActive ? 'true' : 'false';
  nodes.microphoneButton.dataset.voiceMode = HOME_STAGE_VOICE_STATE.mode;
  nodes.microphoneButton.dataset.voiceActive = HOME_STAGE_VOICE_STATE.isActive ? 'true' : 'false';
  nodes.microphoneButton.dataset.voiceSupported = HOME_STAGE_VOICE_STATE.recognitionSupported ? 'true' : 'false';
  nodes.microphoneButton.setAttribute(
    'aria-pressed',
    HOME_STAGE_VOICE_STATE.isActive ? 'true' : 'false'
  );
  nodes.microphoneButton.setAttribute('aria-expanded', HOME_STAGE_VOICE_STATE.isActive ? 'true' : 'false');

  if (nodes.interactionShell) {
    nodes.interactionShell.dataset.voiceMode = HOME_STAGE_VOICE_STATE.mode;
    nodes.interactionShell.dataset.voiceActive = HOME_STAGE_VOICE_STATE.isActive ? 'true' : 'false';
    nodes.interactionShell.hidden = false;
  }

  if (nodes.essence) {
    if (!HOME_STAGE_VOICE_STATE.baseEssenceLabel) {
      HOME_STAGE_VOICE_STATE.baseEssenceLabel = nodes.essence.textContent?.trim() || "What's in my mind?";
    }

    nodes.essence.textContent = getHomeStageEssenceLabel();
    nodes.essence.dataset.engineMode = HOME_STAGE_VOICE_STATE.mode;
    nodes.essence.dataset.engineActive = HOME_STAGE_VOICE_STATE.mode === 'idle' ? 'false' : 'true';
  }

  if (nodes.status) {
    nodes.status.textContent = getHomeStageStatusLabel();
  }

  if (nodes.transcript) {
    nodes.transcript.textContent = getHomeStageVisibleTranscript();
  }

  if (nodes.response) {
    nodes.response.textContent = HOME_STAGE_VOICE_STATE.response;
  }
}

/* =========================================================
   06. EVENT EMISSION HELPERS
   ========================================================= */

function dispatchHomeStageVoiceActivated() {
  document.dispatchEvent(
    new CustomEvent('neuroartan:home-stage-voice-activated', {
      detail: {
        mode: HOME_STAGE_VOICE_STATE.mode,
      },
    })
  );
}

function dispatchHomeStageVoiceDeactivated() {
  document.dispatchEvent(
    new CustomEvent('neuroartan:home-stage-voice-deactivated', {
      detail: {
        mode: HOME_STAGE_VOICE_STATE.mode,
      },
    })
  );
}

function dispatchHomeStageVoiceMode(mode) {
  document.dispatchEvent(
    new CustomEvent('neuroartan:home-stage-voice-mode', {
      detail: {
        mode,
      },
    })
  );
}

function dispatchHomeStageTranscript(transcript) {
  document.dispatchEvent(
    new CustomEvent('neuroartan:home-stage-voice-transcript', {
      detail: {
        transcript,
      },
    })
  );
}

function dispatchHomeStageResponse(response) {
  document.dispatchEvent(
    new CustomEvent('neuroartan:home-stage-voice-response', {
      detail: {
        response,
      },
    })
  );
}

function dispatchHomeStageVoiceQuerySubmitted(query) {
  document.dispatchEvent(
    new CustomEvent('neuroartan:home-stage-voice-query-submitted', {
      detail: {
        query,
        source: 'voice',
        mode: 'search_or_knowledge',
      },
    })
  );
}

/* =========================================================
   07. RECOGNITION HELPERS
   ========================================================= */

function teardownHomeStageRecognition() {
  if (!HOME_STAGE_VOICE_STATE.recognition) {
    return;
  }

  HOME_STAGE_VOICE_STATE.recognition.onstart = null;
  HOME_STAGE_VOICE_STATE.recognition.onresult = null;
  HOME_STAGE_VOICE_STATE.recognition.onerror = null;
  HOME_STAGE_VOICE_STATE.recognition.onend = null;
  HOME_STAGE_VOICE_STATE.recognition = null;
}

function handleHomeStageRecognitionResult(event) {
  if (!event?.results) {
    return;
  }

  let interimTranscript = '';
  let finalTranscript = HOME_STAGE_VOICE_STATE.finalTranscript;

  for (let index = event.resultIndex; index < event.results.length; index += 1) {
    const result = event.results[index];
    const transcript = result?.[0]?.transcript ?? '';

    if (result?.isFinal) {
      finalTranscript = `${finalTranscript} ${transcript}`.trim();
    } else {
      interimTranscript = `${interimTranscript} ${transcript}`.trim();
    }
  }

  setHomeStageFinalTranscript(finalTranscript);
  setHomeStageTranscript(interimTranscript || finalTranscript);
  dispatchHomeStageTranscript(getHomeStageVisibleTranscript());
  syncHomeStageVoiceDom();
}

function submitHomeStageVoiceQuery() {
  const query = HOME_STAGE_VOICE_STATE.finalTranscript.trim();

  if (!query || query === HOME_STAGE_VOICE_STATE.submittedQuery) {
    return;
  }

  HOME_STAGE_VOICE_STATE.submittedQuery = query;
  setHomeStageVoiceMode('thinking');
  setHomeStageResponse('');
  dispatchHomeStageVoiceMode('thinking');
  dispatchHomeStageVoiceQuerySubmitted(query);
  syncHomeStageVoiceDom();
}

function handleHomeStageRecognitionError(event) {
  const errorCode = event?.error ?? 'unknown';

  if (errorCode === 'not-allowed' || errorCode === 'service-not-allowed') {
    HOME_STAGE_VOICE_STATE.recognitionSupported = true;
    setHomeStageVoiceMode('idle');
    setHomeStageResponse(HOME_STAGE_VOICE_MESSAGES.denied);
  } else if (errorCode === 'no-speech') {
    setHomeStageVoiceMode('idle');
  } else {
    setHomeStageVoiceMode('idle');
    setHomeStageResponse(HOME_STAGE_VOICE_MESSAGES.error);
  }

  teardownHomeStageRecognition();
  HOME_STAGE_VOICE_STATE.isStarting = false;
  HOME_STAGE_VOICE_STATE.isStopping = false;
  dispatchHomeStageVoiceDeactivated();
  syncHomeStageVoiceDom();
}

function buildHomeStageRecognition() {
  const SpeechRecognitionConstructor = getHomeStageSpeechRecognitionConstructor();

  if (!SpeechRecognitionConstructor) {
    HOME_STAGE_VOICE_STATE.recognitionSupported = false;
    return null;
  }

  const recognition = new SpeechRecognitionConstructor();
  recognition.lang = document.documentElement?.lang || 'en-US';
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  recognition.onstart = () => {
    HOME_STAGE_VOICE_STATE.isStarting = false;
    HOME_STAGE_VOICE_STATE.isStopping = false;
    setHomeStageVoiceMode('listening');
    dispatchHomeStageVoiceActivated();
    dispatchHomeStageVoiceMode('listening');
    syncHomeStageVoiceDom();
  };

  recognition.onresult = handleHomeStageRecognitionResult;
  recognition.onerror = handleHomeStageRecognitionError;

  recognition.onend = () => {
    const shouldSubmit = !HOME_STAGE_VOICE_STATE.isStopping && HOME_STAGE_VOICE_STATE.finalTranscript.trim();
    HOME_STAGE_VOICE_STATE.isStarting = false;
    HOME_STAGE_VOICE_STATE.isStopping = false;
    teardownHomeStageRecognition();

    if (shouldSubmit) {
      submitHomeStageVoiceQuery();
      return;
    }

    setHomeStageVoiceMode('idle');
    dispatchHomeStageVoiceDeactivated();
    syncHomeStageVoiceDom();
  };

  HOME_STAGE_VOICE_STATE.recognitionSupported = true;
  HOME_STAGE_VOICE_STATE.permissionState = HOME_STAGE_VOICE_STATE.permissionState === 'denied' ? 'denied' : 'granted';
  HOME_STAGE_VOICE_STATE.recognition = recognition;
  return recognition;
}

function ensureHomeStageRecognition() {
  if (HOME_STAGE_VOICE_STATE.recognition) {
    return HOME_STAGE_VOICE_STATE.recognition;
  }

  return buildHomeStageRecognition();
}

function activateHomeStageListening() {
  if (HOME_STAGE_VOICE_STATE.permissionState === 'denied') {
    setHomeStageVoiceMode('idle');
    setHomeStageResponse(HOME_STAGE_VOICE_MESSAGES.denied);
    syncHomeStageVoiceDom();
    return;
  }

  const recognition = ensureHomeStageRecognition();

  if (!recognition) {
    setHomeStageVoiceMode('idle');
    setHomeStageResponse(HOME_STAGE_VOICE_MESSAGES.unsupported);
    syncHomeStageVoiceDom();
    return;
  }

  HOME_STAGE_VOICE_STATE.isStarting = true;
  HOME_STAGE_VOICE_STATE.isStopping = false;
  HOME_STAGE_VOICE_STATE.submittedQuery = '';
  setHomeStageVoiceMode('idle');
  clearHomeStageVoiceTexts();
  dispatchHomeStageTranscript('');
  dispatchHomeStageResponse('');
  syncHomeStageVoiceDom();

  try {
    recognition.start();
    void updateHomeStagePermissionState();
  } catch {
    HOME_STAGE_VOICE_STATE.isStarting = false;
    setHomeStageResponse(HOME_STAGE_VOICE_MESSAGES.error);
    syncHomeStageVoiceDom();
  }
}

function deactivateHomeStageListening() {
  const recognition = HOME_STAGE_VOICE_STATE.recognition;

  if (!recognition) {
    setHomeStageVoiceMode('idle');
    dispatchHomeStageVoiceDeactivated();
    syncHomeStageVoiceDom();
    return;
  }

  HOME_STAGE_VOICE_STATE.isStopping = true;

  try {
    recognition.stop();
  } catch {
    HOME_STAGE_VOICE_STATE.isStopping = false;
    setHomeStageVoiceMode('idle');
    dispatchHomeStageVoiceDeactivated();
    syncHomeStageVoiceDom();
  }
}

function toggleHomeStageVoice() {
  if (HOME_STAGE_VOICE_STATE.isStarting || HOME_STAGE_VOICE_STATE.isStopping) {
    return;
  }

  if (canHomeStageStartListening()) {
    activateHomeStageListening();
    return;
  }

  if (HOME_STAGE_VOICE_STATE.mode === 'listening') {
    deactivateHomeStageListening();
    return;
  }

  activateHomeStageListening();
}

/* =========================================================
   08. PERMISSION HELPERS
   ========================================================= */

async function updateHomeStagePermissionState() {
  const permissionsApiAvailable =
    typeof navigator !== 'undefined' &&
    navigator.permissions &&
    typeof navigator.permissions.query === 'function';

  HOME_STAGE_VOICE_STATE.permissionsSupported = Boolean(permissionsApiAvailable);

  if (!permissionsApiAvailable) {
    HOME_STAGE_VOICE_STATE.permissionState = 'unknown';
    syncHomeStageVoiceDom();
    return;
  }

  try {
    const status = await navigator.permissions.query({ name: 'microphone' });
    HOME_STAGE_VOICE_STATE.permissionState = status?.state || 'unknown';

    if (status && typeof status.addEventListener === 'function') {
      status.addEventListener('change', () => {
        HOME_STAGE_VOICE_STATE.permissionState = status.state || 'unknown';
        syncHomeStageVoiceDom();
      });
    }
  } catch {
    HOME_STAGE_VOICE_STATE.permissionState = 'unknown';
  }

  syncHomeStageVoiceDom();
}

/* =========================================================
   09. VOICE SURFACE BINDING
   ========================================================= */

function bindHomeStageVoiceSurface() {
  const nodes = getHomeStageVoiceNodes();

  if (!nodes.microphoneButton) {
    return;
  }

  nodes.microphoneButton.addEventListener('click', toggleHomeStageVoice);
}

/* =========================================================
   10. EVENT BINDING
   ========================================================= */

function bindHomeStageVoiceEvents() {
  document.addEventListener('neuroartan:home-stage-query-routing', (event) => {
    HOME_STAGE_VOICE_STATE.route = String(event?.detail?.route || '').trim().toLowerCase();
    syncHomeStageVoiceDom();
  });

  document.addEventListener('neuroartan:home-stage-voice-transcript', (event) => {
    const nextTranscript = event?.detail?.transcript ?? '';
    setHomeStageTranscript(nextTranscript);
    syncHomeStageVoiceDom();
  });

  document.addEventListener('neuroartan:home-stage-voice-response', (event) => {
    const nextResponse = event?.detail?.response ?? '';
    setHomeStageResponse(nextResponse);

    if (typeof nextResponse === 'string' && nextResponse.trim()) {
      setHomeStageVoiceMode('responding');
    }
    if (typeof nextResponse === 'string' && !nextResponse.trim()) {
      HOME_STAGE_VOICE_STATE.submittedQuery = '';
    }
    if (typeof nextResponse === 'string' && nextResponse.trim()) {
      HOME_STAGE_VOICE_STATE.permissionState = HOME_STAGE_VOICE_STATE.permissionState === 'denied'
        ? 'denied'
        : HOME_STAGE_VOICE_STATE.permissionState;
    }

    syncHomeStageVoiceDom();
  });

  document.addEventListener('neuroartan:home-stage-voice-mode', (event) => {
    const nextMode = event?.detail?.mode;

    if (typeof nextMode !== 'string' || !nextMode.trim()) {
      return;
    }

    setHomeStageVoiceMode(nextMode.trim());
    syncHomeStageVoiceDom();
  });
}

/* =========================================================
   11. MODULE BOOT
   ========================================================= */

function bootHomeStageVoice() {
  if (HOME_STAGE_VOICE_STATE.isBound) {
    syncHomeStageVoiceDom();
    return;
  }

  HOME_STAGE_VOICE_STATE.recognitionSupported = Boolean(getHomeStageSpeechRecognitionConstructor());
  void updateHomeStagePermissionState();
  HOME_STAGE_VOICE_STATE.isBound = true;
  syncHomeStageVoiceDom();
  bindHomeStageVoiceSurface();
  bindHomeStageVoiceEvents();

  window.addEventListener('beforeunload', teardownHomeStageRecognition, { once: true });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootHomeStageVoice, { once: true });
} else {
  bootHomeStageVoice();
}
