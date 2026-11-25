export const statuses=['Received','In review','Contacted','Scheduled','Completed','Cancelled','Closed'];
export const activityGroups=['Quotes','Website','Team','Email','Studio','Security'];
export const event=(group,action,detail='',by)=>({group,action,detail,by});
const bucket=status=>['Received','In review','Contacted','Pending'].includes(status)?'pending':status==='Scheduled'?'scheduled':status==='Completed'?'completed':'other';
const blank=()=>({total:0,pending:0,scheduled:0,completed:0,other:0});
const dayMs=86400000,offset=4*3600000;
export function reportingPeriod(days,now=Date.now()){
  const midnight=Math.floor((now+offset)/dayMs)*dayMs-offset;
  return {since:days?new Date(midnight-(days-1)*dayMs).toISOString():'',weekStart:new Date(midnight-6*dayMs).toISOString(),days:Array.from({length:7},(_,i)=>new Date(midnight+(i-6)*dayMs+offset).toISOString().slice(0,10))};
}
export function serviceReport(groups,live,base){
  const rows=new Map(),aliases=new Map();
  function add(id,label,kind){
    if(!rows.has(id))rows.set(id,{id,label,kind,...blank()});
    return rows.get(id);
  }
  for(const [id,v] of Object.entries(live)){
    const kind=v.kind||base[id]?.kind||'service';add(id,v.name,kind);
    for(const name of [v.name,base[id]?.name].filter(Boolean))aliases.set(kind+'/'+name.trim().toLowerCase(),id);
  }
  add('refrigeration','Cold-room refrigeration','service');aliases.set('service/cold-room refrigeration','refrigeration');
  add('other','Other','service');aliases.set('service/other','other');
  const totals=blank();
  for(const g of groups){
    const isAmc=g.service_id==='amc'||g.service?.toLowerCase()==='amc enquiry';
    const kind=isAmc?'plan':'service',name=(isAmc?g.plan:g.service)|| (isAmc?'AMC · plan unspecified':'Unspecified service');
    const id=(isAmc?g.plan_id:g.service_id)||aliases.get(kind+'/'+name.toLowerCase())||kind+'/'+name.toLowerCase();
    const row=add(id,name,kind),count=Number(g.total),field=bucket(g.status);row[field]+=count;row.total+=count;totals[field]+=count;totals.total+=count;
  }
  return {totals,rows:[...rows.values()].sort((a,b)=>b.total-a.total||a.label.localeCompare(b.label))};
}
