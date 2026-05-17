/* =========================================================
   00. FILE INDEX
   01. MODULE STATE
   02. DOM CONSTANTS
   03. MODE CONSTANTS
   04. STATE HELPERS
   05. DOM HELPERS
   06. CANVAS HELPERS
   07. RENDER HELPERS
   08. EVENT BINDING
   09. MODULE BOOT
   ========================================================= */

/* =========================================================
   01. MODULE STATE
   ========================================================= */

const HOME_STAGE_CORE_EFFECT_STATE = {
  isBound: false,
  mode: 'idle',
  rafId: null,
  resizeObserver: null,
  canvas: null,
  context: null,
  shell: null,
  mount: null,
  width: 0,
  height: 0,
  dpr: 1,
  startTime: 0,
  energy: 0,
  targetEnergy: 0,
  isResetting: false,
  resizeTimer: null,
  isLifecyclePaused: false,
  lastRenderTimestamp: 0,
};

/* =========================================================
   02. DOM CONSTANTS
   ========================================================= */

const HOME_STAGE_CORE_EFFECT_SELECTORS = {
  shell: '#stage-cognitive-core-shell',
  vessel: '#stage-glass-vessel',
  microphoneButton: '#stage-microphone-button',
};

/* =========================================================
   03. MODE CONSTANTS
   ========================================================= */

const HOME_STAGE_CORE_EFFECT_MODE_ENERGY = Object.freeze({
  idle: 0.24,
  release: 0.2,
  listening: 0.9,
  transcribing: 0.68,
  thinking: 0.6,
  responding: 1.0,
});

/* =========================================================
   04. STATE HELPERS
   ========================================================= */

function normalizeHomeStageCoreEffectMode(mode) {
  if (typeof mode !== 'string') {
    return 'idle';
  }

  const nextMode = mode.trim().toLowerCase();
  return Object.prototype.hasOwnProperty.call(HOME_STAGE_CORE_EFFECT_MODE_ENERGY, nextMode)
    ? nextMode
    : 'idle';
}

function setHomeStageCoreEffectMode(mode) {
  const nextMode = normalizeHomeStageCoreEffectMode(mode);
  HOME_STAGE_CORE_EFFECT_STATE.mode = nextMode;
  HOME_STAGE_CORE_EFFECT_STATE.targetEnergy = HOME_STAGE_CORE_EFFECT_MODE_ENERGY[nextMode];

  if (HOME_STAGE_CORE_EFFECT_STATE.shell) {
    HOME_STAGE_CORE_EFFECT_STATE.shell.dataset.coreEffectMode = nextMode;
  }

  const nodes = getHomeStageCoreEffectNodes();

  if (nodes.vessel) {
    nodes.vessel.dataset.coreEffectMode = nextMode;
  }

  if (nodes.visual) {
    nodes.visual.dataset.coreEffectMode = nextMode;
  }

  if (shouldRunHomeStageCoreEffectLoop()) {
    startHomeStageCoreEffectLoop();
    return;
  }

  renderHomeStageCoreEffectStaticFrame();
}

function scheduleHomeStageCoreEffectResize() {
  window.requestAnimationFrame(() => {
    resizeHomeStageCoreEffectCanvas();
  });

  if (HOME_STAGE_CORE_EFFECT_STATE.resizeTimer) {
    window.clearTimeout(HOME_STAGE_CORE_EFFECT_STATE.resizeTimer);
  }

  HOME_STAGE_CORE_EFFECT_STATE.resizeTimer = window.setTimeout(() => {
    resizeHomeStageCoreEffectCanvas();
    HOME_STAGE_CORE_EFFECT_STATE.resizeTimer = null;
  }, 680);
}

/* =========================================================
   05. DOM HELPERS
   ========================================================= */

function getHomeStageCoreEffectNodes() {
  return {
    shell: document.querySelector(HOME_STAGE_CORE_EFFECT_SELECTORS.shell),
    vessel: document.querySelector(HOME_STAGE_CORE_EFFECT_SELECTORS.vessel),
    microphoneButton: document.querySelector(HOME_STAGE_CORE_EFFECT_SELECTORS.microphoneButton),
  };
}

function ensureHomeStageCoreEffectMount() {
  const nodes = getHomeStageCoreEffectNodes();

  if (!nodes.shell) {
    return false;
  }

  let mount = nodes.shell.querySelector('[data-home-stage-core-effect="mount"]');
  if (!mount) {
    mount = document.createElement('div');
    mount.setAttribute('data-home-stage-core-effect', 'mount');
    mount.setAttribute('aria-hidden', 'true');
    nodes.shell.appendChild(mount);
  }

  let canvas = mount.querySelector('canvas[data-home-stage-core-effect="canvas"]');
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.setAttribute('data-home-stage-core-effect', 'canvas');
    canvas.setAttribute('aria-hidden', 'true');
    mount.appendChild(canvas);
  }

  HOME_STAGE_CORE_EFFECT_STATE.shell = nodes.shell;
  HOME_STAGE_CORE_EFFECT_STATE.mount = mount;
  HOME_STAGE_CORE_EFFECT_STATE.canvas = canvas;
  HOME_STAGE_CORE_EFFECT_STATE.context = canvas.getContext('2d', { alpha: true });

  nodes.shell.dataset.coreEffectReady = 'true';
  setHomeStageCoreEffectMode(HOME_STAGE_CORE_EFFECT_STATE.mode);
  return Boolean(HOME_STAGE_CORE_EFFECT_STATE.context);
}

/* =========================================================
   06. CANVAS HELPERS
   ========================================================= */

function resizeHomeStageCoreEffectCanvas() {
  const { shell, mount, canvas } = HOME_STAGE_CORE_EFFECT_STATE;

  if (!shell || !mount || !canvas) {
    return;
  }

  const nodes = getHomeStageCoreEffectNodes();
  const vesselRect = nodes.vessel?.getBoundingClientRect?.();
  const shellRect = shell.getBoundingClientRect();
  const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));

  const vesselSize = vesselRect
    ? Math.max(vesselRect.width, vesselRect.height)
    : Math.max(shellRect.width, shellRect.height);

  const sovereignSize = Math.max(272, Math.round(vesselSize * 1.52));
  const width = sovereignSize;
  const height = sovereignSize;

  HOME_STAGE_CORE_EFFECT_STATE.width = width;
  HOME_STAGE_CORE_EFFECT_STATE.height = height;
  HOME_STAGE_CORE_EFFECT_STATE.dpr = dpr;

  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);

  const context = HOME_STAGE_CORE_EFFECT_STATE.context;
  if (context) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.scale(dpr, dpr);
  }
}

/* =========================================================
   07. RENDER HELPERS
   ========================================================= */

function drawHomeStageCoreEffectOrb(context, cx, cy, radius, color, alpha, blur) {
  context.save();
  context.globalAlpha = alpha;
  context.filter = `blur(${blur}px)`;
  context.fillStyle = color;
  context.beginPath();
  context.arc(cx, cy, radius, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function renderHomeStageCoreEffectFrame(timestamp) {
  const activeMode = HOME_STAGE_CORE_EFFECT_STATE.mode !== 'idle';
  const targetFrameInterval = activeMode ? (1000 / 60) : (1000 / 12);
  const elapsedSinceLastRender = timestamp - HOME_STAGE_CORE_EFFECT_STATE.lastRenderTimestamp;

  if (
    HOME_STAGE_CORE_EFFECT_STATE.lastRenderTimestamp &&
    elapsedSinceLastRender < targetFrameInterval
  ) {
    if (
      !HOME_STAGE_CORE_EFFECT_STATE.isLifecyclePaused &&
      !document.hidden &&
      shouldRunHomeStageCoreEffectLoop()
    ) {
      HOME_STAGE_CORE_EFFECT_STATE.rafId = window.requestAnimationFrame(renderHomeStageCoreEffectFrame);
    } else {
      HOME_STAGE_CORE_EFFECT_STATE.rafId = null;
    }
    return;
  }

  HOME_STAGE_CORE_EFFECT_STATE.lastRenderTimestamp = timestamp;
  const {
    context,
    width,
    height,
    mode,
    targetEnergy,
  } = HOME_STAGE_CORE_EFFECT_STATE;

  if (!context || !width || !height) {
    if (
      !HOME_STAGE_CORE_EFFECT_STATE.isLifecyclePaused &&
      !document.hidden &&
      shouldRunHomeStageCoreEffectLoop()
    ) {
      HOME_STAGE_CORE_EFFECT_STATE.rafId = window.requestAnimationFrame(renderHomeStageCoreEffectFrame);
    } else {
      HOME_STAGE_CORE_EFFECT_STATE.rafId = null;
    }
    return;
  }

  if (!HOME_STAGE_CORE_EFFECT_STATE.startTime) {
    HOME_STAGE_CORE_EFFECT_STATE.startTime = timestamp;
  }

  const elapsed = (timestamp - HOME_STAGE_CORE_EFFECT_STATE.startTime) / 1000;
  HOME_STAGE_CORE_EFFECT_STATE.energy += (targetEnergy - HOME_STAGE_CORE_EFFECT_STATE.energy) * 0.045;

  const energy = HOME_STAGE_CORE_EFFECT_STATE.energy;
  const cx = width / 2;
  const cy = height / 2;
  const baseRadius = Math.min(width, height) * 0.13;
  const orbitRadius = Math.min(width, height) * (0.12 + energy * 0.08);
  const responseBoost = mode === 'responding' ? 1 : 0;
  const listenBoost = mode === 'listening' ? 1 : 0;
  const thinkBoost = mode === 'thinking' ? 1 : 0;
  const transcribeBoost = mode === 'transcribing' ? 1 : 0;
  const pulseSpeed = mode === 'listening'
    ? 2.2
    : mode === 'transcribing'
      ? 1.42
      : mode === 'thinking'
        ? 0.78
        : mode === 'responding'
          ? 1.15
          : 0.48;

  context.clearRect(0, 0, width, height);

  const coreGradient = context.createRadialGradient(
    cx,
    cy,
    baseRadius * 0.08,
    cx,
    cy,
    baseRadius * (2.1 + energy * 0.5)
  );
  coreGradient.addColorStop(0, `rgba(255,255,255,${0.22 + energy * 0.12})`);
  coreGradient.addColorStop(0.22, `rgba(145,124,111,${0.24 + energy * 0.18})`);
  coreGradient.addColorStop(0.5, `rgba(121,101,255,${0.14 + responseBoost * 0.08 + transcribeBoost * 0.04})`);
  coreGradient.addColorStop(0.74, `rgba(66,194,255,${0.08 + listenBoost * 0.14 + transcribeBoost * 0.06})`);
  coreGradient.addColorStop(1, 'rgba(0,0,0,0)');

  context.save();
  context.globalCompositeOperation = 'lighter';
  context.fillStyle = coreGradient;
  context.beginPath();
  context.arc(cx, cy, Math.min(width, height) * 0.42, 0, Math.PI * 2);
  context.fill();
  context.restore();

  const ringCount = 3;
  for (let index = 0; index < ringCount; index += 1) {
    const ringPhase = elapsed * (pulseSpeed + energy * 0.52) + index * 0.85;
    const ringRadius = baseRadius * (1.05 + index * 0.42) + Math.sin(ringPhase) * (4 + energy * 8 + listenBoost * 7 + transcribeBoost * 4);
    context.save();
    context.strokeStyle = `rgba(255,255,255,${0.05 + energy * 0.08 - index * 0.015})`;
    context.lineWidth = 1 + (responseBoost * 0.3) + (listenBoost * 0.45) + (transcribeBoost * 0.22);
    context.filter = `blur(${2 + energy * 4}px)`;
    context.beginPath();
    context.arc(cx, cy, ringRadius, 0, Math.PI * 2);
    context.stroke();
    context.restore();
  }

  const blobCount = 4;
  const orbPalette = [
    'rgba(96,190,255,1)',
    'rgba(94,255,188,1)',
    'rgba(255,108,196,1)',
    'rgba(255,160,76,1)',
  ];

  for (let index = 0; index < blobCount; index += 1) {
    const angle = elapsed * (0.72 + energy * 1.08 + listenBoost * 0.72 + transcribeBoost * 0.28) * (index % 2 === 0 ? 1 : -1) + index * (Math.PI / 2);
    const wobble = Math.sin(elapsed * (1.08 + index * 0.18) + index) * (7 + energy * 12);
    const orbX = cx + Math.cos(angle) * (orbitRadius + wobble * 0.34);
    const orbY = cy + Math.sin(angle * (1.06 + thinkBoost * 0.08)) * (orbitRadius * 0.74 + wobble * 0.3);
    const orbRadius = baseRadius * (0.56 + index * 0.055 + energy * 0.24);
    const orbAlpha = 0.18 + energy * 0.24 + responseBoost * 0.06 + listenBoost * 0.08 + transcribeBoost * 0.05;
    const orbBlur = 24 + energy * 28 + listenBoost * 10 + transcribeBoost * 8 + responseBoost * 6;

    drawHomeStageCoreEffectOrb(
      context,
      orbX,
      orbY,
      orbRadius,
      orbPalette[index],
      Math.min(0.68, orbAlpha),
      orbBlur
    );
  }

  drawHomeStageCoreEffectOrb(
    context,
    cx,
    cy,
    baseRadius * (0.68 + energy * 0.2),
    'rgba(255,255,255,1)',
    0.18 + energy * 0.18,
    18 + energy * 18
  );

  if (
    !HOME_STAGE_CORE_EFFECT_STATE.isLifecyclePaused &&
    !document.hidden &&
    shouldRunHomeStageCoreEffectLoop()
  ) {
    HOME_STAGE_CORE_EFFECT_STATE.rafId = window.requestAnimationFrame(renderHomeStageCoreEffectFrame);
  } else {
    HOME_STAGE_CORE_EFFECT_STATE.rafId = null;
  }
}

function shouldRunHomeStageCoreEffectLoop() {
  return (
    HOME_STAGE_CORE_EFFECT_STATE.mode !== 'idle' ||
    HOME_STAGE_CORE_EFFECT_STATE.isResetting
  );
}

function renderHomeStageCoreEffectStaticFrame() {
  HOME_STAGE_CORE_EFFECT_STATE.lastRenderTimestamp = 0;
  renderHomeStageCoreEffectFrame(performance.now());
  stopHomeStageCoreEffectLoop();
}

function startHomeStageCoreEffectLoop() {
  if (
    HOME_STAGE_CORE_EFFECT_STATE.rafId ||
    HOME_STAGE_CORE_EFFECT_STATE.isLifecyclePaused ||
    document.hidden ||
    !shouldRunHomeStageCoreEffectLoop()
  ) {
    return;
  }

  HOME_STAGE_CORE_EFFECT_STATE.rafId = window.requestAnimationFrame(renderHomeStageCoreEffectFrame);
}

function stopHomeStageCoreEffectLoop() {
  if (!HOME_STAGE_CORE_EFFECT_STATE.rafId) {
    return;
  }

  window.cancelAnimationFrame(HOME_STAGE_CORE_EFFECT_STATE.rafId);
  HOME_STAGE_CORE_EFFECT_STATE.rafId = null;
}

function pauseHomeStageCoreEffectLoop() {
  HOME_STAGE_CORE_EFFECT_STATE.isLifecyclePaused = true;
  HOME_STAGE_CORE_EFFECT_STATE.lastRenderTimestamp = 0;
  stopHomeStageCoreEffectLoop();
}

function resumeHomeStageCoreEffectLoop() {
  HOME_STAGE_CORE_EFFECT_STATE.isLifecyclePaused = false;
  HOME_STAGE_CORE_EFFECT_STATE.lastRenderTimestamp = 0;

  if (document.hidden) {
    return;
  }

  if (shouldRunHomeStageCoreEffectLoop()) {
    startHomeStageCoreEffectLoop();
    return;
  }

  renderHomeStageCoreEffectStaticFrame();
}

/* =========================================================
   08. EVENT BINDING
   ========================================================= */

function bindHomeStageCoreEffectEvents() {
  document.addEventListener('neuroartan:home-stage-voice-mode', (event) => {
    HOME_STAGE_CORE_EFFECT_STATE.isResetting = false;
    setHomeStageCoreEffectMode(event?.detail?.mode ?? 'idle');
    scheduleHomeStageCoreEffectResize();
  });

  document.addEventListener('neuroartan:home-stage-voice-query-submitted', () => {
    HOME_STAGE_CORE_EFFECT_STATE.isResetting = false;
    setHomeStageCoreEffectMode('thinking');
    scheduleHomeStageCoreEffectResize();
  });

  document.addEventListener('neuroartan:home-stage-voice-response', (event) => {
    if (HOME_STAGE_CORE_EFFECT_STATE.isResetting) {
      return;
    }

    const response = typeof event?.detail?.response === 'string'
      ? event.detail.response.trim()
      : '';

    if (!response) {
      return;
    }

    setHomeStageCoreEffectMode('responding');
    scheduleHomeStageCoreEffectResize();
  });

  document.addEventListener('neuroartan:home-stage-voice-transcript', (event) => {
    const transcript = typeof event?.detail?.transcript === 'string'
      ? event.detail.transcript.trim()
      : '';

    if (transcript && HOME_STAGE_CORE_EFFECT_STATE.mode === 'listening') {
      setHomeStageCoreEffectMode('transcribing');
    }
  });

  document.addEventListener('neuroartan:home-stage-voice-activated', () => {
    HOME_STAGE_CORE_EFFECT_STATE.isResetting = false;
    setHomeStageCoreEffectMode('listening');
    scheduleHomeStageCoreEffectResize();
  });

  document.addEventListener('neuroartan:home-stage-voice-deactivated', () => {
    setHomeStageCoreEffectMode('idle');
    scheduleHomeStageCoreEffectResize();
  });

  document.addEventListener('neuroartan:home-stage-reset-requested', () => {
    HOME_STAGE_CORE_EFFECT_STATE.isResetting = true;
    HOME_STAGE_CORE_EFFECT_STATE.targetEnergy = HOME_STAGE_CORE_EFFECT_MODE_ENERGY.idle;
    setHomeStageCoreEffectMode('release');
    scheduleHomeStageCoreEffectResize();

    window.setTimeout(() => {
      HOME_STAGE_CORE_EFFECT_STATE.isResetting = false;
      scheduleHomeStageCoreEffectResize();
    }, 700);
  });

  if ('ResizeObserver' in window && HOME_STAGE_CORE_EFFECT_STATE.shell) {
    HOME_STAGE_CORE_EFFECT_STATE.resizeObserver = new ResizeObserver(() => {
      resizeHomeStageCoreEffectCanvas();
    });
    HOME_STAGE_CORE_EFFECT_STATE.resizeObserver.observe(HOME_STAGE_CORE_EFFECT_STATE.shell);

    const nodes = getHomeStageCoreEffectNodes();
    if (nodes.vessel) {
      HOME_STAGE_CORE_EFFECT_STATE.resizeObserver.observe(nodes.vessel);
    }
  } else {
    window.addEventListener('resize', resizeHomeStageCoreEffectCanvas, { passive: true });
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      pauseHomeStageCoreEffectLoop();
      return;
    }

    resumeHomeStageCoreEffectLoop();
    scheduleHomeStageCoreEffectResize();
  });

  window.addEventListener('blur', pauseHomeStageCoreEffectLoop);

  window.addEventListener('focus', () => {
    resumeHomeStageCoreEffectLoop();
    scheduleHomeStageCoreEffectResize();
  });

  window.addEventListener('pagehide', pauseHomeStageCoreEffectLoop);

  window.addEventListener('pageshow', () => {
    resumeHomeStageCoreEffectLoop();
    scheduleHomeStageCoreEffectResize();
  });
}

/* =========================================================
   09. MODULE BOOT
   ========================================================= */

function bootHomeStageCoreEffect() {
  if (HOME_STAGE_CORE_EFFECT_STATE.isBound) {
    resizeHomeStageCoreEffectCanvas();
    scheduleHomeStageCoreEffectResize();
    return;
  }

  if (!ensureHomeStageCoreEffectMount()) {
    return;
  }

  HOME_STAGE_CORE_EFFECT_STATE.isBound = true;
  resizeHomeStageCoreEffectCanvas();
  scheduleHomeStageCoreEffectResize();
  bindHomeStageCoreEffectEvents();

  if (shouldRunHomeStageCoreEffectLoop()) {
    startHomeStageCoreEffectLoop();
    return;
  }

  renderHomeStageCoreEffectStaticFrame();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootHomeStageCoreEffect, { once: true });
} else {
  bootHomeStageCoreEffect();
}

/**
 * Fragment-mounted retry.
 * The stage composition is injected after module evaluation, so the core effect
 * must retry once the fragment system mounts the stage DOM.
 */
document.addEventListener('fragment:mounted', (event) => {
  const includeName = event?.detail?.include;

  if (!includeName || includeName === 'home-stage-composition' || includeName === 'home-stage-circle') {
    bootHomeStageCoreEffect();
  }
});
