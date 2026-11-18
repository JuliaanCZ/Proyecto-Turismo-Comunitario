import console from 'node:console';
import process from 'node:process';
import { loadConfig } from '../src/config.js';
import { createPg } from '../src/shared/pg.js';
import { migrate } from '../src/shared/pg-migrate.js';

async function run() {
  const { databaseUrl } = loadConfig();
  const db = createPg(databaseUrl);
  try {
    const applied = await migrate(db);
    if (applied.length === 0) {
      console.log('Supabase PostgreSQL: sin migraciones pendientes.');
    } else {
      for (const version of applied) console.log(`Aplicada ${version}`);
      console.log(`Supabase PostgreSQL: ${applied.length} migración(es) aplicada(s).`);
    }
  } finally {
    await db.close();
  }
}

run().catch((error) => {
  console.error(`Migración fallida: ${error.message}`);
  process.exitCode = 1;
});
