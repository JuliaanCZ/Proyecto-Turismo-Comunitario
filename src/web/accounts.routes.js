import { Router } from 'express';

/**
 * Router de `accounts` (B0.4: vacío y montado). B1.1 a B1.3 añaden /registro, /ingreso,
 * /salir, /recuperar y /restablecer, y reciben `container` como argumento.
 * Solo adapta HTTP: valida, llama a UN servicio y responde; no consulta SQLite.
 */
export function createAccountsRouter() {
  return Router();
}
