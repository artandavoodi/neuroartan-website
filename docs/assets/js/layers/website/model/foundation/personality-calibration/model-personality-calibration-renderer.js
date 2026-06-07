// MARK: - Personality Calibration Renderer
// Uses Source Calibration UI primitives as the canonical assessment system.

export function renderPersonalityCalibrationQuestion({
  question,
  index = 0,
  total = 0,
  value = 5,
} = {}) {
  const article = document.createElement('article');
  article.className = 'model-source-calibration__question';
  article.dataset.modelPersonalityCalibrationQuestion = question?.id || '';

  const title = document.createElement('h3');
  title.className = 'model-source-calibration__question-text';
  title.textContent = question?.displayText || question?.text || 'Personality Calibration question unavailable.';

  const slider = document.createElement('div');
  slider.className = 'model-source-calibration__slider';

  const input = document.createElement('input');
  input.className = 'ui-slider model-source-calibration__slider-input';
  input.type = 'range';
  input.min = '0';
  input.max = '10';
  input.step = '0.1';
  input.value = String(value);
  input.dataset.modelPersonalityCalibrationRange = question?.id || '';
  input.dataset.questionId = question?.id || '';

  const indicators = document.createElement('div');
  indicators.className = 'model-source-calibration__scale-indicators';
  indicators.innerHTML = `
    <span class="model-source-calibration__scale-indicator model-source-calibration__scale-indicator--disagree" aria-hidden="true"></span>
    <span class="model-source-calibration__scale-indicator model-source-calibration__scale-indicator--uncertain" aria-hidden="true"></span>
    <span class="model-source-calibration__scale-indicator model-source-calibration__scale-indicator--agree" aria-hidden="true"></span>
  `;

  const actions = document.createElement('div');
  actions.className = 'model-source-calibration__actions';

  const previous = document.createElement('button');
  previous.type = 'button';
  previous.className = 'ui-button ui-button--secondary model-source-calibration__previous';
  previous.dataset.modelPersonalityCalibrationPrevious = '';
  previous.textContent = 'Previous';
  previous.disabled = index <= 0;

  actions.append(previous);
  slider.append(indicators, input);
  article.append(title, slider, actions);

  return article;
}

export function renderPersonalityCalibrationSummary(result = {}) {
  return createPersonalityCalibrationAssessmentShell('Recalibrate Personality');
}

export function renderPersonalityCalibrationIntro() {
  return createPersonalityCalibrationAssessmentShell('Start Personality Calibration');
}

// MARK: - Internals

function createPersonalityCalibrationAssessmentShell(buttonLabel = 'Start Personality Calibration') {
  const fragment = document.createDocumentFragment();

  const status = document.createElement('p');
  status.className = 'model-management__section-copy';
  status.dataset.modelPersonalityCalibrationStatus = '';
  status.hidden = true;

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'model-management__button';
  button.dataset.modelPersonalityCalibrationStart = '';
  button.textContent = buttonLabel;

  fragment.append(status, button);
  return fragment;
}
