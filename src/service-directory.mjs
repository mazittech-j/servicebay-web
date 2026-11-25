import { business, refrigeration, sectorExample, services, serviceSectors } from './content.mjs';
import { calculator, escapeHtml as e, servicePhoto } from './home-sections.mjs';
import { guides, tradePath } from './primary-guides.mjs';
import { faqBlock } from './local-pages.mjs';
import { trust } from './settings.mjs';
import { serviceCare } from './service-care.mjs';

export function sectorServices(sector) {
  return services.filter((service, index) => sectorExample(sector, service, index));
}

export function servicePath(sector, service) {
  return tradePath(service.id, sector.id);
}

export function serviceNavigation(current) {
  return `<details class="service-menu"><summary${current ? ' aria-current="page"' : ''}>Services</summary>
    <div class="service-menu-panel"><ul>${services.map(s => `<li><a href="${tradePath(s.id)}">${e(s.name)}</a></li>`).join('')}</ul>
    <a class="service-menu-all" href="${refrigeration.path}">Industrial refrigeration</a><a class="service-menu-all" href="/services/">All services</a></div></details>`;
}

export function serviceDirectory() {
  return `<div class="service-grid main-trade-directory">${services.map(service => `<article class="service-card">
    ${servicePhoto(service)}<h2>${e(service.title)}</h2><p>${e(service.description)}</p>
    <a class="inline-link" href="${tradePath(service.id)}">${e(service.name)} services in Dubai</a></article>`).join('')}</div>`;
}

const topics = {
  hvac: [['Filter and coil cleaning', 'Drain and condensate checks', 'Airflow and thermostat diagnosis', 'Refrigerant, compressor and duct enquiries'], ['One room stays warm', 'Weak airflow or recurring noise', 'Water below the indoor unit']],
  plumbing: [['Tap and mixer repairs', 'Cistern and flush fittings', 'Waste and drainage checks', 'Water flow and leak diagnosis'], ['Cistern keeps filling', 'Dampness under a sink', 'One or more drains empty slowly']],
  electrical: [['Outlet and switch replacement', 'Lighting and dimmer checks', 'Circuit fault assessment', 'New fixture installation enquiries'], ['A row of lights flickers', 'A socket works intermittently', 'Several rooms lose power together']],
  painting: [['Filling and surface preparation', 'Colour and sheen matching', 'Walls, ceilings and trim', 'Move-out repainting'], ['Patches catch the light', 'Paint flakes at the edges', 'A rental handover requires a colour change']],
  carpentry: [['Door adjustment', 'Cabinet hinges and handles', 'Drawer runners and fronts', 'Shelving and finish repairs'], ['A door catches the frame', 'Cabinet fronts sit unevenly', 'A drawer tips when extended']],
  handyman: [['Mirror and shelf mounting', 'Curtain rails and blinds', 'Flat-pack assembly', 'Minor fitting adjustments'], ['A rail has come loose', 'A mirror needs a suitable fixing', 'Several small jobs need one visit']],
  ceilings: [['Gypsum patching', 'Suspended tile replacement', 'Access panels and hatches', 'Office partition alterations'], ['A ceiling tile is damaged', 'An access opening needs finishing', 'A partition layout needs changing']],
  flooring: [['Individual tile replacement', 'Regrouting', 'Threshold and trim repairs', 'Floor preparation enquiries'], ['A tile lifts at an edge', 'Grout crumbles around a shower', 'A doorway has an uneven transition']],
};

export function serviceDetails(service) {
  const g = guides[service.id];
  const care = serviceCare[service.id];
  const [work, symptoms] = topics[service.id];
  const list = items => items.map(item => `<li>${e(item)}</li>`).join('');
  const line = (trust.licence ? ` · Licence ${e(trust.licence)}` : '') + (trust.trn ? ` · TRN ${e(trust.trn)}` : '');
  const wa = 'https://wa.me/' + business.whatsapp + '?text=' + encodeURIComponent(`Hello ServiceBay, I would like a quote for ${service.name} in Dubai.`);
  return `<article class="trade-story">
    <header class="trade-cover"><div class="wrap trade-cover-grid">
      <div><p class="eyebrow">Dubai technical services</p><h1>${e(g.h1)}</h1><p class="trade-lead">${e(g.intro)}</p>
      <div class="actions"><a class="button button-primary" href="#calculator">Estimate cost</a><a class="button button-outline" href="${e(wa)}">WhatsApp</a><a class="inline-link" href="tel:${business.phone}">Call ${business.phoneLabel}</a></div>
      <p class="trade-hours">${e(business.hours)} · Dubai time${line}</p></div>
      <div class="trade-cover-photo">${servicePhoto(service,true)}</div>
    </div></header>
    <div class="wrap trade-content">
      <section class="benefit-strip"><h2>Key benefits</h2><ul>${list(care.benefits)}</ul></section>
      <section class="trade-scope"><div><h2>${e(g.scopeTitle)}</h2><p>${e(g.scope[0])}</p><h3>Work you can request</h3><ul class="trade-task-list">${list(work)}</ul></div>
      <aside class="problem-panel"><h2>Most common problems</h2><ul>${list(symptoms)}</ul><h3>${e(care.urgent[0])}</h3><p>${e(care.urgent[1])}</p><a href="tel:${business.phone}">Call dispatch</a></aside></section>
      <section class="trade-detail-photo" id="service-photos"><figure><img src="/assets/detail-${service.id}.webp" alt="${e(care.photo[1])}" width="1024" height="683" loading="lazy" decoding="async"><figcaption>${e(care.photo[0])}</figcaption></figure>
      <div><p class="eyebrow">Service photo</p><h2>${e(care.prevention[0])}</h2><p>${e(care.prevention[1])}</p></div></section>
      <section class="repair-guide" id="component-repairs" aria-labelledby="repair-title"><h2 id="repair-title">Common component failures &amp; expert repair solutions</h2><table aria-labelledby="repair-title"><thead><tr><th scope="col">Component</th><th scope="col">What you may notice</th><th scope="col">How we address it</th></tr></thead><tbody>${care.pairs.map(([part,issue,repair])=>`<tr><th scope="row">${e(part)}</th><td>${e(issue)}</td><td>${e(repair)}</td></tr>`).join('')}</tbody></table></section>
      <section class="handover-guide"><h2>Before &amp; after service</h2><div><section><h3>Before the visit</h3><p>${e(care.before)}</p></section><section><h3>At handover</h3><p>${e(care.after)}</p></section></div></section>
      <section><h2>Work by property type</h2><div class="trade-properties">${serviceSectors.map(sector=>`<section id="${sector.id}"><h3>${e(sector.label)}</h3><p>${e(g.properties[sector.id])}</p>${service.id === 'hvac' && sector.id === 'industrial' ? `<a class="inline-link" href="${refrigeration.path}">Cold-room refrigeration assessments</a>` : ''}</section>`).join('')}</div></section>
      <div class="trade-visit"><section><h2>${e(care.compatibility[0])}</h2><p>${e(care.compatibility[1])}</p></section><section><h2>${e(g.processTitle)}</h2><p>${e(g.process)}</p></section></div>
      <section class="trade-price-note"><h2>${e(g.priceTitle)}</h2><p>${e(g.pricing)}</p></section>
    </div>
  </article>
  ${calculator({service})}
  ${faqBlock(g.faq, 'Frequently asked questions about ' + service.name)}
  <section class="section wrap trade-local-links"><div><h2>Service areas</h2><ul class="area-links"><li><a href="/service-areas/dubai-marina/">Dubai Marina</a></li><li><a href="/service-areas/jvc/">JVC</a></li><li><a href="/service-areas/business-bay/">Business Bay</a></li><li><a href="/service-areas/">All Dubai service areas</a></li></ul></div>
  <div><h2>Related services</h2><ul class="trade-related">${g.related.map(id=>`<li><a href="${tradePath(id)}">${e(guides[id].h1)}</a></li>`).join('')}<li><a href="/amc/">Annual maintenance contracts in Dubai</a></li></ul></div>
  ${[trust.warranty,trust.experience,trust.response].filter(Boolean).map(item=>`<p>${e(item)}</p>`).join('')}</section>
  <nav class="trade-mobile-actions" aria-label="Contact about this service"><a href="tel:${business.phone}">Call</a><a href="${e(wa)}">WhatsApp</a><a href="#calculator">Estimate cost</a></nav>`;
}
