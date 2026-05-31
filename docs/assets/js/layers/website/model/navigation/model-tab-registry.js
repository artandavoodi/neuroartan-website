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
      { key: 'provenance', label: 'Provenance', section: 'model-training', modelPane: 'provenance' },
      { key: 'evaluation', label: 'Evaluation', section: 'model-training', modelPane: 'evaluation' },
    ],
  },
  modelPersonalization: {
    label: 'Model personalization',
    tabs: [
      { key: 'behavior', label: 'Behavior', section: 'model-personalization', modelPane: 'behavior' },
      { key: 'language', label: 'Language', section: 'model-personalization', modelPane: 'language' },
      { key: 'emotion', label: 'Emotion', section: 'model-personalization', modelPane: 'emotion' },
      { key: 'response', label: 'Response', section: 'model-personalization', modelPane: 'response' },
      { key: 'memory', label: 'Memory', section: 'model-personalization', modelPane: 'memory' },
      { key: 'creativity', label: 'Creativity', section: 'model-personalization', modelPane: 'creativity' },
      { key: 'reflection', label: 'Reflection', section: 'model-personalization', modelPane: 'reflection' },
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
      { key: 'reputation', label: 'Reputation', section: 'model-discovery', modelPane: 'reputation' },
      { key: 'monetization', label: 'Monetization', section: 'model-discovery', modelPane: 'monetization' },
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
  'model-foundation': '/registry/icons/public/assets/core/actions/model-identity-panel/model-identity-panel.svg',
  'model-training': '/registry/icons/public/assets/core/actions/model-training-panel/model-training-panel.svg',
  'model-personalization': '/registry/icons/public/assets/core/system/personalization/customize.svg',
  'model-sources': '/registry/icons/public/assets/core/actions/model-memory-sources-panel/model-memory-sources-panel.svg',
  'model-memory': '/registry/icons/public/assets/core/cognition/memory/memory.svg',
  'model-voice': '/registry/icons/public/assets/core/actions/model-voice-training-panel/model-voice-training-panel.svg',
  'model-readiness': '/registry/icons/public/assets/core/actions/model-evaluation-panel/model-evaluation-panel.svg',
  'model-runtime': '/registry/icons/public/assets/core/actions/model-provider-panel/model-provider-panel.svg',
  consent: '/registry/icons/public/assets/core/identity/access/visibility-on.svg',
  sources: '/registry/icons/public/assets/core/actions/model-memory-sources-panel/model-memory-sources-panel.svg',
  memory: '/registry/icons/public/assets/core/cognition/memory/memory.svg',
  voice: '/registry/icons/public/assets/core/actions/model-voice-training-panel/model-voice-training-panel.svg',
  protocol: '/registry/icons/public/assets/core/actions/model-training-panel/model-training-panel.svg',
  datasets: '/registry/icons/public/assets/core/actions/model-memory-sources-panel/model-memory-sources-panel.svg',
  'knowledge-base': '/registry/icons/public/assets/core/files/document/document.svg',
  provenance: '/registry/icons/public/assets/core/navigation/route/route.svg',
  evaluation: '/registry/icons/public/assets/core/actions/model-evaluation-panel/model-evaluation-panel.svg',
  behavior: '/registry/icons/public/assets/layers/website/settings/actions/response-behavior.svg',
  language: '/registry/icons/public/assets/core/navigation/language/language.svg',
  emotion: '/registry/icons/public/assets/layers/website/settings/actions/home-interaction-settings-response-mount.svg',
  response: '/registry/icons/public/assets/layers/website/settings/actions/response-output-mode.svg',
  creativity: '/registry/icons/public/assets/core/system/personalization/customize.svg',
  reflection: '/registry/icons/public/assets/layers/website/settings/actions/changelog-modes.svg',
  state: '/registry/icons/public/assets/core/actions/model-evaluation-panel/model-evaluation-panel.svg',
  checks: '/registry/icons/public/assets/core/identity/trust/verified.svg',
  blockers: '/registry/icons/public/assets/core/identity/access/visibility-on.svg',
  history: '/registry/icons/public/assets/layers/website/settings/changelog/changelog.svg',
  trending: '/registry/icons/public/assets/core/system/analytics/chart-line.svg',
  directory: '/registry/icons/public/assets/core/navigation/discovery/discover.svg',
  expertise: '/registry/icons/public/assets/core/cognition/graph/graph.svg',
  reputation: '/registry/icons/public/assets/core/identity/shield/shield.svg',
  monetization: '/registry/icons/public/assets/core/commerce/finance/valuation.svg',
  preferences: '/registry/icons/public/assets/core/system/settings/settings.svg',
  provider: '/registry/icons/public/assets/core/actions/model-provider-panel/model-provider-panel.svg',
  routing: '/registry/icons/public/assets/core/navigation/route/route.svg',
  changelog: '/registry/icons/public/assets/layers/website/settings/changelog/changelog.svg',
});
