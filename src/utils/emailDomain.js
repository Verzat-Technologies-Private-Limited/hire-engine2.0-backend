/**
 * Corporate & Disposable Email Domain Utilities.
 * Used across country plugins to validate corporate email authenticity.
 */

// Comprehensive list of global and regional consumer/free webmail domains
const FREE_EMAIL_DOMAINS = new Set([
  // Global major providers
  'gmail.com',
  'googlemail.com',
  'yahoo.com',
  'yahoo.co.in',
  'yahoo.co.uk',
  'ymail.com',
  'rocketmail.com',
  'hotmail.com',
  'hotmail.co.uk',
  'outlook.com',
  'live.com',
  'msn.com',
  'icloud.com',
  'me.com',
  'mac.com',
  'aol.com',
  'aim.com',
  'zoho.com',
  'zohomail.com',
  'proton.me',
  'protonmail.com',
  'mail.com',
  'gmx.com',
  'gmx.net',
  'tutanota.com',
  'tutamail.com',
  'fastmail.com',

  // Regional & ISP webmail providers
  // India
  'rediffmail.com',
  'sify.com',
  'indiatimes.com',
  // US / Americas
  'comcast.net',
  'sbcglobal.net',
  'att.net',
  'verizon.net',
  'cox.net',
  'charter.net',
  'bellsouth.net',
  // Europe
  'web.de',
  'gmx.de',
  't-online.de',
  'orange.fr',
  'wanadoo.fr',
  'free.fr',
  'laposte.net',
  'libero.it',
  'virgilio.it',
  'tiscali.it',
  'mail.ru',
  'yandex.ru',
  'yandex.com',
  'rambler.ru',
  'inbox.lv',
  // Asia / Pacific
  'qq.com',
  '163.com',
  '126.com',
  'sina.com',
  'sohu.com',
  'naver.com',
  'daum.net',
  'hanmail.net',
  'yahoo.co.jp',

  // Temporary / Disposable email domains (samples)
  'tempmail.com',
  'guerrillamail.com',
  'sharklasers.com',
  'mailinator.com',
  '10minutemail.com',
  'throwawaymail.com',
  'yopmail.com',
  'trashmail.com',
]);

/**
 * Extract clean lowercase domain from an email address or website URL.
 * @param {string} input - Email address (e.g. 'recruiter@acme.com') or URL (e.g. 'https://www.acme.com/jobs')
 * @returns {string} Clean domain name (e.g. 'acme.com')
 */
function extractDomain(input) {
  if (!input || typeof input !== 'string') return '';
  let str = input.trim().toLowerCase();

  // If email, grab portion after '@'
  if (str.includes('@')) {
    str = str.split('@').pop().trim();
  } else {
    // If URL, remove protocol and path
    str = str.replace(/^[a-zA-Z]+:\/\//, ''); // Remove http:// or https://
    str = str.split('/')[0]; // Remove path
    str = str.split(':')[0]; // Remove port if present
  }

  // Remove leading 'www.' or common subdomains if desired, but keep root
  str = str.replace(/^www\./, '');
  return str;
}

/**
 * Check if an email address belongs to a known free consumer webmail or disposable email service.
 * @param {string} email
 * @returns {boolean}
 */
function isFreeEmailProvider(email) {
  const domain = extractDomain(email);
  if (!domain) return false;
  return FREE_EMAIL_DOMAINS.has(domain);
}

/**
 * Check if an email domain matches a company website domain.
 * Supports exact matches and subdomains (e.g., 'careers.acme.com' matches 'acme.com').
 * @param {string} email
 * @param {string} websiteUrl
 * @returns {boolean}
 */
function domainsMatch(email, websiteUrl) {
  const emailDomain = extractDomain(email);
  const websiteDomain = extractDomain(websiteUrl);

  if (!emailDomain || !websiteDomain) return false;
  if (emailDomain === websiteDomain) return true;

  // Check if one is a subdomain of the other
  if (emailDomain.endsWith(`.${websiteDomain}`) || websiteDomain.endsWith(`.${emailDomain}`)) {
    return true;
  }

  return false;
}

/**
 * Validate that an email is a legitimate corporate email address for employer registration.
 * @param {string} email - User's email
 * @param {string} [websiteUrl] - Company's website URL (optional)
 * @returns {{ valid: boolean, message?: string }}
 */
function validateCorporateEmail(email, websiteUrl = '') {
  if (!email || typeof email !== 'string') {
    return { valid: false, message: 'A valid email address is required' };
  }

  const domain = extractDomain(email);
  if (!domain || !domain.includes('.')) {
    return { valid: false, message: 'Invalid email domain' };
  }

  if (isFreeEmailProvider(email)) {
    return {
      valid: false,
      message: `A business/corporate email address is required to register an employer company profile (e.g., hr@yourcompany.com). Consumer email providers (@${domain}) are not permitted.`,
    };
  }

  // If websiteUrl is provided, optionally check alignment
  if (websiteUrl) {
    const websiteDomain = extractDomain(websiteUrl);
    if (websiteDomain && !domainsMatch(email, websiteUrl)) {
      // Return warning or soft notice if domain mismatch, but don't strictly block unless required
      // We will allow company parent/subsidiary domains, but flag if totally unrelated
    }
  }

  return { valid: true };
}

module.exports = {
  FREE_EMAIL_DOMAINS,
  extractDomain,
  isFreeEmailProvider,
  domainsMatch,
  validateCorporateEmail,
};
