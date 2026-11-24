import {readFile} from 'node:fs/promises';
import {Pool} from 'pg';
if(!process.env.DATABASE_URL||!process.argv[2])throw Error('Set DATABASE_URL and provide the owner export JSON filename.');
const backup=JSON.parse(await readFile(process.argv[2],'utf8'));
if(backup.format!=='servicebay-v1'||!Array.isArray(backup.rows))throw Error('Choose a ServiceBay database export.');
const pool=new Pool({connectionString:process.env.DATABASE_URL}),client=await pool.connect();
try{
  await client.query('BEGIN');
  for(const row of backup.rows){
    if(typeof row.key!=='string'||!(/^(settings$|page\/|request\/|\/media\/)/.test(row.key))||!Number.isSafeInteger(Number(row.revision))||Number(row.revision)<1)throw Error('Invalid backup record.');
    JSON.parse(row.body);
    const inserted=await client.query('INSERT INTO servicebay_records(key,body,revision,updated) VALUES($1,$2,$3,$4) ON CONFLICT(key) DO NOTHING RETURNING key',[row.key,row.body,row.revision,row.updated]);
    if(!inserted.rowCount){const old=(await client.query('SELECT body,revision FROM servicebay_records WHERE key=$1',[row.key])).rows[0];if(old.body!==row.body||Number(old.revision)!==Number(row.revision))throw Error('The target contains a different revision. Use an empty database or resolve the conflict before importing.')}
  }
  await client.query('COMMIT');console.log('Imported '+backup.rows.length+' records.');
}catch(e){await client.query('ROLLBACK');throw e}finally{client.release();await pool.end()}
