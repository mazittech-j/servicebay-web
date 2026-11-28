import {readdir, readFile, writeFile, mkdir, copyFile} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {build, transform} from 'esbuild';
import {services} from '../src/content.mjs';
import {maintenancePlans} from '../src/amc.mjs';
const pricing=Object.fromEntries([...services.map(s=>({...s,kind:'service'})),...maintenancePlans.map(p=>({...p,kind:'plan'}))].map(({id,name,rate,kind})=>[id,{name,rate,kind}]));
const assets={}, paths=[];
const types={html:'text/html',css:'text/css',js:'text/javascript',svg:'image/svg+xml',json:'application/json',webp:'image/webp',png:'image/png',jpg:'image/jpeg',txt:'text/plain',xml:'application/xml',woff2:'font/woff2'};
const compatJs=new Set(['/site.js','/home-tools.js','/i18n-ar.js','/google-reviews.js','/portal.js','/account.js','/analytics.js']);
async function walk(dir) {
  for(const entry of await readdir('dist'+dir,{withFileTypes:true})) {
    const path=dir+'/'+entry.name;
    if(path==='/server'||entry.name.startsWith('.')||entry.name==='_redirects') continue;
    if(entry.isDirectory()){await walk(path);continue}
    const type=types[entry.name.split('.').pop()];
    if(!type) continue;
    let bytes=await readFile('dist'+path);
    if(compatJs.has(path)){const res=await transform(bytes.toString(),{target:['chrome68','safari12'],loader:'js'});bytes=Buffer.from(res.code)}
    const zip=type.startsWith('text/')||type.includes('json')||type.includes('xml');
    const key=path.replace(/index\.html$/,'');
    if(type==='text/html'&&!bytes.includes('http-equiv="refresh"')) paths.push(key);
    assets[key]=[type,zip,(zip?gzipSync(bytes):bytes).toString('base64')];
  }
}
await walk('');
await writeFile('backend/generated.mjs','export const assets='+JSON.stringify(assets)+';export const routes='+JSON.stringify(paths.sort())+';export const pricing='+JSON.stringify(pricing)+';');
await mkdir('dist/server',{recursive:true});
await build({entryPoints:['backend/entry.mjs'],bundle:true,platform:'browser',target:'es2022',format:'esm',outfile:'dist/server/index.js',minify:true,legalComments:'none',alias:{linkedom:'linkedom/worker'}});
await mkdir('dist/.openai',{recursive:true});
try{await copyFile('.openai/hosting.json','dist/.openai/hosting.json')}catch(e){if(e.code!=='ENOENT')throw e}
