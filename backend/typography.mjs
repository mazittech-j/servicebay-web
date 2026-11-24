export const typeRoles=[
  {key:'h1',label:'Page title (H1)',min:24,max:104,selector:'h1'},
  {key:'h2',label:'Section title (H2)',min:20,max:78,selector:'h2'},
  {key:'h3',label:'Card title (H3–H4)',min:16,max:52,selector:'h3,h4'},
  {key:'body',label:'Body text',min:14,max:30,selector:'main p:not(.eyebrow),main li,main dd,article p:not(.eyebrow)'},
  {key:'nav',label:'Navigation',min:14,max:26,selector:'#navigation a,#navigation button,#navigation summary,.ar-header nav a'},
  {key:'button',label:'Buttons',min:14,max:30,selector:'.button,main button,dialog button'},
  {key:'form',label:'Form labels and fields',min:14,max:28,selector:'form label,form input,form textarea,form select,form legend'},
  {key:'caption',label:'Captions and small text',min:12,max:24,selector:'.eyebrow,figcaption,small'}
];
export function cleanTypography(input,fail){
  const result={};if(input===undefined||input===null)return result;
  if(typeof input!=='object'||Array.isArray(input))fail('Invalid typography settings.');
  for(const mode of ['desktop','mobile']){
    const values=input[mode];if(values==null)continue;
    if(typeof values!=='object'||Array.isArray(values))fail('Invalid typography settings.');
    const sizes={};
    for(const r of typeRoles){
      const v=values[r.key];if(v==null||v==='')continue;
      if(!Number.isInteger(v)||v<r.min||v>r.max)fail(r.label+' must be between '+r.min+' and '+r.max+' px.');
      sizes[r.key]=v;
    }
    if(Object.keys(sizes).length)result[mode]=sizes;
  }
  return result;
}
export function typographyCSS(scale={},base=16){
  return ['desktop','mobile'].map(mode=>{
    const rules=typeRoles.filter(r=>scale[mode]?.[r.key]).map(r=>r.selector+'{font-size:'+(scale[mode][r.key]/base).toFixed(4)+'rem!important}').join('');
    return rules?'@media ('+(mode==='mobile'?'max-width:767.98px':'min-width:768px')+'){'+rules+'}':'';
  }).join('');
}
