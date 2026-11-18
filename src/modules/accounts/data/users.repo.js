export function createUsersRepo(db) {
  const insert = db.prepare(`
    INSERT INTO users (email, display_name, password_hash, created_at)
    VALUES (?, ?, ?, ?)
  `);
  const byEmail = db.prepare(`
    SELECT id, email, display_name, password_hash, created_at
    FROM users WHERE email = ?
  `);
  const byId = db.prepare(`
    SELECT id, email, display_name, password_hash, created_at
    FROM users WHERE id = ?
  `);
  const setPassword = db.prepare('UPDATE users SET password_hash = ? WHERE id = ?');

  return {
    insertUser(email, displayName, passwordHash, createdAt) {
      return Number(insert.run(email, displayName, passwordHash, createdAt).lastInsertRowid);
    },
    findByEmail(email) {
      return byEmail.get(email) ?? null;
    },
    findById(id) {
      return byId.get(id) ?? null;
    },
    updatePasswordHash(id, passwordHash) {
      return setPassword.run(passwordHash, id).changes;
    },
  };
}
