import { mountClonedDestinationSection } from '../platform-destination-source.js';

const LANGUAGE_PRIVACY_SELECTORS = [
  '#home-settings-panel [data-home-settings-section="language-privacy"]',
];

export function mountHomePlatformDestination(root) {
  mountClonedDestinationSection(root, {
    selectors: LANGUAGE_PRIVACY_SELECTORS,
    fallbackTitle: 'Language, region, and privacy',
    fallbackCopy: 'Language, region, and privacy controls are not available yet.',
  });
}
