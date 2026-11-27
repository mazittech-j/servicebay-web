import { tradePath } from './primary-guides.mjs';
import { hasReviewProfile } from './settings.mjs';
import { frequencyOptions, maintenancePlans } from './amc.mjs';
import { paymentMarks } from './payment-marks.mjs';
import { areas, business, propertyLogos, estimateChoices, officeMap, promoCodes, properties, refrigeration, sectorExample, serviceHandlingRate, services, serviceSectors, socialProfiles } from './content.mjs';
import { exchangeReference, regions } from './regions.mjs';

export const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[character]);

const glyphs = {
  facebook: '<path d="M15 21v-8h3l.5-3H15V8c0-1 .4-1.5 1.6-1.5H19V3.8c-.6-.1-1.6-.3-2.8-.3-2.8 0-4.5 1.7-4.5 4.7V10H9v3h2.7v8"/>',
  instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.3 6.7h.01"/>',
  youtube: '<rect x="3" y="5.5" width="18" height="13" rx="3"/><path d="m10 9 5 3-5 3Z"/>',
  tiktok: '<path d="M14 4v11.5a4 4 0 1 1-4-4h1m3-7.5a6 6 0 0 0 5.5 5.2"/>',
  pin: '<path d="M20 10c0 5-8 10-8 10S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
  home: '<path d="m3 11 9-8 9 8M5 9v11h14V9M10 20v-6h4v6"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 10h18m-12 5 2 2 4-4"/>',
  tools: '<path d="m13 15-5 5a2 2 0 0 1-3-3l5-5M14 4l-3 3 1 4 4 1 3-3a5 5 0 0 1-5 6 5 5 0 1 1 0-11Z"/>',
  hvac: '<path d="M3 8h12a2.5 2.5 0 1 0-2.2-3.7M3 12h16a2 2 0 1 1-2 2M3 16h9a2 2 0 1 1-2 2"/>',
  plumbing: '<path d="M12 3c-2.5 3.8-6.5 7-6.5 11a6.5 6.5 0 1 0 13 0c0-4-4-7.2-6.5-11Z"/><path d="M9 14a3 3 0 0 0 3 3"/>',
  electrical: '<path d="m13 2-9 12h7l-1 8 10-12h-7l1-8Z"/>',
  painting: '<rect x="3" y="4" width="14" height="6" rx="2"/><path d="M17 7h3v5h-8v4"/><rect x="10" y="16" width="4" height="5" rx="1"/>',
  carpentry: '<path d="M5 21h14M6 21V3h12v18M10 3v18m4-9h1"/>',
  handyman: '<path d="m12 8-8 8a2 2 0 0 0 3 3l8-8M9 6l4-4 8 8-4 4-8-8Z"/>',
  ceilings: '<path d="M3 5h18v4H3zM5 9v11m14-11v11M9 9v7m6-7v7"/>',
  flooring: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 12h18M12 3v9m-4 0v9m8-9v9"/>',
  phone: '<path d="M7 3 4 5a2 2 0 0 0-1 2c1 6 8 13 14 14a2 2 0 0 0 2-1l2-3-5-3-2 2c-3-1-5-3-6-6l2-2-3-5Z"/>',
  message: '<path d="M21 11a8 8 0 0 1-8 8h-3l-6 3 1-6a8 8 0 1 1 16-5Z"/><path d="M9 11h6"/>',
  email: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/>',
  globe: '<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/>',
};

export function icon(name) {
  return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${glyphs[name]}</svg>`;
}

export function availabilityChecker() {
  return `<form id="availability" class="availability" action="/contact/#enquiry" method="get" aria-label="Check service availability">
    <input type="hidden" name="country" value="AE">
    <div class="slot-title"><span class="slot-calendar" aria-hidden="true">${icon('calendar')}</span><h2>Find a service slot</h2></div>
    <div class="availability-fields">
      <label><span>${icon('pin')} <span data-booking-location>Dubai location</span></span>
        <select name="area" required><option value="" disabled selected>Select your area</option>${regions.AE.areas.map(area => `<option>${escapeHtml(area)}</option>`).join('')}</select>
      </label>
      <label><span>${icon('home')} Property type</span>
        <select name="property" required><option value="" disabled selected>Select property type</option>${properties.filter(property => property !== 'Other').map(property => `<option>${property}</option>`).join('')}<option>Other</option></select>
      </label>
      <button class="button button-blue" type="submit">Check slots</button>
    </div>
    <div class="availability-footer">
      <p class="slot-status" role="status">Select your area and property type to check for a time.</p>
      <a class="inline-link" href="/contact/#enquiry">Request a visit</a>
    </div>
  </form>`;
}

export function coverageHighlights() {
  const facts = [
    ['pin', `${areas.length} Dubai areas`, 'Local service coverage'],
    ['tools', 'Eight specialist trades', 'Repairs and technical maintenance'],
    ['home', 'Homes & businesses', 'Residential and commercial'],
    ['calendar', 'Annual maintenance', 'Scheduled preventive visits'],
  ];
  return `<div class="wrap coverage-highlights"><ul>${facts.map(([glyph, title, description]) => `
    <li><span class="icon-tile">${icon(glyph)}</span><div><strong>${title}</strong><span>${description}</span></div></li>`).join('')}</ul></div>`;
}

const tradePhotos = {
  hvac: 'home-maintenance-small',
  plumbing: 'plumbing-maintenance-small',
  electrical: 'commercial-maintenance-small',
  painting: 'project-painting-small',
  carpentry: 'service-carpentry',
  handyman: 'service-handyman',
  ceilings: 'project-partitions-small',
  flooring: 'project-flooring-small',
};

const photoDescriptions = {
  hvac: 'Technician inspecting a wall-mounted air conditioner',
  plumbing: 'Technician examining a water pump and copper pipework',
  electrical: 'Technician inspecting a utility panel in a commercial building',
  painting: 'Painter applying a fresh coat to an interior wall',
  carpentry: 'Carpenter using a drill to secure a joint in a timber frame',
  handyman: 'Hands fitting a wooden rail during furniture assembly',
  ceilings: 'Gypsum partition framing and ceiling installation in an office',
  flooring: 'Tile and grout work on an interior floor',
};
export function servicePhoto(service, hero = false) {
  const source = tradePhotos[service.id];
  return `<img class="trade-photo trade-photo-${service.id}" src="/assets/${hero ? source.replace(/-small$/, '') : source}.webp" alt="${escapeHtml(photoDescriptions[service.id])}" width="670" height="447" ${hero ? 'loading="eager" fetchpriority="high"' : 'loading="lazy"'} decoding="async">`;
}

export function propertyServices() {
  return `<section class="section services-home" id="services" aria-labelledby="services-title">
    <div class="wrap">
      <div class="services-toolbar"><div class="section-heading">
        <p class="eyebrow">Our services</p>
        <h2 id="services-title">Property maintenance services in Dubai</h2>
        <p>Repairs and maintenance for homes, businesses and industrial properties.</p>
      </div>
      <fieldset class="segmented service-switch" hidden>
        <legend class="visually-hidden">Choose a service category</legend>
        ${serviceSectors.map(group => `<label><input type="radio" name="service-property" value="${group.id}"${group.id === 'residential' ? ' checked' : ''}><span>${group.label}</span></label>`).join('')}
      </fieldset></div>
      <div class="service-grid service-grid-home">
        ${services.map((service, index) => {
          const examples = Object.fromEntries(serviceSectors.map(group => [group.id, sectorExample(group, service, index)]));
          return `<article class="service-card" data-service="${service.id}" data-trade-path="${tradePath(service.id)}" data-examples="${escapeHtml(JSON.stringify(examples))}">
          ${servicePhoto(service)}
          <h3>${escapeHtml(service.title)}</h3>
          <p>${escapeHtml(examples.residential)}.</p>
          <a class="inline-link" href="${tradePath(service.id, 'residential')}">${escapeHtml(service.name)} services in Dubai</a>
        </article>`;
        }).join('')}
        <article class="service-card refrigeration-card" hidden data-sector-only="industrial"><img class="trade-photo" src="/assets/industrial-cold-room.webp" alt="Evaporator fans inside a walk-in cold room" width="1200" height="800" loading="lazy">
          <h3>Cold-room refrigeration</h3><p>Walk-in chillers, freezer rooms, temperature faults and defrost problems.</p><a class="inline-link" href="${refrigeration.path}">Industrial refrigeration in Dubai</a></article>
      </div>
      <div class="actions section-actions centered-actions"><a class="button button-outline" href="/services/">View all services</a></div>
    </div>
  </section>`;
}

const estimateCurrency = new Intl.NumberFormat('en-AE', {
  style: 'currency', currency: 'AED', currencyDisplay: 'code',
});

export function calculator(focus) {
  const options = entries => entries.map(entry => `<option data-rate="${entry.rate}" data-sectors="${entry.sectors.join(' ')}"${entry.unit ? ` value="${entry.id}" data-unit="${escapeHtml(entry.unit)}" data-limit="${entry.maxQuantity || 20}"` : ''}>${escapeHtml(entry.name)}</option>`).join('');
  const coreServices = services.flatMap((service, index) => {
    if (!service.rate || (focus && focus.service.id !== service.id)) return [];
    const sectors = serviceSectors.filter(sector => sectorExample(sector, service, index)).map(sector => sector.id);
    return [{ ...service, sectors }];
  });
  const propertiesBySector = Object.fromEntries(serviceSectors.map(({ id, property }) => [id, property]));
  const initialFee = Math.round(coreServices[0].rate * serviceHandlingRate * 100) / 100;
  const initialTax = Math.round((coreServices[0].rate + initialFee) * regions.AE.vat * 100) / 100;
  const initialTotal = estimateCurrency.format(coreServices[0].rate + initialFee + initialTax);
  const quoteUrl = focus ? '/contact/?service=' + encodeURIComponent(focus.service.id) + '#enquiry' : '/contact/#enquiry';
  const modes = [['core', 'Core services', 'tools'], ['amc', 'AMC plans', 'calendar'], ['renovation', 'Renovation', 'painting']];
  const sectors = mode => `<fieldset class="estimate-sectors">
    <legend>Property category</legend>
    ${serviceSectors.filter(sector => !focus || coreServices[0].sectors.includes(sector.id)).map(({ id, label }) => `<label><input type="radio" name="sector-${mode}" value="${id}"${id === 'residential' ? ' checked' : ''}><span>${label}</span></label>`).join('')}
  </fieldset>`;
  return `<section class="section calculate-section${focus ? ' focused-calculator' : ''}" id="calculator" aria-labelledby="calculator-title">
    <div class="wrap">
      <header class="estimate-heading"${focus ? ' id="service-quote"' : ''}>
        <p class="eyebrow">${focus ? 'Service estimate' : 'Plan your budget'}</p>
        <h2 id="calculator-title">${focus ? escapeHtml(focus.service.name) + ' cost calculator' : 'Service cost calculator'}</h2>
        <p>${focus ? 'Choose your property type and quantity for an itemised estimate.' : 'Choose your service and property type to see labour, handling and estimated VAT in your selected currency.'}</p>
      </header>
      <form class="calculator" id="estimate-form"${focus ? ` data-service="${focus.service.id}"` : ''} data-handling-rate="${serviceHandlingRate}" data-properties="${escapeHtml(JSON.stringify(propertiesBySector))}"${promoCodes.length ? ` data-promo-codes="${escapeHtml(JSON.stringify(promoCodes))}"` : ''}>
        ${focus ? '' : `<fieldset class="estimate-switch" disabled>
          <legend class="visually-hidden">Estimate category</legend>
          ${modes.map(([value, label, glyph]) => `<label><input type="radio" name="mode" value="${value}"${value === 'core' ? ' checked' : ''}><span>${icon(glyph)}${label}</span></label>`).join('')}
        </fieldset>`}
        <div class="calculator-body">
          <fieldset class="calculator-fields" disabled>
            <legend class="visually-hidden">Estimate options</legend>
            <div class="estimate-scope" data-estimate-scope="core">
              ${sectors('core')}${focus ? '<p class="form-note" data-unit-rate></p>' : ''}
              <label${focus ? ' hidden' : ''}>Service discipline<select name="core">${options(coreServices)}${focus ? '' : `<option value="${refrigeration.id}" data-sectors="industrial" data-quote-only>${refrigeration.name}</option>`}</select></label>
              ${!focus || focus.service.id === 'hvac' ? `<p class="form-note refrigeration-note" data-refrigeration-note hidden>Cold rooms and freezer rooms have a site-specific price. <a href="${refrigeration.path}">See refrigeration services</a>.</p>` : ''}
              <label class="quantity-label" for="estimate-quantity"><span class="unit-label">${escapeHtml(coreServices[0].unit)}</span><output class="quantity-count" for="estimate-quantity">1</output></label>
              <input id="estimate-quantity" name="quantity" type="range" min="1" max="20" step="1" value="1">
            </div>
            ${focus ? '' : `<div class="estimate-scope" data-estimate-scope="amc" hidden>
              ${sectors('amc')}
              <fieldset class="estimate-plans">
                <legend>Annual maintenance plan</legend>
                <div class="estimate-plan-grid">
                ${maintenancePlans.map((plan, index) => `<label>
                  <input type="radio" name="amc" value="${plan.id}" data-rate="${plan.rate}" data-title="${escapeHtml(plan.name)}"${index === 0 ? ' checked' : ''}>
                  <span><strong>${escapeHtml(plan.name)}</strong><span class="tier-focus">${escapeHtml(plan.focus)}</span><small data-plan-price>${estimateCurrency.format(plan.rate)} / unit / year</small></span>
                </label>`).join('')}
                </div>
              </fieldset>
              <div class="amc-choices"><label>Billing frequency<select name="amc-billing">${frequencyOptions()}</select></label>
              <label class="amc-quantity">Property units
                <select name="amc-quantity">${Array.from({ length: 20 }, (_, index) => index + 1).map(quantity => `<option value="${quantity}">${quantity} ${quantity === 1 ? 'unit' : 'units'}</option>`).join('')}</select>
              </label>
              </div><label>Preferred visit schedule<select name="amc-visits"><option value="">Agree in proposal</option>${frequencyOptions()}</select></label>
              <p class="form-note">Rates are annual per property unit. The proposal confirms visit coverage.</p>
            </div>
            <div class="estimate-scope" data-estimate-scope="renovation" hidden>
              ${sectors('renovation')}
              <label>Renovation scope<select name="renovation">${options(estimateChoices.renovation)}</select></label>
              <p class="estimate-custom" hidden>Industrial renovations need a site-specific quote. Tell us what you would like to change.</p>
            </div>
            `}
            ${promoCodes.length ? `<div class="promo-entry">
              <label for="estimate-promo">Promo code</label>
              <div class="promo-fields">
                <input id="estimate-promo" name="promo" type="text" maxlength="32" autocomplete="off" spellcheck="false" placeholder="Enter your code" aria-describedby="promo-status">
                <button class="button button-outline" type="button" data-apply-promo>Apply</button>
              </div>
              <p id="promo-status" class="promo-status" role="status"></p>
            </div>` : ''}
          </fieldset>
          <div class="calculator-result">
            <div class="estimate-result-top"><p class="estimate-caption">Your estimate</p><span class="estimate-currency" data-estimate-currency>AED</span></div>
            <div class="estimate-grand"><span data-total-caption>Estimated total</span><output class="estimate-total" aria-live="polite">${initialTotal}</output></div>
            <p class="estimate-quote-only" hidden>Site-specific quote</p>
            <div class="cost-lines">
              <div><span>Subtotal</span><output class="estimate-subtotal">${estimateCurrency.format(coreServices[0].rate)}</output></div>
              <div class="estimate-discount-line" hidden><span>Promo discount</span><output class="estimate-discount"></output></div>
              <div><span>Service &amp; Handling Fee (${(100 * serviceHandlingRate).toFixed(1)}%)</span><output class="estimate-handling">${estimateCurrency.format(initialFee)}</output></div>
              <div class="estimate-tax-line"><span>Estimated VAT (UAE · 5%)</span><output class="estimate-tax">${estimateCurrency.format(initialTax)}</output></div>
            </div>
            <p class="payment-period" hidden></p>
            <a class="button button-primary" id="estimate-enquiry" href="${quoteUrl}">Ask for a written quote</a>
            <p class="form-note">Planning estimate. Your written quote confirms the work, materials and applicable tax. <span class="estimate-fx" hidden>Converted from AED using the ${exchangeReference.date} <a href="${exchangeReference.url}">reference rates</a>.</span></p>
            <noscript><p><a href="${quoteUrl}">Request a written quote</a> to get a cost estimate.</p></noscript>
          </div>
        </div>
      </form>
    </div>
  </section>`;
}

export function projectProofs() {
  return `<section class="section proof-section" id="project-proofs" aria-labelledby="proof-title">
    <div class="wrap">
      <div class="section-heading heading-centered">
        <h2 id="proof-title">Before &amp; after project proofs</h2>
        <p>Drag the handle to compare an AC filter before and after cleaning in this example.</p>
      </div>
      <figure class="proof">
        <div class="comparison">
          <img class="comparison-after" src="/assets/ac-filter-after.webp" alt="Air conditioner filters after cleaning, with clear mesh." width="1200" height="800" loading="lazy">
          <img class="comparison-before" src="/assets/ac-filter-before.webp" alt="The same filters before cleaning, with a visible layer of dust on the mesh." width="1200" height="800" loading="lazy">
          <span class="comparison-label before-label">Before</span><span class="comparison-label after-label">After</span>
          <span class="comparison-divider" aria-hidden="true"><span>↔</span></span>
          <input type="range" min="0" max="100" value="50" aria-label="Amount of before photo shown" hidden>
        </div>
        <figcaption><strong>AC filter cleaning</strong><span>Illustrative comparison</span></figcaption>
      </figure>
    </div>
  </section>`;
}

export function clientLogoCarousel() {
  const group = (duplicate = false) => `<ul class="logo-group"${duplicate ? ' aria-hidden="true"' : ''}>${propertyLogos.map(({ name, image, dark }) =>
    `<li${dark ? ' class="dark-logo"' : ''}><img src="${escapeHtml(image)}" alt="${duplicate ? '' : escapeHtml(name)}" width="150" height="56" loading="lazy"></li>`
  ).join('')}</ul>`;
  return `<section class="wrap client-logos" aria-labelledby="client-logos-title">
    <div class="client-logos-heading"><h2 id="client-logos-title">Developers &amp; communities</h2></div>
    <div class="logo-window"><div class="logo-track">${group()}${group(true)}</div></div>
  </section>`;
}

export function brand(footer = false) {
  const logo = footer ? business.footerLogo || business.logo : business.logo;
  const mark = '<img class="servicebay-mark" src="/assets/servicebay-favicon.png" alt="" width="35" height="35">';
  return `<a class="brand" href="/" aria-label="${escapeHtml(logo ? business.logoLabel || business.legalName : business.legalName)} home">${logo
    ? `<img class="brand-logo" src="${escapeHtml(logo)}" alt="${escapeHtml(business.logoLabel || business.legalName)}" width="850" height="165">`
    : `${mark}<span class="servicebay-wordmark">ServiceBay<small>Technical Services</small></span>`}</a>`;
}

export function footer() {
  return `<footer class="site-footer">
    <div class="wrap footer-grid">
      <section class="footer-brand">
        ${brand(true)}
        <p>Property repairs and maintenance for apartments, villas, offices, and retail spaces across Dubai.</p>
      </section>
      <section>
        <h3>Company</h3>
        <ul class="footer-links">
          <li><a href="/about/">About Us</a></li>
          <li><a href="/about/#our-team">Our Team</a></li>
          <li><a href="/contact/">Contact Us</a></li>
          <li><a href="/services/">Services</a></li>
          <li><a href="/service-areas/">Service areas</a></li>
          <li><a href="/projects/">Projects</a></li>
        </ul>
      </section>
      <section>
        <h3>Resources &amp; Policies</h3>
        <ul class="footer-links">
          <li><a href="/complaints/">Complaints &amp; Helpdesk</a></li>
          <li><a href="/blog/">Blog</a></li>
          <li><a href="/portal/">Customer portal</a></li>
          <li><a href="/privacy-policy/">Privacy Policy</a></li>
          <li><a href="/terms-and-conditions/">Terms &amp; Conditions</a></li>
          <li><a href="/cookies-policy/">Cookies Policy</a></li>
          ${hasReviewProfile ? '<li><a href="/reviews/">Reviews</a></li>' : ''}
        </ul>
      </section>
      <section class="footer-dispatch">
        <h3>Contact &amp; dispatch</h3>
        <ul class="footer-contact">
          <li><a href="tel:${business.phone}">${icon('phone')}${business.phoneLabel}</a></li>
          <li><a href="https://wa.me/${business.whatsapp}">${icon('message')}${business.phoneInternationalLabel}</a></li>
          <li><a href="mailto:${escapeHtml(business.email)}">${icon('email')}${escapeHtml(business.email)}</a></li>
          <li><a href="${escapeHtml(officeMap)}">${icon('pin')}${escapeHtml(business.address)}</a></li>
        </ul>
      </section>
      <section class="footer-social" id="footer-connect">
        <h3>Connect with us</h3>
        <div class="footer-channels">
          ${socialProfiles.map(({ icon: glyph, label, url }) => {
            const destination = url || 'https://www.google.com/search?q=' + encodeURIComponent('site:' + glyph + '.com "' + business.name + '" Dubai technical services');
            const text = url ? label : 'Find ServiceBay on ' + label;
            return `<a class="social-profile" data-platform="${glyph}" href="${escapeHtml(destination)}" aria-label="${escapeHtml(text)}" title="${escapeHtml(text)}">${icon(glyph)}</a>`;
          }).join('')}
        </div>
        ${socialProfiles.some(profile => !profile.url) ? '<p class="social-note">Social searches open in Google.</p>' : ''}
        <p>${business.hours} <span>(Dubai time)</span></p>
      </section>
    </div>
    <div class="wrap footer-bottom"><span>© ${new Date().getUTCFullYear()} ${business.legalName}</span>${paymentMarks()}</div>
  </footer>`;
}
