const pool = require('../config/db');

class Comment {
  static async create({ teachingId, userId, content, parentId = null }) {
    const query = `
      INSERT INTO comments (teaching_id, user_id, content, parent_id)
      VALUES ($1, $2, $3, $4)
      RETURNING id, teaching_id, user_id, content, parent_id, likes_count, is_pinned, created_at, updated_at
    `;
    const values = [teachingId, userId, content, parentId];
    const { rows } = await pool.query(query, values);
    return rows[0];
  }

  static async findById(id) {
    const query = `
      SELECT c.*, c.likes_count AS likes, FALSE AS is_liked,
             u.full_name AS user_name, u.role AS user_role
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.id = $1
    `;
    const { rows } = await pool.query(query, [id]);
    return rows[0];
  }

  static async findByTeachingId(teachingId, page = 1, limit = 20, sort = 'newest') {
    const offset = (page - 1) * limit;
    const orderBy = sort === 'oldest'
      ? 'c.created_at ASC'
      : sort === 'liked'
        ? 'c.likes_count DESC, c.created_at DESC'
        : 'c.is_pinned DESC, c.created_at DESC';

    const { rows } = await pool.query(
      `SELECT c.*, c.likes_count AS likes, FALSE AS is_liked,
              u.full_name AS user_name, u.role AS user_role
       FROM comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.teaching_id = $1 AND c.parent_id IS NULL
       ORDER BY ${orderBy}
       LIMIT $2 OFFSET $3`,
      [teachingId, limit, offset],
    );

    if (rows.length === 0) return rows;

    const ids = rows.map((row) => row.id);
    const { rows: replies } = await pool.query(
      `SELECT c.*, c.likes_count AS likes, FALSE AS is_liked,
              u.full_name AS user_name, u.role AS user_role
       FROM comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.parent_id = ANY($1::uuid[])
       ORDER BY c.created_at ASC`,
      [ids],
    );

    const repliesByParent = replies.reduce((acc, reply) => {
      const key = reply.parent_id;
      acc[key] = acc[key] || [];
      acc[key].push(reply);
      return acc;
    }, {});

    return rows.map((row) => ({
      ...row,
      replies: repliesByParent[row.id] || [],
    }));
  }

  static async deleteById(id, userId, isAdmin = false) {
    const query = isAdmin
      ? 'DELETE FROM comments WHERE id = $1 RETURNING id'
      : 'DELETE FROM comments WHERE id = $1 AND user_id = $2 RETURNING id';
    const params = isAdmin ? [id] : [id, userId];
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

  static async toggleLike(commentId, userId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const exists = await client.query(
        'SELECT 1 FROM comment_likes WHERE comment_id = $1 AND user_id = $2',
        [commentId, userId],
      );

      if (exists.rowCount > 0) {
        await client.query(
          'DELETE FROM comment_likes WHERE comment_id = $1 AND user_id = $2',
          [commentId, userId],
        );
        await client.query(
          'UPDATE comments SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = $1',
          [commentId],
        );
        await client.query('COMMIT');
        return false;
      }

      await client.query(
        'INSERT INTO comment_likes (comment_id, user_id) VALUES ($1, $2)',
        [commentId, userId],
      );
      await client.query(
        'UPDATE comments SET likes_count = likes_count + 1 WHERE id = $1',
        [commentId],
      );
      await client.query('COMMIT');
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async setPinned(id, isPinned) {
    const { rows } = await pool.query(
      'UPDATE comments SET is_pinned = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [isPinned, id],
    );
    return rows[0];
  }
}

module.exports = Comment;
