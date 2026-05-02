/* =============================================================================
   00) FILE INDEX
   01) MODULE IDENTITY
   02) IMPORTS
   03) CONSTANTS
   04) FETCH HELPERS
   05) FORM RENDERING
   06) SUBMISSION
   07) INITIALIZATION
   08) END OF FILE
============================================================================= */

/* =============================================================================
   01) MODULE IDENTITY
============================================================================= */
/* /website/docs/assets/js/layers/website/models/create/model-create.js */

/* =============================================================================
   02) IMPORTS
============================================================================= */
import { createOwnedModel } from '../../system/model/model-store.js';

/* =============================================================================
   03) CONSTANTS
============================================================================= */
const SHELL_FRAGMENT_PATH = '/assets/fragments/layers/website/models/create/model-create-shell.html';
const MODEL_CREATION_SCHEMA_PATH = '/assets/data/models/model-creation-schema.json';

/* =============================================================================
   04) FETCH HELPERS
============================================================================= */
async function fetchText(path) {
  const response = await fetch(path, { credentials: 'same-origin' });
  if (!response.ok) throw new Error(`MODEL_CREATE_FRAGMENT_FETCH_FAILED:${path}`);
  return response.text();
}

async function fetchJson(path) {
  const response = await fetch(path, { credentials: 'same-origin' });
  if (!response.ok) throw new Error(`MODEL_CREATE_SCHEMA_FETCH_FAILED:${path}`);
  return response.json();
}

function setStatus(root, message) {
  const status = root?.querySelector('[data-model-create-status]');
  if (!status) return;
  status.textContent = message || '';
}

function normalizeString(value = '') {
  return String(value || '').trim();
}

/* =============================================================================
   05) FORM RENDERING
============================================================================= */
function createOption(option = {}) {
  const node = document.createElement('option');
  node.value = normalizeString(option.value);
  node.textContent = normalizeString(option.label || option.value);
  return node;
}

function createField(field = {}) {
  const label = document.createElement('label');
  label.className = 'model-create__field';

  const labelText = document.createElement('span');
  labelText.textContent = normalizeString(field.label || field.name);
  label.append(labelText);

  let control;
  if (field.type === 'textarea') {
    control = document.createElement('textarea');
    control.rows = 4;
  } else if (field.type === 'select') {
    control = document.createElement('select');
    (Array.isArray(field.options) ? field.options : []).forEach((option) => {
      control.append(createOption(option));
    });
  } else {
    control = document.createElement('input');
    control.type = field.type || 'text';
  }

  control.name = normalizeString(field.name);
  control.required = field.required === true;
  label.append(control);
  return label;
}

function renderModelCreateFields(root, schema) {
  const fieldsMount = root?.querySelector('[data-model-create-fields]');
  if (!fieldsMount) return;

  fieldsMount.innerHTML = '';
  (Array.isArray(schema.fields) ? schema.fields : []).forEach((field) => {
    fieldsMount.append(createField(field));
  });
}

function readModelCreateForm(form) {
  const formData = new FormData(form);
  return Object.fromEntries(Array.from(formData.entries()).map(([key, value]) => {
    return [key, normalizeString(value)];
  }));
}

/* =============================================================================
   06) SUBMISSION
============================================================================= */
function messageForModelCreateError(error) {
  const code = normalizeString(error?.code || error?.message || '');
  const message = normalizeString(error?.message || '').toLowerCase();
  switch (code) {
    case 'AUTH_REQUIRED':
      return 'Sign in before creating a model.';
    case 'PROFILE_COMPLETE_REQUIRED':
      return 'Complete your private profile and username before creating a model.';
    case 'MODEL_BACKEND_UNAVAILABLE':
      return 'Model backend is not configured for this environment.';
    case 'MODEL_NAME_REQUIRED':
      return 'Enter a model name.';
    case 'MODEL_SLUG_TAKEN':
    case 'MODEL_SLUG_ALREADY_OWNED':
      return 'That model route is already reserved.';
    default:
      if (message.includes('row-level security') || message.includes('violates row-level security')) {
        return 'Model creation is blocked by Supabase model policy. Apply the latest model/developer policy migration, then retry while signed in with a complete profile.';
      }

      if (message.includes('permission denied')) {
        return 'Model creation is blocked by backend permissions. Confirm the models table owner policies are deployed.';
      }

      return 'Model creation could not complete. Review Supabase schema and policies.';
  }
}

function bindModelCreateForm(root) {
  const form = root?.querySelector('[data-model-create-form]');
  if (!form || form.dataset.modelCreateBound === 'true') return;

  form.dataset.modelCreateBound = 'true';
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    setStatus(root, 'Creating model…');

    try {
      const model = await createOwnedModel(readModelCreateForm(form));
      setStatus(root, `Model created: ${model.model_name}. Source intake, training, and runtime routing remain the next workspace steps.`);
      form.reset();
    } catch (error) {
      console.error('[model-create] Model creation failed.', error);
      setStatus(root, messageForModelCreateError(error));
    }
  });
}

/* =============================================================================
   07) INITIALIZATION
============================================================================= */
async function initModelCreate() {
  const mount = document.querySelector('[data-model-create-root]');
  if (!mount || mount.dataset.modelCreateMounted === 'true') return;

  mount.dataset.modelCreateMounted = 'true';
  mount.innerHTML = await fetchText(SHELL_FRAGMENT_PATH);
  const root = mount.querySelector('[data-model-create-shell]');
  const schema = await fetchJson(MODEL_CREATION_SCHEMA_PATH);

  renderModelCreateFields(root, schema);
  bindModelCreateForm(root);
  setStatus(root, 'Model creation is ready. Canonical save requires Supabase auth, complete profile, and the models table.');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initModelCreate, { once:true });
} else {
  void initModelCreate();
}

/* =============================================================================
   08) END OF FILE
============================================================================= */
