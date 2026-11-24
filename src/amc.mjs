export const frequencies = [
  { id: 'yearly', label: 'Yearly', count: 1 },
  { id: 'half-yearly', label: 'Half-yearly', count: 2 },
  { id: 'quarterly', label: 'Quarterly', count: 4 },
  { id: 'monthly', label: 'Monthly', count: 12 },
];

export function frequencyOptions() {
  return frequencies.map(({ id, label, count }) =>
    `<option value="${id}" data-times="${count}">${label}</option>`
  ).join('');
}

export const maintenancePlans = [
  {
    id: 'standard-care', name: 'Standard Care', rate: 990,
    focus: 'Routine property upkeep',
    description: 'For an apartment, villa or small office that needs regular checks and a clear record of what needs attention.',
    scope: ['List the AC units and fixtures to check', 'Schedule routine cooling, tap and lighting checks', 'Record findings and quote for follow-up repairs'],
  },
  {
    id: 'preventive-plus', name: 'Preventive Plus', rate: 2450,
    focus: 'Coordinated care across systems',
    description: 'For a busy villa, shop or office where several systems share a maintenance window.',
    scope: ['Build an asset list by room or work zone', 'Group AC, plumbing and electrical inspections', 'Track recurring faults and prioritise the next visit'],
  },
  {
    id: 'portfolio-care', name: 'Premium Care', rate: 4800,
    focus: 'Multi-unit and site planning',
    description: 'For landlords and facilities teams coordinating access, work orders and reporting across units or sites.',
    scope: ['Map assets and access contacts for each site', 'Coordinate visits around shifts or tenant access', 'Review outstanding work across the portfolio'],
  },
];
