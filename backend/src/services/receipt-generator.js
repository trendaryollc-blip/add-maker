/* ============================================================
   OMNI backend — src/services/receipt-generator.js
   Receipt generator — creates detailed receipts with line items,
   tax calculation, discounts, and multiple output formats.
   ============================================================ */
'use strict';

const crypto = require('crypto');

function round(v, d) { const p = Math.pow(10, d || 0); return Math.round(v * p) / p; }

/**
 * Generate a detailed receipt for an order.
 * @param {object} opts - { order, items, tax, discount, shipping, payment }
 * @returns {object}
 */
function generateReceipt(opts) {
  const items = (opts.items || []).map((item, i) => ({
    id: item.id || `item_${i + 1}`,
    name: item.name || 'Product',
    description: item.description || '',
    quantity: item.quantity || 1,
    unitPrice: round(item.unitPrice || item.price || 0, 2),
    totalPrice: round((item.unitPrice || item.price || 0) * (item.quantity || 1), 2),
    sku: item.sku || null,
    category: item.category || null
  }));

  const subtotal = items.reduce((s, item) => s + item.totalPrice, 0);
  const discountAmount = calculateDiscount(subtotal, opts.discount);
  const taxableAmount = subtotal - discountAmount;
  const taxAmount = calculateTax(taxableAmount, opts.tax);
  const shippingAmount = round(opts.shipping || 0, 2);
  const total = round(taxableAmount + taxAmount + shippingAmount, 2);

  const receiptNumber = 'RCPT-' + crypto.randomBytes(4).toString('hex').toUpperCase();

  return {
    receiptNumber,
    orderId: opts.orderId || 'N/A',
    status: opts.status || 'completed',

    // Customer
    customer: {
      name: opts.customerName || 'Valued Customer',
      email: opts.email || '',
      phone: opts.phone || null
    },

    // Items
    items,
    itemCount: items.reduce((s, i) => s + i.quantity, 0),

    // Financials
    subtotal: round(subtotal, 2),
    discount: {
      type: opts.discount?.type || 'none',
      code: opts.discount?.code || null,
      amount: round(discountAmount, 2),
      description: opts.discount?.description || ''
    },
    tax: {
      rate: opts.tax?.rate || 0,
      name: opts.tax?.name || 'Sales Tax',
      amount: round(taxAmount, 2)
    },
    shipping: {
      method: opts.shippingMethod || 'standard',
      amount: shippingAmount,
      estimatedDelivery: opts.estimatedDelivery || null
    },
    total: round(total, 2),
    currency: opts.currency || 'USD',

    // Payment
    payment: {
      method: opts.paymentMethod || 'card',
      cardBrand: opts.cardBrand || null,
      cardLast4: opts.cardLast4 || null,
      gateway: opts.gateway || 'stripe',
      chargeId: opts.chargeId || null,
      status: opts.paymentStatus || 'succeeded'
    },

    // Merchant
    merchant: {
      name: 'OMNI Ad Engine',
      address: '123 Innovation Drive, San Francisco, CA 94105',
      website: 'https://omni.dev',
      supportEmail: 'support@omni.dev'
    },

    // Metadata
    receiptUrl: `https://receipts.omni.dev/${receiptNumber}`,
    generatedAt: new Date().toISOString(),
    note: opts.note || 'Thank you for your purchase!'
  };
}

/**
 * Calculate discount amount.
 * @param {number} subtotal
 * @param {object} discount - { type: 'percentage'|'fixed', value: number, code: string }
 * @returns {number}
 */
function calculateDiscount(subtotal, discount) {
  if (!discount || !discount.value) return 0;
  if (discount.type === 'percentage') {
    return round(subtotal * (Math.min(discount.value, 100) / 100), 2);
  }
  return round(Math.min(discount.value, subtotal), 2);
}

/**
 * Calculate tax amount.
 * @param {number} amount
 * @param {object} tax - { rate: number (0-1), name: string }
 * @returns {number}
 */
function calculateTax(amount, tax) {
  if (!tax || !tax.rate) return 0;
  return round(amount * Math.min(tax.rate, 0.3), 2); // Cap at 30%
}

/**
 * Generate a summary receipt (minimal version).
 * @param {object} order
 * @returns {object}
 */
function generateSummaryReceipt(order) {
  return {
    receiptNumber: 'RCPT-' + crypto.randomBytes(4).toString('hex').toUpperCase(),
    orderId: order.orderId || order.id,
    total: round(order.amount || 0, 2),
    currency: order.currency || 'USD',
    status: order.status || 'completed',
    email: order.email || '',
    product: order.product || order.productName || 'OMNI order',
    paymentMethod: `${order.cardBrand || 'card'} ending in ${order.cardLast4 || '****'}`,
    date: order.createdAt || new Date().toISOString()
  };
}

/**
 * Format receipt as text.
 * @param {object} receipt
 * @returns {string}
 */
function formatAsText(receipt) {
  const lines = [
    '═══════════════════════════════════════',
    '            OMNI RECEIPT               ',
    '═══════════════════════════════════════',
    '',
    `Receipt #: ${receipt.receiptNumber}`,
    `Order: ${receipt.orderId}`,
    `Date: ${receipt.generatedAt}`,
    `Status: ${receipt.status.toUpperCase()}`,
    '',
    `Customer: ${receipt.customer.name}`,
    `Email: ${receipt.customer.email}`,
    '',
    '───────────────────────────────────────',
    'ITEMS',
    '───────────────────────────────────────'
  ];

  for (const item of receipt.items) {
    lines.push(`${item.name}  x${item.quantity}`);
    lines.push(`  $${item.totalPrice.toFixed(2)}`);
  }

  lines.push('───────────────────────────────────────');
  lines.push(`Subtotal:   $${receipt.subtotal.toFixed(2)}`);

  if (receipt.discount.amount > 0) {
    lines.push(`Discount:  -$${receipt.discount.amount.toFixed(2)}`);
  }
  if (receipt.tax.amount > 0) {
    lines.push(`Tax:        $${receipt.tax.amount.toFixed(2)}`);
  }
  if (receipt.shipping.amount > 0) {
    lines.push(`Shipping:   $${receipt.shipping.amount.toFixed(2)}`);
  }

  lines.push('═══════════════════════════════════════');
  lines.push(`TOTAL:      $${receipt.total.toFixed(2)} ${receipt.currency}`);
  lines.push('═══════════════════════════════════════');
  lines.push('');
  lines.push(`Payment: ${receipt.payment.cardBrand} ****${receipt.payment.cardLast4}`);
  lines.push(`Gateway: ${receipt.payment.gateway}`);
  lines.push('');
  lines.push(receipt.note);

  return lines.join('\n');
}

module.exports = {
  generateReceipt, generateSummaryReceipt, formatAsText,
  calculateDiscount, calculateTax
};
