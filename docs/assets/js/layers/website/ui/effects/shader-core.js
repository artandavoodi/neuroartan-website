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
      this.canvas = this.options.canvas;
      this.gl = null;
      this.program = null;
      this.vertexShader = null;
      this.fragmentShader = null;
      this.vertexBuffer = null;
      this.animationFrame = null;
      this.isRunning = false;
      this.startTime = 0;
      this.pointer = {
        x: 0.5,
        y: 0.5,
        targetX: 0.5,
        targetY: 0.5,
        active: false
      };
      this.uniforms = {};
      this.boundResize = () => this.resize();
      this.boundPointerMove = (event) => this.handlePointerMove(event);
      this.boundPointerLeave = () => this.handlePointerLeave();
    }

    /* =============================================================================
       03) CONFIG NORMALIZATION
    ============================================================================= */
    normalizeConfig(options) {
      return {
        canvas: options.canvas instanceof HTMLCanvasElement ? options.canvas : null,
        fragmentSource: typeof options.fragmentSource === 'string' ? options.fragmentSource : '',
        vertexSource: typeof options.vertexSource === 'string' ? options.vertexSource : `
          attribute vec2 a_position;
          varying vec2 v_uv;
          void main() {
            v_uv = (a_position + 1.0) * 0.5;
            gl_Position = vec4(a_position, 0.0, 1.0);
          }
        `,
        dprCap: typeof options.dprCap === 'number' ? options.dprCap : 1.75,
        smoothing: typeof options.smoothing === 'number' ? options.smoothing : 0.08,
        onBeforeRender: typeof options.onBeforeRender === 'function' ? options.onBeforeRender : null,
        onAfterRender: typeof options.onAfterRender === 'function' ? options.onAfterRender : null
      };
    }

    /* =============================================================================
       04) CONTEXT + PROGRAM HELPERS
    ============================================================================= */
    init() {
      if (!this.canvas) return false;

      this.gl = this.canvas.getContext('webgl', {
        alpha: true,
        antialias: true,
        depth: false,
        stencil: false,
        premultipliedAlpha: true,
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

      this.createFullscreenQuad();
      this.resize();
      this.attachEvents();
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

    /* =============================================================================
       05) RESIZE / VIEWPORT HELPERS
    ============================================================================= */
    resize() {
      if (!this.canvas || !this.gl) return;

      const rect = this.canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, this.options.dprCap);
      const width = Math.max(1, Math.round(rect.width * dpr));
      const height = Math.max(1, Math.round(rect.height * dpr));

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
    }

    detachEvents() {
      window.removeEventListener('resize', this.boundResize, { passive: true });
      this.canvas.removeEventListener('pointermove', this.boundPointerMove, { passive: true });
      this.canvas.removeEventListener('pointerleave', this.boundPointerLeave, { passive: true });
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

    /* =============================================================================
       07) RENDER LOOP
    ============================================================================= */
    render = (timestamp) => {
      if (!this.isRunning || !this.gl || !this.program) return;

      if (!this.startTime) this.startTime = timestamp;
      const elapsed = (timestamp - this.startTime) / 1000;

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
      this.gl.clearColor(0, 0, 0, 0);
      this.gl.clear(this.gl.COLOR_BUFFER_BIT);

      if (this.uniforms.time) {
        this.gl.uniform1f(this.uniforms.time, elapsed);
      }

      if (this.uniforms.resolution) {
        this.gl.uniform2f(this.uniforms.resolution, this.canvas.width, this.canvas.height);
      }

      if (this.uniforms.pointer) {
        this.gl.uniform2f(this.uniforms.pointer, this.pointer.x, this.pointer.y);
      }

      this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);

      if (this.options.onAfterRender) {
        this.options.onAfterRender({
          core: this,
          gl: this.gl,
          time: elapsed,
          pointer: this.pointer
        });
      }

      this.animationFrame = window.requestAnimationFrame(this.render);
    };

    /* =============================================================================
       08) PUBLIC API
    ============================================================================= */
    start() {
      if (this.isRunning) return;
      if (!this.gl && !this.init()) return;

      this.isRunning = true;
      this.animationFrame = window.requestAnimationFrame(this.render);
    }

    stop() {
      this.isRunning = false;
      if (this.animationFrame) {
        window.cancelAnimationFrame(this.animationFrame);
        this.animationFrame = null;
      }
    }

    destroy() {
      this.stop();
      this.detachEvents();

      if (this.gl && this.vertexBuffer) this.gl.deleteBuffer(this.vertexBuffer);
      if (this.gl && this.program) this.gl.deleteProgram(this.program);
      if (this.gl && this.vertexShader) this.gl.deleteShader(this.vertexShader);
      if (this.gl && this.fragmentShader) this.gl.deleteShader(this.fragmentShader);

      this.vertexBuffer = null;
      this.program = null;
      this.vertexShader = null;
      this.fragmentShader = null;
      this.gl = null;
    }
  }

  /* =============================================================================
     09) GLOBAL EXPORT
  ============================================================================= */
  window.NeuroShaderCore = NeuroShaderCore;
})();