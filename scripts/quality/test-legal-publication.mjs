import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
const paths=['index','privacy','terms','cookies','imprint','data','acceptable-use','disclosures','policies','trademark'].map(name=>`docs/pages/legal/${name==='index'?'':`${name}/`}index.html`);
const before=await Promise.all(paths.map(p=>readFile(p,'utf8')));
execFileSync(process.execPath,['scripts/build-legal.mjs']);
const after=await Promise.all(paths.map(p=>readFile(p,'utf8')));
assert.deepEqual(after,before,'Legal pages must match their website-owned source');
for(const [i,html] of after.entries()){
  assert(!/vault-sync|source_path|Personnel ID|Agent ID|Execution Context|Change Log|Document Control|shared legal publication|LEGAL-DOCUMENT-ID/i.test(html),paths[i]);
  assert.match(html,/data-effective-date="\d{4}-\d{2}-\d{2}"/);
  assert.match(html,/data-last-updated="\d{4}-\d{2}-\d{2}"/);
  assert.match(html,/<section class="legal-page-section"/);
  assert.equal((html.match(/<h1[ >]/g)||[]).length,1,'One public heading per legal page');
}
const behavior=await readFile('docs/assets/js/layers/website/sections/legal.js','utf8');
assert(!/fetch\(|innerHTML|legalSyncPath/.test(behavior),'No remote legal content or raw HTML injection');
console.log('PASS: standalone legal HTML, publication boundaries, dates and deterministic generation.');
