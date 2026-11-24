const env = process.env;
const origin = new URL(env.SITE_ORIGIN || 'https://servicebay-technical-services.devotedcypress1.chatgpt.site');
if (origin.protocol !== 'https:' || origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash) {
  throw new Error('SITE_ORIGIN must be an HTTPS origin without a path.');
}

export const siteOrigin = origin.origin;
export const verification = (env.GOOGLE_SITE_VERIFICATION || '').trim();
export const measurementId = (env.GA4_MEASUREMENT_ID || '').trim();
if (measurementId && !/^G-[A-Z0-9]+$/.test(measurementId)) throw new Error('Invalid GA4 measurement ID.');
const profile = (env.GOOGLE_BUSINESS_PROFILE_URL || '').trim();
if (profile) {
  const url = new URL(profile);
  if (url.protocol !== 'https:' || !['www.google.com','maps.google.com','maps.app.goo.gl','g.page','share.google'].includes(url.hostname)) {
    throw new Error('Use the Google Maps share link for the verified business.');
  }
}
export const profileUrl = profile;
export const hasReviewProfile = Boolean(profile || env.GOOGLE_PLACE_ID?.trim());
export const trust = {
  licence: env.TRADE_LICENCE_NUMBER?.trim(),
  trn: env.VAT_TRN?.trim(),
  street: env.CUSTOMER_OFFICE_ADDRESS?.trim() || 'Office 410, Opal Tower, Business Bay',
  warranty: env.WARRANTY_TERMS?.trim(),
  response: env.RESPONSE_TIME_TERMS?.trim(),
  experience: env.TECHNICIAN_EXPERIENCE?.trim(),
};
