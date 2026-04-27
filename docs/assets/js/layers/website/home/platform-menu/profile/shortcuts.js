import { mountClonedDestinationSection } from '../platform-destination-source.js';

const SHORTCUTS_SELECTORS = [
  '#home-profile-control-panel [data-home-profile-control-section="shortcuts"]',
];

export function mountHomePlatformDestination(root) {
  mountClonedDestinationSection(root, {
    selectors: SHORTCUTS_SELECTORS,
    fallbackTitle: 'Shortcuts',
    fallbackCopy: 'Profile shortcuts are not available yet.',
  });
}
