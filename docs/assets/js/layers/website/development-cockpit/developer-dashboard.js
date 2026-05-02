/* =============================================================================
   00) FILE INDEX
   01) MODULE IDENTITY
   02) IMPORTS
   03) DOM HELPERS
   04) RENDERING
   05) INITIALIZATION
   06) END OF FILE
============================================================================= */

/* =============================================================================
   01) MODULE IDENTITY
============================================================================= */
/* /website/docs/assets/js/layers/website/development-cockpit/developer-dashboard.js */

/* =============================================================================
   02) IMPORTS
============================================================================= */
import {
  getCockpitModuleRoot,
  normalizeCockpitString,
  writeCockpitOutput
} from './development-cockpit-shell.js';
import { resolveDeveloperModeGate } from './developer-mode-gate.js';

/* =============================================================================
   03) DOM HELPERS
============================================================================= */
function createStatusCard(label, value) {
  const card = document.createElement('div');
  card.className = 'developer-dashboard__status-card';
  const title = document.createElement('strong');
  title.textContent = normalizeCockpitString(label);
  const copy = document.createElement('span');
  copy.textContent = normalizeCockpitString(value);
  card.append(title, copy);
  return card;
}

function createRequirement(requirement) {
  const item = document.createElement('div');
  item.className = 'developer-dashboard__requirement';
  const title = document.createElement('strong');
  title.textContent = normalizeCockpitString(requirement.label);
  const copy = document.createElement('span');
  copy.textContent = `${normalizeCockpitString(requirement.status)} — ${normalizeCockpitString(requirement.description)}`;
  item.append(title, copy);
  return item;
}

/* =============================================================================
   04) RENDERING
============================================================================= */
async function renderDeveloperDashboard(context, root) {
  const statusGrid = root.querySelector('[data-developer-dashboard-status]');
  const requirementsNode = root.querySelector('[data-developer-dashboard-requirements]');
  const gate = await resolveDeveloperModeGate(context);

  if (statusGrid) {
    statusGrid.innerHTML = '';
    statusGrid.append(
      createStatusCard('Profile gate', gate.signedIn ? 'Signed in' : 'Authentication required'),
      createStatusCard('Developer capability', gate.developerAuthorized ? 'Authorized' : 'Backend role required'),
      createStatusCard('Runtime', gate.runtimeEnabled ? 'Enabled' : 'Locked')
    );
  }

  if (requirementsNode) {
    requirementsNode.innerHTML = '';
    gate.requirements.forEach((requirement) => {
      requirementsNode.append(createRequirement(requirement));
    });
  }

  writeCockpitOutput(root, '[data-developer-dashboard-output]', [
    `Gate: ${gate.gateStatus}`,
    `User: ${gate.email || gate.userId || 'not authenticated'}`,
    `Frontend secrets allowed: ${gate.frontendSecretsAllowed ? 'yes' : 'no'}`,
    `Browser repository mutation: ${gate.browserRepositoryMutationAllowed ? 'allowed' : 'blocked'}`
  ].join('\n'));
}

/* =============================================================================
   05) INITIALIZATION
============================================================================= */
export function initDeveloperDashboard(context) {
  const root = getCockpitModuleRoot(context, 'developer-dashboard');
  if (!root) return;
  void renderDeveloperDashboard(context, root);
}

/* =============================================================================
   06) END OF FILE
============================================================================= */
