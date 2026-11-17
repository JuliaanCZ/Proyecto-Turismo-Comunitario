import console from 'node:console';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import process from 'node:process';
import { loadConfig } from '../src/config.js';
import { openDb } from '../src/shared/db.js';
import { migrate } from '../src/shared/migrate.js';

function run() {
  const { databaseFile } = loadConfig();
  if (databaseFile === ':memory:') {
    throw new Error('DATABASE_FILE=:memory: no sirve para migrar: la base se pierde al terminar el proceso.');
  }
  mkdirSync(dirname(databaseFile), { recursive: true });

  const db = openDb(databaseFile);
  try {
    const applied = migrate(db);
    if (applied.length === 0) {
      console.log(`Base ${databaseFile}: sin migraciones pendientes.`);
    } else {
      for (const version of applied) console.log(`Aplicada ${version}`);
      console.log(`Base ${databaseFile}: ${applied.length} migración(es) aplicada(s).`);
    }
  } finally {
    db.close();
  }
}

try {
  run();
} catch (error) {
  console.error(`Migración fallida: ${error.message}`);
  process.exitCode = 1;
}
