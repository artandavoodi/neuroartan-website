import { bindProfileMenuActions } from './profile-actions.js';

export function mountHomePlatformDestination(root) {
  if (!(root instanceof Element)) {
    return;
  }

  bindProfileMenuActions(root);
}
