# ServiceBay চালু ও পরিচালনার গাইড

## ১. এখনই অ্যাডমিন খুলুন

বর্তমান প্রাইভেট সাইটের ঠিকানার শেষে `/admin/` খুলুন। সাইটের মালিক যে ChatGPT অ্যাকাউন্ট, সেটিতে সাইন ইন করুন। `Pages` থেকে `/about/` বেছে প্রিভিউতে একটি লেখা বা ছবি চাপুন। `Save draft` দিয়ে খসড়া দেখে নিন। `Publish changes` চাপলে ওই পেজের পরিবর্তন কার্যকর হয়। পরের সম্পাদনার আগে আরেক ট্যাবে পরিবর্তন হলে প্যানেল আপনাকে রিলোড করতে বলবে।

| প্যানেল | কী করবেন |
| --- | --- |
| Pages | ৪২টি পেজ থেকে বেছে লেখা, ছবি ও alt, SEO title ও description সম্পাদনা করুন। বিদ্যমান সেকশন লুকাতে টিক তুলে দিন। নতুন সেকশনে heading, লেখা ও ছবি দিন। নিজের যোগ করা সেকশন সরানো ও ক্রম বদলানো যায়। |
| Company & theme | লোগো, কোম্পানির নাম, ফোন, WhatsApp, ইমেল, অফিসের ঠিকানা, সময়, ফন্ট, বেস সাইজ ও রং বদলান। JPEG, PNG বা WebP ছবি ৫০০ KB পর্যন্ত আপলোড করা যায়। |
| Services & AMC | আটটি কোর সার্ভিসের ইউনিট রেট এবং তিনটি AMC প্ল্যানের নাম ও বার্ষিক রেট AED-তে দিন। Premium Care-এর আগের নির্বাচন ও লিংকও কাজ করে। |
| Integrations | GA4, Google Ads tag, Meta Pixel ও Search Console verification প্রকাশ করুন। ERP সংযোগের অবস্থা, পেমেন্ট webhook-এর ঠিকানা ও ডেটা export এখানে পাওয়া যায়। |
| Customer requests | প্রাপ্ত enquiry খুলুন, যোগাযোগের তথ্য ও বার্তা দেখুন, স্ট্যাটাস বদলান। ERP সংযোগ চালু হলে আটকে থাকা অনুরোধ পুনরায় পাঠান। |

Company, Services & AMC এবং Integrations একটি সাইটজুড়ে প্রযোজ্য খসড়া শেয়ার করে। এগুলোর কোনো একটিতে Publish করলে সেই সাধারণ খসড়াটি প্রকাশ হয়। পেজগুলোর খসড়া আলাদা। ইন্টারঅ্যাকটিভ ক্যালকুলেটরের নতুন সূত্র, নতুন ধরনের সেকশনের টেমপ্লেট এবং নতুন পেজ URL তৈরির জায়গা সোর্স কোড।

## ২. গ্রাহকের কাজ পরীক্ষা করুন

`/portal/` খুলে Request a visit পূরণ করুন। রসিদ কোডটি কপি করুন। অ্যাডমিনের Customer requests থেকে স্ট্যাটাস বদলে পোর্টালের Track a request-এ সেই কোড দিন। কোড যাঁর কাছে থাকবে তিনি অনুরোধের স্ট্যাটাস দেখতে পাবেন। কন্টাক্ট ও AMC ফর্মেও Review request-এর পরে সরাসরি Send to ServiceBay অথবা WhatsApp বেছে নেওয়া যায়। শুধু মেসেজ প্রস্তুত করলে ইনবক্সে রেকর্ড হয় না। সাইটটি প্রাইভেট থাকা পর্যন্ত এর পোর্টালেও সাইটের অ্যাক্সেস প্রয়োজন।

## ৩. Windows PC থেকে GitHub-এ রাখুন

ZIP একটি নতুন `servicebay-website` ফোল্ডারে Extract করুন। ফোল্ডারটির ভিতরে `package.json`, `backend`, `api` ও এই গাইড দেখতে পাবেন। GitHub-এ এই ওয়েবসাইটের জন্য একটি খালি private repository তৈরি করুন। আপনার ServiceHub ERP ও Tradepilot আলাদা প্রজেক্ট। নতুন ওয়েবসাইট ফোল্ডার থেকে PowerShell-এ নিচের কমান্ড চালান। `YOUR-ACCOUNT` ও repository নাম আপনার নিজেরটি দিন।

```powershell
git init -b main
git add .
git commit -m "Add ServiceBay website, owner studio and portal"
git remote add origin https://github.com/YOUR-ACCOUNT/servicebay-website.git
git push -u origin main
```

আগেই এই সাইটের নিজস্ব GitHub repository থাকলে সেটি clone করে তাতে ফাইলগুলো কপি করুন। দুই PC ব্যবহার করলে দ্বিতীয় PC-তেও ওই একই repository clone করুন। কাজের শুরুতে `git pull --ff-only` চালান। `.env`, ডেটাবেস export ও স্থানীয় গ্রাহক-ডেটা Git-এ দেবেন না।

## ৪. PC-তে রান করুন

Node.js 24 ও npm ব্যবহার করুন।

```powershell
npm ci
Copy-Item .env.example .env
notepad .env
```

`ADMIN_USERNAME=owner` এবং নিজের ২৪ অক্ষর বা তার বেশি দৈর্ঘ্যের অনন্য `ADMIN_PASSWORD` দিন। পাসওয়ার্ড ম্যানেজারে দীর্ঘ র‌্যান্ডম পাসওয়ার্ড তৈরি করা যায়। `SITE_ACCESS=private` রাখুন। স্থানীয় ডেমোতে `DATABASE_URL` খালি থাকলে `.local/servicebay.sqlite` ফাইলে ডেটা থাকবে। এরপর চালান

```powershell
npm run build
npm test
npm start
```

`http://localhost:3000/admin/` খুলে ব্রাউজারের লগইন ডায়ালগে নিজের ইউজারনেম ও পাসওয়ার্ড দিন। সাইট দেখতে `/`, গ্রাহকের অংশে যেতে `/portal/`। হোস্টেড সাইটে HTTPS ব্যবহার করুন।

## ৫. Neon PostgreSQL প্রস্তুত করুন

Neon Console-এ সাইটের জন্য আলাদা project বা database বেছে নিন। Connect থেকে database, role ও branch যাচাই করে pooled connection string কপি করুন। এতে থাকা SSL ও অন্যান্য query parameter অক্ষত রাখুন। ওয়েবসাইট নিজের ডেটাবেস ব্যবহার করে। ERP-র সঙ্গে যোগাযোগ হয় তার API দিয়ে। [Neon connection guide](https://neon.com/docs/connect/connect-from-any-app)

নিজের `.env`-এ `DATABASE_URL` দিয়ে একবার চালান

```powershell
npm run db:migrate
```

সফল হলে `ServiceBay database schema is ready.` দেখাবে। Preview পরীক্ষা করলে তার জন্য আলাদা Neon branch ব্যবহার করুন।

## ৬. GitHub থেকে Vercel-এ চালু করুন

Vercel-এ Add New → Project → Import Git Repository খুলুন। ServiceBay repository বেছে নিন। Root Directory হিসেবে `package.json`-এর ফোল্ডার, Framework Preset হিসেবে **Other**, Node.js হিসেবে **24.x** রাখুন। প্রজেক্টের `vercel.json` build, output ও function routing নির্ধারণ করে। [Vercel GitHub deployment](https://vercel.com/docs/git/vercel-for-github)

| Environment variable | কী বসাবেন |
| --- | --- |
| `DATABASE_URL` | ধাপ ৫-এর সম্পূর্ণ PostgreSQL connection string |
| `ADMIN_USERNAME`, `ADMIN_PASSWORD` | এই সাইটের মালিকের লগইন, পাসওয়ার্ড কমপক্ষে ২৪ অক্ষর |
| `SITE_ACCESS` | আপাতত `private` রাখুন। মালিক পরে `public` বেছে নিলে গ্রাহকের সাইট ও পোর্টাল উন্মুক্ত হবে, অ্যাডমিনের লগইন প্রয়োজন থাকবে। |
| `SITE_ORIGIN` | SEO-র জন্য যে HTTPS origin ব্যবহার করবেন, পথ ছাড়া। যেমন নিজের নিশ্চিত Vercel production URL বা চূড়ান্ত domain। |
| `PUBLIC_ORIGIN` | ঐ deployment-এর বাইরের HTTPS origin। Vercel-এর ভিন্ন preview domain-এর জন্য খালি রাখা যায়। |
| `SERVICEHUB_API_URL`, `SERVICEHUB_API_KEY` | ERP-এর সংযোগ তৈরি হলে পরের ধাপে বসান। |

Deploy করুন। প্রথম deploy-এর পরে production URL জেনে `SITE_ORIGIN` যোগ করলে আবার Deploy করুন। `/admin/`-এ লগইন, একটি draft save, একটি portal request এবং তার status যাচাই করুন। পরবর্তী `main` push থেকে Vercel production deploy করতে পারে। Database migration আলাদা করে চালাবেন। Preview-তেও ওই environment-এর প্রয়োজনীয় সেটিং দিন। [Vercel project configuration](https://vercel.com/docs/project-configuration/vercel-json)

## ৭. বর্তমান সাইটের সম্পাদনা ও ছবি স্থানান্তর করুন

পুরোনো সাইটের **Admin → Integrations → Download database export** থেকে JSON নিন। এতে গ্রাহকের যোগাযোগের তথ্যও থাকতে পারে। চূড়ান্ত কপি নেওয়ার সময় দুই সাইটে একসঙ্গে লেখা বন্ধ রাখুন। ZIP-এর সোর্স ও মূল ছবিগুলো Git-এ থাকবে। পরে আপলোড করা ছোট ছবি, খসড়া, প্রকাশিত পরিবর্তন ও গ্রাহকের রেকর্ড ডেটাবেস export-এ যাবে। বাইরের URL দিয়ে লাগানো ছবির মূল ফাইল তার নিজের হোস্টেই থাকে।

নতুন খালি database-এ ধাপ ৫ শেষ করে আপনার PC-তে চালান

```powershell
node --env-file=.env scripts/import-backup.mjs "D:\Backups\servicebay-private-backup.json"
```

Import একটি transaction-এ চলে। ভিন্ন সংস্করণের রেকর্ড থাকলে import থামবে ও ঐ import-এর পরিবর্তন ফিরিয়ে নেবে। নতুন সাইটে পুরোনো পেজ, একটি আপলোড করা ছবি ও একটি রসিদ মিলিয়ে তারপর domain সরান।

## ৮. ServiceHub ERP যুক্ত করুন

আপনার ServiceHub ERP v1.42.0-এর client company administrator হিসেবে **Settings → Appearance → Integrations & Customer Portal** খুলুন। নতুন website connection-এ `enquiries:write` এবং `requests:read` দিন। সেখান থেকে API base URL ও একবার দেখানো key নিন। Hosting-এর server environment-এ `SERVICEHUB_API_URL` এবং `SERVICEHUB_API_KEY` হিসেবে রাখুন। উদাহরণের URL-এর ধরন `https://ERP-HOST/api/v1/COMPANY-SLUG`। পরিবর্তনের পরে redeploy করুন।

একটি পরীক্ষামূলক enquiry পাঠান। ওয়েবসাইটে রসিদ পাবেন, ERP-তে CRM lead এবং অ্যাডমিনে **Delivered to ServiceHub** দেখা উচিত। কোনো কারণে delivery নিশ্চিত না হলে মূল অনুরোধ সাইটের ইনবক্সে থাকে। সংযোগ ঠিক করে **Send to ServiceHub** চাপুন। একই অনুরোধ একই external reference-এ যায়। `/portal/` থেকে ERP customer sign-in খোলে। ERP থেকে গ্রাহককে invite করুন, তারপর অনুমোদিত quote বা invoice শেয়ার করুন। গ্রাহক কী দেখতে পাবেন তা ERP-র নিজস্ব account ও sharing settings ঠিক করে।

## ৯. Stripe ও tracking চালু করুন

ERP base URL ঠিক হলে website Integrations-এ tenant-এর Stripe test ও live webhook URL দেখা যায়। Stripe Dashboard-এ প্রথমে test endpoint তৈরি করুন। ERP যে event নেয় সেগুলো হলো `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed` ও `checkout.session.expired`। সংশ্লিষ্ট signing secret ও Stripe key **ERP client hosting**-এর `ERP_STRIPE_JSON`-এ tenant অনুযায়ী দিন। ERP package-এর `STRIPE-PAYMENTS-SETUP.md`-তে JSON-এর কাঠামো ও clearing account সেটআপ আছে। [Stripe webhooks](https://docs.stripe.com/webhooks)

ERP-তে Test mode, AED clearing account ও portal checkout সেট করুন। পরীক্ষার গ্রাহককে invoice শেয়ার করে sandbox checkout শেষ করুন। ERP-তে verified `test_paid` দেখতে হবে। এই পরীক্ষায় live ledger বা গ্রাহকের টাকা বদলায় না। Live mode, live endpoint ও live secrets আলাদাভাবে ব্যবসার মালিক সক্রিয় করবেন। Footer-এর payment logos থেকে অন্য gateway স্বয়ংক্রিয়ভাবে চালু হয় না।

ওয়েবসাইটের Integrations-এ পাওয়া গেলে `G-…`, `AW-…`, Meta Pixel-এর numeric ID এবং Search Console token বসিয়ে Publish করুন। সাইটের অনুমতি বোতাম দিয়ে opt in করার পরে GA4 DebugView এবং Meta Test Events-এ page visit ও call/WhatsApp click মিলিয়ে দেখুন। Google Ads-এ নির্দিষ্ট campaign conversion-এর label অথবা GA4 key-event import আপনার Ads account-এ সেট করুন। প্রাইভেট সাইটে Search Console indexing পরীক্ষা পাবলিক launch-এর পরে সম্পন্ন হবে।

## ১০. অন্য hosting ব্যবহার করলে

Node.js 24, HTTPS ও PostgreSQL-সমর্থিত server বা container-এ একই repository রাখুন। `npm ci`, `npm run build`, `npm run db:migrate`, তারপর `npm start`। Host-এর দেওয়া `PORT` সমর্থিত। Reverse proxy-এর public HTTPS ঠিকানাটি `PUBLIC_ORIGIN` ও `SITE_ORIGIN`-এ দিন। Production-এ `NODE_ENV=production` রাখুন। ছবি database-সহ migrate হয়, আর বড় hosted ছবির জন্য স্থায়ী HTTPS image URL ব্যবহার করতে পারেন। শুধু HTML upload বা PHP/MySQL-only hosting-এ এই Node backend চালাতে আলাদা Node runtime ও PostgreSQL প্রয়োজন।
