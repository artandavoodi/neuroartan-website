import {
  listModelVoiceTrainingSamples,
  readModelVoiceTrainingState,
  removeModelVoiceTrainingSample,
  saveModelVoiceTrainingSample,
} from '../../../system/model/model-store.js';

const mountedRoots = new WeakSet();
const recorderState = new WeakMap();
const voiceUiState = new WeakMap();
const VOICE_WORKSPACE_STORAGE_KEY = 'neuroartan.model.voiceTraining.workspace';
const FINE_TUNE_STORAGE_KEY = 'neuroartan.model.voiceTraining.fineTune';
const VOICE_MODE_ICONS = Object.freeze({
  guided: '/registry/icons/public/assets/core/actions/guided-voice-capture/guided-voice-capture.svg',
  casual: '/registry/icons/public/assets/core/actions/casual-voice-capture/casual-voice-capture.svg',
});

const SAMPLE_ORIGIN_LABELS = Object.freeze({
  guided_recording: 'Guided recording',
  audio_file: 'Audio file',
  external_reference: 'External reference',
});

const TONE_LABELS = Object.freeze({
  neutral: 'Neutral',
  happy: 'Happy',
  excited: 'Excited',
  sad: 'Sad',
  angry: 'Angry',
  anxious: 'Anxious',
  calm: 'Calm',
  empathetic: 'Empathetic',
  confident: 'Confident',
  reflective: 'Reflective',
  soft: 'Soft',
  formal: 'Formal',
});

const VOICE_PROMPTS = Object.freeze([
  {
    id: 'baseline_identity',
    label: 'Baseline identity',
    tone: 'neutral',
    text: 'My voice should carry my identity with clarity, consent, and continuity.',
  },
  {
    id: 'excited_discovery',
    label: 'Excited discovery',
    tone: 'excited',
    text: 'I just found something important, and I want to explain why it matters.',
  },
  {
    id: 'happy_memory',
    label: 'Happy memory',
    tone: 'happy',
    text: 'This memory makes me smile because it reminds me of a meaningful moment.',
  },
  {
    id: 'sad_reflection',
    label: 'Sad reflection',
    tone: 'sad',
    text: 'This is difficult to say, but I want to stay honest and thoughtful.',
  },
  {
    id: 'angry_boundary',
    label: 'Angry boundary',
    tone: 'angry',
    text: 'I need to be clear that this boundary matters and should be respected.',
  },
  {
    id: 'anxious_uncertainty',
    label: 'Anxious uncertainty',
    tone: 'anxious',
    text: 'I am uncertain about the next step, but I want to think it through carefully.',
  },
  {
    id: 'calm_guidance',
    label: 'Calm guidance',
    tone: 'calm',
    text: 'Let us slow down, look at the facts, and choose the next step carefully.',
  },
  {
    id: 'empathetic_support',
    label: 'Empathetic support',
    tone: 'empathetic',
    text: 'I hear what you are carrying, and I want to respond with care.',
  },
  {
    id: 'confident_decision',
    label: 'Confident decision',
    tone: 'confident',
    text: 'This is the direction I would choose, and I can explain the reason clearly.',
  },
  {
    id: 'reflective_meaning',
    label: 'Reflective meaning',
    tone: 'reflective',
    text: 'When I look back at this pattern, I can see what it changed in me.',
  },
  {
    id: 'soft_private',
    label: 'Soft private tone',
    tone: 'soft',
    text: 'This is private and delicate, so I want to say it gently.',
  },
  {
    id: 'formal_context',
    label: 'Formal context',
    tone: 'formal',
    text: 'For the record, I want this statement to remain precise and accountable.',
  },
]);

function normalizeString(value = '') {
  return String(value ?? '').trim();
}

function normalizeSpeechText(value = '') {
  return normalizeString(value)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function scoreTranscriptMatch(expected = '', actual = '') {
  const expectedWords = normalizeSpeechText(expected).split(' ').filter(Boolean);
  const actualWords = new Set(normalizeSpeechText(actual).split(' ').filter(Boolean));
  if (!expectedWords.length || !actualWords.size) return 0;
  const hits = expectedWords.filter((word) => actualWords.has(word)).length;
  return hits / expectedWords.length;
}

function getOrderedPromptMatchCount(expected = '', actual = '') {
  const expectedWords = normalizeSpeechText(expected).split(' ').filter(Boolean);
  const actualWords = normalizeSpeechText(actual).split(' ').filter(Boolean);
  if (!expectedWords.length || !actualWords.length) return 0;

  let actualIndex = 0;
  let matchedCount = 0;
  for (const expectedWord of expectedWords) {
    while (actualIndex < actualWords.length && actualWords[actualIndex] !== expectedWord) {
      actualIndex += 1;
    }
    if (actualIndex >= actualWords.length) break;
    matchedCount += 1;
    actualIndex += 1;
  }

  return matchedCount;
}

function getPromptCompletionRatio(expected = '', actual = '') {
  const expectedWords = normalizeSpeechText(expected).split(' ').filter(Boolean);
  if (!expectedWords.length) return 0;
  return getOrderedPromptMatchCount(expected, actual) / expectedWords.length;
}

function renderPromptProgress(root, transcript = '') {
  const prompt = queryVoice(root, '[data-model-voice-training-live-prompt]');
  if (!(prompt instanceof HTMLElement)) return;
  const expected = getVoiceUiState(root).captureMode === 'guided'
    ? getPromptByIndex(getVoiceUiState(root).livePromptIndex).text
    : prompt.textContent;
  const matchedCount = getOrderedPromptMatchCount(expected, transcript);

  prompt.innerHTML = '';
  normalizeString(expected).split(/(\s+)/).forEach((part) => {
    const span = document.createElement('span');
    span.textContent = part;
    if (normalizeSpeechText(part)) {
      const wordIndex = prompt.querySelectorAll('[data-voice-prompt-word]').length;
      span.dataset.voicePromptWord = String(wordIndex);
      if (wordIndex < matchedCount) span.dataset.voicePromptMatched = 'true';
    }
    prompt.append(span);
  });
}

function getVoiceUiState(root) {
  const state = voiceUiState.get(root) || {};
  return {
    captureMode: normalizeString(state.captureMode) || 'guided',
    capturePhase: normalizeString(state.capturePhase) || 'idle',
    livePromptIndex: Number.isFinite(Number(state.livePromptIndex)) ? Number(state.livePromptIndex) : 0,
    liveTranscript: normalizeString(state.liveTranscript),
  };
}

function setVoiceUiState(root, nextState = {}) {
  voiceUiState.set(root, {
    ...getVoiceUiState(root),
    ...nextState,
  });
}

function getActivePromptText(root) {
  const state = getVoiceUiState(root);
  return state.captureMode === 'guided'
    ? getPromptByIndex(state.livePromptIndex).text
    : normalizeString(queryVoice(root, '[data-model-voice-training-live-prompt]')?.textContent);
}

function titleCase(value = '') {
  return normalizeString(value)
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getControl(root, name) {
  return root?.querySelector?.(`[data-model-voice-training-field="${name}"]`) || null;
}

function queryVoice(root, selector) {
  return root?.querySelector?.(selector) || document.querySelector(selector);
}

function getSelectedPrompt(root) {
  const promptId = normalizeString(getControl(root, 'promptId')?.value) || VOICE_PROMPTS[0].id;
  return VOICE_PROMPTS.find((prompt) => prompt.id === promptId) || VOICE_PROMPTS[0];
}

function getPromptByIndex(index = 0) {
  const normalized = Math.max(0, Number(index) || 0) % VOICE_PROMPTS.length;
  return VOICE_PROMPTS[normalized] || VOICE_PROMPTS[0];
}

function setText(root, selector, value = '') {
  const element = queryVoice(root, selector);
  if (element) element.textContent = value;
}

function setCaptureStatus(root, message = '', tone = 'neutral') {
  const status = queryVoice(root, '[data-model-voice-training-recording-status]');
  if (!(status instanceof HTMLElement)) return;
  const text = status.querySelector('[data-model-voice-training-recording-status-text]');
  const icon = status.querySelector('[data-model-voice-training-recording-status-icon]');
  status.dataset.captureStatus = tone;
  if (text instanceof HTMLElement) text.textContent = message;
  else status.textContent = message;
  setElementHidden(icon, !['captured', 'saving'].includes(tone));
}

function setTextFromRootOrDocument(root, selector, value = '') {
  const element = queryVoice(root, selector);
  if (element) element.textContent = value;
}

function setStatus(root, message = '', tone = 'neutral') {
  const status = root?.querySelector?.('[data-model-voice-training-status]');
  if (!(status instanceof HTMLElement)) return;
  status.textContent = message;
  status.dataset.status = tone;
  status.hidden = !message;
}

function setElementHidden(element, hidden = true) {
  if (!(element instanceof HTMLElement)) return;
  element.hidden = Boolean(hidden);
  element.style.display = hidden ? 'none' : '';
}

function storageAvailable() {
  return typeof window !== 'undefined' && 'localStorage' in window;
}

function readStoredWorkspace() {
  if (!storageAvailable()) return '';
  try {
    return normalizeString(window.localStorage.getItem(VOICE_WORKSPACE_STORAGE_KEY));
  } catch (_) {
    return '';
  }
}

function writeStoredWorkspace(workspace = '') {
  if (!storageAvailable()) return;
  try {
    if (workspace) window.localStorage.setItem(VOICE_WORKSPACE_STORAGE_KEY, workspace);
    else window.localStorage.removeItem(VOICE_WORKSPACE_STORAGE_KEY);
  } catch (_) {
    // Storage is optional for this session state.
  }
}

function readStoredFineTuneControls() {
  if (!storageAvailable()) return {};
  try {
    return JSON.parse(window.localStorage.getItem(FINE_TUNE_STORAGE_KEY) || '{}') || {};
  } catch (_) {
    return {};
  }
}

function writeStoredFineTuneControls(root) {
  if (!storageAvailable()) return;
  const payload = {};
  document.querySelectorAll('[data-model-voice-training-fine-tune-control]').forEach((control) => {
    if (!(control instanceof HTMLInputElement)) return;
    payload[control.dataset.modelVoiceTrainingFineTuneControl] = Number(control.value);
  });
  try {
    window.localStorage.setItem(FINE_TUNE_STORAGE_KEY, JSON.stringify(payload));
  } catch (_) {
    // Fine tune UI state remains usable without local storage.
  }
  drawStaticFineTuneWaveform(root);
}

function restoreFineTuneControls(root) {
  const payload = readStoredFineTuneControls();
  document.querySelectorAll('[data-model-voice-training-fine-tune-control]').forEach((control) => {
    if (!(control instanceof HTMLInputElement)) return;
    const key = control.dataset.modelVoiceTrainingFineTuneControl;
    if (Number.isFinite(Number(payload[key]))) control.value = String(payload[key]);
  });
  drawStaticFineTuneWaveform(root);
}

function updateDropdownLabels(root) {
  const sampleOrigin = normalizeString(getControl(root, 'sampleOrigin')?.value || 'guided_recording');
  const emotionalTone = normalizeString(getControl(root, 'emotionalTone')?.value || 'neutral');
  const selectedPrompt = getSelectedPrompt(root);

  setText(root, '[data-model-voice-training-label="sampleOrigin"]', SAMPLE_ORIGIN_LABELS[sampleOrigin] || titleCase(sampleOrigin));
  setText(root, '[data-model-voice-training-label="emotionalTone"]', TONE_LABELS[emotionalTone] || titleCase(emotionalTone));
  setText(root, '[data-model-voice-training-label="promptId"]', selectedPrompt.label);
  setText(root, '[data-model-voice-training-prompt]', selectedPrompt.text);
}

function syncIntakeVisibility(root) {
  const sampleOrigin = normalizeString(getControl(root, 'sampleOrigin')?.value || 'guided_recording');
  const capture = root.querySelector('[data-model-voice-training-capture]');
  const fileGroup = root.querySelector('[data-model-voice-training-file-group]');
  const referenceGroup = root.querySelector('[data-model-voice-training-reference-group]');

  if (capture instanceof HTMLElement) capture.hidden = sampleOrigin !== 'guided_recording';
  if (fileGroup instanceof HTMLElement) fileGroup.hidden = sampleOrigin !== 'audio_file';
  if (referenceGroup instanceof HTMLElement) referenceGroup.hidden = sampleOrigin !== 'external_reference';
}

function setReadinessDot(root, state = '') {
  const dot = root.querySelector('[data-model-voice-training-readiness-dot]');
  if (!(dot instanceof HTMLElement)) return;
  const normalized = normalizeString(state);
  dot.dataset.status = normalized === 'ready_for_review'
    ? 'ready'
    : normalized === 'forming'
      ? 'initial'
      : normalized === 'initial'
        ? 'initial'
        : 'blocked';
}

function renderState(root, state = null, samples = []) {
  const sampleCount = Number(state?.sampleCount ?? samples.length ?? 0);
  const toneCount = Number(state?.emotionCoverage?.tone_count ?? new Set(samples.map((sample) => sample.emotionalTone).filter(Boolean)).size);
  const readinessState = normalizeString(state?.readinessState || 'not_started');

  setText(root, '[data-model-voice-training-sample-count]', String(sampleCount));
  setText(root, '[data-model-voice-training-tone-count]', `${toneCount} / 8`);
  setText(root, '[data-model-voice-training-readiness]', titleCase(readinessState || 'not_started'));
  setText(root, '[data-model-voice-training-activation]', titleCase(state?.activationState || 'inactive'));
  setText(root, '[data-model-voice-training-list-count]', `${samples.length} saved`);
  setTextFromRootOrDocument(root, '[data-model-voice-training-overlay-list-count]', `${samples.length} saved`);
  setReadinessDot(root, readinessState);
}

function renderSampleList(list, samples = []) {
  if (!(list instanceof HTMLElement)) return;
  list.innerHTML = '';

  if (!samples.length) {
    const empty = document.createElement('p');
    empty.className = 'model-voice-training__status';
    empty.textContent = 'No voice samples recorded.';
    list.append(empty);
    return;
  }

  samples.forEach((sample) => {
    const row = document.createElement('article');
    row.className = 'model-voice-training__sample';

    const copy = document.createElement('div');
    copy.className = 'model-voice-training__sample-copy';

    const title = document.createElement('h6');
    title.className = 'model-voice-training__sample-title';
    title.textContent = sample.sampleTitle || 'Voice sample';

    const meta = document.createElement('p');
    meta.className = 'model-voice-training__sample-meta';
    meta.textContent = `${TONE_LABELS[sample.emotionalTone] || titleCase(sample.emotionalTone)} · ${SAMPLE_ORIGIN_LABELS[sample.sampleOrigin] || titleCase(sample.sampleOrigin)}`;

    const detail = document.createElement('p');
    detail.className = 'model-voice-training__sample-detail';
    detail.textContent = sample.transcriptStatus === 'owner_provided' ? 'Transcript provided' : 'Transcript pending';

    copy.append(title, meta, detail);

    const remove = document.createElement('button');
    remove.className = 'model-voice-training__sample-remove';
    remove.type = 'button';
    remove.dataset.modelVoiceTrainingRemove = sample.id;
    remove.textContent = 'Remove';

    row.append(copy, remove);
    list.append(row);
  });
}

function renderSamples(root, samples = []) {
  const inlineSamples = root.querySelector('[data-model-voice-training-samples-inline]');
  if (inlineSamples instanceof HTMLElement) inlineSamples.hidden = !samples.length;
  renderSampleList(root.querySelector('[data-model-voice-training-samples]'), samples);
  renderSampleList(
    root.querySelector('[data-model-voice-training-overlay-samples]')
      || document.querySelector('[data-model-voice-training-overlay-samples]'),
    samples
  );
}

async function hydrateVoiceTraining(root) {
  setStatus(root, 'Loading Voice Training…');
  try {
    const [state, samples] = await Promise.all([
      readModelVoiceTrainingState(),
      listModelVoiceTrainingSamples(),
    ]);
    renderState(root, state, samples);
    renderSamples(root, samples);
    setStatus(root, '');
  } catch (error) {
    console.warn('[Neuroartan][Model Voice] Hydration failed.', error);
    setStatus(root, 'Voice Training backend is not ready. Run the voice training migration and refresh.', 'warning');
  }
}

function populatePromptSelect(root) {
  const select = getControl(root, 'promptId');
  if (!(select instanceof HTMLSelectElement) || select.options.length) return;
  VOICE_PROMPTS.forEach((prompt) => {
    const option = document.createElement('option');
    option.value = prompt.id;
    option.textContent = prompt.label;
    select.append(option);
  });
}

function updateToneFromPrompt(root) {
  const selectedPrompt = getSelectedPrompt(root);
  const toneControl = getControl(root, 'emotionalTone');
  if (toneControl instanceof HTMLSelectElement && selectedPrompt.tone) {
    toneControl.value = selectedPrompt.tone;
  }
}

function applyLivePrompt(root, index = getVoiceUiState(root).livePromptIndex) {
  const captureMode = getVoiceUiState(root).captureMode;
  if (captureMode === 'casual') {
    setText(root, '[data-model-voice-training-live-progress]', 'Casual capture');
    setText(root, '[data-model-voice-training-live-tone]', 'Natural voice');
    setText(root, '[data-model-voice-training-live-instruction]', 'Speak naturally for a continuous owner voice sample.');
    setText(root, '[data-model-voice-training-live-prompt]', 'Talk about a memory, decision, idea, or story in your normal speaking rhythm.');
    setText(root, '[data-model-voice-training-live-transcript]', 'Transcript appears here when browser speech recognition is available.');
    setText(root, '[data-model-voice-training-validation]', '');
    setElementHidden(queryVoice(root, '[data-model-voice-training-validation]'), true);
    setCaptureStatus(root, 'Ready for capture');
    updateDropdownLabels(root);
    return;
  }

  const prompt = getPromptByIndex(index);
  const toneLabel = TONE_LABELS[prompt.tone] || titleCase(prompt.tone || 'natural');
  const promptControl = getControl(root, 'promptId');
  const toneControl = getControl(root, 'emotionalTone');

  if (promptControl instanceof HTMLSelectElement) promptControl.value = prompt.id;
  if (toneControl instanceof HTMLSelectElement) toneControl.value = prompt.tone || 'neutral';

  setText(root, '[data-model-voice-training-live-progress]', `Step ${(index % VOICE_PROMPTS.length) + 1} / ${VOICE_PROMPTS.length}`);
  setText(root, '[data-model-voice-training-live-tone]', `${toneLabel} voice`);
  setText(root, '[data-model-voice-training-live-instruction]', `Say this sentence in a ${toneLabel.toLowerCase()} voice.`);
  setText(root, '[data-model-voice-training-live-prompt]', prompt.text);
  renderPromptProgress(root, '');
  setText(root, '[data-model-voice-training-live-transcript]', 'Transcript appears here when browser speech recognition is available.');
  setText(root, '[data-model-voice-training-validation]', '');
  setElementHidden(queryVoice(root, '[data-model-voice-training-validation]'), true);
  setCaptureStatus(root, 'Ready for capture');
  setVoiceUiState(root, { livePromptIndex: index, liveTranscript: '' });
  updateDropdownLabels(root);
}

function setCaptureMode(root, mode = 'guided') {
  const captureMode = mode === 'casual' ? 'casual' : 'guided';
  setVoiceUiState(root, { captureMode });
  queryVoice(root, '[data-model-voice-training-close-confirmation]')?.setAttribute('hidden', '');
  const toggle = queryVoice(root, '[data-model-voice-training-mode-toggle]');
  const icon = queryVoice(root, '[data-model-voice-training-mode-icon]');
  const label = queryVoice(root, '[data-model-voice-training-mode-label]');
  if (toggle instanceof HTMLButtonElement) {
    toggle.dataset.modelVoiceTrainingMode = captureMode;
    toggle.setAttribute('aria-pressed', captureMode === 'guided' ? 'true' : 'false');
  }
  if (icon instanceof HTMLImageElement) {
    icon.src = VOICE_MODE_ICONS[captureMode] || VOICE_MODE_ICONS.guided;
  }
  if (label instanceof HTMLElement) {
    label.textContent = captureMode === 'guided' ? 'Guided capture' : 'Casual capture';
  }
  applyLivePrompt(root);
  setCapturePhase(root, 'idle');
}

function setCapturePhase(root, phase = 'idle') {
  const capturePhase = ['idle', 'recording', 'captured', 'saving'].includes(phase) ? phase : 'idle';
  setVoiceUiState(root, { capturePhase });
  const state = getVoiceUiState(root);
  const isGuided = state.captureMode === 'guided';
  const hasPrevious = isGuided && state.livePromptIndex > 0;
  const promptVisible = capturePhase !== 'idle';
  const phaseLabel = capturePhase === 'recording'
    ? 'Recording'
    : capturePhase === 'captured'
      ? 'Capture ready'
      : capturePhase === 'saving'
        ? 'Saving'
        : 'Ready';

  setText(root, '[data-model-voice-training-step-state]', phaseLabel);
  setElementHidden(queryVoice(root, '.model-voice-training__training-nav'), capturePhase === 'idle' && !hasPrevious);
  setElementHidden(queryVoice(root, '[data-model-voice-training-live-instruction]'), !promptVisible);
  setElementHidden(queryVoice(root, '[data-model-voice-training-live-prompt]'), !promptVisible);
  setElementHidden(queryVoice(root, '[data-model-voice-training-live-transcript]'), !promptVisible || isGuided);
  setElementHidden(queryVoice(root, '[data-model-voice-training-waveform]'), !promptVisible);
  setElementHidden(queryVoice(root, '[data-model-voice-training-record]'), capturePhase !== 'idle');
  setElementHidden(queryVoice(root, '[data-model-voice-training-stop]'), capturePhase !== 'recording');
  setElementHidden(queryVoice(root, '[data-model-voice-training-save-recording]'), capturePhase !== 'captured');
  setElementHidden(queryVoice(root, '[data-model-voice-training-reset-capture]'), capturePhase !== 'captured');
  setElementHidden(queryVoice(root, '[data-model-voice-training-previous-step]'), !hasPrevious || capturePhase === 'recording' || capturePhase === 'saving');
}

function validateGuidedCapture(root) {
  const state = getVoiceUiState(root);
  if (state.captureMode !== 'guided') return { accepted: true, score: 1 };
  const prompt = getPromptByIndex(state.livePromptIndex);
  const transcript = state.liveTranscript;

  if (!transcript) {
    return { accepted: true, score: 0, transcriptRequired: false };
  }

  const score = scoreTranscriptMatch(prompt.text, transcript);
  const accepted = score >= 0.62;
  setText(
    root,
    '[data-model-voice-training-validation]',
    accepted
      ? 'Sentence matched. Save capture to continue to the next prompt.'
      : 'This did not match the prompt closely enough. Reset and try the sentence again.'
  );
  setElementHidden(queryVoice(root, '[data-model-voice-training-validation]'), false);
  return { accepted, score };
}

function setWorkspaceOpen(root, open = true) {
  const hasOpenWorkspace = open || Boolean(document.querySelector('.model-voice-training__workspace:not([hidden])'));
  document.documentElement.classList.toggle('model-source-calibration-workspace-open', hasOpenWorkspace);
  document.body?.classList.toggle('model-source-calibration-workspace-open', hasOpenWorkspace);
}

function getWorkspace(root, selector) {
  return root?.querySelector?.(selector) || document.querySelector(selector);
}

function openWorkspace(root, selector) {
  const workspace = getWorkspace(root, selector);
  if (!(workspace instanceof HTMLElement)) return;
  if (workspace.parentElement !== document.body) {
    document.body.append(workspace);
  }
  if (selector === '[data-model-voice-training-live-overlay]') {
    clearCurrentCapture(root);
    applyLivePrompt(root);
    setCapturePhase(root, 'idle');
  }
  workspace.hidden = false;
  workspace.style.display = '';
  workspace.setAttribute('aria-hidden', 'false');
  if (selector === '[data-model-voice-training-live-overlay]') writeStoredWorkspace('');
  else writeStoredWorkspace(selector);
  setWorkspaceOpen(root, true);
  if (selector === '[data-model-voice-training-fine-tune-overlay]') {
    restoreFineTuneControls(root);
  }
}

function hasUnsavedCapture(root) {
  const state = recorderState.get(root) || {};
  return Boolean(state.file || state.recorder?.state === 'recording' || state.chunks?.length);
}

function closeWorkspace(root, selector, options = {}) {
  if (selector === '[data-model-voice-training-live-overlay]' && !options.force && hasUnsavedCapture(root)) {
    const state = recorderState.get(root) || {};
    recorderState.set(root, { ...state, closeRequested: true });
    stopRecording(root);
    queryVoice(root, '[data-model-voice-training-close-confirmation]')?.removeAttribute('hidden');
    return false;
  }
  const workspace = getWorkspace(root, selector);
  if (!(workspace instanceof HTMLElement)) return;
  workspace.hidden = true;
  workspace.style.display = 'none';
  workspace.setAttribute('aria-hidden', 'true');
  if (!document.querySelector('.model-voice-training__workspace:not([hidden])')) {
    writeStoredWorkspace('');
    setWorkspaceOpen(root, false);
  }
  return true;
}

function closeAllWorkspaces(root) {
  stopRecording(root);
  document.querySelectorAll('.model-voice-training__workspace').forEach((workspace) => {
    if (!(workspace instanceof HTMLElement)) return;
    workspace.hidden = true;
    workspace.style.display = 'none';
    workspace.setAttribute('aria-hidden', 'true');
  });
  writeStoredWorkspace('');
  setWorkspaceOpen(root, false);
}

function resolveCanvasColor(root, fallback = '#ffffff') {
  const style = window.getComputedStyle(root);
  return normalizeString(style.getPropertyValue('--text-primary-color')) || fallback;
}

function resizeCanvas(canvas) {
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(1, Math.floor(rect.width || canvas.width));
  const height = Math.max(1, Math.floor(rect.height || canvas.height));
  const ratio = Math.max(1, window.devicePixelRatio || 1);
  canvas.width = Math.floor(width * ratio);
  canvas.height = Math.floor(height * ratio);
  const context = canvas.getContext('2d');
  if (context) context.setTransform(ratio, 0, 0, ratio, 0, 0);
  return { width, height, context };
}

function drawWaveform(root) {
  const state = recorderState.get(root);
  const canvas = queryVoice(root, '[data-model-voice-training-waveform]');
  if (!(canvas instanceof HTMLCanvasElement) || !state?.analyser) return;

  const analyser = state.analyser;
  const buffer = state.waveformBuffer || new Uint8Array(analyser.fftSize);
  const { width, height, context } = resizeCanvas(canvas);
  if (!context) return;

  analyser.getByteTimeDomainData(buffer);
  const primary = resolveCanvasColor(root);
  context.clearRect(0, 0, width, height);
  context.lineWidth = 2;
  context.strokeStyle = primary;
  context.globalAlpha = 0.72;
  context.beginPath();

  const slice = width / Math.max(1, buffer.length - 1);
  const center = height / 2;
  buffer.forEach((value, index) => {
    const x = index * slice;
    const amplitude = ((value - 128) / 128) * (height * 0.42);
    const y = center + amplitude;
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  });

  context.stroke();
  context.globalAlpha = 0.12;
  context.lineWidth = 10;
  context.stroke();
  context.globalAlpha = 1;

  const animationFrame = window.requestAnimationFrame(() => drawWaveform(root));
  recorderState.set(root, { ...state, waveformBuffer: buffer, animationFrame });
}

function drawStaticFineTuneWaveform(root) {
  const canvas = queryVoice(root, '[data-model-voice-training-fine-tune-waveform]');
  if (!(canvas instanceof HTMLCanvasElement)) return;
  const { width, height, context } = resizeCanvas(canvas);
  if (!context) return;
  const primary = resolveCanvasColor(root);
  const controls = readStoredFineTuneControls();
  const prosody = Number.isFinite(Number(controls.prosodyContour)) ? Number(controls.prosodyContour) : 0.64;
  const pitch = Number.isFinite(Number(controls.pitchStability)) ? Number(controls.pitchStability) : 0.58;
  const noise = Number.isFinite(Number(controls.noiseFloor)) ? Number(controls.noiseFloor) : 0.22;
  const center = height / 2;
  context.clearRect(0, 0, width, height);
  context.strokeStyle = primary;
  context.lineWidth = 1.5;
  context.globalAlpha = 0.72;
  context.beginPath();
  for (let x = 0; x <= width; x += 8) {
    const phase = x / Math.max(width, 1);
    const y = center
      + Math.sin(phase * Math.PI * (6 + prosody * 8)) * height * (0.08 + prosody * 0.16)
      + Math.sin(phase * Math.PI * (18 + pitch * 12)) * height * (0.02 + (1 - pitch) * 0.08);
    if (x === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  }
  context.stroke();
  context.globalAlpha = Math.min(0.22, 0.04 + noise * 0.18);
  context.lineWidth = 8;
  context.stroke();
  context.globalAlpha = 1;
}

function clearWaveform(root) {
  const state = recorderState.get(root) || {};
  if (state.animationFrame) window.cancelAnimationFrame(state.animationFrame);
  const canvas = queryVoice(root, '[data-model-voice-training-waveform]');
  if (canvas instanceof HTMLCanvasElement) {
    const { width, height, context } = resizeCanvas(canvas);
    context?.clearRect(0, 0, width, height);
  }
}

function startLiveTranscription(root) {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (typeof Recognition !== 'function') {
    setText(root, '[data-model-voice-training-live-transcript]', 'Live transcript unavailable in this browser. Audio will be saved for backend transcription.');
    return null;
  }

  const recognition = new Recognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = document.documentElement.lang || navigator.language || 'en-US';

  recognition.addEventListener('result', (event) => {
    let finalText = '';
    let interimText = '';
    for (let index = event.resultIndex; index < event.results.length; index += 1) {
      const result = event.results[index];
      const transcript = result?.[0]?.transcript || '';
      if (result?.isFinal) finalText += transcript;
      else interimText += transcript;
    }
    const nextTranscript = normalizeString(`${getVoiceUiState(root).liveTranscript} ${finalText}`);
    if (finalText) setVoiceUiState(root, { liveTranscript: nextTranscript });
    const visibleTranscript = normalizeString(`${nextTranscript} ${interimText}`);
    renderPromptProgress(root, visibleTranscript);
    setText(root, '[data-model-voice-training-live-transcript]', visibleTranscript || 'Listening…');
    const state = getVoiceUiState(root);
    const recorder = recorderState.get(root)?.recorder;
    const isGuidedRecording = state.captureMode === 'guided' && state.capturePhase === 'recording' && recorder?.state === 'recording';
    if (isGuidedRecording && getPromptCompletionRatio(getActivePromptText(root), visibleTranscript) >= 0.96) {
      recorderState.set(root, { ...(recorderState.get(root) || {}), autoSaveOnStop: true });
      setCaptureStatus(root, 'Sentence complete · saving…', 'saving');
      stopRecording(root);
    }
  });

  recognition.addEventListener('error', () => {
    setText(root, '[data-model-voice-training-live-transcript]', 'Live transcript paused. Audio capture can still be saved.');
  });

  try {
    recognition.start();
  } catch (_) {
    return null;
  }

  return recognition;
}

function stopLiveTranscription(state = {}) {
  try {
    state.recognition?.stop?.();
  } catch (_) {
    // Browser speech recognition may already be stopped.
  }
}

async function startRecording(root) {
  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
    setStatus(root, 'Microphone recording is not available in this browser.', 'warning');
    setCaptureStatus(root, 'Microphone recording is not available in this browser.', 'warning');
    return;
  }

  setCaptureStatus(root, 'Requesting microphone permission…');
  let stream = null;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (error) {
    console.warn('[Neuroartan][Model Voice] Microphone permission failed.', error);
    setCaptureStatus(root, 'Microphone permission was not granted.', 'warning');
    return;
  }

  const chunks = [];
  const recorder = new MediaRecorder(stream);
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  const audioContext = typeof AudioContextClass === 'function' ? new AudioContextClass() : null;
  const source = audioContext?.createMediaStreamSource?.(stream) || null;
  const analyser = audioContext?.createAnalyser?.() || null;
  if (source && analyser) {
    analyser.fftSize = 2048;
    source.connect(analyser);
  }
  const recognition = startLiveTranscription(root);
  recorderState.set(root, {
    recorder,
    chunks,
    stream,
    file: null,
    audioContext,
    source,
    analyser,
    recognition,
    transcriptionAvailable: Boolean(recognition),
    waveformBuffer: analyser ? new Uint8Array(analyser.fftSize) : null,
  });
  if (analyser) drawWaveform(root);

  recorder.addEventListener('dataavailable', (event) => {
    if (event.data?.size) chunks.push(event.data);
  });
  recorder.addEventListener('stop', () => {
    const currentState = recorderState.get(root) || {};
    const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
    const file = new File([blob], `voice-sample-${Date.now()}.webm`, { type: blob.type || 'audio/webm' });
    recorderState.set(root, { ...currentState, file, recorder: null });
    stream.getTracks().forEach((track) => track.stop());
    stopLiveTranscription(currentState);
    clearWaveform(root);
    currentState.audioContext?.close?.();
    setCaptureStatus(root, `Captured · ${Math.round(file.size / 1024)} KB`, 'captured');
    const validation = validateGuidedCapture(root);
    if (!validation.accepted) {
      recorderState.set(root, {});
      setCaptureStatus(root, `Retry required · ${Math.round(validation.score * 100)}% prompt match`, 'warning');
      setCapturePhase(root, 'idle');
      return;
    }
    setCapturePhase(root, 'captured');
    const shouldAutoSaveGuidedCapture = getVoiceUiState(root).captureMode === 'guided'
      && !currentState.closeRequested
      && (currentState.autoSaveOnStop || !currentState.transcriptionAvailable);
    if (shouldAutoSaveGuidedCapture) {
      void saveCurrentSample(root);
    }
  });

  recorder.start();
  setCaptureStatus(root, 'Recording…');
  setCapturePhase(root, 'recording');
}

function stopRecording(root) {
  const state = recorderState.get(root);
  if (state?.recorder?.state === 'recording') {
    state.recorder.stop();
    return;
  }
  if (state?.stream) state.stream.getTracks().forEach((track) => track.stop());
  stopLiveTranscription(state);
  clearWaveform(root);
  state?.audioContext?.close?.();
}

async function saveCurrentSample(root) {
  const sampleOrigin = normalizeString(getControl(root, 'sampleOrigin')?.value || 'guided_recording');
  const emotionalTone = normalizeString(getControl(root, 'emotionalTone')?.value || 'neutral');
  const selectedPrompt = getSelectedPrompt(root);
  const transcriptText = normalizeString(getControl(root, 'transcriptText')?.value) || getVoiceUiState(root).liveTranscript;
  const audioReference = normalizeString(getControl(root, 'audioReference')?.value);
  const selectedFile = getControl(root, 'audioFile')?.files?.[0] || null;
  const recordedFile = recorderState.get(root)?.file || null;
  const file = sampleOrigin === 'guided_recording' ? recordedFile : sampleOrigin === 'audio_file' ? selectedFile : null;

  if (sampleOrigin !== 'external_reference' && !file) {
    setStatus(root, sampleOrigin === 'audio_file' ? 'Choose an audio file before saving.' : 'Record a guided sample before saving.', 'warning');
    return;
  }
  if (sampleOrigin === 'external_reference' && !audioReference) {
    setStatus(root, 'Add a private audio reference before saving.', 'warning');
    return;
  }

  setStatus(root, 'Saving voice sample…');
  setCapturePhase(root, 'saving');
  try {
    await saveModelVoiceTrainingSample({
      file,
      audioReference,
      sampleOrigin,
      emotionalTone,
      promptId: selectedPrompt.id,
      promptText: selectedPrompt.text,
      transcriptText,
      sampleTitle: `${TONE_LABELS[emotionalTone] || titleCase(emotionalTone)} voice sample`,
      metadata: {
        capture_mode: getVoiceUiState(root).captureMode,
        transcript_match_score: scoreTranscriptMatch(selectedPrompt.text, transcriptText),
        prompt_label: selectedPrompt.label,
        voice_training_surface: 'foundation_voice',
      },
    });
    const nextPromptIndex = getVoiceUiState(root).livePromptIndex + 1;
    recorderState.set(root, {});
    setVoiceUiState(root, { livePromptIndex: nextPromptIndex, liveTranscript: '' });
    if (getControl(root, 'audioFile')) getControl(root, 'audioFile').value = '';
    if (getControl(root, 'audioReference')) getControl(root, 'audioReference').value = '';
    if (getControl(root, 'transcriptText')) getControl(root, 'transcriptText').value = '';
    setCaptureStatus(root, 'No recording captured');
    setText(root, '[data-model-voice-training-file-status]', 'No audio selected');
    queryVoice(root, '[data-model-voice-training-close-confirmation]')?.setAttribute('hidden', '');
    applyLivePrompt(root, nextPromptIndex);
    setCapturePhase(root, 'idle');
    document.dispatchEvent(new CustomEvent('model:voice-training-updated'));
    await hydrateVoiceTraining(root);
    setStatus(root, 'Voice sample saved.');
  } catch (error) {
    console.warn('[Neuroartan][Model Voice] Sample save failed.', error);
    setCapturePhase(root, 'captured');
    setStatus(root, 'Voice sample could not be saved.', 'warning');
  }
}

function clearCurrentCapture(root) {
  stopRecording(root);
  recorderState.set(root, {});
  setVoiceUiState(root, { liveTranscript: '' });
  setCaptureStatus(root, 'Ready for capture');
  setText(root, '[data-model-voice-training-live-transcript]', 'Transcript appears here when browser speech recognition is available.');
  setText(root, '[data-model-voice-training-validation]', '');
  setElementHidden(queryVoice(root, '[data-model-voice-training-validation]'), true);
  queryVoice(root, '[data-model-voice-training-close-confirmation]')?.setAttribute('hidden', '');
  setCapturePhase(root, 'idle');
}

function previousGuidedPrompt(root) {
  const state = getVoiceUiState(root);
  if (state.captureMode !== 'guided' || state.livePromptIndex <= 0) return;
  clearCurrentCapture(root);
  applyLivePrompt(root, state.livePromptIndex - 1);
  setCapturePhase(root, 'idle');
}

function bindVoiceTraining(root) {
  root.querySelectorAll('[data-model-voice-training-close-live]').forEach((control) => {
    control.addEventListener('click', () => {
      closeWorkspace(root, '[data-model-voice-training-live-overlay]');
    });
  });

  root.querySelectorAll('[data-model-voice-training-close-samples]').forEach((control) => {
    control.addEventListener('click', () => {
      closeWorkspace(root, '[data-model-voice-training-samples-overlay]');
    });
  });

  root.querySelectorAll('[data-model-voice-training-close-fine-tune]').forEach((control) => {
    control.addEventListener('click', () => {
      closeWorkspace(root, '[data-model-voice-training-fine-tune-overlay]');
    });
  });

  root.addEventListener('change', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    if (target.matches('[data-model-voice-training-field="sampleOrigin"]')) {
      syncIntakeVisibility(root);
      updateDropdownLabels(root);
      return;
    }

    if (target.matches('[data-model-voice-training-field="promptId"]')) {
      updateToneFromPrompt(root);
      updateDropdownLabels(root);
      return;
    }

    if (target.matches('[data-model-voice-training-field="emotionalTone"]')) {
      updateDropdownLabels(root);
      return;
    }

    if (target.matches('[data-model-voice-training-field="audioFile"]')) {
      const file = target instanceof HTMLInputElement ? target.files?.[0] : null;
      setText(root, '[data-model-voice-training-file-status]', file ? file.name : 'No audio selected');
    }

    if (target.matches('[data-model-voice-training-fine-tune-control]')) {
      writeStoredFineTuneControls(root);
    }
  });

  root.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;

    if (target.closest('[data-model-voice-training-open-live]')) {
      applyLivePrompt(root);
      openWorkspace(root, '[data-model-voice-training-live-overlay]');
      return;
    }

    if (target.closest('[data-model-voice-training-open-file]')) {
      const originControl = getControl(root, 'sampleOrigin');
      if (originControl instanceof HTMLSelectElement) originControl.value = 'audio_file';
      syncIntakeVisibility(root);
      updateDropdownLabels(root);
      const intake = root.querySelector('[data-model-voice-training-intake]');
      setElementHidden(intake, false);
      getControl(root, 'audioFile')?.click();
      return;
    }

    if (target.closest('[data-model-voice-training-close-live]')) {
      closeWorkspace(root, '[data-model-voice-training-live-overlay]');
      return;
    }

    if (target.closest('[data-model-voice-training-close-samples]')) {
      closeWorkspace(root, '[data-model-voice-training-samples-overlay]');
      return;
    }

    if (target.closest('[data-model-voice-training-close-fine-tune]')) {
      closeWorkspace(root, '[data-model-voice-training-fine-tune-overlay]');
      return;
    }

    if (target.closest('[data-model-voice-training-record]')) {
      void startRecording(root);
      return;
    }

    const modeButton = target.closest('[data-model-voice-training-mode-toggle]');
    if (modeButton instanceof HTMLElement) {
      const nextMode = modeButton.dataset.modelVoiceTrainingMode === 'guided' ? 'casual' : 'guided';
      setCaptureMode(root, nextMode);
      return;
    }

    if (target.closest('[data-model-voice-training-stop]')) {
      stopRecording(root);
      return;
    }

    if (target.closest('[data-model-voice-training-reset-capture]')) {
      clearCurrentCapture(root);
      return;
    }

    if (target.closest('[data-model-voice-training-previous-step]')) {
      previousGuidedPrompt(root);
      return;
    }

    if (target.closest('[data-model-voice-training-file-picker]')) {
      getControl(root, 'audioFile')?.click();
      return;
    }

    if (target.closest('[data-model-voice-training-save]')) {
      void saveCurrentSample(root);
      return;
    }

    if (target.closest('[data-model-voice-training-save-recording]')) {
      void saveCurrentSample(root);
      return;
    }

    if (target.closest('[data-model-voice-training-save-draft]')) {
      void saveCurrentSample(root).then(() => closeWorkspace(root, '[data-model-voice-training-live-overlay]', { force: true }));
      return;
    }

    if (target.closest('[data-model-voice-training-restart-capture]')) {
      clearCurrentCapture(root);
      return;
    }

    if (target.closest('[data-model-voice-training-discard-capture]')) {
      clearCurrentCapture(root);
      closeWorkspace(root, '[data-model-voice-training-live-overlay]', { force: true });
      return;
    }

    const removeButton = target.closest('[data-model-voice-training-remove]');
    if (removeButton instanceof HTMLElement) {
      const sampleId = normalizeString(removeButton.dataset.modelVoiceTrainingRemove);
      if (!sampleId) return;
      setStatus(root, 'Removing voice sample…');
      void removeModelVoiceTrainingSample(sampleId)
        .then(() => hydrateVoiceTraining(root))
        .then(() => setStatus(root, 'Voice sample removed.'))
        .catch((error) => {
          console.warn('[Neuroartan][Model Voice] Sample removal failed.', error);
          setStatus(root, 'Voice sample could not be removed.', 'warning');
      });
    }
  });

  document.addEventListener('model:voice-samples-open-request', () => {
    openWorkspace(root, '[data-model-voice-training-samples-overlay]');
  });

  document.addEventListener('model:voice-fine-tune-open-request', () => {
    openWorkspace(root, '[data-model-voice-training-fine-tune-overlay]');
  });

  document.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target?.closest('.model-voice-training__workspace')) return;

    if (target.closest('[data-model-voice-training-close-live]')) {
      event.preventDefault();
      event.stopPropagation();
      closeWorkspace(root, '[data-model-voice-training-live-overlay]');
      return;
    }

    if (target.closest('[data-model-voice-training-close-samples]')) {
      event.preventDefault();
      event.stopPropagation();
      closeWorkspace(root, '[data-model-voice-training-samples-overlay]');
      return;
    }

    if (target.closest('[data-model-voice-training-close-fine-tune]')) {
      event.preventDefault();
      event.stopPropagation();
      closeWorkspace(root, '[data-model-voice-training-fine-tune-overlay]');
    }
  }, true);

  document.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target?.closest('.model-voice-training__workspace')) return;

    if (target.closest('[data-model-voice-training-record]')) {
      void startRecording(root);
      return;
    }

    if (target.closest('[data-model-voice-training-stop]')) {
      stopRecording(root);
      return;
    }

    if (target.closest('[data-model-voice-training-reset-capture]')) {
      clearCurrentCapture(root);
      return;
    }

    if (target.closest('[data-model-voice-training-previous-step]')) {
      previousGuidedPrompt(root);
      return;
    }

    if (target.closest('[data-model-voice-training-save-recording]')) {
      void saveCurrentSample(root);
      return;
    }

    const modeButton = target.closest('[data-model-voice-training-mode-toggle]');
    if (modeButton instanceof HTMLElement) {
      const nextMode = modeButton.dataset.modelVoiceTrainingMode === 'guided' ? 'casual' : 'guided';
      setCaptureMode(root, nextMode);
      return;
    }

    if (target.closest('[data-model-voice-training-save-draft]')) {
      void saveCurrentSample(root).then(() => closeWorkspace(root, '[data-model-voice-training-live-overlay]', { force: true }));
      return;
    }

    if (target.closest('[data-model-voice-training-restart-capture]')) {
      clearCurrentCapture(root);
      return;
    }

    if (target.closest('[data-model-voice-training-discard-capture]')) {
      clearCurrentCapture(root);
      closeWorkspace(root, '[data-model-voice-training-live-overlay]', { force: true });
      return;
    }

    const removeButton = target.closest('[data-model-voice-training-remove]');
    if (removeButton instanceof HTMLElement) {
      const sampleId = normalizeString(removeButton.dataset.modelVoiceTrainingRemove);
      if (!sampleId) return;
      setStatus(root, 'Removing voice sample…');
      void removeModelVoiceTrainingSample(sampleId)
        .then(() => hydrateVoiceTraining(root))
        .then(() => setStatus(root, 'Voice sample removed.'))
        .catch((error) => {
          console.warn('[Neuroartan][Model Voice] Sample removal failed.', error);
          setStatus(root, 'Voice sample could not be removed.', 'warning');
        });
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeAllWorkspaces(root);
  });
}

function restoreStoredWorkspace(root) {
  const selector = readStoredWorkspace();
  if (!selector || !selector.startsWith('[data-model-voice-training-')) return;
  if (selector === '[data-model-voice-training-live-overlay]') {
    writeStoredWorkspace('');
    return;
  }
  window.requestAnimationFrame(() => {
    openWorkspace(root, selector);
  });
}

export function mountModelVoiceTraining(root) {
  if (!(root instanceof HTMLElement) || mountedRoots.has(root)) return;
  mountedRoots.add(root);
  populatePromptSelect(root);
  updateToneFromPrompt(root);
  updateDropdownLabels(root);
  syncIntakeVisibility(root);
  bindVoiceTraining(root);
  void hydrateVoiceTraining(root);
  restoreStoredWorkspace(root);
}
