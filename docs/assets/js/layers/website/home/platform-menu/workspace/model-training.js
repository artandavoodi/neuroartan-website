import {
  getModelStoreBackendState,
  listModelTrainingRecords,
  listOwnedModels,
} from '../../../system/model-store.js';

async function syncModelTraining(root) {
  const summary = root.querySelector('[data-model-training-summary]');
  const list = root.querySelector('[data-model-training-list]');
  const backend = getModelStoreBackendState();
  const models = await listOwnedModels();
  const activeModel = models[0] || null;
  const records = activeModel ? await listModelTrainingRecords(activeModel.id) : [];

  if (summary) {
    summary.innerHTML = `
      <p class="home-model-training-workspace__label">Training pipeline</p>
      <p class="home-model-training-workspace__title">${backend.supabaseConfigured ? 'Canonical training records ready' : 'Backend unavailable'}</p>
      <p class="home-model-training-workspace__copy">Authorization, ingestion, provenance, retrieval readiness, and runtime activation are separate stages.</p>
    `;
  }

  if (list) {
    list.innerHTML = records.length
      ? records.map((record) => `
        <article class="home-model-training-workspace__item">
          <p class="home-model-training-workspace__title">${record.training_state || 'Training state'}</p>
          <p class="home-model-training-workspace__copy">${record.training_origin || 'self_supplied'} · readiness effect ${record.readiness_effect || 'none'}</p>
        </article>
      `).join('')
      : '<p class="home-model-training-workspace__copy">No training records exist for the current canonical model yet.</p>';
  }
}

export function mountHomePlatformDestination(root) {
  void syncModelTraining(root).catch((error) => {
    console.error('[home-platform][model-training] Sync failed.', error);
  });
}
