/* ============================================================
   OMNI backend — src/services/order-manager.js
   Order lifecycle manager — tracks orders through states,
   manages refunds/disputes, and provides order analytics.
   ============================================================ */
'use strict';

const Order = require('../models/Order');

const ORDER_STATUSES = [
  'pending', 'processing', 'succeeded', 'failed',
  'refunded', 'partially_refunded', 'disputed', 'resolved'
];

const STATUS_TRANSITIONS = {
  pending: ['processing', 'failed'],
  processing: ['succeeded', 'failed'],
  succeeded: ['refunded', 'partially_refunded', 'disputed'],
  failed: ['pending'],
  refunded: [],
  partially_refunded: ['refunded', 'disputed'],
  disputed: ['resolved', 'refunded'],
  resolved: []
};

function round(v, d) { const p = Math.pow(10, d || 0); return Math.round(v * p) / p; }

/**
 * Create a new order.
 * @param {string} userId
 * @param {object} data
 * @returns {Promise<object>}
 */
async function createOrder(userId, data) {
  const order = await Order.create(userId, {
    stripeChargeId: data.chargeId || '',
    amount: data.amount,
    currency: data.currency || 'USD',
    status: 'succeeded',
    productName: data.productName || '',
    email: data.email || '',
    metadata: {
      orderId: data.orderId,
      cardBrand: data.cardBrand,
      cardLast4: data.cardLast4,
      gateway: data.gateway,
      receiptNumber: data.receiptNumber,
      items: data.items || [],
      tax: data.tax || 0,
      shipping: data.shipping || 0,
      discount: data.discount || 0
    }
  });

  return order;
}

/**
 * Get order by ID.
 * @param {string} orderId
 * @returns {Promise<object>}
 */
async function getOrder(orderId) {
  return Order.findById(orderId);
}

/**
 * Get all orders for a user with stats.
 * @param {string} userId
 * @returns {Promise<object>}
 */
async function getUserOrders(userId) {
  const orders = await Order.findByUserId(userId);
  const stats = calculateOrderStats(orders);
  return { orders, stats };
}

/**
 * Process a refund for an order.
 * @param {string} orderId
 * @param {object} opts - { amount, reason }
 * @returns {Promise<object>}
 */
async function processRefund(orderId, opts = {}) {
  // Try by UUID first, then by orderId in metadata
  let order = await Order.findById(orderId);
  if (!order) order = await Order.findByOrderId(orderId);
  if (!order) throw new Error('Order not found');

  if (!STATUS_TRANSITIONS[order.status]?.includes('refunded') &&
      !STATUS_TRANSITIONS[order.status]?.includes('partially_refunded')) {
    throw new Error(`Cannot refund order in ${order.status} status`);
  }

  const refundAmount = opts.amount || order.amount;
  const isPartial = refundAmount < order.amount;

  await Order.update(order.id, {
    status: isPartial ? 'partially_refunded' : 'refunded',
    metadata: {
      ...order.metadata,
      refund: {
        amount: refundAmount,
        reason: opts.reason || 'requested_by_customer',
        processedAt: new Date().toISOString()
      }
    }
  });

  return {
    orderId: order.metadata?.orderId || orderId,
    refundAmount: round(refundAmount, 2),
    originalAmount: order.amount,
    isPartial,
    status: isPartial ? 'partially_refunded' : 'refunded',
    reason: opts.reason || 'requested_by_customer'
  };
}

/**
 * Simulate a dispute.
 * @param {string} orderId
 * @param {object} opts - { reason, evidence }
 * @returns {Promise<object>}
 */
async function simulateDispute(orderId, opts = {}) {
  // Try by UUID first, then by orderId in metadata
  let order = await Order.findById(orderId);
  if (!order) order = await Order.findByOrderId(orderId);
  if (!order) throw new Error('Order not found');

  if (!STATUS_TRANSITIONS[order.status]?.includes('disputed')) {
    throw new Error(`Cannot dispute order in ${order.status} status`);
  }

  await Order.update(order.id, {
    status: 'disputed',
    metadata: {
      ...order.metadata,
      dispute: {
        reason: opts.reason || 'fraudulent',
        evidence: opts.evidence || {},
        status: 'needs_response',
        simulatedAt: new Date().toISOString()
      }
    }
  });

  return {
    orderId: order.metadata?.orderId || orderId,
    status: 'disputed',
    reason: opts.reason || 'fraudulent',
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    message: 'You have 7 days to respond to this dispute.'
  };
}

/**
 * Calculate order statistics.
 * @param {object[]} orders
 * @returns {object}
 */
function calculateOrderStats(orders) {
  const total = orders.length;
  const succeeded = orders.filter(o => o.status === 'succeeded').length;
  const refunded = orders.filter(o => o.status === 'refunded' || o.status === 'partially_refunded').length;
  const disputed = orders.filter(o => o.status === 'disputed').length;
  const totalRevenue = orders
    .filter(o => o.status === 'succeeded')
    .reduce((s, o) => s + (o.amount || 0), 0);
  const totalRefunded = orders
    .filter(o => o.status === 'refunded' || o.status === 'partially_refunded')
    .reduce((s, o) => s + (o.metadata?.refund?.amount || o.amount || 0), 0);

  return {
    total,
    succeeded,
    failed: orders.filter(o => o.status === 'failed').length,
    refunded,
    disputed,
    successRate: total > 0 ? round((succeeded / total) * 100, 1) : 0,
    refundRate: succeeded > 0 ? round((refunded / succeeded) * 100, 1) : 0,
    totalRevenue: round(totalRevenue, 2),
    totalRefunded: round(totalRefunded, 2),
    netRevenue: round(totalRevenue - totalRefunded, 2),
    avgOrderValue: succeeded > 0 ? round(totalRevenue / succeeded, 2) : 0
  };
}

module.exports = {
  createOrder, getOrder, getUserOrders,
  processRefund, simulateDispute,
  calculateOrderStats, ORDER_STATUSES, STATUS_TRANSITIONS
};
