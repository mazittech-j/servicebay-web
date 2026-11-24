const methods = [
  ['Apple Pay', 'apple-pay-mark.svg'],
  ['Google Pay', 'google-pay.webp'],
  ['Stripe', 'stripe.webp'],
  ['Tabby', 'tabby-badge.svg'],
  ['Tamara', 'tamara-badge.webp'],
  ['Visa', 'visa.webp'],
  ['Mastercard', 'mastercard.webp'],
];

export function paymentMarks() {
  return `<div class="payment-methods">
    <span class="payment-heading" id="footer-payment-heading">Ways to pay</span>
    <ul class="payment-marks" aria-labelledby="footer-payment-heading">${methods.map(([name, file]) =>
      `<li><img src="/assets/payment/${file}" alt="${name}" width="72" height="34" loading="lazy"></li>`
    ).join('')}</ul>
  </div>`;
}
