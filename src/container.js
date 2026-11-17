import console from 'node:console';
import { EventEmitter } from 'node:events';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { createAccountsService } from './modules/accounts/index.js';
import { createChatService } from './modules/chat/index.js';
import { createOffersService } from './modules/offers/index.js';
import { systemClock } from './shared/clock.js';
import { openDb } from './shared/db.js';
import { migrate } from './shared/migrate.js';

/**
 * Único punto de composición (§2.2): crea `db`, `clock`, `sessionEvents` y los servicios.
 *
 * - Sin `overrides.db` abre `config.databaseFile` y es dueño de la conexión (`close()` la cierra).
 *   Con `overrides.db` (p. ej. `:memory:` de las pruebas) usa esa y no la cierra.
 * - Aplica las migraciones pendientes de B0.2; es idempotente y falla si una migración integrada cambió.
 * - `overrides` puede reemplazar `db`, `clock`, `logger`, `sessionEvents` y los servicios
 *   `accounts`, `offers` y `chat` (servicios falsos en pruebas).
 *
 * Un bloque nuevo se registra editando solo su servicio, su router y sus vistas, más una línea aquí.
 */
export function createContainer(config, overrides = {}) {
  const clock = overrides.clock ?? systemClock;
  const logger = overrides.logger ?? console;
  const sessionEvents = overrides.sessionEvents ?? new EventEmitter();
  const ownsDb = overrides.db === undefined;

  if (ownsDb && config.databaseFile !== ':memory:') {
    mkdirSync(dirname(config.databaseFile), { recursive: true });
  }
  const db = overrides.db ?? openDb(config.databaseFile);

  let accounts;
  let offers;
  let chat;
  try {
    migrate(db, { now: () => clock.now() });
    const deps = { db, clock, config, sessionEvents, logger };
    accounts = overrides.accounts ?? createAccountsService(deps);
    offers = overrides.offers ?? createOffersService(deps);
    chat = overrides.chat ?? createChatService(deps);
  } catch (error) {
    if (ownsDb) db.close();
    throw error;
  }

  let closed = false;
  return {
    config,
    db,
    clock,
    logger,
    sessionEvents,
    accounts,
    offers,
    chat,
    /** Libera la base (si es propia) y los oyentes; se puede llamar más de una vez. */
    close() {
      if (closed) return;
      closed = true;
      sessionEvents.removeAllListeners();
      if (ownsDb) db.close();
    },
  };
}
