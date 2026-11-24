# ServiceBay SEO audit

Reviewed 23 November 2026. The private preview is at https://servicebay-technical-services.devotedcypress1.chatgpt.site/. The site is built from static HTML, so the main heading, service descriptions, neighbourhood guides, FAQs and navigation are available before JavaScript runs.

| Check | Result |
| --- | --- |
| Brand and contact | Page titles start with ServiceBay. The footer, copyright, image labels, WhatsApp messages, metadata and preview hostname use ServiceBay. All 42 content pages have direct WhatsApp and call links for +971 56 201 4647. |
| Homepage | One fixed H1, a distinct page title and the supplied description. The banner continues to change its image and supporting text. The calculator hides the promo field when there are no codes. |
| Service content | Eight main trade pages each contain a unique title and introduction, three property sections, a scoped calculator linked to the contact form, trade-specific repair and handover guidance, and five questions. |
| Local content | 17 Dubai neighbourhood guides link to relevant trades and prefill the requested area on the enquiry form. The area directory and home area list link to every guide. |
| Metadata | 42 unique titles, descriptions and canonical URLs. Open Graph, Twitter cards and the Apple touch icon are present. The English and Arabic homepages link to each other using reciprocal hreflang. Inner pages are in English. |
| Structured data | Business details and website identity are present throughout. Inner pages carry breadcrumbs. Service and area pages identify the service and provider. All 25 pages containing FAQ schema match the questions and answers shown on those pages. Both homepages omit FAQ markup. |
| Duplicates | Schedule, sector, estimate and contact parameters retain their UI behaviour and identify the clean route as canonical. The three short sector URLs are the canonical hubs. Vercel permanently redirects their directory aliases and 24 sector-specific trade URLs, including the two newly supported industrial trades. The static preview includes immediate redirect pages for those aliases. |
| Discovery and assets | The sitemap lists only the 42 canonical URLs. Internal links, target anchors, service-card alt text, social image and icon files passed static checks. No canonical HTML page contains a noindex directive. |
| Hosting | Anonymous requests to the homepage, a service detail, robots.txt and sitemap.xml returned HTTP 401 on the owner-only origin. A verified Googlebot fetch and Search Console index status have not been observed. |
| Analytics | The configured build emits a verification tag and GA4 integration. Offline checks validated the consent choice, click_to_call and whatsapp_click, sanitised page path and opt-out. No production measurement ID or account-side key event has been configured. |
| Business evidence | The site uses Dubai as its service area and lists dispatch hours. The contact page lists Office 410, Opal Tower, Business Bay, with a map and directions to the building. Licence, TRN, warranty terms, response times, experience and the verified Google Business Profile can be added when documented. |

The private site and its sitemap cannot be crawled for indexing while access requires signing in. When releasing the public site, use the final HTTPS origin, verify that property in Google Search Console, submit its sitemap and run Test live URL on representative pages. Search Console's result is a separate check from the HTML audit.

Google references: [URL Inspection](https://support.google.com/webmasters/answer/9012289/), [canonical URLs](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls), [GA4 events](https://developers.google.com/analytics/devguides/collection/ga4/events).
