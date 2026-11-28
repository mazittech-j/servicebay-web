import {createServer} from 'node:http';
import {handle} from './node-adapter.mjs';
import {openDatabase} from './node-store.mjs';
import {runBackgroundTick} from '../dist/server/index.js';
const flags=process.argv.slice(2);
const option=key=>flags.includes(key)?flags[flags.indexOf(key)+1]:undefined;
const port=Number(option('--port')||process.env.PORT||3000);
createServer(handle).listen(port,option('--host')||process.env.HOST||'0.0.0.0',()=>console.log('ServiceBay listening on port '+port));
const bgTimer=setInterval(()=>{
  openDatabase().then(store=>runBackgroundTick(process.env,store,process.env.PUBLIC_ORIGIN||process.env.RENDER_EXTERNAL_URL||'')).catch(()=>{});
},10*60*1000);
if(typeof bgTimer.unref==='function')bgTimer.unref();
