/* ============================================================
   OMNI backend — src/models/User.js
   User data access layer. Works with PostgreSQL when configured,
   falls back to in-memory store for mock/development mode.
   ============================================================ */
'use strict';

const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');

const BCRYPT_ROUNDS = 10;

// In-memory fallback for mock mode
const memoryStore = new Map();

function rowToUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    name: row.name || '',
    tier: row.tier || 'starter',
    createdAt: row.created_at || row.createdAt,
    updatedAt: row.updated_at || row.updatedAt
  };
}

const User = {
  /** Create a new user. Hashes the password. */
  async create(email, password, name) {
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    if (db.isConfigured()) {
      const { rows } = await db.query(
        `INSERT INTO users (email, password_hash, name)
         VALUES ($1, $2, $3)
         RETURNING id, email, name, tier, created_at, updated_at`,
        [email.toLowerCase().trim(), passwordHash, name || '']
      );
      return rowToUser(rows[0]);
    }

    // Mock mode: in-memory store
    for (const u of memoryStore.values()) {
      if (u.email === email.toLowerCase().trim()) {
        throw new Error('Email already registered');
      }
    }
    const id = uuidv4();
    const user = {
      id,
      email: email.toLowerCase().trim(),
      password_hash: passwordHash,
      name: name || '',
      tier: 'starter',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    memoryStore.set(id, user);
    return rowToUser(user);
  },

  /** Find user by email. */
  async findByEmail(email) {
    if (db.isConfigured()) {
      const { rows } = await db.query(
        'SELECT * FROM users WHERE email = $1',
        [email.toLowerCase().trim()]
      );
      return rows[0] || null;
    }
    for (const u of memoryStore.values()) {
      if (u.email === email.toLowerCase().trim()) return u;
    }
    return null;
  },

  /** Find user by ID. */
  async findById(id) {
    if (db.isConfigured()) {
      const { rows } = await db.query(
        'SELECT * FROM users WHERE id = $1',
        [id]
      );
      return rowToUser(rows[0]);
    }
    const user = memoryStore.get(id);
    return user ? rowToUser(user) : null;
  },

  /** Verify a password against a user record. */
  async verifyPassword(user, password) {
    if (!user || !user.password_hash) return false;
    return bcrypt.compare(password, user.password_hash);
  },

  /** Update user fields. */
  async update(id, fields) {
    const allowed = ['name', 'tier'];
    const sets = [];
    const values = [];
    let idx = 1;

    for (const key of allowed) {
      if (fields[key] !== undefined) {
        sets.push(`${key} = $${idx}`);
        values.push(fields[key]);
        idx++;
      }
    }
    if (sets.length === 0) return User.findById(id);

    sets.push(`updated_at = NOW()`);
    values.push(id);

    if (db.isConfigured()) {
      const { rows } = await db.query(
        `UPDATE users SET ${sets.join(', ')} WHERE id = $${idx} RETURNING id, email, name, tier, created_at, updated_at`,
        values
      );
      return rowToUser(rows[0]);
    }

    const user = memoryStore.get(id);
    if (user) {
      for (const key of allowed) {
        if (fields[key] !== undefined) user[key] = fields[key];
      }
      user.updated_at = new Date().toISOString();
    }
    return user ? rowToUser(user) : null;
  },

  /** Delete a user. */
  async delete(id) {
    if (db.isConfigured()) {
      await db.query('DELETE FROM users WHERE id = $1', [id]);
      return true;
    }
    memoryStore.delete(id);
    return true;
  }
};

module.exports = User;
