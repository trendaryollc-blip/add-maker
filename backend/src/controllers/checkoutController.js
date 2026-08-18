/* ============================================================
   OMNI backend — src/controllers/checkoutController.js
   Phantom Checkout endpoints (auth required).
   ============================================================ */
'use strict';

const { sendJSON, sendError, readBody } = require('../utils/http');
const checkoutService = require('../services/checkout');
const Order = require('../models/Order');

/** POST /api/checkout — process a payment */
async function process(req, res) {
  if (!req.user) return sendError(res, 401, 'Authentication required');

  let body;
  try { body = await readBody(req); } catch (e) { return sendError(res, e.status || 400, e.message); }

  const { cardNumber, expMonth, expYear, cvv, amount, currency, email, productName, gateway, items } = body;

  if (!cardNumber) return sendError(res, 400, 'Card number is required');
  if (!amount || parseFloat(amount) <= 0) return sendError(res, 400, 'A valid amount is required');

  try {
    const result = await checkoutService.processPayment({
      cardNumber, expMonth, expYear, cvv,
      amount: parseFloat(amount),
      currency: currency || 'USD',
      email: email || req.user.email,
      productName,
      gateway: gateway || 'stripe',
      userId: req.user.sub,
      orderId: body.orderId,
      items
    });

    if (!result.success) {
      return sendError(res, result.status || 400, result.error);
    }

    return sendJSON(res, 200, {
      orderId: result.orderId,
      status: result.status,
      chargeId: result.chargeId,
      amount: result.amount,
      currency: result.currency,
      card: result.card,
      gateway: result.gateway,
      receipt: result.receipt,
      confirmation: result.confirmation
    });
  } catch (err) {
    return sendError(res, err.status || 400, err.message || 'Payment failed');
  }
}

/** GET /api/checkout/orders — list orders for the user */
async function orders(req, res) {
  if (!req.user) return sendError(res, 401, 'Authentication required');

  try {
    const result = await checkoutService.getOrders(req.user.sub);
    return sendJSON(res, 200, result);
  } catch (err) {
    return sendError(res, 500, err.message || 'Failed to fetch orders');
  }
}

/** GET /api/checkout/orders/:id — get order details */
async function orderDetail(req, res) {
  if (!req.user) return sendError(res, 401, 'Authentication required');

  const orderId = req.path.split('/').pop();
  try {
    const order = await checkoutService.getOrder(orderId);
    if (!order) return sendError(res, 404, 'Order not found');
    return sendJSON(res, 200, { order });
  } catch (err) {
    return sendError(res, 500, err.message || 'Failed to fetch order');
  }
}

/** POST /api/checkout/refund — process a refund */
async function refund(req, res) {
  if (!req.user) return sendError(res, 401, 'Authentication required');

  let body;
  try { body = await readBody(req); } catch (e) { return sendError(res, e.status || 400, e.message); }

  if (!body.orderId) return sendError(res, 400, 'orderId is required');

  try {
    const result = await checkoutService.processRefund({
      orderId: body.orderId,
      amount: body.amount,
      reason: body.reason
    });
    return sendJSON(res, 200, result);
  } catch (err) {
    return sendError(res, 400, err.message || 'Refund failed');
  }
}

/** POST /api/checkout/dispute — simulate a dispute */
async function dispute(req, res) {
  if (!req.user) return sendError(res, 401, 'Authentication required');

  let body;
  try { body = await readBody(req); } catch (e) { return sendError(res, e.status || 400, e.message); }

  if (!body.orderId) return sendError(res, 400, 'orderId is required');

  try {
    const result = await checkoutService.simulateDispute({
      orderId: body.orderId,
      reason: body.reason,
      evidence: body.evidence
    });
    return sendJSON(res, 200, result);
  } catch (err) {
    return sendError(res, 400, err.message || 'Dispute failed');
  }
}

/** GET /api/checkout/gateways — list supported gateways */
function gateways(_req, res) {
  return sendJSON(res, 200, { gateways: checkoutService.getGateways() });
}

/** GET /api/checkout/currencies — list supported currencies */
function currencies(_req, res) {
  return sendJSON(res, 200, { currencies: checkoutService.getCurrencies() });
}

/** POST /api/checkout/validate — validate card without charging */
async function validate(req, res) {
  let body;
  try { body = await readBody(req); } catch (e) { return sendError(res, e.status || 400, e.message); }

  if (!body.cardNumber) return sendError(res, 400, 'Card number is required');

  const card = checkoutService.validateCard(body.cardNumber);
  const expiry = body.expMonth && body.expYear
    ? checkoutService.validateExpiry(body.expMonth, body.expYear)
    : null;
  const cvv = body.cvv && card.brand
    ? checkoutService.validateCVV(body.cvv, card.brand)
    : null;

  return sendJSON(res, 200, { card, expiry, cvv });
}

module.exports = { process, orders, orderDetail, refund, dispute, gateways, currencies, validate };
