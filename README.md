# ServiceBay

ServiceBay’s website, owner studio and customer request portal share one runtime. Read [the Bengali setup and migration guide](SETUP-BN.md) for GitHub, Vercel, Neon, another Node host, ServiceHub ERP and Stripe.

## Preview locally

Use Node 24, install with `npm ci`, configure `.env` from `.env.example`, run `npm run build` and `npm start`. Open `http://localhost:3000/admin/`. Local development uses SQLite and production Node uses PostgreSQL.

## Edit and rebuild

- Keep the phone, WhatsApp number, email, service details, example rates, and coverage in `src/content.mjs`.
- Change page layouts and booking fields in `build.mjs`. Run `npm run build` to regenerate the pages.
- Edit colours, typography, and layout in `dist/styles.css`. Form and estimator behaviour live in `dist/site.js`.
- Before hosting under a different domain, set the `SITE_ORIGIN` build variable to its HTTPS origin and rebuild. Use the Node adapter for hosting the studio and portal.

The quote form prepares a message locally and shows it to the visitor. Visitors can send it through WhatsApp or submit it to the website inbox. The estimate uses example rates and displays an indicative subtotal.

The home page sections and calculator markup live in `src/home-sections.mjs`. Edit property examples, estimate rates, and service areas in `src/content.mjs`. Styles for the banner, calculator, comparison, and footer are in `dist/sections.css`. Interactive controls are in `dist/home-tools.js`.

The slots checker offers the first matching team time, then passes the country, area, property and proposed time into the enquiry form. Dispatch confirms appointments.

To edit the header ticker, update `announcements` in `src/content.mjs`.

Google reviews are optional. Supply the verified `GOOGLE_PLACE_ID` or `GOOGLE_BUSINESS_PROFILE_URL` to enable the reviews page. A restricted `GOOGLE_MAPS_BROWSER_KEY` and verified place ID enable an attributed live carousel. The homepage shows the carousel only after real reviews load.

To add banner images or project gallery items, update `homeBanners`, `projectGallery` and `projectScopes` in `src/content.mjs` and supply a WebP image and its `-small.webp` variant in `dist/assets/`. The supplied project images are illustrative. Set `business.logo` and `business.footerLogo` to change the company logo. Set each company profile URL in `socialProfiles` to replace the corresponding platform search.

The calculator offers residential, commercial and industrial property categories inside each mode. The handling fee is 1.9% of the service subtotal before promo discounts. The displayed prices for SAR, QAR, OMR, KWD and BHD use indicative reference rates in `src/regions.mjs`. The calculator supports a percent or fixed-AED promo. Add an entry such as `{ code: 'SAMPLE', type: 'percent', value: 10, modes: ['core'] }` to `promoCodes` in `src/content.mjs`, then rebuild. This example is inactive in the delivered site. The calculator is an estimate and forwards the selected code in the quote request for confirmation.

Each of the eight service pages has one trade calculator. Its quote link carries the selected service, property, country and estimate to the contact form. Service photo captions, repair comparisons, handover checks and compatibility guidance are in `src/service-care.mjs`. Cold rooms and freezer rooms are a separately quoted industrial service, accessible through the industrial hub, the main estimator and the contact service selector. Edit the illustrative per-unit AED rates in `src/content.mjs`. Unique titles, descriptions, property guidance, visit and pricing information and the five visible FAQs per service live in `src/primary-guides.mjs`. The English and Arabic homepages omit FAQ content and FAQPage markup.

The developer and community directory uses `propertyLogos` in `src/content.mjs`. Entries are geographic references, and do not assert a client relationship. The strip scrolls continuously and displays a static grid for reduced motion. Footer payment marks describe the requested payment options; the website collects enquiries, with no checkout.

## Dispatch schedule

Set `dispatchSchedule` in `src/dispatch.mjs` and run `npm run build`. Provide an ISO timestamp with a timezone in `validUntil`. Add teams in assignment priority order, with these fields:

- `label` is the public team label, such as Dispatch Team B.
- `country`, `areas`, and `properties` match the website country code and the booking form values.
- `shifts` and `busy` contain pairs of ISO timestamps with timezone offsets, as in `[['2026-11-22T09:00:00+04:00', '2026-11-22T17:00:00+04:00']]`.

The build exports free one-hour windows for the next 14 days to `dist/dispatch-feed.json`, excluding any overlap with a busy interval. Update or regenerate the feed whenever assignments change. If your dispatch system supplies current availability, serve its sanitized free-slot feed at `/dispatch-feed.json` with the same format. Only public team labels and free windows belong in that feed. A missing or expired schedule asks the visitor to check with dispatch.


The three AMC plan names, annual base rates and suggested scope are maintained in `src/amc.mjs`. The AMC page, estimator, and proposal forms use the same definitions. AMC rates are annual per unit. The billing selector divides the tax-inclusive planning total across 1, 2, 4 or 12 payments, while the preferred visit schedule is a separate proposal request. The quote confirms the calendar and final instalments.

The selected service country controls estimated VAT automatically for all three estimator modes and scoped service pages. Standard rates checked 22 November 2026 are UAE 5%, Saudi Arabia 15%, Oman 5% and Bahrain 10%. Qatar and Kuwait have no domestic VAT in effect. The estimate applies standard VAT to the discounted subtotal plus the handling fee. Update rates in `src/regions.mjs` when local rules change. Reference: https://www.pwc.com/m1/en/tax/documents/2026/gcc-indirect-tax-news-roundup-quarter-one-2026.pdf

## Search and contact integrations

The display brand is ServiceBay. The build generates a canonical link, social cards, structured data, `robots.txt` and `sitemap.xml` from one origin. Set `SITE_ORIGIN` when moving to a public domain and rebuild. The default is the current ServiceBay preview host. Vercel settings and permanent redirects for the 22 former service pages and three sector directories are in `vercel.json`. Other static hosts can serve the included immediate redirect pages, or configure the same redirects at the edge. Keep HTTPS and a single primary host when adding a custom domain. Only the English and Arabic homepages have language alternates.

### Settings to supply at build time

| Setting | Value |
| --- | --- |
| `GOOGLE_SITE_VERIFICATION` | The content token from the Search Console URL-prefix property's HTML tag. A DNS-verified domain property uses the DNS record instead. |
| `GA4_MEASUREMENT_ID` | The real `G-` measurement ID of the site's web stream. |
| `GOOGLE_BUSINESS_PROFILE_URL` | The share link to the verified ServiceBay Google Maps profile. |
| `GOOGLE_PLACE_ID`, `GOOGLE_MAPS_BROWSER_KEY` | Optional live reviews. Restrict the browser key by origin and API. |
| `TRADE_LICENCE_NUMBER`, `VAT_TRN`, `CUSTOMER_OFFICE_ADDRESS` | Verified public business details. The office defaults to Office 410, Opal Tower, Business Bay. |
| `WARRANTY_TERMS`, `RESPONSE_TIME_TERMS`, `TECHNICIAN_EXPERIENCE` | Approved factual wording displayed under service information. |

Change the build settings and run `npm run build`. The code omits unset credentials and unconfirmed claims. Linking a verified Google profile enables its profile link. A verified Place ID and Maps browser key enable the live carousel.

After analytics consent, `click_to_call` records a tap on a phone link and `whatsapp_click` records a tap to open WhatsApp. The quote form keeps the customer's draft in the browser until the visitor chooses a delivery method. GA4 gets the page path, contact method and placement. These events measure contact intent. They do not confirm a connected call, sent message or sale. In GA4, verify the events in Realtime or DebugView, then mark the chosen ones as key events in Admin → Events. To change consent, use Analytics settings in the footer. No analytics script loads on the delivered preview without a measurement ID.

When ready to launch publicly, verify the final HTTPS property in Search Console, submit `/sitemap.xml` and inspect the home page, a service page and a neighbourhood page using Test live URL. Keep this preview private until publication is authorised. A login requirement blocks indexing regardless of HTML tags. Use the site URL and service area on the verified Google Business Profile. For a business that serves customers only at their properties, keep its street address hidden on that profile.
