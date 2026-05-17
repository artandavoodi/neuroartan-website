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
import { stat } from 'node:fs/promises';
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

    const contentType = CONTENT_TYPES[path.extname(filePath)] || 'application/octet-stream';
    response.writeHead(200, {
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
    return true;
  } catch (_) {
    sendText(response, 404, 'Not found');
    return true;
  }
}

/* =============================================================================
   05) END OF FILE
============================================================================= */
