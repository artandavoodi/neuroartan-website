/* =============================================================================
   HOME HERO SHADER.JS
   Homepage binding/controller for the reusable Neuroartan shader background.

   FILE INDEX
   01) MODULE WRAPPER
   02) SHADER SOURCE
   03) DOM HELPERS
   04) THEME / TOGGLE HELPERS
   05) SHADER CONTROLLER
   06) MOUNT HELPERS
   07) SHARED READINESS HELPERS
   08) BOOT RECOVERY
   09) INITIALIZATION
   10) GLOBAL EXPORT
============================================================================= */

/* =============================================================================
   01) MODULE WRAPPER
============================================================================= */
(() => {
  'use strict';

  /* =============================================================================
     02) SHADER SOURCE
  ============================================================================= */
  const HOME_HERO_FRAGMENT_SHADER = `
    precision highp float;

    uniform vec2 u_resolution;
    uniform float u_time;
    uniform vec2 u_pointer;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
    }

    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);

      float a = hash(i);
      float b = hash(i + vec2(1.0, 0.0));
      float c = hash(i + vec2(0.0, 1.0));
      float d = hash(i + vec2(1.0, 1.0));

      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(a, b, u.x) +
             (c - a) * u.y * (1.0 - u.x) +
             (d - b) * u.x * u.y;
    }

    float fbm(vec2 p) {
      float value = 0.0;
      float amplitude = 0.5;
      for (int i = 0; i < 6; i++) {
        value += amplitude * noise(p);
        p = p * 2.04 + vec2(0.19, -0.17);
        amplitude *= 0.54;
      }
      return value;
    }

    mat2 rotate2d(float a) {
      float s = sin(a);
      float c = cos(a);
      return mat2(c, -s, s, c);
    }

    float sdEllipse(vec2 p, vec2 radius) {
      vec2 q = p / radius;
      return (length(q) - 1.0) * min(radius.x, radius.y);
    }

    void main() {
      vec2 uv = gl_FragCoord.xy / u_resolution.xy;
      vec2 centered = uv - 0.5;
      centered.x *= u_resolution.x / u_resolution.y;

      vec2 pointer = u_pointer - 0.5;
      pointer.x *= u_resolution.x / u_resolution.y;

      float t = u_time * 0.46;

      vec2 roam = vec2(
        sin(t * 0.57) * 0.34 + cos(t * 0.21) * 0.14,
        cos(t * 0.43) * 0.18 + sin(t * 0.27) * 0.09
      );

      vec2 p = centered - roam;
      p *= rotate2d(sin(t * 0.16) * 0.34 + cos(t * 0.09) * 0.18);

      float macro = fbm(p * 2.15 + vec2(t * 0.16, -t * 0.13));
      float detail = fbm(p * 4.2 - vec2(t * 0.28, t * 0.17));
      float micro = fbm(p * 6.1 + vec2(-t * 0.44, t * 0.39));

      float morphA = sin(t * 1.09) * 0.5 + 0.5;
      float morphB = cos(t * 0.73) * 0.5 + 0.5;
      float morphC = sin(t * 1.71 + 1.2) * 0.5 + 0.5;

      vec2 radiusA = vec2(
        0.16 + morphA * 0.12 + macro * 0.03,
        0.21 + morphB * 0.14 + detail * 0.03
      );

      vec2 radiusB = vec2(
        0.24 + morphC * 0.08,
        0.14 + morphA * 0.06
      );

      vec2 warpA = p;
      warpA.x += sin(p.y * 8.0 + t * 1.8) * 0.05;
      warpA.y += cos(p.x * 7.0 - t * 1.3) * 0.04;

      vec2 warpB = p * rotate2d(0.9 + sin(t * 0.41) * 0.25);
      warpB.x += sin(warpB.y * 10.0 - t * 1.1) * 0.035;
      warpB.y += cos(warpB.x * 9.0 + t * 1.5) * 0.03;

      float shape1 = sdEllipse(warpA, radiusA);
      float shape2 = sdEllipse(warpB, radiusB);

      float combined = min(shape1, shape2 + 0.015);
      combined += (macro - 0.5) * 0.10;
      combined += (detail - 0.5) * 0.05;
      combined += (micro - 0.5) * 0.025;

      float body = smoothstep(0.22, -0.16, combined);
      float inner = smoothstep(0.10, -0.21, combined);
      float bodySoft = smoothstep(0.34, -0.22, combined);
      float bodyMist = smoothstep(0.46, -0.28, combined);
      float rim = clamp((body - inner) * 0.36, 0.0, 1.0);

      float centerPulse = smoothstep(0.26, -0.02, length(p * vec2(1.08, 0.92))) * (0.62 + 0.38 * sin(t * 2.2));
      float shellPulse = smoothstep(0.34, 0.02, length(p * vec2(0.94, 1.18))) * (0.56 + 0.44 * cos(t * 1.64));
      float folded = smoothstep(
        0.24,
        -0.08,
        combined + sin(p.x * 10.0 + t * 1.4) * 0.035 + cos(p.y * 8.0 - t * 1.1) * 0.03
      );
      float layerB = smoothstep(
        0.28,
        -0.14,
        combined + sin(p.x * 6.0 - t * 0.9) * 0.05 + cos(p.y * 11.0 + t * 1.3) * 0.04
      );
      float layerC = smoothstep(
        0.32,
        -0.18,
        combined + cos(p.x * 12.0 + t * 1.7) * 0.035 + sin(p.y * 7.0 - t * 1.2) * 0.045
      );

      float pointerDistance = distance(centered, pointer);
      float pointerGlow = exp(-pointerDistance * 7.3);
      float pointerInfluence = exp(-distance(pointer, roam) * 4.0);

      vec3 colorBlack = vec3(0.0, 0.0, 0.0);
      vec3 colorWhite = vec3(1.0, 1.0, 1.0);
      vec3 colorPrimary1 = vec3(0.5686, 0.4863, 0.4353);
      vec3 colorPrimary2 = vec3(0.3137, 0.2667, 0.0863);
      vec3 colorPrimary3 = vec3(0.6, 0.6, 0.6);
      vec3 colorPrimary8 = vec3(0.5686, 0.4863, 0.4353);
      vec3 colorPrimary9 = vec3(0.3137, 0.2667, 0.0863);
      vec3 colorPrimary10 = vec3(0.6, 0.6, 0.6);

      vec3 abyss = mix(colorBlack, colorPrimary2, 0.14);
      vec3 warmCore = mix(abyss, colorPrimary1, smoothstep(0.42, -0.03, combined));
      vec3 coolEdge = mix(colorPrimary1, colorWhite, 0.26);
      vec3 warmEdge = mix(colorPrimary2, colorWhite, 0.18);
      vec3 signalEdge = mix(colorPrimary1, colorPrimary2, 0.5 + 0.5 * sin(t * 0.86));
      vec3 milk = mix(colorPrimary1, colorWhite, 0.08);
      vec3 pearl = mix(colorPrimary3, colorWhite, 0.18);

      vec3 gradientMix = mix(warmCore, coolEdge, smoothstep(-0.06, 0.30, p.x + p.y * 0.32));
      gradientMix = mix(gradientMix, warmEdge, smoothstep(-0.34, 0.24, -p.y));
      gradientMix = mix(gradientMix, signalEdge, folded * 0.18 + layerB * 0.16);
      gradientMix = mix(gradientMix, milk, centerPulse * 0.22 + layerC * 0.12);
      gradientMix = mix(gradientMix, pearl, bodySoft * 0.10);

      vec3 color = vec3(0.0);
      color += gradientMix * body;
      color += mix(coolEdge, signalEdge, 0.5) * layerB * 0.12;
      color += mix(warmEdge, pearl, 0.5) * layerC * 0.10;
      color += milk * centerPulse * 0.18;
      color += pearl * bodySoft * 0.08;
      color += mix(coolEdge, pearl, 0.5) * rim * 0.04;
      color += warmEdge * shellPulse * 0.08;
      color += signalEdge * folded * 0.08;
      color += mix(coolEdge, pearl, 0.5) * bodyMist * 0.16;
      color += coolEdge * pointerInfluence * 0.07;
      color += colorWhite * pointerGlow * 0.004;

      float ambient = smoothstep(1.02, 0.02, length(p)) * 0.08;
      color += mix(coolEdge, warmEdge, 0.5) * ambient;

      float vignette = smoothstep(1.58, 0.02, length(centered));
      color *= vignette;

      float alpha = clamp(body * 0.62 + bodySoft * 0.22 + bodyMist * 0.10 + centerPulse * 0.05 + pointerGlow * 0.008, 0.0, 0.58);
      gl_FragColor = vec4(color, alpha);
    }
  `;

  /* =============================================================================
     03) DOM HELPERS
  ============================================================================= */
  const qs = (selector, scope = document) => scope.querySelector(selector);

  /* =============================================================================
     04) THEME / TOGGLE HELPERS
  ============================================================================= */
  function normalizeThemeValue(value) {
    const normalized = String(value || '').trim().toLowerCase();

    if (normalized === 'color') return 'custom';
    if (normalized === 'factory') return 'company';
    if (normalized === 'default') return 'company';
    if (normalized === 'company-default') return 'company';
    if (normalized === 'company' || normalized === 'system' || normalized === 'custom' || normalized === 'dark' || normalized === 'light') {
      return normalized;
    }

    return '';
  }

  function readHomeHeroShaderTheme() {
    const html = document.documentElement;

    const candidates = [
      window.NeuroartanTheme?.getCurrentTheme?.(),
      html?.getAttribute('data-theme'),
    ];

    for (const candidate of candidates) {
      const normalized = normalizeThemeValue(candidate);
      if (normalized) return normalized;
    }

    return 'system';
  }

  function readHomeHeroShaderToggleActive() {
    const html = document.documentElement;
    const body = document.body;

    return html?.dataset?.homepageThemeHeroShader === 'true'
      || body?.getAttribute('data-homepage-theme-hero-shader') === 'true';
  }

  function shouldUseHomeHeroShader() {
    return readHomeHeroShaderToggleActive();
  }

  /* =============================================================================
     05) SHADER CONTROLLER
  ============================================================================= */
  class HomeHeroShaderController {
    constructor() {
      this.root = null;
      this.canvas = null;
      this.interaction = null;
      this.stage = null;
      this.core = null;
      this.boundPointerMove = null;
      this.boundPointerLeave = null;
      this.boundThemeSync = null;
    }

    resolveElements() {
      this.root = qs('#home-hero-shader');
      this.canvas = qs('#home-hero-shader-canvas');
      this.interaction = qs('#home-hero-shader-interaction');
      this.stage = qs('#stage');
      return Boolean(this.root && this.canvas);
    }

    init() {
      if (!window.NeuroShaderCore) return false;
      if (!this.resolveElements()) return false;
      if (!shouldUseHomeHeroShader()) {
        this.applyThemeVisibility();
        this.bindThemeSync();
        return true;
      }

      this.core = new window.NeuroShaderCore({
        canvas: this.canvas,
        fragmentSource: HOME_HERO_FRAGMENT_SHADER,
        dprCap: 1.6,
        smoothing: 0.06
      });

      this.applyThemeVisibility();
      this.bindThemeSync();
      this.bindInteractionSurface();
      this.core.start();
      return true;
    }

    applyThemeVisibility() {
      const shaderActive = shouldUseHomeHeroShader();
      const activeTheme = readHomeHeroShaderTheme();

      if (this.root) {
        this.root.dataset.shaderThemeState = shaderActive ? activeTheme : 'controlled';
        this.root.setAttribute('aria-hidden', 'true');
      }

      if (!shaderActive && this.canvas) {
        const context = this.canvas.getContext('2d');
        if (context) {
          context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
      }
    }

    bindThemeSync() {
      if (this.boundThemeSync) return;

      this.boundThemeSync = () => {
        const shaderActive = shouldUseHomeHeroShader();
        this.applyThemeVisibility();

        if (!shaderActive && this.core) {
          this.core.destroy();
          this.core = null;
          return;
        }

        if (shaderActive && !this.core && window.NeuroShaderCore && this.canvas) {
          this.core = new window.NeuroShaderCore({
            canvas: this.canvas,
            fragmentSource: HOME_HERO_FRAGMENT_SHADER,
            dprCap: 1.6,
            smoothing: 0.06
          });
          this.bindInteractionSurface();
          this.core.start();
        }
      };

      document.addEventListener('neuroartan:theme-changed', this.boundThemeSync);
      document.addEventListener('neuroartan:toggle-changed', this.boundThemeSync);
      document.addEventListener('neuroartan:homepage-theme-control-changed', this.boundThemeSync);
      document.addEventListener('neuroartan:homepage-theme-toggles-restored', this.boundThemeSync);
      document.addEventListener('themechange', this.boundThemeSync);
      window.addEventListener('focus', this.boundThemeSync, { passive: true });
    }

    bindInteractionSurface() {
      if (!this.canvas || !this.core || this.boundPointerMove) return;

      const pointerSurface = this.stage || document;
      this.boundPointerMove = (event) => {
        this.core.handlePointerMove(event);
      };
      this.boundPointerLeave = () => {
        this.core.handlePointerLeave();
      };

      pointerSurface.addEventListener('pointermove', this.boundPointerMove, { passive: true });

      if (this.stage) {
        this.stage.addEventListener('pointerleave', this.boundPointerLeave, { passive: true });
      } else {
        window.addEventListener('blur', this.boundPointerLeave, { passive: true });
      }
    }

    destroy() {
      const pointerSurface = this.stage || document;
      if (this.boundPointerMove) {
        pointerSurface.removeEventListener('pointermove', this.boundPointerMove);
      }

      if (this.boundPointerLeave) {
        if (this.stage) {
          this.stage.removeEventListener('pointerleave', this.boundPointerLeave);
        } else {
          window.removeEventListener('blur', this.boundPointerLeave);
        }
      }

      this.boundPointerMove = null;
      this.boundPointerLeave = null;

      if (this.boundThemeSync) {
        document.removeEventListener('neuroartan:theme-changed', this.boundThemeSync);
        document.removeEventListener('neuroartan:toggle-changed', this.boundThemeSync);
        document.removeEventListener('neuroartan:homepage-theme-control-changed', this.boundThemeSync);
        document.removeEventListener('neuroartan:homepage-theme-toggles-restored', this.boundThemeSync);
        document.removeEventListener('themechange', this.boundThemeSync);
        window.removeEventListener('focus', this.boundThemeSync);
      }

      this.boundThemeSync = null;

      if (this.core) {
        this.core.destroy();
        this.core = null;
      }
    }
  }

  /* =============================================================================
     06) MOUNT HELPERS
  ============================================================================= */
  function mountHomeHeroShaderFragment() {
    const stage = qs('#stage');
    if (!stage) return null;
    if (qs('#home-hero-shader', stage)) return qs('#home-hero-shader', stage);

    const shell = document.createElement('div');
    shell.innerHTML = `
      <div class="home-hero-shader" id="home-hero-shader" aria-hidden="true">
        <div class="home-hero-shader-canvas-shell" id="home-hero-shader-canvas-shell">
          <canvas class="home-hero-shader-canvas" id="home-hero-shader-canvas"></canvas>
        </div>
        <div class="home-hero-shader-veil glass-matte glass-matte--soft" id="home-hero-shader-veil"></div>
        <div class="home-hero-shader-matte glass-matte glass-matte--medium" id="home-hero-shader-matte"></div>
        <div class="home-hero-shader-interaction" id="home-hero-shader-interaction"></div>
      </div>
    `.trim();

    const fragment = shell.firstElementChild;
    if (!fragment) return null;

    const stageVideo = qs('.stage-video', stage);
    if (stageVideo && stageVideo.parentNode) {
      stageVideo.insertAdjacentElement('afterend', fragment);
    } else {
      stage.insertAdjacentElement('afterbegin', fragment);
    }
    return fragment;
  }

  /* =============================================================================
     07) SHARED READINESS HELPERS
  ============================================================================= */
  window.__artanRunWhenReady = window.__artanRunWhenReady || ((bootFn) => {
    if (typeof bootFn !== 'function') return;

    const run = () => {
      try { bootFn(); } catch (_) {}
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', run, { once: true });
    } else {
      run();
    }
  });

  /* =============================================================================
     08) BOOT RECOVERY
  ============================================================================= */
  let recoveryBound = false;

  function bindBootRecovery() {
    if (recoveryBound) return;
    recoveryBound = true;

    document.addEventListener('fragment:mounted', initHomeHeroShader);
    document.addEventListener('neuroartan:runtime-ready', initHomeHeroShader);
    document.addEventListener('neuroartan:language-applied', initHomeHeroShader);
    document.addEventListener('neuroartan:homepage-theme-toggles-restored', initHomeHeroShader);
    window.addEventListener('load', initHomeHeroShader, { once: true });
  }

  /* =============================================================================
     09) INITIALIZATION
  ============================================================================= */
  let controller = null;
  let initialized = false;

  function initHomeHeroShader() {
    if (initialized) return;

    const fragment = mountHomeHeroShaderFragment();
    const stage = qs('#stage');
    const hero = qs('#home-hero');

    if (!stage && !hero && !fragment) {
      bindBootRecovery();
      return;
    }

    const nextController = new HomeHeroShaderController();
    const didInit = nextController.init();

    if (!didInit) {
      bindBootRecovery();
      return;
    }

    controller = nextController;
    initialized = true;
  }

  bindBootRecovery();
  window.__artanRunWhenReady(initHomeHeroShader);

  /* =============================================================================
     10) GLOBAL EXPORT
  ============================================================================= */
  window.NeuroartanHomeHeroShader = {
    init: initHomeHeroShader,
    destroy() {
      if (controller) controller.destroy();
      controller = null;
      initialized = false;
    }
  };
})();
