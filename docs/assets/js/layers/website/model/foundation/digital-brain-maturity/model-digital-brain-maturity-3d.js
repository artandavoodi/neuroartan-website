// MARK: - Digital Brain Maturity 3D Engine

import * as THREE from '/assets/vendor/three/three.module.js';

const DIGITAL_BRAIN_3D_INSTANCES = new WeakMap();
const DIGITAL_BRAIN_MAX_VISUAL_SIGNALS_PER_LAYER = 10;
const DIGITAL_BRAIN_HALO_VERTEX_SHADER = `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const DIGITAL_BRAIN_HALO_FRAGMENT_SHADER = `
  precision highp float;

  varying vec2 vUv;
  uniform vec3 uColor;
  uniform float uOpacity;

  void main() {
    vec2 center = vUv - vec2(0.5);
    float distanceFromCenter = length(center) * 2.0;
    float softCore = 1.0 - smoothstep(0.0, 0.78, distanceFromCenter);
    float feather = 1.0 - smoothstep(0.42, 1.0, distanceFromCenter);
    float alpha = pow(max(softCore * 0.54 + feather * 0.46, 0.0), 1.72) * uOpacity;
    gl_FragColor = vec4(uColor, alpha);
  }
`;
export const DIGITAL_BRAIN_ATLAS_REGIONS = Object.freeze({
  prefrontal_cortex: {
    label: 'Prefrontal cortex',
    category: 'Cerebral cortex',
    anatomy: 'Anterior frontal lobe, including medial and dorsolateral prefrontal association areas.',
    cognitiveSystem: 'Executive control, self-reference, planning, inhibition, decision support, and rule-sensitive behavior.',
    modelLayers: ['identity', 'personality'],
    description: 'Mapped to model identity, governance, and high-level behavioral control. These functions are distributed and are not treated as living only in this region.',
  },
  parietal_cortex: {
    label: 'Parietal cortex',
    category: 'Cerebral cortex',
    anatomy: 'Superior and posterior cortical surface, including body-map and integration areas.',
    cognitiveSystem: 'Attention, spatial integration, body context, sensory mapping, and evidence integration.',
    modelLayers: ['source', 'memory'],
    description: 'Associated with integrating signals into a usable context map for the model foundation.',
  },
  postcentral_gyrus: {
    label: 'Postcentral gyrus',
    category: 'Cerebral cortex',
    anatomy: 'Primary somatosensory cortex behind the central sulcus.',
    cognitiveSystem: 'Touch, body-state representation, proprioceptive mapping, and embodied context.',
    modelLayers: ['source', 'memory'],
    description: 'Used as the atlas reference for body-state and context signals; it is not a private data store by itself.',
  },
  temporal_cortex: {
    label: 'Temporal cortex',
    category: 'Cerebral cortex',
    anatomy: 'Lateral and medial temporal regions, including auditory and semantic association areas.',
    cognitiveSystem: 'Language, semantic memory, auditory processing, social meaning, and long-term association.',
    modelLayers: ['memory', 'voice', 'personality'],
    description: 'Associated with memory-language interaction and the model’s expressive continuity.',
  },
  hippocampal_formation: {
    label: 'Hippocampal formation',
    category: 'Medial temporal memory system',
    anatomy: 'Hippocampus, subiculum, and medial temporal memory interface.',
    cognitiveSystem: 'Episodic memory formation, retrieval, context binding, and continuity.',
    modelLayers: ['memory', 'identity'],
    description: 'Mapped to memory calibration and continuity, while respecting that memory retrieval is a distributed network process.',
  },
  salience_network: {
    label: 'Anterior cingulate and insula',
    category: 'Salience and regulation network',
    anatomy: 'Anterior cingulate cortex with insular interoceptive areas.',
    cognitiveSystem: 'Agency, error monitoring, emotional salience, internal-state awareness, and regulation.',
    modelLayers: ['source', 'personality'],
    description: 'Mapped to Source Calibration and adaptive regulation, including the axiom/core-belief answers that shape the model foundation.',
  },
  occipital_cortex: {
    label: 'Occipital cortex',
    category: 'Cerebral cortex',
    anatomy: 'Posterior visual cortex and visual association areas.',
    cognitiveSystem: 'Visual processing, visual association, visual memory cues, and image-grounded context.',
    modelLayers: ['memory', 'source'],
    description: 'Associated with visual evidence and visual context when the model has image-grounded sources.',
  },
  cerebellum: {
    label: 'Cerebellum',
    category: 'Cerebellar system',
    anatomy: 'Posterior-inferior cerebellar hemispheres and vermis.',
    cognitiveSystem: 'Timing, coordination, predictive correction, pacing, rhythm, and adaptive refinement.',
    modelLayers: ['voice', 'personality'],
    description: 'Mapped to expression timing and adaptive refinement rather than only motor control.',
  },
  brainstem: {
    label: 'Brainstem',
    category: 'Core regulatory system',
    anatomy: 'Midbrain, pons, and medulla support core arousal and regulatory pathways.',
    cognitiveSystem: 'Arousal, autonomic regulation, sleep-wake readiness, and baseline state support.',
    modelLayers: ['source', 'voice'],
    description: 'Used as a foundation-readiness metaphor grounded in regulation, not as a literal storage location.',
  },
});

const ATLAS_MESH_REGION_IDS = Object.freeze({
  'frontal-left': 'prefrontal_cortex',
  'frontal-right': 'prefrontal_cortex',
  'frontal-cap': 'prefrontal_cortex',
  'orbitofrontal-cap': 'prefrontal_cortex',
  'parietal-left': 'parietal_cortex',
  'parietal-right': 'postcentral_gyrus',
  'temporal-left': 'temporal_cortex',
  'temporal-right': 'temporal_cortex',
  'occipital-left': 'occipital_cortex',
  'occipital-right': 'occipital_cortex',
  'limbic-core': 'hippocampal_formation',
  'cerebellum-left': 'cerebellum',
  'cerebellum-right': 'cerebellum',
  brainstem: 'brainstem',
});

const REGION_POSITIONS = Object.freeze({
  identity: { x: 0, y: 0.82, z: 0.54 },
  source: { x: 0.72, y: 0.2, z: 0.72 },
  personality: { x: 0.18, y: 0.03, z: 0.82 },
  memory: { x: -0.58, y: -0.36, z: 0.68 },
  voice: { x: 0.82, y: -0.36, z: 0.42 },
});

const STATE_TOKEN_MAP = Object.freeze({
  complete: '--status-success-color',
  stable: '--status-success-color',
  forming: '--status-warning-color',
  initial: '--text-secondary-color',
  blocked: '--status-danger-color',
  pending: '--control-border-unified',
  not_started: '--control-border-unified',
});

export function initializeDigitalBrainMaturity3D(surface, graph, state = {}, regions = {}) {
  if (!(surface instanceof HTMLElement) || !(graph instanceof HTMLElement)) return null;

  disposeDigitalBrainMaturity3D(graph);

  const canvas = graph.querySelector('[data-digital-brain-three-canvas]');
  if (!(canvas instanceof HTMLCanvasElement)) return null;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(0, 0, 6.6);

  const brainGroup = new THREE.Group();
  const nodesGroup = new THREE.Group();
  const connectionsGroup = new THREE.Group();
  scene.add(brainGroup, connectionsGroup, nodesGroup);

  const tokens = readDigitalBrainTokens(surface);
  const materials = createDigitalBrainMaterials(tokens);
  const layerMeshes = new Map();
  const atlasMeshes = [];
  const layerState = createLayerStateMap(state.layers);

  scene.add(createAmbientLight(tokens));
  scene.add(createDirectionalLight(tokens, 2.2, 3.4, 4.8, 1.2));
  scene.add(createDirectionalLight(tokens, -3.6, -1.2, 3, 0.64));

  createAnatomicalBrainModel(brainGroup, materials, atlasMeshes);
  createLayerNodes(nodesGroup, state.layers || [], materials, layerMeshes);
  createLayerConnections(connectionsGroup, state.connections || [], layerMeshes, materials, layerState);

  const instance = {
    canvas,
    graph,
    surface,
    renderer,
    scene,
    camera,
    brainGroup,
    nodesGroup,
    connectionsGroup,
    materials,
    layerMeshes,
    atlasMeshes,
    state,
    regions,
    frame: 0,
    activeLayerId: '',
    dragging: false,
    moved: false,
    pointerId: null,
    startX: 0,
    startY: 0,
    rotationX: readAngle(surface.dataset.digitalBrainRotateX, -0.1),
    rotationY: readAngle(surface.dataset.digitalBrainRotateY, 0.18),
    targetRotationX: readAngle(surface.dataset.digitalBrainRotateX, -0.1),
    targetRotationY: readAngle(surface.dataset.digitalBrainRotateY, 0.18),
    raycaster: new THREE.Raycaster(),
    pointer: new THREE.Vector2(),
    resizeObserver: null,
    cleanup: [],
  };

  DIGITAL_BRAIN_3D_INSTANCES.set(graph, instance);
  bindDigitalBrainMaturity3D(instance);
  updateDigitalBrainMaturity3D(surface);
  resizeDigitalBrainMaturity3D(instance);
  animateDigitalBrainMaturity3D(instance);

  return instance;
}

export function updateDigitalBrainMaturity3D(surface, nextState = null) {
  const instance = getDigitalBrainMaturity3DInstance(surface);
  if (!instance) return;
  if (nextState) {
    instance.state = nextState;
  }

  const zoom = clamp(Number(surface.dataset.digitalBrainZoom || 1), 0.7, 2.4);
  const view = String(surface.dataset.digitalBrainView || 'overview');
  const displayMode = String(surface.dataset.digitalBrainDisplayMode || 'nodes');
  const scanMode = displayMode === 'scan';
  const connectomeMode = displayMode === 'connectome';
  instance.camera.position.z = 6.6 / zoom;
  instance.camera.updateProjectionMatrix();

  const focus = String(surface.dataset.digitalBrainFocus || '').trim();
  const atlasFocus = String(surface.dataset.digitalBrainAtlasFocus || '').trim();
  const signalFocus = String(surface.dataset.digitalBrainSignalFocus || '').trim();
  const subnodesVisible = surface.dataset.digitalBrainSubnodes !== 'hidden';
  const constructScale = readDigitalBrainControl(surface, 'digitalBrainConstructScale', 1);
  const constructSpread = readDigitalBrainControl(surface, 'digitalBrainConstructSpread', 1);
  const signalIntensity = readDigitalBrainControl(surface, 'digitalBrainSignalIntensity', 1);
  const blurIntensity = readDigitalBrainControl(surface, 'digitalBrainBlurIntensity', 1);
  const colorIntensity = readDigitalBrainControl(surface, 'digitalBrainColorIntensity', 1);
  const connectionVisibility = readDigitalBrainControl(surface, 'digitalBrainConnectionVisibility', 1);
  const nodeSharpness = clamp(1 - (blurIntensity * 0.85), 0, 1);
  const signalSharpness = blurIntensity > 0 ? 0 : 1;
  const regionGlass = scanMode
    ? 0.58
    : view === 'nodes'
      ? 0.68
      : view === 'connections' || connectomeMode
        ? 0.54
        : 0.78;
  instance.nodesGroup.visible = true;
  instance.connectionsGroup.visible = !scanMode;
  if (!focus) surface.dataset.digitalBrainSignalFocus = '';
  instance.activeLayerId = focus;
  instance.layerMeshes.forEach((mesh, layerId) => {
    const active = !focus || layerId === focus;
    const viewOpacity = view === 'regions' ? 0.46 : view === 'connections' ? 0.58 : 0.72;
    mesh.visible = !scanMode;
    mesh.material.opacity = (active ? viewOpacity : 0.2) * nodeSharpness;
    const nodeScale = readDigitalBrainControl(surface, 'digitalBrainNodeScale', 1);
    const baseScale = (active ? (view === 'nodes' ? 1.18 : 1.04) : 0.84) * nodeScale;
    mesh.userData.pulseBaseScale = baseScale;
    mesh.scale.setScalar(baseScale);
  });
  instance.nodesGroup.children.forEach((child) => {
    const isSignalConnection = child.name.startsWith('signal-line:');
    const isSignalHalo = child.name.startsWith('signal-blur:');
    const isCoreHalo = child.name.startsWith('node-blur:');
    const isSignalNode = Boolean(child.userData?.signal) && !isSignalConnection && !isSignalHalo;
    const isCoreNode = child.name.startsWith('node:') || child.name.startsWith('node-ring:');
    if (scanMode && isCoreNode) {
      child.visible = false;
      return;
    }
    if (!isSignalNode && !isSignalConnection && !isSignalHalo && !isCoreHalo) return;

    const layerId = child.userData?.layer?.id || '';
    const signalId = child.userData?.signal?.id || '';
    const impact = Number(child.userData?.impact || 0.35);
    const active = !focus || layerId === focus;
    const signalActive = active && (!signalFocus || signalId === signalFocus);
    child.visible = (isCoreHalo || subnodesVisible)
      && (!scanMode || isSignalNode || isSignalHalo || isCoreHalo)
      && (!isSignalConnection || (!scanMode && blurIntensity <= 0))
      && (!isSignalNode || signalSharpness > 0.01)
      && (!isSignalHalo || blurIntensity > 0)
      && (!isCoreHalo || blurIntensity > 0);
    updateDigitalBrainSignalPosition(child, constructSpread, isSignalConnection);
    if (child.material) {
      const signalLineViewWeight = view === 'connections' || connectomeMode
        ? 1
        : view === 'nodes'
          ? 0.96
          : 0.74;
      child.material.opacity = isCoreHalo
        ? clamp((active ? 0.34 + (impact * 0.36) : 0.08) * blurIntensity * colorIntensity, 0, 0.8)
        : isSignalHalo
        ? clamp((signalActive ? 0.42 + (impact * 0.34) : active ? 0.3 + (impact * 0.24) : 0.08) * signalIntensity * blurIntensity * colorIntensity, 0, 0.86)
        : isSignalConnection
        ? clamp((signalActive ? 0.2 + (impact * 0.28) : active ? 0.14 + (impact * 0.18) : 0.04) * signalLineViewWeight * signalIntensity * connectionVisibility, 0, 0.92)
        : scanMode
          ? clamp((signalActive ? 0.24 + (impact * 0.3) : active ? 0.18 + (impact * 0.18) : 0.08) * signalIntensity * colorIntensity * signalSharpness, 0, 0.62)
          : clamp((signalActive ? 0.42 + (impact * 0.52) : active ? 0.32 + (impact * 0.22) : 0.12) * signalIntensity * colorIntensity * signalSharpness, 0, 1);
      syncDigitalBrainMaterialOpacity(child.material);
      if (scanMode && child.material.emissive) {
        child.material.emissive.copy(child.material.color).multiplyScalar(0.26);
        child.material.emissiveIntensity = (0.16 + (impact * 0.18)) * colorIntensity;
      }
    }
    if (isSignalNode) {
      child.scale.setScalar((scanMode ? 1.9 : signalActive ? 1 : 0.74) * constructScale * (0.82 + (impact * 0.24)));
    } else if (isSignalHalo) {
      child.scale.setScalar((0.22 + (impact * 0.44)) * constructScale * Math.max(0, blurIntensity));
    } else if (isCoreHalo) {
      const nodeScale = readDigitalBrainControl(surface, 'digitalBrainNodeScale', 1);
      child.scale.setScalar((0.36 + (impact * 0.46)) * nodeScale * Math.max(0, blurIntensity));
    }
  });

  instance.connectionsGroup.children.forEach((line) => {
    const from = line.userData?.from || '';
    const to = line.userData?.to || '';
    const active = !focus || from === focus || to === focus;
    const baseOpacity = line.userData?.baseOpacity || 0.72;
    line.visible = true;
    line.material.opacity = clamp((active
      ? view === 'connections' || connectomeMode ? Math.min(1, baseOpacity + 0.18) : baseOpacity
      : 0.1) * connectionVisibility, 0, 1);
  });
  updateDigitalBrainConnectionThickness(instance);

  instance.atlasMeshes.forEach((mesh) => {
    const regionId = mesh.userData?.atlas?.id || '';
    const region = DIGITAL_BRAIN_ATLAS_REGIONS[regionId];
    const layerRelated = focus && region?.modelLayers?.includes(focus);
    const active = atlasFocus
      ? regionId === atlasFocus
      : !focus || layerRelated;
    const baseOpacity = mesh.userData.baseOpacity || 0.68;
    const regionOpacity = readDigitalBrainControl(surface, 'digitalBrainRegionOpacity', 1);
    const impact = calculateAtlasImpact(instance, region);
    mesh.visible = !connectomeMode;
    const viewOpacity = view === 'nodes'
      ? scanMode ? 0.42 + (impact * 0.1) : 0.24
      : view === 'connections'
        ? scanMode ? 0.38 + (impact * 0.08) : 0.18
        : view === 'regions'
          ? Math.min(scanMode ? 0.58 : 0.62, baseOpacity + 0.04 + (impact * 0.08))
          : scanMode ? 0.46 + (impact * 0.1) : Math.min(baseOpacity, 0.52);
    if (scanMode) {
      mesh.material.color.copy(createAtlasScanColor(instance.materials, impact, colorIntensity));
      mesh.material.emissive.copy(mesh.material.color).multiplyScalar(0.22);
    } else if (mesh.userData.baseColor) {
      mesh.material.color.copy(mesh.userData.baseColor);
      mesh.material.emissive.copy(mesh.userData.baseColor).multiplyScalar(0.14);
    }
    mesh.material.opacity = clamp((active ? viewOpacity : scanMode ? 0.18 : 0.12) * regionOpacity * regionGlass, 0, 0.66);
    mesh.material.emissiveIntensity = active && (scanMode || atlasFocus || layerRelated) ? (0.08 + (impact * 0.2)) * colorIntensity : 0;
  });

  renderDigitalBrainMaturity3DPanel(instance, focus, atlasFocus);
  updateDigitalBrainDomLabelState(instance);
}

export function disposeDigitalBrainMaturity3D(graph) {
  const instance = DIGITAL_BRAIN_3D_INSTANCES.get(graph);
  if (!instance) return;

  cancelAnimationFrame(instance.frame);
  instance.cleanup.forEach((cleanup) => cleanup());
  instance.resizeObserver?.disconnect?.();

  disposeThreeObject(instance.scene);
  instance.renderer.dispose();
  DIGITAL_BRAIN_3D_INSTANCES.delete(graph);
}

function createAnatomicalBrainModel(group, materials, atlasMeshes) {
  const brain = new THREE.Group();
  group.add(brain);

  addLobe(brain, 'frontal-left', materials.frontal, [-0.42, 0.28, 0.38], [0.92, 0.66, 0.82], [0.02, 0.06, -0.1], atlasMeshes);
  addLobe(brain, 'frontal-right', materials.frontal, [0.42, 0.28, 0.38], [0.92, 0.66, 0.82], [0.02, -0.06, 0.1], atlasMeshes);
  addLobe(brain, 'frontal-cap', materials.frontal, [0, 0.1, 0.76], [0.98, 0.56, 0.48], [0.04, 0, 0], atlasMeshes);
  addLobe(brain, 'orbitofrontal-cap', materials.frontal, [0, -0.24, 0.62], [0.76, 0.3, 0.34], [0.02, 0, 0], atlasMeshes);
  addLobe(brain, 'parietal-left', materials.parietal, [-0.44, 0.18, -0.18], [0.9, 0.68, 0.82], [0.02, 0.08, -0.06], atlasMeshes);
  addLobe(brain, 'parietal-right', materials.parietal, [0.44, 0.18, -0.18], [0.9, 0.68, 0.82], [0.02, -0.08, 0.06], atlasMeshes);
  addLobe(brain, 'temporal-left', materials.temporal, [-0.78, -0.32, -0.02], [0.68, 0.4, 0.7], [-0.12, 0.1, -0.14], atlasMeshes);
  addLobe(brain, 'temporal-right', materials.temporal, [0.78, -0.32, -0.02], [0.68, 0.4, 0.7], [-0.12, -0.1, 0.14], atlasMeshes);
  addLobe(brain, 'occipital-left', materials.occipital, [-0.3, 0.08, -0.82], [0.66, 0.54, 0.5], [0.02, 0.14, -0.06], atlasMeshes);
  addLobe(brain, 'occipital-right', materials.occipital, [0.3, 0.08, -0.82], [0.66, 0.54, 0.5], [0.02, -0.14, 0.06], atlasMeshes);
  addLobe(brain, 'limbic-core', materials.limbic, [0, -0.2, 0.06], [0.6, 0.24, 0.42], [0.06, 0, 0], atlasMeshes);
  addLobe(brain, 'cerebellum-left', materials.cerebellum, [-0.28, -0.72, -0.62], [0.44, 0.26, 0.36], [0.16, 0, -0.08], atlasMeshes);
  addLobe(brain, 'cerebellum-right', materials.cerebellum, [0.28, -0.72, -0.62], [0.44, 0.26, 0.36], [0.16, 0, 0.08], atlasMeshes);

  const brainstem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.18, 0.82, 28, 1),
    materials.brainstem.clone(),
  );
  brainstem.name = 'brainstem';
  brainstem.position.set(0, -1.0, -0.26);
  brainstem.rotation.x = 0.1;
  assignAtlasRegion(brainstem, 'brainstem', atlasMeshes);
  brain.add(brainstem);

  addFoldSet(brain, materials.fold);
  addMidline(brain, materials.midline);
  brain.scale.set(1.08, 1.18, 1.32);
}

function addLobe(group, name, material, position, scale, rotation, atlasMeshes) {
  const mesh = new THREE.Mesh(createCorticalLobeGeometry(name), material.clone());
  mesh.name = name;
  mesh.position.set(...position);
  mesh.scale.set(...scale);
  mesh.rotation.set(...rotation);
  assignAtlasRegion(mesh, name, atlasMeshes);
  group.add(mesh);
  return mesh;
}

function createCorticalLobeGeometry(seed = '') {
  const geometry = new THREE.SphereGeometry(1, 72, 42);
  const position = geometry.attributes.position;
  const seedOffset = Array.from(seed).reduce((total, character) => total + character.charCodeAt(0), 0) * 0.017;

  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index);
    const y = position.getY(index);
    const z = position.getZ(index);
    const vector = new THREE.Vector3(x, y, z).normalize();
    const longitudinalFold = Math.sin((vector.x * 9.5) + (vector.y * 5.2) + seedOffset) * 0.024;
    const transverseFold = Math.sin((vector.y * 11.5) - (vector.z * 8.2) + seedOffset) * 0.018;
    const associationFold = Math.sin(((vector.x + vector.z) * 13.2) + (vector.y * 4.4) - seedOffset) * 0.012;
    const sulcalTaper = 1 - Math.max(0, -vector.y) * 0.18;
    const radius = 1 + ((longitudinalFold + transverseFold + associationFold) * sulcalTaper);
    position.setXYZ(index, vector.x * radius, vector.y * radius, vector.z * radius);
  }

  geometry.computeVertexNormals();
  return geometry;
}

function assignAtlasRegion(mesh, meshName, atlasMeshes) {
  const atlasId = ATLAS_MESH_REGION_IDS[meshName];
  const atlas = DIGITAL_BRAIN_ATLAS_REGIONS[atlasId];
  if (!atlas) return;

  mesh.userData.atlas = { id: atlasId, ...atlas };
  mesh.userData.baseOpacity = mesh.material.opacity;
  mesh.userData.baseColor = mesh.material.color.clone();
  mesh.material.emissive = mesh.material.color.clone().multiplyScalar(0.14);
  mesh.material.emissiveIntensity = 0;
  atlasMeshes.push(mesh);
}

function addFoldSet(group, material) {
  const curves = [
    [[-1.12, 0.52, 0.4], [-0.78, 0.68, 0.56], [-0.28, 0.64, 0.62], [0.24, 0.68, 0.6], [0.96, 0.48, 0.44]],
    [[-1.1, 0.2, 0.58], [-0.68, 0.34, 0.7], [-0.16, 0.24, 0.74], [0.42, 0.34, 0.68], [1.1, 0.18, 0.54]],
    [[-1.04, -0.1, 0.56], [-0.62, 0.04, 0.72], [-0.1, -0.08, 0.76], [0.46, 0.04, 0.68], [1.06, -0.12, 0.5]],
    [[-0.96, -0.38, 0.36], [-0.56, -0.2, 0.56], [-0.08, -0.32, 0.62], [0.48, -0.2, 0.54], [1, -0.4, 0.36]],
    [[-0.7, 0.06, -0.44], [-0.3, 0.2, -0.7], [0, 0.16, -0.82], [0.34, 0.2, -0.68], [0.72, 0.04, -0.42]],
  ];

  curves.forEach((points) => {
    const curve = new THREE.CatmullRomCurve3(points.map(([x, y, z]) => new THREE.Vector3(x, y, z)));
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 48, 0.0035, 8, false), material);
    group.add(mesh);
  });
}

function addMidline(group, material) {
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.8, 0.5),
    new THREE.Vector3(0, 0.34, 0.7),
    new THREE.Vector3(0, -0.1, 0.74),
    new THREE.Vector3(0, -0.56, 0.44),
    new THREE.Vector3(0, -0.9, 0.08),
  ]);
  group.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 48, 0.006, 8, false), material));
}

function createLayerNodes(group, layers = [], materials, layerMeshes) {
  layers.forEach((layer) => {
    const position = REGION_POSITIONS[layer.id] || mapLayerPosition(layer);
    const impact = calculateLayerImpact(layer);
    const material = createLayerMaterial(materials, layer, impact);
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.056 + (impact * 0.04), 28, 18), material);
    mesh.name = `node:${layer.id}`;
    mesh.position.set(position.x, position.y, position.z + 0.34);
    mesh.userData.layer = layer;
    mesh.userData.impact = impact;
    layerMeshes.set(layer.id, mesh);
    group.add(mesh);

    const coreBlur = createDigitalBrainHaloMesh(materials, getLayerColor(materials, layer.id));
    coreBlur.name = `node-blur:${layer.id}`;
    coreBlur.position.copy(mesh.position);
    coreBlur.userData.layer = layer;
    coreBlur.userData.impact = impact;
    group.add(coreBlur);

    const layerColor = getLayerColor(materials, layer.id);
    const ringMaterial = materials.nodeRing.clone();
    ringMaterial.color = layerColor;
    ringMaterial.opacity = 0.28 + (impact * 0.34);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.094 + (impact * 0.052), 0.0055, 8, 36), ringMaterial);
    ring.name = `node-ring:${layer.id}`;
    ring.position.copy(mesh.position);
    ring.rotation.x = Math.PI / 2;
    ring.userData.layer = layer;
    ring.userData.impact = impact;
    group.add(ring);

    createLayerSignalNodes(group, layer, mesh.position, materials, impact);
  });
}

function createLayerSignalNodes(group, layer = {}, origin, materials, layerImpact = 0.35) {
  const signals = getDigitalBrainVisualSignals(layer);
  if (!signals.length) return;

  signals.forEach((signal, index) => {
    const offset = createSignalOffset(index, signals.length);
    const position = origin.clone().add(offset);
    const signalImpact = calculateSignalImpact(signal, layerImpact);
    const node = new THREE.Mesh(
      new THREE.SphereGeometry(0.02 + (signalImpact * 0.024), 18, 12),
      createLayerMaterial(materials, layer, signalImpact, true),
    );
    node.name = `signal:${layer.id}:${signal.id || index}`;
    node.position.copy(position);
    node.userData.layer = layer;
    node.userData.signal = signal;
    node.userData.impact = signalImpact;
    node.userData.origin = origin.clone();
    node.userData.baseOffset = offset.clone();
    group.add(node);

    const blur = createDigitalBrainHaloMesh(materials, getLayerColor(materials, layer.id));
    blur.name = `signal-blur:${layer.id}:${signal.id || index}`;
    blur.position.copy(position);
    blur.userData.layer = layer;
    blur.userData.signal = signal;
    blur.userData.impact = signalImpact;
    blur.userData.origin = origin.clone();
    blur.userData.baseOffset = offset.clone();
    group.add(blur);

    const points = [origin.clone(), position.clone()];
    const lineMaterial = materials.connection.clone();
    lineMaterial.color = getLayerColor(materials, layer.id);
    lineMaterial.opacity = 0.16 + (signalImpact * 0.24);
    const lineRadius = 0.005 + (signalImpact * 0.004);
    const line = new THREE.Mesh(createConnectionTubeGeometry(points, lineRadius), lineMaterial);
    line.name = `signal-line:${layer.id}:${signal.id || index}`;
    line.userData.layer = layer;
    line.userData.signal = signal;
    line.userData.connectionPoints = points;
    line.userData.baseRadius = lineRadius;
    line.userData.impact = signalImpact;
    line.userData.origin = origin.clone();
    line.userData.baseOffset = offset.clone();
    group.add(line);
  });
}

function createDigitalBrainHaloMesh(materials, color) {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: color.clone() },
      uOpacity: { value: 0 },
    },
    vertexShader: DIGITAL_BRAIN_HALO_VERTEX_SHADER,
    fragmentShader: DIGITAL_BRAIN_HALO_FRAGMENT_SHADER,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    depthTest: false,
    blending: THREE.NormalBlending,
  });
  const mesh = new THREE.Mesh(materials.haloGeometry, material);
  mesh.renderOrder = 1;
  return mesh;
}

function updateDigitalBrainSignalPosition(mesh, constructSpread = 1, connector = false) {
  const origin = mesh.userData?.origin;
  const baseOffset = mesh.userData?.baseOffset;
  if (!(origin instanceof THREE.Vector3) || !(baseOffset instanceof THREE.Vector3)) return;

  const spread = connector ? Math.min(Number(constructSpread) || 1, 0.9) : constructSpread;
  const nextPosition = origin.clone().add(baseOffset.clone().multiplyScalar(spread));
  if (mesh.userData?.signal && !mesh.name.startsWith('signal-line:')) {
    mesh.position.copy(nextPosition);
    return;
  }

  if (mesh.name.startsWith('signal-line:')) {
    mesh.userData.connectionPoints = [origin.clone(), nextPosition];
  }
}

function createSignalOffset(index = 0, total = 1) {
  const angle = index * Math.PI * (3 - Math.sqrt(5));
  const density = Math.max(1, Math.sqrt(Math.max(1, total)));
  const ring = Math.sqrt(index + 1) / density;
  const radius = 0.08 + (ring * 0.2);

  return new THREE.Vector3(
    Math.cos(angle) * radius,
    Math.sin(angle) * radius * 0.36,
    0.02 + (ring * 0.04),
  );
}

function getDigitalBrainVisualSignals(layer = {}) {
  return (Array.isArray(layer.signals) ? layer.signals : [])
    .filter((signal) => signal?.visualRole !== 'detail')
    .sort(compareDigitalBrainVisualSignalStrength)
    .slice(0, DIGITAL_BRAIN_MAX_VISUAL_SIGNALS_PER_LAYER);
}

function compareDigitalBrainVisualSignalStrength(left = {}, right = {}) {
  return getDigitalBrainVisualSignalRank(right) - getDigitalBrainVisualSignalRank(left);
}

function getDigitalBrainVisualSignalRank(signal = {}) {
  const roleWeight = signal.visualRole === 'cluster'
    ? 2
    : signal.source === 'foundation_construct'
      ? 0
      : 1;
  const aggregateWeight = Math.log10(Math.max(1, Number(signal.aggregateCount || 1))) / 2;
  const valueWeight = String(signal.value || '').trim() ? 0.18 : 0;
  return roleWeight + aggregateWeight + valueWeight + Number(signal.impact || 0);
}

function createLayerConnections(group, connections = [], layerMeshes, materials, layerState) {
  connections.forEach((connection) => {
    const from = layerMeshes.get(connection.from);
    const to = layerMeshes.get(connection.to);
    if (!from || !to) return;

    const points = [
      from.position.clone(),
      createConnectionMidpoint(from.position, to.position),
      to.position.clone(),
    ];
    const material = createConnectionMaterial(materials, connection.state || layerState.get(connection.to) || 'pending');
    const line = new THREE.Mesh(createConnectionTubeGeometry(points, 0.006), material);
    line.userData.from = connection.from;
    line.userData.to = connection.to;
    line.userData.baseOpacity = material.opacity;
    line.userData.connectionPoints = points;
    line.userData.baseRadius = 0.006;
    group.add(line);
  });
}

function createConnectionTubeGeometry(points = [], radius = 0.006) {
  const curve = new THREE.CatmullRomCurve3(points);
  return new THREE.TubeGeometry(curve, 28, radius, 8, false);
}

function updateDigitalBrainConnectionThickness(instance) {
  const connectionScale = readDigitalBrainControl(instance.surface, 'digitalBrainConnectionScale', 1);
  const updateMesh = (mesh) => {
    if (!(mesh instanceof THREE.Mesh) || !Array.isArray(mesh.userData?.connectionPoints)) return;
    const baseRadius = Number(mesh.userData.baseRadius || 0.006);
    const nextRadius = Math.max(0.0001, baseRadius * Math.max(0, connectionScale));
    const pointSignature = createDigitalBrainPointSignature(mesh.userData.connectionPoints);
    if (
      Math.abs(Number(mesh.userData.currentRadius || 0) - nextRadius) < 0.0005
      && mesh.userData.currentPointSignature === pointSignature
    ) return;
    mesh.geometry?.dispose?.();
    mesh.geometry = createConnectionTubeGeometry(mesh.userData.connectionPoints, nextRadius);
    mesh.userData.currentRadius = nextRadius;
    mesh.userData.currentPointSignature = pointSignature;
  };

  instance.connectionsGroup.children.forEach(updateMesh);
  instance.nodesGroup.children.forEach(updateMesh);
}

function createDigitalBrainPointSignature(points = []) {
  return points
    .map((point) => `${Math.round(point.x * 1000)}:${Math.round(point.y * 1000)}:${Math.round(point.z * 1000)}`)
    .join('|');
}

function createConnectionMidpoint(from, to) {
  return new THREE.Vector3(
    (from.x + to.x) / 2,
    (from.y + to.y) / 2,
    Math.max(from.z, to.z) + 0.28,
  );
}

function bindDigitalBrainMaturity3D(instance) {
  const { canvas, graph, surface } = instance;

  const onResize = () => resizeDigitalBrainMaturity3D(instance);
  const onFullscreenChange = () => resizeDigitalBrainMaturity3D(instance);
  const onPointerDown = (event) => {
    instance.dragging = true;
    instance.moved = false;
    instance.pointerId = event.pointerId;
    instance.startX = event.clientX;
    instance.startY = event.clientY;
    graph.dataset.digitalBrainDragging = 'true';
    canvas.setPointerCapture?.(event.pointerId);
  };
  const onPointerMove = (event) => {
    if (!instance.dragging) return;
    const deltaX = event.clientX - instance.startX;
    const deltaY = event.clientY - instance.startY;
    if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
      instance.moved = true;
    }
    instance.targetRotationY = instance.rotationY + deltaX * 0.006;
    instance.targetRotationX = instance.rotationX + deltaY * 0.004;
  };
  const finishPointer = (event) => {
    if (!instance.dragging) return;
    instance.dragging = false;
    instance.rotationX = instance.targetRotationX;
    instance.rotationY = instance.targetRotationY;
    graph.dataset.digitalBrainDragging = 'false';
    canvas.releasePointerCapture?.(event.pointerId);
    if (!instance.moved) {
      focusLayerFromPointer(instance, event);
    }
  };
  const onWheel = (event) => {
    event.preventDefault();
    const currentZoom = Number(surface.dataset.digitalBrainZoom || '1');
    const nextZoom = event.deltaY < 0
      ? Math.min(2.4, currentZoom + 0.12)
      : Math.max(0.7, currentZoom - 0.12);
    surface.dataset.digitalBrainZoom = String(Math.round(nextZoom * 100) / 100);
    updateDigitalBrainMaturity3D(surface);
  };

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', finishPointer);
  canvas.addEventListener('pointercancel', finishPointer);
  canvas.addEventListener('wheel', onWheel, { passive: false });
  document.addEventListener('fullscreenchange', onFullscreenChange);
  window.addEventListener('resize', onResize);

  instance.resizeObserver = new ResizeObserver(onResize);
  instance.resizeObserver.observe(graph);
  instance.cleanup.push(
    () => canvas.removeEventListener('pointerdown', onPointerDown),
    () => canvas.removeEventListener('pointermove', onPointerMove),
    () => canvas.removeEventListener('pointerup', finishPointer),
    () => canvas.removeEventListener('pointercancel', finishPointer),
    () => canvas.removeEventListener('wheel', onWheel),
    () => document.removeEventListener('fullscreenchange', onFullscreenChange),
    () => window.removeEventListener('resize', onResize),
  );
}

function focusLayerFromPointer(instance, event) {
  const rect = instance.canvas.getBoundingClientRect();
  instance.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  instance.pointer.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
  instance.raycaster.setFromCamera(instance.pointer, instance.camera);
  const signalMeshes = instance.nodesGroup.children.filter((child) => (
    child instanceof THREE.Mesh
    && Boolean(child.userData?.signal)
    && !child.name.startsWith('signal-line:')
    && !child.name.startsWith('signal-blur:')
  ));
  const intersections = instance.raycaster.intersectObjects([
    ...signalMeshes,
    ...Array.from(instance.layerMeshes.values()),
    ...instance.nodesGroup.children.filter((child) => child instanceof THREE.Mesh && child.name.startsWith('signal-line:')),
    ...instance.atlasMeshes,
  ], false);
  const target = intersections[0]?.object;
  const layer = target?.userData?.layer;
  const atlas = target?.userData?.atlas;
  const signal = target?.userData?.signal;

  if (atlas?.id) {
    instance.surface.dataset.digitalBrainFocus = '';
    instance.surface.dataset.digitalBrainAtlasFocus = atlas.id;
    instance.surface.dataset.digitalBrainView = 'regions';
    updateDigitalBrainMaturity3D(instance.surface);
    return;
  }

  if (!layer?.id) return;

  instance.surface.dataset.digitalBrainFocus = layer.id;
  instance.surface.dataset.digitalBrainSignalFocus = signal?.id || '';
  instance.surface.dataset.digitalBrainAtlasFocus = '';
  instance.surface.dataset.digitalBrainView = 'nodes';
  updateDigitalBrainMaturity3D(instance.surface);
}

function resizeDigitalBrainMaturity3D(instance) {
  const rect = instance.graph.getBoundingClientRect();
  const width = Math.max(1, Math.round(rect.width));
  const height = Math.max(1, Math.round(rect.height));
  instance.renderer.setSize(width, height, false);
  instance.camera.aspect = width / height;
  instance.camera.updateProjectionMatrix();
}

function animateDigitalBrainMaturity3D(instance) {
  instance.frame = requestAnimationFrame(() => animateDigitalBrainMaturity3D(instance));
  const motionPaused = instance.surface.dataset.digitalBrainMotion === 'paused';
  const motionSpeed = readDigitalBrainControl(instance.surface, 'digitalBrainMotionSpeed', 1);
  const motionDirection = instance.surface.dataset.digitalBrainMotionDirection === 'counterclockwise' ? -1 : 1;
  const scanMode = String(instance.surface.dataset.digitalBrainDisplayMode || 'nodes') === 'scan';
  instance.brainGroup.rotation.x += (instance.targetRotationX - instance.brainGroup.rotation.x) * 0.08;
  instance.brainGroup.rotation.y += (instance.targetRotationY - instance.brainGroup.rotation.y) * 0.08;
  instance.nodesGroup.rotation.copy(instance.brainGroup.rotation);
  instance.connectionsGroup.rotation.copy(instance.brainGroup.rotation);

  const connectionPulse = readDigitalBrainControl(instance.surface, 'digitalBrainConnectionPulse', 1);
  const heartbeatPulse = createDigitalBrainHeartbeatPulse(motionSpeed) * connectionPulse;
  const nodeScale = readDigitalBrainControl(instance.surface, 'digitalBrainNodeScale', 1);
  const constructSpread = readDigitalBrainControl(instance.surface, 'digitalBrainConstructSpread', 1);
  const constructScale = readDigitalBrainControl(instance.surface, 'digitalBrainConstructScale', 1);
  const blurIntensity = readDigitalBrainControl(instance.surface, 'digitalBrainBlurIntensity', 1);
  instance.layerMeshes.forEach((mesh, layerId) => {
    const active = !instance.activeLayerId || layerId === instance.activeLayerId;
    const baseScale = Number(mesh.userData?.pulseBaseScale || mesh.scale.x || 1);
    mesh.scale.setScalar(baseScale * (active ? 1 + (heartbeatPulse * 0.22) : 1));
  });
  instance.nodesGroup.children.forEach((child) => {
    if (child.name.startsWith('node-ring:')) {
      const active = !instance.activeLayerId || child.userData?.layer?.id === instance.activeLayerId;
      child.scale.setScalar((active ? 1 + (heartbeatPulse * 0.3) : 0.88) * nodeScale);
      if (!motionPaused) child.rotation.z += 0.006 * motionSpeed;
    } else if (child.name.startsWith('node-blur:')) {
      faceDigitalBrainHaloToCamera(child, instance.camera);
      const impact = Number(child.userData?.impact || 0.35);
      child.scale.setScalar(
        (0.36 + (impact * 0.46))
        * nodeScale
        * Math.max(0, blurIntensity)
        * (1 + (heartbeatPulse * 0.28)),
      );
    } else if (child.name.startsWith('signal-blur:')) {
      updateDigitalBrainSignalPosition(child, constructSpread);
      faceDigitalBrainHaloToCamera(child, instance.camera);
      const impact = Number(child.userData?.impact || 0.35);
      child.scale.setScalar(
        (0.16 + (impact * 0.36))
        * constructScale
        * Math.max(0, blurIntensity)
        * (1 + (heartbeatPulse * 0.38)),
      );
    } else if (child.userData?.signal && !child.name.startsWith('signal-line:')) {
      updateDigitalBrainSignalPosition(child, constructSpread);
      const impact = Number(child.userData?.impact || 0.35);
      child.scale.setScalar(
        constructScale
        * (scanMode ? 1.9 : 1)
        * (0.82 + (impact * 0.2))
        * (1 + (heartbeatPulse * 0.34)),
      );
    }
  });
  const connectionScale = readDigitalBrainControl(instance.surface, 'digitalBrainConnectionScale', 1);
  const connectionVisibility = readDigitalBrainControl(instance.surface, 'digitalBrainConnectionVisibility', 1);
  const signalIntensity = readDigitalBrainControl(instance.surface, 'digitalBrainSignalIntensity', 1);
  instance.connectionsGroup.children.forEach((line) => {
    const base = line.userData?.baseOpacity || 0.32;
    const from = line.userData?.from || '';
    const to = line.userData?.to || '';
    const active = !instance.activeLayerId || from === instance.activeLayerId || to === instance.activeLayerId;
    line.material.opacity = clamp(
      (active ? Math.min(1, base + (heartbeatPulse * 0.42)) : 0.12)
      * connectionVisibility,
      0,
      1,
    );
  });
  instance.nodesGroup.children.forEach((child) => {
    if (!child.name.startsWith('signal-line:') || !child.material) return;

    const layerId = child.userData?.layer?.id || '';
    const impact = Number(child.userData?.impact || 0.35);
    const active = !instance.activeLayerId || layerId === instance.activeLayerId;
    const pulseBoost = heartbeatPulse * 0.58;
    child.material.opacity = clamp(
      (active ? 0.08 + (impact * 0.16) + pulseBoost : 0.024)
      * signalIntensity
      * connectionVisibility,
      0,
      0.86,
    );
  });

  if (!motionPaused && !instance.dragging && !instance.activeLayerId) {
    instance.targetRotationY += 0.001 * motionSpeed * motionDirection;
  }

  syncDigitalBrainDomLabels(instance);
  instance.renderer.render(instance.scene, instance.camera);
}

function renderDigitalBrainMaturity3DPanel(instance, layerId = '', atlasId = '') {
  const panel = instance.graph.querySelector('[data-digital-brain-focus-panel]');
  if (!(panel instanceof HTMLElement)) return;

  const atlas = DIGITAL_BRAIN_ATLAS_REGIONS[atlasId];
  if (atlas) {
    panel.hidden = false;
    panel.innerHTML = `
      <header class="model-digital-brain-maturity__focus-header">
        <span>
          <strong>${escapeDigitalBrainText(atlas.label)}</strong>
          <em>${escapeDigitalBrainText(atlas.category)}</em>
        </span>
        <button class="model-digital-brain-maturity__focus-close" type="button" data-digital-brain-panel-close aria-label="Close brain information">
          <img class="model-digital-brain-maturity__focus-close-icon ui-icon-theme-aware" src="/registry/icons/public/assets/core/actions/close/close.svg" alt="">
        </button>
      </header>
      <div class="model-digital-brain-maturity__focus-body">
        <p>${escapeDigitalBrainText(atlas.description)}</p>
        <dl>
          <div><dt>Anatomy</dt><dd>${escapeDigitalBrainText(atlas.anatomy)}</dd></div>
          <div><dt>Associated with</dt><dd>${escapeDigitalBrainText(atlas.cognitiveSystem)}</dd></div>
          <div><dt>Model layers</dt><dd>${escapeDigitalBrainText(atlas.modelLayers.join(', '))}</dd></div>
          <div><dt>Connected data</dt><dd>${escapeDigitalBrainText(getAtlasRegisteredSignals(instance, atlas).join(', ') || 'No live records connected')}</dd></div>
        </dl>
      </div>
    `;
    return;
  }

  const layer = (instance.state.layers || []).find((item) => item.id === layerId);
  if (!layer) {
    panel.hidden = true;
    panel.replaceChildren();
    return;
  }

  const region = instance.regions[layer.id] || {};
  const signalFocus = instance.surface.dataset.digitalBrainSignalFocus || '';
  const focusedSignal = signalFocus
    ? (Array.isArray(layer.signals) ? layer.signals : []).find((signal) => signal.id === signalFocus)
    : null;
  const detailMarkup = focusedSignal
    ? renderDigitalBrainSignalDetails(focusedSignal, layer)
    : renderDigitalBrainLayerDetails(instance, layer, region);
  panel.hidden = false;
  panel.innerHTML = `
      <header class="model-digital-brain-maturity__focus-header">
        <span>
          <strong>${escapeDigitalBrainText(focusedSignal?.label || layer.label)}</strong>
          <em>${escapeDigitalBrainText(focusedSignal ? layer.label : layer.stateLabel || layer.state)}</em>
        </span>
      <button class="model-digital-brain-maturity__focus-close" type="button" data-digital-brain-panel-close aria-label="Close brain information">
        <img class="model-digital-brain-maturity__focus-close-icon ui-icon-theme-aware" src="/registry/icons/public/assets/core/actions/close/close.svg" alt="">
      </button>
    </header>
    <div class="model-digital-brain-maturity__focus-body">
      <p>${escapeDigitalBrainText(focusedSignal?.value || region.region || layer.description || '')}</p>
      <dl>${detailMarkup}</dl>
    </div>
  `;
}

function renderDigitalBrainSignalDetails(signal = {}, layer = {}) {
  const sourceLabel = signal.source === 'foundation_construct'
    ? 'Foundation construct'
    : signal.source || 'Live model record';

  return `
    <div><dt>Layer</dt><dd>${escapeDigitalBrainText(layer.label || 'Model layer')}</dd></div>
    <div><dt>Signal source</dt><dd>${escapeDigitalBrainText(sourceLabel)}</dd></div>
    <div><dt>Recorded value</dt><dd>${escapeDigitalBrainText(signal.value || 'No live record connected')}</dd></div>
  `;
}

function renderDigitalBrainLayerDetails(instance, layer = {}, region = {}) {
  const visualSignals = getDigitalBrainVisualSignals(layer);
  const aggregateCount = visualSignals.reduce((total, signal) => total + Math.max(1, Number(signal.aggregateCount || 1)), 0);
  return `
    <div><dt>System</dt><dd>${escapeDigitalBrainText(region.system || 'Distributed model layer')}</dd></div>
    <div><dt>Lobe</dt><dd>${escapeDigitalBrainText(region.lobe || 'Distributed')}</dd></div>
    <div><dt>Hemisphere</dt><dd>${escapeDigitalBrainText(region.hemisphere || 'Bilateral / model-wide')}</dd></div>
    <div><dt>Visible constructs</dt><dd>${escapeDigitalBrainText(`${visualSignals.length} construct${visualSignals.length === 1 ? '' : 's'} · ${aggregateCount} connected item${aggregateCount === 1 ? '' : 's'}`)}</dd></div>
    <div><dt>Connected data</dt><dd>${escapeDigitalBrainText(getLayerRegisteredData(instance, layer.id).join(', ') || 'No live records connected')}</dd></div>
    <div><dt>Next</dt><dd>${escapeDigitalBrainText((layer.next || []).join(', ') || 'No downstream dependency')}</dd></div>
  `;
}

function updateDigitalBrainDomLabelState(instance) {
  const focus = String(instance.surface.dataset.digitalBrainFocus || '').trim();
  const signalFocus = String(instance.surface.dataset.digitalBrainSignalFocus || '').trim();

	  instance.graph.querySelectorAll('[data-digital-brain-region-label]').forEach((label) => {
	    const layerId = label.dataset.digitalBrainRegionLabel || '';
	    const signalId = label.dataset.digitalBrainSignalLabel || '';
	    const active = signalFocus
	      ? layerId === focus && signalId === signalFocus
	      : layerId === focus && !signalId;
	    label.dataset.digitalBrainActiveLabel = String(Boolean(active));
	    label.dataset.digitalBrainFocusMatch = String(!focus || layerId === focus);
	  });
	}

function syncDigitalBrainDomLabels(instance) {
  const rect = instance.graph.getBoundingClientRect();
  if (!rect.width || !rect.height) return;

  instance.scene.updateMatrixWorld(true);
  instance.layerMeshes.forEach((mesh, layerId) => {
    const label = instance.graph.querySelector(`[data-digital-brain-region-label="${cssEscapeDigitalBrainSelector(layerId)}"]:not([data-digital-brain-signal-label])`);
    if (label instanceof HTMLElement) {
      setDigitalBrainLabelProjection(label, mesh, instance.camera);
    }
  });

  instance.nodesGroup.children.forEach((mesh) => {
    if (!(mesh instanceof THREE.Mesh)
      || !mesh.userData?.signal
      || mesh.name.startsWith('signal-line:')
      || mesh.name.startsWith('signal-blur:')
    ) return;
    const layerId = mesh.userData?.layer?.id || '';
    const signalId = mesh.userData?.signal?.id || '';
    if (!layerId || !signalId) return;
    const label = instance.graph.querySelector(`[data-digital-brain-region-label="${cssEscapeDigitalBrainSelector(layerId)}"][data-digital-brain-signal-label="${cssEscapeDigitalBrainSelector(signalId)}"]`);
    if (label instanceof HTMLElement) {
      setDigitalBrainLabelProjection(label, mesh, instance.camera);
    }
  });
}

function setDigitalBrainLabelProjection(label, mesh, camera) {
  const vector = new THREE.Vector3();
  mesh.getWorldPosition(vector);
  vector.project(camera);

  const x = clamp((vector.x * 0.5) + 0.5, 0.04, 0.96) * 100;
  const y = clamp((-vector.y * 0.5) + 0.5, 0.04, 0.96) * 100;
  label.style.setProperty('--digital-brain-label-x', `${Math.round(x * 10) / 10}%`);
  label.style.setProperty('--digital-brain-label-y', `${Math.round(y * 10) / 10}%`);
}

function cssEscapeDigitalBrainSelector(value = '') {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(String(value));
  }
  return String(value).replace(/"/g, '\\"');
}


function getAtlasRegisteredSignals(instance, atlas = {}) {
  return (atlas.modelLayers || [])
    .flatMap((layerId) => getLayerRegisteredData(instance, layerId))
    .filter(Boolean);
}

function getLayerRegisteredData(instance, layerId = '') {
  const layer = (instance.state.layers || []).find((item) => item.id === layerId);
  return getDigitalBrainVisualSignals(layer)
    .map((signal) => signal.value ? `${signal.label}: ${signal.value}` : signal.label)
    .filter(Boolean);
}

function getDigitalBrainMaturity3DInstance(surface) {
  const graph = surface?.querySelector?.('[data-digital-brain-maturity-graph]');
  return graph instanceof HTMLElement ? DIGITAL_BRAIN_3D_INSTANCES.get(graph) : null;
}

function readDigitalBrainControl(surface, key, fallback = 1) {
  const rawValue = surface?.dataset?.[key];
  const value = Number(rawValue === undefined || rawValue === null || rawValue === '' ? fallback : rawValue);
  return Number.isFinite(value) ? value : fallback;
}

function createDigitalBrainHeartbeatPulse(motionSpeed = 1) {
  const numericSpeed = Number(motionSpeed);
  const speed = clamp(Number.isFinite(numericSpeed) ? numericSpeed : 1, 0, 2.5);
  if (speed <= 0) return 0;
  const phase = ((Date.now() * speed) % 1180) / 1180;
  const breathPhase = (Math.sin(Date.now() / (1250 / speed)) + 1) / 2;
  const primaryBeat = Math.exp(-Math.pow((phase - 0.12) / 0.044, 2));
  const secondaryBeat = Math.exp(-Math.pow((phase - 0.27) / 0.072, 2)) * 0.42;
  const breathingFloor = breathPhase * 0.2;
  return clamp(primaryBeat + secondaryBeat + breathingFloor, 0, 1);
}

function createDigitalBrainMaterials(tokens) {
  const base = createThreeColor(tokens.cortex);
  const border = createThreeColor(tokens.border);
  const success = createThreeColor(tokens.success);
  const warning = createThreeColor(tokens.warning);
  const danger = createThreeColor(tokens.danger);
  const focus = createThreeColor(tokens.focus);
  const fold = createThreeColor(tokens.fold);
  const brainstem = createThreeColor(tokens.brainstem);

  return {
    frontal: createBrainMaterial(base, createThreeColor(tokens.frontal), 0.72),
    parietal: createBrainMaterial(base, createThreeColor(tokens.parietal), 0.68),
    temporal: createBrainMaterial(base, createThreeColor(tokens.temporal), 0.72),
    occipital: createBrainMaterial(base, createThreeColor(tokens.occipital), 0.64),
    limbic: createBrainMaterial(base, createThreeColor(tokens.limbic), 0.68),
    cerebellum: createBrainMaterial(base, border, 0.32),
    brainstem: new THREE.MeshStandardMaterial({ color: brainstem, roughness: 0.68, metalness: 0.04, transparent: true, opacity: 0.46, depthWrite: false }),
    fold: new THREE.MeshStandardMaterial({ color: fold, roughness: 0.82, metalness: 0.02, transparent: true, opacity: 0.34 }),
    midline: new THREE.MeshStandardMaterial({ color: focus, roughness: 0.7, metalness: 0.02, transparent: true, opacity: 0.36 }),
    nodeRing: new THREE.MeshBasicMaterial({ color: border, transparent: true, opacity: 0.44 }),
    nodeFallback: new THREE.MeshStandardMaterial({ color: border, roughness: 0.52, transparent: true, opacity: 0.94 }),
    connection: new THREE.MeshBasicMaterial({ color: border, transparent: true, opacity: 0.38 }),
    haloGeometry: new THREE.PlaneGeometry(1, 1, 1, 1),
    layers: {
      identity: createThreeColor(tokens.identity),
      source: createThreeColor(tokens.source),
      personality: createThreeColor(tokens.personality),
      memory: createThreeColor(tokens.memory),
      voice: createThreeColor(tokens.voice),
    },
    state: { success, warning, danger, border, focus },
  };
}

function syncDigitalBrainMaterialOpacity(material) {
  if (material?.uniforms?.uOpacity) {
    material.uniforms.uOpacity.value = Number(material.opacity) || 0;
  }
}

function faceDigitalBrainHaloToCamera(mesh, camera) {
  const parentQuaternion = new THREE.Quaternion();
  mesh.parent?.getWorldQuaternion(parentQuaternion);
  mesh.quaternion.copy(parentQuaternion.invert().multiply(camera.quaternion));
}

function createBrainMaterial(baseColor, tintColor, mix = 0.5) {
  const color = baseColor.clone().lerp(tintColor, mix);
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.74,
    metalness: 0.02,
    transparent: true,
    opacity: 0.48,
    depthWrite: false,
  });
}

function createStateMaterial(materials, state = 'pending') {
  const tokenColor = materials.state[state === 'complete' || state === 'stable'
    ? 'success'
    : state === 'forming'
      ? 'warning'
      : state === 'blocked'
        ? 'danger'
        : 'border'] || materials.state.border;
  return new THREE.MeshStandardMaterial({
    color: tokenColor,
    emissive: tokenColor.clone().multiplyScalar(0.18),
    roughness: 0.42,
    metalness: 0.1,
    transparent: true,
    opacity: 0.96,
  });
}

function createLayerMaterial(materials, layer = {}, impact = 0.35, isSignal = false) {
  const layerColor = getLayerColor(materials, layer.id);
  const statusColor = layer.state === 'blocked'
    ? materials.state.danger
    : layer.state === 'complete' || layer.state === 'stable'
      ? materials.state.success
      : layer.state === 'forming'
        ? materials.state.warning
        : materials.state.border;
  const color = layerColor.clone().lerp(statusColor, layer.state === 'pending' || layer.state === 'not_started' ? 0.18 : 0.08);
  const opacity = isSignal ? 0.42 + (impact * 0.44) : 0.68 + (impact * 0.28);

  return new THREE.MeshStandardMaterial({
    color,
    emissive: color.clone().multiplyScalar(0.14 + (impact * 0.12)),
    roughness: 0.42,
    metalness: 0.08,
    transparent: true,
    opacity: clamp(opacity, 0.32, 0.98),
  });
}

function getLayerColor(materials, layerId = '') {
  return materials.layers?.[layerId]?.clone?.() || materials.state.border.clone();
}

function calculateLayerImpact(layer = {}) {
  const signals = getDigitalBrainVisualSignals(layer);
  const liveSignals = signals.filter((signal) => signal?.source !== 'foundation_construct');
  const connectedItems = liveSignals.reduce((total, signal) => total + Math.max(1, Number(signal.aggregateCount || 1)), 0);
  const valuedSignals = liveSignals
    .filter((signal) => String(signal?.value || '').trim())
    .reduce((total, signal) => total + Math.max(1, Number(signal.aggregateCount || 1)), 0);
  const signalRatio = Math.min(1, Math.log10(connectedItems + 1) / 3);
  const valueRatio = connectedItems ? valuedSignals / connectedItems : 0;
  const stateWeight = layer.state === 'complete' || layer.state === 'stable'
    ? 0.24
    : layer.state === 'forming'
      ? 0.14
      : 0.04;

  return clamp(0.22 + (signalRatio * 0.34) + (valueRatio * 0.28) + stateWeight, 0.24, 1);
}

function calculateAtlasImpact(instance, region = null) {
  const relatedLayerIds = Array.isArray(region?.modelLayers) ? region.modelLayers : [];
  if (!relatedLayerIds.length) return 0.35;
  const layers = Array.isArray(instance?.state?.layers) ? instance.state.layers : [];
  const impacts = relatedLayerIds
    .map((layerId) => layers.find((layer) => layer.id === layerId))
    .filter(Boolean)
    .map(calculateLayerImpact);
  if (!impacts.length) return 0.35;
  return impacts.reduce((sum, value) => sum + value, 0) / impacts.length;
}

function createAtlasScanColor(materials, impact = 0.35, colorIntensity = 1) {
  const value = clamp(Number(impact) || 0.35, 0, 1);
  const numericIntensity = Number(colorIntensity);
  const intensity = clamp(Number.isFinite(numericIntensity) ? numericIntensity : 1, 0, 1.6);
  const color = materials.state.focus.clone().lerp(materials.state.warning, clamp(value * 1.2 * intensity, 0, 1));
  if (value > 0.62) {
    color.lerp(materials.state.danger, clamp((value - 0.62) / 0.38, 0, 1) * 0.72 * intensity);
  }
  if (intensity < 1) {
    color.lerp(materials.state.border, 1 - intensity);
  }
  return color;
}

function calculateSignalImpact(signal = {}, layerImpact = 0.35) {
  const explicitImpact = Number(signal?.impact);
  const aggregateBoost = Math.min(0.18, Math.log10(Math.max(1, Number(signal?.aggregateCount || 1))) / 16);
  if (Number.isFinite(explicitImpact) && explicitImpact > 0) {
    return clamp((layerImpact * 0.3) + (explicitImpact * 0.64) + aggregateBoost, 0.16, 1);
  }
  const valueLength = String(signal?.value || '').trim().length;
  const valueImpact = Math.min(1, valueLength / 80);
  return clamp((layerImpact * 0.56) + (valueImpact * 0.34) + aggregateBoost, 0.2, 1);
}

function createConnectionMaterial(materials, state = 'pending') {
  const stateMaterial = createStateMaterial(materials, state);
  const opacity = state === 'complete' || state === 'stable'
    ? 0.86
    : state === 'forming'
      ? 0.58
      : 0.32;
  return new THREE.MeshBasicMaterial({
    color: stateMaterial.color,
    transparent: true,
    opacity,
  });
}

function readDigitalBrainTokens(surface) {
  return {
    cortex: readResolvedCssColor(surface, '--digital-brain-cortex-base', '#a68d83'),
    border: readResolvedCssColor(surface, '--digital-brain-cortex-border', '#8a8a8a'),
    fold: readResolvedCssColor(surface, '--digital-brain-cortex-fold', '#8a8a8a'),
    brainstem: readResolvedCssColor(surface, '--digital-brain-brainstem', '#7d766f'),
    frontal: readResolvedCssColor(surface, '--digital-brain-region-frontal', '#6f9f78'),
    parietal: readResolvedCssColor(surface, '--digital-brain-region-parietal', '#4f8f8f'),
    temporal: readResolvedCssColor(surface, '--digital-brain-region-temporal', '#b9822b'),
    occipital: readResolvedCssColor(surface, '--digital-brain-region-occipital', '#7d766f'),
    limbic: readResolvedCssColor(surface, '--digital-brain-region-limbic', '#b84a4a'),
    identity: readResolvedCssColor(surface, '--digital-brain-layer-identity', '#00ffff'),
    source: readResolvedCssColor(surface, '--digital-brain-layer-source', '#67d391'),
    personality: readResolvedCssColor(surface, '--digital-brain-layer-personality', '#ffcc00'),
    memory: readResolvedCssColor(surface, '--digital-brain-layer-memory', '#008080'),
    voice: readResolvedCssColor(surface, '--digital-brain-layer-voice', '#ff5555'),
    success: readResolvedCssColor(surface, '--digital-brain-node-stable', readResolvedCssColor(surface, STATE_TOKEN_MAP.complete, '#67d391')),
    warning: readResolvedCssColor(surface, '--digital-brain-node-forming', readResolvedCssColor(surface, STATE_TOKEN_MAP.forming, '#dfc16a')),
    danger: readResolvedCssColor(surface, '--digital-brain-node-blocked', readResolvedCssColor(surface, STATE_TOKEN_MAP.blocked, '#e06b6b')),
    focus: readResolvedCssColor(surface, '--digital-brain-node-focus', '#ffffff'),
  };
}

function readResolvedCssColor(surface, token, fallback) {
  const styles = getComputedStyle(surface);
  const value = String(styles.getPropertyValue(token) || '').trim();
  if (!value) return fallback;
  if (!value.includes('color-mix(') && !value.includes('var(')) {
    return normalizeComputedCssColor(value) || fallback;
  }

  const probe = document.createElement('span');
  probe.style.position = 'absolute';
  probe.style.pointerEvents = 'none';
  probe.style.visibility = 'hidden';
  probe.style.color = `var(${token})`;
  surface.append(probe);

  const resolved = getComputedStyle(probe).color;
  probe.remove();
  return normalizeComputedCssColor(resolved) || fallback;
}

function normalizeComputedCssColor(value = '') {
  const color = String(value || '').trim();
  const rgbaMatch = color.match(/^rgba?\(([^)]+)\)$/i);
  if (rgbaMatch) {
    const channels = rgbaMatch[1]
      .split(',')
      .slice(0, 3)
      .map((channel) => Math.max(0, Math.min(255, Math.round(Number(channel.trim())))));
    if (channels.length === 3 && channels.every((channel) => Number.isFinite(channel))) {
      return `rgb(${channels.join(', ')})`;
    }
  }
  if (!color.startsWith('color(srgb ')) return color;

  const payload = color
    .replace(/^color\(srgb\s+/i, '')
    .replace(/\)$/i, '')
    .trim();
  const [channelsPart, alphaPart] = payload.split('/').map((part) => part.trim());
  const channels = channelsPart
    .split(/\s+/)
    .slice(0, 3)
    .map((channel) => Math.max(0, Math.min(255, Math.round(Number(channel) * 255))));

  if (channels.length !== 3 || channels.some((channel) => Number.isNaN(channel))) return color;

  return `rgb(${channels.join(', ')})`;
}

function createThreeColor(value) {
  const color = new THREE.Color();
  try {
    color.set(normalizeComputedCssColor(value) || value);
  } catch (_) {
    color.set('#ffffff');
  }
  return color;
}

function createAmbientLight(tokens) {
  return new THREE.AmbientLight(createThreeColor(tokens.cortex), 0.86);
}

function createDirectionalLight(tokens, x, y, z, intensity) {
  const light = new THREE.DirectionalLight(createThreeColor(tokens.cortex), intensity);
  light.position.set(x, y, z);
  return light;
}

function createLayerStateMap(layers = []) {
  return new Map((Array.isArray(layers) ? layers : []).map((layer) => [layer.id, layer.state]));
}

function mapLayerPosition(layer = {}) {
  return {
    x: ((Number(layer.x) || 50) - 50) / 38,
    y: (50 - (Number(layer.y) || 50)) / 38,
    z: ((Number(layer.z) || 0) / 40) + 0.42,
  };
}

function readAngle(value = '', fallback = 0) {
  const number = Number(String(value).replace('deg', ''));
  return Number.isFinite(number) ? (number * Math.PI) / 180 : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function disposeThreeObject(object) {
  object.traverse((child) => {
    if (child.geometry) child.geometry.dispose();
    if (child.material) {
      if (Array.isArray(child.material)) {
        child.material.forEach((material) => {
          material.map?.dispose?.();
          material.dispose();
        });
      } else {
        child.material.map?.dispose?.();
        child.material.dispose();
      }
    }
  });
}

function escapeDigitalBrainText(value = '') {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
