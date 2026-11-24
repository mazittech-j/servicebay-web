import {Readable} from 'node:stream';
import worker from '../dist/server/index.js';
import {openDatabase} from './node-store.mjs';
export async function handle(req,res){
  try{
    const proto=process.env.VERCEL?'https':process.env.PUBLIC_ORIGIN?new URL(process.env.PUBLIC_ORIGIN).protocol.slice(0,-1):'http';
    const origin=process.env.PUBLIC_ORIGIN||proto+'://'+req.headers.host;
    const url=new URL(req.url,origin);
    if(process.env.VERCEL&&url.searchParams.has('__sb_path')){const path=url.searchParams.get('__sb_path')||'';url.pathname='/'+path.replace(/^\/+/, '');url.searchParams.delete('__sb_path');if(!url.pathname.endsWith('/')&&!url.pathname.startsWith('/api/')&&!url.pathname.startsWith('/media/')&&!url.pathname.split('/').pop().includes('.'))url.pathname+='/'}
    if(url.origin!==new URL(origin).origin)throw Error('Invalid origin.');
    const payload=['GET','HEAD'].includes(req.method)?null:req.body!==undefined?(typeof req.body==='string'||Buffer.isBuffer(req.body)?req.body:JSON.stringify(req.body)):Readable.toWeb(req);
    const request=new Request(url,{method:req.method,headers:req.headers,body:payload,duplex:'half'});
    const result=await worker.fetch(request,process.env,{nodeStore:await openDatabase(),ip:process.env.VERCEL?req.headers['x-vercel-forwarded-for']||'shared':req.socket.remoteAddress});
    res.writeHead(result.status,Object.fromEntries(result.headers));if(req.method==='HEAD'||!result.body)res.end();else Readable.fromWeb(result.body).pipe(res);
  }catch{if(!res.headersSent)res.writeHead(503,{'Content-Type':'text/plain','Cache-Control':'no-store'});res.end('ServiceBay is temporarily unavailable. Check the database connection and migration.')}
}
