/**
 * Acceso a `sessions` (C-DAT / C-SES).
 * `revokeAllInTx` también se exporta suelta para que B1.3 la use dentro de su transacción.
 */
export function revokeAllInTx(db, userId, reason, now) {
  return db.prepare(`
    UPDATE sessions
    SET revoked_at = ?, revoke_reason = ?
    WHERE user_id = ? AND revoked_at IS NULL
  `).run(now, reason, userId).changes;
}

export function createSessionsRepo(db) {
  const insert = db.prepare(`
    INSERT INTO sessions (id, user_id, token_hash, created_at, expires_at)
    VALUES (?, ?, ?, ?, ?)
  `);
  const resolve = db.prepare(`
    SELECT s.id AS session_id, s.user_id, s.expires_at, u.display_name
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ? AND s.revoked_at IS NULL AND s.expires_at > ?
  `);
  const revokeOne = db.prepare(`
    UPDATE sessions
    SET revoked_at = ?, revoke_reason = ?
    WHERE id = ? AND revoked_at IS NULL
  `);

  return {
    insertSession({ id, userId, tokenHash, createdAt, expiresAt }) {
      insert.run(id, userId, tokenHash, createdAt, expiresAt);
    },
    findValidByTokenHash(tokenHash, now) {
      return resolve.get(tokenHash, now) ?? null;
    },
    revokeById(sessionId, reason, now) {
      return revokeOne.run(now, reason, sessionId).changes;
    },
    revokeAllForUser(userId, reason, now) {
      return revokeAllInTx(db, userId, reason, now);
    },
  };
}
