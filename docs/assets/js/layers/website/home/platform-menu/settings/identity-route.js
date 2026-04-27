import { mountClonedDestinationSection } from '../platform-destination-source.js';

const IDENTITY_ROUTE_SELECTORS = [
  '#home-settings-panel [data-home-settings-section="identity-route"]',
];

export function mountHomePlatformDestination(root) {
  mountClonedDestinationSection(root, {
    selectors: IDENTITY_ROUTE_SELECTORS,
    fallbackTitle: 'Identity and route',
    fallbackCopy: 'Identity and route controls are not available yet.',
  });
}
