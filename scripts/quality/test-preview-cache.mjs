import {createServer} from 'node:http';
import assert from 'node:assert/strict';
import {serveStatic} from '../../server/developer-mode/static-server.mjs';

const server=createServer((request,response)=>{
  serveStatic(request,response,new URL(request.url,'http://localhost'))
    .catch(()=>{response.statusCode=500;response.end();});
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
try {
  const origin=`http://127.0.0.1:${server.address().port}`;
  const response=await fetch(`${origin}/assets/css/core/00-orchestrator/core.css`,{
    headers:{'If-Modified-Since':'Thu, 01 Jan 2099 00:00:00 GMT'}
  });
  assert.equal(response.status,200,'Never reuse a different repository\'s cached asset');
  assert.equal(response.headers.get('cache-control'),'no-store');
  assert.match(await response.text(),/CORE ORCHESTRATOR BRIDGE/);
  console.log('PASS: preview serves canonical CSS without conditional-cache reuse.');
} finally {
  server.closeAllConnections();
  await new Promise(resolve=>server.close(resolve));
}
