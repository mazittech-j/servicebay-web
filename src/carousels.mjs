import { homeBanners, projectGallery } from './content.mjs';
import { escapeHtml } from './home-sections.mjs';

function photo(image, alt, sizes, loading) {
  return `<img src="/assets/${image}.webp" srcset="/assets/${image}-small.webp 670w, /assets/${image}.webp 1400w" sizes="${sizes}" width="1400" height="933" ${loading} alt="${escapeHtml(alt)}">`;
}

export function homeBanner() {
  return `<section class="home-banner" aria-labelledby="home-title" data-banner>
    <div class="banner-media" aria-hidden="true">
      ${homeBanners.map(({ image, label, position }, index) => `<div class="banner-slide" data-banner-slide data-label="${escapeHtml(label)}" style="--banner-position:${escapeHtml(position)}"${index ? ' hidden' : ''}>${photo(image, '', '100vw', index ? 'loading="lazy"' : 'fetchpriority="high"')}</div>`).join('')}
    </div>
    <div class="wrap banner-inner">
      <div class="banner-main">
        <div class="banner-copy">
          <p class="eyebrow" data-banner-kicker>${escapeHtml(homeBanners[0].kicker)}</p>
          <h1 id="home-title">Property Maintenance &amp; Technical Services <em>in Dubai</em></h1>
          <p data-banner-description>${escapeHtml(homeBanners[0].description)}</p>
          <a class="banner-book" href="#availability">Check availability <span class="link-arrow" aria-hidden="true"></span></a>
        </div>
        <div class="banner-selector" hidden role="group" aria-label="Choose a banner">
          ${homeBanners.map(({ image, label }, index) => `<button type="button" data-banner-index="${index}" data-copy="${escapeHtml(JSON.stringify(homeBanners[index]))}" title="${escapeHtml(label)}" aria-label="${escapeHtml(label)}"${index === 0 ? ' aria-current="true"' : ''}>
            <img src="/assets/${image}-small.webp" width="46" height="32" alt="">
          </button>`).join('')}
          <button type="button" class="banner-auto" aria-label="Pause banner rotation" data-banner-auto></button>
        </div>
      </div>
      <span class="visually-hidden" data-banner-status aria-live="polite"></span>
    </div>
  </section>`;
}

export function homeProjectGallery() {
  return `<section class="section project-gallery" aria-labelledby="gallery-title" data-gallery>
    <div class="wrap">
      <div class="gallery-heading">
        <div class="section-heading">
          <h2 id="gallery-title">Project gallery</h2>
          <p>Illustrative images of the maintenance work we can scope for your property.</p>
        </div>
        <div class="gallery-controls" hidden>
          <p class="gallery-count" role="status">1–${Math.min(2, projectGallery.length)} of ${projectGallery.length}</p>
          <button type="button" class="button button-outline" data-more-projects aria-controls="gallery-projects">More projects</button>
        </div>
      </div>
      <div class="gallery-stage" id="gallery-projects">
        ${projectGallery.map(({ image, title, type, description, alt }, index) => `<figure class="gallery-slide" data-gallery-item${index >= 2 ? ' hidden' : ''}>
          ${photo(image, alt, '(max-width: 570px) 92vw, 48vw', 'loading="lazy"')}
          <figcaption><p class="eyebrow">${escapeHtml(type)}</p><h3>${escapeHtml(title)}</h3><p>${escapeHtml(description)}</p></figcaption>
        </figure>`).join('')}
      </div>
    </div>
  </section>`;
}
