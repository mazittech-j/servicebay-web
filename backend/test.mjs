import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFile} from 'node:fs/promises';
import worker from '../dist/server/index.js';
import {records} from './store.mjs';
import {parseHTML} from 'linkedom';
const db=new DatabaseSync(':memory:');
db.exec(await readFile(new URL('../drizzle/0000_servicebay.sql',import.meta.url),'utf8'));
const query=(sql,args)=>db.prepare(sql).all(...args),store=records(query);
const env={SERVICEBAY_OWNER_EMAIL:'owner@example.test',DB:{prepare:sql=>({bind:(...args)=>({all:async()=>({results:query(sql,args)})})})}};
const origin='https://website.example';
function call(path,{admin=false,post,config=env,ctx,headers={}}={}){
  return worker.fetch(new Request(origin+path,{method:post?'POST':'GET',headers:{...(post?{'Content-Type':'application/json',origin}:{}),...(admin?{'oai-authenticated-user-id':'test-user','oai-authenticated-user-email':'owner@example.test'}:{}),...headers},body:post?JSON.stringify(post):null}),config,ctx);
}
test('Private admin, static pages and service photos',async()=>{
  assert.equal((await call('/admin/')).status,403);
  assert.equal((await call('/admin/',{admin:true})).status,200);
  assert.equal((await call('/api/admin/state')).status,403);
  const {routes}=await (await call('/api/admin/state',{admin:true})).json();assert.equal(routes.length,42);
  for(const route of routes){const r=await call(route);assert.equal(r.status,200,route);assert.match(await r.text(),/<h1\b/)}
  assert.match(await (await call('/amc/')).text(),/Premium Care/);
  assert.equal((await call('/assets/servicebay-wordmark.webp')).headers.get('content-type'),'image/webp');
  assert.equal((await call('/missing-page/')).status,404);
});
test('Visual editor saves a draft, publishes, protects concurrent writes, removes a section',async()=>{
  const endpoint='/api/admin/content?path=%2Fabout%2F';
  const {draft,version}=await (await call(endpoint,{admin:true})).json();
  const {document:d}=parseHTML(await (await call('/about/?studio=1',{admin:true})).text());
  const id=d.querySelector('h1').getAttribute('data-studio-field');assert.ok(id);
  draft.changes[id]='Our test heading';draft.sections.push({heading:'New service note',body:'A short note.',image:'',alt:''});draft.title='ServiceBay - About our team';
  const save=(action,v)=>call(endpoint,{admin:true,post:{value:draft,action,version:v}});
  assert.equal((await save('draft',version)).status,200);
  assert.doesNotMatch(await (await call('/about/')).text(),/New service note/);
  assert.match(await (await call('/about/?studio=1',{admin:true})).text(),/Our test heading/);
  assert.equal((await save('publish',version)).status,409);
  assert.equal((await save('publish',version+1)).status,200);
  const page=await (await call('/about/')).text();assert.match(page,/New service note/);assert.match(page,/<title>ServiceBay - About our team<\/title>/);
  draft.sections=[];assert.equal((await save('publish',version+2)).status,200);
  assert.doesNotMatch(await (await call('/about/')).text(),/New service note/);
});
test('Settings apply to public content, metadata, and tracking controls',async()=>{
  const url='/api/admin/content?scope=site',x=await (await call(url,{admin:true})).json();
  x.draft.name='Bay Test';x.draft.color='#226655';x.draft.phone='+971501234567';x.draft.ga='G-ABCDE12';x.draft.pixel='123456789';
  assert.equal((await call(url,{admin:true,post:{value:x.draft,version:x.version,action:'publish'}})).status,200);
  const result=await (await call('/contact/')).text();assert.match(result,/tel:\+971501234567/);assert.match(result,/Bay Test/);assert.match(result,/#226655/);assert.match(result,/studio-tracking\.js/);
  assert.equal((await call(url,{admin:true,post:{value:x.draft,version:1,action:'draft'},headers:{origin:'https://other.example'}})).status,403);
});
test('Portal receipt, deduplication, inbox update and customer privacy',async()=>{
  const code='SB-'+Date.now().toString(36).toUpperCase()+'-'+crypto.randomUUID().replaceAll('-','').toUpperCase(),post={code,name:'Test contact',email:'test@example.test',phone:'',message:'AC inspection'};
  assert.equal((await call('/api/portal/requests',{post})).status,201);assert.equal((await call('/api/portal/requests',{post})).status,200);
  const r=await (await call('/api/admin/inbox',{admin:true})).json();assert.equal(r.items.length,1);
  const reference=await (await call('/api/portal/track',{post:{code}})).json();assert.equal(reference.status,'Received');assert.equal(reference.email,undefined);
  assert.equal((await call('/api/admin/request',{admin:true,post:{key:r.items[0].key,previous:'Received',status:'Contacted'}})).status,200);
  assert.equal((await (await call('/api/portal/track',{post:{code}})).json()).status,'Contacted');
});
test('Standalone hosting ignores Sites identity and requires its own owner credentials',async()=>{
  const config={SITE_ACCESS:'private',ADMIN_PASSWORD:'example-only-in-memory-password',ADMIN_USERNAME:'owner'},ctx={nodeStore:store,ip:'test'};
  assert.equal((await call('/',{config,ctx,admin:true})).status,401);
  assert.equal((await call('/admin/',{config,ctx,headers:{authorization:'Basic '+btoa('owner:'+config.ADMIN_PASSWORD)}})).status,200);
  assert.equal((await call('/admin/',{config:{...config,SITE_ACCESS:'public'},ctx,admin:true})).status,401);
});
test('Configured ERP enquiry, idempotent retry, scoped tracking and invoice portal',async()=>{
  const config={...env,SERVICEHUB_API_URL:'https://servicehub.test/api/v1/bay',SERVICEHUB_API_KEY:'shw_'+'a'.repeat(43)},original=globalThis.fetch,seen=[];
  try{globalThis.fetch=async (url,opts)=>{seen.push([url,opts]);return Response.json({success:true,data:opts.method==='POST'?{id:27}:{lead:{reference:'L-27',stage:'Qualified'}}})};
    const code='SB-'+Date.now().toString(36).toUpperCase()+'-'+crypto.randomUUID().replaceAll('-','').toUpperCase(),post={code,name:'Example client',email:'client@example.test',phone:'',message:'Planning enquiry'};
    assert.equal((await call('/api/portal/requests',{config,post})).status,201);
    assert.equal((await call('/api/portal/requests',{config,post})).status,200);assert.equal(seen.length,1);
    assert.match(seen[0][1].headers['Idempotency-Key'],/^sb-/);
    const tracked=await (await call('/api/portal/track',{config,post:{code}})).json();assert.equal(tracked.reference,'L-27');assert.equal(tracked.status,'Qualified');
    assert.match(await (await call('/portal/',{config})).text(),/https:\/\/servicehub.test\/portal\/bay/);
  }finally{globalThis.fetch=original}
});
test('An AMC price change reaches the plan card, estimator and quote dropdown',async()=>{
  const url='/api/admin/content?scope=site',x=await (await call(url,{admin:true})).json();x.draft.pricing['portfolio-care']={name:'Premium Plus',rate:5150};
  assert.equal((await call(url,{admin:true,post:{action:'publish',value:x.draft,version:x.version}})).status,200);
  const doc=async path=>parseHTML(await (await call(path)).text()).document;
  const amc=await doc('/amc/');assert.equal(amc.querySelector('.amc-tier-portfolio-care h3').textContent,'Premium Plus');assert.equal(amc.querySelector('.amc-tier-portfolio-care [data-annual-rate]').getAttribute('data-annual-rate'),'5150');
  const calc=await doc('/estimate/');assert.equal(calc.querySelector('input[value="portfolio-care"]').getAttribute('data-rate'),'5150');assert.equal(amc.querySelector('select[name="plan"] option[value="portfolio-care"]').textContent,'Premium Plus');
});
test('Owner export retains website records and excludes rate counters',async()=>{
  const rows=[];let cursor='';do{const batch=await (await call('/api/admin/export?cursor='+encodeURIComponent(cursor),{admin:true})).json();rows.push(...batch.rows);cursor=batch.next}while(cursor);assert.ok(rows.some(r=>r.key==='settings'));assert.ok(rows.some(r=>r.key.startsWith('request/')));assert.ok(rows.every(r=>!r.key.startsWith('rate/')));assert.equal((await call('/api/admin/export')).status,403);
});
