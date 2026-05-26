/* =============================================================================
   01. PROFILE PRIVATE MODEL ECONOMY MODULE
   02. STATE RESOLUTION
   03. RENDERING
   04. RUNTIME BINDING
   05. INITIALIZATION
============================================================================= */

import { PROFILE_PRIVATE_MODEL_ECONOMY_PLACEHOLDER } from '../models/profile-private-models.js';
import { PROFILE_DASHBOARD_MODEL_ECONOMY_READINESS } from '../dashboard/profile-dashboard.js';
import { PROFILE_PRIVATE_MODEL_IDENTITY_BOUNDARY } from '../identity/profile-private-identity.js';
import { listOwnedModels } from '../../../system/model/model-store.js';

/* =============================================================================
   01. PROFILE PRIVATE MODEL ECONOMY MODULE
============================================================================= */

const MODULE_ID = 'profile-private-model-economy';

const BLOCKED_STATE = 'Blocked until review';

/* =============================================================================
   02. STATE RESOLUTION
============================================================================= */

function getFallbackModelEconomyState() {
  return Object.freeze({
    defaultPersonalModel:
      PROFILE_PRIVATE_MODEL_ECONOMY_PLACEHOLDER?.defaultPersonalModel || 'Assigned at profile birth',
    birthIdentity:
      PROFILE_PRIVATE_MODEL_IDENTITY_BOUNDARY?.modelBirthCertificate || 'Future owner-visible state',
    privateIdentity:
      PROFILE_PRIVATE_MODEL_IDENTITY_BOUNDARY?.privateModelIdentity || 'Never public',
    providerRouting:
      PROFILE_PRIVATE_MODEL_IDENTITY_BOUNDARY?.providerRoutingIdentity || 'Never public',
    dignitySecurity:
      PROFILE_DASHBOARD_MODEL_ECONOMY_READINESS?.dignitySecurity || 'Owner-facing future state',
    monetization:
      PROFILE_PRIVATE_MODEL_ECONOMY_PLACEHOLDER?.monetizationReadiness || BLOCKED_STATE,
    hiring:
      PROFILE_PRIVATE_MODEL_ECONOMY_PLACEHOLDER?.hiringReadiness || BLOCKED_STATE,
    marketplace:
      PROFILE_PRIVATE_MODEL_ECONOMY_PLACEHOLDER?.marketplaceVisibility || BLOCKED_STATE,
    interModelHiring: BLOCKED_STATE
  });
}

async function getResolvedModelEconomyState() {
  const fallbackState = getFallbackModelEconomyState();

  try {
    const [model] = await listOwnedModels();
    if (!model) return fallbackState;

    return Object.freeze({
      defaultPersonalModel: model.model_name || model.slug || fallbackState.defaultPersonalModel,
      birthIdentity: model.birth_certificate_id ? 'Created' : fallbackState.birthIdentity,
      privateIdentity: model.private_identity_id ? 'Active · Owner only' : fallbackState.privateIdentity,
      providerRouting: model.runtime_policy?.provider || fallbackState.providerRouting,
      dignitySecurity: model.foundation_state || fallbackState.dignitySecurity,
      monetization: model.economy_state || BLOCKED_STATE,
      hiring: BLOCKED_STATE,
      marketplace: BLOCKED_STATE,
      interModelHiring: BLOCKED_STATE
    });
  } catch (error) {
    console.warn('[profile-private-model-economy] Backend state unavailable:', error);
    return fallbackState;
  }
}

/* =============================================================================
   03. RENDERING
============================================================================= */

function getModelEconomyRoot() {
  return document.querySelector('[data-profile-private-model-economy]');
}

function createStateRow(label, value, state = '') {
  return `
    <div class="profile-private-model-economy__item" ${state ? `data-state="${state}"` : ''}>
      <dt>${label}</dt>
      <dd>${value}</dd>
    </div>
  `;
}

function createModelEconomySurface(state) {
  const surface = document.createElement('section');
  surface.className = 'profile-private-model-economy';
  surface.dataset.profilePrivateModelEconomy = 'true';
  surface.dataset.module = MODULE_ID;

  surface.innerHTML = `
    <header class="profile-private-model-economy__header">
      <p class="profile-private-model-economy__eyebrow">FSC-T-0007</p>
      <h2 class="profile-private-model-economy__title">Personal Model Economy</h2>
      <p class="profile-private-model-economy__copy">
        Your default personal model is treated as an owner-governed continuity entity. Marketplace, hiring, monetization, ranking, payouts, inter-model hiring, and posthumous economy remain blocked until review.
      </p>
    </header>

    <dl class="profile-private-model-economy__grid">
      ${createStateRow('Default Personal Model', state.defaultPersonalModel)}
      ${createStateRow('Model Birth Identity', state.birthIdentity)}
      ${createStateRow('Private Model Identity', state.privateIdentity, 'private')}
      ${createStateRow('Provider Routing Identity', state.providerRouting, 'private')}
      ${createStateRow('Dignity / Security', state.dignitySecurity)}
      ${createStateRow('Monetization', state.monetization, 'blocked')}
      ${createStateRow('Hiring', state.hiring, 'blocked')}
      ${createStateRow('Marketplace', state.marketplace, 'blocked')}
      ${createStateRow('Inter-Model Hiring', state.interModelHiring, 'blocked')}
    </dl>
  `;

  return surface;
}

async function renderProfilePrivateModelEconomy() {
  if (getModelEconomyRoot()) return;

  const target =
    document.querySelector('[data-profile-private-models]') ||
    document.querySelector('[data-profile-dashboard]') ||
    document.querySelector('main');

  if (!target) return;

  const state = await getResolvedModelEconomyState();
  target.appendChild(createModelEconomySurface(state));
}

/* =============================================================================
   04. RUNTIME BINDING
============================================================================= */

function bindModelEconomyRuntimeEvents() {
  document.addEventListener('profile:state-updated', renderProfilePrivateModelEconomy);
  document.addEventListener('profile:models-updated', renderProfilePrivateModelEconomy);
  document.addEventListener('profile:dashboard-updated', renderProfilePrivateModelEconomy);
}

/* =============================================================================
   05. INITIALIZATION
============================================================================= */

function initProfilePrivateModelEconomy() {
  renderProfilePrivateModelEconomy();
  bindModelEconomyRuntimeEvents();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initProfilePrivateModelEconomy, { once: true });
} else {
  initProfilePrivateModelEconomy();
}
