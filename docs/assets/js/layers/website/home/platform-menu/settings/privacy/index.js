import { mountSettingsCategory } from '../_shared/settings-category.js';

const STORAGE_KEY = 'neuroartan.cookieConsent';

function readStoredConsent() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
  }
  return null;
}

function applyStoredConsentToPrivacyInputs() {
  const stored = readStoredConsent();
  const root = document.querySelector('[data-home-platform-destination-root]');
  if (!root) return;

  root.querySelectorAll('[data-cookie-consent-category]').forEach((checkbox) => {
    const key = checkbox.dataset.cookieConsentCategory;
    if (!key || key === 'essential') return;

    if (stored && stored.preferences) {
      checkbox.checked = Boolean(stored.preferences[key]);
      return;
    }

    checkbox.checked = true;
  });

  root.querySelectorAll('[data-cookie-consent-subcategory]').forEach((checkbox) => {
    const key = checkbox.dataset.cookieConsentSubcategory;
    const parentKey = checkbox.dataset.cookieConsentParent;
    if (!key || !parentKey) return;

    const storedValue = stored?.preferences?.[key];
    checkbox.checked = typeof storedValue === 'boolean'
      ? storedValue
      : Boolean(root.querySelector(`[data-cookie-consent-category="${parentKey}"]`)?.checked);
  });

  syncParentToggleFromSubitems('analytics', root);
  syncParentToggleFromSubitems('experience', root);
}

function syncParentToggleFromSubitems(parentKey, root) {
  if (!parentKey || !root) return;

  const children = Array.from(root.querySelectorAll('[data-cookie-consent-subcategory]')).filter((checkbox) => checkbox.dataset.cookieConsentParent === parentKey);
  if (!children.length) return;

  const parentCheckbox = root.querySelector(`[data-cookie-consent-category="${parentKey}"]`);
  if (!parentCheckbox) return;

  parentCheckbox.checked = children.some((checkbox) => checkbox.checked);

  const parentToggle = root.querySelector(`[data-cookie-consent-toggle="${parentKey}"]`);
  if (parentToggle) {
    parentToggle.setAttribute('aria-checked', String(parentCheckbox.checked));
    parentToggle.dataset.cookieConsentEnabled = String(parentCheckbox.checked);
  }
}

function listenToCookieConsentChanges() {
  document.addEventListener('cookie-consent:state-changed', () => {
    applyStoredConsentToPrivacyInputs();
  });
}

export function mountHomePlatformDestination(root, options = {}) {
  mountSettingsCategory(root, options);

  applyStoredConsentToPrivacyInputs();
  listenToCookieConsentChanges();
}
