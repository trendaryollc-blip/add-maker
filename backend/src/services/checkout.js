/* ============================================================
   OMNI backend — src/services/checkout.js
   Phantom Checkout: full payment pipeline orchestrating card
   validation, multi-gateway processing, order management,
   receipt generation, and refund/dispute simulation.
   NOTE: this is a DEMO/POC implementation. Card data must never
   be stored or logged; wire a PCI-compliant provider (Stripe etc.)
   and tokenize card data in production.
   ============================================================ */
'use strict';

const cardValidator = require('./card-validator');
const paymentProcessor = require('./payment-processor');
const receiptGenerator = require('./receipt-generator');
const orderManager = require('./order-manager');
const checkoutFlow = require('./checkout-flow');

function round(v, d) { const p = Math.pow(10, d || 0); return Math.round(v * p) / p; }

/**
 * Validate a card number (length + Luhn) and detect brand.
 * @param {string} number
 * @returns {object}
 */
function validateCard(number) {
  return cardValidator.validateCard(number);
}

/**
 * Validate expiry date.
 * @param {number|string} month
 * @param {number|string} year
 * @returns {object}
 */
function validateExpiry(month, year) {
  return cardValidator.validateExpiry(month, year);
}

/**
 * Validate CVV.
 * @param {string} cvv
 * @param {string} brand
 * @returns {object}
 */
function validateCVV(cvv, brand) {
  return cardValidator.validateCVV(cvv, brand);
}

/**
 * Generate a unique order ID.
 * @param {string} prefix
 * @returns {string}
 */
function generateOrderId(prefix) {
  return checkoutFlow.generateOrderId(prefix);
}

/**
 * Process a full payment with order creation and receipt.
 * @param {object} details - { cardNumber, expMonth, expYear, cvv, amount, currency, email, productName, gateway, items }
 * @returns {Promise<object>}
 */
async function processPayment(details) {
  const d = details || {};

  // Validate card
  const card = cardValidator.validateCard(d.cardNumber);
  if (!card.valid) {
    return { success: false, error: `Invalid card: ${card.reason}`, status: 400 };
  }

  // Validate expiry
  const expiry = cardValidator.validateExpiry(d.expMonth, d.expYear);
  if (!expiry.valid) {
    return { success: false, error: expiry.reason, status: 400 };
  }

  // Validate amount
  const amount = Number(d.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { success: false, error: 'Invalid amount', status: 400 };
  }

  // Process payment through gateway
  const payment = await paymentProcessor.processPayment({
    amount,
    currency: d.currency || 'USD',
    card: { brand: card.brand, last4: card.last4, BIN: card.BIN },
    gateway: d.gateway || 'stripe',
    email: d.email,
    metadata: { productName: d.productName }
  });

  if (!payment.success) {
    return {
      success: false,
      error: payment.error,
      code: payment.code,
      shouldRetry: payment.shouldRetry,
      status: payment.code === 'insufficient_funds' ? 402 : 400
    };
  }

  // Create order
  const orderId = d.orderId || generateOrderId();
  const order = await orderManager.createOrder(d.userId || 'anonymous', {
    orderId,
    chargeId: payment.chargeId,
    amount: round(amount, 2),
    currency: d.currency || 'USD',
    productName: d.productName || 'OMNI order',
    email: d.email || '',
    cardBrand: card.brand,
    cardLast4: card.last4,
    gateway: payment.gateway
  });

  // Generate receipt
  const receipt = receiptGenerator.generateReceipt({
    orderId,
    items: d.items || [{ name: d.productName || 'OMNI Order', unitPrice: amount, quantity: 1 }],
    email: d.email,
    cardBrand: card.brand,
    cardLast4: card.last4,
    gateway: payment.gateway,
    chargeId: payment.chargeId,
    currency: d.currency || 'USD'
  });

  // Send confirmation
  let confirmation = { sent: false };
  if (d.email) {
    confirmation = await sendConfirmation(d.email, {
      orderId, amount: round(amount, 2), currency: d.currency || 'USD',
      product: d.productName || 'OMNI order', receiptNumber: receipt.receiptNumber
    });
  }

  return {
    success: true,
    orderId,
    status: 'succeeded',
    chargeId: payment.chargeId,
    amount: round(amount, 2),
    currency: d.currency || 'USD',
    card: { brand: card.brand, last4: card.last4 },
    gateway: payment.gateway,
    receipt,
    confirmation,
    order,
    processedAt: new Date().toISOString()
  };
}

/**
 * Process a refund.
 * @param {object} opts - { orderId, amount, reason, gateway }
 * @returns {Promise<object>}
 */
async function processRefund(opts) {
  return orderManager.processRefund(opts.orderId, {
    amount: opts.amount,
    reason: opts.reason
  });
}

/**
 * Simulate a dispute.
 * @param {object} opts - { orderId, reason, evidence }
 * @returns {Promise<object>}
 */
async function simulateDispute(opts) {
  return orderManager.simulateDispute(opts.orderId, {
    reason: opts.reason,
    evidence: opts.evidence
  });
}

/**
 * Get user orders with stats.
 * @param {string} userId
 * @returns {Promise<object>}
 */
async function getOrders(userId) {
  return orderManager.getUserOrders(userId);
}

/**
 * Get order by ID.
 * @param {string} orderId
 * @returns {Promise<object>}
 */
async function getOrder(orderId) {
  return orderManager.getOrder(orderId);
}

/**
 * Prepare a confirmation / receipt email payload.
 * @param {string} email
 * @param {object} order
 * @returns {Promise<object>}
 */
function sendConfirmation(email, order) {
  return new Promise((resolve) => {
    const o = order || {};
    setTimeout(() => {
      resolve({
        sent: true,
        to: email,
        subject: `Your OMNI order ${o.orderId} is confirmed`,
        text: `Receipt for order ${o.orderId}: $${o.amount} ${o.currency}`,
        receiptNumber: o.receiptNumber || null,
        sentAt: new Date().toISOString()
      });
    }, 100);
  });
}

/**
 * Get supported payment gateways.
 * @returns {object[]}
 */
function getGateways() {
  return paymentProcessor.getGateways();
}

/**
 * Get supported currencies.
 * @returns {object}
 */
function getCurrencies() {
  return paymentProcessor.getCurrencies();
}

module.exports = {
  validateCard, validateExpiry, validateCVV,
  generateOrderId, processPayment, processRefund,
  simulateDispute, getOrders, getOrder,
  sendConfirmation, getGateways, getCurrencies,
  checkoutFlow
};
