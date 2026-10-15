import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source=readFileSync(new URL('../../docs/assets/js/core/03-runtime/global-layout-injection.js',import.meta.url),'utf8');
const start=source.indexOf('async function injectGlobalLayout()');
const end=source.indexOf('\ninjectGlobalLayout().then',start);
assert(start>=0&&end>start);
const pending=new Map(),commits=[];
const targets=['first','second'].map(name=>({
  dataset:{},getAttribute:()=>name,
  set innerHTML(value){commits.push(value);},
  dispatchEvent(){}
}));
const context={
  NEURO_MAIN_RUNTIME:{globalLayoutInjected:false},
  dispatchRuntimeLoadingStart(){},dispatchRuntimeLoadingStop(){},ensureRequiredGlobalFragmentMounts(){},
  resolveFragmentPath:name=>name,
  fetchTextFromCandidates:name=>new Promise(resolve=>pending.set(name,resolve)),
  document:{querySelectorAll:()=>targets,dispatchEvent(){}},
  window:{setTimeout:fn=>fn(),dispatchEvent(){}},
  CustomEvent:class {constructor(type,options){this.type=type;this.detail=options.detail;}}
};
vm.createContext(context);
vm.runInContext(source.slice(start,end)+'\nthis.run=injectGlobalLayout;',context);
const completion=context.run();
assert.equal(pending.size,2,'Independent fragment requests must start together');
pending.get('second')({ok:true,text:'second'});
pending.get('first')({ok:true,text:'first'});
await completion;
assert.deepEqual(commits,['first','second'],'Mount order must not depend on network order');
assert.equal(context.NEURO_MAIN_RUNTIME.globalLayoutInjected,true);
console.log('PASS: parallel fragment fetch preserves deterministic mount order.');
