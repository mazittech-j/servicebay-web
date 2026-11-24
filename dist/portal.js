(() => {
  const received=document.querySelector('#new-request'),track=document.querySelector('#track');
  function code(){return 'SB-'+Date.now().toString(36).toUpperCase()+'-'+crypto.randomUUID().replaceAll('-','').toUpperCase()}
  function bind(form,handler){form.onsubmit=async e=>{e.preventDefault();const button=form.querySelector('button'),out=form.querySelector('.result');button.disabled=true;out.textContent='Please wait…';try{out.textContent=await handler(Object.fromEntries(new FormData(form)))}catch(err){out.textContent=err.message}finally{button.disabled=false}}}
  async function post(path,body){const res=await fetch('/api/portal/'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const data=await res.json();if(!res.ok)throw Error(data.error||'Please try again.');return data}
  let current=code();
  bind(received,async values=>{const result=await post('requests',{...values,code:current});track.elements.code.value=result.code;current=code();received.reset();return 'Request received. Save this private receipt code to check your status:\n'+result.code});
  bind(track,async ({code})=>{const r=await post('track',{code});return 'Status: '+r.status+'\nReceived: '+new Date(r.created).toLocaleDateString()+(r.reference?'\nERP reference: '+r.reference:'')});
})();
