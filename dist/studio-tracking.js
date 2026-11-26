(() => {
  const {ga,ads,pixel,tiktok,gtm}=document.currentScript.dataset;
  const ar=document.documentElement.lang.startsWith('ar');
  const key='servicebay-tracking-v1', panel=document.createElement('div');
  panel.className='analytics-choices';
  const title=document.createElement('p');title.textContent=ar?'هل تسمح بقياس الزيارات والإعلانات؟':'Allow analytics and advertising measurement for visits and contact clicks?';panel.append(title);
  function button(parent,label,action){const b=document.createElement('button');b.type='button';b.className='button button-outline';b.textContent=label;b.onclick=action;parent.append(b);return b}
  function consent(){try{return localStorage.getItem(key)}catch{return null}}
  function choose(v){try{localStorage.setItem(key,v)}catch{}panel.hidden=true;if(v==='allow')start();else if(running)location.reload()}
  button(panel,ar?'موافق':'Allow',()=>choose('allow'));button(panel,ar?'رفض':'Decline',()=>choose('deny'));
  document.body.append(panel);const foot=document.querySelector('footer')||document.body;
  button(foot,ar?'إعدادات الخصوصية':'Measurement settings',()=>{panel.hidden=false;panel.querySelector('button').focus()});
  function load(src){const tag=document.createElement('script');tag.async=true;tag.src=src;document.head.append(tag)}
  let running=false;
  function start(){if(running)return;running=true;
    if(gtm){window.dataLayer=window.dataLayer||[];window.dataLayer.push({'gtm.start':Date.now(),event:'gtm.js'});load('https://www.googletagmanager.com/gtm.js?id='+encodeURIComponent(gtm))}
    if(ga||ads){window.dataLayer=window.dataLayer||[];window.gtag=function(){window.dataLayer.push(arguments)};gtag('js',new Date());for(const id of [ga,ads].filter(Boolean))gtag('config',id,{page_location:location.origin+location.pathname,page_referrer:''});load('https://www.googletagmanager.com/gtag/js?id='+encodeURIComponent(ga||ads))}
    if(pixel){const fb=window.fbq=function(){if(fb.callMethod)fb.callMethod.apply(fb,arguments);else fb.queue.push(arguments)};fb.queue=[];fb.loaded=true;fb.version='2.0';fb.push=fb;window._fbq=fb;fb('init',pixel);fb('track','PageView');load('https://connect.facebook.net/en_US/fbevents.js')}
    if(tiktok){const ttq=window.ttq=window.ttq||[];ttq.methods=['page','track','identify','instances','debug','on','off','once','ready','alias','group','enableCookie','disableCookie'];ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(let i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.load=function(e){load('https://analytics.tiktok.com/i18n/pixel/events.js?sdkid='+encodeURIComponent(e)+'&lib=ttq')};ttq.load(tiktok);ttq.page()}
    document.addEventListener('click',ev=>{const a=ev.target.closest('a,button[data-contact-channel]');const href=a?.getAttribute('href')||'';const channel=a?.dataset.contactChannel||(href.startsWith('tel:')?'phone':href.startsWith('https://wa.me/')?'whatsapp':'');if(!channel||consent()!=='allow')return;window.gtag?.('event',channel==='phone'?'click_to_call':'whatsapp_click',{contact_method:channel});window.fbq?.('track','Contact',{contact_method:channel});window.ttq?.track('Contact',{content_name:channel})},true)
  }
  panel.hidden=!!consent();if(consent()==='allow')start();
})();
