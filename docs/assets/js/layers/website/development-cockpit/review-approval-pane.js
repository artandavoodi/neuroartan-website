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
/* /website/docs/assets/js/layers/website/development-cockpit/review-approval-pane.js */

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
function createReviewStep(runtimeInterface) {
  const item = document.createElement('div');
  item.className = 'review-approval-pane__step';

  const content = document.createElement('div');
  const title = document.createElement('strong');
  title.textContent = normalizeCockpitString(runtimeInterface.label);
  const copy = document.createElement('span');
  copy.textContent = normalizeCockpitString(runtimeInterface.description);
  content.append(title, copy);

  const status = document.createElement('span');
  status.textContent = runtimeInterface.requiresApproval ? 'approval required' : 'read only';

  item.append(content, status);
  return item;
}

/* =============================================================================
   04) INITIALIZATION
============================================================================= */
export function initReviewApprovalPane(context) {
  const root = getCockpitModuleRoot(context, 'review-approval-pane');
  const steps = root?.querySelector('[data-review-approval-steps]');
  if (!root || !steps) return;

  const interfaces = Array.isArray(context.registries.runtimeInterfaces?.interfaces)
    ? context.registries.runtimeInterfaces.interfaces
    : [];
  const reviewInterfaces = interfaces.filter((entry) => {
    return ['patch-proposal-request', 'test-request', 'commit-pr-request'].includes(entry.id);
  });

  steps.innerHTML = '';
  reviewInterfaces.forEach((entry) => {
    steps.append(createReviewStep(entry));
  });

  writeCockpitOutput(root, '[data-review-approval-output]', [
    'Patch, test, commit, and PR actions are locked.',
    'Backend runtime must create review artifacts before approval can mutate a repository.',
    'No browser-side repository mutation is enabled.'
  ].join('\n'));
}

/* =============================================================================
   05) END OF FILE
============================================================================= */
