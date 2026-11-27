(() => {
  'use strict';
  const STORAGE_KEY = 'sb_lang';
  if (location.pathname === '/ar/' || location.pathname === '/ar') {
    try { localStorage.setItem(STORAGE_KEY, 'ar'); } catch {}
    location.replace('/?lang=ar');
    return;
  }
  const params = new URLSearchParams(location.search);
  const paramLang = params.get('lang');
  if (paramLang === 'ar' || paramLang === 'en') {
    try { localStorage.setItem(STORAGE_KEY, paramLang); } catch {}
  }
  let lang = 'en';
  try { lang = localStorage.getItem(STORAGE_KEY) || 'en'; } catch {}
  if (paramLang === 'ar') lang = 'ar';
  if (paramLang === 'en') lang = 'en';

  const selects = document.querySelectorAll('select[data-lang-select]');
  for (const s of selects) {
    s.value = lang;
    s.addEventListener('change', () => {
      const next = s.value === 'ar' ? 'ar' : 'en';
      try { localStorage.setItem(STORAGE_KEY, next); } catch {}
      const u = new URL(location.href);
      u.searchParams.delete('lang');
      if (next === 'ar') {
        if (u.pathname === '/ar/' || u.pathname === '/ar') u.pathname = '/';
        u.searchParams.set('lang', 'ar');
        location.href = u.href;
      } else {
        if (u.pathname === '/ar/' || u.pathname === '/ar') u.pathname = '/';
        location.href = u.href;
      }
    });
  }

  if (lang !== 'ar') return;

  document.documentElement.lang = 'ar-AE';
  document.documentElement.dir = 'rtl';

  const dict = new Map([
    ['Skip to content', 'انتقل إلى المحتوى'],
    ['Home', 'الرئيسية'],
    ['Services', 'الخدمات'],
    ['All services', 'جميع الخدمات'],
    ['AC & HVAC', 'التكييف والتبريد'],
    ['AC & HVAC maintenance', 'صيانة التكييف والتبريد'],
    ['Plumbing', 'السباكة'],
    ['Electrical', 'الكهرباء'],
    ['Painting', 'الدهان'],
    ['Carpentry', 'النجارة'],
    ['Handyman', 'الأعمال اليدوية'],
    ['Ceilings & partitions', 'الأسقف والقواطع'],
    ['Tile & flooring', 'البلاط والأرضيات'],
    ['Planned maintenance visit', 'زيارة صيانة مجدولة'],
    ['Residential', 'سكني'],
    ['Commercial', 'تجاري'],
    ['Industrial', 'صناعي'],
    ['AMC', 'عقود الصيانة'],
    ['AMC Plans', 'باقات الصيانة السنوية'],
    ['AMC plans', 'باقات الصيانة السنوية'],
    ['Annual maintenance', 'الصيانة السنوية'],
    ['Annual Maintenance Contracts', 'عقود الصيانة السنوية'],
    ['Cost estimator', 'حاسبة التكلفة'],
    ['Cost Estimator', 'حاسبة التكلفة'],
    ['About', 'من نحن'],
    ['About Us', 'من نحن'],
    ['Our Team', 'فريقنا'],
    ['Service areas', 'مناطق الخدمة'],
    ['Service Areas', 'مناطق الخدمة'],
    ['Projects', 'المشاريع'],
    ['Contact', 'اتصل بنا'],
    ['Contact Us', 'اتصل بنا'],
    ['Contact & dispatch', 'التواصل والتشغيل'],
    ['Request a quote', 'اطلب عرض سعر'],
    ['Explore AMC plans', 'استكشف باقات الصيانة'],
    ['Estimate costs', 'احسب التكلفة'],
    ['Check availability', 'تحقق من التوفر'],
    ['Calculate estimate', 'احسب التقدير'],
    ['Send request', 'إرسال الطلب'],
    ['Send quote request', 'إرسال طلب العرض'],
    ['Prepare WhatsApp message', 'إرسال عبر واتساب'],
    ['Submit to Customer Helpdesk', 'إرسال إلى خدمة العملاء'],
    ['Complaints & Helpdesk', 'الشكاوى وخدمة العملاء'],
    ['Complaints & Service Helpdesk', 'الشكاوى ومكتب خدمة العملاء'],
    ['CUSTOMER HELPDESK', 'خدمة العملاء'],
    ['Submit a complaint', 'تقديم شكوى'],
    ['Full name', 'الاسم الكامل'],
    ['Name', 'الاسم'],
    ['Email address', 'البريد الإلكتروني'],
    ['Email', 'البريد الإلكتروني'],
    ['Mobile number', 'رقم الجوال'],
    ['Mobile', 'الجوال'],
    ['Receipt or job reference (optional)', 'رقم الإيصال أو المرجع (اختياري)'],
    ['Complaint category', 'فئة الشكوى'],
    ['Service Quality', 'جودة الخدمة'],
    ['Technician Conduct', 'تعامل الفني'],
    ['Delay / Scheduling', 'التأخير / المواعيد'],
    ['Billing / Invoice', 'الفواتير / الدفع'],
    ['Other', 'أخرى'],
    ['Describe your complaint', 'اشرح تفاصيل الشكوى'],
    ['Attach photo (optional)', 'إرفاق صورة (اختياري)'],
    ['Company', 'الشركة'],
    ['Resources & Policies', 'الموارد والسياسات'],
    ['Blog', 'المدونة'],
    ['Customer portal', 'بوابة العملاء'],
    ['Customer Portal', 'بوابة العملاء'],
    ['Privacy Policy', 'سياسة الخصوصية'],
    ['Terms & Conditions', 'الشروط والأحكام'],
    ['Cookies Policy', 'سياسة ملفات تعريف الارتباط'],
    ['Reviews', 'التقييمات'],
    ['Careers', 'الوظائف'],
    ['Service', 'الخدمة'],
    ['Service type', 'نوع الخدمة'],
    ['Property', 'العقار'],
    ['Property type', 'نوع العقار'],
    ['Villa', 'فيلا'],
    ['Apartment', 'شقة'],
    ['Office', 'مكتب'],
    ['Warehouse', 'مستودع'],
    ['Factory', 'مصنع'],
    ['Country', 'الدولة'],
    ['Area', 'المنطقة'],
    ['Location / Area', 'الموقع / المنطقة'],
    ['Select your area', 'اختر منطقتك'],
    ['Preferred time slot (optional)', 'الفترة الزمنية المفضلة (اختياري)'],
    ['Any available time', 'أي وقت متاح'],
    ['Morning (8:00 AM – 12:00 PM)', 'صباحاً (8:00 ص – 12:00 م)'],
    ['Afternoon (12:00 PM – 4:00 PM)', 'ظهراً (12:00 م – 4:00 م)'],
    ['Evening (4:00 PM – 8:00 PM)', 'مساءً (4:00 م – 8:00 م)'],
    ['Visit schedule', 'جدول الزيارات'],
    ['Billing frequency', 'دورة الفوترة'],
    ['Additional details', 'تفاصيل إضافية'],
    ['Details', 'التفاصيل'],
    ['Essential Care', 'الرعاية الأساسية'],
    ['Standard Care', 'الرعاية القياسية'],
    ['Premium Care', 'الرعاية الشاملة'],
    ['Choose Essential Care', 'اختر الرعاية الأساسية'],
    ['Choose Standard Care', 'اختر الرعاية القياسية'],
    ['Choose Premium Care', 'اختر الرعاية الشاملة'],
    ['Get a quote', 'احصل على عرض سعر'],
    ['Book a visit', 'احجز زيارة'],
    ['Request this slot', 'اطلب هذا الموعد'],
    ['Learn more', 'اعرف المزيد'],
    ['View all services', 'عرض جميع الخدمات'],
    ['View service', 'عرض الخدمة'],
    ['Subtotal', 'المجموع الفرعي'],
    ['Handling', 'رسوم الخدمة'],
    ['Tax', 'الضريبة'],
    ['VAT (5%)', 'ضريبة القيمة المضافة (5%)'],
    ['Estimated total', 'التكلفة التقديرية'],
    ['Total', 'الإجمالي'],
    ['Property maintenance in Dubai', 'صيانة العقارات في دبي'],
    ['Practical property maintenance across Dubai', 'خدمات صيانة عقارية موثوقة في دبي'],
    ['One technical services team for cooling, plumbing, electrical, fit-out repairs, and planned annual maintenance.', 'فريق فني متكامل للتكييف والسباكة والكهرباء وأعمال التشطيبات والصيانة السنوية المجدولة.'],
    ['Close quote form', 'إغلاق نموذج الطلب'],
    ['Open menu', 'فتح القائمة'],
  ]);

  const lowerDict = new Map();
  for (const [en, ar] of dict) lowerDict.set(en.toLowerCase(), ar);

  function translateText(str) {
    if (!str || typeof str !== 'string') return str;
    const trimmed = str.trim();
    if (!trimmed) return str;
    const hit = dict.get(trimmed) || lowerDict.get(trimmed.toLowerCase());
    if (!hit) return str;
    return str.replace(trimmed, hit);
  }

  let translating = false;
  function applyArabic(root = document.body) {
    if (!root || translating) return;
    translating = true;
    try {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) {
        const parentTag = node.parentElement?.tagName;
        if (parentTag === 'SCRIPT' || parentTag === 'STYLE' || parentTag === 'NOSCRIPT') continue;
        if (node.parentElement?.closest('[data-lang-select]')) continue;
        const next = translateText(node.nodeValue);
        if (next !== node.nodeValue) node.nodeValue = next;
      }
      for (const el of root.querySelectorAll('[placeholder],[aria-label],[title]')) {
        for (const attr of ['placeholder', 'aria-label', 'title']) {
          const val = el.getAttribute(attr);
          if (val) {
            const next = translateText(val);
            if (next !== val) el.setAttribute(attr, next);
          }
        }
      }
    } finally {
      translating = false;
    }
  }

  applyArabic(document.body);
  const obs = new MutationObserver(muts => {
    for (const m of muts) {
      for (const n of m.addedNodes) {
        if (n.nodeType === 1) applyArabic(n);
      }
    }
  });
  obs.observe(document.body, { childList: true, subtree: true });
})();
