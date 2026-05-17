/* =============================================================================
   NEUROARTAN WALLPAPER ENGINE
   Reusable token-driven SVG wallpaper runtime.
   Production rules:
   - JSON scene presets
   - No video decode loop
   - FPS-capped timer + RAF scheduling
   - Hidden-tab pause
   - Window blur pause
   - Pagehide pause
   - Offscreen pause
   - Reduced-motion static fallback
============================================================================= */

const WALLPAPER_SELECTOR = '[data-neuroartan-wallpaper][data-wallpaper-scene]';
const REDUCED_MOTION_QUERY = window.matchMedia('(prefers-reduced-motion: reduce)');

function createSvgElement(tag, attributes = {}) {
  const node = document.createElementNS('http://www.w3.org/2000/svg', tag);

  Object.entries(attributes).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }

    node.setAttribute(key, String(value));
  });

  return node;
}

function clampNumber(value, fallback, minimum = -Infinity, maximum = Infinity) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(maximum, Math.max(minimum, parsed));
}

function normalizeViewBox(scene) {
  const fallback = [0, 0, 1600, 900];
  const source = Array.isArray(scene?.viewBox) ? scene.viewBox : fallback;

  return source
    .slice(0, 4)
    .map((value, index) => clampNumber(value, fallback[index]));
}

function readMotionConfig(scene = {}) {
  const motion = scene.motion || {};

  return {
    fps: clampNumber(motion.fps, 8, 1, 18),
    speed: clampNumber(motion.speed, 1, 0, 4),
    amplitude: clampNumber(motion.amplitude, 1, 0, 4),
  };
}

function safeGradientStops(stops = []) {
  if (!Array.isArray(stops) || stops.length === 0) {
    return [
      { offset: '0%', color: 'var(--color-primary1, #917c6f)', opacity: 0.9 },
      { offset: '100%', color: 'transparent', opacity: 0 },
    ];
  }

  return stops;
}

class NeuroartanWallpaperInstance {
  constructor(root) {
    this.root = root;
    this.sceneUrl = String(root.dataset.wallpaperScene || '').trim();
    this.scene = null;
    this.svg = null;
    this.motionNodes = [];

    this.timerId = null;
    this.frameId = null;
    this.isVisible = true;
    this.isLifecyclePaused = false;
    this.isDestroyed = false;
    this.motion = { fps: 8, speed: 1, amplitude: 1 };
    this.observer = null;

    this.boundVisibilityChange = () => this.handleVisibilityChange();
    this.boundWindowBlur = () => this.handleWindowBlur();
    this.boundWindowFocus = () => this.handleWindowFocus();
    this.boundPageHide = () => this.handlePageHide();
    this.boundPageShow = () => this.handlePageShow();
    this.boundReducedMotionChange = () => this.handleReducedMotionChange();
  }

  async init() {
    if (!this.sceneUrl || this.isDestroyed) {
      return;
    }

    try {
      const response = await fetch(this.sceneUrl, { cache: 'no-cache' });

      if (!response.ok) {
        throw new Error(`Wallpaper scene failed: ${response.status}`);
      }

      this.scene = await response.json();
      this.motion = readMotionConfig(this.scene);

      this.renderScene();
      this.bindLifecycle();
      this.bindVisibilityObserver();
      this.renderStaticFrame();

      if (this.shouldAnimate()) {
        this.start();
      }
    } catch (error) {
      console.warn('[Neuroartan Wallpaper Engine] Scene unavailable.', {
        scene: this.sceneUrl,
        error,
      });

      this.root.dataset.wallpaperState = 'scene-unavailable';
    }
  }

  renderScene() {
    const [x, y, width, height] = normalizeViewBox(this.scene);
    const svg = createSvgElement('svg', {
      class: 'neuroartan-wallpaper__svg',
      viewBox: `${x} ${y} ${width} ${height}`,
      preserveAspectRatio: this.scene?.preserveAspectRatio || 'xMidYMid slice',
      role: 'presentation',
      focusable: 'false',
      'aria-hidden': 'true',
    });

    const defs = createSvgElement('defs');
    const gradientMap = new Map();

    (this.scene?.gradients || []).forEach((gradient, index) => {
      const id = String(gradient.id || `wallpaper-gradient-${index}`);
      const type = gradient.type === 'linear' ? 'linearGradient' : 'radialGradient';
      const node = createSvgElement(type, {
        id,
        x1: gradient.x1,
        y1: gradient.y1,
        x2: gradient.x2,
        y2: gradient.y2,
        cx: gradient.cx,
        cy: gradient.cy,
        r: gradient.r,
        fx: gradient.fx,
        fy: gradient.fy,
      });

      safeGradientStops(gradient.stops).forEach((stop) => {
        const stopNode = createSvgElement('stop', {
          offset: stop.offset || '0%',
        });

        stopNode.setAttribute(
          'style',
          `stop-color:${stop.color || 'transparent'};stop-opacity:${clampNumber(stop.opacity, 1, 0, 1)};`
        );

        node.append(stopNode);
      });

      gradientMap.set(id, id);
      defs.append(node);
    });

    svg.append(defs);

    svg.append(createSvgElement('rect', {
      class: 'neuroartan-wallpaper__base',
      x,
      y,
      width,
      height,
      fill: this.scene?.background?.fill || 'transparent',
    }));

    (this.scene?.layers || []).forEach((layer, index) => {
      const group = createSvgElement('g', {
        class: `neuroartan-wallpaper__layer neuroartan-wallpaper__layer--${layer.type || 'shape'}`,
        opacity: clampNumber(layer.opacity, 1, 0, 1),
      });

      const shape = this.createLayerShape(layer, gradientMap);

      if (!shape) {
        return;
      }

      group.append(shape);
      svg.append(group);

      this.motionNodes.push({
        node: group,
        motion: layer.motion || {},
        index,
      });
    });

    this.root.replaceChildren(svg);
    this.root.dataset.wallpaperState = 'ready';
    this.svg = svg;
  }

  createLayerShape(layer, gradientMap) {
    const fill = layer.fill && gradientMap.has(layer.fill)
      ? `url(#${layer.fill})`
      : (layer.fill || 'transparent');

    if (layer.type === 'path') {
      return createSvgElement('path', {
        d: layer.d,
        fill,
      });
    }

    if (layer.type === 'rect') {
      return createSvgElement('rect', {
        x: layer.x,
        y: layer.y,
        width: layer.width,
        height: layer.height,
        rx: layer.rx,
        ry: layer.ry,
        fill,
      });
    }

    return createSvgElement('ellipse', {
      cx: layer.cx,
      cy: layer.cy,
      rx: layer.rx,
      ry: layer.ry,
      fill,
    });
  }

  bindLifecycle() {
    document.addEventListener('visibilitychange', this.boundVisibilityChange);
    window.addEventListener('blur', this.boundWindowBlur);
    window.addEventListener('focus', this.boundWindowFocus);
    window.addEventListener('pagehide', this.boundPageHide);
    window.addEventListener('pageshow', this.boundPageShow);

    if (typeof REDUCED_MOTION_QUERY.addEventListener === 'function') {
      REDUCED_MOTION_QUERY.addEventListener('change', this.boundReducedMotionChange);
    } else if (typeof REDUCED_MOTION_QUERY.addListener === 'function') {
      REDUCED_MOTION_QUERY.addListener(this.boundReducedMotionChange);
    }
  }

  bindVisibilityObserver() {
    if (!('IntersectionObserver' in window)) {
      this.isVisible = true;
      return;
    }

    this.observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        this.isVisible = Boolean(entry?.isIntersecting);

        if (!this.isVisible) {
          this.pause();
          return;
        }

        this.resume();
      },
      {
        root: null,
        threshold: 0.08,
      }
    );

    this.observer.observe(this.root);
  }

  shouldAnimate() {
    return Boolean(
      !this.isDestroyed &&
      !document.hidden &&
      !this.isLifecyclePaused &&
      this.isVisible &&
      !REDUCED_MOTION_QUERY.matches &&
      this.root.dataset.wallpaperMotion !== 'static'
    );
  }

  start() {
    if (!this.shouldAnimate() || this.timerId || this.frameId) {
      return;
    }

    this.root.dataset.wallpaperState = 'active';
    this.scheduleNextFrame();
  }

  stop() {
    if (this.timerId) {
      window.clearTimeout(this.timerId);
      this.timerId = null;
    }

    if (this.frameId) {
      window.cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }
  }

  pause() {
    this.isLifecyclePaused = true;
    this.stop();
    this.root.dataset.wallpaperState = 'paused';
  }

  resume() {
    this.isLifecyclePaused = false;

    if (this.shouldAnimate()) {
      this.start();
      return;
    }

    this.renderStaticFrame();
  }

  scheduleNextFrame() {
    if (!this.shouldAnimate()) {
      this.renderStaticFrame();
      return;
    }

    const frameInterval = 1000 / this.motion.fps;

    this.timerId = window.setTimeout(() => {
      this.timerId = null;

      if (!this.shouldAnimate()) {
        this.renderStaticFrame();
        return;
      }

      this.frameId = window.requestAnimationFrame((timestamp) => {
        this.frameId = null;
        this.renderFrame(timestamp);
      });
    }, frameInterval);
  }

  renderFrame(timestamp) {
    if (!this.shouldAnimate()) {
      this.renderStaticFrame();
      return;
    }

    this.applyTransforms(timestamp * 0.001);
    this.scheduleNextFrame();
  }

  renderStaticFrame() {
    this.stop();
    this.applyTransforms(performance.now() * 0.001);
    this.root.dataset.wallpaperState = 'static';
  }

  applyTransforms(time) {
    this.motionNodes.forEach(({ node, motion, index }) => {
      const speed = clampNumber(motion.speed, 1, 0, 4) * this.motion.speed;
      const phase = clampNumber(motion.phase, index * 0.77);
      const amplitude = this.motion.amplitude;

      const x = clampNumber(motion.x, 0) * amplitude * Math.sin((time * speed) + phase);
      const y = clampNumber(motion.y, 0) * amplitude * Math.cos((time * speed * 0.82) + phase);
      const rotate = clampNumber(motion.rotate, 0) * Math.sin((time * speed * 0.44) + phase);
      const scale = 1 + (clampNumber(motion.scale, 0) * Math.cos((time * speed * 0.56) + phase));

      node.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) rotate(${rotate.toFixed(3)}deg) scale(${scale.toFixed(4)})`;
      node.style.transformOrigin = motion.origin || '50% 50%';
    });
  }

  handleVisibilityChange() {
    if (document.hidden) {
      this.pause();
      return;
    }

    this.resume();
  }

  handleWindowBlur() {
    this.pause();
  }

  handleWindowFocus() {
    this.resume();
  }

  handlePageHide() {
    this.pause();
  }

  handlePageShow() {
    this.resume();
  }

  handleReducedMotionChange() {
    if (REDUCED_MOTION_QUERY.matches) {
      this.pause();
      this.renderStaticFrame();
      return;
    }

    this.resume();
  }

  destroy() {
    this.isDestroyed = true;
    this.stop();

    document.removeEventListener('visibilitychange', this.boundVisibilityChange);
    window.removeEventListener('blur', this.boundWindowBlur);
    window.removeEventListener('focus', this.boundWindowFocus);
    window.removeEventListener('pagehide', this.boundPageHide);
    window.removeEventListener('pageshow', this.boundPageShow);

    if (typeof REDUCED_MOTION_QUERY.removeEventListener === 'function') {
      REDUCED_MOTION_QUERY.removeEventListener('change', this.boundReducedMotionChange);
    } else if (typeof REDUCED_MOTION_QUERY.removeListener === 'function') {
      REDUCED_MOTION_QUERY.removeListener(this.boundReducedMotionChange);
    }

    this.observer?.disconnect();
    this.observer = null;
    this.root.replaceChildren();
  }
}

function bootNeuroartanWallpapers() {
  document.querySelectorAll(WALLPAPER_SELECTOR).forEach((root) => {
    if (root.dataset.wallpaperBooted === 'true') {
      return;
    }

    root.dataset.wallpaperBooted = 'true';

    const instance = new NeuroartanWallpaperInstance(root);
    root.__neuroartanWallpaper = instance;
    instance.init();
  });
}

document.addEventListener('DOMContentLoaded', bootNeuroartanWallpapers);
document.addEventListener('neuroartan:runtime-ready', bootNeuroartanWallpapers);
document.addEventListener('fragment:mounted', bootNeuroartanWallpapers);

export {
  NeuroartanWallpaperInstance,
  bootNeuroartanWallpapers,
};
