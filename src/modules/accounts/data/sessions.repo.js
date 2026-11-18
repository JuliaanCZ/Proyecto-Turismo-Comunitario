export async function revokeAllInTx(db, userId, reason, now) {
  const result = await db.query(`UPDATE sessions SET revoked_at = $1, revoke_reason = $2
    WHERE user_id = $3 AND revoked_at IS NULL`, [now, reason, userId]);
  return result.rowCount;
}

export function createSessionsRepo(db) {
  return {
    async insertSession({ id, userId, tokenHash, createdAt, expiresAt }) {
      await db.query(`INSERT INTO sessions (id, user_id, token_hash, created_at, expires_at)
        VALUES ($1,$2,$3,$4,$5)`, [id, userId, tokenHash, createdAt, expiresAt]);
    },
    async findValidByTokenHash(tokenHash, now) {
      const result = await db.query(`SELECT s.id AS session_id, s.user_id, s.expires_at, u.display_name
        FROM sessions s JOIN users u ON u.id = s.user_id
        WHERE s.token_hash = $1 AND s.revoked_at IS NULL AND s.expires_at > $2`, [tokenHash, now]);
      return result.rows[0] ?? null;
    },
    async revokeById(sessionId, reason, now) {
      const result = await db.query(`UPDATE sessions SET revoked_at = $1, revoke_reason = $2
        WHERE id = $3 AND revoked_at IS NULL`, [now, reason, sessionId]);
      return result.rowCount;
    },
    revokeAllForUser: (userId, reason, now) => revokeAllInTx(db, userId, reason, now),
  };
}
