import {createServer} from 'node:http';
import {handle} from './node-adapter.mjs';
const flags=process.argv.slice(2);
const option=key=>flags.includes(key)?flags[flags.indexOf(key)+1]:undefined;
const port=Number(option('--port')||process.env.PORT||3000);
createServer(handle).listen(port,option('--host')||process.env.HOST||'0.0.0.0',()=>console.log('ServiceBay listening on port '+port));
