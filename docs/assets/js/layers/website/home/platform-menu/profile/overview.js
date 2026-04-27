import { mountClonedDestinationSection } from '../platform-destination-source.js';

const PROFILE_OVERVIEW_SELECTORS = [
  '#home-profile-control-panel [data-home-profile-control-section="overview"]',
];

export function mountHomePlatformDestination(root) {
  mountClonedDestinationSection(root, {
    selectors: PROFILE_OVERVIEW_SELECTORS,
    fallbackTitle: 'Profile overview',
    fallbackCopy: 'Profile overview is not available yet.',
  });
}
