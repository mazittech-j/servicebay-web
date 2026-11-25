import {event} from './insights.mjs';
import {sendSystemEmail} from './mail.mjs';

const encoder=new TextEncoder();
const digest=async v=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(String(v||'')))),b=>b.toString(16).padStart(2,'0')).join('');

const PROBE_PATHS=[
  /^\/\.env/i,/^\/\.git/i,/^\/wp-login/i,/^\/wp-admin/i,/^\/wp-content/i,
  /^\/xmlrpc\.php/i,/^\/phpmyadmin/i,/^\/pma\b/i,/^\/admin\.php/i,
  /^\/cgi-bin\//i,/\.sql(\.gz)?$/i,/\.\.[/\\]/
];
const ATTACK_PATTERN=/(<script[\s>]|javascript:|union\s+(all\s+)?select\b|;\s*drop\s+table\b|\b(sleep|benchmark)\s*\(\s*\d|\binto\s+outfile\b|\/etc\/passwd)/i;

export function detectProbe(path,search='',rawBody=''){
  const p=String(path||''),s=String(search||'');
  if(PROBE_PATHS.some(rx=>rx.test(p)))return 'Suspicious path probe ('+p.slice(0,60)+')';
  if(ATTACK_PATTERN.test(p+' '+s+' '+String(rawBody||'')))return 'Injection or script payload detected';
  return '';
}

export function detectHoneypot(input){
  if(!input||typeof input!=='object')return false;
  return Boolean(String(input.website||'').trim()||String(input.company_url||'').trim());
}

export async function resolveOwnerEmail(db,env){
  const [shield,nodeOwner,siteOwner]=await Promise.all([
    db.get('security/shield'),
    db.get('security/node-owner'),
    db.get('security/owner')
  ]);
  const candidates=[
    shield.data?.alertEmail,
    nodeOwner.data?.email,
    siteOwner.data?.email,
    env.ADMIN_EMAIL,
    env.SERVICEBAY_OWNER_EMAIL
  ];
  return candidates.find(v=>typeof v==='string'&&/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(v.trim()))?.trim()||'';
}

export async function getShieldConfig(db){
  const row=await db.get('security/shield');
  return {active:row.data?.active!==false,alertEmail:row.data?.alertEmail||'',version:row.version};
}

export async function isIpBlocked(db,ip){
  const cfg=await getShieldConfig(db);
  if(!cfg.active)return 0;
  const ipHash=await digest(ip||'shared');
  const row=await db.get('shield/block/'+ipHash);
  if(row.data?.until>Date.now())return Math.max(1,Math.ceil((row.data.until-Date.now())/60000));
  return 0;
}

async function appendLog(db,entry,activity){
  for(let i=0;i<3;i++){
    const row=await db.get('security/shield-log');
    const items=[entry,...(row.data?.items||[])].slice(0,50);
    try{await db.save('security/shield-log',{items},row.version,activity);return}catch(e){if(e.status!==409)throw e}
  }
}

export async function recordIncident({db,env,ip,reason,target='',detail='',immediateBlock=false,threshold=5}){
  const cfg=await getShieldConfig(db);
  if(!cfg.active)return {blocked:false,alerted:false};
  const ipStr=String(ip||'shared'),ipHash=await digest(ipStr);
  const now=Date.now(),windowMs=15*60000;
  const failKey='shield/fail/'+ipHash;
  let count=1;
  for(let i=0;i<3;i++){
    const row=await db.get(failKey);
    const prev=row.data;
    const fresh=!prev||now-(prev.since||0)>windowMs;
    count=fresh?1:(prev.count||0)+1;
    try{await db.save(failKey,{count,since:fresh?now:prev.since,last:now},row.version);break}catch(e){if(e.status!==409)throw e}
  }
  const shouldBlock=immediateBlock||count>=threshold;
  if(!shouldBlock)return {blocked:false,alerted:false,count};

  const blockKey='shield/block/'+ipHash;
  const until=now+15*60000;
  const existingBlock=await db.get(blockKey);
  await db.save(blockKey,{until,reason,ip:ipStr==='shared'?'shared':ipStr.slice(0,45),at:new Date(now).toISOString()},existingBlock.version);

  const at=new Date(now).toISOString();
  const maskedIp=ipStr==='shared'?'unknown':ipStr.slice(0,45);
  const summary=[reason,target?'Target: '+target:'',detail].filter(Boolean).join(' · ');
  await appendLog(db,{at,reason,target:target||'',ip:maskedIp,detail:detail||'',blockedUntil:new Date(until).toISOString()},event('Security',reason,summary));

  // Cooldown: max 1 email per IP + reason every 15 minutes
  const alertKey='shield/alert/'+await digest(ipHash+':'+reason);
  const alertRow=await db.get(alertKey);
  let mailStatus='Cooldown';
  if(!alertRow.data||now-(alertRow.data.at||0)>windowMs){
    await db.save(alertKey,{at:now},alertRow.version);
    const ownerEmail=await resolveOwnerEmail(db,env);
    if(ownerEmail){
      const text=[
        'ServiceBay Security Shield Alert',
        '',
        'A suspicious activity or attack attempt was blocked by your website shield.',
        '',
        'Reason: '+reason,
        target?'Target account / route: '+target:'',
        'Source IP: '+maskedIp,
        detail?'Details: '+detail:'',
        'Time: '+at,
        'Action taken: IP temporarily blocked for 15 minutes.',
        '',
        'You can review security events in Website Studio > Security shield.'
      ].filter(Boolean).join('\n');
      mailStatus=await sendSystemEmail(db,env,{
        to:ownerEmail,
        subject:'[ServiceBay Security Shield] '+reason,
        text,
        idempotencyKey:'sb-shield-'+alertKey.slice(-16)+'-'+Math.floor(now/windowMs)
      });
    }else{
      mailStatus='No owner email configured';
    }
  }
  return {blocked:true,alerted:mailStatus==='Accepted',mailStatus};
}

export async function shieldState(db,env){
  const [cfg,logRow,ownerEmail]=await Promise.all([
    getShieldConfig(db),
    db.get('security/shield-log'),
    resolveOwnerEmail(db,env)
  ]);
  return {
    active:cfg.active,
    alertEmail:cfg.alertEmail,
    effectiveEmail:ownerEmail,
    events:(logRow.data?.items||[]).slice(0,30)
  };
}

export async function updateShield(db,env,input){
  const row=await db.get('security/shield');
  const active=input.active!==undefined?Boolean(input.active):row.data?.active!==false;
  const alertEmail=input.alertEmail!==undefined?String(input.alertEmail||'').trim().toLowerCase():(row.data?.alertEmail||'');
  if(alertEmail&&(alertEmail.length>150||!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(alertEmail))){
    throw Object.assign(new Error('Enter a valid security alert email address.'),{status:400});
  }
  await db.save('security/shield',{active,alertEmail},row.version,event('Security',active?'Security shield enabled':'Security shield paused',alertEmail||'Default owner email'));
  return shieldState(db,env);
}

export async function testShieldAlert(db,env){
  const to=await resolveOwnerEmail(db,env);
  if(!to)throw Object.assign(new Error('Set an owner email in My account or Security alert email first.'),{status:400});
  const at=new Date().toISOString();
  const status=await sendSystemEmail(db,env,{
    to,
    subject:'[ServiceBay Security Shield] Test alert',
    text:'This is a test security alert from your ServiceBay Security Shield.\n\nWhen bot attacks, brute-force logins, or suspicious probes occur, alerts will be sent to this address.\n\nTime: '+at,
    idempotencyKey:'sb-shield-test-'+Math.floor(Date.now()/30000)
  });
  await appendLog(db,{at,reason:'Test security alert',target:to,ip:'studio',detail:'Delivery status: '+status,blockedUntil:''},event('Security','Tested security alert',status));
  return {status,to,at};
}
