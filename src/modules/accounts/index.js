import { notImplementedService } from '../../shared/not-implemented.js';

/**
 * Esqueleto del módulo `accounts` (B0.4). Lo reemplazan B1.1 a B1.3 (Integrante 1).
 * Firmas de C-MOD (§5.1); `resolveSession(token, now) → Principal | null` es el que
 * usa `attachPrincipal` y el gateway.
 * `deps` = { db, clock, config, sessionEvents, logger }.
 */
const FUNCTIONS = [
  'registerUser',
  'authenticate',
  'createSession',
  'resolveSession',
  'revokeSession',
  'revokeAllSessions',
  'requestPasswordReset',
  'resetPassword',
  'listMailbox',
];

export function createAccountsService(deps) {
  void deps;
  return notImplementedService('accounts', FUNCTIONS);
}
