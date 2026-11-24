import { tradePath } from './primary-guides.mjs';
import { areas } from './seo-areas.mjs';
import { business, services } from './content.mjs';
import { escapeHtml as e } from './home-sections.mjs';
import { profileUrl, trust } from './settings.mjs';

export function faqBlock(questions, heading = 'Dubai maintenance questions') {
  return `<section id="faq" class="section wrap service-support"><div class="service-faq"><div><p class="eyebrow">FAQ</p><h2>${e(heading)}</h2></div><div>${questions.map(([q,a]) => `<details><summary>${e(q)}</summary><p>${e(a)}</p></details>`).join('')}</div></div></section>`;
}

export function areaLinks() {
  return `<ul class="area-links">${areas.map(a => `<li><a href="/service-areas/${a.slug}/">${e(a.name)}</a></li>`).join('')}</ul>`;
}

export function homeAreas() {
  return `<section class="area-strip"><div class="section wrap"><header class="section-heading"><p class="eyebrow">Service coverage</p><h2>Where we work in Dubai</h2><p>Choose your neighbourhood for local services and instructions for arranging access.</p></header>${areaLinks()}<a class="inline-link" href="/service-areas/">Browse all Dubai service areas</a></div></section>`;
}

export function areaDirectory() {
  return `<section class="section wrap page-intro"><header class="section-heading"><p class="eyebrow">Service areas</p><h1>Property maintenance across Dubai</h1><p>Choose your neighbourhood to see what to include in your enquiry and how to prepare for a visit.</p></header>${areaLinks()}<p class="area-help">For an address outside these areas, <a href="/contact/">check coverage with dispatch</a>.</p></section>`;
}

export function areaDetail(a) {
  const quote = '/contact/?country=AE&area=' + encodeURIComponent(a.name) + '#enquiry';
  return `<section class="section wrap page-intro area-detail">
    <header class="section-heading"><p class="eyebrow">Dubai service areas</p><h1>Property maintenance in ${e(a.name)}</h1><p>${e(a.intro)}</p></header>
    <div class="local-grid"><article><h2>${e(a.heading)}</h2><p>${e(a.detail)}</p><h3>Before the visit</h3><p>${e(a.access)}</p></article>
    <aside><h2>Services for ${e(a.name)}</h2><ul>${a.services.map(s => `<li><a href="${e(s.href)}">${e(s.label)}</a></li>`).join('')}</ul>
    <a class="button button-primary" href="${e(quote)}">Request a visit in ${e(a.name)}</a></aside></div></section>
    ${faqBlock([[a.question,a.answer]], `Booking in ${a.name}`)}`;
}

export function trustDetails() {
  const items = [['Trade licence',trust.licence],['VAT registration number',trust.trn],['Warranty',trust.warranty],['Response times',trust.response],['Technician experience',trust.experience]].filter(([,value])=>value);
  return `<section class="section wrap trust-block"><div class="section-heading"><p class="eyebrow">Service information</p><h2>Before you book a technician</h2></div>
    <div class="local-grid"><article><h3>Dispatch and response</h3><p>We arrange visits at customers’ properties in Dubai. Call ${e(business.phoneLabel)} Monday to Saturday, 8 AM–6 PM Dubai time, to discuss urgency and the next available team.</p>
    ${profileUrl ? `<a class="inline-link" href="${e(profileUrl)}">ServiceBay on Google Maps</a>` : '<a class="inline-link" href="/service-areas/">See our Dubai service areas</a>'}</article>
    <article><h3>Scope and aftercare</h3><p>Ask which technician will handle the job and what the quoted work includes. Before approving a repair, ask for parts and workmanship warranty terms in writing. Keep your quote reference for follow-up.</p></article></div>
    ${items.length ? `<dl class="verified-facts">${items.map(([k,v])=>`<div><dt>${e(k)}</dt><dd>${e(v)}</dd></div>`).join('')}</dl>`:''}</section>`;
}

export function floatingContact(ar = false) {
  const wa = ar ? 'مراسلة ServiceBay عبر واتساب' : 'Message ServiceBay on WhatsApp';
  const call = ar ? 'الاتصال بـ ServiceBay' : 'Call ServiceBay';
  return `<nav class="quick-contact" aria-label="${ar?'تواصل سريع':'Quick contact'}"><a href="https://wa.me/${business.whatsapp}" class="quick-whatsapp" aria-label="${wa}" title="${wa}"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.5 3.5A11.8 11.8 0 0 0 2 17.7L.4 23.6l6.1-1.6a11.8 11.8 0 0 0 14-18.5ZM12 21.6a9.6 9.6 0 0 1-4.9-1.3l-.4-.3-3.4.9.9-3.3-.3-.5A9.7 9.7 0 1 1 12 21.6Zm5.4-7.2c-.3-.1-1.8-.9-2-.9-.3-.1-.5-.1-.7.2l-.9 1.1c-.2.2-.3.2-.6.1a8 8 0 0 1-3.8-3.3c-.3-.4.3-.7.8-1.5.1-.2.1-.4 0-.6L9.3 7c-.2-.5-.5-.4-.7-.4h-.5c-.3 0-.5.1-.7.3-.8.8-1.1 1.6-1 2.7.1 1.2 1 2.6 1.5 3.2 1.4 2.1 3.4 3.7 5.8 4.5 1.5.5 2.6.5 3.6-.1.5-.3.9-1 .9-1.7.1-.5.1-.7-.1-.8l-.7-.3Z"/></svg></a>
    <a href="tel:${business.phone}" class="quick-phone" aria-label="${call}" title="${call}"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6.5 2.5c.6-.2 1.3.1 1.6.7l2 4.4c.2.5.1 1.1-.3 1.5l-1.7 1.6a16.5 16.5 0 0 0 5.2 5.2l1.6-1.7c.4-.4 1-.5 1.5-.3l4.4 2c.6.3.9 1 .7 1.6l-.6 2.5c-.2.9-1 1.5-1.9 1.5A18.5 18.5 0 0 1 2.5 5c0-.9.6-1.7 1.5-1.9z"/></svg></a></nav>`;
}

export function arabicHome() {
  const names=['صيانة التكييف','إصلاح أعطال السباكة','صيانة الكهرباء','الدهانات الداخلية','النجارة وإصلاح الأبواب','تركيب التجهيزات','الأسقف والقواطع','البلاط والأرضيات'];
  return `<main id="main" class="arabic-home"><div class="ar-hero"><div class="wrap section"><p class="eyebrow">خدمات فنية في دبي</p><h1>صيانة العقارات والخدمات الفنية في دبي</h1><p>تساعدك ServiceBay في ترتيب صيانة المكيفات وإصلاح التسربات والأعطال الكهربائية للمنازل والمكاتب والمحلات. أرسل تفاصيل العقار للحصول على عرض سعر مجاني.</p><div class="actions"><a class="button button-primary" href="https://wa.me/${business.whatsapp}">تواصل عبر واتساب</a><a class="button button-white" href="tel:${business.phone}">اتصل بنا</a></div></div></div>
    <section class="section wrap"><h2>خدمات الصيانة والإصلاح</h2><p>اختر الخدمة للاطلاع على تفاصيلها وحاسبة التكلفة باللغة الإنجليزية.</p><ul class="area-links">${services.map((s,i)=>`<li><a href="${tradePath(s.id,'residential')}">${names[i]}</a></li>`).join('')}</ul></section>
    <section class="area-strip"><div class="section wrap"><h2>مناطق الخدمة</h2><p>نرتب زيارات في دبي مارينا، والخليج التجاري، وقرية جميرا الدائرية، وغيرها من مناطق دبي. عند الحجز، شارك اسم المبنى وتعليمات الدخول والوقت المناسب.</p><a href="/service-areas/" class="inline-link">جميع مناطق الخدمة (بالإنجليزية)</a></div></section>
  </main>`;
}
