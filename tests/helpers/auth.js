import { createHash, randomBytes, randomUUID } from 'node:crypto';

const SESSION_COOKIE = 'tc_session';
const DEFAULT_TTL_MS = 8 * 60 * 60 * 1000;

export function createSessionFor(ctx, userId, { ttlMs = DEFAULT_TTL_MS } = {}) {
  const token = randomBytes(32).toString('base64url');
  const sessionId = randomUUID();
  const createdAt = ctx.clock.now();
  const expiresAt = createdAt + ttlMs;
  const tokenHash = createHash('sha256').update(token).digest('hex');
  ctx.db.prepare(`
    INSERT INTO sessions (id, user_id, token_hash, created_at, expires_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(sessionId, userId, tokenHash, createdAt, expiresAt);
  return {
    token,
    sessionId,
    cookie: `${SESSION_COOKIE}=${token}`,
  };
}

export function revokeInDb(ctx, sessionId) {
  ctx.db.prepare(`
    UPDATE sessions SET revoked_at = ?, revoke_reason = 'LOGOUT'
    WHERE id = ? AND revoked_at IS NULL
  `).run(ctx.clock.now(), sessionId);
}

export function fakeAccounts(map) {
  return {
    resolveSession(token) {
      if (map instanceof Map) return map.get(token) ?? null;
      return map?.[token] ?? null;
    },
  };
}
