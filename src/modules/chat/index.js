import { notImplementedService } from '../../shared/not-implemented.js';

/**
 * Esqueleto del módulo `chat` (B0.4). Lo reemplaza B1.7 (Integrante 3).
 * Firmas de C-MOD (§5.1). `chatMessageSchema` (constante) lo añade B1.7.
 * `deps` = { db, clock, config, logger }.
 */
const FUNCTIONS = ['postMessage', 'getHistory', 'lastMessageId'];

export function createChatService(deps) {
  void deps;
  return notImplementedService('chat', FUNCTIONS);
}
