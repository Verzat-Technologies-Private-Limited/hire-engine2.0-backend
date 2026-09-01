/**
 * Static mapping of common country names → ISO 3166-1 alpha-2 codes.
 * Used to auto-derive `countryCode` from `location.country` text.
 *
 * This mapping covers the most common names and their variations.
 * For a more comprehensive solution, consider the `i18n-iso-countries` npm package.
 */

const COUNTRY_NAME_TO_CODE = {
  'afghanistan': 'AF',
  'albania': 'AL',
  'algeria': 'DZ',
  'argentina': 'AR',
  'armenia': 'AM',
  'australia': 'AU',
  'austria': 'AT',
  'azerbaijan': 'AZ',
  'bahrain': 'BH',
  'bangladesh': 'BD',
  'belarus': 'BY',
  'belgium': 'BE',
  'bolivia': 'BO',
  'bosnia and herzegovina': 'BA',
  'brazil': 'BR',
  'brunei': 'BN',
  'bulgaria': 'BG',
  'cambodia': 'KH',
  'cameroon': 'CM',
  'canada': 'CA',
  'chile': 'CL',
  'china': 'CN',
  'colombia': 'CO',
  'costa rica': 'CR',
  'croatia': 'HR',
  'cuba': 'CU',
  'cyprus': 'CY',
  'czech republic': 'CZ',
  'czechia': 'CZ',
  'denmark': 'DK',
  'dominican republic': 'DO',
  'ecuador': 'EC',
  'egypt': 'EG',
  'el salvador': 'SV',
  'estonia': 'EE',
  'ethiopia': 'ET',
  'finland': 'FI',
  'france': 'FR',
  'georgia': 'GE',
  'germany': 'DE',
  'ghana': 'GH',
  'greece': 'GR',
  'guatemala': 'GT',
  'honduras': 'HN',
  'hong kong': 'HK',
  'hungary': 'HU',
  'iceland': 'IS',
  'india': 'IN',
  'indonesia': 'ID',
  'iran': 'IR',
  'iraq': 'IQ',
  'ireland': 'IE',
  'israel': 'IL',
  'italy': 'IT',
  'jamaica': 'JM',
  'japan': 'JP',
  'jordan': 'JO',
  'kazakhstan': 'KZ',
  'kenya': 'KE',
  'kuwait': 'KW',
  'kyrgyzstan': 'KG',
  'latvia': 'LV',
  'lebanon': 'LB',
  'libya': 'LY',
  'lithuania': 'LT',
  'luxembourg': 'LU',
  'malaysia': 'MY',
  'maldives': 'MV',
  'malta': 'MT',
  'mexico': 'MX',
  'moldova': 'MD',
  'mongolia': 'MN',
  'montenegro': 'ME',
  'morocco': 'MA',
  'mozambique': 'MZ',
  'myanmar': 'MM',
  'namibia': 'NA',
  'nepal': 'NP',
  'netherlands': 'NL',
  'new zealand': 'NZ',
  'nicaragua': 'NI',
  'nigeria': 'NG',
  'north korea': 'KP',
  'north macedonia': 'MK',
  'norway': 'NO',
  'oman': 'OM',
  'pakistan': 'PK',
  'palestine': 'PS',
  'panama': 'PA',
  'paraguay': 'PY',
  'peru': 'PE',
  'philippines': 'PH',
  'poland': 'PL',
  'portugal': 'PT',
  'qatar': 'QA',
  'romania': 'RO',
  'russia': 'RU',
  'russian federation': 'RU',
  'rwanda': 'RW',
  'saudi arabia': 'SA',
  'senegal': 'SN',
  'serbia': 'RS',
  'singapore': 'SG',
  'slovakia': 'SK',
  'slovenia': 'SI',
  'south africa': 'ZA',
  'south korea': 'KR',
  'spain': 'ES',
  'sri lanka': 'LK',
  'sudan': 'SD',
  'sweden': 'SE',
  'switzerland': 'CH',
  'syria': 'SY',
  'taiwan': 'TW',
  'tajikistan': 'TJ',
  'tanzania': 'TZ',
  'thailand': 'TH',
  'tunisia': 'TN',
  'turkey': 'TR',
  'turkmenistan': 'TM',
  'uganda': 'UG',
  'ukraine': 'UA',
  'united arab emirates': 'AE',
  'uae': 'AE',
  'united kingdom': 'GB',
  'uk': 'GB',
  'great britain': 'GB',
  'england': 'GB',
  'scotland': 'GB',
  'wales': 'GB',
  'united states': 'US',
  'united states of america': 'US',
  'usa': 'US',
  'us': 'US',
  'america': 'US',
  'uruguay': 'UY',
  'uzbekistan': 'UZ',
  'venezuela': 'VE',
  'vietnam': 'VN',
  'viet nam': 'VN',
  'yemen': 'YE',
  'zambia': 'ZM',
  'zimbabwe': 'ZW',
};

/**
 * Convert a country name to its ISO 3166-1 alpha-2 code.
 * Returns null if the country name is not recognized.
 *
 * @param {string} countryName - Country name in any case (e.g. "India", "UNITED STATES")
 * @returns {string|null} ISO alpha-2 code (e.g. "IN", "US") or null
 */
function countryNameToCode(countryName) {
  if (!countryName || typeof countryName !== 'string') return null;

  const normalized = countryName.toLowerCase().trim();
  return COUNTRY_NAME_TO_CODE[normalized] || null;
}

/**
 * Check if a given string is already a valid 2-letter ISO country code.
 * @param {string} value
 * @returns {boolean}
 */
function isIsoCountryCode(value) {
  if (!value || typeof value !== 'string') return false;
  return /^[A-Z]{2}$/.test(value.trim().toUpperCase());
}

module.exports = { countryNameToCode, isIsoCountryCode };
