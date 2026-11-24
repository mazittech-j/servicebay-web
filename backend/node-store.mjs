import {records} from './store.mjs';
import {readFile,mkdir} from 'node:fs/promises';
const migration=()=>readFile(new URL('../drizzle/0000_servicebay.sql',import.meta.url),'utf8');
let connection;
export async function openDatabase({migrate=false}={}) {
  if (connection) return connection;
  if (process.env.DATABASE_URL) {
    const {Pool}=await import('pg');
    const pool=new Pool({connectionString:process.env.DATABASE_URL,max:3,idleTimeoutMillis:10000,allowExitOnIdle:true});
    if(migrate) await pool.query((await migration()).replace('CREATE TABLE ','CREATE TABLE IF NOT EXISTS '));
    return connection=records(async(sql,args)=>{let n=0;return (await pool.query(sql.replace(/\?/g,()=>'$'+(++n)),args)).rows});
  }
  if(process.env.VERCEL||process.env.NODE_ENV==='production') throw Error('DATABASE_URL is required in production.');
  const {DatabaseSync}=await import('node:sqlite');
  await mkdir('.local',{recursive:true});const db=new DatabaseSync(process.env.SERVICEBAY_LOCAL_DB||'.local/servicebay.sqlite');
  db.exec((await migration()).replace('CREATE TABLE ','CREATE TABLE IF NOT EXISTS '));
  return connection=records(async(sql,args)=>db.prepare(sql).all(...args));
}
