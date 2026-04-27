import { mountClonedDestinationSection } from '../platform-destination-source.js';

const ACCOUNT_CONTROL_SELECTORS = [
  '#home-profile-control-panel [data-home-profile-control-section="account-control"]',
];

export function mountHomePlatformDestination(root) {
  mountClonedDestinationSection(root, {
    selectors: ACCOUNT_CONTROL_SELECTORS,
    fallbackTitle: 'Account control',
    fallbackCopy: 'Account control is not available yet.',
  });
}
