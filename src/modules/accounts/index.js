import { createUsersRepo } from './data/users.repo.js';
import { createHasher } from './service/hasher.js';
import { createLogin } from './service/login.js';
import { createMailer } from './service/mailer.js';
import { createPasswordReset } from './service/password-reset.js';
import { createRegister } from './service/register.js';
import { createSessions, revokeAllInTx } from './service/sessions.js';

/**
 * Módulo `accounts`: registro (B1.1), ingreso y sesión (B1.2), recuperación y bandeja (B1.3).
 * `deps` = { db, clock, config, sessionEvents, logger }.
 */
export { loginSchema, recoverSchema, registerSchema, resetSchema } from './domain/schemas.js';
export { checkPasswordPolicy, COMMON_PASSWORDS } from './domain/password-policy.js';
export { TOKEN_INVALID_MESSAGE } from './service/password-reset.js';
export { revokeAllInTx };

export function createAccountsService(deps) {
  const hasher = createHasher(deps.config);
  const users = createUsersRepo(deps.db);
  const mailer = createMailer(deps);
  const { registerUser } = createRegister({ ...deps, hasher, users });
  const { authenticate } = createLogin({ hasher, users });
  const { requestPasswordReset, resetPassword } = createPasswordReset({ ...deps, hasher, users, mailer });

  return {
    registerUser,
    authenticate,
    ...createSessions(deps),
    requestPasswordReset,
    resetPassword,
    listMailbox: mailer.listMailbox,
  };
}
