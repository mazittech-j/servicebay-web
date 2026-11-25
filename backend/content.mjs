import {cleanTypography,typographyCSS} from './typography.mjs';
import {catalog,addCustomToPage} from './catalog.mjs';
import {pricing} from './generated.mjs';
import {parseHTML} from 'linkedom';
export const EMPTY_PAGE={title:'',description:'',changes:{},sections:[],hidden:[]};
export const defaults={pricing,typography:{},name:'ServiceBay',logo:'/assets/servicebay-wordmark.webp',hours:'Mon–Sat, 8:00 AM–6:00 PM',phone:'+971562014647',whatsapp:'971562014647',email:'maz.ittech@gmail.com',address:'Office 410, Opal Tower, Business Bay, Dubai, United Arab Emirates',font:'Site default',size:16,color:'#ac3212',paper:'#f9f8f5',ink:'#191917',dark:'#211f1c',tint:'#f0ede6',muted:'#55534e',line:'#dedbd4',ga:'',ads:'',pixel:'',verification:''};
export const fonts=['Site default','Segoe UI','Arial','Georgia','Verdana','Tahoma'];
export const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status})};
export function txt(value,max=3000){if(typeof value!=='string'||value.length>max)fail('Check field length.');return value.trim()}
export function imageUrl(s){s=txt(s,1500);if(!/^\/(assets|media)\/[\w./-]+$/.test(s)&&!/^https:\/\/[^\s"<>\\]+$/i.test(s))fail('Use a site image or an HTTPS image URL.');return s}
export function cleanSettings(x){
  const out={};
  for(const k of Object.keys(defaults).filter(k=>k!=='pricing'&&k!=='typography')) out[k]=k==='size'?Number(x[k]??defaults.size):txt(x[k]??defaults[k],k==='logo'?1500:k==='address'?300:120);
  out.typography=cleanTypography(x.typography,fail);
  out.pricing=catalog(x.pricing||pricing,pricing,fail);
  out.logo=imageUrl(out.logo);
  if(!out.name||!out.address||!/^(\+)[1-9]\d{6,14}$/.test(out.phone)||!/^[1-9]\d{6,14}$/.test(out.whatsapp)||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(out.email))fail('Check company name, address, email and international numbers.');
  if(!fonts.includes(out.font)||!Number.isInteger(out.size)||out.size<14||out.size>24||![out.color,out.paper,out.ink,out.dark,out.tint,out.muted,out.line].every(v=>/^#[a-f\d]{6}$/i.test(v)))fail('Check your theme settings.');
  for(const [key,re] of [['ga',/^G-[A-Z0-9]+$/],['ads',/^AW-\d+$/],['pixel',/^\d{6,25}$/],['verification',/^[\w-]+$/]])if(out[key]&&!re.test(out[key]))fail('Invalid '+key+' ID.');
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
    const base=pricing[key];if(!base){addCustomToPage(d,key,v,money);continue}if(v.name===base.name&&v.rate===base.rate)continue;
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
  if(s.verification){let v=d.querySelector('meta[name="google-site-verification"]');if(!v){v=d.createElement('meta');v.setAttribute('name','google-site-verification');d.head.append(v)}v.setAttribute('content',s.verification)}
  const font=s.font==='Site default'?'':';--sans:"'+s.font+'",sans-serif';
  css(d,':root{--accent:'+s.color+';--paper:'+s.paper+';--ink:'+s.ink+';--dark:'+(s.dark||defaults.dark)+';--tint:'+(s.tint||defaults.tint)+';--muted:'+(s.muted||defaults.muted)+';--line:'+(s.line||defaults.line)+font+';font-size:'+s.size/16*100+'%}.cms-section{max-width:78rem}.cms-section p{max-width:70ch;margin:1rem 0}.cms-section img{max-height:30rem;border-radius:1rem}'+(editing?'[data-studio-field]:hover{outline:2px dashed #d54517;cursor:crosshair}[data-studio-hidden]{opacity:.35}':''));
  const roleCSS=typographyCSS(s.typography,s.size);if(roleCSS)css(d,roleCSS);
  if(!editing&&(s.ga||s.ads||s.pixel)){for(const el of d.querySelectorAll('script[src="/analytics.js"],.analytics-settings,.analytics-choices'))el.remove();const script=d.createElement('script');script.setAttribute('src','/studio-tracking.js');script.setAttribute('defer','');for(const k of ['ga','ads','pixel'])script.setAttribute('data-'+k,s[k]);d.body.append(script)}
  return d.toString();
}
