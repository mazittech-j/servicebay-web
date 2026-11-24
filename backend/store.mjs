export function records(query) {
  return {
    async get(key) {
      const [row] = await query('SELECT body, revision FROM servicebay_records WHERE key=?',[key]);
      return row ? {data:JSON.parse(row.body),version:Number(row.revision)} : {data:null,version:0};
    },
    async save(key,data,version) {
      const body=JSON.stringify(data), now=new Date().toISOString();
      const rows = version === 0
        ? await query('INSERT INTO servicebay_records(key,body,revision,updated) VALUES(?,?,1,?) ON CONFLICT(key) DO NOTHING RETURNING revision',[key,body,now])
        : await query('UPDATE servicebay_records SET body=?,revision=revision+1,updated=? WHERE key=? AND revision=? RETURNING revision',[body,now,key,version]);
      if (!rows.length) throw Object.assign(Error('Another change was saved. Reload before trying again.'),{status:409});
      return Number(rows[0].revision);
    },
    async exportBatch(cursor='') {
      const rows=await query("SELECT key,body,revision,updated FROM servicebay_records WHERE key > ? AND key NOT LIKE 'rate/%' ORDER BY key LIMIT 4",[cursor]);
      return {rows,next:rows.length===4?rows[3].key:null};
    },
    async inbox(cursor='9999') {
      const rows=await query("SELECT key,body FROM servicebay_records WHERE key LIKE 'request/%' AND key < ? ORDER BY key DESC LIMIT 51",[cursor==='9999'?'request/~':cursor]);
      return {items:rows.slice(0,50).map(row=>({key:row.key,...JSON.parse(row.body)})),next:rows.length>50?rows[49].key:null};
    },
    async limit(key,maximum,minutes) {
      const cutoff=new Date(Math.floor(Date.now()/(minutes*60000))*minutes*60000).toISOString();
      const [r]=await query("INSERT INTO servicebay_records(key,body,revision,updated) VALUES(?,'null',1,?) ON CONFLICT(key) DO UPDATE SET revision=CASE WHEN servicebay_records.updated=excluded.updated THEN servicebay_records.revision+1 ELSE 1 END,updated=excluded.updated RETURNING revision",[key,cutoff]);
      if(Number(r.revision)>maximum) throw Object.assign(Error('Please try again later.'),{status:429});
    }
  };
}
