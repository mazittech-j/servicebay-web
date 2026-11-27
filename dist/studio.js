(() => {
  const by=id=>document.getElementById(id), panel=by('panel'), notice=by('notice');
  const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n};
  function button(text,action,style='secondary'){const n=el('button',text,'btn '+style);n.type='button';n.onclick=async()=>{n.disabled=true;try{await action()}catch(e){notice.textContent=e.message}finally{n.disabled=false}};return n}
  function field(parent,title,value,type='text',options){const l=el('label',title),input=el(options?'select':type==='textarea'?'textarea':'input');if(options)for(const o of options){const v=el('option',o);v.value=o;input.append(v)}else if(type==='textarea')input.rows=4;else input.type=type;input.value=value??'';l.append(input);parent.append(l);return input}
  function card(parent,title){const c=el('section',undefined,'card');if(title)c.append(el('h2',title));parent.append(c);return c}
  function buttons(parent,...items){const row=el('div',undefined,'buttons');row.append(...items);parent.append(row)}
  const api=async(path,data)=>{const res=await fetch('/api/admin/'+path,data?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}:{});const x=await res.json();if(res.status===401){dirty=false;location.replace('/admin/')}if(!res.ok)throw Error(x.error||'Could not complete the request.');return x};
  let cfg,tab='pages',page='/',epoch=0,dirty=false;
  const tracked=()=>{dirty=true};
  notice.onclick=()=>{notice.textContent=''};
  panel.addEventListener('input',tracked);
  window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue=''}});
  function discard(){return !dirty||confirm('Leave without saving these changes?')}
  const titles={activity:'Activity log',rates:'Services & AMC',profile:'My account',team:'Team access',security:'Security shield',security2fa:'Two-factor authentication',overview:'Overview',pages:'Page editor',company:'Company & theme',pricing:'Services & AMC',connections:'Integrations',requests:'Customer requests'};
  function assetField(parent,title,value,onChange){const input=field(parent,title,value);input.placeholder='/assets/… or https://…';input.oninput=()=>onChange(input.value);const up=el('input');up.type='file';up.accept='image/png,image/jpeg,image/webp';up.setAttribute('aria-label','Upload image');parent.append(up);up.onchange=async()=>{try{const file=up.files[0];if(!file)return;if(file.size>512000)throw Error('Choose an image under 500 KB.');const data=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result.split(',')[1]);r.onerror=reject;r.readAsDataURL(file)});const {url}=await api('media',{data,type:file.type});input.value=url;onChange(url);dirty=true;notice.textContent='Image uploaded. Save the page to use it.'}catch(e){notice.textContent=e.message}};return input}
  async function open(next){
    const ticket=++epoch;tab=next;dirty=false;notice.textContent='';panel.replaceChildren();by('title').textContent=titles[tab];
    const activeTab=tab==='rates'?'pricing':tab;history.replaceState(null,'','#'+tab);
    for(const n of document.querySelectorAll('[data-tab]')){n.classList.toggle('active',n.dataset.tab===activeTab);n.setAttribute('aria-current',n.dataset.tab===activeTab?'page':'false')}
    if(tab==='overview'){await overview(ticket);return}
    if(tab==='activity'){await activityLog(ticket);return}
    if(tab==='pricing'){catalogTabs();await serviceDashboard(ticket);return}
    if(tab==='team'){await team(ticket);return}
    if(tab==='profile'){await profile(ticket);return}
    if(tab==='security'){await securityShield(ticket);return}
    if(tab==='security2fa'){await studioPrefsCard(panel,ticket);await twoFactorCard(panel,ticket);return}
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
    if(tab==='rates'){
      if(cfg.integrations?.canSync&&cfg.integrations?.autoSync!==false){try{const pr=await api('erp',{action:'pull-pricing'});if(ticket!==epoch)return;if(pr?.updatedCount>0){const fresh=await api('content?scope=site');if(ticket!==epoch)return;version=fresh.version;published=fresh.published;data=fresh.draft}}catch{}}
      catalogTabs();const c=card(panel,'Estimator and plan pricing');c.append(el('p','Publish a service to offer it in the cost estimator and quote form. AMC plans also appear on the plan comparison page.'));
      data.pricing=data.pricing||structuredClone(cfg.defaults.pricing);
      const bar=el('div',undefined,'buttons');c.append(bar);
      const entries=el('div');panel.append(entries);
      function addItem(kind){const id='custom-'+crypto.randomUUID().replaceAll('-','');data.pricing[id]={kind,name:'',rate:0,description:'',unit:'Units',sectors:['residential','commercial','industrial']};dirty=true;draw(id)}
      bar.append(button('Add service',()=>addItem('service'),'primary'),button('Add AMC plan',()=>addItem('plan')));
      function draw(focus){
        entries.replaceChildren();for(const [kind,label] of [['service','Service rates'],['plan','AMC plans']]){
          const block=card(entries,label);
          for(const [key,v] of Object.entries(data.pricing)){
            const original=cfg.defaults.pricing[key];if((v.kind||original?.kind)!==kind)continue;
            const chipText=()=>(v.active===false?'Inactive · ':'')+(v.rate?'AED '+Number(v.rate).toLocaleString():'Set price');
            const row=el('details',undefined,'price-entry');row.open=focus===key;const summary=el('summary');summary.append(el('strong',v.name||'New '+kind),el('span',chipText(),'amount-chip'));row.append(summary);block.append(row);
            const fields=el('div',undefined,'fields');row.append(fields);
            const name=bind(field(fields,'Display name',v.name),'name',v);name.maxLength=80;name.oninput=()=>summary.firstChild.textContent=name.value||'New '+kind;
            const price=bind(field(fields,kind==='plan'?'Annual price per unit (AED)':'Price per unit (AED)',v.rate||'','number'),'rate',v);price.min=.01;price.step=.01;price.oninput=()=>summary.lastChild.textContent=chipText();
            const activeLbl=el('label',undefined,'check'),activeChk=el('input');activeChk.type='checkbox';activeChk.checked=v.active!==false;
            activeChk.onchange=()=>{if(activeChk.checked)delete v.active;else v.active=false;dirty=true;summary.lastChild.textContent=chipText()};
            activeLbl.append(activeChk,document.createTextNode(' Active (visible on website)'));row.append(activeLbl);
            if(!original){if(kind==='service'){bind(field(row,'Quantity label',v.unit),'unit',v);const box=el('fieldset');box.append(el('legend','Property categories'));row.append(box);for(const sector of ['residential','commercial','industrial']){const label=el('label',undefined,'check'),check=el('input');check.type='checkbox';check.checked=v.sectors.includes(sector);check.onchange=()=>{v.sectors=v.sectors.filter(x=>x!==sector);if(check.checked)v.sectors.push(sector)};label.append(check,document.createTextNode(sector));box.append(label)}}else bind(field(row,'Plan coverage or description',v.description,'textarea'),'description',v);
              buttons(row,button('Remove item',()=>{delete data.pricing[key];dirty=true;draw()}))}
            if(focus===key){name.focus();row.scrollIntoView({block:'center'})}
          }
        }
      }
      draw();
      actions(panel);return;
    }
    if(tab==='company'){
      const c=card(panel,'Company details'),g=el('div',undefined,'fields');c.append(g);
      for(const [key,label] of Object.entries({name:'Company name',email:'Contact email',phone:'Phone with country code',whatsapp:'WhatsApp number, digits only',address:'Office address',hours:'Opening hours'}))bind(field(g,label,data[key]),key);
      assetField(c,'Company logo',data.logo,v=>data.logo=v);
      const theme=card(panel,'Website appearance'),grid=el('div',undefined,'fields');theme.append(grid);
      bind(field(grid,'Font family',data.font,'text',cfg.fonts),'font');const size=bind(field(grid,'Base font size (px)',data.size,'number'),'size');size.min=14;size.max=24;
      typeControls(theme,data,size);
      const colorFields={color:'Accent',paper:'Page background',ink:'Body text',dark:'Dark sections & footer',tint:'Tinted card surface',muted:'Muted / secondary text',line:'Borders & dividers'};
      const colorInputs={};
      for(const [key,label] of Object.entries(colorFields))colorInputs[key]=bind(field(grid,label,data[key]||cfg.defaults[key],'color'),key);
      buttons(theme,button('Reset website colors',()=>{for(const k of Object.keys(colorFields)){data[k]=cfg.defaults[k];colorInputs[k].value=cfg.defaults[k]}dirty=true;notice.textContent='Website colors reset to defaults. Publish changes to apply.'},'secondary'));
      const navCard=card(panel,'Navigation menu');navCard.append(el('p','Customize your top menubar links or add new pages/external links.'));
      const defNav=[{label:'Home',href:'/',enabled:true},{label:'Services',href:'/services/',enabled:true},{label:'AMC Plans',href:'/amc/',enabled:true},{label:'Cost estimator',href:'/estimate/',enabled:true},{label:'About Us',href:'/about/',enabled:true},{label:'Service areas',href:'/service-areas/',enabled:true},{label:'Contact',href:'/contact/',enabled:true}];
      if(!Array.isArray(data.menu)||!data.menu.length)data.menu=structuredClone(defNav);
      const navList=el('div');navCard.append(navList);
      function drawMenu(){
        navList.replaceChildren();
        data.menu.forEach((m,idx)=>{
          const row=el('div',undefined,'fields');
          const lbl=field(row,'Menu label',m.label);lbl.oninput=()=>{m.label=lbl.value;dirty=true};
          const url=field(row,'Link URL (/path or https://...)',m.href);url.oninput=()=>{m.href=url.value;dirty=true};
          const chkWrap=el('label',undefined,'check'),chk=el('input');chk.type='checkbox';chk.checked=m.enabled!==false;chk.onchange=()=>{m.enabled=chk.checked;dirty=true};chkWrap.append(chk,document.createTextNode(' Show in menubar'));
          row.append(chkWrap,button('Remove',()=>{data.menu.splice(idx,1);dirty=true;drawMenu()},'secondary'));
          navList.append(row);
        });
      }
      drawMenu();
      buttons(navCard,button('Add menu link',()=>{data.menu.push({label:'New link',href:'/contact/',enabled:true});dirty=true;drawMenu()},'secondary'),button('Reset default menu',()=>{data.menu=[];dirty=true;drawMenu()},'secondary'));

      const curCard=card(panel,'Currencies & countries');curCard.append(el('p','Add extra currencies (converted from 1 AED) to appear in the website top bar and cost estimator.'));
      if(!Array.isArray(data.currencies))data.currencies=[];
      const curList=el('div');curCard.append(curList);
      function drawCur(){
        curList.replaceChildren();
        data.currencies.forEach((c,idx)=>{
          const row=el('div',undefined,'fields');
          const code=field(row,'Country code (e.g. US, GB, BD)',c.code);code.maxLength=6;code.oninput=()=>{c.code=code.value.toUpperCase();dirty=true};
          const name=field(row,'Country name',c.name);name.oninput=()=>{c.name=name.value;dirty=true};
          const curr=field(row,'Currency (3-letter e.g. USD, GBP, BDT)',c.currency);curr.maxLength=3;curr.oninput=()=>{c.currency=curr.value.toUpperCase();dirty=true};
          const rate=field(row,'Rate per 1 AED',c.rate,'number');rate.step='0.0001';rate.min='0.0001';rate.oninput=()=>{c.rate=Number(rate.value)||1;dirty=true};
          row.append(button('Remove',()=>{data.currencies.splice(idx,1);dirty=true;drawCur()},'secondary'));
          curList.append(row);
        });
      }
      drawCur();
      buttons(curCard,button('Add currency',()=>{data.currencies.push({code:'US',name:'USA',currency:'USD',rate:0.2723});dirty=true;drawCur()},'secondary'));
      actions(panel);return;
    }
    const c=card(panel,'Measurement & verification');c.append(el('p','Measurement starts after a visitor allows it. Leave an ID empty to disable that integration.'));const g=el('div',undefined,'fields');c.append(g);
    for(const [key,label] of Object.entries({ga:'Google Analytics 4 measurement ID',ads:'Google Ads tag ID',pixel:'Meta Pixel ID (Facebook / Instagram)',tiktok:'TikTok Pixel ID',gtm:'Google Tag Manager ID',verification:'Search Console verification token'}))bind(field(g,label,data[key]),key);actions(c);
    const socCard=card(panel,'Social media links');socCard.append(el('p','Add your Facebook, Instagram, LinkedIn, YouTube, TikTok, or X profiles to appear on the website footer.'));
    if(!Array.isArray(data.social))data.social=[];
    const socList=el('div');socCard.append(socList);
    function drawSoc(){
      socList.replaceChildren();
      data.social.forEach((s,idx)=>{
        const row=el('div',undefined,'fields');
        const lbl=field(row,'Platform name (e.g. Facebook, Instagram)',s.label);lbl.maxLength=40;lbl.oninput=()=>{s.label=lbl.value;dirty=true};
        const url=field(row,'Profile URL (https://...)',s.url,'url');url.maxLength=300;url.oninput=()=>{s.url=url.value;dirty=true};
        row.append(button('Remove',()=>{data.social.splice(idx,1);dirty=true;drawSoc()},'secondary'));
        socList.append(row);
      });
    }
    drawSoc();
    buttons(socCard,button('Add social link',()=>{data.social.push({label:'Instagram',url:'https://instagram.com/'});dirty=true;drawSoc()},'secondary'));
    actions(socCard);
    const conn=card(panel,'ServiceHub ERP & payments');
    const erpBox=el('div');conn.append(erpBox);
    const drawErp=(i)=>{
      cfg.integrations=i;
      erpBox.replaceChildren();
      const erpChips=el('div',undefined,'env-list');
      const syncLabel=i.paused?'Disconnected (Paused)':i.canSync?(i.lastCheck?.status?.startsWith('Revoked')?i.lastCheck.status:'Active'):'Not configured';
      erpChips.append(el('span','Database: '+cfg.storage,'status-chip'),el('span','ERP sync: '+syncLabel,'status-chip'));
      if(i.source&&i.source!=='none')erpChips.append(el('span','Source: '+(i.source==='studio'?'Saved in studio':'Host env'),'status-chip'));
      if(i.lastCheck)erpChips.append(el('span','Last check: '+i.lastCheck.status+' · '+stamp(i.lastCheck.at),'status-chip'));
      if(i.lastSync)erpChips.append(el('span','Last sync: '+i.lastSync.sent+' sent, '+i.lastSync.updated+' updated, '+i.lastSync.pricesUpdated+' prices · '+stamp(i.lastSync.at),'status-chip'));
      if(i.lastWebhook)erpChips.append(el('span','Last webhook: '+i.lastWebhook.event+(i.lastWebhook.pricesUpdated!==undefined?' ('+i.lastWebhook.pricesUpdated+' prices'+(i.lastWebhook.keys?' · keys: '+i.lastWebhook.keys:'')+')':'')+' · '+stamp(i.lastWebhook.at),'status-chip'));
      erpBox.append(erpChips,el('p','Connect your ServiceHub ERP API URL and integration key below. New quotes, status changes, and periodic updates sync automatically when Auto-sync is on, or click Push & Sync All anytime.'));
      const erpGrid=el('div',undefined,'fields');erpBox.append(erpGrid);
      const urlIn=field(erpGrid,'ServiceHub API URL',i.apiUrl||'','url');urlIn.placeholder='https://servicehub-client.onrender.com/api/v1/your-company';
      const keyIn=secret(erpGrid,'ServiceHub API key',i.canSync||i.paused?'Leave blank to keep current key, or paste new shw_…':'shw_…');
      const autoWrap=el('label',undefined,'check');const autoIn=el('input');autoIn.type='checkbox';autoIn.checked=i.autoSync!==false;
      autoIn.onchange=async()=>{const next=await api('erp',{action:'auto-sync',enabled:autoIn.checked});drawErp(next);notice.textContent=next.autoSync?'ServiceHub auto-sync enabled.':'ServiceHub auto-sync paused.'};
      autoWrap.append(autoIn,document.createTextNode(' Auto-sync new quotes, status changes & periodic catch-up'));
      erpBox.append(autoWrap);
      const erpActs=[button('Save ERP connection',async()=>{
        const next=await api('erp',{action:'save',apiUrl:urlIn.value,apiKey:keyIn.value});
        dirty=false;drawErp(next);notice.textContent='ServiceHub ERP connection saved.';
      },'primary')];
      if(i.portal||i.canSync||i.paused){
        if(!i.paused)erpActs.push(button('Verify connection',async()=>{const next=await api('erp',{action:'test'});drawErp(next);notice.textContent='ERP connection check: '+(next.lastCheck?.status||'Done')+'.'},'secondary'));
        if(!i.paused&&i.canSync){
          erpActs.push(button('Push & Sync All',async()=>{
            const res=await api('erp',{action:'sync-all'});
            if(res.state)drawErp(res.state);
            notice.textContent='Synced: '+res.sent+' quotes sent, '+(res.updated||0)+' statuses updated, '+(res.pricesUpdated||0)+' prices pulled'+(res.pricesUpdated===0&&res.pricingNote?' ('+res.pricingNote+')':'')+(res.failed?' ('+res.failed+' failed: '+(res.errors?.[0]||'')+')':'.');
          },'secondary'));
        }
        erpActs.push(button(i.paused?'Reconnect ERP':'Disconnect ERP',async()=>{
          const next=await api('erp',{action:i.paused?'reconnect':'disconnect'});
          drawErp(next);notice.textContent=next.paused?'ServiceHub ERP sync disconnected.':'ServiceHub ERP sync re-enabled.';
        },'secondary'));
        erpActs.push(button('Delete connection',async()=>{
          if(!window.confirm('Delete the saved ServiceHub ERP connection?'))return;
          const next=await api('erp',{action:'delete'});
          dirty=false;drawErp(next);notice.textContent='ServiceHub ERP connection deleted.';
        },'secondary'));
      }
      buttons(erpBox,...erpActs);
      if(i.webhookSecret){
        const whUrl=location.origin+'/api/erp/webhook?token='+i.webhookSecret;
        const whField=field(erpBox,'Website Webhook URL (paste into ServiceHub ERP)',whUrl);whField.readOnly=true;
        buttons(erpBox,button('Copy webhook URL',async()=>{try{await navigator.clipboard.writeText(whUrl);notice.textContent='Website Webhook URL copied.'}catch{whField.select();notice.textContent='Select and copy the Webhook URL above.'}},'secondary'));
      }
      if(i.portal){const a=el('a','Open ServiceHub customer login');a.href=i.portal;erpBox.append(a);for(const [label,key] of [['Stripe test webhook','stripeTest'],['Stripe live webhook','stripeLive']]){const f=field(erpBox,label,i[key]);f.readOnly=true}}
    };
    drawErp(cfg.integrations||{});
    api('erp').then(drawErp).catch(()=>{});
    await emailConfig(ticket);if(ticket!==epoch)return;
    if(cfg.user.role==='owner'){
      const transfer=card(panel,'Move to another host');transfer.append(el('p','Download your page drafts, published content, uploaded images and customer requests for the database import. The file contains customer contact details. Keep it private.'));
      buttons(transfer,button('Download database export',async()=>{const rows=[];let cursor='';do{const v=await api('export?cursor='+encodeURIComponent(cursor));rows.push(...v.rows);cursor=v.next}while(cursor);const blob=new Blob([JSON.stringify({format:'servicebay-v1',created:new Date().toISOString(),rows})],{type:'application/json'});const url=URL.createObjectURL(blob),a=el('a');a.href=url;a.download='servicebay-private-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);notice.textContent='Database export downloaded.'}));
    }
  }
  const stamp=value=>new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Dubai',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(value));
  const countsList=[['All enquiries','total'],['Pending','pending'],['Scheduled','scheduled'],['Completed','completed'],['Other','other']];
  function metrics(parent,totals){
    const strip=el('section',undefined,'report-metrics');strip.setAttribute('aria-label','Enquiry totals');
    for(const [title,key] of countsList){const tile=el('article');tile.dataset.metric=key;tile.append(el('span',title),el('strong',String(totals[key])));strip.append(tile)}
    parent.append(strip);
  }
  function catalogTabs(){
    const nav=el('div',undefined,'report-tabs');
    for(const [title,id] of [['Enquiry dashboard','pricing'],['Services & plan pricing','rates']]){
      const b=button(title,()=>{if(discard())return open(id)});b.setAttribute('aria-pressed',String(tab===id));nav.append(b)
    }
    panel.append(nav);
  }
  function sectionBar(parent,title,action,go){
    const bar=el('div',undefined,'section-head');bar.append(el('h2',title));if(action)bar.append(button(action,go));parent.append(bar);
  }
  function activityRows(parent,rows){
    if(!rows.length){parent.append(el('p','New activity will appear here as changes are made.','empty-state'));return}
    const feed=el('ol',undefined,'audit-feed');parent.append(feed);
    for(const r of rows){const li=el('li'),info=el('div'),line=el('div',undefined,'audit-title');line.append(el('strong',r.action),el('span',r.group,'group-tag'));info.append(line);if(r.detail)info.append(el('p',r.detail));info.append(el('small',r.actor));const time=el('time',stamp(r.at));time.dateTime=r.at;li.append(info,time);feed.append(li)}
  }
  async function activityLog(ticket){
    const c=card(panel),bar=el('div',undefined,'section-head');c.append(bar);bar.append(el('h2','Recorded activity'));
    const group=field(bar,'Filter activity','All events','text',['All events','Quotes','Website','Team','Email','Studio','Security']);group.oninput=e=>e.stopPropagation();
    const list=el('div'),foot=el('div');c.append(el('p','New events are recorded in Dubai time.','hint'),list,foot);let seq=0;
    async function load(cursor=''){
      const order=++seq,v=await api('activity?'+new URLSearchParams({group:group.value==='All events'?'':group.value,...(cursor?{cursor}:{})}));
      if(ticket!==epoch||order!==seq)return;
      if(!cursor)list.replaceChildren();activityRows(list,v.items);foot.replaceChildren();if(v.next)buttons(foot,button('Load earlier events',()=>load(v.next)));
    }
    group.onchange=()=>load().catch(e=>notice.textContent=e.message);await load();
  }
  async function serviceDashboard(ticket){
    const c=card(panel),bar=el('div',undefined,'section-head');c.append(bar);bar.append(el('h2','Service enquiries'));
    const range=field(bar,'Reporting period','All time','text',['All time','Last 7 days','Last 30 days','Last 90 days']);range.oninput=e=>e.stopPropagation();
    const body=el('div');c.append(body);let seq=0;
    async function load(){
      const order=++seq,days={'All time':0,'Last 7 days':7,'Last 30 days':30,'Last 90 days':90}[range.value],r=await api('service-report?days='+days);
      if(ticket!==epoch||order!==seq)return;body.replaceChildren();metrics(body,r.totals);
      body.append(el('p','Pending includes received, in-review and contacted enquiries. Other includes closed, cancelled and unclassified outcomes. Dates use Dubai time.','report-help'));
      for(const [kind,title] of [['service','Services'],['plan','AMC plans']]){
        const rows=r.rows.filter(v=>v.kind===kind);if(!rows.length)continue;
        const region=el('div',undefined,'report-scroll');region.tabIndex=0;region.setAttribute('role','region');region.setAttribute('aria-label',title+' enquiry table');
        const table=el('table',undefined,'report-table');table.append(el('caption',title));const header=el('thead'),tr=el('tr');for(const h of [kind==='plan'?'Plan':'Service','Enquiries','Pending','Scheduled','Completed','Other']){const th=el('th',h);th.scope='col';tr.append(th)}header.append(tr);table.append(header);
        const tbody=el('tbody');for(const v of rows){const line=el('tr'),name=el('th',v.label);name.scope='row';line.append(name);for(const [,key] of countsList)line.append(el('td',String(v[key])));tbody.append(line)}table.append(tbody);region.append(table);body.append(region);
      }
      renderSourcesSection(body,r.sources);
    }
    range.onchange=()=>load().catch(e=>notice.textContent=e.message);await load();
  }
  function renderSourcesSection(parent,sources){
    if(!sources)return;
    const platforms=sources.platforms||[],devices=sources.devices||[];
    const wrap=el('div',undefined,'insight-grid');parent.append(wrap);
    const pCard=card(wrap,'Traffic & lead sources (Platform comparison)');
    if(!platforms.length){pCard.append(el('p','Visitor & quote source data (Google, Facebook, Instagram, WhatsApp, Direct) will appear here as visitors browse and submit quotes.','empty-state'))}
    else{
      const leg=el('div',undefined,'src-legend');
      leg.innerHTML='<span><i class="src-dot" style="background:#4d828d"></i>Visits ('+sources.totalVisits+')</span><span><i class="src-dot" style="background:#b54524"></i>Quote requests ('+sources.totalLeads+')</span>';
      pCard.append(leg);
      const maxVal=Math.max(1,...platforms.map(p=>Math.max(p.visits,p.leads)));
      const bars=el('div',undefined,'src-bars');
      for(const p of platforms){
        const row=el('div',undefined,'src-bar-row'),hd=el('div',undefined,'case-line');
        const conv=p.visits?Math.round(p.leads/p.visits*100)+'%':'—';
        hd.append(el('strong',p.source),el('small',p.visits+' visits · '+p.leads+' quotes · conv '+conv));
        const t1=el('div',undefined,'src-track'),f1=el('i',undefined,'src-fill-visit');f1.style.width=(p.visits/maxVal*100)+'%';t1.append(f1);
        const t2=el('div',undefined,'src-track'),f2=el('i',undefined,'src-fill-lead');f2.style.width=(p.leads/maxVal*100)+'%';t2.append(f2);
        row.append(hd,t1,t2);bars.append(row);
      }
      pCard.append(bars);
      const region=el('div',undefined,'report-scroll');
      const table=el('table',undefined,'report-table'),head=el('thead'),hr=el('tr');
      for(const h of ['Platform','Visits','Quotes','Conversion','Lead share']){const th=el('th',h);th.scope='col';hr.append(th)}
      head.append(hr);table.append(head);
      const tbody=el('tbody');
      for(const p of platforms){
        const tr=el('tr'),th=el('th',p.source);th.scope='row';tr.append(th);
        const conv=p.visits?((p.leads/p.visits)*100).toFixed(1)+'%':'—';
        const share=sources.totalLeads?Math.round(p.leads/sources.totalLeads*100)+'%':'0%';
        tr.append(el('td',String(p.visits)),el('td',String(p.leads)),el('td',conv),el('td',share));
        tbody.append(tr);
      }
      table.append(tbody);region.append(table);pCard.append(region);
    }
    const dCard=card(wrap,'Visitor & lead devices');
    if(!devices.length){dCard.append(el('p','Device breakdown (Mobile, Desktop, Tablet) will appear here.','empty-state'))}
    else{
      const devTotal=devices.reduce((s,d)=>s+d.total,0)||1;
      for(const d of devices){
        const line=el('div',undefined,'demand-item'),hd=el('div',undefined,'case-line'),tr=el('div',undefined,'demand-track'),fl=el('i');
        hd.append(el('span',d.device),el('strong',d.total+' ('+Math.round(d.total/devTotal*100)+'%)'));
        fl.style.width=(d.total/devices[0].total*100)+'%';tr.append(fl);line.append(hd,tr);dCard.append(line);
      }
    }
    const countries=sources?.countries||[],pgs=sources?.pages||[],clicks=sources?.serviceClicks||[];
    const cCard=card(wrap,'Visitors & clicks by country');
    if(!countries.length){cCard.append(el('p','Country breakdown will appear as visitors browse or click services.','empty-state'))}
    else{
      const maxC=Math.max(1,...countries.map(c=>c.total));
      for(const c of countries){
        const line=el('div',undefined,'demand-item'),hd=el('div',undefined,'case-line'),tr=el('div',undefined,'demand-track'),fl=el('i');
        hd.append(el('span',c.country),el('strong',String(c.total)));
        fl.style.width=(c.total/maxC*100)+'%';tr.append(fl);line.append(hd,tr);cCard.append(line);
      }
    }
    const pgCard=card(wrap,'Most visited pages');
    if(!pgs.length){pgCard.append(el('p','Page visits will appear as visitors navigate your website.','empty-state'))}
    else{
      const maxP=Math.max(1,...pgs.map(p=>p.total));
      for(const p of pgs){
        const line=el('div',undefined,'demand-item'),hd=el('div',undefined,'case-line'),tr=el('div',undefined,'demand-track'),fl=el('i');
        hd.append(el('span',p.page),el('strong',String(p.total)));
        fl.style.width=(p.total/maxP*100)+'%';tr.append(fl);line.append(hd,tr);pgCard.append(line);
      }
    }
    const scCard=card(wrap,'Service clicks by country');
    if(!clicks.length){scCard.append(el('p','Service & AMC clicks by country will appear here.','empty-state'))}
    else{
      const reg=el('div',undefined,'table-scroll'),tbl=el('table',undefined,'report-table'),thd=el('thead'),hr=el('tr');
      for(const h of ['Service / Plan','Country','Clicks'])hr.append(el('th',h));thd.append(hr);tbl.append(thd);
      const tb=el('tbody');
      for(const row of clicks){const tr=el('tr');tr.append(el('th',row.service),el('td',row.country),el('td',String(row.total)));tb.append(tr)}
      tbl.append(tb);reg.append(tbl);scCard.append(reg);
    }
  }
  async function overview(ticket){
    const x=await api('overview');if(ticket!==epoch)return;
    const heading=el('div',undefined,'overview-heading');heading.append(el('p','Quote activity across all services and AMC plans.','hint'),el('span',new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Dubai',dateStyle:'long'}).format(Date.now())+' · Dubai','group-tag'));panel.append(heading);metrics(panel,x.totals);
    const grid=el('div',undefined,'insight-grid');panel.append(grid);
    const trends=card(grid),weekTotal=x.week.reduce((sum,d)=>sum+d.total,0);sectionBar(trends,'Enquiries this week');trends.append(el('p',weekTotal+' received in the last 7 days','hint'));
    const chart=el('ol',undefined,'week-chart'),max=Math.max(1,...x.week.map(d=>d.total));chart.setAttribute('aria-label','Daily enquiry counts');
    for(const v of x.week){const cell=el('li'),bar=el('div',undefined,'bar-well'),fill=el('i');fill.style.height=v.total/max*100+'%';bar.append(fill);const date=new Date(v.day+'T12:00:00Z'),day=el('time',new Intl.DateTimeFormat('en-GB',{weekday:'short',timeZone:'Asia/Dubai'}).format(date));day.dateTime=v.day;cell.title=v.day+' · '+v.total+' enquiries';cell.append(el('strong',String(v.total)),bar,day);chart.append(cell)}trends.append(chart);
    const demand=card(grid);sectionBar(demand,'Most requested','View report',()=>open('pricing'));
    if(!x.top.length)demand.append(el('p','Service demand appears after the first enquiry.','empty-state'));
    for(const v of x.top){const line=el('div',undefined,'demand-item'),head=el('div',undefined,'case-line'),track=el('div',undefined,'demand-track'),fill=el('i');head.append(el('span',v.label),el('strong',String(v.total)));fill.style.width=v.total/x.top[0].total*100+'%';track.append(fill);line.append(head,track);demand.append(line)}
    const recent=card(grid);sectionBar(recent,'Recent quotes','Open inbox',()=>open('requests'));if(!x.recent.length)recent.append(el('p','No quote requests yet.','empty-state'));
    for(const r of x.recent){const row=el('div',undefined,'request-row');row.append(el('strong',r.name),stageBadge(r.status),el('small',[r.service,r.source||'Direct',stamp(r.created)].join(' · ')));recent.append(row)}
    const log=card(grid);sectionBar(log,'Recent activity','View log',()=>open('activity'));activityRows(log,x.activity);
    renderSourcesSection(panel,x.sources);
    const shortcuts=card(panel);sectionBar(shortcuts,'Website management');buttons(shortcuts,button('Page editor · '+x.pages,()=>open('pages')),button('Catalog pricing · '+x.pricing,()=>open('rates')),button('Website appearance',()=>open('company')));
  }
  function typeControls(parent,data,base){
    const box=el('section',undefined,'type-panel');parent.append(box);box.append(el('h3','Responsive typography'),el('p','Set sizes in pixels for each screen. Leave a field empty to use the site’s responsive style.','hint'));
    const mode=field(box,'Screen size','Desktop','text',['Desktop','Mobile']);mode.oninput=e=>e.stopPropagation();const grid=el('div',undefined,'fields'),sample=el('div',undefined,'type-sample');box.append(grid,sample);data.typography??={};
    const names={h1:'Property maintenance in Dubai',h2:'Our services',h3:'AC & HVAC',body:'Plan your next service visit.',nav:'Services',button:'Request a quote',form:'Service type',caption:'Maintenance plans'};
    function draw(){
      const key=mode.value.toLowerCase(),values=data.typography[key]??={};grid.replaceChildren();sample.replaceChildren();sample.style.fontSize=base.value+'px';
      for(const r of cfg.typeRoles){
        const input=field(grid,r.label+' (px)',values[r.key]??'','number');input.min=r.min;input.max=r.max;input.placeholder='Site default';
        const demo=el('span',names[r.key],'demo-'+r.key);if(values[r.key])demo.style.fontSize=values[r.key]+'px';sample.append(demo);
        input.oninput=()=>{if(input.value===''){delete values[r.key];demo.style.fontSize=''}else{values[r.key]=input.valueAsNumber;if(input.validity.valid)demo.style.fontSize=input.value+'px'}};
      }
    }
    mode.onchange=draw;base.addEventListener('input',()=>sample.style.fontSize=base.value+'px');draw();
  }

  document.addEventListener('click',e=>{const btn=e.target.closest('.pw-toggle');if(!btn)return;const input=btn.parentElement?.querySelector('input');if(!input)return;const show=input.type==='password';input.type=show?'text':'password';btn.textContent=show?'Hide':'Show';btn.setAttribute('aria-pressed',String(show));btn.setAttribute('aria-label',show?'Hide password':'Show password')});
  function secret(parent,label,hint=''){
    const input=field(parent,label,'','password');input.autocomplete='new-password';
    if(hint)input.placeholder=hint;
    const wrap=el('span',undefined,'pw-wrap');input.replaceWith(wrap);
    const toggle=el('button','Show','pw-toggle');toggle.type='button';toggle.setAttribute('aria-label','Show password');toggle.setAttribute('aria-pressed','false');
    wrap.append(input,toggle);return input;
  }
  async function emailConfig(ticket){
    const x=await api('mail');if(ticket!==epoch)return;
    const c=card(panel,'Receipt & alert email (Resend)'),status=el('p',x.configured?'Sender configured. Receipts and security alerts use this sender.':'Email delivery is awaiting a verified sender. Quotes are saved in the customer portal.');
    c.append(status);
    if(x.envStatus){
      const chips=el('div',undefined,'env-list');
      chips.append(
        el('span','API key: '+(x.envStatus.hasResendKey?'Set':'Missing'),'status-chip'),
        el('span','From email: '+(x.envStatus.hasFromEmail?x.from:'Missing'),'status-chip'),
        el('span','In-app encryption: '+(x.envStatus.hasMailKey?'Enabled':'Env-only'),'status-chip')
      );
      c.append(chips);
    }
    const info=el('p',undefined,'mail-result');c.append(info);
    function result(last){info.textContent=last?'Last test · '+last.status+' · '+stamp(last.at)+(last.status==='Accepted'?' · Check the recipient mailbox for delivery.':''):''}
    result(x.lastTest);
    const recipient=(cfg.user.email&&cfg.user.email.includes('@'))?cfg.user.email:(x.fallbackRecipient||'');
    const test=button('Send test email',async()=>{const r=await api('mail-test',{});result(r)});
    const host=el('div',undefined,'buttons');
    if(x.editable){
      const g=el('div',undefined,'fields');c.append(g);
      const from=field(g,'Verified sender email',x.from,'email'),key=secret(g,'Resend sending API key',x.configured?'Leave blank to keep the current key':'re_…');
      host.append(button('Save email sender',async()=>{const saved=await api('mail',{from:from.value,key:key.value});key.value='';dirty=false;x.configured=saved.configured;const rec=(cfg.user.email&&cfg.user.email.includes('@'))?cfg.user.email:(saved.fallbackRecipient||'');test.disabled=!saved.configured||!rec;result(saved.lastTest);status.textContent='Sender saved. Send a test to check provider acceptance.'},'primary'));
    }else c.append(el('p','Configure RESEND_API_KEY and RECEIPT_FROM_EMAIL on your hosting provider (or add MAIL_SETTINGS_KEY to edit here).'));
    test.disabled=!x.configured||!recipient;host.append(test);c.append(host,el('p',recipient?'Test recipient · '+recipient:'Set your email in My account or Brand & company to receive a test.','stamp'));
  }
  const defaultPrefs={preset:'default',bg:'#f3f5f6',card:'#ffffff',ink:'#152936',sidebar:'#132737',accent:'#ad3516',fontSize:14,headingScale:1,sidebarWidth:224,density:'standard',radius:11};
  const studioPresets={
    default:{label:'Default Navy & Rust',bg:'#f3f5f6',card:'#ffffff',ink:'#152936',sidebar:'#132737',accent:'#ad3516'},
    dark:{label:'Dark Slate',bg:'#0f172a',card:'#1e293b',ink:'#f1f5f9',sidebar:'#090d16',accent:'#e05d38'},
    light:{label:'Clean Light Blue',bg:'#f8fafc',card:'#ffffff',ink:'#0f172a',sidebar:'#1e293b',accent:'#1d4ed8'},
    emerald:{label:'Emerald Operations',bg:'#f2f7f5',card:'#ffffff',ink:'#122b24',sidebar:'#0f2e26',accent:'#0d7a5f'}
  };
  function applyStudioPrefs(raw){
    const p={...defaultPrefs,...(raw||{})},root=document.documentElement.style;
    const dark=p.bg&&parseInt(p.bg.slice(1,3),16)<60;
    root.setProperty('--sb-bg',p.bg||defaultPrefs.bg);
    root.setProperty('--sb-card',p.card||defaultPrefs.card);
    root.setProperty('--sb-ink',p.ink||defaultPrefs.ink);
    root.setProperty('--sb-muted',dark?'#94a3b8':'#536570');
    root.setProperty('--sb-line',dark?'#334155':'#d5dfe3');
    root.setProperty('--sb-sidebar',p.sidebar||defaultPrefs.sidebar);
    root.setProperty('--sb-sidebar-ink','#e2ecf1');
    root.setProperty('--sb-accent',p.accent||defaultPrefs.accent);
    root.setProperty('--sb-font-size',(p.fontSize||14)+'px');
    root.setProperty('--sb-h-scale',String(p.headingScale||1));
    root.setProperty('--sb-sidebar-w',(p.sidebarWidth||224)+'px');
    const padMap={compact:'12px',standard:'18px',comfortable:'26px'},inPadMap={compact:'.36rem .55rem',standard:'.5rem .68rem',comfortable:'.68rem .85rem'};
    root.setProperty('--sb-pad',padMap[p.density]||'18px');
    root.setProperty('--sb-input-pad',inPadMap[p.density]||'.5rem .68rem');
    root.setProperty('--sb-radius',(p.radius||11)+'px');
    try{localStorage.setItem('servicebay-studio-prefs',JSON.stringify(p))}catch{}
    return p;
  }
  try{const cached=localStorage.getItem('servicebay-studio-prefs');if(cached)applyStudioPrefs(JSON.parse(cached))}catch{}

  async function studioPrefsCard(host,ticket){
    let saved={};try{saved=await api('studio-prefs')}catch{}
    if(ticket!==epoch)return;
    const p=applyStudioPrefs({...defaultPrefs,...saved});
    const c=card(host,'Admin panel theme & sizing');
    c.append(el('p','Customize the admin panel colors, text size, heading scale, sidebar width, and spacing. Changes preview live.'));
    const g=el('div',undefined,'fields');c.append(g);
    const presetNames={default:'Default Navy & Rust',dark:'Dark Slate',light:'Clean Light Blue',emerald:'Emerald Operations',custom:'Custom'};
    const presetSel=field(g,'Theme preset',presetNames[p.preset]||'Default Navy & Rust','text',Object.values(presetNames));
    const densityNames={compact:'Compact',standard:'Standard',comfortable:'Comfortable'};
    const densitySel=field(g,'Spacing / density',densityNames[p.density]||'Standard','text',Object.values(densityNames));
    const fontIn=field(g,'Base text size (px)',p.fontSize,'number');fontIn.min=12;fontIn.max=18;fontIn.step=1;
    const hScaleIn=field(g,'Heading scale (0.85–1.30)',p.headingScale,'number');hScaleIn.min=0.85;hScaleIn.max=1.3;hScaleIn.step=0.05;
    const sideIn=field(g,'Sidebar width (px)',p.sidebarWidth,'number');sideIn.min=190;sideIn.max=290;sideIn.step=4;
    const radIn=field(g,'Corner radius (px)',p.radius,'number');radIn.min=4;radIn.max=16;radIn.step=1;
    const bgIn=field(g,'Workspace background',p.bg,'color'),cardIn=field(g,'Card background',p.card,'color'),inkIn=field(g,'Text color',p.ink,'color'),sideColIn=field(g,'Sidebar color',p.sidebar,'color'),accIn=field(g,'Accent & buttons',p.accent,'color');
    const readForm=()=>{
      const pKey=Object.entries(presetNames).find(([,v])=>v===presetSel.value)?.[0]||'custom';
      const dKey=Object.entries(densityNames).find(([,v])=>v===densitySel.value)?.[0]||'standard';
      return {preset:pKey,bg:bgIn.value,card:cardIn.value,ink:inkIn.value,sidebar:sideColIn.value,accent:accIn.value,fontSize:Number(fontIn.value)||14,headingScale:Number(hScaleIn.value)||1,sidebarWidth:Number(sideIn.value)||224,density:dKey,radius:Number(radIn.value)||11};
    };
    presetSel.onchange=()=>{
      const pKey=Object.entries(presetNames).find(([,v])=>v===presetSel.value)?.[0];
      if(pKey&&studioPresets[pKey]){
        const pr=studioPresets[pKey];
        bgIn.value=pr.bg;cardIn.value=pr.card;inkIn.value=pr.ink;sideColIn.value=pr.sidebar;accIn.value=pr.accent;
        applyStudioPrefs(readForm());
      }
    };
    for(const inp of [bgIn,cardIn,inkIn,sideColIn,accIn])inp.addEventListener('input',()=>{presetSel.value='Custom';applyStudioPrefs(readForm())});
    for(const inp of [densitySel,fontIn,hScaleIn,sideIn,radIn])inp.addEventListener('input',()=>applyStudioPrefs(readForm()));
    buttons(c,button('Save admin theme & sizing',async()=>{
      const next=applyStudioPrefs(readForm());
      await api('studio-prefs',next);dirty=false;notice.textContent='Admin panel theme and sizing saved.';
    },'primary'),button('Reset to default',async()=>{
      const def=applyStudioPrefs(defaultPrefs);
      await api('studio-prefs',def);dirty=false;await open(tab);notice.textContent='Admin panel reset to default theme and sizing.';
    },'secondary'));
  }

  async function profile(ticket){
    const c=card(panel,'Studio sign-in details');c.append(el('p','Update your studio login and confirm with your current password. Changes sign out other studio sessions.'));
    const g=el('div',undefined,'fields');c.append(g);
    const name=field(g,'Display name',cfg.user.name),login=field(g,'Username',cfg.user.username),email=field(g,'Login email',cfg.user.email,'email'),current=secret(g,'Current password');
    current.autocomplete='current-password';const fresh=secret(g,'New password','Leave blank to keep your password'),confirm=secret(g,'Confirm new password');
    buttons(c,button('Save account details',async()=>{if(fresh.value!==confirm.value)throw Error('The new passwords do not match.');await api('profile',{name:name.value,username:login.value,email:email.value,currentPassword:current.value,newPassword:fresh.value});dirty=false;location.replace('/admin/#profile')},'primary'));
    await studioPrefsCard(panel,ticket);
    await twoFactorCard(panel,ticket);
  }
  async function twoFactorCard(host,ticket){
    const s=await api('2fa');if(ticket!==epoch)return;
    const c=card(host,'Google Authenticator (2FA)');
    const box=el('div');c.append(box);
    const renderStatus=(state)=>{
      box.replaceChildren();
      box.append(el('p',state.enabled?'Google Authenticator is active on your account. Backup codes remaining: '+state.backupRemaining+'.':'Protect your studio login with a 6-digit code from Google Authenticator.'));
      if(!state.enabled){
        buttons(box,button('Set up Google Authenticator',async()=>{
          const setup=await api('2fa',{action:'begin'});
          box.replaceChildren();
          box.append(el('p','Scan this QR code in Google Authenticator (or enter the key manually), then enter the 6-digit code below.'));
          const qrWrap=el('div',undefined,'qr-box');
          const doc=new DOMParser().parseFromString(setup.qrSvg,'image/svg+xml');
          if(doc.documentElement)qrWrap.append(document.importNode(doc.documentElement,true));
          const keyEl=el('p');keyEl.innerHTML='Manual key: <code>'+setup.secret.replace(/[<>&]/g,'')+'</code>';
          const code=field(box,'6-digit verification code','','text');code.inputMode='numeric';code.maxLength=10;code.placeholder='123456';
          box.prepend(qrWrap,keyEl);
          buttons(box,button('Verify & enable 2FA',async()=>{
            const res=await api('2fa',{action:'enable',code:code.value});
            dirty=false;
            box.replaceChildren(el('p','Google Authenticator is now enabled! Save these one-time backup codes in a safe place:'));
            const pre=el('pre',res.backupCodes.join('\n'),'backup-codes');box.append(pre);
            buttons(box,button('Done',()=>renderStatus({enabled:true,backupRemaining:res.backupCodes.length}),'secondary'));
            notice.textContent='Google Authenticator 2FA enabled.';
          },'primary'),button('Cancel',()=>renderStatus(state),'secondary'));
        },'primary'));
      }else{
        const code=field(box,'Enter 6-digit code or backup code to disable','','text');code.maxLength=16;
        buttons(box,button('Disable Google Authenticator',async()=>{
          const res=await api('2fa',{action:'disable',code:code.value});
          dirty=false;renderStatus(res);notice.textContent='Google Authenticator 2FA disabled.';
        },'secondary'));
      }
    };
    renderStatus(s);
  }
  async function securityShield(ticket){
    const s=await api('shield');if(ticket!==epoch)return;
    const c=card(panel,'Security shield & attack alerts');
    c.append(el('p','Protects studio sign-in and forms against brute-force logins, bot spam, and attack probes. Alerts are sent to the owner email when threats are blocked.'));
    const g=el('div',undefined,'fields');c.append(g);
    const activeWrap=el('label',undefined,'check');const activeBox=el('input');activeBox.type='checkbox';activeBox.checked=s.active;activeWrap.append(activeBox,document.createTextNode('Security shield active (auto-block & email alerts)'));
    const alertEmail=field(g,'Security alert email',s.alertEmail,'email');alertEmail.placeholder=s.effectiveEmail||'owner@example.com';
    g.append(activeWrap);
    const out=el('p',s.effectiveEmail?'Alerts will be sent to: '+s.effectiveEmail:'Set an owner email above (or in My account) to receive attack alert emails.','stamp');
    c.append(out);
    buttons(c,button('Save shield settings',async()=>{
      const updated=await api('shield',{active:activeBox.checked,alertEmail:alertEmail.value});
      dirty=false;out.textContent=updated.effectiveEmail?'Alerts will be sent to: '+updated.effectiveEmail:'Set an owner email above to receive attack alert emails.';
      notice.textContent='Security shield settings saved.';
    },'primary'),button('Send test alert email',async()=>{
      const res=await api('shield',{action:'test'});
      notice.textContent='Test security alert to '+res.to+': '+res.status+'.';
      await open('security');
    },'secondary'),button('Clear active IP blocks',async()=>{
      await api('shield',{action:'clear-blocks'});
      notice.textContent='All temporary IP blocks cleared.';
      await open('security');
    },'secondary'));
    await twoFactorCard(panel,ticket);
    const logCard=card(panel,'Recent blocked threats & security events');
    if(!s.events.length)logCard.append(el('p','No security threats or blocks recorded yet.'));
    for(const ev of s.events){
      const row=el('div',undefined,'panel-row'),h=el('div',undefined,'section-head');
      h.append(el('strong',ev.reason),el('span',stamp(ev.at),'stamp'));
      row.append(h,el('p',[ev.target?'Target: '+ev.target:'',ev.ip?'IP: '+ev.ip:'',ev.detail].filter(Boolean).join(' · ')));
      logCard.append(row);
    }
  }
  const permDefs=[['overview','Overview & analytics'],['pages','Page editor'],['company','Brand & company'],['pricing','Services & AMC'],['requests','Quote requests'],['connections','Integrations'],['team','Team access'],['security','Security shield'],['activity','Activity log'],['profile','My account']];
  function permPicker(parent,selected=['pages']){
    const set=new Set(selected),wrap=el('div',undefined,'perm-grid'),boxes=new Map();
    for(const [key,label] of permDefs){
      const lbl=el('label',undefined,'check'),cb=el('input');cb.type='checkbox';cb.checked=set.has(key);
      lbl.append(cb,document.createTextNode(label));wrap.append(lbl);boxes.set(key,cb);
    }
    parent.append(wrap);
    return ()=>{const out=[];for(const [k,cb] of boxes)if(cb.checked)out.push(k);return out.length?out:['pages']};
  }
  async function team(ticket){
    const r=await api('staff');if(ticket!==epoch)return;
    const split=el('div',undefined,'team-layout');panel.append(split);
    const create=card(split,'Create a team account');create.append(el('p','Create a team login and choose which studio sections they can access.'));
    const grid=el('div',undefined,'fields');create.append(grid);
    const name=field(grid,'Full name',''),login=field(grid,'Username',''),email=field(grid,'Work email','','email'),pw=secret(grid,'Password','At least 15 characters'),confirm=secret(grid,'Confirm password');
    create.append(el('p','Allowed sections:','stamp'));
    const readCreatePerms=permPicker(create,['pages']);
    buttons(create,button('Create account',async()=>{if(pw.value!==confirm.value)throw Error('The passwords do not match.');await api('staff',{action:'create',name:name.value,username:login.value,email:email.value,password:pw.value,permissions:readCreatePerms()});await open('team');notice.textContent='Team account created with selected permissions.'},'primary'));
    const roster=card(split,'Team directory');if(!r.items.length)roster.append(el('p','Your team accounts will appear here.'));
    for(const row of r.items){
      const item=el('div',undefined,'panel-row'),h=el('div',undefined,'section-head'),chips=el('div',undefined,'section-head');
      chips.append(el('span',row.status,'status-chip'));
      if(row.totpEnabled)chips.append(el('span','2FA on','status-chip'));
      if(row.resetRequestedAt)chips.append(el('span','Reset requested','stage-pill'));
      h.append(el('strong',row.name),chips);
      item.append(h,el('p',[row.username,row.email].filter(Boolean).join(' · ')));
      const pChips=el('div',undefined,'perm-chips');
      for(const p of (row.permissions||['pages'])){const lbl=permDefs.find(([k])=>k===p)?.[1]||p;pChips.append(el('span',lbl,'perm-chip'))}
      item.append(pChips);
      if(row.resetRequestedAt){
        item.append(el('p','Password reset requested on '+stamp(row.resetRequestedAt)+(row.resetNote?' — "'+row.resetNote+'"':''),'hint'));
      }
      const permDetails=el('details');permDetails.append(el('summary','Edit section access'));
      const readRowPerms=permPicker(permDetails,row.permissions||['pages']);
      buttons(permDetails,button('Save permissions',async()=>{await api('staff',{action:'permissions',email:row.email,permissions:readRowPerms()});await open('team');notice.textContent='Permissions updated for '+row.name+'.'},'primary'));
      item.append(permDetails);
      const linkOut=el('p',undefined,'stamp');item.append(linkOut);
      const acts=[];
      if(row.status==='Active')acts.push(button('Send reset link',async()=>{
        const res=await api('staff',{action:'reset-link',email:row.email});
        const url=location.origin+'/admin/#reset='+res.resetToken+'&email='+encodeURIComponent(res.email);
        linkOut.textContent='One-time reset link (email: '+res.emailStatus+'): '+url;
        notice.textContent='Password reset link generated for '+row.email+'.';
      },'secondary'));
      if(row.resetRequestedAt)acts.push(button('Dismiss request',async()=>{await api('staff',{action:'dismiss-reset',email:row.email});await open('team')},'secondary'));
      if(['Active','Invited'].includes(row.status))acts.push(button('Revoke access',async()=>{if(confirmAccess(row.email)){await api('staff',{action:'revoke',email:row.email});await open('team')}}));
      if(acts.length)buttons(item,...acts);
      roster.append(item);
    }
  }
  function confirmAccess(email){return window.confirm('Revoke studio access for '+email+'?')}
  const stages=['Received','In review','Contacted','Scheduled','Completed','Cancelled','Closed'];
  function stageBadge(status){const n=el('span',status,'stage-pill');n.dataset.stage=status;return n}
  function metric(parent,label,count){const tile=el('article',undefined,'desk-metric');tile.append(el('span',label),el('strong',String(count||0)));parent.append(tile)}
  function facts(parent,pairs){const dl=el('dl',undefined,'desk-facts');for(const [k,v] of pairs)if(v){dl.append(el('dt',k),el('dd',v))}parent.append(dl)}
  async function inbox(ticket){
    const stats=el('section',undefined,'desk-metrics'),shell=el('div',undefined,'desk-layout');stats.setAttribute('aria-label','Quote totals');panel.append(stats,shell);
    const queue=card(shell,'Request inbox'),tools=el('form',undefined,'desk-tools'),list=el('div',undefined,'case-list'),detail=card(shell,'Request details');queue.append(tools,list);
    const search=field(tools,'Search requests','','search');search.placeholder='Name, service, email or area';search.maxLength=100;
    const filter=field(tools,'Status','All statuses','text',['All statuses',...stages]);
    const apply=el('button','Search','btn secondary');apply.type='submit';tools.append(apply);tools.oninput=e=>e.stopPropagation();
    let query='',stage='',cursor=null,selected='',items=[],revision=0;
    const csvBtn=button('Export CSV',()=>{
      const escCsv=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
      const head=['Created','Name','Email','Phone','Service','Area','Property','Status','Source','Device','Receipt'];
      const lines=[head.join(','),...items.map(r=>[r.created,r.name,r.email,r.phone,r.service||'Service quote',r.area,r.property,r.status,r.source||'Direct',r.device||'',r.receipt].map(escCsv).join(','))];
      const blob=new Blob([lines.join('\n')],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=el('a');
      a.href=url;a.download='servicebay-requests.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);
    },'secondary');
    queue.insertBefore(csvBtn,list);
    tools.onsubmit=e=>{e.preventDefault();query=search.value.trim();stage=filter.value==='All statuses'?'':filter.value;refresh().catch(e=>notice.textContent=e.message)};filter.onchange=()=>tools.requestSubmit();
    async function refresh(more=false){
      const seq=++revision,params=new URLSearchParams({q:query,status:stage});if(more&&cursor)params.set('cursor',cursor);
      const r=await api('inbox?'+params);if(ticket!==epoch||seq!==revision)return;
      stats.replaceChildren();const counts=r.counts||{};
      metric(stats,'All requests',Object.values(counts).reduce((a,b)=>a+b,0));metric(stats,'New requests',counts.Received);metric(stats,'In progress',(counts['In review']||0)+(counts.Contacted||0));metric(stats,'Scheduled',counts.Scheduled);
      items=more?items.concat(r.items):r.items;cursor=r.next;
      if(!items.some(v=>v.key===selected))selected=items[0]?.key||'';
      render();
    }
    function render(){
      list.replaceChildren();
      if(!items.length)list.append(el('p','No matching requests.','empty-state'));
      for(const row of items){const b=el('button',undefined,'case-choice'),top=el('span',undefined,'case-line'),bottom=el('span',undefined,'case-line');b.type='button';b.setAttribute('aria-pressed',String(row.key===selected));top.append(el('strong',row.name),stageBadge(row.status));bottom.append(el('span',(row.service||'Service quote')+' · '+(row.source||'Direct')),el('small',new Date(row.created).toLocaleDateString()));b.append(top,bottom);b.onclick=()=>{selected=row.key;render();if(matchMedia('(max-width:780px)').matches)detail.scrollIntoView({block:'start'})};list.append(b)}
      if(cursor)list.append(button('Load more requests',()=>refresh(true)));
      detail.replaceChildren();
      const row=items.find(v=>v.key===selected);if(!row){detail.append(el('h2','Request details'),el('p','Select a request to view its details.'));return}
      const head=el('div',undefined,'section-head');head.append(el('h2',row.service||'Service quote'),stageBadge(row.status));detail.append(head,el('p',row.name,'case-client'));
      const erpText=row.erpId?('Delivered (#'+row.erpId+')'):(row.erpError?('Sync failed: '+row.erpError):'Stored on website');
      const srcText=[row.source||'Direct',row.medium,row.campaign,row.device].filter(Boolean).join(' · ');
      facts(detail,[['Email',row.email],['Phone',row.phone],['Source',srcText],['Preferred slot',row.slot],['Schedule',row.schedule],['Area',row.area],['Property',row.property],['Country',row.country],['Received',new Date(row.created).toLocaleString()],['Receipt email',row.emailState],['ServiceHub',erpText]]);
      if(row.photo){const pWrap=el('div');const pLink=el('a','View uploaded photo');pLink.href=row.photo;pLink.target='_blank';pLink.rel='noopener';const img=document.createElement('img');img.src=row.photo;img.alt='Customer uploaded photo';img.style.cssText='display:block;max-width:260px;max-height:180px;border-radius:8px;margin:.45rem 0';pWrap.append(pLink,img);detail.append(pWrap)}
      if(row.details||row.message){const text=el('details'),s=el('summary','Request description');text.append(s,el('p',row.details||row.message,'preserve-lines'));text.open=true;detail.append(text)}
      const state=field(detail,'Request status',row.status,'text',stages);state.oninput=e=>e.stopPropagation();
      const actions=[button('Update status',async()=>{const res=await api('request',{key:row.key,previous:row.status,status:state.value});await refresh();notice.textContent='Request status updated.'+(res.emailStatus?' (Email: '+res.emailStatus+')':'')},'primary')];
      if(row.email&&!['Accepted','Needs delivery check'].includes(row.emailState))actions.push(button('Send receipt email',async()=>{const v=await api('request',{key:row.key,action:'email'});await refresh();notice.textContent='Receipt email: '+v.status+'.'}));
      if(cfg.integrations.canSync&&!row.erpId)actions.push(button('Send to ServiceHub',async()=>{await api('request',{key:row.key,action:'sync'});await refresh();notice.textContent='Sent to ServiceHub ERP.'}));buttons(detail,...actions);
      const hist=row.history||[{status:'Received',at:row.created}];const activity=el('div',undefined,'case-activity');activity.append(el('h3','Request activity'));
      for(const event of [...hist].reverse()){const line=el('p');line.append(el('strong',event.status),el('small',new Date(event.at).toLocaleString()));activity.append(line)}detail.append(activity);
    }
    await refresh();
  }

  document.querySelector('#navigation').onclick=e=>{const n=e.target.closest('[data-tab]');if(n&&discard())open(n.dataset.tab).catch(e=>notice.textContent=e.message)};
  by('studio-logout').onclick=async()=>{if(!discard())return;try{const res=await fetch('/api/studio-auth/logout',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});if(!res.ok)throw Error('Sign out failed.');dirty=false;location.replace('/admin/')}catch(e){notice.textContent=e.message}};
  const IDLE_MS=1800000;let lastActive=Date.now(),lastPing=Date.now(),lastAutoSync=Date.now();
  const markActive=()=>{lastActive=Date.now()};
  for(const ev of ['pointerdown','keydown','mousemove','scroll','touchstart'])window.addEventListener(ev,markActive,{passive:true});
  setInterval(async()=>{
    const idle=Date.now()-lastActive;
    if(idle>=IDLE_MS){
      dirty=false;
      try{await fetch('/api/studio-auth/logout',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})}catch{}
      location.replace('/admin/#timeout=1');
      return;
    }
    if(idle<60000&&Date.now()-lastPing>=300000){
      lastPing=Date.now();
      fetch('/api/admin/state').then(r=>{if(r.status===401){dirty=false;location.replace('/admin/#timeout=1')}}).catch(()=>{});
    }
    if(cfg?.integrations?.canSync&&cfg.integrations.autoSync!==false&&Date.now()-lastAutoSync>=120000){
      lastAutoSync=Date.now();
      api('erp',{action:'auto-tick'}).then(r=>{if(r?.state)cfg.integrations=r.state}).catch(()=>{});
    }
  },30000);
  api('state').then(async x=>{cfg=x;try{const sp=await api('studio-prefs');if(sp&&Object.keys(sp).length)applyStudioPrefs(sp)}catch{}const h=location.hash.slice(1);const firstTab=cfg.user.role==='owner'?(Object.hasOwn(titles,h)?h:'overview'):((cfg.user.permissions?.includes(h)||h==='security2fa')?h:(cfg.user.permissions?.[0]||'pages'));await open(firstTab)}).catch(e=>notice.textContent=e.message);
})();
