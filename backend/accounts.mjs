import {event} from './insights.mjs';
const encoder = new TextEncoder();
const hex = bytes => Array.from(bytes, n => n.toString(16).padStart(2,'0')).join('');
const random = length => hex(crypto.getRandomValues(new Uint8Array(length)));
export const hash = async value => hex(new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(value))));
export function reject(message,status=400){throw Object.assign(new Error(message),{status})}
const invalid = () => reject('The sign-in details did not match.',401);
function same(a,b){if(!a||!b||a.length!==b.length)return false;let diff=0;for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);return diff===0}
function email(value){const x=String(value||'').trim().toLowerCase();if(x.length>150||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x))reject('Enter a valid email address.');return x}
function strong(password){if(typeof password!=='string'||password.length<15||password.length>128)reject('Choose a password of 15 to 128 characters.');return password}
async function derive(password,salt){
  const key=await crypto.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveBits']);
  return hex(new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',salt:encoder.encode(salt),iterations:100000,hash:'SHA-256'},key,256)));
}
async function passwordRecord(password){const salt=random(24);return {salt,verifier:await derive(strong(password),salt),scheme:'pbkdf2-sha256-100000'}}
async function checkPassword(value,stored){
  if(typeof value!=='string'||value.length>128)invalid();
  const actual=await derive(value,stored?.salt||'unassigned-account-verifier');
  if(!same(actual,stored?.verifier))invalid();
}
function cookieName(scope,secure){return (secure?'__Host-':'')+'servicebay_'+scope}
function ticket(req,scope){const name=cookieName(scope,new URL(req.url).protocol==='https:');return (req.headers.get('cookie')||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(name+'='))?.slice(name.length+1)}
function cookie(req,scope,token,life){const secure=new URL(req.url).protocol==='https:';return cookieName(scope,secure)+'='+token+'; Path=/; HttpOnly; SameSite=Lax; Max-Age='+life+(secure?'; Secure':'')}
const safeUser = u=>({id:u.id,name:u.name,email:u.email,username:u.username||'',role:u.role,revision:u.authRevision||0});
function siteId(req){return req.headers.get('oai-authenticated-user-id')||''}
function siteMail(req){return (req.headers.get('oai-authenticated-user-email')||'').toLowerCase()}
export function isSiteOwner(req,env,platform){return platform.kind==='sites'&&!!siteId(req)&&!!env.SERVICEBAY_OWNER_EMAIL&&siteMail(req)===env.SERVICEBAY_OWNER_EMAIL.toLowerCase()}
async function establish(req,db,scope,user,binding){
  const token=random(32),now=Date.now(),seconds=scope==='studio'?28800:86400;
  await db.pruneSessions();
  await db.save('session/'+await hash(token),{scope,user:safeUser(user),binding,last:now,expires:now+seconds*1000},0,scope==='studio'?event('Studio','Opened studio session',user.role,user.name):undefined);
  return {data:{user:safeUser(user)},cookie:cookie(req,scope,token,seconds)};
}
export async function session(req,db,scope,platform,env){
  const token=ticket(req,scope);if(!/^[a-f0-9]{64}$/.test(token||''))return null;
  const key='session/'+await hash(token),row=await db.get(key),s=row.data,now=Date.now();
  if(!s||s.scope!==scope||s.expires<=now)return null;
  if(scope==='studio'){
    if(now-s.last>=1800000)return null;
    if(platform.kind==='sites'&&(!siteId(req)||s.binding!==siteId(req)))return null;
    let current;
    if(s.user.role==='owner'){
      if(platform.kind==='sites'&&!isSiteOwner(req,env,platform))return null;
      current=(await db.get(ownerKey(platform))).data;
      if(platform.kind==='node'&&s.binding!==await hash(env.ADMIN_PASSWORD||''))return null;
    }else{
      current=(await db.get('staff/'+await hash(s.user.email))).data;
      if(!current?.active||current.id!==s.user.id||(platform.kind==='sites'&&siteMail(req)!==current.email))return null;
    }
    if((s.user.revision||0)!==(current?.authRevision||0))return null;
    if(now-s.last>60000){try{await db.save(key,{...s,last:now},row.version)}catch(e){if(e.status!==409)throw e}}
  }
  return s.user;
}
export async function authAction({req,db,scope,action,env,platform,input}){
  if(action==='logout'){const t=ticket(req,scope);if(/^[a-f0-9]{64}$/.test(t||''))await db.remove('session/'+await hash(t));return {data:{ok:true},cookie:cookie(req,scope,'',0)}}
  const ip=await hash(platform.ip||'shared');
  await db.limit('rate/auth/'+scope+'/'+ip,action==='signup'?10:35,10);
  if(scope==='customer'){
    const address=email(input.email),key='customer/'+await hash(address);
    if(action==='signup'){
      const name=String(input.name||'').trim();if(!name||name.length>80)reject('Enter your full name.');
      const auth=await passwordRecord(input.password);
      const user={id:random(16),role:'customer',name,email:address,auth};
      try{await db.save(key,user,0)}catch(e){if(e.status===409)reject('An account could not be created with these details. Try signing in.',409);throw e}
      return establish(req,db,scope,user,'');
    }
    if(action!=='login')reject('Unknown account action.',404);
    const user=(await db.get(key)).data;await checkPassword(input.password,user?.auth);return establish(req,db,scope,user,'');
  }
  const owner=isSiteOwner(req,env,platform);
  const binding=platform.kind==='sites'?siteId(req):await hash(env.ADMIN_PASSWORD||'');
  if(platform.kind==='sites'&&!binding)reject('Open the studio using your authorised site account.',403);
  if(action==='setup'){
    if(!owner)reject('Owner setup requires the signed-in site owner.',403);
    const user={id:'owner',name:'Website owner',role:'owner',email:siteMail(req),username:'',auth:await passwordRecord(input.password)};
    await db.save('security/owner',user,0,event('Team','Set up owner account','','Website owner'));return {data:{created:true}};
  }
  if(action==='activate'){
    const address=email(input.email),key='staff/'+await hash(address),row=await db.get(key),u=row.data;
    if(!u||u.active||!u.invite||u.until<Date.now()||!same(await hash(String(input.invite||'')),u.invite)||(platform.kind==='sites'&&siteMail(req)!==address))reject('This invitation is unavailable for this account.',403);
    const updated={id:u.id,name:u.name,email:address,role:'editor',active:true,auth:await passwordRecord(input.password)};
    await db.save(key,updated,row.version,event('Team','Activated editor account',updated.name,updated.name));return establish(req,db,scope,updated,binding);
  }
  if(action!=='login')reject('Unknown account action.',404);
  const login=String(input.email||'').trim().toLowerCase();
  const ownerRow=(await db.get(ownerKey(platform))).data;
  if(owner){
    if(!ownerRow||!matchesLogin(login,ownerRow,siteMail(req)))invalid();
    await checkPassword(input.password,ownerRow.auth);return establish(req,db,scope,ownerRow,binding);
  }
  if(platform.kind==='node'&&await nodeOwnerLogin(db,env,login,input.password)){
    return establish(req,db,scope,ownerRow||bootstrapOwner(env),binding);
  }
  let address=login;
  if(!address.includes('@'))address=(await db.get('login/'+await hash(login))).data?.email||'';
  if(platform.kind==='sites'&&address!==siteMail(req))invalid();
  const user=(await db.get('staff/'+await hash(address))).data;
  await checkPassword(input.password,user?.active&&matchesLogin(login,user)?user.auth:null);
  return establish(req,db,scope,user,binding);
}
export async function inviteEditor(db,input){
  const address=email(input.email),name=String(input.name||'').trim();
  if(!name||name.length>80)reject('Enter the editor’s name.');
  const key='staff/'+await hash(address),row=await db.get(key);if(row.data?.active)reject('This editor already has an active account.',409);
  const token=random(32);await db.save(key,{id:random(16),email:address,name,role:'editor',active:false,invite:await hash(token),until:Date.now()+86400000},row.version,event('Team','Invited editor',name));return token;
}

function ownerKey(platform){return platform.kind==='sites'?'security/owner':'security/node-owner'}
function bootstrapOwner(env){return {id:'owner',role:'owner',name:'Website owner',username:env.ADMIN_USERNAME||'owner',email:env.ADMIN_EMAIL||''}}
function matchesLogin(login,user,legacyIdentity=''){
  return (!!login&&[user.email,user.username].some(value=>value&&login===value.toLowerCase()))||
    (!login&&!user.username&&user.email===legacyIdentity);
}
function username(value){
  const v=String(value||'').trim().toLowerCase();
  if(!/^[a-z0-9][a-z0-9._-]{2,39}$/.test(v))reject('Use 3–40 letters, numbers, dots, hyphens or underscores for the username.');
  return v;
}
export async function nodeOwnerLogin(db,env,login,password){
  const current=(await db.get('security/node-owner')).data;
  if(current){
    if(!matchesLogin(login,current))return false;
    try{await checkPassword(password,current.auth);return true}catch{return false}
  }
  return !!env.ADMIN_PASSWORD&&env.ADMIN_PASSWORD.length>=24&&typeof password==='string'&&login===(env.ADMIN_USERNAME||'owner').toLowerCase()&&same(await hash(password),await hash(env.ADMIN_PASSWORD));
}
async function reserveLogin(db,login,id,address){
  const key='login/'+await hash(login),row=await db.get(key);
  if(row.data?.id===id)return;
  if(row.data)reject('That username is already in use.',409);
  await db.save(key,{id,email:address},0);
}
export async function createEditor(db,input,env,platform){
  const address=email(input.email),login=username(input.username),name=String(input.name||'').trim();
  if(!name||name.length>80)reject('Enter the editor’s full name.');
  const owner=(await db.get(ownerKey(platform))).data||bootstrapOwner(env);
  if([owner.email,env.SERVICEBAY_OWNER_EMAIL,env.ADMIN_EMAIL].filter(Boolean).some(v=>v.toLowerCase()===address)||login===(owner.username||env.ADMIN_USERNAME||'owner').toLowerCase())reject('These sign-in details are reserved for the owner.');
  const key='staff/'+await hash(address),row=await db.get(key);
  if(row.data?.active)reject('An active account already uses this email.',409);
  const id=row.data?.id||random(16),auth=await passwordRecord(input.password);
  await reserveLogin(db,login,id,address);
  await db.save(key,{id,name,email:address,username:login,auth,role:'editor',active:true,authRevision:(row.data?.authRevision||0)+1},row.version,event('Team','Created editor account',name));
}
export async function updateOwner(req,db,env,platform,input){
  await db.limit('rate/profile/'+await hash(platform.ip||'shared'),12,10);
  const key=ownerKey(platform),row=await db.get(key),prior=row.data||bootstrapOwner(env);
  if(row.data){try{await checkPassword(input.currentPassword,prior.auth)}catch{reject('Your current password did not match.',403)}}
  else if(platform.kind!=='node'||!await nodeOwnerLogin(db,env,(env.ADMIN_USERNAME||'owner').toLowerCase(),input.currentPassword))invalid();
  const address=email(input.email),login=username(input.username),name=String(input.name||'').trim();
  if(!name||name.length>80)reject('Enter your display name.');
  if((await db.get('staff/'+await hash(address))).data)reject('That email is assigned to a team account.',409);
  const auth=input.newPassword||!prior.auth?await passwordRecord(input.newPassword||input.currentPassword):prior.auth;
  await reserveLogin(db,login,'owner',address);
  const updated={...prior,name,username:login,email:address,auth,authRevision:(prior.authRevision||0)+1};
  await db.save(key,updated,row.version,event('Team','Updated owner sign-in details'));
  return establish(req,db,'studio',updated,platform.kind==='sites'?siteId(req):await hash(env.ADMIN_PASSWORD||''));
}
export async function quoteCustomer(req,db,env,platform,input){
  const signed=await session(req,db,'customer',platform,env);
  if(signed)return {data:{user:signed}};
  const address=email(input.email),key='customer/'+await hash(address);
  const args={req,db,env,platform,scope:'customer',input:{...input,email:address}};
  if(!(await db.get(key)).data){
    try{return await authAction({...args,action:'signup'})}catch(e){if(e.status!==409)throw e}
  }
  try{return await authAction({...args,action:'login'})}catch(e){if(e.status===401)reject('Check your portal password for this email, then send the request again.',403);throw e}
}
