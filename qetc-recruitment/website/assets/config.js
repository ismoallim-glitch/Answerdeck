/**
 * WEBSITE SETTINGS — edit this file, nothing else is required.
 * Anything marked VERIFY must be confirmed with QETC before you switch it on.
 */
window.SITE_CONFIG = {
  // Paste your Google Apps Script Web app URL (ends with /exec). See docs/DEPLOY.md step 4.
  API_URL: '',

  CONSULTANT_NAME: 'Ismail Hassan',

  // Your WhatsApp number in international format, digits only, e.g. '60123456789'. Leave '' to hide WhatsApp buttons.
  WHATSAPP_NUMBER: '254710540018',

  // Public contact email shown on the site. Leave '' to hide.
  CONTACT_EMAIL: 'ismoallim@gmail.com',

  // VERIFY: set to true only after QETC confirms the current packages, prices and conditions in writing.
  PACKAGES_VERIFIED: false,
  PACKAGES: [
    // Previously published by QETC — shown ONLY when PACKAGES_VERIFIED is true. Update with the latest official details.
    { name: 'Silver', price: 'Free', notes: 'Confirm included services with QETC' },
    { name: 'Golden', price: 'USD 299', notes: 'Confirm included services with QETC' },
    { name: 'Diamond', price: 'USD 499', notes: 'Confirm included services with QETC' }
  ],

  // VERIFY: list ONLY universities QETC has confirmed it can currently process applications for.
  // Example: { name: 'University name', city: 'Kuala Lumpur', type: 'Private university', url: 'https://...' }
  CONFIRMED_UNIVERSITIES: []
};
