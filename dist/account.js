(() => {
  const form=document.querySelector('#studio-auth');
  const params=new URLSearchParams(location.hash.slice(1)),token=params.get('invite');
  if(token){history.replaceState(null,'',location.pathname);form.dataset.action='activate';document.querySelector('#gate-title').textContent='Activate your editor account';document.querySelector('#gate-copy').textContent='Choose a studio password of at least 15 characters.';form.elements.email.value=params.get('email')||'';form.elements.password.autocomplete='new-password';form.elements.password.minLength=15;form.querySelector('button').textContent='Activate account'}
  form.onsubmit=async e=>{e.preventDefault();const button=form.querySelector('button'),status=form.querySelector('.result'),data=Object.fromEntries(new FormData(form));
    if(data.confirm!==undefined&&data.confirm!==data.password){status.textContent='The passwords do not match.';return}
    button.disabled=true;try{const action=form.dataset.action;const res=await fetch('/api/studio-auth/'+action,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...data,invite:token})});const result=await res.json();if(!res.ok)throw Error(result.error);location.replace('/admin/')}catch(err){status.textContent=err.message}finally{button.disabled=false}
  };
})();
