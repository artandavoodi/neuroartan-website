/* =============================================================================
   00) FILE INDEX
   01) IMPORTS
   02) SERVER
   03) END OF FILE
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
   02) SERVER
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

  await serveStatic(request, response, url);
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
   03) END OF FILE
============================================================================= */
