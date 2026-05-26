const pool = require('../config/db');

class Like {
  static async create(teachingId, userId) {
    const query = 'INSERT INTO likes (teaching_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING *';
    const values = [teachingId, userId];
    const { rows } = await pool.query(query, values);
    return rows[0];
  }

  static async delete(teachingId, userId) {
    const { rowCount } = await pool.query(
      'DELETE FROM likes WHERE teaching_id = $1 AND user_id = $2',
      [teachingId, userId]
    );
    return rowCount > 0;
  }

  static async exists(teachingId, userId) {
    const { rows } = await pool.query(
      'SELECT 1 FROM likes WHERE teaching_id = $1 AND user_id = $2',
      [teachingId, userId]
    );
    return rows.length > 0;
  }
}

module.exports = Like;