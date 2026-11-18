import { createHash, randomBytes } from 'node:crypto';
import { AppError } from '../../../shared/errors.js';
import { validate } from '../../../shared/validation/validate.js';
import { revokeAllInTx } from '../data/sessions.repo.js';
import { createResetTokensRepo } from '../data/reset-tokens.repo.js';
import { checkPasswordPolicy } from '../domain/password-policy.js';
import { recoverSchema, resetSchema } from '../domain/schemas.js';
import { passwordResetEmail } from './password-reset-email.js';

const TOKEN_TTL_MINUTES = 30;
const TOKEN_TTL_MS = TOKEN_TTL_MINUTES * 60_000;
const RESEND_COOLDOWN_MS = 60_000;
const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;
export const TOKEN_INVALID_MESSAGE = 'El enlace no es válido o ya venció. Solicita uno nuevo.';

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

function tokenInvalid() {
  return AppError.fromCatalog('TOKEN_INVALID', TOKEN_INVALID_MESSAGE);
}

function validationError(fieldErrors) {
  return AppError.fromCatalog('VALIDATION_ERROR', 'Revisa los campos indicados.', { fieldErrors });
}

/** Recuperación de clave (B1.3): token de 32 bytes, solo su hash en la base, un uso, 30 minutos. */
export function createPasswordReset({ db, clock, config, sessionEvents, hasher, users, mailer }) {
  const tokens = createResetTokensRepo(db);

  return {
    /** Responde igual exista o no la cuenta; solo un formato inválido da VALIDATION_ERROR. */
    async requestPasswordReset(email) {
      const check = validate(recoverSchema, { email });
      if (!check.ok) throw validationError(check.errors);
      if (!config.recoveryEnabled) return { accepted: true };

      const user = await users.findByEmail(check.values.email);
      if (user) {
        const token = randomBytes(32).toString('base64url');
        const now = clock.now();
        // El enlace sale de APP_ORIGIN, nunca de la cabecera Host.
        const link = `${config.appOrigin}/restablecer?token=${token}`;
        const message = { to: user.email, ...passwordResetEmail({
          displayName: user.display_name, link, expiresInMinutes: TOKEN_TTL_MINUTES,
        }) };
        const tokenData = { userId: user.id, tokenHash: hashToken(token), createdAt: now, expiresAt: now + TOKEN_TTL_MS };
        if (config.resend) {
          // Confirma el token antes del envío para liberar la conexión y aceptar un enlace entregado aunque expire la petición HTTP.
          if (await tokens.upsertToken({ ...tokenData, cooldownMs: RESEND_COOLDOWN_MS })) await mailer.send(message);
        } else {
          await db.transaction(async () => {
            await tokens.upsertToken(tokenData);
            await mailer.send(message);
          });
        }
      }
      return { accepted: true };
    },

    async resetPassword({ token, newPassword, newPasswordConfirm } = {}) {
      if (typeof token !== 'string' || !TOKEN_RE.test(token)) throw tokenInvalid();
      const tokenHash = hashToken(token);
      const pending = await tokens.findValid(tokenHash, clock.now());
      if (!pending) throw tokenInvalid();

      const check = validate(resetSchema, { newPassword, newPasswordConfirm });
      if (!check.ok) throw validationError(check.errors);
      const policy = checkPasswordPolicy(check.values.newPassword, pending.email);
      if (!policy.ok) throw validationError({ newPassword: [policy.message] });

      // Argon2id se calcula antes de abrir la transacción.
      const passwordHash = await hasher.hash(check.values.newPassword);
      const now = clock.now();
      const userId = await db.transaction(async () => {
        const owner = await tokens.consume(tokenHash, now);
        if (owner === null) return null;
        await users.updatePasswordHash(owner, passwordHash);
        await revokeAllInTx(db, owner, 'PASSWORD_RESET', now);
        return owner;
      });
      if (userId === null) throw tokenInvalid();

      sessionEvents?.emit('session-revoked', { userId });
      return {};
    },
  };
}
