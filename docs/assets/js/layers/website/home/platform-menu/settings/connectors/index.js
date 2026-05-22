import { mountSettingsCategory } from '../_shared/settings-category.js';

const CONNECTOR_STORAGE_KEY = 'neuroartan.connector-states';

function getConnectorStates() {
  try {
    const stored = localStorage.getItem(CONNECTOR_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    return {};
  }
}

function setConnectorState(service, connected) {
  const states = getConnectorStates();
  states[service] = connected;
  localStorage.setItem(CONNECTOR_STORAGE_KEY, JSON.stringify(states));
}

function updateConnectorStatus(root, service, connected) {
  const connectorItem = root.querySelector(`[data-home-platform-connector-service="${service}"]`);
  if (!connectorItem) return;

  const statusElement = connectorItem.querySelector('.home-platform-theme__connector-status');
  if (statusElement) {
    statusElement.textContent = connected ? 'Connected' : 'Not connected';
  }

  if (connected) {
    connectorItem.setAttribute('data-connector-connected', 'true');
  } else {
    connectorItem.removeAttribute('data-connector-connected');
  }
}

function loadConnectorStates(root) {
  const states = getConnectorStates();
  Object.entries(states).forEach(([service, connected]) => {
    updateConnectorStatus(root, service, connected);
  });
}

function bindConnectorClicks(root) {
  const connectorItems = root.querySelectorAll('[data-home-platform-connector-service]');
  connectorItems.forEach((item) => {
    if (item.dataset.connectorBound === 'true') return;

    item.dataset.connectorBound = 'true';
    item.addEventListener('click', () => {
      const service = item.dataset.homePlatformConnectorService;
      const currentState = getConnectorStates()[service] || false;
      const newState = !currentState;

      setConnectorState(service, newState);
      updateConnectorStatus(root, service, newState);
    });
  });
}

export function mountHomePlatformDestination(root, options = {}) {
  mountSettingsCategory(root, options);

  loadConnectorStates(root);
  bindConnectorClicks(root);
}
