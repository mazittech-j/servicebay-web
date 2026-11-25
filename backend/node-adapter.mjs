import {Readable} from 'node:stream';
import worker from '../dist/server/index.js';
import {openDatabase} from './node-store.mjs';
export async function handle(req,res){
  try{
    const first=v=>String(Array.isArray(v)?v[0]:v||'').split(',')[0].trim();
    const configured=process.env.PUBLIC_ORIGIN||process.env.RENDER_EXTERNAL_URL;
    const proto=process.env.VERCEL?'https':configured?new URL(configured).protocol.slice(0,-1):(first(req.headers['x-forwarded-proto'])==='https'?'https':'http');
    const origin=configured?new URL(configured).origin:proto+'://'+req.headers.host;
    const url=new URL(req.url,origin);
    if(process.env.VERCEL&&url.searchParams.has('__sb_path')){const path=url.searchParams.get('__sb_path')||'';url.pathname='/'+path.replace(/^\/+/, '');url.searchParams.delete('__sb_path');if(!url.pathname.endsWith('/')&&!url.pathname.startsWith('/api/')&&!url.pathname.startsWith('/media/')&&!url.pathname.split('/').pop().includes('.'))url.pathname+='/'}
    if(url.origin!==new URL(origin).origin)throw Error('Invalid origin.');
    const host=first(req.headers['x-forwarded-host'])||req.headers.host;
    const reqProto=first(req.headers['x-forwarded-proto'])||proto;
    const requestOrigin=/^[a-z0-9.-]+(:\d+)?$/i.test(host)?reqProto+'://'+host:origin;
    const payload=['GET','HEAD'].includes(req.method)?null:req.body!==undefined?(typeof req.body==='string'||Buffer.isBuffer(req.body)?req.body:JSON.stringify(req.body)):Readable.toWeb(req);
    const request=new Request(url,{method:req.method,headers:req.headers,body:payload,duplex:'half'});
    const result=await worker.fetch(request,process.env,{nodeStore:await openDatabase(),requestOrigin,ip:process.env.VERCEL?req.headers['x-vercel-forwarded-for']||'shared':process.env.RENDER?first(req.headers['cf-connecting-ip']||req.headers['true-client-ip']||req.headers['x-forwarded-for'])||req.socket.remoteAddress:req.socket.remoteAddress});
    res.writeHead(result.status,Object.fromEntries(result.headers));if(req.method==='HEAD'||!result.body)res.end();else Readable.fromWeb(result.body).pipe(res);
  }catch{if(!res.headersSent)res.writeHead(503,{'Content-Type':'text/plain','Cache-Control':'no-store'});res.end('ServiceBay is temporarily unavailable. Check the database connection and migration.')}
}
