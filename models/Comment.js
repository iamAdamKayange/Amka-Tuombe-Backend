const pool = require('../config/db');

class Comment {
  static async create({ teachingId, userId, content }) {
    const query = `
      INSERT INTO comments (teaching_id, user_id, content)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    const values = [teachingId, userId, content];
    const { rows } = await pool.query(query, values);
    return rows[0];
  }

  static async findByTeachingId(teachingId) {
    const { rows } = await pool.query(
      `SELECT c.*, u.full_name as user_name
       FROM comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.teaching_id = $1
       ORDER BY c.created_at DESC`,
      [teachingId]
    );
    return rows;
  }

  static async deleteById(id, userId) {
    const { rowCount } = await pool.query(
      'DELETE FROM comments WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId]
    );
    return rowCount > 0;
  }
}

module.exports = Comment;