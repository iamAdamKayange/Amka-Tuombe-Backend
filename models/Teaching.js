const pool = require('../config/db');

class Teaching {
  // Kwa YouTube URL
  static async create({ title, description, url, thumbnail, duration, createdBy }) {
    const query = `
      INSERT INTO teachings (title, description, url, thumbnail, duration, created_by, status, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, 'completed', NOW())
      RETURNING *
    `;
    const values = [title, description, url, thumbnail, duration, createdBy];
    const { rows } = await pool.query(query, values);
    return rows[0];
  }

  // Kwa file upload – ingiza kama 'processing'
  static async createPending({ title, description, createdBy }) {
    const query = `
      INSERT INTO teachings (title, description, status, created_by, created_at)
      VALUES ($1, $2, 'processing', $3, NOW())
      RETURNING id, title, description, status
    `;
    const { rows } = await pool.query(query, [title, description, createdBy]);
    return rows[0];
  }

  // Baada ya Cloudinary upload
  static async updateVideoDetails(id, videoUrl, duration, thumbnail) {
    await pool.query(
      `UPDATE teachings SET video_url = $1, duration = $2, thumbnail = $3, status = 'completed', updated_at = NOW() WHERE id = $4`,
      [videoUrl, duration, thumbnail, id]
    );
  }

  static async findAll(limit = 20, offset = 0) {
    const { rows } = await pool.query(
      `SELECT t.*, u.full_name as author_name
       FROM teachings t
       LEFT JOIN users u ON t.created_by = u.id
       WHERE t.status = 'completed'
       ORDER BY t.created_at DESC
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

  static async findByUrl(url) {
    const { rows } = await pool.query('SELECT * FROM teachings WHERE url = $1', [url]);
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