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
  const saved=(await db.get('security/mail')).data;
  if(saved?.deleted)return {from:'',provider:saved.provider||'brevo',configured:false,editable:true,...(withKey?{key:''}:{})};
  const from=saved?.from||env.RECEIPT_FROM_EMAIL||'';
  let key=env.BREVO_API_KEY||env.RESEND_API_KEY||'';
  if(saved?.secret&&withKey)key=new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:decode(saved.iv)},await cipher(env),decode(saved.secret)));
  const provider=saved?.provider||(env.BREVO_API_KEY&&!saved?.secret?'brevo':'resend');
  return {from,provider,configured:!!(from&&(saved?.secret||key)),editable:true,...(withKey?{key}:{})};
}
export async function mailSettings(db,env,input){
  if(input){
    const row=await db.get('security/mail');
    if(input.action==='delete'){
      await db.save('security/mail',{deleted:true,provider:'brevo'},row.version,event('Email','Deleted receipt sender settings'));
      const tRow=await db.get('security/mail-test');if(tRow.data)await db.save('security/mail-test',null,tRow.version);
      return await mailSettings(db,env,null);
    }
    const from=String(input.from||'').trim(),key=String(input.key||'').trim();
    if(from.length>150||!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(from))reject('Enter a valid sender email address.');
    let provider=key.startsWith('xkeysib-')?'brevo':key.startsWith('re_')?'resend':(input.provider==='brevo'?'brevo':input.provider==='resend'?'resend':(row.data?.provider||'resend'));
    let value={...row.data,from,provider,deleted:false};
    if(key){
      if(key.startsWith('xsmtpsib-'))reject('You pasted a Brevo SMTP key (xsmtpsib-…). Open Brevo > SMTP & API > API Keys tab and generate an API key.');
      const validResend=/^re_[A-Za-z0-9_-]{10,160}$/.test(key);
      const validBrevo=(provider==='brevo'||key.startsWith('xkeysib-'))&&!/\s/.test(key)&&key.length>=16&&key.length<=300;
      if(!validBrevo&&!validResend)reject('Enter a valid Brevo or Resend (re_…) API key.');
      provider=validResend?'resend':'brevo';
      const iv=crypto.getRandomValues(new Uint8Array(12));
      value={from,provider,deleted:false,iv:encode(iv),secret:encode(await crypto.subtle.encrypt({name:'AES-GCM',iv},await cipher(env),encoder.encode(key)))};
    }else if(!value.secret&&!env.RESEND_API_KEY&&!env.BREVO_API_KEY)reject('Add a sending API key.');
    await db.save('security/mail',value,row.version,event('Email','Saved receipt sender settings',provider));
  }
  const config=await settings(db,env);
  const row=await db.get('security/mail'),test=(await db.get('security/mail-test')).data;
  const fallbackRecipient=await resolveOwnerEmail(db,env);
  return {...config,fallbackRecipient,envStatus:{hasResendKey:!!(!row.data?.deleted&&(row.data?.secret||env.RESEND_API_KEY||env.BREVO_API_KEY)),hasFromEmail:!!config.from,hasMailKey:!!env.MAIL_SETTINGS_KEY},lastTest:test?.revision===row.version&&test.from===config.from?{status:test.status,at:test.at}:null};
}
async function mutate(db,key,transform,activity){
  for(let i=0;i<5;i++){
    const row=await db.get(key);if(!row.data)reject('Quote not found.',404);
    const next=transform(row.data);if(!next)return row.data;
    try{await db.save(key,next,row.version,activity);return next}catch(e){if(e.status!==409)throw e}
  }
  reject('The request changed. Refresh and retry.',409);
}
async function sendViaProvider(config,{from,to,subject,text,idempotencyKey,timeoutMs=8000}){
  const useBrevo=config.provider==='brevo'||String(config.key||'').startsWith('xkeysib-');
  if(useBrevo){
    const response=await fetch('https://api.brevo.com/v3/smtp/email',{method:'POST',redirect:'error',signal:AbortSignal.timeout(timeoutMs),headers:{'api-key':config.key,'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({sender:{name:'ServiceBay',email:from},to:[{email:to}],subject,textContent:text})});
    let data={};try{data=await response.json()}catch{}
    return {response,ok:response.ok,id:data.messageId||(response.ok?'brevo':''),errorMsg:data.message||data.code||''};
  }
  const headers={Authorization:'Bearer '+config.key,'Content-Type':'application/json'};
  if(idempotencyKey)headers['Idempotency-Key']=idempotencyKey;
  const response=await fetch('https://api.resend.com/emails',{method:'POST',redirect:'error',signal:AbortSignal.timeout(timeoutMs),headers,body:JSON.stringify({from:'ServiceBay <'+from+'>',to:[to],subject,text})});
  let data={};try{data=await response.json()}catch{}
  return {response,ok:response.ok&&!!data.id,id:data.id||'',errorMsg:data.message||data.name||''};
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
  let status='Sending',id;
  try{
    const res=await sendViaProvider(config,{from:m.from,to:intent.email,subject:'Your ServiceBay quote request receipt',text:'We received your '+(intent.service||'service')+' request.\n\nYour private receipt code is '+intent.receipt+'\n\nOpen your customer portal: '+m.link+'\n\nKeep this receipt private.\nServiceBay Technical Services',idempotencyKey:intent.external+'-receipt-'+m.attempt,timeoutMs:4000});
    if(res.ok){status='Accepted';id=res.id}
    else if(res.response.status>=400&&res.response.status<500&&![408,409,429].includes(res.response.status))status='Rejected';
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
  const subj='ServiceBay receipt email test',body='Your ServiceBay studio requested this test of the receipt email sender. No customer request was created.';
  let status='Unconfirmed';
  try{
    const res=await sendViaProvider(config,{from:config.from,to:recipient,subject:subj,text:body,idempotencyKey:'sb-test-'+await hash(config.from+recipient+row.version+Math.floor(Date.now()/60000)),timeoutMs:8000});
    if(res.ok)status='Accepted';
    else{
      const st=res.response.status;
      status=st===401?'Invalid sending key':st===403?(res.errorMsg||'Check key permissions and sender domain'):st===429?'Provider rate limit':('Provider error ('+st+')'+(res.errorMsg?': '+String(res.errorMsg).slice(0,90):''));
    }
  }catch{/* A timeout cannot establish delivery. */}
  await db.save('security/mail-test',{from:config.from,revision:row.version,at,status},old.version,event('Email','Tested receipt sender',status));
  return {status,at};
}

export async function sendSystemEmail(db,env,{to,subject,text,idempotencyKey}){
  if(!to||!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(to))return 'No recipient';
  const config=await settings(db,env,true);
  if(!config.configured)return 'Awaiting email setup';
  try{
    const res=await sendViaProvider(config,{from:config.from,to,subject,text,idempotencyKey,timeoutMs:8000});
    if(res.ok)return 'Accepted';
    return 'Provider error ('+res.response.status+')';
  }catch{return 'Unconfirmed'}
}

