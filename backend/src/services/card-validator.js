/* ============================================================
   OMNI backend — src/services/card-validator.js
   Enhanced card validation — Luhn checksum, BIN/IIN lookup,
   card brand detection, type identification, and issuing bank.
   ============================================================ */
'use strict';

const BIN_DATABASE = {
  '400005': { brand: 'visa', type: 'debit', bank: 'Wells Fargo', country: 'US' },
  '400012': { brand: 'visa', type: 'debit', bank: 'Chase', country: 'US' },
  '400018': { brand: 'visa', type: 'credit', bank: 'Bank of America', country: 'US' },
  '411111': { brand: 'visa', type: 'credit', bank: 'Test Bank', country: 'US' },
  '424242': { brand: 'visa', type: 'credit', bank: 'Stripe Test', country: 'US' },
  '510000': { brand: 'mastercard', type: 'credit', bank: 'Capital One', country: 'US' },
  '520000': { brand: 'mastercard', type: 'credit', bank: 'Citi', country: 'US' },
  '530000': { brand: 'mastercard', type: 'debit', bank: 'PNC Bank', country: 'US' },
  '555555': { brand: 'mastercard', type: 'credit', bank: 'Test Bank', country: 'US' },
  '340000': { brand: 'amex', type: 'credit', bank: 'American Express', country: 'US' },
  '370000': { brand: 'amex', type: 'credit', bank: 'American Express', country: 'US' },
  '601100': { brand: 'discover', type: 'credit', bank: 'Discover', country: 'US' },
  '650000': { brand: 'discover', type: 'credit', bank: 'Discover', country: 'US' },
  '352800': { brand: 'jcb', type: 'credit', bank: 'JCB', country: 'JP' },
  '630400': { brand: 'maestro', type: 'debit', bank: 'Maestro', country: 'GB' },
  '490000': { brand: 'visa_electron', type: 'debit', bank: 'Visa Electron', country: 'GB' }
};

const CARD_LENGTHS = {
  visa: [13, 16, 19],
  mastercard: [16],
  amex: [15],
  discover: [16],
  jcb: [15, 16],
  maestro: [12, 13, 14, 15, 16, 17, 18, 19],
  visa_electron: [16]
};

const CARD_PATTERNS = {
  visa: /^4/,
  mastercard: /^5[1-5]/,
  amex: /^3[47]/,
  discover: /^6(?:011|5)/,
  jcb: /^35[2-8]/,
  maestro: /^(?:5018|5020|5038|6304)/,
  visa_electron: /^4026|4175|4405|4508|4844|4913/
};

/**
 * Run Luhn algorithm on a card number.
 * @param {string} digits - Pure digit string
 * @returns {boolean}
 */
function luhnCheck(digits) {
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = parseInt(digits.charAt(i), 10);
    if (double) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
    double = !double;
  }
  return sum % 10 === 0;
}

/**
 * Detect card brand from number.
 * @param {string} digits
 * @returns {string}
 */
function detectBrand(digits) {
  for (const [brand, pattern] of Object.entries(CARD_PATTERNS)) {
    if (pattern.test(digits)) return brand;
  }
  return 'unknown';
}

/**
 * Look up BIN/IIN data from first 6 digits.
 * @param {string} bin
 * @returns {object|null}
 */
function lookupBIN(bin) {
  const prefix6 = bin.slice(0, 6);
  return BIN_DATABASE[prefix6] || null;
}

/**
 * Validate card number with full details.
 * @param {string} number
 * @returns {object}
 */
function validateCard(number) {
  const digits = String(number || '').replace(/[\s\-]/g, '');

  if (!/^\d{12,19}$/.test(digits)) {
    return {
      valid: false, brand: 'unknown', type: null, last4: '',
      BIN: null, issuingBank: null, country: null,
      reason: 'Invalid length — card numbers must be 12-19 digits'
    };
  }

  const valid = luhnCheck(digits);
  const brand = detectBrand(digits);
  const bin = lookupBIN(digits);
  const expectedLengths = CARD_LENGTHS[brand] || [16];
  const correctLength = expectedLengths.includes(digits.length);

  return {
    valid: valid && correctLength,
    brand,
    type: bin?.type || 'unknown',
    last4: digits.slice(-4),
    BIN: digits.slice(0, 6),
    issuingBank: bin?.bank || 'Unknown',
    country: bin?.country || 'Unknown',
    length: digits.length,
    expectedLengths,
    correctLength,
    luhnValid: valid,
    reason: !valid ? 'Luhn checksum failed'
      : !correctLength ? `Invalid length for ${brand} (expected ${expectedLengths.join('/')})`
      : ''
  };
}

/**
 * Validate expiry date.
 * @param {number|string} month - 1-12
 * @param {number|string} year - 2 or 4 digit year
 * @returns {object}
 */
function validateExpiry(month, year) {
  const m = parseInt(month, 10);
  let y = parseInt(year, 10);
  if (!m || m < 1 || m > 12) {
    return { valid: false, reason: 'Invalid month' };
  }
  if (y < 100) y += 2000;
  if (y < 2000 || y > 2100) {
    return { valid: false, reason: 'Invalid year' };
  }

  const now = new Date();
  const expiry = new Date(y, m, 0); // last day of month
  const monthsUntilExpiry = (y - now.getFullYear()) * 12 + (m - now.getMonth() - 1);

  return {
    valid: expiry > now,
    expired: expiry <= now,
    month: m,
    year: y,
    monthsUntilExpiry,
    reason: expiry <= now ? 'Card has expired' : '',
    warning: monthsUntilExpiry <= 3 && monthsUntilExpiry > 0 ? 'Card expires soon' : null
  };
}

/**
 * Validate CVV.
 * @param {string} cvv
 * @param {string} brand
 * @returns {object}
 */
function validateCVV(cvv, brand) {
  const digits = String(cvv || '').replace(/\D/g, '');
  const expectedLength = brand === 'amex' ? 4 : 3;
  return {
    valid: digits.length === expectedLength && /^\d+$/.test(digits),
    length: digits.length,
    expectedLength,
    reason: digits.length !== expectedLength ? `CVV must be ${expectedLength} digits` : ''
  };
}

/**
 * Validate billing address (basic format check).
 * @param {object} address - { line1, city, state, postalCode, country }
 * @returns {object}
 */
function validateAddress(address) {
  const errors = [];
  if (!address?.line1) errors.push('Street address is required');
  if (!address?.city) errors.push('City is required');
  if (!address?.state) errors.push('State is required');
  if (!address?.postalCode) errors.push('Postal code is required');
  if (!address?.country) errors.push('Country is required');
  return { valid: errors.length === 0, errors };
}

/**
 * Generate test card numbers for development.
 * @param {object} opts - { brand, type, shouldPassLuhn }
 * @returns {string}
 */
function generateTestCard(opts = {}) {
  const brand = opts.brand || 'visa';
  const testCards = {
    visa: ['4242424242424242', '4000056655665556', '4000183456123456'],
    mastercard: ['5555555555554444', '5105105105105100', '5200828282828210'],
    amex: ['378282246310005', '371449635398431', '378734493671000'],
    discover: ['6011111111111117', '6011000990139424', '6500000000000002']
  };

  const cards = testCards[brand] || testCards.visa;
  return cards[Math.floor(Math.random() * cards.length)];
}

module.exports = {
  validateCard, validateExpiry, validateCVV, validateAddress,
  luhnCheck, detectBrand, lookupBIN, generateTestCard,
  BIN_DATABASE, CARD_PATTERNS
};
