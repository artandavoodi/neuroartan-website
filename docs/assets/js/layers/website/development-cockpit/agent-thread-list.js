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
/* /website/docs/assets/js/layers/website/development-cockpit/agent-thread-list.js */

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
function createField(field) {
  const item = document.createElement('div');
  item.className = 'agent-thread-list__field';
  const label = document.createElement('strong');
  label.textContent = normalizeCockpitString(field);
  const status = document.createElement('span');
  status.textContent = 'session field';
  item.append(label, status);
  return item;
}

/* =============================================================================
   04) INITIALIZATION
============================================================================= */
export function initAgentThreadList(context) {
  const root = getCockpitModuleRoot(context, 'agent-thread-list');
  const schemaNode = root?.querySelector('[data-agent-thread-schema]');
  const itemsNode = root?.querySelector('[data-agent-thread-items]');
  if (!root || !schemaNode || !itemsNode) return;

  const fields = Array.isArray(context.registries.agentSessions?.sessionSchema?.fields)
    ? context.registries.agentSessions.sessionSchema.fields
    : [];
  const sessions = Array.isArray(context.registries.agentSessions?.sessions)
    ? context.registries.agentSessions.sessions
    : [];

  schemaNode.innerHTML = '';
  fields.forEach((field) => {
    schemaNode.append(createField(field));
  });

  itemsNode.innerHTML = '';
  if (!sessions.length) {
    const empty = document.createElement('div');
    empty.className = 'agent-thread-list__empty';
    empty.textContent = 'No backend-created agent sessions yet.';
    itemsNode.append(empty);
  }

  writeCockpitOutput(root, '[data-agent-thread-output]', [
    'Session model is registered.',
    'Session creation is locked until backend runtime exists.',
    `Registered fields: ${fields.length}`
  ].join('\n'));
}

/* =============================================================================
   05) END OF FILE
============================================================================= */
