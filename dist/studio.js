(() => {
  const by=id=>document.getElementById(id), panel=by('panel'), notice=by('notice');
  const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n};
  function button(text,action,style='secondary'){const n=el('button',text,'btn '+style);n.type='button';n.onclick=async()=>{n.disabled=true;try{await action()}catch(e){notice.textContent=e.message}finally{n.disabled=false}};return n}
  function field(parent,title,value,type='text',options){const l=el('label',title),input=el(options?'select':type==='textarea'?'textarea':'input');if(options)for(const o of options){const v=el('option',o);v.value=o;input.append(v)}else if(type==='textarea')input.rows=4;else input.type=type;input.value=value??'';l.append(input);parent.append(l);return input}
  function card(parent,title){const c=el('section',undefined,'card');if(title)c.append(el('h2',title));parent.append(c);return c}
  function buttons(parent,...items){const row=el('div',undefined,'buttons');row.append(...items);parent.append(row)}
  const api=async(path,data)=>{const res=await fetch('/api/admin/'+path,data?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}:{});const x=await res.json();if(!res.ok)throw Error(x.error||'Could not complete the request.');return x};
  let cfg,tab='pages',page='/',epoch=0,dirty=false;
  const tracked=()=>{dirty=true};
  panel.addEventListener('input',tracked);
  window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue=''}});
  function discard(){return !dirty||confirm('Leave without saving these changes?')}
  const titles={pages:'Pages',company:'Company & theme',pricing:'Services & AMC',connections:'Integrations',requests:'Customer requests'};
  function assetField(parent,title,value,onChange){const input=field(parent,title,value);input.placeholder='/assets/… or https://…';input.oninput=()=>onChange(input.value);const up=el('input');up.type='file';up.accept='image/png,image/jpeg,image/webp';up.setAttribute('aria-label','Upload image');parent.append(up);up.onchange=async()=>{try{const file=up.files[0];if(!file)return;if(file.size>512000)throw Error('Choose an image under 500 KB.');const data=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result.split(',')[1]);r.onerror=reject;r.readAsDataURL(file)});const {url}=await api('media',{data,type:file.type});input.value=url;onChange(url);dirty=true;notice.textContent='Image uploaded. Save the page to use it.'}catch(e){notice.textContent=e.message}};return input}
  async function open(next){
    const ticket=++epoch;tab=next;dirty=false;notice.textContent='';panel.replaceChildren();by('title').textContent=titles[tab];
    for(const n of document.querySelectorAll('[data-tab]')){n.classList.toggle('active',n.dataset.tab===tab);n.setAttribute('aria-current',n.dataset.tab===tab?'page':'false')}
    if(tab==='requests'){await inbox(ticket);return}
    const global=tab!=='pages',endpoint='content?'+(global?'scope=site':'path='+encodeURIComponent(page));
    const item=await api(endpoint);if(ticket!==epoch)return;let data=item.draft,version=item.version;
    const actions=(parent,refresh)=>buttons(parent,button('Save draft',()=>save('draft')),button('Publish changes',()=>save('publish'),'primary'),button('Discard draft',async()=>{if(confirm('Replace this draft with the last published version?')){await api(endpoint,{action:'revert',version});await open(tab);notice.textContent='Draft discarded.'}}));
    async function save(action){const r=await api(endpoint,{action,version,value:data});version=r.version;dirty=false;notice.textContent=action==='publish'?'Changes published.':'Draft saved.';if(tab==='pages')preview.src=page+'?studio=1&v='+version}
    function bind(control,key,obj=data){control.addEventListener('input',()=>{obj[key]=control.type==='number'?Number(control.value):control.value});return control}
    let preview;
    if(tab==='pages'){
      const choose=card(panel);const sel=field(choose,'Website page',page,'text',cfg.routes);sel.oninput=e=>e.stopPropagation();sel.onchange=async()=>{if(!discard()){sel.value=page;return}page=sel.value;await open('pages')};
      const columns=el('div',undefined,'columns');panel.append(columns);const view=card(columns,'Page preview');view.append(el('p','Select a heading, text or image directly on the page to edit it.','hint'));
      preview=el('iframe',undefined,'preview');preview.title='Editable page preview';preview.src=page+'?studio=1';view.append(preview);
      const side=el('div');columns.append(side);const selected=card(side,'Selected content');selected.append(el('p','Choose content in the preview.','hint'));
      const seo=card(side,'Search & social');bind(field(seo,'Page title override',data.title),'title');bind(field(seo,'Meta description override',data.description,'textarea'),'description');
      const visibility=card(side,'Page sections');const custom=card(panel,'Additional sections');
      function drawSections(){custom.replaceChildren(el('h2','Additional sections'));data.sections.forEach((s,i)=>{const block=el('div',undefined,'panel-row');custom.append(block);bind(field(block,'Heading',s.heading),'heading',s);bind(field(block,'Section text',s.body,'textarea'),'body',s);assetField(block,'Image (optional)',s.image,v=>s.image=v);bind(field(block,'Image description',s.alt),'alt',s);
        const move=offset=>{const j=i+offset;if(j<0||j>=data.sections.length)return;[data.sections[i],data.sections[j]]=[data.sections[j],data.sections[i]];dirty=true;drawSections()};
        buttons(block,button('Move up',()=>move(-1)),button('Move down',()=>move(1)),button('Remove section',()=>{data.sections.splice(i,1);dirty=true;drawSections()}))});
        buttons(custom,button('Add section',()=>{data.sections.push({heading:'',body:'',image:'',alt:''});dirty=true;drawSections();custom.querySelectorAll('input')[custom.querySelectorAll('input').length-4]?.focus()}))}
      drawSections();actions(panel);
      preview.onload=()=>{const doc=preview.contentDocument;if(!doc)return;visibility.replaceChildren(el('h2','Page sections'));for(const s of doc.querySelectorAll('[data-studio-section]')){const key=s.dataset.studioSection,l=el('label',undefined,'check'),c=el('input');c.type='checkbox';c.checked=!data.hidden.includes(key);c.onchange=()=>{data.hidden=data.hidden.filter(x=>x!==key);if(!c.checked)data.hidden.push(key);s.style.opacity=c.checked?'1':'.35';dirty=true};l.append(c,document.createTextNode(s.dataset.studioLabel));visibility.append(l)}
        doc.addEventListener('submit',e=>e.preventDefault(),true);doc.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();const f=e.target.closest('[data-studio-field]');if(!f)return;const k=f.dataset.studioField;selected.replaceChildren(el('h2','Selected content'));
          if(f.tagName==='IMG'){const base={src:f.getAttribute('src'),alt:f.getAttribute('alt')||''};const s=data.changes[k]||base;const change=()=>{data.changes[k]=s;f.src=s.src;f.removeAttribute('srcset');f.alt=s.alt};assetField(selected,'Image URL',s.src,v=>{s.src=v;change()});const alt=field(selected,'Image description',s.alt);alt.oninput=()=>{s.alt=alt.value;change()}}
          else{const input=field(selected,'Text',data.changes[k]??f.textContent,'textarea');input.oninput=()=>{data.changes[k]=input.value;f.textContent=input.value};input.focus({preventScroll:true})}
          buttons(selected,button('Restore original field',async()=>{delete data.changes[k];await save('draft');selected.replaceChildren(el('h2','Selected content'),el('p','Original content restored in draft.'))}));if(matchMedia('(max-width:950px)').matches)selected.scrollIntoView({block:'center'})
        },true)};
      return;
    }
    if(tab==='pricing'){
      const c=card(panel,'Estimator and plan pricing');c.append(el('p','Core services use an AED unit rate. AMC prices are annual per property unit. The calculator applies the selected currency, handling fee and estimated VAT.'));
      data.pricing=data.pricing||structuredClone(cfg.defaults.pricing);
      for(const [key,v] of Object.entries(data.pricing)){const row=el('div',undefined,'fields panel-row');c.append(row);bind(field(row,cfg.defaults.pricing[key].name+' display name',v.name),'name',v);const price=bind(field(row,'Base price (AED)',v.rate,'number'),'rate',v);price.min=.01;price.step=.01}
      actions(panel);return;
    }
    if(tab==='company'){
      const c=card(panel,'Company details'),g=el('div',undefined,'fields');c.append(g);
      for(const [key,label] of Object.entries({name:'Company name',email:'Contact email',phone:'Phone with country code',whatsapp:'WhatsApp number, digits only',address:'Office address',hours:'Opening hours'}))bind(field(g,label,data[key]),key);
      assetField(c,'Company logo',data.logo,v=>data.logo=v);
      const theme=card(panel,'Website appearance'),grid=el('div',undefined,'fields');theme.append(grid);
      bind(field(grid,'Font family',data.font,'text',cfg.fonts),'font');const size=bind(field(grid,'Base font size (px)',data.size,'number'),'size');size.min=14;size.max=24;
      for(const [key,label] of Object.entries({color:'Accent',paper:'Page background',ink:'Body text'}))bind(field(grid,label,data[key],'color'),key);actions(panel);return;
    }
    const c=card(panel,'Measurement & verification');c.append(el('p','Measurement starts after a visitor allows it. Leave an ID empty to disable that integration.'));const g=el('div',undefined,'fields');c.append(g);
    for(const [key,label] of Object.entries({ga:'Google Analytics 4 measurement ID',ads:'Google Ads tag ID',pixel:'Meta Pixel ID',verification:'Search Console verification token'}))bind(field(g,label,data[key]),key);actions(c);
    const conn=card(panel,'ServiceHub ERP & payments'),i=cfg.integrations;conn.append(el('p','Website database: '+cfg.storage),el('p','ERP enquiry delivery: '+(i.canSync?'Configured':'Awaiting API configuration')),el('p','Configure SERVICEHUB_API_URL and SERVICEHUB_API_KEY on your hosting provider. ServiceHub handles customer accounts and Stripe payments.'));
    const transfer=card(panel,'Move to another host');transfer.append(el('p','Download your page drafts, published content, uploaded images and customer requests for the database import. The file contains customer contact details. Keep it private.'));
    buttons(transfer,button('Download database export',async()=>{const rows=[];let cursor='';do{const v=await api('export?cursor='+encodeURIComponent(cursor));rows.push(...v.rows);cursor=v.next}while(cursor);const blob=new Blob([JSON.stringify({format:'servicebay-v1',created:new Date().toISOString(),rows})],{type:'application/json'});const url=URL.createObjectURL(blob),a=el('a');a.href=url;a.download='servicebay-private-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);notice.textContent='Database export downloaded.'}));
    if(i.portal){const a=el('a','Open ServiceHub customer login');a.href=i.portal;conn.append(a);for(const [label,key] of [['Stripe test webhook','stripeTest'],['Stripe live webhook','stripeLive']]){const f=field(conn,label,i[key]);f.readOnly=true}}
  }
  async function inbox(ticket,cursor,more){const r=await api('inbox'+(cursor?'?cursor='+encodeURIComponent(cursor):''));if(ticket!==epoch)return;
    if(!more){panel.replaceChildren();panel.append(el('p','Manage website requests and send them to your ServiceHub account.','hint'))}
    if(!r.items.length)card(panel,'No requests yet').append(el('p','Requests sent from the customer portal or a website quote form will appear here.'));
    for(const row of r.items){const c=card(panel,row.name);c.append(el('p',[row.email,row.phone,new Date(row.created).toLocaleString()].filter(Boolean).join(' · ')),el('p',row.message));const state=field(c,'Request status',row.status,'text',['Received','In review','Contacted','Scheduled','Closed']);state.oninput=e=>e.stopPropagation();const controls=[button('Update status',async()=>{await api('request',{key:row.key,previous:row.status,status:state.value});row.status=state.value;dirty=false;notice.textContent='Status updated.'})];
      if(cfg.integrations.canSync&&!row.erpId)controls.push(button('Send to ServiceHub',async()=>{await api('request',{key:row.key,action:'sync'});await open('requests');notice.textContent='Delivered to ServiceHub.'}));buttons(c,...controls);c.append(el('p',row.erpId?'Delivered to ServiceHub':'Stored on this website','stamp'))}
    if(r.next){const next=button('Load more requests',async()=>{await inbox(ticket,r.next,true);next.remove()});panel.append(next)}
  }
  document.querySelector('#navigation').onclick=e=>{const n=e.target.closest('[data-tab]');if(n&&discard())open(n.dataset.tab).catch(e=>notice.textContent=e.message)};
  api('state').then(async x=>{cfg=x;await open('pages')}).catch(e=>notice.textContent=e.message);
})();
