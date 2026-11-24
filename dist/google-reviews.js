(() => {
  const host = document.querySelector('.review-carousel');
  if (!host) return;
  const track = host.querySelector('.review-track');
  function enableRotation() {
    const slides = [...track.children];
    if (slides.length < 2) return;
    const controls = host.querySelector('.review-controls');
    const choices = controls.querySelector('[data-review-choices]');
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    let current = 0;
    let timer;
    host.classList.add('rotating');
    controls.hidden = false;
    function show(index) {
      current = (index + slides.length) % slides.length;
      track.style.transform = 'translateX(-' + current * 100 + '%)';
      slides.forEach((slide, i) => {
        slide.inert = i !== current;
        slide.setAttribute('aria-hidden', String(i !== current));
        choices.children[i].setAttribute('aria-pressed', String(i === current));
      });
    }
    function sync() {
      clearInterval(timer);
      if (!motion.matches) timer = setInterval(() => {
        if (!document.hidden && !host.matches(':hover, :focus-within')) show(current + 1);
      }, 6000);
    }
    slides.forEach((_, index) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.setAttribute('aria-label','Show review ' + (index + 1) + ' of ' + slides.length);
      dot.addEventListener('click', () => { show(index); sync(); });
      choices.append(dot);
    });
    let touchX, touchY;
    host.addEventListener('touchstart', e => { touchX=e.touches[0].clientX; touchY=e.touches[0].clientY; }, {passive:true});
    host.addEventListener('touchend', e => {
      const dx=e.changedTouches[0].clientX-touchX, dy=e.changedTouches[0].clientY-touchY;
      if (Math.abs(dx)>45 && Math.abs(dx)>Math.abs(dy)) { show(current + (dx<0 ? 1 : -1)); sync(); }
    }, {passive:true});
    motion.addEventListener('change', sync);
    show(0);
    sync();
  }
  if (!host.dataset.reviewsKey) { enableRotation(); return; }
  const status = host.querySelector('[role="status"]');
  function attribution(name,url) {
    const safe = typeof url === 'string' && url.startsWith('https://');
    const item = document.createElement(safe ? 'a' : 'span');
    item.textContent = name;
    if (safe) { item.href = url; item.rel='noopener noreferrer'; item.target='_blank'; }
    return item;
  }
  function reviewCard(review) {
    const card = document.createElement('figure');
    card.className = 'review-sample';
    const caption = document.createElement('figcaption');
    const author = review.authorAttribution;
    const rating = document.createElement('small');
    rating.textContent = [review.rating ? review.rating + '/5' : '', review.relativePublishTimeDescription].filter(Boolean).join(' · ');
    caption.append(attribution(author?.displayName || 'Google user',author?.uri),rating);
    const copy = document.createElement('blockquote');
    copy.textContent = review.originalText || review.text || '';
    if (review.originalTextLanguageCode) copy.lang = review.originalTextLanguageCode;
    card.append(caption,copy);
    if (review.googleMapsURI) card.append(attribution('View on Google Maps', review.googleMapsURI));
    return card;
  }
  async function fetchReviews() {
    try {
      const {Place} = await google.maps.importLibrary('places');
      const place = new Place({id:host.dataset.placeId});
      await place.fetchFields({fields:['reviews','attributions']});
      if (!place.reviews?.length) { status.textContent='There are no reviews to display yet.'; return; }
      track.replaceChildren(...place.reviews.map(reviewCard));
      const credit = host.querySelector('.review-credit');
      for (const source of place.attributions || []) if (source.provider) credit.append(' · ',attribution(source.provider,source.providerURI));
      credit.hidden = false;
      status.hidden = true;
      host.closest("section").hidden = false;
      enableRotation();
    } catch { status.hidden=false; }
  }
  function load() {
    window.serviceBayPlacesReady = fetchReviews;
    const url = new URL('https://maps.googleapis.com/maps/api/js');
    url.search = new URLSearchParams({key:host.dataset.reviewsKey, loading:'async', libraries:'places', v:'weekly', callback:'serviceBayPlacesReady'});
    const script = document.createElement('script');
    script.src = url.href;
    script.async = true;
    document.head.append(script);
  }
  if (!host.closest('[data-real-reviews]') && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting)) { observer.disconnect(); load(); }
    }, {rootMargin:'300px'});
    observer.observe(host);
  } else load();
})();
