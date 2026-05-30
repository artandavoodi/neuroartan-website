const LANGUAGE_OPTION_SELECTOR = '[data-settings-language-option]';

export function getLocaleApi() {
  return window.NEUROARTAN_COUNTRY_LANGUAGE || window.ARTAN_COUNTRY_LANGUAGE || null;
}

export function getLocaleState() {
  return window.NEUROARTAN_LOCALE || window.ARTAN_LOCALE || {};
}

export function getSupportedLanguages() {
  const api = getLocaleApi();
  if (api && typeof api.getSupportedLanguageConfigs === 'function') {
    return api.getSupportedLanguageConfigs();
  }

  const translation = window.NEUROARTAN_TRANSLATION || window.ARTAN_TRANSLATION || null;
  if (translation && typeof translation.getSupportedLanguages === 'function') {
    return translation.getSupportedLanguages();
  }

  return [{ code: 'en', label: 'English', nativeLabel: 'English', direction: 'ltr' }];
}

export function resolveLanguageLabel(code = 'en') {
  const normalized = String(code || 'en').trim().toLowerCase();
  const language = getSupportedLanguages().find((item) => item.code === normalized);
  return language?.nativeLabel || language?.label || normalized.toUpperCase();
}

export function createSettingsLanguageButton(language) {
  const button = document.createElement('button');
  button.className = 'ui-radio-list__item';
  button.type = 'button';
  button.role = 'radio';
  button.dataset.settingsLanguageOption = language.code;
  button.setAttribute('aria-pressed', 'false');
  button.setAttribute('aria-checked', 'false');

  const content = document.createElement('span');
  content.className = 'ui-radio-list__content';

  const label = document.createElement('span');
  label.className = 'ui-radio-list__label';
  label.textContent = language.nativeLabel || language.label || language.code.toUpperCase();

  const indicator = document.createElement('span');
  indicator.className = 'ui-radio-list__indicator';

  content.appendChild(label);
  button.append(content, indicator);
  return button;
}

export function syncSettingsLocaleValues(root = document) {
  const locale = getLocaleState();
  const activeLanguage = String(locale.language || 'en').trim().toLowerCase();
  const activeCountry = String(locale.countryLabel || 'United States').trim();

  root.querySelectorAll('[data-home-settings-language-value]').forEach((node) => {
    node.textContent = resolveLanguageLabel(activeLanguage);
  });

  root.querySelectorAll('[data-home-settings-country-value]').forEach((node) => {
    node.textContent = activeCountry;
  });

  root.querySelectorAll(LANGUAGE_OPTION_SELECTOR).forEach((button) => {
    if (!(button instanceof HTMLButtonElement)) return;
    const active = button.dataset.settingsLanguageOption === activeLanguage;
    button.setAttribute('aria-pressed', active ? 'true' : 'false');
    button.setAttribute('aria-checked', active ? 'true' : 'false');
  });
}

export function renderSettingsLanguageOptions(root) {
  const list = root.querySelector('[data-settings-language-list]');
  if (!(list instanceof HTMLElement)) return;

  list.replaceChildren(...getSupportedLanguages().map(createSettingsLanguageButton));
  syncSettingsLocaleValues(root);
}

export function bindSettingsLanguagePreference(root) {
  if (root.dataset.localePreferenceBound === 'true') return;
  root.dataset.localePreferenceBound = 'true';

  renderSettingsLanguageOptions(root);

  root.addEventListener('click', async (event) => {
    const button = event.target instanceof Element
      ? event.target.closest(LANGUAGE_OPTION_SELECTOR)
      : null;
    if (!(button instanceof HTMLButtonElement)) return;

    const language = String(button.dataset.settingsLanguageOption || 'en').trim().toLowerCase();
    const locale = getLocaleState();
    const api = getLocaleApi();

    if (api && typeof api.setLocalePreference === 'function') {
      await api.setLocalePreference({
        countryCode: locale.countryCode || '',
        countryLabel: locale.countryLabel || '',
        language,
        languages: [language]
      });
    }

    syncSettingsLocaleValues(root);
  });
}

export function bindSettingsLocaleSync(root) {
  syncSettingsLocaleValues(root);

  document.addEventListener('neuroartan:locale-state-changed', () => {
    syncSettingsLocaleValues(root);
  });

  document.addEventListener('neuroartan:i18n-country-language-ready', () => {
    renderSettingsLanguageOptions(root);
    syncSettingsLocaleValues(root);
  });
}
