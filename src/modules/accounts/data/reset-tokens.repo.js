export function createResetTokensRepo(db) {
  // Un token activo por usuario: una solicitud nueva reemplaza la fila anterior.
  const upsert = db.prepare(`
    INSERT INTO password_reset_tokens (user_id, token_hash, created_at, expires_at, used_at)
    VALUES (?, ?, ?, ?, NULL)
    ON CONFLICT (user_id) DO UPDATE SET
      token_hash = excluded.token_hash,
      created_at = excluded.created_at,
      expires_at = excluded.expires_at,
      used_at = NULL
  `);
  const findValid = db.prepare(`
    SELECT t.user_id, u.email
    FROM password_reset_tokens t
    JOIN users u ON u.id = t.user_id
    WHERE t.token_hash = ? AND t.used_at IS NULL AND t.expires_at > ?
  `);
  const consume = db.prepare(`
    UPDATE password_reset_tokens SET used_at = ?
    WHERE token_hash = ? AND used_at IS NULL AND expires_at > ?
    RETURNING user_id
  `);

  return {
    upsertToken({ userId, tokenHash, createdAt, expiresAt }) {
      upsert.run(userId, tokenHash, createdAt, expiresAt);
    },
    findValid(tokenHash, now) {
      return findValid.get(tokenHash, now) ?? null;
    },
    /** Marca el token como usado; devuelve el `user_id` o null si no estaba vigente. */
    consume(tokenHash, now) {
      return consume.get(now, tokenHash, now)?.user_id ?? null;
    },
  };
}
