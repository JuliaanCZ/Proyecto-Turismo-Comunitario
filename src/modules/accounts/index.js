import { notImplementedService } from '../../shared/not-implemented.js';
import { createUsersRepo } from './data/users.repo.js';
import { createHasher } from './service/hasher.js';
import { createLogin } from './service/login.js';
import { createRegister } from './service/register.js';
import { createSessions, revokeAllInTx } from './service/sessions.js';

/**
 * Módulo `accounts`. B1.1 + B1.2 implementan registro, ingreso y sesión;
 * B1.3 completa recuperación y bandeja.
 * `deps` = { db, clock, config, sessionEvents, logger }.
 */
const PENDING = [
  'requestPasswordReset',
  'resetPassword',
  'listMailbox',
];

export { loginSchema, registerSchema } from './domain/schemas.js';
export { checkPasswordPolicy, COMMON_PASSWORDS } from './domain/password-policy.js';
export { revokeAllInTx };

export function createAccountsService(deps) {
  const hasher = createHasher(deps.config);
  const users = createUsersRepo(deps.db);
  const { registerUser } = createRegister({ ...deps, hasher, users });
  const { authenticate } = createLogin({ hasher, users });
  const sessions = createSessions(deps);

  return {
    ...notImplementedService('accounts', PENDING),
    registerUser,
    authenticate,
    ...sessions,
  };
}
