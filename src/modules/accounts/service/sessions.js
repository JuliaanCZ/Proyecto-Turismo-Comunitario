import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { createSessionsRepo, revokeAllInTx } from '../data/sessions.repo.js';

const HOUR_MS = 3_600_000;
const REVOKE_REASONS = new Set(['LOGOUT', 'PASSWORD_RESET']);

export { revokeAllInTx };

export function hashSessionToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

function assertReason(reason) {
  if (!REVOKE_REASONS.has(reason)) {
    throw new RangeError(`Motivo de revocación inválido: ${reason}`);
  }
}

export function createSessions({ db, clock, config, sessionEvents }) {
  const repo = createSessionsRepo(db);
  const ttlMs = config.sessionTtlHours * HOUR_MS;

  return {
    async createSession(userId) {
      if (!Number.isSafeInteger(userId) || userId < 1) {
        throw new TypeError('createSession requiere un userId entero positivo.');
      }
      const token = randomBytes(32).toString('base64url');
      const sessionId = randomUUID();
      const createdAt = clock.now();
      const expiresAt = createdAt + ttlMs;
      await repo.insertSession({
        id: sessionId,
        userId,
        tokenHash: hashSessionToken(token),
        createdAt,
        expiresAt,
      });
      return { token, sessionId, expiresAt };
    },

    async resolveSession(token, now = clock.now()) {
      if (typeof token !== 'string' || token.length === 0 || token.length > 512) {
        return null;
      }
      const row = await repo.findValidByTokenHash(hashSessionToken(token), now);
      if (!row) return null;
      return Object.freeze({
        userId: row.user_id,
        sessionId: row.session_id,
        displayName: row.display_name,
        sessionExpiresAt: row.expires_at,
      });
    },

    async revokeSession(sessionId, reason = 'LOGOUT') {
      assertReason(reason);
      if (typeof sessionId !== 'string' || sessionId.length === 0) return { revoked: false };
      const now = clock.now();
      const changes = await db.transaction(() => repo.revokeById(sessionId, reason, now));
      sessionEvents?.emit('session-revoked', { sessionId });
      return { revoked: changes > 0 };
    },

    async revokeAllSessions(userId, reason = 'PASSWORD_RESET') {
      assertReason(reason);
      if (!Number.isSafeInteger(userId) || userId < 1) {
        throw new TypeError('revokeAllSessions requiere un userId entero positivo.');
      }
      const now = clock.now();
      const changes = await db.transaction(() => revokeAllInTx(db, userId, reason, now));
      sessionEvents?.emit('session-revoked', { userId });
      return { revokedCount: changes };
    },
  };
}
