/* ============================================================
   OMNI backend — src/services/payment-processor.js
   Multi-gateway payment processor simulator — models Stripe,
   PayPal, and Square with realistic latency, decline rates,
   and response formats.
   ============================================================ */
'use strict';

const crypto = require('crypto');

function round(v, d) { const p = Math.pow(10, d || 0); return Math.round(v * p) / p; }
function r(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

const GATEWAYS = {
  stripe: {
    name: 'Stripe',
    latency: [150, 400],
    declineRate: 0.05,
    formats: {
      chargeId: () => 'ch_' + crypto.randomBytes(12).toString('hex'),
      paymentIntent: () => 'pi_' + crypto.randomBytes(12).toString('hex'),
      refundId: () => 're_' + crypto.randomBytes(8).toString('hex')
    }
  },
  paypal: {
    name: 'PayPal',
    latency: [200, 600],
    declineRate: 0.07,
    formats: {
      chargeId: () => 'PAY-' + crypto.randomBytes(8).toString('hex').toUpperCase(),
      paymentIntent: () => 'PAYID-' + crypto.randomBytes(8).toString('hex').toUpperCase(),
      refundId: () => 'REFUND-' + crypto.randomBytes(6).toString('hex').toUpperCase()
    }
  },
  square: {
    name: 'Square',
    latency: [100, 300],
    declineRate: 0.04,
    formats: {
      chargeId: () => 'sq0 ' + crypto.randomBytes(8).toString('hex'),
      paymentIntent: () => 'sq0pi-' + crypto.randomBytes(8).toString('hex'),
      refundId: () => 'sq0rf-' + crypto.randomBytes(6).toString('hex')
    }
  }
};

const DECLINE_REASONS = [
  { code: 'insufficient_funds', message: 'Insufficient funds', shouldRetry: true },
  { code: 'lost_card', message: 'Lost card — do not honor', shouldRetry: false },
  { code: 'stolen_card', message: 'Stolen card — do not honor', shouldRetry: false },
  { code: 'expired_card', message: 'Expired card', shouldRetry: false },
  { code: 'incorrect_cvc', message: 'Incorrect CVC', shouldRetry: true },
  { code: 'card_declined', message: 'Card declined', shouldRetry: true },
  { code: 'processing_error', message: 'Processing error', shouldRetry: true },
  { code: 'fraud_suspected', message: 'Transaction flagged for fraud review', shouldRetry: false }
];

const CURRENCIES = {
  USD: { symbol: '$', decimal: 2 },
  EUR: { symbol: '€', decimal: 2 },
  GBP: { symbol: '£', decimal: 2 },
  JPY: { symbol: '¥', decimal: 0 },
  CAD: { symbol: 'C$', decimal: 2 },
  AUD: { symbol: 'A$', decimal: 2 }
};

/**
 * Process a payment through a simulated gateway.
 * @param {object} opts - { amount, currency, card, gateway, email, metadata }
 * @returns {Promise<object>}
 */
async function processPayment(opts) {
  const gateway = GATEWAYS[opts.gateway] || GATEWAYS.stripe;
  const amount = Number(opts.amount);
  const currency = (opts.currency || 'USD').toUpperCase();

  if (!Number.isFinite(amount) || amount <= 0) {
    return { success: false, error: 'Invalid amount', code: 'invalid_amount' };
  }

  if (amount > 99999.99) {
    return { success: false, error: 'Amount exceeds maximum', code: 'amount_too_large' };
  }

  const currencyInfo = CURRENCIES[currency];
  if (!currencyInfo) {
    return { success: false, error: `Unsupported currency: ${currency}`, code: 'invalid_currency' };
  }

  // Simulate latency
  const latency = r(gateway.latency[0], gateway.latency[1]);
  await new Promise(resolve => setTimeout(resolve, latency));

  // Simulate decline
  if (Math.random() < gateway.declineRate) {
    const decline = DECLINE_REASONS[r(0, DECLINE_REASONS.length - 1)];
    return {
      success: false,
      error: decline.message,
      code: decline.code,
      shouldRetry: decline.shouldRetry,
      gateway: gateway.name,
      latency
    };
  }

  // Success
  const chargeId = gateway.formats.chargeId();
  const paymentIntent = gateway.formats.paymentIntent();

  return {
    success: true,
    chargeId,
    paymentIntent,
    amount: round(amount, currencyInfo.decimal),
    currency,
    currencySymbol: currencyInfo.symbol,
    status: 'succeeded',
    gateway: gateway.name,
    gatewayResponse: {
      id: chargeId,
      object: 'charge',
      amount: Math.round(amount * Math.pow(10, currencyInfo.decimal)),
      currency: currency.toLowerCase(),
      status: 'paid',
      paid: true,
      captured: true
    },
    email: opts.email || '',
    metadata: opts.metadata || {},
    receipt: {
      number: 'RCPT-' + crypto.randomBytes(4).toString('hex').toUpperCase(),
      url: `https://receipts.omni.dev/${chargeId}`,
      timestamp: new Date().toISOString()
    },
    latency,
    processedAt: new Date().toISOString()
  };
}

/**
 * Process a refund.
 * @param {object} opts - { chargeId, amount, reason, gateway }
 * @returns {Promise<object>}
 */
async function processRefund(opts) {
  const gateway = GATEWAYS[opts.gateway] || GATEWAYS.stripe;
  const latency = r(gateway.latency[0], gateway.latency[1]);
  await new Promise(resolve => setTimeout(resolve, latency));

  const refundId = gateway.formats.refundId();
  const amount = Number(opts.amount);

  return {
    success: true,
    refundId,
    chargeId: opts.chargeId || 'unknown',
    amount: round(amount, 2),
    status: 'refunded',
    reason: opts.reason || 'requested_by_customer',
    gateway: gateway.name,
    refund: {
      id: refundId,
      object: 'refund',
      amount: Math.round(amount * 100),
      status: 'succeeded',
      reason: opts.reason || 'requested_by_customer'
    },
    processedAt: new Date().toISOString()
  };
}

/**
 * Get supported gateways.
 * @returns {object[]}
 */
function getGateways() {
  return Object.entries(GATEWAYS).map(([id, g]) => ({
    id,
    name: g.name,
    latencyRange: g.latency,
    declineRate: `${Math.round(g.declineRate * 100)}%`
  }));
}

/**
 * Get supported currencies.
 * @returns {object}
 */
function getCurrencies() {
  return CURRENCIES;
}

module.exports = { processPayment, processRefund, getGateways, getCurrencies, GATEWAYS };
