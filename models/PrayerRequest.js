const pool = require('../config/db');

class PrayerRequest {
  static async create({ fullName, phone, email, message, userId = null }) {
    const { rows } = await pool.query(
      `INSERT INTO prayer_requests (full_name, phone, email, message, user_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [fullName || 'Mgeni', phone || null, email || null, message, userId],
    );
    return rows[0];
  }

  static async findAll({ status = null, limit = 50, offset = 0 }) {
    const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);
    const safeOffset = Math.max(Number(offset) || 0, 0);

    if (status) {
      const { rows } = await pool.query(
        `SELECT p.*, u.email AS user_email, u.full_name AS user_full_name
         FROM prayer_requests p
         LEFT JOIN users u ON p.user_id = u.id
         WHERE p.status = $1
         ORDER BY p.created_at DESC
         LIMIT $2 OFFSET $3`,
        [status, safeLimit, safeOffset],
      );
      return rows;
    }

    const { rows } = await pool.query(
      `SELECT p.*, u.email AS user_email, u.full_name AS user_full_name
       FROM prayer_requests p
       LEFT JOIN users u ON p.user_id = u.id
       ORDER BY p.created_at DESC
       LIMIT $1 OFFSET $2`,
      [safeLimit, safeOffset],
    );
    return rows;
  }

  static async updateStatus(id, status) {
    const { rows } = await pool.query(
      `UPDATE prayer_requests
       SET status = $1
       WHERE id = $2
       RETURNING *`,
      [status, id],
    );
    return rows[0];
  }

  static async deleteById(id) {
    const { rows } = await pool.query(
      'DELETE FROM prayer_requests WHERE id = $1 RETURNING *',
      [id],
    );
    return rows[0];
  }
}

module.exports = PrayerRequest;
