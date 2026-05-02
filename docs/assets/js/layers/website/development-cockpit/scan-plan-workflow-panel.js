/* =============================================================================
   00) FILE INDEX
   01) MODULE IDENTITY
   02) IMPORTS
   03) RENDERING
   04) INITIALIZATION
   05) END OF FILE
============================================================================= */

/* =============================================================================
   01) MODULE IDENTITY
============================================================================= */
/* /website/docs/assets/js/layers/website/development-cockpit/scan-plan-workflow-panel.js */

/* =============================================================================
   02) IMPORTS
============================================================================= */
import {
  getCockpitModuleRoot,
  normalizeCockpitString,
  writeCockpitOutput
} from './development-cockpit-shell.js';

/* =============================================================================
   03) RENDERING
============================================================================= */
function createWorkflowStep(entry) {
  const item = document.createElement('div');
  item.className = 'scan-plan-workflow-panel__step';
  const title = document.createElement('strong');
  title.textContent = normalizeCockpitString(entry.label);
  const copy = document.createElement('span');
  copy.textContent = normalizeCockpitString(entry.description);
  const status = document.createElement('span');
  status.textContent = `${normalizeCockpitString(entry.method)} · ${normalizeCockpitString(entry.frontendStatus)}`;
  item.append(title, copy, status);
  return item;
}

/* =============================================================================
   04) INITIALIZATION
============================================================================= */
export function initScanPlanWorkflowPanel(context) {
  const root = getCockpitModuleRoot(context, 'scan-plan-workflow-panel');
  const steps = root?.querySelector('[data-scan-plan-workflow-steps]');
  if (!root || !steps) return;

  const interfaces = Array.isArray(context.registries.runtimeInterfaces?.interfaces)
    ? context.registries.runtimeInterfaces.interfaces
    : [];
  const workflowIds = ['repository-scan-request', 'patch-proposal-request', 'test-request'];
  const workflowInterfaces = interfaces.filter((entry) => workflowIds.includes(entry.id));

  steps.innerHTML = '';
  workflowInterfaces.forEach((entry) => {
    steps.append(createWorkflowStep(entry));
  });

  writeCockpitOutput(root, '[data-scan-plan-workflow-output]', [
    'Scan: backend read-only runtime required.',
    'Plan: provider runtime required.',
    'Patch: review artifact required before application.',
    'Test: approval required before sandbox execution.'
  ].join('\n'));
}

/* =============================================================================
   05) END OF FILE
============================================================================= */
