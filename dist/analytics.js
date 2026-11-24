// Only included after the owner supplies a GA4 web stream ID at build time.
(() => {
  const id = document.currentScript?.dataset.measurementId;
  if (!/^G-[A-Z0-9]+$/.test(id || '')) return;
  const ar = document.documentElement.lang.startsWith('ar');
  const key = 'servicebay-analytics';
  let consent;
  try { consent = localStorage.getItem(key); } catch {}
  let started = false;
  const safePage = location.origin + location.pathname;
  function start() {
    if (started) return;
    started = true;
    window.dataLayer = window.dataLayer || [];
    function tag() { window.dataLayer.push(arguments); }
    window.gtag = tag;
    tag('js', new Date());
    tag('config', id, {page_location:safePage,page_referrer:'',allow_google_signals:false,allow_ad_personalization_signals:false});
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(id);
    document.head.append(script);
  }
  function choose(value) {
    consent = value;
    try { localStorage.setItem(key,value); } catch {}
    document.querySelector('[data-analytics-choices]').hidden = true;
    window['ga-disable-'+id] = value !== 'yes';
    if (value === 'yes') start();
  }
  const panel = document.querySelector('[data-analytics-choices]');
  panel.querySelector('[data-accept]').addEventListener('click',()=>choose('yes'));
  panel.querySelector('[data-decline]').addEventListener('click',()=>choose('no'));
  document.querySelector('[data-analytics-settings]').addEventListener('click',()=>{
    panel.hidden=false;
    panel.querySelector('button').focus();
  });
  if (consent === 'yes') choose('yes');
  else if (consent !== 'no') panel.hidden = false;
  document.addEventListener('click',event=>{
    if (consent !== 'yes') return;
    const control=event.target.closest('a,button[data-contact-channel]');
    if (!control) return;
    const href=control.getAttribute('href') || '';
    const method=control.dataset.contactChannel || (href.startsWith('tel:') ? 'phone' : /^https:\/\/wa\.me\//.test(href) ? 'whatsapp' : null);
    if (!method) return;
    window.gtag('event',method==='phone'?'click_to_call':'whatsapp_click',{
      contact_method:method, page_location:safePage, page_language:ar?'ar':'en',
      placement:control.closest('.quick-contact')?'floating':control.closest('footer')?'footer':control.closest('form')?'quote_form':control.closest('header')?'header':'content',
    });
  },true);
})();
