/* =============================================================================
   00) FILE INDEX
   01) IMPORTS
   02) CONTENT TYPES
   03) STATIC SERVING
   04) END OF FILE
============================================================================= */

/* =============================================================================
   01) IMPORTS
============================================================================= */
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { developerModeConfig } from './config.mjs';
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
   03) STATIC SERVING
============================================================================= */
function resolveStaticPath(urlPath) {
  const decodedPath = decodeURIComponent(urlPath.split('?')[0] || '/');
  const normalizedPath = decodedPath === '/' ? '/index.html' : decodedPath;
  const absolutePath = path.resolve(developerModeConfig.docsRoot, `.${normalizedPath}`);
  const relative = path.relative(developerModeConfig.docsRoot, absolutePath);

  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    return '';
  }

  return absolutePath;
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
    }

    const contentType = CONTENT_TYPES[path.extname(filePath)] || 'application/octet-stream';
    response.writeHead(200, {
      'content-type':contentType,
      'cache-control':'no-store'
    });
    createReadStream(filePath).pipe(response);
    return true;
  } catch (_) {
    sendText(response, 404, 'Not found');
    return true;
  }
}

/* =============================================================================
   04) END OF FILE
============================================================================= */
