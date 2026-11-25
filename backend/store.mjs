export function records(query, dialect="sqlite", batch, actor="ServiceBay") {
  const scalar=(name)=>dialect==='postgres'?"(body::jsonb ->> '"+name+"')":"json_extract(body,'$."+name+"')";

  return {
    asActor(name){return records(query,dialect,batch,name||actor)},
    async get(key) {
      const [row] = await query('SELECT body, revision FROM servicebay_records WHERE key=?',[key]);
      return row ? {data:JSON.parse(row.body),version:Number(row.revision)} : {data:null,version:0};
    },
    async save(key,data,version,activity) {
      const body=JSON.stringify(data),now=new Date().toISOString();
      const write=version===0?'INSERT INTO servicebay_records(key,body,revision,updated) VALUES(?,?,1,?) ON CONFLICT(key) DO NOTHING RETURNING revision':'UPDATE servicebay_records SET body=?,revision=revision+1,updated=? WHERE key=? AND revision=? RETURNING revision';
      const args=version===0?[key,body,now]:[body,now,key,version];let rows;
      if(!activity)rows=await query(write,args);
      else{
        const auditKey='activity/'+now+'/'+crypto.randomUUID();
        const entry=JSON.stringify({at:now,actor:activity.by||actor,group:activity.group,action:activity.action,detail:activity.detail||''});
        const fields=[auditKey,entry,now];
        if(dialect==='postgres'){
          rows=await query('WITH changed AS ('+write+'), logged AS (INSERT INTO servicebay_records(key,body,revision,updated) SELECT ?,?,1,? FROM changed) SELECT revision FROM changed',[...args,...fields]);
        }else{
          const guard=version===0?'NOT EXISTS(SELECT 1 FROM servicebay_records WHERE key=?)':'EXISTS(SELECT 1 FROM servicebay_records WHERE key=? AND revision=?)';
          const insert='INSERT INTO servicebay_records(key,body,revision,updated) SELECT ?,?,1,? WHERE '+guard;
          const result=await batch([[insert,[...fields,key,...(version===0?[]:[version])]],[write,args]]);
          rows=result[1];
        }
      }
      if(!rows.length)throw Object.assign(Error('Another change was saved. Reload before trying again.'),{status:409});
      return Number(rows[0].revision);
    },
    async activity(before='activity/~',group='',limit=30){
      const args=[before];if(group)args.push(group);args.push(limit+1);
      const rows=await query("SELECT key,body FROM servicebay_records WHERE key LIKE 'activity/%' AND key < ?"+(group?" AND "+scalar('group')+"=?":"")+" ORDER BY key DESC LIMIT ?",args);
      return {items:rows.slice(0,limit).map(row=>JSON.parse(row.body)),next:rows.length>limit?rows[limit-1].key:null};
    },
    async serviceGroups(since){
      const message=scalar('message'),label="Maintenance plan: ";
      const legacy=dialect==='postgres'?"split_part(split_part("+message+",E'\\n"+label+"',2),E'\\n',1)":"substr("+message+",instr("+message+",char(10)||'"+label+"')+"+(label.length+1)+")";
      const planLine=dialect==='postgres'?legacy:"substr("+legacy+",1,instr("+legacy+"||char(10),char(10))-1)";
      const plan="COALESCE(NULLIF("+scalar('plan')+",''),CASE WHEN "+scalar('service')+"='AMC enquiry' AND "+message+" LIKE ? THEN "+planLine+" END)";
      return query("SELECT "+scalar('serviceId')+" AS service_id,"+scalar('service')+" AS service,"+scalar('planId')+" AS plan_id,"+plan+" AS plan,"+scalar('status')+" AS status,count(*) AS total FROM servicebay_records WHERE key LIKE 'request/%'"+(since?" AND "+scalar('created')+">=?":"")+" GROUP BY 1,2,3,4,5",since?['%\n'+label+'%',since]:['%\n'+label+'%']);
    },
    async dailyRequests(since){
      const created=scalar('created'),day=dialect==='postgres'?"to_char(("+created+")::timestamptz AT TIME ZONE 'Asia/Dubai','YYYY-MM-DD')":"date("+created+",'+4 hours')";
      return query("SELECT "+day+" AS day,count(*) AS total FROM servicebay_records WHERE key LIKE 'request/%' AND "+created+">=? GROUP BY 1 ORDER BY 1",[since]);
    },
    async remove(key){await query('DELETE FROM servicebay_records WHERE key=? RETURNING key',[key])},
    async pruneSessions(){await query("DELETE FROM servicebay_records WHERE key LIKE 'session/%' AND updated < ? RETURNING key",[new Date(Date.now()-86400000).toISOString()])},
    async requestCounts(customerId){
      const scalar=name=>dialect==='postgres'?"(body::jsonb ->> '"+name+"')":"json_extract(body,'$."+name+"')";
      const rows=await query("SELECT "+scalar('status')+" AS status, count(*) AS total FROM servicebay_records WHERE key LIKE 'request/%'"+(customerId?" AND "+scalar('customerId')+"=?":"")+" GROUP BY 1",customerId?[customerId]:[]);
      return Object.fromEntries(rows.map(r=>[r.status,Number(r.total)]));
    },
    async recentForCustomer(id,before='request/~'){
      const owner = dialect==='postgres' ? "(body::jsonb ->> 'customerId')" : "json_extract(body,'$.customerId')";
      const rows=await query("SELECT key,body FROM servicebay_records WHERE key LIKE 'request/%' AND key < ? AND "+owner+"=? ORDER BY key DESC LIMIT 26",[before,id]);
      return {items:rows.slice(0,25).map(row=>{const r=JSON.parse(row.body);return {created:r.created,status:r.status,service:r.service||'Service quote',area:r.area||'',property:r.property||'',country:r.country||'',details:r.details??r.message,receipt:r.receipt||'',history:r.history||[]}}),next:rows.length>25?rows[24].key:null};
    },
    async countRequests(){const [r]=await query("SELECT count(*) AS total FROM servicebay_records WHERE key LIKE 'request/%'",[]);return Number(r.total)},
    async staff(){const rows=await query("SELECT body FROM servicebay_records WHERE key LIKE 'staff/%' ORDER BY key",[]);return rows.map(row=>{const u=JSON.parse(row.body);return {name:u.name,email:u.email,username:u.username||'',status:u.active?'Active':u.until>Date.now()?'Invited':'Inactive',permissions:Array.isArray(u.permissions)&&u.permissions.length?u.permissions:['pages'],resetRequestedAt:u.resetRequestedAt||'',resetNote:u.resetNote||'',totpEnabled:!!u.totp?.enabled}})},
    async exportBatch(cursor='') {
      const rows=await query("SELECT key,body,revision,updated FROM servicebay_records WHERE key > ? AND (key='settings' OR key LIKE 'page/%' OR key LIKE 'request/%' OR key LIKE 'activity/%' OR key LIKE 'receipt/%' OR key LIKE '/media/%' OR key LIKE 'customer/%') ORDER BY key LIMIT 4",[cursor]);
      return {rows,next:rows.length===4?rows[3].key:null};
    },
    async inbox(cursor='request/~',search='',status='') {
      const scalar=name=>dialect==='postgres'?"(body::jsonb ->> '"+name+"')":"json_extract(body,'$."+name+"')";
      const args=[cursor==='9999'?'request/~':cursor],terms=["key LIKE 'request/%'","key < ?"];
      if(status){terms.push(scalar('status')+'=?');args.push(status)}
      if(search){
        const fields=['name','email','phone','service','area','receipt'];
        terms.push('('+fields.map(k=>"LOWER(COALESCE("+scalar(k)+",'')) LIKE ? ESCAPE '!'").join(' OR ')+')');
        const value='%'+search.toLowerCase().replace(/[!_%]/g,m=>'!'+m)+'%';args.push(...fields.map(()=>value));
      }
      const rows=await query("SELECT key,body FROM servicebay_records WHERE "+terms.join(' AND ')+" ORDER BY key DESC LIMIT 51",args);
      return {items:rows.slice(0,50).map(row=>({key:row.key,...JSON.parse(row.body)})),next:rows.length>50?rows[49].key:null};
    },
    async limit(key,maximum,minutes) {
      const cutoff=new Date(Math.floor(Date.now()/(minutes*60000))*minutes*60000).toISOString();
      const [r]=await query("INSERT INTO servicebay_records(key,body,revision,updated) VALUES(?,'null',1,?) ON CONFLICT(key) DO UPDATE SET revision=CASE WHEN servicebay_records.updated=excluded.updated THEN servicebay_records.revision+1 ELSE 1 END,updated=excluded.updated RETURNING revision",[key,cutoff]);
      if(Number(r.revision)>maximum) throw Object.assign(Error('Please try again later.'),{status:429});
    }
  };
}
