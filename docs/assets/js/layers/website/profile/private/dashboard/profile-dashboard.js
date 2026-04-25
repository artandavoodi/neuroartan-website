/* =============================================================================
   01) MODULE IMPORTS
   02) DASHBOARD HELPERS
   03) METRICS RENDER
   04) GRAPH RENDER
   05) DASHBOARD RENDER
   06) DASHBOARD INIT
   ============================================================================= */

/* =============================================================================
   01) MODULE IMPORTS
   ============================================================================= */

import { getProfileRuntimeState, subscribeProfileRuntime } from '../shell/profile-runtime.js';
import { getProfileThoughtState, subscribeProfileThoughtState } from '../thoughts/profile-thought-store.js';

/* =============================================================================
   02) DASHBOARD HELPERS
   ============================================================================= */

function getMetricsRoots() {
  return Array.from(document.querySelectorAll('[data-profile-dashboard-metrics-panel]'));
}

function getGraphRoots() {
  return Array.from(document.querySelectorAll('[data-profile-dashboard-graph-panel]'));
}

function setText(root, selector, value) {
  const node = root.querySelector(selector);
  if (!node) return;
  node.textContent = value;
}

function setProgress(root, selector, value) {
  const node = root.querySelector(selector);
  if (!(node instanceof HTMLElement)) return;
  node.style.setProperty('--profile-dashboard-progress', `${Math.max(0, Math.min(100, value))}%`);
}

function clearNode(node) {
  while (node.firstChild) {
    node.removeChild(node.firstChild);
  }
}

function computeRouteProgress(profileState) {
  if (profileState.publicViewAvailable) return 100;
  if (profileState.username.normalized) return 68;
  return profileState.viewerState === 'authenticated' ? 24 : 8;
}

function computeVisibilityProgress(profileState) {
  if (profileState.visibility.publicEnabled && profileState.visibility.discoverable) return 100;
  if (profileState.visibility.publicEnabled) return 72;
  return profileState.viewerState === 'authenticated' ? 32 : 10;
}

function computeContinuityProgress(profileState, thoughtState) {
  if (profileState.completion.complete && profileState.publicViewAvailable && thoughtState.totalEntries > 0) return 100;
  if (profileState.completion.complete && thoughtState.totalEntries > 0) return 88;
  if (profileState.completion.complete) return 78;
  return Math.max(18, profileState.completion.percent);
}

function createGraphRow(category, maxCount = 1) {
  const row = document.createElement('div');
  row.className = 'profile-dashboard__graph-row';

  const label = document.createElement('span');
  label.className = 'profile-dashboard__graph-label';
  label.textContent = category.label;

  const track = document.createElement('span');
  track.className = 'profile-dashboard__graph-track';

  const fill = document.createElement('span');
  fill.style.setProperty('--profile-dashboard-progress', `${Math.round((category.count / maxCount) * 100)}%`);

  track.appendChild(fill);
  row.appendChild(label);
  row.appendChild(track);

  return row;
}

/* =============================================================================
   03) METRICS RENDER
   ============================================================================= */

function renderMetrics(profileState = getProfileRuntimeState(), thoughtState = getProfileThoughtState()) {
  getMetricsRoots().forEach((root) => {
    const completion = profileState.completion?.percent || 0;
    const route = computeRouteProgress(profileState);
    const visibility = computeVisibilityProgress(profileState);
    const continuity = computeContinuityProgress(profileState, thoughtState);

    setText(
      root,
      '[data-profile-dashboard-copy]',
      profileState.viewerState === 'authenticated'
        ? 'This dashboard now tracks both profile maturity and the thought activity captured inside the private surface.'
        : 'Authenticate to activate the owner-facing profile dashboard.'
    );

    setText(root, '[data-profile-dashboard-value="completion"]', `${completion}%`);
    setText(root, '[data-profile-dashboard-value="route"]', `${route}%`);
    setText(root, '[data-profile-dashboard-value="visibility"]', `${visibility}%`);
    setText(root, '[data-profile-dashboard-value="continuity"]', `${continuity}%`);

    setProgress(root, '[data-profile-dashboard-bar="completion"]', completion);
    setProgress(root, '[data-profile-dashboard-bar="route"]', route);
    setProgress(root, '[data-profile-dashboard-bar="visibility"]', visibility);
    setProgress(root, '[data-profile-dashboard-bar="continuity"]', continuity);

    setText(root, '[data-profile-dashboard-thought-count="private"]', String(thoughtState.privateEntries.length));
    setText(root, '[data-profile-dashboard-thought-count="public"]', String(thoughtState.publicEntries.length));
  });
}

/* =============================================================================
   04) GRAPH RENDER
   ============================================================================= */

function renderGraph(profileState = getProfileRuntimeState(), thoughtState = getProfileThoughtState()) {
  getGraphRoots().forEach((root) => {
    const graph = root.querySelector('[data-profile-dashboard-thought-graph]');
    const categoryCounts = Array.isArray(thoughtState.categoryCounts) ? thoughtState.categoryCounts : [];
    const maxCount = Math.max(1, ...categoryCounts.map((category) => category.count || 0));

    if (graph instanceof HTMLElement) {
      clearNode(graph);
      categoryCounts.forEach((category) => {
        graph.appendChild(createGraphRow(category, maxCount));
      });
    }

    setText(
      root,
      '[data-profile-dashboard-route-summary]',
      profileState.publicViewAvailable
        ? `Live · ${profileState.publicRouteDisplay}`
        : profileState.username.normalized
          ? `Reserved · ${profileState.publicRouteDisplay}`
          : 'Pending username route'
    );

    setText(
      root,
      '[data-profile-dashboard-thought-summary]',
      thoughtState.totalEntries > 0
        ? `${thoughtState.totalEntries} thought ${thoughtState.totalEntries === 1 ? 'entry' : 'entries'} captured across private and public lanes.`
        : 'No thought entries captured yet.'
    );

    setText(
      root,
      '[data-profile-dashboard-thought-note]',
      thoughtState.totalEntries > 0
        ? 'Thought categories are now mapped from the entries captured inside the profile surface.'
        : 'Capture thoughts inside the Thought Bank to activate the graph.'
    );
  });
}

/* =============================================================================
   05) DASHBOARD RENDER
   ============================================================================= */

function renderDashboard() {
  const profileState = getProfileRuntimeState();
  const thoughtState = getProfileThoughtState();

  renderMetrics(profileState, thoughtState);
  renderGraph(profileState, thoughtState);
}

/* =============================================================================
   06) DASHBOARD INIT
   ============================================================================= */

function initProfileDashboard() {
  subscribeProfileRuntime(renderDashboard);
  subscribeProfileThoughtState(renderDashboard);

  document.addEventListener('fragment:mounted', (event) => {
    const name = event?.detail?.name;
    if (
      name !== 'profile-private-dashboard-panel'
      && name !== 'profile-private-dashboard-metrics-panel'
      && name !== 'profile-private-dashboard-graph-panel'
    ) {
      return;
    }

    renderDashboard();
  });

  renderDashboard();
}

initProfileDashboard();
