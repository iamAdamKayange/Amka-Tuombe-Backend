const pool = require('../config/db');

class PushDeviceToken {
  static async upsert({ token, platform = null, userId = null }) {
    const { rows } = await pool.query(
      `INSERT INTO push_device_tokens (token, platform, user_id, is_active, last_seen_at)
       VALUES ($1, $2, $3, true, NOW())
       ON CONFLICT (token)
       DO UPDATE SET
         platform = COALESCE(EXCLUDED.platform, push_device_tokens.platform),
         user_id = EXCLUDED.user_id,
         is_active = true,
         last_seen_at = NOW()
       RETURNING *`,
      [token, platform, userId],
    );
    return rows[0];
  }

  static async findActiveTokens({ limit = 500 } = {}) {
    const safeLimit = Math.min(Math.max(Number(limit) || 500, 1), 1000);
    const { rows } = await pool.query(
      `SELECT token
       FROM push_device_tokens
       WHERE is_active = true
       ORDER BY last_seen_at DESC
       LIMIT $1`,
      [safeLimit],
    );
    return rows.map((row) => row.token);
  }

  static async findActiveAdminTokens({ limit = 500 } = {}) {
    const safeLimit = Math.min(Math.max(Number(limit) || 500, 1), 1000);
    const { rows } = await pool.query(
      `SELECT p.token
       FROM push_device_tokens p
       INNER JOIN users u ON p.user_id = u.id
       WHERE p.is_active = true
         AND u.role = 'admin'
       ORDER BY p.last_seen_at DESC
       LIMIT $1`,
      [safeLimit],
    );
    return rows.map((row) => row.token);
  }

  static async deactivate(tokens) {
    if (!Array.isArray(tokens) || tokens.length === 0) return;
    await pool.query(
      `UPDATE push_device_tokens
       SET is_active = false
       WHERE token = ANY($1::text[])`,
      [tokens],
    );
  }
}

module.exports = PushDeviceToken;
