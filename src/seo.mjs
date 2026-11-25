import { business, services, serviceSectors } from './content.mjs';
import { escapeHtml as e } from './home-sections.mjs';
import { guides } from './primary-guides.mjs';
import { areas } from './seo-areas.mjs';
import { siteOrigin, profileUrl, trust, verification, measurementId } from './settings.mjs';

const absolute = path => new URL(path, siteOrigin).href;
const ref = id => ({ '@id': id });
const businessId = absolute('/#business');
const websiteId = absolute('/#website');

export function pageInfo(path, title) {
  const segments = path.split('/').filter(Boolean);
  const ar = path === '/ar/';
  const crumbs = [[ar ? 'الرئيسية' : 'Home',ar ? '/ar/' : '/']];
  let questions = [];
  let serviceName, areaName, trade;
  if (segments[0] === 'services' && segments.length === 2) {
    trade = services.find(service => guides[service.id].slug === segments[1]);
    const guide = guides[trade.id];
    crumbs.push(['Services','/services/'],[trade.name,path]);
    serviceName = guide.h1;
    questions = guide.faq;
  } else if (segments[0] === 'service-areas' && segments[1]) {
    const a = areas.find(item=>item.slug===segments[1]);
    areaName = a.name;
    serviceName = `Property maintenance in ${areaName}`;
    questions = [[a.question,a.answer]];
    crumbs.push(['Service areas','/service-areas/'],[areaName,path]);
  } else if (path !== '/' && !ar) {
    crumbs.push([title,path]);
    if (path === '/amc/' || serviceSectors.some(s=>path === `/${s.id}/`)) serviceName = title;
  }
  return {path,ar,crumbs,questions,serviceName,areaName,trade};
}

export function breadcrumbs({crumbs}) {
  if (crumbs.length < 2) return '';
  return `<nav class="wrap crumb-trail" aria-label="Breadcrumb">${crumbs.map(([label,url],i)=>i===crumbs.length-1 ? `<span aria-current="page">${e(label)}</span>` : `<a href="${e(url)}">${e(label)}</a>`).join('<span aria-hidden="true">/</span>')}</nav>`;
}

function schema(info, title, description) {
  const {path,ar,crumbs,questions,serviceName,areaName} = info;
  const url = absolute(path);
  const pageId = url + '#page';
  const entity = {
    '@type':'HomeAndConstructionBusiness','@id':businessId,
    name:business.name,url:absolute('/'),logo:absolute(business.logo),image:absolute('/assets/home-maintenance.webp'),
    telephone:business.phone,email:business.email,areaServed:{'@type':'City',name:'Dubai'},
    openingHours:'Mo-Sa 08:00-18:00',
    address:{'@type':'PostalAddress',addressLocality:'Dubai',addressCountry:'AE',...(trust.street ? {streetAddress:trust.street}: {})},
    ...(trust.trn ? {vatID:trust.trn} : {}),
    ...(trust.licence ? {identifier:{'@type':'PropertyValue',propertyID:'Trade licence',value:trust.licence}} : {}),
    ...(profileUrl ? {hasMap:profileUrl,sameAs:[profileUrl]} : {}),
  };
  const site = {'@type':'WebSite','@id':websiteId,name:business.name,url:absolute('/'),publisher:ref(businessId)};
  const pageType = path==='/about/'?'AboutPage':path==='/contact/'?'ContactPage':path==='/services/'||path==='/service-areas/'?'CollectionPage':'WebPage';
  const page = {'@type':pageType,'@id':pageId,url,name:title,description,inLanguage:ar?'ar-AE':'en-AE',isPartOf:ref(websiteId),about:ref(businessId)};
  const graph = [entity,site,page];
  if (crumbs.length>1) {
    page.breadcrumb=ref(url+'#breadcrumbs');
    graph.push({'@type':'BreadcrumbList','@id':url+'#breadcrumbs',itemListElement:crumbs.map(([name,p],i)=>({'@type':'ListItem',position:i+1,name,item:absolute(p)}))});
  }
  if (serviceName) {
    page.mainEntity = ref(url+'#service');
    graph.push({'@type':'Service','@id':url+'#service',url,name:serviceName,serviceType:serviceName,description,
      provider:ref(businessId),areaServed:{'@type':areaName?'Place':'City',name:areaName ? areaName+', Dubai' : 'Dubai'}});
  }
  if (questions.length) {
    page.hasPart=ref(url+'#faq');
    graph.push({'@type':'FAQPage','@id':url+'#faq',isPartOf:ref(pageId),inLanguage:page.inLanguage,mainEntity:questions.map(([name,text])=>({'@type':'Question',name,acceptedAnswer:{'@type':'Answer',text}}))});
  }
  return JSON.stringify({'@context':'https://schema.org','@graph':graph}).replace(/</g,'\\u003c');
}

export function headTags(info, title, description) {
  const {path,ar} = info;
  const fullTitle = `${business.name} - ${title}`;
  const card = absolute('/assets/servicebay-social.jpg');
  const alt = ar ? 'فني يفحص وحدة تكييف داخلية' : 'Technician inspecting a wall-mounted air conditioner';
  const locale = ar?'ar_AE':'en_AE';
  const tags = [
    `<title>${e(fullTitle)}</title>`,
    `<meta name="description" content="${e(description)}">`,
    `<link rel="canonical" href="${absolute(path)}">`,
    `<link rel="icon" href="/assets/servicebay-favicon.png" type="image/png">`,
    `<link rel="apple-touch-icon" sizes="180x180" href="/assets/apple-touch-icon.png">`,
    ...Object.entries({'og:type':'website','og:title':fullTitle,'og:description':description,'og:site_name':business.name,'og:locale':locale,'og:url':absolute(path),'og:image':card,'og:image:width':'1200','og:image:height':'630','og:image:alt':alt}).map(([k,v])=>`<meta property="${k}" content="${e(v)}">`),
    ...Object.entries({'twitter:card':'summary_large_image','twitter:title':fullTitle,'twitter:description':description,'twitter:image':card,'twitter:image:alt':alt}).map(([k,v])=>`<meta name="${k}" content="${e(v)}">`),
  ];
  if (path==='/' || ar) {
    for (const [language, target] of [['en-AE','/'],['ar-AE','/ar/'],['x-default','/']]) tags.push(`<link rel="alternate" hreflang="${language}" href="${absolute(target)}">`);
  }
  if (verification && path==='/') tags.push(`<meta name="google-site-verification" content="${e(verification)}">`);
  tags.push(`<script type="application/ld+json">${schema(info,fullTitle,description)}</script>`);
  if (measurementId) tags.push(`<script defer src="/analytics.js" data-measurement-id="${e(measurementId)}"></script>`);
  return tags.join('\n  ');
}
