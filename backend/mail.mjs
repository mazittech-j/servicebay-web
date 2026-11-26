import {event} from './insights.mjs';
import {reject,hash} from './accounts.mjs';
import {resolveOwnerEmail} from './shield.mjs';
const encode=b=>btoa(String.fromCharCode(...new Uint8Array(b)));
const decode=s=>Uint8Array.from(atob(s),ch=>ch.charCodeAt(0));
const encoder=new TextEncoder();
async function cipher(env){
  const raw=env.MAIL_SETTINGS_KEY||env.ADMIN_PASSWORD||'servicebay-mail-key';
  return crypto.subtle.importKey('raw',await crypto.subtle.digest('SHA-256',encoder.encode(raw)),'AES-GCM',false,['encrypt','decrypt']);
}
async function settings(db,env,withKey=false){
  const saved=(await db.get('security/mail')).data,from=saved?.from||env.RECEIPT_FROM_EMAIL||'';
  let key=env.RESEND_API_KEY||'';
  if(saved?.secret&&withKey)key=new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:decode(saved.iv)},await cipher(env),decode(saved.secret)));
  return {from,configured:!!(from&&(saved?.secret||key)),editable:true,...(withKey?{key}:{})};
}
export async function mailSettings(db,env,input){
  if(input){
    const from=String(input.from||'').trim(),key=String(input.key||'').trim();
    if(from.length>150||!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(from))reject('Enter an address on your verified sending domain.');
    const row=await db.get('security/mail');let value={...row.data,from};
    if(key){
      if(!/^re_[A-Za-z0-9_-]{10,160}$/.test(key))reject('Enter a Resend sending API key.');
      const iv=crypto.getRandomValues(new Uint8Array(12));
      value={from,iv:encode(iv),secret:encode(await crypto.subtle.encrypt({name:'AES-GCM',iv},await cipher(env),encoder.encode(key)))};
    }else if(!value.secret&&!env.RESEND_API_KEY)reject('Add a sending API key.');
    await db.save('security/mail',value,row.version,event('Email','Saved receipt sender settings'));
  }
  const config=await settings(db,env);
  const row=await db.get('security/mail'),test=(await db.get('security/mail-test')).data;
  const fallbackRecipient=await resolveOwnerEmail(db,env);
  return {...config,fallbackRecipient,envStatus:{hasResendKey:!!(row.data?.secret||env.RESEND_API_KEY),hasFromEmail:!!config.from,hasMailKey:!!env.MAIL_SETTINGS_KEY},lastTest:test?.revision===row.version&&test.from===config.from?{status:test.status,at:test.at}:null};
}
async function mutate(db,key,transform,activity){
  for(let i=0;i<5;i++){
    const row=await db.get(key);if(!row.data)reject('Quote not found.',404);
    const next=transform(row.data);if(!next)return row.data;
    try{await db.save(key,next,row.version,activity);return next}catch(e){if(e.status!==409)throw e}
  }
  reject('The request changed. Refresh and retry.',409);
}
export async function sendReceipt(db,env,key,siteOrigin){
  const config=await settings(db,env,true);
  let row=(await db.get(key)).data;
  if(!row?.email)reject('This request has no receipt email address.');
  if(!config.configured)return 'Awaiting email setup';
  if(row.mail?.status==='Accepted')return 'Accepted';
  if(!row.receipt){
    const code='SB-'+Date.now().toString(36).toUpperCase()+'-'+crypto.randomUUID().replaceAll('-','').toUpperCase();
    await db.save('receipt/'+await hash(code),{key},0);
    row=await mutate(db,key,r=>r.receipt?null:{...r,receipt:code});
  }
  const intent=await mutate(db,key,r=>{
    if(r.mail?.status==='Accepted'||r.mail?.status==='Sending')return null;
    const previous=r.mail?.attempt||0;
    return {...r,mail:{status:'Sending',from:config.from,link:siteOrigin+'/portal/',attempt:previous+1,started:Date.now()}};
  });
  if(intent.mail.status==='Accepted')return 'Accepted';
  const m=intent.mail;
  if(Date.now()-m.started>=86400000)return 'Needs delivery check';
  const message={from:'ServiceBay <'+m.from+'>',to:[intent.email],subject:'Your ServiceBay quote request receipt',text:'We received your '+(intent.service||'service')+' request.\n\nYour private receipt code is '+intent.receipt+'\n\nOpen your customer portal: '+m.link+'\n\nKeep this receipt private.\nServiceBay Technical Services'};
  let status='Sending',id;
  try{
    const result=await fetch('https://api.resend.com/emails',{method:'POST',redirect:'error',signal:AbortSignal.timeout(8000),headers:{Authorization:'Bearer '+config.key,'Content-Type':'application/json','Idempotency-Key':intent.external+'-receipt-'+m.attempt},body:JSON.stringify(message)});
    if(result.ok){const response=await result.json();if(response.id){status='Accepted';id=response.id}}
    else if(result.status>=400&&result.status<500&&![408,409,429].includes(result.status))status='Rejected';
  }catch{/* The same key can be safely retried inside the provider's time window. */}
  if(status!=='Sending')await mutate(db,key,r=>r.mail?.attempt===m.attempt&&r.mail.status!=='Accepted'?{...r,mail:{...r.mail,status,id}}:null,event('Email',status==='Accepted'?'Receipt accepted by provider':'Receipt rejected by provider',row.service||'Service quote'));
  return status;
}
export function emailStatus(row){
  if(!row.email)return 'No email';
  if(row.mail?.status==='Sending'&&Date.now()-row.mail.started>=86400000)return 'Needs delivery check';
  return row.mail?.status||'Not sent';
}

export async function testSender(db,env,user){
  const row=await db.get('security/mail'),config=await settings(db,env,true);
  if(!config.configured)reject('Save a sender address and sending key first.',409);
  const recipient=(user.email&&/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(user.email))?user.email:await resolveOwnerEmail(db,env);
  if(!recipient)reject('Set a contact email in My account before sending a test.');
  await db.limit('rate/receipt-test',4,10);
  const old=await db.get('security/mail-test'),at=new Date().toISOString();
  const payload={from:'ServiceBay <'+config.from+'>',to:[recipient],subject:'ServiceBay receipt email test',text:'Your ServiceBay studio requested this test of the receipt email sender. No customer request was created.'};
  let status='Unconfirmed';
  try{
    const response=await fetch('https://api.resend.com/emails',{method:'POST',redirect:'error',signal:AbortSignal.timeout(8000),headers:{Authorization:'Bearer '+config.key,'Content-Type':'application/json','Idempotency-Key':'sb-test-'+await hash(JSON.stringify(payload)+row.version+Math.floor(Date.now()/60000))},body:JSON.stringify(payload)});
    if(response.ok&&(await response.json()).id)status='Accepted';
    else if(!response.ok)status=response.status===401?'Invalid sending key':response.status===403?'Check key permissions and sender domain':response.status===429?'Provider rate limit':'Provider error ('+response.status+')';
  }catch{/* A timeout cannot establish delivery. */}
  await db.save('security/mail-test',{from:config.from,revision:row.version,at,status},old.version,event('Email','Tested receipt sender',status));
  return {status,at};
}

export async function sendSystemEmail(db,env,{to,subject,text,idempotencyKey}){
  if(!to||!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(to))return 'No recipient';
  const config=await settings(db,env,true);
  if(!config.configured)return 'Awaiting email setup';
  const payload={from:'ServiceBay <'+config.from+'>',to:[to],subject,text};
  try{
    const headers={Authorization:'Bearer '+config.key,'Content-Type':'application/json'};
    if(idempotencyKey)headers['Idempotency-Key']=idempotencyKey;
    const response=await fetch('https://api.resend.com/emails',{method:'POST',redirect:'error',signal:AbortSignal.timeout(8000),headers,body:JSON.stringify(payload)});
    if(response.ok&&(await response.json()).id)return 'Accepted';
    return 'Provider error ('+response.status+')';
  }catch{return 'Unconfirmed'}
}

