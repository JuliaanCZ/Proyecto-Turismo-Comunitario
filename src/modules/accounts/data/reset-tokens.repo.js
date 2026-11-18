export function createResetTokensRepo(db) {
  return {
    async upsertToken({ userId, tokenHash, createdAt, expiresAt, cooldownMs = 0 }) {
      const result = await db.query(`INSERT INTO password_reset_tokens (user_id, token_hash, created_at, expires_at, used_at)
        VALUES ($1,$2,$3,$4,NULL) ON CONFLICT (user_id) DO UPDATE SET
        token_hash = excluded.token_hash, created_at = excluded.created_at,
        expires_at = excluded.expires_at, used_at = NULL
        ${cooldownMs ? 'WHERE password_reset_tokens.created_at <= $5' : ''}
        RETURNING token_hash`,
      [userId, tokenHash, createdAt, expiresAt, ...(cooldownMs ? [createdAt - cooldownMs] : [])]);
      return result.rows[0]?.token_hash === tokenHash;
    },
    async findValid(tokenHash, now) {
      const result = await db.query(`SELECT t.user_id, u.email FROM password_reset_tokens t
        JOIN users u ON u.id = t.user_id
        WHERE t.token_hash = $1 AND t.used_at IS NULL AND t.expires_at > $2`, [tokenHash, now]);
      return result.rows[0] ?? null;
    },
    async consume(tokenHash, now) {
      const result = await db.query(`UPDATE password_reset_tokens SET used_at = $1
        WHERE token_hash = $2 AND used_at IS NULL AND expires_at > $1 RETURNING user_id`, [now, tokenHash]);
      return result.rows[0]?.user_id ?? null;
    },
  };
}
