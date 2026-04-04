/* =========================================================
   00. FILE INDEX
   01. MODULE IDENTITY
   02. CONSTANTS
   03. SHADER STATE
   04. CANVAS SIZING
   05. POINTER STATE
   06. SHADER DRAWING
   07. ANIMATION LOOP
   08. LIFECYCLE
   ========================================================= */

/* =========================================================
   01. MODULE IDENTITY
   ========================================================= */

(function () {
  'use strict';

  if (window.__neuroartan404HeroShaderInitialized) {
    return;
  }

  window.__neuroartan404HeroShaderInitialized = true;

  /* =========================================================
     02. CONSTANTS
     ========================================================= */

  const ROOT_SELECTOR = '[data-404-hero-shader-fragment]';
  const CANVAS_SELECTOR = '[data-404-hero-shader-canvas]';
  const VEIL_SELECTOR = '[data-404-hero-shader-veil]';
  const MATTE_SELECTOR = '[data-404-hero-shader-matte]';
  const READY_CLASS = 'page-404-hero-shader-active';
  const DPR_LIMIT = 1;
  const PARTICLE_COUNT = 11;
  const BASE_RADIUS_MIN = 180;
  const BASE_RADIUS_MAX = 360;
  const BASE_SPEED_MIN = 0.0001;
  const BASE_SPEED_MAX = 0.00022;
  const PARALLAX_STRENGTH = 42;
  const ALPHA_MIN = 0.16;
  const ALPHA_MAX = 0.34;
  const ORGANISM_DRIFT_MIN = 0.00008;
  const ORGANISM_DRIFT_MAX = 0.00018;
  const PULSE_MIN = 0.0014;
  const PULSE_MAX = 0.0032;
  const CENTER_TRAVEL_X_MIN = 140;
  const CENTER_TRAVEL_X_MAX = 340;
  const CENTER_TRAVEL_Y_MIN = 110;
  const CENTER_TRAVEL_Y_MAX = 240;
  const CENTER_TRAVEL_SPEED_X_MIN = 0.00008;
  const CENTER_TRAVEL_SPEED_X_MAX = 0.00018;
  const CENTER_TRAVEL_SPEED_Y_MIN = 0.00012;
  const CENTER_TRAVEL_SPEED_Y_MAX = 0.00026;
  const FLEE_TRIGGER_RADIUS = 220;
  const FLEE_FORCE_MAX = 220;
  const FLEE_SHRINK_STRENGTH = 0.34;

  /* =========================================================
     03. SHADER STATE
     ========================================================= */

  const root = document.querySelector(ROOT_SELECTOR);

  if (!root) {
    return;
  }

  const canvas = root.querySelector(CANVAS_SELECTOR);
  const veil = root.querySelector(VEIL_SELECTOR);
  const matte = root.querySelector(MATTE_SELECTOR);
  const context = canvas ? canvas.getContext('2d', { alpha: true, desynchronized: true }) : null;

  if (!canvas || !context) {
    return;
  }

  canvas.style.willChange = 'transform, opacity';
  canvas.style.transform = 'translateZ(0)';
  root.style.willChange = 'transform';

  const state = {
    width: 0,
    height: 0,
    dpr: 1,
    rafId: 0,
    resizeFrame: 0,
    particles: [],
    pointerX: 0.5,
    pointerY: 0.5,
    pointerTargetX: 0.5,
    pointerTargetY: 0.5,
    isReducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    centerTravelX: 0,
    centerTravelY: 0,
    centerTravelRadiusX: randomBetween(CENTER_TRAVEL_X_MIN, CENTER_TRAVEL_X_MAX),
    centerTravelRadiusY: randomBetween(CENTER_TRAVEL_Y_MIN, CENTER_TRAVEL_Y_MAX),
    centerTravelSpeedX: randomBetween(CENTER_TRAVEL_SPEED_X_MIN, CENTER_TRAVEL_SPEED_X_MAX),
    centerTravelSpeedY: randomBetween(CENTER_TRAVEL_SPEED_Y_MIN, CENTER_TRAVEL_SPEED_Y_MAX),
    centerTravelPhaseX: randomBetween(0, Math.PI * 2),
    centerTravelPhaseY: randomBetween(0, Math.PI * 2),
    fleeOffsetX: 0,
    fleeOffsetY: 0,
    fleeVelocityX: 0,
    fleeVelocityY: 0,
    fleeShrink: 0
  };

  function randomBetween(min, max) {
    return min + Math.random() * (max - min);
  }

  function pickPalette(index) {
    const palettes = [
      {
        core: [255, 120, 210],
        mid: [176, 108, 255],
        edge: [74, 58, 196]
      },
      {
        core: [108, 236, 255],
        mid: [60, 174, 255],
        edge: [48, 86, 224]
      },
      {
        core: [255, 178, 104],
        mid: [255, 106, 132],
        edge: [186, 56, 124]
      },
      {
        core: [176, 255, 168],
        mid: [78, 222, 194],
        edge: [44, 126, 182]
      }
    ];

    return palettes[index % palettes.length];
  }

  function createParticle(index) {
    const angleSeed = (Math.PI * 2 * index) / PARTICLE_COUNT;
    const palette = pickPalette(index);
    const layerBias = index / Math.max(PARTICLE_COUNT - 1, 1);

    return {
      orbitRadius: randomBetween(BASE_RADIUS_MIN, BASE_RADIUS_MAX) * (0.16 + layerBias * 0.22),
      blobRadius: randomBetween(220, 440) * (0.78 + layerBias * 0.22),
      speed: randomBetween(BASE_SPEED_MIN, BASE_SPEED_MAX),
      angle: angleSeed + randomBetween(-0.12, 0.12),
      alpha: randomBetween(ALPHA_MIN, ALPHA_MAX),
      stretchX: randomBetween(0.82, 1.24),
      stretchY: randomBetween(1.02, 1.94),
      driftX: randomBetween(-12, 12),
      driftY: randomBetween(-14, 14),
      localTravelRadiusX: randomBetween(16, 72),
      localTravelRadiusY: randomBetween(20, 90),
      localTravelSpeedX: randomBetween(ORGANISM_DRIFT_MIN, ORGANISM_DRIFT_MAX),
      localTravelSpeedY: randomBetween(ORGANISM_DRIFT_MIN, ORGANISM_DRIFT_MAX),
      localTravelPhaseX: randomBetween(0, Math.PI * 2),
      localTravelPhaseY: randomBetween(0, Math.PI * 2),
      pulseSpeed: randomBetween(PULSE_MIN, PULSE_MAX),
      pulsePhase: randomBetween(0, Math.PI * 2),
      rotationDrift: randomBetween(-0.22, 0.22),
      palette
    };
  }

  function buildParticleField() {
    state.particles = Array.from({ length: PARTICLE_COUNT }, (_, index) => createParticle(index));
  }

  /* =========================================================
     04. CANVAS SIZING
     ========================================================= */

  function resizeCanvas() {
    const rect = root.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));
    const dpr = Math.min(window.devicePixelRatio || 1, DPR_LIMIT);

    state.width = width;
    state.height = height;
    state.dpr = dpr;

    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    canvas.style.left = '0px';
    canvas.style.top = '0px';
    context.imageSmoothingEnabled = true;

    context.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function queueResize() {
    cancelAnimationFrame(state.resizeFrame);
    state.resizeFrame = requestAnimationFrame(() => {
      resizeCanvas();
      drawFrame(performance.now());
    });
  }

  /* =========================================================
     05. POINTER STATE
     ========================================================= */

  function updatePointerFromEvent(event) {
    const rect = root.getBoundingClientRect();
    const x = (event.clientX - rect.left) / Math.max(rect.width, 1);
    const y = (event.clientY - rect.top) / Math.max(rect.height, 1);

    state.pointerTargetX = Math.min(1, Math.max(0, x));
    state.pointerTargetY = Math.min(1, Math.max(0, y));
  }

  function resetPointer() {
    state.pointerTargetX = 0.5;
    state.pointerTargetY = 0.5;
  }

  function applyFleeInteraction() {
    const organismCenterX = (state.width * 0.5) + state.centerTravelX + state.fleeOffsetX;
    const organismCenterY = (state.height * 0.52) + state.centerTravelY + state.fleeOffsetY;
    const pointerX = state.pointerX * state.width;
    const pointerY = state.pointerY * state.height;
    const dx = organismCenterX - pointerX;
    const dy = organismCenterY - pointerY;
    const distance = Math.hypot(dx, dy);

    if (distance < FLEE_TRIGGER_RADIUS) {
      const normalizedDistance = 1 - (distance / FLEE_TRIGGER_RADIUS);
      const force = normalizedDistance * FLEE_FORCE_MAX;
      const directionX = distance > 0.0001 ? dx / distance : (Math.random() - 0.5);
      const directionY = distance > 0.0001 ? dy / distance : (Math.random() - 0.5);

      state.fleeVelocityX += directionX * force * 0.02;
      state.fleeVelocityY += directionY * force * 0.02;
      state.fleeShrink = Math.max(state.fleeShrink, normalizedDistance * FLEE_SHRINK_STRENGTH);
    }

    state.fleeVelocityX *= 0.92;
    state.fleeVelocityY *= 0.92;
    state.fleeOffsetX += state.fleeVelocityX;
    state.fleeOffsetY += state.fleeVelocityY;
    state.fleeOffsetX *= 0.985;
    state.fleeOffsetY *= 0.985;
    state.fleeShrink += (0 - state.fleeShrink) * 0.08;
  }

  function easePointer() {
    state.pointerX += (state.pointerTargetX - state.pointerX) * 0.05;
    state.pointerY += (state.pointerTargetY - state.pointerY) * 0.05;
  }

  /* =========================================================
     06. SHADER DRAWING
     ========================================================= */

  function updateCenterTravel(time) {
    state.centerTravelX = Math.sin(time * state.centerTravelSpeedX + state.centerTravelPhaseX) * state.centerTravelRadiusX;
    state.centerTravelY = Math.cos(time * state.centerTravelSpeedY + state.centerTravelPhaseY) * state.centerTravelRadiusY;
  }

  function drawBackground() {
    const gradient = context.createLinearGradient(0, 0, 0, state.height);
    gradient.addColorStop(0, 'rgba(4, 3, 8, 1)');
    gradient.addColorStop(0.5, 'rgba(8, 8, 14, 1)');
    gradient.addColorStop(1, 'rgba(2, 2, 4, 1)');

    context.clearRect(0, 0, state.width, state.height);
    context.fillStyle = gradient;
    context.fillRect(0, 0, state.width, state.height);
  }

  function drawParticle(particle, time) {
    const orbitPhase = particle.angle + time * particle.speed;
    const localTravelX = Math.sin(time * particle.localTravelSpeedX + particle.localTravelPhaseX) * particle.localTravelRadiusX;
    const localTravelY = Math.cos(time * particle.localTravelSpeedY + particle.localTravelPhaseY) * particle.localTravelRadiusY;
    const floatPulse = (Math.sin(time * particle.pulseSpeed + particle.pulsePhase) + 1) * 0.5;
    const pulse = (0.72 + floatPulse * 0.64) * (1 - state.fleeShrink);
    const pointerOffsetX = (state.pointerX - 0.5) * PARALLAX_STRENGTH;
    const pointerOffsetY = (state.pointerY - 0.5) * (PARALLAX_STRENGTH * 0.72);
    const centerX = (state.width * 0.5) + state.centerTravelX + state.fleeOffsetX + Math.cos(orbitPhase) * particle.orbitRadius + localTravelX + pointerOffsetX + particle.driftX;
    const centerY = (state.height * 0.52) + state.centerTravelY + state.fleeOffsetY + Math.sin(orbitPhase) * (particle.orbitRadius * 0.36) + localTravelY + pointerOffsetY + particle.driftY;
    const radiusX = particle.blobRadius * particle.stretchX * (0.8 + floatPulse * 0.34);
    const radiusY = particle.blobRadius * particle.stretchY * pulse;
    const maxRadius = Math.max(radiusX, radiusY);
    const gradient = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, maxRadius);
    const { core, mid, edge } = particle.palette;

    gradient.addColorStop(0, `rgba(${core[0]}, ${core[1]}, ${core[2]}, ${particle.alpha})`);
    gradient.addColorStop(0.18, `rgba(${mid[0]}, ${mid[1]}, ${mid[2]}, ${particle.alpha})`);
    gradient.addColorStop(0.48, `rgba(${edge[0]}, ${edge[1]}, ${edge[2]}, ${particle.alpha * 0.8})`);
    gradient.addColorStop(0.82, `rgba(${edge[0]}, ${edge[1]}, ${edge[2]}, ${particle.alpha * 0.22})`);
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

    context.save();
    context.translate(centerX, centerY);
    context.rotate((Math.sin(orbitPhase) * 0.16) + particle.rotationDrift);
    context.scale(radiusX / Math.max(radiusY, 1), 1);
    context.beginPath();
    context.arc(0, 0, radiusY, 0, Math.PI * 2);
    context.closePath();
    context.fillStyle = gradient;
    context.filter = 'blur(18px)';
    context.fill();

    context.beginPath();
    context.arc(0, 0, radiusY * 0.56, 0, Math.PI * 2);
    context.closePath();
    context.fillStyle = `rgba(${core[0]}, ${core[1]}, ${core[2]}, ${particle.alpha * 0.34})`;
    context.filter = 'blur(38px)';
    context.fill();
    context.restore();
  }

  function drawFrame(timestamp) {
    const time = state.isReducedMotion ? 0 : timestamp;

    easePointer();
    updateCenterTravel(time);
    applyFleeInteraction();
    drawBackground();

    context.globalCompositeOperation = 'screen';
    state.particles.forEach((particle) => drawParticle(particle, time));
    context.globalCompositeOperation = 'source-over';
  }

  /* =========================================================
     07. ANIMATION LOOP
     ========================================================= */

  function animate(timestamp) {
    drawFrame(timestamp);
    state.rafId = requestAnimationFrame(animate);
  }

  function startAnimation() {
    cancelAnimationFrame(state.rafId);
    state.rafId = requestAnimationFrame(animate);
  }

  /* =========================================================
     08. LIFECYCLE
     ========================================================= */

  function bindEvents() {
    root.addEventListener('pointermove', updatePointerFromEvent, { passive: true });
    root.addEventListener('pointerleave', resetPointer, { passive: true });
    window.addEventListener('resize', queueResize, { passive: true });
  }

  function applyStaticLayerState() {
    if (veil) {
      veil.setAttribute('aria-hidden', 'true');
    }

    if (matte) {
      matte.setAttribute('aria-hidden', 'true');
    }
  }

  function init404HeroShader() {
    buildParticleField();
    resizeCanvas();
    applyStaticLayerState();
    bindEvents();
    root.classList.add(READY_CLASS);
    startAnimation();
  }

  init404HeroShader();
})();
