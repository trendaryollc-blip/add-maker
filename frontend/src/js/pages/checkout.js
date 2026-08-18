/* ============================================================
   OMNI — pages/checkout.js
   Phantom Checkout controller: live card validation (Luhn),
   card-preview rendering, payment handling and receipt emailing.
   ============================================================= */
(function (global) {
  'use strict';

  function init() {
    const PC = global.PhantomCheckout;
    if (!PC) return;

    bindCardNumber(PC);
    bindCardholderName();
    bindPayButton(PC);
  }

  function bindCardNumber(PC) {
    const input = document.getElementById('pay-card');
    if (!input) return;

    input.addEventListener('input', (e) => {
      e.target.value = e.target.value.replace(/[^\d ]/g, '').trim().slice(0, 19);
      const res = PC.validateCard(e.target.value);
      const hint = document.getElementById('card-valid');

      if (!e.target.value) {
        hint.textContent = '';
        hint.className = 'form-hint';
      } else if (res.valid) {
        hint.textContent = `✓ Valid ${res.brand} ending in ${res.last4}`;
        hint.className = 'form-hint text-success';
      } else {
        hint.textContent = '✗ Invalid card';
        hint.className = 'form-hint text-danger';
      }

      const digits = e.target.value.replace(/[^\d]/g, '');
      setText('card-preview-num', digits
        ? digits.replace(/(.{4})/g, '$1 ').trim()
        : '•••• •••• •••• ••••');
    });
  }

  function bindCardHolderName() {
    const name = document.getElementById('pay-name');
    if (!name) return;
    name.addEventListener('input', (e) => {
      setText('card-preview-name', e.target.value.toUpperCase() || 'CARD HOLDER');
    });
  }

  function bindPayButton(PC) {
    const btn = document.getElementById('pay-btn');
    if (!btn) return;

    btn.addEventListener('click', () => {
      const exp = document.getElementById('pay-exp').value.split('/');
      const email = document.getElementById('pay-email').value;
      const details = {
        cardNumber: document.getElementById('pay-card').value,
        expMonth: exp[0],
        expYear: exp[1],
        cvc: document.getElementById('pay-cvc').value,
        email,
        amount: 149.0,
        currency: 'USD',
        productName: 'OMNI Pro'
      };

      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span> Processing…';

      PC.processPayment(details)
        .then((order) => {
          renderReceipt(order);
          if (email) {
            PC.sendConfirmation(email, order).then((res) => {
              if (window.App && window.App.toast) window.App.toast(`Receipt sent to ${email}`, 'success');
            });
          }
          openModal('success-modal');
          resetButton(btn);
        })
        .catch((err) => {
          resetButton(btn);
          const message = (err && err.message) || 'Payment failed';
          if (window.App && window.App.toast) window.App.toast(message, 'error');
          else alert(message);
        });
    });
  }

  function renderReceipt(order) {
    setText('order-id', 'Order ' + order.orderId);
    setText('receipt-body',
      `ORDER: ${order.orderId}\n` +
      `STATUS: ${order.status.toUpperCase()}\n` +
      `PRODUCT: ${order.product}\n` +
      `AMOUNT: $${order.amount.toFixed(2)}\n` +
      `CHARGE: ${order.chargeId}`);
  }

  function openModal(id) {
    const m = document.getElementById(id);
    if (m) m.classList.add('open');
  }
  function resetButton(btn) {
    btn.disabled = false;
    btn.innerHTML = '🔒 Pay $149.00';
  }
  function setText(id, txt) {
    const el = document.getElementById(id);
    if (el) el.textContent = txt;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window);