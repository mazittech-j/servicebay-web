import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFile} from 'node:fs/promises';
import worker from '../dist/server/index.js';
import {records} from './store.mjs';
import {parseHTML} from 'linkedom';
const db=new DatabaseSync(':memory:');
db.exec(await readFile(new URL('../drizzle/0000_servicebay.sql',import.meta.url),'utf8'));
const query=(sql,args)=>db.prepare(sql).all(...args),store=records(query,'sqlite',statements=>batch(statements));
const batch=statements=>{db.exec('BEGIN');try{const rows=statements.map(([sql,args])=>query(sql,args));db.exec('COMMIT');return rows}catch(e){db.exec('ROLLBACK');throw e}};
const env={SERVICEBAY_OWNER_EMAIL:'owner@example.test',DB:{prepare:sql=>({bind:(...args)=>({sql,args,all:async()=>({results:query(sql,args)})})}),batch:async prepared=>batch(prepared.map(s=>[s.sql,s.args])).map(results=>({results}))}};
const origin='https://website.example';
let ownerCookie='';
const password='only-for-this-ephemeral-test';
const cookieOf=r=>r.headers.get('set-cookie')?.split(';')[0];
function call(path,{admin=false,post,config=env,ctx,headers={}}={}){
  return worker.fetch(new Request(origin+path,{method:post?'POST':'GET',headers:{...(post?{'Content-Type':'application/json',origin}:{}),...(admin?{'oai-authenticated-user-id':'test-user','oai-authenticated-user-email':'owner@example.test',Cookie:ownerCookie}:{}),...headers},body:post?JSON.stringify(post):null}),config,ctx);
}
test('Private admin, static pages and service photos',async()=>{
  assert.match(await (await call('/admin/')).text(),/Studio sign in/);
  assert.match(await (await call('/admin/',{admin:true})).text(),/Create your studio password/);
  assert.equal((await call('/api/admin/state',{admin:true})).status,401);
  const setup=await call('/api/studio-auth/setup',{admin:true,post:{password}});assert.equal(setup.status,200);assert.equal(setup.headers.get('set-cookie'),null);
  const login=await call('/api/studio-auth/login',{admin:true,post:{password}});ownerCookie=cookieOf(login);assert.ok(ownerCookie);
  assert.equal((await call('/admin/',{admin:true})).status,200);
  assert.equal((await call('/api/admin/state')).status,401);
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
  const code='SB-'+Date.now().toString(36).toUpperCase()+'-'+crypto.randomUUID().replaceAll('-','').toUpperCase(),post={password,code,name:'Test contact',email:'test@example.test',phone:'',message:'AC inspection'};
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
  assert.equal((await call('/api/admin/state',{config:{...config,SITE_ACCESS:'public'},ctx,admin:true})).status,401);
  const login=await call('/api/studio-auth/login',{config,ctx,post:{email:'owner',password:config.ADMIN_PASSWORD}});
  assert.equal(login.status,200);assert.equal((await call('/api/admin/state',{config,ctx,headers:{Cookie:cookieOf(login)}})).status,200);
});
test('Configured ERP enquiry, idempotent retry, scoped tracking and invoice portal',async()=>{
  const config={...env,SERVICEHUB_API_URL:'https://servicehub.test/api/v1/bay',SERVICEHUB_API_KEY:'shw_'+'a'.repeat(43)},original=globalThis.fetch,seen=[];
  try{globalThis.fetch=async (url,opts)=>{seen.push([url,opts]);return Response.json({success:true,data:opts.method==='POST'?{id:27}:{lead:{reference:'L-27',stage:'Qualified'}}})};
    const code='SB-'+Date.now().toString(36).toUpperCase()+'-'+crypto.randomUUID().replaceAll('-','').toUpperCase(),post={password,code,name:'Example client',email:'client@example.test',phone:'',message:'Planning enquiry'};
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
  const rows=[];let cursor='';do{const batch=await (await call('/api/admin/export?cursor='+encodeURIComponent(cursor),{admin:true})).json();rows.push(...batch.rows);cursor=batch.next}while(cursor);assert.ok(rows.some(r=>r.key==='settings'));assert.ok(rows.some(r=>r.key.startsWith('request/')));assert.ok(rows.every(r=>!r.key.startsWith('rate/')));assert.equal((await call('/api/admin/export')).status,401);
});
test('One quote form, customer accounts, guest receipt linking and private request history',async()=>{
  const portal=await (await call('/portal/')).text();assert.doesNotMatch(portal,/id="new-request"/);assert.match(portal,/href="\/contact\/#enquiry"/);assert.match(portal,/Create account/);
  assert.match(await (await call('/contact/')).text(),/Send quote request/);
  const signup=address=>call('/api/customer-auth/signup',{post:{name:'Customer',email:address,password}});
  const a=await signup('a@example.test'),b=await signup('b@example.test');assert.equal(a.status,200);const A={cookie:cookieOf(a)},B={cookie:cookieOf(b)};
  const code=()=> 'SB-'+Date.now().toString(36).toUpperCase()+'-'+crypto.randomUUID().replaceAll('-','').toUpperCase();
  const post={code:code(),name:'Quote customer',email:'a@example.test',phone:'',service:'AC & HVAC',area:'JVC',message:'Contact form quote'};
  assert.equal((await call('/api/portal/requests',{post,headers:A})).status,201);
  const list=async h=>(await (await call('/api/customer/requests',{headers:h})).json()).items;
  assert.equal((await list(A))[0].area,'JVC');assert.equal((await list(B)).length,0);
  assert.equal((await call('/api/portal/claim',{post:{code:post.code},headers:B})).status,409);
  post.code=code();assert.equal((await call('/api/portal/requests',{post})).status,403);assert.equal((await list(A)).length,1);
  const key='request/'+parseInt(post.code.split('-')[1],36).toString().padStart(15,'0')+'-'+Buffer.from(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(post.code))).toString('hex').slice(0,40);
  await store.save(key,{...post,created:new Date().toISOString(),status:'Received',customerId:null},0);

  assert.equal((await call('/api/portal/claim',{post:{code:post.code},headers:A})).status,200);assert.equal((await list(A)).length,2);
  assert.equal((await call('/api/customer-auth/logout',{post:{},headers:A})).status,200);assert.equal((await call('/api/customer/requests',{headers:A})).status,401);
  assert.equal((await call('/api/customer-auth/login',{post:{email:'a@example.test',password}})).status,200);
});
test('Custom service and AMC plan survive draft, publish through all entry points and removal',async()=>{
  const url='/api/admin/content?scope=site',x=await (await call(url,{admin:true})).json(),a='custom-'+'1'.repeat(32),b='custom-'+'2'.repeat(32);
  x.draft.pricing[a]={kind:'service',name:'Cold room inspection',rate:350,unit:'Rooms',sectors:['industrial']};
  x.draft.pricing[b]={kind:'plan',name:'Warehouse Cover',rate:6200,description:'Quarterly refrigeration checks.'};
  const change=(action,version)=>call(url,{admin:true,post:{action,version,value:x.draft}});
  assert.equal((await change('draft',x.version)).status,200);assert.doesNotMatch(await (await call('/amc/')).text(),/Warehouse Cover/);
  assert.equal((await change('publish',x.version+1)).status,200);
  const doc=async path=>parseHTML(await (await call(path)).text()).document;
  const estimate=await doc('/estimate/');assert.equal(estimate.querySelector('option[value="'+a+'"]').getAttribute('data-sectors'),'industrial');assert.equal(estimate.querySelector('input[value="'+b+'"]').getAttribute('data-rate'),'6200');
  assert.match((await doc('/amc/')).querySelector('.amc-tier-grid').textContent,/Warehouse Cover/);const contact=await doc('/contact/');assert.ok(contact.querySelector('select[name=service] option[value="'+a+'"]'));assert.ok(contact.querySelector('select[name=plan] option[value="'+b+'"]'));
  assert.ok(!(await doc('/services/ac-hvac/')).querySelector('select[name=core] option[value="'+a+'"]'));delete x.draft.pricing[a];delete x.draft.pricing[b];assert.equal((await change('publish',x.version+2)).status,200);
  assert.doesNotMatch(await (await call('/estimate/')).text(),/Warehouse Cover/);
});
test('Invited editor access, owner-only controls, revocation and admin inactivity',async()=>{
  const addr='editor@example.test',r=await call('/api/admin/staff',{admin:true,post:{name:'Content editor',email:addr}});
  const {invite}=await r.json();assert.ok(invite);
  const h={'oai-authenticated-user-id':'test-editor','oai-authenticated-user-email':addr};
  const joined=await call('/api/studio-auth/activate',{headers:h,post:{invite,email:addr,password}});assert.equal(joined.status,200);h.cookie=cookieOf(joined);
  assert.equal((await call('/api/admin/content?path=%2F',{headers:h})).status,200);for(const path of ['inbox','export','staff','overview','content?scope=site'])assert.equal((await call('/api/admin/'+path,{headers:h})).status,403);
  assert.equal((await call('/api/admin/staff',{admin:true,post:{action:'revoke',email:addr}})).status,200);assert.equal((await call('/api/admin/state',{headers:h})).status,401);
  const secret=ownerCookie.split('=')[1];const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(secret));const key='session/'+Buffer.from(hash).toString('hex');const row=await store.get(key);
  await store.save(key,{...row.data,last:Date.now()-1800001},row.version);assert.equal((await call('/api/admin/state',{admin:true})).status,401);
});
test('Direct team login and editable owner identity protect saved data and retire old studio sessions',async()=>{
  const login=async(name,pw,opts={})=>call('/api/studio-auth/login',{admin:true,...opts,post:{email:name,password:pw}});
  ownerCookie=cookieOf(await login('owner@example.test',password));
  const addr='desk-editor@example.test',username='desk-editor';
  assert.equal((await call('/api/admin/staff',{admin:true,post:{action:'create',name:'Editor Two',username,email:addr,password}})).status,201);
  const staffHeaders={'oai-authenticated-user-id':'editor-two','oai-authenticated-user-email':addr};
  const staff=await login(username,password,{admin:false,headers:staffHeaders});assert.equal(staff.status,200);
  assert.equal((await call('/api/admin/mail',{headers:{...staffHeaders,cookie:cookieOf(staff)}})).status,403);
  const old=ownerCookie,edit={name:'Operations owner',username:'ops-owner',email:'operations@example.test',currentPassword:password,newPassword:'new-test-owner-passphrase'};
  assert.equal((await call('/api/admin/profile',{admin:true,post:{...edit,currentPassword:'incorrect'}})).status,403);
  const changed=await call('/api/admin/profile',{admin:true,post:edit});assert.equal(changed.status,200);ownerCookie=cookieOf(changed);
  assert.equal((await call('/api/admin/state',{admin:true,headers:{Cookie:old}})).status,401);
  assert.equal((await login('owner@example.test',password)).status,401);
  assert.equal((await login(edit.email,edit.newPassword)).status,200);
  assert.equal((await login(edit.username,edit.newPassword)).status,200);
  assert.equal((await call('/api/admin/state',{admin:true})).status,200);
});
test('Submitting creates an account, logs in existing customers, saves details and tracks actual mail acceptance',async()=>{
  const addr='quote-account@example.test',config={...env,MAIL_SETTINGS_KEY:'fake-suite-only-encryption-key'},originHeaders={'CF-Connecting-IP':'test-quote'};
  const newCode=()=> 'SB-'+Date.now().toString(36).toUpperCase()+'-'+crypto.randomUUID().replaceAll('-','').toUpperCase();
  const post={name:'Quote Customer',email:addr,password,code:newCode(),phone:'0500000000',message:'Kitchen tap repair',service:'Plumbing',area:'JVC',property:'Villa',country:'United Arab Emirates',details:'Kitchen tap'};
  const submit=(v,headers={})=>call('/api/portal/requests',{config,post:v,headers:{...originHeaders,...headers}});
  const first=await submit(post);assert.equal(first.status,201);const session=cookieOf(first);assert.ok(session);
  const initial=await first.json();assert.equal(initial.emailStatus,'Awaiting email setup');
  const history=await (await call('/api/customer/requests',{headers:{cookie:session}})).json();assert.equal(history.counts.Received,1);assert.equal(history.items[0].receipt,post.code);assert.equal(history.items[0].details,'Kitchen tap');
  assert.equal((await submit({...post,code:newCode(),password:'invalid'})).status,403);
  assert.equal((await submit(post)).status,200);
  const found=await (await call('/api/admin/inbox?q=quote-account&status=Received',{admin:true})).json();assert.equal(found.items.length,1);
  const key=found.items[0].key,changed=await call('/api/admin/request',{admin:true,post:{key,status:'Scheduled',previous:'Received'}});assert.equal(changed.status,200);
  const after=await (await call('/api/customer/requests',{headers:{cookie:session}})).json();assert.equal(after.counts.Scheduled,1);assert.equal(after.items[0].history[1].status,'Scheduled');
  const secret='re_mockonly12345678';const configured=await call('/api/admin/mail',{config,admin:true,post:{from:'service@example.test',key:secret}});assert.equal(configured.status,200);
  assert.ok(!JSON.stringify((await store.get('security/mail')).data).includes(secret));assert.ok(!(await configured.text()).includes(secret));
  const original=globalThis.fetch,sends=[];try{
    globalThis.fetch=async(url,opts)=>{assert.equal(url,'https://api.resend.com/emails');assert.equal(opts.headers.Authorization,'Bearer '+secret);sends.push(opts);return Response.json({id:'synthetic-email-id'})};
    const send=()=>call('/api/admin/request',{admin:true,config,post:{action:'email',key}});
    assert.equal((await (await send()).json()).status,'Accepted');assert.equal((await (await send()).json()).status,'Accepted');assert.equal(sends.length,1);
    assert.deepEqual(JSON.parse(sends[0].body).to,[addr]);assert.ok(JSON.parse(sends[0].body).text.includes(post.code));assert.ok(!sends[0].body.includes(password));
    assert.equal((await submit({...post,code:newCode()})).status,201);assert.equal(sends.length,2);
    const prior=await store.get(key);await store.save(key,{...prior.data,mail:null,receipt:null},prior.version);
    assert.equal((await (await send()).json()).status,'Accepted');const replacement=(await store.get(key)).data.receipt;
    assert.notEqual(replacement,post.code);assert.equal((await (await call('/api/portal/track',{post:{code:replacement}})).json()).status,'Scheduled');
    const p=await (await call('/api/portal/track',{post:{code:post.code}})).json();assert.equal(p.status,'Scheduled');
  }finally{globalThis.fetch=original}
});
test('Service and plan analytics include legacy quotes, accurate periods, true completion and zero-demand services',async()=>{
  const now=new Date().toISOString();
  const add=(key,data)=>store.save('request/'+key,{service:'Example HVAC',created:now,status:'Received',...data},0);
  await add('insight-a',{status:'Completed'});await add('insight-b',{status:'Closed'});await add('insight-c',{status:'Contacted'});await add('insight-d',{status:'Scheduled',created:'2020-03-01T00:00:00Z'});
  await add('insight-e',{service:'AMC enquiry',message:'Country: UAE\nMaintenance plan: Quarterly Demo\nArea: Marina',status:'Scheduled'});
  await add('insight-f',{service:'AMC enquiry',message:'No plan selected',status:'Received'});
  const get=async(path)=>(await (await call('/api/admin/'+path,{admin:true})).json());
  const report=await get('service-report'),v=report.rows.find(x=>x.label==='Example HVAC');
  assert.deepEqual([v.total,v.pending,v.scheduled,v.completed,v.other],[4,1,1,1,1]);
  assert.equal(report.rows.find(x=>x.label==='Quarterly Demo').scheduled,1);assert.ok(report.rows.find(x=>x.label==='AMC · plan unspecified').pending);
  assert.equal(report.rows.reduce((sum,r)=>sum+r.total,0),report.totals.total);assert.ok(report.rows.find(x=>x.id==='refrigeration'));
  const shortlist=await get('service-report?days=7');assert.equal(shortlist.rows.find(x=>x.label==='Example HVAC').total,3);
  const overview=await get('overview');assert.equal(overview.week.length,7);assert.equal(overview.totals.total,report.totals.total);
  assert.equal((await call('/api/admin/service-report?days=33',{admin:true})).status,400);assert.equal((await call('/api/admin/activity')).status,401);
});
test('Activity is atomic, paginates and filters without private form inputs',async()=>{
  const data=await (await call('/api/admin/activity?group=Website',{admin:true})).json();assert.ok(data.items.length);assert.ok(data.items.every(r=>r.group==='Website'&&r.actor&&r.at));
  const fake={group:'Studio',action:'Test isolated audit',detail:'Example'};
  const key='testing/atomic-log';await store.save(key,{ok:1},0,fake);
  await assert.rejects(()=>store.save(key,{ok:2},0,fake));await assert.rejects(()=>store.save(key,{ok:3},30,fake));
  const all=await store.activity(undefined,'Studio',100);assert.equal(all.items.filter(x=>x.action===fake.action).length,1);
  const first=await store.activity(undefined,'',2);assert.ok(first.next);const next=await store.activity(first.next,'',2);assert.equal(next.items.length,2);
  const text=JSON.stringify((await store.activity(undefined,'',100)).items);assert.ok(!text.includes('re_mockonly')&&!text.includes(password)&&!text.includes('SB-'));
});
test('Responsive font roles retain drafts, publish to both screen sizes and restore defaults',async()=>{
  const api='/api/admin/content?scope=site',get=async()=>(await (await call(api,{admin:true})).json()),old=await get();
  const value={...old.draft,typography:{desktop:{h1:72,nav:18},mobile:{h1:32,button:16}}};
  const write=(v,action='publish',version=old.version)=>call(api,{admin:true,post:{value:v,version,action}});
  assert.equal((await write({...value,typography:{mobile:{button:1000}}})).status,400);
  assert.equal((await write(value,'draft')).status,200);const draft=await (await call('/?studio=1',{admin:true})).text();assert.match(draft,/@media \(min-width:768px\)\{h1\{font-size:4.5000rem/);
  assert.doesNotMatch(await (await call('/')).text(),/h1\{font-size:4.5000rem!important/);
  assert.equal((await write(value,'publish',(await get()).version)).status,200);assert.match(await (await call('/contact/')).text(),/@media \(max-width:767.98px\)\{h1\{font-size:2.0000rem/);
  assert.equal((await write({...value,typography:{}},'publish',(await get()).version)).status,200);
});
test('Sender test targets the owner only, reports acceptance or provider rejection and avoids sending without credentials',async()=>{
  const config={...env,MAIL_SETTINGS_KEY:'fake-suite-only-encryption-key'},original=globalThis.fetch;
  try{
    const sent=[];globalThis.fetch=async(url,req)=>{sent.push(JSON.parse(req.body));return Response.json({id:'test-provider-message'})};
    const test=()=>call('/api/admin/mail-test',{config,admin:true,post:{to:'unused@example.test'}});
    assert.equal((await (await test()).json()).status,'Accepted');assert.deepEqual(sent[0].to,['operations@example.test']);
    assert.equal((await (await call('/api/admin/mail',{config,admin:true})).json()).lastTest.status,'Accepted');
    globalThis.fetch=async()=>Response.json({error:'fake'},{status:403});assert.match((await (await test()).json()).status,/permissions/);
    await store.remove('security/mail');globalThis.fetch=async()=>{assert.fail('No send should be attempted')};
    assert.equal((await test()).status,409);
  }finally{globalThis.fetch=original}
});

test('Owner login, requestOrigin CSRF, Google Authenticator 2FA, team password reset and security shield',async()=>{
  const {totpCode}=await import('./totp.mjs');
  const nodeCfg={SITE_ACCESS:'private',ADMIN_PASSWORD:'short-12char',ADMIN_USERNAME:'owner',ADMIN_EMAIL:'owner-node@example.test',RESEND_API_KEY:'re_test_key_123456',RECEIPT_FROM_EMAIL:'alerts@servicebay.test'};
  const altOrigin='https://servicebay-preview.vercel.app';
  const nodeCtx={nodeStore:store,ip:'198.51.100.10',requestOrigin:altOrigin};

  // Wrong password returns clear 401 message even when requestOrigin differs from canonical origin
  const bad=await call('/api/studio-auth/login',{config:nodeCfg,ctx:nodeCtx,headers:{origin:altOrigin},post:{email:'owner',password:'wrong-pass'}});
  assert.equal(bad.status,401);
  assert.match((await bad.json()).error,/Incorrect/);

  // External origin still blocked
  const csrf=await call('/api/studio-auth/login',{config:nodeCfg,ctx:nodeCtx,headers:{origin:'https://evil.example'},post:{email:'owner',password:nodeCfg.ADMIN_PASSWORD}});
  assert.equal(csrf.status,403);

  // Valid owner login works with 12-char ADMIN_PASSWORD and ADMIN_EMAIL
  const ok=await call('/api/studio-auth/login',{config:nodeCfg,ctx:nodeCtx,headers:{origin:altOrigin},post:{email:'owner-node@example.test',password:nodeCfg.ADMIN_PASSWORD}});
  assert.equal(ok.status,200);
  const nodeCookie=cookieOf(ok);assert.ok(nodeCookie);

  // Set up Google Authenticator 2FA
  const begin=await call('/api/admin/2fa',{config:nodeCfg,ctx:nodeCtx,headers:{origin:altOrigin,Cookie:nodeCookie},post:{action:'begin'}});
  assert.equal(begin.status,200);
  const {secret,uri,qrSvg}=await begin.json();
  assert.ok(secret&&uri.startsWith('otpauth://totp/')&&qrSvg.includes('<svg'));
  const code=await totpCode(secret);
  const enabled=await call('/api/admin/2fa',{config:nodeCfg,ctx:nodeCtx,headers:{origin:altOrigin,Cookie:nodeCookie},post:{action:'enable',code}});
  assert.equal(enabled.status,200);
  const {backupCodes}=await enabled.json();
  assert.equal(backupCodes.length,8);

  // Login now requires 2FA challenge, then verifies with backup code
  const step1=await call('/api/studio-auth/login',{config:nodeCfg,ctx:nodeCtx,headers:{origin:altOrigin},post:{email:'owner',password:nodeCfg.ADMIN_PASSWORD}});
  assert.equal(step1.status,200);
  const s1=await step1.json();
  assert.equal(s1.requires2fa,true);assert.ok(s1.challenge);
  const step2=await call('/api/studio-auth/verify-2fa',{config:nodeCfg,ctx:nodeCtx,headers:{origin:altOrigin},post:{challenge:s1.challenge,code:backupCodes[0]}});
  assert.equal(step2.status,200);assert.ok(cookieOf(step2));

  // Team forgot password & owner reset link flow
  const original=globalThis.fetch,alerts=[];
  try{
    globalThis.fetch=async(url,req)=>{alerts.push(JSON.parse(req.body));return Response.json({id:'alert-msg'})};
    const forgot=await call('/api/studio-auth/forgot',{config:nodeCfg,ctx:{nodeStore:store,ip:'198.51.100.20',requestOrigin:altOrigin},headers:{origin:altOrigin},post:{email:'desk-editor@example.test',note:'Locked out'}});
    assert.equal(forgot.status,200);
    assert.ok(alerts.some(m=>m.subject.includes('Password reset request')));
    const staffList=await (await call('/api/admin/staff',{config:nodeCfg,ctx:nodeCtx,headers:{Cookie:nodeCookie}})).json();
    const desk=staffList.items.find(i=>i.email==='desk-editor@example.test');
    assert.ok(desk.resetRequestedAt);assert.equal(desk.resetNote,'Locked out');
    const issued=await (await call('/api/admin/staff',{config:nodeCfg,ctx:nodeCtx,headers:{origin:altOrigin,Cookie:nodeCookie},post:{action:'reset-link',email:'desk-editor@example.test'}})).json();
    assert.ok(issued.resetToken);
    const resetRes=await call('/api/studio-auth/reset',{config:nodeCfg,ctx:{nodeStore:store,ip:'198.51.100.20',requestOrigin:altOrigin},headers:{origin:altOrigin},post:{email:'desk-editor@example.test',token:issued.resetToken,password:'brand-new-team-passphrase-2026'}});
    assert.equal(resetRes.status,200);assert.ok(cookieOf(resetRes));

    // Security shield: honeypot & brute-force lockout email owner
    const botCtx={nodeStore:store,ip:'203.0.113.55',requestOrigin:altOrigin};
    const bot=await call('/api/studio-auth/login',{config:nodeCfg,ctx:botCtx,headers:{origin:altOrigin},post:{email:'owner',password:'1234',_sb_hp:'http://spam.bot'}});
    assert.equal(bot.status,403);
    assert.ok(alerts.some(m=>m.subject.includes('Bot attack blocked')));
    const blocked=await call('/api/studio-auth/login',{config:nodeCfg,ctx:botCtx,headers:{origin:altOrigin},post:{email:'owner',password:nodeCfg.ADMIN_PASSWORD}});
    assert.equal(blocked.status,429);

    // Attack probe blocked
    const probe=await call('/.env',{config:nodeCfg,ctx:{nodeStore:store,ip:'203.0.113.99'}});
    assert.equal(probe.status,403);
    assert.ok(alerts.some(m=>m.subject.includes('Attack probe blocked')));

    // Shield state visible to owner & clear-blocks works
    const sh=await (await call('/api/admin/shield',{config:nodeCfg,ctx:nodeCtx,headers:{Cookie:nodeCookie}})).json();
    assert.equal(sh.active,true);assert.ok(sh.events.length>=2);
    const cleared=await call('/api/admin/shield',{config:nodeCfg,ctx:nodeCtx,headers:{origin:altOrigin,Cookie:nodeCookie},post:{action:'clear-blocks'}});
    assert.equal(cleared.status,200);
    const afterClear=await call('/api/studio-auth/login',{config:nodeCfg,ctx:botCtx,headers:{origin:altOrigin},post:{email:'owner',password:'wrong-pass'}});
    assert.equal(afterClear.status,401);

    // Granular team permissions
    const permEmail='perm-editor@example.test';
    assert.equal((await call('/api/admin/staff',{config:nodeCfg,ctx:nodeCtx,headers:{origin:altOrigin,Cookie:nodeCookie},post:{action:'create',name:'Perm Editor',username:'perm-editor',email:permEmail,password:'editor-strong-pass-2026',permissions:['pages','requests']}})).status,201);
    const edLogin=await call('/api/studio-auth/login',{config:nodeCfg,ctx:nodeCtx,headers:{origin:altOrigin},post:{email:'perm-editor',password:'editor-strong-pass-2026'}});
    assert.equal(edLogin.status,200);
    const edCookie=cookieOf(edLogin);
    assert.equal((await call('/api/admin/inbox',{config:nodeCfg,ctx:nodeCtx,headers:{Cookie:edCookie}})).status,200);
    assert.equal((await call('/api/admin/overview',{config:nodeCfg,ctx:nodeCtx,headers:{Cookie:edCookie}})).status,403);
    assert.equal((await call('/api/admin/staff',{config:nodeCfg,ctx:nodeCtx,headers:{Cookie:edCookie}})).status,403);
    // Update permissions dynamically to overview
    assert.equal((await call('/api/admin/staff',{config:nodeCfg,ctx:nodeCtx,headers:{origin:altOrigin,Cookie:nodeCookie},post:{action:'permissions',email:permEmail,permissions:['pages','overview']}})).status,200);
    assert.equal((await call('/api/admin/overview',{config:nodeCfg,ctx:nodeCtx,headers:{Cookie:edCookie}})).status,200);
    assert.equal((await call('/api/admin/inbox',{config:nodeCfg,ctx:nodeCtx,headers:{Cookie:edCookie}})).status,403);
  }finally{globalThis.fetch=original}
});

test('Passwordless quote request sends receipt, status updates email customer, and customer password recovery works',async()=>{
  const config={...env,MAIL_SETTINGS_KEY:'fake-suite-only-encryption-key',RESEND_API_KEY:'re_test_key_123456',RECEIPT_FROM_EMAIL:'service@servicebay.test'};
  const original=globalThis.fetch,sent=[];
  try{
    globalThis.fetch=async(url,req)=>{sent.push(JSON.parse(req.body));return Response.json({id:'mail-id-'+sent.length})};
    const code='SB-'+Date.now().toString(36).toUpperCase()+'-'+crypto.randomUUID().replaceAll('-','').toUpperCase();
    const guestEmail='guest-quote@example.test';

    // Passwordless quote submission succeeds and sends receipt email
    const res=await call('/api/portal/requests',{config,headers:{'CF-Connecting-IP':'guest-ip-1'},post:{code,name:'Guest User',email:guestEmail,phone:'0501234567',message:'AC cooling check',service:'AC & HVAC',area:'Marina',country:'United Arab Emirates'}});
    assert.equal(res.status,201);
    const body=await res.json();
    assert.equal(body.code,code);
    assert.equal(body.emailStatus,'Accepted');
    assert.ok(sent.some(m=>m.to[0]===guestEmail&&m.text.includes(code)));

    // Status update sends email to customer
    const inbox=await (await call('/api/admin/inbox?q='+encodeURIComponent(code),{admin:true,config})).json();
    const reqKey=inbox.items[0].key;
    const upd=await call('/api/admin/request',{admin:true,config,post:{key:reqKey,status:'In review',previous:'Received'}});
    assert.equal(upd.status,200);
    assert.equal((await upd.json()).emailStatus,'Accepted');
    assert.ok(sent.some(m=>m.to[0]===guestEmail&&m.subject.includes('In review')));

    // Customer password recovery (forgot -> reset)
    const custEmail='quote-account@example.test';
    const forgot=await call('/api/customer-auth/forgot',{config,headers:{'CF-Connecting-IP':'cust-ip-1'},post:{email:custEmail}});
    assert.equal(forgot.status,200);
    const recMail=sent.find(m=>m.to[0]===custEmail&&m.subject.includes('Password recovery'));
    assert.ok(recMail);
    const match=/recovery code is:\s*(\d{6})/.exec(recMail.text);
    assert.ok(match);
    const reset=await call('/api/customer-auth/reset',{config,headers:{'CF-Connecting-IP':'cust-ip-1'},post:{email:custEmail,code:match[1],password:'new-customer-passphrase-2026'}});
    assert.equal(reset.status,200);
    assert.ok(cookieOf(reset));
  }finally{globalThis.fetch=original}
});

test('Traffic source & device attribution tracks visits, compares platforms in admin, and syncs to ERP',async()=>{
  const erpCfg={...env,SERVICEHUB_API_URL:'https://servicehub.test/api/v1/prime-fix',SERVICEHUB_API_KEY:'shw_'+'b'.repeat(43)};
  const original=globalThis.fetch,erpSent=[];
  try{
    globalThis.fetch=async(url,req)=>{erpSent.push(JSON.parse(req.body));return Response.json({success:true,data:{id:777}})};
    assert.equal((await call('/api/analytics/visit',{post:{source:'Google',medium:'cpc',device:'Mobile',page:'/'}})).status,200);
    assert.equal((await call('/api/analytics/visit',{post:{source:'Facebook',medium:'social',device:'Desktop',page:'/amc/'}})).status,200);
    const code='SB-'+Date.now().toString(36).toUpperCase()+'-'+crypto.randomUUID().replaceAll('-','').toUpperCase();
    const q=await call('/api/portal/requests',{config:erpCfg,headers:{'CF-Connecting-IP':'attr-ip-1'},post:{code,name:'Attr Lead',email:'attr@example.test',phone:'0509998888',message:'Need AC service',service:'AC & HVAC',area:'Downtown',source:'Google',medium:'cpc',campaign:'dubai-ac',device:'Mobile'}});
    assert.equal(q.status,201);
    assert.equal(erpSent.length,1);
    assert.equal(erpSent[0].source,'Google');
    assert.equal(erpSent[0].device,'Mobile');
    assert.match(erpSent[0].message,/Source: Google/);

    const ov=await (await call('/api/admin/overview',{admin:true,config:erpCfg})).json();
    const google=ov.sources.platforms.find(p=>p.source==='Google');
    assert.ok(google&&google.visits>=1&&google.leads>=1);
    assert.ok(ov.sources.devices.some(d=>d.device==='Mobile'));

    // ERP verify detects revoked key (401) and manual disconnect/reconnect works
    globalThis.fetch=async()=>new Response('Unauthorized',{status:401});
    const rev=await (await call('/api/admin/erp',{admin:true,config:erpCfg,post:{action:'test'}})).json();
    assert.match(rev.lastCheck.status,/Revoked/);
    const disc=await (await call('/api/admin/erp',{admin:true,config:erpCfg,post:{action:'disconnect'}})).json();
    assert.equal(disc.paused,true);assert.equal(disc.canSync,false);
    const rec=await (await call('/api/admin/erp',{admin:true,config:erpCfg,post:{action:'reconnect'}})).json();
    assert.equal(rec.paused,false);assert.equal(rec.canSync,true);
    const del=await (await call('/api/admin/erp',{admin:true,config:erpCfg,post:{action:'delete'}})).json();
    assert.equal(del.canSync,false);assert.equal(del.source,'none');
    const saved=await (await call('/api/admin/erp',{admin:true,config:erpCfg,post:{action:'save',apiUrl:'https://erp.new/api/v1/new-co',apiKey:'shw_'+'c'.repeat(43)}})).json();
    assert.equal(saved.canSync,true);assert.equal(saved.source,'studio');assert.match(saved.portal,/new-co/);

    // ERP sync accepts {enquiry:{id}}, push-all pushes unsent quotes, and pull-pricing updates catalog rates
    const unsentKey=await store.save('request/unsent-1',{external:'unsent-1',name:'Bulk User',email:'bulk@example.com',phone:'+971500000011',message:'Need AC service',service:'AC maintenance',source:'Google',status:'New'},0);
    assert.ok(unsentKey);
    globalThis.fetch=async(url,opts)=>{
      const u=String(url);
      if(u.includes('/enquiries')){
        return new Response(JSON.stringify({success:true,data:{enquiry:{id:888}}}),{status:201,headers:{'Content-Type':'application/json'}});
      }
      if(u.endsWith('/services')){
        return new Response(JSON.stringify({success:true,data:[{id:'ac',name:'AC maintenance',rate:499,kind:'service'},{id:'erp-solar',name:'Solar panel cleaning',rate:350,kind:'service',unit:'Panels'}]}),{status:200,headers:{'Content-Type':'application/json'}});
      }
      return new Response('Not found',{status:404});
    };
    const pushed=await (await call('/api/admin/erp',{admin:true,config:erpCfg,post:{action:'sync-all'}})).json();
    assert.equal(pushed.sent>=1,true);
    assert.equal(pushed.failed,0);
    assert.equal(pushed.pricesUpdated,2);
    assert.equal(pushed.state.lastSync.pricesUpdated,2);
    const updatedQuote=await store.get('request/unsent-1');
    assert.equal(updatedQuote.data.erpId,888);

    const setRow=await store.get('settings');
    assert.equal(Object.values(setRow.data.draft.pricing).find(x=>x.name==='AC maintenance')?.rate,499);
    assert.equal(Object.values(setRow.data.live.pricing).find(x=>x.name==='AC maintenance')?.rate,499);
    assert.equal(Object.values(setRow.data.draft.pricing).find(x=>x.name==='Solar panel cleaning')?.rate,350);

    // Auto-sync toggle and auto-tick work
    const autoOff=await (await call('/api/admin/erp',{admin:true,config:erpCfg,post:{action:'auto-sync',enabled:false}})).json();
    assert.equal(autoOff.autoSync,false);
    const skipped=await (await call('/api/admin/erp',{admin:true,config:erpCfg,post:{action:'auto-tick'}})).json();
    assert.equal(skipped.skipped,true);
    const autoOn=await (await call('/api/admin/erp',{admin:true,config:erpCfg,post:{action:'auto-sync',enabled:true}})).json();
    assert.equal(autoOn.autoSync,true);
    assert.ok(autoOn.webhookSecret);

    // Incoming ERP webhook authenticates by ?token=..., updates status & service prices without Origin header
    const badWh=await worker.fetch(new Request(origin+'/api/erp/webhook?token=wrong',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({event:'ping'})}),erpCfg);
    assert.equal(badWh.status,401);
    const okWh=await worker.fetch(new Request(origin+'/api/erp/webhook?token='+autoOn.webhookSecret,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({event:'request.updated',id:888,status:'Completed',services:[{name:'AC maintenance',rate:550}]})}),erpCfg);
    assert.equal(okWh.status,200);
    const whJson=await okWh.json();
    assert.equal(whJson.ok,true);
    assert.equal(whJson.statusUpdated,1);
    assert.equal(whJson.pricesUpdated,1);
    const whQuote=await store.get('request/unsent-1');
    assert.equal(whQuote.data.status,'Completed');
    const whSet=await store.get('settings');
    assert.equal(Object.values(whSet.data.live.pricing).find(x=>x.name==='AC maintenance')?.rate,550);
  }finally{globalThis.fetch=original}
});





