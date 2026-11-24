import { siteOrigin, trust } from './settings.mjs';

export const business = {
  name: 'ServiceBay',
  logo: '/assets/servicebay-wordmark.webp',
  logoLabel: 'ServiceBay',
  footerLogo: '', // Optional alternate logo for the dark footer.
  legalName: 'ServiceBay',
  phoneLabel: '056 201 4647',
  phone: '+971562014647',
  phoneInternationalLabel: '+971 56 201 4647',
  whatsapp: '971562014647',
  email: 'maz.ittech@gmail.com',
  address: `${trust.street}, Dubai, United Arab Emirates`,
  hours: 'Mon–Sat, 8:00 AM–6:00 PM',
  origin: siteOrigin,
};

export const services = [
  { id: 'hvac', name: 'AC & HVAC', title: 'AC & HVAC maintenance', description: 'Cooling diagnostics, AC servicing, filter and duct cleaning, and installation enquiries.', rate: 180, unit: 'AC units' },
  { id: 'plumbing', name: 'Plumbing', title: 'Plumbing solutions', description: 'Leak repairs, blocked drains, taps and mixers, and water heater or pump maintenance.', rate: 150, unit: 'Plumbing jobs' },
  { id: 'electrical', name: 'Electrical', title: 'Electrical systems', description: 'Electrical fault checks, switches and sockets, lighting, and distribution board inspections.', rate: 190, unit: 'Electrical jobs' },
  { id: 'painting', name: 'Painting', title: 'Interior painting', description: 'Apartment, villa, and office painting, including surface preparation and move-out touch-ups.', rate: 250, unit: 'Rooms' },
  { id: 'carpentry', name: 'Carpentry', title: 'Carpentry & doors', description: 'Door and lock repairs, cabinet adjustments, shelving, and small joinery jobs.', rate: 150, unit: 'Fittings' },
  { id: 'handyman', name: 'Handyman', title: 'Handyman services', description: 'TV and mirror mounting, curtains, furniture assembly, fixture replacement, and minor repairs.', rate: 110, unit: 'Handyman tasks' },
  { id: 'ceilings', name: 'Ceilings & partitions', title: 'Ceilings & partitions', description: 'Gypsum ceilings, office partitions, ceiling repairs, and access panels.', rate: 125, unit: 'Square metres', maxQuantity: 250 },
  { id: 'flooring', name: 'Tile & flooring', title: 'Tile & flooring', description: 'Tile replacement, regrouting, skirting, and vinyl or wood flooring enquiries.', rate: 95, unit: 'Square metres', maxQuantity: 250 },
];

// Equipment inquiries are scoped on site, separately from the per-unit AC estimate.
export const refrigeration = { id: 'refrigeration', name: 'Cold-room refrigeration', path: '/industrial/#refrigeration' };

export const properties = ['Apartment', 'Villa', 'Office', 'Retail', 'Restaurant', 'Warehouse', 'Other'];

export const areas = [
  'Business Bay', 'Downtown Dubai', 'Dubai Marina', 'JLT', 'Jumeirah', 'Palm Jumeirah',
  'Al Barsha', 'Dubai Hills', 'Arabian Ranches', 'JVC', 'JVT', 'Motor City',
  'Sports City', 'Dubai Silicon Oasis', 'Mirdif', 'Deira', 'Bur Dubai',
];

export const process = [
  ['Assessment', 'Tell us what needs attention.', 'Share the property type, area and a short description. Photos can help us understand the issue before the visit.', 'An initial assessment of the issue'],
  ['Quotation', 'See the scope and pricing together.', 'We outline the work and share a quote. If the scope depends on an inspection, we explain what we need to check.', 'A quote you can review'],
  ['Approval', 'Choose when the work goes ahead.', 'Once you approve the scope, we agree on the visit time and confirm any property access instructions.', 'Agreed work and visit details'],
  ['Execution', 'A technician carries out the agreed work.', 'If we find something outside the agreed scope, we discuss it with you before proceeding.', 'Work carried out to the agreed scope'],
  ['Handover', 'Walk through the completed work.', 'We show you what was done and explain relevant checks or any follow-up the property needs.', 'A work summary and any next steps'],
  ['Aftercare', 'Get help after the visit.', 'Contact us with questions about the completed job. We can review what has changed and discuss the next step.', 'A follow-up with our team'],
];

export const audiences = {
  residential: {
    label: 'Residential',
    title: 'Maintenance for apartments and villas.',
    description: 'Repairs, inspections, and ongoing care for homeowners, tenants, landlords, and holiday-home operators.',
    image: 'home-maintenance',
    alt: 'A technician checks a wall-mounted air conditioning unit in a bright apartment.',
    property: 'Apartment',
    items: [
      ['Move-in maintenance', 'Check cooling, plumbing, and electrical fittings before you settle in.'],
      ['Move-out repairs', 'Work through the snag list, patch walls, and touch up paint before handover.'],
      ['Apartment inspections', 'Identify visible defects and agree what needs attention room by room.'],
      ['Villa maintenance', 'Coordinate upkeep across AC, plumbing, electrical fittings, and finishes.'],
      ['Landlord support', 'Request repairs between tenants or arrange an assessment for an occupied unit.'],
      ['Holiday-home care', 'Plan small repairs and maintenance around guest changeovers.'],
    ],
  },
  commercial: {
    label: 'Commercial',
    title: 'Maintenance that works around your business.',
    description: 'Planned maintenance and repairs for offices, shops, restaurants, warehouses, and managed properties.',
    image: 'commercial-maintenance',
    alt: 'A facility technician inspects a utility panel in an office corridor.',
    property: 'Office',
    items: [
      ['Scheduled maintenance', 'Agree a visit schedule around your site and its equipment.'],
      ['Working hours and access', 'Tell us when access is possible so we can plan around your team and customers.'],
      ['Preventive inspections', 'Check key systems and flag work that needs to be scheduled.'],
      ['Service reporting', 'Discuss the reporting your facility or landlord requires.'],
      ['Reactive repairs', 'Get in touch when an electrical, plumbing, or cooling problem interrupts work.'],
      ['Multi-site enquiries', 'Share the locations and scope for a coordinated maintenance proposal.'],
    ],
  },
};

export const projectScopes = [
  ['AC & HVAC', 'Office cooling', 'Review the cooling complaint, then agree the scope for unit servicing, duct cleaning, or thermostat checks.', 'hvac', 'home-maintenance', 'Technician inspecting a wall-mounted AC unit'],
  ['Plumbing', 'Bathroom leak repair', 'Trace the source of a leak and assess what is needed to repair and make good the affected area.', 'plumbing', 'plumbing-maintenance', 'Technician inspecting accessible supply pipework'],
  ['Electrical', 'Retail electrical works', 'Assess affected fittings and work with site management to agree a suitable visit window.', 'electrical', 'commercial-maintenance', 'Technician inspecting a building utility panel'],
  ['Painting', 'Apartment handover', 'Inspect marked walls and agree on surface repairs, touch-ups, or repainting before handover.', 'painting', 'project-painting', 'Painter rolling a fresh coat onto an apartment wall'],
  ['Ceilings', 'Office reconfiguration', 'Review partition and ceiling requirements, including access and making good after the work.', 'ceilings', 'project-partitions', 'Gypsum partition and ceiling installation in an office'],
  ['Flooring', 'Tile and grout repair', 'Check loose or cracked tiles and decide whether isolated replacement or wider work is needed.', 'flooring', 'project-flooring', 'Technician applying grout to porcelain floor tiles'],
];

const propertyGroups = [
  { value: 'Apartment', label: 'Apartment', examples: ['Apartment and villa AC servicing and filter cleaning', 'Kitchen and bathroom leaks or blocked drains', 'Socket, switch and fixture checks', 'Move-in and move-out touch-ups', 'Door, lock and cabinet adjustments', 'Mounting, assembly and fixture replacement', 'Ceiling patching and access-panel repairs', 'Tile replacement and bathroom regrouting'] },
  { value: 'Office', label: 'Commercial', examples: ['Office cooling diagnostics and scheduled HVAC care', 'Washroom, pantry and drainage maintenance', 'Lighting and distribution board inspection', 'Office and retail repainting and touch-ups', 'Door hardware, storage and cabinet repairs', 'Fixture fitting and premises maintenance', 'Workspace partitions, ceilings and access panels', 'Tile and vinyl flooring repairs for premises'] },
];

export const serviceSectors = [
  {
    id: 'residential', label: 'Residential', property: 'Apartment',
    description: 'Apartments, villas and managed homes.',
    examples: propertyGroups[0].examples,
  },
  {
    id: 'commercial', label: 'Commercial', property: 'Office',
    description: 'Offices, retail spaces and other commercial properties.',
    examples: propertyGroups[1].examples,
  },
  {
    id: 'industrial', label: 'Industrial', property: 'Warehouse',
    description: 'Warehouse and workshop building services, including cold-room refrigeration enquiries.',
    examples: {
      hvac: 'Warehouse office AC, ventilation and cooling fault diagnosis.',
      plumbing: 'Wash-bay drainage, staff washrooms, valves and water supply.',
      electrical: 'High-bay lighting, office circuits and distribution board assessments.',
      painting: 'Wall coatings, staff-area repainting and preparation around racking.',
      carpentry: 'Office doors, cabinets and staff-room joinery adjustments.',
      handyman: 'Small fixture repairs across workshop offices and welfare rooms.',
      ceilings: 'Office enclosures, damaged ceiling tiles and service access panels.',
      flooring: 'Tile damage, thresholds and worn finishes in pedestrian routes.',
    },
  },
];

export function sectorExample(sector, service, serviceIndex) {
  return Array.isArray(sector.examples) ? sector.examples[serviceIndex] : sector.examples[service.id];
}

export const estimateChoices = {
  renovation: [
    { name: 'Apartment move-in refresh & painting', rate: 1800, sectors: ['residential'] },
    { name: 'Villa modernisation', rate: 5500, sectors: ['residential'] },
    { name: 'Office partition & electrical work', rate: 8500, sectors: ['commercial'] },
  ],
};

export const serviceHandlingRate = 0.019;

export const announcements = [
  { label: 'Offer', text: 'Request a tailored annual maintenance proposal.' },
  { label: 'Update', text: 'Check service coverage for your property in Dubai.' },
];

const building = business.address.replace(/^Office [^,]+,\s{0,}/i, '');
export const officeMap = 'https://www.google.com/maps/dir/?' + new URLSearchParams({api:'1', destination:building});
export const officeMapEmbed = 'https://maps.google.com/maps?' + new URLSearchParams({q:building,z:'17',output:'embed'});

export const homeBanners = [
  { image: 'home-maintenance', label: 'Residential AC servicing', position: 'center 24%', kicker: 'Residential maintenance in Dubai', title: 'Keep your home', highlight: 'cool and comfortable.', description: 'Arrange AC servicing, cooling checks and filter cleaning for your apartment or villa.' },
  { image: 'commercial-maintenance', label: 'Commercial maintenance', position: 'center 44%', kicker: 'Commercial maintenance', title: 'Keep your business', highlight: 'running smoothly.', description: 'Plan HVAC, electrical and plumbing maintenance around the hours your office, shop or facility operates.' },
  { image: 'plumbing-maintenance', label: 'Villa plumbing maintenance', position: 'center 46%', kicker: 'Plumbing and water systems', title: 'Get your plumbing', highlight: 'working again.', description: 'Get help with leaks, blocked drains, water pressure or pump problems. Tell us what needs attention.' },
];

export const projectGallery = [
  { image: 'home-maintenance', title: 'Apartment AC servicing', type: 'Residential · HVAC', description: 'Cooling checks and routine servicing for wall-mounted AC units.', alt: 'Technician inspecting a wall-mounted air conditioner in a Dubai apartment.' },
  { image: 'commercial-maintenance', title: 'Office utility inspection', type: 'Commercial · Electrical', description: 'Inspection of an office utility panel as part of a planned maintenance visit.', alt: 'Facility technician inspecting a utility panel in an office corridor.' },
  { image: 'plumbing-maintenance', title: 'Villa water pump inspection', type: 'Residential · Plumbing', description: 'Inspection of the supply pump and accessible pipework in a villa utility room.', alt: 'Technician inspecting a water pump and copper pipes in a villa utility room.' },
];

export const socialProfiles = [
  { label: 'Facebook', icon: 'facebook', url: '' },
  { label: 'Instagram', icon: 'instagram', url: '' },
  { label: 'YouTube', icon: 'youtube', url: '' },
  { label: 'TikTok', icon: 'tiktok', url: '' },
];

// Each active code can set either a percentage or an AED discount and optionally restrict estimate modes.
export const promoCodes = [];

// Dubai communities and developers shown for geographic reference.
export const propertyLogos = [
  { name: 'Arabian Ranches', image: '/assets/portfolio-arabian-ranches.webp' },
  { name: 'Emirates Hills', image: '/assets/portfolio-emirates-hills.webp' },
  { name: 'DAMAC Hills 2', image: '/assets/portfolio-damac-hills-2.webp' },
  { name: 'DAMAC Heights', image: '/assets/portfolio-damac-heights.webp' },
  { name: 'DAMAC Hills', image: '/assets/portfolio-damac-hills.webp' },
  { name: 'Meraas', image: '/assets/developers/meraas.svg' },
  { name: 'Sobha Realty', image: '/assets/developers/sobha.svg', dark: true },
  { name: 'Dubai Holding', image: '/assets/developers/dubai-holding.svg', dark: true },
  { name: 'Aldar', image: '/assets/developers/aldar.png', dark: true },
  { name: 'Dubai Properties', image: '/assets/portfolio-dubai-properties.webp' },
  { name: 'Nakheel', image: '/assets/portfolio-nakheel.webp' },
  { name: 'Emaar', image: '/assets/portfolio-emaar.webp' },
];
