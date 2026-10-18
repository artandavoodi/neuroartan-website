import {readFile} from 'node:fs/promises';
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
const source=await readFile(new URL('../../docs/assets/js/layers/website/system/config/supabase-config.js',import.meta.url),'utf8');
test('OAuth returns never include credentials and duplicated callback fragments select the newest session',()=>{
  const context=vm.createContext({URL,URLSearchParams});
  vm.runInContext(source.slice(source.indexOf('function authReturnUrl('),source.indexOf('window.neuroartanAuthReturnUrl'))+'\nthis.clean=authReturnUrl;this.normalize=normalizeOAuthCallbackUrl;',context);
  assert.equal(context.clean({pathname:'/',origin:'https://neuroartan.com',search:'?secret=discard',hash:'#access_token=discard'}),'https://neuroartan.com/');
  const old='access_token=old&refresh_token=old&token_type=bearer',fresh='access_token=fresh&refresh_token=fresh&token_type=bearer';
  assert.equal(context.normalize(`https://neuroartan.com/##${old}#${fresh}`),`https://neuroartan.com/#${fresh}`);
  assert.equal(context.normalize('https://neuroartan.com/#details'),'https://neuroartan.com/#details');
});
function fixture(){
  const cookies=new Map(),legacy=new Map();
  const document={get cookie(){return [...cookies].map(([k,v])=>`${k}=${v}`).join('; ');},set cookie(value){assert.ok(value.length<4096);const [pair,...attributes]=value.split('; '),offset=pair.indexOf('='),key=pair.slice(0,offset);if(attributes.includes('Max-Age=0'))cookies.delete(key);else cookies.set(key,pair.slice(offset+1));}};
  const window={location:{hostname:'neuroartan.com'},localStorage:{getItem:key=>legacy.get(key)??null,removeItem:key=>legacy.delete(key)}};
  const context=vm.createContext({document,window});
  vm.runInContext(source.slice(source.indexOf('function isSharedNeuroartanAuthHost()'),source.indexOf('async function registerSupabaseClient()'))+'\nthis.storage=createNeuroartanAuthStorage();',context);
  return {storage:context.storage,cookies,legacy};
}
test('large OAuth sessions round-trip without exceeding cookie limits',()=>{
  const {storage,cookies}=fixture(),session=JSON.stringify({token:'x'.repeat(9000),name:'Artan 🎵'});
  storage.setItem('session',session);assert.equal(storage.getItem('session'),session);assert.ok(cookies.size>1);
  storage.setItem('session','short');assert.equal(cookies.size,1);assert.equal(storage.getItem('session'),'short');
  storage.removeItem('session');assert.equal(cookies.size,0);assert.equal(storage.getItem('session'),null);
});
test('legacy migration is verified and unrelated cookies remain intact',()=>{
  const {storage,cookies,legacy}=fixture();legacy.set('session','x'.repeat(6000));cookies.set('preferences','skip');
  assert.equal(storage.getItem('session'),'x'.repeat(6000));assert.equal(legacy.has('session'),false);
  storage.removeItem('session');assert.equal(cookies.get('preferences'),'skip');
});
