import { notImplementedService } from '../../shared/not-implemented.js';
import { createUsersRepo } from './data/users.repo.js';
import { createHasher } from './service/hasher.js';
import { createRegister } from './service/register.js';

/**
 * Módulo `accounts`. B1.1 implementa `registerUser`; B1.2/B1.3 completan el resto.
 * `deps` = { db, clock, config, sessionEvents, logger }.
 */
const PENDING = [
  'authenticate',
  'createSession',
  'resolveSession',
  'revokeSession',
  'revokeAllSessions',
  'requestPasswordReset',
  'resetPassword',
  'listMailbox',
];

export { registerSchema } from './domain/schemas.js';
export { checkPasswordPolicy, COMMON_PASSWORDS } from './domain/password-policy.js';

export function createAccountsService(deps) {
  const hasher = createHasher(deps.config);
  const users = createUsersRepo(deps.db);
  const { registerUser } = createRegister({ ...deps, hasher, users });
  return {
    ...notImplementedService('accounts', PENDING),
    registerUser,
  };
}
