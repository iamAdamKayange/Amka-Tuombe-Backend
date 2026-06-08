const pool = require('../config/db');

class LiveSession {
  static async create({ title, streamUrl }) {
    const query = `
      INSERT INTO live_sessions (title, stream_url, is_active, started_at)
      VALUES ($1, $2, true, NOW())
      RETURNING *
    `;
    const { rows } = await pool.query(query, [title, streamUrl]);
    return rows[0];
  }

  static async getActive() {
    const { rows } = await pool.query(
      'SELECT * FROM live_sessions WHERE is_active = true ORDER BY started_at DESC LIMIT 1'
    );
    return rows[0];
  }

  static async endSession(id) {
    const { rows } = await pool.query(
      'UPDATE live_sessions SET is_active = false, ended_at = NOW() WHERE id = $1 RETURNING *',
      [id]
    );
    return rows[0];
  }
}

module.exports = LiveSession;