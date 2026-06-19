/* =============================================================================
   00) FILE INDEX
   01) IMPORTS
   02) CONTENT TYPES
   03) RUNTIME STATIC INTELLIGENCE
   04) STATIC SERVING
   05) END OF FILE
============================================================================= */

/* =============================================================================
   01) IMPORTS
============================================================================= */
import { createReadStream } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { developerModeConfig } from './config.mjs';
import {
  getRuntimeMetrics,
  listRuntimes
} from './runtime-store.mjs';
import { sendText } from './http-utils.mjs';

/* =============================================================================
   02) CONTENT TYPES
============================================================================= */
const CONTENT_TYPES = Object.freeze({
  '.html':'text/html; charset=utf-8',
  '.css':'text/css; charset=utf-8',
  '.js':'text/javascript; charset=utf-8',
  '.json':'application/json; charset=utf-8',
  '.svg':'image/svg+xml',
  '.png':'image/png',
  '.jpg':'image/jpeg',
  '.jpeg':'image/jpeg',
  '.webp':'image/webp',
  '.ico':'image/x-icon',
  '.txt':'text/plain; charset=utf-8'
});

let publicProfileRoutePolicyPromise = null;

/* =============================================================================
   03) RUNTIME STATIC INTELLIGENCE
============================================================================= */
function buildRuntimeHeaders() {
  const runtimes = listRuntimes();
  const metrics = getRuntimeMetrics();

  return {
    'x-icos-runtime-count':String(runtimes.length),
    'x-icos-runtime-sessions':String(metrics.activeSessions || 0),
    'x-icos-runtime-projects':String(metrics.activeProjects || 0),
    'x-icos-runtime-agents':String(metrics.activeAgentSessions || 0),
    'x-icos-runtime-mode':String(
      developerModeConfig.runtime.runtimeMode || 'development'
    ),
    'x-icos-runtime-orchestration':String(
      developerModeConfig.runtime.orchestrationEnabled
    )
  };
}

/* =============================================================================
   04) STATIC SERVING
============================================================================= */
function getStaticRoots() {
  const roots = Array.isArray(developerModeConfig.staticRoots)
    ? developerModeConfig.staticRoots
    : [{ routePrefix:'/', root:developerModeConfig.docsRoot }];

  return [...roots].sort(
    (a, b) => String(b.routePrefix || '/').length - String(a.routePrefix || '/').length
  );
}

function matchesStaticRoot(normalizedPath, routePrefix) {
  if (routePrefix === '/') return true;
  return normalizedPath === routePrefix || normalizedPath.startsWith(`${routePrefix}/`);
}

function getStaticRootRelativePath(normalizedPath, routePrefix) {
  if (routePrefix === '/') return normalizedPath;

  const relativePath = normalizedPath.slice(routePrefix.length) || '/';
  return relativePath === '/' ? '/index.html' : relativePath;
}

function resolveStaticPath(urlPath) {
  const decodedPath = decodeURIComponent(urlPath.split('?')[0] || '/');
  const normalizedPath = decodedPath === '/' ? '/index.html' : decodedPath;

  for (const staticRoot of getStaticRoots()) {
    const routePrefix = String(staticRoot.routePrefix || '/').replace(/\/+$/u, '') || '/';
    const root = path.resolve(staticRoot.root || developerModeConfig.docsRoot);

    if (!matchesStaticRoot(normalizedPath, routePrefix)) continue;

    const rootRelativePath = getStaticRootRelativePath(normalizedPath, routePrefix);
    const absolutePath = path.resolve(root, `.${rootRelativePath}`);
    const relative = path.relative(root, absolutePath);

    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      return '';
    }

    return absolutePath;
  }

  return '';
}

async function getPublicProfileRoutePolicy() {
  if (!publicProfileRoutePolicyPromise) {
    const policyPath = path.join(
      developerModeConfig.docsRoot,
      'assets/data/accounts/profile-identity-policy.json'
    );

    publicProfileRoutePolicyPromise = readFile(policyPath, 'utf8')
      .then((source) => JSON.parse(source))
      .catch(() => null);
  }

  return publicProfileRoutePolicyPromise;
}

async function resolvePublicProfileFallbackPath(urlPath) {
  const decodedPath = decodeURIComponent(urlPath.split('?')[0] || '/');
  const segments = decodedPath.replace(/^\/+|\/+$/gu, '').split('/').filter(Boolean);

  if (segments.length !== 1) return '';

  const candidate = segments[0].toLowerCase();
  const policy = await getPublicProfileRoutePolicy();
  const publicRoute = policy?.public_route || {};
  const username = policy?.username || {};
  const protectedExact = new Set((publicRoute.protected_exact || []).map((value) => String(value).toLowerCase()));
  const pattern = username.allowed_pattern ? new RegExp(username.allowed_pattern) : null;

  if (
    !candidate
    || candidate.startsWith('_')
    || protectedExact.has(candidate)
    || !pattern?.test(candidate)
    || candidate.length < Number(username.min_length || 3)
    || candidate.length > Number(username.max_length || 32)
  ) {
    return '';
  }

  return path.join(developerModeConfig.docsRoot, '404.html');
}

function streamStaticFile(response, filePath, status = 200) {
  const contentType = CONTENT_TYPES[path.extname(filePath)] || 'application/octet-stream';
  response.writeHead(status, {
    'content-type':contentType,
    'cache-control':'no-store',
    ...buildRuntimeHeaders()
  });
  const stream = createReadStream(filePath);
  stream.on('error', () => {
    if (!response.headersSent) {
      sendText(response, 404, 'Not found');
      return;
    }

    response.destroy();
  });
  stream.pipe(response);
}

function isHtmlNavigationRequest(request) {
  return request.method === 'GET'
    && String(request.headers.accept || '').includes('text/html');
}

export async function serveStatic(request, response, url) {
  let filePath = resolveStaticPath(url.pathname);
  if (!filePath) {
    sendText(response, 403, 'Forbidden');
    return true;
  }

  try {
    const fileStat = await stat(filePath);
    if (fileStat.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
      const indexStat = await stat(filePath);
      if (!indexStat.isFile()) {
        sendText(response, 404, 'Not found');
        return true;
      }
    }

    streamStaticFile(response, filePath);
    return true;
  } catch (_) {
    if (isHtmlNavigationRequest(request)) {
      const fallbackPath = await resolvePublicProfileFallbackPath(url.pathname);

      if (fallbackPath) {
        streamStaticFile(response, fallbackPath);
        return true;
      }

      streamStaticFile(response, path.join(developerModeConfig.docsRoot, '404.html'));
      return true;
    }

    sendText(response, 404, 'Not found');
    return true;
  }
}

/* =============================================================================
   05) END OF FILE
============================================================================= */
