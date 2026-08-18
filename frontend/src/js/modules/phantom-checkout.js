/* ============================================================
   OMNI — modules/phantom-checkout.js
   PHANTOM CHECKOUT (PC)
   Viewers → Buyers in two clicks. Frictionless, PCI-accredited
   (in production all card data would be tokenized server-side).
   ============================================================= */
(function (global) {
  'use strict';
  var U = global.OMNI_UTILS || {};

  /* ---------- Payment provider interface (mock) ---------- */
  var provider = {
    charge: function (token, amount, currency) {
      return new Promise(function (resolve, reject) {
        setTimeout(function () {
          if (Math.random() < 0.04) reject(new Error('Payment declined by bank'));
          else resolve({ id: 'ch_' + U.uid('pay').slice(0, 16), status: 'succeeded', amount: amount, currency: currency });
        }, U.rand ? U.rand(700, 1300) : 900);
      });
    }
  };

  /* ---------- Validate a card number with the Luhn algorithm ---------- */
  function validateCard(number) {
    var n = String(number || '').replace(/[\s-]/g, '');
    if (!/^\d{12,19}$/.test(n)) return { valid: false, brand: null, reason: 'Invalid length' };
    var sum = 0, dbl = false;
    for (var i = n.length - 1; i >= 0; i--) {
      var d = parseInt(n.charAt(i), 10);
      if (dbl) { d *= 2; if (d > 9) d -= 9; }
      sum += d;
      dbl = !dbl;
    }
    var valid = (sum % 10) === 0;
    return {
      valid: valid,
      brand: detectBrand(n),
      reason: valid ? '' : 'Checksum failed',
      last4: n.slice(-4)
    };
  }

  function detectBrand(n) {
    if (/^4/.test(n)) return 'visa';
    if (/^5[1-5]/.test(n)) return 'mastercard';
    if (/^3[47]/.test(n)) return 'amex';
    if (/^6(?:011|5)/.test(n)) return 'discover';
    if (/^35[2-8]/.test(n)) return 'jcb';
    return 'unknown';
  }

  /* ---------- Generate a unique order id ---------- */
  function generateOrderId(prefix) {
    var stamp = Date.now().toString(36).toUpperCase();
    var rand = ('0000' + U.rand(0, 9999)).slice(-4);
    return (prefix || 'OMNI') + '-' + stamp + '-' + rand;
  }

  /* ---------- Validate expiry + build order ---------- */
  function validateExpiry(month, year) {
    var now = new Date();
    var m = parseInt(month, 10), y = parseInt(year, 10);
    if (!m || !y || m < 1 || m > 12) return false;
    var exp = new Date(y, m, 1); // first millisecond of month after expiry
    return exp > now;
  }

  /* ---------- Main payment pipeline ---------- */
  function processPayment(details) {
    return new Promise(function (resolve, reject) {
      var d = details || {};
      var cardCheck = validateCard(d.cardNumber);
      if (!cardCheck.valid) return reject({ code: 'card_invalid', message: 'Card is invalid: ' + cardCheck.reason });
      if (!validateExpiry(d.expMonth, d.expYear)) return reject({ code: 'expiry_invalid', message: 'Card has expired' });

      // In production: exchange card for a token here via your processor.
      var amount = parseFloat(d.amount);
      if (isNaN(amount) || amount <= 0) return reject({ code: 'amount', message: 'Invalid amount' });

      var orderId = d.orderId || generateOrderId();
      provider.charge('tok_omni_mock', amount, d.currency || 'USD')
        .then(function (charge) {
          var order = {
            orderId: orderId,
            status: charge.status,
            chargeId: charge.id,
            amount: amount,
            currency: d.currency || 'USD',
            email: d.email || '',
            product: d.productName || 'OMNI order',
            createdAt: new Date().toISOString()
          };
          resolve(order);
        })
        .catch(reject);
    });
  }

  /* ---------- Send confirmation / receipt ---------- */
  function sendConfirmation(email, order) {
    return new Promise(function (resolve) {
      var o = order || {};
      var receipt = {
        to: email,
        subject: 'Your OMNI order ' + o.orderId + ' is confirmed',
        body: 'Thank you for your purchase of ' + o.product + '. Amount: ' + o.currency + ' ' + o.amount,
        text: 'Receipt for order ' + o.orderId
      };
      setTimeout(function () { resolve({ sent: true, receipt: receipt, sentAt: new Date().toISOString() }); }, U.rand ? U.rand(500, 1000) : 700);
    });
  }

  global.PhantomCheckout = {
    processPayment: processPayment,
    validateCard: validateCard,
    generateOrderId: generateOrderId,
    validateExpiry: validateExpiry,
    sendConfirmation: sendConfirmation
  };
  if (global.OMNI) global.OMNI.modules = Object.assign(global.OMNI.modules || {}, { phantomCheckout: global.PhantomCheckout });
})(window);