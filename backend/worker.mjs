import {typeRoles} from './typography.mjs';
import {event,activityGroups,statuses,reportingPeriod,serviceReport} from './insights.mjs';
import {assets,routes} from './generated.mjs';
import {records} from './store.mjs';
import {renderPage,cleanSettings,cleanPage,EMPTY_PAGE,defaults,fonts,fail,txt} from './content.mjs';
import {authAction, session, isSiteOwner, inviteEditor, hash, createEditor, updateOwner, nodeOwnerLogin, quoteCustomer, manage2fa, issueStaffReset, dismissStaffReset, updateStaffPermissions} from './accounts.mjs';
import {detectProbe, detectHoneypot, isIpBlocked, recordIncident, shieldState, updateShield, testShieldAlert, clearShieldBlocks} from './shield.mjs';
import {mailSettings,sendReceipt,emailStatus,testSender,sendSystemEmail} from './mail.mjs';
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
function parseErpUrl(apiUrl,apiKey){
  let u;try{u=new URL(apiUrl)}catch{return {}}
  const match=u.pathname.match(/^(.*?)\/api\/v1\/([a-zA-Z0-9_-]+)\/?$/);
  if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash||!match)return {};
  const root=u.origin+match[1],tenant=match[2];
  return {portal:root+'/portal/'+tenant,stripeTest:root+'/api/stripe/'+tenant+'/test',stripeLive:root+'/api/stripe/'+tenant+'/live',canSync:/^shw_[\w-]{43}$/.test(apiKey||'')};
}
function integration(env){
  return parseErpUrl(env.SERVICEHUB_API_URL,env.SERVICEHUB_API_KEY);
}
async function erpCipher(env){
  const raw=env.MAIL_SETTINGS_KEY||env.ADMIN_PASSWORD||'servicebay-erp-key';
  return crypto.subtle.importKey('raw',await crypto.subtle.digest('SHA-256',new TextEncoder().encode(raw)),'AES-GCM',false,['encrypt','decrypt']);
}
async function erpCredentials(store,env){
  const saved=(await store.get('security/erp')).data||{};
  if(saved.deleted&&!saved.apiUrl)return {apiUrl:'',apiKey:'',paused:false,source:'none',lastCheck:saved.lastCheck||null};
  if(saved.apiUrl&&saved.secret&&saved.iv){
    try{
      const dec=await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes(saved.iv)},await erpCipher(env),bytes(saved.secret));
      return {apiUrl:saved.apiUrl,apiKey:new TextDecoder().decode(dec),paused:!!saved.paused,source:'studio',lastCheck:saved.lastCheck||null};
    }catch{}
  }
  return {apiUrl:env.SERVICEHUB_API_URL||'',apiKey:env.SERVICEHUB_API_KEY||'',paused:!!saved.paused,source:env.SERVICEHUB_API_URL?'env':'none',lastCheck:saved.lastCheck||null};
}
async function erpState(store,env){
  const creds=await erpCredentials(store,env),base=parseErpUrl(creds.apiUrl,creds.apiKey);
  return {...base,apiUrl:creds.apiUrl,source:creds.source,paused:creds.paused,canSync:!creds.paused&&!!base.canSync,lastCheck:creds.lastCheck};
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
  const creds=await erpCredentials(store,env),base=parseErpUrl(creds.apiUrl,creds.apiKey);
  if(creds.paused)fail('ServiceHub ERP sync is disconnected in Studio > Integrations.',503);
  if(!base.canSync)fail('Add the ServiceHub API URL and integration key to enable delivery.',503);
  const r=entry.data,c=createServiceHubClient({baseUrl:creds.apiUrl,apiKey:creds.apiKey});
  const extId=r.external||r.receipt||key.replace(/[^A-Za-z0-9_.:-]/g,'-');
  const attr=[r.source?'Source: '+r.source:'',r.medium?'Medium: '+r.medium:'',r.campaign?'Campaign: '+r.campaign:'',r.device?'Device: '+r.device:''].filter(Boolean).join(' | ');
  const baseMsg=r.message||'';
  const fullMsg=attr?(baseMsg?baseMsg+'\n\n['+attr+']':'['+attr+']'):baseMsg;
  let response;
  try{response=await c.submit('enquiries',extId,{external_id:extId,name:r.name,email:r.email,phone:r.phone,message:fullMsg,source:r.source||'Direct',medium:r.medium||'',campaign:r.campaign||'',device:r.device||'',service:r.service||'',area:r.area||'',property:r.property||'',country:r.country||''})}catch(err){
    if(err?.status===401||err?.status===403){try{const row=await store.get('security/erp');await store.save('security/erp',{...row.data,lastCheck:{status:'Revoked / Unauthorized ('+err.status+')',at:new Date().toISOString()}},row.version)}catch{}}
    fail(err?.message||'ServiceHub did not confirm delivery. The request is saved and can be retried.',502);
  }
  const erpId=Number(response?.id??response?.enquiry?.id??response?.service_request?.id??response?.lead?.id);
  if(!Number.isSafeInteger(erpId)||erpId<1)fail('ServiceHub returned an unrecognised receipt. Retry using the same request.',502);
  // Another administrator can change status while the external call is in progress.
  for(let n=0;n<3;n++){const next=await store.get(key);if(next.data.erpId)return next;try{const upd={...next.data,erpId};delete upd.erpError;await store.save(key,upd,next.version,event('Quotes','Sent quote to ServiceHub',r.service||'Service quote'));return await store.get(key)}catch(e){if(e.status!==409)throw e}}
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
    if(path==='/api/analytics/visit'&&method==='POST'){
      await store.limit('rate/visit/'+await digest(platform.ip||'shared'),40,10);
      const x=await body(request,1024);
      const source=txt(x.source||'Direct',40)||'Direct';
      const medium=txt(x.medium||'',40),campaign=txt(x.campaign||'',60),device=txt(x.device||'Desktop',20)||'Desktop',page=txt(x.page||'/',120)||'/';
      const now=new Date().toISOString();
      await store.save('visit/'+now+'/'+crypto.randomUUID(),{source,medium,campaign,device,page,created:now},0);
      return json({ok:true});
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
        ((path==='/api/admin/mail'||path==='/api/admin/mail-test'||path==='/api/admin/erp')&&perms.has('connections'))||
        (path==='/api/admin/staff'&&perms.has('team'))||
        (path==='/api/admin/shield'&&perms.has('security'))||
        (path==='/api/admin/profile'&&perms.has('profile'))||
        (path==='/api/admin/activity'&&perms.has('activity'));
      if(!allowed)fail('This action requires the website owner.',403);
    }
    if(path==='/api/admin/erp'){
      if(method==='GET')return json(await erpState(store,env));
      if(method==='POST'){
        const input=await body(request,2048),row=await store.get('security/erp'),cur=row.data||{};
        if(input.action==='save'){
          const apiUrl=String(input.apiUrl||'').trim().replace(/\/$/,'');
          const apiKey=String(input.apiKey||'').trim();
          const parsed=parseErpUrl(apiUrl,apiKey||'shw_'+'a'.repeat(43));
          if(!parsed.portal)fail('Enter a valid HTTPS ServiceHub API URL (e.g. https://host/api/v1/company-slug).');
          let secret=cur.secret,iv=cur.iv;
          if(apiKey){
            if(!/^shw_[\w-]{43}$/.test(apiKey))fail('Enter a valid ServiceHub API key (starts with shw_).');
            const ivBytes=crypto.getRandomValues(new Uint8Array(12));
            const enc=await crypto.subtle.encrypt({name:'AES-GCM',iv:ivBytes},await erpCipher(env),new TextEncoder().encode(apiKey));
            iv=btoa(String.fromCharCode(...ivBytes));
            secret=btoa(String.fromCharCode(...new Uint8Array(enc)));
          }else if(!secret)fail('Enter your ServiceHub API key.');
          let checkStatus='Unreachable';
          try{
            const res=await fetch(apiUrl+'/requests/999999999',{headers:{Authorization:'Bearer '+(apiKey||((await erpCredentials(store,env)).apiKey))},signal:AbortSignal.timeout(12000),redirect:'error'});
            if(res.status===401||res.status===403)checkStatus='Revoked / Unauthorized ('+res.status+')';
            else if(res.ok||res.status===404||res.status===400)checkStatus='Connected';
            else checkStatus='Provider error ('+res.status+')';
          }catch{checkStatus='Connection timeout'}
          await store.save('security/erp',{apiUrl,iv,secret,paused:false,deleted:false,lastCheck:{status:checkStatus,at:new Date().toISOString()}},row.version,event('Website','Saved ServiceHub ERP connection',apiUrl+' · '+checkStatus));
          return json(await erpState(store,env));
        }
        if(input.action==='delete'){
          await store.save('security/erp',{deleted:true,paused:false},row.version,event('Website','Deleted ServiceHub ERP connection'));
          return json(await erpState(store,env));
        }
        if(input.action==='disconnect'){
          await store.save('security/erp',{...cur,paused:true},row.version,event('Website','Disconnected ServiceHub ERP sync'));
          return json(await erpState(store,env));
        }
        if(input.action==='reconnect'){
          await store.save('security/erp',{...cur,paused:false},row.version,event('Website','Re-enabled ServiceHub ERP sync'));
          return json(await erpState(store,env));
        }
        if(input.action==='test'){
          const creds=await erpCredentials(store,env),base=parseErpUrl(creds.apiUrl,creds.apiKey);
          if(!base.canSync)fail('Add a ServiceHub API URL and API key first.',409);
          let status='Unreachable';
          try{
            const res=await fetch(creds.apiUrl.replace(/\/$/,'')+'/requests/999999999',{headers:{Authorization:'Bearer '+creds.apiKey},signal:AbortSignal.timeout(8000),redirect:'error'});
            if(res.status===401||res.status===403)status='Revoked / Unauthorized ('+res.status+')';
            else if(res.ok||res.status===404||res.status===400)status='Connected';
            else status='Provider error ('+res.status+')';
          }catch{status='Connection timeout'}
          await store.save('security/erp',{...cur,lastCheck:{status,at:new Date().toISOString()}},row.version,event('Website','Tested ServiceHub ERP connection',status));
          return json(await erpState(store,env));
        }
        if(input.action==='push-all'){
          const creds=await erpCredentials(store,env),base=parseErpUrl(creds.apiUrl,creds.apiKey);
          if(creds.paused)fail('ServiceHub ERP sync is disconnected in Studio > Integrations.',503);
          if(!base.canSync)fail('Add a ServiceHub API URL and API key first.',409);
          let cursor='request/~',unsent=[];
          do{
            const page=await store.inbox(cursor);
            for(const r of page.items||[]){if(!r.erpId)unsent.push(r);if(unsent.length>=100)break}
            cursor=page.next;
          }while(cursor&&unsent.length<100);
          let sent=0,failed=0;const errors=[];
          for(const r of unsent){
            try{await sync(env,store,r.key);sent++}catch(err){
              failed++;
              if(errors.length<5)errors.push((r.external||r.key)+': '+(err?.message||'Sync failed'));
              try{const curRow=await store.get(r.key);if(curRow.data&&!curRow.data.erpId)await store.save(r.key,{...curRow.data,erpError:txt(err?.message||'Sync failed',240)},curRow.version)}catch{}
            }
          }
          return json({total:unsent.length,sent,failed,errors,state:await erpState(store,env)});
        }
        if(input.action==='pull-pricing'){
          const creds=await erpCredentials(store,env),base=parseErpUrl(creds.apiUrl,creds.apiKey);
          if(creds.paused)fail('ServiceHub ERP sync is disconnected in Studio > Integrations.',503);
          if(!base.canSync)fail('Add a ServiceHub API URL and API key first.',409);
          const client=createServiceHubClient({baseUrl:creds.apiUrl,apiKey:creds.apiKey});
          const list=await client.listServices();
          if(list===null)fail('No /services, /pricing, or /catalog endpoint found on ServiceHub ERP.',404);
          const srow=await store.get('settings');
          const curSet=srow.data||{draft:defaults,live:defaults};
          const draft=structuredClone(curSet.draft||defaults),live=structuredClone(curSet.live||defaults);
          draft.pricing=draft.pricing||structuredClone(defaults.pricing);
          live.pricing=live.pricing||structuredClone(defaults.pricing);
          let updatedCount=0;
          for(const item of list){
            if(!item||typeof item!=='object')continue;
            const name=txt(item.name||item.title||item.service_name||'',80);
            const rate=Number(item.rate??item.price??item.unit_price??item.amount??0);
            if(!Number.isFinite(rate)||rate<=0)continue;
            const slug=item.slug?String(item.slug):'';
            const idKey=item.id?String(item.id):'';
            let matchKey=slug&&draft.pricing[slug]?slug:(idKey&&draft.pricing[idKey]?idKey:'');
            if(!matchKey&&name){
              const norm=name.toLowerCase();
              matchKey=Object.keys(draft.pricing).find(k=>(draft.pricing[k]?.name||'').trim().toLowerCase()===norm)||'';
            }
            if(matchKey){
              draft.pricing[matchKey]={...draft.pricing[matchKey],rate,name:name||draft.pricing[matchKey].name};
              if(live.pricing[matchKey])live.pricing[matchKey]={...live.pricing[matchKey],rate,name:name||live.pricing[matchKey].name};
              else live.pricing[matchKey]=structuredClone(draft.pricing[matchKey]);
              updatedCount++;
            }else if(name){
              const newKey='custom-'+crypto.randomUUID().replaceAll('-','');
              const entry={kind:item.kind==='plan'?'plan':'service',name,rate,description:txt(item.description||'',300),unit:txt(item.unit||'Units',30),sectors:Array.isArray(item.sectors)&&item.sectors.length?item.sectors:['residential','commercial','industrial']};
              draft.pricing[newKey]=entry;
              live.pricing[newKey]=structuredClone(entry);
              updatedCount++;
            }
          }
          const saved={draft:cleanSettings(draft),live:cleanSettings(live)};
          await store.save('settings',saved,srow.version,event('Website','Pulled service prices from ERP',updatedCount+' updated'));
          return json({updatedCount,total:list.length,message:updatedCount?('Updated '+updatedCount+' service prices from ServiceHub ERP.'):'No service prices with valid rates (> 0) found in ERP.'});
        }
        fail('Unknown ERP action.');
      }
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
      const [groups,settings,srcRaw]=await Promise.all([store.serviceGroups(period.since),store.get('settings'),store.sourceReport(period.since)]);
      const live=settings.data?.live?.pricing||defaults.pricing,report=serviceReport(groups,live,defaults.pricing);
      const map=new Map();
      for(const v of srcRaw.visits){const s=v.source||'Direct';map.set(s,{source:s,visits:Number(v.total),leads:0})}
      for(const l of srcRaw.leads){const s=l.source||'Direct',cur=map.get(s)||{source:s,visits:0,leads:0};cur.leads+=Number(l.total);map.set(s,cur)}
      const platforms=[...map.values()].sort((a,b)=>(b.leads-a.leads)||(b.visits-a.visits));
      const devices=srcRaw.devices.map(d=>({device:d.device||'Unknown',total:Number(d.total)}));
      const sources={platforms,devices,totalVisits:platforms.reduce((s,p)=>s+p.visits,0),totalLeads:platforms.reduce((s,p)=>s+p.leads,0)};
      if(path.endsWith('service-report'))return json({...report,sources});
      const [inbox,activity,daily]=await Promise.all([store.inbox(),store.activity(undefined,'',5),store.dailyRequests(period.weekStart)]);
      const byDay=new Map(daily.map(r=>[r.day,Number(r.total)]));
      return json({pages:routes.length,pricing:Object.keys(live).length,totals:report.totals,top:report.rows.filter(r=>r.total).slice(0,5),week:period.days.map(day=>({day,total:byDay.get(day)||0})),activity:activity.items,recent:inbox.items.slice(0,5).map(r=>({name:r.name,service:r.service||'Service quote',status:r.status,created:r.created,source:r.source||'Direct'})),sources});
    }
    if(path==='/portal/'||path==='/portal')return html(portal(integration(env).portal,await session(request,store,'customer',platform,env)));
    if(path==='/api/customer/me'&&method==='GET')return json({user:await session(request,store,'customer',platform,env)});
    if(path==='/api/customer/requests'&&method==='GET'){
      const user=await session(request,store,'customer',platform,env);if(!user)fail('Sign in to view your quotes.',401);
      const [page,counts]=await Promise.all([store.recentForCustomer(user.id,u.searchParams.get('cursor')||undefined),store.requestCounts(user.id)]);return json({...page,counts});
    }
    if(path==='/api/admin/state'&&method==='GET')return json({routes,fonts,typeRoles:typeRoles.map(({key,label,min,max})=>({key,label,min,max})),defaults,user:studioUser,integrations:(studioUser.role==='owner'||(studioUser.permissions||[]).includes('connections'))?await erpState(store,env):{},storage:platform.storage});
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
      if(x.action==='sync'){try{await sync(env,store,x.key)}catch(err){try{const cur=await store.get(x.key);if(cur.data&&!cur.data.erpId)await store.save(x.key,{...cur.data,erpError:String(err?.message||'Sync failed').slice(0,200)},cur.version)}catch{}throw err}return json({ok:true})}
      if(!statuses.includes(x.status))fail('Invalid status.');
      const row=await store.get(x.key);if(!row.data)fail('Request not found.',404);
      if(x.previous!==row.data.status)fail('Status changed. Reload and retry.',409);
      let statusMail='';
      if(row.data.status!==x.status){
        await store.save(x.key,{...row.data,status:x.status,history:[...(row.data.history||[{status:'Received',at:row.data.created}]),{status:x.status,at:new Date().toISOString()}].slice(-40)},row.version,event('Quotes','Updated quote status',(row.data.service||'Service quote')+' · '+row.data.status+' → '+x.status));
        if(row.data.email){
          const portalUrl=(platform.requestOrigin||u.origin)+'/portal/';
          try{
            statusMail=await sendSystemEmail(store,env,{
              to:row.data.email,
              subject:'ServiceBay quote status updated: '+x.status,
              text:`Hello ${row.data.name||'Customer'},\n\nYour ${row.data.service||'service'} request status has been updated from "${row.data.status}" to "${x.status}".\n\nReceipt code: ${row.data.receipt||'Available in portal'}\nTrack your request: ${portalUrl}\n\nServiceBay Technical Services`,
              idempotencyKey:'sb-status-'+row.data.external+'-'+x.status+'-'+row.version
            });
          }catch{statusMail='Unconfirmed'}
        }
      }
      return json({ok:true,emailStatus:statusMail});
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
        if(row.erpId){const creds=await erpCredentials(store,env);if(!creds.paused&&parseErpUrl(creds.apiUrl,creds.apiKey).canSync){try{const v=await createServiceHubClient({baseUrl:creds.apiUrl,apiKey:creds.apiKey}).status(row.erpId);status=v.service_request?.status||v.lead?.stage||status;reference=v.service_request?.reference||v.lead?.reference}catch{}}}
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
          const record={name,email:user.email,phone,message,service,area,property:txt(x.property||'',80),country:txt(x.country||'',80),details:txt(x.details||'',650),source:txt(x.source||'Direct',40)||'Direct',medium:txt(x.medium||'',40),campaign:txt(x.campaign||'',60),device:txt(x.device||'',20),landingPage:txt(x.landingPage||'',120),customerId:user.id,receipt:code,created,status:'Received',history:[{status:'Received',at:created}],serviceId:txt(x.serviceId||'',100),planId:txt(x.planId||'',100),plan:txt(x.plan||'',90),external:'sb-'+key.slice(-40),erpId:null};
          try{await store.save(key,record,0,event('Quotes','Received quote',service+' · '+(record.source||'Direct'),'Customer portal'));inserted=true}catch(e){if(e.status!==409)throw e;old=await store.get(key)}
        }
        if(!inserted&&(old.data?.customerId||'')!==(user.id||''))fail('Use the original account or start a new quote.',409);
        let delivery;
        try{delivery=await sendReceipt(store,env,key,u.origin)}catch{delivery='Not sent'}
        if(inserted&&(await erpState(store,env)).canSync){try{await sync(env,store,key)}catch(err){try{const cur=await store.get(key);if(cur.data&&!cur.data.erpId)await store.save(key,{...cur.data,erpError:String(err?.message||'Sync failed').slice(0,200)},cur.version)}catch{}}}
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
