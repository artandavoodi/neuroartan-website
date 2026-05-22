import { mountSettingsCategory } from '../_shared/settings-category.js';

const STORAGE_KEY = 'neuroartan.personalization-settings';

const DEFAULT_SETTINGS = {
  // Identity & Profile
  displayName: '',
  username: '',
  description: '',
  publicProfile: false,
  
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
  reflectionDepth: 'moderate'
};

function loadSettings() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    }
  } catch (error) {
    console.error('Failed to load personalization settings:', error);
  }
  return { ...DEFAULT_SETTINGS };
}

function saveSettings(settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Failed to save personalization settings:', error);
  }
}

function initializeForm(settings) {
  // Identity & Profile fields
  const displayNameInput = document.querySelector('[data-home-platform-field="display-name"]');
  const usernameInput = document.querySelector('[data-home-platform-field="username"]');
  const descriptionTextarea = document.querySelector('[data-home-platform-field="description"]');
  const publicProfileToggle = document.querySelector('[data-home-platform-toggle="public-profile"]');
  
  if (displayNameInput) displayNameInput.value = settings.displayName || '';
  if (usernameInput) usernameInput.value = settings.username || '';
  if (descriptionTextarea) descriptionTextarea.value = settings.description || '';
  if (publicProfileToggle) {
    publicProfileToggle.setAttribute('aria-pressed', settings.publicProfile.toString());
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
  const stepByStepToggle = document.querySelector('[data-home-platform-toggle="step-by-step"]');
  
  if (responseLengthSelect) responseLengthSelect.value = settings.responseLength;
  if (explanationDepthSelect) explanationDepthSelect.value = settings.explanationDepth;
  if (stepByStepToggle) {
    stepByStepToggle.setAttribute('aria-pressed', settings.stepByStep.toString());
  }
  
  // Memory & Continuity fields
  const enableMemoryToggle = document.querySelector('[data-home-platform-toggle="enable-memory"]');
  const memoryRetentionSelect = document.querySelector('[data-home-platform-field="memory-retention"]');
  const continuityDepthSelect = document.querySelector('[data-home-platform-field="continuity-depth"]');
  
  if (enableMemoryToggle) {
    enableMemoryToggle.setAttribute('aria-pressed', settings.enableMemory.toString());
  }
  if (memoryRetentionSelect) memoryRetentionSelect.value = settings.memoryRetention;
  if (continuityDepthSelect) continuityDepthSelect.value = settings.continuityDepth;
  
  // Behavioral Learning toggles
  const workflowLearningToggle = document.querySelector('[data-home-platform-toggle="workflow-learning"]');
  const communicationLearningToggle = document.querySelector('[data-home-platform-toggle="communication-learning"]');
  
  if (workflowLearningToggle) {
    workflowLearningToggle.setAttribute('aria-pressed', settings.workflowLearning.toString());
  }
  if (communicationLearningToggle) {
    communicationLearningToggle.setAttribute('aria-pressed', settings.communicationLearning.toString());
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
}

function setupEventListeners(settings) {
  // Identity & Profile fields
  const displayNameInput = document.querySelector('[data-home-platform-field="display-name"]');
  const usernameInput = document.querySelector('[data-home-platform-field="username"]');
  const descriptionTextarea = document.querySelector('[data-home-platform-field="description"]');
  const publicProfileToggle = document.querySelector('[data-home-platform-toggle="public-profile"]');
  
  if (displayNameInput) {
    displayNameInput.addEventListener('input', (e) => {
      settings.displayName = e.target.value;
      saveSettings(settings);
    });
  }
  
  if (usernameInput) {
    usernameInput.addEventListener('input', (e) => {
      settings.username = e.target.value;
      saveSettings(settings);
    });
  }
  
  if (descriptionTextarea) {
    descriptionTextarea.addEventListener('input', (e) => {
      settings.description = e.target.value;
      saveSettings(settings);
    });
  }
  
  if (publicProfileToggle) {
    publicProfileToggle.addEventListener('click', () => {
      const currentState = publicProfileToggle.getAttribute('aria-pressed') === 'true';
      settings.publicProfile = !currentState;
      publicProfileToggle.setAttribute('aria-pressed', settings.publicProfile.toString());
      saveSettings(settings);
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
  const stepByStepToggle = document.querySelector('[data-home-platform-toggle="step-by-step"]');
  
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
  
  if (stepByStepToggle) {
    stepByStepToggle.addEventListener('click', () => {
      const currentState = stepByStepToggle.getAttribute('aria-pressed') === 'true';
      settings.stepByStep = !currentState;
      stepByStepToggle.setAttribute('aria-pressed', settings.stepByStep.toString());
      saveSettings(settings);
    });
  }
  
  // Memory & Continuity fields
  const enableMemoryToggle = document.querySelector('[data-home-platform-toggle="enable-memory"]');
  const memoryRetentionSelect = document.querySelector('[data-home-platform-field="memory-retention"]');
  const continuityDepthSelect = document.querySelector('[data-home-platform-field="continuity-depth"]');
  
  if (enableMemoryToggle) {
    enableMemoryToggle.addEventListener('click', () => {
      const currentState = enableMemoryToggle.getAttribute('aria-pressed') === 'true';
      settings.enableMemory = !currentState;
      enableMemoryToggle.setAttribute('aria-pressed', settings.enableMemory.toString());
      saveSettings(settings);
    });
  }
  
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
  
  // Behavioral Learning toggles
  const workflowLearningToggle = document.querySelector('[data-home-platform-toggle="workflow-learning"]');
  const communicationLearningToggle = document.querySelector('[data-home-platform-toggle="communication-learning"]');
  
  if (workflowLearningToggle) {
    workflowLearningToggle.addEventListener('click', () => {
      const currentState = workflowLearningToggle.getAttribute('aria-pressed') === 'true';
      settings.workflowLearning = !currentState;
      workflowLearningToggle.setAttribute('aria-pressed', settings.workflowLearning.toString());
      saveSettings(settings);
    });
  }
  
  if (communicationLearningToggle) {
    communicationLearningToggle.addEventListener('click', () => {
      const currentState = communicationLearningToggle.getAttribute('aria-pressed') === 'true';
      settings.communicationLearning = !currentState;
      communicationLearningToggle.setAttribute('aria-pressed', settings.communicationLearning.toString());
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
  
  // Voice training button (placeholder for future backend integration)
  const startVoiceTrainingButton = document.querySelector('[data-home-platform-action="start-voice-training"]');
  if (startVoiceTrainingButton) {
    startVoiceTrainingButton.addEventListener('click', () => {
      // Placeholder: Voice training requires backend runtime
      console.log('Voice training requires backend runtime');
    });
  }
  
  // Change avatar button (placeholder for future backend integration)
  const changeAvatarButton = document.querySelector('[data-home-platform-action="change-avatar"]');
  if (changeAvatarButton) {
    changeAvatarButton.addEventListener('click', () => {
      // Placeholder: Avatar upload requires backend runtime
      console.log('Avatar upload requires backend runtime');
    });
  }
}

export function mountHomePlatformDestination(root, options = {}) {
  mountSettingsCategory(root, options);
  
  const settings = loadSettings();
  initializeForm(settings);
  setupEventListeners(settings);
}

