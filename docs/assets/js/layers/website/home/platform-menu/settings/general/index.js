import { mountSettingsCategory } from '../_shared/settings-category.js';
import {
  hydrateAccountLandingPreferenceFromSupabase,
  readAccountLandingPreference,
  writeAccountLandingPreference
} from '../../../../system/account/account-landing-preferences.js';

function syncLandingButtons(root, value = readAccountLandingPreference()) {
  root.querySelectorAll('[data-account-landing-option]').forEach((button) => {
    if (!(button instanceof HTMLButtonElement)) return;
    const active = button.dataset.accountLandingOption === value;
    button.setAttribute('aria-pressed', active ? 'true' : 'false');
    button.setAttribute('aria-checked', active ? 'true' : 'false');
  });
}

function bindLandingPreference(root) {
  if (root.dataset.accountLandingPreferenceBound === 'true') return;
  root.dataset.accountLandingPreferenceBound = 'true';

  syncLandingButtons(root);
  void hydrateAccountLandingPreferenceFromSupabase().then((value) => syncLandingButtons(root, value));

  root.addEventListener('click', (event) => {
    const button = event.target instanceof Element
      ? event.target.closest('[data-account-landing-option]')
      : null;
    if (!(button instanceof HTMLButtonElement)) return;

    const value = writeAccountLandingPreference(button.dataset.accountLandingOption || 'feed');
    syncLandingButtons(root, value);
  });
}

export function mountHomePlatformDestination(root, options = {}) {
  mountSettingsCategory(root, options);
  bindLandingPreference(root);
}
