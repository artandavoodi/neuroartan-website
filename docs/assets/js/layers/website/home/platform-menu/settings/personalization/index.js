import { mountSettingsCategory } from '../_shared/settings-category.js';

const STORAGE_KEY = 'neuroartan.personalization-settings';

const DEFAULT_SETTINGS = {
  // ICOS Assistant Identity
  assistantName: '',
  assistantDescription: '',
  assistantAvatar: '',
  
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

async function loadSettings() {
  try {
    // Try to load from Supabase first
    if (window.neuroartanSupabase) {
      const { data: { user } } = await window.neuroartanSupabase.auth.getUser();
      if (user) {
        const { data: profile } = await window.neuroartanSupabase
          .from('profiles')
          .select('assistant_name, assistant_description, assistant_avatar_url, assistant_avatar_storage_path, sense_of_humor, efficiency_preference, creativity_level, risk_tolerance')
          .eq('auth_user_id', user.id)
          .single();
        
        if (profile) {
          const supabaseSettings = {
            ...DEFAULT_SETTINGS,
            assistantName: profile.assistant_name || '',
            assistantDescription: profile.assistant_description || '',
            assistantAvatar: profile.assistant_avatar_url || '',
            assistantAvatarStoragePath: profile.assistant_avatar_storage_path || '',
            senseOfHumor: profile.sense_of_humor || 50,
            efficiencyPreference: profile.efficiency_preference || 50,
            creativityLevel: profile.creativity_level || 50,
            riskTolerance: profile.risk_tolerance || 50
          };
          
          // Load other settings from localStorage
          const stored = localStorage.getItem(STORAGE_KEY);
          if (stored) {
            const parsed = JSON.parse(stored);
            return { ...supabaseSettings, ...parsed };
          }
          
          return supabaseSettings;
        }
      }
    }
    
    // Fallback to localStorage
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      
      // Migration: map old field names to new field names
      const migrated = {
        ...DEFAULT_SETTINGS,
        ...parsed,
        // Migrate machineName -> assistantName
        assistantName: parsed.assistantName || parsed.machineName || '',
        // Migrate machineDescription -> assistantDescription
        assistantDescription: parsed.assistantDescription || parsed.machineDescription || ''
      };
      
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
  return { ...DEFAULT_SETTINGS };
}

async function saveSettings(settings) {
  try {
    // Save to localStorage for non-identity settings
    const localStorageSettings = { ...settings };
    delete localStorageSettings.assistantName;
    delete localStorageSettings.assistantDescription;
    delete localStorageSettings.assistantAvatar;
    delete localStorageSettings.assistantAvatarStoragePath;
    delete localStorageSettings.senseOfHumor;
    delete localStorageSettings.efficiencyPreference;
    delete localStorageSettings.creativityLevel;
    delete localStorageSettings.riskTolerance;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(localStorageSettings));
    
    // Save assistant identity and personality to Supabase
    if (window.neuroartanSupabase) {
      const { data: { user } } = await window.neuroartanSupabase.auth.getUser();
      if (user) {
        await window.neuroartanSupabase
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
      }
    }
  } catch (error) {
    console.error('Failed to save personalization settings:', error);
  }
}

function initializeForm(settings) {
  // ICOS Assistant Identity fields
  const assistantNameInput = document.querySelector('[data-home-platform-field="assistant-name"]');
  const assistantDescriptionTextarea = document.querySelector('[data-home-platform-field="assistant-description"]');
  const avatarImage = document.querySelector('[data-home-platform-avatar-image]');
  const avatarPlaceholder = document.querySelector('[data-home-platform-avatar-placeholder]');
  
  if (assistantNameInput) assistantNameInput.value = settings.assistantName || '';
  if (assistantDescriptionTextarea) assistantDescriptionTextarea.value = settings.assistantDescription || '';
  
  // Update character counter for description
  updateCharacterCounter(assistantDescriptionTextarea);
  
  // Initialize avatar display
  if (settings.assistantAvatar && avatarImage && avatarPlaceholder) {
    avatarImage.src = settings.assistantAvatar;
    avatarImage.hidden = false;
    avatarPlaceholder.hidden = true;
  }
  
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
    valueDisplay.textContent = `${value}%`;
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
  
  // Thought Pattern fields
  const languageStyleSelect = document.querySelector('[data-home-platform-field="language-style"]');
  const directnessLevelSelect = document.querySelector('[data-home-platform-field="directness-level"]');
  const emotionalToneSelect = document.querySelector('[data-home-platform-field="emotional-tone"]');
  
  if (languageStyleSelect) {
    languageStyleSelect.addEventListener('change', (e) => {
      settings.languageStyle = e.target.value;
      saveSettings(settings);
    });
  }
  
  if (directnessLevelSelect) {
    directnessLevelSelect.addEventListener('change', (e) => {
      settings.directnessLevel = e.target.value;
      saveSettings(settings);
    });
  }
  
  if (emotionalToneSelect) {
    emotionalToneSelect.addEventListener('change', (e) => {
      settings.emotionalTone = e.target.value;
      saveSettings(settings);
    });
  }
  
  // Response Style fields
  const responseLengthSelect = document.querySelector('[data-home-platform-field="response-length"]');
  const explanationDepthSelect = document.querySelector('[data-home-platform-field="explanation-depth"]');
  
  if (responseLengthSelect) {
    responseLengthSelect.addEventListener('change', (e) => {
      settings.responseLength = e.target.value;
      saveSettings(settings);
    });
  }
  
  if (explanationDepthSelect) {
    explanationDepthSelect.addEventListener('change', (e) => {
      settings.explanationDepth = e.target.value;
      saveSettings(settings);
    });
  }
  
  // Memory & Continuity fields
  const memoryRetentionSelect = document.querySelector('[data-home-platform-field="memory-retention"]');
  const continuityDepthSelect = document.querySelector('[data-home-platform-field="continuity-depth"]');
  
  if (memoryRetentionSelect) {
    memoryRetentionSelect.addEventListener('change', (e) => {
      settings.memoryRetention = e.target.value;
      saveSettings(settings);
    });
  }
  
  if (continuityDepthSelect) {
    continuityDepthSelect.addEventListener('change', (e) => {
      settings.continuityDepth = e.target.value;
      saveSettings(settings);
    });
  }
  
  // Emotional Context fields
  const emotionalWeightingSelect = document.querySelector('[data-home-platform-field="emotional-weighting"]');
  const empathyLevelSelect = document.querySelector('[data-home-platform-field="empathy-level"]');
  
  if (emotionalWeightingSelect) {
    emotionalWeightingSelect.addEventListener('change', (e) => {
      settings.emotionalWeighting = e.target.value;
      saveSettings(settings);
    });
  }
  
  if (empathyLevelSelect) {
    empathyLevelSelect.addEventListener('change', (e) => {
      settings.empathyLevel = e.target.value;
      saveSettings(settings);
    });
  }
  
  // Reflection Loop fields
  const reflectionFrequencySelect = document.querySelector('[data-home-platform-field="reflection-frequency"]');
  const reflectionDepthSelect = document.querySelector('[data-home-platform-field="reflection-depth"]');
  
  if (reflectionFrequencySelect) {
    reflectionFrequencySelect.addEventListener('change', (e) => {
      settings.reflectionFrequency = e.target.value;
      saveSettings(settings);
    });
  }
  
  if (reflectionDepthSelect) {
    reflectionDepthSelect.addEventListener('change', (e) => {
      settings.reflectionDepth = e.target.value;
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
  }
  
  if (efficiencyPreferenceSlider) {
    efficiencyPreferenceSlider.addEventListener('input', (e) => {
      settings.efficiencyPreference = parseInt(e.target.value);
      updateSliderValue('efficiency-preference', settings.efficiencyPreference);
      saveSettings(settings);
    });
  }
  
  if (creativityLevelSlider) {
    creativityLevelSlider.addEventListener('input', (e) => {
      settings.creativityLevel = parseInt(e.target.value);
      updateSliderValue('creativity-level', settings.creativityLevel);
      saveSettings(settings);
    });
  }
  
  if (riskToleranceSlider) {
    riskToleranceSlider.addEventListener('input', (e) => {
      settings.riskTolerance = parseInt(e.target.value);
      updateSliderValue('risk-tolerance', settings.riskTolerance);
      saveSettings(settings);
    });
  }
  
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
  const avatarInput = document.querySelector('[data-home-platform-avatar-input]');
  const avatarImage = document.querySelector('[data-home-platform-avatar-image]');
  const avatarPlaceholder = document.querySelector('[data-home-platform-avatar-placeholder]');
  
  if (changeAvatarButton && avatarInput) {
    changeAvatarButton.addEventListener('click', () => {
      avatarInput.click();
    });
  }
  
  if (avatarInput) {
    avatarInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (file) {
        try {
          // Upload to Supabase storage
          if (window.neuroartanSupabase) {
            const { data: { user } } = await window.neuroartanSupabase.auth.getUser();
            if (user) {
              const fileExt = file.name.split('.').pop();
              const fileName = `${user.id}/assistant-avatar-${Date.now()}.${fileExt}`;
              
              const { data: uploadData, error: uploadError } = await window.neuroartanSupabase
                .storage
                .from('profile-media')
                .upload(fileName, file, {
                  cacheControl: '3600',
                  upsert: false
                });
              
              if (uploadError) {
                console.error('Avatar upload error:', uploadError);
                return;
              }
              
              // Get public URL
              const { data: { publicUrl } } = window.neuroartanSupabase
                .storage
                .from('profile-media')
                .getPublicUrl(fileName);
              
              settings.assistantAvatar = publicUrl;
              settings.assistantAvatarStoragePath = fileName;
              await saveSettings(settings);
              
              // Update avatar display
              if (avatarImage && avatarPlaceholder) {
                avatarImage.src = publicUrl;
                avatarImage.hidden = false;
                avatarPlaceholder.hidden = true;
              }
            }
          } else {
            // Fallback to base64 for localStorage
            const reader = new FileReader();
            reader.onload = (event) => {
              const imageDataUrl = event.target.result;
              settings.assistantAvatar = imageDataUrl;
              saveSettings(settings);
              
              // Update avatar display
              if (avatarImage && avatarPlaceholder) {
                avatarImage.src = imageDataUrl;
                avatarImage.hidden = false;
                avatarPlaceholder.hidden = true;
              }
            };
            reader.readAsDataURL(file);
          }
        } catch (error) {
          console.error('Avatar upload failed:', error);
        }
      }
    });
  }
}

export async function mountHomePlatformDestination(root, options = {}) {
  mountSettingsCategory(root, options);
  
  const settings = await loadSettings();
  initializeForm(settings);
  setupEventListeners(settings);
}

