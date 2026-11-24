import { profileUrl } from './settings.mjs';
import { business } from './content.mjs';
import { escapeHtml } from './home-sections.mjs';

export function reviewSection(fullPage = false) {
  const env = globalThis.process.env;
  const placeId = env.GOOGLE_PLACE_ID?.trim();
  const key = env.GOOGLE_MAPS_BROWSER_KEY?.trim();
  const profile = profileUrl || (placeId && 'https://www.google.com/maps/search/?' +
    new URLSearchParams({ api: '1', query: business.legalName, query_place_id: placeId }));
  if (!profile || (!fullPage && !(key && placeId))) return '';
  const heading = fullPage ? 'h1' : 'h2';
  const live = Boolean(key && placeId);
  const hideUntilLoaded = live && !fullPage;
  return `<section class="section home-reviews" aria-labelledby="review-title"${hideUntilLoaded ? ' hidden data-real-reviews' : ''}><div class="wrap reviews-layout">
    <div class="reviews-heading"><div class="section-heading"><p class="eyebrow">Customer reviews</p><${heading} id="review-title">Reviews on Google</${heading}></div><a class="inline-link" href="${escapeHtml(profile)}" target="_blank" rel="noopener noreferrer">Read reviews on Google Maps</a></div>
    ${live ? `<div class="review-carousel" data-reviews-key="${escapeHtml(key)}" data-place-id="${escapeHtml(placeId)}">
      <div class="review-window"><div class="review-track"></div></div><p role="status">Read customer feedback on our Google Maps profile.</p>
      <div class="review-credit" hidden><span translate="no">Google Maps</span></div><div class="review-controls" aria-label="Review navigation" hidden><div data-review-choices></div></div>
    </div><script src="/google-reviews.js" defer></script>` : ''}
  </div></section>`;
}
