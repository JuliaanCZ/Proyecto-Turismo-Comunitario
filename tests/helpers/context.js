import { createApp } from '../../src/app.js';
import { loadConfig } from '../../src/config.js';
import { createContainer } from '../../src/container.js';
import { openDb } from '../../src/shared/db.js';

export function createTestContext({ overrides = {}, clock } = {}) {
  const db = openDb(':memory:');
  const config = loadConfig({ APP_ENV: 'test', DATABASE_FILE: ':memory:' });
  let container;
  try {
    container = createContainer(config, { ...overrides, db, ...(clock ? { clock } : {}) });
  } catch (error) {
    db.close();
    throw error;
  }

  const context = {
    db,
    container,
    app: createApp(container),
    clock: container.clock,
    close() {
      if (context.closed) return;
      context.closed = true;
      container.close();
      db.close();
    },
    closed: false,
  };
  return context;
}
