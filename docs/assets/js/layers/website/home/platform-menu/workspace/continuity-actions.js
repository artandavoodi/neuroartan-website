import { mountClonedDestinationSection } from '../platform-destination-source.js';

const CONTINUITY_ACTIONS_SELECTORS = [
  '#home-workspace-panel [data-home-workspace-section="continuity-actions"]',
];

export function mountHomePlatformDestination(root) {
  mountClonedDestinationSection(root, {
    selectors: CONTINUITY_ACTIONS_SELECTORS,
    fallbackTitle: 'Continuity actions',
    fallbackCopy: 'Continuity actions are not available yet.',
  });
}
