/* =============================================================================
   00) FILE INDEX
   01) IMPORTS
   02) REGISTRY HELPERS
   03) PATH SAFETY
   04) READ-ONLY SCAN
   05) END OF FILE
============================================================================= */

/* =============================================================================
   01) IMPORTS
============================================================================= */
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { developerModeConfig } from './config.mjs';

/* =============================================================================
   02) REGISTRY HELPERS
============================================================================= */
const REPOSITORY_REGISTRY_PATH = path.join(
  developerModeConfig.docsRoot,
  'assets/data/website/development-cockpit/repository-scope-registry.json'
);

async function loadRepositoryRegistry() {
  const text = await readFile(REPOSITORY_REGISTRY_PATH, 'utf8');
  return JSON.parse(text);
}

export async function resolveRepositoryRoot(repositoryId) {
  const registry = await loadRepositoryRegistry();
  const repository = (registry.repositories || []).find((entry) => entry.id === repositoryId);
  return repository?.root ? path.resolve(repository.root) : '';
}

/* =============================================================================
   03) PATH SAFETY
============================================================================= */
function isAllowedRoot(candidate) {
  const resolved = path.resolve(candidate);
  return developerModeConfig.allowedRoots.some((allowedRoot) => {
    const relative = path.relative(allowedRoot, resolved);
    return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
  });
}

function shouldSkip(name) {
  return [
    '.git',
    '.codex',
    '.env',
    '.env.local',
    'node_modules',
    '.DS_Store',
    '__pycache__',
    '.cache'
  ].includes(name);
}

/* =============================================================================
   04) READ-ONLY SCAN
============================================================================= */
async function walkFiles(root, current = root, files = []) {
  if (files.length >= 240) return files;

  const entries = await readdir(current, { withFileTypes:true });
  for (const entry of entries) {
    if (shouldSkip(entry.name)) continue;

    const absolute = path.join(current, entry.name);
    if (entry.isDirectory()) {
      await walkFiles(root, absolute, files);
      continue;
    }

    if (entry.isFile()) {
      const fileStat = await stat(absolute);
      files.push({
        path:path.relative(root, absolute),
        size:fileStat.size
      });
    }
  }

  return files;
}

export async function scanRepository({ repositoryId }) {
  const root = await resolveRepositoryRoot(repositoryId);
  if (!root) {
    return {
      ok:false,
      status:'repository_not_found',
      reason:'Repository is not present in the governed repository registry.'
    };
  }

  if (!isAllowedRoot(root)) {
    return {
      ok:false,
      status:'repository_root_not_allowed',
      reason:'Repository root is outside DEVELOPER_ALLOWED_ROOTS.'
    };
  }

  const rootStat = await stat(root);
  if (!rootStat.isDirectory()) {
    return {
      ok:false,
      status:'repository_root_invalid',
      reason:'Repository root is not a directory.'
    };
  }

  const files = await walkFiles(root);
  return {
    ok:true,
    status:'read_only_scan_complete',
    repositoryId,
    root,
    fileCount:files.length,
    files
  };
}

/* =============================================================================
   05) END OF FILE
============================================================================= */
