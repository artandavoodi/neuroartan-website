import { mountSettingsCategory } from '../_shared/settings-category.js';

const DASHBOARD_CONFIG = {
  analytics: {
    enableTracking: true
  },
  health: {
    showSystemHealth: true
  },
  readiness: {
    showReadiness: true
  },
  model: {
    enableDashboard: true
  }
};

function getDashboardConfig() {
  const stored = localStorage.getItem('neuroartan-dashboard-config');
  if (stored) {
    try {
      return { ...DASHBOARD_CONFIG, ...JSON.parse(stored) };
    } catch (error) {
      console.error('Failed to parse dashboard config:', error);
    }
  }
  return DASHBOARD_CONFIG;
}

function saveDashboardConfig(config) {
  localStorage.setItem('neuroartan-dashboard-config', JSON.stringify(config));
}

function dispatchDashboardEvent(type, detail) {
  document.dispatchEvent(new CustomEvent(`neuroartan:dashboard:${type}`, {
    detail,
    bubbles: true
  }));
}

function initDashboardToggles(root) {
  const config = getDashboardConfig();

  document.addEventListener('neuroartan:toggle-changed', (event) => {
    const { scope, key, checked } = event.detail;

    if (scope === 'dashboard-analytics' && key in config.analytics) {
      config.analytics[key] = checked;
      saveDashboardConfig(config);
      dispatchDashboardEvent('analytics:changed', { [key]: checked });
    }

    if (scope === 'dashboard-health' && key in config.health) {
      config.health[key] = checked;
      saveDashboardConfig(config);
      dispatchDashboardEvent('health:changed', { [key]: checked });
    }

    if (scope === 'dashboard-readiness' && key in config.readiness) {
      config.readiness[key] = checked;
      saveDashboardConfig(config);
      dispatchDashboardEvent('readiness:changed', { [key]: checked });
    }

    if (scope === 'dashboard-model' && key in config.model) {
      config.model[key] = checked;
      saveDashboardConfig(config);
      dispatchDashboardEvent('model:changed', { [key]: checked });
    }
  });

  root.querySelectorAll('[data-na-toggle]').forEach((toggle) => {
    const scope = toggle.dataset.toggleScope;
    const key = toggle.dataset.toggleKey;
    const group = scope?.replace('dashboard-', '');

    if (group && config[group] && key in config[group]) {
      toggle.setAttribute('aria-checked', String(config[group][key] !== false));
    }
  });
}

export function mountHomePlatformDestination(root, options = {}) {
  mountSettingsCategory(root, options);
  initDashboardToggles(root);
  dispatchDashboardEvent('initialized', getDashboardConfig());
}
