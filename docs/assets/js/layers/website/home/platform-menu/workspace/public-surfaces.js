import { mountClonedDestinationSection } from '../platform-destination-source.js';

const PUBLIC_SURFACES_SELECTORS = [
  '#home-workspace-panel [data-home-workspace-section="public-surfaces"]',
];

export function mountHomePlatformDestination(root) {
  mountClonedDestinationSection(root, {
    selectors: PUBLIC_SURFACES_SELECTORS,
    fallbackTitle: 'Public surfaces',
    fallbackCopy: 'Public surfaces are not available yet.',
  });
}
