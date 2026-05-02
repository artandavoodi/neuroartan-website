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
/* /website/docs/assets/js/layers/website/development-cockpit/changelog-release-ledger.js */

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
function createReleaseEntry(entry) {
  const item = document.createElement('article');
  item.className = 'changelog-release-ledger__entry';

  const header = document.createElement('div');
  header.className = 'changelog-release-ledger__entry-header';
  const title = document.createElement('strong');
  title.textContent = `${normalizeCockpitString(entry.version)} · ${normalizeCockpitString(entry.feature_category)}`;
  const date = document.createElement('span');
  date.textContent = normalizeCockpitString(entry.date);
  header.append(title, date);

  const relevance = document.createElement('p');
  relevance.textContent = normalizeCockpitString(entry.commercial_relevance);

  const status = document.createElement('span');
  status.textContent = `Approval: ${normalizeCockpitString(entry.approval_state)} · Tests: ${normalizeCockpitString(entry.test_status)}`;

  item.append(header, relevance, status);
  return item;
}

/* =============================================================================
   04) INITIALIZATION
============================================================================= */
export function initChangelogReleaseLedger(context) {
  const root = getCockpitModuleRoot(context, 'changelog-release-ledger');
  const entriesNode = root?.querySelector('[data-changelog-release-entries]');
  if (!root || !entriesNode) return;

  const entries = Array.isArray(context.registries.releaseLedger?.entries)
    ? context.registries.releaseLedger.entries
    : [];

  entriesNode.innerHTML = '';
  entries.forEach((entry) => {
    entriesNode.append(createReleaseEntry(entry));
  });

  writeCockpitOutput(root, '[data-changelog-release-output]', [
    `Ledger entries: ${entries.length}`,
    'Release ledger is frontend-visible and backend-updateable later.',
    'Related commit/PR fields remain empty until GitHub runtime exists.'
  ].join('\n'));
}

/* =============================================================================
   05) END OF FILE
============================================================================= */
