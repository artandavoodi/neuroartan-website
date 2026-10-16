/* Explicit, one-way distribution of the public information component only. */
import {readFile,writeFile,copyFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
const file='docs/assets/css/core/04-systems/public-information.css';
const source=path.join(root,file);
const hash=createHash('sha256').update(await readFile(source)).digest('hex');
for(const name of ['artandavoodi','artanrecords','artan-live','artan-store']){
  const target=path.resolve(root,'..',name);
  await readFile(path.join(target,'README.md'),'utf8');
  const destination=name==='artan-store'?'web/shared/public-information.css':file;
  await copyFile(source,path.join(target,destination));
  if(name==='artanrecords'){
    const manifestPath=path.join(target,'planning/source-manifest.json');
    const manifest=JSON.parse(await readFile(manifestPath,'utf8'));
    manifest.files=manifest.files.filter(entry=>entry.file!==file);
    manifest.files.push({file,sha256:hash});
    await writeFile(manifestPath,JSON.stringify(manifest,null,2)+'\n');
  }
  if(name==='artan-store'){
    const manifestPath=path.join(target,'web/shared/manifest.json');
    const manifest=JSON.parse(await readFile(manifestPath,'utf8'));
    manifest.files['public-information.css']=hash;
    await writeFile(manifestPath,JSON.stringify(manifest,null,2)+'\n');
  }
}
console.log('Distributed canonical public-information styling to four consumers.');
