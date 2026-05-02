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
/* /website/docs/assets/js/layers/website/development-cockpit/worktree-sandbox-controller.js */

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
function createPolicyItem(label, value) {
  const item = document.createElement('div');
  item.className = 'worktree-sandbox-controller__policy-item';
  const title = document.createElement('strong');
  title.textContent = normalizeCockpitString(label);
  const copy = document.createElement('span');
  copy.textContent = normalizeCockpitString(value);
  item.append(title, copy);
  return item;
}

/* =============================================================================
   04) INITIALIZATION
============================================================================= */
export function initWorktreeSandboxController(context) {
  const root = getCockpitModuleRoot(context, 'worktree-sandbox-controller');
  const policy = root?.querySelector('[data-worktree-sandbox-policy]');
  if (!root || !policy) return;

  const runtimeState = context.registries.runtimeInterfaces?.defaultRuntimeState || {};
  policy.innerHTML = '';
  policy.append(
    createPolicyItem('Internet access', runtimeState.internetAccessDefault || 'blocked'),
    createPolicyItem('Frontend secrets', runtimeState.frontendSecretsAllowed ? 'allowed' : 'blocked'),
    createPolicyItem('Browser mutation', runtimeState.browserRepositoryMutationAllowed ? 'allowed' : 'blocked'),
    createPolicyItem('Mutation approval', runtimeState.mutationRequiresApproval ? 'required' : 'not configured')
  );

  writeCockpitOutput(root, '[data-worktree-sandbox-output]', [
    'Worktree support is a backend runtime responsibility.',
    'Sandbox execution is locked.',
    'Internet egress is blocked by default.'
  ].join('\n'));
}

/* =============================================================================
   05) END OF FILE
============================================================================= */
