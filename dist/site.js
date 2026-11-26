'use strict';

const menuButton = document.getElementById('menu-toggle');
const navigation = document.getElementById('navigation');
const serviceMenu = navigation.querySelector('.service-menu');
const compactNavigation = matchMedia('(max-width: 1110px)');

const siteHeader = document.querySelector('.site-header');
const utilityContacts = document.getElementById('utility-contact');
const countryDisclosure = utilityContacts.querySelector('.country-menu');
const desktopTools = siteHeader.querySelector('.desktop-tools');
const mobileTools = siteHeader.querySelector('.mobile-tools');
const quoteButton = siteHeader.querySelector('[data-open-quote]');

function setMenu(open) {
  menuButton.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  menuButton.setAttribute('aria-expanded', String(open));
  navigation.dataset.collapsed = String(!open);
  if (!open) { serviceMenu.open = false; countryDisclosure.open = false; }
}

function updateMenu() {
  const compact = compactNavigation.matches;
  siteHeader.dataset.compact = String(compact);
  menuButton.hidden = !compact;
  (compact ? mobileTools : desktopTools).append(utilityContacts);
  if (compact) menuButton.after(navigation);
  else quoteButton.before(navigation);
  setMenu(false);
}

menuButton.addEventListener('click', () => {
  setMenu(menuButton.getAttribute('aria-expanded') !== 'true');
});

document.addEventListener('keydown', event => {
  if (event.key !== 'Escape') return;

  if (countryDisclosure.open) {
    countryDisclosure.open = false;
    countryDisclosure.querySelector('summary').focus();
    return;
  }
  if (serviceMenu.open) {
    const sector = document.activeElement?.closest('.service-menu-sector[open]');
    const disclosure = sector ?? serviceMenu;
    disclosure.open = false;
    disclosure.querySelector('summary').focus();
  } else if (menuButton.getAttribute('aria-expanded') === 'true') {
    setMenu(false);
    menuButton.focus();
  }
});

document.addEventListener('click', event => {
  if (menuButton.getAttribute('aria-expanded') === 'true' && !siteHeader.contains(event.target)) setMenu(false);
  if (serviceMenu.open && !serviceMenu.contains(event.target)) serviceMenu.open = false;
});

for (const sector of serviceMenu.querySelectorAll('.service-menu-sector')) {
  sector.addEventListener('toggle', () => {
    if (!sector.open) return;
    for (const sibling of serviceMenu.querySelectorAll('.service-menu-sector[open]')) {
      if (sibling !== sector) sibling.open = false;
    }
  });
}

function revealService() {
  const target = document.getElementById(location.hash.slice(1));
  const sector = target?.closest('.sector-group');
  if (!sector) return;
  sector.open = true;
  requestAnimationFrame(() => target.scrollIntoView({ block: 'start' }));
}

serviceMenu.addEventListener('click', event => {
  const link = event.target.closest('a');
  if (!link) return;
  if (compactNavigation.matches) setMenu(false);
  else serviceMenu.open = false;
  if (link.href === location.href) revealService();
});

window.addEventListener('hashchange', revealService);
revealService();

compactNavigation.addEventListener('change', updateMenu);
updateMenu();

function enableAnnouncements(ticker) {
  const items = Array.from(ticker.querySelectorAll('[data-announcement]'));
  if (items.length < 2) return;

  const control = ticker.querySelector('[data-announcement-play]');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let paused = reducedMotion.matches;
  let index = 0;

  function syncControl() {
    control.dataset.paused = String(paused);
    control.textContent = paused ? 'Play announcements' : 'Pause announcements';
  }

  control.addEventListener('click', () => {
    paused = !paused;
    syncControl();
  });
  reducedMotion.addEventListener('change', () => {
    paused = reducedMotion.matches;
    syncControl();
  });

  syncControl();
  control.hidden = false;
  setInterval(() => {
    if (paused || document.hidden || ticker.matches(':hover, :focus-within')) return;
    items[index].hidden = true;
    index = (index + 1) % items.length;
    items[index].hidden = false;
  }, 5500);
}

const announcementTicker = document.querySelector('[data-announcements]');
if (announcementTicker) enableAnnouncements(announcementTicker);

const regionPicker = document.querySelector('[data-region-select]');
const regionStorage = 'servicebay-country';
function savedRegion() {
  try {
    return localStorage.getItem(regionStorage) || localStorage.getItem('prime-fixer-country');
  } catch {
    return null;
  }
}
const linkedRegion = new URLSearchParams(location.search).get('country');
const initialRegion = linkedRegion || savedRegion();
if (Object.hasOwn(siteRegions, initialRegion)) regionPicker.value = initialRegion;

function currentRegion() {
  return siteRegions[regionPicker.value];
}

const countryMenu = document.querySelector('.country-menu');
const countrySummary = countryMenu.querySelector('summary');
const countryChoices = countryMenu.querySelectorAll('[data-country]');
countryMenu.hidden = false;
document.querySelector('.country-native').hidden = true;
countryMenu.addEventListener('click', event => {
  const button = event.target.closest('[data-country]');
  if (!button) return;
  regionPicker.value = button.dataset.country;
  regionPicker.dispatchEvent(new Event('change', { bubbles: true }));
  countryMenu.open = false;
  countrySummary.focus();
});
document.addEventListener('click', event => {
  if (!countryMenu.contains(event.target)) countryMenu.open = false;
});
countryMenu.addEventListener('keydown', event => {
  if (event.key !== 'Escape') return;
  event.stopPropagation();
  countryMenu.open = false;
  countrySummary.focus();
});
function showRegionFlag() {
  const region = currentRegion();
  countryMenu.querySelector('[data-region-name]').textContent = region.short + ' · ' + region.currency;
  countrySummary.setAttribute('aria-label', 'Choose country and currency, ' + region.name + ' · ' + region.currency);
  for (const button of countryChoices) button.setAttribute('aria-pressed', String(button.dataset.country === regionPicker.value));
  document.querySelector('[data-region-flag]').src = '/assets/flags/' + regionPicker.value.toLowerCase() + '.svg';
}
showRegionFlag();

const annualRates = document.querySelectorAll('[data-annual-rate]');
if (annualRates.length) {
  function updateAnnualRates() {
    const { currency, perAed } = currentRegion();
    const format = new Intl.NumberFormat('en-AE', {
      style: 'currency', currency, currencyDisplay: 'code', minimumFractionDigits: 0,
    });
    for (const rate of annualRates) rate.textContent = format.format(Number(rate.dataset.annualRate) * perAed);
  }
  updateAnnualRates();
  document.addEventListener('servicebay:region', updateAnnualRates);
}

regionPicker.addEventListener('change', () => {
  showRegionFlag();
  try {
    localStorage.setItem(regionStorage, regionPicker.value);
  } catch {
    // The selection still works for the current page when storage is unavailable.
  }
  document.dispatchEvent(new Event('servicebay:region'));
});

const quoteDialog = document.getElementById('quote-dialog');
const quoteOpener = document.querySelector('[data-open-quote]');
quoteOpener.addEventListener('click', event => {
  if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey ||
      typeof quoteDialog?.showModal !== 'function') return;
  event.preventDefault();
  setMenu(false);
  quoteDialog.showModal();
});
quoteDialog?.querySelector('[data-close-quote]').addEventListener('click', () => quoteDialog.close());

function applyOption(select, value) {
  if (value && Array.from(select.options).some(option => option.value === value)) {
    select.value = value;
  }
}

const siteAttribution=(()=>{
  let saved=null;try{saved=JSON.parse(sessionStorage.getItem('servicebay-source')||'null')}catch{}
  const q=new URLSearchParams(location.search);
  const utm=q.get('utm_source')||q.get('fbclid')&&'Facebook'||q.get('gclid')&&'Google'||q.get('ttclid')&&'TikTok'||'';
  const mapSource=raw=>{
    const s=String(raw||'').trim().toLowerCase();
    if(!s)return '';
    if(s.includes('google'))return 'Google';
    if(s.includes('facebook')||s==='fb'||s.includes('fb.'))return 'Facebook';
    if(s.includes('instagram')||s==='ig')return 'Instagram';
    if(s.includes('whatsapp')||s.includes('wa.me'))return 'WhatsApp';
    if(s.includes('linkedin'))return 'LinkedIn';
    if(s.includes('tiktok'))return 'TikTok';
    if(s.includes('youtube')||s.includes('youtu.be'))return 'YouTube';
    if(s.includes('twitter')||s==='x'||s==='t.co')return 'X / Twitter';
    if(s.includes('bing'))return 'Bing';
    return s.charAt(0).toUpperCase()+s.slice(1,32);
  };
  let refHost='';try{if(document.referrer){const u=new URL(document.referrer);if(u.origin!==location.origin)refHost=u.hostname.replace(/^www\./,'')}}catch{}
  const ua=navigator.userAgent||'';
  const device=/ipad|tablet/i.test(ua)?'Tablet':/mobi|android|iphone/i.test(ua)?'Mobile':'Desktop';
  const detected=mapSource(utm)||mapSource(refHost)||(refHost?'Referral ('+refHost.slice(0,26)+')':'Direct');
  const attr=saved&&(!utm&&saved.source!=='Direct')?saved:{source:utm?mapSource(utm):detected,medium:q.get('utm_medium')||(refHost?'referral':'direct'),campaign:q.get('utm_campaign')||'',device,landingPage:saved?.landingPage||location.pathname};
  try{
    sessionStorage.setItem('servicebay-source',JSON.stringify(attr));
    if(!sessionStorage.getItem('servicebay-visit-logged')&&!q.has('studio')){
      sessionStorage.setItem('servicebay-visit-logged','1');
      fetch('/api/analytics/visit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...attr,page:location.pathname}),keepalive:true}).catch(()=>{});
    }
  }catch{}
  return attr;
})();

const enquiryForms=document.querySelectorAll('.enquiry-form');
const quoteAccount=enquiryForms.length?fetch('/api/customer/me').then(r=>r.ok?r.json():null).catch(()=>null):null;
for (const form of enquiryForms) {
  let receipt='',sent=false;
  const output=form.querySelector('.quote-receipt');
  quoteAccount.then(data=>{if(!data?.user)return;const pwWrap=form.querySelector('[data-quote-password]');if(pwWrap)pwWrap.hidden=true;if(form.elements.portalPassword)form.elements.portalPassword.disabled=true;form.elements.email.readOnly=true;for(const key of ['name','email'])if(!form.elements[key].value)form.elements[key].value=data.user[key];const link=document.createElement('a');link.href='/portal/';link.textContent='My quote requests';form.querySelector('[data-account-note]').replaceChildren('Signed in as '+data.user.name+' · ',link)});

  const fields = form.elements;
  const params = new URLSearchParams(location.search);
  const review = form.querySelector('.message-review');
  const messageBody = review.querySelector('.message-body');
  const messageLink = review.querySelector('.message-link');
  let preparedUrl = '';
  messageLink.addEventListener('click', () => {
    if (preparedUrl) window.open(preparedUrl, '_blank', 'noopener,noreferrer');
  });
  const reviewHeading = review.querySelector('h3');
  const mobile = fields.namedItem('mobile');
  const area = fields.namedItem('area');
  const country = fields.namedItem('country');

  function updateHints() {
    const selected = siteRegions[country.value];
    mobile.placeholder = selected.prefix + ' …';
    area.placeholder = 'e.g. ' + selected.areas[0];
  }

  function syncRegion() {
    applyOption(country, regionPicker.value);
    updateHints();
  }

  country.addEventListener('change', updateHints);
  document.addEventListener('servicebay:region', () => {
    syncRegion();
    clearReview();
  });
  syncRegion();

  applyOption(fields.namedItem('service'), params.get('service'));
  const propertyField = fields.namedItem('property');
  applyOption(propertyField, params.get('property'));
  const serviceChoice = fields.namedItem('service');
  const schedule = fields.namedItem('schedule');
  const billing = fields.namedItem('billing');
  const plan = fields.namedItem('plan');
  const amcOptions = form.querySelector('[data-amc-options]');
  function showAmcOptions() {
    amcOptions.hidden = plan.disabled = schedule.disabled = billing.disabled = serviceChoice.value !== 'amc';
  }
  applyOption(plan, params.get('plan'));
  applyOption(schedule, params.get('schedule'));
  applyOption(billing, params.get('billing'));
  showAmcOptions();
  serviceChoice.addEventListener('change', showAmcOptions);
  if (form.closest('#plan-builder')) {
    const estimateLink = document.querySelector('[data-amc-estimate]');
    function syncEstimateLink() {
      const url = new URL('/estimate/?mode=amc#calculator', location.origin);
      if (plan.value) url.searchParams.set('plan', plan.value);
      if (schedule.value) url.searchParams.set('schedule', schedule.value);
      if (billing.value) url.searchParams.set('billing', billing.value);
      const property = fields.namedItem('property').value;
      if (property) url.searchParams.set('property', property);
      if (property) url.searchParams.set('sector', ['Villa','Apartment'].includes(property) ? 'residential' : property === 'Warehouse' ? 'industrial' : 'commercial');
      url.searchParams.set('country', country.value);
      estimateLink.href = url.href;
    }
    form.addEventListener('change', syncEstimateLink);
    document.addEventListener('servicebay:region', syncEstimateLink);
    syncEstimateLink();
    for (const pick of document.querySelectorAll('[data-amc-property], [data-amc-plan]')) {
      pick.addEventListener('click', event => {
        if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        applyOption(propertyField, pick.dataset.amcProperty);
        applyOption(plan, pick.dataset.amcPlan);
        serviceChoice.value = 'amc';
        showAmcOptions();
        clearReview();
        syncEstimateLink();
        const panel = form.closest('#plan-builder');
        panel.scrollIntoView({block:'start'});
        (pick.dataset.amcPlan ? fields.namedItem('name') : plan).focus({preventScroll:true});
      });
    }
  }
  area.value = (params.get('area') ?? '').slice(0, 80);
  fields.namedItem('details').value = [params.get('estimate'), params.get('visit')]
    .filter(Boolean).join('\n').slice(0, 450);

  const originalPlan = params.get('plan');
  const originalEstimate = params.get('estimate');
  function discardSupersededEstimate() {
    if (!originalPlan || !originalEstimate || (serviceChoice.value === 'amc' && plan.value === originalPlan)) return;
    const details = fields.namedItem('details');
    if (details.value.startsWith(originalEstimate)) details.value = details.value.slice(originalEstimate.length).trimStart();
  }
  plan.addEventListener('change', discardSupersededEstimate);
  serviceChoice.addEventListener('change', discardSupersededEstimate);
  form.addEventListener('submit', async event => {
    event.preventDefault();

    const values = new FormData(form);
    const value = key => String(values.get(key) ?? '').trim();
    const digits = value('mobile').replace(/\D/g, '');
    if (digits.length < 7 || digits.length > 15 || !/^[+\d() .-]+$/.test(value('mobile'))) {
      mobile.setCustomValidity('Enter a valid mobile number, with country code if needed.');
      mobile.reportValidity();
      return;
    }

    const line = (caption, field) => value(field) ? caption + ': ' + value(field) : '';
    const service = fields.namedItem('service').selectedOptions[0].textContent.trim();
    const message = [
      'Hello, I would like to request a quote.',
      line('Name', 'name'),
      line('Mobile', 'mobile'),
      line('Email', 'email'),
      'Service: ' + service,
      line('Property', 'property'),
      value('plan') ? 'Maintenance plan: ' + plan.selectedOptions[0].textContent : '',
      line('Visit schedule', 'schedule'),
      line('Billing frequency', 'billing'),
      'Country: ' + siteRegions[country.value].name,
      line('Area', 'area'),
      line('Details', 'details'),
    ].filter(Boolean).join('\n');

    if(!event.submitter?.hasAttribute('data-prepare-whatsapp')){
      if(sent)return;
      if(!value('email')){fields.email.focus();output.textContent='Enter an email to receive your quote receipt.';return}
      const group=form.querySelector('fieldset'),submit=form.querySelector('.form-submit');group.disabled=true;output.textContent='Sending your request…';
      try{
        if(!receipt)receipt='SB-'+Date.now().toString(36).toUpperCase()+'-'+crypto.randomUUID().replaceAll('-','').toUpperCase();
        const res=await fetch('/api/portal/requests',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:receipt,name:value('name'),email:value('email'),phone:value('mobile'),service,serviceId:value('service'),planId:value('plan'),plan:value('plan')?plan.selectedOptions[0].textContent:'',area:value('area'),property:value('property'),country:siteRegions[country.value].name,details:value('details'),...siteAttribution,password:values.get('portalPassword')||'',website:value('website'),message})});
        const r=await res.json();if(!res.ok)throw Error(r.error||'Please try again.');
        sent=true;submit.disabled=true;review.hidden=true;try{sessionStorage.setItem('servicebay-receipt',r.code)}catch{}
        const a=document.createElement('a');a.href='/portal/';a.textContent='Track in customer portal';
        if(fields.portalPassword)fields.portalPassword.value='';
        output.replaceChildren('Quote request received! '+(r.emailStatus==='Accepted'?'Your receipt has been emailed to '+value('email')+'. ':'Save this receipt code to track your request: ')+'Receipt: '+r.code+' · ',a);
        for(const other of enquiryForms){if(other.elements.portalPassword){other.elements.portalPassword.value='';other.elements.portalPassword.disabled=true}const pwW=other.querySelector('[data-quote-password]');if(pwW)pwW.hidden=true;other.elements.email.value=value('email');other.elements.email.readOnly=true;const link=document.createElement('a');link.href='/portal/';link.textContent='Track receipt';other.querySelector('[data-account-note]').replaceChildren(link)}
      }catch(err){output.textContent=err.message||'Could not submit the request. Try again.'}finally{group.disabled=false}
      return;
    }
    const destination = new URL(form.dataset.whatsapp);
    destination.searchParams.set('text', message);
    messageBody.textContent = message;
    preparedUrl = destination.href;
    review.hidden = false;
    reviewHeading.focus();
  });

  function clearReview() {
    review.hidden = true;
    preparedUrl = '';receipt='';sent=false;form.querySelector('.form-submit').disabled=false;output.textContent='';
    messageBody.textContent = '';
  }

  form.addEventListener('input', event => {
    if (event.target === mobile) mobile.setCustomValidity('');
    clearReview();
  });

  form.querySelector('fieldset').disabled = false;
}

for (const workflow of document.querySelectorAll('[data-workflow]')) {
  const navigation = workflow.querySelector('.workflow-nav');
  const tabs = Array.from(navigation.querySelectorAll('button'));
  const panels = Array.from(workflow.querySelectorAll('[data-step]'));
  navigation.setAttribute('role', 'tablist');

  function showStep(index) {
    for (const [position, tab] of tabs.entries()) {
      const selected = position === index;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      panels[position].hidden = !selected;
    }
  }

  for (const [index, tab] of tabs.entries()) {
    tab.setAttribute('role', 'tab');
    const panel = panels[index];
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', tab.id);
    panel.tabIndex = 0;
    tab.addEventListener('click', () => showStep(index));
    tab.addEventListener('keydown', event => {
      const keys = {
        ArrowLeft: (index + tabs.length - 1) % tabs.length,
        ArrowRight: (index + 1) % tabs.length,
        Home: 0,
        End: tabs.length - 1,
      };
      if (!Object.hasOwn(keys, event.key)) return;
      event.preventDefault();
      showStep(keys[event.key]);
      tabs[keys[event.key]].focus();
    });
  }

  showStep(0);
  navigation.hidden = false;
}
