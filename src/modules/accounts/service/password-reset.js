import { createHash, randomBytes } from 'node:crypto';
import { withTransaction } from '../../../shared/db.js';
import { AppError } from '../../../shared/errors.js';
import { validate } from '../../../shared/validation/validate.js';
import { revokeAllInTx } from '../data/sessions.repo.js';
import { createResetTokensRepo } from '../data/reset-tokens.repo.js';
import { checkPasswordPolicy } from '../domain/password-policy.js';
import { recoverSchema, resetSchema } from '../domain/schemas.js';

const TOKEN_TTL_MS = 30 * 60_000;
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

      const user = users.findByEmail(check.values.email);
      if (user) {
        const token = randomBytes(32).toString('base64url');
        const now = clock.now();
        // El enlace sale de APP_ORIGIN, nunca de la cabecera Host.
        const link = `${config.appOrigin}/restablecer?token=${token}`;
        withTransaction(db, () => {
          tokens.upsertToken({ userId: user.id, tokenHash: hashToken(token), createdAt: now, expiresAt: now + TOKEN_TTL_MS });
          mailer.send({
            to: user.email,
            subject: 'Recupera tu contraseña',
            body: `Hola, ${user.display_name}:\n\nRecibimos una solicitud para cambiar tu contraseña. `
              + `Abre este enlace en los próximos 30 minutos:\n${link}\n\nSi no la pediste, ignora este mensaje.`,
          });
        });
      }
      return { accepted: true };
    },

    async resetPassword({ token, newPassword, newPasswordConfirm } = {}) {
      if (typeof token !== 'string' || !TOKEN_RE.test(token)) throw tokenInvalid();
      const tokenHash = hashToken(token);
      const pending = tokens.findValid(tokenHash, clock.now());
      if (!pending) throw tokenInvalid();

      const check = validate(resetSchema, { newPassword, newPasswordConfirm });
      if (!check.ok) throw validationError(check.errors);
      const policy = checkPasswordPolicy(check.values.newPassword, pending.email);
      if (!policy.ok) throw validationError({ newPassword: [policy.message] });

      // Argon2id es asíncrono: se calcula antes de abrir la transacción síncrona.
      const passwordHash = await hasher.hash(check.values.newPassword);
      const now = clock.now();
      const userId = withTransaction(db, () => {
        const owner = tokens.consume(tokenHash, now);
        if (owner === null) return null;
        users.updatePasswordHash(owner, passwordHash);
        revokeAllInTx(db, owner, 'PASSWORD_RESET', now);
        return owner;
      });
      if (userId === null) throw tokenInvalid();

      sessionEvents?.emit('session-revoked', { userId });
      return {};
    },
  };
}
