const pool = require('../config/db');

class Notification {
  static async create({ type, title, body = '', url = null, mediaId = null, dedupeKey }) {
    const key = dedupeKey || `${type}:${mediaId || title}`;
    const { rows } = await pool.query(
      `INSERT INTO notifications (type, title, body, url, media_id, dedupe_key)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (dedupe_key) DO NOTHING
       RETURNING *`,
      [type, title, body, url, mediaId, key],
    );
    return rows[0] || null;
  }

  static async findRecent({ since = null, limit = 50 }) {
    const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);

    if (since) {
      const { rows } = await pool.query(
        `SELECT *
         FROM notifications
         WHERE created_at > $1
         ORDER BY created_at DESC
         LIMIT $2`,
        [since, safeLimit],
      );
      return rows;
    }

    const { rows } = await pool.query(
      `SELECT *
       FROM notifications
       ORDER BY created_at DESC
       LIMIT $1`,
      [safeLimit],
    );
    return rows;
  }
}

module.exports = Notification;
