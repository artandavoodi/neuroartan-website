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
    const response = await requestDeveloperRuntimeAction(context, 'developer-state-update', {
      activeRepository: repository.fullName || repository.id,
      activeBranch: repository.defaultBranch || ''
    });
    writeCockpitOutput(root, '[data-project-repository-output]', [
      `Repository: ${repository.label || repository.id}`,
      `Root: ${repository.root || ''}`,
      `Selection status: ${response.status}`,
      `Active branch: ${response.developerState?.activeBranch || repository.defaultBranch || 'not selected'}`,
      `Persistence: ${response.developerState?.canonicalPersistence || 'server_session_pending_supabase_profile_link'}`
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

  async function renderInitialRepositories() {
    const stateResponse = await requestDeveloperRuntimeAction(context, 'developer-state-read', {
      source:'project-repository-sidebar'
    });
    const stateRepositories = Array.isArray(stateResponse?.developerState?.repositories)
      ? stateResponse.developerState.repositories
      : [];
    renderRepositoryList(context, root, stateRepositories.length ? stateRepositories : repositories);
    if (stateResponse?.developerState?.activeRepository) {
      const activeButton = Array.from(root.querySelectorAll('[data-repository-id]')).find((button) => {
        return button.dataset.repositoryId === stateResponse.developerState.activeRepository;
      });
      activeButton?.setAttribute('aria-pressed', 'true');
      writeCockpitOutput(root, '[data-project-repository-output]', [
        `Active repository: ${stateResponse.developerState.activeRepository}`,
        `GitHub status: ${stateResponse.developerState.github?.connected ? 'connected' : 'authorization_required'}`,
        `Persistence: ${stateResponse.developerState.canonicalPersistence}`
      ].join('\n'));
    }
  }

  void renderInitialRepositories();

  if (discoverButton instanceof HTMLButtonElement) {
    discoverButton.addEventListener('click', async () => {
      const response = await requestDeveloperRuntimeAction(context, 'github-repository-discovery', {
        source: 'project-repository-sidebar'
      });
      writeCockpitOutput(root, '[data-project-repository-output]', [
        'GitHub repository discovery requested.',
        `Runtime status: ${response.status}`,
        `Route: ${response.route}`,
        `Reason: ${response.reason || 'Repository data returned from backend session.'}`,
        `Persistence: ${response.developerState?.canonicalPersistence || 'server_session_pending_supabase_profile_link'}`
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
