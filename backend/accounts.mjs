import {event} from './insights.mjs';
import {generateSecret,verifyTotp,totpUri,generateBackupCodes,qrSvg} from './totp.mjs';
import {sendSystemEmail} from './mail.mjs';
import {resolveOwnerEmail} from './shield.mjs';
const encoder = new TextEncoder();
const hex = bytes => Array.from(bytes, n => n.toString(16).padStart(2,'0')).join('');
const random = length => hex(crypto.getRandomValues(new Uint8Array(length)));
export const hash = async value => hex(new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(value))));
export function reject(message,status=400){throw Object.assign(new Error(message),{status})}
const invalid = () => reject('Incorrect email/username or password.',401);
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
export const ALL_STAFF_PERMS=['pages','overview','requests','company','pricing','connections','activity'];
export function cleanPermissions(perms){
  if(!Array.isArray(perms))return ['pages'];
  const valid=perms.filter(p=>ALL_STAFF_PERMS.includes(p));
  return valid.length?[...new Set(valid)]:['pages'];
}
const safeUser = u=>({id:u.id,name:u.name,email:u.email,username:u.username||'',role:u.role,revision:u.authRevision||0,permissions:u.role==='owner'?ALL_STAFF_PERMS:cleanPermissions(u.permissions)});
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
    return {...s.user,permissions:s.user.role==='owner'?ALL_STAFF_PERMS:cleanPermissions(current?.permissions??s.user.permissions)};
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
    const updated={id:u.id,name:u.name,email:address,role:'editor',active:true,permissions:cleanPermissions(u.permissions),auth:await passwordRecord(input.password)};
    await db.save(key,updated,row.version,event('Team','Activated editor account',updated.name,updated.name));return establish(req,db,scope,updated,binding);
  }
  if(action==='forgot'){
    return {data:await forgotPassword({db,env,platform,input})};
  }
  if(action==='reset'){
    return resetPassword({req,db,env,platform,input,binding});
  }
  if(action==='verify-2fa'){
    const challenge=String(input.challenge||'');
    if(!/^[a-f0-9]{64}$/.test(challenge))reject('Verification session expired. Sign in again.',401);
    const cKey='2fa/'+await hash(challenge),cRow=await db.get(cKey),pending=cRow.data;
    if(!pending||pending.expires<=Date.now()){if(pending)await db.remove(cKey);reject('Verification session expired. Sign in again.',401)}
    const verified=await checkTotpChallenge(db,pending.totpKey,input.code);
    if(!verified)reject('Incorrect authenticator or backup code.',401);
    await db.remove(cKey);
    return establish(req,db,scope,pending.user,pending.binding);
  }
  if(action!=='login')reject('Unknown account action.',404);
  const login=String(input.email||'').trim().toLowerCase();
  const ownerRow=(await db.get(ownerKey(platform))).data;
  if(owner){
    if(!ownerRow||!matchesLogin(login,ownerRow,siteMail(req)))invalid();
    await checkPassword(input.password,ownerRow.auth);
    return finishStudioLogin(req,db,scope,ownerRow,binding,ownerKey(platform),input.totp);
  }
  if(platform.kind==='node'&&await nodeOwnerLogin(db,env,login,input.password)){
    const tKey=ownerRow?'security/node-owner':'security/node-owner-totp';
    return finishStudioLogin(req,db,scope,ownerRow||bootstrapOwner(env),binding,tKey,input.totp);
  }
  let address=login;
  if(!address.includes('@'))address=(await db.get('login/'+await hash(login))).data?.email||'';
  if(platform.kind==='sites'&&address!==siteMail(req))invalid();
  const staffKey='staff/'+await hash(address);
  const user=(await db.get(staffKey)).data;
  await checkPassword(input.password,user?.active&&matchesLogin(login,user)?user.auth:null);
  return finishStudioLogin(req,db,scope,user,binding,staffKey,input.totp);
}
export async function inviteEditor(db,input){
  const address=email(input.email),name=String(input.name||'').trim();
  if(!name||name.length>80)reject('Enter the editor’s name.');
  const key='staff/'+await hash(address),row=await db.get(key);if(row.data?.active)reject('This editor already has an active account.',409);
  const token=random(32);await db.save(key,{id:random(16),email:address,name,role:'editor',active:false,permissions:cleanPermissions(input.permissions),invite:await hash(token),until:Date.now()+86400000},row.version,event('Team','Invited editor',name));return token;
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
  const allowedLogins=[(env.ADMIN_USERNAME||'owner').toLowerCase()];
  if(env.ADMIN_EMAIL)allowedLogins.push(String(env.ADMIN_EMAIL).trim().toLowerCase());
  return !!env.ADMIN_PASSWORD&&env.ADMIN_PASSWORD.length>=8&&typeof password==='string'&&allowedLogins.includes(login)&&same(await hash(password),await hash(env.ADMIN_PASSWORD));
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
  const permissions=cleanPermissions(input.permissions);
  await db.save(key,{id,name,email:address,username:login,auth,role:'editor',active:true,permissions,authRevision:(row.data?.authRevision||0)+1},row.version,event('Team','Created editor account',name));
}
export async function updateStaffPermissions({db,email:targetEmail,permissions}){
  const address=email(targetEmail),key='staff/'+await hash(address),row=await db.get(key),u=row.data;
  if(!u)reject('Account not found.',404);
  const nextPerms=cleanPermissions(permissions);
  await db.save(key,{...u,permissions:nextPerms},row.version,event('Team','Updated editor permissions',u.name+' · '+nextPerms.join(', ')));
  return {ok:true,permissions:nextPerms};
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
  const nodeTotp=(!prior.totp&&platform.kind==='node')?(await db.get('security/node-owner-totp')).data?.totp:undefined;
  const updated={...prior,name,username:login,email:address,auth,authRevision:(prior.authRevision||0)+1,...(nodeTotp?{totp:nodeTotp}:{})};
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

async function finishStudioLogin(req,db,scope,user,binding,totpKey,totpInput){
  const row=await db.get(totpKey);
  const totp=row.data?.totp;
  if(!totp?.enabled)return establish(req,db,scope,user,binding);
  if(totpInput){
    const ok=await checkTotpChallenge(db,totpKey,totpInput);
    if(!ok)reject('Incorrect authenticator or backup code.',401);
    return establish(req,db,scope,user,binding);
  }
  const challenge=random(32);
  await db.save('2fa/'+await hash(challenge),{scope,user:safeUser(user),binding,totpKey,expires:Date.now()+300000},0);
  return {data:{requires2fa:true,challenge}};
}

async function checkTotpChallenge(db,totpKey,code){
  const clean=String(code||'').trim().toUpperCase();
  if(!clean)return false;
  const row=await db.get(totpKey),totp=row.data?.totp;
  if(!totp?.enabled||!totp.secret)return false;
  const step=await verifyTotp(totp.secret,clean,1,totp.lastStep||0);
  if(step!==null){
    await db.save(totpKey,{...row.data,totp:{...totp,lastStep:step}},row.version);
    return true;
  }
  const codeHash=await hash(clean);
  const hashes=totp.backupHashes||[];
  const idx=hashes.findIndex(h=>same(h,codeHash));
  if(idx>=0){
    const nextHashes=hashes.filter((_,i)=>i!==idx);
    await db.save(totpKey,{...row.data,totp:{...totp,backupHashes:nextHashes}},row.version,event('Security','Used 2FA backup code',row.data?.name||''));
    return true;
  }
  return false;
}

async function resolveUserTotpKey(db,platform,user){
  if(user.role==='owner'){
    const k=ownerKey(platform);
    const r=await db.get(k);
    if(r.data)return k;
    return 'security/node-owner-totp';
  }
  return 'staff/'+await hash(user.email);
}

export async function manage2fa({db,platform,user,input}){
  const key=await resolveUserTotpKey(db,platform,user);
  const row=await db.get(key),data=row.data||{};
  const action=input?.action||'status';
  if(action==='status'){
    return {enabled:!!data.totp?.enabled,backupRemaining:data.totp?.backupHashes?.length||0};
  }
  if(action==='begin'){
    const secret=generateSecret();
    const label=user.email||user.username||user.name||'owner';
    const uri=totpUri({secret,label,issuer:'ServiceBay Studio'});
    await db.save(key,{...data,totpPending:{secret,expires:Date.now()+600000}},row.version);
    return {secret,uri,qrSvg:qrSvg(uri)};
  }
  if(action==='enable'){
    const pending=data.totpPending;
    if(!pending||pending.expires<=Date.now())reject('2FA setup expired. Generate a new QR code and try again.');
    const step=await verifyTotp(pending.secret,input.code,1,0);
    if(step===null)reject('Enter the 6-digit code from Google Authenticator.');
    const backupCodes=generateBackupCodes(8);
    const backupHashes=await Promise.all(backupCodes.map(c=>hash(c)));
    const next={...data,totp:{enabled:true,secret:pending.secret,backupHashes,lastStep:step}};
    delete next.totpPending;
    await db.save(key,next,row.version,event('Security','Enabled Google Authenticator 2FA',user.name));
    return {enabled:true,backupCodes};
  }
  if(action==='disable'){
    if(!data.totp?.enabled)return {enabled:false};
    const ok=await checkTotpChallenge(db,key,input.code);
    if(!ok)reject('Enter a valid 6-digit Google Authenticator or backup code to disable 2FA.',403);
    const fresh=await db.get(key),next={...fresh.data};
    delete next.totp;delete next.totpPending;
    await db.save(key,next,fresh.version,event('Security','Disabled Google Authenticator 2FA',user.name));
    return {enabled:false};
  }
  reject('Unknown 2FA action.');
}

export async function forgotPassword({db,env,platform,input}){
  await db.limit('rate/forgot/'+await hash(platform.ip||'shared'),10,15);
  const login=String(input.email||'').trim().toLowerCase();
  const note=String(input.note||'').trim().slice(0,300);
  if(!login)reject('Enter your email address or username.');
  let address=login;
  if(!address.includes('@'))address=(await db.get('login/'+await hash(login))).data?.email||'';
  if(address){
    const key='staff/'+await hash(address),row=await db.get(key),u=row.data;
    if(u?.active){
      const at=new Date().toISOString();
      await db.save(key,{...u,resetRequestedAt:at,resetNote:note},row.version,event('Team','Requested password reset',u.name));
      const ownerEmail=await resolveOwnerEmail(db,env);
      if(ownerEmail){
        await sendSystemEmail(db,env,{
          to:ownerEmail,
          subject:'[ServiceBay Studio] Password reset request from '+u.name,
          text:`Team member ${u.name} (${u.email}) requested a password reset.\n${note?'Message: '+note+'\n':''}\nOpen Website Studio > Team access to send them a one-time reset link.\nTime: ${at}`,
          idempotencyKey:'sb-forgot-'+u.id+'-'+Math.floor(Date.now()/300000)
        });
      }
    }
  }
  return {ok:true,message:'If an active team account matches, a password reset request has been sent to the website owner.'};
}

export async function issueStaffReset({db,env,email:targetEmail,origin}){
  const address=email(targetEmail),key='staff/'+await hash(address),row=await db.get(key),u=row.data;
  if(!u||!u.active)reject('Active team account not found.',404);
  const token=random(32);
  const updated={...u,resetTokenHash:await hash(token),resetUntil:Date.now()+86400000};
  delete updated.resetRequestedAt;delete updated.resetNote;
  await db.save(key,updated,row.version,event('Team','Issued password reset link',u.name));
  const link=`${origin}/admin/#reset=${token}&email=${encodeURIComponent(address)}`;
  const emailStatus=await sendSystemEmail(db,env,{
    to:address,
    subject:'ServiceBay Studio — Reset your password',
    text:`A password reset link was created for your ServiceBay Studio account.\n\nOpen this link to choose a new password (valid for 24 hours):\n${link}\n\nIf you did not request this, contact the website owner.`,
    idempotencyKey:'sb-staff-reset-'+token.slice(0,16)
  });
  return {resetToken:token,email:address,emailStatus};
}

export async function dismissStaffReset({db,email:targetEmail}){
  const address=email(targetEmail),key='staff/'+await hash(address),row=await db.get(key),u=row.data;
  if(!u)reject('Account not found.',404);
  const updated={...u};
  delete updated.resetRequestedAt;delete updated.resetNote;
  await db.save(key,updated,row.version,event('Team','Dismissed password reset request',u.name));
  return {ok:true};
}

export async function resetPassword({req,db,env,platform,input,binding}){
  const address=email(input.email),key='staff/'+await hash(address),row=await db.get(key),u=row.data;
  if(!u||!u.active||!u.resetTokenHash||u.resetUntil<Date.now()||!same(await hash(String(input.token||'')),u.resetTokenHash)){
    reject('This password reset link is invalid or expired.',403);
  }
  const updated={...u,auth:await passwordRecord(input.password),authRevision:(u.authRevision||0)+1};
  delete updated.resetTokenHash;delete updated.resetUntil;delete updated.resetRequestedAt;delete updated.resetNote;
  await db.save(key,updated,row.version,event('Team','Reset account password',updated.name,updated.name));
  return establish(req,db,'studio',updated,binding);
}

