const pool = require('../config/db');

class Teaching {
  static async create({ title, description, url, thumbnail, duration, createdBy }) {
    const query = `
      INSERT INTO teachings (title, description, url, thumbnail, duration, created_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const values = [title, description, url, thumbnail, duration, createdBy];
    const { rows } = await pool.query(query, values);
    return rows[0];
  }

  static async findAll(limit = 20, offset = 0) {
    const { rows } = await pool.query(
      `SELECT t.*, u.full_name as author_name
       FROM teachings t
       LEFT JOIN users u ON t.created_by = u.id
       ORDER BY t.date DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return rows;
  }

  static async findById(id) {
    const { rows } = await pool.query(
      `SELECT t.*, u.full_name as author_name
       FROM teachings t
       LEFT JOIN users u ON t.created_by = u.id
       WHERE t.id = $1`,
      [id]
    );
    return rows[0];
  }

  // ✅ Method mpya: Tafuta fundisho kwa URL (YouTube link)
  static async findByUrl(url) {
    const { rows } = await pool.query(
      'SELECT * FROM teachings WHERE url = $1',
      [url]
    );
    return rows[0];
  }

  static async incrementLikes(id) {
    await pool.query('UPDATE teachings SET likes_count = likes_count + 1 WHERE id = $1', [id]);
  }

  static async decrementLikes(id) {
    await pool.query('UPDATE teachings SET likes_count = likes_count - 1 WHERE id = $1', [id]);
  }
}

module.exports = Teaching;