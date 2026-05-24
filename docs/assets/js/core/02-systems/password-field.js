/* =============================================================================
   00) FILE INDEX
   01) MODULE IDENTITY
   02) CONSTANTS
   03) HELPERS
   04) FIELD ENHANCEMENT
   05) INITIALIZATION
   06) END OF FILE
============================================================================= */

/* =============================================================================
   01) MODULE IDENTITY
============================================================================= */
/* /website/docs/assets/js/core/02-systems/password-field.js */

/* =============================================================================
   02) CONSTANTS
============================================================================= */
const MODULE_ID = 'core-password-field';
const RUNTIME_FLAG = 'corePasswordFieldReady';
const INPUT_SELECTOR = 'input[type="password"], input[data-password-visibility-input="true"]';
const WRAPPER_CLASS = 'ui-password-field';
const INPUT_CLASS = 'ui-password-field__input';
const VALUE_CLASS = 'ui-password-field__value';
const TOGGLE_CLASS = 'ui-password-field__toggle';
const ICON_CLASS = 'ui-password-field__toggle-icon ui-icon-theme-aware';
const ICON_SHOW = '/registry/icons/public/assets/core/identity/access/visibility-on.svg';
const ICON_HIDE = '/registry/icons/public/assets/core/identity/access/visibility-off.svg';

/* =============================================================================
   03) HELPERS
============================================================================= */
function getRuntime() {
  return (window.__NEURO_MAIN_RUNTIME__ ||= {});
}

function hasRuntimeFlag() {
  return !!getRuntime()[RUNTIME_FLAG];
}

function setRuntimeFlag() {
  getRuntime()[RUNTIME_FLAG] = true;
}

function isPasswordInput(node) {
  return node instanceof HTMLInputElement
    && (node.type === 'password' || node.dataset.passwordVisibilityInput === 'true')
    && node.type !== 'hidden';
}

function createIcon(src) {
  const icon = document.createElement('img');
  icon.className = ICON_CLASS;
  icon.src = src;
  icon.alt = '';
  icon.setAttribute('aria-hidden', 'true');
  return icon;
}

function createValueMirror() {
  const mirror = document.createElement('span');
  mirror.className = VALUE_CLASS;
  mirror.setAttribute('aria-hidden', 'true');
  return mirror;
}

function isPasswordVisible(input) {
  const wrapper = input.closest(`.${WRAPPER_CLASS}`);
  return wrapper instanceof HTMLElement && wrapper.dataset.passwordVisible === 'true';
}

function updateToggleState(input, toggle) {
  const wrapper = input.closest(`.${WRAPPER_CLASS}`);
  const visible = isPasswordVisible(input);
  const hasValue = input.value.length > 0;
  const mirror = wrapper?.querySelector(`.${VALUE_CLASS}`);
  const icon = toggle.querySelector('img');

  input.dataset.passwordVisible = visible ? 'true' : 'false';
  toggle.setAttribute('aria-label', visible ? 'Hide password' : 'Show password');
  toggle.setAttribute('aria-pressed', visible ? 'true' : 'false');
  toggle.title = visible ? 'Hide password' : 'Show password';

  if (wrapper instanceof HTMLElement) {
    wrapper.dataset.passwordHasValue = hasValue ? 'true' : 'false';
    wrapper.dataset.passwordVisible = visible && hasValue ? 'true' : 'false';
  }

  if (mirror instanceof HTMLElement) {
    mirror.textContent = hasValue ? input.value : '';
  }

  if (icon instanceof HTMLImageElement) {
    icon.src = visible ? ICON_HIDE : ICON_SHOW;
  }
}

function bindPasswordInputEvents(input, toggle) {
  const sync = () => {
    if (!input.value && input.type === 'text') {
      try {
        input.type = 'password';
      } catch (_) {}
    }

    updateToggleState(input, toggle);
  };

  input.addEventListener('input', sync);
  input.addEventListener('change', sync);
  input.addEventListener('focus', sync);
  window.setTimeout(sync, 120);
}

function togglePasswordVisibility(input, toggle) {
  const wrapper = input.closest(`.${WRAPPER_CLASS}`);
  if (!(wrapper instanceof HTMLElement)) return;

  wrapper.dataset.passwordVisible = wrapper.dataset.passwordVisible === 'true' ? 'false' : 'true';
  updateToggleState(input, toggle);
}

/* =============================================================================
   04) FIELD ENHANCEMENT
============================================================================= */
function enhancePasswordInput(input) {
  if (!isPasswordInput(input)) return;
  if (input.dataset.passwordVisibilityEnhanced === 'true') return;

  const existingWrapper = input.closest(`.${WRAPPER_CLASS}`);
  const wrapper = existingWrapper || document.createElement('span');

  if (!existingWrapper) {
    input.parentNode?.insertBefore(wrapper, input);
    wrapper.append(input);
  }

  wrapper.classList.add(WRAPPER_CLASS);
  input.classList.add(INPUT_CLASS);
  input.dataset.passwordVisibilityInput = 'true';
  input.dataset.passwordVisibilityEnhanced = 'true';

  const toggle = document.createElement('button');
  const mirror = createValueMirror();
  toggle.type = 'button';
  toggle.className = TOGGLE_CLASS;
  toggle.dataset.passwordVisibilityToggle = 'true';
  toggle.append(createIcon(ICON_SHOW));
  toggle.addEventListener('pointerdown', (event) => event.preventDefault());
  toggle.addEventListener('mousedown', (event) => event.preventDefault());
  toggle.addEventListener('click', () => togglePasswordVisibility(input, toggle));

  wrapper.append(mirror, toggle);
  bindPasswordInputEvents(input, toggle);
  updateToggleState(input, toggle);
}

function scanPasswordInputs(root = document) {
  if (isPasswordInput(root)) {
    enhancePasswordInput(root);
    return;
  }

  if (!(root instanceof Document) && !(root instanceof Element)) return;

  root
    .querySelectorAll(INPUT_SELECTOR)
    .forEach(enhancePasswordInput);
}

function observePasswordInputs() {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach(scanPasswordInputs);
    });
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });
}

/* =============================================================================
   05) INITIALIZATION
============================================================================= */
function initialize() {
  if (hasRuntimeFlag()) return;
  setRuntimeFlag();
  scanPasswordInputs();
  observePasswordInputs();
  document.dispatchEvent(new CustomEvent('neuroartan:system-ready', {
    detail: { module: MODULE_ID }
  }));
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize, { once: true });
} else {
  initialize();
}

/* =============================================================================
   06) END OF FILE
============================================================================= */
