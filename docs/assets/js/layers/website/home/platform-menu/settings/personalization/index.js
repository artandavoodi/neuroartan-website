import { mountSettingsCategory } from '../_shared/settings-category.js';
import { registerProfileMediaEditorTarget } from '../../../../profile/private/media/profile-media-editor.js';
import { uploadProfileImage } from '../../../../system/profile/profile-image-storage.js';

function handleHomePlatformSliderInteractionStart(event) {
  const slider = event.target?.closest?.('.home-platform-theme__slider');
  if (!(slider instanceof HTMLInputElement)) return;

  const sliderWrapper = slider.closest?.('.home-platform-theme__slider-wrapper');
  if (!(sliderWrapper instanceof HTMLElement)) return;

  const sliderValue = sliderWrapper.querySelector?.('.home-platform-theme__slider-value');
  if (!(sliderValue instanceof HTMLElement)) return;

  sliderValue.dataset.sliderValueState = 'centered';
  sliderValue.dataset.sliderValueActive = 'true';
  
  document.body.style.setProperty('--viewport-dim-opacity', 'var(--viewport-dimmed-opacity)');
  document.body.style.setProperty('--viewport-dim-filter', 'var(--viewport-dimmed-filter)');
}

function handleHomePlatformSliderInteractionEnd(event) {
  const slider = event.target?.closest?.('.home-platform-theme__slider');
  if (!(slider instanceof HTMLInputElement)) return;

  const sliderWrapper = slider.closest?.('.home-platform-theme__slider-wrapper');
  if (!(sliderWrapper instanceof HTMLElement)) return;

  const sliderValue = sliderWrapper.querySelector?.('.home-platform-theme__slider-value');
  if (!(sliderValue instanceof HTMLElement)) return;

  sliderValue.dataset.sliderValueState = '';
  sliderValue.dataset.sliderValueActive = '';
  
  document.body.style.setProperty('--viewport-dim-opacity', 'var(--viewport-dim-opacity)');
  document.body.style.setProperty('--viewport-dim-filter', 'var(--viewport-dim-filter)');
}

function handleHomePlatformSliderGlobalMouseUp(event) {
  document.querySelectorAll('.home-platform-theme__slider-value[data-slider-value-state="centered"]').forEach((sliderValue) => {
    if (!(sliderValue instanceof HTMLElement)) return;
    sliderValue.dataset.sliderValueState = '';
    sliderValue.dataset.sliderValueActive = '';
  });
  
  document.body.style.setProperty('--viewport-dim-opacity', 'var(--viewport-dim-opacity)');
  document.body.style.setProperty('--viewport-dim-filter', 'var(--viewport-dim-filter)');
}

function handleHomePlatformSliderInput(event) {
  const slider = event.target?.closest?.('.home-platform-theme__slider');
  if (!(slider instanceof HTMLInputElement)) return;

  const sliderWrapper = slider.closest?.('.home-platform-theme__slider-wrapper');
  if (!(sliderWrapper instanceof HTMLElement)) return;

  const sliderValue = sliderWrapper.querySelector?.('.home-platform-theme__slider-value');
  if (!(sliderValue instanceof HTMLElement)) return;

  sliderValue.textContent = slider.value;
}

const STORAGE_KEY = 'neuroartan.personalization-settings';

const DEFAULT_SETTINGS = {
  // ICOS Assistant Identity
  assistantName: '',
  assistantDescription: '',
  assistantAvatar: '',
  assistantAvatarStoragePath: '',
  
  // Thought Patterns
  languageStyle: 'balanced',
  directnessLevel: 'nuanced',
  emotionalTone: 'neutral',
  
  // Response Style
  responseLength: 'balanced',
  explanationDepth: 'standard',
  stepByStep: false,
  
  // Memory & Continuity
  enableMemory: false,
  memoryRetention: 'session',
  continuityDepth: 'moderate',
  
  // Behavioral Learning
  workflowLearning: false,
  communicationLearning: false,
  
  // Emotional Context
  emotionalWeighting: 'balanced',
  empathyLevel: 'moderate',
  
  // Reflection Loop
  reflectionFrequency: 'never',
  reflectionDepth: 'moderate',
  
  // Digital Twin Personality - Phase 1
  senseOfHumor: 50,
  efficiencyPreference: 50,
  creativityLevel: 50,
  riskTolerance: 50
};

function normalizeOwnedAssistantAvatar(settings = {}) {
  const nextSettings = {
    ...DEFAULT_SETTINGS,
    ...settings
  };
  const assistantAvatarStoragePath = String(nextSettings.assistantAvatarStoragePath || '').trim();

  return {
    ...nextSettings,
    assistantAvatar: assistantAvatarStoragePath
      ? String(nextSettings.assistantAvatar || '').trim()
      : '',
    assistantAvatarStoragePath
  };
}

function loadSettings() {
  try {
    // Load from localStorage first (primary storage)
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      
      // Migration: map old field names to new field names
      const migrated = normalizeOwnedAssistantAvatar({
        ...DEFAULT_SETTINGS,
        ...parsed,
        // Migrate machineName -> assistantName
        assistantName: parsed.assistantName || parsed.machineName || '',
        // Migrate machineDescription -> assistantDescription
        assistantDescription: parsed.assistantDescription || parsed.machineDescription || ''
      });
      
      // Clean up old field names
      delete migrated.machineName;
      delete migrated.machineDescription;
      
      // Save migrated data back to localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      
      return migrated;
    }
  } catch (error) {
    console.error('Failed to load personalization settings:', error);
  }
  return normalizeOwnedAssistantAvatar(DEFAULT_SETTINGS);
}

async function syncFromSupabase() {
  if (!window.neuroartanSupabase) return;

  try {
    const { data: { user } } = await window.neuroartanSupabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await window.neuroartanSupabase
      .from('profiles')
      .select('assistant_name, assistant_description, assistant_avatar_url, assistant_avatar_storage_path, sense_of_humor, efficiency_preference, creativity_level, risk_tolerance')
      .eq('auth_user_id', user.id)
      .single();
    
    if (profile) {
      const currentSettings = loadSettings();
      const supabaseSettings = normalizeOwnedAssistantAvatar({
        ...currentSettings,
        assistantName: profile.assistant_name || '',
        assistantDescription: profile.assistant_description || '',
        assistantAvatar: profile.assistant_avatar_url || '',
        assistantAvatarStoragePath: profile.assistant_avatar_storage_path || '',
        senseOfHumor: profile.sense_of_humor || 50,
        efficiencyPreference: profile.efficiency_preference || 50,
        creativityLevel: profile.creativity_level || 50,
        riskTolerance: profile.risk_tolerance || 50
      });
      
      // Sync Supabase settings to localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(supabaseSettings));
      renderAssistantAvatar(supabaseSettings);
    }
  } catch (error) {
    console.error('Failed to sync from Supabase:', error);
  }
}

function saveSettings(settings, options = {}) {
  try {
    const ownedSettings = normalizeOwnedAssistantAvatar(settings);

    // Save all settings to localStorage immediately (primary storage)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ownedSettings));

    const syncPromise = syncToSupabase(ownedSettings);
    if (options.awaitRemote === true) return syncPromise;

    void syncPromise.catch((error) => {
      console.error('Failed to sync personalization settings:', error);
    });
    
    return Promise.resolve();
  } catch (error) {
    console.error('Failed to save personalization settings:', error);
    setHomePlatformStatus('Failed to save personalization settings', 'error');
    return Promise.reject(error);
  }
}

function setHomePlatformStatus(message = '', state = 'idle') {
  const statusMessage = document.querySelector('.home-platform-theme__status-message');
  if (!(statusMessage instanceof HTMLElement)) return;
  
  statusMessage.textContent = message;
  
  if (message && state !== 'idle') {
    statusMessage.dataset.statusMessageActive = 'true';
    handleHomePlatformStatusAutoDismiss();
  } else {
    statusMessage.dataset.statusMessageActive = '';
  }
}

function handleHomePlatformStatusAutoDismiss() {
  const autoDismissDuration = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--status-message-auto-dismiss-duration')) || 3000;
  
  const statusMessage = document.querySelector('.home-platform-theme__status-message');
  if (!(statusMessage instanceof HTMLElement)) return;
  
  if (!statusMessage.textContent.trim()) {
    statusMessage.dataset.statusMessageActive = '';
    return;
  }
  
  window.setTimeout(() => {
    statusMessage.dataset.statusMessageActive = '';
  }, autoDismissDuration);
}

function renderAssistantAvatar(settings = {}) {
  const avatarImage = document.querySelector('[data-home-platform-avatar-image]');
  if (!(avatarImage instanceof HTMLImageElement)) return;

  const avatarUrl = normalizeOwnedAssistantAvatar(settings).assistantAvatar;
  if (avatarUrl) {
    avatarImage.src = avatarUrl;
    avatarImage.hidden = false;
    return;
  }

  avatarImage.hidden = true;
  avatarImage.removeAttribute('src');
}

async function getAuthenticatedUser() {
  if (!window.neuroartanSupabase?.auth) return null;
  const { data, error } = await window.neuroartanSupabase.auth.getUser();
  if (error) throw error;
  return data?.user || null;
}

function registerAssistantAvatarEditor(settings) {
  registerProfileMediaEditorTarget('assistant', {
    getTitle: () => 'Edit ICOS Avatar',
    getCurrentImageUrl: () => settings.assistantAvatar || '',
    save: async ({ file }) => {
      const user = await getAuthenticatedUser();
      if (!user) throw new Error('AUTH_REQUIRED');

      const uploaded = await uploadProfileImage({
        file,
        user,
        kind:'assistant-avatar'
      });

      settings.assistantAvatar = uploaded.publicUrl;
      settings.assistantAvatarStoragePath = uploaded.storagePath;
      await saveSettings(settings, { awaitRemote:true });
      renderAssistantAvatar(settings);
    },
    reset: async () => {
      settings.assistantAvatar = '';
      settings.assistantAvatarStoragePath = '';
      await saveSettings(settings, { awaitRemote:true });
      renderAssistantAvatar(settings);
    }
  });
}

async function syncToSupabase(settings) {
  if (!window.neuroartanSupabase) return;

  try {
    const { data: { user } } = await window.neuroartanSupabase.auth.getUser();
    if (!user) return;

    const { error } = await window.neuroartanSupabase
      .from('profiles')
      .update({
        assistant_name: settings.assistantName,
        assistant_description: settings.assistantDescription,
        assistant_avatar_url: settings.assistantAvatar,
        assistant_avatar_storage_path: settings.assistantAvatarStoragePath,
        sense_of_humor: settings.senseOfHumor,
        efficiency_preference: settings.efficiencyPreference,
        creativity_level: settings.creativityLevel,
        risk_tolerance: settings.riskTolerance
      })
      .eq('auth_user_id', user.id);

    if (error) throw error;
  } catch (error) {
    console.error('Failed to sync to Supabase:', error);
    throw error;
  }
}

function initializeForm(settings) {
  // ICOS Assistant Identity fields
  const assistantNameInput = document.querySelector('[data-home-platform-field="assistant-name"]');
  const assistantDescriptionTextarea = document.querySelector('[data-home-platform-field="assistant-description"]');
  
  if (assistantNameInput) assistantNameInput.value = settings.assistantName || '';
  if (assistantDescriptionTextarea) assistantDescriptionTextarea.value = settings.assistantDescription || '';
  
  // Update character counter for description
  updateCharacterCounter(assistantDescriptionTextarea);
  
  renderAssistantAvatar(settings);
  
  // Thought Pattern fields
  const languageStyleSelect = document.querySelector('[data-home-platform-field="language-style"]');
  const directnessLevelSelect = document.querySelector('[data-home-platform-field="directness-level"]');
  const emotionalToneSelect = document.querySelector('[data-home-platform-field="emotional-tone"]');
  
  if (languageStyleSelect) languageStyleSelect.value = settings.languageStyle;
  if (directnessLevelSelect) directnessLevelSelect.value = settings.directnessLevel;
  if (emotionalToneSelect) emotionalToneSelect.value = settings.emotionalTone;
  
  // Response Style fields
  const responseLengthSelect = document.querySelector('[data-home-platform-field="response-length"]');
  const explanationDepthSelect = document.querySelector('[data-home-platform-field="explanation-depth"]');
  const stepByStepToggle = document.querySelector('[data-toggle-scope="personalization-response"]');
  
  if (responseLengthSelect) responseLengthSelect.value = settings.responseLength;
  if (explanationDepthSelect) explanationDepthSelect.value = settings.explanationDepth;
  if (stepByStepToggle) {
    stepByStepToggle.setAttribute('aria-checked', settings.stepByStep.toString());
  }
  
  // Memory & Continuity fields
  const enableMemoryToggle = document.querySelector('[data-toggle-scope="personalization-memory"]');
  const memoryRetentionSelect = document.querySelector('[data-home-platform-field="memory-retention"]');
  const continuityDepthSelect = document.querySelector('[data-home-platform-field="continuity-depth"]');
  
  if (enableMemoryToggle) {
    enableMemoryToggle.setAttribute('aria-checked', settings.enableMemory.toString());
  }
  if (memoryRetentionSelect) memoryRetentionSelect.value = settings.memoryRetention;
  if (continuityDepthSelect) continuityDepthSelect.value = settings.continuityDepth;
  
  // Behavioral Learning toggles
  const workflowLearningToggle = document.querySelector('[data-toggle-scope="personalization-behavioral"][data-toggle-key="workflowLearning"]');
  const communicationLearningToggle = document.querySelector('[data-toggle-scope="personalization-behavioral"][data-toggle-key="communicationLearning"]');
  
  if (workflowLearningToggle) {
    workflowLearningToggle.setAttribute('aria-checked', settings.workflowLearning.toString());
  }
  if (communicationLearningToggle) {
    communicationLearningToggle.setAttribute('aria-checked', settings.communicationLearning.toString());
  }
  
  // Emotional Context fields
  const emotionalWeightingSelect = document.querySelector('[data-home-platform-field="emotional-weighting"]');
  const empathyLevelSelect = document.querySelector('[data-home-platform-field="empathy-level"]');
  
  if (emotionalWeightingSelect) emotionalWeightingSelect.value = settings.emotionalWeighting;
  if (empathyLevelSelect) empathyLevelSelect.value = settings.empathyLevel;
  
  // Reflection Loop fields
  const reflectionFrequencySelect = document.querySelector('[data-home-platform-field="reflection-frequency"]');
  const reflectionDepthSelect = document.querySelector('[data-home-platform-field="reflection-depth"]');
  
  if (reflectionFrequencySelect) reflectionFrequencySelect.value = settings.reflectionFrequency;
  if (reflectionDepthSelect) reflectionDepthSelect.value = settings.reflectionDepth;
  
  // Digital Twin Personality sliders
  const senseOfHumorSlider = document.querySelector('[data-home-platform-field="sense-of-humor"]');
  const efficiencyPreferenceSlider = document.querySelector('[data-home-platform-field="efficiency-preference"]');
  const creativityLevelSlider = document.querySelector('[data-home-platform-field="creativity-level"]');
  const riskToleranceSlider = document.querySelector('[data-home-platform-field="risk-tolerance"]');
  
  if (senseOfHumorSlider) {
    senseOfHumorSlider.value = settings.senseOfHumor || 50;
    updateSliderValue('sense-of-humor', settings.senseOfHumor || 50);
  }
  if (efficiencyPreferenceSlider) {
    efficiencyPreferenceSlider.value = settings.efficiencyPreference || 50;
    updateSliderValue('efficiency-preference', settings.efficiencyPreference || 50);
  }
  if (creativityLevelSlider) {
    creativityLevelSlider.value = settings.creativityLevel || 50;
    updateSliderValue('creativity-level', settings.creativityLevel || 50);
  }
  if (riskToleranceSlider) {
    riskToleranceSlider.value = settings.riskTolerance || 50;
    updateSliderValue('risk-tolerance', settings.riskTolerance || 50);
  }
}

function updateCharacterCounter(textarea) {
  if (!textarea) return;
  
  const maxLength = parseInt(textarea.getAttribute('maxlength')) || 180;
  const currentLength = textarea.value.length;
  const counterText = document.querySelector('[data-home-platform-counter-text]');
  const counterProgress = document.querySelector('.home-platform-theme__counter-circle-progress');
  const counterContainer = document.querySelector('[data-home-platform-character-counter]');
  
  if (counterText) {
    counterText.textContent = `${currentLength}/${maxLength}`;
  }
  
  if (counterProgress) {
    const circumference = 2 * Math.PI * 16; // r=16
    const progress = (currentLength / maxLength) * circumference;
    const offset = circumference - progress;
    counterProgress.style.strokeDashoffset = offset;
    
    // Update state based on character count
    if (counterContainer) {
      if (currentLength >= maxLength) {
        counterContainer.setAttribute('data-home-platform-character-state', 'over');
      } else if (currentLength >= maxLength * 0.9) {
        counterContainer.setAttribute('data-home-platform-character-state', 'warning');
      } else {
        counterContainer.setAttribute('data-home-platform-character-state', 'normal');
      }
    }
  }
}

function updateSliderValue(sliderId, value) {
  const valueDisplay = document.querySelector(`[data-home-platform-slider-value="${sliderId}"]`);
  if (valueDisplay) {
    valueDisplay.textContent = `${value}`;
  }
}

function setupEventListeners(settings) {
  // Sync personalization config with global toggle system
  document.addEventListener('neuroartan:toggle-changed', (event) => {
    const { scope, key, checked } = event.detail;
    
    if (scope === 'personalization-response' && key === 'stepByStep') {
      settings.stepByStep = checked;
      saveSettings(settings);
    }
    
    if (scope === 'personalization-memory' && key === 'enableMemory') {
      settings.enableMemory = checked;
      saveSettings(settings);
    }
    
    if (scope === 'personalization-behavioral') {
      if (key === 'workflowLearning') {
        settings.workflowLearning = checked;
        saveSettings(settings);
      }
      if (key === 'communicationLearning') {
        settings.communicationLearning = checked;
        saveSettings(settings);
      }
    }
  });
  
  // ICOS Assistant Identity fields
  const assistantNameInput = document.querySelector('[data-home-platform-field="assistant-name"]');
  const assistantDescriptionTextarea = document.querySelector('[data-home-platform-field="assistant-description"]');
  
  if (assistantNameInput) {
    assistantNameInput.addEventListener('input', (e) => {
      settings.assistantName = e.target.value;
      saveSettings(settings);
    });
  }
  
  if (assistantDescriptionTextarea) {
    assistantDescriptionTextarea.addEventListener('input', (e) => {
      settings.assistantDescription = e.target.value;
      saveSettings(settings);
      updateCharacterCounter(assistantDescriptionTextarea);
    });
  }
  
function updateHomePlatformDropdownValue(fieldId, value) {
  const dropdownValue = document.querySelector(`[data-home-platform-dropdown-value="${fieldId}"]`);
  if (!(dropdownValue instanceof HTMLElement)) return;
  
  const select = document.querySelector(`[data-home-platform-field="${fieldId}"]`);
  if (!(select instanceof HTMLSelectElement)) return;
  
  const selectedOption = select.options[select.selectedIndex];
  dropdownValue.textContent = selectedOption?.text || value;
}

  // Thought Pattern fields
  const languageStyleSelect = document.querySelector('[data-home-platform-field="language-style"]');
  const directnessLevelSelect = document.querySelector('[data-home-platform-field="directness-level"]');
  const emotionalToneSelect = document.querySelector('[data-home-platform-field="emotional-tone"]');
  
  if (languageStyleSelect) {
    languageStyleSelect.addEventListener('change', (e) => {
      settings.languageStyle = e.target.value;
      updateHomePlatformDropdownValue('language-style', settings.languageStyle);
      saveSettings(settings);
    });
  }
  
  if (directnessLevelSelect) {
    directnessLevelSelect.addEventListener('change', (e) => {
      settings.directnessLevel = e.target.value;
      updateHomePlatformDropdownValue('directness-level', settings.directnessLevel);
      saveSettings(settings);
    });
  }
  
  if (emotionalToneSelect) {
    emotionalToneSelect.addEventListener('change', (e) => {
      settings.emotionalTone = e.target.value;
      updateHomePlatformDropdownValue('emotional-tone', settings.emotionalTone);
      saveSettings(settings);
    });
  }
  
  // Response Style fields
  const responseLengthSelect = document.querySelector('[data-home-platform-field="response-length"]');
  const explanationDepthSelect = document.querySelector('[data-home-platform-field="explanation-depth"]');
  
  if (responseLengthSelect) {
    responseLengthSelect.addEventListener('change', (e) => {
      settings.responseLength = e.target.value;
      updateHomePlatformDropdownValue('response-length', settings.responseLength);
      saveSettings(settings);
    });
  }
  
  if (explanationDepthSelect) {
    explanationDepthSelect.addEventListener('change', (e) => {
      settings.explanationDepth = e.target.value;
      updateHomePlatformDropdownValue('explanation-depth', settings.explanationDepth);
      saveSettings(settings);
    });
  }
  
  // Memory & Continuity fields
  const memoryRetentionSelect = document.querySelector('[data-home-platform-field="memory-retention"]');
  const continuityDepthSelect = document.querySelector('[data-home-platform-field="continuity-depth"]');
  
  if (memoryRetentionSelect) {
    memoryRetentionSelect.addEventListener('change', (e) => {
      settings.memoryRetention = e.target.value;
      updateHomePlatformDropdownValue('memory-retention', settings.memoryRetention);
      saveSettings(settings);
    });
  }
  
  if (continuityDepthSelect) {
    continuityDepthSelect.addEventListener('change', (e) => {
      settings.continuityDepth = e.target.value;
      updateHomePlatformDropdownValue('continuity-depth', settings.continuityDepth);
      saveSettings(settings);
    });
  }
  
  // Emotional Context fields
  const emotionalWeightingSelect = document.querySelector('[data-home-platform-field="emotional-weighting"]');
  const empathyLevelSelect = document.querySelector('[data-home-platform-field="empathy-level"]');
  
  if (emotionalWeightingSelect) {
    emotionalWeightingSelect.addEventListener('change', (e) => {
      settings.emotionalWeighting = e.target.value;
      updateHomePlatformDropdownValue('emotional-weighting', settings.emotionalWeighting);
      saveSettings(settings);
    });
  }
  
  if (empathyLevelSelect) {
    empathyLevelSelect.addEventListener('change', (e) => {
      settings.empathyLevel = e.target.value;
      updateHomePlatformDropdownValue('empathy-level', settings.empathyLevel);
      saveSettings(settings);
    });
  }
  
  // Reflection Loop fields
  const reflectionFrequencySelect = document.querySelector('[data-home-platform-field="reflection-frequency"]');
  const reflectionDepthSelect = document.querySelector('[data-home-platform-field="reflection-depth"]');
  
  if (reflectionFrequencySelect) {
    reflectionFrequencySelect.addEventListener('change', (e) => {
      settings.reflectionFrequency = e.target.value;
      updateHomePlatformDropdownValue('reflection-frequency', settings.reflectionFrequency);
      saveSettings(settings);
    });
  }
  
  if (reflectionDepthSelect) {
    reflectionDepthSelect.addEventListener('change', (e) => {
      settings.reflectionDepth = e.target.value;
      updateHomePlatformDropdownValue('reflection-depth', settings.reflectionDepth);
      saveSettings(settings);
    });
  }
  
  // Digital Twin Personality sliders
  const senseOfHumorSlider = document.querySelector('[data-home-platform-field="sense-of-humor"]');
  const efficiencyPreferenceSlider = document.querySelector('[data-home-platform-field="efficiency-preference"]');
  const creativityLevelSlider = document.querySelector('[data-home-platform-field="creativity-level"]');
  const riskToleranceSlider = document.querySelector('[data-home-platform-field="risk-tolerance"]');
  
  if (senseOfHumorSlider) {
    senseOfHumorSlider.addEventListener('input', (e) => {
      settings.senseOfHumor = parseInt(e.target.value);
      updateSliderValue('sense-of-humor', settings.senseOfHumor);
      saveSettings(settings);
    });
    senseOfHumorSlider.addEventListener('mousedown', handleHomePlatformSliderInteractionStart);
    senseOfHumorSlider.addEventListener('touchstart', handleHomePlatformSliderInteractionStart);
  }
  
  if (efficiencyPreferenceSlider) {
    efficiencyPreferenceSlider.addEventListener('input', (e) => {
      settings.efficiencyPreference = parseInt(e.target.value);
      updateSliderValue('efficiency-preference', settings.efficiencyPreference);
      saveSettings(settings);
    });
    efficiencyPreferenceSlider.addEventListener('mousedown', handleHomePlatformSliderInteractionStart);
    efficiencyPreferenceSlider.addEventListener('touchstart', handleHomePlatformSliderInteractionStart);
  }
  
  if (creativityLevelSlider) {
    creativityLevelSlider.addEventListener('input', (e) => {
      settings.creativityLevel = parseInt(e.target.value);
      updateSliderValue('creativity-level', settings.creativityLevel);
      saveSettings(settings);
    });
    creativityLevelSlider.addEventListener('mousedown', handleHomePlatformSliderInteractionStart);
    creativityLevelSlider.addEventListener('touchstart', handleHomePlatformSliderInteractionStart);
  }
  
  if (riskToleranceSlider) {
    riskToleranceSlider.addEventListener('input', (e) => {
      settings.riskTolerance = parseInt(e.target.value);
      updateSliderValue('risk-tolerance', settings.riskTolerance);
      saveSettings(settings);
    });
    riskToleranceSlider.addEventListener('mousedown', handleHomePlatformSliderInteractionStart);
    riskToleranceSlider.addEventListener('touchstart', handleHomePlatformSliderInteractionStart);
  }
  
  // Global slider interaction handlers
  document.addEventListener('mouseup', handleHomePlatformSliderInteractionEnd);
  document.addEventListener('touchend', handleHomePlatformSliderInteractionEnd);
  document.addEventListener('mouseup', handleHomePlatformSliderGlobalMouseUp);
  document.addEventListener('touchend', handleHomePlatformSliderGlobalMouseUp);
  document.addEventListener('input', handleHomePlatformSliderInput);
  
  // Voice training button (placeholder for future backend integration)
  const startVoiceTrainingButton = document.querySelector('[data-home-platform-action="start-voice-training"]');
  if (startVoiceTrainingButton) {
    startVoiceTrainingButton.addEventListener('click', () => {
      // Placeholder: Voice training requires backend runtime
      console.log('Voice training requires backend runtime');
    });
  }
  
  // Change assistant avatar button
  const changeAvatarButton = document.querySelector('[data-home-platform-action="change-avatar"]');
  if (changeAvatarButton) {
    changeAvatarButton.addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent('profile:media-editor-open-request', {
        detail:{
          source:'home-platform-personalization',
          target:'assistant',
          kind:'avatar'
        }
      }));
    });
  }
}

export function mountHomePlatformDestination(root, options = {}) {
  mountSettingsCategory(root, options);
  
  const settings = loadSettings();
  registerAssistantAvatarEditor(settings);
  initializeForm(settings);
  void syncFromSupabase();
  setupEventListeners(settings);
  
  // Sync from Supabase when ready (background operation)
  window.addEventListener('neuroartan:supabase-ready', () => {
    syncFromSupabase();
  });
}
