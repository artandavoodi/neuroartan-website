/* =============================================================================
   SHADER CORE.JS
   Reusable premium shader engine foundation for Neuroartan background systems.

   FILE INDEX
   01) MODULE WRAPPER
   02) SHADER CORE CLASS
   03) CONFIG NORMALIZATION
   04) CONTEXT + PROGRAM HELPERS
   05) RESIZE / VIEWPORT HELPERS
   06) POINTER STATE
   07) RENDER LOOP
   08) PUBLIC API
   09) GLOBAL EXPORT
============================================================================= */

/* =============================================================================
   01) MODULE WRAPPER
============================================================================= */
(() => {
  'use strict';

  /* =============================================================================
     02) SHADER CORE CLASS
  ============================================================================= */
  class NeuroShaderCore {
    constructor(options = {}) {
      this.options = this.normalizeConfig(options);
      this.mountNode = this.options.mount;
      this.createdCanvas = false;
      this.canvas = this.options.canvas;
      this.gl = null;
      this.program = null;
      this.vertexShader = null;
      this.fragmentShader = null;
      this.vertexBuffer = null;
      this.animationFrame = null;
      this.isRunning = false;
      this.shouldResumeAfterLifecycle = false;
      this.startTime = 0;
      this.pointer = {
        x: 0.5,
        y: 0.5,
        targetX: 0.5,
        targetY: 0.5,
        active: false
      };
      this.uniforms = {};
      this.uniformLocations = {};
      this.customUniformValues = {};
      this.boundResize = () => this.resize();
      this.boundPointerMove = (event) => this.handlePointerMove(event);
      this.boundPointerLeave = () => this.handlePointerLeave();
      this.boundObservedResize = () => this.scheduleResize();
      this.boundVisibilityChange = () => this.handleVisibilityChange();
      this.boundWindowBlur = () => this.handleWindowBlur();
      this.boundWindowFocus = () => this.handleWindowFocus();
      this.boundPageHide = () => this.handlePageHide();
      this.boundPageShow = () => this.handlePageShow();
      this.resizeObserver = null;
      this.resizeFrame = null;
    }

    /* =============================================================================
       03) CONFIG NORMALIZATION
    ============================================================================= */
    normalizeConfig(options) {
      const mount = options.mount instanceof Element ? options.mount : null;
      const canvas = options.canvas instanceof HTMLCanvasElement
        ? options.canvas
        : mount instanceof HTMLCanvasElement
          ? mount
          : null;

      const fragmentSource = typeof options.fragmentSource === 'string' && options.fragmentSource
        ? options.fragmentSource
        : typeof options.fragmentShader === 'string'
          ? options.fragmentShader
          : '';

      const dprCap = typeof options.dprCap === 'number'
        ? options.dprCap
        : typeof options.pixelRatioCap === 'number'
          ? options.pixelRatioCap
          : 1.75;

      return {
        canvas,
        mount,
        fragmentSource,
        vertexSource: typeof options.vertexSource === 'string' ? options.vertexSource : `
          attribute vec2 a_position;
          varying vec2 v_uv;
          void main() {
            v_uv = (a_position + 1.0) * 0.5;
            gl_Position = vec4(a_position, 0.0, 1.0);
          }
        `,
        dprCap,
        smoothing: typeof options.smoothing === 'number' ? options.smoothing : 0.08,
        onBeforeRender: typeof options.onBeforeRender === 'function' ? options.onBeforeRender : null,
        onAfterRender: typeof options.onAfterRender === 'function' ? options.onAfterRender : null,
        transparent: Boolean(options.transparent),
        contextAlpha: typeof options.contextAlpha === 'boolean' ? options.contextAlpha : true,
        premultipliedAlpha: typeof options.premultipliedAlpha === 'boolean' ? options.premultipliedAlpha : true
      };
    }

    /* =============================================================================
       04) CONTEXT + PROGRAM HELPERS
    ============================================================================= */
    init() {
      if (!this.canvas) {
        if (this.mountNode && !(this.mountNode instanceof HTMLCanvasElement)) {
          const canvas = document.createElement('canvas');
          canvas.className = 'neuro-shader-core-canvas';
          canvas.setAttribute('aria-hidden', 'true');
          this.mountNode.appendChild(canvas);
          this.canvas = canvas;
          this.createdCanvas = true;
        } else {
          return false;
        }
      }

      this.gl = this.canvas.getContext('webgl', {
        alpha: this.options.contextAlpha,
        antialias: true,
        depth: false,
        stencil: false,
        premultipliedAlpha: this.options.premultipliedAlpha,
        preserveDrawingBuffer: false
      });

      if (!this.gl) return false;
      if (!this.options.fragmentSource) return false;

      const program = this.createProgram(this.options.vertexSource, this.options.fragmentSource);
      if (!program) return false;

      this.program = program;
      this.uniforms.time = this.gl.getUniformLocation(this.program, 'u_time');
      this.uniforms.resolution = this.gl.getUniformLocation(this.program, 'u_resolution');
      this.uniforms.pointer = this.gl.getUniformLocation(this.program, 'u_pointer');
      this.uniformLocations.u_time = this.uniforms.time;
      this.uniformLocations.u_resolution = this.uniforms.resolution;
      this.uniformLocations.u_pointer = this.uniforms.pointer;

      this.createFullscreenQuad();
      this.resize();
      this.attachEvents();
      this.scheduleResize();
      return true;
    }

    createShader(type, source) {
      const shader = this.gl.createShader(type);
      if (!shader) return null;

      this.gl.shaderSource(shader, source);
      this.gl.compileShader(shader);

      if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
        console.error('NeuroShaderCore shader compile error:', this.gl.getShaderInfoLog(shader));
        this.gl.deleteShader(shader);
        return null;
      }

      return shader;
    }

    createProgram(vertexSource, fragmentSource) {
      const vertexShader = this.createShader(this.gl.VERTEX_SHADER, vertexSource);
      const fragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, fragmentSource);
      if (!vertexShader || !fragmentShader) return null;

      const program = this.gl.createProgram();
      if (!program) return null;

      this.gl.attachShader(program, vertexShader);
      this.gl.attachShader(program, fragmentShader);
      this.gl.linkProgram(program);

      if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
        console.error('NeuroShaderCore program link error:', this.gl.getProgramInfoLog(program));
        this.gl.deleteProgram(program);
        return null;
      }

      this.vertexShader = vertexShader;
      this.fragmentShader = fragmentShader;
      return program;
    }

    createFullscreenQuad() {
      const vertices = new Float32Array([
        -1, -1,
         1, -1,
        -1,  1,
        -1,  1,
         1, -1,
         1,  1
      ]);

      this.vertexBuffer = this.gl.createBuffer();
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
      this.gl.bufferData(this.gl.ARRAY_BUFFER, vertices, this.gl.STATIC_DRAW);

      const positionLocation = this.gl.getAttribLocation(this.program, 'a_position');
      this.gl.enableVertexAttribArray(positionLocation);
      this.gl.vertexAttribPointer(positionLocation, 2, this.gl.FLOAT, false, 0, 0);
    }

    getUniformLocation(name) {
      if (!this.gl || !this.program || !name) return null;
      if (this.uniformLocations[name]) return this.uniformLocations[name];
      const location = this.gl.getUniformLocation(this.program, name);
      this.uniformLocations[name] = location;
      return location;
    }

    applyUniform(location, value) {
      if (!this.gl || !location || value === undefined || value === null) return;

      if (typeof value === 'number') {
        this.gl.uniform1f(location, value);
        return;
      }

      if (Array.isArray(value)) {
        if (value.length === 1) this.gl.uniform1f(location, value[0]);
        if (value.length === 2) this.gl.uniform2f(location, value[0], value[1]);
        if (value.length === 3) this.gl.uniform3f(location, value[0], value[1], value[2]);
        if (value.length === 4) this.gl.uniform4f(location, value[0], value[1], value[2], value[3]);
      }
    }

    /* =============================================================================
       05) RESIZE / VIEWPORT HELPERS
    ============================================================================= */
    getResizeTarget() {
      if (this.mountNode && this.mountNode !== this.canvas) {
        return this.mountNode;
      }

      return this.canvas;
    }

    scheduleResize() {
      if (this.resizeFrame) {
        window.cancelAnimationFrame(this.resizeFrame);
      }

      this.resizeFrame = window.requestAnimationFrame(() => {
        this.resizeFrame = null;
        this.resize();
      });
    }

    resize() {
      if (!this.canvas || !this.gl) return;

      const resizeTarget = this.getResizeTarget();
      const rect = resizeTarget ? resizeTarget.getBoundingClientRect() : this.canvas.getBoundingClientRect();

      if (!rect.width || !rect.height) {
        return;
      }

      const dpr = Math.min(window.devicePixelRatio || 1, this.options.dprCap);
      const width = Math.max(2, Math.round(rect.width * dpr));
      const height = Math.max(2, Math.round(rect.height * dpr));

      if (this.canvas.width !== width || this.canvas.height !== height) {
        this.canvas.width = width;
        this.canvas.height = height;
      }

      this.gl.viewport(0, 0, width, height);
    }

    attachEvents() {
      window.addEventListener('resize', this.boundResize, { passive: true });
      this.canvas.addEventListener('pointermove', this.boundPointerMove, { passive: true });
      this.canvas.addEventListener('pointerleave', this.boundPointerLeave, { passive: true });
      document.addEventListener('visibilitychange', this.boundVisibilityChange);
      window.addEventListener('blur', this.boundWindowBlur);
      window.addEventListener('focus', this.boundWindowFocus);
      window.addEventListener('pagehide', this.boundPageHide);
      window.addEventListener('pageshow', this.boundPageShow);

      if (typeof ResizeObserver === 'function') {
        const resizeTarget = this.getResizeTarget();

        if (resizeTarget) {
          this.resizeObserver = new ResizeObserver(this.boundObservedResize);
          this.resizeObserver.observe(resizeTarget);
        }
      }
    }

    detachEvents() {
      window.removeEventListener('resize', this.boundResize, { passive: true });
      this.canvas.removeEventListener('pointermove', this.boundPointerMove, { passive: true });
      this.canvas.removeEventListener('pointerleave', this.boundPointerLeave, { passive: true });
      document.removeEventListener('visibilitychange', this.boundVisibilityChange);
      window.removeEventListener('blur', this.boundWindowBlur);
      window.removeEventListener('focus', this.boundWindowFocus);
      window.removeEventListener('pagehide', this.boundPageHide);
      window.removeEventListener('pageshow', this.boundPageShow);

      if (this.resizeObserver) {
        this.resizeObserver.disconnect();
        this.resizeObserver = null;
      }

      if (this.resizeFrame) {
        window.cancelAnimationFrame(this.resizeFrame);
        this.resizeFrame = null;
      }
    }

    /* =============================================================================
       06) POINTER STATE
    ============================================================================= */
    handlePointerMove(event) {
      if (!this.canvas) return;
      const rect = this.canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      this.pointer.targetX = (event.clientX - rect.left) / rect.width;
      this.pointer.targetY = 1 - ((event.clientY - rect.top) / rect.height);
      this.pointer.active = true;
    }

    handlePointerLeave() {
      this.pointer.targetX = 0.5;
      this.pointer.targetY = 0.5;
      this.pointer.active = false;
    }

    updatePointer() {
      const smoothing = this.options.smoothing;
      this.pointer.x += (this.pointer.targetX - this.pointer.x) * smoothing;
      this.pointer.y += (this.pointer.targetY - this.pointer.y) * smoothing;
    }

    drawFrame(timestamp) {
      if (!this.gl || !this.program) return;

      if (!this.startTime && typeof timestamp === 'number') {
        this.startTime = timestamp;
      }

      const resolvedTimestamp = typeof timestamp === 'number' ? timestamp : performance.now();
      const elapsed = this.startTime ? (resolvedTimestamp - this.startTime) / 1000 : 0;

      this.updatePointer();
      if (this.options.onBeforeRender) {
        this.options.onBeforeRender({
          core: this,
          gl: this.gl,
          time: elapsed,
          pointer: this.pointer
        });
      }

      this.gl.useProgram(this.program);
      this.gl.clearColor(0, 0, 0, this.options.transparent ? 0 : 1);
      this.gl.clear(this.gl.COLOR_BUFFER_BIT);

      const timeValue = Object.prototype.hasOwnProperty.call(this.customUniformValues, 'u_time')
        ? this.customUniformValues.u_time
        : elapsed;
      const resolutionValue = Object.prototype.hasOwnProperty.call(this.customUniformValues, 'u_resolution')
        ? this.customUniformValues.u_resolution
        : [this.canvas.width, this.canvas.height];
      const pointerValue = Object.prototype.hasOwnProperty.call(this.customUniformValues, 'u_pointer')
        ? this.customUniformValues.u_pointer
        : [this.pointer.x, this.pointer.y];

      this.applyUniform(this.uniforms.time, timeValue);
      this.applyUniform(this.uniforms.resolution, resolutionValue);
      this.applyUniform(this.uniforms.pointer, pointerValue);

      Object.entries(this.customUniformValues).forEach(([name, value]) => {
        if (name === 'u_time' || name === 'u_resolution' || name === 'u_pointer') return;
        const location = this.getUniformLocation(name);
        this.applyUniform(location, value);
      });

      this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);

      if (this.options.onAfterRender) {
        this.options.onAfterRender({
          core: this,
          gl: this.gl,
          time: elapsed,
          pointer: this.pointer
        });
      }
    }

    /* =============================================================================
       07B) BROWSER LIFECYCLE GOVERNOR
    ============================================================================= */
    suspendForLifecycle() {
      if (this.isRunning) {
        this.shouldResumeAfterLifecycle = true;
      }

      this.isRunning = false;

      if (this.animationFrame) {
        window.cancelAnimationFrame(this.animationFrame);
        this.animationFrame = null;
      }
    }

    resumeFromLifecycle() {
      if (!this.shouldResumeAfterLifecycle || document.hidden) {
        return;
      }

      this.shouldResumeAfterLifecycle = false;
      this.start();
      this.scheduleResize();
    }

    handleVisibilityChange() {
      if (document.hidden) {
        this.suspendForLifecycle();
        return;
      }

      this.resumeFromLifecycle();
    }

    handleWindowBlur() {
      this.suspendForLifecycle();
    }

    handleWindowFocus() {
      this.resumeFromLifecycle();
    }

    handlePageHide() {
      this.suspendForLifecycle();
    }

    handlePageShow() {
      this.resumeFromLifecycle();
    }

    render = (timestamp) => {
      if (!this.gl || !this.program) return;

      if (document.hidden) {
        this.suspendForLifecycle();
        return;
      }

      if (typeof timestamp !== 'number') {
        this.drawFrame(performance.now());
        return;
      }

      if (!this.isRunning) return;

      this.drawFrame(timestamp);
      this.animationFrame = window.requestAnimationFrame(this.render);
    };

    /* =============================================================================
       08) PUBLIC API
    ============================================================================= */
    mount() {
      if (!this.gl) {
        this.init();
      }
    }

    setUniform(name, value) {
      if (!name) return;
      this.customUniformValues[name] = value;
    }

    start() {
      if (this.isRunning) return;
      if (!this.gl && !this.init()) return;

      if (document.hidden) {
        this.shouldResumeAfterLifecycle = true;
        return;
      }

      this.shouldResumeAfterLifecycle = false;
      this.isRunning = true;
      this.animationFrame = window.requestAnimationFrame(this.render);
    }

    stop() {
      this.shouldResumeAfterLifecycle = false;
      this.isRunning = false;

      if (this.animationFrame) {
        window.cancelAnimationFrame(this.animationFrame);
        this.animationFrame = null;
      }
    }

    destroy() {
      this.stop();
      this.detachEvents();

      if (this.createdCanvas && this.canvas && this.canvas.parentNode) {
        this.canvas.parentNode.removeChild(this.canvas);
      }

      if (this.gl && this.vertexBuffer) this.gl.deleteBuffer(this.vertexBuffer);
      if (this.gl && this.program) this.gl.deleteProgram(this.program);
      if (this.gl && this.vertexShader) this.gl.deleteShader(this.vertexShader);
      if (this.gl && this.fragmentShader) this.gl.deleteShader(this.fragmentShader);

      this.vertexBuffer = null;
      this.program = null;
      this.vertexShader = null;
      this.fragmentShader = null;
      this.gl = null;
      this.canvas = null;
      this.createdCanvas = false;
    }
  }

  /* =============================================================================
     09) GLOBAL EXPORT
  ============================================================================= */
  window.NeuroShaderCore = NeuroShaderCore;
})();
