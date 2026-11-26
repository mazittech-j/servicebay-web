/** Server-side connector. No browser keys, direct ERP database writes or payment updates. */
export function createServiceHubClient({baseUrl,apiKey,fetcher=fetch}){
 const base=new URL(baseUrl);if(base.protocol!=='https:'||base.username||base.password||base.search||base.hash)throw Error('Use the HTTPS API base URL from ERP Settings.');if(!/^shw_[A-Za-z0-9_-]{43}$/.test(apiKey||''))throw Error('A server-side ServiceHub integration key is required.');
 const root=base.href.replace(/\/$/,'');
 async function call(path,{method='GET',data,key}={}){if(key&&!/^[A-Za-z0-9_.:-]{1,120}$/.test(key))throw Error('Use a stable external reference as the idempotency key.');const response=await fetcher(root+path,{method,headers:{Authorization:'Bearer '+apiKey,...(data?{'Content-Type':'application/json','Idempotency-Key':key}:{})},body:data?JSON.stringify(data):undefined,signal:AbortSignal.timeout(15000),redirect:'error'});let result={};try{result=await response.json()}catch{}if(!response.ok||result.success===false){const error=new Error(result.error||result.message||'ERP request failed ('+response.status+').');error.status=response.status;throw error}return result.data!==undefined?result.data:result}
 return {
  submit:(kind,externalId,data)=>{if(!['enquiries','bookings'].includes(kind))throw Error('Choose enquiries or bookings.');if(!externalId)throw Error('External reference required.');return call('/'+kind,{method:'POST',data,key:externalId})},
  status:id=>{if(!Number.isSafeInteger(Number(id))||Number(id)<1)throw Error('Valid request ID required.');return call('/requests/'+Number(id))},
  updateStatus:async(id,data)=>{if(!Number.isSafeInteger(Number(id))||Number(id)<1)return {unsupported:true};for(const p of ['/requests/'+Number(id),'/enquiries/'+Number(id)]){try{return await call(p,{method:'PATCH',data})}catch(e){if(e.status===404||e.status===405)continue;throw e}}return {unsupported:true}},
  listServices:async()=>{for(const p of ['/services','/pricing','/catalog']){try{const res=await call(p);const list=Array.isArray(res)?res:(res?.services||res?.items||res?.pricing||res?.catalog);if(Array.isArray(list))return list}catch(e){if(e.status===401||e.status===403)throw e}}return null}
 };
}
