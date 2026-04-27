import {
  getModelStoreBackendState,
  listModelSourceConnectors,
  listOwnedModels,
} from '../../../system/model-store.js';

async function syncModelSources(root) {
  const summary = root.querySelector('[data-model-source-summary]');
  const list = root.querySelector('[data-model-source-list]');
  const backend = getModelStoreBackendState();
  const models = await listOwnedModels();
  const activeModel = models[0] || null;
  const connectors = activeModel ? await listModelSourceConnectors(activeModel.id) : [];

  if (summary) {
    summary.innerHTML = `
      <p class="home-model-source-workspace__label">Source authorization</p>
      <p class="home-model-source-workspace__title">${backend.supabaseConfigured ? 'Supabase connector records' : 'Backend unavailable'}</p>
      <p class="home-model-source-workspace__copy">Sources are model-owned. Authorization, ingestion, and training remain separate record boundaries.</p>
    `;
  }

  if (list) {
    list.innerHTML = connectors.length
      ? connectors.map((connector) => `
        <article class="home-model-source-workspace__item">
          <p class="home-model-source-workspace__title">${connector.source_platform || 'Source connector'}</p>
          <p class="home-model-source-workspace__copy">${connector.authorization_status || 'pending'} · ${connector.provenance_state || 'unreviewed'}</p>
        </article>
      `).join('')
      : '<p class="home-model-source-workspace__copy">No source connectors are authorized for the current canonical model yet.</p>';
  }
}

export function mountHomePlatformDestination(root) {
  void syncModelSources(root).catch((error) => {
    console.error('[home-platform][model-sources] Sync failed.', error);
  });
}
