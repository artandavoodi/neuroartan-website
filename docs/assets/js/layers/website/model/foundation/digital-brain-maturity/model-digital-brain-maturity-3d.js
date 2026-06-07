// MARK: - Digital Brain Maturity 3D Engine

import * as THREE from '/assets/vendor/three/three.module.js';

const DIGITAL_BRAIN_3D_INSTANCES = new WeakMap();

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
  instance.camera.position.z = 6.6 / zoom;
  instance.camera.updateProjectionMatrix();

  const focus = String(surface.dataset.digitalBrainFocus || '').trim();
  const atlasFocus = String(surface.dataset.digitalBrainAtlasFocus || '').trim();
  const signalFocus = String(surface.dataset.digitalBrainSignalFocus || '').trim();
  const subnodesVisible = surface.dataset.digitalBrainSubnodes !== 'hidden';
  const constructScale = readDigitalBrainControl(surface, 'digitalBrainConstructScale', 1);
  const constructSpread = readDigitalBrainControl(surface, 'digitalBrainConstructSpread', 1);
  const signalIntensity = readDigitalBrainControl(surface, 'digitalBrainSignalIntensity', 1);
  if (!focus) surface.dataset.digitalBrainSignalFocus = '';
  instance.activeLayerId = focus;
  instance.layerMeshes.forEach((mesh, layerId) => {
    const active = !focus || layerId === focus;
    const viewOpacity = view === 'regions' ? 0.54 : view === 'connections' ? 0.72 : 1;
    mesh.material.opacity = active ? viewOpacity : 0.2;
    const nodeScale = readDigitalBrainControl(surface, 'digitalBrainNodeScale', 1);
    mesh.scale.setScalar((active ? (view === 'nodes' ? 1.18 : 1.04) : 0.84) * nodeScale);
  });
  instance.nodesGroup.children.forEach((child) => {
    const isSignalNode = Boolean(child.userData?.signal);
    const isSignalConnection = child.name.startsWith('signal-line:');
    if (!isSignalNode && !isSignalConnection) return;

    const layerId = child.userData?.layer?.id || '';
    const signalId = child.userData?.signal?.id || '';
    const impact = Number(child.userData?.impact || 0.35);
    const active = !focus || layerId === focus;
    const signalActive = active && (!signalFocus || signalId === signalFocus);
    child.visible = subnodesVisible;
    updateDigitalBrainSignalPosition(child, constructSpread);
    if (child.material) {
      child.material.opacity = isSignalConnection
        ? clamp((signalActive ? 0.1 + (impact * 0.22) : active ? 0.08 : 0.035) * signalIntensity, 0, 1)
        : clamp((signalActive ? 0.42 + (impact * 0.52) : active ? 0.32 + (impact * 0.22) : 0.12) * signalIntensity, 0, 1);
    }
    if (isSignalNode) {
      child.scale.setScalar((signalActive ? 1 : 0.74) * constructScale * (0.82 + (impact * 0.24)));
    }
  });

  instance.connectionsGroup.children.forEach((line) => {
    const from = line.userData?.from || '';
    const to = line.userData?.to || '';
    const active = !focus || from === focus || to === focus;
    const baseOpacity = line.userData?.baseOpacity || 0.72;
    line.material.opacity = active
      ? view === 'connections' ? Math.min(1, baseOpacity + 0.18) : baseOpacity
      : 0.1;
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
    const viewOpacity = view === 'nodes'
      ? 0.32
      : view === 'connections'
        ? 0.24
        : view === 'regions'
          ? Math.min(0.78, baseOpacity + 0.08)
          : baseOpacity;
    mesh.material.opacity = clamp((active ? viewOpacity : 0.16) * regionOpacity, 0, 1);
    mesh.material.emissiveIntensity = active && (atlasFocus || layerRelated) ? 0.1 : 0;
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

  addLobe(brain, 'frontal-left', materials.frontal, [-0.58, 0.48, 0.12], [1.12, 0.9, 0.78], [0.02, 0.08, -0.14], atlasMeshes);
  addLobe(brain, 'frontal-right', materials.frontal, [0.58, 0.48, 0.12], [1.12, 0.9, 0.78], [0.02, -0.08, 0.14], atlasMeshes);
  addLobe(brain, 'parietal-left', materials.parietal, [-0.5, 0.04, -0.2], [1, 0.84, 0.74], [0.04, 0.08, -0.08], atlasMeshes);
  addLobe(brain, 'parietal-right', materials.parietal, [0.5, 0.04, -0.2], [1, 0.84, 0.74], [0.04, -0.08, 0.08], atlasMeshes);
  addLobe(brain, 'temporal-left', materials.temporal, [-0.86, -0.38, 0.08], [0.78, 0.5, 0.58], [-0.16, 0.1, -0.16], atlasMeshes);
  addLobe(brain, 'temporal-right', materials.temporal, [0.86, -0.38, 0.08], [0.78, 0.5, 0.58], [-0.16, -0.1, 0.16], atlasMeshes);
  addLobe(brain, 'occipital-left', materials.occipital, [-0.36, -0.08, -0.86], [0.72, 0.66, 0.5], [0.04, 0.16, -0.08], atlasMeshes);
  addLobe(brain, 'occipital-right', materials.occipital, [0.36, -0.08, -0.86], [0.72, 0.66, 0.5], [0.04, -0.16, 0.08], atlasMeshes);
  addLobe(brain, 'limbic-core', materials.limbic, [0, -0.14, 0.42], [0.7, 0.26, 0.26], [0.08, 0, 0], atlasMeshes);
  addLobe(brain, 'cerebellum-left', materials.cerebellum, [-0.32, -0.9, -0.48], [0.48, 0.26, 0.3], [0.18, 0, -0.08], atlasMeshes);
  addLobe(brain, 'cerebellum-right', materials.cerebellum, [0.32, -0.9, -0.48], [0.48, 0.26, 0.3], [0.18, 0, 0.08], atlasMeshes);

  const brainstem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.18, 0.82, 28, 1),
    materials.brainstem.clone(),
  );
  brainstem.name = 'brainstem';
  brainstem.position.set(0, -1.22, -0.22);
  brainstem.rotation.x = 0.1;
  assignAtlasRegion(brainstem, 'brainstem', atlasMeshes);
  brain.add(brainstem);

  addFoldSet(brain, materials.fold);
  addMidline(brain, materials.midline);
  brain.scale.set(1.18, 1.32, 1.12);
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
  const signals = Array.isArray(layer.signals) ? layer.signals : [];
  if (!signals.length) return;

  signals.slice(0, 18).forEach((signal, index) => {
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

    const points = [origin.clone(), position.clone()];
    const lineMaterial = materials.connection.clone();
    lineMaterial.color = getLayerColor(materials, layer.id);
    lineMaterial.opacity = 0.08 + (signalImpact * 0.18);
    const line = new THREE.Mesh(createConnectionTubeGeometry(points, 0.003 + (signalImpact * 0.0025)), lineMaterial);
    line.name = `signal-line:${layer.id}:${signal.id || index}`;
    line.userData.layer = layer;
    line.userData.signal = signal;
    line.userData.connectionPoints = points;
    line.userData.baseRadius = 0.003 + (signalImpact * 0.0025);
    line.userData.impact = signalImpact;
    line.userData.origin = origin.clone();
    line.userData.baseOffset = offset.clone();
    group.add(line);
  });
}

function updateDigitalBrainSignalPosition(mesh, constructSpread = 1) {
  const origin = mesh.userData?.origin;
  const baseOffset = mesh.userData?.baseOffset;
  if (!(origin instanceof THREE.Vector3) || !(baseOffset instanceof THREE.Vector3)) return;

  const nextPosition = origin.clone().add(baseOffset.clone().multiplyScalar(constructSpread));
  if (mesh.userData?.signal && !mesh.name.startsWith('signal-line:')) {
    mesh.position.copy(nextPosition);
    return;
  }

  if (mesh.name.startsWith('signal-line:')) {
    mesh.userData.connectionPoints = [origin.clone(), nextPosition];
  }
}

function createSignalOffset(index = 0, total = 1) {
  const angle = ((Math.PI * 2) / Math.max(1, Math.min(total, 18))) * index;
  const ring = Math.floor(index / 8);
  const radius = 0.18 + (ring * 0.08);

  return new THREE.Vector3(
    Math.cos(angle) * radius,
    Math.sin(angle) * radius * 0.72,
    0.08 + (ring * 0.03),
  );
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
  const constructScale = readDigitalBrainControl(instance.surface, 'digitalBrainConstructScale', 1);
  const updateMesh = (mesh) => {
    if (!(mesh instanceof THREE.Mesh) || !Array.isArray(mesh.userData?.connectionPoints)) return;
    const baseRadius = Number(mesh.userData.baseRadius || 0.006);
    const signalScale = mesh.name.startsWith('signal-line:') ? constructScale : 1;
    const nextRadius = Math.max(0.0015, baseRadius * connectionScale * signalScale);
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
    instance.targetRotationY = clamp(instance.rotationY + deltaX * 0.006, -0.84, 0.84);
    instance.targetRotationX = clamp(instance.rotationX + deltaY * 0.004, -0.48, 0.48);
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
  instance.brainGroup.rotation.x += (instance.targetRotationX - instance.brainGroup.rotation.x) * 0.08;
  instance.brainGroup.rotation.y += (instance.targetRotationY - instance.brainGroup.rotation.y) * 0.08;
  instance.nodesGroup.rotation.copy(instance.brainGroup.rotation);
  instance.connectionsGroup.rotation.copy(instance.brainGroup.rotation);

  const pulse = (Math.sin(Date.now() / 900) + 1) / 2;
  const nodeScale = readDigitalBrainControl(instance.surface, 'digitalBrainNodeScale', 1);
  const constructSpread = readDigitalBrainControl(instance.surface, 'digitalBrainConstructSpread', 1);
  const constructScale = readDigitalBrainControl(instance.surface, 'digitalBrainConstructScale', 1);
  instance.nodesGroup.children.forEach((child) => {
    if (child.name.startsWith('node-ring:')) {
      const active = !instance.activeLayerId || child.userData?.layer?.id === instance.activeLayerId;
      child.scale.setScalar((active ? 1 + (motionPaused ? 0 : pulse * 0.18) : 0.88) * nodeScale);
      if (!motionPaused) child.rotation.z += 0.006;
    } else if (child.userData?.signal && !child.name.startsWith('signal-line:')) {
      updateDigitalBrainSignalPosition(child, constructSpread);
      const impact = Number(child.userData?.impact || 0.35);
      child.scale.setScalar(constructScale * (0.82 + (impact * 0.2)) * (motionPaused ? 1 : 1 + (pulse * 0.08)));
    }
  });
  const connectionScale = readDigitalBrainControl(instance.surface, 'digitalBrainConnectionScale', 1);
  instance.connectionsGroup.children.forEach((line) => {
    const base = line.userData?.baseOpacity || 0.32;
    const from = line.userData?.from || '';
    const to = line.userData?.to || '';
    const active = !instance.activeLayerId || from === instance.activeLayerId || to === instance.activeLayerId;
    line.material.opacity = clamp((active ? Math.min(1, base + (motionPaused ? 0 : pulse * 0.1)) : 0.12) * connectionScale, 0, 1);
  });

  if (!motionPaused && !instance.dragging && !instance.activeLayerId) {
    instance.targetRotationY += 0.001;
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
  return `
    <div><dt>System</dt><dd>${escapeDigitalBrainText(region.system || 'Distributed model layer')}</dd></div>
    <div><dt>Lobe</dt><dd>${escapeDigitalBrainText(region.lobe || 'Distributed')}</dd></div>
    <div><dt>Hemisphere</dt><dd>${escapeDigitalBrainText(region.hemisphere || 'Bilateral / model-wide')}</dd></div>
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
    if (!(mesh instanceof THREE.Mesh) || !mesh.userData?.signal || mesh.name.startsWith('signal-line:')) return;
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
  return (Array.isArray(layer?.signals) ? layer.signals : [])
    .map((signal) => signal.value ? `${signal.label}: ${signal.value}` : signal.label)
    .filter(Boolean);
}

function getDigitalBrainMaturity3DInstance(surface) {
  const graph = surface?.querySelector?.('[data-digital-brain-maturity-graph]');
  return graph instanceof HTMLElement ? DIGITAL_BRAIN_3D_INSTANCES.get(graph) : null;
}

function readDigitalBrainControl(surface, key, fallback = 1) {
  const value = Number(surface?.dataset?.[key] || fallback);
  return Number.isFinite(value) ? value : fallback;
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
    brainstem: new THREE.MeshStandardMaterial({ color: brainstem, roughness: 0.68, metalness: 0.04, transparent: true, opacity: 0.72 }),
    fold: new THREE.MeshStandardMaterial({ color: fold, roughness: 0.82, metalness: 0.02, transparent: true, opacity: 0.34 }),
    midline: new THREE.MeshStandardMaterial({ color: focus, roughness: 0.7, metalness: 0.02, transparent: true, opacity: 0.36 }),
    nodeRing: new THREE.MeshBasicMaterial({ color: border, transparent: true, opacity: 0.44 }),
    nodeFallback: new THREE.MeshStandardMaterial({ color: border, roughness: 0.52, transparent: true, opacity: 0.94 }),
    connection: new THREE.MeshBasicMaterial({ color: border, transparent: true, opacity: 0.38 }),
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

function createBrainMaterial(baseColor, tintColor, mix = 0.5) {
  const color = baseColor.clone().lerp(tintColor, mix);
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.74,
    metalness: 0.02,
    transparent: true,
    opacity: 0.68,
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
  const signals = Array.isArray(layer.signals) ? layer.signals : [];
  const liveSignals = signals.filter((signal) => signal?.source !== 'foundation_construct');
  const valuedSignals = liveSignals.filter((signal) => String(signal?.value || '').trim()).length;
  const signalRatio = Math.min(1, liveSignals.length / 10);
  const valueRatio = liveSignals.length ? valuedSignals / liveSignals.length : 0;
  const stateWeight = layer.state === 'complete' || layer.state === 'stable'
    ? 0.24
    : layer.state === 'forming'
      ? 0.14
      : 0.04;

  return clamp(0.22 + (signalRatio * 0.34) + (valueRatio * 0.28) + stateWeight, 0.24, 1);
}

function calculateSignalImpact(signal = {}, layerImpact = 0.35) {
  const valueLength = String(signal?.value || '').trim().length;
  const valueImpact = Math.min(1, valueLength / 80);
  return clamp((layerImpact * 0.62) + (valueImpact * 0.38), 0.2, 1);
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
        child.material.forEach((material) => material.dispose());
      } else {
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
