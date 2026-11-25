'use strict';

function enableAvailability(form) {
  const area = form.elements.namedItem('area');
  const property = form.elements.namedItem('property');
  const country = form.elements.namedItem('country');
  const status = form.querySelector('.slot-status');
  const bookLink = form.querySelector('.availability-footer a');
  let checkNumber = 0;

  function setBookingLink(visit) {
    const url = new URL(form.action);
    url.searchParams.set('country', country.value);
    if (area.value) url.searchParams.set('area', area.value);
    if (property.value) url.searchParams.set('property', property.value);
    if (visit) url.searchParams.set('visit', visit);
    bookLink.href = url.href;
  }

  function reset() {
    checkNumber += 1;
    setBookingLink();
    status.textContent = 'Select your area and property type to check for a time.';
    delete status.dataset.coverage;
  }

  function updateLocations() {
    const region = currentRegion();
    country.value = regionPicker.value;
    form.querySelector('[data-booking-location]').textContent = region.areaLabel;
    area.replaceChildren(new Option('Select your area', '', true, true),
      ...region.areas.map(location => new Option(location)));
    area.options[0].disabled = true;
    reset();
  }

  form.addEventListener('change', reset);
  document.addEventListener('servicebay:region', updateLocations);

  form.addEventListener('submit', async event => {
    event.preventDefault();
    reset();
    const check = checkNumber;
    status.textContent = 'Checking team availability…';
    try {
      const response = await fetch('/dispatch-feed.json', { cache: 'no-store' });
      if (!response.ok) throw new Error('Availability feed unavailable');
      const schedule = await response.json();
      if (check !== checkNumber) return;
      const now = Date.now();
      const active = Date.parse(schedule.validUntil) > now;
      const slot = active ? schedule.slots.find(entry =>
        entry.country === country.value && entry.areas.includes(area.value) &&
        entry.properties.includes(property.value) && Date.parse(entry.start) > now
      ) : null;
      if (slot) {
        const time = new Intl.DateTimeFormat('en-AE', {
          timeZone: currentRegion().timeZone, weekday: 'short', month: 'short', day: 'numeric',
          hour: 'numeric', minute: '2-digit',
        }).formatRange(new Date(slot.start), new Date(slot.end));
        status.textContent = 'Next available: ' + time + ' (local time) · ' + slot.team + '. Request it for confirmation.';
        status.dataset.coverage = 'covered';
        setBookingLink('Requested time: ' + time + ' (local time), ' + slot.team + '. Start: ' + slot.start + '.');
        return;
      }
      if (active) {
        status.textContent = 'No team time is listed for this selection. Contact dispatch to check coverage and alternatives.';
        status.dataset.coverage = 'enquire';
        return;
      }
    } catch {
      if (check !== checkNumber) return;
    }
    status.textContent = 'Team availability is confirmed by dispatch. Request a visit to check times for ' + area.value + '.';
    status.dataset.coverage = 'enquire';
  });

  updateLocations();
}

function enablePropertyServices(switcher) {
  const cards = Array.from(document.querySelectorAll('.service-grid-home [data-examples]'), card => ({
    card,
    description: card.querySelector('p'),
    link: card.querySelector('a'),
    examples: JSON.parse(card.dataset.examples),
  }));

  switcher.addEventListener('change', event => {
    const sector = event.target.value;
    for (const card of document.querySelectorAll('.service-grid-home [data-sector-only]')) {
      card.hidden = card.dataset.sectorOnly !== sector;
    }

    for (const { card, description, link, examples } of cards) {
      const example = examples[sector];
      card.hidden = !example;
      if (!example) continue;
      description.textContent = example.replace(/\.$/, '') + '.';
      link.href = card.dataset.tradePath + '#' + sector;
    }
  });

  switcher.hidden = false;
}

function enableCalculator(form) {
  const fields = form.elements;
  const params = new URLSearchParams(location.search);
  const properties = JSON.parse(form.dataset.properties);
  const fixedService = form.dataset.service;
  function applySector(value) {
    for (const input of form.querySelectorAll('input[name^="sector-"]')) {
      if (input.value === value) input.checked = true;
    }
  }
  applySector(params.get('sector') || location.hash.slice(1));
  if (fixedService) window.addEventListener('hashchange', () => {
    applySector(location.hash.slice(1));
    updateEstimate();
  });
  const requestedMode = params.get('mode');
  if (!fixedService && ['core', 'amc', 'renovation'].includes(requestedMode)) {
    fields.namedItem('mode').value = requestedMode;
  }
  const panels = Array.from(form.querySelectorAll('[data-estimate-scope]'));
  const link = form.querySelector('#estimate-enquiry');
  const subtotalOutput = form.querySelector('.estimate-subtotal');
  const discountOutput = form.querySelector('.estimate-discount');
  const handlingOutput = form.querySelector('.estimate-handling');
  const taxOutput = form.querySelector('.estimate-tax');
  const totalOutput = form.querySelector('.estimate-total');
  const discountLine = form.querySelector('.estimate-discount-line');
  const taxLine = form.querySelector('.estimate-tax-line');
  const quantityCount = form.querySelector('.quantity-count');
  const unitLabel = form.querySelector('.unit-label');
  const promoInput = fields.namedItem('promo');
  const promoStatus = form.querySelector('#promo-status');
  const handlingRate = Number(form.dataset.handlingRate);
  const taxCaption = taxLine.querySelector('span');
  const totalCaption = form.querySelector('[data-total-caption]');
  const periodLine = form.querySelector('.payment-period');
  const billing = fields.namedItem('amc-billing');
  const visitSchedule = fields.namedItem('amc-visits');
  if (billing) {
    const plan = params.get('plan');
    const picked = Array.from(form.querySelectorAll('input[name="amc"]')).find(input => input.value === plan);
    if (picked) picked.checked = true;
    applyOption(billing, params.get('billing'));
    applyOption(visitSchedule, params.get('schedule'));
  }
  const estimateCurrency = form.querySelector('[data-estimate-currency]');
  const fxNote = form.querySelector('.estimate-fx');
  const totalBlock = form.querySelector('.estimate-grand');
  const quoteOnlyMessage = form.querySelector('.estimate-quote-only');
  const costLines = form.querySelector('.cost-lines');
  const customNotice = form.querySelector('.estimate-custom');
  const controlsForPricing = [promoInput, form.querySelector('[data-apply-promo]')].filter(Boolean);
  const coreServices = fields.namedItem('core');
  const requestedService = params.get('service');
  if (Array.from(coreServices.options).some(option => option.value === requestedService)) {
    coreServices.value = requestedService;
    if (coreServices.selectedOptions[0]?.hasAttribute('data-quote-only')) applySector('industrial');
  }
  const codes = new Map(JSON.parse(form.dataset.promoCodes || '[]').map(promo => [promo.code.trim().toUpperCase(), promo]));
  let activePromo = null;

  function updateEstimate() {
    const mode = fixedService ? 'core' : fields.namedItem('mode').value;
    const sector = fields.namedItem('sector-' + mode).value;
    const region = currentRegion();
    const currency = new Intl.NumberFormat('en-AE', {
      style: 'currency', currency: region.currency, currencyDisplay: 'code',
    });
    const minor = 10 ** currency.resolvedOptions().maximumFractionDigits;
    const price = aed => Math.round(aed * region.perAed * minor);
    const format = amount => currency.format(amount / minor);
    estimateCurrency.textContent = region.currency;
    fxNote.hidden = region.currency === 'AED';
    const core = mode === 'core';
    const currentPanel = panels.find(panel => panel.dataset.estimateScope === mode);
    let option;
    if (mode === 'amc') {
      option = currentPanel.querySelector('input[name="amc"]:checked');
    } else {
      const select = fields.namedItem(mode);
      for (const item of select.options) item.disabled = item.hidden = !item.dataset.sectors.split(' ').includes(sector);
      if (!select.selectedOptions[0] || select.selectedOptions[0].disabled) {
        select.selectedIndex = Array.from(select.options).findIndex(item => !item.disabled);
      }
      option = select.selectedOptions[0];
    }

    for (const panel of panels) {
      const active = panel === currentPanel;
      panel.hidden = !active;
      for (const input of panel.querySelectorAll('input, select')) input.disabled = !active;
    }

    const url = new URL('/contact/#enquiry', location.origin);
    url.searchParams.set('service', core ? option?.value ?? 'other' : mode === 'amc' ? 'amc' : 'other');
    url.searchParams.set('property', properties[sector]);
    url.searchParams.set('country', regionPicker.value);
    const equipmentQuote = Boolean(option?.hasAttribute('data-quote-only'));
    const quoteOnly = !option || equipmentQuote;
    const coldRoomNote = form.querySelector('[data-refrigeration-note]');
    if (coldRoomNote) coldRoomNote.hidden = !(core && sector === 'industrial' && (fixedService === 'hvac' || equipmentQuote));
    const quantityInput = fields.namedItem('quantity');
    quantityInput.hidden = equipmentQuote;
    quantityInput.disabled = !core || equipmentQuote;
    unitLabel.closest('label').hidden = equipmentQuote;
    const renovationSelect = fields.namedItem('renovation');
    if (renovationSelect) renovationSelect.closest('label').hidden = mode === 'renovation' && quoteOnly;
    if (customNotice) customNotice.hidden = mode !== 'renovation' || !quoteOnly;
    costLines.hidden = totalBlock.hidden = quoteOnly;
    quoteOnlyMessage.hidden = !quoteOnly;
    periodLine.hidden = mode !== 'amc';
    totalCaption.textContent = mode === 'amc' ? 'Estimated annual total' : 'Estimated total';
    for (const control of controlsForPricing) control.disabled = quoteOnly;
    if (mode === 'amc') {
      for (const plan of currentPanel.querySelectorAll('input[name="amc"]')) {
        plan.closest('label').querySelector('[data-plan-price]').textContent = format(price(Number(plan.dataset.rate))) + ' / unit / year';
      }
    }
    if (quoteOnly) {
      url.searchParams.set('estimate', equipmentQuote ? 'Please assess my cold room or freezer room for a site-specific refrigeration quote.' : 'Please quote for industrial renovation.');
      link.href = url.href;
      return;
    }

    const name = option.dataset.title ?? option.textContent.trim();
    let quantity = 1;
    if (core) {
      const control = fields.namedItem('quantity');
      control.max = option.dataset.limit;
      quantity = control.valueAsNumber;
    }
    if (mode === 'amc') quantity = Number(fields.namedItem('amc-quantity').value);
    const subtotal = price(Number(option.dataset.rate) * quantity);
    const fee = Math.round(subtotal * handlingRate);
    const promoApplies = activePromo && (!activePromo.modes || activePromo.modes.includes(mode));
    const discount = promoApplies ? Math.min(subtotal, Math.round(
      activePromo.type === 'percent' ? subtotal * activePromo.value / 100 : price(activePromo.value)
    )) : 0;
    const beforeTax = subtotal - discount + fee;
    const tax = Math.round(beforeTax * region.vat);

    if (core) {
      unitLabel.textContent = option.dataset.unit;
      if (fixedService) form.querySelector('[data-unit-rate]').textContent = 'Unit rate ' + format(price(Number(option.dataset.rate)));
      quantityCount.value = quantity;
    }
    if (activePromo) {
      promoStatus.textContent = promoApplies ? 'Promo applied.' : 'This promo code does not apply to this category.';
      promoStatus.dataset.state = promoApplies ? 'active' : 'error';
    }

    subtotalOutput.value = format(subtotal);
    discountLine.hidden = discount === 0;
    discountOutput.value = format(-discount);
    handlingOutput.value = format(fee);
    taxCaption.textContent = region.vat ? 'Estimated VAT (' + region.short + ' · ' + (region.vat * 100) + '%)' : 'VAT (' + region.short + ' · not applicable)';
    taxOutput.value = format(tax);
    totalOutput.value = format(beforeTax + tax);

    let scope = name;
    if (core) scope = quantity + ' × ' + name;
    if (mode === 'amc') {
      const period = billing.selectedOptions[0];
      const payments = Number(period.dataset.times);
      const instalment = format(Math.round((beforeTax + tax) / payments));
      periodLine.textContent = payments === 1 ? 'Yearly payment · ' + instalment : period.textContent + ' billing · about ' + instalment + ' per payment (' + payments + ' per year)';
      url.searchParams.set('plan', option.value);
      const linkedProperty = params.get('property');
      if (linkedProperty && sector === params.get('sector')) url.searchParams.set('property', linkedProperty);
      url.searchParams.set('billing', billing.value);
      if (visitSchedule.value) url.searchParams.set('schedule', visitSchedule.value);
      scope = name + ' for ' + quantity + (quantity === 1 ? ' property unit' : ' property units') + ' per year';
    }
    const promoText = promoApplies ? ' Promo: ' + activePromo.code + '.' : '';
    const taxText = region.vat ? ' (includes ' + (region.vat * 100) + '% estimated VAT)' : ' (VAT not applicable)';
    url.searchParams.set('estimate', 'Please quote for ' + scope + '. Planning estimate: ' + totalOutput.value + taxText + '.' + promoText);
    link.href = url.href;
  }

  function applyPromo() {
    const code = promoInput.value.trim().toUpperCase();
    const promo = codes.get(code);
    const valid = promo && ['percent', 'fixed'].includes(promo.type) &&
      Number.isFinite(promo.value) && promo.value > 0 && (promo.type !== 'percent' || promo.value <= 100);
    activePromo = valid ? promo : null;
    if (!valid) {
      promoStatus.textContent = code ? 'This promo code is unavailable.' : 'Enter a promo code to apply it.';
      promoStatus.dataset.state = 'error';
    }
    updateEstimate();
  }

  form.querySelector('[data-apply-promo]')?.addEventListener('click', applyPromo);
  promoInput?.addEventListener('input', () => {
    activePromo = null;
    promoStatus.textContent = '';
    delete promoStatus.dataset.state;
  });
  promoInput?.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      event.preventDefault();
      applyPromo();
    }
  });
  document.addEventListener('servicebay:region', updateEstimate);
  form.addEventListener('input', updateEstimate);
  form.addEventListener('change', updateEstimate);
  form.addEventListener('submit', event => event.preventDefault());

  for (const fieldset of form.querySelectorAll('fieldset')) fieldset.disabled = false;
  updateEstimate();
}

function enableBanner(banner) {
  const slides = Array.from(banner.querySelectorAll('[data-banner-slide]'));
  if (slides.length < 2) return;

  const selector = banner.querySelector('.banner-selector');
  const buttons = Array.from(selector.querySelectorAll('[data-banner-index]'));
  const copy = buttons.map(button => JSON.parse(button.dataset.copy));
  const copyFields = ['kicker', 'description'];
  const targets = copyFields.map(field => banner.querySelector('[data-banner-' + field + ']'));
  const status = banner.querySelector('[data-banner-status]');
  const toggle = selector.querySelector('[data-banner-auto]');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let current = 0;
  let paused = reducedMotion.matches;
  let timer;

  function show(index, announce = false) {
    current = index;
    for (const [position, slide] of slides.entries()) {
      const selected = position === index;
      slide.hidden = !selected;
      if (selected) buttons[position].setAttribute('aria-current', 'true');
      else buttons[position].removeAttribute('aria-current');
    }
    for (const [position, field] of copyFields.entries()) {
      targets[position].textContent = copy[current][field];
    }
    if (announce) status.textContent = 'Showing ' + slides[index].dataset.label;
  }

  function syncTimer() {
    clearInterval(timer);
    toggle.dataset.paused = String(paused);
    toggle.setAttribute('aria-label', paused ? 'Play banner rotation' : 'Pause banner rotation');
    if (!paused) timer = setInterval(() => {
      if (!document.hidden && !selector.matches(':hover, :focus-within')) show((current + 1) % slides.length);
    }, 6500);
  }

  for (const [index, button] of buttons.entries()) {
    button.addEventListener('click', () => {
      show(index, true);
      syncTimer();
    });
  }
  toggle.addEventListener('click', () => {
    paused = !paused;
    syncTimer();
  });
  reducedMotion.addEventListener('change', () => {
    paused = reducedMotion.matches;
    syncTimer();
  });
  selector.hidden = false;
  syncTimer();
}

function enableGallery(gallery) {
  const items = Array.from(gallery.querySelectorAll('[data-gallery-item]'));
  const pageSize = 2;
  if (items.length <= pageSize) return;

  const controls = gallery.querySelector('.gallery-controls');
  const button = controls.querySelector('[data-more-projects]');
  const count = controls.querySelector('.gallery-count');
  const lastStart = items.length - pageSize;
  let start = 0;

  button.addEventListener('click', () => {
    start = start === lastStart ? 0 : Math.min(start + pageSize, lastStart);
    items.forEach((item, index) => {
      item.hidden = index < start || index >= start + pageSize;
    });
    count.textContent = (start + 1) + '–' + (start + pageSize) + ' of ' + items.length;
    button.textContent = start === lastStart ? 'First projects' : 'More projects';
  });
  controls.hidden = false;
}

function enableComparison(comparison) {
  const range = comparison.querySelector('input');
  range.addEventListener('input', () => comparison.style.setProperty('--split', range.value + '%'));
  range.hidden = false;
}

const availability = document.querySelector('#availability');
if (availability) enableAvailability(availability);
const propertySwitcher = document.querySelector('.service-switch');
if (propertySwitcher) enablePropertyServices(propertySwitcher);
const calculator = document.querySelector('#estimate-form');
if (calculator) enableCalculator(calculator);
const comparison = document.querySelector('.comparison');
if (comparison) enableComparison(comparison);

const banner = document.querySelector('[data-banner]');
if (banner) enableBanner(banner);
const gallery = document.querySelector('[data-gallery]');
if (gallery) enableGallery(gallery);
