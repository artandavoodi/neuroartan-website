import {
  createOwnedModel,
  getModelStoreBackendState,
  listOwnedModels,
} from '../../../system/model-store.js';

function renderMetric(label, value) {
  return `
    <article class="home-model-workspace__metric">
      <p class="home-model-workspace__label">${label}</p>
      <p class="home-model-workspace__value">${value}</p>
    </article>
  `;
}

function renderModel(model) {
  return `
    <article class="home-model-workspace__item">
      <p class="home-model-workspace__name">${model.model_name}</p>
      <p class="home-model-workspace__copy">${model.description || 'No model description yet.'}</p>
      <p class="home-model-workspace__copy">${model.model_visibility} · ${model.lifecycle_state} · ${model.readiness_state} · ${model.publication_state}</p>
    </article>
  `;
}

async function syncModelOverview(root) {
  const summary = root.querySelector('[data-model-workspace-summary]');
  const list = root.querySelector('[data-model-workspace-list]');
  const status = root.querySelector('[data-model-workspace-status]');
  const backend = getModelStoreBackendState();
  const models = await listOwnedModels();

  if (summary) {
    summary.innerHTML = [
      renderMetric('Backend', backend.supabaseConfigured ? 'Supabase active' : 'Supabase unavailable'),
      renderMetric('Owned models', String(models.length)),
      renderMetric('Canonical state', backend.migrationStatus.replaceAll('_', ' '))
    ].join('');
  }

  if (list) {
    list.innerHTML = models.length
      ? models.map(renderModel).join('')
      : '<p class="home-model-workspace__copy">No canonical model records exist for this profile yet.</p>';
  }

  if (status) {
    status.textContent = '';
  }
}

function bindModelCreation(root) {
  const form = root.querySelector('[data-model-create-form]');
  if (!(form instanceof HTMLFormElement)) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const status = root.querySelector('[data-model-workspace-status]');
    const formData = new FormData(form);

    if (status) status.textContent = 'Creating model...';

    try {
      await createOwnedModel({
        model_name: formData.get('model_name'),
        model_visibility: formData.get('model_visibility'),
        description: formData.get('description'),
      });
      form.reset();
      await syncModelOverview(root);
      if (status) status.textContent = 'Model created in Supabase.';
    } catch (error) {
      if (status) {
        status.textContent = error?.code === 'PROFILE_REQUIRED'
          ? 'Complete your profile before creating a model.'
          : error?.code === 'AUTH_REQUIRED'
            ? 'Sign in before creating a model.'
            : 'Model creation is blocked until the Supabase schema is available.';
      }
      console.error('[home-platform][model-overview] Model creation failed.', error);
    }
  });
}

export function mountHomePlatformDestination(root) {
  bindModelCreation(root);
  void syncModelOverview(root).catch((error) => {
    console.error('[home-platform][model-overview] Sync failed.', error);
  });
}
