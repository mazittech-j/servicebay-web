import {assets,routes} from './generated.mjs';
import {records} from './store.mjs';
import {renderPage,cleanSettings,cleanPage,EMPTY_PAGE,defaults,fonts,fail,txt} from './content.mjs';
import {admin,portal} from './views.mjs';
import {createServiceHubClient} from './erp.mjs';
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
const html=value=>new Response(value,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','X-Frame-Options':'SAMEORIGIN'}});
const bytes=encoded=>Uint8Array.from(atob(encoded),ch=>ch.charCodeAt(0));
async function digest(value){const a=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));return Array.from(new Uint8Array(a),x=>x.toString(16).padStart(2,'0')).join('')}
async function body(req,max=140000){
  if(!req.headers.get('content-type')?.startsWith('application/json'))fail('JSON required.',415);
  const reader=req.body?.getReader();if(!reader)fail('Request body required.');
  let total=0;const chunks=[];for(;;){const {done,value}=await reader.read();if(done)break;total+=value.length;if(total>max){await reader.cancel();fail('Request too large.',413)}chunks.push(value)}
  try{return JSON.parse(await new Blob(chunks).text())}catch{fail('Invalid request.')}
}
function integration(env){
  let u;try{u=new URL(env.SERVICEHUB_API_URL)}catch{return {}}
  const match=u.pathname.match(/^(.*?)\/api\/v1\/([a-zA-Z0-9_-]+)\/?$/);
  if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash||!match)return {};
  const root=u.origin+match[1],tenant=match[2];
  return {portal:root+'/portal/'+tenant,stripeTest:root+'/api/stripe/'+tenant+'/test',stripeLive:root+'/api/stripe/'+tenant+'/live',canSync:/^shw_[\w-]{43}$/.test(env.SERVICEHUB_API_KEY||'')};
}
async function basic(request,env,store,identity){
  const auth=request.headers.get('authorization')||'';
  if(!env.ADMIN_PASSWORD||env.ADMIN_PASSWORD.length<24||!auth.startsWith('Basic '))return false;
  let token;try{token=atob(auth.slice(6))}catch{return false}
  const parts=[await digest(token),await digest((env.ADMIN_USERNAME||'owner')+':'+env.ADMIN_PASSWORD)];
  let mismatch=0;for(let i=0;i<64;i++)mismatch|=parts[0].charCodeAt(i)^parts[1].charCodeAt(i);
  if(mismatch)await store.limit('rate/login/'+await digest(identity||'shared'),12,5);
  return !mismatch;
}
const receiptPattern=/^SB-([A-Z0-9]{7,10})-([A-F0-9]{32})$/;
async function requestKey(code){const match=receiptPattern.exec(code);if(!match)fail('Enter the full receipt code.');return 'request/'+parseInt(match[1],36).toString().padStart(15,'0')+'-'+(await digest(code)).slice(0,40)}
async function sync(env,store,key) {
  const entry=await store.get(key);if(!entry.data)fail('Request not found.',404);
  if(entry.data.erpId)return entry;
  if(!integration(env).canSync)fail('Add the ServiceHub API URL and integration key to enable delivery.',503);
  const r=entry.data,c=createServiceHubClient({baseUrl:env.SERVICEHUB_API_URL,apiKey:env.SERVICEHUB_API_KEY});
  let response;
  try{response=await c.submit('enquiries',r.external,{external_id:r.external,name:r.name,email:r.email,phone:r.phone,message:r.message})}catch{fail('ServiceHub did not confirm delivery. The request is saved and can be retried.',502)}
  if(!Number.isSafeInteger(Number(response?.id))||Number(response.id)<1)fail('ServiceHub returned an unrecognised receipt. Retry using the same request.',502);
  // Another administrator can change status while the external call is in progress.
  for(let n=0;n<3;n++){const next=await store.get(key);if(next.data.erpId)return next;try{await store.save(key,{...next.data,erpId:Number(response.id)},next.version);return await store.get(key)}catch(e){if(e.status!==409)throw e}}
  fail('Reload and retry delivery.',409);
}
function assetResponse(entry){const [type,zipped,source]=entry;const buffer=bytes(source);let stream=buffer;if(zipped)stream=new Blob([buffer]).stream().pipeThrough(new DecompressionStream('gzip'));return new Response(stream,{headers:{'Content-Type':type+(type.startsWith('text/')?'; charset=utf-8':''),'X-Content-Type-Options':'nosniff','Cache-Control':type==='text/html'?'private, no-store':'private, max-age=300'}})}
export async function serve(request,env,store,platform){
  try{
    const u=new URL(request.url),path=u.pathname,method=request.method;
    if(!['GET','POST','HEAD'].includes(method))return json({error:'Unsupported method.'},405);
    if(method==='POST'&&request.headers.get('origin')!==u.origin)return json({error:'Open the form on this site and retry.'},403);
    const adminRoute=path==='/admin'||path.startsWith('/admin/')||path.startsWith('/api/admin/')||u.searchParams.get('studio')==='1';
    const privateNode=platform.kind==='node'&&env.SITE_ACCESS!=='public';
    if(adminRoute||privateNode){
      const allowed=platform.kind==='sites'
        ? Boolean(env.SERVICEBAY_OWNER_EMAIL&&request.headers.get('oai-authenticated-user-id')&&request.headers.get('oai-authenticated-user-email')?.toLowerCase()===env.SERVICEBAY_OWNER_EMAIL.toLowerCase())
        : await basic(request,env,store,platform.ip);
      if(!allowed){if(platform.kind==='sites')return json({error:'Sign in with the site owner account to open the website studio.'},403);
        return new Response('ServiceBay owner sign-in required.',{status:401,headers:{'WWW-Authenticate':'Basic realm="ServiceBay", charset="UTF-8"','Cache-Control':'no-store'}})}
    }
    if(path==='/admin/'||path==='/admin')return html(admin());
    if(path==='/portal/'||path==='/portal')return html(portal(integration(env).portal));
    if(path==='/api/admin/state'&&method==='GET')return json({routes,fonts,defaults,integrations:integration(env),storage:platform.storage});
    if(path==='/api/admin/content'){
      const isGlobal=u.searchParams.get('scope')==='site',target=u.searchParams.get('path')||'/';
      if(!isGlobal&&!routes.includes(target))fail('Choose an editable page.',404);
      const key=isGlobal?'settings':'page'+target,old=await store.get(key),doc=old.data||{draft:null,live:null};
      if(method==='GET')return json({version:old.version,draft:doc.draft??doc.live??(isGlobal?defaults:EMPTY_PAGE),published:!!doc.live});
      if(method!=='POST')fail('Unsupported method.',405);
      const input=await body(request);if(input.version!==old.version)fail('This item changed in another tab. Reload before saving.',409);
      if(!['draft','publish','revert'].includes(input.action))fail('Choose a save action.');
      let next;
      if(input.action==='revert')next={...doc,draft:doc.live};
      else{const value=isGlobal?cleanSettings(input.value):cleanPage(input.value);next={draft:value,live:input.action==='publish'?value:doc.live}}
      const version=await store.save(key,next,old.version);return json({version,published:!!next.live});
    }
    if(path==='/api/admin/media'&&method==='POST'){
      const {data,type}=await body(request,750000);
      if(typeof data!=='string'||data.length>700000||!['image/png','image/jpeg','image/webp'].includes(type))fail('Choose a JPEG, PNG or WebP image under 500 KB.');
      let b;try{b=bytes(data)}catch{fail('Invalid image.')};if(b.length>512000||b.length<12)fail('Choose an image under 500 KB.');
      const match=type==='image/png'?b[0]===137&&String.fromCharCode(...b.slice(1,4))==='PNG':type==='image/jpeg'?b[0]===255&&b[1]===216&&b[2]===255:String.fromCharCode(...b.slice(0,4))==='RIFF'&&String.fromCharCode(...b.slice(8,12))==='WEBP';
      if(!match)fail('Image type does not match the file.');
      const key='/media/'+await digest(data);if(!(await store.get(key)).version){try{await store.save(key,{data,type},0)}catch(e){if(e.status!==409)throw e}}return json({url:key});
    }
    if(path.startsWith('/media/')&&method!=='POST'){if(!/^\/media\/[a-f0-9]{64}$/.test(path))fail('Image not found.',404);const {data}=await store.get(path);if(!data)fail('Image not found.',404);return assetResponse([data.type,false,data.data])}
    if(path==='/api/admin/export'&&method==='GET')return json(await store.exportBatch(u.searchParams.get('cursor')||''));
    if(path==='/api/admin/inbox'&&method==='GET')return json(await store.inbox(u.searchParams.get('cursor')||undefined));
    if(path==='/api/admin/request'&&method==='POST'){
      const x=await body(request);if(!/^request\/\d{15}-[a-f0-9]{40}$/.test(x.key))fail('Invalid request.');
      if(x.action==='sync'){await sync(env,store,x.key);return json({ok:true})}
      if(!['Received','In review','Contacted','Scheduled','Closed'].includes(x.status))fail('Invalid status.');
      const row=await store.get(x.key);if(!row.data)fail('Request not found.',404);
      if(x.previous!==row.data.status)fail('Status changed. Reload and retry.',409);
      await store.save(x.key,{...row.data,status:x.status},row.version);return json({ok:true});
    }
    if(path.startsWith('/api/portal/')&&method==='POST'){
      const x=await body(request,12000),code=txt(x.code,70).toUpperCase(),key=await requestKey(code);
      if(path==='/api/portal/track'){
        const row=(await store.get(key)).data;if(!row)fail('No matching request was found.',404);
        let status=row.status,reference;
        if(row.erpId&&integration(env).canSync){try{const v=await createServiceHubClient({baseUrl:env.SERVICEHUB_API_URL,apiKey:env.SERVICEHUB_API_KEY}).status(row.erpId);status=v.service_request?.status||v.lead?.stage||status;reference=v.service_request?.reference||v.lead?.reference}catch{}}
        return json({status,reference,created:row.created});
      }
      if(path==='/api/portal/requests'){
        const name=txt(x.name,80),email=txt(x.email||'',150),phone=txt(x.phone||'',32),message=txt(x.message,3500);
        if(!name||!message||(!email&&!phone)||(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))||(phone&&!/^[+\d(). -]{7,32}$/.test(phone)))fail('Check your name, contact details and service request.');
        const old=await store.get(key);if(old.data)return json({code});
        if(Math.abs(Date.now()-Number(key.slice(8,23)))>86400000)fail('Refresh the form for a new receipt.');
        await store.limit('rate/submit/'+await digest(platform.ip||'shared'),20,10);
        await store.save(key,{name,email,phone,message,created:new Date().toISOString(),status:'Received',external:'sb-'+key.slice(-40),erpId:null},0);
        if(integration(env).canSync){try{await sync(env,store,key)}catch{/* Owner inbox retains undelivered requests for retry. */}}
        return json({code},201);
      }
    }
    if(path.startsWith('/api/')||method==='POST')fail('Page not found.',404);
    let canonical=path.replace(/\/index\.html$/,'/');if(!assets[canonical]&&assets[canonical+'/'])canonical+='/';
    if(canonical!==path){u.pathname=canonical;return Response.redirect(u.href,308)}
    const entry=assets[path];if(!entry)fail('Page not found.',404);
    if(!routes.includes(path))return assetResponse(entry);
    const editing=u.searchParams.get('studio')==='1';
    const [site,page]=await Promise.all([store.get('settings'),store.get('page'+path)]);
    const select=r=>(editing?r.data?.draft:null)??r.data?.live;
    if(!editing&&!select(site)&&!select(page))return assetResponse(entry);
    return html(renderPage(await assetResponse(entry).text(),select(site),select(page),editing));
  }catch(e){const status=Number(e.status)||500;return json({error:status===500?'The service is temporarily unavailable.':e.message},status)}
}
export default {fetch(request,env,ctx){
  if(ctx?.nodeStore)return serve(request,env,ctx.nodeStore,{kind:"node",storage:env.DATABASE_URL?"PostgreSQL":"Local SQLite",ip:ctx.ip});
  const store=records(async(sql,args)=>(await env.DB.prepare(sql).bind(...args).all()).results);
  return serve(request,env,store,{kind:'sites',storage:'Sites database',ip:request.headers.get('CF-Connecting-IP')||request.headers.get('oai-authenticated-user-id')});
}};
