import { mkdir, writeFile } from 'node:fs/promises';
import { announcements, audiences, business, officeMap, officeMapEmbed, process, projectScopes, properties, refrigeration, services, serviceSectors } from './src/content.mjs';
import { availabilityChecker, brand, calculator, clientLogoCarousel, coverageHighlights, escapeHtml, footer, icon, propertyServices } from './src/home-sections.mjs';
import { homeBanner, homeProjectGallery } from './src/carousels.mjs';
import { regions, regionOptions } from './src/regions.mjs';
import { createDispatchFeed, dispatchSchedule } from './src/dispatch.mjs';
import { frequencies, frequencyOptions, maintenancePlans } from './src/amc.mjs';
import { reviewSection } from './src/reviews.mjs';
import { policies } from './src/policies.mjs';
import { tradeGuides } from './src/trade-guides.mjs';
import { serviceDetails, serviceDirectory, serviceNavigation, servicePath, sectorServices } from './src/service-directory.mjs';

import { areas as localAreas } from './src/seo-areas.mjs';
import { guides, tradePath } from './src/primary-guides.mjs';
import { pageInfo, headTags, breadcrumbs } from './src/seo.mjs';
import { measurementId, hasReviewProfile } from './src/settings.mjs';
import { areaDetail, areaDirectory, homeAreas, floatingContact, trustDetails, arabicHome } from './src/local-pages.mjs';

const pages = [
  ['/', 'Home'], ['/about/', 'About'], ['/services/', 'Services'], ['/amc/', 'AMC'],
  ['/projects/', 'Projects'], ['/contact/', 'Contact'],
];

const whatsapp = `https://wa.me/${business.whatsapp}`;
const phone = `tel:${business.phone}`;
const email = `mailto:${business.email}`;
const enquiry = (service = '', property = '') => {
  const query = new URLSearchParams();
  if (service) query.set('service', service);
  if (property) query.set('property', property);
  const params = query.size ? `?${query}` : '';
  return `/contact/${params}#enquiry`;
};

function button(label, href, style = 'primary') {
  return `<a class="button button-${style}" href="${escapeHtml(href)}">${escapeHtml(label)}</a>`;
}

function eyebrow(label) {
  return `<p class="eyebrow">${escapeHtml(label)}</p>`;
}

function image(name, alt, className, eager = false, sizeHint = '(max-width: 800px) 94vw, 52vw') {
  return `<img class="${className}" src="/assets/${name}.webp"
      srcset="/assets/${name}-small.webp 670w, /assets/${name}.webp 1400w"
      sizes="${sizeHint}" width="1400" height="933"
      ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} alt="${escapeHtml(alt)}">`;
}

function quoteForm({ title, label, description = 'Share a few details so we can assess your request.', selectedService = '', selectedProperty = '', panelId = 'enquiry', popup = false } = {}) {
  const serviceOptions = [...services, refrigeration, { id: 'amc', name: 'AMC enquiry' }, { id: 'other', name: 'Other' }]
    .map(service => `<option value="${service.id}"${selectedService === service.id ? ' selected' : ''}>${escapeHtml(service.name)}</option>`).join('');
  return `<section class="enquiry-panel" id="${panelId}" aria-labelledby="${panelId}-title">
    ${eyebrow(label)}
    <h2 id="${panelId}-title">${escapeHtml(title)}</h2>
    <p class="form-intro">${escapeHtml(description)}</p>
    <form class="enquiry-form" data-whatsapp="${whatsapp}">
      <fieldset disabled>
        <legend class="visually-hidden">Service enquiry details</legend>
        <div class="fields">
          <label>Full name <span aria-hidden="true">*</span><input name="name" autocomplete="name" required pattern=".*\\S.*" maxlength="80" placeholder="Your name"${popup ? ' autofocus' : ''}></label>
          <label>Mobile <span aria-hidden="true">*</span><input name="mobile" type="tel" autocomplete="tel" required maxlength="24" minlength="7" pattern="[+0-9\\(\\) .\\-]+" title="Use digits and an optional country code" placeholder="+971 …"></label>
          <label>Email for your receipt <span aria-hidden="true">*</span><input name="email" type="email" autocomplete="email" required maxlength="150" placeholder="you@example.com"></label>
          <input name="_sb_hp" tabindex="-1" autocomplete="nope" data-lpignore="true" aria-hidden="true" style="position:absolute;left:-9999px;width:1px;height:1px;opacity:0;pointer-events:none">
          <label>Service <span aria-hidden="true">*</span><select name="service" required><option value="" disabled${selectedService ? '' : ' selected'}>Select a service</option>${serviceOptions}</select></label>
          <label>Property type<select name="property"><option value="">Select property</option>${properties.map(property => `<option${property === selectedProperty ? ' selected' : ''}>${property}</option>`).join('')}</select></label>
          <div class="amc-form-options field-wide" data-amc-options${selectedService === 'amc' ? '' : ' hidden'}>
            <label class="field-wide">Maintenance plan<select name="plan"><option value="">Help me choose</option>${maintenancePlans.map(plan => `<option value="${plan.id}">${escapeHtml(plan.name)}</option>`).join('')}</select></label>
            <label>Preferred visit schedule<select name="schedule"><option value="">Discuss with the team</option>${frequencyOptions()}</select></label>
            <label>Preferred billing frequency<select name="billing"><option value="">Discuss with the team</option>${frequencyOptions()}</select></label>
          </div>
          <label>Country <span aria-hidden="true">*</span><select name="country" autocomplete="country" required>${regionOptions()}</select></label>
          <label>Area <span aria-hidden="true">*</span><input name="area" autocomplete="address-level3" required pattern=".*\\S.*" maxlength="80" placeholder="e.g. Business Bay"></label>
          <label class="field-wide field-details">What needs attention?<textarea name="details" maxlength="450" rows="3" placeholder="Describe the issue or scope of work"></textarea></label>
        </div>
        <div class="quote-submit-actions"><button class="button button-primary form-submit" type="submit">Send quote request</button><button class="button button-outline" type="submit" data-prepare-whatsapp>Prepare WhatsApp message</button></div>
      </fieldset>
      <div class="quote-receipt" role="status" aria-live="polite"></div><p class="form-note" data-account-note>Your receipt number will be sent to your email. Track your request anytime in the <a href="/portal/">Customer Portal</a>. <a href="/privacy-policy/">Privacy Policy</a></p>
      <noscript><p>Use <a href="${whatsapp}">WhatsApp</a> or <a href="${phone}">call ${business.phoneLabel}</a> to make an enquiry.</p></noscript>
      <div class="message-review" hidden>
        <h3 tabindex="-1">Your WhatsApp message</h3>
        <p class="message-body"></p>
        <button type="button" class="button button-primary message-link" data-contact-channel="whatsapp">Open WhatsApp</button>
      </div>
    </form>
  </section>`;
}

function heading(kicker, title, description) {
  return `<header class="section-heading">${eyebrow(kicker)}<h1>${escapeHtml(title)}</h1><p>${escapeHtml(description)}</p></header>`;
}

function sectionIntro(kicker, title, description = '') {
  return `<div class="section-heading">${eyebrow(kicker)}<h2>${escapeHtml(title)}</h2>${description ? `<p>${escapeHtml(description)}</p>` : ''}</div>`;
}

function textCards(items) {
  return `<div class="text-grid">${items.map(([title, description]) => `<article><h3>${escapeHtml(title)}</h3><p>${escapeHtml(description)}</p></article>`).join('')}</div>`;
}

function processSection() {
  const steps = process.map(([name, title, description, outcome], index) => `<article data-step id="workflow-panel-${index}" class="workflow-panel">
    <div><p class="workflow-phase">${escapeHtml(name)}</p><h3>${escapeHtml(title)}</h3><p>${escapeHtml(description)}</p></div>
    <div class="workflow-outcome"><span>${icon('calendar')}</span><div><p>What you get</p><strong>${escapeHtml(outcome)}</strong></div></div>
  </article>`).join('');
  return `<section class="section workflow-section" aria-labelledby="workflow-heading"><div class="wrap">
    <div class="section-heading"><p class="eyebrow">How we work</p><h2 id="workflow-heading">Follow your service visit</h2><p>See what happens at each stage, from your first message to follow-up.</p></div>
    <div class="workflow-board" data-workflow>
      <div class="workflow-nav" aria-label="Service visit stages" hidden>
        ${process.map(([name], index) => `<button type="button" id="workflow-tab-${index}" aria-controls="workflow-panel-${index}"><span aria-hidden="true">${index + 1}</span>${escapeHtml(name)}</button>`).join('')}
      </div>
      <div class="workflow-panels">${steps}</div>
    </div>
  </div></section>`;
}

function annualMaintenanceFeature() {
  return `<section class="section amc-showcase" aria-labelledby="amc-feature-title"><div class="wrap amc-showcase-grid">
    <div class="amc-cover"><div class="amc-cover-copy"><p class="eyebrow">Annual maintenance contracts</p>
      <h2 id="amc-feature-title">A maintenance plan for your property</h2><p>Plan AC servicing, plumbing checks and electrical inspections around your property’s needs.</p>
      <div class="actions">${button('Explore AMC plans','/amc/','primary')}${button('Estimate AMC cost','/estimate/?mode=amc#calculator','outline-white')}</div></div></div>
    <div class="amc-calendar"><h3>Choose a visit schedule</h3><p>Select how often you’d like a technician to visit.</p>
      <div class="frequency-grid">${frequencies.map(f => `<a href="/amc/?schedule=${f.id}#plan-builder"><span>${f.label}</span><small>${f.count} ${f.count === 1 ? 'visit' : 'visits'} per year</small></a>`).join('')}</div>
    </div></div></section>`;
}

function contactStrip() {
  return `<section class="contact-strip">
    <div class="wrap strip-inner">
      <div><h2>Need a technician?</h2><p>Tell us about your property and what needs attention.</p></div>
      <div class="actions">${button('Request a quote', enquiry(), 'white')}${button(`Call ${business.phoneLabel}`, phone, 'outline-white')}</div>
    </div>
  </section>`;
}

function audienceLinks() {
  return `<section class="section wrap home-properties">
    ${sectionIntro('PROPERTIES WE SERVE', 'Homes, businesses and industrial sites')}
    <div class="audience-grid">${Object.entries(audiences).map(([path, data]) => `
      <a class="audience-card" href="/${path}/">
        ${image(data.image, data.alt, 'audience-image')}
        <div><h3>${data.label} maintenance</h3><p>${escapeHtml(data.description)}</p><span class="inline-link">Explore ${data.label.toLowerCase()}</span></div>
      </a>`).join('')}<a class="audience-card" href="/industrial/"><img src="/assets/industrial-cold-room.webp" alt="Cooling equipment in an insulated cold-storage room" class="audience-image" width="1200" height="800" loading="lazy"><div><h3>Industrial maintenance</h3><p>Warehouse facilities, cold storage and workshop maintenance.</p><span class="inline-link">Explore industrial</span></div></a></div>
  </section>`;
}

function home() {
  return `${homeBanner()}
  ${coverageHighlights()}
  <div class="slot-band"><div class="wrap">${availabilityChecker()}</div></div>
  ${propertyServices()}
  ${audienceLinks()}
  ${calculator()}
  ${annualMaintenanceFeature()}
  ${processSection()}
  ${homeProjectGallery()}
  ${homeAreas()}${reviewSection()}${clientLogoCarousel()}
  ${contactStrip()}`;
}

function about() {
  const values = [
    ['Reliability', 'We agree the scope, arrival window and access arrangements with you before the visit.'],
    ['Respect', 'We ask about occupied rooms, quiet hours and site rules before we start.'],
    ['Integrity', 'If an inspection uncovers extra work, we explain the options and ask for approval.'],
    ['Workmanship', 'At handover, we walk through the repair and explain how to look after it.'],
  ];
  const roles = [
    ['Service coordination', 'Your first point of contact for access instructions, appointment times and questions after a visit.'],
    ['Trade technicians', 'The people who inspect the fault, explain the repair and check the work with you at handover.'],
    ['Maintenance planning', 'For ongoing cover, the team helps you list the equipment, agree a visit schedule and review the proposal.'],
  ];
  return `<section class="section wrap about-intro" aria-labelledby="about-title">
    <div class="about-cover"><div class="about-cover-copy">
      ${eyebrow('About ServiceBay')}<h1 id="about-title">Property maintenance in Dubai, from first call to handover.</h1>
      <p>We help Dubai homeowners, landlords and businesses look after their buildings. Our aim is simple. When we leave, you should know what changed and how to care for it.</p>
      <a class="button button-outline-white" href="#our-team">Meet our team</a>
    </div><img class="about-cover-photo" src="/assets/about-site-walk.webp" width="1200" height="800" alt="A technician and coordinator review a floor plan beside exposed service pipes" fetchpriority="high" decoding="async"></div>
  </section>
  <section class="section wrap about-outlook" aria-labelledby="philosophy-title">
    <div class="about-philosophy">${eyebrow('Our philosophy')}<h2 id="philosophy-title">Understand the property first.</h2>
      <p>A leak in a family kitchen and a leak on a shop floor can need the same repair. When and how we carry it out matters just as much. We start by asking who uses the space and what needs to keep running.</p></div>
    <dl class="about-principles"><div><dt>Our mission</dt><dd>Make repairs straightforward to arrange. Explain what needs attention, agree the price and leave the customer with a clear account of the work.</dd></div>
      <div><dt>Our vision</dt><dd>Help property owners plan maintenance around the life of their building, from the first service visit to the next scheduled check.</dd></div></dl>
  </section>
  <section class="about-strategy" aria-labelledby="strategy-title"><div class="section wrap about-strategy-grid">
    <div class="about-planning-photo"><img src="/assets/visit-planning.webp" alt="Two people review a printed building plan inside a timber-framed interior" width="1000" height="667" loading="lazy" decoding="async"></div>
    <div class="about-strategy-copy">${eyebrow('Our service approach')}<h2 id="strategy-title">What to expect on a job</h2>
      <dl class="about-practices"><div><dt>A scope you can review</dt><dd>We ask about the property, access and the work required before preparing a quote.</dd></div>
        <div><dt>A visit that suits the site</dt><dd>We agree when someone can attend, which rooms need access and how to keep disruption to a minimum.</dd></div>
        <div><dt>A clear handover</dt><dd>We explain what was repaired, what to keep an eye on and when a follow-up would help.</dd></div></dl>
    </div></div></section>
  <section class="section wrap about-values" aria-labelledby="values-title">
    <header class="about-section-header">${eyebrow('Our values')}<h2 id="values-title">What you can expect from us</h2></header>
    <div class="about-values-grid">${values.map(([title,description]) => `<article><h3>${title}</h3><p>${description}</p></article>`).join('')}</div>
  </section>
  <section class="about-team" id="our-team" aria-labelledby="team-title"><div class="section wrap about-team-grid">
    <figure class="team-portrait"><img src="/assets/team-briefing.webp" alt="Three maintenance workers review inspection notes around a workshop bench" width="1200" height="800" loading="lazy" decoding="async"><figcaption>Illustration of a team briefing</figcaption></figure>
    <div class="about-team-intro">${eyebrow('People behind the work')}<h2 id="team-title">Our Team</h2><p class="team-purpose">A good repair gives someone their day back. That’s the standard we aim for, from the first call to the last check.</p>
    <dl class="about-team-roles">${roles.map(([title,description]) => `<div><dt>${title}</dt><dd>${description}</dd></div>`).join('')}</dl>
    ${button('Contact the team', '/contact/', 'outline')}</div>
  </div></section>
  ${trustDetails()}${processSection()}${contactStrip()}`;
}

function servicePage() {
  return `<section class="section wrap page-intro">
    ${heading('SERVICES', 'Technical services for your property.', 'Explore eight maintenance services in Dubai. Each guide covers the work, property types, estimated costs and booking details.')}
    ${serviceDirectory()}
    <div class="industry-directory-link"><h2>Industrial equipment</h2><a class="inline-link" href="${refrigeration.path}">Cold-room and freezer-room refrigeration in Dubai</a></div>
    <div class="inline-panel"><div><h2>Budgeting for a repair?</h2><p>Use the planning estimate for selected services, then ask for a written quote.</p></div>${button('Open cost estimator', '/estimate/', 'dark')}</div>
  </section>${contactStrip()}`;
}

function audiencePage(data) {
  return `<section class="section wrap page-intro split">
    <div>${heading(`${data.label.toUpperCase()} SERVICES`, data.title, data.description)}
      <div class="actions">${button('Request a quote', enquiry('', data.property), 'dark')}${button('Annual maintenance', '/amc/', 'outline')}</div></div>
    ${image(data.image, data.alt, 'page-photo', true)}
  </section>
  <section class="section wrap section-rule">
    ${sectionIntro('MAINTENANCE AND REPAIRS', 'How we can help')}
    ${textCards(data.items)}<h2 class="sector-subhead">Browse ${data.label.toLowerCase()} services in Dubai</h2>${tradeLinks(serviceSectors.find(s=>s.label===data.label))}
  </section>${contactStrip()}`;
}

function tradeLinks(sector) {
  return `<ul class="area-links">${sectorServices(sector).map(s=>`<li><a href="${servicePath(sector,s)}">${escapeHtml(s.name)} for ${sector.label.toLowerCase()} properties in Dubai</a></li>`).join('')}</ul>`;
}

function industrialPage() {
  const sector = serviceSectors.find(item=>item.id==='industrial');
  const facilityScope = {
    hvac: 'Air-handling units, fresh-air and extract fans for occupied areas. Identify the zone with poor airflow, unusual noise or a failed controller.',
    plumbing: 'Water-transfer and booster pumps, wash bays and staff drainage. Describe pressure loss, repeated pump starts or the fixture that backs up.',
    electrical: 'High-bay lights, general distribution and building circuits. Mark the lighting row or panel affected and any access equipment needed.',
    carpentry: 'Office doors, staff-room cabinets and door hardware. Note where a leaf drags, a lock catches or a cabinet fixing has pulled free.',
    ceilings: 'Warehouse office enclosures, suspended ceilings and service hatches. Show where access to a valve, cable route or ventilation unit must stay clear.',
    painting: 'Warehouse walls, pedestrian areas and occupied offices. Provide surface height and finish requirements so preparation and access can be scoped.',
    flooring: 'Cracked tiles, worn thresholds and uneven finishes in pedestrian routes. Flag pallet or forklift traffic for a separate assessment of the load and finish.',
    handyman: 'Group minor fixtures, shelving brackets and door hardware by work zone. Give installation heights and access times for each item.'
  };
  return `<section class="section wrap industrial-intro">${heading('Industrial facilities','Industrial maintenance & refrigeration in Dubai','Plan repairs for cold stores, workshops and warehouse buildings around receiving hours, loading bays and the zones that need to stay open.')}
    <nav class="industrial-jump" aria-label="Industrial maintenance sections"><a href="#refrigeration">Cold-room refrigeration</a><a href="#facility-trades">Building services</a><a href="#site-planning">Site visit planning</a></nav></section>
    <section id="refrigeration" class="industrial-refrigeration"><div class="section wrap">
      <div class="cold-room-grid"><div>${eyebrow('Cold storage')}<h2>Cold-room &amp; freezer-room refrigeration</h2>
      <p>Tell us which walk-in chiller, freezer room or refrigerated holding area needs attention. Include its usual setpoint, current display reading and when the change began. A room that warms during unloading gives the technician a different starting point from one that drifts overnight.</p>
      <p>Share the room dimensions, equipment model and alarm history where available. The visit scope and price depend on the installation, access and operating window.</p>
      ${button('Request a refrigeration assessment',enquiry(refrigeration.id,'Warehouse'),'primary')}</div>
      <figure><img src="/assets/industrial-cold-room.webp" alt="A twin-fan evaporator above stainless shelving in a walk-in cold room" width="1200" height="800" loading="lazy" decoding="async"><figcaption>Walk-in cold storage and evaporator airflow</figcaption></figure></div>
      <div class="cold-room-systems"><h3>Refrigeration faults to report</h3><dl>
        <div><dt>Temperature drift</dt><dd>Note the setpoint and display trend. The technician can compare probe readings with room conditions and check the controller before proposing a sensor repair.</dd></div>
        <div><dt>Icing or weak airflow</dt><dd>Record where ice returns and whether fans sound different. The visit can cover the evaporator, fan operation and defrost sequence, followed by a recovery check.</dd></div>
        <div><dt>Doors or seals leaking air</dt><dd>Report damaged gaskets, misaligned hinges or a door that stays ajar. The assessment can cover seal fit, closure and the room’s temperature trend afterward.</dd></div>
        <div><dt>Condensing unit runs for longer</dt><dd>Report noise, alarms and when the unit last cycled off. A technician can assess the condenser, fans and compressor controls before quoting parts.</dd></div></dl></div>
    </div></section>
    <section class="section wrap industrial-trades" id="facility-trades">${sectionIntro('Warehouse & workshop maintenance','Building services by trade')}
      <div class="facility-grid">${sectorServices(sector).map(s=>`<article><h3><a href="${servicePath(sector,s)}">${escapeHtml(s.name)}</a></h3><p>${escapeHtml(facilityScope[s.id])}</p></article>`).join('')}</div>
    </section>
    <section class="section wrap industrial-planning" id="site-planning"><div><h2>Plan work around your shifts</h2><p>Send a list of affected rooms or assets, your permit contact, delivery windows and any restrictions on vehicle or lift access. Mark what can be isolated during a shift and what needs a shutdown. For repeat visits, identify the equipment you want included in the maintenance schedule.</p></div>${button('Discuss a warehouse AMC',enquiry('amc','Warehouse'),'outline')}</section>${contactStrip()}`;
}

function amc() {
  const currency = new Intl.NumberFormat('en-AE', { style:'currency', currency:'AED', currencyDisplay:'code', maximumFractionDigits:0 });
  return `<section class="wrap amc-mast" aria-labelledby="amc-title"><div class="amc-mast-copy">${eyebrow('Annual maintenance contracts')}
      <h1 id="amc-title">Property maintenance plans in Dubai</h1>
      <p>Put AC servicing, plumbing and electrical checks on one calendar. Choose a starting plan, then agree the equipment, visits and price for your property.</p>
      <div class="actions">${button('Compare plans','#maintenance-plans','primary')}<a class="inline-link" href="#plan-builder">Request a proposal</a></div>
    </div><div class="amc-mast-photo"><img src="/assets/about-site-walk.webp" width="1200" height="800" alt="A coordinator and technician review a building plan beside service pipework" fetchpriority="high"></div></section>

  <section class="section wrap amc-tier-section" id="maintenance-plans" aria-labelledby="plans-title">
    <header><h2 id="plans-title">Compare annual maintenance plans</h2>
    <p>Indicative base rates per property unit for one year. The calculator adds the 1.9% handling fee and applicable estimated VAT.</p></header>
    <div class="amc-tier-grid">${maintenancePlans.map(plan => `<article class="amc-tier amc-tier-${plan.id}">
      <h3>${escapeHtml(plan.name)}</h3><p class="amc-tier-focus">${escapeHtml(plan.focus)}</p>
      <div class="amc-tier-price"><strong data-annual-rate="${plan.rate}">${currency.format(plan.rate)}</strong><span>/ unit / year</span></div>
      <p>${escapeHtml(plan.description)}</p>
      <h4>Suggested scope</h4><ul>${plan.scope.map(item=>`<li>${escapeHtml(item)}</li>`).join('')}</ul>
      <a class="button button-outline" href="?service=amc&amp;plan=${plan.id}#plan-builder" data-amc-plan="${plan.id}">Choose ${escapeHtml(plan.name)}</a>
      </article>`).join('')}</div>
  </section>

  <section class="amc-contract"><div class="section wrap amc-contract-grid">
    <div>${eyebrow('Contract scope')}<h2>What goes into your agreement?</h2>
      <p>A home with two split AC units needs a different checklist from a warehouse with a cold room. Your written proposal names the assets, the work on each visit and the contact who can approve repairs.</p>
      <div class="amc-property-choices"><span>Plan for your property</span>${[['Apartment','Homes & villas'],['Office','Offices & retail'],['Warehouse','Warehouses']].map(([value,label])=>`<a class="inline-link" data-amc-property="${value}" href="?service=amc&amp;property=${value}#plan-builder">${label}</a>`).join('')}</div>
    </div>
    <dl class="amc-scope-list"><div><dt>Scheduled maintenance</dt><dd>List the cooling equipment, drains, fixtures and electrical points you want checked. Agree access, the work window and what the technician records after each visit.</dd></div>
      <div><dt>Breakdowns, labour and parts</dt><dd>Agree the call-out allowance, attendance hours and labour limits. The proposal should identify which materials are covered and who approves a replacement or extra visit.</dd></div>
      <div><dt>Specialist equipment</dt><dd>For cold rooms, pumps or multi-site plant, share the model, location and operating hours. These assets need a written scope and may carry a separate price.</dd></div>
    </dl></div></section>

  <section class="amc-proposal" id="plan-builder"><div class="section wrap split split-start">
    <div>${sectionIntro('Plan your cover', 'Build your AMC proposal', 'Choose the visit calendar and payment schedule separately. For example, you can request quarterly visits and pay yearly. The written proposal confirms both.')}
      <ul class="amc-frequency-list">${frequencies.map(f=>`<li><strong>${f.label}</strong><span>${f.count} ${f.count===1?'visit':'visits'} per year</span></li>`).join('')}</ul>
      <a class="button button-outline" data-amc-estimate href="/estimate/?mode=amc#calculator">Estimate AMC cost</a></div>
    ${quoteForm({title:'Request an AMC proposal',label:'Annual cover',description:'Tell us which units and systems to include. You can review the request before opening WhatsApp.',selectedService:'amc'})}
  </div></section>`;
}

function projects() {
  return `<section class="section wrap page-intro">
    ${heading('PROJECTS', 'Maintenance and repair projects.', 'Explore the work we can assess and quote for, from office cooling to apartment handovers. The images illustrate each type of work.')}
    <div class="text-grid photo-projects">${projectScopes.map(([type, title, description, service, asset, alt]) => `<article>
      ${image(asset, alt, 'project-card-photo', false, '(max-width: 495px) 95vw, (max-width: 760px) 46vw, 32vw')}
      <div class="project-card-content">${eyebrow(type)}<h2>${escapeHtml(title)}</h2><p>${escapeHtml(description)}</p><a class="inline-link" href="${escapeHtml(enquiry(service))}">Discuss similar work</a></div>
    </article>`).join('')}</div>
  </section>${contactStrip()}`;
}

function blog() {
  return `<section class="section wrap page-intro">
    ${heading('BLOG', 'Property maintenance guides.', 'Practical notes on preparing for a visit and checking completed work.')}
    <div class="text-grid">${services.map(service => {
      const guide = tradeGuides[service.id];
      return `<article>${eyebrow(service.name)}<h2>${escapeHtml(guide.title)}</h2><p>${escapeHtml(guide.preparation)}</p><a class="inline-link" href="${servicePath(serviceSectors[0], service)}">${escapeHtml(service.name)} service guide for Dubai homes</a></article>`;
    }).join('')}</div>
  </section>`;
}

function careers() {
  const applicationEmail = `${email}?subject=${encodeURIComponent('Careers enquiry | ServiceBay')}`;
  return `<section class="section wrap page-intro">
    ${heading('CAREERS', 'Work with ServiceBay.', 'Interested in property maintenance or technical services work in Dubai? Tell us about your trade and experience.')}
    <div class="inline-panel"><div><h2>Send a careers enquiry</h2><p>Include your trade, relevant experience, availability and contact details.</p></div>${button('Email ServiceBay', applicationEmail, 'dark')}</div>
  </section>`;
}

function contact() {
  return `<section class="section wrap page-intro contact-layout">
    <div class="contact-overview"><div class="contact-info">
      <div class="contact-hero">
        ${heading('Contact & dispatch', 'How can we help?', 'Speak with the team about a repair, a service visit or an annual maintenance plan.')}
        <a class="contact-call" href="${phone}">${icon('phone')} <span>${business.phoneLabel}</span></a>
      </div>
      <dl class="contact-channels">
        <div><dt><span class="icon-tile">${icon('email')}</span>Email</dt><dd><a href="${email}">${business.email}</a></dd></div>
        <div><dt><span class="icon-tile">${icon('message')}</span>WhatsApp</dt><dd><a href="${whatsapp}">Message the team</a></dd></div>
        <div><dt><span class="icon-tile">${icon('calendar')}</span>Hours in Dubai</dt><dd>${business.hours}</dd></div>
      </dl>
    </div>
    <section class="contact-location" aria-labelledby="location-title">
      <div class="location-summary"><div><p class="eyebrow">Visit our office</p><h2 id="location-title">ServiceBay in Business Bay</h2><p>${escapeHtml(business.address)}</p></div><a class="inline-link" href="${escapeHtml(officeMap)}" target="_blank" rel="noopener noreferrer">Get directions</a></div>
      <div class="area-map"><iframe title="Location of the ServiceBay office at Opal Tower in Business Bay, Dubai" src="${escapeHtml(officeMapEmbed)}" width="600" height="320" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe></div>
    </section></div>
    ${quoteForm({ title: 'Request a service quote', label: 'Service enquiry', description: 'Tell us about the property and the work you need.' })}
  </section>${trustDetails()}`;
}

function policyPage({ title, intro, sections }) {
  return `<article class="section wrap page-intro policy-page">
    ${heading('LEGALS', title, intro)}
    ${sections.map(([name, copy]) => `<section><h2>${escapeHtml(name)}</h2><p>${copy}</p></section>`).join('')}
  </article>`;
}

function announcementBar() {
  return `<div class="utility-announcements" data-announcements>
    <div class="announcement-messages">${announcements.map(({ label, text }, index) => `<p data-announcement${index ? ' hidden' : ''}><span class="announcement-badge">${escapeHtml(label)}</span><span>${escapeHtml(text)}</span></p>`).join('')}</div>
    <button class="announcement-play" type="button" data-announcement-play hidden>Pause announcements</button>
  </div>`;
}

function analyticsChoices(ar=false) {
  if (!measurementId) return '';
  return `<div class="wrap analytics-settings"><button type="button" data-analytics-settings>${ar?'إعدادات التحليلات':'Analytics settings'}</button></div>
    <section class="analytics-choices" data-analytics-choices hidden aria-label="${ar?'إعدادات التحليلات':'Analytics choices'}"><p>${ar?'هل تسمح باستخدام التحليلات لقياس زيارات الصفحات والنقرات على الاتصال وواتساب؟':'Allow analytics to measure page visits and taps on our phone and WhatsApp links?'}</p>
    <button type="button" class="button button-dark" data-accept>${ar?'أوافق':'Allow'}</button><button type="button" class="button button-outline" data-decline>${ar?'رفض':'Decline'}</button></section>`;
}

function arabicLayout(info,title,description,body) {
  return `<!doctype html><html lang="ar-AE" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">${headTags(info,title,description)}
    <link rel="stylesheet" href="/styles.css"><link rel="stylesheet" href="/sections.css"></head><body>
    <a class="skip-link" href="#main">انتقل إلى المحتوى</a><header class="ar-head"><div class="wrap"><a href="/ar/" aria-label="ServiceBay"><img src="${business.logo}" alt="ServiceBay" width="185" height="36"></a><a href="/" lang="en" hreflang="en-AE">English</a></div></header>
    ${body}<footer class="ar-footer"><div class="wrap"><strong>ServiceBay</strong><span>دبي، الإمارات العربية المتحدة</span><a dir="ltr" href="${phone}">${business.phoneInternationalLabel}</a><a href="${email}">${business.email}</a></div></footer>${analyticsChoices(true)}${floatingContact(true)}</body></html>`;
}

function layout({ path, title, description, body }) {
  const info = pageInfo(path,title);
  if (info.ar) return arabicLayout(info,title,description,body);
  const nav = pages.map(([href, label]) => href === '/services/'
    ? serviceNavigation(path.startsWith(href))
    : `<a href="${href}"${href === path ? ' aria-current="page"' : ''}>${label}</a>`).join('');
  return `<!doctype html>
<html lang="en-AE">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#f9f8f5">
  ${headTags(info,title,description)}
  <link rel="stylesheet" href="/styles.css">
  <link rel="stylesheet" href="/sections.css">
  <script src="/region-data.js" defer></script>
  <script src="/site.js?v=studio-insights-1" defer></script>${path === '/' || path === '/estimate/' || path.startsWith('/services/') ? '\n  <script src="/home-tools.js" defer></script>' : ''}

</head>
<body${info.trade ? ' class="trade-page"' : ''}>
  <a class="skip-link" href="#main">Skip to content</a>
  <header class="site-header">
    <div class="utility-bar">
      <div class="head-inner utility-inner">
        ${announcementBar()}
        <div class="desktop-tools">
        <div class="utility-contact" id="utility-contact">
          <div class="country-control">
            <div class="country-native"><img src="/assets/flags/ae.svg" alt="" width="22" height="16"><select class="utility-region" data-region-select aria-label="Country and currency">${regionOptions(true)}</select></div>
            <details class="country-menu" hidden><summary aria-label="Choose country and currency"><img data-region-flag src="/assets/flags/ae.svg" alt="" width="22" height="16"><span data-region-name>UAE · AED</span></summary>
            <div class="country-list">${Object.entries(regions).map(([code, region]) => `<button type="button" data-country="${code}" aria-pressed="false"><img src="/assets/flags/${code.toLowerCase()}.svg" alt="" width="22" height="16"><span>${region.short}</span><small>${region.currency}</small></button>`).join('')}</div></details>
          </div>
          <a href="${email}" class="utility-email">${icon('email')}${business.email}</a>
          <a href="${phone}">${icon('phone')}${business.phoneLabel}</a>
        </div></div>
      </div>
    </div>
    <div class="head-inner">
      ${brand()}
      <nav id="navigation" aria-label="Main navigation">${nav}<div class="mobile-tools"></div></nav>
      <a class="button button-primary" href="${enquiry(info.trade?.id)}" data-open-quote>Request a quote</a>
      <button type="button" id="menu-toggle" aria-label="Open menu" aria-controls="navigation" aria-expanded="false" hidden><svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg></button>
    </div>
  </header>
  <main id="main">${breadcrumbs(info)}${body}</main>
  ${footer()}${analyticsChoices()}${floatingContact()}
  ${info.trade ? '' : `<dialog class="quote-dialog" id="quote-dialog" aria-labelledby="popup-enquiry-title">
    <button type="button" class="quote-close" aria-label="Close quote form" data-close-quote>×</button>
    ${quoteForm({ title: 'Request a quote', label: 'ServiceBay', panelId: 'popup-enquiry', popup: true, selectedService: path === '/amc/' ? 'amc' : '' })}
  </dialog>`}
</body>
</html>
`;
}

const routes = [
  ['/', 'AC, Plumbing & Electrical Maintenance in Dubai', 'AC servicing, plumbing, electrical & AMC for Dubai homes and businesses. Free quote — call or WhatsApp today.', home()],
  ['/ar/', 'صيانة التكييف والسباكة والكهرباء في دبي', 'خدمات صيانة المكيفات والسباكة والكهرباء وعقود الصيانة السنوية للمنازل والشركات في دبي. تواصل مع ServiceBay عبر الهاتف أو واتساب لطلب عرض سعر مجاني.', arabicHome()],
  ['/service-areas/', 'Dubai Property Maintenance Service Areas', 'Explore the Dubai neighbourhoods ServiceBay covers, find local repair services and prepare access instructions for your technician.', areaDirectory()],
  ...localAreas.map(a=>[`/service-areas/${a.slug}/`,`Property Maintenance in ${a.name}`,a.intro,areaDetail(a)]),
  ['/industrial/','Industrial Maintenance & Refrigeration in Dubai','Cold-room and freezer-room refrigeration, warehouse lighting, water supply and building repairs in Dubai. Request a site assessment with ServiceBay.',industrialPage()],
  ['/about/', 'About us', 'Meet ServiceBay, a property maintenance company serving Dubai.', about()],
  ['/services/', 'Technical services', 'Ask about AC, plumbing, electrical, painting, carpentry, handyman, ceiling, and flooring work in Dubai.', servicePage()],
  ['/amc/', 'Annual Maintenance Contracts & Plans in Dubai', 'Compare three annual maintenance plans for Dubai homes, businesses and warehouses. Explore proposed cover, annual prices and visit schedules, then request a quote.', amc()],
  ['/residential/', 'Residential maintenance', audiences.residential.description, audiencePage(audiences.residential)],
  ['/commercial/', 'Commercial maintenance', audiences.commercial.description, audiencePage(audiences.commercial)],
  ...services.map(service => [
    tradePath(service.id), guides[service.id].title, guides[service.id].meta, serviceDetails(service),
  ]),
  ['/blog/', 'Property maintenance guides', 'Practical maintenance guides from ServiceBay.', blog()],
  ['/projects/', 'Project scopes', 'Explore the kinds of maintenance and repair work ServiceBay can assess and quote for in Dubai.', projects()],
  ...(hasReviewProfile ? [['/reviews/', 'Customer feedback', 'Customer feedback and service visit enquiries for ServiceBay.', reviewSection(true) + contactStrip()]] : []),
  ['/careers/', 'Careers', 'Send a technical services careers enquiry to ServiceBay Dubai.', careers()],
  ['/contact/', 'Contact and quotes', 'Contact ServiceBay or prepare a WhatsApp request for property maintenance in Dubai.', contact()],
  ...policies.map(policy => [policy.path, policy.title, policy.intro, policyPage(policy)]),
  ['/estimate/', 'Cost estimator', 'Estimate repair, annual maintenance, and renovation costs across six GCC currencies using example rates.', `<h1 class="visually-hidden">ServiceBay cost estimates</h1>${calculator()}${contactStrip()}`],
];

await writeFile('dist/region-data.js', `const siteRegions = ${JSON.stringify(regions)};\n`);
await writeFile('dist/dispatch-feed.json', JSON.stringify(createDispatchFeed(dispatchSchedule)) + '\n');

for (const [path, title, description, body] of routes) {
  const directory = `dist${path}`;
  await mkdir(directory, { recursive: true });
  await writeFile(`${directory}index.html`, layout({ path, title, description, body }).replace(/^[ \t]+$/gm, ''));
}

// A canonical path is generated from the route table, never from a visitor's query string.
const sitemap = routes.map(([path])=>`  <url><loc>${escapeHtml(business.origin+path)}</loc></url>`).join('\n');
await writeFile('dist/sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemap}\n</urlset>\n`);
await writeFile('dist/robots.txt', `User-agent: *\nAllow: /\nSitemap: ${business.origin}/sitemap.xml\n`);
const legacyRoutes = serviceSectors.flatMap(sector => [
  [`/services/${sector.id}/`, `/${sector.id}/`],
  ...sectorServices(sector).map(service => [`/services/${sector.id}/${service.id}/`, servicePath(sector,service)]),
]);
const aliases = hasReviewProfile ? legacyRoutes : [...legacyRoutes, ['/reviews/', '/contact/']];
for (const [oldPath, destination] of aliases) {
  const directory = 'dist' + oldPath;
  await mkdir(directory,{recursive:true});
  const canonical = destination.split('#')[0];
  await writeFile(directory + 'index.html', `<!doctype html><html lang="en-AE"><head><meta charset="utf-8"><link rel="canonical" href="${business.origin}${canonical}"><meta http-equiv="refresh" content="0;url=${destination}"><title>ServiceBay - Page moved</title></head><body><a href="${destination}">Continue to ServiceBay</a><script>const target=new URL(document.querySelector('a').href);target.search=location.search;if(location.hash)target.hash=location.hash;location.replace(target.href);</script></body></html>`);
}
await writeFile('dist/_redirects', aliases.map(([from,to]) => `${from} ${to} 301`).join('\n')+'\n');
await writeFile('vercel.json', JSON.stringify({
  buildCommand:'npm run build',outputDirectory:'public',
  rewrites:[{source:'/:path*',destination:'/api/site?__sb_path=:path*'}],
  functions:{'api/site.mjs':{includeFiles:'drizzle/0000_servicebay.sql'}},
  redirects:legacyRoutes.map(([source,destination])=>({source,destination,permanent:true})),
},null,2)+'\n');
