import { mountClonedDestinationSection } from '../platform-destination-source.js';

const INTERACTION_STATE_SELECTORS = [
  '#home-workspace-panel [data-home-workspace-section="interaction-state"]',
];

export function mountHomePlatformDestination(root) {
  mountClonedDestinationSection(root, {
    selectors: INTERACTION_STATE_SELECTORS,
    fallbackTitle: 'Current interaction',
    fallbackCopy: 'Current interaction details are not available yet.',
  });
}
