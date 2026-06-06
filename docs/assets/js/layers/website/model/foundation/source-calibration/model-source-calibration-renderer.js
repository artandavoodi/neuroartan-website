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

  if (profileStatus) {
    profileStatus.textContent = getSourceProfileStatusText(state);
  }

  if (orientationIndex) {
    orientationIndex.textContent = getSourceOrientationIndexText(state);
  }

  if (readiness) {
    readiness.textContent = getSourceReadinessText(state);
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
  const labels = state.scale?.scale?.labels || {};

  questionRoot.innerHTML = `
    <div class="model-source-calibration__progress" aria-label="Source Calibration progress">
      <span>${escapeSourceText(progress.current || 0)} of ${escapeSourceText(progress.total || 0)}</span>
      <span>${escapeSourceText(progress.percent || 0)}%</span>
    </div>
    <div class="model-source-calibration__progress-bar" aria-hidden="true">
      <span style="inline-size:${Math.max(0, Math.min(100, Number(progress.percent || 0)))}%"></span>
    </div>
    <p class="model-source-calibration__question-text">${escapeSourceText(question.text)}</p>
    <div class="model-source-calibration__scale-labels" aria-hidden="true">
      <span>${escapeSourceText(labels.left || 'Strongly disagree')}</span>
      <span>${escapeSourceText(labels.middle || 'Uncertain')}</span>
      <span>${escapeSourceText(labels.right || 'Strongly agree')}</span>
    </div>
    <input
      class="model-source-calibration__slider"
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
      <button class="model-management__button" type="button" data-model-source-calibration-previous ${progress.current <= 1 ? 'disabled' : ''}>Previous</button>
      <button class="model-management__button" type="button" data-model-source-calibration-next>${progress.current >= progress.total ? 'Complete' : 'Next'}</button>
    </div>
  `;
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

  const orientation = resultsRegistry?.orientation_bands?.[result.dominant_orientation];
  const readinessLabel = titleCaseSourceText(result.source_readiness || 'initial');

  resultRoot.innerHTML = `
    <h5 class="model-source-calibration__result-title">Source Readiness Summary</h5>
    <dl class="model-management__card-grid">
      <div class="model-management__card">
        <dt>Cognitive Orientation Index</dt>
        <dd>${escapeSourceText(result.cognitive_orientation_index)}</dd>
      </div>
      <div class="model-management__card">
        <dt>Dominant Orientation</dt>
        <dd>${escapeSourceText(orientation?.label || SOURCE_ORIENTATION_LABELS[result.dominant_orientation] || 'Unclassified')}</dd>
      </div>
      <div class="model-management__card">
        <dt>Source Readiness</dt>
        <dd>${escapeSourceText(readinessLabel)}</dd>
      </div>
    </dl>
    <p class="model-management__section-copy">${escapeSourceText(result.source_readiness_summary || '')}</p>
  `;
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

function getSourceCalibrationStatusText(state) {
  if (state.status === 'loading') return 'Loading Source Calibration registry.';
  if (state.status === 'ready') return 'Question registry loaded. Source Calibration is ready to begin.';
  if (state.status === 'active') return 'Answer each calibration prompt using the slider.';
  if (state.status === 'complete') return 'Source Calibration complete. Results are ready for review.';
  if (state.status === 'error') return state.error?.message || 'Source Calibration is unavailable.';

  return 'Question registry, scoring engine, persistence, and audit integration are pending implementation.';
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