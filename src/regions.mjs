import { areas } from './content.mjs';

// AED conversion uses the midpoint of the GCC rates against KWD, 19 Nov 2026.
export const exchangeReference = {
  date: '19 Nov 2026',
  url: 'https://www.cbk.gov.kw/en/monetary-policy/market-operations/gcc-currencies-exchange-rates',
};
const aedFils = (83.720 + 84.562) / 2;

// Standard domestic service estimates, checked 22 Nov 2026. See tax reference in README.
export const regions = {
  AE: { name: 'United Arab Emirates', short: 'UAE', currency: 'AED', perAed: 1, prefix: '+971', timeZone: 'Asia/Dubai', vat: .05, areaLabel: 'Dubai location', areas: [...areas, 'Other UAE area'] },
  SA: { vat: .15, name: 'Saudi Arabia', short: 'Saudi Arabia', currency: 'SAR', perAed: aedFils / ((82.001 + 82.825) / 2), prefix: '+966', timeZone: 'Asia/Riyadh', areaLabel: 'Saudi Arabia location', areas: ['Riyadh', 'Jeddah', 'Dammam', 'Al Khobar', 'Mecca', 'Medina', 'Other Saudi Arabia area'] },
  QA: { vat: 0, name: 'Qatar', short: 'Qatar', currency: 'QAR', perAed: aedFils / ((84.445 + 85.293) / 2), prefix: '+974', timeZone: 'Asia/Qatar', areaLabel: 'Qatar location', areas: ['Doha', 'Lusail', 'Al Rayyan', 'Al Wakrah', 'Umm Salal', 'Other Qatar area'] },
  OM: { vat: .05, name: 'Oman', short: 'Oman', currency: 'OMR', perAed: aedFils / ((799.624 + 807.661) / 2), prefix: '+968', timeZone: 'Asia/Muscat', areaLabel: 'Oman location', areas: ['Muscat', 'Seeb', 'Sohar', 'Salalah', 'Nizwa', 'Other Oman area'] },
  KW: { vat: 0, name: 'Kuwait', short: 'Kuwait', currency: 'KWD', perAed: aedFils / 1000, prefix: '+965', timeZone: 'Asia/Kuwait', areaLabel: 'Kuwait location', areas: ['Kuwait City', 'Salmiya', 'Hawalli', 'Farwaniya', 'Ahmadi', 'Other Kuwait area'] },
  BH: { vat: .10, name: 'Bahrain', short: 'Bahrain', currency: 'BHD', perAed: aedFils / ((815.662 + 823.860) / 2), prefix: '+973', timeZone: 'Asia/Bahrain', areaLabel: 'Bahrain location', areas: ['Manama', 'Muharraq', 'Riffa', 'Isa Town', 'Hamad Town', 'Other Bahrain area'] },
};

export function regionOptions(short = false) {
  return Object.entries(regions).map(([code, region]) => {
    const label = short ? region.short + ' · ' + region.currency : region.name;
    return `<option value="${code}">${label}</option>`;
  }).join('');
}
