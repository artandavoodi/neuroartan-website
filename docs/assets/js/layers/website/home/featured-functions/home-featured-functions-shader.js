/* =============================================================================
   HOME FEATURED FUNCTIONS SHADER
   Shared shader scene engine for Core Capabilities media frames.
   - Uses shared NeuroShaderCore if available.
   - Mounts one shader scene per capability card.
   - Reads per-capability scene JSON from data already hydrated into the card DOM.
============================================================================= */

(() => {
  const SECTION_SELECTOR = '[data-home-featured-functions]';
  const SCENE_SELECTOR = '[data-home-featured-functions-scene]';
  const LIFECYCLE_BOUND_ATTRIBUTE = 'data-home-featured-functions-shader-bound';

  const DEFAULT_SCENE = {
    palette: {
      background: '#000000',
      surface: '#ffffff',
      primary: '#917c6f',
      secondary: '#999999',
      accent: '#008080',
      accent_soft: '#00ffff',
      glow: '#ffcc00'
    },
    motion: {
      speed: 0.43,
      flow: 0.4,
      turbulence: 0.16,
      pulse: 0.3,
      breath: 0.26,
      stability: 0.84
    },
    field: {
      density: 0.4,
      contrast: 0.58,
      softness: 0.74,
      grain: 0.04,
      vignette: 0.13,
      depth: 0.56
    },
    geometry: {
      line_density: 0.28,
      connection_density: 0.26,
      orbital_drift: 0.18,
      wave_layers: 4,
      cluster_count: 5,
      node_count: 16,
      path_count: 4,
      center_bias_x: 0.0,
      center_bias_y: 0.0
    },
    matte: {
      enabled: true,
      opacity: 0.18,
      blur: 0.22,
      gradient_bias: 0.5
    },
    interaction: {
      pointer_influence: 0.22,
      pointer_radius: 0.56,
      pointer_smoothing: 0.982
    },
    render: {
      pixel_ratio_cap: 1.75,
      transparent: false
    }
  };

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function hexToRgb(hex) {
    const normalized = String(hex || '').trim().replace('#', '');

    if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
      return [0, 0, 0];
    }

    return [
      parseInt(normalized.slice(0, 2), 16) / 255,
      parseInt(normalized.slice(2, 4), 16) / 255,
      parseInt(normalized.slice(4, 6), 16) / 255
    ];
  }

  function deepMerge(base, override) {
    if (!override || typeof override !== 'object') {
      return structuredClone(base);
    }

    const output = Array.isArray(base) ? [...base] : { ...base };

    Object.entries(override).forEach(([key, value]) => {
      if (
        value &&
        typeof value === 'object' &&
        !Array.isArray(value) &&
        base &&
        typeof base[key] === 'object' &&
        !Array.isArray(base[key])
      ) {
        output[key] = deepMerge(base[key], value);
      } else {
        output[key] = value;
      }
    });

    return output;
  }

  function getInlineSceneConfig(sceneNode) {
    const card = sceneNode.closest('[data-feature-id]');

    if (!card) {
      return null;
    }

    const featureId = String(card.getAttribute('data-feature-id') || '').trim();
    const section = sceneNode.closest(SECTION_SELECTOR);
    const data = section && section.__featuredFunctionsData;
    const items = Array.isArray(data?.items) ? data.items : [];
    const matched = items.find((item) => String(item?.id || '').trim() === featureId);

    return matched?.scene || null;
  }

  function createFragmentSource() {
    return `
      precision highp float;

      uniform vec2 u_resolution;
      uniform float u_time;
      uniform vec2 u_pointer;
      uniform vec2 u_pointer_target;
      uniform float u_pointer_strength;

      uniform vec3 u_bg;
      uniform vec3 u_surface;
      uniform vec3 u_primary;
      uniform vec3 u_secondary;
      uniform vec3 u_accent;
      uniform vec3 u_accent_soft;
      uniform vec3 u_glow;

      uniform float u_speed;
      uniform float u_flow;
      uniform float u_turbulence;
      uniform float u_pulse;
      uniform float u_breath;
      uniform float u_stability;

      uniform float u_density;
      uniform float u_contrast;
      uniform float u_softness;
      uniform float u_grain;
      uniform float u_vignette;
      uniform float u_depth;

      uniform float u_line_density;
      uniform float u_connection_density;
      uniform float u_orbital_drift;
      uniform float u_wave_layers;
      uniform float u_cluster_count;
      uniform float u_node_count;
      uniform float u_path_count;
      uniform vec2 u_center_bias;

      uniform float u_scene_type;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);

        return mix(
          mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
          mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
          u.y
        );
      }

      float fbm(vec2 p) {
        float value = 0.0;
        float amplitude = 0.5;

        for (int i = 0; i < 5; i++) {
          value += amplitude * noise(p);
          p *= 2.0;
          amplitude *= 0.5;
        }

        return value;
      }

      mat2 rotate2d(float angle) {
        float s = sin(angle);
        float c = cos(angle);
        return mat2(c, -s, s, c);
      }

      float lineField(vec2 uv, float timeShift) {
        vec2 p = uv;
        p.y += fbm(vec2(p.x * (2.4 + u_line_density), p.y * 1.2 + timeShift)) * (0.18 + u_turbulence * 0.22);
        float lines = sin((p.y + timeShift * 0.12) * (14.0 + u_line_density * 20.0));
        return smoothstep(0.82 - u_softness * 0.18, 1.0, abs(lines));
      }

      float inverseRamp(float edge0, float edge1, float value) {
        return 1.0 - smoothstep(edge0, edge1, value);
      }

      float ringField(vec2 uv, vec2 center, float radius, float width) {
        float d = abs(length(uv - center) - radius);
        return inverseRamp(0.0, width, d);
      }

      float nodeField(vec2 uv, vec2 center, float radius) {
        float d = length(uv - center);
        return inverseRamp(0.0, radius, d);
      }



      float sdEllipse(vec2 p, vec2 radius) {
        vec2 clampedRadius = max(radius, vec2(0.001));
        vec2 q = p / clampedRadius;
        return (length(q) - 1.0) * min(clampedRadius.x, clampedRadius.y);
      }

      vec2 driftOffset(float t, float seed, vec2 amplitude) {
        return vec2(
          sin(t * (0.18 + seed * 0.07) + seed * 3.1),
          cos(t * (0.14 + seed * 0.05) + seed * 2.3)
        ) * amplitude;
      }

      vec2 organismDrift(float t, float seed, vec2 amplitude) {
        float driftScale = 1.0 + u_flow * 0.6 + u_breath * 0.42;
        vec2 primary = driftOffset(t * (0.92 + u_speed * 0.34), seed, amplitude * driftScale);
        vec2 secondary = vec2(
          sin(t * (0.34 + seed * 0.05) + seed * 1.2),
          cos(t * (0.28 + seed * 0.04) + seed * 2.1)
        ) * (amplitude * (0.42 + u_breath * 0.2));
        return primary + secondary;
      }

      float organismDistance(vec2 uv, vec2 center, float t, float seed, vec2 radiusA, vec2 radiusB) {
        vec2 p = uv - center;
        p -= driftOffset(t, seed, vec2(0.028, 0.014));
        p = rotate2d(
          sin(t * (0.11 + seed * 0.03) + seed) * 0.12 +
          cos(t * (0.07 + seed * 0.02) + seed * 0.6) * 0.06
        ) * p;

        float macro = fbm(p * (1.6 + u_density * 0.7) + vec2(t * 0.06, -t * 0.05));
        float detail = fbm(p * (2.9 + u_connection_density * 0.5) - vec2(t * 0.09, t * 0.07) + 2.7);

        vec2 warpA = p;
        warpA.x += sin(p.y * (5.0 + seed) + t * (0.9 + u_flow * 0.3) + seed) * (0.018 + u_flow * 0.012);
        warpA.y += cos(p.x * (4.3 + seed * 0.8) - t * (0.82 + u_turbulence * 0.28) + seed * 1.3) * (0.014 + u_turbulence * 0.012);

        vec2 warpB = p * rotate2d(0.42 + sin(t * 0.21 + seed) * 0.08);
        warpB.x += sin(warpB.y * 7.0 - t * 0.72 + seed) * 0.012;
        warpB.y += cos(warpB.x * 6.0 + t * 0.66 + seed * 1.5) * 0.01;

        float shape1 = sdEllipse(warpA, radiusA);
        float shape2 = sdEllipse(warpB, radiusB);
        float combined = min(shape1, shape2 + 0.01);
        combined += (macro - 0.5) * 0.035;
        combined += (detail - 0.5) * 0.015;
        return combined;
      }

      float spectralBand(vec2 p, float t, float phase, float scale) {
        float band = sin(p.x * (5.0 + scale * 3.0) + p.y * (2.0 + scale * 1.5) + t * (0.55 + scale * 0.24) + phase);
        band += sin(p.y * (6.4 + scale * 2.0) - t * (0.42 + scale * 0.18) + phase * 1.7) * 0.5;
        return smoothstep(0.52, 0.9, band * 0.5 + 0.5);
      }

      float ribbonField(vec2 p, float t, float phase, float tilt, float width) {
        vec2 q = rotate2d(tilt) * p;
        q.y += sin(q.x * (5.4 + u_wave_layers * 0.7) + t * (0.92 + u_speed * 0.52) + phase) * (0.03 + u_flow * 0.016);
        q.y += sin(q.x * 10.8 - t * (0.66 + u_breath * 0.5) + phase * 1.7) * 0.01;
        return inverseRamp(0.0, width, abs(q.y));
      }

      float shimmerField(vec2 p, float t, float phase) {
        float shimmer = fbm(p * (3.0 + u_density) + vec2(t * 0.1, -t * 0.08) + phase);
        shimmer += fbm(p * (5.4 + u_connection_density * 0.7) - vec2(t * 0.14, t * 0.11) + phase * 1.9) * 0.4;
        return smoothstep(0.66, 0.96, shimmer);
      }

      float corePulse(vec2 p, float t, vec2 scale, float rate) {
        return inverseRamp(0.0, 0.22, length(p * scale)) * (0.64 + 0.36 * sin(t * rate));
      }

      vec2 travelPath(float t, float seed, vec2 span) {
        float pace = 0.16 + u_speed * 0.08 + seed * 0.01;
        return vec2(
          sin(t * pace + seed * 1.7) * span.x + cos(t * (pace * 0.53) + seed * 2.2) * span.x * 0.22,
          cos(t * (pace * 0.81) + seed * 1.1) * span.y + sin(t * (pace * 0.37) + seed * 0.9) * span.y * 0.18
        );
      }

      vec2 localField(vec2 frameUv, vec2 center, float aspect, float t, float seed, float angle) {
        vec2 q = frameUv - center;
        q.x *= aspect;
        q = rotate2d(angle + sin(t * 0.17 + seed) * 0.12) * q;
        q += vec2(
          sin(q.y * (7.0 + seed * 0.3) + t * (0.9 + u_flow * 0.2) + seed) * (0.004 + u_turbulence * 0.003),
          cos(q.x * (5.4 + seed * 0.2) - t * (0.68 + u_breath * 0.18) + seed * 1.4) * (0.003 + u_flow * 0.002)
        );
        return q;
      }

      float ellipseMask(vec2 p, vec2 radius, float edge) {
        return 1.0 - smoothstep(-edge, edge, sdEllipse(p, radius));
      }

      float haloMask(vec2 p, vec2 radius) {
        float outer = ellipseMask(p, radius * 1.16, 0.02);
        float inner = ellipseMask(p, radius * 0.98, 0.016);
        return clamp(outer - inner, 0.0, 1.0);
      }

      float auraMask(vec2 p, vec2 radius, float body) {
        float aura = ellipseMask(p, radius * 1.32, 0.028);
        return clamp(aura - body * 0.58, 0.0, 1.0);
      }

      float bandLine(vec2 p, float t, float phase, float slope, float width) {
        float line = p.y + slope * p.x;
        line += sin(p.x * 8.0 + t * 0.9 + phase) * 0.008;
        line += cos(p.x * 4.0 - t * 0.6 + phase * 1.4) * 0.004;
        return inverseRamp(0.0, width, abs(line));
      }

      float smallCore(vec2 p, float t, vec2 scale, float rate) {
        return inverseRamp(0.0, 0.12, length(p * scale)) * (0.78 + 0.22 * sin(t * rate));
      }

      float scalePulse(float t, float seed) {
        float primary = sin(t * (1.12 + u_pulse * 0.92 + seed * 0.15) + seed * 4.2);
        float secondary = cos(t * (1.58 + u_flow * 0.74 + seed * 0.11) + seed * 2.6);
        float tertiary = sin(t * (2.08 + u_turbulence * 0.62 + seed * 0.08) + seed * 5.1) * 0.05;
        return clamp(
          1.22 + primary * (0.42 + u_pulse * 0.18) + secondary * 0.2 + tertiary,
          1.02,
          2.55
        );
      }

      float organismScaleBoost() {
        return 1.76 + u_pulse * 0.18 + u_depth * 0.16;
      }

      vec2 swarmOffset(float t, float seed, vec2 span) {
        float orbitScale = 1.04 + u_flow * 0.44 + u_breath * 0.3;
        vec2 primary = vec2(
          sin(t * (0.64 + seed * 0.08) + seed * 2.3),
          cos(t * (0.57 + seed * 0.06) + seed * 1.7)
        ) * span * orbitScale;
        vec2 secondary = vec2(
          cos(t * (1.22 + seed * 0.11) + seed * 3.8),
          sin(t * (1.04 + seed * 0.09) + seed * 2.9)
        ) * span * 0.52 * orbitScale;
        vec2 jitter = vec2(
          sin(t * (2.24 + seed * 0.17) + seed * 5.2),
          cos(t * (1.92 + seed * 0.13) + seed * 4.4)
        ) * span * (0.12 + u_turbulence * 0.09);
        return primary + secondary + jitter;
      }

      vec2 spiralOffset(float t, float seed, vec2 span) {
        float angle = t * (0.52 + seed * 0.04) + seed * 6.1;
        float radius = 0.68 + 0.32 * sin(t * (0.94 + seed * 0.07) + seed * 2.7);
        vec2 orbit = vec2(cos(angle), sin(angle * 1.12 + seed * 0.3)) * span * radius;
        vec2 wobble = vec2(
          sin(t * (1.64 + seed * 0.08) + seed * 4.1),
          cos(t * (1.22 + seed * 0.06) + seed * 5.3)
        ) * span * 0.2;
        return orbit + wobble;
      }

      vec2 flutterOffset(float t, float seed, vec2 span) {
        vec2 broad = vec2(
          sin(t * (1.18 + seed * 0.12) + seed * 3.1),
          cos(t * (0.96 + seed * 0.09) + seed * 2.4)
        ) * span;
        vec2 flutter = vec2(
          sin(t * (3.42 + seed * 0.18) + seed * 5.9),
          cos(t * (3.08 + seed * 0.14) + seed * 4.6)
        ) * span * 0.36;
        return broad + flutter;
      }

      vec2 streamOffset(float t, float seed, vec2 span) {
        return vec2(
          sin(t * (0.42 + seed * 0.04) + seed * 1.3) * span.x,
          sin(t * (1.28 + seed * 0.08) + seed * 4.7) * span.y * 0.48 +
          cos(t * (0.82 + seed * 0.06) + seed * 2.2) * span.y * 0.32
        );
      }

      vec3 cyclePalette(vec3 a, vec3 b, vec3 c, float t, float seed) {
        float mixAB = 0.5 + 0.5 * sin(t * (1.34 + u_pulse * 0.82 + seed * 0.18) + seed * 4.1);
        float mixBC = 0.5 + 0.5 * cos(t * (1.72 + u_flow * 0.64 + seed * 0.14) + seed * 2.7);
        float remix = 0.5 + 0.5 * sin(t * (2.18 + u_turbulence * 0.7) + seed * 5.3);
        vec3 ab = mix(a, b, mixAB);
        vec3 ca = mix(c, a, remix * 0.46);
        return mix(ab, ca, 0.24 + mixBC * 0.56);
      }

      vec3 prismFlash(float t, float seed) {
        vec3 warm = cyclePalette(u_glow, u_accent, u_surface, t * 1.06 + 0.4, seed + 0.7);
        vec3 cool = cyclePalette(u_accent_soft, u_surface, u_secondary, t * 1.18 + 0.2, seed + 1.3);
        float shift = 0.5 + 0.5 * sin(t * (2.56 + u_pulse * 0.94 + seed * 0.17) + seed * 6.2);
        return mix(warm, cool, shift);
      }

      float haloBand(float distance, float innerRadius, float outerRadius) {
        float outer = inverseRamp(0.0, outerRadius, distance);
        float inner = inverseRamp(0.0, innerRadius, distance);
        return clamp(outer - inner, 0.0, 1.0);
      }

      float segmentDistance(vec2 p, vec2 a, vec2 b) {
        vec2 pa = p - a;
        vec2 ba = b - a;
        float denom = max(dot(ba, ba), 0.0001);
        float h = clamp(dot(pa, ba) / denom, 0.0, 1.0);
        return length(pa - ba * h);
      }

      vec4 pointerReactiveLayer(vec2 frameUv, float aspect, float t) {
        float influence = clamp(u_pointer_strength, 0.0, 1.0);
        vec2 pointer = vec2(clamp(u_pointer.x, -1.0, 1.0), clamp(u_pointer.y, -1.0, 1.0));
        vec2 target = vec2(clamp(u_pointer_target.x, -1.0, 1.0), clamp(u_pointer_target.y, -1.0, 1.0));

        vec2 pointerPos = pointer;
        vec2 targetPos = target;
        vec2 point = frameUv;
        pointerPos.x *= aspect;
        targetPos.x *= aspect;
        point.x *= aspect;

        vec2 local = point - pointerPos;
        vec2 localTarget = point - targetPos;
        float distanceToOrb = length(local);
        float distanceToTarget = length(localTarget);

        float haze = inverseRamp(0.0, 1.38, distanceToOrb);
        float orb = inverseRamp(0.0, 0.94, distanceToOrb);
        float core = inverseRamp(0.0, 0.34, distanceToOrb);
        float ring = haloBand(distanceToOrb, 0.22, 0.72);
        float targetBloom = inverseRamp(0.0, 0.56, distanceToTarget) * influence;
        float pulse = 0.94 + 0.06 * sin(t * 0.7);

        vec3 pointerColor = mix(u_surface, u_accent_soft, 0.58);
        pointerColor = mix(pointerColor, u_glow, 0.34);
        pointerColor = mix(pointerColor, u_accent, 0.18);

        vec3 color = vec3(0.0);
        color += pointerColor * haze * (0.048 + influence * 0.088) * pulse;
        color += mix(pointerColor, u_surface, 0.48) * orb * (0.04 + influence * 0.068);
        color += mix(u_surface, pointerColor, 0.64) * core * (0.032 + influence * 0.048);
        color += mix(pointerColor, u_glow, 0.32) * ring * (0.016 + influence * 0.026);
        color += mix(u_surface, pointerColor, 0.42) * targetBloom * (0.012 + influence * 0.022);

        float alpha = clamp(haze * 0.34 + orb * 0.3 + targetBloom * 0.18, 0.0, 1.0) * influence;
        return vec4(color, alpha);
      }

      vec3 screenBlend(vec3 base, vec3 layer) {
        return 1.0 - (1.0 - base) * (1.0 - clamp(layer, 0.0, 1.0));
      }

      float blobMid(vec2 p, vec2 radius) {
        return ellipseMask(p, radius * vec2(0.78, 0.8), 0.009);
      }

      float blobCore(vec2 p, vec2 radius) {
        return ellipseMask(p, radius * vec2(0.46, 0.5), 0.007);
      }

      float blobHotspot(vec2 p, vec2 radius, float seed) {
        vec2 offset = vec2(
          radius.x * (0.14 * sin(seed * 3.1) + 0.08),
          radius.y * (0.12 * cos(seed * 2.3) - 0.04)
        );
        return nodeField(p, offset, radius.y * 0.34);
      }

      vec4 renderVoiceOrganism(vec2 frameUv, vec2 center, float aspect, float t, float seed, vec2 radius) {
        float scale = scalePulse(t, seed);
        float sizeBoost = organismScaleBoost();
        vec2 local = localField(frameUv, center, aspect, t, seed, 0.08 + seed * 0.06);
        vec2 scaledRadius = radius * sizeBoost * vec2(scale, 0.92 + 0.08 * sin(t * 1.1 + seed * 3.0));
        float body = ellipseMask(local, scaledRadius, 0.009);
        float mid = blobMid(local, scaledRadius);
        float inner = ellipseMask(local, scaledRadius * vec2(0.58, 0.58), 0.008);
        float coreBody = blobCore(local, scaledRadius) * inner;
        float hotspot = blobHotspot(local, scaledRadius, seed) * inner;
        float halo = haloMask(local, scaledRadius);
        float aura = auraMask(local, scaledRadius, body);
        float rings = ringField(local, vec2(0.0), scaledRadius.y * 0.72 + sin(t * 0.74 + seed) * 0.003, 0.004) * body;
        rings += ringField(local, vec2(0.0), scaledRadius.y * 1.18 + sin(t * 0.59 + seed * 1.4) * 0.004, 0.005) * body;
        float ribbon = bandLine(local, t, seed * 2.1, 0.08, 0.01) * body;
        float shimmer = shimmerField(local * 1.8, t * 0.8, seed) * inner;
        float core = smallCore(local, t, vec2(1.0, 0.92), 1.18 + seed * 0.08) * inner;
        vec3 shell = cyclePalette(u_primary, u_accent_soft, u_surface, t, seed);
        vec3 highlight = cyclePalette(u_accent_soft, u_glow, u_surface, t + 0.6, seed + 0.3);
        vec3 prism = prismFlash(t, seed);

        vec3 color = vec3(0.0);
        color += mix(u_secondary, shell, 0.46) * aura * 0.06;
        color += shell * body * 0.05;
        color += mix(shell, prism, 0.36) * mid * 0.128;
        color += mix(shell, highlight, smoothstep(-scaledRadius.x, scaledRadius.x, local.x)) * inner * 0.138;
        color += mix(highlight, prism, 0.34) * coreBody * 0.18;
        color += mix(u_surface, prism, 0.7) * hotspot * 0.24;
        color += mix(u_primary, u_surface, 0.32) * rings * 0.1;
        color += mix(highlight, prism, 0.28) * ribbon * 0.14;
        color += mix(prism, u_surface, 0.38) * shimmer * 0.13;
        color += mix(u_glow, prism, 0.26) * core * 0.25;
        color += mix(prism, u_surface, 0.28) * halo * 0.05;
        color += mix(u_accent_soft, u_surface, 0.4) * aura * 0.075;
        return vec4(color, max(body, aura * 0.42));
      }

      vec4 renderCaptureOrganism(vec2 frameUv, vec2 center, float aspect, float t, float seed, vec2 radius) {
        float scale = scalePulse(t + 0.3, seed);
        float sizeBoost = organismScaleBoost();
        vec2 local = localField(frameUv, center, aspect, t, seed, 0.03 + seed * 0.04);
        vec2 scaledRadius = radius * sizeBoost * vec2(scale, 0.9 + 0.09 * cos(t * 1.0 + seed * 2.1));
        float body = ellipseMask(local, scaledRadius, 0.009);
        float mid = blobMid(local, scaledRadius);
        float inner = ellipseMask(local, scaledRadius * vec2(0.56, 0.56), 0.008);
        float coreBody = blobCore(local, scaledRadius) * inner;
        float hotspot = blobHotspot(local, scaledRadius, seed + 0.2) * inner;
        float halo = haloMask(local, scaledRadius);
        float aura = auraMask(local, scaledRadius, body);

        float fragments = 0.0;
        for (int i = 0; i < 6; i++) {
          float fi = float(i);
          vec2 pos = vec2(
            sin(t * (0.44 + fi * 0.02) + seed * 2.7 + fi * 1.21) * scaledRadius.x * 0.55,
            cos(t * (0.36 + fi * 0.02) + seed * 1.8 + fi * 1.07) * scaledRadius.y * 0.5
          );
          fragments += nodeField(local, pos, 0.005 + 0.0015 * hash(vec2(fi, seed)));
        }

        float captureBand = bandLine(local, t, seed * 1.9, -0.12, 0.01) * body;
        float ribbon = ribbonField(local * 1.3, t, seed, -0.2, 0.02) * inner;
        float core = smallCore(local, t, vec2(1.0, 0.98), 1.0 + seed * 0.06) * inner;
        vec3 shell = cyclePalette(u_primary, u_accent, u_surface, t, seed);
        vec3 flash = cyclePalette(u_accent, u_glow, u_surface, t + 0.5, seed + 0.28);
        vec3 prism = prismFlash(t, seed + 0.16);

        vec3 color = vec3(0.0);
        color += mix(u_secondary, shell, 0.44) * aura * 0.06;
        color += shell * body * 0.048;
        color += mix(shell, prism, 0.38) * mid * 0.126;
        color += mix(shell, flash, smoothstep(-scaledRadius.y, scaledRadius.y, local.y)) * inner * 0.138;
        color += mix(flash, prism, 0.32) * coreBody * 0.17;
        color += mix(u_surface, prism, 0.68) * hotspot * 0.23;
        color += mix(u_primary, flash, 0.42) * fragments * 0.11;
        color += mix(flash, prism, 0.26) * captureBand * 0.13;
        color += mix(prism, u_surface, 0.3) * ribbon * 0.13;
        color += mix(u_surface, prism, 0.34) * core * 0.22;
        color += mix(prism, u_surface, 0.26) * halo * 0.045;
        color += mix(u_accent, u_surface, 0.36) * aura * 0.072;
        return vec4(color, max(body, aura * 0.4));
      }

      vec4 renderPatternOrganism(vec2 frameUv, vec2 center, float aspect, float t, float seed, vec2 radius) {
        float scale = scalePulse(t + 0.6, seed);
        float sizeBoost = organismScaleBoost();
        vec2 local = localField(frameUv, center, aspect, t, seed, 0.18 + seed * 0.05);
        vec2 scaledRadius = radius * sizeBoost * vec2(scale, 0.9 + 0.08 * sin(t * 0.9 + seed * 3.2));
        float body = ellipseMask(local, scaledRadius, 0.009);
        float mid = blobMid(local, scaledRadius);
        float inner = ellipseMask(local, scaledRadius * vec2(0.58, 0.6), 0.008);
        float coreBody = blobCore(local, scaledRadius) * inner;
        float hotspot = blobHotspot(local, scaledRadius, seed + 0.35) * inner;
        float halo = haloMask(local, scaledRadius);
        float aura = auraMask(local, scaledRadius, body);
        float stripeA = bandLine(local, t, seed * 2.2, 0.18, 0.009) * body;
        float stripeB = bandLine(local, t, seed * 2.7 + 1.2, -0.16, 0.009) * body;
        float contour = smoothstep(0.72, 0.96, fbm(local * 6.5 + vec2(t * 0.18, -t * 0.12) + seed)) * inner;
        float shimmer = shimmerField(local * 1.7, t, seed + 0.5) * inner;
        float core = smallCore(local, t, vec2(1.08, 0.94), 1.12 + seed * 0.07) * inner;
        vec3 shell = cyclePalette(u_primary, u_accent_soft, u_glow, t, seed);
        vec3 flash = cyclePalette(u_accent_soft, u_surface, u_glow, t + 0.3, seed + 0.2);
        vec3 prism = prismFlash(t, seed + 0.24);

        vec3 color = vec3(0.0);
        color += mix(u_secondary, shell, 0.44) * aura * 0.055;
        color += shell * body * 0.048;
        color += mix(shell, prism, 0.38) * mid * 0.124;
        color += mix(shell, flash, smoothstep(-scaledRadius.x, scaledRadius.x, local.x)) * inner * 0.134;
        color += mix(flash, prism, 0.3) * coreBody * 0.17;
        color += mix(u_surface, prism, 0.68) * hotspot * 0.22;
        color += u_accent_soft * stripeA * 0.12;
        color += mix(u_primary, prism, 0.4) * stripeB * 0.1;
        color += mix(u_surface, u_accent_soft, 0.5) * contour * 0.07;
        color += mix(flash, prism, 0.24) * shimmer * 0.13;
        color += mix(u_surface, prism, 0.3) * core * 0.18;
        color += mix(prism, u_surface, 0.24) * halo * 0.04;
        color += mix(u_accent_soft, u_surface, 0.32) * aura * 0.068;
        return vec4(color, max(body, aura * 0.4));
      }

      vec4 renderGraphOrganism(vec2 frameUv, vec2 center, float aspect, float t, float seed, vec2 radius) {
        float scale = scalePulse(t + 0.9, seed);
        float sizeBoost = organismScaleBoost();
        vec2 local = localField(frameUv, center, aspect, t, seed, 0.02 + seed * 0.03);
        vec2 scaledRadius = radius * sizeBoost * vec2(scale, 0.92 + 0.08 * cos(t * 0.86 + seed * 2.5));
        float body = ellipseMask(local, scaledRadius, 0.009);
        float mid = blobMid(local, scaledRadius);
        float inner = ellipseMask(local, scaledRadius * vec2(0.56, 0.6), 0.008);
        float coreBody = blobCore(local, scaledRadius) * inner;
        float hotspot = blobHotspot(local, scaledRadius, seed + 0.14) * inner;
        float halo = haloMask(local, scaledRadius);
        float aura = auraMask(local, scaledRadius, body);

        vec2 n0 = vec2(-scaledRadius.x * 0.4, -scaledRadius.y * 0.16);
        vec2 n1 = vec2(-scaledRadius.x * 0.14, scaledRadius.y * 0.32);
        vec2 n2 = vec2(scaledRadius.x * 0.18, -scaledRadius.y * 0.28);
        vec2 n3 = vec2(scaledRadius.x * 0.44, scaledRadius.y * 0.14);
        float nodes = nodeField(local, n0, 0.006) + nodeField(local, n1, 0.006) + nodeField(local, n2, 0.006) + nodeField(local, n3, 0.006);

        vec2 pa = local - n0;
        vec2 ba = n1 - n0;
        float h0 = clamp(dot(pa, ba) / max(dot(ba, ba), 0.0001), 0.0, 1.0);
        float link0 = inverseRamp(0.0, 0.0045, length(pa - ba * h0));

        pa = local - n1;
        ba = n2 - n1;
        float h1 = clamp(dot(pa, ba) / max(dot(ba, ba), 0.0001), 0.0, 1.0);
        float link1 = inverseRamp(0.0, 0.0045, length(pa - ba * h1));

        pa = local - n2;
        ba = n3 - n2;
        float h2 = clamp(dot(pa, ba) / max(dot(ba, ba), 0.0001), 0.0, 1.0);
        float link2 = inverseRamp(0.0, 0.0045, length(pa - ba * h2));

        float core = smallCore(local, t, vec2(1.04, 0.96), 1.06 + seed * 0.06) * inner;
        vec3 shell = cyclePalette(u_primary, u_accent_soft, u_surface, t, seed);
        vec3 flash = cyclePalette(u_accent_soft, u_glow, u_surface, t + 0.5, seed + 0.22);
        vec3 prism = prismFlash(t, seed + 0.12);

        vec3 color = vec3(0.0);
        color += mix(u_secondary, shell, 0.42) * aura * 0.052;
        color += shell * body * 0.046;
        color += mix(shell, prism, 0.36) * mid * 0.116;
        color += mix(shell, flash, 0.52) * inner * 0.118;
        color += mix(flash, prism, 0.28) * coreBody * 0.16;
        color += mix(u_surface, prism, 0.66) * hotspot * 0.2;
        color += mix(u_primary, prism, 0.34) * (link0 + link1 + link2) * body * 0.09;
        color += mix(flash, prism, 0.3) * nodes * 0.14;
        color += mix(u_surface, prism, 0.3) * core * 0.17;
        color += mix(prism, u_surface, 0.24) * halo * 0.04;
        color += mix(u_accent_soft, u_surface, 0.32) * aura * 0.068;
        return vec4(color, max(body, aura * 0.4));
      }

      vec4 renderEmotionOrganism(vec2 frameUv, vec2 center, float aspect, float t, float seed, vec2 radius) {
        float scale = scalePulse(t + 1.2, seed);
        float sizeBoost = organismScaleBoost();
        vec2 local = localField(frameUv, center, aspect, t, seed, -0.12 + seed * 0.04);
        vec2 scaledRadius = radius * sizeBoost * vec2(scale, 0.92 + 0.08 * sin(t * 1.16 + seed * 2.8));
        float body = ellipseMask(local, scaledRadius, 0.009);
        float mid = blobMid(local, scaledRadius);
        float inner = ellipseMask(local, scaledRadius * vec2(0.58, 0.62), 0.008);
        float coreBody = blobCore(local, scaledRadius) * inner;
        float hotspot = blobHotspot(local, scaledRadius, seed + 0.4) * inner;
        float halo = haloMask(local, scaledRadius);
        float aura = auraMask(local, scaledRadius, body);
        float bandA = bandLine(local, t, seed * 2.0, 0.05, 0.01) * body;
        float bandB = bandLine(local, t, seed * 2.5 + 1.0, -0.09, 0.01) * body;
        float shimmer = shimmerField(local * 1.6, t * 0.9, seed) * inner;
        float core = smallCore(local, t, vec2(1.0, 0.9), 0.92 + seed * 0.05) * inner;
        vec3 shell = cyclePalette(u_primary, u_accent, u_accent_soft, t, seed);
        vec3 flash = cyclePalette(u_glow, u_accent, u_surface, t + 0.55, seed + 0.18);
        vec3 prism = prismFlash(t, seed + 0.3);

        vec3 color = vec3(0.0);
        color += mix(u_secondary, shell, 0.46) * aura * 0.058;
        color += shell * body * 0.05;
        color += mix(shell, prism, 0.4) * mid * 0.13;
        color += mix(shell, flash, smoothstep(-scaledRadius.y, scaledRadius.y, local.y)) * inner * 0.138;
        color += mix(flash, prism, 0.32) * coreBody * 0.17;
        color += mix(u_surface, prism, 0.68) * hotspot * 0.23;
        color += mix(u_accent_soft, prism, 0.38) * bandA * 0.11;
        color += mix(flash, prism, 0.26) * bandB * 0.12;
        color += mix(u_surface, prism, 0.3) * core * 0.18;
        color += mix(prism, u_surface, 0.34) * shimmer * 0.13;
        color += mix(prism, u_surface, 0.26) * halo * 0.046;
        color += mix(u_accent, u_surface, 0.36) * aura * 0.076;
        return vec4(color, max(body, aura * 0.42));
      }

      vec4 renderContinuityOrganism(vec2 frameUv, vec2 center, float aspect, float t, float seed, vec2 radius) {
        float scale = scalePulse(t + 1.5, seed);
        float sizeBoost = organismScaleBoost();
        vec2 local = localField(frameUv, center, aspect, t, seed, 0.01 + seed * 0.03);
        vec2 scaledRadius = radius * sizeBoost * vec2(scale, 0.9 + 0.08 * cos(t * 0.82 + seed * 2.1));
        float body = ellipseMask(local, scaledRadius, 0.008);
        float mid = blobMid(local, scaledRadius);
        float inner = ellipseMask(local, scaledRadius * vec2(0.62, 0.68), 0.007);
        float coreBody = blobCore(local, scaledRadius) * inner;
        float hotspot = blobHotspot(local, scaledRadius, seed + 0.12) * inner;
        float halo = haloMask(local, scaledRadius);
        float aura = auraMask(local, scaledRadius, body);
        float stream1 = bandLine(local, t, seed * 1.6, 0.0, 0.007) * body;
        float stream2 = bandLine(local, t, seed * 2.0 + 1.1, 0.0, 0.007) * body;
        float stream3 = bandLine(local, t, seed * 2.4 + 2.2, 0.0, 0.007) * body;
        float ribbon = ribbonField(local * 1.6, t, seed, 0.02, 0.018) * inner;
        float core = smallCore(local, t, vec2(1.16, 1.0), 0.82 + seed * 0.05) * inner;
        vec3 shell = cyclePalette(u_primary, u_secondary, u_accent, t, seed);
        vec3 flash = cyclePalette(u_accent, u_surface, u_glow, t + 0.42, seed + 0.2);
        vec3 prism = prismFlash(t, seed + 0.1);

        vec3 color = vec3(0.0);
        color += mix(u_secondary, shell, 0.42) * aura * 0.05;
        color += shell * body * 0.046;
        color += mix(shell, prism, 0.34) * mid * 0.108;
        color += mix(shell, flash, 0.36) * inner * 0.118;
        color += mix(flash, prism, 0.28) * coreBody * 0.15;
        color += mix(u_surface, prism, 0.64) * hotspot * 0.19;
        color += mix(u_primary, prism, 0.34) * (stream1 + stream2 + stream3) * 0.09;
        color += mix(prism, u_surface, 0.28) * ribbon * 0.11;
        color += mix(flash, prism, 0.28) * stream2 * 0.09;
        color += mix(u_surface, prism, 0.28) * core * 0.15;
        color += mix(prism, u_surface, 0.24) * halo * 0.038;
        color += mix(u_accent, u_surface, 0.3) * aura * 0.062;
        return vec4(color, max(body, aura * 0.38));
      }

      vec4 sceneVoice(vec2 frameUv, float aspect, float t) {
        vec2 anchor = travelPath(t, 0.3, vec2(0.44, 0.16)) + u_center_bias;
        vec4 a = renderVoiceOrganism(frameUv, anchor + spiralOffset(t, 0.24, vec2(0.11, 0.06)), aspect, t, 0.24, vec2(0.19, 0.1));
        vec4 b = renderVoiceOrganism(frameUv, anchor + spiralOffset(t + 1.1, 1.1, vec2(0.14, 0.08)), aspect, t, 1.1, vec2(0.16, 0.082));
        vec4 c = renderVoiceOrganism(frameUv, anchor + spiralOffset(t + 2.0, 1.92, vec2(0.12, 0.07)), aspect, t, 1.92, vec2(0.14, 0.072));
        vec2 clusterLocal = frameUv - anchor;
        clusterLocal.x *= aspect;
        float cluster = ellipseMask(clusterLocal, vec2(0.42, 0.22), 0.036);
        vec3 color = vec3(0.0);
        color = screenBlend(color, a.rgb);
        color = screenBlend(color, b.rgb);
        color = screenBlend(color, c.rgb);
        color = screenBlend(color, cyclePalette(u_surface, u_accent_soft, u_glow, t, 0.12) * cluster * 0.06);
        float alpha = max(a.a, max(b.a, c.a));
        return vec4(clamp(color, 0.0, 1.0), alpha);
      }

      vec4 sceneCapture(vec2 frameUv, float aspect, float t) {
        vec2 anchor = travelPath(t, 0.9, vec2(0.66, 0.24)) + u_center_bias;
        vec4 a = renderCaptureOrganism(frameUv, anchor + flutterOffset(t, 0.64, vec2(0.16, 0.09)), aspect, t, 0.64, vec2(0.17, 0.088));
        vec4 b = renderCaptureOrganism(frameUv, anchor + flutterOffset(t + 0.56, 1.48, vec2(0.18, 0.1)), aspect, t, 1.48, vec2(0.15, 0.076));
        vec4 c = renderCaptureOrganism(frameUv, anchor + flutterOffset(t + 1.08, 2.34, vec2(0.15, 0.09)), aspect, t, 2.34, vec2(0.134, 0.068));
        vec4 d = renderCaptureOrganism(frameUv, anchor + flutterOffset(t + 1.64, 3.08, vec2(0.17, 0.094)), aspect, t, 3.08, vec2(0.122, 0.06));
        vec4 e = renderCaptureOrganism(frameUv, anchor + flutterOffset(t + 2.18, 3.82, vec2(0.14, 0.082)), aspect, t, 3.82, vec2(0.112, 0.054));
        vec2 clusterLocal = frameUv - anchor;
        clusterLocal.x *= aspect;
        float cluster = ellipseMask(clusterLocal, vec2(0.46, 0.24), 0.038);
        vec3 color = vec3(0.0);
        color = screenBlend(color, a.rgb);
        color = screenBlend(color, b.rgb);
        color = screenBlend(color, c.rgb);
        color = screenBlend(color, d.rgb);
        color = screenBlend(color, e.rgb);
        color = screenBlend(color, prismFlash(t, 0.42) * cluster * 0.055);
        float alpha = max(max(a.a, b.a), max(c.a, max(d.a, e.a)));
        return vec4(clamp(color, 0.0, 1.0), alpha);
      }

      vec4 scenePattern(vec2 frameUv, float aspect, float t) {
        vec2 anchor = travelPath(t, 1.4, vec2(0.7, 0.24)) + u_center_bias;
        vec4 a = renderPatternOrganism(frameUv, anchor + spiralOffset(t, 0.92, vec2(0.18, 0.1)), aspect, t, 0.92, vec2(0.155, 0.08));
        vec4 b = renderPatternOrganism(frameUv, anchor + spiralOffset(t + 0.7, 1.76, vec2(0.2, 0.11)), aspect, t, 1.76, vec2(0.138, 0.07));
        vec4 c = renderPatternOrganism(frameUv, anchor + spiralOffset(t + 1.38, 2.58, vec2(0.17, 0.098)), aspect, t, 2.58, vec2(0.126, 0.064));
        vec4 d = renderPatternOrganism(frameUv, anchor + spiralOffset(t + 2.1, 3.34, vec2(0.19, 0.104)), aspect, t, 3.34, vec2(0.116, 0.058));
        vec4 e = renderPatternOrganism(frameUv, anchor + spiralOffset(t + 2.8, 4.06, vec2(0.16, 0.092)), aspect, t, 4.06, vec2(0.108, 0.054));
        vec4 f = renderPatternOrganism(frameUv, anchor + spiralOffset(t + 3.46, 4.78, vec2(0.18, 0.1)), aspect, t, 4.78, vec2(0.1, 0.05));
        vec2 clusterLocal = frameUv - anchor;
        clusterLocal.x *= aspect;
        float cluster = ellipseMask(clusterLocal, vec2(0.5, 0.26), 0.04);
        vec3 color = vec3(0.0);
        color = screenBlend(color, a.rgb);
        color = screenBlend(color, b.rgb);
        color = screenBlend(color, c.rgb);
        color = screenBlend(color, d.rgb);
        color = screenBlend(color, e.rgb);
        color = screenBlend(color, f.rgb);
        color = screenBlend(color, prismFlash(t, 0.66) * cluster * 0.06);
        float alpha = max(max(a.a, b.a), max(c.a, max(d.a, max(e.a, f.a))));
        return vec4(clamp(color, 0.0, 1.0), alpha);
      }

      vec4 sceneGraph(vec2 frameUv, float aspect, float t) {
        vec2 anchor = travelPath(t, 2.0, vec2(0.46, 0.18)) + u_center_bias;
        vec4 a = renderGraphOrganism(frameUv, anchor + vec2(-0.22, -0.09) + swarmOffset(t, 1.18, vec2(0.04, 0.026)), aspect, t, 1.18, vec2(0.16, 0.082));
        vec4 b = renderGraphOrganism(frameUv, anchor + vec2(-0.06, 0.14) + swarmOffset(t + 0.9, 2.04, vec2(0.046, 0.03)), aspect, t, 2.04, vec2(0.14, 0.072));
        vec4 c = renderGraphOrganism(frameUv, anchor + vec2(0.12, -0.12) + swarmOffset(t + 1.78, 2.86, vec2(0.042, 0.028)), aspect, t, 2.86, vec2(0.126, 0.064));
        vec4 d = renderGraphOrganism(frameUv, anchor + vec2(0.24, 0.08) + swarmOffset(t + 2.62, 3.62, vec2(0.044, 0.028)), aspect, t, 3.62, vec2(0.116, 0.058));
        vec2 clusterLocal = frameUv - anchor;
        clusterLocal.x *= aspect;
        float cluster = ellipseMask(clusterLocal, vec2(0.42, 0.22), 0.036);
        vec3 color = vec3(0.0);
        color = screenBlend(color, a.rgb);
        color = screenBlend(color, b.rgb);
        color = screenBlend(color, c.rgb);
        color = screenBlend(color, d.rgb);
        color = screenBlend(color, cyclePalette(u_surface, u_accent_soft, u_glow, t, 0.88) * cluster * 0.05);
        float alpha = max(max(a.a, b.a), max(c.a, d.a));
        return vec4(clamp(color, 0.0, 1.0), alpha);
      }

      vec4 sceneEmotion(vec2 frameUv, float aspect, float t) {
        vec2 anchor = travelPath(t, 2.7, vec2(0.4, 0.16)) + u_center_bias;
        vec4 a = renderEmotionOrganism(frameUv, anchor + spiralOffset(t, 1.46, vec2(0.09, 0.05)), aspect, t, 1.46, vec2(0.22, 0.116));
        vec4 b = renderEmotionOrganism(frameUv, anchor + spiralOffset(t + 1.3, 2.28, vec2(0.11, 0.064)), aspect, t, 2.28, vec2(0.18, 0.092));
        vec4 c = renderEmotionOrganism(frameUv, anchor + flutterOffset(t + 0.8, 3.04, vec2(0.12, 0.07)), aspect, t, 3.04, vec2(0.13, 0.064));
        vec2 clusterLocal = frameUv - anchor;
        clusterLocal.x *= aspect;
        float cluster = ellipseMask(clusterLocal, vec2(0.44, 0.24), 0.038);
        vec3 color = vec3(0.0);
        color = screenBlend(color, a.rgb);
        color = screenBlend(color, b.rgb);
        color = screenBlend(color, c.rgb);
        color = screenBlend(color, prismFlash(t, 1.1) * cluster * 0.065);
        float alpha = max(a.a, max(b.a, c.a));
        return vec4(clamp(color, 0.0, 1.0), alpha);
      }

      vec4 sceneContinuity(vec2 frameUv, float aspect, float t) {
        vec2 anchor = travelPath(t, 3.2, vec2(0.72, 0.12)) + u_center_bias;
        vec4 a = renderContinuityOrganism(frameUv, anchor + streamOffset(t, 1.7, vec2(0.2, 0.06)), aspect, t, 1.7, vec2(0.21, 0.07));
        vec4 b = renderContinuityOrganism(frameUv, anchor + streamOffset(t + 0.82, 2.46, vec2(0.24, 0.07)), aspect, t, 2.46, vec2(0.182, 0.058));
        vec4 c = renderContinuityOrganism(frameUv, anchor + streamOffset(t + 1.62, 3.18, vec2(0.22, 0.068)), aspect, t, 3.18, vec2(0.166, 0.052));
        vec4 d = renderContinuityOrganism(frameUv, anchor + streamOffset(t + 2.38, 3.94, vec2(0.25, 0.074)), aspect, t, 3.94, vec2(0.152, 0.046));
        vec2 clusterLocal = frameUv - anchor;
        clusterLocal.x *= aspect;
        float cluster = ellipseMask(clusterLocal, vec2(0.48, 0.16), 0.034);
        vec3 color = vec3(0.0);
        color = screenBlend(color, a.rgb);
        color = screenBlend(color, b.rgb);
        color = screenBlend(color, c.rgb);
        color = screenBlend(color, d.rgb);
        color = screenBlend(color, cyclePalette(u_surface, u_glow, u_accent, t, 1.34) * cluster * 0.05);
        float alpha = max(max(a.a, b.a), max(c.a, d.a));
        return vec4(clamp(color, 0.0, 1.0), alpha);
      }

      void main() {
        vec2 frameUv = (gl_FragCoord.xy / u_resolution.xy) * 2.0 - 1.0;
        float aspect = u_resolution.x / max(u_resolution.y, 1.0);
        float t = u_time * (0.82 + u_speed * 1.18);

        vec4 scene;
        if (u_scene_type < 0.5) {
          scene = sceneVoice(frameUv, aspect, t);
        } else if (u_scene_type < 1.5) {
          scene = sceneCapture(frameUv, aspect, t);
        } else if (u_scene_type < 2.5) {
          scene = scenePattern(frameUv, aspect, t);
        } else if (u_scene_type < 3.5) {
          scene = sceneGraph(frameUv, aspect, t);
        } else if (u_scene_type < 4.5) {
          scene = sceneEmotion(frameUv, aspect, t);
        } else {
          scene = sceneContinuity(frameUv, aspect, t);
        }

        vec4 pointerLayer = pointerReactiveLayer(frameUv, aspect, t);
        vec3 finalColor = clamp(u_bg + scene.rgb * (1.0 + scene.a * 0.72), 0.0, 1.0);
        finalColor = screenBlend(finalColor, pointerLayer.rgb * (0.32 + pointerLayer.a * 0.54));
        gl_FragColor = vec4(finalColor, 1.0);
      }
    `;
  }

  function getSceneTypeIndex(sceneType) {
    switch (sceneType) {
      case 'voice_resonance_field':
        return 0;
      case 'memory_capture_field':
        return 1;
      case 'pattern_reveal_field':
        return 2;
      case 'graph_navigation_field':
        return 3;
      case 'emotional_drift_field':
        return 4;
      case 'continuity_flow_field':
        return 5;
      default:
        return 0;
    }
  }

  class FeaturedFunctionShaderScene {
    constructor(node, sceneConfig) {
      this.node = node;
      this.sceneConfig = deepMerge(DEFAULT_SCENE, sceneConfig || {});
      this.core = null;
      this.animationFrame = null;
      this.destroyed = false;
      this.pointer = {
        x: 0.0,
        y: 0.0,
        rawX: 0.0,
        rawY: 0.0,
        vx: 0.0,
        vy: 0.0,
        strength: 0.0,
        targetStrength: 0.0
      };
      this.lastFrameSeconds = 0.0;
      this.onFrame = this.onFrame.bind(this);
      this.onWindowPointerMove = this.onWindowPointerMove.bind(this);
      this.onWindowPointerLeave = this.onWindowPointerLeave.bind(this);
    }

    mount() {
      if (!window.NeuroShaderCore || typeof window.NeuroShaderCore !== 'function') {
        console.warn('[home-featured-functions-shader] NeuroShaderCore is unavailable.');
        return;
      }

      this.core = new window.NeuroShaderCore({
        mount: this.node,
        fragmentShader: createFragmentSource(),
        transparent: Boolean(this.sceneConfig?.render?.transparent),
        contextAlpha: false,
        premultipliedAlpha: false,
        pixelRatioCap: Number(this.sceneConfig?.render?.pixel_ratio_cap || DEFAULT_SCENE.render.pixel_ratio_cap)
      });

      if (typeof this.core.mount === 'function') {
        this.core.mount();
      }

      window.addEventListener('pointermove', this.onWindowPointerMove, { passive: true });
      window.addEventListener('pointerleave', this.onWindowPointerLeave, { passive: true });
      this.animationFrame = requestAnimationFrame(this.onFrame);
    }

    onWindowPointerMove(event) {
      const rect = this.node.getBoundingClientRect();
      const normalizedX = ((event.clientX - rect.left) / Math.max(rect.width, 1)) * 2 - 1;
      const normalizedY = ((event.clientY - rect.top) / Math.max(rect.height, 1)) * -2 + 1;
      const interaction = this.sceneConfig.interaction || DEFAULT_SCENE.interaction;

      const overflowX = Math.max(Math.abs(normalizedX) - 1.0, 0.0);
      const overflowY = Math.max(Math.abs(normalizedY) - 1.0, 0.0);
      const overflowDistance = Math.hypot(overflowX, overflowY);
      const falloff = clamp(1.18 - overflowDistance * 0.9, 0.0, 1.0);

      this.pointer.rawX = clamp(normalizedX, -1.0, 1.0);
      this.pointer.rawY = clamp(normalizedY, -1.0, 1.0);
      this.pointer.targetStrength = clamp((interaction.pointer_influence || 0.1) * falloff * 8.0, 0.0, 1.0);
    }

    onWindowPointerLeave() {
      this.pointer.targetStrength = 0.0;
    }

    setUniform(name, value) {
      if (!this.core || typeof this.core.setUniform !== 'function') {
        return;
      }

      this.core.setUniform(name, value);
    }

    onFrame(time) {
      if (this.destroyed || !this.core) {
        return;
      }

      const palette = this.sceneConfig.palette || DEFAULT_SCENE.palette;
      const motion = this.sceneConfig.motion || DEFAULT_SCENE.motion;
      const field = this.sceneConfig.field || DEFAULT_SCENE.field;
      const geometry = this.sceneConfig.geometry || DEFAULT_SCENE.geometry;
      const interaction = this.sceneConfig.interaction || DEFAULT_SCENE.interaction;
      const frameSeconds = time * 0.001;
      const deltaSeconds = this.lastFrameSeconds > 0
        ? clamp(frameSeconds - this.lastFrameSeconds, 1 / 120, 1 / 18)
        : 1 / 60;
      const deltaFactor = deltaSeconds * 60.0;
      this.lastFrameSeconds = frameSeconds;

      const pointerSmoothing = clamp(1.0 - Number(interaction.pointer_smoothing || 0.982), 0.004, 0.02);
      const homeX = Math.sin(frameSeconds * (0.045 + Number(motion.flow || 0) * 0.03)) * 0.05;
      const homeY = Math.cos(frameSeconds * (0.04 + Number(motion.breath || 0) * 0.025)) * 0.035;
      const targetX = this.pointer.targetStrength > 0.01 ? this.pointer.rawX : homeX;
      const targetY = this.pointer.targetStrength > 0.01 ? this.pointer.rawY : homeY;
      const dx = targetX - this.pointer.x;
      const dy = targetY - this.pointer.y;
      const distance = Math.hypot(dx, dy) || 0.0001;
      const strength = this.pointer.strength;
      const spring = (0.0012 + Number(motion.flow || 0) * 0.0008 + strength * 0.0022) * deltaFactor;
      const wander = (0.00008 + strength * 0.00018) * deltaFactor;

      this.pointer.vx += dx * spring;
      this.pointer.vy += dy * spring;
      this.pointer.vx += Math.sin(frameSeconds * (0.44 + Number(motion.speed || 0) * 0.16) + targetY * 1.2) * wander;
      this.pointer.vy += Math.cos(frameSeconds * (0.38 + Number(motion.flow || 0) * 0.14) - targetX * 1.1) * wander;

      this.pointer.vx += (homeX - this.pointer.x) * (0.0007 + (1.0 - strength) * 0.0022) * deltaFactor;
      this.pointer.vy += (homeY - this.pointer.y) * (0.0007 + (1.0 - strength) * 0.0022) * deltaFactor;
      this.pointer.vx *= Math.max(0.94, 0.985 - deltaFactor * 0.004);
      this.pointer.vy *= Math.max(0.94, 0.985 - deltaFactor * 0.004);
      this.pointer.x = clamp(this.pointer.x + this.pointer.vx, -0.62, 0.62);
      this.pointer.y = clamp(this.pointer.y + this.pointer.vy, -0.62, 0.62);
      this.pointer.strength += (this.pointer.targetStrength - this.pointer.strength) * clamp(pointerSmoothing * deltaFactor * 0.42, 0.016, 0.1);

      this.setUniform('u_time', time * 0.001);
      this.setUniform('u_bg', hexToRgb(palette.background));
      this.setUniform('u_surface', hexToRgb(palette.surface));
      this.setUniform('u_primary', hexToRgb(palette.primary));
      this.setUniform('u_secondary', hexToRgb(palette.secondary));
      this.setUniform('u_accent', hexToRgb(palette.accent));
      this.setUniform('u_accent_soft', hexToRgb(palette.accent_soft));
      this.setUniform('u_glow', hexToRgb(palette.glow));

      this.setUniform('u_speed', Number(motion.speed || 0));
      this.setUniform('u_flow', Number(motion.flow || 0));
      this.setUniform('u_turbulence', Number(motion.turbulence || 0));
      this.setUniform('u_pulse', Number(motion.pulse || 0));
      this.setUniform('u_breath', Number(motion.breath || 0));
      this.setUniform('u_stability', Number(motion.stability || 0));

      this.setUniform('u_density', Number(field.density || 0));
      this.setUniform('u_contrast', Number(field.contrast || 0));
      this.setUniform('u_softness', Number(field.softness || 0));
      this.setUniform('u_grain', Number(field.grain || 0));
      this.setUniform('u_vignette', Number(field.vignette || 0));
      this.setUniform('u_depth', Number(field.depth || 0));

      this.setUniform('u_line_density', Number(geometry.line_density || 0));
      this.setUniform('u_connection_density', Number(geometry.connection_density || 0));
      this.setUniform('u_orbital_drift', Number(geometry.orbital_drift || 0));
      this.setUniform('u_wave_layers', Number(geometry.wave_layers || 0));
      this.setUniform('u_cluster_count', Number(geometry.cluster_count || 0));
      this.setUniform('u_node_count', Number(geometry.node_count || 0));
      this.setUniform('u_path_count', Number(geometry.path_count || 0));
      this.setUniform('u_center_bias', [
        Number(geometry.center_bias_x || 0),
        Number(geometry.center_bias_y || 0)
      ]);

      this.setUniform('u_pointer', [this.pointer.x, this.pointer.y]);
      this.setUniform('u_pointer_target', [targetX, targetY]);
      this.setUniform('u_pointer_strength', this.pointer.strength);
      this.setUniform('u_scene_type', getSceneTypeIndex(this.sceneConfig.scene_type));

      if (typeof this.core.render === 'function') {
        this.core.render();
      }

      this.animationFrame = requestAnimationFrame(this.onFrame);
    }

    destroy() {
      this.destroyed = true;
      window.removeEventListener('pointermove', this.onWindowPointerMove);
      window.removeEventListener('pointerleave', this.onWindowPointerLeave);

      if (this.animationFrame) {
        cancelAnimationFrame(this.animationFrame);
      }

      if (this.core && typeof this.core.destroy === 'function') {
        this.core.destroy();
      }
    }
  }

  function destroyFeaturedFunctionShaders(section) {
    const existingScenes = Array.isArray(section?.__featuredFunctionScenes)
      ? section.__featuredFunctionScenes
      : [];

    existingScenes.forEach((scene) => {
      if (scene && typeof scene.destroy === 'function') {
        scene.destroy();
      }
    });

    section.__featuredFunctionScenes = [];
    section.__featuredFunctionActiveIndex = null;
  }

  function getActiveSceneMount(section, preferredIndex = 0) {
    const cards = Array.from(section?.querySelectorAll('[data-home-featured-functions-card]') || []);
    if (!cards.length) return null;

    const normalizedIndex = Math.min(Math.max(Number(preferredIndex) || 0, 0), cards.length - 1);
    const activeCard = cards[normalizedIndex] || cards[0];
    return activeCard ? activeCard.querySelector(SCENE_SELECTOR) : null;
  }

  function getSection() {
    return document.querySelector(SECTION_SELECTOR);
  }

  function isLifecycleBound(section) {
    return section?.getAttribute(LIFECYCLE_BOUND_ATTRIBUTE) === 'true';
  }

  function markLifecycleBound(section) {
    section.setAttribute(LIFECYCLE_BOUND_ATTRIBUTE, 'true');
  }

  function initFeaturedFunctionShaders(section = document.querySelector(SECTION_SELECTOR), preferredIndex = 0) {
    if (!section) {
      return;
    }

    const normalizedIndex = Math.max(0, Number(preferredIndex) || 0);
    if (section.__featuredFunctionActiveIndex === normalizedIndex && Array.isArray(section.__featuredFunctionScenes) && section.__featuredFunctionScenes.length) {
      return;
    }

    destroyFeaturedFunctionShaders(section);

    const mount = getActiveSceneMount(section, normalizedIndex);
    const scenes = [];

    if (mount) {
      const config = getInlineSceneConfig(mount);

      if (config) {
        const scene = new FeaturedFunctionShaderScene(mount, config);
        scene.mount();
        scenes.push(scene);
      }
    }

    section.__featuredFunctionScenes = scenes;
    section.__featuredFunctionActiveIndex = normalizedIndex;
  }

  function bindFeaturedFunctionShaderLifecycle() {
    const section = getSection();

    if (!section || isLifecycleBound(section)) {
      return;
    }

    section.addEventListener('home-featured-functions:rendered', () => {
      initFeaturedFunctionShaders(section, 0);
    });

    section.addEventListener('home-featured-functions:slide-change', (event) => {
      const nextIndex = Number(event?.detail?.currentIndex || 0);
      initFeaturedFunctionShaders(section, nextIndex);
    });

    if (section.__featuredFunctionsData) {
      initFeaturedFunctionShaders(section, 0);
    }

    markLifecycleBound(section);
  }

  function startShaderLifecycleBootstrap() {
    const observer = new MutationObserver(() => {
      const section = getSection();

      if (!section || isLifecycleBound(section)) {
        return;
      }

      bindFeaturedFunctionShaderLifecycle();
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });

    return observer;
  }

  startShaderLifecycleBootstrap();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindFeaturedFunctionShaderLifecycle, { once: true });
  } else {
    bindFeaturedFunctionShaderLifecycle();
  }
})();
