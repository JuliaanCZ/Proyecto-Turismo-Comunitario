import console from 'node:console';
import { EventEmitter } from 'node:events';
import { createAccountsService } from './modules/accounts/index.js';
import { createChatService } from './modules/chat/index.js';
import { createOffersService } from './modules/offers/index.js';
import { systemClock } from './shared/clock.js';
import { createPg } from './shared/pg.js';
import { migrate } from './shared/pg-migrate.js';
import { createPhotoStorage } from './shared/storage.js';

/**
 * Único punto de composición (§2.2): crea `db`, `clock`, `sessionEvents` y los servicios.
 *
 * - Sin `overrides.db` abre PostgreSQL y es dueño de la conexión (`close()` la cierra).
 *   Con `overrides.db` usa esa y no la cierra.
 * - Aplica las migraciones pendientes; es idempotente y falla si una migración integrada cambió.
 * - `overrides` puede reemplazar `db`, `clock`, `logger`, `sessionEvents` y los servicios
 *   `accounts`, `offers` y `chat` (servicios falsos en pruebas).
 *
 * Un bloque nuevo se registra editando solo su servicio, su router y sus vistas, más una línea aquí.
 */
export async function createContainer(config, overrides = {}) {
  const clock = overrides.clock ?? systemClock;
  const logger = overrides.logger ?? console;
  const sessionEvents = overrides.sessionEvents ?? new EventEmitter();
  const ownsDb = overrides.db === undefined;

  const db = overrides.db ?? createPg(config.databaseUrl);

  let accounts;
  let offers;
  let chat;
  let storage;
  try {
    storage = overrides.storage ?? createPhotoStorage(config);
    if (!overrides.skipMigrate) await migrate(db);
    if (!overrides.storage) await storage.ensureBucket();
    const deps = { db, clock, config, sessionEvents, logger, storage };
    accounts = overrides.accounts ?? createAccountsService(deps);
    offers = overrides.offers ?? createOffersService(deps);
    chat = overrides.chat ?? createChatService(deps);
  } catch (error) {
    if (ownsDb) await db.close();
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
    storage,
    /** Libera la base (si es propia) y los oyentes; se puede llamar más de una vez. */
    async close() {
      if (closed) return;
      closed = true;
      sessionEvents.removeAllListeners();
      if (ownsDb) await db.close();
    },
  };
}
