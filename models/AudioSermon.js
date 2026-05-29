const pool = require('../config/db');

class AudioSermon {
  static async create({ title, description, audioUrl, duration, thumbnail, createdBy }) {
    const query = `
      INSERT INTO audio_sermons (title, description, audio_url, duration, thumbnail, created_by, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      RETURNING *
    `;
    const values = [title, description, audioUrl, duration, thumbnail, createdBy];
    const { rows } = await pool.query(query, values);
    return rows[0];
  }

  static async findAll(limit = 20, offset = 0) {
    const { rows } = await pool.query(
      `SELECT a.*, u.full_name as author_name
       FROM audio_sermons a
       LEFT JOIN users u ON a.created_by = u.id
       ORDER BY a.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return rows;
  }

  static async findById(id) {
    const { rows } = await pool.query(
      `SELECT a.*, u.full_name as author_name
       FROM audio_sermons a
       LEFT JOIN users u ON a.created_by = u.id
       WHERE a.id = $1`,
      [id]
    );
    return rows[0];
  }

  static async incrementPlays(id) {
    await pool.query('UPDATE audio_sermons SET plays_count = plays_count + 1 WHERE id = $1', [id]);
  }
}

module.exports = AudioSermon;