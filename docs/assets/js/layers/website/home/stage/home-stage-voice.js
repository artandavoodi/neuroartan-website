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
  isSurfaceBound: false,
  isActive: false,
  isStarting: false,
  isStopping: false,
  mode: 'idle',
  transcript: '',
  finalTranscript: '',
  recognition: null,
  recognitionSupported: false,
  mediaStream: null,
  fallbackListeningTimer: null,
  permissionState: 'unknown',
  permissionsSupported: false,
  submittedQuery: '',
  route: '',
  activeQueryId: 0,
};

/* =========================================================
   02. DOM CONSTANTS
   ========================================================= */

const HOME_STAGE_VOICE_SELECTORS = {
  stageShell: '#stage-cognitive-core-shell',
  microphoneButton: '#stage-microphone-button',
  composerInput: '#home-interaction-panel-input',
};

/* =========================================================
   03. VOICE ENGINE CONSTANTS
   ========================================================= */

const HOME_STAGE_VOICE_MESSAGES = Object.freeze({
  idle: 'idle',
  listening: 'listening',
  transcribing: 'transcribing',
  thinking: 'thinking',
  responding: 'responding',
  unsupported: 'listening mode available',
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

function hasHomeStageMicrophoneFallbackSupport() {
  return Boolean(
    typeof navigator !== 'undefined' &&
    navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === 'function'
  );
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

function clearHomeStageVoiceTexts() {
  setHomeStageTranscript('');
  setHomeStageFinalTranscript('');
}

function getHomeStageVisibleTranscript() {
  return HOME_STAGE_VOICE_STATE.transcript || HOME_STAGE_VOICE_STATE.finalTranscript || '';
}

function isHomeStageVoiceOriginActive() {
  return (
    HOME_STAGE_VOICE_STATE.mode === 'listening' ||
    HOME_STAGE_VOICE_STATE.mode === 'transcribing'
  );
}

function syncHomeStageTranscriptToComposer() {
  const nodes = getHomeStageVoiceNodes();
  const transcript = getHomeStageVisibleTranscript().trim();

  if (!(nodes.composerInput instanceof HTMLTextAreaElement) || !transcript) {
    return;
  }

  if (!isHomeStageVoiceOriginActive()) {
    return;
  }

  nodes.composerInput.value = transcript;
  nodes.composerInput.dispatchEvent(new Event('input', { bubbles: true }));
}

function clearHomeStageComposerInput({ force = false } = {}) {
  const nodes = getHomeStageVoiceNodes();

  if (!(nodes.composerInput instanceof HTMLTextAreaElement)) {
    return;
  }

  if (!force && nodes.composerInput.value.trim()) {
    return;
  }

  nodes.composerInput.value = '';
  nodes.composerInput.style.height = 'auto';
  nodes.composerInput.dispatchEvent(new Event('input', { bubbles: true }));
}

function clearHomeStageFallbackListeningTimer() {
  if (!HOME_STAGE_VOICE_STATE.fallbackListeningTimer) {
    return;
  }

  window.clearTimeout(HOME_STAGE_VOICE_STATE.fallbackListeningTimer);
  HOME_STAGE_VOICE_STATE.fallbackListeningTimer = null;
}

function stopHomeStageFallbackMediaStream() {
  if (!HOME_STAGE_VOICE_STATE.mediaStream) {
    return;
  }

  HOME_STAGE_VOICE_STATE.mediaStream.getTracks().forEach((track) => {
    track.stop();
  });

  HOME_STAGE_VOICE_STATE.mediaStream = null;
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
    composerInput: document.querySelector(HOME_STAGE_VOICE_SELECTORS.composerInput),
  };
}

function syncHomeStageVoiceDom() {
  const nodes = getHomeStageVoiceNodes();

  if (!nodes.stageShell && !nodes.microphoneButton) {
    return;
  }

  if (nodes.stageShell) {
    nodes.stageShell.dataset.voiceMode = HOME_STAGE_VOICE_STATE.mode;
    nodes.stageShell.dataset.voiceActive = HOME_STAGE_VOICE_STATE.isActive ? 'true' : 'false';
  }

  if (nodes.microphoneButton) {
    nodes.microphoneButton.dataset.voiceMode = HOME_STAGE_VOICE_STATE.mode;
    nodes.microphoneButton.dataset.voiceActive = HOME_STAGE_VOICE_STATE.isActive ? 'true' : 'false';
    nodes.microphoneButton.dataset.voiceSupported = HOME_STAGE_VOICE_STATE.recognitionSupported ? 'true' : 'false';
    nodes.microphoneButton.setAttribute('aria-pressed', HOME_STAGE_VOICE_STATE.isActive ? 'true' : 'false');
    nodes.microphoneButton.setAttribute('aria-expanded', HOME_STAGE_VOICE_STATE.isActive ? 'true' : 'false');
  }
}

/* =========================================================
   06. EVENT EMISSION HELPERS
   ========================================================= */

function dispatchHomeStageVoiceActivated() {
  document.dispatchEvent(
    new CustomEvent('neuroartan:home-stage-voice-activated', {
      detail: { mode: HOME_STAGE_VOICE_STATE.mode },
    })
  );
}

function dispatchHomeStageVoiceDeactivated() {
  document.dispatchEvent(
    new CustomEvent('neuroartan:home-stage-voice-deactivated', {
      detail: { mode: HOME_STAGE_VOICE_STATE.mode },
    })
  );
}

function dispatchHomeStageVoiceMode(mode) {
  document.dispatchEvent(
    new CustomEvent('neuroartan:home-stage-voice-mode', {
      detail: { mode },
    })
  );
}

function dispatchHomeStageTranscript(transcript) {
  document.dispatchEvent(
    new CustomEvent('neuroartan:home-stage-voice-transcript', {
      detail: { transcript, source: 'voice' },
    })
  );
}

function dispatchHomeStageResponse(response) {
  document.dispatchEvent(
    new CustomEvent('neuroartan:home-stage-voice-response', {
      detail: { response },
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

function resetHomeStageVoiceSurface() {
  HOME_STAGE_VOICE_STATE.submittedQuery = '';
  HOME_STAGE_VOICE_STATE.route = '';
  HOME_STAGE_VOICE_STATE.activeQueryId += 1;
  clearHomeStageFallbackListeningTimer();
  stopHomeStageFallbackMediaStream();
  clearHomeStageVoiceTexts();
  clearHomeStageComposerInput({ force: true });
  setHomeStageVoiceMode('idle');
  dispatchHomeStageTranscript('');
  dispatchHomeStageResponse('');
  dispatchHomeStageVoiceMode('idle');
  dispatchHomeStageVoiceDeactivated();
  syncHomeStageVoiceDom();
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

async function activateHomeStageFallbackListening() {
  if (!hasHomeStageMicrophoneFallbackSupport()) {
    setHomeStageVoiceMode('idle');
    dispatchHomeStageVoiceMode('idle');
    dispatchHomeStageResponse('Voice transcription requires a browser with speech recognition support.');
    syncHomeStageVoiceDom();
    return;
  }

  HOME_STAGE_VOICE_STATE.isStarting = true;
  HOME_STAGE_VOICE_STATE.isStopping = false;
  HOME_STAGE_VOICE_STATE.submittedQuery = '';
  HOME_STAGE_VOICE_STATE.activeQueryId += 1;
  clearHomeStageVoiceTexts();
  clearHomeStageComposerInput();
  dispatchHomeStageTranscript('');
  dispatchHomeStageResponse('');
  setHomeStageVoiceMode('listening');
  dispatchHomeStageVoiceActivated();
  dispatchHomeStageVoiceMode('listening');
  syncHomeStageVoiceDom();

  try {
    HOME_STAGE_VOICE_STATE.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    HOME_STAGE_VOICE_STATE.permissionState = 'granted';
    HOME_STAGE_VOICE_STATE.isStarting = false;
    syncHomeStageVoiceDom();

    clearHomeStageFallbackListeningTimer();
    HOME_STAGE_VOICE_STATE.fallbackListeningTimer = window.setTimeout(() => {
      if (HOME_STAGE_VOICE_STATE.mode !== 'listening') {
        return;
      }

      setHomeStageVoiceMode('thinking');
      dispatchHomeStageVoiceMode('thinking');
      dispatchHomeStageResponse('Speech recognition is not available in this browser. Type your request in the composer and press Enter.');
      stopHomeStageFallbackMediaStream();
      syncHomeStageVoiceDom();
    }, 1800);
  } catch {
    HOME_STAGE_VOICE_STATE.isStarting = false;
    HOME_STAGE_VOICE_STATE.permissionState = 'denied';
    setHomeStageVoiceMode('idle');
    dispatchHomeStageVoiceMode('idle');
    dispatchHomeStageResponse(HOME_STAGE_VOICE_MESSAGES.denied);
    syncHomeStageVoiceDom();
  }
}

function deactivateHomeStageFallbackListening() {
  clearHomeStageFallbackListeningTimer();
  stopHomeStageFallbackMediaStream();
  HOME_STAGE_VOICE_STATE.isStarting = false;
  HOME_STAGE_VOICE_STATE.isStopping = false;
  setHomeStageVoiceMode('idle');
  dispatchHomeStageVoiceDeactivated();
  dispatchHomeStageVoiceMode('idle');
  syncHomeStageVoiceDom();
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

  if (getHomeStageVisibleTranscript().trim()) {
    setHomeStageVoiceMode('transcribing');
    dispatchHomeStageVoiceMode('transcribing');
  }

  dispatchHomeStageTranscript(getHomeStageVisibleTranscript());
  syncHomeStageTranscriptToComposer();
  syncHomeStageVoiceDom();
}

function submitHomeStageVoiceQuery() {
  const query = HOME_STAGE_VOICE_STATE.finalTranscript.trim();

  if (!query || query === HOME_STAGE_VOICE_STATE.submittedQuery) {
    return;
  }

  stopHomeStageFallbackMediaStream();
  clearHomeStageFallbackListeningTimer();
  HOME_STAGE_VOICE_STATE.submittedQuery = query;
  setHomeStageVoiceMode('thinking');
  dispatchHomeStageVoiceMode('thinking');
  dispatchHomeStageVoiceQuerySubmitted(query);
  syncHomeStageTranscriptToComposer();
  syncHomeStageVoiceDom();
}

function handleHomeStageRecognitionError(event) {
  const errorCode = event?.error ?? 'unknown';

  if (errorCode === 'not-allowed' || errorCode === 'service-not-allowed') {
    HOME_STAGE_VOICE_STATE.recognitionSupported = true;
    setHomeStageVoiceMode('idle');
    dispatchHomeStageResponse(HOME_STAGE_VOICE_MESSAGES.denied);
  } else if (errorCode === 'no-speech') {
    setHomeStageVoiceMode('idle');
  } else {
    setHomeStageVoiceMode('idle');
    dispatchHomeStageResponse(HOME_STAGE_VOICE_MESSAGES.error);
  }

  clearHomeStageFallbackListeningTimer();
  stopHomeStageFallbackMediaStream();
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
    stopHomeStageFallbackMediaStream();
    clearHomeStageFallbackListeningTimer();

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
    dispatchHomeStageResponse(HOME_STAGE_VOICE_MESSAGES.denied);
    syncHomeStageVoiceDom();
    return;
  }

  const recognition = ensureHomeStageRecognition();

  if (!recognition) {
    void activateHomeStageFallbackListening();
    return;
  }

  HOME_STAGE_VOICE_STATE.isStarting = true;
  HOME_STAGE_VOICE_STATE.isStopping = false;
  HOME_STAGE_VOICE_STATE.submittedQuery = '';
  HOME_STAGE_VOICE_STATE.activeQueryId += 1;
  setHomeStageVoiceMode('idle');
  clearHomeStageVoiceTexts();
  dispatchHomeStageTranscript('');
  dispatchHomeStageResponse('');
  clearHomeStageComposerInput();
  syncHomeStageVoiceDom();
  dispatchHomeStageVoiceMode('listening');
  dispatchHomeStageVoiceActivated();

  try {
    recognition.start();
    void updateHomeStagePermissionState();
  } catch {
    HOME_STAGE_VOICE_STATE.isStarting = false;
    dispatchHomeStageVoiceMode('idle');
    dispatchHomeStageResponse(HOME_STAGE_VOICE_MESSAGES.error);
    syncHomeStageVoiceDom();
  }
}

function deactivateHomeStageListening() {
  const recognition = HOME_STAGE_VOICE_STATE.recognition;
  if (!recognition && HOME_STAGE_VOICE_STATE.mediaStream) {
    deactivateHomeStageFallbackListening();
    return;
  }

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

  if (HOME_STAGE_VOICE_STATE.mode === 'listening' || HOME_STAGE_VOICE_STATE.mode === 'transcribing') {
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
  if (HOME_STAGE_VOICE_STATE.isSurfaceBound) {
    return;
  }

  HOME_STAGE_VOICE_STATE.isSurfaceBound = true;

  document.addEventListener('click', (event) => {
    const target = event.target instanceof Element
      ? event.target.closest(HOME_STAGE_VOICE_SELECTORS.microphoneButton)
      : null;

    if (!target) {
      return;
    }

    event.preventDefault();
    toggleHomeStageVoice();
  });
}

/* =========================================================
   10. EVENT BINDING
   ========================================================= */

function bindHomeStageVoiceEvents() {
  document.addEventListener('neuroartan:home-stage-query-routing', (event) => {
    HOME_STAGE_VOICE_STATE.route = String(event?.detail?.route || '').trim().toLowerCase();
    HOME_STAGE_VOICE_STATE.activeQueryId = Number(event?.detail?.queryId || HOME_STAGE_VOICE_STATE.activeQueryId || 0);
    syncHomeStageVoiceDom();
  });

  document.addEventListener('neuroartan:home-stage-voice-transcript', (event) => {
    const nextTranscript = event?.detail?.transcript ?? '';
    setHomeStageTranscript(nextTranscript);

    if (event?.detail?.source === 'voice') {
      syncHomeStageTranscriptToComposer();
    }

    syncHomeStageVoiceDom();
  });

  document.addEventListener('neuroartan:home-stage-voice-response', (event) => {
    const nextQueryId = Number(event?.detail?.queryId || 0);
    if (nextQueryId && nextQueryId < HOME_STAGE_VOICE_STATE.activeQueryId) {
      return;
    }

    const nextResponse = event?.detail?.response ?? '';

    if (typeof nextResponse === 'string' && nextResponse.trim()) {
      setHomeStageVoiceMode('responding');
    }

    if (typeof nextResponse === 'string' && !nextResponse.trim()) {
      HOME_STAGE_VOICE_STATE.submittedQuery = '';
    }

    syncHomeStageVoiceDom();
  });

  document.addEventListener('neuroartan:home-stage-voice-mode', (event) => {
    const nextMode = event?.detail?.mode;

    if (typeof nextMode !== 'string' || !nextMode.trim()) {
      return;
    }

    const normalizedMode = nextMode.trim();
    setHomeStageVoiceMode(normalizedMode);

    if (normalizedMode === 'thinking' || normalizedMode === 'responding' || normalizedMode === 'idle') {
      stopHomeStageFallbackMediaStream();
      clearHomeStageFallbackListeningTimer();
    }

    syncHomeStageVoiceDom();
  });

  document.addEventListener('neuroartan:home-stage-reset-requested', () => {
    if (HOME_STAGE_VOICE_STATE.recognition) {
      HOME_STAGE_VOICE_STATE.isStopping = true;

      try {
        HOME_STAGE_VOICE_STATE.recognition.stop();
      } catch (_) {
        HOME_STAGE_VOICE_STATE.isStopping = false;
      }
    }

    clearHomeStageFallbackListeningTimer();
    stopHomeStageFallbackMediaStream();
    resetHomeStageVoiceSurface();
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
  HOME_STAGE_VOICE_STATE.isBound = true;
  bindHomeStageVoiceSurface();
  bindHomeStageVoiceEvents();
  void updateHomeStagePermissionState();
  syncHomeStageVoiceDom();

  window.addEventListener('beforeunload', teardownHomeStageRecognition, { once: true });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootHomeStageVoice, { once: true });
} else {
  bootHomeStageVoice();
}