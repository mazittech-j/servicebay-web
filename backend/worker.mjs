import {typeRoles} from './typography.mjs';
import {event,activityGroups,statuses,reportingPeriod,serviceReport} from './insights.mjs';
import {assets,routes} from './generated.mjs';
import {records} from './store.mjs';
import {renderPage,cleanSettings,cleanPage,EMPTY_PAGE,defaults,fonts,fail,txt} from './content.mjs';
import {authAction, session, isSiteOwner, inviteEditor, hash, createEditor, updateOwner, nodeOwnerLogin, quoteCustomer, manage2fa, issueStaffReset, dismissStaffReset, updateStaffPermissions} from './accounts.mjs';
import {detectProbe, detectHoneypot, isIpBlocked, recordIncident, shieldState, updateShield, testShieldAlert, clearShieldBlocks} from './shield.mjs';
import {mailSettings,sendReceipt,emailStatus,testSender} from './mail.mjs';
import {admin,portal,studioLogin} from './views.mjs';
import {createServiceHubClient} from './erp.mjs';
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','X-Frame-Options':'SAMEORIGIN','Referrer-Policy':'strict-origin-when-cross-origin'}});
const html=value=>new Response(value,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','X-Frame-Options':'SAMEORIGIN','Permissions-Policy':'camera=(), microphone=(), geolocation=()','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'self'; base-uri 'self'; form-action 'self'"}});
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
  const colon=token.indexOf(':');
  const valid=colon>0&&await nodeOwnerLogin(store,env,token.slice(0,colon).toLowerCase(),token.slice(colon+1));
  if(!valid)await store.limit('rate/login/'+await digest(identity||'shared'),12,5);
  return valid;
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
  for(let n=0;n<3;n++){const next=await store.get(key);if(next.data.erpId)return next;try{await store.save(key,{...next.data,erpId:Number(response.id)},next.version,event('Quotes','Sent quote to ServiceHub',r.service||'Service quote'));return await store.get(key)}catch(e){if(e.status!==409)throw e}}
  fail('Reload and retry delivery.',409);
}
function assetResponse(entry){const [type,zipped,source]=entry;const buffer=bytes(source);let stream=buffer;if(zipped)stream=new Blob([buffer]).stream().pipeThrough(new DecompressionStream('gzip'));return new Response(stream,{headers:{'Content-Type':type+(type.startsWith('text/')?'; charset=utf-8':''),'X-Content-Type-Options':'nosniff','Cache-Control':type==='text/html'?'private, no-store':'private, max-age=300'}})}
export async function serve(request,env,store,platform){
  try{
    const u=new URL(request.url),path=u.pathname,method=request.method;
    if(!['GET','POST','HEAD'].includes(method))return json({error:'Unsupported method.'},405);
    const reqOrigin=request.headers.get('origin');
    if(method==='POST'&&reqOrigin!==u.origin&&(!platform.requestOrigin||reqOrigin!==platform.requestOrigin))return json({error:'Open the form on this site and retry.'},403);
    const probeReason=detectProbe(path,u.search);
    if(probeReason){
      await recordIncident({db:store,env,ip:platform.ip,reason:'Attack probe blocked',target:path,detail:probeReason,immediateBlock:true});
      return json({error:'Request blocked by security shield.'},403);
    }
    const adminRoute=path==='/admin'||path.startsWith('/admin/')||path.startsWith('/api/admin/')||u.searchParams.get('studio')==='1';
    const privateNode=platform.kind==='node'&&env.SITE_ACCESS!=='public';
    const studioAuth=path.startsWith('/api/studio-auth/');
    const studioPage=path==='/admin/'||path==='/admin';
    const studioUser=(adminRoute||privateNode)?await session(request,store,'studio',platform,env):null;
    if(studioUser)store=store.asActor(studioUser.name);
    const loginAsset=['/studio.css','/account.js','/assets/servicebay-wordmark.webp','/assets/servicebay-favicon.png','/assets/about-site-walk.webp'].includes(path);
    if(privateNode&&!adminRoute&&!studioAuth&&!loginAsset&&!studioUser&&!await basic(request,env,store,platform.ip)){
      return new Response('ServiceBay private site.',{status:401,headers:{'WWW-Authenticate':'Basic realm="ServiceBay private site", charset="UTF-8"','Cache-Control':'no-store'}});
    }
    const customerAuth=path.startsWith('/api/customer-auth/');
    if((studioAuth||customerAuth)&&method==='POST'){
      const action=path.split('/').pop();
      if(action!=='logout'){
        const blockedMins=await isIpBlocked(store,platform.ip);
        if(blockedMins>0)return json({error:'Security shield active due to repeated suspicious attempts. Try again in '+blockedMins+' minute'+(blockedMins===1?'':'s')+'.'},429);
      }
      const input=await body(request,4096);
      if(detectHoneypot(input)){
        await recordIncident({db:store,env,ip:platform.ip,reason:'Bot attack blocked (honeypot)',target:path,detail:'Automated form fill detected',immediateBlock:true});
        return json({error:'Request blocked by security shield.'},403);
      }
      try{
        const result=await authAction({req:request,db:store,scope:studioAuth?'studio':'customer',action,env,platform,input});
        const reply=json(result.data);if(result.cookie)reply.headers.set('Set-Cookie',result.cookie);return reply;
      }catch(err){
        if(studioAuth&&action!=='logout'&&(err.status===401||err.status===403)){
          await recordIncident({db:store,env,ip:platform.ip,reason:'Failed studio sign-in attempt',target:String(input?.email||'').slice(0,120),detail:err.message});
        }
        throw err;
      }
    }
    if(adminRoute&&!studioUser){
      if(studioPage&&method==='GET'){
        const owner=isSiteOwner(request,env,platform);
        const setup=owner&&!(await store.get('security/owner')).data;
        return html(studioLogin({setup,identity:setup?env.SERVICEBAY_OWNER_EMAIL:''}));
      }
      fail('Sign in to the website studio to continue.',401);
    }
    if(studioPage)return html(admin(studioUser));
    if(studioUser?.role==='editor'&&path.startsWith('/api/admin/')){
      const perms=new Set(studioUser.permissions||['pages']);
      const allowed=
        path==='/api/admin/state'||
        path==='/api/admin/2fa'||
        path==='/api/admin/studio-prefs'||
        (path==='/api/admin/media'&&(perms.has('pages')||perms.has('company')))||
        (path==='/api/admin/content'&&(u.searchParams.get('scope')==='site'?(perms.has('company')||perms.has('pricing')||perms.has('connections')):perms.has('pages')))||
        ((path==='/api/admin/overview'||path==='/api/admin/service-report')&&(perms.has('overview')||perms.has('pricing')))||
        ((path==='/api/admin/inbox'||path==='/api/admin/request')&&perms.has('requests'))||
        ((path==='/api/admin/mail'||path==='/api/admin/mail-test')&&perms.has('connections'))||
        (path==='/api/admin/activity'&&perms.has('activity'));
      if(!allowed)fail('This action requires the website owner.',403);
    }
    if(path==='/api/admin/studio-prefs'){
      const key='studio-prefs/'+await hash(studioUser.id||'owner'),row=await store.get(key);
      if(method==='GET')return json(row.data||{});
      if(method==='POST'){
        const input=await body(request,2048);
        const clean={
          preset:txt(input.preset||'default',30),
          bg:txt(input.bg||'',20),card:txt(input.card||'',20),ink:txt(input.ink||'',20),
          sidebar:txt(input.sidebar||'',20),accent:txt(input.accent||'',20),
          fontSize:Math.min(18,Math.max(12,Number(input.fontSize)||14)),
          headingScale:Math.min(1.3,Math.max(0.85,Number(input.headingScale)||1)),
          sidebarWidth:Math.min(290,Math.max(190,Number(input.sidebarWidth)||224)),
          density:['compact','standard','comfortable'].includes(input.density)?input.density:'standard',
          radius:Math.min(16,Math.max(4,Number(input.radius)||11))
        };
        await store.save(key,clean,row.version);
        return json(clean);
      }
    }
    if(path==='/api/admin/2fa'){
      if(method==='GET')return json(await manage2fa({db:store,platform,user:studioUser,input:{action:'status'}}));
      if(method==='POST')return json(await manage2fa({db:store,platform,user:studioUser,input:await body(request,1024)}));
    }
    if(path==='/api/admin/shield'){
      if(method==='GET')return json(await shieldState(store,env));
      if(method==='POST'){
        const input=await body(request,1024);
        if(input.action==='test')return json(await testShieldAlert(store,env));
        if(input.action==='clear-blocks')return json(await clearShieldBlocks(store,env,platform.ip));
        return json(await updateShield(store,env,input));
      }
    }
    if(path==='/api/admin/profile'&&method==='POST'){
      const result=await updateOwner(request,store,env,platform,await body(request,4096));
      const reply=json(result.data);reply.headers.set('Set-Cookie',result.cookie);return reply;
    }
    if(path==='/api/admin/mail-test'&&method==='POST')return json(await testSender(store,env,studioUser));
    if(path==='/api/admin/mail')return json(await mailSettings(store,env,method==='POST'?await body(request,2048):null));
    if(path==='/api/admin/staff'){
      if(method==='GET')return json({items:await store.staff()});
      if(method==='POST'){const input=await body(request,2048);if(input.action==='create'){await createEditor(store,input,env,platform);return json({ok:true},201)}if(input.action==='permissions'){return json(await updateStaffPermissions({db:store,email:txt(input.email,150).toLowerCase(),permissions:input.permissions}))}if(input.action==='reset-link'){return json(await issueStaffReset({db:store,env,email:txt(input.email,150).toLowerCase(),origin:platform.requestOrigin||u.origin}))}if(input.action==='dismiss-reset'){return json(await dismissStaffReset({db:store,email:txt(input.email,150).toLowerCase()}))}if(input.action==='revoke'){const key='staff/'+await hash(txt(input.email,150).toLowerCase());const old=await store.get(key);if(!old.data)fail('Account not found.',404);await store.save(key,{...old.data,active:false,invite:null,until:0,authRevision:(old.data.authRevision||0)+1},old.version,event('Team','Revoked editor access',old.data.name));return json({ok:true})}
        return json({invite:await inviteEditor(store,input),email:txt(input.email,150).toLowerCase()})}
    }
    if(path==='/api/admin/activity'&&method==='GET'){
      const group=u.searchParams.get('group')||'',cursor=u.searchParams.get('cursor')||'activity/~';
      if((group&&!activityGroups.includes(group))||!cursor.startsWith('activity/')||cursor.length>100)fail('Invalid activity filter.');
      return json(await store.activity(cursor,group));
    }
    if((path==='/api/admin/overview'||path==='/api/admin/service-report')&&method==='GET'){
      const days=Number(u.searchParams.get('days')||0);if(![0,7,30,90].includes(days))fail('Choose a report period.');
      const period=reportingPeriod(days);
      const [groups,settings]=await Promise.all([store.serviceGroups(period.since),store.get('settings')]);
      const live=settings.data?.live?.pricing||defaults.pricing,report=serviceReport(groups,live,defaults.pricing);
      if(path.endsWith('service-report'))return json(report);
      const [inbox,activity,daily]=await Promise.all([store.inbox(),store.activity(undefined,'',5),store.dailyRequests(period.weekStart)]);
      const byDay=new Map(daily.map(r=>[r.day,Number(r.total)]));
      return json({pages:routes.length,pricing:Object.keys(live).length,totals:report.totals,top:report.rows.filter(r=>r.total).slice(0,5),week:period.days.map(day=>({day,total:byDay.get(day)||0})),activity:activity.items,recent:inbox.items.slice(0,5).map(r=>({name:r.name,service:r.service||'Service quote',status:r.status,created:r.created}))});
    }
    if(path==='/portal/'||path==='/portal')return html(portal(integration(env).portal,await session(request,store,'customer',platform,env)));
    if(path==='/api/customer/me'&&method==='GET')return json({user:await session(request,store,'customer',platform,env)});
    if(path==='/api/customer/requests'&&method==='GET'){
      const user=await session(request,store,'customer',platform,env);if(!user)fail('Sign in to view your quotes.',401);
      const [page,counts]=await Promise.all([store.recentForCustomer(user.id,u.searchParams.get('cursor')||undefined),store.requestCounts(user.id)]);return json({...page,counts});
    }
    if(path==='/api/admin/state'&&method==='GET')return json({routes,fonts,typeRoles:typeRoles.map(({key,label,min,max})=>({key,label,min,max})),defaults,user:studioUser,integrations:studioUser.role==='owner'?integration(env):{},storage:platform.storage});
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
      const reason={draft:'Saved draft',publish:'Published changes',revert:'Discarded draft'}[input.action];
      const existing=(input.action==='publish'?doc.live:doc.draft??doc.live)??defaults;
      const labels=isGlobal&&input.action!=='revert'?Object.entries({pricing:'Services & AMC',typography:'Typography',size:'Typography',font:'Typography',color:'Appearance',paper:'Appearance',ink:'Appearance',ga:'Tracking',ads:'Tracking',pixel:'Tracking',verification:'Tracking'}).filter(([k])=>JSON.stringify(existing[k]??defaults[k])!==JSON.stringify(next.draft?.[k]??defaults[k])).map(([,v])=>v):[];
      const version=await store.save(key,next,old.version,event('Website',reason,isGlobal?[...new Set(labels)].join(', ')||'Website settings':target));
      return json({version,published:!!next.live});
    }
    if(path==='/api/admin/media'&&method==='POST'){
      const {data,type}=await body(request,750000);
      if(typeof data!=='string'||data.length>700000||!['image/png','image/jpeg','image/webp'].includes(type))fail('Choose a JPEG, PNG or WebP image under 500 KB.');
      let b;try{b=bytes(data)}catch{fail('Invalid image.')};if(b.length>512000||b.length<12)fail('Choose an image under 500 KB.');
      const match=type==='image/png'?b[0]===137&&String.fromCharCode(...b.slice(1,4))==='PNG':type==='image/jpeg'?b[0]===255&&b[1]===216&&b[2]===255:String.fromCharCode(...b.slice(0,4))==='RIFF'&&String.fromCharCode(...b.slice(8,12))==='WEBP';
      if(!match)fail('Image type does not match the file.');
      const key='/media/'+await digest(data);if(!(await store.get(key)).version){try{await store.save(key,{data,type},0,event('Website','Uploaded image',type))}catch(e){if(e.status!==409)throw e}}return json({url:key});
    }
    if(path.startsWith('/media/')&&method!=='POST'){if(!/^\/media\/[a-f0-9]{64}$/.test(path))fail('Image not found.',404);const {data}=await store.get(path);if(!data)fail('Image not found.',404);return assetResponse([data.type,false,data.data])}
    if(path==='/api/admin/export'&&method==='GET')return json(await store.exportBatch(u.searchParams.get('cursor')||''));
    if(path==='/api/admin/inbox'&&method==='GET'){
      const [page,counts]=await Promise.all([store.inbox(u.searchParams.get('cursor')||undefined,txt(u.searchParams.get('q')||'',100),txt(u.searchParams.get('status')||'',30)),store.requestCounts()]);
      return json({...page,items:page.items.map(r=>({...r,emailState:emailStatus(r)})),counts});
    }
    if(path==='/api/admin/request'&&method==='POST'){
      const x=await body(request);if(!/^request\/\d{15}-[a-f0-9]{40}$/.test(x.key))fail('Invalid request.');
      if(x.action==='email')return json({status:await sendReceipt(store,env,x.key,u.origin)});
      if(x.action==='sync'){await sync(env,store,x.key);return json({ok:true})}
      if(!statuses.includes(x.status))fail('Invalid status.');
      const row=await store.get(x.key);if(!row.data)fail('Request not found.',404);
      if(x.previous!==row.data.status)fail('Status changed. Reload and retry.',409);
      if(row.data.status!==x.status)await store.save(x.key,{...row.data,status:x.status,history:[...(row.data.history||[{status:'Received',at:row.data.created}]),{status:x.status,at:new Date().toISOString()}].slice(-40)},row.version,event('Quotes','Updated quote status',(row.data.service||'Service quote')+' · '+row.data.status+' → '+x.status));return json({ok:true});
    }
    if(path.startsWith('/api/portal/')&&method==='POST'){
      const blockedMins=await isIpBlocked(store,platform.ip);
      if(blockedMins>0)return json({error:'Security shield active. Try again in '+blockedMins+' minute'+(blockedMins===1?'':'s')+'.'},429);
      const x=await body(request,12000);
      if(detectHoneypot(x)){
        await recordIncident({db:store,env,ip:platform.ip,reason:'Bot spam blocked on quote/portal form',target:path,detail:'Honeypot field triggered',immediateBlock:true});
        return json({error:'Request blocked by security shield.'},403);
      }
      const code=txt(x.code,70).toUpperCase(),primary=await requestKey(code);
      const key=path==='/api/portal/requests'?primary:((await store.get('receipt/'+await hash(code))).data?.key||primary);
      if(path==='/api/portal/claim'){
        const user=await session(request,store,'customer',platform,env);if(!user)fail('Sign in to add this receipt.',401);
        const old=await store.get(key);if(!old.data)fail('No matching receipt.',404);
        if(old.data.customerId&&old.data.customerId!==user.id)fail('This request is linked to another account.',409);
        if(!old.data.customerId)await store.save(key,{...old.data,customerId:user.id},old.version);
        return json({ok:true});
      }
      if(path==='/api/portal/track'){
        const row=(await store.get(key)).data;if(!row)fail('No matching request was found.',404);
        let status=row.status,reference;
        if(row.erpId&&integration(env).canSync){try{const v=await createServiceHubClient({baseUrl:env.SERVICEHUB_API_URL,apiKey:env.SERVICEHUB_API_KEY}).status(row.erpId);status=v.service_request?.status||v.lead?.stage||status;reference=v.service_request?.reference||v.lead?.reference}catch{}}
        return json({status,reference,created:row.created});
      }
      if(path==='/api/portal/requests'){
        const name=txt(x.name,80),email=txt(x.email||'',150),phone=txt(x.phone||'',32),message=txt(x.message,3500);
        if(!name||!message||(!email&&!phone)||(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))||(phone&&!/^[+\d(). -]{7,32}$/.test(phone)))fail('Check your name, contact details and service request.');
        let old=await store.get(key);
        if(!old.data&&Math.abs(Date.now()-Number(key.slice(8,23)))>86400000)fail('Refresh the form for a new receipt.');
        await store.limit('rate/submit/'+await digest(platform.ip||'shared'),30,10);
        const account=await quoteCustomer(request,store,env,platform,{name,email,password:x.password}),user=account.data.user;
        const service=txt(x.service||'Service quote',90),area=txt(x.area||'',80),created=new Date().toISOString();
        let inserted=false;
        if(!old.data){
          const record={name,email:user.email,phone,message,service,area,property:txt(x.property||'',80),country:txt(x.country||'',80),details:txt(x.details||'',650),customerId:user.id,receipt:code,created,status:'Received',history:[{status:'Received',at:created}],serviceId:txt(x.serviceId||'',100),planId:txt(x.planId||'',100),plan:txt(x.plan||'',90),external:'sb-'+key.slice(-40),erpId:null};
          try{await store.save(key,record,0,event('Quotes','Received quote',service,'Customer portal'));inserted=true}catch(e){if(e.status!==409)throw e;old=await store.get(key)}
        }
        if(!inserted&&old.data?.customerId!==user.id)fail('Use the original account or start a new quote.',409);
        let delivery;
        try{delivery=await sendReceipt(store,env,key,u.origin)}catch{delivery='Not sent'}
        if(inserted&&integration(env).canSync){try{await sync(env,store,key)}catch{/* Still available for retry in the inbox. */}}
        const reply=json({code,emailStatus:delivery},inserted?201:200);
        if(account.cookie)reply.headers.set('Set-Cookie',account.cookie);return reply;
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
  if(ctx?.nodeStore)return serve(request,env,ctx.nodeStore,{kind:"node",storage:env.DATABASE_URL?"PostgreSQL":"Local SQLite",ip:ctx.ip,requestOrigin:ctx.requestOrigin});
  const prepared=(sql,args)=>env.DB.prepare(sql).bind(...args);
  const store=records(async(sql,args)=>(await prepared(sql,args).all()).results,'sqlite',async statements=>(await env.DB.batch(statements.map(([sql,args])=>prepared(sql,args)))).map(v=>v.results));
  return serve(request,env,store,{kind:'sites',storage:'Sites database',ip:request.headers.get('CF-Connecting-IP')||request.headers.get('oai-authenticated-user-id')});
}};
