import {
  getActiveModelRoutingContext,
  getActiveModelState,
} from '../../../system/active-model.js';
import { getModelStoreBackendState } from '../../../system/model-store.js';

function syncModelRuntime(root) {
  const summary = root.querySelector('[data-model-runtime-summary]');
  const backend = getModelStoreBackendState();
  const activeModel = getActiveModelState().activeModel;
  const routing = getActiveModelRoutingContext();

  if (!summary) return;

  summary.innerHTML = `
    <p class="home-model-runtime-workspace__label">Runtime and publication</p>
    <p class="home-model-runtime-workspace__title">${activeModel?.display_name || activeModel?.model_name || 'No active model selected'}</p>
    <p class="home-model-runtime-workspace__copy">Provider: ${routing.activeModel ? routing.engineLabel || 'configured route' : 'not selected'}</p>
    <p class="home-model-runtime-workspace__copy">Canonical model backend: ${backend.supabaseConfigured ? 'Supabase available' : 'unavailable'}. Local active-model state remains continuity-only until active model preferences are migrated.</p>
  `;
}

export function mountHomePlatformDestination(root) {
  syncModelRuntime(root);
}
