/* =========================================================
   00. FILE INDEX
   01. MODULE STATE
   02. DOM CONSTANTS
   03. MOTION HELPERS
   04. MODE APPLICATION
   05. EVENT BINDING
   06. MODULE BOOT
   ========================================================= */

/* =========================================================
   01. MODULE STATE
   ========================================================= */

const HOME_STAGE_MOTION_STATE = {
  isBound: false,
  mode: 'idle',
};

/* =========================================================
   02. DOM CONSTANTS
   ========================================================= */

const HOME_STAGE_MOTION_SELECTORS = {
  stageShell: '#stage-cognitive-core-shell',
  microphoneButton: '#stage-microphone-button',
};

/* =========================================================
   03. MOTION HELPERS
   ========================================================= */

function getHomeStageMotionNodes() {
  return {
    stageShell: document.querySelector(HOME_STAGE_MOTION_SELECTORS.stageShell),
    microphoneButton: document.querySelector(HOME_STAGE_MOTION_SELECTORS.microphoneButton),
  };
}

function normalizeHomeStageMotionMode(mode) {
  if (typeof mode !== 'string') {
    return 'idle';
  }

  const nextMode = mode.trim().toLowerCase();
  const allowedModes = new Set(['idle', 'listening', 'transcribing', 'thinking', 'responding']);

  if (!nextMode) {
    return 'idle';
  }

  return allowedModes.has(nextMode) ? nextMode : 'idle';
}

function clearHomeStageMotionTokens(node) {
  if (!node) {
    return;
  }

  delete node.dataset.voiceMotion;
  delete node.dataset.voicePulse;
  delete node.dataset.voiceOrbit;
  delete node.dataset.voiceGlow;
  delete node.dataset.voiceState;
}

/* =========================================================
   04. MODE APPLICATION
   ========================================================= */

function applyHomeStageMotionMode(mode) {
  const normalizedMode = normalizeHomeStageMotionMode(mode);
  const nodes = getHomeStageMotionNodes();

  HOME_STAGE_MOTION_STATE.mode = normalizedMode;
  const isActiveMode = normalizedMode === 'listening' || normalizedMode === 'transcribing' || normalizedMode === 'thinking' || normalizedMode === 'responding';

  [nodes.stageShell, nodes.microphoneButton].forEach(clearHomeStageMotionTokens);

  if (nodes.stageShell) {
    nodes.stageShell.dataset.voiceMotion = normalizedMode;
    nodes.stageShell.dataset.voiceState = isActiveMode ? 'active' : 'idle';
  }

  if (nodes.microphoneButton) {
    nodes.microphoneButton.dataset.voiceMotion = normalizedMode;
    nodes.microphoneButton.dataset.voiceState = isActiveMode ? 'active' : 'idle';
  }

  switch (normalizedMode) {
    case 'listening': {
      if (nodes.stageShell) {
        nodes.stageShell.dataset.voicePulse = 'active';
        nodes.stageShell.dataset.voiceOrbit = 'active';
        nodes.stageShell.dataset.voiceGlow = 'listening';
      }
      if (nodes.microphoneButton) {
        nodes.microphoneButton.dataset.voicePulse = 'active';
      }
      break;
    }
    case 'transcribing': {
      if (nodes.stageShell) {
        nodes.stageShell.dataset.voicePulse = 'transcribing';
        nodes.stageShell.dataset.voiceOrbit = 'active';
        nodes.stageShell.dataset.voiceGlow = 'transcribing';
      }

      if (nodes.microphoneButton) {
        nodes.microphoneButton.dataset.voicePulse = 'transcribing';
      }
      break;
    }
    case 'thinking': {
      if (nodes.stageShell) {
        nodes.stageShell.dataset.voicePulse = 'soft';
        nodes.stageShell.dataset.voiceOrbit = 'thinking';
        nodes.stageShell.dataset.voiceGlow = 'thinking';
      }
      if (nodes.microphoneButton) {
        nodes.microphoneButton.dataset.voicePulse = 'soft';
      }
      break;
    }
    case 'responding': {
      if (nodes.stageShell) {
        nodes.stageShell.dataset.voicePulse = 'response';
        nodes.stageShell.dataset.voiceOrbit = 'response';
        nodes.stageShell.dataset.voiceGlow = 'response';
      }
      if (nodes.microphoneButton) {
        nodes.microphoneButton.dataset.voicePulse = 'response';
      }
      break;
    }
    default: {
      break;
    }
  }
}

/* =========================================================
   05. EVENT BINDING
   ========================================================= */

function bindHomeStageMotionEvents() {
  document.addEventListener('neuroartan:home-stage-voice-activated', () => {
    applyHomeStageMotionMode('listening');
  });

  document.addEventListener('neuroartan:home-stage-voice-deactivated', () => {
    applyHomeStageMotionMode('idle');
  });

  document.addEventListener('neuroartan:home-stage-voice-mode', (event) => {
    applyHomeStageMotionMode(event?.detail?.mode ?? 'idle');
  });

  document.addEventListener('neuroartan:home-stage-voice-transcript', (event) => {
    const transcript = typeof event?.detail?.transcript === 'string'
      ? event.detail.transcript.trim()
      : '';

    if (transcript && HOME_STAGE_MOTION_STATE.mode === 'listening') {
      applyHomeStageMotionMode('transcribing');
    }
  });

  document.addEventListener('neuroartan:home-stage-reset-requested', () => {
    applyHomeStageMotionMode('idle');
  });
}

/* =========================================================
   06. MODULE BOOT
   ========================================================= */

function bootHomeStageMotion() {
  if (HOME_STAGE_MOTION_STATE.isBound) {
    applyHomeStageMotionMode(HOME_STAGE_MOTION_STATE.mode);
    return;
  }

  HOME_STAGE_MOTION_STATE.isBound = true;
  applyHomeStageMotionMode('idle');
  bindHomeStageMotionEvents();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootHomeStageMotion, { once: true });
} else {
  bootHomeStageMotion();
}
