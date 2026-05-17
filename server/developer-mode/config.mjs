/* =============================================================================
   00) FILE INDEX
   01) IMPORTS
   02) ENVIRONMENT LOADING
   03) ENVIRONMENT HELPERS
   04) RUNTIME CONFIGURATION
   05) SANDBOX CONFIGURATION
   06) MEMORY CONFIGURATION
   07) EXECUTION CONFIGURATION
   08) REPOSITORY INTELLIGENCE CONFIGURATION
   09) CONFIGURATION
   10) END OF FILE
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
   03) ENVIRONMENT HELPERS
============================================================================= */
function splitEnvList(value) {
  return String(value || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

/* =============================================================================
   04) RUNTIME CONFIGURATION
============================================================================= */
const runtimeConfiguration = Object.freeze({
  runtimeId:process.env.ICOS_RUNTIME_ID || 'icos-runtime',
  runtimeLabel:process.env.ICOS_RUNTIME_LABEL || 'Neuroartan ICOS Runtime',
  runtimeMode:process.env.ICOS_RUNTIME_MODE || 'development',
  orchestrationEnabled:process.env.ICOS_ORCHESTRATION_ENABLED === 'true',
  autonomousExecutionEnabled:process.env.ICOS_AUTONOMOUS_EXECUTION === 'true',
  runtimeTelemetryEnabled:process.env.ICOS_RUNTIME_TELEMETRY !== 'false'
});

/* =============================================================================
   05) SANDBOX CONFIGURATION
============================================================================= */
const sandboxConfiguration = Object.freeze({
  enabled:process.env.ICOS_SANDBOX_ENABLED !== 'false',
  filesystemIsolation:process.env.ICOS_SANDBOX_FILESYSTEM !== 'false',
  networkIsolation:process.env.ICOS_SANDBOX_NETWORK === 'true',
  commandExecution:process.env.ICOS_COMMAND_EXECUTION === 'true',
  maxConcurrentExecutions:Number(
    process.env.ICOS_MAX_CONCURRENT_EXECUTIONS || 2
  )
});

/* =============================================================================
   06) MEMORY CONFIGURATION
============================================================================= */
const memoryConfiguration = Object.freeze({
  enabled:process.env.ICOS_MEMORY_ENABLED === 'true',
  provider:process.env.ICOS_MEMORY_PROVIDER || 'local',
  vectorStore:process.env.ICOS_VECTOR_STORE || 'local-json',
  embeddingModel:process.env.ICOS_EMBEDDING_MODEL || '',
  semanticIndexing:process.env.ICOS_SEMANTIC_INDEXING === 'true'
});

/* =============================================================================
   07) EXECUTION CONFIGURATION
============================================================================= */
const executionConfiguration = Object.freeze({
  patchGeneration:process.env.ICOS_PATCH_GENERATION === 'true',
  rollbackSnapshots:process.env.ICOS_ROLLBACK_SNAPSHOTS !== 'false',
  gitIntegration:process.env.ICOS_GIT_INTEGRATION !== 'false',
  automaticValidation:process.env.ICOS_AUTOMATIC_VALIDATION === 'true',
  previewEnvironment:process.env.ICOS_PREVIEW_ENVIRONMENT === 'true'
});

/* =============================================================================
   08) REPOSITORY INTELLIGENCE CONFIGURATION
============================================================================= */
const repositoryIntelligenceConfiguration = Object.freeze({
  enabled:process.env.ICOS_REPOSITORY_INTELLIGENCE !== 'false',
  dependencyGraph:process.env.ICOS_DEPENDENCY_GRAPH === 'true',
  ownershipGraph:process.env.ICOS_OWNERSHIP_GRAPH === 'true',
  cssOwnershipGraph:process.env.ICOS_CSS_GRAPH === 'true',
  deadCodeDetection:process.env.ICOS_DEAD_CODE_DETECTION === 'true',
  architectureIndexing:process.env.ICOS_ARCHITECTURE_INDEXING === 'true'
});

/* =============================================================================
   09) CONFIGURATION
============================================================================= */

export const developerModeConfig = Object.freeze({
  repositoryRoot: REPOSITORY_ROOT,
  docsRoot: path.join(REPOSITORY_ROOT, 'docs'),
  staticRoots: Object.freeze([
    Object.freeze({
      routePrefix: '/',
      root: path.join(REPOSITORY_ROOT, 'docs')
    }),
    Object.freeze({
      routePrefix: '/control-center',
      root: path.resolve(REPOSITORY_ROOT, '../control-center')
    }),
    Object.freeze({
      routePrefix: '/design-system-core',
      root: path.join(REPOSITORY_ROOT, 'design-system-core')
    })
  ]),
  host: process.env.DEVELOPER_MODE_HOST || '127.0.0.1',
  port: Number(process.env.DEVELOPER_MODE_PORT || 8891),
  publicOrigin: process.env.DEVELOPER_MODE_PUBLIC_ORIGIN || 'http://127.0.0.1:8891',
  runtime:runtimeConfiguration,
  sandbox:sandboxConfiguration,
  memory:memoryConfiguration,
  execution:executionConfiguration,
  repositoryIntelligence:repositoryIntelligenceConfiguration,
  allowedRoots: splitEnvList(process.env.DEVELOPER_ALLOWED_ROOTS || REPOSITORY_ROOT).map((entry) => path.resolve(entry)),
  github: {
    clientId: process.env.GITHUB_OAUTH_CLIENT_ID || '',
    clientSecret: process.env.GITHUB_OAUTH_CLIENT_SECRET || '',
    scope: process.env.GITHUB_OAUTH_SCOPE || 'repo read:user'
  },
  providers: {
    ollamaBaseUrl: process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434',
    openAICompatibleBaseUrl: process.env.ICOS_OPENAI_COMPATIBLE_BASE_URL
      || process.env.LM_STUDIO_BASE_URL
      || 'http://127.0.0.1:1234/v1',
    openAICompatibleAPIKey: process.env.ICOS_OPENAI_COMPATIBLE_API_KEY || process.env.LM_STUDIO_API_KEY || '',
    openAICompatibleModel: process.env.ICOS_OPENAI_COMPATIBLE_MODEL || process.env.LM_STUDIO_MODEL || ''
  }
});

/* =============================================================================
   10) END OF FILE
============================================================================= */
