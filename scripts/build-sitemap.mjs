import {execFileSync} from 'node:child_process';
import {readFile,writeFile,access} from 'node:fs/promises';
const root=new URL('../',import.meta.url),origin='https://neuroartan.com';
const files=execFileSync('git',['ls-files','docs/index.html','docs/pages/**/index.html'],{cwd:root,encoding:'utf8'}).trim().split('\n');
const routes=new Set(['/']);
for(const file of files){
  if(/\/(legacy|transitional)\//.test(file))continue;
  const html=await readFile(new URL(file,root),'utf8');
  if(/<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex/i.test(html))continue;
  const canonical=html.match(/<link[^>]+rel="canonical"[^>]+href="([^"]+)"/i)?.[1];
  if(!canonical)continue;
  const url=new URL(canonical);if(url.origin!==origin||url.search||url.hash)continue;
  const route=url.pathname.replace(/index\.html$/,'');
  const target=new URL(`docs${route}${route.endsWith('/')?'index.html':''}`,root);
  try{await access(target);}catch{continue;}
  if(route!=='/'+file.replace(/^docs\//,'').replace(/index\.html$/,''))continue;
  routes.add(route);
}
await writeFile(new URL('docs/sitemap.xml',root),`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...routes].sort().map(route=>`  <url><loc>${origin}${route}</loc></url>`).join('\n')}\n</urlset>\n`);
console.log(`Published ${routes.size} existing self-canonical public routes.`);
