// MARK: - Digital Brain Maturity Renderer

import {
  DIGITAL_BRAIN_ATLAS_REGIONS,
  initializeDigitalBrainMaturity3D,
  updateDigitalBrainMaturity3D,
} from './model-digital-brain-maturity-3d.js';

import {
  saveModelDigitalBrainPreferences,
} from '../../../system/model/model-store.js';

import {
  searchModelSourceVaultEntries,
} from '../../../system/model/model-training-store.js';

const DIGITAL_BRAIN_REGIONS = Object.freeze({
  identity: {
    label: 'Identity',
    region: 'Medial prefrontal cortex',
    lobe: 'Frontal lobe',
    hemisphere: 'Midline / bilateral',
    system: 'Self-reference network',
    note: 'Self-reference, autobiographical meaning, identity continuity, and owner-bound model identity.',
    x: 50,
    y: 22,
    z: 18,
  },
  source: {
    label: 'Source',
    region: 'Anterior cingulate and insula',
    lobe: 'Salience / interoceptive network',
    hemisphere: 'Bilateral',
    system: 'Agency and regulation network',
    note: 'Agency, internal signal monitoring, axioms, core beliefs, regulation, reflective orientation, and Source profile state.',
    x: 68,
    y: 33,
    z: 26,
  },
  personality: {
    label: 'Personality',
    region: 'Fronto-temporal association cortex',
    lobe: 'Frontal and temporal association areas',
    hemisphere: 'Bilateral',
    system: 'Trait and social cognition network',
    note: 'Cognitive style, motivational pattern, social expression, regulation pattern, reflection tolerance, and stable response style.',
    x: 52,
    y: 43,
    z: 20,
  },
  memory: {
    label: 'Memory',
    region: 'Hippocampus, medial temporal lobe, and amygdala interface',
    lobe: 'Medial temporal lobe',
    hemisphere: 'Bilateral',
    system: 'Memory and emotional salience network',
    note: 'Episodic memory, continuity, context linking, retrieval, and emotional tagging.',
    x: 35,
    y: 55,
    z: 34,
  },
  voice: {
    label: 'Voice',
    region: 'Auditory cortex, Broca network, motor speech network',
    lobe: 'Temporal, frontal, and motor speech areas',
    hemisphere: 'Left-dominant with bilateral prosody',
    system: 'Auditory-motor expression network',
    note: 'Voice samples, prosody, speech memory, verification, and controlled activation.',
    x: 72,
    y: 57,
    z: 14,
  },
});

const DIGITAL_BRAIN_ICON_BASE = '/registry/icons/public/assets/core/model/digital-brain-maturity';
const DIGITAL_BRAIN_SEARCH_INDEX = new WeakMap();
const DIGITAL_BRAIN_SOURCE_SEARCH_TIMERS = new WeakMap();
const DIGITAL_BRAIN_SOURCE_SEARCH_REQUESTS = new WeakMap();
const DIGITAL_BRAIN_SAVE_TIMERS = new WeakMap();
const DIGITAL_BRAIN_SEARCH_RESULT_LIMIT = 24;
const DIGITAL_BRAIN_MAX_VISUAL_SIGNALS_PER_LAYER = 10;
const DIGITAL_BRAIN_SENSITIVE_QUERY_PATTERN = /\b(api|auth|token|secret|password|passkey|private key|owner id|model id|profile id|user id|birth certificate|serial)\b/i;
const DIGITAL_BRAIN_UUID_PATTERN = /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi;
const DIGITAL_BRAIN_SECRET_PATTERN = /\b(?:sk-[a-z0-9_-]{12,}|pk_[a-z0-9_-]{12,}|eyJ[a-z0-9_-]{16,}|[a-z0-9]{32,})\b/gi;
const DIGITAL_BRAIN_PREFERENCE_LIMITS = Object.freeze({
  connectionScale: { min: 0, max: 1 },
  constructScale: { min: 0, max: 1 },
});

const DIGITAL_BRAIN_VIEW_CONTROLS = Object.freeze([
  { id: 'overview', label: 'Overview', icon: `${DIGITAL_BRAIN_ICON_BASE}/brain-overview.svg` },
  { id: 'regions', label: 'Regions', icon: `${DIGITAL_BRAIN_ICON_BASE}/brain-regions.svg` },
  { id: 'nodes', label: 'Nodes', icon: `${DIGITAL_BRAIN_ICON_BASE}/brain-nodes.svg` },
  { id: 'connections', label: 'Connections', icon: `${DIGITAL_BRAIN_ICON_BASE}/brain-connections.svg` },
]);

export function renderDigitalBrainMaturity(root, state = {}) {
  const surface = root.querySelector?.('[data-digital-brain-maturity-surface]');
  const graph = root.querySelector?.('[data-digital-brain-maturity-graph]');
  const layerList = root.querySelector?.('[data-digital-brain-maturity-layers]');

  if (!(surface instanceof HTMLElement)) return;

  surface.dataset.digitalBrainModelId = state.runtime?.modelId || surface.dataset.digitalBrainModelId || '';
  applyDigitalBrainSavedPreferences(surface, state.runtime?.digitalBrainPreferences || null);
  surface.dataset.digitalBrainMaturityState = state.maturity?.state || 'pending';
  surface.dataset.digitalBrainView = surface.dataset.digitalBrainView || 'overview';
  surface.dataset.digitalBrainDisplayMode = surface.dataset.digitalBrainDisplayMode || 'nodes';
  surface.dataset.digitalBrainFocus = surface.dataset.digitalBrainFocus || '';
  surface.style.setProperty('--digital-brain-zoom', surface.dataset.digitalBrainZoom || '1');
  surface.style.setProperty('--digital-brain-pan-x', surface.dataset.digitalBrainPanX || '0px');
  surface.style.setProperty('--digital-brain-pan-y', surface.dataset.digitalBrainPanY || '0px');
  surface.style.setProperty('--digital-brain-rotate-x', surface.dataset.digitalBrainRotateX || '0deg');
  surface.style.setProperty('--digital-brain-rotate-y', surface.dataset.digitalBrainRotateY || '0deg');
  surface.style.setProperty('--digital-brain-node-scale', surface.dataset.digitalBrainNodeScale || '1');
  surface.style.setProperty('--digital-brain-connection-scale', surface.dataset.digitalBrainConnectionScale || '1');
  surface.style.setProperty('--digital-brain-connection-visibility', surface.dataset.digitalBrainConnectionVisibility || '1');
  surface.style.setProperty('--digital-brain-connection-pulse', surface.dataset.digitalBrainConnectionPulse || '1');
  surface.style.setProperty('--digital-brain-region-opacity', surface.dataset.digitalBrainRegionOpacity || '1');
  surface.style.setProperty('--digital-brain-label-scale', surface.dataset.digitalBrainLabelScale || '1');
  surface.style.setProperty('--digital-brain-construct-scale', surface.dataset.digitalBrainConstructScale || '1');
  surface.style.setProperty('--digital-brain-construct-spread', surface.dataset.digitalBrainConstructSpread || '1');
  surface.style.setProperty('--digital-brain-signal-intensity', surface.dataset.digitalBrainSignalIntensity || '1');
  surface.style.setProperty('--digital-brain-blur-intensity', surface.dataset.digitalBrainBlurIntensity || '1');
  surface.style.setProperty('--digital-brain-motion-speed', surface.dataset.digitalBrainMotionSpeed || '1');
  surface.style.setProperty('--digital-brain-color-intensity', surface.dataset.digitalBrainColorIntensity || '1');
  DIGITAL_BRAIN_SEARCH_INDEX.set(surface, createDigitalBrainSearchTerms(state));

  renderDigitalBrainMaturityControls(surface);
  syncDigitalBrainControls(surface);

  if (graph instanceof HTMLElement) {
    renderDigitalBrainMaturityGraph(surface, graph, state);
    bindDigitalBrainViewport(surface, graph);
  }

  if (layerList instanceof HTMLElement) {
    renderDigitalBrainMaturityLayers(layerList, state.layers || []);
  }
}

function renderDigitalBrainMaturityGraph(surface, graph, state = {}) {
  const layers = Array.isArray(state.layers) ? state.layers : [];
  const existingCanvas = graph.querySelector('[data-digital-brain-three-canvas]');
  const stateSignature = createDigitalBrainStateSignature(state);
  if (existingCanvas instanceof HTMLCanvasElement) {
    if (graph.dataset.digitalBrainStateSignature !== stateSignature) {
      graph.dataset.digitalBrainStateSignature = stateSignature;
      graph.innerHTML = `
        <canvas class="model-digital-brain-maturity__canvas" data-digital-brain-three-canvas aria-label="Interactive 3D Digital Brain Maturity model"></canvas>
        <div class="model-digital-brain-maturity__region-labels" data-digital-brain-region-labels aria-hidden="true">
          ${createDigitalBrainLabelMarkup(layers)}
        </div>
        <aside class="model-digital-brain-maturity__focus-panel" data-digital-brain-focus-panel hidden></aside>
      `;
      initializeDigitalBrainMaturity3D(surface, graph, state, DIGITAL_BRAIN_REGIONS);
      return;
    }
    const labels = graph.querySelector('[data-digital-brain-region-labels]');
    if (labels instanceof HTMLElement) {
      labels.innerHTML = createDigitalBrainLabelMarkup(layers);
    }
    updateDigitalBrainMaturity3D(surface, state);
    return;
  }

  graph.innerHTML = `
    <canvas class="model-digital-brain-maturity__canvas" data-digital-brain-three-canvas aria-label="Interactive 3D Digital Brain Maturity model"></canvas>
    <div class="model-digital-brain-maturity__region-labels" data-digital-brain-region-labels aria-hidden="true">
      ${createDigitalBrainLabelMarkup(layers)}
    </div>
    <aside class="model-digital-brain-maturity__focus-panel" data-digital-brain-focus-panel hidden></aside>
  `;
  graph.dataset.digitalBrainStateSignature = stateSignature;
  initializeDigitalBrainMaturity3D(surface, graph, state, DIGITAL_BRAIN_REGIONS);
}

function createDigitalBrainStateSignature(state = {}) {
  const layers = Array.isArray(state.layers) ? state.layers : [];
  return JSON.stringify(layers.map((layer) => ({
    id: layer.id,
    state: layer.state,
    signals: (Array.isArray(layer.signals) ? layer.signals : []).map((signal) => [
      signal.id,
      signal.label,
      signal.value,
      signal.source,
      signal.category,
      signal.subject,
      signal.searchableText,
      signal.impact,
    ]),
  })));
}

function renderDigitalBrainMaturityControls(surface) {
  if (surface.querySelector('[data-digital-brain-maturity-controls]')) return;

  const controls = document.createElement('div');
  controls.className = 'model-digital-brain-maturity__controls';
  controls.dataset.digitalBrainMaturityControls = '';
  controls.innerHTML = `
    <div class="model-digital-brain-maturity__navigator">
      <label class="model-digital-brain-maturity__search">
        <img class="model-digital-brain-maturity__search-icon ui-icon-theme-aware" src="/registry/icons/public/assets/core/actions/search/search.svg" alt="">
        <input type="search" data-digital-brain-search placeholder="Search" autocomplete="off">
        <button class="model-digital-brain-maturity__search-clear" type="button" data-digital-brain-search-clear aria-label="Clear search" hidden>
          <img class="model-digital-brain-maturity__search-clear-icon ui-icon-theme-aware" src="/registry/icons/public/assets/core/actions/close/close.svg" alt="">
        </button>
      </label>
      <div class="model-digital-brain-maturity__search-results" data-digital-brain-search-results hidden></div>
    </div>

    <div class="model-digital-brain-maturity__toolbar" aria-label="Digital brain controls">
      <div class="model-digital-brain-maturity__control-group" aria-label="Digital brain view controls">
        ${DIGITAL_BRAIN_VIEW_CONTROLS.map((control, index) => `
          <button class="model-digital-brain-maturity__control" type="button" data-digital-brain-view-action="${control.id}" aria-pressed="${index === 0 ? 'true' : 'false'}">
            <img class="model-digital-brain-maturity__control-icon ui-icon-theme-aware" src="${control.icon}" alt="">
            <span>${control.label}</span>
          </button>
        `).join('')}
      </div>
      <div class="model-digital-brain-maturity__zoom" aria-label="Digital brain zoom controls">
        <button class="model-digital-brain-maturity__control model-digital-brain-maturity__control--icon" type="button" data-digital-brain-zoom-action="out" aria-label="Zoom out">
          <img class="model-digital-brain-maturity__control-icon ui-icon-theme-aware" src="/registry/icons/public/assets/core/actions/visibility/zoom-out.svg" alt="">
        </button>
        <button class="model-digital-brain-maturity__control model-digital-brain-maturity__control--icon" type="button" data-digital-brain-zoom-action="reset" aria-label="Reset view">
          <img class="model-digital-brain-maturity__control-icon ui-icon-theme-aware" src="/registry/icons/public/assets/core/actions/reset/reset.svg" alt="">
        </button>
        <button class="model-digital-brain-maturity__control model-digital-brain-maturity__control--icon" type="button" data-digital-brain-zoom-action="in" aria-label="Zoom in">
          <img class="model-digital-brain-maturity__control-icon ui-icon-theme-aware" src="/registry/icons/public/assets/core/actions/visibility/zoom-in.svg" alt="">
        </button>
        <button class="model-digital-brain-maturity__control model-digital-brain-maturity__control--icon" type="button" data-digital-brain-fullscreen aria-label="Open fullscreen">
          <img class="model-digital-brain-maturity__control-icon ui-icon-theme-aware" src="/registry/icons/public/assets/core/actions/fullscreen/fullscreen.svg" alt="">
        </button>
        <button class="model-digital-brain-maturity__control model-digital-brain-maturity__control--icon" type="button" data-digital-brain-controls-toggle aria-expanded="false" aria-label="Brain map controls">
          <img class="model-digital-brain-maturity__control-icon ui-icon-theme-aware" src="/registry/icons/public/assets/layers/website/model/tabs/preferences.svg" alt="">
        </button>
      </div>
      <section class="model-digital-brain-maturity__settings-panel" data-digital-brain-controls-panel hidden aria-label="Brain map controls">
        <button class="model-digital-brain-maturity__settings-toggle" type="button" data-digital-brain-display-mode-toggle aria-pressed="false" aria-label="Switch to scan mode">
          <img class="model-digital-brain-maturity__control-icon ui-icon-theme-aware" src="${DIGITAL_BRAIN_ICON_BASE}/brain-display-nodes.svg" alt="">
          <span>Node map</span>
        </button>
        <button class="model-digital-brain-maturity__settings-toggle" type="button" data-digital-brain-motion-toggle aria-pressed="false" aria-label="Pause motion">
          <img class="model-digital-brain-maturity__control-icon ui-icon-theme-aware" src="${DIGITAL_BRAIN_ICON_BASE}/brain-motion-pause.svg" alt="">
          <span>Pause motion</span>
        </button>
        <button class="model-digital-brain-maturity__settings-toggle" type="button" data-digital-brain-motion-direction-toggle aria-pressed="false" aria-label="Rotate left">
          <img class="model-digital-brain-maturity__control-icon ui-icon-theme-aware" src="${DIGITAL_BRAIN_ICON_BASE}/brain-motion-speed.svg" alt="">
          <span>Rotate right</span>
        </button>
        <button class="model-digital-brain-maturity__settings-toggle" type="button" data-digital-brain-subnodes-toggle aria-pressed="true" aria-label="Hide construct nodes">
          <img class="model-digital-brain-maturity__control-icon ui-icon-theme-aware" src="${DIGITAL_BRAIN_ICON_BASE}/brain-construct-nodes-on.svg" alt="">
          <span>Construct nodes</span>
        </button>
        <button class="model-digital-brain-maturity__settings-toggle" type="button" data-digital-brain-labels-toggle aria-pressed="true" aria-label="Hide construct labels">
          <img class="model-digital-brain-maturity__control-icon ui-icon-theme-aware" src="${DIGITAL_BRAIN_ICON_BASE}/brain-construct-labels-on.svg" alt="">
          <span>Construct labels</span>
        </button>
        ${createDigitalBrainControlRange('nodeScale', 'Core node scale', 0, 1.4, 0.05, 1)}
        ${createDigitalBrainControlRange('constructScale', 'Construct node scale', 0, 1, 0.05, 1)}
        ${createDigitalBrainControlRange('signalIntensity', 'Construct visibility', 0, 1.45, 0.05, 1)}
        ${createDigitalBrainControlRange('constructSpread', 'Construct spread', 0, 1.65, 0.05, 1)}
        ${createDigitalBrainControlRange('labelScale', 'Construct label scale', 0, 1.35, 0.05, 1)}
        ${createDigitalBrainControlRange('regionOpacity', 'Regions', 0, 1, 0.05, 1)}
        ${createDigitalBrainControlRange('connectionScale', 'Connection thickness', 0, 1, 0.05, 1)}
        ${createDigitalBrainControlRange('connectionVisibility', 'Connection visibility', 0, 2.5, 0.05, 1)}
        ${createDigitalBrainControlRange('connectionPulse', 'Connection pulse', 0, 2.5, 0.05, 1)}
        ${createDigitalBrainControlRange('blurIntensity', 'Signal blur', 0, 2, 0.05, 1)}
        ${createDigitalBrainControlRange('colorIntensity', 'Color intensity', 0, 1.6, 0.05, 1)}
        ${createDigitalBrainControlRange('motionSpeed', 'Motion speed', 0, 2.5, 0.05, 1)}
      </section>
    </div>
  `;

  surface.prepend(controls);
  bindDigitalBrainMaturityControls(surface);
}

function bindDigitalBrainMaturityControls(surface) {
  if (surface.dataset.digitalBrainControlsBound === 'true') return;
  surface.dataset.digitalBrainControlsBound = 'true';
  surface.dataset.digitalBrainZoom = surface.dataset.digitalBrainZoom || '1';
  surface.dataset.digitalBrainView = surface.dataset.digitalBrainView || 'overview';
  surface.dataset.digitalBrainDisplayMode = surface.dataset.digitalBrainDisplayMode || 'nodes';
  surface.dataset.digitalBrainMotionDirection = surface.dataset.digitalBrainMotionDirection || 'clockwise';
  surface.dataset.digitalBrainSubnodes = surface.dataset.digitalBrainSubnodes || 'visible';
  surface.dataset.digitalBrainLabels = surface.dataset.digitalBrainLabels || 'visible';

  surface.querySelectorAll('[data-digital-brain-view-action]').forEach((button) => {
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      if (!(button instanceof HTMLButtonElement)) return;
      setDigitalBrainView(surface, button.dataset.digitalBrainViewAction || 'overview');
    });
  });

  surface.querySelectorAll('[data-digital-brain-zoom-action]').forEach((button) => {
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      if (!(button instanceof HTMLButtonElement)) return;
      updateDigitalBrainZoom(surface, button.dataset.digitalBrainZoomAction || 'reset');
    });
  });

  surface.querySelectorAll('[data-digital-brain-fullscreen]').forEach((button) => {
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      const stage = surface.querySelector('[data-digital-brain-maturity-graph]');
      if (stage instanceof HTMLElement && stage.requestFullscreen) {
        void stage.requestFullscreen();
      }
    });
  });

  surface.addEventListener('input', (event) => {
    const search = event.target.closest('[data-digital-brain-search]');
    if (!(search instanceof HTMLInputElement)) return;

    const results = surface.querySelector('[data-digital-brain-search-results]');
    const clear = surface.querySelector('[data-digital-brain-search-clear]');
    if (!(results instanceof HTMLElement)) return;

    const query = search.value.trim().toLowerCase();
    if (clear instanceof HTMLButtonElement) clear.hidden = !query;
    if (!query) {
      clearDigitalBrainSourceSearch(surface);
      results.hidden = true;
      results.innerHTML = '';
      return;
    }

    const terms = DIGITAL_BRAIN_SEARCH_INDEX.get(surface) || [];
    const matches = terms.filter((item) => {
      return !query
        || item.label.toLowerCase().includes(query)
        || item.type.toLowerCase().includes(query)
        || item.description.toLowerCase().includes(query);
    }).sort((a, b) => rankDigitalBrainSearchResult(a, query) - rankDigitalBrainSearchResult(b, query)).slice(0, DIGITAL_BRAIN_SEARCH_RESULT_LIMIT);

    results.hidden = false;
    results.innerHTML = renderDigitalBrainSearchResults(matches, { pending: true });
    scheduleDigitalBrainSourceSearch(surface, query, matches);
  });

  surface.addEventListener('click', (event) => {
    const clearSearchButton = event.target.closest('[data-digital-brain-search-clear]');
    if (clearSearchButton instanceof HTMLButtonElement) {
      const search = surface.querySelector('[data-digital-brain-search]');
      const results = surface.querySelector('[data-digital-brain-search-results]');
      if (search instanceof HTMLInputElement) search.value = '';
      if (results instanceof HTMLElement) {
        results.hidden = true;
        results.innerHTML = '';
      }
      clearDigitalBrainSourceSearch(surface);
      clearSearchButton.hidden = true;
      surface.dataset.digitalBrainFocus = '';
      surface.dataset.digitalBrainAtlasFocus = '';
      surface.dataset.digitalBrainSignalFocus = '';
      updateDigitalBrainMaturity3D(surface);
      scheduleDigitalBrainPreferencesSave(surface);
      return;
    }

    const result = event.target.closest('[data-digital-brain-search-result]');
    if (result instanceof HTMLElement) {
      if (result.dataset.digitalBrainSearchKind === 'signal') {
        focusDigitalBrainSignal(
          surface,
          result.dataset.digitalBrainSearchResult || '',
          result.dataset.digitalBrainSignalResult || '',
        );
      } else {
        focusDigitalBrainTarget(
          surface,
          result.dataset.digitalBrainSearchResult || '',
          result.dataset.digitalBrainSearchKind || 'layer',
        );
      }
      return;
    }

    const signalLabel = event.target.closest('[data-digital-brain-signal-label]');
    if (signalLabel instanceof HTMLElement) {
      focusDigitalBrainSignal(
        surface,
        signalLabel.dataset.digitalBrainRegionLabel || '',
        signalLabel.dataset.digitalBrainSignalLabel || '',
      );
      return;
    }

    const label = event.target.closest('[data-digital-brain-region-label]');
    if (label instanceof HTMLElement) {
      focusDigitalBrainTarget(surface, label.dataset.digitalBrainRegionLabel || '', 'layer');
      return;
    }

    const viewButton = event.target.closest('[data-digital-brain-view-action]');
    if (viewButton instanceof HTMLButtonElement) {
      setDigitalBrainView(surface, viewButton.dataset.digitalBrainViewAction || 'overview');
      return;
    }

    const zoomButton = event.target.closest('[data-digital-brain-zoom-action]');
    if (zoomButton instanceof HTMLButtonElement) {
      updateDigitalBrainZoom(surface, zoomButton.dataset.digitalBrainZoomAction || 'reset');
      return;
    }

    const fullscreenButton = event.target.closest('[data-digital-brain-fullscreen]');
    if (fullscreenButton instanceof HTMLButtonElement) {
      const stage = surface.querySelector('[data-digital-brain-maturity-graph]');
      if (stage instanceof HTMLElement && stage.requestFullscreen) {
        void stage.requestFullscreen();
      }
      return;
    }

    const controlsToggle = event.target.closest('[data-digital-brain-controls-toggle]');
    if (controlsToggle instanceof HTMLButtonElement) {
      const panel = surface.querySelector('[data-digital-brain-controls-panel]');
      if (panel instanceof HTMLElement) {
        const open = panel.hidden;
        panel.hidden = !open;
        controlsToggle.setAttribute('aria-expanded', String(open));
      }
      return;
    }

    const motionToggle = event.target.closest('[data-digital-brain-motion-toggle]');
    if (motionToggle instanceof HTMLButtonElement) {
      const paused = surface.dataset.digitalBrainMotion === 'paused';
      surface.dataset.digitalBrainMotion = paused ? 'playing' : 'paused';
      updateDigitalBrainMaturity3D(surface);
      syncDigitalBrainControls(surface);
      scheduleDigitalBrainPreferencesSave(surface);
      return;
    }

    const motionDirectionToggle = event.target.closest('[data-digital-brain-motion-direction-toggle]');
    if (motionDirectionToggle instanceof HTMLButtonElement) {
      const counterclockwise = surface.dataset.digitalBrainMotionDirection === 'counterclockwise';
      surface.dataset.digitalBrainMotionDirection = counterclockwise ? 'clockwise' : 'counterclockwise';
      updateDigitalBrainMaturity3D(surface);
      syncDigitalBrainControls(surface);
      scheduleDigitalBrainPreferencesSave(surface);
      return;
    }

    const displayModeToggle = event.target.closest('[data-digital-brain-display-mode-toggle]');
    if (displayModeToggle instanceof HTMLButtonElement) {
      surface.dataset.digitalBrainDisplayMode = getNextDigitalBrainDisplayMode(surface.dataset.digitalBrainDisplayMode);
      updateDigitalBrainMaturity3D(surface);
      syncDigitalBrainControls(surface);
      scheduleDigitalBrainPreferencesSave(surface);
      return;
    }

    const subnodesToggle = event.target.closest('[data-digital-brain-subnodes-toggle]');
    if (subnodesToggle instanceof HTMLButtonElement) {
      const visible = surface.dataset.digitalBrainSubnodes !== 'hidden';
      surface.dataset.digitalBrainSubnodes = visible ? 'hidden' : 'visible';
      subnodesToggle.setAttribute('aria-pressed', String(!visible));
      subnodesToggle.setAttribute('aria-label', visible ? 'Show construct nodes' : 'Hide construct nodes');
      subnodesToggle.innerHTML = `
        <img class="model-digital-brain-maturity__control-icon ui-icon-theme-aware" src="${DIGITAL_BRAIN_ICON_BASE}/brain-construct-nodes-${visible ? 'off' : 'on'}.svg" alt="">
        <span>Construct nodes</span>
      `;
      updateDigitalBrainMaturity3D(surface);
      scheduleDigitalBrainPreferencesSave(surface);
      return;
    }

    const labelsToggle = event.target.closest('[data-digital-brain-labels-toggle]');
    if (labelsToggle instanceof HTMLButtonElement) {
      const visible = surface.dataset.digitalBrainLabels !== 'hidden';
      surface.dataset.digitalBrainLabels = visible ? 'hidden' : 'visible';
      labelsToggle.setAttribute('aria-pressed', String(!visible));
      labelsToggle.setAttribute('aria-label', visible ? 'Show construct labels' : 'Hide construct labels');
      labelsToggle.innerHTML = `
        <img class="model-digital-brain-maturity__control-icon ui-icon-theme-aware" src="${DIGITAL_BRAIN_ICON_BASE}/brain-construct-labels-${visible ? 'off' : 'on'}.svg" alt="">
        <span>Construct labels</span>
      `;
      updateDigitalBrainMaturity3D(surface);
      scheduleDigitalBrainPreferencesSave(surface);
      return;
    }

    const closePanelButton = event.target.closest('[data-digital-brain-panel-close]');
    if (closePanelButton instanceof HTMLButtonElement) {
      surface.dataset.digitalBrainFocus = '';
      surface.dataset.digitalBrainAtlasFocus = '';
      surface.dataset.digitalBrainSignalFocus = '';
      surface.dataset.digitalBrainView = 'overview';
      surface.querySelectorAll('[data-digital-brain-view-action]').forEach((button) => {
        button.setAttribute('aria-pressed', String(button instanceof HTMLButtonElement && button.dataset.digitalBrainViewAction === 'overview'));
      });
      updateDigitalBrainMaturity3D(surface);
      scheduleDigitalBrainPreferencesSave(surface);
    }
  });

  surface.addEventListener('input', (event) => {
    const control = event.target.closest('[data-digital-brain-control]');
    if (!(control instanceof HTMLInputElement)) return;

    const controlName = control.dataset.digitalBrainControl || '';
    const parsedValue = Number(control.value);
    const value = String(normalizeDigitalBrainPreferenceNumber(controlName, parsedValue, 1));
    const tokenName = controlName.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
    control.value = value;
    if (!tokenName) return;

    surface.dataset[`digitalBrain${controlName.charAt(0).toUpperCase()}${controlName.slice(1)}`] = value;
    surface.style.setProperty(`--digital-brain-${tokenName}`, value);
    updateDigitalBrainMaturity3D(surface);
    writeDigitalBrainPreferencesCache(surface);
    scheduleDigitalBrainPreferencesSave(surface);
  });

  surface.addEventListener('change', (event) => {
    const control = event.target.closest('[data-digital-brain-control]');
    if (!(control instanceof HTMLInputElement)) return;
    writeDigitalBrainPreferencesCache(surface);
    void persistDigitalBrainPreferences(surface);
  });
}

function createDigitalBrainControlRange(id, label, min, max, step, value) {
  return `
    <label class="model-digital-brain-maturity__settings-range">
      <span>${escapeDigitalBrainText(label)}</span>
      <input class="ui-slider" type="range" min="${min}" max="${max}" step="${step}" value="${value}" data-digital-brain-control="${escapeDigitalBrainText(id)}">
    </label>
  `;
}

function applyDigitalBrainSavedPreferences(surface, preferences = null) {
  const modelId = surface.dataset.digitalBrainModelId || '';
  const cachedPreferences = readDigitalBrainPreferencesCache(surface);
  const resolvedPreferences = resolveDigitalBrainFreshestPreferences(preferences, cachedPreferences);
  if (!resolvedPreferences || typeof resolvedPreferences !== 'object') return;
  const hydrationSignature = `${modelId}:${resolvedPreferences.updatedAt || resolvedPreferences.cachedAt || JSON.stringify(resolvedPreferences)}`;
  if (surface.dataset.digitalBrainPreferencesHydratedFor === hydrationSignature) return;
  surface.dataset.digitalBrainPreferencesHydratedFor = hydrationSignature;

  surface.dataset.digitalBrainView = resolveDigitalBrainPreferenceValue(resolvedPreferences.viewMode, surface.dataset.digitalBrainView, 'overview');
  surface.dataset.digitalBrainDisplayMode = resolveDigitalBrainPreferenceValue(resolvedPreferences.displayMode, surface.dataset.digitalBrainDisplayMode, 'nodes');
  surface.dataset.digitalBrainMotion = resolveDigitalBrainPreferenceValue(resolvedPreferences.motionState, surface.dataset.digitalBrainMotion, 'playing');
  surface.dataset.digitalBrainMotionDirection = resolveDigitalBrainPreferenceValue(resolvedPreferences.motionDirection, surface.dataset.digitalBrainMotionDirection, 'clockwise');
  surface.dataset.digitalBrainSubnodes = resolvedPreferences.constructNodesVisible === false ? 'hidden' : 'visible';
  surface.dataset.digitalBrainLabels = resolvedPreferences.constructLabelsVisible === false ? 'hidden' : 'visible';
  surface.dataset.digitalBrainNodeScale = resolveDigitalBrainPreferenceValue(resolvedPreferences.nodeScale, surface.dataset.digitalBrainNodeScale, '1');
  surface.dataset.digitalBrainConnectionScale = String(normalizeDigitalBrainPreferenceNumber('connectionScale', resolvedPreferences.connectionScale ?? surface.dataset.digitalBrainConnectionScale, 1));
  surface.dataset.digitalBrainConnectionVisibility = resolveDigitalBrainPreferenceValue(resolvedPreferences.connectionVisibility, surface.dataset.digitalBrainConnectionVisibility, '1');
  surface.dataset.digitalBrainConnectionPulse = resolveDigitalBrainPreferenceValue(resolvedPreferences.connectionPulse, surface.dataset.digitalBrainConnectionPulse, '1');
  surface.dataset.digitalBrainRegionOpacity = resolveDigitalBrainPreferenceValue(resolvedPreferences.regionOpacity, surface.dataset.digitalBrainRegionOpacity, '1');
  surface.dataset.digitalBrainLabelScale = resolveDigitalBrainPreferenceValue(resolvedPreferences.labelScale, surface.dataset.digitalBrainLabelScale, '1');
  surface.dataset.digitalBrainConstructScale = String(normalizeDigitalBrainPreferenceNumber('constructScale', resolvedPreferences.constructScale ?? surface.dataset.digitalBrainConstructScale, 1));
  surface.dataset.digitalBrainConstructSpread = resolveDigitalBrainPreferenceValue(resolvedPreferences.constructSpread, surface.dataset.digitalBrainConstructSpread, '1');
  surface.dataset.digitalBrainSignalIntensity = resolveDigitalBrainPreferenceValue(resolvedPreferences.signalIntensity, surface.dataset.digitalBrainSignalIntensity, '1');
  surface.dataset.digitalBrainBlurIntensity = resolveDigitalBrainPreferenceValue(resolvedPreferences.blurIntensity, surface.dataset.digitalBrainBlurIntensity, '1');
  surface.dataset.digitalBrainMotionSpeed = resolveDigitalBrainPreferenceValue(resolvedPreferences.motionSpeed, surface.dataset.digitalBrainMotionSpeed, '1');
  surface.dataset.digitalBrainColorIntensity = resolveDigitalBrainPreferenceValue(resolvedPreferences.colorIntensity, surface.dataset.digitalBrainColorIntensity, '1');
  surface.dataset.digitalBrainZoom = resolveDigitalBrainPreferenceValue(resolvedPreferences.zoomLevel, surface.dataset.digitalBrainZoom, '1');
  surface.dataset.digitalBrainRotateX = resolveDigitalBrainPreferenceValue(resolvedPreferences.rotateX, surface.dataset.digitalBrainRotateX, '0deg');
  surface.dataset.digitalBrainRotateY = resolveDigitalBrainPreferenceValue(resolvedPreferences.rotateY, surface.dataset.digitalBrainRotateY, '0deg');
  surface.dataset.digitalBrainFocus = resolveDigitalBrainPreferenceValue(resolvedPreferences.focusLayer, surface.dataset.digitalBrainFocus, '');
  surface.dataset.digitalBrainSignalFocus = resolveDigitalBrainPreferenceValue(resolvedPreferences.focusSignal, surface.dataset.digitalBrainSignalFocus, '');
  surface.dataset.digitalBrainAtlasFocus = resolveDigitalBrainPreferenceValue(resolvedPreferences.focusAtlas, surface.dataset.digitalBrainAtlasFocus, '');
  if (cachedPreferences === resolvedPreferences && preferences !== resolvedPreferences) {
    window.setTimeout(() => persistDigitalBrainPreferences(surface), 0);
  }
}

function resolveDigitalBrainFreshestPreferences(cloudPreferences = null, cachedPreferences = null) {
  if (!cloudPreferences || typeof cloudPreferences !== 'object') return cachedPreferences;
  if (!cachedPreferences || typeof cachedPreferences !== 'object') return cloudPreferences;

  const cloudTime = Date.parse(cloudPreferences.updatedAt || '') || 0;
  const cachedTime = Date.parse(cachedPreferences.cachedAt || cachedPreferences.updatedAt || '') || 0;
  return cachedTime > cloudTime ? cachedPreferences : cloudPreferences;
}

function resolveDigitalBrainPreferenceValue(preferenceValue, currentValue, fallbackValue) {
  if (preferenceValue !== undefined && preferenceValue !== null) return String(preferenceValue);
  if (currentValue !== undefined && currentValue !== null && currentValue !== '') return String(currentValue);
  return String(fallbackValue);
}

function syncDigitalBrainControls(surface) {
  const view = surface.dataset.digitalBrainView || 'overview';
  surface.querySelectorAll('[data-digital-brain-view-action]').forEach((button) => {
    button.setAttribute('aria-pressed', String(button instanceof HTMLButtonElement && button.dataset.digitalBrainViewAction === view));
  });

  const displayModeToggle = surface.querySelector('[data-digital-brain-display-mode-toggle]');
  if (displayModeToggle instanceof HTMLButtonElement) {
    const displayMode = normalizeDigitalBrainDisplayMode(surface.dataset.digitalBrainDisplayMode);
    const displayMeta = getDigitalBrainDisplayModeMeta(displayMode);
    displayModeToggle.setAttribute('aria-pressed', String(displayMode !== 'nodes'));
    displayModeToggle.setAttribute('aria-label', `Switch to ${getDigitalBrainDisplayModeMeta(getNextDigitalBrainDisplayMode(displayMode)).label}`);
    displayModeToggle.innerHTML = `
      <img class="model-digital-brain-maturity__control-icon ui-icon-theme-aware" src="${DIGITAL_BRAIN_ICON_BASE}/${displayMeta.icon}.svg" alt="">
      <span>${displayMeta.label}</span>
    `;
  }

  const motionToggle = surface.querySelector('[data-digital-brain-motion-toggle]');
  if (motionToggle instanceof HTMLButtonElement) {
    const paused = surface.dataset.digitalBrainMotion === 'paused';
    motionToggle.setAttribute('aria-pressed', String(paused));
    motionToggle.setAttribute('aria-label', paused ? 'Resume motion' : 'Pause motion');
    motionToggle.innerHTML = `
      <img class="model-digital-brain-maturity__control-icon ui-icon-theme-aware" src="${DIGITAL_BRAIN_ICON_BASE}/brain-motion-${paused ? 'resume' : 'pause'}.svg" alt="">
      <span>${paused ? 'Resume motion' : 'Pause motion'}</span>
    `;
  }

  const motionDirectionToggle = surface.querySelector('[data-digital-brain-motion-direction-toggle]');
  if (motionDirectionToggle instanceof HTMLButtonElement) {
    const counterclockwise = surface.dataset.digitalBrainMotionDirection === 'counterclockwise';
    motionDirectionToggle.setAttribute('aria-pressed', String(counterclockwise));
    motionDirectionToggle.setAttribute('aria-label', counterclockwise ? 'Rotate right' : 'Rotate left');
    motionDirectionToggle.innerHTML = `
      <img class="model-digital-brain-maturity__control-icon ui-icon-theme-aware" src="${DIGITAL_BRAIN_ICON_BASE}/brain-motion-speed.svg" alt="">
      <span>${counterclockwise ? 'Rotate left' : 'Rotate right'}</span>
    `;
  }

  const subnodesToggle = surface.querySelector('[data-digital-brain-subnodes-toggle]');
  if (subnodesToggle instanceof HTMLButtonElement) {
    const visible = surface.dataset.digitalBrainSubnodes !== 'hidden';
    subnodesToggle.setAttribute('aria-pressed', String(visible));
    subnodesToggle.setAttribute('aria-label', visible ? 'Hide construct nodes' : 'Show construct nodes');
    subnodesToggle.innerHTML = `
      <img class="model-digital-brain-maturity__control-icon ui-icon-theme-aware" src="${DIGITAL_BRAIN_ICON_BASE}/brain-construct-nodes-${visible ? 'on' : 'off'}.svg" alt="">
      <span>Construct nodes</span>
    `;
  }

  const labelsToggle = surface.querySelector('[data-digital-brain-labels-toggle]');
  if (labelsToggle instanceof HTMLButtonElement) {
    const visible = surface.dataset.digitalBrainLabels !== 'hidden';
    labelsToggle.setAttribute('aria-pressed', String(visible));
    labelsToggle.setAttribute('aria-label', visible ? 'Hide construct labels' : 'Show construct labels');
    labelsToggle.innerHTML = `
      <img class="model-digital-brain-maturity__control-icon ui-icon-theme-aware" src="${DIGITAL_BRAIN_ICON_BASE}/brain-construct-labels-${visible ? 'on' : 'off'}.svg" alt="">
      <span>Construct labels</span>
    `;
  }

  surface.querySelectorAll('[data-digital-brain-control]').forEach((control) => {
    if (!(control instanceof HTMLInputElement)) return;
    const controlName = control.dataset.digitalBrainControl || '';
    const key = `digitalBrain${controlName.charAt(0).toUpperCase()}${controlName.slice(1)}`;
    if (surface.dataset[key]) {
      control.value = String(normalizeDigitalBrainPreferenceNumber(controlName, surface.dataset[key], Number(control.value || 1)));
    }
  });
}

function collectDigitalBrainPreferences(surface) {
  return {
    viewMode: surface.dataset.digitalBrainView || 'overview',
    displayMode: surface.dataset.digitalBrainDisplayMode || 'nodes',
    motionState: surface.dataset.digitalBrainMotion || 'playing',
    motionDirection: surface.dataset.digitalBrainMotionDirection || 'clockwise',
    constructNodesVisible: surface.dataset.digitalBrainSubnodes !== 'hidden',
    constructLabelsVisible: surface.dataset.digitalBrainLabels !== 'hidden',
    nodeScale: readDigitalBrainPreferenceNumber(surface, 'digitalBrainNodeScale', 1),
    connectionScale: readDigitalBrainPreferenceNumber(surface, 'digitalBrainConnectionScale', 1, 'connectionScale'),
    connectionVisibility: readDigitalBrainPreferenceNumber(surface, 'digitalBrainConnectionVisibility', 1),
    connectionPulse: readDigitalBrainPreferenceNumber(surface, 'digitalBrainConnectionPulse', 1),
    regionOpacity: readDigitalBrainPreferenceNumber(surface, 'digitalBrainRegionOpacity', 1),
    labelScale: readDigitalBrainPreferenceNumber(surface, 'digitalBrainLabelScale', 1),
    constructScale: readDigitalBrainPreferenceNumber(surface, 'digitalBrainConstructScale', 1, 'constructScale'),
    constructSpread: readDigitalBrainPreferenceNumber(surface, 'digitalBrainConstructSpread', 1),
    signalIntensity: readDigitalBrainPreferenceNumber(surface, 'digitalBrainSignalIntensity', 1),
    blurIntensity: readDigitalBrainPreferenceNumber(surface, 'digitalBrainBlurIntensity', 1),
    motionSpeed: readDigitalBrainPreferenceNumber(surface, 'digitalBrainMotionSpeed', 1),
    colorIntensity: readDigitalBrainPreferenceNumber(surface, 'digitalBrainColorIntensity', 1),
    zoomLevel: readDigitalBrainPreferenceNumber(surface, 'digitalBrainZoom', 1),
    rotateX: surface.dataset.digitalBrainRotateX || '0deg',
    rotateY: surface.dataset.digitalBrainRotateY || '0deg',
    focusLayer: surface.dataset.digitalBrainFocus || '',
    focusSignal: surface.dataset.digitalBrainSignalFocus || '',
    focusAtlas: surface.dataset.digitalBrainAtlasFocus || '',
  };
}

function readDigitalBrainPreferenceNumber(surface, key, fallback = 1, preferenceKey = '') {
  const rawValue = surface?.dataset?.[key];
  const value = Number(rawValue === undefined || rawValue === null || rawValue === '' ? fallback : rawValue);
  return normalizeDigitalBrainPreferenceNumber(preferenceKey, value, fallback);
}

function normalizeDigitalBrainPreferenceNumber(preferenceKey = '', value, fallback = 1) {
  const numericValue = Number(value);
  const resolvedValue = Number.isFinite(numericValue) ? numericValue : fallback;
  const limits = DIGITAL_BRAIN_PREFERENCE_LIMITS[preferenceKey];

  if (!limits) {
    return resolvedValue;
  }

  return Math.max(limits.min, Math.min(limits.max, resolvedValue));
}

function normalizeDigitalBrainDisplayMode(mode = '') {
  const normalized = String(mode || '').trim().toLowerCase();
  return ['nodes', 'scan', 'connectome'].includes(normalized) ? normalized : 'nodes';
}

function getNextDigitalBrainDisplayMode(mode = '') {
  const normalized = normalizeDigitalBrainDisplayMode(mode);
  if (normalized === 'nodes') return 'scan';
  if (normalized === 'scan') return 'connectome';
  return 'nodes';
}

function getDigitalBrainDisplayModeMeta(mode = '') {
  const normalized = normalizeDigitalBrainDisplayMode(mode);
  if (normalized === 'scan') {
    return { label: 'Scan map', icon: 'brain-display-scan' };
  }
  if (normalized === 'connectome') {
    return { label: 'Connectome map', icon: 'brain-display-connectome' };
  }
  return { label: 'Node map', icon: 'brain-display-nodes' };
}

function scheduleDigitalBrainPreferencesSave(surface) {
  const modelId = surface.dataset.digitalBrainModelId || '';
  if (!modelId) return;
  writeDigitalBrainPreferencesCache(surface);

  const activeTimer = DIGITAL_BRAIN_SAVE_TIMERS.get(surface);
  if (activeTimer) window.clearTimeout(activeTimer);

  const timer = window.setTimeout(async () => {
    DIGITAL_BRAIN_SAVE_TIMERS.delete(surface);
    await persistDigitalBrainPreferences(surface);
  }, 450);

  DIGITAL_BRAIN_SAVE_TIMERS.set(surface, timer);
}

async function persistDigitalBrainPreferences(surface) {
  const modelId = surface.dataset.digitalBrainModelId || '';
  if (!modelId) return;

  const activeTimer = DIGITAL_BRAIN_SAVE_TIMERS.get(surface);
  if (activeTimer) window.clearTimeout(activeTimer);
  DIGITAL_BRAIN_SAVE_TIMERS.delete(surface);

  try {
    const preferences = collectDigitalBrainPreferences(surface);
    writeDigitalBrainPreferencesCache(surface, preferences);
    await saveModelDigitalBrainPreferences(modelId, preferences);
    document.dispatchEvent(new CustomEvent('model:changelog-refresh-request', {
      detail: {
        area: 'model.foundation.digital_brain',
      },
    }));
  } catch (error) {
    console.warn('[model-digital-brain-maturity] Digital Brain preferences could not be saved.', error);
  }
}

function readDigitalBrainPreferencesCache(surface) {
  const storageKey = getDigitalBrainPreferencesCacheKey(surface);
  if (!storageKey) return null;

  try {
    const cached = window.localStorage.getItem(storageKey);
    if (!cached) return null;
    const parsed = JSON.parse(cached);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch (_) {
    return null;
  }
}

function writeDigitalBrainPreferencesCache(surface, preferences = null) {
  const storageKey = getDigitalBrainPreferencesCacheKey(surface);
  if (!storageKey) return;

  try {
    window.localStorage.setItem(storageKey, JSON.stringify({
      ...(preferences || collectDigitalBrainPreferences(surface)),
      cachedAt: new Date().toISOString(),
    }));
  } catch (_) {
    // Local persistence is a refresh guard; Supabase remains the source of truth.
  }
}

function getDigitalBrainPreferencesCacheKey(surface) {
  const modelId = surface?.dataset?.digitalBrainModelId || '';
  return modelId ? `neuroartan:model:digital-brain-preferences:${modelId}` : '';
}

function createDigitalBrainSearchTerms(state = {}) {
  const layers = Array.isArray(state.layers) ? state.layers : [];

  return [
    ...Object.entries(DIGITAL_BRAIN_REGIONS).map(([id, region]) => ({
      id,
      kind: 'layer',
      label: region.label,
      type: 'Layer',
      description: `${region.region} ${region.system}`,
    })),
    ...Object.entries(DIGITAL_BRAIN_ATLAS_REGIONS).map(([id, region]) => ({
      id,
      kind: 'atlas',
      label: region.label,
      type: region.category,
      description: `${region.anatomy} ${region.cognitiveSystem} ${region.modelLayers.join(' ')}`,
    })),
    ...layers.flatMap((layer) => {
      return (Array.isArray(layer.signals) ? layer.signals : [])
        .filter((signal) => signal?.searchVisible !== false && signal?.privacy !== 'protected')
        .map((signal) => ({
          id: layer.id,
          signalId: signal.id,
          kind: 'signal',
          label: sanitizeDigitalBrainSearchText(signal.label || signal.value),
          type: sanitizeDigitalBrainSearchText(layer.label || 'Node'),
          description: sanitizeDigitalBrainSearchText(`${signal.value || ''} ${signal.searchableText || ''} ${signal.subject || ''} ${signal.category || ''} ${signal.source || ''}`),
        }));
    }),
  ].filter((item) => item.id && item.label);
}

function clearDigitalBrainSourceSearch(surface) {
  const timer = DIGITAL_BRAIN_SOURCE_SEARCH_TIMERS.get(surface);
  if (timer) window.clearTimeout(timer);
  DIGITAL_BRAIN_SOURCE_SEARCH_TIMERS.delete(surface);
  DIGITAL_BRAIN_SOURCE_SEARCH_REQUESTS.delete(surface);
}

function scheduleDigitalBrainSourceSearch(surface, query = '', localMatches = []) {
  clearDigitalBrainSourceSearch(surface);
  const normalizedQuery = String(query || '').trim().toLowerCase();
  if (!normalizedQuery) return;
  if (isSensitiveDigitalBrainSearchQuery(normalizedQuery)) {
    const results = surface.querySelector('[data-digital-brain-search-results]');
    if (results instanceof HTMLElement) {
      results.hidden = false;
      results.innerHTML = '<p class="model-digital-brain-maturity__empty">Protected records are not searchable.</p>';
    }
    return;
  }

  const requestId = `${Date.now()}:${Math.random().toString(36).slice(2)}`;
  DIGITAL_BRAIN_SOURCE_SEARCH_REQUESTS.set(surface, requestId);

  const timer = window.setTimeout(async () => {
    const results = surface.querySelector('[data-digital-brain-search-results]');
    const search = surface.querySelector('[data-digital-brain-search]');
    if (!(results instanceof HTMLElement) || !(search instanceof HTMLInputElement)) return;
    if (DIGITAL_BRAIN_SOURCE_SEARCH_REQUESTS.get(surface) !== requestId) return;
    if (search.value.trim().toLowerCase() !== normalizedQuery) return;

    try {
      const sourceResults = await searchModelSourceVaultEntries(normalizedQuery, {
        limit: DIGITAL_BRAIN_SEARCH_RESULT_LIMIT,
      });
      if (DIGITAL_BRAIN_SOURCE_SEARCH_REQUESTS.get(surface) !== requestId) return;
      const merged = mergeDigitalBrainSearchResults(localMatches, sourceResults.map(createDigitalBrainSourceSearchResult));
      results.hidden = false;
      results.innerHTML = renderDigitalBrainSearchResults(merged);
    } catch (error) {
      if (DIGITAL_BRAIN_SOURCE_SEARCH_REQUESTS.get(surface) !== requestId) return;
      results.hidden = false;
      results.innerHTML = renderDigitalBrainSearchResults(localMatches);
      console.warn('[model-digital-brain-maturity] Source Vault search skipped.', error);
    }
  }, 260);

  DIGITAL_BRAIN_SOURCE_SEARCH_TIMERS.set(surface, timer);
}

function createDigitalBrainSourceSearchResult(entry = {}) {
  return {
    id: 'source',
    signalId: '',
    kind: 'source-result',
    label: sanitizeDigitalBrainSearchText(entry.title || 'Source Vault record'),
    type: 'Source content',
    description: sanitizeDigitalBrainSearchText(entry.excerpt || ''),
  };
}

function mergeDigitalBrainSearchResults(localMatches = [], sourceMatches = []) {
  const merged = new Map();
  [...localMatches, ...sourceMatches].forEach((item) => {
    const key = `${item.kind}:${item.id}:${item.signalId || ''}:${item.label}`;
    if (!merged.has(key)) merged.set(key, item);
  });
  return Array.from(merged.values()).slice(0, DIGITAL_BRAIN_SEARCH_RESULT_LIMIT);
}

function rankDigitalBrainSearchResult(item, query = '') {
  const label = item.label.toLowerCase();
  const type = item.type.toLowerCase();
  if (!query) return item.kind === 'layer' ? 0 : 10;
  if (label === query && item.kind === 'layer') return 0;
  if (label === query) return 1;
  if (label.startsWith(query) && item.kind === 'layer') return 2;
  if (label.startsWith(query)) return 3;
  if (type.includes(query) && item.kind === 'layer') return 4;
  if (type.includes(query)) return 5;
  return item.kind === 'layer' ? 6 : 8;
}

function setDigitalBrainView(surface, view = 'overview') {
  surface.dataset.digitalBrainView = view;
  if (view === 'overview') {
    surface.dataset.digitalBrainFocus = '';
    surface.dataset.digitalBrainAtlasFocus = '';
    surface.dataset.digitalBrainSignalFocus = '';
  }
  surface.querySelectorAll('[data-digital-brain-view-action]').forEach((button) => {
    button.setAttribute('aria-pressed', String(button instanceof HTMLButtonElement && button.dataset.digitalBrainViewAction === view));
  });
  updateDigitalBrainMaturity3D(surface);
  scheduleDigitalBrainPreferencesSave(surface);
}

function bindDigitalBrainViewport(surface, graph) {
  if (graph.dataset.digitalBrainViewportBound === 'true') return;
  if (graph.querySelector('[data-digital-brain-three-canvas]')) return;
  graph.dataset.digitalBrainViewportBound = 'true';

  let dragging = false;
  let startX = 0;
  let startY = 0;

  graph.addEventListener('wheel', (event) => {
    event.preventDefault();
    updateDigitalBrainZoom(surface, event.deltaY < 0 ? 'in' : 'out');
  }, { passive: false });

  graph.addEventListener('pointerdown', (event) => {
    dragging = true;
    startX = event.clientX;
    startY = event.clientY;
    graph.setPointerCapture?.(event.pointerId);
  });

  graph.addEventListener('pointermove', (event) => {
    if (!dragging) return;

    const deltaX = event.clientX - startX;
    const deltaY = event.clientY - startY;
    const rotateY = Math.max(-12, Math.min(12, deltaX / 10));
    const rotateX = Math.max(-8, Math.min(8, -deltaY / 14));

    surface.dataset.digitalBrainRotateX = `${Math.round(rotateX * 10) / 10}deg`;
    surface.dataset.digitalBrainRotateY = `${Math.round(rotateY * 10) / 10}deg`;
    surface.style.setProperty('--digital-brain-rotate-x', surface.dataset.digitalBrainRotateX);
    surface.style.setProperty('--digital-brain-rotate-y', surface.dataset.digitalBrainRotateY);
  });

  graph.addEventListener('pointerup', (event) => {
    dragging = false;
    graph.releasePointerCapture?.(event.pointerId);
  });

  graph.addEventListener('pointercancel', () => {
    dragging = false;
  });
}

function updateDigitalBrainZoom(surface, action = 'reset') {
  const currentZoom = Number(surface.dataset.digitalBrainZoom || '1');
  const nextZoom = action === 'in'
    ? Math.min(2.4, currentZoom + 0.18)
    : action === 'out'
      ? Math.max(0.7, currentZoom - 0.18)
      : 1;

  surface.dataset.digitalBrainZoom = String(Math.round(nextZoom * 100) / 100);
  surface.style.setProperty('--digital-brain-zoom', surface.dataset.digitalBrainZoom);

  if (action === 'reset') {
    surface.dataset.digitalBrainRotateX = '0deg';
    surface.dataset.digitalBrainRotateY = '0deg';
    surface.style.setProperty('--digital-brain-rotate-x', '0deg');
    surface.style.setProperty('--digital-brain-rotate-y', '0deg');
  }
  updateDigitalBrainMaturity3D(surface);
  scheduleDigitalBrainPreferencesSave(surface);
}

function focusDigitalBrainTarget(surface, id = '', kind = 'layer') {
  const isAtlas = kind === 'atlas';
  surface.dataset.digitalBrainFocus = isAtlas ? '' : id;
  surface.dataset.digitalBrainAtlasFocus = isAtlas ? id : '';
  surface.dataset.digitalBrainSignalFocus = '';
  surface.dataset.digitalBrainView = id ? (isAtlas ? 'regions' : 'nodes') : surface.dataset.digitalBrainView || 'overview';
  updateDigitalBrainMaturity3D(surface);
  scheduleDigitalBrainPreferencesSave(surface);
}

function focusDigitalBrainSignal(surface, layerId = '', signalId = '') {
  surface.dataset.digitalBrainFocus = layerId;
  surface.dataset.digitalBrainAtlasFocus = '';
  surface.dataset.digitalBrainSignalFocus = signalId;
  surface.dataset.digitalBrainView = layerId ? 'nodes' : surface.dataset.digitalBrainView || 'overview';
  updateDigitalBrainMaturity3D(surface);
  scheduleDigitalBrainPreferencesSave(surface);
}

function renderDigitalBrainSearchResults(items = [], options = {}) {
  if (!items.length) {
    if (options.pending === true) {
      return '<p class="model-digital-brain-maturity__empty">Searching Source Vault...</p>';
    }
    return '<p class="model-digital-brain-maturity__empty">No matching layer.</p>';
  }

  return items.map((item) => `
    <button
      class="model-digital-brain-maturity__result"
      type="button"
      data-digital-brain-search-result="${escapeDigitalBrainText(item.id)}"
      data-digital-brain-signal-result="${escapeDigitalBrainText(item.signalId || '')}"
      data-digital-brain-search-kind="${escapeDigitalBrainText(item.kind || 'layer')}">
      <strong>${escapeDigitalBrainText(item.label)}</strong>
      <span>${escapeDigitalBrainText(item.type)} · ${escapeDigitalBrainText(item.description)}</span>
    </button>
  `).join('');
}

function isSensitiveDigitalBrainSearchQuery(query = '') {
  const normalized = String(query || '').trim();
  DIGITAL_BRAIN_UUID_PATTERN.lastIndex = 0;
  DIGITAL_BRAIN_SECRET_PATTERN.lastIndex = 0;
  return DIGITAL_BRAIN_SENSITIVE_QUERY_PATTERN.test(normalized)
    || DIGITAL_BRAIN_UUID_PATTERN.test(normalized)
    || DIGITAL_BRAIN_SECRET_PATTERN.test(normalized);
}

function sanitizeDigitalBrainSearchText(value = '') {
  DIGITAL_BRAIN_UUID_PATTERN.lastIndex = 0;
  DIGITAL_BRAIN_SECRET_PATTERN.lastIndex = 0;
  return String(value || '')
    .replace(DIGITAL_BRAIN_UUID_PATTERN, '[protected id]')
    .replace(DIGITAL_BRAIN_SECRET_PATTERN, '[protected secret]')
    .trim();
}

function createDigitalBrainLabelMarkup(layers = []) {
  return [
    ...layers.map(createLayerLabelMarkup),
    ...layers.flatMap(createConstructLabelMarkup),
  ].join('');
}

function createLayerLabelMarkup(layer = {}) {
  const region = DIGITAL_BRAIN_REGIONS[layer.id] || {};

  return `
    <button
      class="model-digital-brain-maturity__region-label"
      type="button"
      data-digital-brain-region-label="${escapeDigitalBrainText(layer.id)}"
      data-digital-brain-node-state="${escapeDigitalBrainText(layer.state)}"
      style="--digital-brain-label-x:${Number(layer.x) || 50}%; --digital-brain-label-y:${Number(layer.y) || 50}%; --digital-brain-layer-color:var(--digital-brain-layer-${escapeDigitalBrainText(layer.id)})"
      aria-label="${escapeDigitalBrainText(layer.label)} · ${escapeDigitalBrainText(region.region || '')}">
      <span>${escapeDigitalBrainText(layer.label)}</span>
    </button>
  `;
}

function createConstructLabelMarkup(layer = {}) {
  const signals = getDigitalBrainVisualSignals(layer);
  if (!signals.length) return [];

  return signals.map((signal, index) => {
    const position = calculateConstructLabelPosition(layer, index, signals.length);
    return `
      <button
        class="model-digital-brain-maturity__construct-label"
        type="button"
        data-digital-brain-region-label="${escapeDigitalBrainText(layer.id)}"
        data-digital-brain-signal-label="${escapeDigitalBrainText(signal.id)}"
        data-digital-brain-node-state="${escapeDigitalBrainText(layer.state)}"
        style="--digital-brain-label-x:${position.x}%; --digital-brain-label-y:${position.y}%; --digital-brain-layer-color:var(--digital-brain-layer-${escapeDigitalBrainText(layer.id)})"
        aria-label="${escapeDigitalBrainText(signal.label)} · ${escapeDigitalBrainText(layer.label)}">
        <span>${escapeDigitalBrainText(signal.label)}</span>
      </button>
    `;
  });
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

function calculateConstructLabelPosition(layer = {}, index = 0, total = 1) {
  const angle = index * Math.PI * (3 - Math.sqrt(5));
  const density = Math.max(1, Math.sqrt(Math.max(1, total)));
  const ring = Math.sqrt(index + 1) / density;
  const radiusX = 8 + (ring * 18);
  const radiusY = 6 + (ring * 13);
  const x = Math.max(8, Math.min(92, (Number(layer.x) || 50) + (Math.cos(angle) * radiusX)));
  const y = Math.max(8, Math.min(92, (Number(layer.y) || 50) + (Math.sin(angle) * radiusY)));

  return {
    x: Math.round(x * 10) / 10,
    y: Math.round(y * 10) / 10,
  };
}

function renderDigitalBrainMaturityLayers(layerList, layers = []) {
  layerList.innerHTML = layers.map((layer) => {
    const region = DIGITAL_BRAIN_REGIONS[layer.id] || {};

    return `
      <article class="model-digital-brain-maturity__layer" data-digital-brain-layer-state="${layer.state}">
        <header class="model-digital-brain-maturity__layer-header">
          <img class="model-management__card-icon ui-icon-theme-aware" src="${layer.icon}" alt="">
          <h4>${escapeDigitalBrainText(layer.label)}</h4>
          <span>${escapeDigitalBrainText(layer.stateLabel)}</span>
        </header>
        <p>${escapeDigitalBrainText(region.region || layer.description)}</p>
      </article>
    `;
  }).join('');
}

function escapeDigitalBrainText(value = '') {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
