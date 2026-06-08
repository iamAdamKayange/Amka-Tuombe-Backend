const pool = require('../config/db');

class Comment {
  static async create({ teachingId, userId, content }) {
    const query = `
      INSERT INTO comments (teaching_id, user_id, content)
      VALUES ($1, $2, $3)
      RETURNING id, teaching_id, user_id, content, created_at
    `;
    const values = [teachingId, userId, content];
    const { rows } = await pool.query(query, values);
    return rows[0];
  }

  static async findById(id) {
    const query = `
      SELECT c.*, u.full_name as user_name
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.id = $1
    `;
    const { rows } = await pool.query(query, [id]);
    return rows[0];
  }

  static async findByTeachingId(teachingId, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const query = `
      SELECT c.*, u.full_name as user_name
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.teaching_id = $1
      ORDER BY c.created_at DESC
      LIMIT $2 OFFSET $3
    `;
    const { rows } = await pool.query(query, [teachingId, limit, offset]);
    return rows;
  }

  static async deleteById(id, userId, isAdmin = false) {
    let query, params;
    if (isAdmin) {
      query = 'DELETE FROM comments WHERE id = $1 RETURNING id';
      params = [id];
    } else {
      query = 'DELETE FROM comments WHERE id = $1 AND user_id = $2 RETURNING id';
      params = [id, userId];
    }
    const { rowCount } = await pool.query(query, params);
    return rowCount > 0;
  }

  static async updateById(id, content) {
    const query = `
      UPDATE comments 
      SET content = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `;
    const { rows } = await pool.query(query, [content, id]);
    return rows[0];
  }
}

module.exports = Comment;