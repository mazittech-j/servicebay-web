import { business, serviceHandlingRate } from './content.mjs';
const contact = `<a href="mailto:${business.email}">${business.email}</a>`;

export const policies = [
  {
    path: '/privacy-policy/',
    title: 'Privacy Policy',
    intro: 'How ServiceBay handles information when you use this website or make a service enquiry.',
    sections: [
      ['Information you choose to send', 'The quote form asks for your name, mobile number, receipt email, and information about the requested work. Use Send quote request to submit to ServiceBay, or prepare a message to send in WhatsApp. A direct submission or a portal request stores your contact details and message in our service inbox. Keep your receipt code private. We use it to show the status of that request. When connected, the team also handles your request in ServiceHub ERP.'],
      ['Your portal account', 'When you send your first quote, we create a portal account and store your name, email and a salted password verifier. We link each new quote to your account and use our transactional email provider to send its receipt when configured. You can add a guest quote using its private receipt. We use a session cookie to keep you signed in.'],
      ['How we use an enquiry', 'We use the information you provide to reply, assess the work, prepare a quote and coordinate a visit if you proceed. Share the property information needed for the job. Keep payment card details and access passwords out of the enquiry.'],
      ['Other services used on the site', 'Google Maps provides the office map and, when linked, the reviews displayed from our business profile. WhatsApp, Google and other linked services handle information under their own policies. The site can remember your selected country on this device, as described in the <a href="/cookies-policy/">Cookies Policy</a>.'],
      ['Privacy questions', 'Write to ' + contact + ' to ask about the information you shared with us, request a correction or raise a privacy concern.'],
    ],
  },
  {
    path: '/terms-and-conditions/',
    title: 'Terms & Conditions',
    intro: 'How website estimates, visit requests and written quotes work.',
    sections: [
      ['Estimates and currency', `Calculator prices are planning estimates. The service and handling fee shown is ${(serviceHandlingRate * 100).toFixed(1)}% of the service subtotal. Prices for other currencies use indicative exchange rates. Your written quote sets out the actual price, site-specific scope, applicable taxes and payment terms.`],
      ['Requesting a visit', 'A time shown by the checker is available for request. Sending an enquiry does not reserve the time. Our dispatch team confirms service coverage, the appointment and access requirements.'],
      ['Agreeing to work', 'Review the quote, scope and any agreed terms before approving the work. Contact us if the site conditions or the work needed change.'],
      ['Contact', 'For questions about a quote or service visit, email ' + contact + '.'],
    ],
  },
  {
    path: '/cookies-policy/',
    title: 'Cookies Policy',
    intro: 'What this website and its embedded services can store in your browser.',
    sections: [
      ['Country preference', 'The site uses browser local storage to remember the country you select. That preference controls the currency and location options. Clear site data in your browser to reset it.'],
      ['Hosting and Google Maps', 'The hosting platform may use cookies for site access and security. The embedded map and Google review widget can use browser storage under <a href="https://policies.google.com/privacy">Google’s Privacy Policy</a>. External sites opened from a link have their own cookie settings.'],
      ['Optional analytics', 'When enabled, Google Analytics, Google Ads and Meta Pixel can measure visits and clicks to call or open WhatsApp after you allow measurement. Open the measurement settings at the foot of a page to change your choice. The site does not send the text of your enquiry to Analytics.'],
      ['Your browser settings', 'You can view or clear stored information and manage third-party cookies in your browser. Restricting storage may affect sign-in or the embedded map. Contact ' + contact + ' with questions.'],
    ],
  },
];
