import { mountSettingsCategory } from '../_shared/settings-category.js';

const STORAGE_KEY = 'neuroartan.runtime-configuration';

const PROVIDER_MODELS = {
  gemini: [
    'gemini-2.5-pro',
    'gemini-2.0-flash',
    'gemini-1.5-pro',
    'gemini-1.5-flash'
  ],
  openai: [
    'gpt-4o',
    'gpt-4-turbo',
    'gpt-4',
    'gpt-3.5-turbo'
  ],
  anthropic: [
    'claude-3.5-sonnet',
    'claude-3-opus',
    'claude-3-haiku'
  ],
  local: []
};

const CLOUD_PROVIDERS = ['gemini', 'openai', 'anthropic'];

function loadConfiguration() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {
  }
  return { provider: 'gemini', model: 'gemini-2.5-pro' };
}

function saveConfiguration(config) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
  }
}

function updateProviderLabel(provider) {
  const label = document.querySelector('[data-home-platform-provider-label]');
  const providerSelect = document.querySelector('[data-home-platform-runtime-provider]');
  if (label && providerSelect) {
    const selectedOption = providerSelect.options[providerSelect.selectedIndex];
    label.textContent = selectedOption ? selectedOption.textContent : 'Provider';
  }
}

function updateModelLabel(model) {
  const label = document.querySelector('[data-home-platform-model-label]');
  const modelSelect = document.querySelector('[data-home-platform-runtime-model]');
  if (label && modelSelect) {
    const selectedOption = modelSelect.options[modelSelect.selectedIndex];
    label.textContent = selectedOption && selectedOption.value ? selectedOption.textContent : 'Model';
  }
}

function populateModelDropdown(provider) {
  const modelSelect = document.querySelector('[data-home-platform-runtime-model]');
  if (!modelSelect) return;

  const currentValue = modelSelect.value;
  modelSelect.innerHTML = '<option value="" disabled selected>Select a model</option>';

  const models = PROVIDER_MODELS[provider] || [];
  models.forEach((model) => {
    const option = document.createElement('option');
    option.value = model;
    option.textContent = model;
    modelSelect.appendChild(option);
  });

  if (currentValue && models.includes(currentValue)) {
    modelSelect.value = currentValue;
  }

  updateModelLabel();
}

function updateFieldVisibility(root, provider) {
  const cloudFields = root.querySelector('[data-home-platform-cloud-fields]');
  const localFields = root.querySelector('[data-home-platform-local-fields]');
  const scanButton = root.querySelector('[data-home-platform-local-only]');
  const modelContainer = root.querySelector('[data-home-platform-model-container]');

  const isLocal = provider === 'local';
  const isCloud = CLOUD_PROVIDERS.includes(provider);

  if (cloudFields) {
    if (isCloud) {
      cloudFields.classList.remove('home-platform-theme__token-grid--hidden');
    } else {
      cloudFields.classList.add('home-platform-theme__token-grid--hidden');
    }
  }

  if (localFields) {
    if (isLocal) {
      localFields.classList.remove('home-platform-theme__token-grid--hidden');
    } else {
      localFields.classList.add('home-platform-theme__token-grid--hidden');
    }
  }

  if (scanButton) {
    scanButton.hidden = !isLocal;
  }

  if (modelContainer) {
    modelContainer.hidden = isLocal;
  }
}

function bindProviderChange(root) {
  const providerSelect = root.querySelector('[data-home-platform-runtime-provider]');
  if (!providerSelect || providerSelect.dataset.configProviderBound === 'true') return;

  providerSelect.dataset.configProviderBound = 'true';
  providerSelect.addEventListener('change', () => {
    const provider = providerSelect.value;
    const config = loadConfiguration();
    config.provider = provider;
    saveConfiguration(config);
    updateProviderLabel(provider);
    populateModelDropdown(provider);
    updateFieldVisibility(root, provider);
  });
}

function bindModelChange(root) {
  const modelSelect = root.querySelector('[data-home-platform-runtime-model]');
  if (!modelSelect || modelSelect.dataset.configModelBound === 'true') return;

  modelSelect.dataset.configModelBound = 'true';
  modelSelect.addEventListener('change', () => {
    const config = loadConfiguration();
    config.model = modelSelect.value;
    saveConfiguration(config);
    updateModelLabel();
  });
}

export function mountHomePlatformDestination(root, options = {}) {
  mountSettingsCategory(root, options);

  const config = loadConfiguration();

  const providerSelect = root.querySelector('[data-home-platform-runtime-provider]');
  if (providerSelect) {
    providerSelect.value = config.provider;
    updateProviderLabel(config.provider);
    populateModelDropdown(config.provider);
    updateFieldVisibility(root, config.provider);
    bindProviderChange(root);
  }

  const modelSelect = root.querySelector('[data-home-platform-runtime-model]');
  if (modelSelect) {
    modelSelect.value = config.model;
    updateModelLabel();
    bindModelChange(root);
  }
}
