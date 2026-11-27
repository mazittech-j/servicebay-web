const kinds=new Set(['service','plan']);
const sectors=['residential','commercial','industrial'];
export function catalog(input,base,fail){
  if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).length>150)fail('The catalog supports up to 150 prices.');
  const result={};
  for(const id of new Set([...Object.keys(base),...Object.keys(input)])){
    const original=Object.hasOwn(base,id)?base[id]:null,item=input[id]||original;
    if(!original&&!/^custom-[a-f0-9]{32}$/.test(id))fail('Invalid custom item ID.');
    const name=typeof item?.name==='string'?item.name.trim():'',rate=Number(item?.rate),kind=original?.kind||item?.kind;
    if(!name||name.length>80||!Number.isFinite(rate)||rate<.01||rate>10000000||!kinds.has(kind))fail('Each item needs a name, a type and a positive AED price.');
    result[id]={name,rate:Math.round(rate*100)/100,kind,...(item?.active===false?{active:false}:{})};
    if(!original){
      const detail=String(item.description||'').trim(),unit=String(item.unit||'Units').trim();
      if(!unit||unit.length>50||detail.length>400)fail('Check the item description and unit label.');
      const selected=kind==='service'?sectors.filter(s=>item.sectors?.includes(s)):sectors;
      if(!selected.length)fail('Select at least one property category.');
      Object.assign(result[id],{description:detail,unit,sectors:selected});
    }
  }
  return result;
}
export function addCustomToPage(d,id,item,money){
  if(item.active===false)return;
  const add=(parent,tag,text)=>{const n=d.createElement(tag);if(text)n.textContent=text;parent.append(n);return n};
  function option(select){const opt=add(select,'option',item.name);opt.setAttribute('value',id);return opt}
  if(item.kind==='service'){
    for(const s of d.querySelectorAll('select[name="service"]'))option(s);
    for(const s of d.querySelectorAll('select[name="core"]')){if(s.closest('form').hasAttribute('data-service'))continue;const opt=option(s);opt.setAttribute('data-rate',String(item.rate));opt.setAttribute('data-unit',item.unit);opt.setAttribute('data-limit','20');opt.setAttribute('data-sectors',item.sectors.join(' '))}
    return;
  }
  for(const s of d.querySelectorAll('select[name="plan"]'))option(s);
  for(const grid of d.querySelectorAll('.estimate-plan-grid')){
    const l=add(grid,'label'),input=add(l,'input');for(const [k,v] of Object.entries({type:'radio',name:'amc',value:id,'data-rate':item.rate,'data-title':item.name}))input.setAttribute(k,String(v));
    const copy=add(l,'span');add(copy,'strong',item.name);if(item.description)add(copy,'span',item.description).className='tier-focus';
    add(copy,'small',money.format(item.rate)+' / unit / year').setAttribute('data-plan-price','');
  }
  for(const grid of d.querySelectorAll('.amc-tier-grid')){
    const c=add(grid,'article');c.className='amc-tier';add(c,'h3',item.name);
    const price=add(c,'div');price.className='amc-tier-price';add(price,'strong',money.format(item.rate)).setAttribute('data-annual-rate',String(item.rate));add(price,'span','/ unit / year');
    if(item.description)add(c,'p',item.description);const a=add(c,'a','Choose '+item.name);a.className='button button-outline';a.setAttribute('href','?service=amc&plan='+id+'#plan-builder');a.setAttribute('data-amc-plan',id);
  }
}
