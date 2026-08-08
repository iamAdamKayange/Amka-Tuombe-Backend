const pool = require('../config/db');

class Teaching {
  // Create from YouTube URL
  static async create({ title, description, url, thumbnail, duration, createdBy, cloudinaryPublicId }) {
    const query = `
      INSERT INTO teachings (title, description, url, thumbnail, duration, created_by, cloudinary_public_id, status, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'completed', NOW())
      RETURNING *
    `;
    const values = [title, description, url, thumbnail, duration, createdBy, cloudinaryPublicId || null];
    const { rows } = await pool.query(query, values);
    return rows[0];
  }

  // Create pending (for file upload)
  static async createPending({ title, description, createdBy }) {
    const query = `
      INSERT INTO teachings (title, description, status, created_by, created_at)
      VALUES ($1, $2, 'processing', $3, NOW())
      RETURNING id, title, description, status
    `;
    const { rows } = await pool.query(query, [title, description, createdBy]);
    return rows[0];
  }

  // Update after Cloudinary upload
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
    await pool.query('UPDATE teachings SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = $1', [id]);
  }

  static async incrementDownloads(id) {
    await pool.query('UPDATE teachings SET downloads_count = COALESCE(downloads_count, 0) + 1 WHERE id = $1', [id]);
  }
  static async update(id, { title, description, thumbnail, duration }) {
    const { rows } = await pool.query(
      `UPDATE teachings
       SET title = $1, description = $2, thumbnail = $3, duration = $4
       WHERE id = $5
       RETURNING *`,
      [title, description, thumbnail || null, duration || null, id],
    );
    return rows[0];
  }

  static async deleteById(id) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM likes WHERE teaching_id = $1', [id]);
      await client.query('DELETE FROM comments WHERE teaching_id = $1', [id]);
      const { rows } = await client.query(
        'DELETE FROM teachings WHERE id = $1 RETURNING *',
        [id],
      );
      await client.query('COMMIT');
      return rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = Teaching;

