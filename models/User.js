const pool = require('../config/db');

class User {
  static async create({ email, passwordHash, fullName, role = 'user' }) {
    const query = `
      INSERT INTO users (email, password_hash, full_name, role)
      VALUES ($1, $2, $3, $4)
      RETURNING id, email, full_name, role, created_at
    `;
    const values = [email, passwordHash, fullName, role];
    const { rows } = await pool.query(query, values);
    return rows[0];
  }

  static async findByEmail(email) {
    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    return rows[0];
  }

  static async findById(id) {
    const { rows } = await pool.query(
      'SELECT id, email, full_name, role, created_at FROM users WHERE id = $1',
      [id] // id ni UUID string
    );
    return rows[0];
  }
}

module.exports = User;