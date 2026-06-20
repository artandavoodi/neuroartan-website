/* =============================================================================
   00) FILE INDEX
   01) IMPORTS
   02) PUBLIC PROFILE ROUTE FALLBACK
   03) SERVER
   04) END OF FILE
============================================================================= */

/* =============================================================================
   01) IMPORTS
============================================================================= */
import http from 'node:http';
import { developerModeConfig } from './config.mjs';
import { handleDeveloperModeApi } from './api-router.mjs';
import { serveStatic } from './static-server.mjs';
import { createRuntimeManager } from './runtime-manager.mjs';

/* =============================================================================
   02) PUBLIC PROFILE ROUTE FALLBACK
============================================================================= */

const PUBLIC_PROFILE_ROUTE_PROTECTED_SEGMENTS = new Set([
  '404',
  'about',
  'admin',
  'api',
  'assets',
  'brand',
  'company',
  'contact',
  'cookie',
  'cookies',
  'css',
  'docs',
  'feed',
  'home',
  'index',
  'js',
  'legal',
  'login',
  'model',
  'models',
  'privacy',
  'profile',
  'profiles',
  'publications',
  'registry',
  'robots.txt',
  'settings',
  'signin',
  'signup',
  'terms'
]);

function isPublicProfileRouteFallback(url) {
  if (url.pathname === '/' || url.pathname.includes('.')) {
    return false;
  }

  const segments = url.pathname.split('/').filter(Boolean);
  if (segments.length !== 1) {
    return false;
  }

  return !PUBLIC_PROFILE_ROUTE_PROTECTED_SEGMENTS.has(segments[0].toLowerCase());
}

function createPublicProfileFallbackUrl(url) {
  const fallbackUrl = new URL(url.href);
  fallbackUrl.pathname = '/404.html';
  fallbackUrl.search = url.search;
  return fallbackUrl;
}

/* =============================================================================
   03) SERVER
============================================================================= */
/* -----------------------------------------------------------------------------
   RUNTIME BOOTSTRAP
----------------------------------------------------------------------------- */
const runtimeManager = createRuntimeManager({
  config: developerModeConfig,
});

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url || '/', developerModeConfig.publicOrigin);

  request.runtimeManager = runtimeManager;

  if (await handleDeveloperModeApi(request, response, url)) {
    return;
  }

  await serveStatic(
    request,
    response,
    isPublicProfileRouteFallback(url) ? createPublicProfileFallbackUrl(url) : url
  );
});

/* -----------------------------------------------------------------------------
   SERVER STARTUP
----------------------------------------------------------------------------- */
function probeExistingServer() {
  return new Promise((resolve) => {
    const request = http.get(developerModeConfig.publicOrigin, (response) => {
      response.resume();
      resolve(true);
    });

    request.on('error', () => {
      resolve(false);
    });

    request.setTimeout(2000, () => {
      request.destroy();
      resolve(false);
    });
  });
}

server.once('error', async (error) => {
  if (error?.code === 'EADDRINUSE') {
    const serverIsReachable = await probeExistingServer();

    if (serverIsReachable) {
      console.log(`Neuroartan Developer Mode server is already running at ${developerModeConfig.publicOrigin}`);
      process.exit(0);
    }

    console.error(`Neuroartan Developer Mode port is occupied but not reachable at ${developerModeConfig.publicOrigin}`);
    process.exit(1);
  }

  throw error;
});

server.listen(developerModeConfig.port, developerModeConfig.host, () => {
  console.log(`Neuroartan Developer Mode server running at ${developerModeConfig.publicOrigin}`);
});

/* =============================================================================
   04) END OF FILE
============================================================================= */
