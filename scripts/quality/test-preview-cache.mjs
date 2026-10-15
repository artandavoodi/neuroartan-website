import {createServer} from 'node:http';
import assert from 'node:assert/strict';
import {readdir,readFile} from 'node:fs/promises';
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
  const scan=async directory=>{
    for(const entry of await readdir(directory,{withFileTypes:true})){
      const file=new URL(entry.name+(entry.isDirectory()?'/':''),directory);
      if(entry.isDirectory()){await scan(file);continue;}
      if(!entry.name.endsWith('.html'))continue;
      const html=await readFile(file,'utf8');
      assert(!html.includes('href="/assets/css/core/00-orchestrator/core.css"'),`Unversioned core entry: ${file.pathname}`);
      for(const loader of html.matchAll(/<div\b[^>]*id="global-loading-overlay"[^>]*>/g)){
        assert(/\bhidden\b(?!\s*=)/.test(loader[0]),`Loader must start semantically hidden: ${file.pathname}`);
      }
    }
  };
  await scan(new URL('../../docs/',import.meta.url));
  console.log('PASS: preview serves canonical CSS without conditional-cache reuse.');
} finally {
  server.closeAllConnections();
  await new Promise(resolve=>server.close(resolve));
}
