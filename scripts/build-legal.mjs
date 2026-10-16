import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const forbidden=/source_path|source_document_id|contract_version|Personnel ID|Agent ID|Execution Context|Document Control|Change Log|Vault Governance|shared legal publication|governed source document/i;
const catalog=JSON.parse(await readFile(path.join(root,'docs/assets/data/legal/index.json'),'utf8'));
for(const name of ['privacy','terms',...catalog.pages.map(p=>p.page)]){
  const entry=catalog.pages.find(p=>p.page===name);
  const canonicalUrl=`https://neuroartan.com/pages/legal/${name==='index'?'':`${name}/`}`;
  const source=entry?JSON.stringify({...entry,effectiveDate:catalog.effectiveDate,lastUpdated:catalog.lastUpdated,meta:['Effective date: October 16, 2026','Last updated: October 16, 2026'],structuredData:{'@context':'https://schema.org','@type':'WebPage',name:entry.title,url:canonicalUrl,dateModified:catalog.lastUpdated}}):await readFile(path.join(root,`docs/assets/data/legal/${name}/index.json`),'utf8');
  if(forbidden.test(source)) throw Error(`Internal material in public ${name} source`);
  const data=JSON.parse(source);
  const sections=data.sections.map(section=>{
    const paragraphs=(section.paragraphs||[]).map(p=>{
      if(typeof p!=='string') throw Error('Public legal paragraphs must be plain text');
      return `<p>${escape(p)}</p>`;
    }).join('\n');
    const lists=['list','orderedList'].map(key=>{
      if(!section[key]?.length)return '';
      const tag=key==='list'?'ul':'ol';
      return `<${tag}>${section[key].map(item=>`<li>${escape(item)}</li>`).join('')}</${tag}>`;
    }).join('');
    return `<section class="legal-page-section" id="${escape(section.id)}"><h2>${escape(section.title)}</h2>${paragraphs}${lists}</section>`;
  }).join('\n');
  const navigation=data.sections.map(s=>`<a href="#${escape(s.id)}">${escape(s.title)}</a>`).join('\n');
  const documents=await Promise.all(['privacy','terms'].map(async page=>JSON.parse(await readFile(path.join(root,`docs/assets/data/legal/${page}/index.json`),'utf8'))));
  const sidebar=[...documents,...catalog.pages].map(item=>`<a href="/pages/legal/${item.page==='index'?'':`${escape(item.page)}/`}"${item.page===name?' aria-current="page"':''}>${escape(item.title)}</a>`).join('');
  const output=`<section class="legal-page-shell" data-legal-page="${name}" data-effective-date="${escape(data.effectiveDate)}" data-last-updated="${escape(data.lastUpdated)}">
  <div class="document-reader" data-document-reader>
  <aside class="document-reader__sidebar"><details open data-reader-disclosure><summary>Legal information</summary><nav aria-label="Legal documents">${sidebar}</nav></details></aside>
  <article class="document-reader__article"><nav class="document-reader__breadcrumb" aria-label="Breadcrumb"><a href="/">Neuroartan</a><span>/</span><a href="/pages/legal/">Legal</a><span>/</span><span>${escape(data.title)}</span></nav>
  <header class="legal-page-header"><p class="legal-page-eyebrow">Legal</p><h1 class="legal-page-title">${escape(data.title)}</h1><p class="legal-page-intro">${escape(data.intro)}</p><ul class="legal-page-meta">${data.meta.map(t=>`<li>${escape(t)}</li>`).join('')}</ul></header>
  <div class="legal-page-divider"></div><div class="legal-page-content">${sections}</div>
  </article><aside class="document-reader__toc"><details open data-reader-disclosure><summary>In this article</summary><nav aria-label="In this article">${navigation}</nav></details></aside>
  </div>
</section>
`;
  const target=path.join(root,`docs/pages/legal/${name==='index'?'':`${name}/`}index.html`);
  let html=await readFile(target,'utf8');
  const start=html.indexOf('<section class="legal-page-shell"');
  const end=html.indexOf('\n<!--',start);
  if(start<0||end<0)throw Error('Legal shell boundaries missing');
  html=html.slice(0,start)+output+html.slice(end);
  html=html.replace(/<h1 style="position:absolute;[^>]*>[\s\S]*?<\/h1>\n/,'')
    .replace(/<meta name="(?:document-id|legal-[^"]+)"[^>]*>\n/g,'')
    .replace(/ data-document-id="[^"]*"/g,'')
    .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/,`<script type="application/ld+json">${JSON.stringify(data.structuredData,null,2)}</script>`);
  html=html.replace(/<title>[^<]*<\/title>/,`<title>${escape(data.title)} | Neuroartan</title>`)
    .replace(/<link rel="canonical"[^>]*>/,`<link rel="canonical" href="${data.canonicalUrl||canonicalUrl}">`);
  await writeFile(target,html);
}
console.log('Built standalone public legal pages from website-owned content.');
