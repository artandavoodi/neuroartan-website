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
/* /website/docs/assets/js/layers/website/development-cockpit/project-repository-sidebar.js */

/* =============================================================================
   02) IMPORTS
============================================================================= */
import {
  getCockpitModuleRoot,
  normalizeCockpitString,
  writeCockpitOutput
} from './development-cockpit-shell.js';
import { requestDeveloperRuntimeAction } from './developer-runtime-client.js';

/* =============================================================================
   03) RENDERING
============================================================================= */
function renderRepositoryButton(context, root, repository) {
  const button = document.createElement('button');
  button.className = 'project-repository-sidebar__item';
  button.type = 'button';
  button.dataset.repositoryId = normalizeCockpitString(repository.id);

  const title = document.createElement('strong');
  title.textContent = normalizeCockpitString(repository.label || repository.id);

  const copy = document.createElement('span');
  copy.textContent = normalizeCockpitString(repository.scope || repository.root || 'Repository scope');

  const status = document.createElement('span');
  status.textContent = 'GitHub connection: backend required';

  button.append(title, copy, status);
  button.addEventListener('click', async () => {
    root.querySelectorAll('.project-repository-sidebar__item').forEach((entry) => {
      entry.setAttribute('aria-pressed', 'false');
    });
    button.setAttribute('aria-pressed', 'true');
    const response = await requestDeveloperRuntimeAction(context, 'github-connection-status', {
      repository: repository.id
    });
    writeCockpitOutput(root, '[data-project-repository-output]', [
      `Repository: ${repository.label || repository.id}`,
      `Root: ${repository.root || ''}`,
      `GitHub status: ${response.status}`,
      `Reason: ${response.reason}`
    ].join('\n'));
  });

  return button;
}

function renderRepositoryList(context, root, repositories = []) {
  const list = root?.querySelector('[data-project-repository-list]');
  if (!list) return;

  list.innerHTML = '';
  repositories.forEach((repository) => {
    list.append(renderRepositoryButton(context, root, repository));
  });
}

/* =============================================================================
   04) INITIALIZATION
============================================================================= */
export function initProjectRepositorySidebar(context) {
  const root = getCockpitModuleRoot(context, 'project-repository-sidebar');
  const list = root?.querySelector('[data-project-repository-list]');
  const discoverButton = root?.querySelector('[data-project-repository-discover]');
  if (!root || !list) return;

  const repositories = Array.isArray(context.registries.repositoryScopes?.repositories)
    ? context.registries.repositoryScopes.repositories
    : [];

  renderRepositoryList(context, root, repositories);

  if (discoverButton instanceof HTMLButtonElement) {
    discoverButton.addEventListener('click', async () => {
      const response = await requestDeveloperRuntimeAction(context, 'github-repository-discovery', {
        source: 'project-repository-sidebar'
      });
      writeCockpitOutput(root, '[data-project-repository-output]', [
        'GitHub repository discovery requested.',
        `Runtime status: ${response.status}`,
        `Route: ${response.route}`,
        `Reason: ${response.reason}`,
        'Repository listing becomes live after server-side GitHub App/OAuth authorization is implemented.'
      ].join('\n'));

      if (Array.isArray(response.repositories) && response.repositories.length > 0) {
        renderRepositoryList(context, root, response.repositories.map((repository) => ({
          id: repository.fullName || repository.id,
          label: repository.fullName || repository.label,
          root: repository.htmlUrl || '',
          scope: repository.private ? 'Private GitHub repository' : 'Public GitHub repository',
          githubConnectionStatus: repository.githubConnectionStatus,
          writePermissionStatus: repository.writePermissionStatus,
          defaultBranch: repository.defaultBranch
        })));
      }
    });
  }
}

/* =============================================================================
   05) END OF FILE
============================================================================= */
