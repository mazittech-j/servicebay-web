(() => {
  document.addEventListener('click',e=>{const btn=e.target.closest('.pw-toggle');if(!btn)return;const input=btn.parentElement?.querySelector('input');if(!input)return;const show=input.type==='password';input.type=show?'text':'password';btn.textContent=show?'Hide':'Show';btn.setAttribute('aria-pressed',String(show));btn.setAttribute('aria-label',show?'Hide password':'Show password')});
  async function api(path,data){const res=await fetch(path,data?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}:{});const v=await res.json();if(!res.ok)throw Error(v.error||'Please try again.');return v}
  const auth=document.querySelector('#customer-auth'),list=document.querySelector('#my-requests'),track=document.querySelector('#track');
  const code=track.elements.code;
  try{code.value=sessionStorage.getItem('servicebay-receipt')||''}catch{}
  const params=new URLSearchParams(location.search);
  if(auth){
    const forgotForm=document.querySelector('#cust-forgot'),resetForm=document.querySelector('#cust-reset'),forgotBtn=document.querySelector('#cust-forgot-btn');
    const hashParams=new URLSearchParams(location.hash.slice(1)),resetToken=hashParams.get('reset')||'';
    const showPanel=which=>{auth.hidden=which!=='auth';forgotBtn.parentElement.hidden=which!=='auth';forgotForm.hidden=which!=='forgot';resetForm.hidden=which!=='reset'};
    let mode='login';const setMode=value=>{mode=value;showPanel('auth');const create=mode==='signup';for(const b of document.querySelectorAll('[data-mode]'))b.setAttribute('aria-pressed',String(b.dataset.mode===mode));document.querySelector('#customer-title').textContent=create?'Create your customer account':'Sign in to your account';document.querySelector('#name-row').hidden=!create;auth.elements.name.required=create;document.querySelector('#customer-confirm').hidden=!create;auth.elements.confirm.disabled=!create;auth.elements.password.minLength=create?15:1;auth.elements.password.autocomplete=create?'new-password':'current-password';auth.elements.password.placeholder=create?'At least 15 characters':'';auth.querySelector('button.primary').textContent=create?'Create account':'Sign in';auth.querySelector('.result').textContent=''};
    for(const b of document.querySelectorAll('[data-mode]'))b.onclick=()=>setMode(b.dataset.mode);
    setMode(params.get('mode')==='signup'?'signup':'login');
    if(resetToken){
      history.replaceState(null,'',location.pathname);
      showPanel('reset');document.querySelector('#customer-title').textContent='Set a new password';
      resetForm.elements.email.value=hashParams.get('email')||'';
      document.querySelector('#cust-code-row').hidden=true;
    }
    forgotBtn.onclick=()=>{showPanel('forgot');document.querySelector('#customer-title').textContent='Recover your password';forgotForm.elements.email.value=auth.elements.email.value||'';forgotForm.querySelector('.result').textContent=''};
    document.querySelector('#cust-forgot-back').onclick=()=>setMode('login');
    document.querySelector('#cust-reset-back').onclick=()=>setMode('login');
    forgotForm.onsubmit=async e=>{e.preventDefault();const b=forgotForm.querySelector('button.primary'),out=forgotForm.querySelector('.result'),v=Object.fromEntries(new FormData(forgotForm));b.disabled=true;try{const r=await api('/api/customer-auth/forgot',v);showPanel('reset');document.querySelector('#customer-title').textContent='Enter recovery code';resetForm.elements.email.value=v.email;document.querySelector('#cust-code-row').hidden=false;resetForm.querySelector('.result').textContent=r.message}catch(err){out.textContent=err.message}finally{b.disabled=false}};
    resetForm.onsubmit=async e=>{e.preventDefault();const b=resetForm.querySelector('button.primary'),out=resetForm.querySelector('.result'),v=Object.fromEntries(new FormData(resetForm));if(v.confirm!==v.password){out.textContent='The passwords do not match.';return}b.disabled=true;try{await api('/api/customer-auth/reset',{...v,token:resetToken});location.replace('/portal/')}catch(err){out.textContent=err.message}finally{b.disabled=false}};
    auth.onsubmit=async e=>{e.preventDefault();const b=auth.querySelector('button.primary'),out=auth.querySelector('.result'),values=Object.fromEntries(new FormData(auth));if(mode==='signup'&&values.confirm!==values.password){out.textContent='The passwords do not match.';return}b.disabled=true;try{await api('/api/customer-auth/'+mode,values);location.replace(params.get('return')==='quote'?'/contact/#enquiry':'/portal/')}catch(err){out.textContent=err.message}finally{b.disabled=false}};
  }
  async function load(cursor=''){
    const r=await api('/api/customer/requests?cursor='+encodeURIComponent(cursor));if(!cursor)list.replaceChildren();
    if(!r.items.length&&!cursor){const p=document.createElement('p');p.className='empty-state';p.textContent='Your submitted quotes will appear here. You can also add a previous quote using its receipt code.';list.append(p)}
    const make=(tag,text,style)=>{const e=document.createElement(tag);e.textContent=text||'';if(style)e.className=style;return e};
    if(!cursor){
      const counts=r.counts||{},total=Object.values(counts).reduce((sum,n)=>sum+n,0),metrics=document.querySelector('#portal-metrics');metrics.replaceChildren();
      for(const [label,n] of [['My requests',total],['Open',total-(counts.Closed||0)-(counts.Completed||0)-(counts.Cancelled||0)],['Scheduled',counts.Scheduled||0],['Completed',counts.Completed||0]]){
        const m=make('article','','desk-metric');m.append(make('span',label),make('strong',String(n)));metrics.append(m);
      }
    }
    for(const q of r.items){
      const item=make('details','','portal-case'),summary=make('summary'),status=make('span',q.status,'stage-pill');status.dataset.stage=q.status;
      summary.append(make('strong',q.service),status,make('small',[q.area,new Date(q.created).toLocaleDateString()].filter(Boolean).join(' · ')));item.append(summary);
      const info=make('dl','','desk-facts');
      for(const [label,value] of [['Property',q.property],['Country',q.country],['Request details',q.details],['Receipt code',q.receipt]])if(value)info.append(make('dt',label),make('dd',value));
      item.append(info);if(q.history.length){const activity=make('div','','case-activity');activity.append(make('h3','Status history'));
        for(const step of [...q.history].reverse()){const line=make('p');line.append(make('strong',step.status),make('small',new Date(step.at).toLocaleString()));activity.append(line)}item.append(activity)}
      list.append(item);
    }
    if(r.next){const b=document.createElement('button');b.className='btn secondary';b.textContent='Load earlier requests';b.onclick=async()=>{b.disabled=true;try{await load(r.next);b.remove()}catch(e){b.textContent=e.message;b.disabled=false}};list.append(b)}
  }
  if(list)load().catch(e=>list.textContent=e.message);
  async function receipt(action){const out=track.querySelector('.result');try{const r=await api('/api/portal/'+action,{code:code.value.trim()});if(action==='claim'){out.textContent='Request added to your account.';await load()}else out.textContent='Status: '+r.status+' · '+new Date(r.created).toLocaleDateString()+(r.reference?' · '+r.reference:'')}catch(err){out.textContent=err.message}}
  track.onsubmit=e=>{e.preventDefault();receipt('track')};const claim=document.querySelector('#claim');if(claim)claim.onclick=()=>{if(track.reportValidity())receipt('claim')};
  const signout=document.querySelector('#customer-logout');if(signout)signout.onclick=async()=>{try{await api('/api/customer-auth/logout',{});try{sessionStorage.removeItem('servicebay-receipt')}catch{}location.replace('/portal/')}catch(e){track.querySelector('.result').textContent=e.message}};
})();
