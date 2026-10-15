import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const root=new URL('../../docs/',import.meta.url);
const source=readFileSync(new URL('assets/js/layers/website/navigation/institutional-menu.js',root),'utf8');
const start=source.indexOf('    function loadSearchEntries()');
const end=source.indexOf('    function renderSearchResults(',start);
assert(start>=0&&end>start);
let requests=0;
const context={
  searchEntriesPromise:null,
  collectMenuSearchEntries:()=>[],
  normalizeSearchValue:value=>value.toLowerCase(),
  fetch:async path=>{
    requests++;
    return {ok:true,json:async()=>JSON.parse(readFileSync(new URL(path.slice(1),root),'utf8'))};
  }
};
vm.createContext(context);
vm.runInContext(source.slice(start,end)+'\nthis.load=loadSearchEntries;',context);
const entries=await context.load();
assert(entries.some(entry=>entry.haystack.includes('saeed davoodi')),'Founder names must be discoverable');
assert(entries.some(entry=>entry.href==='/pages/support/help-center/index.html'),'Support routes must be discoverable');
assert.equal(new Set(entries.map(entry=>entry.href)).size,entries.length,'Search destinations must be unique');
await context.load();
assert.equal(requests,4,'Indexes must be cached per page, not fetched on every keystroke');
console.log('PASS: shared navigation searches content, routes, entities and founder data.');
