/* =============================================================================
   00) FILE INDEX
   01) IMPORTS
   02) CONFIG HELPERS
   03) OAUTH HELPERS
   04) GITHUB API HELPERS
   05) END OF FILE
============================================================================= */

/* =============================================================================
   01) IMPORTS
============================================================================= */
import { developerModeConfig } from './config.mjs';

/* =============================================================================
   02) CONFIG HELPERS
============================================================================= */
export function hasGitHubOAuthConfig() {
  return Boolean(developerModeConfig.github.clientId && developerModeConfig.github.clientSecret);
}

export function buildGitHubAuthorizeUrl({ state }) {
  const url = new URL('https://github.com/login/oauth/authorize');
  url.searchParams.set('client_id', developerModeConfig.github.clientId);
  url.searchParams.set('redirect_uri', `${developerModeConfig.publicOrigin}/api/developer-mode/github/callback`);
  url.searchParams.set('scope', developerModeConfig.github.scope);
  url.searchParams.set('state', state);
  return url.toString();
}

/* =============================================================================
   03) OAUTH HELPERS
============================================================================= */
export async function exchangeGitHubCode(code) {
  const response = await fetch('https://github.com/login/oauth/access_token', {
    method:'POST',
    headers:{
      accept:'application/json',
      'content-type':'application/json'
    },
    body:JSON.stringify({
      client_id:developerModeConfig.github.clientId,
      client_secret:developerModeConfig.github.clientSecret,
      code,
      redirect_uri:`${developerModeConfig.publicOrigin}/api/developer-mode/github/callback`
    })
  });

  const payload = await response.json();
  if (!response.ok || payload.error || !payload.access_token) {
    const message = payload.error_description || payload.error || 'GITHUB_TOKEN_EXCHANGE_FAILED';
    throw new Error(message);
  }

  return payload;
}

/* =============================================================================
   04) GITHUB API HELPERS
============================================================================= */
async function fetchGitHub(path, token) {
  const response = await fetch(`https://api.github.com${path}`, {
    headers:{
      accept:'application/vnd.github+json',
      authorization:`Bearer ${token}`,
      'x-github-api-version':'2022-11-28',
      'user-agent':'Neuroartan-Developer-Mode'
    }
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.message || 'GITHUB_API_REQUEST_FAILED');
  }

  return payload;
}

export async function fetchGitHubViewer(token) {
  return fetchGitHub('/user', token);
}

export async function fetchGitHubRepositories(token) {
  const repositories = await fetchGitHub('/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator,organization_member', token);
  return repositories.map((repository) => ({
    id:String(repository.id),
    label:repository.full_name,
    owner:repository.owner?.login || '',
    name:repository.name,
    fullName:repository.full_name,
    private:repository.private === true,
    defaultBranch:repository.default_branch || '',
    htmlUrl:repository.html_url || '',
    cloneUrl:repository.clone_url || '',
    permissions:repository.permissions || {},
    githubConnectionStatus:'connected',
    writePermissionStatus:repository.permissions?.push ? 'available_after_approval' : 'read_only'
  }));
}

/* =============================================================================
   05) END OF FILE
============================================================================= */
