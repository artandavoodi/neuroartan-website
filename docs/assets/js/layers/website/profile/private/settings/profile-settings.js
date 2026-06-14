/* =============================================================================
   01) MODULE IMPORTS
   02) SETTINGS HELPERS
   03) SETTINGS RENDER
   04) SETTINGS INIT
   ============================================================================= */

/* =============================================================================
   01) MODULE IMPORTS
   ============================================================================= */

import { getProfileRuntimeState, subscribeProfileRuntime } from '../shell/profile-runtime.js';
import { getProfileNavigationState, subscribeProfileNavigation } from '../navigation/profile-navigation.js';
import { getPrivateProfileSaveState, subscribePrivateProfileSaveState } from '../../../system/profile/profile-save.js';
import {
  getProfileVerificationState,
  requestProfileVerification
} from '../../../system/profile/profile-verification.js';
import {
  getSupabaseClient,
  normalizeString
} from '../../../system/account/identity/account-profile-identity.js';
import {
  evaluateAccountPassword,
  loadAccountPasswordPolicy
} from '../../../system/account/identity/account-password-policy.js';
import {
  recordProfileChangelogEvent
} from '../../../system/profile/profile-changelog-store.js';

import { mountSettingsCategory } from '../../../home/platform-menu/settings/_shared/settings-category.js';

const PASSWORD_RECOVERY_STORAGE_KEY = 'neuroartan_password_recovery';
const SOCIAL_LINKS_CONFIG_URL = '/assets/data/layers/website/profile/social-links.json';
const INDUSTRIES_CONFIG_URL = '/collections/config/industries.json';
const PROFILE_IDENTITY_CHANGE_REQUESTS_TABLE = 'profile_identity_change_requests';
const PROFILE_IDENTITY_CHANGE_REQUEST_COOLDOWN_HOURS = 70;
let profileSettingsSocialLinksConfig = null;
let profileSettingsSocialLinksConfigPromise = null;
let profileSettingsIndustriesConfig = null;
let profileSettingsIndustriesConfigPromise = null;

/* =============================================================================
   02) SETTINGS HELPERS
   ============================================================================= */

function getSettingsRoots() {
  return Array.from(document.querySelectorAll('[data-profile-settings-panel]'));
}

function initializeSharedSettingsSections(root) {
  if (!(root instanceof HTMLElement)) return;
  if (root.dataset.profileSettingsSharedSectionsReady === 'true') return;

  mountSettingsCategory(root);
  root.dataset.profileSettingsSharedSectionsReady = 'true';
}

function setText(root, selector, value) {
  const node = root.querySelector(selector);
  if (!node) return;
  node.textContent = value;
}

function buildLocalizedMonthLabel(monthIndex) {
  try {
    return new Intl.DateTimeFormat(document.documentElement.lang || 'en', {
      month: 'long',
      timeZone: 'UTC'
    }).format(new Date(Date.UTC(2000, monthIndex, 1)));
  } catch (_) {
    return String(monthIndex + 1).padStart(2, '0');
  }
}

function formatProfileSettingsBirthDate(value = '') {
  const normalizedValue = normalizeString(value);
  const match = normalizedValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return 'Not set';

  try {
    return new Intl.DateTimeFormat(document.documentElement.lang || 'en', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC'
    }).format(new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))));
  } catch (_) {
    return normalizedValue;
  }
}

function setProfileSettingsBirthDateDisplay(root, value = '') {
  const display = root.querySelector('[data-profile-settings-date-of-birth-display]');
  if (display instanceof HTMLElement) {
    display.textContent = formatProfileSettingsBirthDate(value);
  }
}

function buildOption(value, label) {
  const option = document.createElement('option');
  option.value = String(value);
  option.textContent = label;
  return option;
}

function getDateControl(root, control) {
  return root.querySelector(`[data-profile-settings-date-control="${control}"]`);
}

function getSelectedOptionLabel(select, fallback = '') {
  if (!(select instanceof HTMLSelectElement)) return fallback;
  const option = select.selectedOptions?.[0];
  return normalizeString(option?.textContent || fallback);
}

function setSelectLabel(root, name, fallback = '') {
  const select = root.querySelector(`[name="${name}"]`);
  const label = root.querySelector(`[data-profile-settings-select-label="${name}"]`);
  if (!(label instanceof HTMLElement)) return;
  label.textContent = getSelectedOptionLabel(select, fallback) || fallback;
}

function syncProfileSettingsDateLabels(root) {
  ['month', 'day', 'year'].forEach((control) => {
    const select = getDateControl(root, control);
    const label = root.querySelector(`[data-profile-settings-date-label="${control}"]`);
    if (!(label instanceof HTMLElement)) return;
    label.textContent = getSelectedOptionLabel(select, control.replace(/^./, (char) => char.toUpperCase()));
  });
}

function populateProfileSettingsDateOptions(root) {
  const monthSelect = getDateControl(root, 'month');
  const yearSelect = getDateControl(root, 'year');

  if (monthSelect instanceof HTMLSelectElement && monthSelect.options.length <= 1) {
    for (let monthIndex = 0; monthIndex < 12; monthIndex += 1) {
      monthSelect.appendChild(buildOption(monthIndex + 1, buildLocalizedMonthLabel(monthIndex)));
    }
  }

  if (yearSelect instanceof HTMLSelectElement && yearSelect.options.length <= 1) {
    const currentYear = new Date().getUTCFullYear();
    for (let year = currentYear; year >= currentYear - 110; year -= 1) {
      yearSelect.appendChild(buildOption(year, String(year)));
    }
  }
}

function syncProfileSettingsDayOptions(root) {
  const daySelect = getDateControl(root, 'day');
  const monthSelect = getDateControl(root, 'month');
  const yearSelect = getDateControl(root, 'year');
  if (!(daySelect instanceof HTMLSelectElement)) return;

  const selectedDay = Number.parseInt(daySelect.value, 10) || 0;
  const selectedMonth = Number.parseInt(monthSelect?.value || '', 10) || 0;
  const selectedYear = Number.parseInt(yearSelect?.value || '', 10) || 2000;
  const maxDay = selectedMonth
    ? new Date(Date.UTC(selectedYear, selectedMonth, 0)).getUTCDate()
    : 31;

  while (daySelect.options.length > 1) {
    daySelect.remove(1);
  }

  for (let day = 1; day <= maxDay; day += 1) {
    daySelect.appendChild(buildOption(day, String(day).padStart(2, '0')));
  }

  if (selectedDay) {
    daySelect.value = String(Math.min(selectedDay, maxDay));
  }

  syncProfileSettingsDateLabels(root);
}

function syncProfileSettingsDateValue(root) {
  const hiddenInput = root.querySelector('[data-profile-settings-date-of-birth]');
  const month = Number.parseInt(getDateControl(root, 'month')?.value || '', 10) || 0;
  const year = Number.parseInt(getDateControl(root, 'year')?.value || '', 10) || 0;

  if (!(hiddenInput instanceof HTMLInputElement)) return;

  syncProfileSettingsDayOptions(root);
  const day = Number.parseInt(getDateControl(root, 'day')?.value || '', 10) || 0;

  hiddenInput.value = month && day && year
    ? `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    : '';
  syncProfileSettingsDateLabels(root);
}

function syncProfileSettingsDateControls(root, value = '') {
  const hiddenInput = root.querySelector('[data-profile-settings-date-of-birth]');
  const monthSelect = getDateControl(root, 'month');
  const daySelect = getDateControl(root, 'day');
  const yearSelect = getDateControl(root, 'year');

  populateProfileSettingsDateOptions(root);

  if (hiddenInput instanceof HTMLInputElement) {
    hiddenInput.value = value || '';
  }

  setProfileSettingsBirthDateDisplay(root, value || '');

  if (!(monthSelect instanceof HTMLSelectElement) || !(daySelect instanceof HTMLSelectElement) || !(yearSelect instanceof HTMLSelectElement)) {
    return;
  }

  const match = String(value || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    monthSelect.value = '';
    yearSelect.value = '';
    syncProfileSettingsDayOptions(root);
    daySelect.value = '';
    syncProfileSettingsDateLabels(root);
    return;
  }

  yearSelect.value = String(Number.parseInt(match[1], 10));
  monthSelect.value = String(Number.parseInt(match[2], 10));
  syncProfileSettingsDayOptions(root);
  daySelect.value = String(Number.parseInt(match[3], 10));
  syncProfileSettingsDateLabels(root);
}

function setValue(root, name, value) {
  const field = root.querySelector(`[name="${name}"]`);
  if (!field) return;

  if (name === 'date_of_birth') {
    syncProfileSettingsDateControls(root, value || '');
    return;
  }

  if (field instanceof HTMLInputElement && field.type === 'hidden' && field.matches('[data-profile-settings-toggle-input]')) {
    setProfileSettingsToggleValue(root, name, value === true);
    return;
  }

  if (field instanceof HTMLInputElement && field.type === 'checkbox') {
    field.checked = value === true;
    return;
  }

  field.value = value || '';

  if (field instanceof HTMLSelectElement) {
    setSelectLabel(root, name, field.options?.[0]?.textContent || '');
  }
}

function formatProfileSettingsListValue(value) {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeString(item)).filter(Boolean).join(', ');
  }
  if (typeof value === 'string') return normalizeString(value);
  return '';
}

function normalizeProfileSettingsSocialEntry(entry) {
  if (!entry || typeof entry !== 'object') return null;
  const platform = normalizeString(entry.platform || entry.id || '');
  const value = normalizeString(entry.value || entry.username || entry.handle || entry.url || '');
  const url = normalizeString(entry.url || '');
  if (!platform || (!value && !url)) return null;
  return { platform, value: value || url, url };
}

function parseProfileSettingsSocialLinks(value) {
  if (Array.isArray(value)) {
    return value.map(normalizeProfileSettingsSocialEntry).filter(Boolean);
  }

  if (typeof value !== 'string') return [];
  const normalizedValue = normalizeString(value);
  if (!normalizedValue) return [];

  try {
    const parsed = JSON.parse(normalizedValue);
    if (Array.isArray(parsed)) {
      return parsed.map(normalizeProfileSettingsSocialEntry).filter(Boolean);
    }
  } catch (_) {}

  return normalizedValue
    .split(',')
    .map((item) => normalizeString(item))
    .filter(Boolean)
    .map((url) => ({ platform: 'website', value: url, url }));
}

function getProfileSettingsSocialInput(root) {
  return root.querySelector('[data-profile-settings-social-links-input]');
}

function getProfileSettingsSocialOverlay(root) {
  return root.querySelector('[data-profile-settings-social-overlay]');
}

function buildProfileSettingsSocialUrl(platform = {}, value = '') {
  const normalizedValue = normalizeString(value).replace(/^@+/, '');
  if (!normalizedValue) return '';
  if (/^https?:\/\//i.test(normalizedValue)) return normalizedValue;
  const baseUrl = normalizeString(platform.base_url || '');
  if (!baseUrl) return normalizedValue;
  return `${baseUrl}${normalizedValue}`;
}

function getProfileSettingsSocialSummary(links = []) {
  const count = Array.isArray(links) ? links.length : 0;
  if (!count) return 'Add public social profiles';
  if (count === 1) return '1 public social profile';
  return `${count} public social profiles`;
}

function setProfileSettingsSocialLinksState(root, value = []) {
  const input = getProfileSettingsSocialInput(root);
  const summary = root.querySelector('[data-profile-settings-social-links-summary]');
  const links = parseProfileSettingsSocialLinks(value);

  if (input instanceof HTMLInputElement) {
    input.value = JSON.stringify(links);
  }

  if (summary instanceof HTMLElement) {
    summary.textContent = getProfileSettingsSocialSummary(links);
  }
}

function setProfileSettingsCountryRegionState(root, value = '') {
  const normalizedValue = normalizeString(value);
  const input = root.querySelector('[data-profile-settings-country-region-input]');
  const label = root.querySelector('[data-profile-settings-country-region-label]');
  const action = root.querySelector('[data-profile-settings-country-region-open]');

  if (input instanceof HTMLInputElement) {
    input.value = normalizedValue;
  }

  if (label instanceof HTMLElement) {
    label.textContent = normalizedValue || 'Country or region';
  }

  if (action instanceof HTMLElement) {
    action.dataset.profileSettingsCountryRegionReady = normalizedValue ? 'true' : 'false';
  }
}

function openProfileSettingsCountryRegionOverlay(root) {
  if (!(root instanceof HTMLElement)) return;
  root.dataset.profileSettingsCountryRegionPending = 'true';
  document.dispatchEvent(new CustomEvent('neuroartan:country-overlay-open-requested', {
    detail: {
      source: 'profile-settings-country-region',
      field: 'locale_country_label'
    }
  }));
}

function getProfileSettingsCountryRegionEventValue(event) {
  const detail = event?.detail || {};
  const localeState = detail.locale || detail.state || detail.localeState || {};
  const candidates = [
    detail.locale_country_label,
    detail.country_label,
    detail.countryLabel,
    detail.country,
    detail.region,
    detail.label,
    localeState.locale_country_label,
    localeState.country_label,
    localeState.countryLabel,
    localeState.country,
    localeState.region,
    localeState.label
  ];
  return normalizeString(candidates.find((value) => normalizeString(value)) || '');
}

function syncProfileSettingsCountryRegionFromLocaleEvent(event) {
  const value = getProfileSettingsCountryRegionEventValue(event);
  if (!value) return;

  getSettingsRoots().forEach((root) => {
    const input = root.querySelector('[data-profile-settings-country-region-input]');
    const previousValue = input instanceof HTMLInputElement ? normalizeString(input.value) : '';
    const shouldSubmit = root.dataset.profileSettingsCountryRegionPending === 'true' && value !== previousValue;

    setProfileSettingsCountryRegionState(root, value);
    root.dataset.profileSettingsCountryRegionPending = 'false';

    if (shouldSubmit) {
      const form = root.querySelector('[data-profile-save-form]');
      if (form instanceof HTMLFormElement) {
        form.requestSubmit();
      }
    }
  });
}

function getProfileSettingsDetectedTimezone() {
  try {
    return normalizeString(Intl.DateTimeFormat().resolvedOptions().timeZone || '');
  } catch (_) {
    return '';
  }
}

function getProfileSettingsTimezoneOptions() {
  try {
    if (typeof Intl.supportedValuesOf === 'function') {
      const values = Intl.supportedValuesOf('timeZone');
      if (Array.isArray(values) && values.length) {
        return values.map((value) => normalizeString(value)).filter(Boolean);
      }
    }
  } catch (_) {}

  return [
    'UTC',
    'Europe/Zagreb',
    'Europe/Berlin',
    'Europe/London',
    'Asia/Tehran',
    'America/New_York',
    'America/Los_Angeles'
  ];
}

const LANGUAGES_CONFIG_URL = '/collections/config/languages.json';
let profileSettingsLanguagesConfig = null;
let profileSettingsLanguagesConfigPromise = null;

async function loadProfileSettingsLanguagesConfig() {
  if (profileSettingsLanguagesConfig) return profileSettingsLanguagesConfig;
  if (!profileSettingsLanguagesConfigPromise) {
    profileSettingsLanguagesConfigPromise = fetch(LANGUAGES_CONFIG_URL, { headers: { Accept: 'application/json' } })
      .then((response) => {
        if (!response.ok) throw new Error('LANGUAGES_CONFIG_UNAVAILABLE');
        return response.json();
      })
      .then((payload) => {
        profileSettingsLanguagesConfig = Array.isArray(payload?.languages) ? payload.languages : [];
        return profileSettingsLanguagesConfig;
      })
      .catch((error) => {
        console.error('[profile-settings] Languages configuration could not be loaded.', error);
        profileSettingsLanguagesConfig = [];
        return profileSettingsLanguagesConfig;
      });
  }
  return profileSettingsLanguagesConfigPromise;
}

function getProfileSettingsLanguageOptions() {
  return profileSettingsLanguagesConfig?.map((lang) => lang.native) || [];
}

async function loadProfileSettingsIndustriesConfig() {
  if (profileSettingsIndustriesConfig) return profileSettingsIndustriesConfig;
  if (!profileSettingsIndustriesConfigPromise) {
    profileSettingsIndustriesConfigPromise = fetch(INDUSTRIES_CONFIG_URL, { headers: { Accept: 'application/json' } })
      .then((response) => {
        if (!response.ok) throw new Error('INDUSTRIES_CONFIG_UNAVAILABLE');
        return response.json();
      })
      .then((payload) => {
        profileSettingsIndustriesConfig = Array.isArray(payload?.industries) ? payload.industries : [];
        return profileSettingsIndustriesConfig;
      })
      .catch((error) => {
        console.error('[profile-settings] Industries configuration could not be loaded.', error);
        profileSettingsIndustriesConfig = [];
        return profileSettingsIndustriesConfig;
      });
  }
  return profileSettingsIndustriesConfigPromise;
}

function getProfileSettingsIndustryOptions() {
  return profileSettingsIndustriesConfig || [];
}

function sortProfileSettingsSelectedFirst(values = [], isSelected = () => false) {
  return values
    .map((value, index) => ({ value, index, selected: isSelected(value) }))
    .sort((a, b) => {
      if (a.selected !== b.selected) return a.selected ? -1 : 1;
      return a.index - b.index;
    })
    .map((entry) => entry.value);
}

function setProfileSettingsIndustryState(root, value = '', state = 'ready') {
  const normalizedValue = normalizeString(value);
  const input = root.querySelector('[data-profile-settings-industry-input]');
  const label = root.querySelector('[data-profile-settings-industry-label]');
  const action = root.querySelector('[data-profile-settings-industry-open]');

  if (input instanceof HTMLInputElement) {
    input.value = normalizedValue;
  }

  if (label instanceof HTMLElement) {
    label.textContent = normalizedValue || 'Select industry or sector';
  }

  if (action instanceof HTMLElement) {
    action.dataset.profileSettingsIndustryReady = normalizedValue ? 'true' : 'false';
    action.dataset.profileSettingsIndustryState = state;
  }
}

function getProfileSettingsIndustryRootFromEventTarget(target) {
  const overlay = target?.closest?.('[data-profile-settings-industry-overlay]');
  const root = overlay?.profileSettingsIndustryRoot;
  return root instanceof HTMLElement ? root : null;
}

function getProfileSettingsIndustryOverlay(root) {
  const overlay = root.querySelector('[data-profile-settings-industry-overlay]');
  if (overlay instanceof HTMLElement) {
    overlay.profileSettingsIndustryRoot = root;
  }
  return overlay;
}

function buildProfileSettingsIndustryOption(optionData = {}, currentValue = '') {
  const label = normalizeString(optionData.label || optionData.name || optionData.id || '');
  const group = normalizeString(optionData.group || '');
  const option = document.createElement('button');
  option.className = 'profile-settings__selector-option profile-settings__industry-option ui-radio-list__item';
  option.type = 'button';
  option.dataset.profileSettingsIndustryOption = label;
  const isActive = label === currentValue;
  option.dataset.profileSettingsIndustryActive = isActive ? 'true' : 'false';
  option.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  if (isActive) {
    option.classList.add('is-selected');
  }

  const copy = document.createElement('span');
  copy.className = 'profile-settings__selector-option-copy profile-settings__industry-option-copy';
  const strong = document.createElement('strong');
  strong.textContent = label;
  copy.appendChild(strong);
  if (group) {
    const caption = document.createElement('span');
    caption.textContent = group;
    copy.appendChild(caption);
  }

  const radio = document.createElement('span');
  radio.className = 'profile-settings__selector-option-indicator profile-settings__industry-radio ui-radio-list__indicator';
  radio.setAttribute('aria-hidden', 'true');

  option.append(copy, radio);
  return option;
}

async function renderProfileSettingsIndustryOptions(root, query = '') {
  await loadProfileSettingsIndustriesConfig();
  const overlay = getProfileSettingsIndustryOverlay(root);
  if (!(overlay instanceof HTMLElement)) return;
  const list = overlay.querySelector('[data-profile-settings-industry-list]');
  const current = overlay.querySelector('[data-profile-settings-industry-current]');
  const input = root.querySelector('[data-profile-settings-industry-input]');
  const currentValue = input instanceof HTMLInputElement ? normalizeString(input.value) : '';
  const normalizedQuery = normalizeString(query).toLowerCase();
  const options = sortProfileSettingsSelectedFirst(getProfileSettingsIndustryOptions()
    .filter((optionData) => {
      const label = normalizeString(optionData.label || optionData.name || optionData.id || '');
      const group = normalizeString(optionData.group || '');
      return !normalizedQuery || `${label} ${group}`.toLowerCase().includes(normalizedQuery);
    }), (optionData) => normalizeString(optionData.label || optionData.name || optionData.id || '') === currentValue);

  if (current instanceof HTMLElement) {
    current.textContent = currentValue || 'Select industry or sector';
  }

  if (list instanceof HTMLElement) {
    list.replaceChildren(...options.map((optionData) => buildProfileSettingsIndustryOption(optionData, currentValue)));
  }
}

async function openProfileSettingsIndustryOverlay(root) {
  if (!(root instanceof HTMLElement)) return;
  setProfileSettingsIndustryState(root, root.querySelector('[data-profile-settings-industry-input]')?.value || '', 'ready');
  const overlay = getProfileSettingsIndustryOverlay(root);
  if (!(overlay instanceof HTMLElement)) return;
  await renderProfileSettingsIndustryOptions(root);
  document.body.classList.add('profile-settings-industry-overlay-open');
  overlay.hidden = false;
  const search = overlay.querySelector('[data-profile-settings-industry-search]');
  if (search instanceof HTMLInputElement) {
    search.value = '';
    window.setTimeout(() => search.focus(), 0);
  }
}

function closeProfileSettingsIndustryOverlay(root) {
  const overlay = root instanceof HTMLElement
    ? getProfileSettingsIndustryOverlay(root)
    : document.querySelector('[data-profile-settings-industry-overlay]');
  if (overlay instanceof HTMLElement) {
    overlay.hidden = true;
    overlay.profileSettingsIndustryRoot = root instanceof HTMLElement ? root : null;
  }
  document.body.classList.remove('profile-settings-industry-overlay-open');
}

function applyProfileSettingsIndustry(root, value = '') {
  const normalizedValue = normalizeString(value);
  if (!normalizedValue) return;
  setProfileSettingsIndustryState(root, normalizedValue, 'ready');
  closeProfileSettingsIndustryOverlay(root);

  const form = root.querySelector('[data-profile-save-form]');
  if (form instanceof HTMLFormElement) {
    form.requestSubmit();
  }
}

function getProfileSettingsInitialTimezone(value = '') {
  return normalizeString(value) || getProfileSettingsDetectedTimezone() || 'UTC';
}

function getProfileSettingsInitialLanguage(value = '') {
  return normalizeString(value) || getProfileSettingsDetectedLanguage() || 'en';
}

function getProfileSettingsDetectedLanguage() {
  try {
    return normalizeString(navigator.language) || 'en';
  } catch (_) {
    return 'en';
  }
}

function setProfileSettingsLanguageState(root, value = '', state = 'ready') {
  const normalizedValue = getProfileSettingsInitialLanguage(value);
  const input = root.querySelector('[data-profile-settings-language-input]');
  const label = root.querySelector('[data-profile-settings-language-label]');
  const action = root.querySelector('[data-profile-settings-language-open]');

  if (input instanceof HTMLInputElement) {
    input.value = normalizedValue;
  }

  if (label instanceof HTMLElement) {
    const language = profileSettingsLanguagesConfig?.find((lang) => lang.code === normalizedValue);
    label.textContent = language?.native || normalizedValue || 'Select language';
  }

  if (action instanceof HTMLElement) {
    action.dataset.profileSettingsLanguageReady = normalizedValue ? 'true' : 'false';
    action.dataset.profileSettingsLanguageState = state;
  }
}

function setProfileSettingsTimezoneState(root, value = '', state = 'ready') {
  const normalizedValue = getProfileSettingsInitialTimezone(value);
  const input = root.querySelector('[data-profile-settings-timezone-input]');
  const label = root.querySelector('[data-profile-settings-timezone-label]');
  const action = root.querySelector('[data-profile-settings-timezone-open]');

  if (input instanceof HTMLInputElement) {
    input.value = normalizedValue;
  }

  if (label instanceof HTMLElement) {
    label.textContent = normalizedValue || 'Detect time zone';
  }

  if (action instanceof HTMLElement) {
    action.dataset.profileSettingsTimezoneReady = normalizedValue ? 'true' : 'false';
    action.dataset.profileSettingsTimezoneState = state;
  }
}

function getProfileSettingsTimezoneOverlay(root) {
  let overlay = document.querySelector('[data-profile-settings-timezone-overlay]');
  if (overlay instanceof HTMLElement) {
    overlay.profileSettingsTimezoneRoot = root;
    return overlay;
  }

  overlay = document.createElement('section');
  overlay.className = 'profile-settings__selector-overlay profile-settings__timezone-overlay';
  overlay.dataset.profileSettingsTimezoneOverlay = '';
  overlay.hidden = true;
  overlay.profileSettingsTimezoneRoot = root;
  overlay.innerHTML = `
    <section class="profile-settings__selector-panel profile-settings__timezone-panel" role="dialog" aria-modal="true" aria-label="Time zone selector">
      <div class="profile-settings__selector-inner">
        <div class="profile-settings__selector-header">
          <button class="profile-settings__timezone-close global-close-button" type="button" data-profile-settings-timezone-close aria-label="Close time zone selector">
            <span class="global-close-button__line global-close-button__line--first" aria-hidden="true"></span>
            <span class="global-close-button__line global-close-button__line--second" aria-hidden="true"></span>
          </button>
          <div class="profile-settings__selector-heading profile-settings__timezone-current" data-profile-settings-timezone-current></div>
        </div>
        <div class="profile-settings__selector-toolbar profile-settings__timezone-search-wrap">
          <div class="profile-settings__selector-search-shell">
            <input class="profile-settings__selector-search profile-settings__timezone-search" type="search" autocomplete="off" placeholder="Search time zone" aria-label="Search time zone" data-profile-settings-timezone-search>
          </div>
        </div>
        <div class="profile-settings__selector-list profile-settings__timezone-list" data-profile-settings-timezone-list></div>
      </div>
    </section>
  `;
  document.body.appendChild(overlay);
  return overlay;
}

function getProfileSettingsLanguageOverlay(root) {
  let overlay = document.querySelector('[data-profile-settings-language-overlay]');
  if (overlay instanceof HTMLElement) {
    overlay.profileSettingsLanguageRoot = root;
    return overlay;
  }

  overlay = document.createElement('section');
  overlay.className = 'profile-settings__selector-overlay profile-settings__language-overlay';
  overlay.dataset.profileSettingsLanguageOverlay = '';
  overlay.hidden = true;
  overlay.profileSettingsLanguageRoot = root;
  overlay.innerHTML = `
    <section class="profile-settings__selector-panel profile-settings__language-panel" role="dialog" aria-modal="true" aria-label="Language selector">
      <div class="profile-settings__selector-inner">
        <div class="profile-settings__selector-header">
          <button class="profile-settings__language-close global-close-button" type="button" data-profile-settings-language-close aria-label="Close language selector">
            <span class="global-close-button__line global-close-button__line--first" aria-hidden="true"></span>
            <span class="global-close-button__line global-close-button__line--second" aria-hidden="true"></span>
          </button>
          <div class="profile-settings__selector-heading profile-settings__language-current" data-profile-settings-language-current></div>
        </div>
        <div class="profile-settings__selector-toolbar profile-settings__language-search-wrap">
          <div class="profile-settings__selector-search-shell">
            <input class="profile-settings__selector-search profile-settings__language-search" type="search" autocomplete="off" placeholder="Search language" aria-label="Search language" data-profile-settings-language-search>
          </div>
        </div>
        <div class="profile-settings__selector-list profile-settings__language-list" data-profile-settings-language-list></div>
      </div>
    </section>
  `;
  document.body.appendChild(overlay);
  return overlay;
}

function getProfileSettingsTimezoneRootFromEventTarget(target) {
  const overlay = target?.closest?.('[data-profile-settings-timezone-overlay]');
  const root = overlay?.profileSettingsTimezoneRoot;
  return root instanceof HTMLElement ? root : null;
}

function getProfileSettingsLanguageRootFromEventTarget(target) {
  const overlay = target?.closest?.('[data-profile-settings-language-overlay]');
  const root = overlay?.profileSettingsLanguageRoot;
  return root instanceof HTMLElement ? root : null;
}

function buildProfileSettingsLanguageOption(value, currentValue) {
  const option = document.createElement('button');
  option.className = 'profile-settings__selector-option profile-settings__language-option ui-radio-list__item';
  option.type = 'button';
  option.dataset.profileSettingsLanguageOption = value;
  const language = profileSettingsLanguagesConfig?.find((lang) => lang.native === value);
  const languageCode = language?.code || value;
  const isActive = languageCode === currentValue;
  option.dataset.profileSettingsLanguageActive = isActive ? 'true' : 'false';
  option.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  if (isActive) {
    option.classList.add('is-selected');
  }

  const copy = document.createElement('span');
  copy.className = 'profile-settings__selector-option-copy profile-settings__language-option-copy';
  const strong = document.createElement('strong');
  strong.textContent = value;
  copy.appendChild(strong);

  const radio = document.createElement('span');
  radio.className = 'profile-settings__selector-option-indicator profile-settings__language-radio ui-radio-list__indicator';
  radio.setAttribute('aria-hidden', 'true');

  option.append(copy, radio);
  return option;
}

async function renderProfileSettingsLanguageOptions(root, query = '') {
  await loadProfileSettingsLanguagesConfig();
  const overlay = getProfileSettingsLanguageOverlay(root);
  const list = overlay.querySelector('[data-profile-settings-language-list]');
  const current = overlay.querySelector('[data-profile-settings-language-current]');
  const input = root.querySelector('[data-profile-settings-language-input]');
  const currentValue = input instanceof HTMLInputElement ? normalizeString(input.value) : '';
  const normalizedQuery = normalizeString(query).toLowerCase();
  const options = sortProfileSettingsSelectedFirst(
    getProfileSettingsLanguageOptions()
      .filter((value) => !normalizedQuery || value.toLowerCase().includes(normalizedQuery)),
    (value) => {
      const language = profileSettingsLanguagesConfig?.find((lang) => lang.native === value);
      return (language?.code || value) === currentValue;
    }
  );

  if (current instanceof HTMLElement) {
    current.textContent = '';
  }

  if (list instanceof HTMLElement) {
    list.replaceChildren(...options.map((value) => buildProfileSettingsLanguageOption(value, currentValue)));
  }
}

async function openProfileSettingsLanguageOverlay(root) {
  if (!(root instanceof HTMLElement)) return;
  setProfileSettingsLanguageState(root, root.querySelector('[data-profile-settings-language-input]')?.value || '', 'ready');
  const overlay = getProfileSettingsLanguageOverlay(root);
  await renderProfileSettingsLanguageOptions(root);
  document.body.classList.add('profile-settings-language-overlay-open');
  overlay.hidden = false;
  const search = overlay.querySelector('[data-profile-settings-language-search]');
  if (search instanceof HTMLInputElement) {
    search.value = '';
    window.setTimeout(() => search.focus(), 0);
  }
}

function closeProfileSettingsLanguageOverlay(root) {
  const overlay = document.querySelector('[data-profile-settings-language-overlay]');
  if (overlay instanceof HTMLElement) {
    overlay.hidden = true;
    overlay.profileSettingsLanguageRoot = root instanceof HTMLElement ? root : null;
  }
  document.body.classList.remove('profile-settings-language-overlay-open');
}

function applyProfileSettingsLanguage(root, value = '') {
  const normalizedValue = normalizeString(value);
  if (!normalizedValue) return;
  const language = profileSettingsLanguagesConfig?.find((lang) => lang.native === normalizedValue);
  const code = language?.code || normalizedValue;
  setProfileSettingsLanguageState(root, code, 'ready');
  closeProfileSettingsLanguageOverlay(root);

  const form = root.querySelector('[data-profile-save-form]');
  if (form instanceof HTMLFormElement) {
    form.requestSubmit();
  }
}

function getProfileSettingsAdditionalLanguagesRootFromEventTarget(target) {
  const overlay = target?.closest?.('[data-profile-settings-additional-languages-overlay]');
  const root = overlay?.profileSettingsAdditionalLanguagesRoot;
  return root instanceof HTMLElement ? root : null;
}

function buildProfileSettingsAdditionalLanguagesOption(value, selectedValues) {
  const option = document.createElement('label');
  option.className = 'profile-settings__selector-option profile-settings__additional-languages-option ui-checkbox-list__item';
  option.dataset.profileSettingsAdditionalLanguagesOption = value;
  option.dataset.profileSettingsAdditionalLanguagesSelected = selectedValues.has(value) ? 'true' : 'false';
  option.setAttribute('aria-checked', selectedValues.has(value) ? 'true' : 'false');

  const content = document.createElement('div');
  content.className = 'profile-settings__selector-option-copy ui-checkbox-list__content profile-settings__additional-languages-option-copy';
  const strong = document.createElement('strong');
  strong.textContent = value;
  content.appendChild(strong);

  const indicator = document.createElement('span');
  indicator.className = 'profile-settings__selector-option-indicator ui-checkbox-list__indicator profile-settings__additional-languages-radio';
  indicator.setAttribute('aria-hidden', 'true');

  option.append(content, indicator);
  return option;
}

function renderProfileSettingsAdditionalLanguagesOptions(root, query = '') {
  const overlay = getProfileSettingsAdditionalLanguagesOverlay(root);
  const list = overlay.querySelector('[data-profile-settings-additional-languages-list]');
  const input = root.querySelector('[data-profile-settings-additional-languages-input]');
  const currentValue = input instanceof HTMLInputElement ? normalizeString(input.value) : '';
  const selectedValues = currentValue ? new Set(currentValue.split(',').map((v) => normalizeString(v)).filter(Boolean)) : new Set();
  const normalizedQuery = normalizeString(query).toLowerCase();
  const options = sortProfileSettingsSelectedFirst(
    getProfileSettingsLanguageOptions()
      .filter((value) => !normalizedQuery || value.toLowerCase().includes(normalizedQuery)),
    (value) => selectedValues.has(value)
  );

  if (list instanceof HTMLElement) {
    list.replaceChildren(...options.map((value) => buildProfileSettingsAdditionalLanguagesOption(value, selectedValues)));
  }
}

function getProfileSettingsAdditionalLanguagesOverlay(root) {
  let overlay = document.querySelector('[data-profile-settings-additional-languages-overlay]');
  if (overlay instanceof HTMLElement) {
    overlay.profileSettingsAdditionalLanguagesRoot = root;
    return overlay;
  }

  overlay = document.createElement('section');
  overlay.className = 'profile-settings__selector-overlay profile-settings__additional-languages-overlay';
  overlay.dataset.profileSettingsAdditionalLanguagesOverlay = '';
  overlay.hidden = true;
  overlay.profileSettingsAdditionalLanguagesRoot = root;
  overlay.innerHTML = `
    <section class="profile-settings__selector-panel profile-settings__additional-languages-panel" role="dialog" aria-modal="true" aria-label="Additional languages selector">
      <div class="profile-settings__selector-inner">
        <div class="profile-settings__selector-header">
          <button class="profile-settings__additional-languages-close global-close-button" type="button" data-profile-settings-additional-languages-close aria-label="Close additional languages selector">
            <span class="global-close-button__line global-close-button__line--first" aria-hidden="true"></span>
            <span class="global-close-button__line global-close-button__line--second" aria-hidden="true"></span>
          </button>
          <div class="profile-settings__selector-heading profile-settings__additional-languages-current" data-profile-settings-additional-languages-current></div>
        </div>
        <div class="profile-settings__selector-toolbar profile-settings__additional-languages-search-wrap">
          <div class="profile-settings__selector-search-shell">
            <input class="profile-settings__selector-search profile-settings__additional-languages-search" type="search" autocomplete="off" placeholder="Search language" aria-label="Search language" data-profile-settings-additional-languages-search>
          </div>
        </div>
        <div class="profile-settings__selector-list profile-settings__additional-languages-list" data-profile-settings-additional-languages-list></div>
      </div>
    </section>
  `;
  document.body.appendChild(overlay);
  return overlay;
}

async function openProfileSettingsAdditionalLanguagesOverlay(root) {
  if (!(root instanceof HTMLElement)) return;
  setProfileSettingsAdditionalLanguagesState(root, root.querySelector('[data-profile-settings-additional-languages-input]')?.value || '', 'ready');
  const overlay = getProfileSettingsAdditionalLanguagesOverlay(root);
  await renderProfileSettingsAdditionalLanguagesOptions(root);
  document.body.classList.add('profile-settings-additional-languages-overlay-open');
  overlay.hidden = false;
  const search = overlay.querySelector('[data-profile-settings-additional-languages-search]');
  if (search instanceof HTMLInputElement) {
    search.value = '';
    window.setTimeout(() => search.focus(), 0);
  }
}

function closeProfileSettingsAdditionalLanguagesOverlay(root) {
  const overlay = document.querySelector('[data-profile-settings-additional-languages-overlay]');
  if (overlay instanceof HTMLElement) {
    overlay.hidden = true;
    overlay.profileSettingsAdditionalLanguagesRoot = root instanceof HTMLElement ? root : null;
  }
  document.body.classList.remove('profile-settings-additional-languages-overlay-open');
}

function setProfileSettingsAdditionalLanguagesState(root, value = '', state = 'ready') {
  const input = root.querySelector('[data-profile-settings-additional-languages-input]');
  const label = root.querySelector('[data-profile-settings-additional-languages-label]');
  const action = root.querySelector('[data-profile-settings-additional-languages-open]');

  if (input instanceof HTMLInputElement) {
    input.value = value;
  }

  if (label instanceof HTMLElement) {
    const selectedValues = value ? value.split(',').map((v) => normalizeString(v)).filter(Boolean) : [];
    if (selectedValues.length === 0) {
      label.textContent = 'Select additional languages';
    } else if (selectedValues.length === 1) {
      label.textContent = selectedValues[0];
    } else {
      label.textContent = `${selectedValues[0]} +${selectedValues.length - 1} more`;
    }
  }

  if (action instanceof HTMLElement) {
    action.dataset.profileSettingsAdditionalLanguagesReady = value ? 'true' : 'false';
    action.dataset.profileSettingsAdditionalLanguagesState = state;
  }
}

function applyProfileSettingsAdditionalLanguages(root, value = '') {
  const input = root.querySelector('[data-profile-settings-additional-languages-input]');
  const currentValue = input instanceof HTMLInputElement ? normalizeString(input.value) : '';
  const selectedValues = currentValue ? new Set(currentValue.split(',').map((v) => normalizeString(v)).filter(Boolean)) : new Set();
  const normalizedValue = normalizeString(value);

  if (selectedValues.has(normalizedValue)) {
    selectedValues.delete(normalizedValue);
  } else {
    selectedValues.add(normalizedValue);
  }

  const newValue = Array.from(selectedValues).join(',');
  setProfileSettingsAdditionalLanguagesState(root, newValue, 'ready');

  const overlay = document.querySelector('[data-profile-settings-additional-languages-overlay]');
  if (overlay instanceof HTMLElement) {
    renderProfileSettingsAdditionalLanguagesOptions(root, overlay.querySelector('[data-profile-settings-additional-languages-search]')?.value || '');
  }

  const form = root.querySelector('[data-profile-save-form]');
  if (form instanceof HTMLFormElement) {
    form.requestSubmit();
  }
}

function buildProfileSettingsTimezoneOption(value, currentValue) {
  const option = document.createElement('button');
  option.className = 'profile-settings__selector-option profile-settings__timezone-option ui-radio-list__item';
  option.type = 'button';
  option.dataset.profileSettingsTimezoneOption = value;
  option.dataset.profileSettingsTimezoneActive = value === currentValue ? 'true' : 'false';
  option.setAttribute('aria-pressed', value === currentValue ? 'true' : 'false');
  if (value === currentValue) {
    option.classList.add('is-selected');
  }

  const copy = document.createElement('span');
  copy.className = 'profile-settings__selector-option-copy profile-settings__timezone-option-copy';
  const strong = document.createElement('strong');
  strong.textContent = value;
  copy.appendChild(strong);

  const radio = document.createElement('span');
  radio.className = 'profile-settings__selector-option-indicator profile-settings__timezone-radio ui-radio-list__indicator';
  radio.setAttribute('aria-hidden', 'true');

  option.append(copy, radio);
  return option;
}

function renderProfileSettingsTimezoneOptions(root, query = '') {
  const overlay = getProfileSettingsTimezoneOverlay(root);
  const list = overlay.querySelector('[data-profile-settings-timezone-list]');
  const current = overlay.querySelector('[data-profile-settings-timezone-current]');
  const input = root.querySelector('[data-profile-settings-timezone-input]');
  const currentValue = input instanceof HTMLInputElement ? normalizeString(input.value) : '';
  const detectedValue = getProfileSettingsDetectedTimezone() || 'UTC';
  const normalizedQuery = normalizeString(query).toLowerCase();
  const options = sortProfileSettingsSelectedFirst(
    getProfileSettingsTimezoneOptions()
      .filter((value) => !normalizedQuery || value.toLowerCase().includes(normalizedQuery)),
    (value) => value === currentValue
  );

  if (current instanceof HTMLElement) {
    current.textContent = `System detected · ${detectedValue}`;
  }

  if (list instanceof HTMLElement) {
    list.replaceChildren(...options.map((value) => buildProfileSettingsTimezoneOption(value, currentValue)));
  }
}

function openProfileSettingsTimezoneOverlay(root) {
  if (!(root instanceof HTMLElement)) return;
  setProfileSettingsTimezoneState(root, root.querySelector('[data-profile-settings-timezone-input]')?.value || '', 'ready');
  const overlay = getProfileSettingsTimezoneOverlay(root);
  renderProfileSettingsTimezoneOptions(root);
  document.body.classList.add('profile-settings-timezone-overlay-open');
  overlay.hidden = false;
  const search = overlay.querySelector('[data-profile-settings-timezone-search]');
  if (search instanceof HTMLInputElement) {
    search.value = '';
    window.setTimeout(() => search.focus(), 0);
  }
}

function closeProfileSettingsTimezoneOverlay(root) {
  const overlay = document.querySelector('[data-profile-settings-timezone-overlay]');
  if (overlay instanceof HTMLElement) {
    overlay.hidden = true;
    overlay.profileSettingsTimezoneRoot = root instanceof HTMLElement ? root : null;
  }
  document.body.classList.remove('profile-settings-timezone-overlay-open');
}

function applyProfileSettingsTimezone(root, value = '') {
  const normalizedValue = normalizeString(value);
  if (!normalizedValue) return;
  setProfileSettingsTimezoneState(root, normalizedValue, 'ready');
  closeProfileSettingsTimezoneOverlay(root);

  const form = root.querySelector('[data-profile-save-form]');
  if (form instanceof HTMLFormElement) {
    form.requestSubmit();
  }
}

async function loadProfileSettingsSocialLinksConfig() {
  if (profileSettingsSocialLinksConfig) return profileSettingsSocialLinksConfig;
  if (!profileSettingsSocialLinksConfigPromise) {
    profileSettingsSocialLinksConfigPromise = fetch(SOCIAL_LINKS_CONFIG_URL, { headers: { Accept: 'application/json' } })
      .then((response) => {
        if (!response.ok) throw new Error('SOCIAL_LINKS_CONFIG_UNAVAILABLE');
        return response.json();
      })
      .then((payload) => {
        profileSettingsSocialLinksConfig = Array.isArray(payload?.platforms) ? payload.platforms : [];
        return profileSettingsSocialLinksConfig;
      })
      .catch((error) => {
        console.error('[profile-settings] Social links configuration could not be loaded.', error);
        profileSettingsSocialLinksConfig = [];
        return profileSettingsSocialLinksConfig;
      });
  }
  return profileSettingsSocialLinksConfigPromise;
}

function renderProfileSettingsSocialRows(root, platforms = []) {
  const list = root.querySelector('[data-profile-settings-social-list]');
  const input = getProfileSettingsSocialInput(root);
  if (!(list instanceof HTMLElement)) return;

  const existingLinks = parseProfileSettingsSocialLinks(input instanceof HTMLInputElement ? input.value : '');
  const existingByPlatform = new Map(existingLinks.map((entry) => [entry.platform, entry]));

  list.replaceChildren(...platforms.map((platform) => {
    const row = document.createElement('label');
    row.className = 'profile-settings__social-row';
    row.dataset.profileSettingsSocialPlatform = platform.id || '';

    const icon = document.createElement('span');
    icon.className = 'profile-settings__social-icon';
    icon.setAttribute('aria-hidden', 'true');

    const iconGlyph = document.createElement('span');
    iconGlyph.className = 'profile-settings__social-icon-glyph';
    iconGlyph.style.setProperty('--profile-settings-social-icon-source', `url("${platform.icon || ''}")`);
    icon.appendChild(iconGlyph);

    const copy = document.createElement('span');
    copy.className = 'profile-settings__social-copy';

    const label = document.createElement('span');
    label.className = 'profile-settings__social-label';
    label.textContent = platform.label || platform.id || '';

    const field = document.createElement('input');
    field.className = 'profile-settings__social-input';
    field.type = 'text';
    field.autocomplete = 'off';
    field.dataset.profileSettingsSocialInput = platform.id || '';
    field.placeholder = platform.placeholder || '';
    field.value = existingByPlatform.get(platform.id)?.value || '';
    field.setAttribute('aria-label', `${platform.label || platform.id || 'Social'} profile`);

    copy.append(label, field);
    row.append(icon, copy);
    return row;
  }));
}

async function openProfileSettingsSocialOverlay(root) {
  const overlay = getProfileSettingsSocialOverlay(root);
  if (!(overlay instanceof HTMLElement)) return;
  const platforms = await loadProfileSettingsSocialLinksConfig();
  const heading = overlay.querySelector('[data-profile-settings-social-current]');
  const input = getProfileSettingsSocialInput(root);
  const links = parseProfileSettingsSocialLinks(input?.value || '');
  const count = links.length;
  if (heading instanceof HTMLElement) {
    heading.textContent = count > 0 ? `${count} public social profile${count !== 1 ? 's' : ''}` : 'Add public social profiles';
  }
  renderProfileSettingsSocialRows(root, platforms);
  document.body.classList.add('profile-settings-social-overlay-open');
  overlay.hidden = false;
}

function closeProfileSettingsSocialOverlay(root) {
  const overlay = getProfileSettingsSocialOverlay(root);
  if (overlay instanceof HTMLElement) {
    document.body.classList.remove('profile-settings-social-overlay-open');
    overlay.hidden = true;
  }
}

async function applyProfileSettingsSocialLinks(root) {
  const platforms = await loadProfileSettingsSocialLinksConfig();
  const platformsById = new Map(platforms.map((platform) => [platform.id, platform]));
  const links = Array.from(root.querySelectorAll('[data-profile-settings-social-input]'))
    .map((field) => {
      if (!(field instanceof HTMLInputElement)) return null;
      const platformId = normalizeString(field.dataset.profileSettingsSocialInput || '');
      const platform = platformsById.get(platformId) || { id: platformId };
      const value = normalizeString(field.value || '');
      if (!platformId || !value) return null;
      return {
        platform: platformId,
        value,
        url: buildProfileSettingsSocialUrl(platform, value)
      };
    })
    .filter(Boolean);

  setProfileSettingsSocialLinksState(root, links);
  closeProfileSettingsSocialOverlay(root);

  const form = root.querySelector('[data-profile-save-form]');
  if (form instanceof HTMLFormElement) {
    form.requestSubmit();
  }
}



function getProfileSettingsCoordinates(position) {
  const latitude = Number(position?.coords?.latitude);
  const longitude = Number(position?.coords?.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return {
    latitude,
    longitude
  };
}

function buildProfileSettingsLocationLabel(address = {}) {
  const city = normalizeString(address.city || address.town || address.village || address.municipality || address.county || '');
  const region = normalizeString(address.state || address.region || '');
  const country = normalizeString(address.country || '');
  return [city, region, country].filter(Boolean).join(', ');
}

async function resolveProfileSettingsLocationValue(position) {
  const coordinates = getProfileSettingsCoordinates(position);
  if (!coordinates) return '';

  const fallback = `${coordinates.latitude.toFixed(6)}, ${coordinates.longitude.toFixed(6)}`;

  try {
    const params = new URLSearchParams({
      format: 'jsonv2',
      lat: String(coordinates.latitude),
      lon: String(coordinates.longitude),
      zoom: '10',
      addressdetails: '1'
    });
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${params.toString()}`, {
      headers: {
        Accept: 'application/json'
      }
    });

    if (!response.ok) return fallback;

    const payload = await response.json();
    return buildProfileSettingsLocationLabel(payload?.address || {}) || normalizeString(payload?.display_name || '') || fallback;
  } catch (_) {
    return fallback;
  }
}

function setProfileSettingsLocationState(root, value = '', state = 'idle') {
  const input = root.querySelector('[data-profile-settings-location]');
  const action = root.querySelector('[data-profile-settings-location-action]');
  const label = root.querySelector('[data-profile-settings-location-label]');
  const normalizedValue = normalizeString(value);

  if (input instanceof HTMLInputElement) {
    input.value = normalizedValue;
  }

  if (action instanceof HTMLElement) {
    action.dataset.profileSettingsLocationReady = normalizedValue ? 'true' : 'false';
    action.dataset.profileSettingsLocationState = state;
  }

  if (label instanceof HTMLElement) {
    if (state === 'pending') {
      label.textContent = 'Detecting current location';
      return;
    }
    if (state === 'error') {
      label.textContent = 'Location permission unavailable';
      return;
    }
    label.textContent = normalizedValue || 'Use current location';
  }
}

function requestProfileSettingsLocation(root) {
  if (!('geolocation' in navigator)) {
    setProfileSettingsLocationState(root, '', 'error');
    return;
  }

  setProfileSettingsLocationState(root, '', 'pending');
  navigator.geolocation.getCurrentPosition(
    (position) => {
      void resolveProfileSettingsLocationValue(position).then((value) => {
        setProfileSettingsLocationState(root, value, value ? 'ready' : 'error');
      });
    },
    () => {
      setProfileSettingsLocationState(root, '', 'error');
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 300000
    }
  );
}

function getProfileSettingsInfoPopoverForButton(button) {
  const fieldInfo = button?.closest?.('.profile-settings__field-info');
  const popover = fieldInfo?.querySelector?.('[data-profile-settings-info-popover]');
  return popover instanceof HTMLElement ? popover : null;
}

function positionProfileSettingsInfoPopover(button, popover) {
  if (!(button instanceof HTMLElement) || !(popover instanceof HTMLElement)) return;

  popover.hidden = false;
  const viewportGap = 16;
  const buttonRect = button.getBoundingClientRect();
  const popoverRect = popover.getBoundingClientRect();
  const preferredLeft = buttonRect.left;
  const maxLeft = Math.max(viewportGap, window.innerWidth - popoverRect.width - viewportGap);
  const left = Math.min(Math.max(viewportGap, preferredLeft), maxLeft);
  const preferredTop = buttonRect.bottom + 8;
  const maxTop = Math.max(viewportGap, window.innerHeight - popoverRect.height - viewportGap);
  const top = Math.min(Math.max(viewportGap, preferredTop), maxTop);

  popover.style.setProperty('--profile-settings-info-popover-left', `${Math.round(left)}px`);
  popover.style.setProperty('--profile-settings-info-popover-top', `${Math.round(top)}px`);
}

function closeProfileSettingsInfoPopovers(exceptButton = null) {
  document.querySelectorAll('[data-profile-settings-info-toggle][aria-expanded="true"]').forEach((expandedButton) => {
    if (exceptButton instanceof HTMLElement && expandedButton === exceptButton) return;
    expandedButton.setAttribute('aria-expanded', 'false');
    const expandedPopover = getProfileSettingsInfoPopoverForButton(expandedButton);
    if (expandedPopover instanceof HTMLElement) {
      expandedPopover.hidden = true;
    }
  });
}

function setProfileSettingsIdentityRequestStatus(root, fieldName = '', message = '', state = 'idle') {
  const normalizedFieldName = normalizeString(fieldName);
  const status = root.querySelector(`[data-profile-settings-identity-request-status="${normalizedFieldName}"]`);
  if (!(status instanceof HTMLElement)) return;
  status.textContent = message;
  status.dataset.profileSettingsIdentityRequestState = state;
}

function getProfileSettingsProtectedFieldCurrentValue(root, fieldName = '') {
  const normalizedFieldName = normalizeString(fieldName);
  if (normalizedFieldName === 'username') {
    return root.querySelector('[name="username"]')?.value || '';
  }
  if (normalizedFieldName === 'date_of_birth') {
    return root.querySelector('[name="date_of_birth"]')?.value || '';
  }
  return '';
}

function isProfileSettingsChangeRequestBackendMissing(error) {
  const code = normalizeString(error?.code || '').toUpperCase();
  const message = normalizeString(error?.message || '').toLowerCase();
  return code === '42P01' || message.includes('does not exist');
}

async function requestProfileSettingsIdentityChange(root, fieldName = '') {
  const normalizedFieldName = normalizeString(fieldName);
  if (!normalizedFieldName) return;

  setProfileSettingsIdentityRequestStatus(root, normalizedFieldName, 'Checking request window', 'pending');

  const supabase = getSupabaseClient();
  if (!supabase) {
    setProfileSettingsIdentityRequestStatus(root, normalizedFieldName, 'Identity request storage is not configured', 'error');
    return;
  }

  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;
    const user = sessionData?.session?.user || null;
    const profileState = getProfileRuntimeState();
    const profileId = normalizeString(profileState.profile?.id || '');
    const authUserId = normalizeString(user?.id || user?.uid || '');

    if (!authUserId) {
      setProfileSettingsIdentityRequestStatus(root, normalizedFieldName, 'Sign in before requesting a protected-field change', 'error');
      return;
    }

    const cooldownStart = new Date(Date.now() - (PROFILE_IDENTITY_CHANGE_REQUEST_COOLDOWN_HOURS * 60 * 60 * 1000)).toISOString();
    const { data: recentRequests, error: lookupError } = await supabase
      .from(PROFILE_IDENTITY_CHANGE_REQUESTS_TABLE)
      .select('id, created_at, request_state')
      .eq('owner_auth_user_id', authUserId)
      .eq('field_name', normalizedFieldName)
      .gte('created_at', cooldownStart)
      .order('created_at', { ascending: false })
      .limit(1);

    if (lookupError) throw lookupError;

    if (Array.isArray(recentRequests) && recentRequests.length > 0) {
      setProfileSettingsIdentityRequestStatus(
        root,
        normalizedFieldName,
        `A request is already in review. New requests open after ${PROFILE_IDENTITY_CHANGE_REQUEST_COOLDOWN_HOURS} hours.`,
        'locked'
      );
      return;
    }

    const payload = {
      owner_auth_user_id: authUserId,
      profile_id: profileId || null,
      field_name: normalizedFieldName,
      current_value: normalizeString(getProfileSettingsProtectedFieldCurrentValue(root, normalizedFieldName)),
      requested_value: null,
      request_state: 'submitted',
      request_note: 'Requested from Edit Profile protected identity field.'
    };

    const { error: insertError } = await supabase
      .from(PROFILE_IDENTITY_CHANGE_REQUESTS_TABLE)
      .insert(payload);

    if (insertError) throw insertError;

    setProfileSettingsIdentityRequestStatus(root, normalizedFieldName, 'Request submitted for review', 'success');
    void recordProfileChangelogEvent({
      area: 'identity',
      action: `${normalizedFieldName}_change_requested`,
      title: normalizedFieldName === 'username' ? 'Username change requested' : 'Birth date change requested',
      detail: 'A protected identity field change was requested',
      profile_id: profileId,
      metadata: {
        field_name: normalizedFieldName
      }
    });
  } catch (error) {
    if (isProfileSettingsChangeRequestBackendMissing(error)) {
      setProfileSettingsIdentityRequestStatus(root, normalizedFieldName, 'Identity request storage is not configured', 'error');
      return;
    }
    console.error('[profile-settings] Identity change request failed.', error);
    setProfileSettingsIdentityRequestStatus(root, normalizedFieldName, 'Request could not be submitted right now', 'error');
  }
}

function getProfileSettingsToggle(root, name) {
  return root.querySelector(`[data-profile-settings-toggle="${name}"]`);
}

function setProfileSettingsToggleValue(root, name, checked) {
  const input = root.querySelector(`[data-profile-settings-toggle-input="${name}"]`);
  const toggle = getProfileSettingsToggle(root, name);
  const nextChecked = checked === true;

  if (input instanceof HTMLInputElement) {
    input.value = nextChecked ? 'on' : '';
  }

  if (toggle instanceof HTMLElement) {
    toggle.setAttribute('aria-checked', nextChecked ? 'true' : 'false');
    toggle.setAttribute('data-toggle-checked', nextChecked ? 'true' : 'false');
    toggle.dataset.toggleState = nextChecked ? 'on' : 'off';
    toggle.setAttribute('data-cookie-consent-enabled', nextChecked ? 'true' : 'false');

    const track = toggle.querySelector('.na-toggle__track, [data-na-toggle-track]');
    const thumb = toggle.querySelector('.na-toggle__thumb, [data-na-toggle-thumb]');
    if (track instanceof HTMLElement) {
      track.setAttribute('data-toggle-state', nextChecked ? 'on' : 'off');
    }
    if (thumb instanceof HTMLElement) {
      thumb.setAttribute('data-toggle-state', nextChecked ? 'on' : 'off');
    }
  }
}

function syncProfileSettingsToggleInput(toggle) {
  if (!(toggle instanceof HTMLElement)) return;
  const root = toggle.closest('[data-profile-settings-panel]');
  if (!(root instanceof HTMLElement)) return;
  const name = toggle.getAttribute('data-profile-settings-toggle') || '';
  if (!name) return;
  setProfileSettingsToggleValue(root, name, toggle.getAttribute('aria-checked') === 'true');
}

function setControlDisabled(control, disabled) {
  if (!(control instanceof HTMLElement)) return;

  if (
    control instanceof HTMLInputElement
    || control instanceof HTMLButtonElement
    || control instanceof HTMLSelectElement
    || control instanceof HTMLTextAreaElement
  ) {
    control.disabled = disabled;
  }

  control.setAttribute('aria-disabled', disabled ? 'true' : 'false');
}

function setProfileSettingsToggleDisabled(root, name, disabled) {
  const input = root.querySelector(`[data-profile-settings-toggle-input="${name}"]`);
  const toggle = getProfileSettingsToggle(root, name);
  setControlDisabled(input, disabled);
  setControlDisabled(toggle, disabled);
}

function scheduleStatusMessageAutoDismiss(node) {
  if (!(node instanceof HTMLElement)) return;
  const autoDismissDuration = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--status-message-auto-dismiss-duration'), 10) || 3000;

  window.setTimeout(() => {
    node.dataset.statusMessageActive = '';
  }, autoDismissDuration);
}

function applySharedStatusMessage(node, message = '', state = 'idle') {
  if (!(node instanceof HTMLElement)) return;

  node.setAttribute('data-status-message', '');
  node.textContent = message || '';

  if (message && state !== 'idle') {
    node.dataset.statusMessageActive = 'true';
    scheduleStatusMessageAutoDismiss(node);
  } else {
    node.dataset.statusMessageActive = '';
  }
}

function renderStatus(root, scope, saveState) {
  const state = saveState?.[scope] || { status: 'idle', message: '' };
  root.querySelectorAll(`[data-profile-save-status="${scope}"]`).forEach((node) => {
    if (!(node instanceof HTMLElement)) return;
    node.dataset.profileSaveState = state.status || 'idle';
    applySharedStatusMessage(node, state.message || '', state.status || 'idle');
  });
}

function renderSaveStatuses(saveState = getPrivateProfileSaveState()) {
  getSettingsRoots().forEach((root) => {
    renderStatus(root, 'identity', saveState);
    renderStatus(root, 'privacy', saveState);
  });
}

function isPasswordRecoveryActive() {
  try {
    return window.sessionStorage?.getItem(PASSWORD_RECOVERY_STORAGE_KEY) === 'true';
  } catch (_) {
    return false;
  }
}

function clearPasswordRecoveryState() {
  try {
    window.sessionStorage?.removeItem(PASSWORD_RECOVERY_STORAGE_KEY);
  } catch (_) {}
}

function setPasswordStatus(root, message, state = 'idle') {
  const node = root.querySelector('[data-profile-password-status]');
  if (!(node instanceof HTMLElement)) return;
  node.dataset.profilePasswordState = state;
  applySharedStatusMessage(node, message || '', state);
}

function setVerificationStatus(root, message, state = 'idle') {
  const node = root.querySelector('[data-profile-verification-status]');
  if (!(node instanceof HTMLElement)) return;
  const messageNode = root.querySelector('[data-profile-verification-message]');
  if (messageNode instanceof HTMLElement) {
    messageNode.textContent = message || '';
  }
  if (state !== 'idle' && state !== 'ready') {
    node.hidden = false;
  } else {
    node.hidden = true;
  }
  node.dataset.profileVerificationState = state;
}

function renderPaneState(root, navigationState) {
  const activeSettingsPane = navigationState.settingsPane === 'route'
    ? 'identity'
    : navigationState.settingsPane;

  root.querySelectorAll('[data-profile-settings-pane-target]').forEach((button) => {
    const pane = button.getAttribute('data-profile-settings-pane-target') || '';
    const active = pane === activeSettingsPane;
    button.dataset.profileSettingsActive = active ? 'true' : 'false';
    button.setAttribute('aria-selected', active ? 'true' : 'false');
    button.setAttribute('aria-current', active ? 'page' : 'false');
  });

  root.querySelectorAll('[data-profile-settings-pane]').forEach((pane) => {
    const paneKey = pane.getAttribute('data-profile-settings-pane') || '';
    pane.hidden = paneKey !== activeSettingsPane;
  });
}

/* =============================================================================
   03) SETTINGS RENDER
   ============================================================================= */

function renderSettings(state = getProfileRuntimeState(), navigationState = getProfileNavigationState(), saveState = getPrivateProfileSaveState()) {
  getSettingsRoots().forEach((root) => {
    initializeSharedSettingsSections(root);
    const authenticated = state.viewerState === 'authenticated';
    const usernameLocked = Boolean(state.username.normalized);

    renderPaneState(root, navigationState);
    populateProfileSettingsDateOptions(root);

    setValue(root, 'first_name', state.firstName);
    setValue(root, 'last_name', state.lastName);
    setValue(root, 'preferred_name', state.profile?.preferred_name || '');
    setValue(root, 'display_name', state.displayName);
    setValue(root, 'public_tagline', state.profile?.public_tagline || '');
    setValue(root, 'date_of_birth', state.birthDate || state.profile?.date_of_birth || '');
    setValue(root, 'gender', state.gender);
    setProfileSettingsCountryRegionState(root, state.profile?.locale_country_label || '');
    setProfileSettingsTimezoneState(root, state.profile?.timezone || '');
    loadProfileSettingsLanguagesConfig();
    loadProfileSettingsIndustriesConfig();
    setProfileSettingsLanguageState(root, state.profile?.preferred_language || '');
    setProfileSettingsAdditionalLanguagesState(root, formatProfileSettingsListValue(state.profile?.locale_languages) || '');
    setValue(root, 'public_summary', state.bio || state.profile?.public_summary || state.profile?.public_bio || '');

    setValue(root, 'username', state.username.raw || state.username.normalized);
    setValue(root, 'public_identity_label', state.profile?.public_identity_label || '');
    setValue(root, 'organization_name', state.profile?.organization_name || '');
    setValue(root, 'professional_field', state.profile?.professional_field || '');
    setValue(root, 'expertise_areas', formatProfileSettingsListValue(state.profile?.expertise_areas));
    setValue(root, 'current_focus', state.profile?.current_focus || '');
    setValue(root, 'credentials_education', state.profile?.credentials_education || '');
    setValue(root, 'portfolio_links', formatProfileSettingsListValue(state.profile?.portfolio_links));
    setProfileSettingsIndustryState(root, state.profile?.industry_sector || '');
    setProfileSettingsLocationState(root, state.profile?.public_location || state.profile?.location || '', 'idle');
    setValue(root, 'website_url', state.profile?.website_url || state.profile?.public_primary_link || '');
    setProfileSettingsSocialLinksState(root, state.profile?.social_links);
    setValue(root, 'public_profile_enabled', state.visibility.publicEnabled);
    setValue(root, 'public_profile_discoverable', state.visibility.discoverable);
    setValue(root, 'profile_search_visible', state.profile?.profile_search_visible !== false);
    setValue(root, 'profile_models_visible', state.profile?.profile_models_visible !== false);
    setValue(root, 'profile_followers_visible', state.profile?.profile_followers_visible !== false);
    setValue(root, 'profile_posts_visible', state.profile?.profile_posts_visible !== false);
    setValue(root, 'profile_thoughts_visible', state.profile?.profile_thoughts_visible !== false);

    setText(
      root,
      '[data-profile-settings-username-note]',
      usernameLocked
        ? 'This username is already reserved. Canonical policy currently locks handle changes after reservation.'
        : 'Choose a canonical username before enabling the public route.'
    );

    root.querySelectorAll('input, select, textarea, button[type="submit"], [data-profile-settings-toggle]').forEach((control) => {
      setControlDisabled(control, !authenticated);
    });

    const usernameField = root.querySelector('[name="username"]');
    if (usernameField) {
      setControlDisabled(usernameField, !authenticated || usernameLocked);
    }

    ['public_profile_enabled', 'public_profile_discoverable'].forEach((name) => {
      setProfileSettingsToggleDisabled(root, name, !authenticated || !state.username.normalized);
    });

    const currentPasswordField = root.querySelector('[name="current_password"]');
    if (currentPasswordField instanceof HTMLInputElement) {
      currentPasswordField.required = !isPasswordRecoveryActive();
      currentPasswordField.placeholder = isPasswordRecoveryActive()
        ? 'Not required for reset link'
        : '';
    }

    renderStatus(root, 'identity', saveState);
    renderStatus(root, 'privacy', saveState);
    setSelectLabel(root, 'gender', 'Optional');
    syncProfileSettingsDateLabels(root);

    if (navigationState.settingsPane === 'verification') {
      void renderVerificationState(root, state);
    }
  });
}

async function handlePasswordChangeSubmit(form) {
  const root = form.closest('[data-profile-settings-panel]');
  if (!(root instanceof HTMLElement)) return;

  const formData = new FormData(form);
  const currentPassword = String(formData.get('current_password') || '');
  const newPassword = String(formData.get('new_password') || '');
  const confirmPassword = String(formData.get('new_password_confirm') || '');
  const recoveryActive = isPasswordRecoveryActive();

  setPasswordStatus(root, '', 'idle');

  if (!currentPassword && !recoveryActive) {
    setPasswordStatus(root, 'Enter your current password', 'error');
    return;
  }

  if (!newPassword) {
    setPasswordStatus(root, 'Enter a new password', 'error');
    return;
  }

  if (newPassword !== confirmPassword) {
    setPasswordStatus(root, 'Passwords do not match', 'error');
    return;
  }

  const policy = await loadAccountPasswordPolicy();
  const evaluation = evaluateAccountPassword(newPassword, policy);
  if (!evaluation.ok) {
    setPasswordStatus(root, evaluation.message, 'error');
    return;
  }


  try {
    const supabase = getSupabaseClient();
    if (!supabase?.auth) {
      throw new Error('SUPABASE_CLIENT_UNAVAILABLE');
    }

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;

    const user = sessionData?.session?.user || null;
    const email = normalizeString(user?.email || user?.user_metadata?.email || '');
    if (!user?.id || !email) {
      throw new Error('AUTH_REQUIRED');
    }

    if (!recoveryActive) {
      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword
      });

      if (reauthError) {
        throw reauthError;
      }
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (updateError) {
      throw updateError;
    }

    clearPasswordRecoveryState();
    form.reset();
    setPasswordStatus(root, 'Password updated', 'success');
    void recordProfileChangelogEvent({
      area: 'security',
      action: 'password_changed',
      title: 'Password changed',
      detail: 'The account password was updated from profile settings'
    });
  } catch (error) {
    const message = normalizeString(error?.message || '').toLowerCase().includes('invalid login')
      ? 'Current password is not correct'
      : 'Password could not be updated';
    setPasswordStatus(root, message, 'error');
    console.error('[profile-settings] Password update failed.', error);
  }
}

async function renderVerificationState(root, state = getProfileRuntimeState()) {
  const submit = root.querySelector('[data-profile-verification-submit]');
  if (!submit) return;

  setControlDisabled(submit, state.viewerState !== 'authenticated' || state.verification?.verified === true);

  try {
    const verificationState = await getProfileVerificationState(state.profile);
    const latestStatus = verificationState.latestRequest?.request_status || '';
    const message = state.verification?.verified === true
      ? 'This profile is verified'
      : latestStatus
        ? `Latest request status: ${latestStatus}`
        : verificationState.tableAvailable
          ? 'No verification request has been submitted yet'
          : 'Verification request storage requires the Supabase profile_verification_requests table';

    setVerificationStatus(root, message, verificationState.tableAvailable ? 'ready' : 'error');
  } catch (error) {
    console.error('[profile-settings] Verification state failed.', error);
    setVerificationStatus(root, 'Verification state could not be loaded', 'error');
  }
}

/* =============================================================================
   04) SETTINGS INIT
   ============================================================================= */

function initProfileSettings() {
  const render = () => renderSettings();

  subscribeProfileRuntime(render);
  subscribeProfileNavigation(render);
  subscribePrivateProfileSaveState(renderSaveStatuses);

  document.addEventListener('submit', async (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || !form.matches('[data-profile-verification-form]')) return;

    event.preventDefault();
    const root = form.closest('[data-profile-settings-panel]');
    if (!(root instanceof HTMLElement)) return;

    const formData = new FormData(form);

    try {
      await requestProfileVerification({
        request_note: formData.get('request_note') || ''
      });
      form.reset();
      setVerificationStatus(root, 'Verification request submitted for review', 'success');
      void recordProfileChangelogEvent({
        area: 'verification',
        action: 'verification_requested',
        title: 'Verification requested',
        detail: 'A profile verification request was submitted'
      });
    } catch (error) {
      const code = String(error?.code || error?.message || '').trim();
      const message = code === 'PROFILE_VERIFICATION_BACKEND_UNAVAILABLE'
        ? 'Verification storage is not configured'
        : code === 'PROFILE_REQUIRED'
          ? 'Create and save your profile before requesting verification'
          : 'Verification request could not be submitted';
      setVerificationStatus(root, message, 'error');
    }
  });

  document.addEventListener('submit', async (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || !form.matches('[data-profile-password-form]')) return;

    event.preventDefault();
    await handlePasswordChangeSubmit(form);
  });

  document.addEventListener('neuroartan:toggle-changed', (event) => {
    const toggle = event?.detail?.element;
    if (!(toggle instanceof HTMLElement) || !toggle.matches('[data-profile-settings-toggle]')) return;
    syncProfileSettingsToggleInput(toggle);
  });

  document.addEventListener('neuroartan:locale-state-changed', syncProfileSettingsCountryRegionFromLocaleEvent);
  document.addEventListener('neuroartan:country-region-changed', syncProfileSettingsCountryRegionFromLocaleEvent);
  document.addEventListener('neuroartan:country-selected', syncProfileSettingsCountryRegionFromLocaleEvent);

  document.addEventListener('change', (event) => {
    const control = event.target;
    if (!(control instanceof HTMLSelectElement)) return;
    const root = control.closest('[data-profile-settings-panel]');
    if (!(root instanceof HTMLElement)) return;
    if (control.matches('[data-profile-settings-date-control]')) {
      syncProfileSettingsDateValue(root);
    }
    if (control.name) {
      setSelectLabel(root, control.name, control.options?.[0]?.textContent || '');
    }
  });

  document.addEventListener('input', (event) => {
    const search = event.target;
    if (!(search instanceof HTMLInputElement) || !search.matches('[data-profile-settings-timezone-search]')) return;
    const root = getProfileSettingsTimezoneRootFromEventTarget(search);
    if (root instanceof HTMLElement) {
      renderProfileSettingsTimezoneOptions(root, search.value || '');
    }
  });

  document.addEventListener('input', async (event) => {
    const search = event.target;
    if (!(search instanceof HTMLInputElement) || !search.matches('[data-profile-settings-language-search]')) return;
    const root = getProfileSettingsLanguageRootFromEventTarget(search);
    if (root instanceof HTMLElement) {
      await renderProfileSettingsLanguageOptions(root, search.value || '');
    }
  });

  document.addEventListener('input', async (event) => {
    const search = event.target;
    if (!(search instanceof HTMLInputElement) || !search.matches('[data-profile-settings-additional-languages-search]')) return;
    const root = getProfileSettingsAdditionalLanguagesRootFromEventTarget(search);
    if (root instanceof HTMLElement) {
      await renderProfileSettingsAdditionalLanguagesOptions(root, search.value || '');
    }
  });

  document.addEventListener('input', async (event) => {
    const search = event.target;
    if (!(search instanceof HTMLInputElement) || !search.matches('[data-profile-settings-industry-search]')) return;
    const root = getProfileSettingsIndustryRootFromEventTarget(search);
    if (root instanceof HTMLElement) {
      await renderProfileSettingsIndustryOptions(root, search.value || '');
    }
  });

  document.addEventListener('click', async (event) => {
    const closeButton = event.target.closest('[data-profile-settings-close]');
    if (closeButton instanceof HTMLElement) {
      event.preventDefault();
      document.dispatchEvent(new CustomEvent('profile:navigate-request', {
        detail: { section: 'posts' }
      }));
      return;
    }

    const locationButton = event.target.closest('[data-profile-settings-location-action]');
    if (locationButton instanceof HTMLElement) {
      event.preventDefault();
      const root = locationButton.closest('[data-profile-settings-panel]');
      if (root instanceof HTMLElement) {
        requestProfileSettingsLocation(root);
      }
      return;
    }

    const timezoneButton = event.target.closest('[data-profile-settings-timezone-open]');
    if (timezoneButton instanceof HTMLElement) {
      event.preventDefault();
      const root = timezoneButton.closest('[data-profile-settings-panel]');
      if (root instanceof HTMLElement) {
        openProfileSettingsTimezoneOverlay(root);
      }
      return;
    }

    const timezoneCloseButton = event.target.closest('[data-profile-settings-timezone-close]');
    if (timezoneCloseButton instanceof HTMLElement) {
      event.preventDefault();
      closeProfileSettingsTimezoneOverlay(getProfileSettingsTimezoneRootFromEventTarget(timezoneCloseButton));
      return;
    }

    const timezoneOptionButton = event.target.closest('[data-profile-settings-timezone-option]');
    if (timezoneOptionButton instanceof HTMLElement) {
      event.preventDefault();
      const root = getProfileSettingsTimezoneRootFromEventTarget(timezoneOptionButton);
      if (root instanceof HTMLElement) {
        applyProfileSettingsTimezone(root, timezoneOptionButton.dataset.profileSettingsTimezoneOption || '');
      }
      return;
    }

    const languageButton = event.target.closest('[data-profile-settings-language-open]');
    if (languageButton instanceof HTMLElement) {
      event.preventDefault();
      const root = languageButton.closest('[data-profile-settings-panel]');
      if (root instanceof HTMLElement) {
        await openProfileSettingsLanguageOverlay(root);
      }
      return;
    }

    const additionalLanguagesButton = event.target.closest('[data-profile-settings-additional-languages-open]');
    if (additionalLanguagesButton instanceof HTMLElement) {
      event.preventDefault();
      const root = additionalLanguagesButton.closest('[data-profile-settings-panel]');
      if (root instanceof HTMLElement) {
        await openProfileSettingsAdditionalLanguagesOverlay(root);
      }
      return;
    }

    const languageCloseButton = event.target.closest('[data-profile-settings-language-close]');
    if (languageCloseButton instanceof HTMLElement) {
      event.preventDefault();
      closeProfileSettingsLanguageOverlay(getProfileSettingsLanguageRootFromEventTarget(languageCloseButton));
      return;
    }

    const additionalLanguagesCloseButton = event.target.closest('[data-profile-settings-additional-languages-close]');
    if (additionalLanguagesCloseButton instanceof HTMLElement) {
      event.preventDefault();
      closeProfileSettingsAdditionalLanguagesOverlay(getProfileSettingsAdditionalLanguagesRootFromEventTarget(additionalLanguagesCloseButton));
      return;
    }

    const languageOptionButton = event.target.closest('[data-profile-settings-language-option]');
    if (languageOptionButton instanceof HTMLElement) {
      event.preventDefault();
      const root = getProfileSettingsLanguageRootFromEventTarget(languageOptionButton);
      if (root instanceof HTMLElement) {
        applyProfileSettingsLanguage(root, languageOptionButton.dataset.profileSettingsLanguageOption || '');
      }
      return;
    }

    const additionalLanguagesOption = event.target.closest('[data-profile-settings-additional-languages-option]');
    if (additionalLanguagesOption instanceof HTMLElement) {
      event.preventDefault();
      const root = getProfileSettingsAdditionalLanguagesRootFromEventTarget(additionalLanguagesOption);
      if (root instanceof HTMLElement) {
        applyProfileSettingsAdditionalLanguages(root, additionalLanguagesOption.dataset.profileSettingsAdditionalLanguagesOption || '');
      }
      return;
    }

    const industryButton = event.target.closest('[data-profile-settings-industry-open]');
    if (industryButton instanceof HTMLElement) {
      event.preventDefault();
      const root = industryButton.closest('[data-profile-settings-panel]');
      if (root instanceof HTMLElement) {
        await openProfileSettingsIndustryOverlay(root);
      }
      return;
    }

    const industryCloseButton = event.target.closest('[data-profile-settings-industry-close]');
    if (industryCloseButton instanceof HTMLElement) {
      event.preventDefault();
      closeProfileSettingsIndustryOverlay(getProfileSettingsIndustryRootFromEventTarget(industryCloseButton));
      return;
    }

    const industryOptionButton = event.target.closest('[data-profile-settings-industry-option]');
    if (industryOptionButton instanceof HTMLElement) {
      event.preventDefault();
      const root = getProfileSettingsIndustryRootFromEventTarget(industryOptionButton);
      if (root instanceof HTMLElement) {
        applyProfileSettingsIndustry(root, industryOptionButton.dataset.profileSettingsIndustryOption || '');
      }
      return;
    }

    const countryRegionButton = event.target.closest('[data-profile-settings-country-region-open]');
    if (countryRegionButton instanceof HTMLElement) {
      event.preventDefault();
      const root = countryRegionButton.closest('[data-profile-settings-panel]');
      if (root instanceof HTMLElement) {
        openProfileSettingsCountryRegionOverlay(root);
      }
      return;
    }

    const socialOpenButton = event.target.closest('[data-profile-settings-social-links-open]');
    if (socialOpenButton instanceof HTMLElement) {
      event.preventDefault();
      const root = socialOpenButton.closest('[data-profile-settings-panel]');
      if (root instanceof HTMLElement) {
        void openProfileSettingsSocialOverlay(root);
      }
      return;
    }

    const socialCloseButton = event.target.closest('.profile-settings__social-close[data-profile-settings-social-close]');
    if (socialCloseButton instanceof HTMLElement) {
      event.preventDefault();
      const root = socialCloseButton.closest('[data-profile-settings-panel]');
      if (root instanceof HTMLElement) {
        closeProfileSettingsSocialOverlay(root);
      }
      return;
    }

    const socialApplyButton = event.target.closest('[data-profile-settings-social-apply]');
    if (socialApplyButton instanceof HTMLElement) {
      event.preventDefault();
      const root = socialApplyButton.closest('[data-profile-settings-panel]');
      if (root instanceof HTMLElement) {
        void applyProfileSettingsSocialLinks(root);
      }
      return;
    }


    const birthDateChangeRequestButton = event.target.closest('[data-profile-settings-date-of-birth-change-request]');
    if (birthDateChangeRequestButton instanceof HTMLElement) {
      event.preventDefault();
      const root = birthDateChangeRequestButton.closest('[data-profile-settings-panel]');
      if (!(root instanceof HTMLElement)) return;
      const infoButton = root.querySelector('[data-profile-settings-info-toggle][aria-label="Date of birth information"]');
      const popover = infoButton instanceof HTMLElement ? getProfileSettingsInfoPopoverForButton(infoButton) : null;
    if (infoButton instanceof HTMLElement && popover instanceof HTMLElement) {
      closeProfileSettingsInfoPopovers(infoButton);
      infoButton.setAttribute('aria-expanded', 'true');
      positionProfileSettingsInfoPopover(infoButton, popover);
    }
      return;
    }

    const identityChangeRequestButton = event.target.closest('[data-profile-settings-identity-change-request]');
    if (identityChangeRequestButton instanceof HTMLElement) {
      event.preventDefault();
      const root = identityChangeRequestButton.closest('[data-profile-settings-panel]');
      if (root instanceof HTMLElement) {
        await requestProfileSettingsIdentityChange(root, identityChangeRequestButton.dataset.profileSettingsIdentityChangeRequest || '');
      }
      return;
    }

    const paneButton = event.target.closest('[data-profile-settings-pane-target]');
    if (paneButton instanceof HTMLElement) {
      event.preventDefault();
      document.dispatchEvent(new CustomEvent('profile:navigate-request', {
        detail: {
          section: 'settings',
          settingsPane: paneButton.getAttribute('data-profile-settings-pane-target') || 'identity'
        }
      }));
      return;
    }

    const button = event.target.closest('[data-profile-settings-info-toggle]');
    if (!(button instanceof HTMLElement)) return;
    const root = button.closest('[data-profile-settings-panel]');
    if (!(root instanceof HTMLElement)) return;
    const popover = getProfileSettingsInfoPopoverForButton(button);
    if (!(popover instanceof HTMLElement)) return;
    const isExpanded = button.getAttribute('aria-expanded') === 'true';
    closeProfileSettingsInfoPopovers(button);
    button.setAttribute('aria-expanded', (!isExpanded).toString());
    if (isExpanded) {
      popover.hidden = true;
    } else {
      positionProfileSettingsInfoPopover(button, popover);
    }
  });

  document.addEventListener('click', (event) => {
    const target = event.target;
    const button = target.closest('[data-profile-settings-info-toggle]');
    const popover = target.closest('[data-profile-settings-info-popover]');
    if (button || popover) return;
    closeProfileSettingsInfoPopovers();
  });

  document.addEventListener('click', (event) => {
    const closeButton = event.target.closest('[data-profile-verification-overlay-close]');
    if (!(closeButton instanceof HTMLElement)) return;
    const root = closeButton.closest('[data-profile-settings-panel]');
    if (!(root instanceof HTMLElement)) return;
    const overlay = root.querySelector('[data-profile-verification-status]');
    if (overlay instanceof HTMLElement) {
      overlay.hidden = true;
    }
  });

  document.addEventListener('fragment:mounted', (event) => {
    if (event?.detail?.name !== 'profile-private-settings-panel') return;
    render();
  });

  render();
}

initProfileSettings();
