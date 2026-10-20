/* Explicit distribution of the canonical close primitive to legacy public surfaces. */
import {readFile,writeFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const revision=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
const targets={
  artandavoodi:{'docs/assets/css/core/04-systems/close-button.css':'docs/assets/css/core/04-systems/close-button.css','docs/assets/js/core/01-foundation/close-button.js':'docs/assets/js/core/close-button.js'},
  'artan-live':{'docs/assets/css/core/04-systems/close-button.css':'docs/assets/css/core/04-systems/close-button.css'}
};
for(const [name,files] of Object.entries(targets)){
  const target=resolve(root,'..',name);
  if(execFileSync('git',['rev-parse','--show-toplevel'],{cwd:target,encoding:'utf8'}).trim()!==target)throw Error('Unverified consumer '+name);
  const records=[];
  for(const [sourceFile,file]of Object.entries(files)){
    const bytes=execFileSync('git',['show',`${revision}:${sourceFile}`],{cwd:root});
    await writeFile(resolve(target,file),bytes);
    records.push({file,sha256:createHash('sha256').update(bytes).digest('hex'),sourceRepository:'artandavoodi/neuroartan-website',sourceCommit:revision,sourceFile});
  }
  if(name==='artandavoodi'){
    const path=resolve(target,'planning/style-baseline.json');
    const manifest=JSON.parse(await readFile(path,'utf8'));
    manifest.files=manifest.files.filter(entry=>!records.some(record=>record.file===entry.file));
    manifest.files.push(...records);await writeFile(path,JSON.stringify(manifest,null,2)+'\n');
  }
  console.log('Synchronized canonical close controls: '+name);
}
