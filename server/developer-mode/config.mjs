/* =============================================================================
   00) FILE INDEX
   01) IMPORTS
   02) ENVIRONMENT LOADING
   03) CONFIGURATION
   04) END OF FILE
============================================================================= */

/* =============================================================================
   01) IMPORTS
============================================================================= */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/* =============================================================================
   02) ENVIRONMENT LOADING
============================================================================= */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPOSITORY_ROOT = path.resolve(__dirname, '../..');

function loadDotEnv() {
  const envPath = path.join(REPOSITORY_ROOT, '.env');
  if (!existsSync(envPath)) return;

  const lines = readFileSync(envPath, 'utf8').split(/\r?\n/);
  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) return;

    const [key, ...valueParts] = trimmed.split('=');
    const value = valueParts.join('=').replace(/^['"]|['"]$/g, '');
    if (!process.env[key]) {
      process.env[key] = value;
    }
  });
}

loadDotEnv();

/* =============================================================================
   03) CONFIGURATION
============================================================================= */
function splitEnvList(value) {
  return String(value || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export const developerModeConfig = Object.freeze({
  repositoryRoot: REPOSITORY_ROOT,
  docsRoot: path.join(REPOSITORY_ROOT, 'docs'),
  host: process.env.DEVELOPER_MODE_HOST || '127.0.0.1',
  port: Number(process.env.DEVELOPER_MODE_PORT || 8891),
  publicOrigin: process.env.DEVELOPER_MODE_PUBLIC_ORIGIN || 'http://127.0.0.1:8891',
  allowedRoots: splitEnvList(process.env.DEVELOPER_ALLOWED_ROOTS || REPOSITORY_ROOT).map((entry) => path.resolve(entry)),
  github: {
    clientId: process.env.GITHUB_OAUTH_CLIENT_ID || '',
    clientSecret: process.env.GITHUB_OAUTH_CLIENT_SECRET || '',
    scope: process.env.GITHUB_OAUTH_SCOPE || 'repo read:user'
  },
  providers: {
    ollamaBaseUrl: process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434'
  }
});

/* =============================================================================
   04) END OF FILE
============================================================================= */
