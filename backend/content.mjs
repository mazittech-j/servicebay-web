import {cleanTypography,typographyCSS} from './typography.mjs';
import {catalog,addCustomToPage} from './catalog.mjs';
import {pricing} from './generated.mjs';
import {parseHTML} from 'linkedom';
export const EMPTY_PAGE={title:'',description:'',changes:{},sections:[],hidden:[]};
export const defaults={pricing,typography:{},social:[],menu:[],currencies:[],banners:[],aboutPhotos:[],clientLogos:[],serviceAreas:[],visitSchedules:[],googleReviews:{enabled:true,profileUrl:'',placeId:'',apiKey:'',items:[]},name:'ServiceBay',logo:'/assets/servicebay-wordmark.webp',favicon:'/assets/servicebay-favicon.png',hours:'Mon–Sat, 8:00 AM–6:00 PM',phone:'+971562014647',whatsapp:'971562014647',email:'maz.ittech@gmail.com',address:'Office 410, Opal Tower, Business Bay, Dubai, United Arab Emirates',font:'Site default',size:16,color:'#ac3212',paper:'#f9f8f5',ink:'#191917',dark:'#211f1c',tint:'#f0ede6',muted:'#55534e',line:'#dedbd4',ga:'',ads:'',pixel:'',tiktok:'',gtm:'',verification:''};
export const fonts=['Site default','Segoe UI','Arial','Georgia','Verdana','Tahoma'];
export const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status})};
export function txt(value,max=3000){if(typeof value!=='string'||value.length>max)fail('Check field length.');return value.trim()}
export function imageUrl(s){s=txt(s,1500);if(!/^\/(assets|media)\/[\w./-]+$/.test(s)&&!/^https:\/\/[^\s"<>\\]+$/i.test(s))fail('Use a site image or an HTTPS image URL.');return s}
export function cleanSettings(x){
  const out={};
  for(const k of Object.keys(defaults).filter(k=>!['pricing','typography','social','menu','currencies','banners','aboutPhotos','clientLogos','serviceAreas','visitSchedules','googleReviews'].includes(k))) out[k]=k==='size'?Number(x[k]??defaults.size):txt(x[k]??defaults[k],(k==='logo'||k==='favicon')?1500:k==='address'?300:120);
  out.typography=cleanTypography(x.typography,fail);
  out.pricing=catalog(x.pricing||pricing,pricing,fail);
  out.social=Array.isArray(x.social)?x.social.slice(0,15).map(s=>({label:txt(String(s?.label||''),40),url:txt(String(s?.url||''),300)})).filter(s=>s.label&&/^https:\/\//i.test(s.url)):[];
  out.menu=Array.isArray(x.menu)?x.menu.slice(0,20).map(m=>({label:txt(String(m?.label||''),40),href:txt(String(m?.href||''),200),enabled:m?.enabled!==false})).filter(m=>m.label&&(/^\/[^\s"<>\\]*$/.test(m.href)||/^https:\/\//i.test(m.href))):[];
  out.currencies=Array.isArray(x.currencies)?x.currencies.slice(0,20).map(c=>({code:txt(String(c?.code||''),8).toUpperCase(),name:txt(String(c?.name||''),40),currency:txt(String(c?.currency||''),8).toUpperCase(),rate:Number(c?.rate||0)})).filter(c=>/^[A-Z0-9]{2,6}$/.test(c.code)&&c.name&&/^[A-Z]{3}$/.test(c.currency)&&Number.isFinite(c.rate)&&c.rate>0):[];
  out.banners=Array.isArray(x.banners)?x.banners.slice(0,8).map(b=>({image:b?.image?imageUrl(String(b.image)):'',label:txt(String(b?.label||''),60),kicker:txt(String(b?.kicker||''),80),title:txt(String(b?.title||''),140),description:txt(String(b?.description||''),300),position:txt(String(b?.position||'center'),40)||'center'})).filter(b=>b.image):[];
  out.aboutPhotos=Array.isArray(x.aboutPhotos)?x.aboutPhotos.slice(0,3).map(p=>({src:p?.src?imageUrl(String(p.src)):'',alt:txt(String(p?.alt||''),200)})).filter(p=>p.src):[];
  out.clientLogos=Array.isArray(x.clientLogos)?x.clientLogos.slice(0,25).map(l=>({name:txt(String(l?.name||''),80),image:l?.image?imageUrl(String(l.image)):'',dark:Boolean(l?.dark)})).filter(l=>l.name&&l.image):[];
  out.serviceAreas=Array.isArray(x.serviceAreas)?[...new Set(x.serviceAreas.slice(0,80).map(a=>txt(String(a||''),80)).filter(Boolean))]:[];
  out.visitSchedules=Array.isArray(x.visitSchedules)?x.visitSchedules.slice(0,12).map(v=>({id:txt(String(v?.id||v?.label||''),40).toLowerCase().replace(/[^a-z0-9-]+/g,'-')||'custom',label:txt(String(v?.label||''),60),count:Math.max(1,Math.min(365,Number(v?.count||1)))})).filter(v=>v.label):[];
  const gr=x.googleReviews&&typeof x.googleReviews==='object'?x.googleReviews:{};
  out.googleReviews={
    enabled:gr.enabled!==false,
    profileUrl:gr.profileUrl&&/^https:\/\//i.test(String(gr.profileUrl).trim())?txt(String(gr.profileUrl),500):'',
    placeId:txt(String(gr.placeId||''),120),
    apiKey:txt(String(gr.apiKey||''),120),
    items:Array.isArray(gr.items)?gr.items.slice(0,20).map(r=>({author:txt(String(r?.author||''),80),rating:Math.max(1,Math.min(5,Math.round(Number(r?.rating||5)))),text:txt(String(r?.text||''),600),time:txt(String(r?.time||''),40)})).filter(r=>r.author&&r.text):[]
  };
  out.logo=imageUrl(out.logo);
  out.favicon=imageUrl(out.favicon||defaults.favicon);
  if(!out.name||!out.address||!/^(\+)[1-9]\d{6,14}$/.test(out.phone)||!/^[1-9]\d{6,14}$/.test(out.whatsapp)||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(out.email))fail('Check company name, address, email and international numbers.');
  if(!fonts.includes(out.font)||!Number.isInteger(out.size)||out.size<14||out.size>24||![out.color,out.paper,out.ink,out.dark,out.tint,out.muted,out.line].every(v=>/^#[a-f\d]{6}$/i.test(v)))fail('Check your theme settings.');
  for(const [key,re] of [['ga',/^G-[A-Z0-9]+$/],['ads',/^AW-\d+$/],['pixel',/^\d{6,25}$/],['tiktok',/^[A-Z0-9]{10,30}$/],['gtm',/^GTM-[A-Z0-9]+$/],['verification',/^[\w-]+$/]])if(out[key]&&!re.test(out[key]))fail('Invalid '+key+' ID.');
  return out;
}
export function cleanPage(x){
  if(!x||!Array.isArray(x.sections)||x.sections.length>35||!Array.isArray(x.hidden)||x.hidden.length>100||!x.changes||Object.keys(x.changes).length>450)fail('Page content exceeds the editing limit.');
  const changes={};
  for(const [k,v] of Object.entries(x.changes)){
    if(!/^f-[a-z0-9]+-\d+$/.test(k))fail('Invalid field.');
    changes[k]=typeof v==='string'?txt(v):{src:imageUrl(v.src),alt:txt(v.alt,280)};
  }
  return {title:txt(x.title,160),description:txt(x.description,360),hidden:x.hidden.map(k=>{if(!/^s-[a-z0-9]+-\d+$/.test(k))fail('Invalid section.');return k}),sections:x.sections.map(s=>{const heading=txt(s.heading,180);if(!heading)fail('Give each added section a heading.');return {heading,body:txt(s.body,5000),image:s.image?imageUrl(s.image):'',alt:txt(s.alt||'',280)}}),changes};
}
function hash(s){let h=2166136261;for(let i=0;i<s.length;i++)h=Math.imul(h^s.charCodeAt(i),16777619);return (h>>>0).toString(36)}
const css=(d,s)=>{const el=d.createElement('style');el.textContent=s;d.head.append(el)};
function append(d,parent,tag,content){const el=d.createElement(tag);el.textContent=content;parent.append(el);return el}
function meta(d,key,value){for(const el of d.querySelectorAll('meta[name="'+key+'"],meta[property="'+key+'"]'))el.setAttribute('content',value)}
export function renderPage(html,settings,page,editing=false){
  const {document:d}=parseHTML(html);
  const main=d.querySelector('main')||d.querySelector('article');
  if(!main)return html;
  const s={...defaults,...settings},p={...EMPTY_PAGE,...page},counts=new Map();
  function id(prefix,seed){const part=prefix+'-'+hash(seed),n=counts.get(part)||0;counts.set(part,n+1);return part+'-'+n}
  const fieldChanges=new Map();
  for(const el of main.querySelectorAll('h1,h2,h3,h4,p,li,summary,dt,dd,figcaption')){
    if(!el.children.length||el.closest('form,dialog,svg'))continue;
    for(const node of [...el.childNodes])if(node.nodeType===3&&node.textContent.trim()){const span=d.createElement('span');span.textContent=node.textContent;el.replaceChild(span,node)}
  }
  for(const el of main.querySelectorAll('h1,h2,h3,h4,p,li,dt,dd,summary,figcaption,a,img,strong,span')){
    const img=el.localName==='img';
    if(el.closest('form,dialog,svg,[data-calculator],script')||(!img&&(el.children.length||!el.textContent.trim())))continue;
    const old=img?el.getAttribute('src'):el.textContent.trim(),key=id('f',el.localName+'|'+old);
    if(editing)el.setAttribute('data-studio-field',key);
    const val=p.changes[key];if(val===undefined)continue;
    if(img&&typeof val==='object'){el.setAttribute('src',val.src);el.removeAttribute('srcset');el.setAttribute('alt',val.alt)}
    if(!img&&typeof val==='string'){fieldChanges.set(old,val);el.textContent=val}
  }
  const sections=[...main.children].filter(el=>['section','article','div'].includes(el.localName));
  for(const el of sections){const key=id('s',el.id||el.className||el.localName);if(editing){el.setAttribute('data-studio-section',key);el.setAttribute('data-studio-label',el.querySelector('h1,h2,h3')?.textContent||el.id||'Page section');if(p.hidden.includes(key))el.setAttribute('data-studio-hidden','yes')}else if(p.hidden.includes(key))el.remove()}
  for(const item of p.sections){const sec=d.createElement('section');sec.className='section wrap cms-section';append(d,sec,'h2',item.heading);for(const para of item.body.split(/\n\s*\n/))if(para)append(d,sec,'p',para);if(item.image){const img=d.createElement('img');img.setAttribute('src',item.image);img.setAttribute('alt',item.alt);img.setAttribute('loading','lazy');sec.append(img)}main.append(sec)}
  const replacements=new Map();
  if(s.hours!==defaults.hours)replacements.set(defaults.hours,s.hours);
  if(s.name!==defaults.name)replacements.set('ServiceBay',s.name);
  if(s.phone!==defaults.phone){for(const t of ['+971 56 201 4647','056 201 4647',defaults.phone])replacements.set(t,s.phone)}
  if(s.address!==defaults.address){replacements.set(defaults.address,s.address);replacements.set('Office 410, Opal Tower, Business Bay',s.address)}
  if(s.email!==defaults.email)replacements.set(defaults.email,s.email);
  const substitute=value=>{let v=value;for(const [a,b] of replacements)if(v.includes(a)){v=v.split(a).join(b);if(a.includes('Office 410'))break}return v};
  if(replacements.size){const walk=el=>{for(const child of el.childNodes){if(child.nodeType===3)child.textContent=substitute(child.textContent);else if(child.nodeType===1&&!['script','style','svg'].includes(child.localName))walk(child)}};walk(d.body)}
  for(const el of d.querySelectorAll('[href],[data-whatsapp],iframe[src],img[alt]')){
    for(const key of ['href','data-whatsapp','src','alt']){
      const value=el.getAttribute(key);if(!value)continue;
      if(value.startsWith('tel:')&&s.phone!==defaults.phone)el.setAttribute(key,'tel:'+s.phone);
      else if(value.startsWith('mailto:')&&s.email!==defaults.email)el.setAttribute(key,'mailto:'+s.email);
      else if(value.startsWith('https://wa.me/'+defaults.whatsapp)&&s.whatsapp!==defaults.whatsapp)el.setAttribute(key,value.replace('wa.me/'+defaults.whatsapp,'wa.me/'+s.whatsapp));
      else if(s.address!==defaults.address&&/google\.[^/]+\/maps|maps\.google\./.test(value)){const u=new URL(value);u.searchParams.set(u.searchParams.has('destination')?'destination':u.searchParams.has('query')?'query':'q',s.address);el.setAttribute(key,u.href)}
      else if(key==='alt'&&s.name!==defaults.name)el.setAttribute(key,substitute(value));
    }
  }
  if(s.logo!==defaults.logo)for(const img of d.querySelectorAll('.brand img,.ar-header img[src="/assets/servicebay-wordmark.webp"]')){img.setAttribute('src',s.logo);img.setAttribute('alt',s.name)}
  const money=new Intl.NumberFormat('en-AE',{style:'currency',currency:'AED',currencyDisplay:'code'});
  for(const [key,v] of Object.entries(s.pricing||{})){
    const base=pricing[key];if(!base){addCustomToPage(d,key,v,money);continue}
    if(v.active===false){
      for(const field of d.querySelectorAll('option[value="'+key+'"]'))field.remove();
      d.querySelector('.amc-tier-'+key)?.remove();
      for(const radio of d.querySelectorAll('input[name="amc"][value="'+key+'"]'))radio.closest('label')?.remove();
      continue;
    }
    if(v.name===base.name&&v.rate===base.rate)continue;
    for(const field of d.querySelectorAll('option[value="'+key+'"]')){if(field.hasAttribute('data-rate'))field.setAttribute('data-rate',v.rate);field.textContent=v.name}
    const tier=d.querySelector('.amc-tier-'+key);
    if(tier){tier.querySelector('h3').textContent=v.name;const price=tier.querySelector('[data-annual-rate]');price.setAttribute('data-annual-rate',v.rate);price.textContent=money.format(v.rate);tier.querySelector('[data-amc-plan]').textContent='Choose '+v.name}
    for(const radio of d.querySelectorAll('input[name="amc"][value="'+key+'"]')){radio.setAttribute('data-title',v.name);radio.setAttribute('data-rate',v.rate);const wrap=radio.closest('label');wrap.querySelector('strong').textContent=v.name;wrap.querySelector('[data-plan-price]').textContent=money.format(v.rate)+' / unit / year'}
  }
  const calc=d.querySelector('form.calculator'),first=calc?.querySelector('select[name="core"] option[data-rate]');
  if(first){const round=n=>Math.round(n*100)/100,base=Number(first.getAttribute('data-rate')),fee=round(base*Number(calc.getAttribute('data-handling-rate'))),tax=round((base+fee)*.05);for(const [key,value] of Object.entries({subtotal:base,handling:fee,tax,total:base+fee+tax})){const e=calc.querySelector('.estimate-'+key);if(e)e.textContent=money.format(value)}}
  const title=p.title||substitute(d.title);d.title=title;
  meta(d,'og:title',title);meta(d,'twitter:title',title);meta(d,'og:site_name',s.name);
  const desc=p.description||substitute(d.querySelector('meta[name="description"]')?.getAttribute('content')||'');for(const k of ['description','og:description','twitter:description'])meta(d,k,desc);
  for(const el of d.querySelectorAll('script[type="application/ld+json"]')){
    const v=JSON.parse(el.textContent,(k,x)=>typeof x==='string'&&!x.startsWith('https://')?(fieldChanges.get(x)??substitute(x)):x);
    for(const n of v['@graph']||[]){if(n['@type']==='HomeAndConstructionBusiness'){n.name=s.name;if(s.hours!==defaults.hours){delete n.openingHours}if(s.logo!==defaults.logo)n.logo=new URL(s.logo,n.url).href;n.email=s.email;n.telephone=s.phone;if(s.address!==defaults.address)n.address.streetAddress=s.address}if(n['@id']?.endsWith('#page')){n.name=title;n.description=desc}if(n['@type']==='Service')n.description=desc}
    el.textContent=JSON.stringify(v).replace(/</g,'\\u003c');
  }
  if(Array.isArray(s.social)&&s.social.length){
    const fc=d.querySelector('.footer-dispatch .footer-contact')||d.querySelector('.site-footer');
    if(fc){for(const item of s.social){const li=d.createElement('li'),a=d.createElement('a');a.setAttribute('href',item.url);a.setAttribute('target','_blank');a.setAttribute('rel','noopener noreferrer');a.textContent=item.label;li.append(a);fc.append(li)}}
  }
  if(Array.isArray(s.menu)&&s.menu.length){
    const navEl=d.querySelector('#navigation');
    if(navEl){
      const mob=navEl.querySelector('.mobile-tools');
      for(const child of [...navEl.childNodes]){if(child!==mob)child.remove()}
      for(const m of s.menu){if(m.enabled===false)continue;const a=d.createElement('a');a.setAttribute('href',m.href);a.textContent=m.label;if(m.href.startsWith('https://')){a.setAttribute('target','_blank');a.setAttribute('rel','noopener noreferrer')}if(mob)navEl.insertBefore(a,mob);else navEl.append(a)}
    }
  }
  if(Array.isArray(s.currencies)&&s.currencies.length){
    for(const sel of d.querySelectorAll('select[data-region-select],select[name="country"]')){
      for(const c of s.currencies){if(sel.querySelector('option[value="'+c.code+'"]'))continue;const opt=d.createElement('option');opt.setAttribute('value',c.code);opt.textContent=c.name+' ('+c.currency+')';sel.append(opt)}
    }
    for(const cl of d.querySelectorAll('.country-list')){
      for(const c of s.currencies){if(cl.querySelector('button[data-country="'+c.code+'"]'))continue;const b=d.createElement('button');b.setAttribute('type','button');b.setAttribute('data-country',c.code);b.setAttribute('aria-pressed','false');const sp=d.createElement('span');sp.textContent=c.name;const sm=d.createElement('small');sm.textContent=c.currency;b.append(sp,sm);cl.append(b)}
    }
    meta(d,'sb-currencies',JSON.stringify(s.currencies));
  }
  if(s.favicon&&s.favicon!==defaults.favicon){for(const iconEl of d.querySelectorAll('link[rel="icon"],.servicebay-mark')){iconEl.setAttribute(iconEl.localName==='link'?'href':'src',s.favicon)}}
  if(Array.isArray(s.banners)&&s.banners.length){
    const bannerEl=d.querySelector('.home-banner');
    if(bannerEl){
      const media=bannerEl.querySelector('.banner-media'),sel=bannerEl.querySelector('.banner-selector');
      if(media){
        media.replaceChildren();
        s.banners.forEach((b,idx)=>{
          const slide=d.createElement('div');slide.className='banner-slide';slide.setAttribute('data-banner-slide','');slide.setAttribute('data-label',b.label||('Banner '+(idx+1)));slide.setAttribute('style','--banner-position:'+(b.position||'center'));if(idx>0)slide.setAttribute('hidden','');
          const img=d.createElement('img');img.setAttribute('src',b.image);img.setAttribute('width','1400');img.setAttribute('height','933');img.setAttribute('alt','');if(idx===0)img.setAttribute('fetchpriority','high');else img.setAttribute('loading','lazy');
          slide.append(img);media.append(slide);
        });
      }
      if(sel){
        const autoBtn=sel.querySelector('[data-banner-auto]');
        for(const b of [...sel.querySelectorAll('[data-banner-index]')])b.remove();
        s.banners.forEach((b,idx)=>{
          const btn=d.createElement('button');btn.setAttribute('type','button');btn.setAttribute('data-banner-index',String(idx));
          btn.setAttribute('data-copy',JSON.stringify({image:b.image,label:b.label||('Banner '+(idx+1)),kicker:b.kicker,title:b.title,description:b.description,position:b.position||'center'}));
          btn.setAttribute('title',b.label||('Banner '+(idx+1)));btn.setAttribute('aria-label',b.label||('Banner '+(idx+1)));if(idx===0)btn.setAttribute('aria-current','true');
          const thumb=d.createElement('img');thumb.setAttribute('src',b.image);thumb.setAttribute('width','46');thumb.setAttribute('height','32');thumb.setAttribute('alt','');
          btn.append(thumb);if(autoBtn)sel.insertBefore(btn,autoBtn);else sel.append(btn);
        });
      }
      const first=s.banners[0];
      const kicker=bannerEl.querySelector('[data-banner-kicker]'),h1=bannerEl.querySelector('#home-title'),desc=bannerEl.querySelector('[data-banner-description]');
      if(kicker&&first.kicker)kicker.textContent=first.kicker;
      if(h1&&first.title)h1.textContent=first.title;
      if(desc&&first.description)desc.textContent=first.description;
    }
  }
  if(Array.isArray(s.aboutPhotos)&&s.aboutPhotos.length){
    const aboutHero=d.querySelector('.about-cover-photo');
    if(aboutHero){
      if(s.aboutPhotos.length===1){
        aboutHero.setAttribute('src',s.aboutPhotos[0].src);aboutHero.setAttribute('alt',s.aboutPhotos[0].alt||'ServiceBay team');aboutHero.removeAttribute('srcset');
      }else{
        const gallery=d.createElement('div');gallery.className='about-cover-photo about-photo-grid about-photo-count-'+s.aboutPhotos.length;
        s.aboutPhotos.forEach((ph,idx)=>{
          const img=d.createElement('img');img.setAttribute('src',ph.src);img.setAttribute('alt',ph.alt||('About photo '+(idx+1)));img.setAttribute('loading',idx===0?'eager':'lazy');
          gallery.append(img);
        });
        aboutHero.replaceWith(gallery);
      }
    }
  }
  if(Array.isArray(s.clientLogos)&&s.clientLogos.length){
    const track=d.querySelector('.client-logos .logo-track');
    if(track){
      track.replaceChildren();
      [false,true].forEach(dup=>{
        const ul=d.createElement('ul');ul.className='logo-group';if(dup)ul.setAttribute('aria-hidden','true');
        for(const item of s.clientLogos){
          const li=d.createElement('li');if(item.dark)li.className='dark-logo';
          const img=d.createElement('img');img.setAttribute('src',item.image);img.setAttribute('alt',dup?'':item.name);img.setAttribute('width','150');img.setAttribute('height','56');img.setAttribute('loading','lazy');
          li.append(img);ul.append(li);
        }
        track.append(ul);
      });
    }
  }
  if(Array.isArray(s.serviceAreas)&&s.serviceAreas.length){
    for(const sel of d.querySelectorAll('#availability select[name="area"]')){
      const first=sel.querySelector('option[disabled]');
      sel.replaceChildren();
      if(first)sel.append(first);
      for(const area of s.serviceAreas){const opt=d.createElement('option');opt.textContent=area;sel.append(opt)}
    }
    let am=d.querySelector('meta[name="sb-areas"]');if(!am){am=d.createElement('meta');am.setAttribute('name','sb-areas');d.head.append(am)}
    am.setAttribute('content',JSON.stringify(s.serviceAreas));
  }
  if(Array.isArray(s.visitSchedules)&&s.visitSchedules.length){
    for(const grid of d.querySelectorAll('.amc-calendar .frequency-grid')){
      grid.replaceChildren();
      for(const f of s.visitSchedules){
        const a=d.createElement('a');a.setAttribute('href','/amc/?schedule='+encodeURIComponent(f.id)+'#plan-builder');
        const sp=d.createElement('span');sp.textContent=f.label;
        const sm=d.createElement('small');sm.textContent=f.count+' '+(f.count===1?'visit':'visits')+' per year';
        a.append(sp,sm);grid.append(a);
      }
    }
    for(const sel of d.querySelectorAll('select[name="schedule"],select[name="amc-visits"]')){
      const first=sel.querySelector('option[value=""]');
      sel.replaceChildren();if(first)sel.append(first);
      for(const f of s.visitSchedules){const opt=d.createElement('option');opt.setAttribute('value',f.id);opt.textContent=f.label+' ('+f.count+(f.count===1?' visit/year':' visits/year')+')';sel.append(opt)}
    }
  }
  const gr=s.googleReviews;
  if(gr){
    if(gr.enabled===false){for(const sec of d.querySelectorAll('.home-reviews'))sec.remove()}
    else if((gr.items&&gr.items.length)||(gr.placeId&&gr.apiKey)||gr.profileUrl){
      let sec=d.querySelector('.home-reviews');
      if(!sec&&d.querySelector('.home-banner')){
        sec=d.createElement('section');sec.className='section home-reviews';sec.setAttribute('aria-labelledby','review-title');
        const anchor=d.querySelector('.contact-strip')||d.querySelector('footer');
        if(anchor&&anchor.parentNode===main)main.insertBefore(sec,anchor);else main.append(sec);
      }
      if(sec){
        sec.removeAttribute('hidden');
        const wrap=d.createElement('div');wrap.className='wrap reviews-layout';
        const head=d.createElement('div');head.className='reviews-heading';
        const sh=d.createElement('div');sh.className='section-heading';
        const ey=d.createElement('p');ey.className='eyebrow';ey.textContent='Customer reviews';
        const h2=d.createElement('h2');h2.id='review-title';h2.textContent='Reviews on Google';
        sh.append(ey,h2);head.append(sh);
        if(gr.profileUrl){const lnk=d.createElement('a');lnk.className='inline-link';lnk.setAttribute('href',gr.profileUrl);lnk.setAttribute('target','_blank');lnk.setAttribute('rel','noopener noreferrer');lnk.textContent='Read reviews on Google Maps';head.append(lnk)}
        wrap.append(head);
        const car=d.createElement('div');car.className='review-carousel';
        if(gr.placeId&&gr.apiKey){car.setAttribute('data-reviews-key',gr.apiKey);car.setAttribute('data-place-id',gr.placeId)}
        const win=d.createElement('div');win.className='review-window';
        const track=d.createElement('div');track.className='review-track';
        if(gr.items&&gr.items.length){
          for(const rv of gr.items){
            const art=d.createElement('article');art.className='review-card';
            const stars=d.createElement('p');stars.className='review-stars';stars.setAttribute('aria-label',rv.rating+' out of 5 stars');stars.textContent='★'.repeat(rv.rating)+'☆'.repeat(5-rv.rating);
            const quote=d.createElement('blockquote');quote.textContent=rv.text;
            const foot=d.createElement('footer');const auth=d.createElement('strong');auth.textContent=rv.author;foot.append(auth);if(rv.time){const tm=d.createElement('span');tm.textContent=' · '+rv.time;foot.append(tm)}
            art.append(stars,quote,foot);track.append(art);
          }
        }
        win.append(track);car.append(win);wrap.append(car);sec.replaceChildren(wrap);
        if(gr.placeId&&gr.apiKey&&!d.querySelector('script[src="/google-reviews.js"]')){const sc=d.createElement('script');sc.setAttribute('src','/google-reviews.js');sc.setAttribute('defer','');sec.append(sc)}
      }
    }
  }
  if(s.verification){let v=d.querySelector('meta[name="google-site-verification"]');if(!v){v=d.createElement('meta');v.setAttribute('name','google-site-verification');d.head.append(v)}v.setAttribute('content',s.verification)}
  const font=s.font==='Site default'?'':';--sans:"'+s.font+'",sans-serif';
  css(d,':root{--accent:'+s.color+';--paper:'+s.paper+';--ink:'+s.ink+';--dark:'+(s.dark||defaults.dark)+';--tint:'+(s.tint||defaults.tint)+';--muted:'+(s.muted||defaults.muted)+';--line:'+(s.line||defaults.line)+font+';font-size:'+s.size/16*100+'%}.cms-section{max-width:78rem}.cms-section p{max-width:70ch;margin:1rem 0}.cms-section img{max-height:30rem;border-radius:1rem}.about-photo-grid{display:grid;gap:.6rem;height:100%}.about-photo-count-2{grid-template-columns:1fr 1fr}.about-photo-count-3{grid-template-columns:1fr 1fr}.about-photo-count-3 img:first-child{grid-column:1/-1;max-height:220px}.about-photo-grid img{width:100%;height:100%;object-fit:cover;border-radius:12px}.review-card{padding:1.25rem;border:1px solid var(--line);border-radius:14px;background:#fff;display:grid;gap:.6rem}.review-stars{color:#d97706;font-size:1.05rem;letter-spacing:.08em}'+(editing?'[data-studio-field]:hover{outline:2px dashed #d54517;cursor:crosshair}[data-studio-hidden]{opacity:.35}':''));
  const roleCSS=typographyCSS(s.typography,s.size);if(roleCSS)css(d,roleCSS);
  if(!editing&&(s.ga||s.ads||s.pixel||s.tiktok||s.gtm)){for(const el of d.querySelectorAll('script[src="/analytics.js"],.analytics-settings,.analytics-choices'))el.remove();const script=d.createElement('script');script.setAttribute('src','/studio-tracking.js');script.setAttribute('defer','');for(const k of ['ga','ads','pixel','tiktok','gtm'])if(s[k])script.setAttribute('data-'+k,s[k]);d.body.append(script)}
  return d.toString();
}
