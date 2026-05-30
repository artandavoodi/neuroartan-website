import { mountSettingsCategory } from '../_shared/settings-category.js';
import {
  bindSettingsLanguagePreference,
  bindSettingsLocaleSync
} from '../_shared/settings-locale.js';

export function mountHomePlatformDestination(root, options = {}) {
  mountSettingsCategory(root, options);
  bindSettingsLanguagePreference(root);
  bindSettingsLocaleSync(root);
}
