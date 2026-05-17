const HOME_INTERACTION_PANEL_STATE = {
  isBound: false,
  mode: 'idle',
  route: '',
};

function getHomeInteractionPanelStateNodes() {
  return {
    root: document.querySelector('#home-interaction-panel'),
    input: document.querySelector('#home-interaction-panel-input'),
    submit: document.querySelector('#home-interaction-panel-submit'),
    submitLabel: document.querySelector('[data-home-interaction-submit-label]'),
    submitIcon: document.querySelector('[data-home-interaction-submit-icon] img'),
    settingsButton: document.querySelector('[data-home-interaction-settings-open="true"]'),
    voiceButton: document.querySelector('#home-interaction-panel-submit'),
  };
}

function normalizeHomeInteractionMode(value) {
  return typeof value === 'string' && value.trim() ? value.trim().toLowerCase() : 'idle';
}

function normalizeHomeInteractionRoute(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function hasHomeInteractionTypedInput(input) {
  return input instanceof HTMLTextAreaElement && input.value.trim().length > 0;
}

function getHomeInteractionStateCopy(hasTypedInput = false) {
  switch (HOME_INTERACTION_PANEL_STATE.mode) {
    case 'listening':
      return {
        voiceLabel: 'Stop listening',
        submitLabel: 'Listening',
        submitDisabled: true,
        submitIntent: 'listening',
        submitIcon: '/registry/icons/public/assets/system/states/loading.svg',
      };
    case 'thinking':
      return {
        voiceLabel: 'Voice input',
        submitLabel: 'Thinking',
        submitDisabled: true,
        submitIntent: 'thinking',
        submitIcon: '/registry/icons/public/assets/system/states/loading.svg',
      };
    case 'responding':
      if (hasTypedInput) {
        return {
          voiceLabel: 'Voice input',
          submitLabel: 'Send',
          submitDisabled: false,
          submitIntent: 'submit',
          submitIcon: '/registry/icons/public/assets/core/actions/send/send.svg',
        };
      }

      return {
        voiceLabel: 'Voice input',
        submitLabel: 'Reset',
        submitDisabled: false,
        submitIntent: 'reset',
        submitIcon: '/registry/icons/public/assets/core/actions/create/plus.svg',
      };
    default:
      return {
        voiceLabel: 'Voice input',
        submitLabel: 'Send',
        submitDisabled: false,
        submitIntent: 'submit',
        submitIcon: '/registry/icons/public/assets/core/actions/send/send.svg',
      };
  }
}

function syncHomeInteractionPanelState() {
  const nodes = getHomeInteractionPanelStateNodes();
  if (!nodes.root) {
    return;
  }

  const copy = getHomeInteractionStateCopy(hasHomeInteractionTypedInput(nodes.input));
  nodes.root.setAttribute('data-home-interaction-mode', HOME_INTERACTION_PANEL_STATE.mode);
  nodes.root.setAttribute('data-home-interaction-submit-intent', copy.submitIntent);

  if (nodes.voiceButton) {
    nodes.voiceButton.setAttribute('aria-label', copy.voiceLabel);
  }

  if (nodes.submitLabel) {
    nodes.submitLabel.textContent = copy.submitLabel;
  }

  if (nodes.submitIcon instanceof HTMLImageElement && copy.submitIcon) {
    nodes.submitIcon.src = copy.submitIcon;
  }

  if (nodes.submit instanceof HTMLButtonElement) {
    nodes.submit.dataset.homeInteractionSubmitIntent = copy.submitIntent;
    nodes.submit.setAttribute('aria-label', copy.submitLabel);
    nodes.submit.disabled = copy.submitDisabled;
  }
}

function bindHomeInteractionPanelState() {
  document.addEventListener('neuroartan:home-stage-voice-mode', (event) => {
    HOME_INTERACTION_PANEL_STATE.mode = normalizeHomeInteractionMode(event?.detail?.mode);
    syncHomeInteractionPanelState();
  });

  document.addEventListener('neuroartan:home-stage-query-routing', (event) => {
    HOME_INTERACTION_PANEL_STATE.route = normalizeHomeInteractionRoute(event?.detail?.route);
    syncHomeInteractionPanelState();
  });

  document.addEventListener('neuroartan:home-stage-routing-resolved', (event) => {
    HOME_INTERACTION_PANEL_STATE.route = normalizeHomeInteractionRoute(event?.detail?.route);
    syncHomeInteractionPanelState();
  });

  document.addEventListener('neuroartan:home-stage-reset-requested', () => {
    HOME_INTERACTION_PANEL_STATE.mode = 'idle';
    HOME_INTERACTION_PANEL_STATE.route = '';
    syncHomeInteractionPanelState();
  });

  document.addEventListener('input', (event) => {
    const input = event.target instanceof Element
      ? event.target.closest('#home-interaction-panel-input')
      : null;

    if (!(input instanceof HTMLTextAreaElement)) {
      return;
    }

    syncHomeInteractionPanelState();
  });

  document.addEventListener('submit', (event) => {
    const form = event.target instanceof Element
      ? event.target.closest('#home-interaction-panel-form')
      : null;

    if (!form) {
      return;
    }

    const nodes = getHomeInteractionPanelStateNodes();
    const submitIntent = nodes.submit instanceof HTMLButtonElement
      ? nodes.submit.dataset.homeInteractionSubmitIntent
      : 'submit';

    if (submitIntent !== 'reset') {
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();

    if (nodes.input instanceof HTMLTextAreaElement) {
      nodes.input.value = '';
      nodes.input.style.height = 'auto';
      nodes.input.dispatchEvent(new Event('input', { bubbles: true }));
      nodes.input.focus();
    }

    HOME_INTERACTION_PANEL_STATE.mode = 'idle';
    HOME_INTERACTION_PANEL_STATE.route = '';

    if (nodes.submit instanceof HTMLButtonElement) {
      nodes.submit.dataset.homeInteractionSubmitIntent = 'submit';
    }

    document.dispatchEvent(
      new CustomEvent('neuroartan:home-stage-reset-requested', {
        detail: {
          source: 'home-interaction-panel-reset',
        },
      })
    );

    syncHomeInteractionPanelState();
  });
}

function bootHomeInteractionPanelState() {
  const { root } = getHomeInteractionPanelStateNodes();
  if (!root) {
    return;
  }

  syncHomeInteractionPanelState();

  if (HOME_INTERACTION_PANEL_STATE.isBound) {
    return;
  }

  HOME_INTERACTION_PANEL_STATE.isBound = true;
  bindHomeInteractionPanelState();
}

document.addEventListener('fragment:mounted', (event) => {
  if (event?.detail?.name !== 'home-interaction-panel') return;
  bootHomeInteractionPanelState();
});

document.addEventListener('neuroartan:runtime-ready', () => {
  bootHomeInteractionPanelState();
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootHomeInteractionPanelState, { once: true });
} else {
  bootHomeInteractionPanelState();
}
