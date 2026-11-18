export function createUsersRepo(db) {
  return {
    async insertUser(email, displayName, passwordHash, createdAt) {
      const result = await db.query(`INSERT INTO users (email, display_name, password_hash, created_at)
        VALUES ($1,$2,$3,$4) RETURNING id`, [email, displayName, passwordHash, createdAt]);
      return Number(result.rows[0].id);
    },
    async findByEmail(email) {
      const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
      return result.rows[0] ?? null;
    },
    async findById(id) {
      const result = await db.query('SELECT * FROM users WHERE id = $1', [id]);
      return result.rows[0] ?? null;
    },
    async updatePasswordHash(id, hash) {
      const result = await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, id]);
      return result.rowCount;
    },
  };
}
