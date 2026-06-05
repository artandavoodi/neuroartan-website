/* =============================================================================
   01) MODEL NAVIGATION REGISTRY
   02) MODEL TAB GROUPS
   03) MODEL TAB ICONS
============================================================================= */

/* =============================================================================
   01) MODEL NAVIGATION REGISTRY
============================================================================= */

export const MODEL_TAB_SECTIONS = new Set([
  'model-foundation',
  'model-training',
  'model-personalization',
  'model-sources',
  'model-memory',
  'model-voice',
  'model-readiness',
  'model-runtime',
  'model-discovery',
]);

export const MODEL_DASHBOARD_SECTIONS = new Set(['model-readiness']);
export const MODEL_SETTINGS_SECTIONS = new Set(['model-settings', 'model-runtime']);
export const PUBLIC_MODEL_DISCOVERY_PANES = new Set(['directory', 'trending', 'expertise']);

export function isPublicModelNavigation(section = '', modelPane = '') {
  return section === 'model-discovery' && PUBLIC_MODEL_DISCOVERY_PANES.has(modelPane);
}

export function constrainModelNavigationForViewer(section = '', modelPane = '', authenticated = false) {
  if (authenticated || isPublicModelNavigation(section, modelPane)) {
    return { section, modelPane };
  }

  return {
    section: 'model-discovery',
    modelPane: 'directory'
  };
}

export function getVisibleModelContextTabs(tabs = [], authenticated = false) {
  return tabs.filter((tab) => authenticated || tab.authState !== 'user');
}

/* =============================================================================
   02) MODEL TAB GROUPS
============================================================================= */

export const MODEL_CONTEXT_TAB_GROUPS = Object.freeze({
  modelFoundation: {
    label: 'Model foundation',
    tabs: [
      { key: 'overview', label: 'Overview', section: 'model-foundation', modelPane: 'overview' },
      { key: 'identity', label: 'Identity', section: 'model-foundation', modelPane: 'identity' },
      { key: 'consent', label: 'Consent', section: 'model-foundation', modelPane: 'consent' },
      { key: 'sources', label: 'Source', section: 'model-foundation', modelPane: 'sources' },
      { key: 'memory', label: 'Memory', section: 'model-foundation', modelPane: 'memory' },
      { key: 'voice', label: 'Voice', section: 'model-foundation', modelPane: 'voice' },
    ],
  },
  modelTraining: {
    label: 'Model training',
    tabs: [
      { key: 'protocol', label: 'Protocol', section: 'model-training', modelPane: 'protocol' },
      { key: 'datasets', label: 'Datasets', section: 'model-training', modelPane: 'datasets' },
      { key: 'knowledge-base', label: 'Knowledge Base', section: 'model-training', modelPane: 'knowledge-base' },
      { key: 'logics', label: 'Logics', section: 'model-training', modelPane: 'logics' },
      { key: 'provenance', label: 'Provenance', section: 'model-training', modelPane: 'provenance' },
      { key: 'evaluation', label: 'Evaluation', section: 'model-training', modelPane: 'evaluation' },
    ],
  },
  modelPersonalization: {
    label: 'Model personalization',
    tabs: [
      { key: 'cognition', label: 'Cognition', section: 'model-personalization', modelPane: 'cognition' },
      { key: 'communication', label: 'Communication', section: 'model-personalization', modelPane: 'communication' },
      { key: 'memory', label: 'Memory', section: 'model-personalization', modelPane: 'memory' },
      { key: 'emotion', label: 'Emotion', section: 'model-personalization', modelPane: 'emotion' },
      { key: 'behavior', label: 'Behavior', section: 'model-personalization', modelPane: 'behavior' },
    ],
  },
  modelDashboard: {
    label: 'Model dashboard',
    tabs: [
      { key: 'state', label: 'State', section: 'model-readiness', modelPane: 'state' },
      { key: 'checks', label: 'Checks', section: 'model-readiness', modelPane: 'checks' },
      { key: 'blockers', label: 'Blockers', section: 'model-readiness', modelPane: 'blockers' },
      { key: 'history', label: 'History', section: 'model-readiness', modelPane: 'history' },
    ],
  },
  modelDiscovery: {
    label: 'Model discovery',
    tabs: [
      { key: 'directory', label: 'Directory', section: 'model-discovery', modelPane: 'directory' },
      { key: 'trending', label: 'Trending', section: 'model-discovery', modelPane: 'trending' },
      { key: 'expertise', label: 'Expertise', section: 'model-discovery', modelPane: 'expertise' },
      { key: 'reputation', label: 'Reputation', section: 'model-discovery', modelPane: 'reputation', authState: 'user' },
      { key: 'monetization', label: 'Monetization', section: 'model-discovery', modelPane: 'monetization', authState: 'user' },
    ],
  },
  modelSettings: {
    label: 'Model settings',
    tabs: [
      { key: 'preferences', label: 'Preferences', section: 'model-settings', modelPane: 'preferences' },
      { key: 'provider', label: 'Provider', section: 'model-settings', modelPane: 'provider' },
      { key: 'routing', label: 'Routing', section: 'model-settings', modelPane: 'routing' },
      { key: 'visibility', label: 'Visibility', section: 'model-settings', modelPane: 'visibility' },
      { key: 'changelog', label: 'Changelog', section: 'model-settings', modelPane: 'changelog' },
    ],
  },
});

/* =============================================================================
   03) MODEL TAB ICONS
============================================================================= */

export const MODEL_CONTEXT_TAB_ICONS = Object.freeze({
  'model-foundation': '/registry/icons/public/assets/layers/website/model/sidebar/foundation.svg',
  'model-training': '/registry/icons/public/assets/layers/website/model/sidebar/training.svg',
  'model-personalization': '/registry/icons/public/assets/layers/website/model/sidebar/personalization.svg',
  'model-sources': '/registry/icons/public/assets/layers/website/model/tabs/source.svg',
  'model-memory': '/registry/icons/public/assets/layers/website/model/tabs/memory.svg',
  'model-voice': '/registry/icons/public/assets/layers/website/model/tabs/voice.svg',
  'model-readiness': '/registry/icons/public/assets/layers/website/model/sidebar/dashboard.svg',
  'model-runtime': '/registry/icons/public/assets/layers/website/model/tabs/provider.svg',
  overview: '/registry/icons/public/assets/layers/website/model/tabs/overview.svg',
  identity: '/registry/icons/public/assets/layers/website/model/tabs/identity.svg',
  consent: '/registry/icons/public/assets/layers/website/model/tabs/consent.svg',
  sources: '/registry/icons/public/assets/layers/website/model/tabs/source.svg',
  memory: '/registry/icons/public/assets/layers/website/model/tabs/memory.svg',
  voice: '/registry/icons/public/assets/layers/website/model/tabs/voice.svg',
  protocol: '/registry/icons/public/assets/layers/website/model/tabs/protocol.svg',
  datasets: '/registry/icons/public/assets/layers/website/model/tabs/datasets.svg',
  'knowledge-base': '/registry/icons/public/assets/layers/website/model/tabs/knowledge-base.svg',
  logics: '/registry/icons/public/assets/layers/website/model/tabs/logics.svg',
  provenance: '/registry/icons/public/assets/layers/website/model/tabs/provenance.svg',
  evaluation: '/registry/icons/public/assets/layers/website/model/tabs/evaluation.svg',
  behavior: '/registry/icons/public/assets/layers/website/model/tabs/behavior.svg',
  communication: '/registry/icons/public/assets/core/communication/messaging/message.svg',
  cognition: '/registry/icons/public/assets/core/cognition/cognition/cognition.svg',
  'social-context': '/registry/icons/public/assets/core/identity/profile/users.svg',
  'safety-boundaries': '/registry/icons/public/assets/core/identity/security/security.svg',
  language: '/registry/icons/public/assets/layers/website/model/tabs/language.svg',
  emotion: '/registry/icons/public/assets/layers/website/model/tabs/emotion.svg',
  response: '/registry/icons/public/assets/layers/website/model/tabs/response.svg',
  creativity: '/registry/icons/public/assets/layers/website/model/tabs/creativity.svg',
  reflection: '/registry/icons/public/assets/layers/website/model/tabs/reflection.svg',
  state: '/registry/icons/public/assets/layers/website/model/tabs/state.svg',
  checks: '/registry/icons/public/assets/layers/website/model/tabs/checks.svg',
  blockers: '/registry/icons/public/assets/layers/website/model/tabs/blockers.svg',
  history: '/registry/icons/public/assets/layers/website/model/tabs/history.svg',
  trending: '/registry/icons/public/assets/layers/website/model/tabs/trending.svg',
  directory: '/registry/icons/public/assets/layers/website/model/tabs/directory.svg',
  expertise: '/registry/icons/public/assets/layers/website/model/tabs/expertise.svg',
  reputation: '/registry/icons/public/assets/layers/website/model/tabs/reputation.svg',
  monetization: '/registry/icons/public/assets/layers/website/model/tabs/monetization.svg',
  preferences: '/registry/icons/public/assets/layers/website/model/tabs/preferences.svg',
  provider: '/registry/icons/public/assets/layers/website/model/tabs/provider.svg',
  routing: '/registry/icons/public/assets/layers/website/model/tabs/routing.svg',
  visibility: '/registry/icons/public/assets/layers/website/model/tabs/visibility.svg',
  changelog: '/registry/icons/public/assets/layers/website/model/tabs/changelog.svg',
});
