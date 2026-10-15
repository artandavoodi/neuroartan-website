import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source=readFileSync(new URL('../../docs/assets/js/layers/website/overlays/account/account-drawer.js',import.meta.url),'utf8');
const nodes=new Map(),listeners=new Map();
function node(selector){
  if(nodes.has(selector))return nodes.get(selector);
  const classes=new Set(),attributes=new Map();
  const value={dataset:{},hidden:false,classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),toggle:(x,on)=>on?classes.add(x):classes.delete(x),contains:x=>classes.has(x)},hasAttribute:x=>attributes.has(x),setAttribute:(x,v)=>attributes.set(x,v),querySelector:s=>nodes.get(s)||null,querySelectorAll:s=>s==='[data-account-view]'?[nodes.get('signin'),nodes.get('signup')]:[]};
  nodes.set(selector,value);return value;
}
for(const key of ['#account-drawer','[data-auth-state]','[data-profile-state]','[data-account-view-mount="true"]','.account-drawer-entry-card','.account-drawer-actions','.account-drawer-identity-options','.account-drawer-support','.account-drawer-legal-note','signin','signup'])node(key);
node('signin').dataset.accountView='sign-in';node('signup').dataset.accountView='sign-up';
const listen=(name,handler)=>listeners.set(name,[...(listeners.get(name)||[]),handler]);
const document={readyState:'complete',documentElement:{dataset:{}},querySelector:s=>nodes.get(s)||null,querySelectorAll:()=>[],addEventListener:listen};
const window={addEventListener:listen};
vm.runInNewContext(source,{document,window});
for(const surface of ['sign-in','sign-up']){
  const drawer=node('#account-drawer');drawer.dataset.accountDrawerView='auth';drawer.dataset.accountDrawerSurface=surface;
  for(const handler of listeners.get('fragment:mounted'))handler({detail:{name:'unrelated'}});
  assert.equal(node('[data-account-view-mount="true"]').hidden,false);
  assert.equal(node(surface==='sign-in'?'signin':'signup').hidden,false);
  assert.equal(node(surface==='sign-in'?'signup':'signin').hidden,true);
}
node('#account-drawer').dataset.accountDrawerView='profile';
for(const handler of listeners.get('fragment:mounted'))handler({detail:{name:'unrelated'}});
assert.equal(node('[data-profile-state]').hidden,false);
console.log('PASS: unrelated fragment mounts preserve sign-in, sign-up and profile views.');
