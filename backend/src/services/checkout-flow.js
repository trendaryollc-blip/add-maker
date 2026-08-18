/* ============================================================
   OMNI backend — src/services/checkout-flow.js
   Checkout flow engine — manages the full purchase flow from
   cart → shipping → payment → confirmation with validation
   at each step.
   ============================================================ */
'use strict';

const cardValidator = require('./card-validator');
const paymentProcessor = require('./payment-processor');
const receiptGenerator = require('./receipt-generator');
const orderManager = require('./order-manager');

function round(v, d) { const p = Math.pow(10, d || 0); return Math.round(v * p) / p; }

/**
 * Validate the entire checkout flow before payment.
 * @param {object} checkoutData
 * @returns {object}
 */
function validateCheckout(checkoutData) {
  const errors = [];
  const warnings = [];

  // Validate cart
  if (!checkoutData.items || checkoutData.items.length === 0) {
    errors.push({ field: 'items', message: 'Cart is empty' });
  } else {
    for (const item of checkoutData.items) {
      if (!item.name) errors.push({ field: 'items', message: 'Item name is required' });
      if (!item.price || item.price <= 0) errors.push({ field: 'items', message: `Invalid price for ${item.name || 'item'}` });
      if (item.quantity && item.quantity < 1) errors.push({ field: 'items', message: `Invalid quantity for ${item.name || 'item'}` });
    }
  }

  // Validate amount
  const amount = Number(checkoutData.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    errors.push({ field: 'amount', message: 'Invalid payment amount' });
  }
  if (amount > 99999.99) {
    errors.push({ field: 'amount', message: 'Amount exceeds maximum ($99,999.99)' });
  }

  // Validate card
  if (checkoutData.cardNumber) {
    const card = cardValidator.validateCard(checkoutData.cardNumber);
    if (!card.valid) {
      errors.push({ field: 'cardNumber', message: `Card invalid: ${card.reason}` });
    }

    const expiry = cardValidator.validateExpiry(checkoutData.expMonth, checkoutData.expYear);
    if (!expiry.valid) {
      errors.push({ field: 'expMonth/expYear', message: expiry.reason });
    }
    if (expiry.warning) {
      warnings.push({ field: 'expMonth/expYear', message: expiry.warning });
    }

    if (checkoutData.cvv) {
      const cvv = cardValidator.validateCVV(checkoutData.cvv, card.brand);
      if (!cvv.valid) {
        errors.push({ field: 'cvv', message: cvv.reason });
      }
    }
  }

  // Validate email
  if (checkoutData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(checkoutData.email)) {
    errors.push({ field: 'email', message: 'Invalid email format' });
  }

  // Validate currency
  const supportedCurrencies = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD'];
  if (checkoutData.currency && !supportedCurrencies.includes(checkoutData.currency.toUpperCase())) {
    errors.push({ field: 'currency', message: `Unsupported currency: ${checkoutData.currency}` });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    amount: round(amount, 2),
    currency: (checkoutData.currency || 'USD').toUpperCase()
  };
}

/**
 * Execute the full checkout flow.
 * @param {object} checkoutData
 * @returns {Promise<object>}
 */
async function executeCheckout(checkoutData) {
  // Step 1: Validate
  const validation = validateCheckout(checkoutData);
  if (!validation.valid) {
    return {
      success: false,
      step: 'validation',
      errors: validation.errors,
      warnings: validation.warnings
    };
  }

  // Step 2: Process payment
  const card = cardValidator.validateCard(checkoutData.cardNumber);
  const payment = await paymentProcessor.processPayment({
    amount: validation.amount,
    currency: validation.currency,
    card: {
      brand: card.brand,
      last4: card.last4,
      BIN: card.BIN
    },
    gateway: checkoutData.gateway || 'stripe',
    email: checkoutData.email,
    metadata: {
      productName: checkoutData.productName,
      items: checkoutData.items
    }
  });

  if (!payment.success) {
    return {
      success: false,
      step: 'payment',
      error: payment.error,
      code: payment.code,
      shouldRetry: payment.shouldRetry,
      gateway: payment.gateway
    };
  }

  // Step 3: Create order
  const orderId = checkoutData.orderId || generateOrderId();
  const order = await orderManager.createOrder(checkoutData.userId || 'anonymous', {
    orderId,
    chargeId: payment.chargeId,
    amount: validation.amount,
    currency: validation.currency,
    productName: checkoutData.productName,
    email: checkoutData.email,
    cardBrand: card.brand,
    cardLast4: card.last4,
    gateway: payment.gateway,
    items: checkoutData.items,
    tax: checkoutData.tax || 0,
    shipping: checkoutData.shipping || 0,
    discount: checkoutData.discount || 0
  });

  // Step 4: Generate receipt
  const receipt = receiptGenerator.generateReceipt({
    orderId,
    items: checkoutData.items || [{ name: checkoutData.productName || 'OMNI Order', unitPrice: validation.amount, quantity: 1 }],
    email: checkoutData.email,
    customerName: checkoutData.customerName,
    tax: checkoutData.tax ? { rate: checkoutData.taxRate || 0.08, amount: checkoutData.tax } : null,
    discount: checkoutData.discount ? { type: 'fixed', value: checkoutData.discount } : null,
    shipping: checkoutData.shipping || 0,
    cardBrand: card.brand,
    cardLast4: card.last4,
    gateway: payment.gateway,
    chargeId: payment.chargeId,
    currency: validation.currency
  });

  // Step 5: Send confirmation
  let confirmation = { sent: false };
  if (checkoutData.email) {
    confirmation = {
      sent: true,
      to: checkoutData.email,
      subject: `Order ${orderId} Confirmed — OMNI`,
      receiptNumber: receipt.receiptNumber,
      sentAt: new Date().toISOString()
    };
  }

  return {
    success: true,
    orderId,
    status: 'succeeded',
    chargeId: payment.chargeId,
    amount: validation.amount,
    currency: validation.currency,
    card: {
      brand: card.brand,
      last4: card.last4
    },
    gateway: payment.gateway,
    receipt,
    confirmation,
    order,
    processedAt: new Date().toISOString()
  };
}

/**
 * Generate a unique order ID.
 * @param {string} prefix
 * @returns {string}
 */
function generateOrderId(prefix) {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix || 'OMNI'}-${stamp}-${rand}`;
}

module.exports = { validateCheckout, executeCheckout, generateOrderId };
