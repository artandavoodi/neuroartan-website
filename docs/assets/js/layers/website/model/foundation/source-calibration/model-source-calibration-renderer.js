// MARK: - Source Calibration Renderer

const SOURCE_ORIENTATION_LABELS = Object.freeze({
  externalized_control: 'Externalized Control',
  reflective_agency: 'Reflective Agency',
  integrated_regulation: 'Integrated Regulation',
});

// MARK: - Public API

export function renderSourceCalibrationStatus(root, state = {}) {
  if (!root) return;

  const profileStatus = root.querySelector('[data-model-source-profile-status]');
  const orientationIndex = root.querySelector('[data-model-source-orientation-index]');
  const readiness = root.querySelector('[data-model-source-readiness]');
  const status = root.querySelector('[data-model-source-calibration-status]');
  const startButton = root.querySelector('[data-model-source-calibration-start]');

  const profileStatusDot = root.querySelector('[data-model-source-profile-status-dot]');
  const orientationIndexDot = root.querySelector('[data-model-source-orientation-index-dot]');
  const readinessDot = root.querySelector('[data-model-source-readiness-dot]');

  if (profileStatus) {
    profileStatus.textContent = getSourceProfileStatusText(state);
  }

  if (profileStatusDot) {
    profileStatusDot.dataset.status = getSourceProfileStatusToken(state);
  }

  if (orientationIndex) {
    orientationIndex.textContent = getSourceOrientationIndexText(state);
  }

  if (orientationIndexDot) {
    orientationIndexDot.dataset.status = getSourceOrientationIndexStatusToken(state);
  }

  if (readiness) {
    readiness.textContent = getSourceReadinessText(state);
  }

  if (readinessDot) {
    readinessDot.dataset.status = getSourceReadinessStatusToken(state);
  }

  if (status) {
    status.textContent = getSourceCalibrationStatusText(state);
  }

  if (startButton) {
    startButton.disabled = state.status !== 'ready' && state.status !== 'complete';
    startButton.textContent = state.status === 'complete' ? 'Recalibrate Source' : 'Start Source Calibration';
  }
}

export function renderSourceCalibrationQuestion(root, state = {}, question = null, progress = {}) {
  const assessmentRoot = root?.querySelector('[data-model-source-calibration-assessment]');
  if (!assessmentRoot || !question) return;

  let questionRoot = assessmentRoot.querySelector('[data-model-source-calibration-question]');

  if (!questionRoot) {
    questionRoot = document.createElement('div');
    questionRoot.className = 'model-source-calibration__question';
    questionRoot.dataset.modelSourceCalibrationQuestion = '';
    assessmentRoot.appendChild(questionRoot);
  }

  const currentValue = state.answers?.[question.id] ?? state.scale?.scale?.default ?? 5;

  questionRoot.innerHTML = `
    <p class="model-source-calibration__question-text">${escapeSourceText(question.text)}</p>
    <div class="model-source-calibration__scale-indicators" aria-hidden="true">
      <span class="model-source-calibration__scale-indicator model-source-calibration__scale-indicator--disagree"></span>
      <span class="model-source-calibration__scale-indicator model-source-calibration__scale-indicator--uncertain"></span>
      <span class="model-source-calibration__scale-indicator model-source-calibration__scale-indicator--agree"></span>
    </div>
    <input
      class="ui-slider model-source-calibration__slider"
      type="range"
      min="${escapeSourceText(state.scale?.scale?.min ?? 0)}"
      max="${escapeSourceText(state.scale?.scale?.max ?? 10)}"
      step="${escapeSourceText(state.scale?.scale?.step ?? 1)}"
      value="${escapeSourceText(currentValue)}"
      data-model-source-calibration-answer
      data-question-id="${escapeSourceText(question.id)}"
      aria-label="${escapeSourceText(question.text)}"
    />
    <div class="model-source-calibration__actions">
      <button class="ui-button ui-button--secondary" type="button" data-model-source-calibration-previous ${progress.current <= 1 ? 'disabled' : ''}>Previous</button>
    </div>
  `;

  document.dispatchEvent(new CustomEvent('model:source-calibration-progress-updated', {
    detail: {
      percent: Math.max(0, Math.min(100, Number(progress.percent || 0))),
    },
  }));
}

export function renderSourceCalibrationResult(root, result = null, resultsRegistry = null) {
  const assessmentRoot = root?.querySelector('[data-model-source-calibration-assessment]');
  if (!assessmentRoot || !result) return;

  let resultRoot = assessmentRoot.querySelector('[data-model-source-calibration-result]');

  if (!resultRoot) {
    resultRoot = document.createElement('section');
    resultRoot.className = 'model-source-calibration__result';
    resultRoot.dataset.modelSourceCalibrationResult = '';
    assessmentRoot.appendChild(resultRoot);
  }

  resultRoot.innerHTML = '';
  resultRoot.hidden = true;
}

export function clearSourceCalibrationQuestion(root) {
  root?.querySelector('[data-model-source-calibration-question]')?.remove();
}

// MARK: - Text Helpers

function getSourceProfileStatusText(state) {
  if (state.status === 'complete') return 'Calibrated';
  if (state.status === 'active') return 'Calibration in progress';
  if (state.status === 'ready') return 'Ready for calibration';
  if (state.status === 'error') return 'Calibration unavailable';
  return 'Not calibrated';
}

function getSourceOrientationIndexText(state) {
  const index = state.result?.cognitive_orientation_index;
  return index === undefined || index === null ? 'Pending assessment' : String(index);
}

function getSourceReadinessText(state) {
  return titleCaseSourceText(state.result?.source_readiness || 'Initial');
}

function getSourceProfileStatusToken(state) {
  if (state.status === 'complete') return 'calibrated';
  if (state.status === 'active') return state.draftSaved === true ? 'draft' : 'forming';
  if (state.status === 'ready') return 'ready';
  if (state.status === 'error') return 'error';

  return 'pending';
}

function getSourceOrientationIndexStatusToken(state) {
  const index = state.result?.cognitive_orientation_index;
  return index === undefined || index === null ? 'pending' : 'complete';
}

function getSourceReadinessStatusToken(state) {
  const readiness = String(state.result?.source_readiness || '').trim().toLowerCase();
  if (!readiness) return state.status === 'complete' ? 'complete' : 'initial';
  if (readiness === 'forming') return 'forming';
  if (readiness === 'stable' || readiness === 'calibrated' || readiness === 'ready') return 'stable';
  if (readiness === 'initial') return 'initial';

  return 'complete';
}

function getSourceCalibrationStatusText(state) {
  if (state.status === 'complete') return 'Source Profile saved. Open Summary to review details.';
  if (state.status === 'error') return state.error?.message || 'Source Calibration is unavailable.';

  return '';
}

function titleCaseSourceText(value) {
  return String(value || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function escapeSourceText(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}