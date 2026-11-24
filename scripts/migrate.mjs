import {openDatabase} from '../backend/node-store.mjs';
await openDatabase({migrate:true});
console.log('ServiceBay database schema is ready.');
