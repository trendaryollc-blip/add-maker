/* ============================================================
   OMNI backend — src/models/Order.js
   Checkout orders data access layer.
   ============================================================ */
'use strict';

const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');

const memoryStore = new Map();

function rowToOrder(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    stripeChargeId: row.stripe_charge_id,
    amount: Number(row.amount),
    currency: row.currency,
    status: row.status,
    productName: row.product_name,
    email: row.email,
    receiptUrl: row.receipt_url,
    metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata,
    createdAt: row.created_at
  };
}

const Order = {
  async create(userId, data) {
    if (db.isConfigured()) {
      const { rows } = await db.query(
        `INSERT INTO orders (user_id, stripe_charge_id, amount, currency, status, product_name, email, receipt_url, metadata)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
        [userId, data.stripeChargeId || '', data.amount, data.currency || 'USD',
         data.status || 'pending', data.productName || '', data.email || '',
         data.receiptUrl || '', JSON.stringify(data.metadata || {})]
      );
      return rowToOrder(rows[0]);
    }

    const id = uuidv4();
    const order = {
      id, user_id: userId, stripe_charge_id: data.stripeChargeId || '',
      amount: data.amount, currency: data.currency || 'USD',
      status: data.status || 'pending', product_name: data.productName || '',
      email: data.email || '', receipt_url: data.receiptUrl || '',
      metadata: data.metadata || {},
      created_at: new Date().toISOString()
    };
    memoryStore.set(id, order);
    return rowToOrder(order);
  },

  async findById(id) {
    if (db.isConfigured()) {
      const { rows } = await db.query('SELECT * FROM orders WHERE id = $1', [id]);
      return rowToOrder(rows[0]);
    }
    const o = memoryStore.get(id);
    return o ? rowToOrder(o) : null;
  },

  async findByOrderId(orderId) {
    if (db.isConfigured()) {
      const { rows } = await db.query(
        "SELECT * FROM orders WHERE metadata->>'orderId' = $1", [orderId]
      );
      return rows.length > 0 ? rowToOrder(rows[0]) : null;
    }
    for (const o of memoryStore.values()) {
      const meta = typeof o.metadata === 'string' ? JSON.parse(o.metadata) : o.metadata;
      if (meta && meta.orderId === orderId) return rowToOrder(o);
    }
    return null;
  },

  async findByUserId(userId, limit = 50, offset = 0) {
    if (db.isConfigured()) {
      const { rows } = await db.query(
        'SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
        [userId, limit, offset]
      );
      return rows.map(rowToOrder);
    }
    return [...memoryStore.values()]
      .filter(o => o.user_id === userId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(offset, offset + limit)
      .map(rowToOrder);
  },

  async update(id, fields) {
    const allowed = ['stripe_charge_id', 'amount', 'currency', 'status', 'product_name', 'email', 'receipt_url', 'metadata'];
    const sets = [];
    const values = [];
    let idx = 1;

    for (const key of allowed) {
      if (fields[key] !== undefined) {
        sets.push(`${key} = $${idx}`);
        values.push(key === 'metadata' ? JSON.stringify(fields[key]) : fields[key]);
        idx++;
      }
    }
    if (sets.length === 0) return Order.findById(id);
    values.push(id);

    if (db.isConfigured()) {
      const { rows } = await db.query(
        `UPDATE orders SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
        values
      );
      return rowToOrder(rows[0]);
    }

    const o = memoryStore.get(id);
    if (o) {
      const keyMap = {
        stripeChargeId: 'stripe_charge_id', amount: 'amount', currency: 'currency',
        status: 'status', productName: 'product_name', email: 'email',
        receiptUrl: 'receipt_url', metadata: 'metadata'
      };
      for (const [camel, snake] of Object.entries(keyMap)) {
        if (fields[camel] !== undefined) o[snake] = fields[camel];
      }
    }
    return o ? rowToOrder(o) : null;
  }
};

module.exports = Order;
